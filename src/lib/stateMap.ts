import { asBoolean, asString, isRecord } from './guards';
import type {
  ActivityResult,
  IgStatus,
  InstagramItem,
  LaptopJob,
  QAItem,
  RenderLogEntry,
  RenderState,
  SchedulePair,
  StudioState,
  Video,
} from '../types';

export const STUDIO_FILES = [
  'state/youtube.json',
  'state/qa.json',
  'state/render.json',
  'state/schedule.json',
  'state/heartbeat.json',
  'state/laptop_jobs.json',
  'state/ig.json',
  'cmds/results.json',
  'cmds/laptop.json',
] as const;

export type StudioFile = (typeof STUDIO_FILES)[number];

export const FILE_TO_KEY = {
  'state/youtube.json': 'youtube',
  'state/qa.json': 'qa',
  'state/render.json': 'render',
  'state/schedule.json': 'schedule',
  'state/heartbeat.json': 'heartbeat',
  'state/laptop_jobs.json': 'laptop_jobs',
  'state/ig.json': 'ig',
  'cmds/results.json': 'results',
  'cmds/laptop.json': 'laptop_queue',
} as const satisfies Record<StudioFile, keyof StudioState>;

export type MappedState =
  | { key: 'youtube'; value: { videos: Video[] } }
  | { key: 'qa'; value: Record<string, QAItem> }
  | { key: 'schedule'; value: { pairs: SchedulePair[] } }
  | { key: 'ig'; value: { items: InstagramItem[] } }
  | { key: 'render'; value: RenderState }
  | { key: 'heartbeat'; value: { laptop_seen: string } }
  | { key: 'laptop_jobs'; value: Record<string, { status: string }> }
  | { key: 'results'; value: Record<string, ActivityResult> }
  | { key: 'laptop_queue'; value: LaptopJob[] };

export function applyMappedState(state: StudioState, mapped: MappedState): StudioState {
  switch (mapped.key) {
    case 'youtube':
      return { ...state, youtube: mapped.value };
    case 'qa':
      return { ...state, qa: mapped.value };
    case 'schedule':
      return { ...state, schedule: mapped.value };
    case 'ig':
      return { ...state, ig: mapped.value };
    case 'render':
      return { ...state, render: mapped.value };
    case 'heartbeat':
      return { ...state, heartbeat: mapped.value };
    case 'laptop_jobs':
      return { ...state, laptop_jobs: mapped.value };
    case 'results':
      return { ...state, results: mapped.value };
    case 'laptop_queue':
      return { ...state, laptop_queue: mapped.value };
    default: {
      const exhaustive: never = mapped;
      return exhaustive;
    }
  }
}

export function mapStateFile(path: string, raw: unknown): MappedState | null {
  if (!isStudioFile(path)) return null;
  const data = unwrapGitHubContent(raw);
  if (data == null) return null;
  const key = FILE_TO_KEY[path];
  switch (key) {
    case 'youtube':
      return { key, value: { videos: asVideos(data) } };
    case 'qa':
      return { key, value: asQA(data) };
    case 'schedule':
      return { key, value: { pairs: asPairs(data) } };
    case 'ig':
      return { key, value: { items: asInstagram(data) } };
    case 'render':
      return { key, value: asRender(data) };
    case 'heartbeat':
      return { key, value: asHeartbeat(data) };
    case 'laptop_jobs':
      return { key, value: asJobMap(data) };
    case 'results':
      return { key, value: asResults(data) };
    case 'laptop_queue':
      return { key, value: asLaptopQueue(data) };
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

export function unwrapGitHubContent(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return unwrapGitHubContent(JSON.parse(trimmed) as unknown);
    } catch {
      return null;
    }
  }
  if (isGitHubContentWrapper(raw)) {
    try {
      return JSON.parse(decodeBase64Utf8(raw.content)) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

function isStudioFile(path: string): path is StudioFile {
  return (STUDIO_FILES as readonly string[]).includes(path);
}

function isGitHubContentWrapper(value: unknown): value is { content: string; encoding: string } {
  return isRecord(value) && value.encoding === 'base64' && typeof value.content === 'string';
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function listFrom(data: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return null;
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return null;
}

function asVideos(data: unknown): Video[] {
  const list = listFrom(data, ['videos', 'items']) ?? [];
  return list.filter(isRecord).map(asVideo).filter((video) => video.video_id || video.item_id);
}

function asVideo(value: Record<string, unknown>): Video {
  const title = asString(value.title);
  const thumb = asString(value.thumb ?? value.thumbnail);
  const publishAt = asString(value.publish_at);
  return {
    item_id: asString(value.item_id),
    video_id: asString(value.video_id),
    channel: asString(value.channel),
    privacy: asString(value.privacy) || 'unknown',
    qa_pass: asBoolean(value.qa_pass),
    ...(publishAt ? { publish_at: publishAt } : {}),
    ...(title ? { title } : {}),
    ...(thumb ? { thumb } : {}),
  };
}

function asQA(data: unknown): Record<string, QAItem> {
  if (Array.isArray(data)) return qaFromList(data);
  if (!isRecord(data)) return {};
  if (Array.isArray(data.items)) return qaFromList(data.items);
  if (isRecord(data.items)) return asQA(data.items);
  const out: Record<string, QAItem> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value)) continue;
    const item = asQAItem(value);
    if (item) out[key] = item;
  }
  return out;
}

function qaFromList(list: unknown[]): Record<string, QAItem> {
  const out: Record<string, QAItem> = {};
  for (const entry of list) {
    if (!isRecord(entry)) continue;
    const item = asQAItem(entry);
    const id = asString(entry.item_id ?? entry.id);
    if (item && id) out[id] = item;
  }
  return out;
}

function asQAItem(value: Record<string, unknown>): QAItem | null {
  const raw = typeof value.verdict === 'string' ? value.verdict.trim().toLowerCase() : '';
  const verdict = raw === 'approve' || raw === 'reject' ? raw : null;
  if (!verdict) return null;
  const numeric = typeof value.p === 'number' ? value.p : Number(value.p);
  const reasons = Array.isArray(value.reasons) ? value.reasons.map((reason) => asString(reason)).filter(Boolean) : [];
  return {
    verdict,
    p: Number.isFinite(numeric) ? numeric : 0,
    reasons,
  };
}

function asPairs(data: unknown): SchedulePair[] {
  const list = listFrom(data, ['pairs', 'items']) ?? [];
  return list.filter(isRecord).map((entry) => ({
    case_file: typeof entry.case_file === 'number' ? entry.case_file : Number(entry.case_file) || 0,
    short: asString(entry.short),
    short_at: asString(entry.short_at),
    long: asString(entry.long),
    long_at: asString(entry.long_at),
  }));
}

function asInstagram(data: unknown): InstagramItem[] {
  const list = listFrom(data, ['items', 'posts']) ?? [];
  return list.filter(isRecord).map(asInstagramItem).filter((item) => item.id);
}

function asInstagramItem(value: Record<string, unknown>): InstagramItem {
  const caption = asString(value.caption);
  const thumb = asString(value.thumb ?? value.thumbnail);
  const permalink = asString(value.permalink);
  const when = asString(value.when_ist);
  return {
    id: asString(value.id),
    channel: asString(value.channel),
    kind: asString(value.kind) || 'post',
    status: asIgStatus(value.status),
    ...(when ? { when_ist: when } : {}),
    ...(caption ? { caption } : {}),
    ...(thumb ? { thumb } : {}),
    ...(permalink ? { permalink } : {}),
  };
}

function asIgStatus(value: unknown): IgStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  switch (status) {
    case 'queued':
    case 'held':
    case 'retry':
    case 'posted':
    case 'failed':
      return status;
    default:
      return 'unknown';
  }
}

function asRender(data: unknown): RenderState {
  if (!isRecord(data)) {
    return { waiting: [], ordered_queue_log: [] };
  }
  return {
    ...(data.gpu_holder !== undefined ? { gpu_holder: data.gpu_holder } : {}),
    waiting: asWaiting(data.waiting),
    ordered_queue_log: asLog(data.ordered_queue_log),
  };
}

function asWaiting(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (isRecord(entry)) return asString(entry.item_id ?? entry.id);
      return '';
    })
    .filter(Boolean);
}

function asLog(value: unknown): RenderLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return { item_id: entry, status: '', at: '' };
      if (!isRecord(entry)) return { item_id: '', status: '', at: '' };
      return {
        item_id: asString(entry.item_id ?? entry.id),
        status: asString(entry.status),
        at: asString(entry.at ?? entry.time),
      };
    })
    .filter((entry) => entry.item_id || entry.status || entry.at);
}

function asHeartbeat(data: unknown): { laptop_seen: string } {
  if (!isRecord(data)) return { laptop_seen: '' };
  return { laptop_seen: asString(data.laptop_seen ?? data.last_seen ?? data.seen) };
}

function asJobMap(data: unknown): Record<string, { status: string }> {
  if (Array.isArray(data)) return jobMapFromList(data);
  if (!isRecord(data)) return {};
  const keys = Object.keys(data);
  if (keys.length === 1 && keys[0] === 'jobs' && (Array.isArray(data.jobs) || isRecord(data.jobs))) {
    return asJobMap(data.jobs);
  }
  const out: Record<string, { status: string }> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      out[key] = { status: value };
      continue;
    }
    if (isRecord(value)) out[key] = { status: asString(value.status) };
  }
  return out;
}

function jobMapFromList(list: unknown[]): Record<string, { status: string }> {
  const out: Record<string, { status: string }> = {};
  for (const entry of list) {
    if (!isRecord(entry)) continue;
    const id = asString(entry.id);
    if (!id) continue;
    out[id] = { status: asString(entry.status) };
  }
  return out;
}

function asResults(data: unknown): Record<string, ActivityResult> {
  if (Array.isArray(data)) {
    const out: Record<string, ActivityResult> = {};
    data.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const id = asString(entry.id) || String(index);
      out[id] = asResult(entry);
    });
    return out;
  }
  if (!isRecord(data)) return {};
  if (!('ok' in data) && (isRecord(data.results) || Array.isArray(data.results)) && Object.keys(data).length === 1) {
    return asResults(data.results);
  }
  const out: Record<string, ActivityResult> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value)) continue;
    out[key] = asResult(value);
  }
  return out;
}

function asResult(value: Record<string, unknown>): ActivityResult {
  return {
    type: asString(value.type) || 'command',
    ok: value.ok === true,
    msg: asString(value.msg ?? value.message),
    at: asString(value.at),
  };
}

function asLaptopQueue(data: unknown): LaptopJob[] {
  const list = listFrom(data, ['jobs', 'queue', 'items', 'commands']);
  if (list) return jobsFromList(list);
  if (!isRecord(data)) return [];
  if (typeof data.type === 'string' || (typeof data.id === 'string' && !Object.values(data).some(isRecord))) {
    return jobsFromList([data]);
  }
  return Object.entries(data)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .map(([id, value], index) => asLaptopJob({ ...value, id: asString(value.id) || id }, index))
    .filter((job) => job.id || job.type);
}

function jobsFromList(list: unknown[]): LaptopJob[] {
  return list.filter(isRecord).map((entry, index) => asLaptopJob(entry, index)).filter((job) => job.id || job.type);
}

function asLaptopJob(value: Record<string, unknown>, index: number): LaptopJob {
  const itemId = asString(value.item_id ?? value.item);
  const text = asString(value.text ?? value.note);
  return {
    id: asString(value.id) || String(index),
    type: asString(value.type) || 'command',
    status: asString(value.status) || 'pending',
    ...(itemId ? { item_id: itemId } : {}),
    ...(text ? { text } : {}),
  };
}
