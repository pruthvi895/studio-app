import { useRef, useState } from 'react';
import { useMounted } from '../hooks/useMounted';
import { buildRenderCommand } from '../lib/commands';
import { formatGpuHolder, formatIst, jobStatusTone } from '../lib/format';
import type { SendResult, StudioCommand, StudioState } from '../types';
import { ConfirmSheet } from './forms';
import { IconRender } from './icons';
import { Button, Chip, EmptyState, Field, LoadingState } from './ui';

interface RenderScreenProps {
  state: StudioState;
  hasLoaded: boolean;
  isSending: boolean;
  onCommand: (command: StudioCommand) => Promise<SendResult>;
}

export function RenderScreen({ state, hasLoaded, isSending, onCommand }: RenderScreenProps) {
  const [itemId, setItemId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const lock = useRef(false);
  const mounted = useMounted();
  const render = state.render;
  const gpu = formatGpuHolder(render?.gpu_holder);
  const jobs = state.laptop_jobs ?? {};
  const queue = state.laptop_queue ?? [];
  const log = [...(render?.ordered_queue_log ?? [])].reverse();
  const waiting = render?.waiting ?? [];

  const ask = () => {
    const built = buildRenderCommand(itemId);
    if (!built.ok) {
      setError(built.error);
      setConfirming(false);
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const send = async () => {
    if (lock.current || isSending) return;
    const built = buildRenderCommand(itemId);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    lock.current = true;
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) {
        setItemId('');
        setConfirming(false);
        setError(null);
        return;
      }
      setError(result.error);
    } finally {
      lock.current = false;
    }
  };

  if (!hasLoaded) return <LoadingState />;

  return (
    <div className="screen">
      <article className="card gpu-card">
        <div className="card-top">
          <h2 className="card-title">GPU</h2>
          <span className={gpu.busy ? 'status-dot is-busy' : 'status-dot is-fresh'} />
        </div>
        <p className="gpu-label">{gpu.busy ? gpu.label : 'Idle'}</p>
        {waiting.length > 0 && (
          <div className="meta-row wrap">
            {waiting.slice(0, 8).map((id, index) => (
              <Chip key={`${id}-${index}`} tone="muted">
                {id}
              </Chip>
            ))}
            {waiting.length > 8 && <Chip tone="muted">+{waiting.length - 8}</Chip>}
          </div>
        )}
        {waiting.length === 0 && <p className="meta">Nothing waiting on the GPU</p>}
      </article>

      <article className="card">
        <h2 className="card-title">Queue a render</h2>
        <Field label="Item id">
          {(id) => (
            <input
              id={id}
              className="input"
              value={itemId}
              placeholder="w14-long"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setItemId(event.target.value)}
            />
          )}
        </Field>
        {error && !confirming && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button full onClick={ask} disabled={isSending}>
          Queue render
        </Button>
      </article>

      <section>
        <h2 className="section-label">From this phone</h2>
        {queue.length === 0 ? (
          <EmptyState
            compact
            icon={<IconRender />}
            title="No phone jobs"
            hint="Renders and instructions you send show their laptop status here."
          />
        ) : (
          <ul className="log-list">
            {queue.map((job) => {
              const status = jobs[job.id]?.status || job.status;
              return (
                <li className="log-row" key={job.id}>
                  <div>
                    <div className="card-top">
                      <strong>{job.type}</strong>
                      <Chip tone={jobStatusTone(status)}>{status || 'pending'}</Chip>
                    </div>
                    <p className="meta">{job.item_id || job.text || job.id}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {log.length > 0 && (
        <section>
          <h2 className="section-label">Render log</h2>
          <ul className="log-list">
            {log.map((entry, index) => (
              <li className="log-row" key={`${entry.at}-${entry.item_id}-${index}`}>
                <div>
                  <div className="card-top">
                    <strong>{entry.item_id || 'Item'}</strong>
                    <Chip tone={jobStatusTone(entry.status)}>{entry.status || 'logged'}</Chip>
                  </div>
                  <p className="meta">{formatIst(entry.at, entry.at || 'No time')}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirming && (
        <ConfirmSheet
          title="Queue this render?"
          body={`Send ${itemId.trim()} to the laptop render queue.`}
          confirmLabel="Queue render"
          busy={isSending}
          error={error}
          onClose={() => setConfirming(false)}
          onConfirm={() => void send()}
        />
      )}
    </div>
  );
}
