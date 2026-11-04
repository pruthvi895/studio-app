import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapacitorHttp, type HttpOptions, type HttpResponse } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleStudioState } from './fixtures/studio';
import { App } from './App';
import { GitHubService } from './services/github';
import { StudioService } from './services/studio';

const files: Record<string, unknown> = {
  'state/youtube.json': sampleStudioState.youtube,
  'state/qa.json': sampleStudioState.qa,
  'state/render.json': sampleStudioState.render,
  'state/schedule.json': sampleStudioState.schedule,
  'state/heartbeat.json': sampleStudioState.heartbeat,
  'state/laptop_jobs.json': sampleStudioState.laptop_jobs,
  'state/ig.json': sampleStudioState.ig,
  'cmds/results.json': sampleStudioState.results,
  'cmds/laptop.json': sampleStudioState.laptop_queue,
};

function mockStudio(overrides?: Record<string, number>): void {
  vi.mocked(CapacitorHttp.get).mockImplementation(async (options: HttpOptions) => {
    const path = options.url.split('/contents/')[1] ?? '';
    if (overrides?.[path]) {
      return { status: overrides[path], data: '', headers: {}, url: options.url } as HttpResponse;
    }
    return { status: 200, data: files[path] ?? null, headers: {}, url: options.url } as HttpResponse;
  });
}

describe('App', () => {
  beforeEach(async () => {
    StudioService.resetForTests();
    await GitHubService.signOut();
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);
    mockStudio();
  });

  it('shows sign-in until a saved token loads every tab', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    expect(await screen.findByRole('button', { name: 'Sign in with GitHub' })).toBeTruthy();
    view.unmount();

    vi.mocked(Preferences.get).mockResolvedValue({ value: 'saved-token' });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Case file 14' })).toBeTruthy();
    expect(screen.queryByText('Nothing waiting')).toBeNull();
    expect(screen.getByText(/Laptop/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Videos' }));
    expect(screen.getByRole('heading', { name: 'Ranked night' })).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(screen.getByRole('heading', { name: '#14' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Instagram' }));
    expect(screen.getByText('Casebook Atlas queued reel.')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: '@tenglishgaming' }));
    expect(screen.getByText('Retry the ranked clip.')).toBeTruthy();
    expect(screen.getByText('Posted lobby still.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Render' }));
    expect(screen.getByText('w14-long')).toBeTruthy();
    expect(screen.getByText('Hold the Thursday reel')).toBeTruthy();
    expect(screen.getByText('w12-short')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Activity' }));
    expect(screen.getByText('Instruction saved')).toBeTruthy();
    expect(screen.getByText('Video was already public')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Instruct the assistant' }));
    const instruction = screen.getByRole('dialog', { name: 'Instruction' });
    expect(instruction).toBeTruthy();
    await user.click(within(instruction).getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText('pruthvi895')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Sign in with GitHub' })).toBeTruthy();
    expect(GitHubService.isAuthenticated()).toBe(false);
  });

  it('shows an empty studio and lets a load error be dismissed', async () => {
    const user = userEvent.setup();
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'saved-token' });
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 404, data: null, headers: {}, url: '' } as HttpResponse);
    const empty = render(<App />);
    expect((await screen.findAllByText('Nothing waiting')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Activity' }));
    expect(screen.getByText('No activity yet')).toBeTruthy();
    empty.unmount();

    StudioService.resetForTests();
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'saved-token' });
    mockStudio({ 'state/qa.json': 500 });
    render(<App />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/state\/qa\.json/);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Case file 14' })).toBeTruthy();
  });
});
