import { describe, expect, it } from 'vitest';
import { FILE_TO_KEY, mapStateFile, unwrapGitHubContent } from './stateMap';

describe('file key mapping', () => {
  it('maps cmds/laptop.json onto laptop_queue', () => {
    expect(FILE_TO_KEY['cmds/laptop.json']).toBe('laptop_queue');
    expect(FILE_TO_KEY['state/youtube.json']).toBe('youtube');
    expect(FILE_TO_KEY['cmds/results.json']).toBe('results');
  });
});

describe('mapStateFile', () => {
  it('reads a YouTube payload from an object, an array, or a JSON string', () => {
    const video = {
      item_id: 'w14',
      video_id: 'abc',
      channel: 'casebook-atlas',
      privacy: 'private',
      qa_pass: true,
    };
    expect(mapStateFile('state/youtube.json', { videos: [video] })?.value).toEqual({ videos: [video] });
    expect(mapStateFile('state/youtube.json', [video])?.value).toEqual({ videos: [video] });
    expect(mapStateFile('state/youtube.json', JSON.stringify({ items: [video] }))?.value).toEqual({
      videos: [video],
    });
  });

  it('unwraps a base64 GitHub contents response', () => {
    const payload = { videos: [{ item_id: 'a', video_id: 'b', channel: 'tenglish', privacy: 'public', qa_pass: false }] };
    const wrapped = { encoding: 'base64', content: btoa(JSON.stringify(payload)), name: 'youtube.json' };
    expect(unwrapGitHubContent(wrapped)).toEqual(payload);
    expect(mapStateFile('state/youtube.json', wrapped)?.key).toBe('youtube');
  });

  it('reads the laptop queue from an array or a jobs wrapper', () => {
    const jobs = [{ id: 'j1', type: 'render', status: 'pending', item_id: 'w14' }];
    expect(mapStateFile('cmds/laptop.json', jobs)).toEqual({ key: 'laptop_queue', value: jobs });
    expect(mapStateFile('cmds/laptop.json', { jobs })).toEqual({ key: 'laptop_queue', value: jobs });
  });

  it('normalises qa, heartbeat, and instagram shapes', () => {
    expect(
      mapStateFile('state/qa.json', [{ id: 'w3', verdict: 'reject', p: '0.2', reasons: ['cut'] }])?.value
    ).toEqual({
      w3: { verdict: 'reject', p: 0.2, reasons: ['cut'] },
    });
    expect(mapStateFile('state/heartbeat.json', { last_seen: '2026-04-02T10:00:00Z' })?.value).toEqual({
      laptop_seen: '2026-04-02T10:00:00Z',
    });
    const ig = mapStateFile('state/ig.json', {
      posts: [{ id: 'p1', channel: 'casebook-atlas', kind: 'reel', status: 'held', caption: ' hi ' }],
    });
    expect(ig?.key).toBe('ig');
    if (ig?.key === 'ig') {
      expect(ig.value.items[0]).toMatchObject({ id: 'p1', status: 'held', caption: 'hi' });
    }
  });

  it('normalises every studio file, including laptop queue shapes', () => {
    expect(mapStateFile('state/render.json', { gpu_holder: 'w14', waiting: [{ item_id: 'w15' }], ordered_queue_log: [] })?.value).toEqual({
      gpu_holder: 'w14',
      waiting: ['w15'],
      ordered_queue_log: [],
    });
    expect(mapStateFile('state/schedule.json', { items: [{ case_file: 2, short: 's', short_at: 'a', long: 'l', long_at: 'b' }] })?.key).toBe('schedule');
    expect(mapStateFile('state/laptop_jobs.json', [{ id: 'j1', status: 'running' }])?.value).toEqual({
      j1: { status: 'running' },
    });
    expect(mapStateFile('state/laptop_jobs.json', { jobs: { j2: 'done' } })?.value).toEqual({
      j2: { status: 'done' },
    });
    expect(mapStateFile('cmds/results.json', { results: [{ id: 'r1', type: 'note', ok: true, msg: 'saved', at: 't' }] })?.value).toEqual({
      r1: { type: 'note', ok: true, msg: 'saved', at: 't' },
    });
    expect(mapStateFile('cmds/laptop.json', { j1: { type: 'ig_hold', status: 'pending', item: 'ig1', note: 'hold it' } })).toEqual({
      key: 'laptop_queue',
      value: [{ id: 'j1', type: 'ig_hold', status: 'pending', item_id: 'ig1', text: 'hold it' }],
    });
    const ig = mapStateFile('state/ig.json', { items: [{ id: 'p', channel: 'tenglish-gaming', kind: 'reel', status: 'Held' }] });
    expect(ig?.key).toBe('ig');
    if (ig?.key === 'ig') expect(ig.value.items[0]?.status).toBe('held');
    expect(mapStateFile('state/qa.json', { w1: { verdict: 'Approve', p: 1, reasons: [] } })?.value).toEqual({
      w1: { verdict: 'approve', p: 1, reasons: [] },
    });
  });

  it('returns null for an unknown path or unreadable body', () => {
    expect(mapStateFile('state/nope.json', { videos: [] })).toBeNull();
    expect(mapStateFile('state/youtube.json', 'not-json')).toBeNull();
    expect(mapStateFile('cmds/laptop.json', { encoding: 'base64', content: '%%%' })).toBeNull();
  });
});
