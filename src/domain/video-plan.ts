export interface VideoPlan {
  plan_id: string;
  target_fps: number;
  target_resolution: string;
  global_style: VideoPlanGlobalStyle;
  shots: VideoPlanShot[];
}

export interface VideoPlanGlobalStyle {
  visual_bible: string;
  negative_constraints: string;
}

export interface VideoPlanShot {
  shot_id: string;
  start_s: number;
  end_s: number;
  purpose: string;
  prompt: string;
  negative_prompt: string;
  camera: VideoPlanCamera;
  audio: VideoPlanAudio;
  generation: VideoPlanGeneration;
}

export interface VideoPlanCamera {
  framing: string;
  move: string;
  lens_mm: number;
}

export interface VideoPlanAudio {
  use_source_mp3: boolean;
  dialogue_ranges: VideoPlanTimeRange[];
}

export interface VideoPlanTimeRange {
  start_s: number;
  end_s: number;
}

export interface VideoPlanGeneration {
  seed: number;
  model_profile: string;
}
