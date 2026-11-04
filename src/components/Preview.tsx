import { useEffect, useState } from 'react';
import { cx } from './ui';

interface PreviewProps {
  src?: string;
  href?: string;
  label: string;
  compact?: boolean;
}

export function Preview({ src, href, label, compact = false }: PreviewProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const className = cx('preview', compact && 'is-compact', !src || failed ? 'is-fallback' : false);

  if (src && !failed) {
    const image = (
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
    if (!href) return <div className={className}>{image}</div>;
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {image}
        <span className="sr-only">{label}</span>
      </a>
    );
  }

  const body = (
    <>
      <span className="preview-label">{label}</span>
      <span className="preview-sub">{href ? 'Open preview' : 'No preview yet'}</span>
    </>
  );

  if (!href) return <div className={className}>{body}</div>;
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  );
}
