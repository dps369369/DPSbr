export type LayoutId = 'probhat' | 'unijoy' | 'jatiya' | 'ime';

export type PracticeMode = 'guided' | 'freehand' | 'all' | 'conjuncts' | 'custom';

export type NavTab = 'practice' | 'profile' | 'layouts' | 'guide';

export type FingerZone =
  | 'pinky-l'
  | 'ring-l'
  | 'middle-l'
  | 'index-l'
  | 'thumb'
  | 'index-r'
  | 'middle-r'
  | 'ring-r'
  | 'pinky-r';

export interface PhysicalKeyDef {
  code: string;
  key: string;
  shiftKey: string;
  label: string;
  width?: number; // multiplier in key units (1 = standard key)
  finger: FingerZone;
  isModifier?: boolean;
}

export interface BanglaKeyMapping {
  normal: string;
  shift: string;
}

export interface LayoutDefinition {
  id: LayoutId;
  name: string;
  banglaName: string;
  subtitle: string;
  description: string;
  usesLinkComposition: boolean; // true for Unijoy & Jatiya (g + kar -> standalone vowel)
  linkKeyCode?: string; // e.g., 'KeyG'
  keymap: Record<string, BanglaKeyMapping>; // keyed by KeyboardEvent.code
}

export interface KeystrokeInstruction {
  targetChar: string;
  displayHint: string;
  sequence: Array<{
    code: string;
    keyLabel: string;
    shift: boolean;
    finger: FingerZone;
    outputLabel: string;
  }>;
}

export interface KeyStats {
  char: string;
  hits: number;
  misses: number;
  totalTimeMs: number;
  recentWpm: number; // EWMA speed for this character
  lastPracticedAt: number;
}

export interface LessonRecord {
  id: string;
  timestamp: number;
  layout: LayoutId;
  mode: PracticeMode;
  wpm: number;
  cpm: number;
  accuracy: number;
  errorRate: number;
  durationMs: number;
  charCount: number;
  errorCount: number;
  focusChar: string | null;
  unlockedChar: string | null;
}

export interface DailyPracticeStat {
  date: string; // YYYY-MM-DD
  durationMs: number;
  lessons: number;
  charsTyped: number;
  avgWpm: number;
}

export interface UserSettings {
  layout: LayoutId;
  practiceMode: PracticeMode;
  targetWpm: number; // 15..80 (default 30)
  dailyGoalMinutes: number; // 5..60 (default 15)
  lessonWordCount: number; // 15..40 (default 22)
  showKeyboard: boolean;
  showFingerColors: boolean;
  showKeystrokeHints: boolean;
  soundEnabled: boolean;
  stopOnError: boolean;
  includePunctuation: boolean;
  theme: 'light' | 'dark';
  customText: string;
  freeHandChars: string[];
}

export interface FreeHandStats {
  totalLessons: number;
  totalCharsTyped: number;
  totalDurationMs: number;
  topWpm: number;
  keyStats: Record<string, KeyStats>;
  dailyStats: Record<string, DailyPracticeStat>;
}

export interface ProfileData {
  displayName: string;
  email: string;
  createdAt: number;
  totalLessons: number;
  totalCharsTyped: number;
  totalDurationMs: number;
  topWpm: number;
  unlockedChars: string[];
  ignoredChars: string[];
  manualFocusChar: string | null;
  keyStats: Record<string, KeyStats>;
  lessons: LessonRecord[];
  dailyStats: Record<string, DailyPracticeStat>;
  freeHandStats: FreeHandStats;
}

export interface GraphemeToken {
  grapheme: string;
  codepoints: string[];
}

export interface WordToken {
  word: string;
  clusters: GraphemeToken[];
  codepoints: string[];
}
