import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { IconClose } from './icons';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  full?: boolean;
}

export function Button({ variant = 'primary', full = false, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, full && 'btn-full', className)} {...props} />
  );
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Chip({ tone, children }: { tone: 'good' | 'bad' | 'muted'; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function ChannelTag({ name, tone }: { name: string; tone: 'casebook' | 'tenglish' | 'neutral' }) {
  return (
    <span className={`channel tone-${tone}`}>
      <span className="channel-dot" />
      {name}
    </span>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? 'is-on' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  compact = false,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'empty is-compact' : 'empty'}>
      <div className="empty-mark">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="screen">
      <div className="stack">
        <p className="sr-only">Loading studio</p>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previously = document.activeElement;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previously instanceof HTMLElement) previously.focus();
    };
  }, []);

  return (
    <div className="sheet-root">
      <button type="button" className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <IconClose />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {children(id)}
    </label>
  );
}
