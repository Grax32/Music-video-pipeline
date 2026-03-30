import { JobType, PipelineJob, Provider } from "../domain/project-types.js";

export interface QueueJobInput {
  projectId: string;
  type: JobType;
  provider: Provider;
  inputRevisionId?: string;
}

export function queueJob(input: QueueJobInput): PipelineJob {
  const now = new Date().toISOString();

  return {
    jobId: `job_${Math.random().toString(36).slice(2, 10)}`,
    projectId: input.projectId,
    type: input.type,
    provider: input.provider,
    status: "queued",
    inputRevisionId: input.inputRevisionId,
    outputArtifactIds: [],
    createdAt: now,
  };
}
