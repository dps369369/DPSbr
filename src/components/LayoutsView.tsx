import { useState } from 'react';
import { BANGLA_LAYOUTS, FINGER_LABELS } from '../data/banglaLayouts';
import { LayoutId, UserSettings } from '../types/typing';
import { KeyboardVisual } from './KeyboardVisual';

interface LayoutsViewProps {
  settings: UserSettings;
  onSelectLayout: (layout: LayoutId) => void;
  onStartPractice: () => void;
}

export function LayoutsView({
  settings,
  onSelectLayout,
  onStartPractice,
}: LayoutsViewProps) {
  const [previewLayout, setPreviewLayout] = useState<LayoutId>(settings.layout);
  const layoutInfo = BANGLA_LAYOUTS[previewLayout];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bangla Keyboard Layouts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare physical key mappings and choose the layout you want to master. Fixed layouts work immediately without installing OS software.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectLayout(previewLayout);
            onStartPractice();
          }}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap shrink-0"
        >
          Practice with {layoutInfo.name}
        </button>
      </div>

      {/* Layout Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(BANGLA_LAYOUTS) as LayoutId[]).map((id) => {
          const item = BANGLA_LAYOUTS[id];
          const isPreview = previewLayout === id;
          const isActive = settings.layout === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewLayout(id)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                isPreview
                  ? 'border-sky-600 dark:border-sky-400 bg-sky-50/60 dark:bg-sky-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </span>
                <span className="font-bangla text-xs text-slate-500 dark:text-slate-400">
                  {item.banglaName}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {item.subtitle}
                {isActive && ' · Active'}
              </div>
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Interactive Keyboard Preview */}
      <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {layoutInfo.name} (<span className="font-bangla">{layoutInfo.banglaName}</span>) Keymap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bottom character = unshifted key · Top-right character = Shift + key · Color = recommended touch-typing finger zone.
            </p>
          </div>
          {settings.layout !== previewLayout && (
            <button
              type="button"
              onClick={() => onSelectLayout(previewLayout)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
            >
              Set as Active Layout
            </button>
          )}
        </div>

        <KeyboardVisual
          layoutId={previewLayout}
          mode="practice"
          showFingerColors={true}
        />

        {/* Link Composition note for Unijoy / Jatiya */}
        {layoutInfo.usesLinkComposition && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 space-y-1.5">
            <div className="font-semibold">
              How Standalone Vowels &amp; Conjuncts Work in {layoutInfo.name}:
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono-tabular">G</kbd> (<span className="font-bangla">্</span> Hasanta / Link) followed by any vowel sign to produce the independent vowel:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono-tabular pt-1">
              <span>G + F (া) = <strong className="font-bangla text-sm">আ</strong></span>
              <span>G + D (ি) = <strong className="font-bangla text-sm">ই</strong></span>
              <span>G + Shift+D (ী) = <strong className="font-bangla text-sm">ঈ</strong></span>
              <span>G + S (ু) = <strong className="font-bangla text-sm">উ</strong></span>
              <span>G + C (ে) = <strong className="font-bangla text-sm">এ</strong></span>
              <span>G + X (ো) = <strong className="font-bangla text-sm">ও</strong></span>
            </div>
          </div>
        )}

        {/* Finger Zone Legend */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          {[
            { label: FINGER_LABELS['pinky-l'], color: 'bg-rose-200 dark:bg-rose-800' },
            { label: FINGER_LABELS['ring-l'], color: 'bg-amber-200 dark:bg-amber-800' },
            { label: FINGER_LABELS['middle-l'], color: 'bg-emerald-200 dark:bg-emerald-800' },
            { label: FINGER_LABELS['index-l'], color: 'bg-sky-200 dark:bg-sky-800' },
            { label: FINGER_LABELS['index-r'], color: 'bg-indigo-200 dark:bg-indigo-800' },
            { label: FINGER_LABELS['thumb'], color: 'bg-slate-300 dark:bg-slate-600' },
          ].map((f) => (
            <span key={f.label} className="inline-flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-xs ${f.color}`} />
              <span>{f.label}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
