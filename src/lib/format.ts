import type { IgStatus } from '../types';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

interface IstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function istParts(date: Date): IstParts {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function formatIst(value?: string | null, empty = 'Not scheduled'): string {
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = istParts(date);
  const month = MONTHS[parts.month - 1] ?? 'Jan';
  const day = String(parts.day).padStart(2, '0');
  const hour = String(parts.hour).padStart(2, '0');
  const minute = String(parts.minute).padStart(2, '0');
  return `${day} ${month} ${parts.year}, ${hour}:${minute} IST`;
}

export function toDatetimeLocalIst(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = istParts(date);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  const hour = String(parts.hour).padStart(2, '0');
  const minute = String(parts.minute).padStart(2, '0');
  return `${parts.year}-${month}-${day}T${hour}:${minute}`;
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

export function toIstPublishAt(localValue: string): string | null {
  const match = LOCAL_DATE_TIME.exec(localValue.trim());
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+05:30`;
}

export type ChannelTone = 'casebook' | 'tenglish' | 'neutral';

export interface ChannelIdentity {
  tone: ChannelTone;
  name: string;
  handle: string;
}

export function channelIdentity(raw: string | undefined | null): ChannelIdentity {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('tenglish')) {
    return { tone: 'tenglish', name: 'Tenglish Gaming', handle: '@tenglishgaming' };
  }
  if (value.includes('casebook') || value.includes('atlas')) {
    return { tone: 'casebook', name: 'Casebook Atlas', handle: '@casebookatlas' };
  }
  const trimmed = (raw ?? '').trim();
  return {
    tone: 'neutral',
    name: trimmed || 'Unknown channel',
    handle: '',
  };
}

export function channelBucket(raw: string | undefined | null): ChannelTone {
  return channelIdentity(raw).tone;
}

export function laptopFreshness(
  iso: string | undefined,
  now = Date.now()
): { label: string; fresh: boolean } {
  if (!iso) return { label: 'Laptop not seen', fresh: false };
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return { label: 'Laptop not seen', fresh: false };
  const delta = now - time;
  if (delta < 0) return { label: 'Laptop just now', fresh: true };
  const fresh = delta < 10 * 60 * 1000;
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return { label: 'Laptop just now', fresh };
  if (mins < 60) return { label: `Laptop ${mins}m ago`, fresh };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `Laptop ${hours}h ago`, fresh };
  const days = Math.floor(hours / 24);
  return { label: `Laptop ${days}d ago`, fresh };
}

export function videoWatchUrl(videoId: string | undefined): string | undefined {
  if (!videoId) return undefined;
  return `https://youtu.be/${encodeURIComponent(videoId)}`;
}

export function videoThumbUrl(video: { video_id?: string; thumb?: string }): string | undefined {
  if (video.thumb) return video.thumb;
  if (!video.video_id) return undefined;
  return `https://i.ytimg.com/vi/${encodeURIComponent(video.video_id)}/hqdefault.jpg`;
}

export type ChipTone = 'good' | 'bad' | 'muted';

export function igStatusTone(status: IgStatus): ChipTone {
  switch (status) {
    case 'posted':
      return 'good';
    case 'failed':
      return 'bad';
    case 'queued':
    case 'held':
    case 'retry':
    case 'unknown':
      return 'muted';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function igStatusLabel(status: IgStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'held':
      return 'Held';
    case 'retry':
      return 'Retry';
    case 'posted':
      return 'Posted';
    case 'failed':
      return 'Failed';
    case 'unknown':
      return 'Unknown';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function jobStatusTone(status: string): ChipTone {
  const value = status.toLowerCase();
  if (value === 'done' || value === 'success' || value === 'ok') return 'good';
  if (value === 'failed' || value === 'error') return 'bad';
  return 'muted';
}

export function formatGpuHolder(holder: unknown): { label: string; busy: boolean } {
  if (holder == null || holder === false || holder === '') {
    return { label: 'Idle', busy: false };
  }
  if (typeof holder === 'string') {
    const trimmed = holder.trim();
    if (!trimmed || trimmed === 'idle' || trimmed === 'null') return { label: 'Idle', busy: false };
    return { label: trimmed, busy: true };
  }
  if (typeof holder === 'object') {
    const record = holder as Record<string, unknown>;
    const item = record.item_id ?? record.id ?? record.name;
    if (typeof item === 'string' && item.trim()) return { label: item.trim(), busy: true };
    try {
      return { label: JSON.stringify(holder), busy: true };
    } catch {
      return { label: 'Busy', busy: true };
    }
  }
  return { label: String(holder), busy: true };
}

export function scoreLabel(value: number): string {
  if (!Number.isFinite(value)) return 'Score —';
  return `Score ${value.toFixed(2)}`;
}
