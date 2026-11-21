/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { GuideView } from './components/GuideView';
import { Header } from './components/Header';
import { LayoutsView } from './components/LayoutsView';
import { PracticeView } from './components/PracticeView';
import { ProfileView } from './components/ProfileView';
import { SettingsModal } from './components/SettingsModal';
import { BANGLA_LESSON_CHARS } from './data/banglaCorpus';
import { LessonRecord, NavTab, ProfileData, UserSettings } from './types/typing';
import {
  createInitialProfile,
  loadProfile,
  loadSettings,
  recordLessonResult,
  saveProfile,
  saveSettings,
} from './utils/adaptiveEngine';

function getInitialTab(): NavTab {
  if (typeof window === 'undefined') return 'practice';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path.includes('profile') || hash.includes('profile')) return 'profile';
  if (path.includes('layouts') || hash.includes('layouts')) return 'layouts';
  if (path.includes('guide') || hash.includes('guide')) return 'guide';
  return 'practice';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [profile, setProfile] = useState<ProfileData>(() => loadProfile());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync Tailwind dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist profile
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const handleSelectTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const nextHash = tab === 'practice' ? '' : `#${tab}`;
      window.history.replaceState(null, '', nextHash || window.location.pathname);
    }
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCompleteLesson = useCallback(
    (
      lesson: LessonRecord,
      perCharUpdates: Record<string, { hits: number; misses: number; totalTimeMs: number }>
    ): string | null => {
      const res = recordLessonResult(
        profile,
        lesson,
        perCharUpdates,
        settings.targetWpm
      );
      setProfile(res.updatedProfile);
      return res.newlyUnlocked;
    },
    [profile, settings.targetWpm]
  );

  const handleSelectFocusChar = useCallback((ch: string | null) => {
    setProfile((prev) => ({
      ...prev,
      manualFocusChar: ch,
    }));
  }, []);

  const handleUnlockUpToChar = useCallback((ch: string) => {
    const targetIdx = BANGLA_LESSON_CHARS.indexOf(ch);
    if (targetIdx === -1) return;
    setProfile((prev) => {
      const merged = new Set(prev.unlockedChars);
      for (let i = 0; i <= targetIdx; i++) {
        merged.add(BANGLA_LESSON_CHARS[i]);
      }
      return {
        ...prev,
        unlockedChars: BANGLA_LESSON_CHARS.filter((c) => merged.has(c)),
        manualFocusChar: ch,
      };
    });
  }, []);

  const handlePracticeCharFromProfile = useCallback(
    (ch: string) => {
      handleUnlockUpToChar(ch);
      setSettings((prev) => ({ ...prev, practiceMode: 'guided' }));
      handleSelectTab('practice');
    },
    [handleUnlockUpToChar, handleSelectTab]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'practice' && (
          <PracticeView
            profile={profile}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onCompleteLesson={handleCompleteLesson}
            onSelectFocusChar={handleSelectFocusChar}
            onUnlockUpToChar={handleUnlockUpToChar}
            onOpenProfile={() => handleSelectTab('profile')}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            settings={settings}
            onUpdateDisplayName={(displayName) =>
              setProfile((prev) => ({ ...prev, displayName }))
            }
            onImportProfile={(imported) => setProfile(imported)}
            onResetProfile={() => setProfile(createInitialProfile())}
            onPracticeChar={handlePracticeCharFromProfile}
            onGoToPractice={() => handleSelectTab('practice')}
          />
        )}

        {activeTab === 'layouts' && (
          <LayoutsView
            settings={settings}
            onSelectLayout={(layout) => handleUpdateSettings({ layout })}
            onStartPractice={() => handleSelectTab('practice')}
          />
        )}

        {activeTab === 'guide' && (
          <GuideView onStartPractice={() => handleSelectTab('practice')} />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-5 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">DPSbr</span>
            <span aria-hidden="true">·</span>
            <span>Bangla Adaptive Typing Trainer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSelectTab('practice')}
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              Practice
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('profile')}
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('layouts')}
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              Layouts
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('guide')}
              className="hover:text-slate-900 dark:hover:text-slate-200"
            >
              Guide
            </button>
          </div>
        </div>
      </footer>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
