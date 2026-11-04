import { useEffect, useRef, useState, type ReactNode } from 'react';
import { pullOffset } from '../lib/pull';

interface PullToRefreshProps {
  active: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}

export function PullToRefresh({ active, isRefreshing, onRefresh, children }: PullToRefreshProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  const refreshingRef = useRef(isRefreshing);
  const [offset, setOffset] = useState(0);
  const [armed, setArmed] = useState(false);

  refreshRef.current = onRefresh;
  refreshingRef.current = isRefreshing;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || typeof node.scrollTo !== 'function') return;
    node.scrollTo(0, 0);
  }, [active]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const resetGesture = () => {
      pulling.current = false;
      offsetRef.current = 0;
      setOffset(0);
      setArmed(false);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || el.scrollTop > 0 || refreshingRef.current) return;
      pulling.current = true;
      startY.current = event.touches[0].clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (!pulling.current || event.touches.length !== 1) return;
      const distance = event.touches[0].clientY - startY.current;
      if (distance <= 0 || el.scrollTop > 0) {
        offsetRef.current = 0;
        setOffset(0);
        setArmed(false);
        return;
      }
      event.preventDefault();
      const next = pullOffset(distance);
      offsetRef.current = next.offset;
      setOffset(next.offset);
      setArmed(next.armed);
    };

    const onEnd = (event: TouchEvent) => {
      if (!pulling.current) return;
      const shouldRefresh = event.type !== 'touchcancel' && offsetRef.current >= 56 && !refreshingRef.current;
      resetGesture();
      if (shouldRefresh) refreshRef.current();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const revealed = isRefreshing ? Math.max(offset, 52) : offset;

  return (
    <div className="scroll" ref={scrollerRef}>
      <div className="pull" style={{ height: revealed }} aria-hidden={revealed === 0}>
        {isRefreshing ? <span className="spinner is-spinning" /> : <span className="pull-label">{armed ? 'Release to refresh' : offset > 12 ? 'Pull to refresh' : ''}</span>}
      </div>
      {children}
    </div>
  );
}
