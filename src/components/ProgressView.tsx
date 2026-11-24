import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Camera,
  Check,
  Image as ImageIcon,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AccountabilityCheckin,
  CheckinStatus,
  StreakMetrics,
} from '../types/steadfast';
import {
  BLUEPRINT_LIMITS,
  calculateMilestoneBadges,
  calculateWeeklySummary,
  formatReadableDate,
  formatShortWeekday,
  getLastNDaysKeys,
  SEED_IMAGE_PATHS,
  validateCheckinInput,
} from '../utils/steadfastLogic';
import { compressImageFile } from '../utils/photoStore';
import { WeeklySummaryModal } from './WeeklySummaryModal';
import { MilestoneBadges } from './MilestoneBadges';

interface ProgressViewProps {
  todayKey: string;
  checkins: AccountabilityCheckin[];
  photoMap: Record<string, string>;
  metrics: StreakMetrics;
  onSaveCheckin: (
    payload: {
      dateKey: string;
      status: CheckinStatus;
      reflection: string;
      photoCaption: string;
      urgesResisted: number;
      hasLocalPhoto: boolean;
      seedPhotoUrl?: string;
    },
    photoDataUrl?: string | null
  ) => Promise<void>;
  onDeleteCheckin: (dateKey: string) => Promise<void>;
}

const STATUS_OPTIONS: Array<{ value: CheckinStatus; label: string; hint: string }> = [
  { value: 'steadfast', label: 'Steadfast', hint: 'Walked in purity and focus today' },
  { value: 'overcame', label: 'Tested & Overcame', hint: 'Faced urges and chose the way of escape' },
  { value: 'grace', label: 'Reset in Grace', hint: 'Stumbled, brought it into the light, starting fresh' },
];

const STATUS_LABELS: Record<CheckinStatus, string> = {
  steadfast: 'Steadfast',
  overcame: 'Tested & Overcame',
  grace: 'Reset in Grace',
};

export function ProgressView({
  todayKey,
  checkins,
  photoMap,
  metrics,
  onSaveCheckin,
  onDeleteCheckin,
}: ProgressViewProps) {
  const checkinByDate = useMemo(() => {
    const map = new Map<string, AccountabilityCheckin>();
    checkins.forEach((c) => map.set(c.dateKey, c));
    return map;
  }, [checkins]);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const existingSelected = checkinByDate.get(selectedDate);

  const [status, setStatus] = useState<CheckinStatus>(existingSelected?.status ?? 'steadfast');
  const [reflection, setReflection] = useState(existingSelected?.reflection ?? '');
  const [photoCaption, setPhotoCaption] = useState(existingSelected?.photoCaption ?? '');
  const [urgesResisted, setUrgesResisted] = useState(existingSelected?.urgesResisted ?? 0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(
    photoMap[selectedDate] ?? existingSelected?.seedPhotoUrl ?? null
  );
  const [useSeedUrl, setUseSeedUrl] = useState<string | undefined>(existingSelected?.seedPhotoUrl);
  const [formError, setFormError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [lightboxEntry, setLightboxEntry] = useState<AccountabilityCheckin | null>(null);
  const [weeklySummaryOpen, setWeeklySummaryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const last28Days = useMemo(() => getLastNDaysKeys(28), []);
  const weeklySummary = useMemo(
    () => calculateWeeklySummary(checkins, todayKey),
    [checkins, todayKey]
  );
  const milestoneBadges = useMemo(
    () => calculateMilestoneBadges(metrics),
    [metrics]
  );

  const selectDateForEdit = (dateKey: string) => {
    setSelectedDate(dateKey);
    const found = checkinByDate.get(dateKey);
    setStatus(found?.status ?? 'steadfast');
    setReflection(found?.reflection ?? '');
    setPhotoCaption(found?.photoCaption ?? '');
    setUrgesResisted(found?.urgesResisted ?? 0);
    setPreviewPhoto(photoMap[dateKey] ?? found?.seedPhotoUrl ?? null);
    setUseSeedUrl(found?.seedPhotoUrl);
    setFormError('');
    setSaveNotice('');
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormError('');
    try {
      const compressed = await compressImageFile(file, 960);
      setPreviewPhoto(compressed);
      setUseSeedUrl(undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleAttachSampleMoment = () => {
    setPreviewPhoto(SEED_IMAGE_PATHS.studyDesk);
    setUseSeedUrl(SEED_IMAGE_PATHS.studyDesk);
    if (!photoCaption.trim()) {
      setPhotoCaption('Daily accountability check-in photo');
    }
    setFormError('');
  };

  const handleRemovePhoto = () => {
    setPreviewPhoto(null);
    setUseSeedUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateCheckinInput({
      dateKey: selectedDate,
      status,
      reflection,
      photoCaption,
      urgesResisted,
    });
    if (!validation.valid || !validation.value) {
      setFormError(validation.error || 'Please check your daily check-in details.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const isCustomDataUrl = Boolean(previewPhoto && previewPhoto.startsWith('data:'));
      await onSaveCheckin(
        {
          ...validation.value,
          hasLocalPhoto: Boolean(previewPhoto),
          seedPhotoUrl: useSeedUrl,
        },
        isCustomDataUrl ? previewPhoto : previewPhoto === null ? null : undefined
      );
      setSaveNotice(`Check-in saved for ${formatReadableDate(selectedDate)}.`);
    } finally {
      setSaving(false);
    }
  };

  const sortedGalleryEntries = useMemo(() => {
    return [...checkins].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [checkins]);

  const resolveEntryPhoto = (entry: AccountabilityCheckin): string | null => {
    return photoMap[entry.dateKey] || entry.seedPhotoUrl || null;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Daily Consistency &amp; Visual Accountability
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
            Progress &amp; Accountability
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setWeeklySummaryOpen(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800 text-sm font-medium text-[#172026] dark:text-[#ECF1F4] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
          Weekly Summary
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <section aria-label="Progress summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Current streak</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums" data-testid="current-streak-value">
            {metrics.currentStreak}
            <span className="text-sm font-sans font-normal text-slate-500 ml-1">days</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Longest streak</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {metrics.longestStreak}
            <span className="text-sm font-sans font-normal text-slate-500 ml-1">days</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Urges resisted</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {metrics.totalUrgesResisted}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Accountability photos</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {metrics.totalPhotosLogged}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Daily Photo Check-in Form */}
        <section
          aria-labelledby="daily-checkin-heading"
          className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
        >
          <div>
            <h2 id="daily-checkin-heading" className="font-serif text-xl font-semibold">
              Daily accountability check-in
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add your daily check-in photo and reflection. Photos remain private on your device.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="checkin-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                id="checkin-date"
                type="date"
                value={selectedDate}
                max={todayKey}
                onChange={(e) => selectDateForEdit(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
              />
            </div>

            {/* Visual Accountability Photo Upload */}
            <div className="space-y-2.5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Daily visual accountability photo
              </span>
              <input
                ref={fileInputRef}
                id="accountability-photo-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoUpload}
                className="sr-only"
              />

              {previewPhoto ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                  <img
                    src={previewPhoto}
                    alt="Selected daily accountability check-in preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-950/75 text-white text-xs font-medium hover:bg-slate-950 transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      aria-label="Remove accountability photo"
                      className="min-h-[38px] min-w-[38px] rounded-lg bg-slate-950/75 text-white flex items-center justify-center hover:bg-rose-700 transition-colors"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center space-y-3 bg-slate-50/70 dark:bg-slate-900/40">
                  <Camera className="w-6 h-6 mx-auto text-slate-400" aria-hidden="true" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Snap a quick photo or upload a quiet moment from your day for visual accountability.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#172026] dark:bg-[#ECF1F4] text-white dark:text-[#0B1118] text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Take or upload photo
                    </button>
                    <button
                      type="button"
                      onClick={handleAttachSampleMoment}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      Attach sample photo
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="photo-caption" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Photo caption (optional)
                </label>
                <input
                  id="photo-caption"
                  type="text"
                  value={photoCaption}
                  maxLength={BLUEPRINT_LIMITS.checkinPhotoCaptionMax}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g., Morning walk with clear mind"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
                />
              </div>
            </div>

            {/* Daily Status */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Today’s walk
              </legend>
              {STATUS_OPTIONS.map((option) => {
                const active = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      active
                        ? 'border-[#1B5E53] dark:border-[#4DBAA7] bg-[#1B5E53]/5 dark:bg-[#4DBAA7]/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{option.label}</span>
                      {active && (
                        <Check className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.hint}</p>
                  </button>
                );
              })}
            </fieldset>

            {/* Urges Resisted Stepper */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-medium">Urges paused &amp; resisted</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Moments you chose freedom</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUrgesResisted((n) => Math.max(0, n - 1))}
                  aria-label="Decrease urges resisted"
                  className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums">
                  {urgesResisted}
                </span>
                <button
                  type="button"
                  onClick={() => setUrgesResisted((n) => Math.min(100, n + 1))}
                  aria-label="Increase urges resisted"
                  className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="checkin-reflection" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Daily reflection
              </label>
              <textarea
                id="checkin-reflection"
                rows={3}
                value={reflection}
                maxLength={BLUEPRINT_LIMITS.checkinReflectionMax}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What helped you stay focused today? Any trigger to prepare for tomorrow?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {formError}
              </p>
            )}
            {saveNotice && (
              <p role="status" className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                {saveNotice}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving check-in...' : 'Save daily check-in'}
            </button>
          </form>
        </section>

        {/* Calendar, Milestones, & Visual Accountability Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* 28-Day Consistency Grid */}
          <section
            aria-labelledby="calendar-heading"
            className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="calendar-heading" className="font-serif text-xl font-semibold">
                28-day focus log
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span>Solid: Steadfast</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span>Outline: Grace reset</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {last28Days.map((key) => {
                const entry = checkinByDate.get(key);
                const { weekday, dayNum } = formatShortWeekday(key);
                const isSelected = key === selectedDate;
                const isClean = entry && (entry.status === 'steadfast' || entry.status === 'overcame');
                const isGrace = entry && entry.status === 'grace';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDateForEdit(key)}
                    aria-label={`Select ${formatReadableDate(key)}${entry ? `, ${STATUS_LABELS[entry.status]}` : ', no check-in'}`}
                    aria-pressed={isSelected}
                    className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs transition-all ${
                      isClean
                        ? 'bg-[#1B5E53] text-white dark:bg-[#3DA694] dark:text-[#0B1118] font-semibold'
                        : isGrace
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-400/70 text-amber-900 dark:text-amber-300 font-medium'
                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${isSelected ? 'ring-2 ring-offset-2 ring-[#172026] dark:ring-white dark:ring-offset-[#121A24]' : ''}`}
                  >
                    <span className="text-[10px] opacity-75">{weekday}</span>
                    <span className="font-mono tabular-nums">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Milestone Badges (7-day, 30-day, 100-day streaks) */}
          <MilestoneBadges badges={milestoneBadges} />

          {/* Visual Accountability Photo Timeline */}
          <section aria-labelledby="gallery-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="gallery-heading" className="font-serif text-xl font-semibold">
                Visual accountability timeline
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {sortedGalleryEntries.length} logged days
              </span>
            </div>

            {sortedGalleryEntries.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your daily accountability timeline will appear here as you log check-ins and photos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                {sortedGalleryEntries.map((entry) => {
                  const photoSrc = resolveEntryPhoto(entry);
                  return (
                    <article
                      key={entry.dateKey}
                      className="rounded-2xl overflow-hidden bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 flex flex-col"
                    >
                      {photoSrc ? (
                        <button
                          type="button"
                          onClick={() => setLightboxEntry(entry)}
                          aria-label={`View accountability photo from ${formatReadableDate(entry.dateKey)}`}
                          className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 text-left group"
                        >
                          <img
                            src={photoSrc}
                            alt={entry.photoCaption || `Accountability check-in photo for ${formatReadableDate(entry.dateKey)}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3.5 text-white">
                            <p className="text-xs font-mono tabular-nums opacity-90">
                              {formatReadableDate(entry.dateKey)}
                            </p>
                            <p className="text-xs font-medium truncate">
                              {STATUS_LABELS[entry.status]}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="px-5 pt-5 pb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono tabular-nums">{formatReadableDate(entry.dateKey)}</span>
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                            Text check-in
                          </span>
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          {!photoSrc && (
                            <p className="text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7]">
                              {STATUS_LABELS[entry.status]}
                            </p>
                          )}
                          {entry.photoCaption && (
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {entry.photoCaption}
                            </p>
                          )}
                          {entry.reflection && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                              {entry.reflection}
                            </p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="tabular-nums">
                            {entry.urgesResisted} {entry.urgesResisted === 1 ? 'urge' : 'urges'} resisted
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => selectDateForEdit(entry.dateKey)}
                              className="text-[#1B5E53] dark:text-[#4DBAA7] font-medium hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteCheckin(entry.dateKey)}
                              aria-label={`Delete check-in for ${formatReadableDate(entry.dateKey)}`}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <div className="max-w-2xl w-full rounded-3xl overflow-hidden bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800">
            <div className="relative aspect-[4/3] bg-slate-900">
              {resolveEntryPhoto(lightboxEntry) && (
                <img
                  src={resolveEntryPhoto(lightboxEntry)!}
                  alt={lightboxEntry.photoCaption || 'Daily accountability photo'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setLightboxEntry(null)}
                aria-label="Close photo preview"
                className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-xl bg-slate-950/70 text-white flex items-center justify-center hover:bg-slate-950"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatReadableDate(lightboxEntry.dateKey)} · {STATUS_LABELS[lightboxEntry.status]} ·{' '}
                {lightboxEntry.urgesResisted} urges resisted
              </p>
              <h3 id="lightbox-title" className="font-serif text-xl font-semibold">
                {lightboxEntry.photoCaption || 'Daily accountability check-in'}
              </h3>
              {lightboxEntry.reflection && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lightboxEntry.reflection}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary Modal */}
      <WeeklySummaryModal
        open={weeklySummaryOpen}
        summary={weeklySummary}
        onClose={() => setWeeklySummaryOpen(false)}
      />
    </div>
  );
}
