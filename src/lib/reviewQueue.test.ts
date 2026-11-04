import { describe, expect, it } from 'vitest';
import { buildReviewQueue, listActivity, reviewSummary, videoNeedsDecision } from './reviewQueue';
import type { StudioState, Video } from '../types';

const video = (overrides: Partial<Video>): Video => ({
  item_id: 'w1',
  video_id: 'vid',
  channel: 'casebook-atlas',
  privacy: 'private',
  qa_pass: true,
  ...overrides,
});

describe('videoNeedsDecision', () => {
  it('asks for a decision when a video is not public and not scheduled', () => {
    expect(videoNeedsDecision(video({ privacy: 'private' }))).toBe(true);
    expect(videoNeedsDecision(video({ privacy: 'Public' }))).toBe(false);
    expect(videoNeedsDecision(video({ privacy: 'private', publish_at: '2026-05-01T18:30:00+05:30' }))).toBe(
      false
    );
    expect(
      videoNeedsDecision(video({ privacy: 'private', publish_at: '2026-05-01T18:30:00+05:30', qa_pass: false }))
    ).toBe(true);
  });
});

describe('buildReviewQueue', () => {
  const state: StudioState = {
    youtube: {
      videos: [
        video({ item_id: 'uploaded', video_id: 'aaa', privacy: 'public' }),
        video({ item_id: 'queued', video_id: 'bbb', privacy: 'private' }),
      ],
    },
    qa: {
      uploaded: { verdict: 'approve', p: 0.9, reasons: [] },
      'not-uploaded': { verdict: 'reject', p: 0.2, reasons: ['audio'] },
    },
    ig: {
      items: [
        { id: 'p1', channel: 'tenglish-gaming', kind: 'reel', status: 'queued', when_ist: '2026-05-01T10:00:00+05:30' },
        { id: 'p2', channel: 'casebook-atlas', kind: 'image', status: 'posted' },
        { id: 'p3', channel: 'casebook-atlas', kind: 'story', status: 'held' },
        { id: 'p4', channel: 'tenglish-gaming', kind: 'reel', status: 'retry' },
        { id: 'p5', channel: 'casebook-atlas', kind: 'story', status: 'failed' },
      ],
    },
  };

  it('includes unpublished videos, open posts, and quality checks that are not uploaded', () => {
    const queue = buildReviewQueue(state);
    expect(queue.map((entry) => entry.kind + ':' + ('itemId' in entry ? entry.itemId : entry.kind === 'video' ? entry.video.item_id : entry.post.id))).toEqual([
      'video:queued',
      'post:p1',
      'post:p3',
      'post:p4',
      'qa:not-uploaded',
    ]);
    expect(reviewSummary(queue)).toBe('1 video · 3 posts · 1 quality check');
    expect(reviewSummary([])).toBe('Nothing waiting');
  });
});

describe('listActivity', () => {
  it('sorts newest first and caps the list', () => {
    const rows = listActivity({
      old: { type: 'note', ok: true, msg: 'first', at: '2026-01-01T00:00:00Z' },
      newer: { type: 'render', ok: false, msg: 'second', at: '2026-02-01T00:00:00Z' },
    });
    expect(rows.map((row) => row.id)).toEqual(['newer', 'old']);
  });
});
