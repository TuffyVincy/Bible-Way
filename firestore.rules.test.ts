import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = fs.existsSync(path.resolve('firestore.rules'))
  ? path.resolve('firestore.rules')
  : path.resolve('DRAFT_firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve('firebase-blueprint.json'), 'utf8'));

test('Dirty Dozen #1 & #2: Default deny and verified owner gate present', () => {
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /request\.auth\.uid == userId/);
});

test('Dirty Dozen #3, #4, #5: Strict owner-only read/list isolation and no user enumeration', () => {
  assert.match(rulesText, /match \/users\/\{userId\}[\s\S]*?allow list: if false;/);
  assert.match(rulesText, /match \/prayers\/\{prayerId\}[\s\S]*?allow list: if isVerifiedOwner\(userId\) && resource\.data\.ownerId == request\.auth\.uid;/);
  assert.match(rulesText, /match \/checkins\/\{checkinId\}[\s\S]*?allow list: if isVerifiedOwner\(userId\) && resource\.data\.ownerId == request\.auth\.uid;/);
  assert.doesNotMatch(rulesText, /allow list: if isSignedIn\(\);/);
});

test('Dirty Dozen #6, #7, #8: Identity integrity and zero shadow fields (hasAll + hasOnly + affectedKeys)', () => {
  assert.match(rulesText, /data\.ownerId == request\.auth\.uid/);
  assert.match(rulesText, /data\.keys\(\)\.hasAll/);
  assert.match(rulesText, /data\.keys\(\)\.hasOnly/);
  assert.match(rulesText, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly/);
});

test('Dirty Dozen #9: Immutable createdAt and strict server timestamp validation', () => {
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
});

test('Dirty Dozen #10 & #11: ID poisoning regex and blueprint volumetric bounds synchronized', () => {
  assert.match(rulesText, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.equal(blueprint.entities.PrayerEntry.properties.title.maxLength, 120);
  assert.equal(blueprint.entities.PrayerEntry.properties.body.maxLength, 4000);
  assert.equal(blueprint.entities.AccountabilityCheckin.properties.reflection.maxLength, 1000);
  assert.match(rulesText, /data\.title\.size\(\) <= 120/);
  assert.match(rulesText, /data\.body\.size\(\) <= 4000/);
  assert.match(rulesText, /data\.reflection\.size\(\) <= 1000/);
  assert.match(rulesText, /data\.urgesResisted >= 0 && data\.urgesResisted <= 100/);
});

test('Dirty Dozen #12: Master Gate exists() check on subcollection writes', () => {
  const existsMatches = rulesText.match(/exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/g) || [];
  assert.ok(existsMatches.length >= 4, 'Expected parent exists() Master Gate on prayers and checkins create/update');
});
