/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuideView } from './components/GuideView';
import { Header } from './components/Header';
import { LayoutsView } from './components/LayoutsView';
import { LoginGate } from './components/LoginGate';
import { PracticeView } from './components/PracticeView';
import { ProfileView } from './components/ProfileView';
import { SettingsModal } from './components/SettingsModal';
import { BANGLA_LESSON_CHARS } from './data/banglaCorpus';
import { auth } from './firebase';
import { LessonRecord, NavTab, ProfileData, UserSettings } from './types/typing';
import {
  createEmptyFreeHandStats,
  createInitialProfile,
  DEFAULT_SETTINGS,
  recordLessonResult,
} from './utils/adaptiveEngine';
import {
  ensureUserDocument,
  importProfileToFirestore,
  resetFreeHandStatsInFirestore,
  resetMainProfileInFirestore,
  saveLessonToFirestore,
  subscribeToUserLessons,
  subscribeToUserProfile,
  updateDisplayNameInFirestore,
  updateFocusOrUnlockedInFirestore,
  updateSettingsInFirestore,
} from './utils/firestoreSync';

function getInitialTab(): NavTab {
  if (typeof window === 'undefined') return 'practice';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path.includes('profile') || hash.includes('profile')) return 'profile';
  if (path.includes('layouts') || hash.includes('layouts')) return 'layouts';
  if (path.includes('guide') || hash.includes('guide')) return 'guide';
  return 'practice';
}

function DPSbrApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);
  const [profileSection, setProfileSection] = useState<'main' | 'freehand'>('main');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<ProfileData>(() => createInitialProfile());
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (syncError) {
    throw syncError;
  }

  // Track Firebase Auth session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfileReady(false);
        setProfile(createInitialProfile());
        setSettings(DEFAULT_SETTINGS);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore user profile & lessons when signed in
  useEffect(() => {
    if (!user) return;

    let unsubProfile: (() => void) | null = null;
    let unsubLessons: (() => void) | null = null;
    let cancelled = false;

    const initAndSubscribe = async () => {
      try {
        await ensureUserDocument(
          user.uid,
          user.email || '',
          user.displayName || 'Bangla Learner',
          DEFAULT_SETTINGS
        );
        if (cancelled) return;

        unsubProfile = subscribeToUserProfile(
          user.uid,
          (profileSlice, settingsSlice) => {
            setProfile((prev) => ({
              ...prev,
              ...profileSlice,
            }));
            setSettings(settingsSlice);
            setProfileReady(true);
          },
          () => {
            void ensureUserDocument(
              user.uid,
              user.email || '',
              user.displayName || 'Bangla Learner',
              DEFAULT_SETTINGS
            );
          },
          (err) => setSyncError(err)
        );

        unsubLessons = subscribeToUserLessons(
          user.uid,
          (lessons) => {
            setProfile((prev) => ({
              ...prev,
              lessons,
            }));
          },
          (err) => setSyncError(err)
        );
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    void initAndSubscribe();

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubLessons?.();
    };
  }, [user]);

  // Sync Tailwind dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSelectTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const nextHash = tab === 'practice' ? '' : `#${tab}`;
      window.history.replaceState(null, '', nextHash || window.location.pathname);
    }
  }, []);

  const handleUpdateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        if (user) {
          void updateSettingsInFirestore(user.uid, next).catch((err) =>
            setSyncError(err instanceof Error ? err : new Error(String(err)))
          );
        }
        return next;
      });
    },
    [user]
  );

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
      if (user) {
        const finalLesson =
          res.newlyUnlocked
            ? { ...lesson, unlockedChar: res.newlyUnlocked }
            : lesson;
        void saveLessonToFirestore(user.uid, res.updatedProfile, finalLesson).catch((err) =>
          setSyncError(err instanceof Error ? err : new Error(String(err)))
        );
      }
      return res.newlyUnlocked;
    },
    [profile, settings.targetWpm, user]
  );

  const handleSelectFocusChar = useCallback(
    (ch: string | null) => {
      setProfile((prev) => {
        if (user) {
          void updateFocusOrUnlockedInFirestore(user.uid, prev.unlockedChars, ch).catch(
            (err) => setSyncError(err instanceof Error ? err : new Error(String(err)))
          );
        }
        return {
          ...prev,
          manualFocusChar: ch,
        };
      });
    },
    [user]
  );

  const handleUnlockUpToChar = useCallback(
    (ch: string) => {
      const targetIdx = BANGLA_LESSON_CHARS.indexOf(ch);
      if (targetIdx === -1) return;
      setProfile((prev) => {
        const merged = new Set(prev.unlockedChars);
        for (let i = 0; i <= targetIdx; i++) {
          merged.add(BANGLA_LESSON_CHARS[i]);
        }
        const nextUnlocked = BANGLA_LESSON_CHARS.filter((c) => merged.has(c));
        if (user) {
          void updateFocusOrUnlockedInFirestore(user.uid, nextUnlocked, ch).catch((err) =>
            setSyncError(err instanceof Error ? err : new Error(String(err)))
          );
        }
        return {
          ...prev,
          unlockedChars: nextUnlocked,
          manualFocusChar: ch,
        };
      });
    },
    [user]
  );

  const handlePracticeCharFromProfile = useCallback(
    (ch: string) => {
      handleUnlockUpToChar(ch);
      handleUpdateSettings({ practiceMode: 'guided' });
      handleSelectTab('practice');
    },
    [handleUnlockUpToChar, handleUpdateSettings, handleSelectTab]
  );

  const handlePracticeFreeHandCharFromProfile = useCallback(
    (ch: string) => {
      setSettings((prev) => {
        const current =
          prev.freeHandChars && prev.freeHandChars.length >= 2
            ? prev.freeHandChars
            : ['ক', 'ত'];
        const nextChars = current.includes(ch) ? current : [ch, ...current.slice(0, 7)];
        const next: UserSettings = {
          ...prev,
          practiceMode: 'freehand',
          freeHandChars: nextChars,
        };
        if (user) {
          void updateSettingsInFirestore(user.uid, next).catch((err) =>
            setSyncError(err instanceof Error ? err : new Error(String(err)))
          );
        }
        return next;
      });
      handleSelectTab('practice');
    },
    [user, handleSelectTab]
  );

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setActiveTab('practice');
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm">
        Loading DPSbr...
      </div>
    );
  }

  if (!user) {
    return <LoginGate />;
  }

  if (!profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm">
        Loading your Bangla typing records...
      </div>
    );
  }

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
            onOpenProfile={(section = 'main') => {
              setProfileSection(section);
              handleSelectTab('profile');
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            settings={settings}
            initialSection={profileSection}
            onUpdateDisplayName={(displayName) => {
              setProfile((prev) => ({ ...prev, displayName }));
              void updateDisplayNameInFirestore(user.uid, displayName).catch((err) =>
                setSyncError(err instanceof Error ? err : new Error(String(err)))
              );
            }}
            onImportProfile={(imported) => {
              setProfile((prev) => ({ ...prev, ...imported, email: user.email || '' }));
              void importProfileToFirestore(user.uid, imported).catch((err) =>
                setSyncError(err instanceof Error ? err : new Error(String(err)))
              );
            }}
            onResetProfile={() => {
              const emptyMain = createInitialProfile(
                user.email || '',
                user.displayName || profile.displayName
              );
              setProfile((prev) => ({
                ...emptyMain,
                lessons: prev.lessons.filter((l) => l.mode === 'freehand'),
                freeHandStats: prev.freeHandStats || createEmptyFreeHandStats(),
              }));
              void resetMainProfileInFirestore(user.uid).catch((err) =>
                setSyncError(err instanceof Error ? err : new Error(String(err)))
              );
            }}
            onResetFreeHandStats={() => {
              setProfile((prev) => ({
                ...prev,
                lessons: prev.lessons.filter((l) => l.mode !== 'freehand'),
                freeHandStats: createEmptyFreeHandStats(),
              }));
              void resetFreeHandStatsInFirestore(user.uid).catch((err) =>
                setSyncError(err instanceof Error ? err : new Error(String(err)))
              );
            }}
            onPracticeChar={handlePracticeCharFromProfile}
            onPracticeFreeHandChar={handlePracticeFreeHandCharFromProfile}
            onGoToPractice={() => handleSelectTab('practice')}
            onGoToFreeHand={() => {
              handleUpdateSettings({ practiceMode: 'freehand' });
              handleSelectTab('practice');
            }}
            onSignOut={handleSignOut}
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">DPSbr</span>
            <span aria-hidden="true">·</span>
            <span>Signed in as {user.email}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {Math.max(
                profile.totalLessons,
                profile.lessons.filter((l) => l.mode !== 'freehand').length
              )}{' '}
              lessons ·{' '}
              {Math.max(
                profile.freeHandStats?.totalLessons || 0,
                profile.lessons.filter((l) => l.mode === 'freehand').length
              )}{' '}
              free hand
            </span>
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

export default function App() {
  return (
    <ErrorBoundary>
      <DPSbrApp />
    </ErrorBoundary>
  );
}
