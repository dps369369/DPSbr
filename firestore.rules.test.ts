// Security test suite specification for DPSbr Firestore rules.
// Verifies all 12 adversarial "Dirty Dozen" payloads against /users/{userId} and /users/{userId}/lessons/{lessonId}.

export interface RuleTestCase {
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; emailVerified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: RuleTestCase[] = [
  {
    name: '1. Unauthenticated profile read',
    path: '/users/uid_1',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified email profile write',
    path: '/users/uid_1',
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: false },
    payload: { ownerId: 'uid_1', displayName: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Cross-user profile read (PII isolation)',
    path: '/users/uid_2',
    operation: 'get',
    auth: { uid: 'uid_1', emailVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Cross-user lesson list',
    path: '/users/uid_2/lessons',
    operation: 'list',
    auth: { uid: 'uid_1', emailVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Identity spoofing on create',
    path: '/users/uid_1',
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_2', displayName: 'Spoof' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Shadow field injection (isAdmin) on create',
    path: '/users/uid_1',
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_1', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Shadow field injection on update',
    path: '/users/uid_1',
    operation: 'update',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { unlockedChars: ['ক'], verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Immutable ownerId tampering on update',
    path: '/users/uid_1',
    operation: 'update',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_2' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Client timestamp spoofing on lesson create',
    path: '/users/uid_1/lessons/lsn_1',
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_1', createdAt: '1970-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Document ID poisoning (>128 chars / invalid chars)',
    path: `/users/uid_1/lessons/${'a'.repeat(130)}`,
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Resource poisoning (oversized displayName)',
    path: '/users/uid_1',
    operation: 'update',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { displayName: 'x'.repeat(100) },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Out-of-range lesson metric injection (accuracy > 100)',
    path: '/users/uid_1/lessons/lsn_2',
    operation: 'create',
    auth: { uid: 'uid_1', emailVerified: true },
    payload: { ownerId: 'uid_1', accuracy: 250, layout: 'jatiya' },
    expected: 'PERMISSION_DENIED',
  },
];
