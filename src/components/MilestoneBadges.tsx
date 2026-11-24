import React, { useState } from 'react';
import { Check, Compass, Crown, Lock, ShieldCheck } from 'lucide-react';
import type { MilestoneBadge, MilestoneBadgeId } from '../types/steadfast';

interface MilestoneBadgesProps {
  badges: MilestoneBadge[];
}

function BadgeIcon({ id, unlocked }: { id: MilestoneBadgeId; unlocked: boolean }) {
  const iconClass = 'w-6 h-6';
  const accentRing =
    id === 'streak-7'
      ? unlocked
        ? 'bg-[#1B5E53] text-white dark:bg-[#3DA694] dark:text-[#0B1118] border-[#1B5E53]/30 dark:border-[#4DBAA7]/40'
        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
      : id === 'streak-30'
        ? unlocked
          ? 'bg-[#9A6B2F] text-white dark:bg-[#D9A760] dark:text-[#0B1118] border-[#9A6B2F]/30 dark:border-[#D9A760]/40'
          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
        : unlocked
          ? 'bg-[#2C4A7C] text-white dark:bg-[#7BA6E8] dark:text-[#0B1118] border-[#2C4A7C]/30 dark:border-[#7BA6E8]/40'
          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700';

  const Icon =
    id === 'streak-7' ? ShieldCheck : id === 'streak-30' ? Compass : Crown;

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors ${accentRing}`}
      >
        <Icon className={iconClass} aria-hidden="true" />
      </div>
      <span
        aria-hidden="true"
        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#121A24] ${
          unlocked
            ? 'bg-[#1B5E53] dark:bg-[#4DBAA7] text-white dark:text-[#0B1118]'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
        }`}
      >
        {unlocked ? <Check className="w-3 h-3" /> : <Lock className="w-2.5 h-2.5" />}
      </span>
    </div>
  );
}

export function MilestoneBadges({ badges }: MilestoneBadgesProps) {
  const [selectedId, setSelectedId] = useState<MilestoneBadgeId>(badges[0]?.id ?? 'streak-7');
  const earnedCount = badges.filter((b) => b.unlocked).length;
  const activeBadge = badges.find((b) => b.id === selectedId) ?? badges[0];

  return (
    <section
      aria-labelledby="milestone-badges-heading"
      className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="milestone-badges-heading" className="font-serif text-xl font-semibold">
            Milestone Badges
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Visual awards for 7-day, 30-day, and 100-day steadfast streaks
          </p>
        </div>
        <span
          className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400"
          data-testid="milestone-badges-earned-count"
        >
          {earnedCount} / {badges.length} earned
        </span>
      </div>

      {/* 3-Column Visual Medallion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {badges.map((badge) => {
          const isSelected = activeBadge?.id === badge.id;
          const barColor =
            badge.id === 'streak-7'
              ? 'bg-[#1B5E53] dark:bg-[#4DBAA7]'
              : badge.id === 'streak-30'
                ? 'bg-[#9A6B2F] dark:bg-[#D9A760]'
                : 'bg-[#2C4A7C] dark:bg-[#7BA6E8]';

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedId(badge.id)}
              aria-pressed={isSelected}
              data-testid={`badge-${badge.id}`}
              data-unlocked={badge.unlocked ? 'true' : 'false'}
              className={`text-left rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7] ${
                isSelected
                  ? 'border-[#1B5E53]/50 dark:border-[#4DBAA7]/50 bg-slate-50/90 dark:bg-slate-900/70'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121A24] hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <BadgeIcon id={badge.id} unlocked={badge.unlocked} />
                <span
                  className={`text-[11px] font-medium tabular-nums ${
                    badge.unlocked
                      ? 'text-[#1B5E53] dark:text-[#4DBAA7]'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {badge.unlocked ? 'Earned' : `${badge.daysRemaining}d left`}
                </span>
              </div>

              <div>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {badge.label}
                </p>
                <h3 className="mt-0.5 text-sm font-semibold">{badge.title}</h3>
              </div>

              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  <span>
                    {badge.progressDays}/{badge.targetDays}d
                  </span>
                  <span>{badge.progressPercent}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Badge Reflection Detail */}
      {activeBadge && (
        <div
          className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-4 space-y-1.5"
          data-testid="milestone-badge-detail"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[#172026] dark:text-[#ECF1F4]">
              {activeBadge.label} · {activeBadge.title}
            </span>
            <span className="font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              {activeBadge.unlocked
                ? 'Awarded'
                : `${activeBadge.daysRemaining} ${activeBadge.daysRemaining === 1 ? 'day' : 'days'} remaining`}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeBadge.description}
          </p>
          <p className="pt-1 font-serif text-xs italic text-slate-700 dark:text-slate-200">
            “{activeBadge.scriptureText}” —{' '}
            <span className="not-italic font-sans font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              {activeBadge.scriptureRef}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
