import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMilestoneBadges,
  calculateStreakMetrics,
  calculateWeeklySummary,
  createSeedData,
  filterPrayers,
  getDailyVerseForDate,
  hashPinWithSalt,
  isValidPin,
  validateCheckinInput,
  validatePrayerInput,
  verifyPinWithSalt,
} from './steadfastLogic';
import type { AccountabilityCheckin } from '../types/steadfast';

test('getDailyVerseForDate returns deterministic verse for same date', () => {
  const v1 = getDailyVerseForDate('2026-11-23');
  const v2 = getDailyVerseForDate('2026-11-23');
  assert.equal(v1.id, v2.id);
  assert.ok(v1.reference.length > 0);
});

test('calculateStreakMetrics counts consecutive clean days including yesterday bridge', () => {
  const checkins: AccountabilityCheckin[] = [
    {
      id: '2026-11-22',
      ownerId: 'u1',
      dateKey: '2026-11-22',
      status: 'steadfast',
      reflection: 'Strong day',
      hasLocalPhoto: true,
      photoCaption: 'Walk',
      urgesResisted: 2,
      createdAt: '2026-11-22T10:00:00Z',
      updatedAt: '2026-11-22T10:00:00Z',
    },
    {
      id: '2026-11-21',
      ownerId: 'u1',
      dateKey: '2026-11-21',
      status: 'overcame',
      reflection: 'Resisted urge',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 3,
      createdAt: '2026-11-21T10:00:00Z',
      updatedAt: '2026-11-21T10:00:00Z',
    },
    {
      id: '2026-11-20',
      ownerId: 'u1',
      dateKey: '2026-11-20',
      status: 'grace',
      reflection: 'Reset with grace',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 0,
      createdAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z',
    },
  ];

  // Today (2026-11-23) has not been logged yet, so streak bridges from yesterday (2 days)
  const metrics = calculateStreakMetrics(checkins, '2026-11-23');
  assert.equal(metrics.currentStreak, 2);
  assert.equal(metrics.longestStreak, 2);
  assert.equal(metrics.totalSteadfastDays, 2);
  assert.equal(metrics.totalUrgesResisted, 5);
  assert.equal(metrics.totalPhotosLogged, 1);
  assert.equal(metrics.nextMilestone, 3);
  assert.deepEqual(metrics.unlockedMilestones, [1]);
});

test('calculateStreakMetrics resets current streak to 0 when today is marked grace', () => {
  const checkins: AccountabilityCheckin[] = [
    {
      id: '2026-11-23',
      ownerId: 'u1',
      dateKey: '2026-11-23',
      status: 'grace',
      reflection: 'Starting fresh',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 0,
      createdAt: '2026-11-23T08:00:00Z',
      updatedAt: '2026-11-23T08:00:00Z',
    },
    {
      id: '2026-11-22',
      ownerId: 'u1',
      dateKey: '2026-11-22',
      status: 'steadfast',
      reflection: 'Good day',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 1,
      createdAt: '2026-11-22T08:00:00Z',
      updatedAt: '2026-11-22T08:00:00Z',
    },
  ];
  const metrics = calculateStreakMetrics(checkins, '2026-11-23');
  assert.equal(metrics.currentStreak, 0);
  assert.equal(metrics.longestStreak, 1);
});

test('validatePrayerInput rejects empty or oversized inputs', () => {
  assert.equal(
    validatePrayerInput({ title: '  ', body: 'Help me', category: 'Strength', verseRef: '' }).valid,
    false
  );
  assert.equal(
    validatePrayerInput({ title: 'Night prayer', body: '', category: 'Strength', verseRef: '' }).valid,
    false
  );
  assert.equal(
    validatePrayerInput({
      title: 'A'.repeat(121),
      body: 'Valid body',
      category: 'Strength',
      verseRef: '',
    }).valid,
    false
  );
  const ok = validatePrayerInput({
    title: '  Peace tonight  ',
    body: '  Keep my mind steady.  ',
    category: 'Renewal',
    verseRef: 'Psalm 51:10',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.value?.title, 'Peace tonight');
});

test('validateCheckinInput clamps urges and checks date format', () => {
  assert.equal(
    validateCheckinInput({
      dateKey: 'invalid-date',
      status: 'steadfast',
      reflection: '',
      photoCaption: '',
      urgesResisted: 1,
    }).valid,
    false
  );

  const valid = validateCheckinInput({
    dateKey: '2026-11-23',
    status: 'overcame',
    reflection: 'Walked outside.',
    photoCaption: 'Morning trail',
    urgesResisted: 999,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.value?.urgesResisted, 100);
});

test('filterPrayers filters by category, answered state, and search text', () => {
  const { prayers } = createSeedData(new Date(2026, 10, 23));
  assert.equal(filterPrayers(prayers, 'All', '').length, 3);
  assert.equal(filterPrayers(prayers, 'Answered', '').length, 1);
  assert.equal(filterPrayers(prayers, 'Strength', '').length, 1);
  assert.equal(filterPrayers(prayers, 'All', 'Psalm 119').length, 1);
});

test('PIN validation, hashing, and verification work accurately', async () => {
  assert.equal(isValidPin('2580'), true);
  assert.equal(isValidPin('258'), false);
  assert.equal(isValidPin('abcd'), false);

  const salt = 'test-salt-123';
  const hash = await hashPinWithSalt('2580', salt);
  assert.ok(hash.length >= 8);
  assert.equal(await verifyPinWithSalt('2580', salt, hash), true);
  assert.equal(await verifyPinWithSalt('0000', salt, hash), false);
});

test('calculateWeeklySummary sums urges within 7-day window and counts failure-free days in a row', () => {
  const checkins: AccountabilityCheckin[] = [
    {
      id: '2026-11-23',
      ownerId: 'u1',
      dateKey: '2026-11-23',
      status: 'overcame',
      reflection: 'Paused and prayed',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 3,
      createdAt: '2026-11-23T08:00:00Z',
      updatedAt: '2026-11-23T08:00:00Z',
    },
    {
      id: '2026-11-22',
      ownerId: 'u1',
      dateKey: '2026-11-22',
      status: 'steadfast',
      reflection: 'Clear evening',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 2,
      createdAt: '2026-11-22T08:00:00Z',
      updatedAt: '2026-11-22T08:00:00Z',
    },
    {
      id: '2026-11-21',
      ownerId: 'u1',
      dateKey: '2026-11-21',
      status: 'steadfast',
      reflection: 'Focused day',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 1,
      createdAt: '2026-11-21T08:00:00Z',
      updatedAt: '2026-11-21T08:00:00Z',
    },
    {
      id: '2026-11-20',
      ownerId: 'u1',
      dateKey: '2026-11-20',
      status: 'grace',
      reflection: 'Reset with grace',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 0,
      createdAt: '2026-11-20T08:00:00Z',
      updatedAt: '2026-11-20T08:00:00Z',
    },
    // Older than 7-day window (2026-11-17..2026-11-23)
    {
      id: '2026-11-10',
      ownerId: 'u1',
      dateKey: '2026-11-10',
      status: 'steadfast',
      reflection: 'Earlier victory',
      hasLocalPhoto: false,
      photoCaption: '',
      urgesResisted: 5,
      createdAt: '2026-11-10T08:00:00Z',
      updatedAt: '2026-11-10T08:00:00Z',
    },
  ];

  const summary = calculateWeeklySummary(checkins, '2026-11-23');
  assert.equal(summary.windowStartKey, '2026-11-17');
  assert.equal(summary.windowEndKey, '2026-11-23');
  assert.equal(summary.weeklyUrgesResisted, 6);
  assert.equal(summary.totalUrgesResistedAllTime, 11);
  assert.equal(summary.daysInRowWithoutFailure, 3);
  assert.equal(summary.weeklyCleanDays, 3);
  assert.equal(summary.weeklyFailureCount, 1);
  assert.equal(summary.weeklyDays.length, 7);
});

test('calculateWeeklySummary handles empty check-ins gracefully', () => {
  const summary = calculateWeeklySummary([], '2026-11-23');
  assert.equal(summary.weeklyUrgesResisted, 0);
  assert.equal(summary.totalUrgesResistedAllTime, 0);
  assert.equal(summary.daysInRowWithoutFailure, 0);
  assert.equal(summary.weeklyDays.length, 7);
  assert.ok(summary.encouragementTitle.length > 0);
});

test('calculateMilestoneBadges computes 7-day, 30-day, and 100-day progress and unlocks accurately', () => {
  const baseMetrics = {
    currentStreak: 4,
    longestStreak: 4,
    totalSteadfastDays: 4,
    totalUrgesResisted: 4,
    totalPhotosLogged: 2,
    nextMilestone: 7,
    milestoneProgressPercent: 57,
    unlockedMilestones: [1, 3],
  };

  const at4 = calculateMilestoneBadges(baseMetrics);
  assert.equal(at4.length, 3);
  assert.deepEqual(
    at4.map((b) => b.targetDays),
    [7, 30, 100]
  );
  assert.equal(at4[0].unlocked, false);
  assert.equal(at4[0].daysRemaining, 3);
  assert.equal(at4[0].progressPercent, 57);

  const at7 = calculateMilestoneBadges({ ...baseMetrics, currentStreak: 7, longestStreak: 7 });
  assert.equal(at7[0].unlocked, true);
  assert.equal(at7[0].daysRemaining, 0);
  assert.equal(at7[1].unlocked, false);
  assert.equal(at7[2].unlocked, false);

  const at30 = calculateMilestoneBadges({ ...baseMetrics, currentStreak: 30, longestStreak: 30 });
  assert.equal(at30[0].unlocked, true);
  assert.equal(at30[1].unlocked, true);
  assert.equal(at30[2].unlocked, false);
  assert.equal(at30[2].daysRemaining, 70);

  // Permanently retains earned badges via longestStreak even if currentStreak later resets
  const at100Longest = calculateMilestoneBadges({ ...baseMetrics, currentStreak: 2, longestStreak: 100 });
  assert.equal(at100Longest[0].unlocked, true);
  assert.equal(at100Longest[1].unlocked, true);
  assert.equal(at100Longest[2].unlocked, true);
  assert.equal(at100Longest[2].progressPercent, 100);
});
