import { useCallback, useEffect, useRef, useState } from 'react';
import { summarizeErrors } from '../lib/errors';
import { useMounted } from './useMounted';
import { StudioService } from '../services/studio';
import type { SendResult, StudioCommand, StudioState } from '../types';

export function useStudio() {
  const [state, setState] = useState<StudioState>(() => StudioService.getState());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorSource = useRef<'load' | 'command' | null>(null);
  const inFlight = useRef(false);
  const session = useRef(0);
  const mounted = useMounted();

  useEffect(() => {
    setState(StudioService.getState());
    return StudioService.subscribe(() => {
      if (mounted()) setState(StudioService.getState());
    });
  }, [mounted]);

  const refresh = useCallback(async (source: 'user' | 'auto' = 'user') => {
    const current = session.current;
    if (source === 'user' && mounted()) setIsRefreshing(true);
    try {
      const result = await StudioService.refresh();
      if (session.current === current && mounted()) {
        const message = summarizeErrors(result.errors);
        if (message) {
          errorSource.current = 'load';
          setError(message);
        } else if (errorSource.current === 'load') {
          errorSource.current = null;
          setError(null);
        }
      }
    } catch (err) {
      if (session.current === current && mounted()) {
        errorSource.current = 'load';
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    }
    if (session.current !== current || !mounted()) return;
    if (source === 'user') setIsRefreshing(false);
    setHasLoaded(true);
  }, [mounted]);

  const sendCommand = useCallback(async (command: StudioCommand): Promise<SendResult> => {
    if (inFlight.current) {
      return { ok: false, error: 'Still sending the previous command.' };
    }
    const current = session.current;
    inFlight.current = true;
    setIsSending(true);
    setError(null);
    try {
      await StudioService.sendCommand(command);
      if (session.current !== current) return { ok: false, error: 'Signed out.' };
      if (errorSource.current === 'command') errorSource.current = null;
      return { ok: true };
    } catch (err) {
      if (session.current !== current) return { ok: false, error: 'Signed out.' };
      const message = err instanceof Error ? err.message : 'Failed to send command';
      errorSource.current = 'command';
      if (mounted()) setError(message);
      return { ok: false, error: message };
    } finally {
      if (session.current === current) {
        inFlight.current = false;
        if (mounted()) setIsSending(false);
      }
    }
  }, [mounted]);

  const dismissError = useCallback(() => {
    errorSource.current = null;
    setError(null);
  }, []);

  const reset = useCallback(() => {
    session.current += 1;
    errorSource.current = null;
    inFlight.current = false;
    setError(null);
    setHasLoaded(false);
    setIsRefreshing(false);
    setIsSending(false);
    StudioService.clear();
  }, []);

  return {
    state,
    isRefreshing,
    isSending,
    hasLoaded,
    error,
    refresh,
    sendCommand,
    dismissError,
    reset,
  };
}
