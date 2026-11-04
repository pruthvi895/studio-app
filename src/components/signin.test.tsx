import { act, fireEvent, render, screen } from '@testing-library/react';
import { Http } from '@capacitor-community/http';
import { Preferences } from '@capacitor/preferences';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubService } from '../services/github';
import { SignIn } from './SignIn';

const flow = {
  device_code: 'dev-code',
  user_code: 'WDH7-CODE',
  verification_uri: 'https://github.com/login/device',
  verification_uri_complete: 'https://github.com/login/device?user_code=WDH7-CODE',
  expires_in: 900,
  interval: 5,
};

describe('SignIn', () => {
  beforeEach(async () => {
    await GitHubService.signOut();
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the signed-out screen', () => {
    render(<SignIn onSignIn={async () => undefined} />);
    expect(screen.getByRole('heading', { name: 'Casebook Studio' })).toBeTruthy();
    expect(screen.getByText('Casebook Atlas')).toBeTruthy();
    expect(screen.getByText('@casebookatlas')).toBeTruthy();
    expect(screen.getByText('Tenglish Gaming')).toBeTruthy();
    expect(screen.getByText('@tenglishgaming')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeTruthy();
    expect(screen.queryByText('WDH7-CODE')).toBeNull();
  });

  it('shows the device code while a poll is pending, then completes', async () => {
    const onSignIn = vi.fn(async () => undefined);
    vi.mocked(Http.post)
      .mockResolvedValueOnce({ status: 200, data: flow } as never)
      .mockResolvedValueOnce({ status: 200, data: { error: 'authorization_pending' } } as never)
      .mockResolvedValueOnce({ status: 200, data: { access_token: 'tok-1' } } as never);

    render(<SignIn onSignIn={onSignIn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    const contacting = screen.getByRole('button', { name: 'Contacting GitHub…' }) as HTMLButtonElement;
    expect(contacting.disabled).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('WDH7-CODE')).toBeTruthy();
    expect(screen.getByText('Waiting for authorization')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(Http.post).toHaveBeenCalledTimes(2);
    expect(screen.getByText('WDH7-CODE')).toBeTruthy();
    expect(onSignIn).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(onSignIn).toHaveBeenCalledWith('tok-1');
  });

  it('stops when the code expires or GitHub denies access', async () => {
    vi.mocked(Http.post)
      .mockResolvedValueOnce({ status: 200, data: flow } as never)
      .mockResolvedValueOnce({ status: 200, data: { error: 'expired_token' } } as never);
    const { unmount } = render(<SignIn onSignIn={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole('alert').textContent).toMatch(/expired/i);
    expect(screen.queryByText('WDH7-CODE')).toBeNull();
    unmount();

    vi.mocked(Http.post)
      .mockResolvedValueOnce({ status: 200, data: flow } as never)
      .mockResolvedValueOnce({ status: 200, data: { error: 'access_denied' } } as never);
    render(<SignIn onSignIn={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole('alert').textContent).toMatch(/declined/i);
  });

  it('rejects a GitHub user other than pruthvi895 and does not store the token', async () => {
    vi.mocked(Http.post)
      .mockResolvedValueOnce({ status: 200, data: flow } as never)
      .mockResolvedValueOnce({ status: 200, data: { access_token: 'someone-elses-token' } } as never);
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'someoneelse', id: 9, avatar_url: '' },
    } as never);

    render(
      <SignIn
        onSignIn={async (token) => {
          await GitHubService.verifyAndStoreToken(token);
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByRole('alert').textContent).toMatch(/private to pruthvi895/);
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(GitHubService.isAuthenticated()).toBe(false);
  });

  it('stores the token when the signed-in user is pruthvi895', async () => {
    vi.mocked(Http.post)
      .mockResolvedValueOnce({ status: 200, data: flow } as never)
      .mockResolvedValueOnce({ status: 200, data: { access_token: 'owner-token' } } as never);
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'pruthvi895', id: 1, avatar_url: 'https://example.com/a.png' },
    } as never);

    render(
      <SignIn
        onSignIn={async (token) => {
          await GitHubService.verifyAndStoreToken(token);
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(Preferences.set).toHaveBeenCalledWith({ key: 'github_token', value: 'owner-token' });
    expect(GitHubService.getToken()).toBe('owner-token');
  });

  it('cancels polling and surfaces a start failure', async () => {
    vi.mocked(Http.post).mockResolvedValueOnce({ status: 200, data: flow } as never);
    const view = render(<SignIn onSignIn={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('WDH7-CODE')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });
    expect(Http.post).toHaveBeenCalledTimes(1);
    view.unmount();

    vi.mocked(Http.post).mockRejectedValueOnce(new Error('offline'));
    render(<SignIn onSignIn={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toMatch(/offline/);
    expect(screen.queryByText('WDH7-CODE')).toBeNull();
  });

  it('ignores a second tap while GitHub is being contacted', async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    vi.mocked(Http.post).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }) as never
    );
    render(<SignIn onSignIn={async () => undefined} />);
    const button = screen.getByRole('button', { name: 'Sign in with GitHub' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(Http.post).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolvePost({ status: 200, data: flow });
      await Promise.resolve();
    });
    expect(screen.getByText('WDH7-CODE')).toBeTruthy();
  });

  it('opens GitHub without leaving the WebView via target=_blank', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.mocked(Http.post).mockResolvedValueOnce({ status: 200, data: flow } as never);
    render(<SignIn onSignIn={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open GitHub' }));
    expect(open).toHaveBeenCalledWith(
      'https://github.com/login/device?user_code=WDH7-CODE',
      '_blank',
      'noopener,noreferrer'
    );
    open.mockRestore();
  });
});
