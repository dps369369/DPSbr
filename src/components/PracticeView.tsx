import {
  CheckCircle2,
  Keyboard as KeyboardIcon,
  Lock,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BANGLA_LESSON_CHARS } from '../data/banglaCorpus';
import {
  BANGLA_LAYOUTS,
  findKeystrokeForBanglaChar,
  FINGER_LABELS,
  getCharNameEnglish,
  LINK_VOWEL_COMPOSITION,
  mapPhysicalKeyToBangla,
  VOWEL_TO_KAR,
} from '../data/banglaLayouts';
import {
  LayoutId,
  LessonRecord,
  PracticeMode,
  ProfileData,
  UserSettings,
  WordToken,
} from '../types/typing';
import {
  generateLessonWords,
  getCharAverageWpm,
  getCharConfidence,
  getCharErrorRate,
  getTodayDateKey,
} from '../utils/adaptiveEngine';
import { soundEffects } from '../utils/soundEffects';
import { KeyboardVisual } from './KeyboardVisual';

interface PracticeViewProps {
  profile: ProfileData;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onCompleteLesson: (
    lesson: LessonRecord,
    perCharUpdates: Record<string, { hits: number; misses: number; totalTimeMs: number }>
  ) => string | null;
  onSelectFocusChar: (ch: string | null) => void;
  onUnlockUpToChar: (ch: string) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

interface TargetStep {
  wordIndex: number;
  clusterIndex: number;
  char: string;
  isSpace: boolean;
}

export function PracticeView({
  profile,
  settings,
  onUpdateSettings,
  onCompleteLesson,
  onSelectFocusChar,
  onUnlockUpToChar,
  onOpenProfile,
  onOpenSettings,
}: PracticeViewProps) {
  const [lessonData, setLessonData] = useState<{
    words: WordToken[];
    focusChar: string | null;
  }>(() => generateLessonWords(profile, settings));

  const [cursor, setCursor] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastKeyAt, setLastKeyAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [pendingLinkCompose, setPendingLinkCompose] = useState(false);

  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});
  const [currentStepMistake, setCurrentStepMistake] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [totalMisses, setTotalMisses] = useState(0);

  const [lastPressedCode, setLastPressedCode] = useState<string | null>(null);
  const [lastPressedError, setLastPressedError] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  const [completedBanner, setCompletedBanner] = useState<{
    wpm: number;
    accuracy: number;
    errors: number;
    newlyUnlocked: string | null;
  } | null>(null);

  const perCharStatsRef = useRef<
    Record<string, { hits: number; misses: number; totalTimeMs: number }>
  >({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [imeInputValue, setImeInputValue] = useState('');
  const isComposingRef = useRef(false);

  // Flatten words into target keystroke steps
  const targets = useMemo<TargetStep[]>(() => {
    const list: TargetStep[] = [];
    lessonData.words.forEach((wordObj, wIdx) => {
      wordObj.clusters.forEach((cluster, cIdx) => {
        cluster.codepoints.forEach((cp) => {
          list.push({
            wordIndex: wIdx,
            clusterIndex: cIdx,
            char: cp,
            isSpace: false,
          });
        });
      });
      if (wIdx < lessonData.words.length - 1) {
        list.push({
          wordIndex: wIdx,
          clusterIndex: -1,
          char: ' ',
          isSpace: true,
        });
      }
    });
    return list;
  }, [lessonData.words]);

  // Compute cluster step ranges for rendering without splitting Bangla ligatures
  const wordClusterRanges = useMemo(() => {
    let idx = 0;
    return lessonData.words.map((wordObj) => {
      const clusters = wordObj.clusters.map((cluster) => {
        const start = idx;
        const end = idx + cluster.codepoints.length;
        idx = end;
        return {
          grapheme: cluster.grapheme,
          start,
          end,
          length: cluster.codepoints.length,
        };
      });
      const spaceIndex = idx;
      if (idx < targets.length && targets[idx]?.isSpace) {
        idx += 1;
      }
      return { clusters, spaceIndex };
    });
  }, [lessonData.words, targets]);

  const resetLesson = useCallback(
    (keepBanner = false) => {
      const next = generateLessonWords(profile, settings);
      setLessonData(next);
      setCursor(0);
      setStartedAt(null);
      setLastKeyAt(null);
      setPendingLinkCompose(false);
      setStepErrors({});
      setCurrentStepMistake(false);
      setTotalHits(0);
      setTotalMisses(0);
      setImeInputValue('');
      perCharStatsRef.current = {};
      if (!keepBanner) {
        setCompletedBanner(null);
      }
      setTimeout(() => inputRef.current?.focus(), 20);
    },
    [profile, settings]
  );

  // Regenerate lesson when key mode/layout/customText/wordCount changes
  const prevSettingsKey = useRef(
    `${settings.practiceMode}-${settings.lessonWordCount}-${settings.includePunctuation}-${settings.customText}-${profile.manualFocusChar}`
  );
  useEffect(() => {
    const nextKey = `${settings.practiceMode}-${settings.lessonWordCount}-${settings.includePunctuation}-${settings.customText}-${profile.manualFocusChar}`;
    if (nextKey !== prevSettingsKey.current) {
      prevSettingsKey.current = nextKey;
      resetLesson();
    }
  }, [
    settings.practiceMode,
    settings.lessonWordCount,
    settings.includePunctuation,
    settings.customText,
    profile.manualFocusChar,
    resetLesson,
  ]);

  // Live WPM ticker while actively typing
  useEffect(() => {
    if (!startedAt || cursor >= targets.length) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAt, cursor, targets.length]);

  // Clear pressed key visual flash
  useEffect(() => {
    if (!lastPressedCode) return;
    const id = window.setTimeout(() => {
      setLastPressedCode(null);
      setLastPressedError(false);
    }, 150);
    return () => window.clearTimeout(id);
  }, [lastPressedCode]);

  const finishLesson = useCallback(
    (finalHits: number, finalMisses: number, endTimestamp: number) => {
      const start = startedAt ?? endTimestamp - 1000;
      const durationMs = Math.max(800, endTimestamp - start);
      const minutes = durationMs / 60000;
      const wpm = Math.round(finalHits / 5 / minutes);
      const cpm = Math.round(finalHits / minutes);
      const totalAttempts = finalHits + finalMisses;
      const accuracy =
        totalAttempts > 0 ? Math.round((finalHits / totalAttempts) * 1000) / 10 : 100;
      const errorRate = Math.round((100 - accuracy) * 10) / 10;

      const record: LessonRecord = {
        id: `lsn_${endTimestamp}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: endTimestamp,
        layout: settings.layout,
        mode: settings.practiceMode,
        wpm,
        cpm,
        accuracy,
        errorRate,
        durationMs,
        charCount: targets.length,
        errorCount: finalMisses,
        focusChar: lessonData.focusChar,
        unlockedChar: null,
      };

      const unlocked = onCompleteLesson(record, perCharStatsRef.current);
      if (unlocked && settings.soundEnabled) {
        soundEffects.playUnlockChime();
      }

      setCompletedBanner({
        wpm,
        accuracy,
        errors: finalMisses,
        newlyUnlocked: unlocked,
      });

      // Immediately generate next lesson ready to type
      const next = generateLessonWords(
        unlocked
          ? {
              ...profile,
              unlockedChars: [...profile.unlockedChars, unlocked],
            }
          : profile,
        settings
      );
      setLessonData(next);
      setCursor(0);
      setStartedAt(null);
      setLastKeyAt(null);
      setPendingLinkCompose(false);
      setStepErrors({});
      setCurrentStepMistake(false);
      setTotalHits(0);
      setTotalMisses(0);
      setImeInputValue('');
      perCharStatsRef.current = {};
    },
    [
      startedAt,
      settings,
      targets.length,
      lessonData.focusChar,
      onCompleteLesson,
      profile,
    ]
  );

  const processTypedChar = useCallback(
    (typedChar: string, physicalCode: string | null) => {
      if (cursor >= targets.length) return;
      const target = targets[cursor];
      const now = Date.now();
      const firstHit = startedAt === null;
      const effectiveStart = firstHit ? now : startedAt;
      const deltaMs = lastKeyAt ? Math.min(3500, Math.max(40, now - lastKeyAt)) : 280;

      if (firstHit) {
        setStartedAt(now);
        setNowTick(now);
        setCompletedBanner(null);
      }
      setLastKeyAt(now);

      const expected = target.char;
      const isCorrect = typedChar === expected;

      if (!target.isSpace) {
        if (!perCharStatsRef.current[expected]) {
          perCharStatsRef.current[expected] = { hits: 0, misses: 0, totalTimeMs: 0 };
        }
      }

      if (isCorrect) {
        if (settings.soundEnabled) {
          soundEffects.playKeyClick();
        }
        if (physicalCode) {
          setLastPressedCode(physicalCode);
          setLastPressedError(false);
        }

        const nextHits = totalHits + 1;
        setTotalHits(nextHits);
        setCurrentStepMistake(false);

        if (!target.isSpace) {
          perCharStatsRef.current[expected].hits += 1;
          perCharStatsRef.current[expected].totalTimeMs += deltaMs;
        }

        const nextCursor = cursor + 1;
        setCursor(nextCursor);

        if (nextCursor >= targets.length) {
          finishLesson(nextHits, totalMisses, now);
        }
      } else {
        if (settings.soundEnabled) {
          soundEffects.playErrorTone();
        }
        if (physicalCode) {
          setLastPressedCode(physicalCode);
          setLastPressedError(true);
        }

        const nextMisses = totalMisses + 1;
        setTotalMisses(nextMisses);
        setStepErrors((prev) => ({ ...prev, [cursor]: true }));
        setCurrentStepMistake(true);

        if (!target.isSpace) {
          perCharStatsRef.current[expected].misses += 1;
        }

        if (!settings.stopOnError) {
          const nextCursor = cursor + 1;
          setCursor(nextCursor);
          if (nextCursor >= targets.length) {
            finishLesson(totalHits, nextMisses, now);
          }
        } else {
          // Keep effectiveStart synced if first key was error
          if (firstHit) {
            setStartedAt(effectiveStart);
          }
        }
      }
    },
    [
      cursor,
      targets,
      startedAt,
      lastKeyAt,
      settings.soundEnabled,
      settings.stopOnError,
      totalHits,
      totalMisses,
      finishLesson,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      resetLesson();
      return;
    }

    if (e.key === 'Backspace') {
      if (settings.layout !== 'ime' && !settings.stopOnError && cursor > 0) {
        e.preventDefault();
        setPendingLinkCompose(false);
        setCursor((c) => Math.max(0, c - 1));
      }
      return;
    }

    // Ignore modifier/navigation keys
    if (
      e.key === 'Shift' ||
      e.key === 'CapsLock' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key.startsWith('Arrow')
    ) {
      return;
    }

    // If user is in System IME mode, let the <input> handle native IME composition
    if (settings.layout === 'ime') {
      return;
    }

    e.preventDefault();

    // If user typed direct Bengali Unicode via OS keyboard even in fixed mode, accept directly
    if (/^[\u0980-\u09FF]$/.test(e.key)) {
      setPendingLinkCompose(false);
      processTypedChar(e.key, e.code);
      return;
    }

    const mapped = mapPhysicalKeyToBangla(settings.layout, e.code, e.shiftKey);
    if (!mapped) return;

    const layoutDef = BANGLA_LAYOUTS[settings.layout];
    const currentExpected = targets[cursor]?.char;

    // Handle Unijoy/Jatiya link composition for standalone vowels (e.g., g + া = আ)
    if (
      layoutDef.usesLinkComposition &&
      currentExpected &&
      VOWEL_TO_KAR[currentExpected]
    ) {
      if (!pendingLinkCompose && e.code === layoutDef.linkKeyCode && !e.shiftKey) {
        setPendingLinkCompose(true);
        setLastPressedCode(e.code);
        setLastPressedError(false);
        if (settings.soundEnabled) soundEffects.playKeyClick();
        return;
      }

      if (pendingLinkCompose) {
        setPendingLinkCompose(false);
        const composedVowel = LINK_VOWEL_COMPOSITION[mapped];
        if (composedVowel) {
          processTypedChar(composedVowel, e.code);
          return;
        }
      }
    } else {
      setPendingLinkCompose(false);
    }

    processTypedChar(mapped, e.code);
  };

  // System IME text change handler
  const handleImeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settings.layout !== 'ime') return;
    const val = e.target.value;
    if (isComposingRef.current) {
      setImeInputValue(val);
      return;
    }
    if (val.length > 0) {
      for (const ch of Array.from(val)) {
        processTypedChar(ch, null);
      }
      setImeInputValue('');
    }
  };

  const handleImeCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    if (settings.layout !== 'ime') return;
    const val = e.data || imeInputValue;
    if (val.length > 0) {
      for (const ch of Array.from(val)) {
        processTypedChar(ch, null);
      }
    }
    setImeInputValue('');
  };

  // Current live metrics
  const elapsedMs = startedAt ? Math.max(500, nowTick - startedAt) : 0;
  const liveWpm =
    startedAt && totalHits > 0 ? Math.round(totalHits / 5 / (elapsedMs / 60000)) : 0;
  const totalAttempts = totalHits + totalMisses;
  const liveAccuracy =
    totalAttempts > 0 ? Math.round((totalHits / totalAttempts) * 1000) / 10 : 100;

  const todayStats = profile.dailyStats[getTodayDateKey()];
  const todayMinutes = todayStats ? Math.round((todayStats.durationMs / 60000) * 10) / 10 : 0;
  const goalProgress = Math.min(100, (todayMinutes / settings.dailyGoalMinutes) * 100);

  // Active target instruction for Virtual Keyboard & Keystroke Helper Strip
  const activeStep = targets[cursor];
  const activeInstruction = useMemo(() => {
    if (!activeStep) return null;
    if (activeStep.isSpace) {
      return {
        targetChar: ' ',
        displayHint: 'Spacebar',
        sequence: [
          {
            code: 'Space',
            keyLabel: 'Space',
            shift: false,
            finger: 'thumb' as const,
            outputLabel: 'Space',
          },
        ],
      };
    }
    return findKeystrokeForBanglaChar(settings.layout, activeStep.char);
  }, [activeStep, settings.layout]);

  const activeStepSequenceItem = useMemo(() => {
    if (!activeInstruction || activeInstruction.sequence.length === 0) return null;
    if (pendingLinkCompose && activeInstruction.sequence.length > 1) {
      return activeInstruction.sequence[1];
    }
    return activeInstruction.sequence[0];
  }, [activeInstruction, pendingLinkCompose]);

  // Active word & active cluster breakdown for learners
  const activeWord = activeStep ? lessonData.words[activeStep.wordIndex] : null;
  const activeCluster =
    activeWord && activeStep && activeStep.clusterIndex >= 0
      ? activeWord.clusters[activeStep.clusterIndex]
      : null;

  const focusChar = lessonData.focusChar;
  const focusCharStats = focusChar ? profile.keyStats[focusChar] : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Practice Mode Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'guided', label: 'Guided' },
                { id: 'all', label: 'All Words' },
                { id: 'conjuncts', label: 'Conjuncts' },
                { id: 'custom', label: 'Custom Text' },
              ] as Array<{ id: PracticeMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onUpdateSettings({ practiceMode: m.id })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  settings.practiceMode === m.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Layout Quick Switcher */}
          <select
            aria-label="Keyboard layout"
            value={settings.layout}
            onChange={(e) => onUpdateSettings({ layout: e.target.value as LayoutId })}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {(Object.keys(BANGLA_LAYOUTS) as LayoutId[]).map((id) => (
              <option key={id} value={id}>
                Layout: {BANGLA_LAYOUTS[id].name} ({BANGLA_LAYOUTS[id].banglaName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            title={settings.soundEnabled ? 'Mute keystroke audio' : 'Enable keystroke audio'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ showKeyboard: !settings.showKeyboard })}
            title={settings.showKeyboard ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
            className={`p-2 rounded-lg border transition-colors ${
              settings.showKeyboard
                ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <KeyboardIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            title="Toggle light or dark theme"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => resetLesson()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Text</span>
          </button>
        </div>
      </div>

      {/* Keybr Adaptive Lesson Character Strip */}
      {settings.practiceMode === 'guided' && (
        <section aria-label="Bangla Character Mastery Strip" className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Adaptive Keys ({profile.unlockedChars.length}/{BANGLA_LESSON_CHARS.length} unlocked)
              </span>
              {focusChar && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Focus:{' '}
                    <strong className="font-bangla text-sky-700 dark:text-sky-300 text-sm">
                      {focusChar}
                    </strong>{' '}
                    ({getCharNameEnglish(focusChar)} ·{' '}
                    <span className="font-mono-tabular">
                      {getCharAverageWpm(focusCharStats)}/{settings.targetWpm} WPM
                    </span>
                    )
                  </span>
                </>
              )}
            </div>
            {profile.manualFocusChar && (
              <button
                type="button"
                onClick={() => onSelectFocusChar(null)}
                className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
              >
                Return to auto-focus
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {BANGLA_LESSON_CHARS.slice(0, 38).map((ch) => {
              const isUnlocked = profile.unlockedChars.includes(ch);
              const isFocus = focusChar === ch;
              const stats = profile.keyStats[ch];
              const conf = getCharConfidence(stats, settings.targetWpm);
              const wpm = getCharAverageWpm(stats);
              const errRate = getCharErrorRate(stats);
              const isMastered = isUnlocked && conf >= 0.82;

              let tileClass =
                'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/70 text-slate-400 dark:text-slate-600';
              if (isUnlocked) {
                tileClass = isMastered
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100';
              }
              if (isFocus) {
                tileClass =
                  'bg-sky-50 dark:bg-sky-950/50 border-sky-500 dark:border-sky-400 text-sky-900 dark:text-sky-100 ring-2 ring-sky-500/25';
              }

              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    if (isUnlocked) {
                      onSelectFocusChar(profile.manualFocusChar === ch ? null : ch);
                    } else {
                      onUnlockUpToChar(ch);
                    }
                  }}
                  title={
                    isUnlocked
                      ? `${ch} (${getCharNameEnglish(ch)}) — ${wpm} WPM, ${errRate.toFixed(1)}% err. Click to focus.`
                      : `${ch} (${getCharNameEnglish(ch)}) — Locked. Click to unlock up to here.`
                  }
                  className={`relative w-9 h-10 rounded-lg border flex flex-col items-center justify-center transition-all ${tileClass} hover:border-sky-400 dark:hover:border-sky-500`}
                >
                  <span className="font-bangla text-base font-semibold leading-none">
                    {ch}
                  </span>
                  {isUnlocked ? (
                    <span className="w-5 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                      <span
                        className={`block h-full rounded-full ${
                          isMastered ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.round(Math.max(8, conf * 100))}%` }}
                      />
                    </span>
                  ) : (
                    <Lock className="w-2.5 h-2.5 mt-1 opacity-55" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Live Keybr-Style Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Speed</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {liveWpm}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">WPM</span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {liveAccuracy.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {totalMisses} err
            </span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Lesson Progress</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {Math.round((cursor / Math.max(1, targets.length)) * 100)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {cursor}/{targets.length}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Daily Goal</span>
            <span className="font-mono-tabular">
              {todayMinutes}/{settings.dailyGoalMinutes}m
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-sky-600 dark:bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lesson Completion Summary Banner */}
      {completedBanner && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-sm text-emerald-950 dark:text-emerald-100">
              <span className="font-semibold">Lesson recorded:</span>{' '}
              <span className="font-mono-tabular font-semibold">{completedBanner.wpm} WPM</span>
              <span className="mx-1.5 text-emerald-500">·</span>
              <span className="font-mono-tabular">{completedBanner.accuracy}% accuracy</span>
              <span className="mx-1.5 text-emerald-500">·</span>
              <span className="font-mono-tabular">{completedBanner.errors} errors</span>
              {completedBanner.newlyUnlocked && (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300">
                  <Unlock className="w-3.5 h-3.5" />
                  Unlocked new character:{' '}
                  <span className="font-bangla text-base">{completedBanner.newlyUnlocked}</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:underline"
          >
            View in Profile →
          </button>
        </div>
      )}

      {/* Main Typing Stage */}
      <div
        ref={stageRef}
        onClick={() => inputRef.current?.focus()}
        className={`relative rounded-xl bg-white dark:bg-slate-900 border transition-colors p-6 sm:p-8 cursor-text ${
          isFocused
            ? 'border-slate-300 dark:border-slate-700'
            : 'border-slate-200 dark:border-slate-800 opacity-90'
        }`}
      >
        {/* Hidden / IME Input */}
        <input
          ref={inputRef}
          type="text"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Bangla typing input"
          value={imeInputValue}
          onChange={handleImeInputChange}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={handleImeCompositionEnd}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute opacity-0 pointer-events-none w-px h-px"
        />

        {/* Keystroke Decomposition Helper Strip (Zero dotted circles + clear English key hint) */}
        {settings.showKeystrokeHints && activeStep && (
          <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {activeCluster && activeCluster.codepoints.length > 1 ? (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Syllable keys:</span>
                  <span className="font-bangla text-base font-semibold text-slate-900 dark:text-slate-100">
                    {activeCluster.grapheme}
                  </span>
                  <span className="text-slate-400">=</span>
                  <div className="inline-flex items-center gap-1">
                    {activeCluster.codepoints.map((cp, idx) => {
                      const clusterRange =
                        wordClusterRanges[activeStep.wordIndex]?.clusters[
                          activeStep.clusterIndex
                        ];
                      const stepIdx = (clusterRange?.start ?? 0) + idx;
                      const isDone = stepIdx < cursor;
                      const isCurr = stepIdx === cursor;
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded font-bangla text-sm ${
                            isCurr
                              ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 font-bold ring-1 ring-sky-400'
                              : isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {cp}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Next character:</span>
                  <span className="font-bangla text-base font-semibold text-slate-900 dark:text-slate-100">
                    {activeStep.isSpace ? 'Space' : activeStep.char}
                  </span>
                  {!activeStep.isSpace && (
                    <span className="text-slate-400">
                      ({getCharNameEnglish(activeStep.char)})
                    </span>
                  )}
                </>
              )}
            </div>

            {settings.layout !== 'ime' && activeStepSequenceItem && (
              <div className="flex items-center gap-2 text-xs">
                {pendingLinkCompose && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Link (্) active → press
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">Press:</span>
                <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                  {activeStepSequenceItem.shift
                    ? `Shift + ${activeStepSequenceItem.keyLabel}`
                    : activeStepSequenceItem.keyLabel}
                </kbd>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {FINGER_LABELS[activeStepSequenceItem.finger]}
                </span>
              </div>
            )}

            {settings.layout === 'ime' && (
              <div className="text-xs text-sky-700 dark:text-sky-300 font-medium">
                Type directly using your active OS Bangla / Avro keyboard
              </div>
            )}
          </div>
        )}

        {/* Bangla Words Flow (Each grapheme cluster rendered intact so ligatures never break) */}
        <div
          lang="bn"
          className="font-bangla text-[26px] sm:text-[32px] leading-[1.85] tracking-normal flex flex-wrap gap-x-3.5 gap-y-2 select-none"
        >
          {wordClusterRanges.map((wordRange, wIdx) => {
            const isSpaceActive = cursor === wordRange.spaceIndex;
            const isSpaceDone = cursor > wordRange.spaceIndex;
            const spaceHadError = stepErrors[wordRange.spaceIndex];

            return (
              <span key={wIdx} className="inline-flex items-baseline">
                {wordRange.clusters.map((cluster, cIdx) => {
                  const isCompleted = cursor >= cluster.end;
                  const isActive = cursor >= cluster.start && cursor < cluster.end;
                  const subProgress = isActive
                    ? (cursor - cluster.start) / cluster.length
                    : 0;

                  let hadErrorInCluster = false;
                  for (let s = cluster.start; s < cluster.end; s++) {
                    if (stepErrors[s]) hadErrorInCluster = true;
                  }

                  let colorClass = 'text-slate-400 dark:text-slate-500';
                  if (isCompleted) {
                    colorClass = hadErrorInCluster
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400';
                  } else if (isActive) {
                    colorClass =
                      currentStepMistake
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-md px-1 -mx-0.5'
                        : 'text-slate-950 dark:text-white bg-sky-100/90 dark:bg-sky-900/50 rounded-md px-1 -mx-0.5';
                  }

                  return (
                    <span
                      key={cIdx}
                      className={`relative inline-block transition-colors duration-75 ${colorClass}`}
                    >
                      {cluster.grapheme}
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-0.5 h-[3px] rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <span
                            className={`block h-full transition-all duration-100 ${
                              currentStepMistake
                                ? 'bg-rose-500'
                                : 'bg-sky-600 dark:bg-sky-400'
                            }`}
                            style={{
                              width: `${Math.max(25, Math.round(subProgress * 100))}%`,
                            }}
                          />
                        </span>
                      )}
                    </span>
                  );
                })}

                {wIdx < wordClusterRanges.length - 1 && (
                  <span
                    className={`inline-flex items-center justify-center w-3 h-7 ml-0.5 rounded-sm ${
                      isSpaceActive
                        ? currentStepMistake
                          ? 'bg-rose-200 dark:bg-rose-900/60'
                          : 'bg-sky-200 dark:bg-sky-800/70'
                        : isSpaceDone && spaceHadError
                        ? 'bg-rose-100 dark:bg-rose-950/40'
                        : ''
                    }`}
                  >
                    {isSpaceActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-300 animate-caret" />
                    )}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Unfocused Overlay Prompt */}
        {!isFocused && (
          <div className="absolute inset-0 rounded-xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-[2px] flex items-center justify-center">
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium shadow-sm hover:opacity-95 transition-opacity"
            >
              Click here or press any key to resume Bangla typing
            </button>
          </div>
        )}
      </div>

      {/* Custom Text Quick Editor when in Custom Mode */}
      {settings.practiceMode === 'custom' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-600 dark:text-slate-300">
            Practicing your custom Bangla text. Edit or load famous Bangla passages anytime.
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400 hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Custom Passage</span>
          </button>
        </div>
      )}

      {/* Virtual Keyboard */}
      {settings.showKeyboard && (
        <div className="space-y-2">
          <KeyboardVisual
            layoutId={settings.layout}
            mode="practice"
            activeCode={activeStepSequenceItem?.code ?? null}
            activeShift={activeStepSequenceItem?.shift ?? false}
            lastPressedCode={lastPressedCode}
            lastPressedError={lastPressedError}
            showFingerColors={settings.showFingerColors}
          />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Esc: <strong className="text-slate-700 dark:text-slate-300">Restart lesson</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Small top-right glyph: <strong className="text-slate-700 dark:text-slate-300">Shift + Key</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Active layout:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {BANGLA_LAYOUTS[settings.layout].name}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
