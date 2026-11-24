# Security Specification — Steadfast Firestore Rules

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}`, `/users/{userId}/prayers/{prayerId}`, and `/users/{userId}/checkins/{checkinId}` is strictly private to `request.auth.uid == userId` with verified email (`request.auth.token.email_verified == true`). No cross-user reads, listings, or writes are ever permitted.
2. **Master Gate Parent Existence**: Subcollection writes to `prayers` and `checkins` require the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Zero Shadow Fields**: Document creation enforces `keys().hasAll(...)` and `keys().hasOnly(...)`. Updates are split into explicit action branches enforcing `affectedKeys().hasOnly(...)`.
4. **Immutable Ownership & Timestamps**: `ownerId`, `createdAt`, and `dateKey` (on checkins) can never change after creation. `createdAt == request.time` on create and `updatedAt == request.time` on create and update.
5. **Volumetric Bounds & Regex Guards**: Every string field enforces `.size()` limits matching `firebase-blueprint.json`, IDs match `^[a-zA-Z0-9_\-]+$`, arrays (`bookmarkedVerseIds`) enforce `.size() <= 100` with element type guard, and `urgesResisted` is bounded to `0..100`.
6. **Zero Raw Image Storage in Firestore**: Accountability photos remain private on-device in IndexedDB; Firestore stores only bounded metadata (`hasLocalPhoto`, `photoCaption <= 200`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid_a/prayers/p1` with `auth = null`.
2. **Unverified Email Write**: `CREATE /users/uid_a` with `email_verified = false`.
3. **Cross-User Read (PII/Journal Leak)**: `GET /users/uid_a/prayers/p1` signed in as `uid_b`.
4. **Cross-User List Scraping**: `LIST /users/uid_a/checkins` signed in as `uid_b`.
5. **User Enumeration**: `LIST /users` signed in as `uid_a`.
6. **Identity Spoofing on Create**: `CREATE /users/uid_a/prayers/p1` with `ownerId: "uid_b"`.
7. **Shadow Field Injection (Ghost Field)**: `CREATE /users/uid_a` including `{ isAdmin: true }`.
8. **Shadow Update Injection**: `UPDATE /users/uid_a/prayers/p1` adding `{ role: "admin" }`.
9. **Immutable Timestamp Tampering**: `UPDATE /users/uid_a/prayers/p1` changing `createdAt` or forging `updatedAt` to a past timestamp instead of `request.time`.
10. **ID Poisoning Attack**: `CREATE /users/uid_a/prayers/invalid..id$$$` or 200-char ID.
11. **Value Poisoning / Volumetric Overflow**: `CREATE /users/uid_a/prayers/p2` with `body` length > 4000 chars or `urgesResisted: 999999`.
12. **Orphaned Subcollection Write (Master Gate Bypass)**: `CREATE /users/uid_new/prayers/p1` before parent `/users/uid_new` exists.
