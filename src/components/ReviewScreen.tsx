import { useRef, useState } from 'react';
import { useMounted } from '../hooks/useMounted';
import {
  buildHoldCommand,
  buildRejectVideoCommand,
  buildReleaseCommand,
  buildRenderCommand,
} from '../lib/commands';
import { channelIdentity, formatIst, igStatusLabel, igStatusTone, scoreLabel, videoThumbUrl, videoWatchUrl } from '../lib/format';
import { buildReviewQueue, reviewSummary } from '../lib/reviewQueue';
import type { InstagramItem, SendResult, StudioCommand, StudioState, Video } from '../types';
import { CaptionSheet, ConfirmSheet, ScheduleSheet } from './forms';
import { IconCheck } from './icons';
import { Preview } from './Preview';
import { Button, ChannelTag, Chip, EmptyState, LoadingState } from './ui';

interface ReviewScreenProps {
  state: StudioState;
  hasLoaded: boolean;
  isSending: boolean;
  onCommand: (command: StudioCommand) => Promise<SendResult>;
}

type Pending =
  | { kind: 'reject-video'; video: Video }
  | { kind: 'render'; itemId: string }
  | { kind: 'hold'; post: InstagramItem }
  | { kind: 'release'; post: InstagramItem };

export function ReviewScreen({ state, hasLoaded, isSending, onCommand }: ReviewScreenProps) {
  const queue = buildReviewQueue(state);
  const [schedule, setSchedule] = useState<Video | null>(null);
  const [caption, setCaption] = useState<InstagramItem | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();

  const confirm = async () => {
    if (!pending || lock.current || isSending) return;
    const built = commandForPending(pending);
    if (!built.ok) {
      setSheetError(built.error);
      return;
    }
    lock.current = true;
    setSheetError(null);
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) {
        setPending(null);
        return;
      }
      setSheetError(result.error);
    } finally {
      lock.current = false;
    }
  };

  if (!hasLoaded) return <LoadingState />;

  return (
    <div className="screen">
      <p className="summary">{reviewSummary(queue)}</p>
      {queue.length === 0 ? (
        <EmptyState
          icon={<IconCheck />}
          title="Nothing waiting"
          hint="Queued videos, posts, and quality checks land here."
        />
      ) : (
        <div className="stack">
          {queue.map((entry) => {
            switch (entry.kind) {
              case 'video':
                return (
                  <VideoDecision
                    key={entry.key}
                    video={entry.video}
                    verdict={entry.qa?.verdict}
                    busy={isSending}
                    onApprove={() => setSchedule(entry.video)}
                    onReject={() => {
                      setSheetError(null);
                      setPending({ kind: 'reject-video', video: entry.video });
                    }}
                  />
                );
              case 'post':
                return (
                  <PostDecision
                    key={entry.key}
                    post={entry.post}
                    busy={isSending}
                    onApprove={() => {
                      setSheetError(null);
                      setPending({ kind: 'release', post: entry.post });
                    }}
                    onReject={() => {
                      setSheetError(null);
                      setPending({ kind: 'hold', post: entry.post });
                    }}
                    onCaption={() => setCaption(entry.post)}
                  />
                );
              case 'qa':
                return (
                  <QaDecision
                    key={entry.key}
                    itemId={entry.itemId}
                    verdict={entry.qa.verdict}
                    score={entry.qa.p}
                    reasons={entry.qa.reasons}
                    busy={isSending}
                    onRender={() => {
                      setSheetError(null);
                      setPending({ kind: 'render', itemId: entry.itemId });
                    }}
                  />
                );
              default: {
                const exhaustive: never = entry;
                return exhaustive;
              }
            }
          })}
        </div>
      )}

      {schedule && (
        <ScheduleSheet
          video={schedule}
          busy={isSending}
          onClose={() => setSchedule(null)}
          onCommand={onCommand}
        />
      )}
      {caption && (
        <CaptionSheet
          post={caption}
          busy={isSending}
          onClose={() => setCaption(null)}
          onCommand={onCommand}
        />
      )}
      {pending && (
        <ConfirmSheet
          title={confirmTitle(pending)}
          body={confirmBody(pending)}
          confirmLabel={confirmLabel(pending)}
          danger={pending.kind === 'reject-video' || pending.kind === 'hold'}
          busy={isSending}
          error={sheetError}
          onClose={() => setPending(null)}
          onConfirm={() => void confirm()}
        />
      )}
    </div>
  );
}

function VideoDecision({
  video,
  verdict,
  busy,
  onApprove,
  onReject,
}: {
  video: Video;
  verdict?: 'approve' | 'reject';
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const channel = channelIdentity(video.channel);
  const title = video.title || video.item_id || video.video_id;
  return (
    <article className="card">
      <Preview
        src={videoThumbUrl(video)}
        href={videoWatchUrl(video.video_id)}
        label={`Preview ${title}`}
      />
      <div className="card-top">
        <h2 className="card-title">{title}</h2>
        <Chip tone={video.qa_pass ? 'good' : 'bad'}>{video.qa_pass ? 'QA pass' : 'QA fail'}</Chip>
      </div>
      <div className="meta-row">
        <ChannelTag name={channel.name} tone={channel.tone} />
        <Chip tone={video.privacy.toLowerCase() === 'public' ? 'good' : 'muted'}>{video.privacy}</Chip>
        {verdict && <Chip tone={verdict === 'approve' ? 'good' : 'bad'}>{verdict}</Chip>}
      </div>
      <p className="meta">Publish {formatIst(video.publish_at)}</p>
      <div className="action-row">
        <Button onClick={onApprove} disabled={busy}>
          Approve
        </Button>
        <Button variant="danger" onClick={onReject} disabled={busy}>
          Reject
        </Button>
      </div>
    </article>
  );
}

function PostDecision({
  post,
  busy,
  onApprove,
  onReject,
  onCaption,
}: {
  post: InstagramItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCaption: () => void;
}) {
  const channel = channelIdentity(post.channel);
  const canApprove = post.status === 'held';
  const canReject = post.status === 'queued' || post.status === 'retry';
  return (
    <article className="card">
      <Preview src={post.thumb} href={post.permalink} label={`Preview ${post.kind}`} />
      <div className="card-top">
        <h2 className="card-title">{post.kind}</h2>
        <Chip tone={igStatusTone(post.status)}>{igStatusLabel(post.status)}</Chip>
      </div>
      <div className="meta-row">
        <ChannelTag name={channel.handle || channel.name} tone={channel.tone} />
      </div>
      <p className="meta">{formatIst(post.when_ist, 'No time set')}</p>
      {post.caption && <p className="caption">{post.caption}</p>}
      <div className="action-row">
        {canApprove && (
          <Button onClick={onApprove} disabled={busy}>
            Approve
          </Button>
        )}
        {canReject && (
          <Button variant="danger" onClick={onReject} disabled={busy}>
            Reject
          </Button>
        )}
        <Button variant="secondary" onClick={onCaption} disabled={busy}>
          Edit caption
        </Button>
      </div>
    </article>
  );
}

function QaDecision({
  itemId,
  verdict,
  score,
  reasons,
  busy,
  onRender,
}: {
  itemId: string;
  verdict: 'approve' | 'reject';
  score: number;
  reasons: string[];
  busy: boolean;
  onRender: () => void;
}) {
  return (
    <article className="card">
      <Preview label="Not uploaded yet" />
      <div className="card-top">
        <h2 className="card-title">{itemId}</h2>
        <Chip tone={verdict === 'approve' ? 'good' : 'bad'}>{verdict}</Chip>
      </div>
      <p className="meta">{scoreLabel(score)} · Quality check, not on YouTube yet</p>
      {reasons.length > 0 && (
        <ul className="reasons">
          {reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{reason}</li>
          ))}
        </ul>
      )}
      <div className="action-row">
        <Button variant="secondary" onClick={onRender} disabled={busy}>
          Re-render
        </Button>
      </div>
    </article>
  );
}

function commandForPending(pending: Pending) {
  switch (pending.kind) {
    case 'reject-video':
      return buildRejectVideoCommand(pending.video);
    case 'render':
      return buildRenderCommand(pending.itemId);
    case 'hold':
      return buildHoldCommand(pending.post.id);
    case 'release':
      return buildReleaseCommand(pending.post.id);
    default: {
      const exhaustive: never = pending;
      return exhaustive;
    }
  }
}

function confirmTitle(pending: Pending): string {
  switch (pending.kind) {
    case 'reject-video':
      return 'Reject this video?';
    case 'render':
      return 'Queue a re-render?';
    case 'hold':
      return 'Reject this post?';
    case 'release':
      return 'Approve this post?';
    default: {
      const exhaustive: never = pending;
      return exhaustive;
    }
  }
}

function confirmBody(pending: Pending): string {
  switch (pending.kind) {
    case 'reject-video':
      return 'A reject instruction is sent to the assistant. The video stays unpublished.';
    case 'render':
      return `Queue a re-render of ${pending.itemId}.`;
    case 'hold':
      return 'The post stays held until you approve it.';
    case 'release':
      return 'Release the hold so this post can publish.';
    default: {
      const exhaustive: never = pending;
      return exhaustive;
    }
  }
}

function confirmLabel(pending: Pending): string {
  switch (pending.kind) {
    case 'reject-video':
    case 'hold':
      return 'Reject';
    case 'release':
      return 'Approve';
    case 'render':
      return 'Queue re-render';
    default: {
      const exhaustive: never = pending;
      return exhaustive;
    }
  }
}
