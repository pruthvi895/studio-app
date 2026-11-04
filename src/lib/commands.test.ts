import { describe, expect, it } from 'vitest';
import {
  buildCaptionCommand,
  buildHoldCommand,
  buildNoteCommand,
  buildRejectVideoCommand,
  buildReleaseCommand,
  buildRenderCommand,
  buildScheduleCommand,
  buildTitleCommand,
} from './commands';

describe('command payloads', () => {
  it('builds an approve-and-schedule command in IST', () => {
    expect(
      buildScheduleCommand({
        channel: 'casebook-atlas',
        videoId: 'abc',
        localDateTime: '2026-05-01T18:30',
      })
    ).toEqual({
      ok: true,
      command: {
        type: 'yt_schedule',
        channel: 'casebook-atlas',
        video_id: 'abc',
        publish_at: '2026-05-01T18:30:00+05:30',
        approve: true,
      },
    });
  });

  it('refuses an empty schedule, title, caption, render, or note', () => {
    expect(buildScheduleCommand({ channel: 'c', videoId: 'v', localDateTime: '' }).ok).toBe(false);
    expect(buildTitleCommand({ channel: 'c', videoId: 'v', title: '   ' }).ok).toBe(false);
    expect(buildCaptionCommand('post-1', '  ').ok).toBe(false);
    expect(buildRenderCommand('  ').ok).toBe(false);
    expect(buildNoteCommand(' ').ok).toBe(false);
  });

  it('builds hold, release, render, and title payloads', () => {
    expect(buildHoldCommand(' ig1 ')).toEqual({ ok: true, command: { type: 'ig_hold', item: 'ig1' } });
    expect(buildReleaseCommand('ig1')).toEqual({ ok: true, command: { type: 'ig_release', item: 'ig1' } });
    expect(buildRenderCommand(' w14 ')).toEqual({ ok: true, command: { type: 'render', item_id: 'w14' } });
    expect(buildTitleCommand({ channel: 'casebook-atlas', videoId: 'abc', title: '  New  ' })).toEqual({
      ok: true,
      command: { type: 'yt_title', channel: 'casebook-atlas', video_id: 'abc', title: 'New' },
    });
  });

  it('trims caption and note text', () => {
    expect(buildCaptionCommand(' post ', '  hello  ')).toEqual({
      ok: true,
      command: { type: 'ig_caption', item: 'post', caption: 'hello' },
    });
    expect(buildNoteCommand('  hold the short  ')).toEqual({
      ok: true,
      command: { type: 'note', text: 'hold the short' },
    });
  });

  it('sends a reject as an instruction the laptop already understands', () => {
    const built = buildRejectVideoCommand({
      item_id: 'w14-long',
      video_id: 'abc',
      channel: 'casebook-atlas',
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.command.type).toBe('note');
      expect(built.command.text).toContain('Reject video w14-long');
      expect(built.command.text).toContain('casebook-atlas');
    }
  });
});
