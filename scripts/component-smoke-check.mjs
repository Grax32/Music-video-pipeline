import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  InMemoryPipelineApi,
  queueJob,
  FileSystemProjectMetadataStore,
  FileSystemImmutableArtifactStore,
} from '../dist/index.js';

const validPlan = JSON.parse(readFileSync(new URL('../fixtures/video-plan.valid.json', import.meta.url), 'utf8'));
const invalidPlan = JSON.parse(readFileSync(new URL('../fixtures/video-plan.invalid.json', import.meta.url), 'utf8'));

const results = [];

function runCheck(name, fn) {
  try {
    fn();
    results.push({ name, status: 'pass' });
  } catch (error) {
    results.push({ name, status: 'fail', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

runCheck('orchestrator.queueJob returns queued provider-aware job', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const job = queueJob(
    { projectId: 'proj_1', type: 'plan.generate', provider: 'local' },
    { now, jobIdFactory: () => 'job_test' },
  );

  assert.equal(job.jobId, 'job_test');
  assert.equal(job.status, 'queued');
  assert.equal(job.createdAt, now.toISOString());
  assert.equal(job.outputArtifactIds.length, 0);
});

runCheck('api.createProject seeds transcript job and persists provider', () => {
  const api = new InMemoryPipelineApi();
  const response = api.createProject({
    promptText: 'neon city in rain',
    audioArtifactId: 'artifact_audio',
    options: { defaultProvider: 'cloud' },
  });

  assert.equal(response.defaultProvider, 'cloud');
  assert.equal(response.seedJobs.length, 1);
  assert.equal(response.seedJobs[0].type, 'transcript.generate');
  assert.equal(response.seedJobs[0].provider, 'cloud');
  const status = api.getProjectStatus(response.project.projectId);
  assert.equal(status.jobs.length, 1);
});

runCheck('api.queuePlanning enforces single active planning job', () => {
  const api = new InMemoryPipelineApi();
  const { project } = api.createProject({ promptText: 'x', audioArtifactId: 'a' });
  api.queuePlanning({ projectId: project.projectId });

  assert.throws(
    () => api.queuePlanning({ projectId: project.projectId }),
    /Cannot queue plan\.generate/,
  );
});

runCheck('api.saveVideoPlan validates payload and version increments', () => {
  const api = new InMemoryPipelineApi();
  const { project } = api.createProject({ promptText: 'x', audioArtifactId: 'a' });

  const revision1 = api.saveVideoPlan(project.projectId, validPlan);
  const revision2 = api.saveVideoPlan(project.projectId, validPlan);
  assert.equal(revision1.version, 1);
  assert.equal(revision2.version, 2);

  assert.throws(() => api.saveVideoPlan(project.projectId, invalidPlan), /VideoPlan validation failed/);
});

runCheck('api.queueStoryboard requires existing plan revision', () => {
  const api = new InMemoryPipelineApi();
  const { project } = api.createProject({ promptText: 'x', audioArtifactId: 'a' });

  assert.throws(
    () => api.queueStoryboard({ projectId: project.projectId }),
    /Cannot queue storyboard\.generate before a valid plan revision is saved/,
  );

  const revision = api.saveVideoPlan(project.projectId, validPlan);
  const job = api.queueStoryboard({ projectId: project.projectId, inputRevisionId: revision.revisionId });
  assert.equal(job.type, 'storyboard.generate');
});

runCheck('api.saveArtifact/getArtifact persists immutable artifact metadata', () => {
  const api = new InMemoryPipelineApi();
  const { project } = api.createProject({ promptText: 'x', audioArtifactId: 'a' });
  const revision = api.saveVideoPlan(project.projectId, validPlan);

  const artifact = api.saveArtifact({
    projectId: project.projectId,
    revisionId: revision.revisionId,
    kind: 'json',
    path: '/tmp/plan.json',
    metadata: { source: 'smoke' },
  });

  const fetched = api.getArtifact(artifact.artifactId);
  assert.equal(fetched.path, '/tmp/plan.json');
  assert.equal(fetched.metadata.source, 'smoke');
});

runCheck('filesystem stores persist data across instances', () => {
  const baseDir = mkdtempSync(join(tmpdir(), 'mvp-smoke-'));

  try {
    const metadataStore = new FileSystemProjectMetadataStore(baseDir);
    const artifactStore = new FileSystemImmutableArtifactStore(baseDir);

    const api = new InMemoryPipelineApi({ metadataStore, artifactStore });
    const { project } = api.createProject({ promptText: 'x', audioArtifactId: 'a' });
    const revision = api.saveVideoPlan(project.projectId, validPlan);
    const artifact = api.saveArtifact({
      projectId: project.projectId,
      revisionId: revision.revisionId,
      kind: 'json',
      path: '/tmp/file.json',
    });

    const reloadedMetadata = new FileSystemProjectMetadataStore(baseDir);
    const reloadedArtifactStore = new FileSystemImmutableArtifactStore(baseDir);

    assert.ok(reloadedMetadata.getProject(project.projectId));
    assert.ok(reloadedMetadata.getVideoPlan(revision.revisionId));
    assert.ok(reloadedArtifactStore.getArtifact(artifact.artifactId));
  } finally {
    rmSync(baseDir, { recursive: true, force: true });
  }
});

console.log('Component smoke check results:');
for (const result of results) {
  console.log(`- ${result.status.toUpperCase()}: ${result.name}${result.error ? ` -> ${result.error}` : ''}`);
}
