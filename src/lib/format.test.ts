import { describe, expect, it } from 'vitest';
import {
  channelIdentity,
  formatGpuHolder,
  formatIst,
  igStatusTone,
  laptopFreshness,
  toDatetimeLocalIst,
  toIstPublishAt,
  videoThumbUrl,
  videoWatchUrl,
} from './format';

describe('formatIst', () => {
  it('renders a fixed IST timestamp', () => {
    expect(formatIst('2026-01-15T08:30:00.000Z')).toBe('15 Jan 2026, 14:00 IST');
  });

  it('keeps an unparseable string and fills empty values', () => {
    expect(formatIst('already IST')).toBe('already IST');
    expect(formatIst(undefined)).toBe('Not scheduled');
    expect(formatIst('', 'Not seen yet')).toBe('Not seen yet');
  });
});

describe('publish time conversion', () => {
  it('round-trips an IST local value', () => {
    expect(toDatetimeLocalIst('2026-01-15T08:30:00.000Z')).toBe('2026-01-15T14:00');
    expect(toIstPublishAt('2026-05-01T18:30')).toBe('2026-05-01T18:30:00+05:30');
  });

  it('accepts optional seconds from a WebView and rejects impossible dates', () => {
    expect(toIstPublishAt('2026-05-01T18:30:45')).toBe('2026-05-01T18:30:00+05:30');
    expect(toIstPublishAt('2026-13-01T18:30')).toBeNull();
    expect(toIstPublishAt('')).toBeNull();
  });
});

describe('channelIdentity', () => {
  it('recognises both studios from loose labels', () => {
    expect(channelIdentity('casebook-atlas')).toMatchObject({
      tone: 'casebook',
      name: 'Casebook Atlas',
      handle: '@casebookatlas',
    });
    expect(channelIdentity('Tenglish Gaming')).toMatchObject({
      tone: 'tenglish',
      handle: '@tenglishgaming',
    });
    expect(channelIdentity('something-else').tone).toBe('neutral');
  });
});

describe('laptopFreshness', () => {
  const now = Date.parse('2026-04-02T12:00:00.000Z');

  it('marks a recent heartbeat as fresh', () => {
    expect(laptopFreshness('2026-04-02T11:56:00.000Z', now)).toEqual({
      label: 'Laptop 4m ago',
      fresh: true,
    });
  });

  it('marks an old heartbeat as stale', () => {
    expect(laptopFreshness('2026-04-02T10:00:00.000Z', now)).toEqual({
      label: 'Laptop 2h ago',
      fresh: false,
    });
    expect(laptopFreshness(undefined, now).fresh).toBe(false);
  });
});

describe('previews and status', () => {
  it('prefers a real thumbnail and otherwise uses the YouTube image', () => {
    expect(videoThumbUrl({ video_id: 'abc', thumb: 'https://cdn.example/t.jpg' })).toBe(
      'https://cdn.example/t.jpg'
    );
    expect(videoThumbUrl({ video_id: 'abc' })).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
    expect(videoWatchUrl('abc')).toBe('https://youtu.be/abc');
    expect(videoThumbUrl({})).toBeUndefined();
  });

  it('reserves red for failures', () => {
    expect(igStatusTone('posted')).toBe('good');
    expect(igStatusTone('failed')).toBe('bad');
    expect(igStatusTone('held')).toBe('muted');
    expect(igStatusTone('queued')).toBe('muted');
  });

  it('formats the GPU holder without dumping idle objects', () => {
    expect(formatGpuHolder(null)).toEqual({ label: 'Idle', busy: false });
    expect(formatGpuHolder('idle')).toEqual({ label: 'Idle', busy: false });
    expect(formatGpuHolder({ item_id: 'w14-long' })).toEqual({ label: 'w14-long', busy: true });
  });
});
