export type Provider = "local" | "cloud";

export type JobType =
  | "transcript.generate"
  | "plan.generate"
  | "storyboard.generate"
  | "shot.generate"
  | "timeline.export"
  | "resolve.export";

export interface Project {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
}

export interface Revision {
  revisionId: string;
  projectId: string;
  stage: "transcript" | "plan" | "storyboard" | "render" | "timeline" | "export";
  version: number;
  parentRevisionId?: string;
  createdAt: string;
}

export interface Artifact {
  artifactId: string;
  projectId: string;
  revisionId: string;
  kind: "mp3" | "json" | "png" | "mp4" | "otio" | "drp";
  path: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PipelineJob {
  jobId: string;
  projectId: string;
  type: JobType;
  provider: Provider;
  status: "queued" | "running" | "succeeded" | "failed";
  inputRevisionId?: string;
  outputArtifactIds: string[];
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateProjectRequest {
  promptText: string;
  audioArtifactId: string;
  options?: {
    defaultProvider?: Provider;
    targetFps?: number;
    targetResolution?: string;
  };
}
