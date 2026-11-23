import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { STARTER_BANGLA_CHARS } from '../data/banglaCorpus';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DailyPracticeStat,
  FreeHandStats,
  KeyStats,
  LessonRecord,
  ProfileData,
  UserSettings,
} from '../types/typing';
import { createEmptyFreeHandStats, DEFAULT_SETTINGS } from './adaptiveEngine';

function sanitizeSettings(s: UserSettings): UserSettings {
  const rawFreeHand = Array.isArray(s.freeHandChars)
    ? Array.from(
        new Set(
          s.freeHandChars
            .map((c) => String(c).slice(0, 4))
            .filter((c) => c.length > 0)
        )
      ).slice(0, 64)
    : ['ক', 'ত'];

  return {
    layout: ['probhat', 'unijoy', 'jatiya', 'ime'].includes(s.layout) ? s.layout : 'jatiya',
    practiceMode: ['guided', 'freehand', 'all', 'conjuncts', 'custom'].includes(s.practiceMode)
      ? s.practiceMode
      : 'guided',
    targetWpm: Math.min(120, Math.max(10, Math.round(s.targetWpm || 30))),
    dailyGoalMinutes: Math.min(240, Math.max(1, Math.round(s.dailyGoalMinutes || 15))),
    lessonWordCount: Math.min(60, Math.max(5, Math.round(s.lessonWordCount || 20))),
    showKeyboard: Boolean(s.showKeyboard),
    showFingerColors: Boolean(s.showFingerColors),
    showKeystrokeHints: Boolean(s.showKeystrokeHints),
    soundEnabled: Boolean(s.soundEnabled),
    stopOnError: Boolean(s.stopOnError),
    includePunctuation: Boolean(s.includePunctuation),
    theme: s.theme === 'dark' ? 'dark' : 'light',
    customText: String(s.customText || '').slice(0, 7900),
    freeHandChars: rawFreeHand.length >= 2 ? rawFreeHand : ['ক', 'ত'],
  };
}

function sanitizeDisplayName(name: string): string {
  const trimmed = name.trim().slice(0, 40);
  return trimmed.length > 0 ? trimmed : 'Bangla Learner';
}

function sanitizeUnlockedChars(chars: string[]): string[] {
  const cleaned = chars
    .map((c) => String(c).slice(0, 4))
    .filter((c) => c.length > 0)
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : [...STARTER_BANGLA_CHARS];
}

function sanitizeIgnoredChars(chars: string[]): string[] {
  return Array.from(
    new Set(
      chars
        .map((c) => String(c).slice(0, 4))
        .filter((c) => c.length > 0)
    )
  ).slice(0, 64);
}

function trimKeyStats(keyStats: Record<string, KeyStats>): Record<string, KeyStats> {
  const entries = Object.entries(keyStats).slice(0, 115);
  return Object.fromEntries(entries);
}

function trimDailyStats(
  dailyStats: Record<string, DailyPracticeStat>
): Record<string, DailyPracticeStat> {
  const sorted = Object.entries(dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 365);
  return Object.fromEntries(sorted);
}

function sanitizeFreeHandStats(fh: Partial<FreeHandStats> | undefined): FreeHandStats {
  const base = createEmptyFreeHandStats();
  if (!fh) return base;
  return {
    totalLessons: Math.max(0, Math.round(fh.totalLessons || 0)),
    totalCharsTyped: Math.max(0, Math.round(fh.totalCharsTyped || 0)),
    totalDurationMs: Math.max(0, Number(fh.totalDurationMs || 0)),
    topWpm: Math.min(400, Math.max(0, Number(fh.topWpm || 0))),
    keyStats: trimKeyStats(fh.keyStats || {}),
    dailyStats: trimDailyStats(fh.dailyStats || {}),
  };
}

export async function ensureUserDocument(
  uid: string,
  email: string,
  displayName: string,
  initialSettings: UserSettings = DEFAULT_SETTINGS
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        ownerId: uid,
        displayName: sanitizeDisplayName(displayName),
        email: email.slice(0, 120),
        totalLessons: 0,
        totalCharsTyped: 0,
        totalDurationMs: 0,
        topWpm: 0,
        unlockedChars: [...STARTER_BANGLA_CHARS],
        ignoredChars: [],
        manualFocusChar: '',
        keyStats: {},
        dailyStats: {},
        freeHandStats: createEmptyFreeHandStats(),
        settings: sanitizeSettings(initialSettings),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: Omit<ProfileData, 'lessons'>, settings: UserSettings) => void,
  onMissing: () => void,
  onError: (err: Error) => void
): () => void {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        onMissing();
        return;
      }
      const data = snap.data();
      const createdTs =
        data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

      const profileSlice: Omit<ProfileData, 'lessons'> = {
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Bangla Learner',
        email: typeof data.email === 'string' ? data.email : '',
        createdAt: createdTs,
        totalLessons: typeof data.totalLessons === 'number' ? data.totalLessons : 0,
        totalCharsTyped: typeof data.totalCharsTyped === 'number' ? data.totalCharsTyped : 0,
        totalDurationMs: typeof data.totalDurationMs === 'number' ? data.totalDurationMs : 0,
        topWpm: typeof data.topWpm === 'number' ? data.topWpm : 0,
        unlockedChars: Array.isArray(data.unlockedChars)
          ? data.unlockedChars
          : [...STARTER_BANGLA_CHARS],
        ignoredChars: Array.isArray(data.ignoredChars) ? data.ignoredChars : [],
        manualFocusChar:
          typeof data.manualFocusChar === 'string' && data.manualFocusChar.length > 0
            ? data.manualFocusChar
            : null,
        keyStats: (data.keyStats as Record<string, KeyStats>) || {},
        dailyStats: (data.dailyStats as Record<string, DailyPracticeStat>) || {},
        freeHandStats: sanitizeFreeHandStats(data.freeHandStats as Partial<FreeHandStats> | undefined),
      };

      const settingsSlice = sanitizeSettings({
        ...DEFAULT_SETTINGS,
        ...((data.settings as Partial<UserSettings>) || {}),
      });

      onUpdate(profileSlice, settingsSlice);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export function subscribeToUserLessons(
  uid: string,
  onUpdate: (lessons: LessonRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const lessonsPath = `users/${uid}/lessons`;
  const q = query(
    collection(db, 'users', uid, 'lessons'),
    where('ownerId', '==', uid),
    limit(500)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LessonRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: Number(data.timestamp || Date.now()),
          layout: data.layout || 'jatiya',
          mode: data.mode || 'guided',
          wpm: Number(data.wpm || 0),
          cpm: Number(data.cpm || 0),
          accuracy: Number(data.accuracy || 100),
          errorRate: Number(data.errorRate || 0),
          durationMs: Number(data.durationMs || 0),
          charCount: Number(data.charCount || 0),
          errorCount: Number(data.errorCount || 0),
          focusChar:
            typeof data.focusChar === 'string' && data.focusChar.length > 0
              ? data.focusChar
              : null,
          unlockedChar:
            typeof data.unlockedChar === 'string' && data.unlockedChar.length > 0
              ? data.unlockedChar
              : null,
        };
      });
      items.sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(items.slice(0, 200));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, lessonsPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function saveLessonToFirestore(
  uid: string,
  updatedProfile: ProfileData,
  lesson: LessonRecord
): Promise<void> {
  const userPath = `users/${uid}`;
  const lessonPath = `users/${uid}/lessons/${lesson.id}`;
  const batch = writeBatch(db);

  batch.set(doc(db, 'users', uid, 'lessons', lesson.id), {
    ownerId: uid,
    layout: lesson.layout,
    mode: lesson.mode,
    wpm: Math.min(400, Math.max(0, Number(lesson.wpm || 0))),
    cpm: Math.min(2000, Math.max(0, Number(lesson.cpm || 0))),
    accuracy: Math.min(100, Math.max(0, Number(lesson.accuracy || 0))),
    errorRate: Math.min(100, Math.max(0, Number(lesson.errorRate || 0))),
    durationMs: Math.max(0, Number(lesson.durationMs || 0)),
    charCount: Math.max(0, Math.round(lesson.charCount || 0)),
    errorCount: Math.max(0, Math.round(lesson.errorCount || 0)),
    focusChar: (lesson.focusChar || '').slice(0, 4),
    unlockedChar: (lesson.unlockedChar || '').slice(0, 4),
    timestamp: Number(lesson.timestamp || Date.now()),
    createdAt: serverTimestamp(),
  });

  if (lesson.mode === 'freehand') {
    batch.update(doc(db, 'users', uid), {
      freeHandStats: sanitizeFreeHandStats(updatedProfile.freeHandStats),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(doc(db, 'users', uid), {
      totalLessons: Math.max(0, Math.round(updatedProfile.totalLessons)),
      totalCharsTyped: Math.max(0, Math.round(updatedProfile.totalCharsTyped)),
      totalDurationMs: Math.max(0, Number(updatedProfile.totalDurationMs)),
      topWpm: Math.min(400, Math.max(0, Number(updatedProfile.topWpm))),
      unlockedChars: sanitizeUnlockedChars(updatedProfile.unlockedChars),
      manualFocusChar: (updatedProfile.manualFocusChar || '').slice(0, 4),
      keyStats: trimKeyStats(updatedProfile.keyStats),
      dailyStats: trimDailyStats(updatedProfile.dailyStats),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} + ${lessonPath}`);
  }
}

export async function updateSettingsInFirestore(
  uid: string,
  settings: UserSettings
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      settings: sanitizeSettings(settings),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateDisplayNameInFirestore(
  uid: string,
  displayName: string
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: sanitizeDisplayName(displayName),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateFocusOrUnlockedInFirestore(
  uid: string,
  unlockedChars: string[],
  manualFocusChar: string | null,
  ignoredChars?: string[]
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      unlockedChars: sanitizeUnlockedChars(unlockedChars),
      manualFocusChar: (manualFocusChar || '').slice(0, 4),
      updatedAt: serverTimestamp(),
    };
    if (ignoredChars !== undefined) {
      payload.ignoredChars = sanitizeIgnoredChars(ignoredChars);
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateIgnoredCharsInFirestore(
  uid: string,
  ignoredChars: string[],
  manualFocusChar: string | null
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ignoredChars: sanitizeIgnoredChars(ignoredChars),
      manualFocusChar: (manualFocusChar || '').slice(0, 4),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function importProfileToFirestore(
  uid: string,
  imported: ProfileData
): Promise<void> {
  const userPath = `users/${uid}`;
  const mainImportedLessons = (imported.lessons || []).filter((l) => l.mode !== 'freehand');
  const totalLessons =
    typeof imported.totalLessons === 'number'
      ? Math.round(imported.totalLessons)
      : mainImportedLessons.length;
  const totalCharsTyped =
    typeof imported.totalCharsTyped === 'number'
      ? Math.round(imported.totalCharsTyped)
      : mainImportedLessons.reduce((a, l) => a + Math.round(l.charCount || 0), 0);
  const totalDurationMs =
    typeof imported.totalDurationMs === 'number'
      ? imported.totalDurationMs
      : mainImportedLessons.reduce((a, l) => a + Number(l.durationMs || 0), 0);
  const topWpm =
    typeof imported.topWpm === 'number'
      ? imported.topWpm
      : mainImportedLessons.reduce((m, l) => Math.max(m, Number(l.wpm || 0)), 0);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    displayName: sanitizeDisplayName(imported.displayName || 'Bangla Learner'),
    totalLessons: Math.max(0, totalLessons),
    totalCharsTyped: Math.max(0, totalCharsTyped),
    totalDurationMs: Math.max(0, totalDurationMs),
    topWpm: Math.min(400, Math.max(0, topWpm)),
    unlockedChars: sanitizeUnlockedChars(imported.unlockedChars || []),
    ignoredChars: sanitizeIgnoredChars(imported.ignoredChars || []),
    manualFocusChar: (imported.manualFocusChar || '').slice(0, 4),
    keyStats: trimKeyStats(imported.keyStats || {}),
    dailyStats: trimDailyStats(imported.dailyStats || {}),
    freeHandStats: sanitizeFreeHandStats(imported.freeHandStats),
    updatedAt: serverTimestamp(),
  });

  for (const lesson of (imported.lessons || []).slice(0, 100)) {
    const cleanId = String(lesson.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);
    batch.set(doc(db, 'users', uid, 'lessons', cleanId), {
      ownerId: uid,
      layout: ['probhat', 'unijoy', 'jatiya', 'ime'].includes(lesson.layout)
        ? lesson.layout
        : 'jatiya',
      mode: ['guided', 'freehand', 'all', 'conjuncts', 'custom'].includes(lesson.mode)
        ? lesson.mode
        : 'guided',
      wpm: Math.min(400, Math.max(0, Number(lesson.wpm || 0))),
      cpm: Math.min(2000, Math.max(0, Number(lesson.cpm || 0))),
      accuracy: Math.min(100, Math.max(0, Number(lesson.accuracy || 0))),
      errorRate: Math.min(100, Math.max(0, Number(lesson.errorRate || 0))),
      durationMs: Math.max(0, Number(lesson.durationMs || 0)),
      charCount: Math.max(0, Math.round(lesson.charCount || 0)),
      errorCount: Math.max(0, Math.round(lesson.errorCount || 0)),
      focusChar: (lesson.focusChar || '').slice(0, 4),
      unlockedChar: (lesson.unlockedChar || '').slice(0, 4),
      timestamp: Number(lesson.timestamp || Date.now()),
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function resetMainProfileInFirestore(uid: string): Promise<void> {
  const lessonsPath = `users/${uid}/lessons`;
  try {
    const snap = await getDocs(
      query(collection(db, 'users', uid, 'lessons'), where('ownerId', '==', uid))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (d.data().mode !== 'freehand') {
        batch.delete(d.ref);
      }
    });
    batch.update(doc(db, 'users', uid), {
      totalLessons: 0,
      totalCharsTyped: 0,
      totalDurationMs: 0,
      topWpm: 0,
      unlockedChars: [...STARTER_BANGLA_CHARS],
      ignoredChars: [],
      manualFocusChar: '',
      keyStats: {},
      dailyStats: {},
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, lessonsPath);
  }
}

export async function resetFreeHandStatsInFirestore(uid: string): Promise<void> {
  const lessonsPath = `users/${uid}/lessons`;
  try {
    const snap = await getDocs(
      query(collection(db, 'users', uid, 'lessons'), where('ownerId', '==', uid))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (d.data().mode === 'freehand') {
        batch.delete(d.ref);
      }
    });
    batch.update(doc(db, 'users', uid), {
      freeHandStats: createEmptyFreeHandStats(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, lessonsPath);
  }
}
