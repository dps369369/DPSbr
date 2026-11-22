import {
  BANGLA_CONJUNCT_WORDS,
  BANGLA_LESSON_CHARS,
  BANGLA_WORDS,
  SAMPLE_CUSTOM_TEXTS,
  STARTER_BANGLA_CHARS,
  tokenizeWords,
} from '../data/banglaCorpus';
import {
  DailyPracticeStat,
  FreeHandStats,
  KeyStats,
  LessonRecord,
  PracticeMode,
  ProfileData,
  UserSettings,
  WordToken,
} from '../types/typing';

const PROFILE_STORAGE_KEY = 'dpsbr_profile_v1';
const SETTINGS_STORAGE_KEY = 'dpsbr_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  layout: 'jatiya',
  practiceMode: 'guided',
  targetWpm: 30,
  dailyGoalMinutes: 15,
  lessonWordCount: 20,
  showKeyboard: true,
  showFingerColors: true,
  showKeystrokeHints: true,
  soundEnabled: false,
  stopOnError: true,
  includePunctuation: false,
  theme: 'light',
  customText: SAMPLE_CUSTOM_TEXTS[0].text,
  freeHandChars: ['ক', 'ত'],
};

export function createEmptyFreeHandStats(): FreeHandStats {
  return {
    totalLessons: 0,
    totalCharsTyped: 0,
    totalDurationMs: 0,
    topWpm: 0,
    keyStats: {},
    dailyStats: {},
  };
}

export function createInitialProfile(email = '', displayName = 'Bangla Learner'): ProfileData {
  return {
    displayName,
    email,
    createdAt: Date.now(),
    totalLessons: 0,
    totalCharsTyped: 0,
    totalDurationMs: 0,
    topWpm: 0,
    unlockedChars: [...STARTER_BANGLA_CHARS],
    manualFocusChar: null,
    keyStats: {},
    lessons: [],
    dailyStats: {},
    freeHandStats: createEmptyFreeHandStats(),
  };
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}

export function loadProfile(): ProfileData {
  if (typeof window === 'undefined') return createInitialProfile();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return createInitialProfile();
    const parsed = JSON.parse(raw) as Partial<ProfileData>;
    return {
      ...createInitialProfile(),
      ...parsed,
      unlockedChars:
        parsed.unlockedChars && parsed.unlockedChars.length >= STARTER_BANGLA_CHARS.length
          ? parsed.unlockedChars
          : [...STARTER_BANGLA_CHARS],
      freeHandStats: parsed.freeHandStats || createEmptyFreeHandStats(),
    };
  } catch {
    return createInitialProfile();
  }
}

export function saveProfile(profile: ProfileData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Keybr-style confidence calculation (0..1) for a Bangla character.
 * Combines speed relative to targetWpm and accuracy penalty.
 */
export function getCharConfidence(stats: KeyStats | undefined, targetWpm: number): number {
  if (!stats || stats.hits < 6) return 0;
  const totalAttempts = stats.hits + stats.misses;
  const accuracy = totalAttempts > 0 ? stats.hits / totalAttempts : 0;
  const speedRatio = Math.min(1, stats.recentWpm / Math.max(10, targetWpm));
  const accuracyFactor = accuracy >= 0.9 ? 1 : Math.max(0.25, accuracy / 0.9);
  const sampleFactor = Math.min(1, stats.hits / 14);
  return Math.min(1, speedRatio * accuracyFactor * sampleFactor);
}

export function getCharAverageWpm(stats: KeyStats | undefined): number {
  if (!stats || stats.hits === 0) return 0;
  if (stats.recentWpm > 0) return Math.round(stats.recentWpm);
  if (stats.totalTimeMs <= 0) return 0;
  const minutes = stats.totalTimeMs / 60000;
  return Math.round(stats.hits / 5 / minutes);
}

export function getCharErrorRate(stats: KeyStats | undefined): number {
  if (!stats) return 0;
  const total = stats.hits + stats.misses;
  if (total === 0) return 0;
  return (stats.misses / total) * 100;
}

/**
 * Determines the current active focus character:
 * Either user's manually selected focus character, or the unlocked character with lowest confidence.
 */
export function selectFocusChar(profile: ProfileData, targetWpm: number): string {
  if (profile.manualFocusChar && profile.unlockedChars.includes(profile.manualFocusChar)) {
    return profile.manualFocusChar;
  }

  let weakest = profile.unlockedChars[profile.unlockedChars.length - 1] || STARTER_BANGLA_CHARS[0];
  let lowestConf = Infinity;

  for (const ch of profile.unlockedChars) {
    const conf = getCharConfidence(profile.keyStats[ch], targetWpm);
    if (conf < lowestConf) {
      lowestConf = conf;
      weakest = ch;
    }
  }
  return weakest;
}

/**
 * Checks if all unlocked keys have reached sufficient confidence (>= 0.85) to unlock the next Bangla key.
 */
export function checkAndUnlockNextChar(
  profile: ProfileData,
  targetWpm: number
): { updatedProfile: ProfileData; newlyUnlocked: string | null } {
  if (profile.unlockedChars.length >= BANGLA_LESSON_CHARS.length) {
    return { updatedProfile: profile, newlyUnlocked: null };
  }

  const allReady = profile.unlockedChars.every((ch) => {
    const conf = getCharConfidence(profile.keyStats[ch], targetWpm);
    return conf >= 0.82;
  });

  if (!allReady) {
    return { updatedProfile: profile, newlyUnlocked: null };
  }

  const nextChar = BANGLA_LESSON_CHARS.find((ch) => !profile.unlockedChars.includes(ch));
  if (!nextChar) {
    return { updatedProfile: profile, newlyUnlocked: null };
  }

  return {
    updatedProfile: {
      ...profile,
      unlockedChars: [...profile.unlockedChars, nextChar],
      manualFocusChar: null,
    },
    newlyUnlocked: nextChar,
  };
}

function isWordAllowed(word: string, allowedSet: Set<string>): boolean {
  const chars = Array.from(word);
  return chars.every((c) => allowedSet.has(c));
}

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Generates an adaptive lesson of Bangla words tailored to the user's current unlocked set & focus character.
 */
const DEPENDENT_SIGNS = new Set([
  'া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ং', 'ঃ', 'ঁ', '্',
]);

function generateFreeHandWords(selectedChars: string[], wordCount: number): WordToken[] {
  const pool = Array.from(new Set(selectedChars)).filter((c) => c.length > 0);
  const effectivePool = pool.length >= 2 ? pool : ['ক', 'ত'];

  const bases = effectivePool.filter((c) => !DEPENDENT_SIGNS.has(c));
  const signs = effectivePool.filter((c) => DEPENDENT_SIGNS.has(c));
  const selectedSet = new Set(effectivePool);
  const matchingRealWords = BANGLA_WORDS.filter((w) => isWordAllowed(w, selectedSet));

  const picked: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    // Mix in real words occasionally when >= 3 chars yield natural matches
    if (matchingRealWords.length >= 3 && i % 3 === 2) {
      picked.push(matchingRealWords[Math.floor(Math.random() * matchingRealWords.length)]);
      continue;
    }

    const len = 2 + (i % 3); // 2, 3, or 4 chars for rhythmic hand drills
    let token = '';

    if (bases.length > 0 && signs.length > 0) {
      // Build natural consonant/vowel + kar combinations without broken leading kar signs
      for (let j = 0; j < len; j++) {
        const prevChar = token ? Array.from(token).pop() || '' : '';
        const prevIsSign = DEPENDENT_SIGNS.has(prevChar);

        if (j === 0 || prevIsSign || Math.random() < 0.55) {
          token += bases[Math.floor(Math.random() * bases.length)];
        } else {
          const sign = signs[Math.floor(Math.random() * signs.length)];
          if (sign === '্') {
            // Hasanta should connect two consonants
            token += '্' + bases[Math.floor(Math.random() * bases.length)];
            j++;
          } else {
            token += sign;
          }
        }
      }
    } else if (bases.length >= 2) {
      // Pure base-character combinations (e.g., কত, তক, কতক, তকত, কতকত)
      if (bases.length === 2 && i < 6) {
        const [a, b] = bases;
        const patterns = [`${a}${b}`, `${b}${a}`, `${a}${b}${a}`, `${b}${a}${b}`, `${a}${a}${b}`, `${b}${b}${a}`];
        token = patterns[i % patterns.length];
      } else {
        for (let j = 0; j < len; j++) {
          token += bases[Math.floor(Math.random() * bases.length)];
        }
      }
    } else {
      for (let j = 0; j < len; j++) {
        token += effectivePool[Math.floor(Math.random() * effectivePool.length)];
      }
    }

    // Ensure at least 2 distinct characters appear frequently across short drills
    if (picked.length > 0 && token === picked[picked.length - 1] && effectivePool.length >= 2) {
      const reversed = Array.from(token).reverse().join('');
      if (reversed !== token && !DEPENDENT_SIGNS.has(Array.from(reversed)[0] || '')) {
        token = reversed;
      }
    }

    picked.push(token);
  }

  return tokenizeWords(picked.join(' '));
}

export function generateLessonWords(
  profile: ProfileData,
  settings: UserSettings
): { words: WordToken[]; focusChar: string | null } {
  const mode: PracticeMode = settings.practiceMode;
  const wordCount = Math.max(8, Math.min(45, settings.lessonWordCount));

  if (mode === 'freehand') {
    const chars =
      settings.freeHandChars && settings.freeHandChars.length >= 2
        ? settings.freeHandChars
        : ['ক', 'ত'];
    return {
      words: generateFreeHandWords(chars, wordCount),
      focusChar: chars[0] || null,
    };
  }

  if (mode === 'custom') {
    const custom = settings.customText.trim() || SAMPLE_CUSTOM_TEXTS[0].text;
    return {
      words: tokenizeWords(custom).slice(0, 50),
      focusChar: null,
    };
  }

  if (mode === 'conjuncts') {
    const pool = [...BANGLA_CONJUNCT_WORDS];
    const picked: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      picked.push(w);
    }
    return {
      words: tokenizeWords(picked.join(' ')),
      focusChar: '্',
    };
  }

  if (mode === 'all') {
    const pool = [...BANGLA_WORDS];
    const picked: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      let w = pool[Math.floor(Math.random() * pool.length)];
      if (settings.includePunctuation && i > 0 && (i + 1) % 7 === 0) {
        w += i === wordCount - 1 ? '।' : ',';
      }
      if (settings.includePunctuation && i > 0 && i % 11 === 0) {
        const d1 = BANGLA_DIGITS[Math.floor(Math.random() * 9) + 1];
        const d2 = BANGLA_DIGITS[Math.floor(Math.random() * 10)];
        picked.push(`${d1}${d2}`);
        continue;
      }
      picked.push(w);
    }
    return {
      words: tokenizeWords(picked.join(' ')),
      focusChar: selectFocusChar(profile, settings.targetWpm),
    };
  }

  // Guided (Keybr adaptive) mode
  const focusChar = selectFocusChar(profile, settings.targetWpm);
  const allowedSet = new Set(profile.unlockedChars);

  let validWords = BANGLA_WORDS.filter((w) => isWordAllowed(w, allowedSet));

  // If current newly unlocked letter has few full matches yet, expand slightly to words where at most 1 char is outside
  if (validWords.length < 8) {
    validWords = BANGLA_WORDS.filter((w) => {
      const chars = Array.from(w);
      const missing = chars.filter((c) => !allowedSet.has(c));
      return missing.length <= 1;
    });
  }

  const focusWords = validWords.filter((w) => w.includes(focusChar));
  const nonFocusWords = validWords.filter((w) => !w.includes(focusChar));

  const picked: string[] = [];
  let lastWord = '';

  for (let i = 0; i < wordCount; i++) {
    const useFocus = focusWords.length > 0 && (nonFocusWords.length === 0 || Math.random() < 0.7);
    const source = useFocus ? focusWords : nonFocusWords;
    let candidate = source[Math.floor(Math.random() * source.length)] || validWords[0] || 'কাম';
    if (source.length > 1 && candidate === lastWord) {
      candidate = source[(source.indexOf(candidate) + 1) % source.length];
    }
    lastWord = candidate;

    if (settings.includePunctuation && (i + 1) % 8 === 0) {
      candidate += i === wordCount - 1 ? '।' : ',';
    }
    picked.push(candidate);
  }

  return {
    words: tokenizeWords(picked.join(' ')),
    focusChar,
  };
}

export function getTodayDateKey(ts = Date.now()): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function mergeKeyStats(
  existingStats: Record<string, KeyStats>,
  perCharUpdates: Record<string, { hits: number; misses: number; totalTimeMs: number }>,
  timestamp: number
): Record<string, KeyStats> {
  const nextKeyStats: Record<string, KeyStats> = { ...existingStats };

  for (const [ch, delta] of Object.entries(perCharUpdates)) {
    const prev = nextKeyStats[ch] || {
      char: ch,
      hits: 0,
      misses: 0,
      totalTimeMs: 0,
      recentWpm: 0,
      lastPracticedAt: timestamp,
    };

    const hits = prev.hits + delta.hits;
    const misses = prev.misses + delta.misses;
    const totalTimeMs = prev.totalTimeMs + delta.totalTimeMs;

    let sessionCharWpm = prev.recentWpm;
    if (delta.hits > 0 && delta.totalTimeMs > 0) {
      const mins = delta.totalTimeMs / 60000;
      const rawWpm = Math.min(160, Math.max(5, delta.hits / 5 / mins));
      sessionCharWpm = prev.recentWpm > 0 ? prev.recentWpm * 0.65 + rawWpm * 0.35 : rawWpm;
    }

    nextKeyStats[ch] = {
      char: ch,
      hits,
      misses,
      totalTimeMs,
      recentWpm: sessionCharWpm,
      lastPracticedAt: timestamp,
    };
  }

  return nextKeyStats;
}

function mergeDailyStats(
  existingDaily: Record<string, DailyPracticeStat>,
  lesson: LessonRecord
): Record<string, DailyPracticeStat> {
  const dateKey = getTodayDateKey(lesson.timestamp);
  const prevDaily = existingDaily[dateKey] || {
    date: dateKey,
    durationMs: 0,
    lessons: 0,
    charsTyped: 0,
    avgWpm: 0,
  };
  const nextDailyLessons = prevDaily.lessons + 1;
  const nextDailyAvgWpm =
    (prevDaily.avgWpm * prevDaily.lessons + lesson.wpm) / nextDailyLessons;

  return {
    ...existingDaily,
    [dateKey]: {
      date: dateKey,
      durationMs: prevDaily.durationMs + lesson.durationMs,
      lessons: nextDailyLessons,
      charsTyped: prevDaily.charsTyped + lesson.charCount,
      avgWpm: Math.round(nextDailyAvgWpm * 10) / 10,
    },
  };
}

export function recordLessonResult(
  profile: ProfileData,
  lesson: LessonRecord,
  perCharUpdates: Record<string, { hits: number; misses: number; totalTimeMs: number }>,
  targetWpm: number
): { updatedProfile: ProfileData; newlyUnlocked: string | null } {
  // Free Hand mode maintains its own isolated statistics and never alters main DPSbr stats
  if (lesson.mode === 'freehand') {
    const prevFree = profile.freeHandStats || createEmptyFreeHandStats();
    const nextFreeKeyStats = mergeKeyStats(
      prevFree.keyStats || {},
      perCharUpdates,
      lesson.timestamp
    );
    const nextFreeDailyStats = mergeDailyStats(prevFree.dailyStats || {}, lesson);

    const nextProfile: ProfileData = {
      ...profile,
      lessons: [lesson, ...profile.lessons].slice(0, 300),
      freeHandStats: {
        totalLessons: (prevFree.totalLessons || 0) + 1,
        totalCharsTyped: (prevFree.totalCharsTyped || 0) + Math.round(lesson.charCount),
        totalDurationMs: (prevFree.totalDurationMs || 0) + Math.round(lesson.durationMs),
        topWpm: Math.min(400, Math.max(prevFree.topWpm || 0, lesson.wpm)),
        keyStats: nextFreeKeyStats,
        dailyStats: nextFreeDailyStats,
      },
    };

    return { updatedProfile: nextProfile, newlyUnlocked: null };
  }

  // Main DPSbr modes (guided, all, conjuncts, custom)
  const nextKeyStats = mergeKeyStats(profile.keyStats, perCharUpdates, lesson.timestamp);
  const nextDailyStats = mergeDailyStats(profile.dailyStats, lesson);
  const existingMainLessons = profile.lessons.filter((l) => l.mode !== 'freehand').length;

  let nextProfile: ProfileData = {
    ...profile,
    totalLessons: Math.max(profile.totalLessons || 0, existingMainLessons) + 1,
    totalCharsTyped: (profile.totalCharsTyped || 0) + Math.round(lesson.charCount),
    totalDurationMs: (profile.totalDurationMs || 0) + Math.round(lesson.durationMs),
    topWpm: Math.min(400, Math.max(profile.topWpm || 0, lesson.wpm)),
    keyStats: nextKeyStats,
    lessons: [lesson, ...profile.lessons].slice(0, 300),
    dailyStats: nextDailyStats,
  };

  if (lesson.mode === 'guided') {
    const unlockCheck = checkAndUnlockNextChar(nextProfile, targetWpm);
    nextProfile = unlockCheck.updatedProfile;
    if (unlockCheck.newlyUnlocked && nextProfile.lessons.length > 0) {
      nextProfile.lessons[0] = {
        ...nextProfile.lessons[0],
        unlockedChar: unlockCheck.newlyUnlocked,
      };
    }
    return {
      updatedProfile: nextProfile,
      newlyUnlocked: unlockCheck.newlyUnlocked,
    };
  }

  return { updatedProfile: nextProfile, newlyUnlocked: null };
}
