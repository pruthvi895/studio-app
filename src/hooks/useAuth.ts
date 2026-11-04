import { useCallback, useEffect, useState } from 'react';
import { GitHubService } from '../services/github';
import type { GitHubUser } from '../types';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let alive = true;
    GitHubService.initialize()
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return;
        setIsAuthenticated(GitHubService.isAuthenticated());
        setIsInitializing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return GitHubService.onAuthLost(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_SMOKE !== 'true') return undefined;
    const onEnter = () => {
      setUser({ login: 'pruthvi895', id: 0, avatar_url: '' });
      setIsAuthenticated(true);
      setIsInitializing(false);
    };
    window.addEventListener('casebook-smoke-enter', onEnter);
    return () => window.removeEventListener('casebook-smoke-enter', onEnter);
  }, []);

  const signIn = useCallback(async (accessToken: string): Promise<GitHubUser> => {
    const userData = await GitHubService.verifyAndStoreToken(accessToken);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GitHubService.signOut();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  return {
    isAuthenticated,
    user,
    isInitializing,
    signIn,
    signOut,
  };
}
