import { formatIst } from '../lib/format';
import { listActivity } from '../lib/reviewQueue';
import type { StudioState } from '../types';
import { IconActivity } from './icons';
import { Button, Chip, EmptyState, LoadingState } from './ui';

interface ActivityScreenProps {
  state: StudioState;
  hasLoaded: boolean;
  onInstruct: () => void;
}

export function ActivityScreen({ state, hasLoaded, onInstruct }: ActivityScreenProps) {
  const results = listActivity(state.results);

  if (!hasLoaded) return <LoadingState />;

  return (
    <div className="screen">
      <div className="sticky-bar">
        <Button full onClick={onInstruct}>
          Instruct the assistant
        </Button>
      </div>
      {results.length === 0 ? (
        <EmptyState
          icon={<IconActivity />}
          title="No activity yet"
          hint="Command results from the laptop show up here."
        />
      ) : (
        <ul className="log-list">
          {results.map((result) => (
            <li className="log-row" key={result.id}>
              <span className={result.ok ? 'log-dot is-ok' : 'log-dot is-bad'} />
              <div className="log-body">
                <div className="card-top">
                  <h2 className="card-title">{result.type}</h2>
                  <Chip tone={result.ok ? 'good' : 'bad'}>{result.ok ? 'OK' : 'Failed'}</Chip>
                </div>
                {result.msg && <p className="caption">{result.msg}</p>}
                <p className="meta">{formatIst(result.at, 'No time')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
