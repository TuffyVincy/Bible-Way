import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  Cloud,
  Download,
  Lock,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react';
import type { UserSettings } from '../types/steadfast';
import { generateSalt, hashPinWithSalt, isValidPin } from '../utils/steadfastLogic';

interface SettingsViewProps {
  settings: UserSettings;
  user: User | null;
  authLoading: boolean;
  cloudError: string;
  onUpdateAppearance: (patch: {
    themeMode?: 'light' | 'dark';
    nightReadingWarmth?: boolean;
  }) => Promise<void>;
  onUpdatePasscode: (payload: {
    passcodeEnabled: boolean;
    passcodeHash: string;
    passcodeSalt: string;
  }) => Promise<void>;
  onLockNow: () => void;
  onUpdateReminders: (payload: {
    reminderEnabled: boolean;
    morningReminderTime: string;
    eveningReminderTime: string;
  }) => Promise<void>;
  onTriggerTestReminder: () => void;
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncLocalToCloud: () => Promise<void>;
  onExportBackup: () => void;
  isAppInstalled: boolean;
  isAppInstallable: boolean;
  onInstallAppDirect: () => Promise<boolean>;
  onOpenInstallGuide: () => void;
}

export function SettingsView({
  settings,
  user,
  authLoading,
  cloudError,
  onUpdateAppearance,
  onUpdatePasscode,
  onLockNow,
  onUpdateReminders,
  onTriggerTestReminder,
  onSignInGoogle,
  onSignOut,
  onSyncLocalToCloud,
  onExportBackup,
  isAppInstalled,
  isAppInstallable,
  onInstallAppDirect,
  onOpenInstallGuide,
}: SettingsViewProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinNotice, setPinNotice] = useState('');

  const [morningTime, setMorningTime] = useState(settings.morningReminderTime);
  const [eveningTime, setEveningTime] = useState(settings.eveningReminderTime);
  const [reminderNotice, setReminderNotice] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [syncingNow, setSyncingNow] = useState(false);

  const notificationPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const handleSavePasscode = async (event: React.FormEvent) => {
    event.preventDefault();
    setPinError('');
    setPinNotice('');

    if (!isValidPin(newPin)) {
      setPinError('Passcode must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Passcodes do not match. Please enter both again.');
      return;
    }

    const salt = generateSalt();
    const hash = await hashPinWithSalt(newPin, salt);
    await onUpdatePasscode({
      passcodeEnabled: true,
      passcodeHash: hash,
      passcodeSalt: salt,
    });
    setNewPin('');
    setConfirmPin('');
    setPinNotice('Privacy passcode enabled. You can lock the app anytime.');
  };

  const handleDisablePasscode = async () => {
    setPinError('');
    await onUpdatePasscode({
      passcodeEnabled: false,
      passcodeHash: '',
      passcodeSalt: '',
    });
    setPinNotice('Privacy passcode turned off.');
  };

  const handleSaveReminderSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    await onUpdateReminders({
      reminderEnabled: settings.reminderEnabled,
      morningReminderTime: morningTime,
      eveningReminderTime: eveningTime,
    });
    setReminderNotice('Daily reminder times updated.');
  };

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setReminderNotice('Browser notifications are unavailable here; gentle in-app reminders will appear instead.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setReminderNotice('Push reminders enabled in your browser.');
      onTriggerTestReminder();
    } else {
      setReminderNotice('Browser alerts were blocked. Gentle in-app reminders will still appear.');
    }
  };

  const handleManualCloudSync = async () => {
    setSyncingNow(true);
    setSyncNotice('');
    try {
      await onSyncLocalToCloud();
      setSyncNotice('Local prayers and check-ins backed up to Firebase Cloud.');
    } catch {
      setSyncNotice('Cloud backup encountered an error. Please try again.');
    } finally {
      setSyncingNow(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Privacy, Reading Comfort &amp; Cloud Backup
        </p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 0. Install on Your Phone (PWA) */}
        <section
          aria-labelledby="install-phone-heading"
          className="lg:col-span-2 rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#1B5E53]/10 dark:bg-[#3DA694]/15 flex items-center justify-center text-[#1B5E53] dark:text-[#4DBAA7] shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="install-phone-heading" className="font-serif text-xl font-semibold">
                Install on your phone
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                {isAppInstalled
                  ? 'Steadfast is running as an installed app on this device with offline scripture and journal access.'
                  : 'Add Steadfast to your iPhone or Android home screen for full-screen mobile use, quick passcode privacy, and offline access.'}
              </p>
            </div>
          </div>

          {isAppInstalled ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B5E53] dark:text-[#4DBAA7] shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Installed on device
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isAppInstallable && (
                <button
                  type="button"
                  onClick={() => void onInstallAppDirect()}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Install now
                </button>
              )}
              <button
                type="button"
                onClick={onOpenInstallGuide}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {isAppInstallable ? 'Phone setup steps' : 'Install on iPhone / Android'}
              </button>
            </div>
          )}
        </section>

        {/* 1. Nighttime Reading & Dark Mode */}
        <section
          aria-labelledby="appearance-heading"
          className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="appearance-heading" className="font-serif text-xl font-semibold">
                Nighttime reading &amp; theme
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Low-glare dark mode designed for quiet evening scripture reading.
              </p>
            </div>
            {settings.themeMode === 'dark' ? (
              <Moon className="w-5 h-5 text-[#4DBAA7]" aria-hidden="true" />
            ) : (
              <Sun className="w-5 h-5 text-[#1B5E53]" aria-hidden="true" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Color theme">
            <button
              type="button"
              role="radio"
              aria-checked={settings.themeMode === 'light'}
              onClick={() => void onUpdateAppearance({ themeMode: 'light' })}
              className={`min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                settings.themeMode === 'light'
                  ? 'border-[#1B5E53] bg-[#1B5E53]/8 text-[#1B5E53]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Daylight
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={settings.themeMode === 'dark'}
              onClick={() => void onUpdateAppearance({ themeMode: 'dark' })}
              className={`min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                settings.themeMode === 'dark'
                  ? 'border-[#4DBAA7] bg-[#4DBAA7]/12 text-[#4DBAA7]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Night Dark
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium">Warm night scripture tint</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Softens dark scripture cards with warm charcoal ink for late-night reading.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.nightReadingWarmth}
              aria-label="Toggle warm night scripture tint"
              onClick={() =>
                void onUpdateAppearance({ nightReadingWarmth: !settings.nightReadingWarmth })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                settings.nightReadingWarmth
                  ? 'bg-[#1B5E53] dark:bg-[#3DA694]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.nightReadingWarmth ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 2. Privacy Passcode Lock */}
        <section
          aria-labelledby="passcode-heading"
          className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="passcode-heading" className="font-serif text-xl font-semibold">
                Privacy passcode lock
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Status: {settings.passcodeEnabled ? 'Active (4-digit PIN)' : 'Off'}
              </p>
            </div>
            <Lock className="w-5 h-5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
          </div>

          <form onSubmit={handleSavePasscode} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pin-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {settings.passcodeEnabled ? 'New 4-digit PIN' : '4-digit PIN'}
                </label>
                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 font-mono text-base tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
                />
              </div>
              <div>
                <label htmlFor="pin-confirm" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm PIN
                </label>
                <input
                  id="pin-confirm"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 font-mono text-base tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
                />
              </div>
            </div>

            {pinError && (
              <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {pinError}
              </p>
            )}
            {pinNotice && (
              <p role="status" className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                {pinNotice}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                {settings.passcodeEnabled ? 'Update passcode' : 'Enable passcode'}
              </button>

              {settings.passcodeEnabled && (
                <>
                  <button
                    type="button"
                    onClick={onLockNow}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Lock now
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDisablePasscode()}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap"
                  >
                    Turn off
                  </button>
                </>
              )}
            </div>
          </form>
        </section>

        {/* 3. Gentle Daily Reminders */}
        <section
          aria-labelledby="reminders-heading"
          className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="reminders-heading" className="font-serif text-xl font-semibold">
                Gentle daily reminders
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Discreet morning scripture and evening night-watch nudges.
              </p>
            </div>
            <Bell className="w-5 h-5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Enable daily reminders</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browser alerts: {notificationPermission === 'granted' ? 'Allowed' : notificationPermission === 'denied' ? 'Blocked (in-app fallback)' : 'Not requested yet'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reminderEnabled}
              aria-label="Toggle daily reminders"
              onClick={() =>
                void onUpdateReminders({
                  reminderEnabled: !settings.reminderEnabled,
                  morningReminderTime: morningTime,
                  eveningReminderTime: eveningTime,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                settings.reminderEnabled
                  ? 'bg-[#1B5E53] dark:bg-[#3DA694]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <form onSubmit={handleSaveReminderSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="morning-time" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Morning verse
                </label>
                <input
                  id="morning-time"
                  type="time"
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="evening-time" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Evening guard
                </label>
                <input
                  id="evening-time"
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            {reminderNotice && (
              <p role="status" className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                {reminderNotice}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#172026] dark:bg-[#ECF1F4] text-white dark:text-[#0B1118] text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Save schedule
              </button>
              <button
                type="button"
                onClick={() => void handleRequestNotifications()}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Allow push alerts
              </button>
              <button
                type="button"
                onClick={onTriggerTestReminder}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7] hover:bg-[#1B5E53]/5 dark:hover:bg-[#4DBAA7]/10 transition-colors whitespace-nowrap"
              >
                Send test reminder
              </button>
            </div>
          </form>
        </section>

        {/* 4. Secure Cloud Sync & Backup */}
        <section
          aria-labelledby="cloud-sync-heading"
          className="rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200/80 dark:border-slate-800 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="cloud-sync-heading" className="font-serif text-xl font-semibold">
                Secure cloud sync &amp; backup
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Private Firebase sync for prayers, streaks, and settings. Photos stay private on-device.
              </p>
            </div>
            <Cloud className="w-5 h-5 text-[#1B5E53] dark:text-[#4DBAA7]" aria-hidden="true" />
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Cloud sync connected</span>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">
                    {user.displayName || 'Signed-in Account'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={syncingNow}
                  onClick={() => void handleManualCloudSync()}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-xs font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {syncingNow ? 'Backing up...' : 'Sync local entries to cloud'}
                </button>
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Export JSON backup
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Sign in with Google to back up your prayer journal, bookmarks, streak history, and passcode settings privately in Firebase Cloud.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void onSignInGoogle()}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B5E53] hover:bg-[#144840] dark:bg-[#3DA694] dark:hover:bg-[#4DBAA7] dark:text-[#0B1118] text-white text-sm font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  {authLoading ? 'Connecting...' : 'Sign in with Google'}
                </button>
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Export JSON backup
                </button>
              </div>
            </div>
          )}

          {cloudError && (
            <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
              {cloudError}
            </p>
          )}
          {syncNotice && (
            <p role="status" className="text-xs font-medium text-[#1B5E53] dark:text-[#4DBAA7]">
              {syncNotice}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
