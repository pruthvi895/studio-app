import { useEffect, useRef, useState } from 'react';
import { openExternal } from '../lib/openExternal';
import { decidePoll, deviceLoginUrl, nextPollInterval } from '../lib/poll';
import { GitHubService } from '../services/github';
import type { DeviceFlowResponse } from '../types';
import { Button } from './ui';

interface SignInProps {
  onSignIn: (token: string) => Promise<void>;
}

type Phase = 'idle' | 'starting' | 'polling' | 'error';

export function SignIn({ onSignIn }: SignInProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [flow, setFlow] = useState<DeviceFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generation = useRef(0);
  const timer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);
  const busy = useRef(false);

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      generation.current += 1;
      clearTimer();
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const fail = (gen: number, message: string) => {
    if (generation.current !== gen) return;
    generation.current += 1;
    busy.current = false;
    clearTimer();
    setError(message);
    setFlow(null);
    setPhase('error');
  };

  const poll = (deviceCode: string, intervalSeconds: number, expiresAt: number, gen: number) => {
    const tick = async (seconds: number) => {
      if (generation.current !== gen) return;
      if (Date.now() >= expiresAt) {
        fail(gen, 'That code expired. Start sign-in again.');
        return;
      }
      try {
        const response = await GitHubService.pollForToken(deviceCode);
        if (generation.current !== gen) return;
        const decision = decidePoll(response, seconds);
        switch (decision.action) {
          case 'success': {
            const token = response.access_token;
            if (!token) {
              fail(gen, 'Sign-in did not return a token.');
              return;
            }
            try {
              await onSignIn(token);
            } catch (err) {
              if (generation.current !== gen) return;
              fail(gen, err instanceof Error ? err.message : 'Could not verify the account.');
            }
            return;
          }
          case 'wait':
            if (generation.current !== gen) return;
            timer.current = window.setTimeout(() => {
              void tick(decision.intervalSeconds);
            }, decision.intervalSeconds * 1000);
            return;
          case 'fail':
            fail(gen, decision.message);
            return;
          default: {
            const exhaustive: never = decision;
            return exhaustive;
          }
        }
      } catch (err) {
        if (generation.current !== gen) return;
        fail(gen, err instanceof Error ? err.message : 'Could not reach GitHub.');
      }
    };

    const initial = nextPollInterval(intervalSeconds);
    timer.current = window.setTimeout(() => {
      void tick(initial);
    }, initial * 1000);
  };

  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    const gen = ++generation.current;
    clearTimer();
    setError(null);
    setCopied(false);
    setPhase('starting');
    try {
      const data = await GitHubService.startDeviceFlow();
      if (generation.current !== gen) return;
      setFlow(data);
      setPhase('polling');
      const expiresIn = data.expires_in > 0 ? data.expires_in : 900;
      poll(data.device_code, data.interval, Date.now() + expiresIn * 1000, gen);
    } catch (err) {
      if (generation.current !== gen) return;
      busy.current = false;
      setError(err instanceof Error ? err.message : 'Could not start sign-in.');
      setPhase('error');
    }
  };

  const cancel = () => {
    generation.current += 1;
    busy.current = false;
    clearTimer();
    setFlow(null);
    setError(null);
    setPhase('idle');
  };

  const copyCode = async () => {
    if (!flow) return;
    const gen = generation.current;
    const ok = await copyText(flow.user_code);
    if (generation.current !== gen) return;
    if (!ok) {
      setError('Could not copy. Select the code and copy it.');
      return;
    }
    setCopied(true);
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      if (generation.current === gen) setCopied(false);
    }, 2000);
  };

  const loginUrl = flow ? deviceLoginUrl(flow) : '';

  return (
    <main className="signin">
      <div className="signin-brand">
        <div className="mark">CS</div>
        <p className="eyebrow">Content operations</p>
        <h1>Casebook Studio</h1>
        <p className="lede">Review, schedule, and publish for two channels from your phone.</p>
      </div>
      <ul className="channel-list">
        <li>
          <span className="channel-dot tone-casebook" />
          <span>
            <strong>Casebook Atlas</strong>
            <em>@casebookatlas</em>
          </span>
        </li>
        <li>
          <span className="channel-dot tone-tenglish" />
          <span>
            <strong>Tenglish Gaming</strong>
            <em>@tenglishgaming</em>
          </span>
        </li>
      </ul>

      {flow && phase === 'polling' ? (
        <section className="device-flow" aria-live="polite">
          <p className="sheet-copy">Enter this code on GitHub</p>
          <p className="user-code">{flow.user_code}</p>
          <div className="stack">
            <Button full onClick={() => void copyCode()}>
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <Button variant="secondary" full onClick={() => openExternal(loginUrl)}>
              Open GitHub
            </Button>
            {import.meta.env.VITE_SMOKE === 'true' && (
              <button type="button" className="sr-only" onClick={() => window.__casebook?.enterSampleStudio()}>
                Load sample studio
              </button>
            )}
            <p className="help">github.com/login/device</p>
            <div className="polling">
              <span className="spinner is-spinning" />
              <p>Waiting for authorization</p>
            </div>
            <Button variant="ghost" full onClick={cancel}>
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <div className="stack">
          <Button full onClick={() => void start()} disabled={phase === 'starting'}>
            {phase === 'starting' ? 'Contacting GitHub…' : 'Sign in with GitHub'}
          </Button>
          {phase === 'starting' && (
            <Button variant="ghost" full onClick={cancel}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection fallback.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
