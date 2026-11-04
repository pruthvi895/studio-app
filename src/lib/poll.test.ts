import { describe, expect, it } from 'vitest';
import { decidePoll, deviceLoginUrl, nextPollInterval } from './poll';

describe('decidePoll', () => {
  it('waits while GitHub is pending and slows down when asked', () => {
    expect(decidePoll({ error: 'authorization_pending' }, 5)).toEqual({ action: 'wait', intervalSeconds: 5 });
    expect(decidePoll({ error: 'slow_down' }, 5)).toEqual({ action: 'wait', intervalSeconds: 10 });
    expect(decidePoll({}, 1)).toEqual({ action: 'wait', intervalSeconds: 5 });
  });

  it('stops on success and on a terminal error', () => {
    expect(decidePoll({ access_token: 'tok' }, 5)).toEqual({ action: 'success' });
    expect(decidePoll({ error: 'access_denied' }, 5)).toEqual({
      action: 'fail',
      message: 'GitHub authorization was declined.',
    });
    expect(decidePoll({ error: 'expired_token' }, 5).action).toBe('fail');
  });
});

describe('device login url', () => {
  it('prefers the complete url and falls back to the device page', () => {
    expect(nextPollInterval(0)).toBe(5);
    expect(deviceLoginUrl({})).toBe('https://github.com/login/device');
    expect(deviceLoginUrl({ verification_uri: 'https://github.com/login/device' })).toBe(
      'https://github.com/login/device'
    );
    expect(
      deviceLoginUrl({
        verification_uri: 'https://github.com/login/device',
        verification_uri_complete: 'https://github.com/login/device?user_code=ABCD-1234',
      })
    ).toContain('user_code=ABCD-1234');
  });
});
