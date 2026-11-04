import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleStudioState } from '../fixtures/studio';
import type { SendResult, StudioState } from '../types';
import { ActivityScreen } from './ActivityScreen';
import { InstagramScreen } from './InstagramScreen';
import { RenderScreen } from './RenderScreen';
import { ReviewScreen } from './ReviewScreen';
import { SettingsSheet } from './SettingsSheet';
import { VideosScreen } from './VideosScreen';
import { InstructSheet } from './forms';

const ok = async (): Promise<SendResult> => ({ ok: true });

describe('Review tab', () => {
  it('shows a loading and an empty state', () => {
    const { rerender } = render(<ReviewScreen state={{}} hasLoaded={false} isSending={false} onCommand={ok} />);
    expect(screen.getByText('Loading studio')).toBeTruthy();
    rerender(<ReviewScreen state={{}} hasLoaded isSending={false} onCommand={ok} />);
    expect(screen.getAllByText('Nothing waiting').length).toBeGreaterThan(0);
  });

  it('lists unpublished videos, open posts, and quality checks that are not uploaded', () => {
    render(<ReviewScreen state={sampleStudioState} hasLoaded isSending={false} onCommand={ok} />);
    expect(screen.getByRole('heading', { name: 'Case file 14' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Unscheduled short' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Ranked night' })).toBeNull();
    expect(screen.getByText('Casebook Atlas queued reel.')).toBeTruthy();
    expect(screen.getByText('Held until the title is final.')).toBeTruthy();
    expect(screen.getByText('Retry the ranked clip.')).toBeTruthy();
    expect(screen.queryByText('Posted lobby still.')).toBeNull();
    expect(screen.queryByText('Story failed to publish.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'w9-long' })).toBeTruthy();
    expect(screen.getByText('Ready to render')).toBeTruthy();
  });

  it('does not send a schedule twice when the button is tapped twice', async () => {
    let release: (result: SendResult) => void = () => undefined;
    const onCommand = vi.fn(
      () =>
        new Promise<SendResult>((resolve) => {
          release = resolve;
        })
    );
    render(<ReviewScreen state={sampleStudioState} hasLoaded isSending={false} onCommand={onCommand} />);
    const card = screen.getByRole('heading', { name: 'Unscheduled short' }).closest('article');
    if (!card) throw new Error('missing video');
    fireEvent.click(within(card).getByRole('button', { name: 'Approve' }));
    fireEvent.change(screen.getByLabelText('Publish time (IST)'), { target: { value: '2026-06-01T09:15' } });
    const submit = screen.getByRole('button', { name: 'Approve and schedule' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: 'yt_schedule',
      channel: 'casebook-atlas',
      video_id: 'ghi789',
      publish_at: '2026-06-01T09:15:00+05:30',
      approve: true,
    });
    await act(async () => {
      release({ ok: true });
    });
  });
});

describe('Videos tab', () => {
  it('shows the library and an empty plan', async () => {
    const user = userEvent.setup();
    const state: StudioState = { youtube: { videos: [] }, schedule: { pairs: [] } };
    render(<VideosScreen state={state} hasLoaded isSending={false} onCommand={ok} />);
    expect(screen.getByText('No videos')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(screen.getByText('No plan yet')).toBeTruthy();
  });

  it('shows both channels and edits a title from the library', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(ok);
    render(<VideosScreen state={sampleStudioState} hasLoaded isSending={false} onCommand={onCommand} />);
    expect(screen.getByRole('heading', { name: 'Ranked night' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Case file 14' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Tenglish Gaming' }));
    expect(screen.getByRole('heading', { name: 'Ranked night' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Case file 14' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'All' }));
    const card = screen.getByRole('heading', { name: 'Ranked night' }).closest('article');
    if (!card) throw new Error('missing video');
    await user.click(within(card).getByRole('button', { name: 'Edit title' }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Night shift');
    await user.click(screen.getByRole('button', { name: 'Save title' }));
    expect(onCommand).toHaveBeenCalledWith({
      type: 'yt_title',
      channel: 'tenglish-gaming',
      video_id: 'def456',
      title: 'Night shift',
    });
  });
});

describe('Instagram tab', () => {
  it('filters both accounts and every status', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(ok);
    render(<InstagramScreen state={sampleStudioState} hasLoaded isSending={false} onCommand={onCommand} />);

    expect(screen.getByText('Casebook Atlas queued reel.')).toBeTruthy();
    expect(screen.getByText('Held until the title is final.')).toBeTruthy();
    expect(screen.getByText('Story failed to publish.')).toBeTruthy();
    expect(screen.queryByText('Retry the ranked clip.')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Queued' }));
    expect(screen.getByText('Casebook Atlas queued reel.')).toBeTruthy();
    expect(screen.queryByText('Held until the title is final.')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Held' }));
    expect(screen.getByText('Held until the title is final.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Failed' }));
    expect(screen.getByText('Story failed to publish.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.click(screen.getByRole('tab', { name: '@tenglishgaming' }));
    expect(screen.getByText('Retry the ranked clip.')).toBeTruthy();
    expect(screen.getByText('Posted lobby still.')).toBeTruthy();
    expect(screen.getByText('Status not recognised yet.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Retry the ranked clip.')).toBeTruthy();
    expect(screen.queryByText('Posted lobby still.')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Posted' }));
    expect(screen.getByText('Posted lobby still.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Unknown' }));
    expect(screen.getByText('Status not recognised yet.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'All' }));
    const retry = screen.getByText('Retry the ranked clip.').closest('article');
    if (!retry) throw new Error('missing retry');
    await user.click(within(retry).getByRole('button', { name: 'Hold' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'ig_hold', item: 'ig-retry' });

    await user.click(screen.getByRole('tab', { name: '@casebookatlas' }));
    await user.click(screen.getByRole('button', { name: 'Held' }));
    const held = screen.getByText('Held until the title is final.').closest('article');
    if (!held) throw new Error('missing held');
    await user.click(within(held).getByRole('button', { name: 'Release' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'ig_release', item: 'ig-held' });
    await user.click(within(held).getByRole('button', { name: 'Edit caption' }));
    const caption = screen.getByLabelText('Caption');
    await user.clear(caption);
    await user.type(caption, 'Updated caption');
    await user.click(screen.getByRole('button', { name: 'Save caption' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'ig_caption', item: 'ig-held', caption: 'Updated caption' });
  });

  it('shows an empty account', () => {
    render(<InstagramScreen state={{ ig: { items: [] } }} hasLoaded isSending={false} onCommand={ok} />);
    expect(screen.getByText('No posts')).toBeTruthy();
  });
});

describe('Render tab', () => {
  it('shows idle and an empty queue', () => {
    render(
      <RenderScreen
        state={{ render: { waiting: [], ordered_queue_log: [] } }}
        hasLoaded
        isSending={false}
        onCommand={ok}
      />
    );
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.getByText('No phone jobs')).toBeTruthy();
    expect(screen.queryByText('Render log')).toBeNull();
  });

  it('shows a busy GPU, the phone queue, and the log', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(ok);
    render(<RenderScreen state={sampleStudioState} hasLoaded isSending={false} onCommand={onCommand} />);
    expect(screen.getAllByText('w14-long').length).toBeGreaterThan(0);
    expect(screen.getAllByText('w15-short').length).toBeGreaterThan(0);
    expect(screen.getByText('Hold the Thursday reel')).toBeTruthy();
    expect(screen.getByText('Render log')).toBeTruthy();
    expect(screen.getByText('w12-short')).toBeTruthy();
    expect(screen.getByText('w11-long')).toBeTruthy();

    let release: (result: SendResult) => void = () => undefined;
    onCommand.mockImplementation(
      () =>
        new Promise<SendResult>((resolve) => {
          release = resolve;
        })
    );
    await user.type(screen.getByLabelText('Item id'), 'w9-long');
    await user.click(screen.getByRole('button', { name: 'Queue render' }));
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Queue render' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({ type: 'render', item_id: 'w9-long' });
    await act(async () => {
      release({ ok: true });
    });
  });
});

describe('Activity, instruct, and settings', () => {
  it('shows an empty log and sends an instruction', async () => {
    const user = userEvent.setup();
    const onInstruct = vi.fn();
    const { rerender } = render(<ActivityScreen state={{}} hasLoaded onInstruct={onInstruct} />);
    expect(screen.getByText('No activity yet')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Instruct the assistant' }));
    expect(onInstruct).toHaveBeenCalledTimes(1);

    rerender(<ActivityScreen state={sampleStudioState} hasLoaded onInstruct={onInstruct} />);
    expect(screen.getByText('Instruction saved')).toBeTruthy();
    expect(screen.getByText('Video was already public')).toBeTruthy();
    const rows = screen.getAllByRole('heading', { level: 2 });
    expect(rows[0]?.textContent).toBe('yt_schedule');
  });

  it('sends a note from the instruct sheet', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(ok);
    const onClose = vi.fn();
    render(<InstructSheet busy={false} onClose={onClose} onCommand={onCommand} />);
    const dialog = screen.getByRole('dialog', { name: 'Instruction' });
    await user.type(within(dialog).getByRole('textbox'), '  Publish the short Friday  ');
    await user.click(screen.getByRole('button', { name: 'Send instruction' }));
    expect(onCommand).toHaveBeenCalledWith({ type: 'note', text: 'Publish the short Friday' });
  });

  it('signs out from settings', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn(async () => undefined);
    render(<SettingsSheet state={sampleStudioState} onClose={() => undefined} onSignOut={onSignOut} />);
    expect(screen.getByText('pruthvi895')).toBeTruthy();
    expect(screen.getByText(/Laptop \d+m ago/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
