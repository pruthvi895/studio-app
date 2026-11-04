import { toIstPublishAt } from './format';
import type { StudioCommand, Video } from '../types';

export type CommandBuild = { ok: true; command: StudioCommand } | { ok: false; error: string };

export function buildScheduleCommand(input: {
  channel: string;
  videoId: string;
  localDateTime: string;
}): CommandBuild {
  if (!input.channel.trim() || !input.videoId.trim()) {
    return { ok: false, error: 'This video is missing a channel or id.' };
  }
  const publishAt = toIstPublishAt(input.localDateTime);
  if (!publishAt) return { ok: false, error: 'Choose a date and time.' };
  return {
    ok: true,
    command: {
      type: 'yt_schedule',
      channel: input.channel,
      video_id: input.videoId,
      publish_at: publishAt,
      approve: true,
    },
  };
}

export function buildTitleCommand(input: {
  channel: string;
  videoId: string;
  title: string;
}): CommandBuild {
  const title = input.title.trim();
  if (!input.channel.trim() || !input.videoId.trim()) {
    return { ok: false, error: 'This video is missing a channel or id.' };
  }
  if (!title) return { ok: false, error: 'Enter a title.' };
  return {
    ok: true,
    command: {
      type: 'yt_title',
      channel: input.channel,
      video_id: input.videoId,
      title,
    },
  };
}

export function buildRejectVideoCommand(video: Pick<Video, 'item_id' | 'video_id' | 'channel'>): CommandBuild {
  if (!video.video_id.trim() && !video.item_id.trim()) {
    return { ok: false, error: 'This video is missing an id.' };
  }
  const label = video.item_id.trim() || video.video_id.trim();
  return {
    ok: true,
    command: {
      type: 'note',
      text: `Reject video ${label} (${video.video_id}) on ${video.channel}. Do not publish it.`,
    },
  };
}

export function buildRenderCommand(itemId: string): CommandBuild {
  const id = itemId.trim();
  if (!id) return { ok: false, error: 'Enter an item id.' };
  return { ok: true, command: { type: 'render', item_id: id } };
}

export function buildHoldCommand(itemId: string): CommandBuild {
  const item = itemId.trim();
  if (!item) return { ok: false, error: 'This post is missing an id.' };
  return { ok: true, command: { type: 'ig_hold', item } };
}

export function buildReleaseCommand(itemId: string): CommandBuild {
  const item = itemId.trim();
  if (!item) return { ok: false, error: 'This post is missing an id.' };
  return { ok: true, command: { type: 'ig_release', item } };
}

export function buildCaptionCommand(itemId: string, caption: string): CommandBuild {
  const item = itemId.trim();
  const next = caption.trim();
  if (!item) return { ok: false, error: 'This post is missing an id.' };
  if (!next) return { ok: false, error: 'Enter a caption.' };
  return { ok: true, command: { type: 'ig_caption', item, caption: next } };
}

export function buildNoteCommand(text: string): CommandBuild {
  const note = text.trim();
  if (!note) return { ok: false, error: 'Write an instruction first.' };
  return { ok: true, command: { type: 'note', text: note } };
}
