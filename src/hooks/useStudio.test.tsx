import { act, renderHook } from '@testing-library/react';
import { Http } from '@capacitor-community/http';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubService } from '../services/github';
import { StudioService } from '../services/studio';
import { useStudio } from './useStudio';

describe('useStudio', () => {
  beforeEach(async () => {
    StudioService.resetForTests();
    await GitHubService.signOut();
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);
    vi.mocked(Http.get).mockResolvedValue({ status: 404, data: null } as never);
    vi.mocked(Http.put).mockResolvedValue({ status: 201, data: null } as never);
  });

  it('locks a second submit until the first command finishes', async () => {
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'pruthvi895', id: 1, avatar_url: '' },
    } as never);
    await GitHubService.verifyAndStoreToken('tok');

    let release: (value: { status: number; data: null }) => void = () => undefined;
    vi.mocked(Http.put).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }) as never
    );
    vi.mocked(Http.get).mockResolvedValue({ status: 404, data: null } as never);

    const { result } = renderHook(() => useStudio());
    let first: Promise<unknown> = Promise.resolve();
    await act(async () => {
      first = result.current.sendCommand({ type: 'note', text: 'one' });
      const second = await result.current.sendCommand({ type: 'note', text: 'two' });
      expect(second).toEqual({ ok: false, error: 'Still sending the previous command.' });
    });
    expect(Http.put).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ status: 201, data: null });
      await first;
    });
    expect(result.current.isSending).toBe(false);
  });

  it('dismisses a load error', async () => {
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'pruthvi895', id: 1, avatar_url: '' },
    } as never);
    await GitHubService.verifyAndStoreToken('tok');
    vi.mocked(Http.get).mockResolvedValue({ status: 500, data: '' } as never);

    const { result } = renderHook(() => useStudio());
    await act(async () => {
      await result.current.refresh('user');
    });
    expect(result.current.error).toMatch(/Failed to fetch/);
    act(() => {
      result.current.dismissError();
    });
    expect(result.current.error).toBeNull();
  });
});
