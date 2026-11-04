import type { InstagramItem, QAItem, StudioState, Video } from '../types';

export interface VideoReview {
  kind: 'video';
  key: string;
  video: Video;
  qa?: QAItem;
}

export interface QaReview {
  kind: 'qa';
  key: string;
  itemId: string;
  qa: QAItem;
}

export interface PostReview {
  kind: 'post';
  key: string;
  post: InstagramItem;
}

export type ReviewEntry = VideoReview | QaReview | PostReview;

export function videoNeedsDecision(video: Video): boolean {
  if (video.privacy.trim().toLowerCase() === 'public') return false;
  if (!video.publish_at) return true;
  return video.qa_pass === false;
}

export function postNeedsDecision(post: InstagramItem): boolean {
  return post.status === 'queued' || post.status === 'held' || post.status === 'retry';
}

export function buildReviewQueue(state: StudioState): ReviewEntry[] {
  const videos = state.youtube?.videos ?? [];
  const qa = state.qa ?? {};
  const uploaded = new Set(videos.map((video) => video.item_id).filter(Boolean));

  const qaItems: QaReview[] = Object.entries(qa)
    .filter(([id]) => id && !uploaded.has(id))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, item]) => ({
      kind: 'qa',
      key: `qa:${itemId}`,
      itemId,
      qa: item,
    }));

  const videoItems: VideoReview[] = videos
    .filter(videoNeedsDecision)
    .map((video) => ({
      kind: 'video',
      key: `video:${video.video_id || video.item_id}`,
      video,
      qa: qa[video.item_id],
    }));

  const posts: PostReview[] = (state.ig?.items ?? [])
    .filter(postNeedsDecision)
    .slice()
    .sort((a, b) => (b.when_ist || '').localeCompare(a.when_ist || ''))
    .map((post) => ({
      kind: 'post',
      key: `post:${post.id}`,
      post,
    }));

  return [...videoItems, ...posts, ...qaItems];
}

export function reviewSummary(queue: ReviewEntry[]): string {
  const videos = queue.filter((item) => item.kind === 'video').length;
  const posts = queue.filter((item) => item.kind === 'post').length;
  const checks = queue.filter((item) => item.kind === 'qa').length;
  const parts = [
    videos ? `${videos} video${videos === 1 ? '' : 's'}` : '',
    posts ? `${posts} post${posts === 1 ? '' : 's'}` : '',
    checks ? `${checks} quality check${checks === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  if (parts.length === 0) return 'Nothing waiting';
  return parts.join(' · ');
}

export function listActivity(results: StudioState['results']) {
  return Object.entries(results ?? {})
    .map(([id, data]) => ({
      id,
      type: data.type || 'command',
      ok: data.ok === true,
      msg: data.msg || '',
      at: data.at || '',
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 80);
}
