import { BANGLA_LAYOUTS, KEYBOARD_ROWS } from '../data/banglaLayouts';
import { FingerZone, KeyStats, LayoutId, PhysicalKeyDef } from '../types/typing';
import { getCharAverageWpm, getCharConfidence, getCharErrorRate } from '../utils/adaptiveEngine';

export type HeatmapMetric = 'speed' | 'errors' | 'hits';

interface KeyboardVisualProps {
  layoutId: LayoutId;
  mode?: 'practice' | 'heatmap';
  activeCode?: string | null;
  activeShift?: boolean;
  lastPressedCode?: string | null;
  lastPressedError?: boolean;
  showFingerColors?: boolean;
  // Heatmap props
  keyStats?: Record<string, KeyStats>;
  targetWpm?: number;
  heatmapMetric?: HeatmapMetric;
  selectedKeyCode?: string | null;
  onSelectKey?: (keyDef: PhysicalKeyDef) => void;
}

const FINGER_BG_LIGHT: Record<FingerZone, string> = {
  'pinky-l': 'bg-rose-50/70 dark:bg-rose-950/25',
  'ring-l': 'bg-amber-50/70 dark:bg-amber-950/25',
  'middle-l': 'bg-emerald-50/70 dark:bg-emerald-950/25',
  'index-l': 'bg-sky-50/70 dark:bg-sky-950/25',
  thumb: 'bg-slate-50 dark:bg-slate-800/70',
  'index-r': 'bg-indigo-50/70 dark:bg-indigo-950/25',
  'middle-r': 'bg-emerald-50/70 dark:bg-emerald-950/25',
  'ring-r': 'bg-amber-50/70 dark:bg-amber-950/25',
  'pinky-r': 'bg-rose-50/70 dark:bg-rose-950/25',
};

function getHeatmapColors(
  normalChar: string,
  shiftChar: string,
  keyStats: Record<string, KeyStats> | undefined,
  targetWpm: number,
  metric: HeatmapMetric
): string {
  if (!keyStats) return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  const s1 = keyStats[normalChar];
  const s2 = keyStats[shiftChar];
  const primary = (s1?.hits || 0) >= (s2?.hits || 0) ? s1 : s2;

  if (!primary || primary.hits + primary.misses === 0) {
    return 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500';
  }

  if (metric === 'speed') {
    const conf = getCharConfidence(primary, targetWpm);
    const wpm = getCharAverageWpm(primary);
    if (conf >= 0.85 || wpm >= targetWpm) {
      return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200';
    }
    if (conf >= 0.45 || wpm >= targetWpm * 0.65) {
      return 'bg-amber-50 dark:bg-amber-950/45 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200';
    }
    return 'bg-rose-50 dark:bg-rose-950/45 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200';
  }

  if (metric === 'errors') {
    const err = getCharErrorRate(primary);
    if (err <= 4) {
      return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200';
    }
    if (err <= 12) {
      return 'bg-amber-50 dark:bg-amber-950/45 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200';
    }
    return 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 text-rose-900 dark:text-rose-200';
  }

  // hits frequency
  const total = (s1?.hits || 0) + (s2?.hits || 0);
  if (total >= 80) {
    return 'bg-sky-100 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-100';
  }
  if (total >= 25) {
    return 'bg-sky-50 dark:bg-sky-950/35 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200';
  }
  return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
}

export function KeyboardVisual({
  layoutId,
  mode = 'practice',
  activeCode,
  activeShift = false,
  lastPressedCode,
  lastPressedError = false,
  showFingerColors = true,
  keyStats,
  targetWpm = 30,
  heatmapMetric = 'speed',
  selectedKeyCode,
  onSelectKey,
}: KeyboardVisualProps) {
  const layout = BANGLA_LAYOUTS[layoutId];

  return (
    <div className="w-full max-w-4xl mx-auto select-none">
      <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-1.5">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-stretch justify-center gap-1.5">
              {row.map((keyDef) => {
                const mapping = layout.keymap[keyDef.code];
                const isShiftKey =
                  keyDef.code === 'ShiftLeft' || keyDef.code === 'ShiftRight';
                const isTarget =
                  mode === 'practice' &&
                  (activeCode === keyDef.code || (activeShift && isShiftKey));
                const isPressed = mode === 'practice' && lastPressedCode === keyDef.code;
                const isSelected = mode === 'heatmap' && selectedKeyCode === keyDef.code;
                const widthFlex = keyDef.width ?? 1;

                let keySurfaceClass =
                  'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100';

                if (mode === 'heatmap' && mapping && !keyDef.isModifier) {
                  keySurfaceClass = getHeatmapColors(
                    mapping.normal,
                    mapping.shift,
                    keyStats,
                    targetWpm,
                    heatmapMetric
                  );
                } else if (showFingerColors && !keyDef.isModifier) {
                  keySurfaceClass = `${FINGER_BG_LIGHT[keyDef.finger]} border-slate-200/90 dark:border-slate-700/90 text-slate-800 dark:text-slate-100`;
                }

                if (isTarget) {
                  keySurfaceClass =
                    'bg-sky-600 dark:bg-sky-500 border-sky-700 dark:border-sky-400 text-white shadow-sm ring-2 ring-sky-400/50';
                } else if (isSelected) {
                  keySurfaceClass += ' ring-2 ring-sky-500 dark:ring-sky-400';
                }

                if (isPressed) {
                  keySurfaceClass = lastPressedError
                    ? 'bg-rose-600 border-rose-700 text-white animate-key-pop'
                    : 'bg-emerald-600 border-emerald-700 text-white animate-key-pop';
                }

                const isHomeBump = keyDef.code === 'KeyF' || keyDef.code === 'KeyJ';

                return (
                  <button
                    key={keyDef.code}
                    type="button"
                    disabled={mode !== 'heatmap' || keyDef.isModifier}
                    onClick={() => {
                      if (mode === 'heatmap' && onSelectKey && !keyDef.isModifier) {
                        onSelectKey(keyDef);
                      }
                    }}
                    style={{ flex: `${widthFlex} 1 0%` }}
                    className={`relative h-11 sm:h-13 rounded-lg border px-1.5 py-1 flex flex-col justify-between transition-all duration-100 ${keySurfaceClass} ${
                      mode === 'heatmap' && !keyDef.isModifier
                        ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110'
                        : 'cursor-default'
                    }`}
                    title={
                      mapping
                        ? `${keyDef.label}: ${mapping.normal} / Shift: ${mapping.shift}`
                        : keyDef.label
                    }
                  >
                    {keyDef.isModifier ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs font-medium tracking-tight opacity-85">
                          {keyDef.label}
                        </span>
                      </div>
                    ) : keyDef.code === 'Space' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[11px] font-medium opacity-60">Space</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-full flex items-start justify-between leading-none">
                          <span
                            className={`text-[9px] sm:text-[10px] font-mono-tabular uppercase ${
                              isTarget || isPressed ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {keyDef.label}
                          </span>
                          {mapping && mapping.shift !== mapping.normal && (
                            <span
                              className={`font-bangla text-[11px] sm:text-xs leading-none ${
                                isTarget && activeShift
                                  ? 'font-bold text-white'
                                  : isTarget || isPressed
                                  ? 'text-white/85'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {mapping.shift}
                            </span>
                          )}
                        </div>
                        <div className="w-full flex items-end justify-center leading-none pb-0.5">
                          <span
                            className={`font-bangla text-sm sm:text-base font-semibold leading-none ${
                              isTarget && !activeShift ? 'scale-110' : ''
                            }`}
                          >
                            {mapping ? mapping.normal : ''}
                          </span>
                        </div>
                        {isHomeBump && (
                          <span
                            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full ${
                              isTarget || isPressed
                                ? 'bg-white/80'
                                : 'bg-slate-400/70 dark:bg-slate-500/70'
                            }`}
                          />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
