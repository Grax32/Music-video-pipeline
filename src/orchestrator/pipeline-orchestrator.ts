import { randomUUID } from "node:crypto";
import { JobType, PipelineJob, Provider } from "../domain/project-types.js";

export interface QueueJobInput {
  projectId: string;
  type: JobType;
  provider: Provider;
  inputRevisionId?: string;
}

export interface QueueJobOptions {
  now?: Date;
  jobIdFactory?: () => string;
}

export function queueJob(input: QueueJobInput, options: QueueJobOptions = {}): PipelineJob {
  const now = (options.now ?? new Date()).toISOString();
  const jobId = (options.jobIdFactory ?? (() => `job_${randomUUID()}`))();

  return {
    jobId,
    projectId: input.projectId,
    type: input.type,
    provider: input.provider,
    status: "queued",
    inputRevisionId: input.inputRevisionId,
    outputArtifactIds: [],
    createdAt: now,
  };
}
