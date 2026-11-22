import {
  Check,
  Download,
  Edit3,
  LogOut,
  Play,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BANGLA_LESSON_CHARS } from '../data/banglaCorpus';
import {
  BANGLA_LAYOUTS,
  FINGER_LABELS,
  getCharNameEnglish,
  PHYSICAL_KEY_BY_CODE,
} from '../data/banglaLayouts';
import { PhysicalKeyDef, ProfileData, UserSettings } from '../types/typing';
import {
  formatDuration,
  getCharAverageWpm,
  getCharConfidence,
  getCharErrorRate,
  getTodayDateKey,
} from '../utils/adaptiveEngine';
import { HeatmapMetric, KeyboardVisual } from './KeyboardVisual';

interface ProfileViewProps {
  profile: ProfileData;
  settings: UserSettings;
  onUpdateDisplayName: (name: string) => void;
  onImportProfile: (data: ProfileData) => void;
  onResetProfile: () => void;
  onPracticeChar: (ch: string) => void;
  onGoToPractice: () => void;
  onSignOut: () => void;
}

type CharSortMode = 'order' | 'slowest' | 'fastest' | 'errors';

export function ProfileView({
  profile,
  settings,
  onUpdateDisplayName,
  onImportProfile,
  onResetProfile,
  onPracticeChar,
  onGoToPractice,
  onSignOut,
}: ProfileViewProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.displayName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const [hoveredLessonIdx, setHoveredLessonIdx] = useState<number | null>(null);
  const [charSort, setCharSort] = useState<CharSortMode>('order');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('speed');
  const [selectedKeyDef, setSelectedKeyDef] = useState<PhysicalKeyDef>(
    PHYSICAL_KEY_BY_CODE['KeyK']
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Aggregate summary metrics (uses cumulative Firestore counters so counts never get truncated)
  const summary = useMemo(() => {
    const lessons = profile.lessons;
    const totalLessons = Math.max(profile.totalLessons || 0, lessons.length);
    const totalDurationMs = Math.max(
      profile.totalDurationMs || 0,
      lessons.reduce((acc, l) => acc + l.durationMs, 0)
    );
    const totalCharsTyped = Math.max(
      profile.totalCharsTyped || 0,
      lessons.reduce((acc, l) => acc + l.charCount, 0)
    );
    const topSpeed = Math.max(
      profile.topWpm || 0,
      lessons.reduce((max, l) => Math.max(max, l.wpm), 0)
    );
    const avgSpeed =
      lessons.length > 0
        ? Math.round(
            (lessons.reduce((acc, l) => acc + l.wpm, 0) / lessons.length) * 10
          ) / 10
        : 0;
    const avgAccuracy =
      lessons.length > 0
        ? Math.round(
            (lessons.reduce((acc, l) => acc + l.accuracy, 0) / lessons.length) * 10
          ) / 10
        : 100;

    const today = profile.dailyStats[getTodayDateKey()];
    const todayMinutes = today ? Math.round((today.durationMs / 60000) * 10) / 10 : 0;

    return {
      totalLessons,
      totalDurationMs,
      totalCharsTyped,
      topSpeed,
      avgSpeed,
      avgAccuracy,
      todayMinutes,
    };
  }, [
    profile.lessons,
    profile.dailyStats,
    profile.totalLessons,
    profile.totalDurationMs,
    profile.totalCharsTyped,
    profile.topWpm,
  ]);

  // Chronological lessons for chart (max last 45)
  const chartLessons = useMemo(() => {
    return [...profile.lessons].slice(0, 45).reverse();
  }, [profile.lessons]);

  // Moving average WPM for trendline
  const movingAvg = useMemo(() => {
    return chartLessons.map((_, idx) => {
      const slice = chartLessons.slice(Math.max(0, idx - 4), idx + 1);
      const avg = slice.reduce((acc, item) => acc + item.wpm, 0) / slice.length;
      return Math.round(avg * 10) / 10;
    });
  }, [chartLessons]);

  // Per-character metrics list
  const charRows = useMemo(() => {
    const rows = BANGLA_LESSON_CHARS.slice(0, 38)
      .filter(
        (ch) =>
          profile.unlockedChars.includes(ch) ||
          (profile.keyStats[ch] && profile.keyStats[ch].hits > 0)
      )
      .map((ch, orderIdx) => {
        const stats = profile.keyStats[ch];
        return {
          char: ch,
          orderIdx,
          wpm: getCharAverageWpm(stats),
          errRate: getCharErrorRate(stats),
          hits: stats?.hits ?? 0,
          misses: stats?.misses ?? 0,
          confidence: getCharConfidence(stats, settings.targetWpm),
        };
      });

    if (charSort === 'slowest') {
      return [...rows].sort((a, b) => a.wpm - b.wpm);
    }
    if (charSort === 'fastest') {
      return [...rows].sort((a, b) => b.wpm - a.wpm);
    }
    if (charSort === 'errors') {
      return [...rows].sort((a, b) => b.errRate - a.errRate);
    }
    return rows;
  }, [profile.unlockedChars, profile.keyStats, settings.targetWpm, charSort]);

  // 12-week (84 days) calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{
      date: string;
      minutes: number;
      lessons: number;
      level: 0 | 1 | 2 | 3 | 4;
    }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getTodayDateKey(d.getTime());
      const stat = profile.dailyStats[key];
      const mins = stat ? Math.round((stat.durationMs / 60000) * 10) / 10 : 0;
      const lessons = stat?.lessons ?? 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (mins > 0) level = 1;
      if (mins >= 5) level = 2;
      if (mins >= settings.dailyGoalMinutes) level = 3;
      if (mins >= settings.dailyGoalMinutes * 1.5) level = 4;

      days.push({ date: key, minutes: mins, lessons, level });
    }
    return days;
  }, [profile.dailyStats, settings.dailyGoalMinutes]);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpsbr-profile-${getTodayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProfileData;
        if (!Array.isArray(parsed.unlockedChars) || !Array.isArray(parsed.lessons)) {
          throw new Error('Invalid profile format');
        }
        onImportProfile(parsed);
        setNameDraft(parsed.displayName || 'Bangla Learner');
        setImportSuccess(true);
      } catch {
        setImportError('Could not import file. Please select a valid DPSbr JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedMapping = BANGLA_LAYOUTS[settings.layout].keymap[selectedKeyDef.code];

  // SVG chart dimensions
  const chartW = 760;
  const chartH = 220;
  const padL = 42;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxChartWpm = Math.max(
    settings.targetWpm + 15,
    ...chartLessons.map((l) => l.wpm + 10),
    50
  );

  const getX = (idx: number) =>
    chartLessons.length <= 1
      ? padL + plotW / 2
      : padL + (idx / (chartLessons.length - 1)) * plotW;
  const getY = (wpm: number) =>
    padT + plotH - (Math.min(maxChartWpm, Math.max(0, wpm)) / maxChartWpm) * plotH;

  const wpmPath = chartLessons
    .map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(l.wpm).toFixed(1)}`)
    .join(' ');
  const avgPath = movingAvg
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
    .join(' ');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Profile Header */}
      <section className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {isEditingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateDisplayName(nameDraft.trim() || 'Bangla Learner');
                  setIsEditingName(false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={32}
                  autoFocus
                  className="px-2.5 py-1 text-lg font-bold rounded-lg border border-sky-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                  aria-label="Save name"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {profile.displayName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(profile.displayName);
                    setIsEditingName(true);
                  }}
                  aria-label="Edit display name"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {profile.email && (
              <>
                <span>{profile.email}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>Active Layout: {BANGLA_LAYOUTS[settings.layout].name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Target: {settings.targetWpm} WPM
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Today: {summary.todayMinutes} / {settings.dailyGoalMinutes} min
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>
          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs">
              <span className="text-rose-800 dark:text-rose-200 font-medium">
                Reset all stats?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetProfile();
                  setConfirmReset(false);
                }}
                className="px-2 py-0.5 rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {importError && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
          Profile data imported successfully.
        </div>
      )}

      {/* KPI Summary Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Time', value: formatDuration(summary.totalDurationMs) },
          { label: 'Lessons', value: String(summary.totalLessons) },
          { label: 'Top Speed', value: `${summary.topSpeed} WPM` },
          { label: 'Average Speed', value: `${summary.avgSpeed} WPM` },
          { label: 'Avg Accuracy', value: `${summary.avgAccuracy}%` },
          {
            label: 'Keys Unlocked',
            value: `${profile.unlockedChars.length}/${BANGLA_LESSON_CHARS.length}`,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</div>
            <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {kpi.value}
            </div>
          </div>
        ))}
      </section>

      {/* Speed & Accuracy History Chart */}
      <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Typing Speed &amp; Trend History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lesson-by-lesson speed (WPM) with 5-lesson moving average and target pace line.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-500 inline-block" /> Lesson WPM
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Moving Avg
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" /> Target ({settings.targetWpm})
            </span>
          </div>
        </div>

        {chartLessons.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No completed lessons recorded yet. Complete your first Bangla practice round to unlock speed analytics.
            </p>
            <button
              type="button"
              onClick={onGoToPractice}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Practicing</span>
            </button>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full min-w-[540px] h-56 overflow-visible"
              role="img"
              aria-label="Typing speed history line chart"
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = Math.round(maxChartWpm * t);
                const y = getY(val);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono-tabular"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Target WPM dashed line */}
              <line
                x1={padL}
                y1={getY(settings.targetWpm)}
                x2={chartW - padR}
                y2={getY(settings.targetWpm)}
                className="stroke-amber-500/80"
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />

              {/* Moving average curve */}
              {chartLessons.length > 1 && (
                <path
                  d={avgPath}
                  fill="none"
                  className="stroke-emerald-500"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Raw WPM curve */}
              {chartLessons.length > 1 && (
                <path
                  d={wpmPath}
                  fill="none"
                  className="stroke-sky-500"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartLessons.map((lesson, idx) => {
                const cx = getX(idx);
                const cy = getY(lesson.wpm);
                const isHovered = hoveredLessonIdx === idx;
                return (
                  <g key={lesson.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3.5}
                      className={`${
                        isHovered
                          ? 'fill-sky-600 stroke-white dark:stroke-slate-900'
                          : 'fill-sky-500 stroke-white dark:stroke-slate-900'
                      } cursor-pointer transition-all`}
                      strokeWidth={1.5}
                      onMouseEnter={() => setHoveredLessonIdx(idx)}
                      onMouseLeave={() => setHoveredLessonIdx(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredLessonIdx !== null && chartLessons[hoveredLessonIdx] && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700 dark:text-slate-200">
                <span>
                  Lesson #{hoveredLessonIdx + 1} ·{' '}
                  {new Date(chartLessons[hoveredLessonIdx].timestamp).toLocaleString()}
                </span>
                <div className="flex items-center gap-3 font-mono-tabular">
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {chartLessons[hoveredLessonIdx].wpm} WPM
                  </span>
                  <span>{chartLessons[hoveredLessonIdx].accuracy}% acc</span>
                  <span>{chartLessons[hoveredLessonIdx].errorCount} err</span>
                  {chartLessons[hoveredLessonIdx].focusChar && (
                    <span className="font-bangla">
                      Focus: {chartLessons[hoveredLessonIdx].focusChar}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Per-Character Speed & Confidence Breakdown */}
      <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Bangla Character Speed &amp; Mastery
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any character bar to drill it in Guided Practice. Target threshold is{' '}
              <span className="font-mono-tabular font-medium">{settings.targetWpm} WPM</span>.
            </p>
          </div>
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'order', label: 'Curriculum' },
                { id: 'slowest', label: 'Slowest' },
                { id: 'fastest', label: 'Fastest' },
                { id: 'errors', label: 'Most Errors' },
              ] as Array<{ id: CharSortMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCharSort(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  charSort === opt.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {charRows.map((row) => {
            const pct = Math.min(100, Math.round((row.wpm / Math.max(20, settings.targetWpm * 1.3)) * 100));
            const mastered = row.confidence >= 0.82;
            return (
              <button
                key={row.char}
                type="button"
                onClick={() => onPracticeChar(row.char)}
                className="text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bangla text-lg font-bold text-slate-900 dark:text-slate-100">
                    {row.char}
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {row.wpm > 0 ? `${row.wpm}` : '—'}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      mastered
                        ? 'bg-emerald-500'
                        : row.wpm > 0
                        ? 'bg-sky-500'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ width: `${Math.max(row.wpm > 0 ? 12 : 0, pct)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono-tabular text-slate-500 dark:text-slate-400">
                  <span>{row.hits} hits</span>
                  <span>{row.errRate.toFixed(0)}% err</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Keyboard Heatmap */}
      <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Keyboard Performance Heatmap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any physical key to inspect speed and accuracy for its Bangla characters.
            </p>
          </div>
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'speed', label: 'Speed' },
                { id: 'errors', label: 'Error Rate' },
                { id: 'hits', label: 'Frequency' },
              ] as Array<{ id: HeatmapMetric; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setHeatmapMetric(m.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  heatmapMetric === m.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <KeyboardVisual
          layoutId={settings.layout}
          mode="heatmap"
          keyStats={profile.keyStats}
          targetWpm={settings.targetWpm}
          heatmapMetric={heatmapMetric}
          selectedKeyCode={selectedKeyDef.code}
          onSelectKey={setSelectedKeyDef}
        />

        {/* Selected Key Details Inspector */}
        {selectedMapping && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Selected Physical Key
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Key {selectedKeyDef.label.toUpperCase()} ·{' '}
                <span className="text-sm font-normal text-slate-600 dark:text-slate-300">
                  {FINGER_LABELS[selectedKeyDef.finger]}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Layout: {BANGLA_LAYOUTS[settings.layout].name}
              </div>
            </div>

            {[
              { label: 'Unshifted', ch: selectedMapping.normal },
              { label: 'Shift + Key', ch: selectedMapping.shift },
            ].map((slot) => {
              const st = profile.keyStats[slot.ch];
              const wpm = getCharAverageWpm(st);
              const err = getCharErrorRate(st);
              return (
                <div
                  key={slot.label}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {slot.label} · {getCharNameEnglish(slot.ch)}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2.5">
                      <span className="font-bangla text-xl font-bold text-slate-900 dark:text-slate-100">
                        {slot.ch}
                      </span>
                      <span className="font-mono-tabular text-xs text-slate-600 dark:text-slate-300">
                        {wpm > 0 ? `${wpm} WPM` : 'No data'} · {err.toFixed(1)}% err ·{' '}
                        {st?.hits ?? 0} hits
                      </span>
                    </div>
                  </div>
                  {BANGLA_LESSON_CHARS.includes(slot.ch) && (
                    <button
                      type="button"
                      onClick={() => onPracticeChar(slot.ch)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-sky-600 hover:bg-sky-700 text-white transition-colors shrink-0"
                    >
                      Practice
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Practice Activity Calendar + Recent Lessons Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                12-Week Practice Calendar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily minutes practiced toward your {settings.dailyGoalMinutes}m goal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1.5">
            {calendarDays.map((day) => {
              const colorClass =
                day.level === 0
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : day.level === 1
                  ? 'bg-sky-200 dark:bg-sky-900/60'
                  : day.level === 2
                  ? 'bg-sky-400 dark:bg-sky-700'
                  : day.level === 3
                  ? 'bg-emerald-500 dark:bg-emerald-600'
                  : 'bg-emerald-600 dark:bg-emerald-500';
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.minutes} min (${day.lessons} lessons)`}
                  className={`aspect-square rounded-sm ${colorClass}`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
            <span>Less</span>
            <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800" />
            <span className="w-3 h-3 rounded-xs bg-sky-200 dark:bg-sky-900/60" />
            <span className="w-3 h-3 rounded-xs bg-sky-400 dark:bg-sky-700" />
            <span className="w-3 h-3 rounded-xs bg-emerald-500 dark:bg-emerald-600" />
            <span>Goal+</span>
          </div>
        </section>

        <section className="lg:col-span-7 p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Practice Sessions
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              Showing latest {Math.min(10, profile.lessons.length)}
            </span>
          </div>

          {profile.lessons.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Your completed lessons will appear here with speed, accuracy, and duration.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 font-medium">When</th>
                    <th className="py-2 font-medium">Layout</th>
                    <th className="py-2 font-medium">Focus</th>
                    <th className="py-2 font-medium text-right">Speed</th>
                    <th className="py-2 font-medium text-right">Accuracy</th>
                    <th className="py-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {profile.lessons.slice(0, 10).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 text-slate-600 dark:text-slate-300 font-mono-tabular">
                        {new Date(l.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200">
                        {BANGLA_LAYOUTS[l.layout].name}
                      </td>
                      <td className="py-2.5 font-bangla text-sm text-slate-900 dark:text-slate-100">
                        {l.focusChar || '—'}
                      </td>
                      <td className="py-2.5 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                        {l.wpm} WPM
                      </td>
                      <td className="py-2.5 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                        {l.accuracy}%
                      </td>
                      <td className="py-2.5 text-right font-mono-tabular text-slate-500 dark:text-slate-400">
                        {formatDuration(l.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
