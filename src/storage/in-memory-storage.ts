import { Artifact, PipelineJob, Project, Provider, Revision } from "../domain/project-types.js";
import { ImmutableArtifactStore, ProjectMetadataStore } from "./storage-types.js";

export class InMemoryProjectMetadataStore implements ProjectMetadataStore {
  private readonly projects = new Map<string, Project>();
  private readonly projectProviders = new Map<string, Provider>();
  private readonly jobs = new Map<string, PipelineJob[]>();
  private readonly planRevisions = new Map<string, Revision[]>();
  private readonly videoPlansByRevision = new Map<string, unknown>();

  saveProject(project: Project, provider: Provider): void {
    this.projects.set(project.projectId, project);
    this.projectProviders.set(project.projectId, provider);
  }

  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  getProvider(projectId: string): Provider | undefined {
    return this.projectProviders.get(projectId);
  }

  appendJob(projectId: string, job: PipelineJob): void {
    const existingJobs = this.jobs.get(projectId) ?? [];
    this.jobs.set(projectId, [...existingJobs, job]);
  }

  listJobs(projectId: string): PipelineJob[] {
    return this.jobs.get(projectId) ?? [];
  }

  appendPlanRevision(projectId: string, revision: Revision): void {
    const revisions = this.planRevisions.get(projectId) ?? [];
    this.planRevisions.set(projectId, [...revisions, revision]);
  }

  listPlanRevisions(projectId: string): Revision[] {
    return this.planRevisions.get(projectId) ?? [];
  }

  saveVideoPlan(revisionId: string, plan: unknown): void {
    this.videoPlansByRevision.set(revisionId, plan);
  }

  getVideoPlan(revisionId: string): unknown | undefined {
    return this.videoPlansByRevision.get(revisionId);
  }
}

export class InMemoryImmutableArtifactStore implements ImmutableArtifactStore {
  private readonly artifacts = new Map<string, Artifact>();

  saveArtifact(artifact: Artifact): void {
    if (this.artifacts.has(artifact.artifactId)) {
      throw new Error(`Artifact already exists: ${artifact.artifactId}`);
    }

    this.artifacts.set(artifact.artifactId, artifact);
  }

  getArtifact(artifactId: string): Artifact | undefined {
    return this.artifacts.get(artifactId);
  }
}
