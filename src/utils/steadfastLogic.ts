import type {
  AccountabilityCheckin,
  CheckinStatus,
  DailyVerse,
  MilestoneBadge,
  MilestoneBadgeId,
  PrayerCategory,
  PrayerEntry,
  StreakMetrics,
  UserSettings,
  WeeklyDaySnapshot,
  WeeklySummaryMetrics,
} from '../types/steadfast';
import { DAILY_VERSES } from '../data/verses';

export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 100];

export const MILESTONE_BADGE_DEFINITIONS: Array<{
  id: MilestoneBadgeId;
  targetDays: number;
  label: string;
  title: string;
  description: string;
  scriptureRef: string;
  scriptureText: string;
}> = [
  {
    id: 'streak-7',
    targetDays: 7,
    label: '7-Day Streak',
    title: 'First Week Anchor',
    description: 'Walked seven consecutive days in focus, prayer, and quiet self-control.',
    scriptureRef: 'Psalm 119:9',
    scriptureText: 'How can a young man keep his way pure? By guarding it according to your word.',
  },
  {
    id: 'streak-30',
    targetDays: 30,
    label: '30-Day Streak',
    title: 'Month of Renewal',
    description: 'Thirty steady days of replacing restless impulses with honest evening habits.',
    scriptureRef: 'Romans 12:2',
    scriptureText: 'Do not be conformed to this world, but be transformed by the renewal of your mind.',
  },
  {
    id: 'streak-100',
    targetDays: 100,
    label: '100-Day Streak',
    title: 'Steadfast Pillar',
    description: 'One hundred consecutive days of enduring discipline, clarity, and grace.',
    scriptureRef: 'Galatians 6:9',
    scriptureText: 'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
  },
];

export const PRAYER_CATEGORIES: PrayerCategory[] = [
  'Strength',
  'Confession',
  'Gratitude',
  'Renewal',
];

export const SEED_IMAGE_PATHS = {
  heroDawn: '/src/assets/images/verse_dawn_sanctuary_1795454223714.jpg',
  morningWalk: '/src/assets/images/checkin_morning_walk_1795454223354.jpg',
  studyDesk: '/src/assets/images/checkin_study_desk_1795454223191.jpg',
} as const;

// Verbatim blueprint bounds from firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  displayNameMax: 80,
  prayerTitleMax: 120,
  prayerBodyMax: 4000,
  prayerVerseRefMax: 80,
  checkinReflectionMax: 1000,
  checkinPhotoCaptionMax: 200,
  urgesResistedMax: 100,
  bookmarksMax: 100,
} as const;

export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateKey(daysAgo: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setDate(d.getDate() - daysAgo);
  return toDateKey(d);
}

export function getLastNDaysKeys(count: number, baseDate: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(getOffsetDateKey(i, baseDate));
  }
  return keys;
}

export function formatReadableDate(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortWeekday(dateKey: string): { weekday: string; dayNum: string } {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return { weekday: '', dayNum: '' };
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
    dayNum: String(parts[2]),
  };
}

export function getDailyVerseForDate(
  dateKey: string,
  verses: DailyVerse[] = DAILY_VERSES
): DailyVerse {
  if (verses.length === 0) {
    throw new Error('Verses catalog must not be empty');
  }
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return verses[hash % verses.length];
}

export function isCleanDayStatus(status: CheckinStatus): boolean {
  return status === 'steadfast' || status === 'overcame';
}

export function calculateStreakMetrics(
  checkins: AccountabilityCheckin[],
  todayKey: string = toDateKey()
): StreakMetrics {
  const byDate = new Map<string, AccountabilityCheckin>();
  for (const item of checkins) {
    byDate.set(item.dateKey, item);
  }

  let totalSteadfastDays = 0;
  let totalUrgesResisted = 0;
  let totalPhotosLogged = 0;

  for (const item of byDate.values()) {
    if (isCleanDayStatus(item.status)) {
      totalSteadfastDays += 1;
    }
    totalUrgesResisted += Math.max(0, Math.min(BLUEPRINT_LIMITS.urgesResistedMax, Math.floor(item.urgesResisted || 0)));
    if (item.hasLocalPhoto || item.seedPhotoUrl) {
      totalPhotosLogged += 1;
    }
  }

  // Current streak: count backwards from today (or yesterday if today isn't checked in yet)
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  let currentStreak = 0;
  const todayEntry = byDate.get(todayKey);
  const startOffset = todayEntry ? 0 : 1;

  if (!todayEntry || isCleanDayStatus(todayEntry.status)) {
    for (let offset = startOffset; offset < 3650; offset++) {
      const key = getOffsetDateKey(offset, todayDate);
      const entry = byDate.get(key);
      if (entry && isCleanDayStatus(entry.status)) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  // Longest streak across all sorted dates
  const cleanDates = Array.from(byDate.values())
    .filter((c) => isCleanDayStatus(c.status))
    .map((c) => c.dateKey)
    .sort();

  let longestStreak = 0;
  let running = 0;
  let prevTime: number | null = null;

  for (const key of cleanDates) {
    const [y, m, d] = key.split('-').map(Number);
    const utcDay = Date.UTC(y, m - 1, d);
    if (prevTime !== null && utcDay - prevTime === 86400000) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestStreak) {
      longestStreak = running;
    }
    prevTime = utcDay;
  }

  const unlockedMilestones = MILESTONE_DAYS.filter((m) => longestStreak >= m || currentStreak >= m);
  const nextMilestone = MILESTONE_DAYS.find((m) => currentStreak < m) ?? MILESTONE_DAYS[MILESTONE_DAYS.length - 1];
  const milestoneProgressPercent = Math.min(100, Math.round((currentStreak / nextMilestone) * 100));

  return {
    currentStreak,
    longestStreak,
    totalSteadfastDays,
    totalUrgesResisted,
    totalPhotosLogged,
    nextMilestone,
    milestoneProgressPercent,
    unlockedMilestones,
  };
}

export function calculateWeeklySummary(
  checkins: AccountabilityCheckin[],
  todayKey: string = toDateKey()
): WeeklySummaryMetrics {
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const weekKeys = getLastNDaysKeys(7, todayDate);

  const byDate = new Map<string, AccountabilityCheckin>();
  for (const item of checkins) {
    byDate.set(item.dateKey, item);
  }

  const streakMetrics = calculateStreakMetrics(checkins, todayKey);

  let weeklyUrgesResisted = 0;
  let weeklyCleanDays = 0;
  let weeklyFailureCount = 0;

  const weeklyDays: WeeklyDaySnapshot[] = weekKeys.map((dateKey) => {
    const entry = byDate.get(dateKey);
    const { weekday, dayNum } = formatShortWeekday(dateKey);
    if (!entry) {
      return {
        dateKey,
        weekday,
        dayNum,
        status: 'none',
        urgesResisted: 0,
      };
    }

    const clampedUrges = Math.max(
      0,
      Math.min(BLUEPRINT_LIMITS.urgesResistedMax, Math.floor(entry.urgesResisted || 0))
    );
    weeklyUrgesResisted += clampedUrges;

    if (isCleanDayStatus(entry.status)) {
      weeklyCleanDays += 1;
    } else if (entry.status === 'grace') {
      weeklyFailureCount += 1;
    }

    return {
      dateKey,
      weekday,
      dayNum,
      status: entry.status,
      urgesResisted: clampedUrges,
    };
  });

  // Active consecutive days without a check-in failure (matches failure-free streak)
  const daysInRowWithoutFailure = streakMetrics.currentStreak;
  const longestRunWithoutFailure = streakMetrics.longestStreak;

  let encouragementTitle: string;
  let encouragementMessage: string;
  let encouragementVerseRef: string;
  let encouragementVerseText: string;

  if (daysInRowWithoutFailure >= 7) {
    encouragementTitle = 'Steady faithfulness is taking root';
    encouragementMessage = `You have walked ${daysInRowWithoutFailure} days in a row without a check-in failure and resisted ${weeklyUrgesResisted} ${weeklyUrgesResisted === 1 ? 'urge' : 'urges'} this week. Keep guarding your quiet evening habits—consistency builds lasting freedom.`;
    encouragementVerseRef = 'Galatians 6:9';
    encouragementVerseText =
      'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.';
  } else if (daysInRowWithoutFailure >= 3) {
    encouragementTitle = 'Quiet momentum is building';
    encouragementMessage = `${daysInRowWithoutFailure} consecutive days without a check-in failure is real progress. Each of the ${weeklyUrgesResisted} ${weeklyUrgesResisted === 1 ? 'urge' : 'urges'} you paused and resisted this week strengthened your resolve for the road ahead.`;
    encouragementVerseRef = '1 Corinthians 10:13';
    encouragementVerseText =
      'God is faithful, and he will not let you be tempted beyond your ability, but with the temptation he will also provide the way of escape.';
  } else if (weeklyFailureCount > 0 && daysInRowWithoutFailure === 0) {
    encouragementTitle = 'Grace meets you right where you stand';
    encouragementMessage = `A stumble does not erase your commitment or the ${streakMetrics.totalUrgesResisted} ${streakMetrics.totalUrgesResisted === 1 ? 'urge' : 'urges'} you have overcome so far. Bring today into the light, set one clear evening boundary, and begin a new streak in peace.`;
    encouragementVerseRef = 'Lamentations 3:22–23';
    encouragementVerseText =
      'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.';
  } else if (daysInRowWithoutFailure > 0) {
    encouragementTitle = 'Every faithful day counts';
    encouragementMessage = `You have ${daysInRowWithoutFailure} ${daysInRowWithoutFailure === 1 ? 'day' : 'days'} in a row without a check-in failure and ${weeklyUrgesResisted} ${weeklyUrgesResisted === 1 ? 'urge' : 'urges'} resisted this week. Keep showing up one morning and one evening at a time.`;
    encouragementVerseRef = 'Philippians 1:6';
    encouragementVerseText =
      'He who began a good work in you will bring it to completion at the day of Jesus Christ.';
  } else {
    encouragementTitle = 'Start today with quiet resolve';
    encouragementMessage =
      'Log your first check-in today to begin tracking your failure-free streak and every urge you overcome along the way.';
    encouragementVerseRef = 'Psalm 51:10';
    encouragementVerseText =
      'Create in me a clean heart, O God, and renew a right spirit within me.';
  }

  return {
    windowStartKey: weekKeys[0],
    windowEndKey: weekKeys[weekKeys.length - 1],
    weeklyUrgesResisted,
    totalUrgesResistedAllTime: streakMetrics.totalUrgesResisted,
    daysInRowWithoutFailure,
    longestRunWithoutFailure,
    weeklyCleanDays,
    weeklyFailureCount,
    weeklyDays,
    encouragementTitle,
    encouragementMessage,
    encouragementVerseRef,
    encouragementVerseText,
  };
}

export function calculateMilestoneBadges(metrics: StreakMetrics): MilestoneBadge[] {
  const bestStreak = Math.max(metrics.currentStreak, metrics.longestStreak);

  return MILESTONE_BADGE_DEFINITIONS.map((def) => {
    const unlocked = bestStreak >= def.targetDays;
    const progressDays = Math.min(bestStreak, def.targetDays);
    const daysRemaining = Math.max(0, def.targetDays - bestStreak);
    const progressPercent = Math.min(100, Math.round((progressDays / def.targetDays) * 100));

    return {
      ...def,
      unlocked,
      progressDays,
      daysRemaining,
      progressPercent,
    };
  });
}

export interface ValidationResult<T> {
  valid: boolean;
  error?: string;
  value?: T;
}

export function validatePrayerInput(input: {
  title: string;
  body: string;
  category: PrayerCategory;
  verseRef: string;
}): ValidationResult<{ title: string; body: string; category: PrayerCategory; verseRef: string }> {
  const title = input.title.trim();
  const body = input.body.trim();
  const verseRef = input.verseRef.trim();

  if (!title) {
    return { valid: false, error: 'Please add a short title for your prayer.' };
  }
  if (title.length > BLUEPRINT_LIMITS.prayerTitleMax) {
    return {
      valid: false,
      error: `Title must be ${BLUEPRINT_LIMITS.prayerTitleMax} characters or fewer.`,
    };
  }
  if (!body) {
    return { valid: false, error: 'Please write your prayer or reflection before saving.' };
  }
  if (body.length > BLUEPRINT_LIMITS.prayerBodyMax) {
    return {
      valid: false,
      error: `Prayer text must be ${BLUEPRINT_LIMITS.prayerBodyMax} characters or fewer.`,
    };
  }
  if (!PRAYER_CATEGORIES.includes(input.category)) {
    return { valid: false, error: 'Please choose a valid prayer category.' };
  }
  if (verseRef.length > BLUEPRINT_LIMITS.prayerVerseRefMax) {
    return {
      valid: false,
      error: `Verse reference must be ${BLUEPRINT_LIMITS.prayerVerseRefMax} characters or fewer.`,
    };
  }

  return {
    valid: true,
    value: { title, body, category: input.category, verseRef },
  };
}

export function validateCheckinInput(input: {
  dateKey: string;
  status: CheckinStatus;
  reflection: string;
  photoCaption: string;
  urgesResisted: number;
}): ValidationResult<{
  dateKey: string;
  status: CheckinStatus;
  reflection: string;
  photoCaption: string;
  urgesResisted: number;
}> {
  const dateKey = input.dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { valid: false, error: 'Please choose a valid check-in date.' };
  }
  if (!['steadfast', 'overcame', 'grace'].includes(input.status)) {
    return { valid: false, error: 'Please select a daily status.' };
  }
  const reflection = input.reflection.trim();
  if (reflection.length > BLUEPRINT_LIMITS.checkinReflectionMax) {
    return {
      valid: false,
      error: `Reflection must be ${BLUEPRINT_LIMITS.checkinReflectionMax} characters or fewer.`,
    };
  }
  const photoCaption = input.photoCaption.trim();
  if (photoCaption.length > BLUEPRINT_LIMITS.checkinPhotoCaptionMax) {
    return {
      valid: false,
      error: `Photo caption must be ${BLUEPRINT_LIMITS.checkinPhotoCaptionMax} characters or fewer.`,
    };
  }
  const urges = Number.isFinite(input.urgesResisted)
    ? Math.max(0, Math.min(BLUEPRINT_LIMITS.urgesResistedMax, Math.floor(input.urgesResisted)))
    : 0;

  return {
    valid: true,
    value: {
      dateKey,
      status: input.status,
      reflection,
      photoCaption,
      urgesResisted: urges,
    },
  };
}

export function filterPrayers(
  prayers: PrayerEntry[],
  category: PrayerCategory | 'All' | 'Answered',
  query: string
): PrayerEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return prayers
    .filter((entry) => {
      if (category === 'Answered' && !entry.answered) return false;
      if (category !== 'All' && category !== 'Answered' && entry.category !== category) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        entry.title.toLowerCase().includes(normalizedQuery) ||
        entry.body.toLowerCase().includes(normalizedQuery) ||
        entry.verseRef.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function generateSalt(): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const input = `${salt}:${pin}`;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic hash if SubtleCrypto is unavailable in non-secure test contexts
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function verifyPinWithSalt(
  pin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!isValidPin(pin) || !expectedHash) return false;
  const computed = await hashPinWithSalt(pin, salt);
  return computed === expectedHash;
}

export function createDefaultSettings(): UserSettings {
  return {
    displayName: 'Pilgrim',
    themeMode: 'light',
    nightReadingWarmth: true,
    passcodeEnabled: false,
    passcodeHash: '',
    passcodeSalt: '',
    reminderEnabled: true,
    morningReminderTime: '07:30',
    eveningReminderTime: '21:30',
    bookmarkedVerseIds: ['1cor-10-13', 'psalm-51-10'],
  };
}

export function createSeedData(baseDate: Date = new Date()): {
  prayers: PrayerEntry[];
  checkins: AccountabilityCheckin[];
} {
  const day1 = getOffsetDateKey(1, baseDate);
  const day2 = getOffsetDateKey(2, baseDate);
  const day3 = getOffsetDateKey(3, baseDate);
  const day4 = getOffsetDateKey(4, baseDate);
  const nowIso = baseDate.toISOString();

  const prayers: PrayerEntry[] = [
    {
      id: 'seed-prayer-1',
      ownerId: 'local',
      title: 'Guarding my evening routine',
      body: 'Lord, thank You for carrying me through a stressful afternoon. Tonight I want to leave my phone charging across the room at 9:30 PM and read Psalm 119 instead of scrolling aimlessly. Keep my mind calm and anchored in Your peace.',
      category: 'Strength',
      verseRef: 'Psalm 119:9–11',
      answered: false,
      createdAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 14).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 14).toISOString(),
    },
    {
      id: 'seed-prayer-2',
      ownerId: 'local',
      title: 'Gratitude for clarity and honest sleep',
      body: 'Father, waking up with a clear conscience feels like fresh air. Thank You for giving me the pause I needed yesterday evening when an old trigger surfaced. I stepped outside for a ten-minute walk and felt the urge pass.',
      category: 'Gratitude',
      verseRef: '1 Corinthians 10:13',
      answered: true,
      createdAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 38).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 38).toISOString(),
    },
    {
      id: 'seed-prayer-3',
      ownerId: 'local',
      title: 'Renewing what I set before my eyes',
      body: 'Jesus, cleanse my imagination and replace restless habits with steady devotion. Help me love people with respect and honor rather than selfishness.',
      category: 'Renewal',
      verseRef: 'Philippians 4:8',
      answered: false,
      createdAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 64).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 64).toISOString(),
    },
  ];

  const checkins: AccountabilityCheckin[] = [
    {
      id: day1,
      ownerId: 'local',
      dateKey: day1,
      status: 'overcame',
      reflection: 'Felt tired around 10 PM, stepped away from screens, prayed through 1 Corinthians 10:13, and went to bed with peace.',
      hasLocalPhoto: true,
      photoCaption: 'Morning forest walk before starting work — clear head and steady heart.',
      urgesResisted: 2,
      seedPhotoUrl: SEED_IMAGE_PATHS.morningWalk,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: day2,
      ownerId: 'local',
      dateKey: day2,
      status: 'steadfast',
      reflection: 'Spent twenty quiet minutes at my desk with tea and Scripture before checking any messages.',
      hasLocalPhoto: true,
      photoCaption: 'Morning Bible study desk before opening laptop.',
      urgesResisted: 1,
      seedPhotoUrl: SEED_IMAGE_PATHS.studyDesk,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: day3,
      ownerId: 'local',
      dateKey: day3,
      status: 'steadfast',
      reflection: 'Kept my phone outside the bedroom overnight. Woke up rested and focused.',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: day4,
      ownerId: 'local',
      dateKey: day4,
      status: 'steadfast',
      reflection: 'Started the week with a short prayer of commitment.',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return { prayers, checkins };
}
