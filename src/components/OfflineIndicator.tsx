import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-6xl mx-auto px-4 sm:px-6 pt-3"
    >
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2.5 text-xs font-medium text-amber-950 dark:text-amber-200">
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Offline mode — Cached verses, prayers, and local check-ins remain available.</span>
      </div>
    </div>
  );
}
