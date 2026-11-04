import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubService } from './github';
import { StudioService } from './studio';

vi.mock('./github', () => ({
  GitHubService: {
    isAuthenticated: vi.fn(() => true),
    fetchFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

const video = {
  item_id: 'w14',
  video_id: 'abc',
  channel: 'casebook-atlas',
  privacy: 'private',
  qa_pass: true,
};

describe('StudioService.refresh', () => {
  beforeEach(() => {
    StudioService.resetForTests();
    vi.mocked(GitHubService.isAuthenticated).mockReturnValue(true);
    vi.mocked(GitHubService.fetchFile).mockReset();
    vi.mocked(GitHubService.writeFile).mockReset();
    vi.mocked(GitHubService.fetchFile).mockResolvedValue(null);
    vi.mocked(GitHubService.writeFile).mockResolvedValue(undefined);
  });

  it('stores laptop.json on laptop_queue and replaces state immutably', async () => {
    const before = StudioService.getState();
    vi.mocked(GitHubService.fetchFile).mockImplementation(async (path: string) => {
      if (path === 'state/youtube.json') return { videos: [video] };
      if (path === 'cmds/laptop.json') return [{ id: 'j1', type: 'render', status: 'pending', item_id: 'w14' }];
      if (path === 'state/qa.json') return { w14: { verdict: 'approve', p: 0.8, reasons: [] } };
      return null;
    });

    let notified = 0;
    const unsubscribe = StudioService.subscribe(() => {
      notified += 1;
    });
    const result = await StudioService.refresh();
    unsubscribe();

    expect(result.errors).toEqual([]);
    expect(StudioService.getVideos()).toEqual([video]);
    expect(StudioService.getLaptopQueue()).toEqual([
      { id: 'j1', type: 'render', status: 'pending', item_id: 'w14' },
    ]);
    expect(StudioService.getQA().w14?.verdict).toBe('approve');
    expect('laptop' in StudioService.getState()).toBe(false);
    expect(StudioService.getState()).not.toBe(before);
    expect(notified).toBe(1);
  });

  it('keeps earlier data when a later file is missing and reports a failed file', async () => {
    vi.mocked(GitHubService.fetchFile).mockImplementation(async (path: string) => {
      if (path === 'state/youtube.json') return JSON.stringify({ videos: [video] });
      return null;
    });
    await StudioService.refresh();

    vi.mocked(GitHubService.fetchFile).mockImplementation(async (path: string) => {
      if (path === 'state/qa.json') throw new Error('Failed to fetch state/qa.json');
      return null;
    });
    const result = await StudioService.refresh();

    expect(StudioService.getVideos()).toHaveLength(1);
    expect(result.errors).toContain('Failed to fetch state/qa.json');
  });

  it('writes inbox commands with an id and does not duplicate an in-flight refresh', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(GitHubService.fetchFile).mockImplementation(async () => {
      await gate;
      return null;
    });
    const first = StudioService.refresh();
    const second = StudioService.refresh();
    release();
    await Promise.all([first, second]);
    expect(GitHubService.fetchFile).toHaveBeenCalledTimes(9);

    vi.mocked(GitHubService.fetchFile).mockResolvedValue(null);
    await StudioService.sendCommand({ type: 'note', text: 'hello' });
    const [path, body, message] = vi.mocked(GitHubService.writeFile).mock.calls[0];
    expect(path).toMatch(/^cmds\/inbox\/.+\.json$/);
    expect(body).toMatchObject({ type: 'note', text: 'hello', status: 'pending' });
    expect(message).toBe('app: note');
  });

  it('maps every studio file and keeps command fields', async () => {
    vi.mocked(GitHubService.fetchFile).mockImplementation(async (path: string) => {
      const files: Record<string, unknown> = {
        'state/youtube.json': JSON.stringify({ videos: [video] }),
        'state/qa.json': { w14: { verdict: 'approve', p: 0.5, reasons: ['ok'] } },
        'state/render.json': { gpu_holder: null, waiting: ['w14'], ordered_queue_log: [{ item_id: 'w14', status: 'done', at: '2026-01-01T00:00:00Z' }] },
        'state/schedule.json': { pairs: [{ case_file: 1, short: 's', short_at: 'a', long: 'l', long_at: 'b' }] },
        'state/heartbeat.json': { laptop_seen: '2026-04-02T10:00:00Z' },
        'state/laptop_jobs.json': { j1: { status: 'running' } },
        'state/ig.json': { items: [{ id: 'p', channel: 'casebook-atlas', kind: 'reel', status: 'queued' }] },
        'cmds/results.json': { r1: { type: 'note', ok: true, msg: 'saved', at: '2026-04-02T10:00:00Z' } },
        'cmds/laptop.json': { j1: { type: 'render', status: 'pending', item_id: 'w14' } },
      };
      return files[path] ?? null;
    });

    const result = await StudioService.refresh();
    expect(result.errors).toEqual([]);
    const state = StudioService.getState();
    expect(state.youtube?.videos).toHaveLength(1);
    expect(state.qa?.w14?.verdict).toBe('approve');
    expect(state.render?.waiting).toEqual(['w14']);
    expect(state.schedule?.pairs[0]?.case_file).toBe(1);
    expect(state.heartbeat?.laptop_seen).toBe('2026-04-02T10:00:00Z');
    expect(state.laptop_jobs?.j1?.status).toBe('running');
    expect(state.ig?.items[0]?.id).toBe('p');
    expect(state.results?.r1?.msg).toBe('saved');
    expect(state.laptop_queue?.[0]).toMatchObject({ id: 'j1', type: 'render', item_id: 'w14' });

    const commands = [
      { type: 'yt_schedule', channel: 'casebook-atlas', video_id: 'abc', publish_at: '2026-05-01T18:30:00+05:30', approve: true },
      { type: 'yt_title', channel: 'casebook-atlas', video_id: 'abc', title: 'Title' },
      { type: 'render', item_id: 'w14' },
      { type: 'ig_hold', item: 'p' },
      { type: 'ig_release', item: 'p' },
      { type: 'ig_caption', item: 'p', caption: 'Hello' },
      { type: 'note', text: 'Do the thing' },
    ];
    for (const command of commands) {
      await StudioService.sendCommand(command);
      const calls = vi.mocked(GitHubService.writeFile).mock.calls;
      const written = calls[calls.length - 1]?.[1];
      expect(written).toMatchObject({ ...command, status: 'pending' });
    }
  });
});
