import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, X } from 'lucide-react';

interface PWAInstallModalProps {
  open: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onInstallPrompt: () => Promise<boolean>;
  onClose: () => void;
}

export function PWAInstallModal({
  open,
  isInstallable,
  isIOS,
  isAndroid,
  onInstallPrompt,
  onClose,
}: PWAInstallModalProps) {
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'android'
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isIOS) setActivePlatform('ios');
    else if (isAndroid) setActivePlatform('android');
  }, [isIOS, isAndroid]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDirectInstall = async () => {
    const accepted = await onInstallPrompt();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl text-[#172026] dark:text-[#ECF1F4]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1B5E53]/10 dark:bg-[#3DA694]/15 flex items-center justify-center text-[#1B5E53] dark:text-[#4DBAA7] shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                Home Screen App · Offline Ready
              </p>
              <h2 id="pwa-install-title" className="font-serif text-xl sm:text-2xl font-semibold">
                Install Steadfast on your phone
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Install Steadfast directly to your home screen for a full-screen mobile app experience, private offline reading, and quick passcode access.
        </p>

        {/* Direct Native Prompt if supported by browser */}
        {isInstallable && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => void handleDirectInstall()}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Install Steadfast Now
            </button>
          </div>
        )}

        {/* Platform Guide Selector */}
        <div className="mt-5 space-y-4">
          <div
            role="tablist"
            aria-label="Phone platform instructions"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activePlatform === 'android'}
              onClick={() => setActivePlatform('android')}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activePlatform === 'android'
                  ? 'bg-white dark:bg-[#1B2634] text-[#172026] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activePlatform === 'ios'}
              onClick={() => setActivePlatform('ios')}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activePlatform === 'ios'
                  ? 'bg-white dark:bg-[#1B2634] text-[#172026] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              iPhone / iPad (Safari)
            </button>
          </div>

          {activePlatform === 'android' ? (
            <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4">
              <li>
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-2">01.</span>
                Open this app link in <strong>Chrome</strong> on your Android phone.
              </li>
              <li>
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-2">02.</span>
                Tap the <strong>three-dot menu (⋮)</strong> in the top-right corner of Chrome.
              </li>
              <li>
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-2">03.</span>
                Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>) and confirm.
              </li>
            </ol>
          ) : (
            <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4">
              <li>
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-2">01.</span>
                Open this app link in <strong>Safari</strong> on your iPhone or iPad.
              </li>
              <li className="flex items-start gap-1">
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-1 mt-0.5 shrink-0">02.</span>
                <span>
                  Tap the <strong className="inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline" aria-hidden="true" /></strong> button in the bottom toolbar.
                </span>
              </li>
              <li>
                <span className="font-mono text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] mr-2">03.</span>
                Scroll down, tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
              </li>
            </ol>
          )}
        </div>

        {/* Copy App Link Helper */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                Link copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy app link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
