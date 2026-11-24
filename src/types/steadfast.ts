export type PrayerCategory = 'Strength' | 'Confession' | 'Gratitude' | 'Renewal';

export type CheckinStatus = 'steadfast' | 'overcame' | 'grace';

export type VerseTheme =
  | 'Strength in Temptation'
  | 'Guard the Mind'
  | 'Grace & Renewal'
  | 'Walking in Purity';

export type TabId = 'today' | 'journal' | 'progress' | 'settings';

export interface DailyVerse {
  id: string;
  reference: string;
  text: string;
  theme: VerseTheme;
  reflectionPrompt: string;
  shortPrayer: string;
}

export interface PrayerEntry {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  category: PrayerCategory;
  verseRef: string;
  answered: boolean;
  createdAt: string; // ISO string locally; converted from Firestore Timestamp on sync
  updatedAt: string;
}

export interface AccountabilityCheckin {
  id: string; // YYYY-MM-DD
  ownerId: string;
  dateKey: string; // YYYY-MM-DD
  status: CheckinStatus;
  reflection: string;
  hasLocalPhoto: boolean;
  photoCaption: string;
  urgesResisted: number;
  seedPhotoUrl?: string; // Local static asset path for initial demo entries
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  displayName: string;
  themeMode: 'light' | 'dark';
  nightReadingWarmth: boolean;
  passcodeEnabled: boolean;
  passcodeHash: string;
  passcodeSalt: string;
  reminderEnabled: boolean;
  morningReminderTime: string;
  eveningReminderTime: string;
  bookmarkedVerseIds: string[];
}

export interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  totalSteadfastDays: number;
  totalUrgesResisted: number;
  totalPhotosLogged: number;
  nextMilestone: number;
  milestoneProgressPercent: number;
  unlockedMilestones: number[];
}

export interface WeeklyDaySnapshot {
  dateKey: string;
  weekday: string;
  dayNum: string;
  status: CheckinStatus | 'none';
  urgesResisted: number;
}

export interface WeeklySummaryMetrics {
  windowStartKey: string;
  windowEndKey: string;
  weeklyUrgesResisted: number;
  totalUrgesResistedAllTime: number;
  daysInRowWithoutFailure: number;
  longestRunWithoutFailure: number;
  weeklyCleanDays: number;
  weeklyFailureCount: number;
  weeklyDays: WeeklyDaySnapshot[];
  encouragementTitle: string;
  encouragementMessage: string;
  encouragementVerseRef: string;
  encouragementVerseText: string;
}

export type MilestoneBadgeId = 'streak-7' | 'streak-30' | 'streak-100';

export interface MilestoneBadge {
  id: MilestoneBadgeId;
  targetDays: number;
  label: string;
  title: string;
  description: string;
  scriptureRef: string;
  scriptureText: string;
  unlocked: boolean;
  progressDays: number;
  daysRemaining: number;
  progressPercent: number;
}
