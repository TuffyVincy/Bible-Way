import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Pencil, Search, Trash2 } from 'lucide-react';
import type { DailyVerse, PrayerCategory, PrayerEntry } from '../types/steadfast';
import {
  BLUEPRINT_LIMITS,
  filterPrayers,
  PRAYER_CATEGORIES,
  validatePrayerInput,
} from '../utils/steadfastLogic';

interface JournalViewProps {
  prayers: PrayerEntry[];
  prefillVerse?: DailyVerse | null;
  onClearPrefill: () => void;
  onCreatePrayer: (input: {
    title: string;
    body: string;
    category: PrayerCategory;
    verseRef: string;
  }) => Promise<void>;
  onUpdatePrayer: (
    id: string,
    input: { title: string; body: string; category: PrayerCategory; verseRef: string }
  ) => Promise<void>;
  onToggleAnswered: (id: string, answered: boolean) => Promise<void>;
  onDeletePrayer: (id: string) => Promise<void>;
}

const FILTER_TABS: Array<PrayerCategory | 'All' | 'Answered'> = [
  'All',
  ...PRAYER_CATEGORIES,
  'Answered',
];

export function JournalView({
  prayers,
  prefillVerse,
  onClearPrefill,
  onCreatePrayer,
  onUpdatePrayer,
  onToggleAnswered,
  onDeletePrayer,
}: JournalViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('Strength');
  const [verseRef, setVerseRef] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [filterCategory, setFilterCategory] = useState<PrayerCategory | 'All' | 'Answered'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (prefillVerse) {
      setEditingId(null);
      setTitle(`Prayer on ${prefillVerse.reference}`);
      setVerseRef(prefillVerse.reference);
      setBody(prefillVerse.shortPrayer);
      setCategory('Strength');
      setFormError('');
      onClearPrefill();
    }
  }, [prefillVerse, onClearPrefill]);

  const filteredPrayers = useMemo(
    () => filterPrayers(prayers, filterCategory, searchQuery),
    [prayers, filterCategory, searchQuery]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('Strength');
    setVerseRef('');
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = validatePrayerInput({ title, body, category, verseRef });
    if (!check.valid || !check.value) {
      setFormError(check.error || 'Please review your prayer entry.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await onUpdatePrayer(editingId, check.value);
      } else {
        await onCreatePrayer(check.value);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry: PrayerEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setCategory(entry.category);
    setVerseRef(entry.verseRef);
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Private Reflection · {prayers.length} {prayers.length === 1 ? 'entry' : 'entries'}
        </p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
          Prayer Journal
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Composer Column */}
        <section
          aria-labelledby="prayer-composer-heading"
          className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6"
        >
          <div className="flex items-center justify-between gap-2 mb-5">
            <h2 id="prayer-composer-heading" className="font-serif text-xl font-semibold">
              {editingId ? 'Edit prayer entry' : 'Write a prayer'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="prayer-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Title
              </label>
              <input
                id="prayer-title"
                type="text"
                value={title}
                maxLength={BLUEPRINT_LIMITS.prayerTitleMax}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Strength for tonight"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Focus
              </span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Prayer category">
                {PRAYER_CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCategory(cat)}
                      className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        selected
                          ? 'bg-[#1B5E53] text-white dark:bg-[#3DA694] dark:text-[#0B1118]'
                          : 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="prayer-verse" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Scripture reference (optional)
              </label>
              <input
                id="prayer-verse"
                type="text"
                value={verseRef}
                maxLength={BLUEPRINT_LIMITS.prayerVerseRefMax}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="e.g., 1 Corinthians 10:13"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="prayer-body" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Prayer &amp; reflection
                </label>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {body.length}/{BLUEPRINT_LIMITS.prayerBodyMax}
                </span>
              </div>
              <textarea
                id="prayer-body"
                rows={5}
                value={body}
                maxLength={BLUEPRINT_LIMITS.prayerBodyMax}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write honestly before God about your triggers, gratitude, or commitment today..."
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update prayer' : 'Save prayer'}
            </button>
          </form>
        </section>

        {/* Entries List Column */}
        <section aria-label="Saved prayers" className="lg:col-span-7 space-y-5">
          {/* Search and Filter Controls */}
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="journal-search" className="sr-only">
                Search prayer entries
              </label>
              <input
                id="journal-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prayers or scripture references..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter prayers">
              {FILTER_TABS.map((tab) => {
                const active = filterCategory === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterCategory(tab)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#172026] text-white dark:bg-[#ECF1F4] dark:text-[#0B1118]'
                        : 'bg-white dark:bg-[#121A24] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prayer Cards */}
          {filteredPrayers.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-10 text-center space-y-2">
              <p className="font-serif text-lg font-medium">No matching prayers found</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try clearing your filter or write a new prayer in the composer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrayers.map((entry) => {
                const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                            {entry.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formattedDate}</span>
                          {entry.verseRef && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{entry.verseRef}</span>
                            </>
                          )}
                          {entry.answered && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                Answered
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug">
                          {entry.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onToggleAnswered(entry.id, !entry.answered)}
                          aria-label={
                            entry.answered
                              ? `Unmark '${entry.title}' as answered`
                              : `Mark '${entry.title}' as answered`
                          }
                          className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:text-[#1B5E53] dark:hover:text-[#4DBAA7] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {entry.answered ? (
                            <CheckCircle2 className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
                          ) : (
                            <Circle className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          aria-label={`Edit '${entry.title}'`}
                          className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeletePrayer(entry.id)}
                          aria-label={`Delete '${entry.title}'`}
                          className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {entry.body}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
