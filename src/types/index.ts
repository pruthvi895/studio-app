export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
}

export interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface Video {
  item_id: string;
  video_id: string;
  channel: string;
  privacy: string;
  qa_pass: boolean;
  publish_at?: string;
  title?: string;
  thumb?: string;
}

export interface QAItem {
  verdict: 'approve' | 'reject';
  p: number;
  reasons: string[];
}

export interface SchedulePair {
  case_file: number;
  short: string;
  short_at: string;
  long: string;
  long_at: string;
}

export type IgStatus = 'queued' | 'held' | 'retry' | 'posted' | 'failed' | 'unknown';

export interface InstagramItem {
  id: string;
  channel: string;
  kind: string;
  status: IgStatus;
  when_ist?: string;
  caption?: string;
  thumb?: string;
  permalink?: string;
}

export interface RenderLogEntry {
  item_id: string;
  status: string;
  at: string;
}

export interface RenderState {
  gpu_holder?: unknown;
  waiting: string[];
  ordered_queue_log: RenderLogEntry[];
}

export interface ActivityResult {
  type: string;
  ok: boolean;
  msg: string;
  at: string;
}

export interface LaptopJob {
  id: string;
  type: string;
  status: string;
  item_id?: string;
  text?: string;
}

export interface StudioState {
  youtube?: { videos: Video[] };
  qa?: Record<string, QAItem>;
  schedule?: { pairs: SchedulePair[] };
  ig?: { items: InstagramItem[] };
  render?: RenderState;
  heartbeat?: { laptop_seen: string };
  laptop_jobs?: Record<string, { status: string }>;
  results?: Record<string, ActivityResult>;
  laptop_queue?: LaptopJob[];
}

export interface StudioCommand {
  type: string;
  [key: string]: unknown;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export type TabId = 'review' | 'videos' | 'instagram' | 'render' | 'activity';
