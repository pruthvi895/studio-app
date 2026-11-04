import { useEffect, useMemo, useRef, useState } from 'react';
import { useMounted } from '../hooks/useMounted';
import { buildHoldCommand, buildReleaseCommand } from '../lib/commands';
import { channelIdentity, formatIst, igStatusLabel, igStatusTone, type ChannelTone } from '../lib/format';
import type { IgStatus, InstagramItem, SendResult, StudioCommand, StudioState } from '../types';
import { CaptionSheet } from './forms';
import { IconInstagram } from './icons';
import { Preview } from './Preview';
import { Button, ChannelTag, Chip, EmptyState, LoadingState, Segmented } from './ui';

interface InstagramScreenProps {
  state: StudioState;
  hasLoaded: boolean;
  isSending: boolean;
  onCommand: (command: StudioCommand) => Promise<SendResult>;
}

type AccountFilter = Exclude<ChannelTone, 'neutral'> | 'neutral';
type StatusFilter = 'all' | IgStatus;

const STATUS_FILTERS: StatusFilter[] = ['all', 'queued', 'held', 'retry', 'posted', 'failed', 'unknown'];

export function InstagramScreen({ state, hasLoaded, isSending, onCommand }: InstagramScreenProps) {
  const items = useMemo(() => state.ig?.items ?? [], [state.ig?.items]);
  const hasOther = items.some((item) => channelIdentity(item.channel).tone === 'neutral');
  const [account, setAccount] = useState<AccountFilter>('casebook');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [caption, setCaption] = useState<InstagramItem | null>(null);
  const [openCaption, setOpenCaption] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();

  useEffect(() => {
    if (account === 'neutral' && !hasOther) setAccount('casebook');
  }, [account, hasOther]);

  const accountOptions = [
    { value: 'casebook' as const, label: '@casebookatlas' },
    { value: 'tenglish' as const, label: '@tenglishgaming' },
    ...(hasOther ? [{ value: 'neutral' as const, label: 'Other' }] : []),
  ];

  const visible = items
    .filter((item) => channelIdentity(item.channel).tone === account)
    .filter((item) => status === 'all' || item.status === status)
    .slice()
    .sort((a, b) => (b.when_ist || '').localeCompare(a.when_ist || ''))
    .slice(0, 60);

  const run = async (command: ReturnType<typeof buildHoldCommand>) => {
    if (lock.current || isSending) return;
    if (!command.ok) {
      setActionError(command.error);
      return;
    }
    lock.current = true;
    setActionError(null);
    try {
      const result = await onCommand(command.command);
      if (!mounted()) return;
      if (!result.ok) setActionError(result.error);
    } finally {
      lock.current = false;
    }
  };

  if (!hasLoaded) return <LoadingState />;

  return (
    <div className="screen">
      <div className="sticky-bar">
        <Segmented label="Instagram account" value={account} options={accountOptions} onChange={setAccount} />
      </div>
      <div className="filters" role="toolbar" aria-label="Post status">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={status === filter ? 'chip-btn is-on' : 'chip-btn'}
            aria-pressed={status === filter}
            onClick={() => setStatus(filter)}
          >
            {filter === 'all' ? 'All' : igStatusLabel(filter)}
          </button>
        ))}
      </div>
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {visible.length === 0 ? (
        <EmptyState
          icon={<IconInstagram />}
          title="No posts"
          hint="The queue for this account will show here."
        />
      ) : (
        <div className="stack">
          {visible.map((post) => {
            const channel = channelIdentity(post.channel);
            const expanded = openCaption === post.id;
            const long = (post.caption ?? '').length > 140;
            return (
              <article className="card" key={post.id}>
                {(post.thumb || post.permalink) && (
                  <Preview src={post.thumb} href={post.permalink} label={`Preview ${post.kind}`} />
                )}
                <div className="card-top">
                  <h2 className="card-title">{post.kind}</h2>
                  <Chip tone={igStatusTone(post.status)}>{igStatusLabel(post.status)}</Chip>
                </div>
                <div className="meta-row">
                  <ChannelTag name={channel.handle || channel.name} tone={channel.tone} />
                  <span className="meta">{formatIst(post.when_ist, 'No time set')}</span>
                </div>
                {post.caption && (
                  <p className={expanded || !long ? 'caption' : 'caption is-clamped'}>{post.caption}</p>
                )}
                {long && (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setOpenCaption(expanded ? null : post.id)}
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
                <div className="action-row">
                  {(post.status === 'queued' || post.status === 'retry') && (
                    <Button
                      variant="secondary"
                      disabled={isSending}
                      onClick={() => void run(buildHoldCommand(post.id))}
                    >
                      Hold
                    </Button>
                  )}
                  {post.status === 'held' && (
                    <Button disabled={isSending} onClick={() => void run(buildReleaseCommand(post.id))}>
                      Release
                    </Button>
                  )}
                  {(post.status === 'queued' || post.status === 'retry' || post.status === 'held') && (
                    <Button variant="secondary" disabled={isSending} onClick={() => setCaption(post)}>
                      Edit caption
                    </Button>
                  )}
                  {post.permalink && (
                    <a className="btn btn-ghost" href={post.permalink} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {caption && (
        <CaptionSheet post={caption} busy={isSending} onClose={() => setCaption(null)} onCommand={onCommand} />
      )}
    </div>
  );
}
