import { randomUUID } from "node:crypto";
import { queueJob } from "../orchestrator/pipeline-orchestrator.js";
import {
  Artifact,
  CreateProjectRequest,
  JobType,
  PipelineJob,
  Project,
  Provider,
  Revision,
} from "../domain/project-types.js";
import { VideoPlan } from "../domain/video-plan.js";
import {
  InMemoryImmutableArtifactStore,
  InMemoryProjectMetadataStore,
} from "../storage/in-memory-storage.js";
import { ImmutableArtifactStore, ProjectMetadataStore } from "../storage/storage-types.js";
import { assertValidVideoPlan } from "../validation/video-plan-validator.js";

export interface CreateProjectResponse {
  project: Project;
  defaultProvider: Provider;
  seedJobs: PipelineJob[];
}

export interface QueuePipelineStageRequest {
  projectId: string;
  provider?: Provider;
  inputRevisionId?: string;
}

export interface SaveArtifactRequest {
  projectId: string;
  revisionId: string;
  kind: Artifact["kind"];
  path: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectStatus {
  project: Project;
  jobs: PipelineJob[];
}

export interface PipelineApi {
  createProject(input: CreateProjectRequest): CreateProjectResponse;
  saveVideoPlan(projectId: string, plan: unknown): Revision;
  getVideoPlan(revisionId: string): VideoPlan;
  saveArtifact(input: SaveArtifactRequest): Artifact;
  getArtifact(artifactId: string): Artifact;
  queuePlanning(input: QueuePipelineStageRequest): PipelineJob;
  queueStoryboard(input: QueuePipelineStageRequest): PipelineJob;
  getJobStatus(projectId: string, jobId: string): PipelineJob;
  getProjectStatus(projectId: string): ProjectStatus;
}

const PROJECT_BOOTSTRAP_JOB: JobType = "transcript.generate";

export class InMemoryPipelineApi implements PipelineApi {
  private readonly metadataStore: ProjectMetadataStore;
  private readonly artifactStore: ImmutableArtifactStore;

  constructor(input?: {
    metadataStore?: ProjectMetadataStore;
    artifactStore?: ImmutableArtifactStore;
  }) {
    this.metadataStore = input?.metadataStore ?? new InMemoryProjectMetadataStore();
    this.artifactStore = input?.artifactStore ?? new InMemoryImmutableArtifactStore();
  }

  createProject(input: CreateProjectRequest): CreateProjectResponse {
    const now = new Date().toISOString();
    const project: Project = {
      projectId: this.createPrefixedId("proj"),
      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    const defaultProvider = input.options?.defaultProvider ?? "local";
    this.metadataStore.saveProject(project, defaultProvider);

    const seedJob = this.queueProjectJob(project.projectId, PROJECT_BOOTSTRAP_JOB, {
      provider: defaultProvider,
    });

    return {
      project,
      defaultProvider,
      seedJobs: [seedJob],
    };
  }

  queuePlanning(input: QueuePipelineStageRequest): PipelineJob {
    this.assertNoActiveJob(input.projectId, "plan.generate");
    return this.queueProjectJob(input.projectId, "plan.generate", input);
  }

  queueStoryboard(input: QueuePipelineStageRequest): PipelineJob {
    this.assertNoActiveJob(input.projectId, "storyboard.generate");
    this.assertPlanRevisionExists(input.projectId, input.inputRevisionId);
    return this.queueProjectJob(input.projectId, "storyboard.generate", input);
  }

  saveVideoPlan(projectId: string, plan: unknown): Revision {
    this.assertProjectExists(projectId);
    assertValidVideoPlan(plan);

    const revisions = this.metadataStore.listPlanRevisions(projectId);
    const now = new Date().toISOString();
    const revision: Revision = {
      revisionId: this.createPrefixedId("rev"),
      projectId,
      stage: "plan",
      version: revisions.length + 1,
      createdAt: now,
    };

    this.metadataStore.appendPlanRevision(projectId, revision);
    this.metadataStore.saveVideoPlan(revision.revisionId, plan);

    return revision;
  }

  getVideoPlan(revisionId: string): VideoPlan {
    const videoPlan = this.metadataStore.getVideoPlan(revisionId);
    if (!videoPlan) {
      throw new Error(`Video plan not found for revision: ${revisionId}`);
    }

    assertValidVideoPlan(videoPlan);
    return videoPlan;
  }

  saveArtifact(input: SaveArtifactRequest): Artifact {
    this.assertProjectExists(input.projectId);

    const artifact: Artifact = {
      artifactId: this.createPrefixedId("artifact"),
      projectId: input.projectId,
      revisionId: input.revisionId,
      kind: input.kind,
      path: input.path,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    this.artifactStore.saveArtifact(artifact);
    return artifact;
  }

  getArtifact(artifactId: string): Artifact {
    const artifact = this.artifactStore.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    return artifact;
  }

  getJobStatus(projectId: string, jobId: string): PipelineJob {
    this.assertProjectExists(projectId);
    const projectJobs = this.metadataStore.listJobs(projectId);
    const job = projectJobs.find((candidate) => candidate.jobId === jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  getProjectStatus(projectId: string): ProjectStatus {
    const project = this.assertProjectExists(projectId);
    const jobs = this.metadataStore.listJobs(projectId);
    return {
      project,
      jobs,
    };
  }

  private queueProjectJob(
    projectId: string,
    type: JobType,
    input: { provider?: Provider; inputRevisionId?: string },
  ): PipelineJob {
    this.assertProjectExists(projectId);
    const provider = input.provider ?? this.metadataStore.getProvider(projectId) ?? "local";

    const job = queueJob({
      projectId,
      type,
      provider,
      inputRevisionId: input.inputRevisionId,
    });

    this.metadataStore.appendJob(projectId, job);

    return job;
  }

  private assertProjectExists(projectId: string): Project {
    const project = this.metadataStore.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return project;
  }

  private assertNoActiveJob(projectId: string, jobType: JobType): void {
    const projectJobs = this.metadataStore.listJobs(projectId);
    const activeJob = projectJobs.find(
      (candidate) =>
        candidate.type === jobType &&
        (candidate.status === "queued" || candidate.status === "running"),
    );

    if (activeJob) {
      throw new Error(
        `Cannot queue ${jobType}; active job already exists: ${activeJob.jobId}`,
      );
    }
  }

  private assertPlanRevisionExists(projectId: string, revisionId?: string): void {
    const planRevisions = this.metadataStore.listPlanRevisions(projectId);

    if (planRevisions.length === 0) {
      throw new Error(
        "Cannot queue storyboard.generate before a valid plan revision is saved",
      );
    }

    if (!revisionId) {
      return;
    }

    const revision = planRevisions.find((candidate) => candidate.revisionId === revisionId);
    if (!revision) {
      throw new Error(`Plan revision not found: ${revisionId}`);
    }
  }

  private createPrefixedId(prefix: string): string {
    return `${prefix}_${randomUUID()}`;
  }
}
