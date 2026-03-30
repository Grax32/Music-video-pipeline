import { randomUUID } from "node:crypto";
import { queueJob } from "../orchestrator/pipeline-orchestrator.js";
import {
  CreateProjectRequest,
  JobType,
  PipelineJob,
  Project,
  Provider,
  Revision,
} from "../domain/project-types.js";
import { VideoPlan } from "../domain/video-plan.js";
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

export interface ProjectStatus {
  project: Project;
  jobs: PipelineJob[];
}

export interface PipelineApi {
  createProject(input: CreateProjectRequest): CreateProjectResponse;
  saveVideoPlan(projectId: string, plan: unknown): Revision;
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
  private readonly planRevisions = new Map<string, Revision[]>();
  private readonly videoPlansByRevision = new Map<string, VideoPlan>();

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

    const revisions = this.planRevisions.get(projectId) ?? [];
    const now = new Date().toISOString();
    const revision: Revision = {
      revisionId: this.createPrefixedId("rev"),
      projectId,
      stage: "plan",
      version: revisions.length + 1,
      createdAt: now,
    };

    this.planRevisions.set(projectId, [...revisions, revision]);
    this.videoPlansByRevision.set(revision.revisionId, plan);

    return revision;
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

  private assertNoActiveJob(projectId: string, jobType: JobType): void {
    const projectJobs = this.jobs.get(projectId) ?? [];
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
    const planRevisions = this.planRevisions.get(projectId) ?? [];

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
