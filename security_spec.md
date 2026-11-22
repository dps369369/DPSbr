# DPSbr Firestore Security Specification

## 1. Data Invariants
1. **Identity & Ownership**: Only authenticated users with a verified email (`request.auth.token.email_verified == true`) can read or write any document, and exclusively within their own `/users/{userId}` tree (`request.auth.uid == userId`).
2. **Owner Field Integrity**: `ownerId` on both `UserProfile` and `LessonEntry` must equal `request.auth.uid` on creation and remain immutable on update.
3. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update. `updatedAt` on `UserProfile` must equal `request.time`.
4. **Immutable Lesson History**: `LessonEntry` documents in `/users/{userId}/lessons/{lessonId}` are append-only (`create` and `read`, no client `update` or `delete` tampering except profile reset via `delete` by the owner).
5. **Strict Key & Volumetric Bounds**: Shadow fields (`isAdmin`, `role`, extra keys) are rejected via `keys().hasAll(...) && keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`. Every string and array enforces `.size()` bounds.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid_1` with `auth = null`.
2. **Unverified Email Write**: `CREATE /users/uid_1` with `auth = { uid: 'uid_1', token: { email_verified: false } }`.
3. **Cross-User Read (PII Leak)**: `GET /users/uid_2` signed in as `uid_1`.
4. **Cross-User Lesson List**: `LIST /users/uid_2/lessons` signed in as `uid_1`.
5. **Identity Spoofing**: `CREATE /users/uid_1` with `ownerId: 'uid_2'` while signed in as `uid_1`.
6. **Shadow Field Injection on Profile**: `CREATE /users/uid_1` with extra field `isAdmin: true`.
7. **Shadow Field Injection on Update**: `UPDATE /users/uid_1` modifying `unlockedChars` plus ghost field `verified: true`.
8. **Immutable Field Tampering**: `UPDATE /users/uid_1` changing `createdAt` or `ownerId`.
9. **Client Timestamp Spoofing**: `CREATE /users/uid_1/lessons/lsn_1` with `createdAt: new Date(0)` instead of `request.time`.
10. **ID Poisoning**: `CREATE /users/uid_1/lessons/invalid$id_with_spaces_and_150_chars...` (exceeds 128 chars or fails `^[a-zA-Z0-9_-]+$`).
11. **Value / Resource Poisoning**: `UPDATE /users/uid_1` with `displayName` > 40 chars or `unlockedChars.size() > 64`.
12. **Out-of-Range Metric Injection**: `CREATE /users/uid_1/lessons/lsn_1` with `accuracy: 250` or `layout: 'invalid_layout'`.
