import type { DeviceFlowResponse, StudioState } from '../types';

export const sampleDeviceFlow: DeviceFlowResponse = {
  device_code: 'smoke-device-code',
  user_code: 'CBK-STUD',
  verification_uri: 'https://github.com/login/device',
  verification_uri_complete: 'https://github.com/login/device?user_code=CBK-STUD',
  expires_in: 900,
  interval: 45,
};

export const sampleStudioState: StudioState = {
  heartbeat: { laptop_seen: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  youtube: {
    videos: [
      {
        item_id: 'w14-long',
        video_id: 'abc123',
        channel: 'casebook-atlas',
        privacy: 'private',
        qa_pass: false,
        title: 'Case file 14',
        publish_at: '2026-05-02T18:00:00+05:30',
      },
      {
        item_id: 'w12-short',
        video_id: 'def456',
        channel: 'tenglish-gaming',
        privacy: 'public',
        qa_pass: true,
        title: 'Ranked night',
        publish_at: '2026-04-20T20:00:00+05:30',
      },
      {
        item_id: 'w15-short',
        video_id: 'ghi789',
        channel: 'casebook-atlas',
        privacy: 'private',
        qa_pass: true,
        title: 'Unscheduled short',
      },
    ],
  },
  qa: {
    'w14-long': { verdict: 'reject', p: 0.42, reasons: ['Audio dips in the cold open'] },
    'w9-long': { verdict: 'approve', p: 0.91, reasons: ['Ready to render'] },
  },
  schedule: {
    pairs: [
      {
        case_file: 14,
        short: 'The alley',
        short_at: '2026-05-02T09:00:00+05:30',
        long: 'Full file',
        long_at: '2026-05-02T18:00:00+05:30',
      },
      {
        case_file: 15,
        short: 'Lobby clip',
        short_at: '2026-05-03T11:00:00+05:30',
        long: 'Match review',
        long_at: '2026-05-03T19:30:00+05:30',
      },
    ],
  },
  ig: {
    items: [
      {
        id: 'ig-queued',
        channel: 'casebook-atlas',
        kind: 'reel',
        status: 'queued',
        when_ist: '2026-05-04T18:00:00+05:30',
        caption: 'Casebook Atlas queued reel.',
      },
      {
        id: 'ig-held',
        channel: 'casebook-atlas',
        kind: 'image',
        status: 'held',
        when_ist: '2026-05-03T12:00:00+05:30',
        caption: 'Held until the title is final.',
      },
      {
        id: 'ig-retry',
        channel: 'tenglish-gaming',
        kind: 'reel',
        status: 'retry',
        when_ist: '2026-05-02T21:00:00+05:30',
        caption: 'Retry the ranked clip.',
      },
      {
        id: 'ig-posted',
        channel: 'tenglish-gaming',
        kind: 'image',
        status: 'posted',
        when_ist: '2026-04-28T16:00:00+05:30',
        caption: 'Posted lobby still.',
        permalink: 'https://instagram.com/p/posted',
      },
      {
        id: 'ig-failed',
        channel: 'casebook-atlas',
        kind: 'story',
        status: 'failed',
        when_ist: '2026-04-27T09:00:00+05:30',
        caption: 'Story failed to publish.',
      },
      {
        id: 'ig-unknown',
        channel: 'tenglish-gaming',
        kind: 'carousel',
        status: 'unknown',
        caption: 'Status not recognised yet.',
      },
    ],
  },
  render: {
    gpu_holder: { item_id: 'w14-long' },
    waiting: ['w15-short', 'w9-long'],
    ordered_queue_log: [
      { item_id: 'w12-short', status: 'done', at: '2026-04-20T12:00:00Z' },
      { item_id: 'w11-long', status: 'failed', at: '2026-04-18T08:00:00Z' },
    ],
  },
  laptop_jobs: {
    job1: { status: 'running' },
    job2: { status: 'done' },
  },
  laptop_queue: [
    { id: 'job1', type: 'render', status: 'pending', item_id: 'w15-short' },
    { id: 'job2', type: 'note', status: 'done', text: 'Hold the Thursday reel' },
  ],
  results: {
    old: { type: 'note', ok: true, msg: 'Instruction saved', at: '2026-04-01T10:00:00Z' },
    newer: { type: 'yt_schedule', ok: false, msg: 'Video was already public', at: '2026-04-18T10:00:00Z' },
  },
};
