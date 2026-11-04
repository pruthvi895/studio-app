import { useEffect, useMemo, useState } from 'react';
import { channelIdentity, formatIst, videoThumbUrl, videoWatchUrl, type ChannelTone } from '../lib/format';
import type { SendResult, StudioCommand, StudioState, Video } from '../types';
import { ScheduleSheet, TitleSheet } from './forms';
import { IconVideos } from './icons';
import { Preview } from './Preview';
import { Button, ChannelTag, Chip, EmptyState, LoadingState, Segmented } from './ui';

interface VideosScreenProps {
  state: StudioState;
  hasLoaded: boolean;
  isSending: boolean;
  onCommand: (command: StudioCommand) => Promise<SendResult>;
}

type VideoView = 'library' | 'plan';
type ChannelFilter = 'all' | ChannelTone;

export function VideosScreen({ state, hasLoaded, isSending, onCommand }: VideosScreenProps) {
  const [view, setView] = useState<VideoView>('library');
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [schedule, setSchedule] = useState<Video | null>(null);
  const [title, setTitle] = useState<Video | null>(null);

  const videos = state.youtube?.videos ?? [];
  const pairs = useMemo(
    () => [...(state.schedule?.pairs ?? [])].sort((a, b) => a.short_at.localeCompare(b.short_at)),
    [state.schedule?.pairs]
  );
  const hasOther = videos.some((video) => channelIdentity(video.channel).tone === 'neutral');

  useEffect(() => {
    if (filter === 'neutral' && !hasOther) setFilter('all');
  }, [filter, hasOther]);
  const visible = videos
    .filter((video) => filter === 'all' || channelIdentity(video.channel).tone === filter)
    .slice()
    .sort((a, b) => publishTime(b) - publishTime(a));

  if (!hasLoaded) return <LoadingState />;

  return (
    <div className="screen">
      <div className="sticky-bar">
        <Segmented
          label="Video sections"
          value={view}
          onChange={setView}
          options={[
            { value: 'library', label: 'Library' },
            { value: 'plan', label: 'Plan' },
          ]}
        />
      </div>

      {view === 'plan' ? (
        pairs.length === 0 ? (
          <EmptyState
            icon={<IconVideos />}
            title="No plan yet"
            hint="Case file pairs from the schedule show up here."
          />
        ) : (
          <div className="stack">
            {pairs.map((pair) => (
              <article className="card" key={`${pair.case_file}-${pair.short_at}`}>
                <p className="eyebrow">Case file</p>
                <h2 className="card-title">#{pair.case_file}</h2>
                <div className="plan-row">
                  <span>Short</span>
                  <strong>{pair.short || 'Untitled'}</strong>
                  <em>{formatIst(pair.short_at, 'Time not set')}</em>
                </div>
                <div className="plan-row">
                  <span>Long</span>
                  <strong>{pair.long || 'Untitled'}</strong>
                  <em>{formatIst(pair.long_at, 'Time not set')}</em>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="filters" role="toolbar" aria-label="Channel">
            <FilterChip on={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterChip>
            <FilterChip on={filter === 'casebook'} onClick={() => setFilter('casebook')}>
              Casebook Atlas
            </FilterChip>
            <FilterChip on={filter === 'tenglish'} onClick={() => setFilter('tenglish')}>
              Tenglish Gaming
            </FilterChip>
            {hasOther && (
              <FilterChip on={filter === 'neutral'} onClick={() => setFilter('neutral')}>
                Other
              </FilterChip>
            )}
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={<IconVideos />}
              title="No videos"
              hint="Uploads from both channels show up here once they sync."
            />
          ) : (
            <div className="stack">
              {visible.map((video) => {
                const channel = channelIdentity(video.channel);
                const name = video.title || video.item_id || video.video_id;
                return (
                  <article className="card" key={video.video_id || video.item_id}>
                    <div className="media">
                      <Preview
                        compact
                        src={videoThumbUrl(video)}
                        href={videoWatchUrl(video.video_id)}
                        label={`Preview ${name}`}
                      />
                      <div className="media-body">
                        <h2 className="card-title">{name}</h2>
                        <ChannelTag name={channel.name} tone={channel.tone} />
                        <div className="meta-row">
                          <Chip tone={video.privacy.toLowerCase() === 'public' ? 'good' : 'muted'}>
                            {video.privacy}
                          </Chip>
                          <Chip tone={video.qa_pass ? 'good' : 'bad'}>{video.qa_pass ? 'QA pass' : 'QA fail'}</Chip>
                        </div>
                        <p className="meta">{formatIst(video.publish_at)}</p>
                      </div>
                    </div>
                    <div className="action-row">
                      <Button onClick={() => setSchedule(video)} disabled={isSending || !video.video_id}>
                        Schedule
                      </Button>
                      <Button variant="secondary" onClick={() => setTitle(video)} disabled={isSending || !video.video_id}>
                        Edit title
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {schedule && (
        <ScheduleSheet video={schedule} busy={isSending} onClose={() => setSchedule(null)} onCommand={onCommand} />
      )}
      {title && (
        <TitleSheet video={title} busy={isSending} onClose={() => setTitle(null)} onCommand={onCommand} />
      )}
    </div>
  );
}

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" className={on ? 'chip-btn is-on' : 'chip-btn'} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function publishTime(video: Video): number {
  if (!video.publish_at) return 0;
  const time = new Date(video.publish_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}
