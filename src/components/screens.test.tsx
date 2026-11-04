import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewScreen } from './ReviewScreen';
import { VideosScreen } from './VideosScreen';
import type { SendResult, StudioState } from '../types';

const state: StudioState = {
  youtube: {
    videos: [
      {
        item_id: 'w14-long',
        video_id: 'abc123',
        channel: 'casebook-atlas',
        privacy: 'private',
        qa_pass: false,
        title: 'Case file 14',
      },
    ],
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
    ],
  },
  ig: {
    items: [
      {
        id: 'ig1',
        channel: 'tenglish-gaming',
        kind: 'reel',
        status: 'queued',
        caption: 'Drop in.',
      },
    ],
  },
};

describe('studio screens', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'prompt').mockImplementation(() => 'caption');
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('approves a video from an in-app sheet', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(async (): Promise<SendResult> => ({ ok: true }));
    render(<ReviewScreen state={state} hasLoaded isSending={false} onCommand={onCommand} />);

    expect(screen.getByRole('heading', { name: 'Case file 14' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'reel' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('dialog', { name: 'Approve and schedule' })).toBeTruthy();
    expect(window.confirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Publish time (IST)'), {
      target: { value: '2026-05-01T18:30' },
    });
    await user.click(screen.getByRole('button', { name: 'Approve and schedule' }));

    expect(onCommand).toHaveBeenCalledWith({
      type: 'yt_schedule',
      channel: 'casebook-atlas',
      video_id: 'abc123',
      publish_at: '2026-05-01T18:30:00+05:30',
      approve: true,
    });
  });

  it('rejects a post without window.prompt', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(async (): Promise<SendResult> => ({ ok: true }));
    render(<ReviewScreen state={state} hasLoaded isSending={false} onCommand={onCommand} />);

    const reel = screen.getByRole('heading', { name: 'reel' }).closest('article');
    if (!reel) throw new Error('missing post');
    await user.click(within(reel).getByRole('button', { name: 'Reject' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' }));

    expect(window.prompt).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(onCommand).toHaveBeenCalledWith({ type: 'ig_hold', item: 'ig1' });
  });

  it('opens the plan from Videos', async () => {
    const user = userEvent.setup();
    render(
      <VideosScreen
        state={state}
        hasLoaded
        isSending={false}
        onCommand={async () => ({ ok: true })}
      />
    );
    await user.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(screen.getByRole('heading', { name: '#14' })).toBeTruthy();
    expect(screen.getByText('The alley')).toBeTruthy();
  });
});
