import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Http } from '@capacitor-community/http';
import { Preferences } from '@capacitor/preferences';
import { decidePoll } from '../lib/poll';
import { GitHubService } from './github';

describe('GitHubService', () => {
  beforeEach(async () => {
    await GitHubService.signOut();
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);
  });

  it('should start device flow', async () => {
    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: {
        device_code: 'test_device_code',
        user_code: 'TEST-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      },
    } as never);

    const result = await GitHubService.startDeviceFlow();

    expect(result.user_code).toBe('TEST-1234');
    expect(Http.post).toHaveBeenCalledWith({
      url: 'https://github.com/login/device/code',
      headers: expect.any(Object),
      data: { client_id: 'Iv23ctaY9RgSDdphWZmJ' },
    });
  });

  it('should poll for token', async () => {
    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: {
        access_token: 'test_token',
      },
    } as never);

    const result = await GitHubService.pollForToken('device_code_123');

    expect(result.access_token).toBe('test_token');
  });

  it('should verify and store token for pruthvi895', async () => {
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: {
        login: 'pruthvi895',
        id: 12345,
        avatar_url: 'https://example.com/avatar.jpg',
      },
    } as never);

    const user = await GitHubService.verifyAndStoreToken('test_token');

    expect(user.login).toBe('pruthvi895');
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'github_token',
      value: 'test_token',
    });
  });

  it('should reject token for other users', async () => {
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: {
        login: 'other_user',
        id: 99999,
        avatar_url: 'https://example.com/avatar.jpg',
      },
    } as never);

    await expect(GitHubService.verifyAndStoreToken('test_token')).rejects.toThrow(
      'This app is private to pruthvi895'
    );
  });

  it('should fetch file from repo', async () => {
    vi.mocked(Http.get)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          login: 'pruthvi895',
          id: 12345,
          avatar_url: 'https://example.com/avatar.jpg',
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: { videos: [] },
      } as never);

    await GitHubService.verifyAndStoreToken('test_token');
    const data = await GitHubService.fetchFile('state/youtube.json');

    expect(data).toEqual({ videos: [] });
    expect(Http.get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.github.com/repos/pruthvi895/studio-cloud/contents/state/youtube.json',
      })
    );
  });

  it('parses a string device-code body and a pending token poll', async () => {
    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: JSON.stringify({
        device_code: 'dev',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: '900',
        interval: '5',
      }),
    } as never);

    const flow = await GitHubService.startDeviceFlow();
    expect(flow.user_code).toBe('ABCD-1234');
    expect(flow.interval).toBe(5);

    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: JSON.stringify({ error: 'authorization_pending' }),
    } as never);
    const pending = await GitHubService.pollForToken('dev');
    expect(decidePoll(pending, flow.interval)).toEqual({ action: 'wait', intervalSeconds: 5 });
  });

  it('parses a form-encoded success, expiry, and denial', async () => {
    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: 'access_token=tok_123&token_type=bearer',
    } as never);
    const success = await GitHubService.pollForToken('dev');
    expect(success.access_token).toBe('tok_123');
    expect(decidePoll(success, 5).action).toBe('success');

    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: { error: 'expired_token' },
    } as never);
    const expired = await GitHubService.pollForToken('dev');
    expect(decidePoll(expired, 5)).toMatchObject({ action: 'fail' });

    vi.mocked(Http.post).mockResolvedValueOnce({
      status: 200,
      data: { error: 'access_denied', error_description: 'nope' },
    } as never);
    const denied = await GitHubService.pollForToken('dev');
    expect(decidePoll(denied, 5)).toEqual({ action: 'fail', message: 'nope' });
  });

  it('does not store a token for the wrong GitHub user', async () => {
    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'someoneelse', id: 2, avatar_url: '' },
    } as never);

    await expect(GitHubService.verifyAndStoreToken('other-token')).rejects.toThrow(
      'This app is private to pruthvi895'
    );
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(GitHubService.isAuthenticated()).toBe(false);
    expect(GitHubService.getToken()).toBeNull();
  });

  it('restores a saved token and clears it on sign-out', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: 'saved-token' });
    await GitHubService.initialize();
    expect(GitHubService.getToken()).toBe('saved-token');
    expect(GitHubService.isAuthenticated()).toBe(true);

    await GitHubService.signOut();
    expect(GitHubService.getToken()).toBeNull();
    expect(GitHubService.isAuthenticated()).toBe(false);
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'github_token' });
  });

  it('ignores a blank saved token and drops the session on HTTP 401', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '   ' });
    await GitHubService.initialize();
    expect(GitHubService.isAuthenticated()).toBe(false);

    vi.mocked(Http.get).mockResolvedValueOnce({
      status: 200,
      data: { login: 'pruthvi895', id: 1, avatar_url: '' },
    } as never);
    await GitHubService.verifyAndStoreToken('real-token');
    const lost = vi.fn();
    const unsubscribe = GitHubService.onAuthLost(lost);
    vi.mocked(Http.get).mockResolvedValueOnce({ status: 401, data: '' } as never);
    await expect(GitHubService.fetchFile('state/qa.json')).rejects.toThrow('Authentication failed');
    expect(lost).toHaveBeenCalledTimes(1);
    expect(GitHubService.isAuthenticated()).toBe(false);
    unsubscribe();
  });
});
