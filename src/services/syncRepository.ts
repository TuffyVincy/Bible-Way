import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  AccountabilityCheckin,
  PrayerEntry,
  UserSettings,
} from '../types/steadfast';
import {
  BLUEPRINT_LIMITS,
  createDefaultSettings,
  createSeedData,
} from '../utils/steadfastLogic';

const STORAGE_KEYS = {
  settings: 'steadfast_settings_v1',
  prayers: 'steadfast_prayers_v1',
  checkins: 'steadfast_checkins_v1',
  theme: 'steadfast_theme',
} as const;

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export function loadLocalState(): {
  settings: UserSettings;
  prayers: PrayerEntry[];
  checkins: AccountabilityCheckin[];
} {
  const defaults = createDefaultSettings();
  let settings = defaults;
  let prayers: PrayerEntry[] | null = null;
  let checkins: AccountabilityCheckin[] | null = null;

  try {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.settings);
    if (rawSettings) {
      settings = { ...defaults, ...JSON.parse(rawSettings) };
    }
  } catch {
    settings = defaults;
  }

  try {
    const rawPrayers = localStorage.getItem(STORAGE_KEYS.prayers);
    if (rawPrayers) {
      prayers = JSON.parse(rawPrayers) as PrayerEntry[];
    }
  } catch {
    prayers = null;
  }

  try {
    const rawCheckins = localStorage.getItem(STORAGE_KEYS.checkins);
    if (rawCheckins) {
      checkins = JSON.parse(rawCheckins) as AccountabilityCheckin[];
    }
  } catch {
    checkins = null;
  }

  if (!prayers || !checkins) {
    const seeded = createSeedData();
    if (!prayers) prayers = seeded.prayers;
    if (!checkins) checkins = seeded.checkins;
    saveLocalState(settings, prayers, checkins);
  }

  return { settings, prayers, checkins };
}

export function saveLocalState(
  settings: UserSettings,
  prayers: PrayerEntry[],
  checkins: AccountabilityCheckin[]
): void {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.prayers, JSON.stringify(prayers));
    localStorage.setItem(STORAGE_KEYS.checkins, JSON.stringify(checkins));
    localStorage.setItem(STORAGE_KEYS.theme, settings.themeMode);
  } catch {
    // Ignore storage quota errors
  }
}

export async function ensureUserProfileDoc(
  user: User,
  localSettings: UserSettings
): Promise<void> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const displayName = (user.displayName || localSettings.displayName || 'Pilgrim').slice(
        0,
        BLUEPRINT_LIMITS.displayNameMax
      );
      await setDoc(ref, {
        ownerId: user.uid,
        displayName,
        themeMode: localSettings.themeMode,
        nightReadingWarmth: localSettings.nightReadingWarmth,
        passcodeEnabled: localSettings.passcodeEnabled,
        passcodeHash: localSettings.passcodeHash.slice(0, 128),
        passcodeSalt: localSettings.passcodeSalt.slice(0, 64),
        reminderEnabled: localSettings.reminderEnabled,
        morningReminderTime: localSettings.morningReminderTime,
        eveningReminderTime: localSettings.eveningReminderTime,
        bookmarkedVerseIds: localSettings.bookmarkedVerseIds.slice(0, BLUEPRINT_LIMITS.bookmarksMax),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToCloudData(
  user: User,
  callbacks: {
    onSettings: (settings: Partial<UserSettings>) => void;
    onPrayers: (prayers: PrayerEntry[]) => void;
    onCheckins: (checkins: AccountabilityCheckin[]) => void;
    onError: (message: string) => void;
  }
): Unsubscribe {
  const userPath = `users/${user.uid}`;
  const prayersPath = `users/${user.uid}/prayers`;
  const checkinsPath = `users/${user.uid}/checkins`;

  const unsubProfile = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      callbacks.onSettings({
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Pilgrim',
        themeMode: data.themeMode === 'dark' ? 'dark' : 'light',
        nightReadingWarmth: Boolean(data.nightReadingWarmth),
        passcodeEnabled: Boolean(data.passcodeEnabled),
        passcodeHash: typeof data.passcodeHash === 'string' ? data.passcodeHash : '',
        passcodeSalt: typeof data.passcodeSalt === 'string' ? data.passcodeSalt : '',
        reminderEnabled: Boolean(data.reminderEnabled),
        morningReminderTime:
          typeof data.morningReminderTime === 'string' ? data.morningReminderTime : '07:30',
        eveningReminderTime:
          typeof data.eveningReminderTime === 'string' ? data.eveningReminderTime : '21:30',
        bookmarkedVerseIds: Array.isArray(data.bookmarkedVerseIds)
          ? (data.bookmarkedVerseIds as string[])
          : [],
      });
    },
    (error) => {
      callbacks.onError('Could not sync cloud profile settings.');
      handleFirestoreError(error, OperationType.GET, userPath);
    }
  );

  const prayersQuery = query(
    collection(db, 'users', user.uid, 'prayers'),
    where('ownerId', '==', user.uid)
  );
  const unsubPrayers = onSnapshot(
    prayersQuery,
    (snap) => {
      const entries: PrayerEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId || user.uid),
          title: String(data.title || ''),
          body: String(data.body || ''),
          category: data.category || 'Strength',
          verseRef: String(data.verseRef || ''),
          answered: Boolean(data.answered),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      callbacks.onPrayers(entries);
    },
    (error) => {
      callbacks.onError('Could not sync cloud prayer journal.');
      handleFirestoreError(error, OperationType.LIST, prayersPath);
    }
  );

  const checkinsQuery = query(
    collection(db, 'users', user.uid, 'checkins'),
    where('ownerId', '==', user.uid)
  );
  const unsubCheckins = onSnapshot(
    checkinsQuery,
    (snap) => {
      const items: AccountabilityCheckin[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId || user.uid),
          dateKey: String(data.dateKey || d.id),
          status: data.status || 'steadfast',
          reflection: String(data.reflection || ''),
          hasLocalPhoto: Boolean(data.hasLocalPhoto),
          photoCaption: String(data.photoCaption || ''),
          urgesResisted: Number(data.urgesResisted || 0),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      callbacks.onCheckins(items);
    },
    (error) => {
      callbacks.onError('Could not sync cloud accountability logs.');
      handleFirestoreError(error, OperationType.LIST, checkinsPath);
    }
  );

  return () => {
    unsubProfile();
    unsubPrayers();
    unsubCheckins();
  };
}

export async function syncAppearanceSettings(
  user: User,
  payload: { displayName?: string; themeMode?: 'light' | 'dark'; nightReadingWarmth?: boolean }
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncPasscodeSettings(
  user: User,
  payload: { passcodeEnabled: boolean; passcodeHash: string; passcodeSalt: string }
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      passcodeEnabled: payload.passcodeEnabled,
      passcodeHash: payload.passcodeHash.slice(0, 128),
      passcodeSalt: payload.passcodeSalt.slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncReminderSettings(
  user: User,
  payload: {
    reminderEnabled: boolean;
    morningReminderTime: string;
    eveningReminderTime: string;
  }
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      reminderEnabled: payload.reminderEnabled,
      morningReminderTime: payload.morningReminderTime,
      eveningReminderTime: payload.eveningReminderTime,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncBookmarks(user: User, bookmarkedVerseIds: string[]): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      bookmarkedVerseIds: bookmarkedVerseIds.slice(0, BLUEPRINT_LIMITS.bookmarksMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createCloudPrayer(user: User, entry: PrayerEntry): Promise<void> {
  const path = `users/${user.uid}/prayers/${entry.id}`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'prayers', entry.id), {
      ownerId: user.uid,
      title: entry.title.slice(0, BLUEPRINT_LIMITS.prayerTitleMax),
      body: entry.body.slice(0, BLUEPRINT_LIMITS.prayerBodyMax),
      category: entry.category,
      verseRef: entry.verseRef.slice(0, BLUEPRINT_LIMITS.prayerVerseRefMax),
      answered: entry.answered,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudPrayerContent(
  user: User,
  id: string,
  payload: Pick<PrayerEntry, 'title' | 'body' | 'category' | 'verseRef'>
): Promise<void> {
  const path = `users/${user.uid}/prayers/${id}`;
  try {
    await updateDoc(doc(db, 'users', user.uid, 'prayers', id), {
      title: payload.title.slice(0, BLUEPRINT_LIMITS.prayerTitleMax),
      body: payload.body.slice(0, BLUEPRINT_LIMITS.prayerBodyMax),
      category: payload.category,
      verseRef: payload.verseRef.slice(0, BLUEPRINT_LIMITS.prayerVerseRefMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleCloudPrayerAnswered(
  user: User,
  id: string,
  answered: boolean
): Promise<void> {
  const path = `users/${user.uid}/prayers/${id}`;
  try {
    await updateDoc(doc(db, 'users', user.uid, 'prayers', id), {
      answered,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudPrayer(user: User, id: string): Promise<void> {
  const path = `users/${user.uid}/prayers/${id}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'prayers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertCloudCheckin(
  user: User,
  checkin: AccountabilityCheckin
): Promise<void> {
  const path = `users/${user.uid}/checkins/${checkin.dateKey}`;
  const ref = doc(db, 'users', user.uid, 'checkins', checkin.dateKey);
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        status: checkin.status,
        reflection: checkin.reflection.slice(0, BLUEPRINT_LIMITS.checkinReflectionMax),
        hasLocalPhoto: checkin.hasLocalPhoto,
        photoCaption: checkin.photoCaption.slice(0, BLUEPRINT_LIMITS.checkinPhotoCaptionMax),
        urgesResisted: Math.max(
          0,
          Math.min(BLUEPRINT_LIMITS.urgesResistedMax, Math.floor(checkin.urgesResisted))
        ),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: user.uid,
        dateKey: checkin.dateKey,
        status: checkin.status,
        reflection: checkin.reflection.slice(0, BLUEPRINT_LIMITS.checkinReflectionMax),
        hasLocalPhoto: checkin.hasLocalPhoto,
        photoCaption: checkin.photoCaption.slice(0, BLUEPRINT_LIMITS.checkinPhotoCaptionMax),
        urgesResisted: Math.max(
          0,
          Math.min(BLUEPRINT_LIMITS.urgesResistedMax, Math.floor(checkin.urgesResisted))
        ),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudCheckin(user: User, dateKey: string): Promise<void> {
  const path = `users/${user.uid}/checkins/${dateKey}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'checkins', dateKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
