import { IconRefresh, IconSettings } from './icons';
import { IconButton } from './ui';

interface HeaderProps {
  title: string;
  status: string;
  fresh: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSettings: () => void;
}

export function Header({ title, status, fresh, isRefreshing, onRefresh, onSettings }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-copy">
          <h1>{title}</h1>
          <p className={fresh ? 'status is-fresh' : 'status'}>
            <span className="status-dot" />
            <span className="status-text">{status}</span>
          </p>
        </div>
        <div className="header-actions">
          <IconButton label={isRefreshing ? 'Refreshing' : 'Refresh'} onClick={onRefresh} disabled={isRefreshing}>
            <IconRefresh className={isRefreshing ? 'is-spinning' : undefined} />
          </IconButton>
          <IconButton label="Settings" onClick={onSettings}>
            <IconSettings />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
