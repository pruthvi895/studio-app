import type { TokenResponse } from '../types';

export type PollDecision =
  | { action: 'success' }
  | { action: 'wait'; intervalSeconds: number }
  | { action: 'fail'; message: string };

export function nextPollInterval(intervalSeconds: number): number {
  if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5) return 5;
  return intervalSeconds;
}

export function decidePoll(
  response: TokenResponse | null | undefined,
  intervalSeconds: number
): PollDecision {
  const interval = nextPollInterval(intervalSeconds);
  if (response?.access_token) return { action: 'success' };
  const error = response?.error;
  if (!error || error === 'authorization_pending') {
    return { action: 'wait', intervalSeconds: interval };
  }
  if (error === 'slow_down') {
    return { action: 'wait', intervalSeconds: interval + 5 };
  }
  return {
    action: 'fail',
    message: response?.error_description || oauthFailureMessage(error),
  };
}

function oauthFailureMessage(error: string): string {
  switch (error) {
    case 'expired_token':
      return 'That code expired. Start sign-in again.';
    case 'access_denied':
      return 'GitHub authorization was declined.';
    default:
      return `Sign-in failed: ${error}`;
  }
}

export const DEVICE_LOGIN_URL = 'https://github.com/login/device';

export function deviceLoginUrl(flow: {
  verification_uri?: string;
  verification_uri_complete?: string;
}): string {
  if (flow.verification_uri_complete) return flow.verification_uri_complete;
  if (flow.verification_uri) return flow.verification_uri;
  return DEVICE_LOGIN_URL;
}
