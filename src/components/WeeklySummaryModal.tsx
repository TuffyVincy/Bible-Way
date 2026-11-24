import React, { useEffect } from 'react';
import { Check, Flame, RotateCcw, ShieldCheck, X } from 'lucide-react';
import type { WeeklySummaryMetrics } from '../types/steadfast';
import { formatReadableDate } from '../utils/steadfastLogic';

interface WeeklySummaryModalProps {
  open: boolean;
  summary: WeeklySummaryMetrics;
  onClose: () => void;
}

export function WeeklySummaryModal({ open, summary, onClose }: WeeklySummaryModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-summary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl text-[#172026] dark:text-[#ECF1F4] max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              {formatReadableDate(summary.windowStartKey)} – {formatReadableDate(summary.windowEndKey)} · 7-Day Reflection
            </p>
            <h2 id="weekly-summary-title" className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
              Weekly Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Weekly Summary modal"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Core Two-Metric Highlight */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total urges resisted</span>
              <ShieldCheck className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
            </div>
            <p
              className="mt-2 font-mono text-4xl font-semibold tabular-nums"
              data-testid="weekly-urges-resisted"
            >
              {summary.weeklyUrgesResisted}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Past 7 days · All-time total: {summary.totalUrgesResistedAllTime}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Days in a row without failure</span>
              <Flame className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
            </div>
            <p
              className="mt-2 font-mono text-4xl font-semibold tabular-nums"
              data-testid="weekly-consecutive-days"
            >
              {summary.daysInRowWithoutFailure}
              <span className="text-sm font-sans font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                {summary.daysInRowWithoutFailure === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Longest run: {summary.longestRunWithoutFailure}d · Clean this week: {summary.weeklyCleanDays}/7
            </p>
          </div>
        </div>

        {/* 7-Day Rhythm Strip */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Last 7 days at a glance
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {summary.weeklyFailureCount === 0
                ? 'Zero check-in failures this week'
                : `${summary.weeklyFailureCount} grace ${summary.weeklyFailureCount === 1 ? 'reset' : 'resets'} logged`}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {summary.weeklyDays.map((day) => {
              const isClean = day.status === 'steadfast' || day.status === 'overcame';
              const isGrace = day.status === 'grace';
              const statusText = isClean
                ? 'Clean'
                : isGrace
                  ? 'Reset'
                  : 'Open';

              return (
                <div
                  key={day.dateKey}
                  aria-label={`${formatReadableDate(day.dateKey)}: ${statusText}, ${day.urgesResisted} urges resisted`}
                  className={`rounded-xl px-1.5 py-2.5 text-center border flex flex-col items-center gap-1 ${
                    isClean
                      ? 'border-[#1B5E53]/40 dark:border-[#4DBAA7]/50 bg-[#1B5E53]/10 dark:bg-[#4DBAA7]/15'
                      : isGrace
                        ? 'border-amber-400/70 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {day.weekday}
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {day.dayNum}
                  </span>
                  <span className="h-4 flex items-center justify-center">
                    {isClean ? (
                      <Check className="w-3.5 h-3.5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                    ) : isGrace ? (
                      <RotateCcw className="w-3 h-3 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {day.urgesResisted > 0 ? `${day.urgesResisted}u` : statusText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Long-Term Encouragement */}
        <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-5 space-y-2.5">
          <h3 className="font-serif text-lg font-semibold">{summary.encouragementTitle}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {summary.encouragementMessage}
          </p>
          <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
            <blockquote className="font-serif text-sm italic text-slate-700 dark:text-slate-200 leading-relaxed">
              “{summary.encouragementVerseText}”
            </blockquote>
            <p className="mt-1 text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              {summary.encouragementVerseRef}
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            Continue walking steadfast
          </button>
        </div>
      </div>
    </div>
  );
}
