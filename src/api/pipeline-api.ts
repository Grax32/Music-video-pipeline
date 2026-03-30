import { randomUUID } from "node:crypto";
import { queueJob } from "../orchestrator/pipeline-orchestrator.js";
import {
  CreateProjectRequest,
  JobType,
  PipelineJob,
  Project,
  Provider,
} from "../domain/project-types.js";

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

export interface ProjectStatus {
  project: Project;
  jobs: PipelineJob[];
}

export interface PipelineApi {
  createProject(input: CreateProjectRequest): CreateProjectResponse;
  queuePlanning(input: QueuePipelineStageRequest): PipelineJob;
  queueStoryboard(input: QueuePipelineStageRequest): PipelineJob;
  getJobStatus(projectId: string, jobId: string): PipelineJob;
  getProjectStatus(projectId: string): ProjectStatus;
}

const PROJECT_BOOTSTRAP_JOB: JobType = "transcript.generate";

export class InMemoryPipelineApi implements PipelineApi {
  private readonly projects = new Map<string, Project>();
  private readonly projectProviders = new Map<string, Provider>();
  private readonly jobs = new Map<string, PipelineJob[]>();

  createProject(input: CreateProjectRequest): CreateProjectResponse {
    const now = new Date().toISOString();
    const project: Project = {
      projectId: this.createPrefixedId("proj"),
      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    const defaultProvider = input.options?.defaultProvider ?? "local";
    this.projects.set(project.projectId, project);
    this.projectProviders.set(project.projectId, defaultProvider);

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
    return this.queueProjectJob(input.projectId, "plan.generate", input);
  }

  queueStoryboard(input: QueuePipelineStageRequest): PipelineJob {
    return this.queueProjectJob(input.projectId, "storyboard.generate", input);
  }

  getJobStatus(projectId: string, jobId: string): PipelineJob {
    this.assertProjectExists(projectId);
    const projectJobs = this.jobs.get(projectId) ?? [];
    const job = projectJobs.find((candidate) => candidate.jobId === jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  getProjectStatus(projectId: string): ProjectStatus {
    const project = this.assertProjectExists(projectId);
    const jobs = this.jobs.get(projectId) ?? [];
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
    const provider = input.provider ?? this.projectProviders.get(projectId) ?? "local";

    const job = queueJob({
      projectId,
      type,
      provider,
      inputRevisionId: input.inputRevisionId,
    });

    const existingJobs = this.jobs.get(projectId) ?? [];
    this.jobs.set(projectId, [...existingJobs, job]);

    return job;
  }

  private assertProjectExists(projectId: string): Project {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return project;
  }

  private createPrefixedId(prefix: string): string {
    return `${prefix}_${randomUUID()}`;
  }
}
