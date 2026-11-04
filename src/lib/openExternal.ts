import { Capacitor } from '@capacitor/core';

export function openExternal(url: string): void {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
