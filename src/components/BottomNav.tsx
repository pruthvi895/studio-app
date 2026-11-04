import type { ReactNode } from 'react';
import type { TabId } from '../types';
import { IconActivity, IconInstagram, IconRender, IconReview, IconVideos } from './icons';

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'review', label: 'Review', icon: <IconReview /> },
  { id: 'videos', label: 'Videos', icon: <IconVideos /> },
  { id: 'instagram', label: 'Instagram', icon: <IconInstagram /> },
  { id: 'render', label: 'Render', icon: <IconRender /> },
  { id: 'activity', label: 'Activity', icon: <IconActivity /> },
];

interface BottomNavProps {
  active: TabId;
  reviewCount: number;
  onChange: (tab: TabId) => void;
}

export function BottomNav({ active, reviewCount, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="nav-inner">
        {TABS.map((tab) => {
          const selected = tab.id === active;
          const count = tab.id === 'review' ? reviewCount : 0;
          return (
            <button
              key={tab.id}
              type="button"
              className={selected ? 'nav-btn is-active' : 'nav-btn'}
              aria-current={selected ? 'page' : undefined}
              aria-label={count > 0 ? `${tab.label}, ${count} waiting` : tab.label}
              onClick={() => onChange(tab.id)}
            >
              <span className="nav-icon">
                {tab.icon}
                {count > 0 && <span className="nav-badge">{count > 9 ? '9+' : count}</span>}
              </span>
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
