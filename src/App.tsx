import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  Feather,
  Settings,
  X,
} from 'lucide-react';
import type {
  AccountabilityCheckin,
  CheckinStatus,
  DailyVerse,
  PrayerCategory,
  PrayerEntry,
  TabId,
  UserSettings,
} from './types/steadfast';
import {
  calculateStreakMetrics,
  getDailyVerseForDate,
  toDateKey,
} from './utils/steadfastLogic';
import {
  deleteLocalPhoto,
  getAllLocalPhotos,
  saveLocalPhoto,
} from './utils/photoStore';
import {
  auth,
  signInWithGoogle,
  signOutAccount,
} from './services/firebase';
import {
  createCloudPrayer,
  deleteCloudCheckin,
  deleteCloudPrayer,
  ensureUserProfileDoc,
  loadLocalState,
  saveLocalState,
  subscribeToCloudData,
  syncAppearanceSettings,
  syncBookmarks,
  syncPasscodeSettings,
  syncReminderSettings,
  toggleCloudPrayerAnswered,
  updateCloudPrayerContent,
  upsertCloudCheckin,
} from './services/syncRepository';
import { TodayView } from './components/TodayView';
import { JournalView } from './components/JournalView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { GuardHeartModal } from './components/GuardHeartModal';
import { PasscodeLockScreen } from './components/PasscodeLockScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallModal } from './components/PWAInstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'today', label: 'Today', icon: BookOpen },
  { id: 'journal', label: 'Journal', icon: Feather },
  { id: 'progress', label: 'Progress', icon: CalendarCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const initialLocal = useMemo(() => loadLocalState(), []);
  const todayKey = useMemo(() => toDateKey(), []);

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [settings, setSettings] = useState<UserSettings>(initialLocal.settings);
  const [prayers, setPrayers] = useState<PrayerEntry[]>(initialLocal.prayers);
  const [checkins, setCheckins] = useState<AccountabilityCheckin[]>(initialLocal.checkins);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  const [prefillVerse, setPrefillVerse] = useState<DailyVerse | null>(null);
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const pwaInstall = usePWAInstall();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');

  const [reminderBanner, setReminderBanner] = useState<{ title: string; body: string } | null>(null);
  const lastFiredReminderRef = useRef<string>('');

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    if (!initialLocal.settings.passcodeEnabled || !initialLocal.settings.passcodeHash) {
      return false;
    }
    return sessionStorage.getItem('steadfast_unlocked') !== '1';
  });

  // Load persisted on-device accountability photos from IndexedDB
  useEffect(() => {
    let active = true;
    void getAllLocalPhotos().then((loaded) => {
      if (active) setPhotoMap(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const isDark = settings.themeMode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('steadfast_theme', settings.themeMode);
    } catch {
      // Ignore
    }
  }, [settings.themeMode]);

  // Persist state locally on change
  useEffect(() => {
    saveLocalState(settings, prayers, checkins);
  }, [settings, prayers, checkins]);

  // Firebase Auth & Real-Time Firestore Subscription
  useEffect(() => {
    let unsubCloud: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCloudError('');

      if (unsubCloud) {
        unsubCloud();
        unsubCloud = null;
      }

      if (firebaseUser) {
        void ensureUserProfileDoc(firebaseUser, settings)
          .then(() => {
            unsubCloud = subscribeToCloudData(firebaseUser, {
              onSettings: (cloudPatch) => {
                setSettings((prev) => ({ ...prev, ...cloudPatch }));
              },
              onPrayers: (cloudPrayers) => {
                if (cloudPrayers.length > 0) {
                  setPrayers(cloudPrayers);
                }
              },
              onCheckins: (cloudCheckins) => {
                if (cloudCheckins.length > 0) {
                  setCheckins(cloudCheckins);
                }
              },
              onError: (msg) => {
                setCloudError(msg);
              },
            });
          })
          .catch(() => {
            setCloudError('Cloud sync could not initialize. Your local data remains safe.');
          });
      }
    });

    return () => {
      unsubAuth();
      if (unsubCloud) unsubCloud();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle daily reminder delivery (browser Notification + discreet in-app banner)
  const triggerReminderNotification = useCallback(
    (title: string, body: string) => {
      setReminderBanner({ title, body });
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Fallback banner already shown
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!settings.reminderEnabled) return;
    const checkSchedule = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const stamp = `${toDateKey(now)}-${hhmm}`;
      if (lastFiredReminderRef.current === stamp) return;

      const verse = getDailyVerseForDate(toDateKey(now));
      if (hhmm === settings.morningReminderTime) {
        lastFiredReminderRef.current = stamp;
        triggerReminderNotification(
          `Morning Verse · ${verse.reference}`,
          'Begin the day anchored in Scripture and a quiet prayer.'
        );
      } else if (hhmm === settings.eveningReminderTime) {
        lastFiredReminderRef.current = stamp;
        triggerReminderNotification(
          'Evening Night-Watch Check-in',
          'Step away from screens, log today’s reflection, and rest in peace.'
        );
      }
    };

    const intervalId = window.setInterval(checkSchedule, 30000);
    return () => window.clearInterval(intervalId);
  }, [
    settings.reminderEnabled,
    settings.morningReminderTime,
    settings.eveningReminderTime,
    triggerReminderNotification,
  ]);

  const metrics = useMemo(
    () => calculateStreakMetrics(checkins, todayKey),
    [checkins, todayKey]
  );

  const todayCheckin = useMemo(
    () => checkins.find((c) => c.dateKey === todayKey),
    [checkins, todayKey]
  );

  const sortedPrayers = useMemo(
    () => [...prayers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [prayers]
  );

  // Handlers
  const handleUpdateAppearance = async (patch: {
    themeMode?: 'light' | 'dark';
    nightReadingWarmth?: boolean;
  }) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (user) {
      await syncAppearanceSettings(user, patch);
    }
  };

  const handleToggleTheme = () => {
    void handleUpdateAppearance({
      themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
    });
  };

  const handleToggleBookmark = async (verseId: string) => {
    const exists = settings.bookmarkedVerseIds.includes(verseId);
    const nextIds = exists
      ? settings.bookmarkedVerseIds.filter((id) => id !== verseId)
      : [...settings.bookmarkedVerseIds, verseId].slice(0, 100);
    setSettings((prev) => ({ ...prev, bookmarkedVerseIds: nextIds }));
    if (user) {
      await syncBookmarks(user, nextIds);
    }
  };

  const handlePrayVerse = (verse: DailyVerse) => {
    setPrefillVerse(verse);
    setActiveTab('journal');
  };

  const handleCreatePrayer = async (input: {
    title: string;
    body: string;
    category: PrayerCategory;
    verseRef: string;
  }) => {
    const nowIso = new Date().toISOString();
    const id = `prayer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry: PrayerEntry = {
      id,
      ownerId: user?.uid || 'local',
      title: input.title,
      body: input.body,
      category: input.category,
      verseRef: input.verseRef,
      answered: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setPrayers((prev) => [entry, ...prev]);
    if (user) {
      await createCloudPrayer(user, entry);
    }
  };

  const handleUpdatePrayer = async (
    id: string,
    input: { title: string; body: string; category: PrayerCategory; verseRef: string }
  ) => {
    const nowIso = new Date().toISOString();
    setPrayers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...input, updatedAt: nowIso } : item
      )
    );
    if (user) {
      await updateCloudPrayerContent(user, id, input);
    }
  };

  const handleToggleAnswered = async (id: string, answered: boolean) => {
    const nowIso = new Date().toISOString();
    setPrayers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, answered, updatedAt: nowIso } : item
      )
    );
    if (user) {
      await toggleCloudPrayerAnswered(user, id, answered);
    }
  };

  const handleDeletePrayer = async (id: string) => {
    setPrayers((prev) => prev.filter((item) => item.id !== id));
    if (user) {
      await deleteCloudPrayer(user, id);
    }
  };

  const handleSaveCheckin = async (
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
  ) => {
    const nowIso = new Date().toISOString();
    const existing = checkins.find((c) => c.dateKey === payload.dateKey);
    const updatedEntry: AccountabilityCheckin = {
      id: payload.dateKey,
      ownerId: user?.uid || 'local',
      dateKey: payload.dateKey,
      status: payload.status,
      reflection: payload.reflection,
      hasLocalPhoto: payload.hasLocalPhoto,
      photoCaption: payload.photoCaption,
      urgesResisted: payload.urgesResisted,
      seedPhotoUrl: payload.seedPhotoUrl,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (typeof photoDataUrl === 'string') {
      await saveLocalPhoto(payload.dateKey, photoDataUrl);
      setPhotoMap((prev) => ({ ...prev, [payload.dateKey]: photoDataUrl }));
    } else if (photoDataUrl === null) {
      await deleteLocalPhoto(payload.dateKey);
      setPhotoMap((prev) => {
        const copy = { ...prev };
        delete copy[payload.dateKey];
        return copy;
      });
    }

    setCheckins((prev) => {
      const others = prev.filter((c) => c.dateKey !== payload.dateKey);
      return [updatedEntry, ...others];
    });

    if (user) {
      await upsertCloudCheckin(user, updatedEntry);
    }
  };

  const handleDeleteCheckin = async (dateKey: string) => {
    setCheckins((prev) => prev.filter((c) => c.dateKey !== dateKey));
    await deleteLocalPhoto(dateKey);
    setPhotoMap((prev) => {
      const copy = { ...prev };
      delete copy[dateKey];
      return copy;
    });
    if (user) {
      await deleteCloudCheckin(user, dateKey);
    }
  };

  const handleLogUrgeResisted = () => {
    const existing = checkins.find((c) => c.dateKey === todayKey);
    void handleSaveCheckin({
      dateKey: todayKey,
      status: existing?.status === 'grace' ? 'overcame' : existing?.status || 'overcame',
      reflection:
        existing?.reflection ||
        'Paused, breathed, and chose Scripture over temptation.',
      photoCaption: existing?.photoCaption || '',
      urgesResisted: Math.min(100, (existing?.urgesResisted || 0) + 1),
      hasLocalPhoto: existing?.hasLocalPhoto || false,
      seedPhotoUrl: existing?.seedPhotoUrl,
    });
  };

  const handleUpdatePasscode = async (payload: {
    passcodeEnabled: boolean;
    passcodeHash: string;
    passcodeSalt: string;
  }) => {
    setSettings((prev) => ({ ...prev, ...payload }));
    if (payload.passcodeEnabled) {
      sessionStorage.setItem('steadfast_unlocked', '1');
    } else {
      sessionStorage.removeItem('steadfast_unlocked');
      setIsLocked(false);
    }
    if (user) {
      await syncPasscodeSettings(user, payload);
    }
  };

  const handleLockNow = () => {
    if (!settings.passcodeEnabled || !settings.passcodeHash) return;
    sessionStorage.removeItem('steadfast_unlocked');
    setIsLocked(true);
  };

  const handleUnlock = () => {
    sessionStorage.setItem('steadfast_unlocked', '1');
    setIsLocked(false);
  };

  const handleUpdateReminders = async (payload: {
    reminderEnabled: boolean;
    morningReminderTime: string;
    eveningReminderTime: string;
  }) => {
    setSettings((prev) => ({ ...prev, ...payload }));
    if (user) {
      await syncReminderSettings(user, payload);
    }
  };

  const handleTriggerTestReminder = () => {
    const verse = getDailyVerseForDate(todayKey);
    triggerReminderNotification(
      `Gentle Reminder · ${verse.reference}`,
      'Take one quiet minute to guard your heart and review today’s verse.'
    );
  };

  const handleSignInGoogle = async () => {
    setAuthLoading(true);
    setCloudError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Sign-in was canceled or blocked by popup settings.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAccount();
  };

  const handleSyncLocalToCloud = async () => {
    if (!user) return;
    await ensureUserProfileDoc(user, settings);
    await syncAppearanceSettings(user, {
      displayName: settings.displayName,
      themeMode: settings.themeMode,
      nightReadingWarmth: settings.nightReadingWarmth,
    });
    await syncBookmarks(user, settings.bookmarkedVerseIds);
    await syncReminderSettings(user, {
      reminderEnabled: settings.reminderEnabled,
      morningReminderTime: settings.morningReminderTime,
      eveningReminderTime: settings.eveningReminderTime,
    });
    for (const prayer of prayers) {
      await createCloudPrayer(user, prayer);
    }
    for (const checkin of checkins) {
      await upsertCloudCheckin(user, checkin);
    }
  };

  const handleExportBackup = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      app: 'Steadfast',
      settings: {
        themeMode: settings.themeMode,
        nightReadingWarmth: settings.nightReadingWarmth,
        reminderEnabled: settings.reminderEnabled,
        morningReminderTime: settings.morningReminderTime,
        eveningReminderTime: settings.eveningReminderTime,
        bookmarkedVerseIds: settings.bookmarkedVerseIds,
      },
      prayers,
      checkins,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `steadfast-backup-${todayKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] text-[#172026] dark:bg-[#0B1118] dark:text-[#ECF1F4] transition-colors duration-200">
      {/* Passcode Lock Fullscreen Overlay */}
      {isLocked && settings.passcodeEnabled && settings.passcodeHash && (
        <PasscodeLockScreen
          passcodeHash={settings.passcodeHash}
          passcodeSalt={settings.passcodeSalt}
          onUnlock={handleUnlock}
        />
      )}

      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-14 md:h-16 bg-white/90 dark:bg-[#0E1620]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-serif text-xl font-semibold tracking-tight text-[#172026] dark:text-[#ECF1F4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] rounded-md"
          >
            Steadfast
          </button>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#1B5E53] dark:text-[#4DBAA7]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#172026] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#1B5E53] dark:bg-[#4DBAA7]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setGuardModalOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Guard Heart
            </button>
          </div>
        </div>
      </header>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Gentle Reminder In-App Notification Banner (only when triggered) */}
      {reminderBanner && (
        <div
          role="status"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-4"
        >
          <div className="rounded-2xl bg-white dark:bg-[#121A24] border border-[#1B5E53]/30 dark:border-[#4DBAA7]/40 px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Bell className="w-4 h-4 text-[#1B5E53] dark:text-[#4DBAA7] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{reminderBanner.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{reminderBanner.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReminderBanner(null)}
              aria-label="Dismiss reminder"
              className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-14">
        {activeTab === 'today' && (
          <TodayView
            todayKey={todayKey}
            bookmarkedVerseIds={settings.bookmarkedVerseIds}
            onToggleBookmark={(id) => void handleToggleBookmark(id)}
            onPrayVerse={handlePrayVerse}
            onOpenGuardHeart={() => setGuardModalOpen(true)}
            onNavigateTab={setActiveTab}
            metrics={metrics}
            todayCheckin={todayCheckin}
            recentPrayers={sortedPrayers}
            themeMode={settings.themeMode}
            nightReadingWarmth={settings.nightReadingWarmth}
            onToggleTheme={handleToggleTheme}
            passcodeEnabled={settings.passcodeEnabled}
            onLockNow={handleLockNow}
            isAppInstalled={pwaInstall.isInstalled}
            onOpenInstallGuide={() => setInstallModalOpen(true)}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            prayers={sortedPrayers}
            prefillVerse={prefillVerse}
            onClearPrefill={() => setPrefillVerse(null)}
            onCreatePrayer={handleCreatePrayer}
            onUpdatePrayer={handleUpdatePrayer}
            onToggleAnswered={handleToggleAnswered}
            onDeletePrayer={handleDeletePrayer}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView
            todayKey={todayKey}
            checkins={checkins}
            photoMap={photoMap}
            metrics={metrics}
            onSaveCheckin={handleSaveCheckin}
            onDeleteCheckin={handleDeleteCheckin}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            user={user}
            authLoading={authLoading}
            cloudError={cloudError}
            onUpdateAppearance={handleUpdateAppearance}
            onUpdatePasscode={handleUpdatePasscode}
            onLockNow={handleLockNow}
            onUpdateReminders={handleUpdateReminders}
            onTriggerTestReminder={handleTriggerTestReminder}
            onSignInGoogle={handleSignInGoogle}
            onSignOut={handleSignOut}
            onSyncLocalToCloud={handleSyncLocalToCloud}
            onExportBackup={handleExportBackup}
            isAppInstalled={pwaInstall.isInstalled}
            isAppInstallable={pwaInstall.isInstallable}
            onInstallAppDirect={pwaInstall.install}
            onOpenInstallGuide={() => setInstallModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Anchor) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E1620]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-[#1B5E53] dark:text-[#4DBAA7]'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Temptation SOS Pause & Pray Modal */}
      <GuardHeartModal
        open={guardModalOpen}
        onClose={() => setGuardModalOpen(false)}
        onLogUrgeResisted={handleLogUrgeResisted}
        nightReadingWarmth={settings.nightReadingWarmth}
      />

      {/* PWA Install Instructions & Direct Prompt Modal */}
      <PWAInstallModal
        open={installModalOpen}
        isInstallable={pwaInstall.isInstallable}
        isIOS={pwaInstall.isIOS}
        isAndroid={pwaInstall.isAndroid}
        onInstallPrompt={pwaInstall.install}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
}
