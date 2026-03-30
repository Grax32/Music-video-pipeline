import { Artifact, PipelineJob, Project, Provider, Revision } from "../domain/project-types.js";

export interface ProjectMetadataStore {
  saveProject(project: Project, provider: Provider): void;
  getProject(projectId: string): Project | undefined;
  getProvider(projectId: string): Provider | undefined;
  appendJob(projectId: string, job: PipelineJob): void;
  listJobs(projectId: string): PipelineJob[];
  appendPlanRevision(projectId: string, revision: Revision): void;
  listPlanRevisions(projectId: string): Revision[];
}

export interface ImmutableArtifactStore {
  saveArtifact(artifact: Artifact): void;
  getArtifact(artifactId: string): Artifact | undefined;
}
