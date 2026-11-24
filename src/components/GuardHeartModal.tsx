import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { DAILY_VERSES } from '../data/verses';

interface GuardHeartModalProps {
  open: boolean;
  onClose: () => void;
  onLogUrgeResisted: () => void;
  nightReadingWarmth: boolean;
}

const EMERGENCY_VERSES = DAILY_VERSES.filter((v) => v.theme === 'Strength in Temptation');

const BREATH_PHASES = [
  { label: 'Breathe in slowly', seconds: 4 },
  { label: 'Hold gently', seconds: 4 },
  { label: 'Breathe out and release', seconds: 4 },
];

export function GuardHeartModal({
  open,
  onClose,
  onLogUrgeResisted,
  nightReadingWarmth,
}: GuardHeartModalProps) {
  const [verseIndex, setVerseIndex] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [tick, setTick] = useState(4);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!open) {
      setLogged(false);
      setPhaseIdx(0);
      setTick(4);
      return;
    }

    const timer = window.setInterval(() => {
      setTick((prev) => {
        if (prev <= 1) {
          setPhaseIdx((p) => (p + 1) % BREATH_PHASES.length);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const currentVerse = EMERGENCY_VERSES[verseIndex % EMERGENCY_VERSES.length];
  const currentPhase = BREATH_PHASES[phaseIdx];

  const handleMarkResisted = () => {
    onLogUrgeResisted();
    setLogged(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guard-heart-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
    >
      <div
        className={`w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl ${
          nightReadingWarmth
            ? 'bg-white dark:bg-[#171614] text-[#172026] dark:text-[#F2ECE1]'
            : 'bg-white dark:bg-[#121A24] text-[#172026] dark:text-[#ECF1F4]'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              Pause &amp; Pray · 60-Second Reset
            </p>
            <h2 id="guard-heart-title" className="mt-1 font-serif text-2xl font-semibold">
              Guard your heart right now
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Pause and Pray modal"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Calm Breathing Cue */}
        <div className="mt-6 flex items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="w-16 h-16 shrink-0 rounded-full border-2 border-[#1B5E53]/40 dark:border-[#4DBAA7]/50 flex items-center justify-center font-mono text-xl font-medium tabular-nums text-[#1B5E53] dark:text-[#4DBAA7]">
            {tick}s
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{currentPhase.label}</p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Put the phone down after reading, step away from screens, and take three steady breaths.
            </p>
          </div>
        </div>

        {/* Grounding Scripture */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {currentVerse.reference} · Anchor Scripture
            </span>
            <button
              type="button"
              onClick={() => setVerseIndex((i) => (i + 1) % EMERGENCY_VERSES.length)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Next verse
            </button>
          </div>
          <blockquote className="font-serif text-lg sm:text-xl leading-relaxed">
            “{currentVerse.text}”
          </blockquote>
          <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
            {currentVerse.shortPrayer}
          </p>
        </div>

        <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {logged ? (
            <div className="flex items-center gap-2 text-sm font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Urge resisted logged for today. Walk in peace.</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleMarkResisted}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              I stepped away · Log victory
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Return to app
          </button>
        </div>
      </div>
    </div>
  );
}
