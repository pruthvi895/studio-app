import { useState } from 'react';
import { useMounted } from '../hooks/useMounted';
import { formatIst, laptopFreshness } from '../lib/format';
import type { StudioState } from '../types';
import { Button, Sheet } from './ui';

interface SettingsSheetProps {
  state: StudioState;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

export function SettingsSheet({ state, onClose, onSignOut }: SettingsSheetProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useMounted();
  const seen = state.heartbeat?.laptop_seen;
  const fresh = laptopFreshness(seen);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSignOut();
    } catch {
      if (mounted()) setBusy(false);
    }
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="account">
        <div className="mark">P</div>
        <div>
          <strong>pruthvi895</strong>
          <p className="meta">Private studio</p>
        </div>
      </div>
      <div className="settings-block">
        <p className="section-label">Laptop</p>
        <p className={fresh.fresh ? 'status is-fresh' : 'status'}>
          <span className="status-dot" />
          {fresh.label}
        </p>
        <p className="meta">{seen ? formatIst(seen, 'Not seen yet') : 'Not seen yet'}</p>
      </div>
      {confirming ? (
        <div className="settings-block">
          <p className="sheet-copy">Sign out of Casebook Studio on this phone?</p>
          <div className="sheet-actions">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void signOut()} disabled={busy}>
              {busy ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" full onClick={() => setConfirming(true)}>
          Sign out
        </Button>
      )}
    </Sheet>
  );
}
