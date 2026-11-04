import { useRef, useState } from 'react';
import {
  buildCaptionCommand,
  buildNoteCommand,
  buildScheduleCommand,
  buildTitleCommand,
} from '../lib/commands';
import { formatIst, toDatetimeLocalIst, toIstPublishAt } from '../lib/format';
import { useMounted } from '../hooks/useMounted';
import type { InstagramItem, SendResult, StudioCommand, Video } from '../types';
import { Button, Field, Sheet } from './ui';

interface CommandSheetProps {
  busy: boolean;
  onClose: () => void;
  onCommand: (command: StudioCommand) => Promise<SendResult>;
}

export function ScheduleSheet({
  video,
  busy,
  onClose,
  onCommand,
}: CommandSheetProps & { video: Video }) {
  const [value, setValue] = useState(() => toDatetimeLocalIst(video.publish_at));
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();
  const publishAt = toIstPublishAt(value);
  const preview = publishAt ? formatIst(publishAt) : '';

  const submit = async () => {
    if (lock.current || busy) return;
    const built = buildScheduleCommand({
      channel: video.channel,
      videoId: video.video_id,
      localDateTime: value,
    });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    lock.current = true;
    setError(null);
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) onClose();
      else setError(result.error);
    } finally {
      lock.current = false;
    }
  };

  return (
    <Sheet title="Approve and schedule" onClose={onClose}>
      <p className="sheet-copy">
        {video.item_id || video.video_id} goes public at the time you pick. The clock is IST.
      </p>
      <Field label="Publish time (IST)">
        {(id) => (
          <input
            id={id}
            className="input"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
      </Field>
      {preview && <p className="meta">Publishes {preview}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? 'Sending…' : 'Approve and schedule'}
        </Button>
      </div>
    </Sheet>
  );
}

export function TitleSheet({
  video,
  busy,
  onClose,
  onCommand,
}: CommandSheetProps & { video: Video }) {
  const [title, setTitle] = useState(video.title ?? '');
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();

  const submit = async () => {
    if (lock.current || busy) return;
    const built = buildTitleCommand({
      channel: video.channel,
      videoId: video.video_id,
      title,
    });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    lock.current = true;
    setError(null);
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) onClose();
      else setError(result.error);
    } finally {
      lock.current = false;
    }
  };

  return (
    <Sheet title="Update title" onClose={onClose}>
      <p className="sheet-copy">{video.item_id || video.video_id}</p>
      <Field label="Title">
        {(id) => (
          <input
            id={id}
            className="input"
            type="text"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy || !title.trim()}>
          {busy ? 'Sending…' : 'Save title'}
        </Button>
      </div>
    </Sheet>
  );
}

export function CaptionSheet({
  post,
  busy,
  onClose,
  onCommand,
}: CommandSheetProps & { post: InstagramItem }) {
  const [caption, setCaption] = useState(post.caption ?? '');
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();

  const submit = async () => {
    if (lock.current || busy) return;
    const built = buildCaptionCommand(post.id, caption);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    lock.current = true;
    setError(null);
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) onClose();
      else setError(result.error);
    } finally {
      lock.current = false;
    }
  };

  return (
    <Sheet title="Edit caption" onClose={onClose}>
      <Field label="Caption">
        {(id) => (
          <textarea
            id={id}
            className="input textarea"
            rows={6}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        )}
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy || !caption.trim()}>
          {busy ? 'Sending…' : 'Save caption'}
        </Button>
      </div>
    </Sheet>
  );
}

export function InstructSheet({
  seed = '',
  busy,
  onClose,
  onCommand,
}: CommandSheetProps & { seed?: string }) {
  const [text, setText] = useState(seed);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useMounted();

  const submit = async () => {
    if (lock.current || busy) return;
    const built = buildNoteCommand(text);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    lock.current = true;
    setError(null);
    try {
      const result = await onCommand(built.command);
      if (!mounted()) return;
      if (result.ok) onClose();
      else setError(result.error);
    } finally {
      lock.current = false;
    }
  };

  return (
    <Sheet title="Instruction" onClose={onClose}>
      <p className="sheet-copy">Sent to the studio laptop. The result shows up in Activity.</p>
      <Field label="Instruction">
        {(id) => (
          <textarea
            id={id}
            className="input textarea"
            rows={6}
            placeholder="What should the assistant change, hold, or publish?"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy || !text.trim()}>
          {busy ? 'Sending…' : 'Send instruction'}
        </Button>
      </div>
    </Sheet>
  );
}

export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  danger = false,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="sheet-copy">{body}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Sending…' : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

