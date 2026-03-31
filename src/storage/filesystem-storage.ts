import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Artifact, PipelineJob, Project, Provider, Revision } from "../domain/project-types.js";
import { ImmutableArtifactStore, ProjectMetadataStore } from "./storage-types.js";

interface MetadataSnapshot {
  projects: Record<string, Project>;
  projectProviders: Record<string, Provider>;
  jobsByProject: Record<string, PipelineJob[]>;
  planRevisionsByProject: Record<string, Revision[]>;
  videoPlansByRevision: Record<string, unknown>;
}

const EMPTY_METADATA_SNAPSHOT: MetadataSnapshot = {
  projects: {},
  projectProviders: {},
  jobsByProject: {},
  planRevisionsByProject: {},
  videoPlansByRevision: {},
};

export class FileSystemProjectMetadataStore implements ProjectMetadataStore {
  private readonly metadataPath: string;

  constructor(baseDirectory: string) {
    this.metadataPath = join(baseDirectory, "project-metadata.json");
    mkdirSync(baseDirectory, { recursive: true });
    if (!existsSync(this.metadataPath)) {
      this.writeSnapshot(EMPTY_METADATA_SNAPSHOT);
    }
  }

  saveProject(project: Project, provider: Provider): void {
    this.withSnapshot((snapshot) => {
      snapshot.projects[project.projectId] = project;
      snapshot.projectProviders[project.projectId] = provider;
    });
  }

  getProject(projectId: string): Project | undefined {
    return this.readSnapshot().projects[projectId];
  }

  getProvider(projectId: string): Provider | undefined {
    return this.readSnapshot().projectProviders[projectId];
  }

  appendJob(projectId: string, job: PipelineJob): void {
    this.withSnapshot((snapshot) => {
      const existingJobs = snapshot.jobsByProject[projectId] ?? [];
      snapshot.jobsByProject[projectId] = [...existingJobs, job];
    });
  }

  listJobs(projectId: string): PipelineJob[] {
    return this.readSnapshot().jobsByProject[projectId] ?? [];
  }

  appendPlanRevision(projectId: string, revision: Revision): void {
    this.withSnapshot((snapshot) => {
      const existingRevisions = snapshot.planRevisionsByProject[projectId] ?? [];
      snapshot.planRevisionsByProject[projectId] = [...existingRevisions, revision];
    });
  }

  listPlanRevisions(projectId: string): Revision[] {
    return this.readSnapshot().planRevisionsByProject[projectId] ?? [];
  }

  saveVideoPlan(revisionId: string, plan: unknown): void {
    this.withSnapshot((snapshot) => {
      snapshot.videoPlansByRevision[revisionId] = plan;
    });
  }

  getVideoPlan(revisionId: string): unknown | undefined {
    return this.readSnapshot().videoPlansByRevision[revisionId];
  }

  private withSnapshot(update: (snapshot: MetadataSnapshot) => void): void {
    const snapshot = this.readSnapshot();
    update(snapshot);
    this.writeSnapshot(snapshot);
  }

  private readSnapshot(): MetadataSnapshot {
    const rawContent = readFileSync(this.metadataPath, "utf8");
    return JSON.parse(rawContent) as MetadataSnapshot;
  }

  private writeSnapshot(snapshot: MetadataSnapshot): void {
    writeFileSync(this.metadataPath, JSON.stringify(snapshot, null, 2), "utf8");
  }
}

interface ArtifactSnapshot {
  artifacts: Record<string, Artifact>;
}

const EMPTY_ARTIFACT_SNAPSHOT: ArtifactSnapshot = {
  artifacts: {},
};

export class FileSystemImmutableArtifactStore implements ImmutableArtifactStore {
  private readonly artifactsPath: string;

  constructor(baseDirectory: string) {
    this.artifactsPath = join(baseDirectory, "immutable-artifacts.json");
    mkdirSync(baseDirectory, { recursive: true });
    if (!existsSync(this.artifactsPath)) {
      this.writeSnapshot(EMPTY_ARTIFACT_SNAPSHOT);
    }
  }

  saveArtifact(artifact: Artifact): void {
    const snapshot = this.readSnapshot();
    if (snapshot.artifacts[artifact.artifactId]) {
      throw new Error(`Artifact already exists: ${artifact.artifactId}`);
    }

    snapshot.artifacts[artifact.artifactId] = artifact;
    this.writeSnapshot(snapshot);
  }

  getArtifact(artifactId: string): Artifact | undefined {
    return this.readSnapshot().artifacts[artifactId];
  }

  private readSnapshot(): ArtifactSnapshot {
    const rawContent = readFileSync(this.artifactsPath, "utf8");
    return JSON.parse(rawContent) as ArtifactSnapshot;
  }

  private writeSnapshot(snapshot: ArtifactSnapshot): void {
    writeFileSync(this.artifactsPath, JSON.stringify(snapshot, null, 2), "utf8");
  }
}
