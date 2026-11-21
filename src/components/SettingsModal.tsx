import { Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { BANGLA_LAYOUTS } from '../data/banglaLayouts';
import { SAMPLE_CUSTOM_TEXTS } from '../data/banglaCorpus';
import { LayoutId, UserSettings } from '../types/typing';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Practice Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure keyboard layout, adaptive speed targets, and visual helpers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Appearance & Audio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Color Theme
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {settings.theme === 'dark' ? 'Dark slate' : 'Light paper'}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    theme: settings.theme === 'dark' ? 'light' : 'dark',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {settings.theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Keystroke Audio
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {settings.soundEnabled ? 'Click sound active' : 'Muted'}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ soundEnabled: !settings.soundEnabled })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {settings.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Off</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Layout Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Bangla Keyboard Layout
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(BANGLA_LAYOUTS) as LayoutId[]).map((id) => {
                const l = BANGLA_LAYOUTS[id];
                const selected = settings.layout === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdateSettings({ layout: id })}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selected
                        ? 'border-sky-600 dark:border-sky-400 bg-sky-50/70 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {l.name}
                      </span>
                      <span className="font-bangla text-xs text-slate-500 dark:text-slate-400">
                        {l.banglaName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {l.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Target Speed (Auto-Unlock Threshold)
                </span>
                <span className="font-mono-tabular font-semibold text-sky-600 dark:text-sky-400">
                  {settings.targetWpm} WPM
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={75}
                step={5}
                value={settings.targetWpm}
                onChange={(e) =>
                  onUpdateSettings({ targetWpm: Number(e.target.value) })
                }
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono-tabular">
                <span>15 WPM (Beginner)</span>
                <span>35 WPM (Standard)</span>
                <span>75 WPM (Expert)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Daily Practice Goal
                </span>
                <span className="font-mono-tabular font-semibold text-sky-600 dark:text-sky-400">
                  {settings.dailyGoalMinutes} min / day
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={settings.dailyGoalMinutes}
                onChange={(e) =>
                  onUpdateSettings({ dailyGoalMinutes: Number(e.target.value) })
                }
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Words per Lesson
                </span>
                <span className="font-mono-tabular font-semibold text-sky-600 dark:text-sky-400">
                  {settings.lessonWordCount} words
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={40}
                step={5}
                value={settings.lessonWordCount}
                onChange={(e) =>
                  onUpdateSettings({ lessonWordCount: Number(e.target.value) })
                }
                className="w-full accent-sky-600"
              />
            </div>
          </div>

          {/* Boolean toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            {[
              {
                key: 'showKeyboard' as const,
                label: 'Show Virtual Bangla Keyboard',
                desc: 'Displays live physical-to-Bangla key hints below the typing stage.',
              },
              {
                key: 'showFingerColors' as const,
                label: 'Color-Code Finger Zones',
                desc: 'Highlights home-row finger assignments across the keyboard.',
              },
              {
                key: 'showKeystrokeHints' as const,
                label: 'Show Syllable Keystroke Breakdown',
                desc: 'Decomposes Bangla kar-signs and conjuncts (e.g. শি → শ + ি) above the word.',
              },
              {
                key: 'stopOnError' as const,
                label: 'Stop Cursor on Error',
                desc: 'Require typing the exact right Bangla key before advancing.',
              },
              {
                key: 'includePunctuation' as const,
                label: 'Include Bangla Punctuation & Numbers',
                desc: 'Mix in Dari (।), commas, and Bangla numerals (১-৯) during practice.',
              },
            ].map((item) => {
              const checked = settings[item.key];
              return (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-1.5 cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      onUpdateSettings({ [item.key]: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </label>
              );
            })}
          </div>

          {/* Custom Text */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Custom Practice Text
              </label>
              <div className="flex items-center gap-2">
                {SAMPLE_CUSTOM_TEXTS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => onUpdateSettings({ customText: preset.text })}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-bangla"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={settings.customText}
              onChange={(e) => onUpdateSettings({ customText: e.target.value })}
              placeholder="Paste any Bangla paragraph to practice..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-bangla text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
