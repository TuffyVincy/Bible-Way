import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Feather,
  Lock,
  Moon,
  Shield,
  Smartphone,
  Sun,
} from 'lucide-react';
import { DAILY_VERSES } from '../data/verses';
import type {
  AccountabilityCheckin,
  DailyVerse,
  PrayerEntry,
  StreakMetrics,
  TabId,
  VerseTheme,
} from '../types/steadfast';
import {
  formatReadableDate,
  getDailyVerseForDate,
  SEED_IMAGE_PATHS,
} from '../utils/steadfastLogic';

interface TodayViewProps {
  todayKey: string;
  bookmarkedVerseIds: string[];
  onToggleBookmark: (verseId: string) => void;
  onPrayVerse: (verse: DailyVerse) => void;
  onOpenGuardHeart: () => void;
  onNavigateTab: (tab: TabId) => void;
  metrics: StreakMetrics;
  todayCheckin?: AccountabilityCheckin;
  recentPrayers: PrayerEntry[];
  themeMode: 'light' | 'dark';
  nightReadingWarmth: boolean;
  onToggleTheme: () => void;
  passcodeEnabled: boolean;
  onLockNow: () => void;
  isAppInstalled: boolean;
  onOpenInstallGuide: () => void;
}

const VERSE_FILTERS: Array<VerseTheme | 'All' | 'Saved'> = [
  'All',
  'Strength in Temptation',
  'Guard the Mind',
  'Grace & Renewal',
  'Walking in Purity',
  'Saved',
];

export function TodayView({
  todayKey,
  bookmarkedVerseIds,
  onToggleBookmark,
  onPrayVerse,
  onOpenGuardHeart,
  onNavigateTab,
  metrics,
  todayCheckin,
  recentPrayers,
  themeMode,
  nightReadingWarmth,
  onToggleTheme,
  passcodeEnabled,
  onLockNow,
  isAppInstalled,
  onOpenInstallGuide,
}: TodayViewProps) {
  const defaultTodayVerse = useMemo(() => getDailyVerseForDate(todayKey), [todayKey]);
  const defaultIdx = useMemo(
    () => Math.max(0, DAILY_VERSES.findIndex((v) => v.id === defaultTodayVerse.id)),
    [defaultTodayVerse]
  );

  const [activeIndex, setActiveIndex] = useState(defaultIdx);
  const [libraryFilter, setLibraryFilter] = useState<VerseTheme | 'All' | 'Saved'>('All');
  const [showAllVerses, setShowAllVerses] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const activeVerse = DAILY_VERSES[activeIndex] ?? defaultTodayVerse;
  const isBookmarked = bookmarkedVerseIds.includes(activeVerse.id);

  const filteredVerses = useMemo(() => {
    if (libraryFilter === 'All') return DAILY_VERSES;
    if (libraryFilter === 'Saved') {
      return DAILY_VERSES.filter((v) => bookmarkedVerseIds.includes(v.id));
    }
    return DAILY_VERSES.filter((v) => v.theme === libraryFilter);
  }, [libraryFilter, bookmarkedVerseIds]);

  const progressRadius = 26;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const dashOffset =
    progressCircumference - (metrics.milestoneProgressPercent / 100) * progressCircumference;

  return (
    <div className="space-y-8">
      {/* Greeting & Quick Reading Mode Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {formatReadableDate(todayKey)} · Daily Scripture &amp; Focus
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {!isAppInstalled && (
              <button
                type="button"
                onClick={onOpenInstallGuide}
                aria-label="Install Steadfast on your phone"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A24] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                Install app
              </button>
            )}
            {passcodeEnabled && (
              <button
                type="button"
                onClick={onLockNow}
                aria-label="Lock app with passcode"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A24] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={themeMode === 'dark' ? 'Switch to daytime light mode' : 'Switch to nighttime dark reading mode'}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A24] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
            >
              {themeMode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  Daylight
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#1B5E53]" aria-hidden="true" />
                  Night reading
                </>
              )}
            </button>
          </div>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
          Walk steadily in the light
        </h1>
      </div>

      {/* Primary Two-Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Dominant Focal Anchor: Daily Verse Hero Card */}
        <section
          aria-label="Daily Bible verse"
          className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-h-[390px] sm:min-h-[420px]"
        >
          {!heroImgFailed ? (
            <img
              src={SEED_IMAGE_PATHS.heroDawn}
              alt="Quiet morning mist rising over a calm mountain lake at first light"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#173633] via-[#13242E] to-[#0B1118]" />
          )}

          {/* Measured Contrast Scrim */}
          <div
            className={`absolute inset-0 ${
              themeMode === 'dark' && nightReadingWarmth
                ? 'bg-gradient-to-t from-[#151412]/95 via-[#151412]/72 to-[#151412]/45'
                : 'bg-gradient-to-t from-slate-950/92 via-slate-950/65 to-slate-950/35'
            }`}
          />

          <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between h-full text-white">
            {/* Top row: quiet metadata + verse switcher */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-200/90">
                <span>Daily Verse</span>
                <span aria-hidden="true" className="mx-2 opacity-60">·</span>
                <span>{activeVerse.theme}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev - 1 + DAILY_VERSES.length) % DAILY_VERSES.length)
                  }
                  aria-label="Previous scripture verse"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % DAILY_VERSES.length)}
                  aria-label="Next scripture verse"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Verse Content */}
            <div className="my-6 max-w-2xl">
              <blockquote
                className={`font-serif text-xl sm:text-2xl leading-relaxed ${
                  themeMode === 'dark' && nightReadingWarmth ? 'text-[#F5EFE4]' : 'text-white'
                }`}
              >
                “{activeVerse.text}”
              </blockquote>
              <p className="mt-4 text-sm font-semibold tracking-wide text-teal-200">
                {activeVerse.reference}
              </p>
              <p className="mt-3 text-sm text-slate-200/90 leading-relaxed">
                {activeVerse.reflectionPrompt}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/15">
              <button
                type="button"
                onClick={() => onPrayVerse(activeVerse)}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-white text-[#132220] hover:bg-slate-100 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Feather className="w-4 h-4" aria-hidden="true" />
                Journal a prayer
              </button>
              <button
                type="button"
                onClick={() => onToggleBookmark(activeVerse.id)}
                aria-pressed={isBookmarked}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-sm transition-colors whitespace-nowrap shrink-0"
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-teal-200" aria-hidden="true" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" aria-hidden="true" />
                    Save verse
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Daily Focus Summary & Accountability CTA */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Streak & Daily Check-in Card */}
          <div className="flex-1 rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between gap-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Steadfast Streak
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-semibold tabular-nums">
                    {metrics.currentStreak}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {metrics.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Next milestone: {metrics.nextMilestone} days · Best: {metrics.longestStreak}d
                </p>
              </div>

              {/* Clean SVG Progress Ring */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                  <circle
                    cx="32"
                    cy="32"
                    r={progressRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={progressRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={progressCircumference}
                    strokeDashoffset={dashOffset}
                    className="text-[#1B5E53] dark:text-[#4DBAA7] transition-all duration-300"
                  />
                </svg>
                <span className="absolute text-xs font-mono font-medium tabular-nums">
                  {metrics.milestoneProgressPercent}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Today’s accountability check-in</span>
                <span className="font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                  {todayCheckin ? 'Completed' : 'Pending'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('progress')}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                {todayCheckin ? 'Update today’s check-in' : 'Add daily photo check-in'}
              </button>
            </div>
          </div>

          {/* Temptation Pause Card */}
          <div className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Feeling tempted right now?</h2>
              <Shield className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Take 60 quiet seconds to breathe, anchor in Scripture, and step away before an impulse turns into regret.
            </p>
            <button
              type="button"
              onClick={onOpenGuardHeart}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#1B5E53]/30 dark:border-[#4DBAA7]/40 text-[#1B5E53] dark:text-[#4DBAA7] hover:bg-[#1B5E53]/5 dark:hover:bg-[#4DBAA7]/10 text-sm font-medium transition-colors"
            >
              Open Pause &amp; Pray
            </button>
          </div>
        </aside>
      </div>

      {/* Recent Prayers Preview + Curated Scripture Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* Scripture Library */}
        <section className="lg:col-span-8 space-y-5" aria-labelledby="scripture-library-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="scripture-library-heading" className="font-serif text-2xl font-semibold">
                Scripture for the journey
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {filteredVerses.length} passages · Tap any passage to read or journal
              </p>
            </div>
          </div>

          {/* Interactive Filter Controls */}
          <div
            role="tablist"
            aria-label="Filter scriptures by theme"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {VERSE_FILTERS.map((filterName) => {
              const active = libraryFilter === filterName;
              return (
                <button
                  key={filterName}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setLibraryFilter(filterName)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#172026] text-white dark:bg-[#ECF1F4] dark:text-[#0B1118]'
                      : 'bg-white dark:bg-[#121A24] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {filterName}
                </button>
              );
            })}
          </div>

          {filteredVerses.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No saved verses yet. Tap “Save verse” on any passage to keep it close for nighttime reading.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(showAllVerses ? filteredVerses : filteredVerses.slice(0, 6)).map((verse) => {
                  const saved = bookmarkedVerseIds.includes(verse.id);
                  return (
                    <article
                      key={verse.id}
                      className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 ${
                        themeMode === 'dark' && nightReadingWarmth
                          ? 'bg-white dark:bg-[#161513]'
                          : 'bg-white dark:bg-[#121A24]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-[#1B5E53] dark:text-[#4DBAA7]">
                            {verse.reference}
                          </span>
                          <span className="truncate">{verse.theme}</span>
                        </div>
                        <p
                          className={`mt-3 font-serif text-base leading-relaxed ${
                            themeMode === 'dark' && nightReadingWarmth
                              ? 'dark:text-[#F2ECE1]'
                              : ''
                          }`}
                        >
                          “{verse.text}”
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => onPrayVerse(verse)}
                          className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7] hover:underline min-h-[36px] inline-flex items-center"
                        >
                          Pray this verse
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(verse.id)}
                          aria-label={saved ? `Remove ${verse.reference} from saved verses` : `Save ${verse.reference}`}
                          className="min-h-[40px] min-w-[40px] -mr-2 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1B5E53] dark:hover:text-[#4DBAA7] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {saved ? (
                            <BookmarkCheck className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                          ) : (
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredVerses.length > 6 && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllVerses((prev) => !prev)}
                    className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A24] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {showAllVerses
                      ? 'Show fewer passages'
                      : `Show all ${filteredVerses.length} passages`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recent Prayers Column */}
        <section className="lg:col-span-4 space-y-5" aria-labelledby="recent-prayers-heading">
          <div className="flex items-center justify-between">
            <h2 id="recent-prayers-heading" className="font-serif text-2xl font-semibold">
              Recent prayers
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('journal')}
              className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7] hover:underline min-h-[36px] inline-flex items-center"
            >
              Open journal
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {recentPrayers.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                Your prayer journal is quiet. Start by writing a short evening commitment.
              </div>
            ) : (
              recentPrayers.slice(0, 3).map((prayer) => (
                <div key={prayer.id} className="p-5 space-y-1.5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span>{prayer.category}</span>
                    {prayer.verseRef && (
                      <>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span>{prayer.verseRef}</span>
                      </>
                    )}
                    {prayer.answered && (
                      <>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span className="text-[#1B5E53] dark:text-[#4DBAA7] font-medium">Answered</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold">{prayer.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {prayer.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
