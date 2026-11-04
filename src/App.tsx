import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityScreen } from './components/ActivityScreen';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { InstagramScreen } from './components/InstagramScreen';
import { InstructSheet } from './components/forms';
import { PullToRefresh } from './components/PullToRefresh';
import { RenderScreen } from './components/RenderScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { SignIn } from './components/SignIn';
import { ErrorBanner } from './components/ui';
import { VideosScreen } from './components/VideosScreen';
import { useAuth } from './hooks/useAuth';
import { useStudio } from './hooks/useStudio';
import { laptopFreshness } from './lib/format';
import { buildReviewQueue } from './lib/reviewQueue';
import type { SendResult, StudioCommand, TabId } from './types';

export function App() {
  const { isAuthenticated, isInitializing, signIn, signOut } = useAuth();
  const {
    state,
    isRefreshing,
    isSending,
    hasLoaded,
    error,
    refresh,
    sendCommand,
    dismissError,
    reset,
  } = useStudio();
  const [tab, setTab] = useState<TabId>('review');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [instructOpen, setInstructOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const wasAuthenticated = useRef(false);

  const refreshUser = useCallback(() => {
    void refresh('user');
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    void refresh('auto');
    const interval = window.setInterval(() => {
      void refresh('auto');
    }, 15000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        void refresh('auto');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      reset();
      setSettingsOpen(false);
      setInstructOpen(false);
      setTab('review');
      setToast(null);
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, reset]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const handleCommand = async (command: StudioCommand): Promise<SendResult> => {
    const result = await sendCommand(command);
    if (result.ok) showToast(command.type === 'note' ? 'Instruction sent' : 'Sent to the studio');
    return result;
  };

  const handleSignOut = async () => {
    await signOut();
    reset();
    setSettingsOpen(false);
    setInstructOpen(false);
    setTab('review');
    setToast(null);
  };

  if (isInitializing) {
    return (
      <div className="boot">
        <div className="mark">CS</div>
        <p>Opening studio</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignIn
        onSignIn={async (token) => {
          await signIn(token);
          setTab('review');
        }}
      />
    );
  }

  const fresh = laptopFreshness(state.heartbeat?.laptop_seen);
  const reviewCount = buildReviewQueue(state).length;

  return (
    <div className="app">
      <Header
        title={titleFor(tab)}
        status={fresh.label}
        fresh={fresh.fresh}
        isRefreshing={isRefreshing}
        onRefresh={refreshUser}
        onSettings={() => {
          setInstructOpen(false);
          setSettingsOpen(true);
        }}
      />
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}
      <PullToRefresh active={tab} isRefreshing={isRefreshing} onRefresh={refreshUser}>
        {tab === 'review' && (
          <ReviewScreen state={state} hasLoaded={hasLoaded} isSending={isSending} onCommand={handleCommand} />
        )}
        {tab === 'videos' && (
          <VideosScreen state={state} hasLoaded={hasLoaded} isSending={isSending} onCommand={handleCommand} />
        )}
        {tab === 'instagram' && (
          <InstagramScreen state={state} hasLoaded={hasLoaded} isSending={isSending} onCommand={handleCommand} />
        )}
        {tab === 'render' && (
          <RenderScreen state={state} hasLoaded={hasLoaded} isSending={isSending} onCommand={handleCommand} />
        )}
        {tab === 'activity' && (
          <ActivityScreen
            state={state}
            hasLoaded={hasLoaded}
            onInstruct={() => {
              setSettingsOpen(false);
              setInstructOpen(true);
            }}
          />
        )}
      </PullToRefresh>
      <BottomNav active={tab} reviewCount={reviewCount} onChange={setTab} />
      {settingsOpen && (
        <SettingsSheet state={state} onClose={() => setSettingsOpen(false)} onSignOut={handleSignOut} />
      )}
      {instructOpen && (
        <InstructSheet busy={isSending} onClose={() => setInstructOpen(false)} onCommand={handleCommand} />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function titleFor(tab: TabId): string {
  switch (tab) {
    case 'review':
      return 'Review';
    case 'videos':
      return 'Videos';
    case 'instagram':
      return 'Instagram';
    case 'render':
      return 'Render';
    case 'activity':
      return 'Activity';
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
}
