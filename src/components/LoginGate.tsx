import { signInWithPopup } from 'firebase/auth';
import { Check, Copy, Keyboard, LineChart, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth, googleProvider } from '../firebase';
import { KeyboardVisual } from './KeyboardVisual';

export function LoginGate() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setUnauthorizedDomain(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedDomain(host || 'your-vercel-domain.vercel.app');
        setErrorMsg(
          `This domain (${host || 'current domain'}) is not allowlisted in Firebase Authentication yet.`
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in popup was closed before completing login. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setErrorMsg('Your browser blocked the Google sign-in popup. Please allow popups and try again.');
      } else {
        setErrorMsg(`Could not sign in with Google: ${msg}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleCopyDomain = async () => {
    if (!unauthorizedDomain || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            DPSbr
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Bangla Typing Practice · National (Jatiya) Default
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
              Master Bangla Touch Typing &amp; Save Every Keystroke to Your Account
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              DPSbr adapts to your speed and accuracy using the{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                National (Jatiya)
              </strong>{' '}
              keyboard layout by default (with Unijoy, Probhat, and System IME also included). Sign in with your Google (Gmail) account so your lesson counts, character mastery, and typing speed history are always remembered.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <Keyboard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  National (Jatiya) Ready
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Starts directly on Jatiya without extra OS keyboard setup.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Persistent Counts &amp; WPM
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Every lesson, error rate, and unlocked letter syncs automatically.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Private Gmail Profile
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Your records remain strictly tied to your verified Google account.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="p-6 sm:p-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Sign in to Continue
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Log in with Gmail to load your saved progress and start practicing.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2.5">
                  <p className="font-medium">{errorMsg}</p>
                  {unauthorizedDomain && (
                    <div className="space-y-2 pt-1 border-t border-rose-200/80 dark:border-rose-800/80 text-[11px] leading-relaxed">
                      <p>
                        To enable Google sign-in on this deployed URL, add this domain in Firebase Console under{' '}
                        <strong>Authentication → Settings → Authorized domains</strong>:
                      </p>
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 font-mono-tabular text-slate-900 dark:text-slate-100">
                        <span className="truncate">{unauthorizedDomain}</span>
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                        >
                          {copiedDomain ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <a
                        href={firebaseAuthSettingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                      >
                        Open Firebase Authorized Domains →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>{signingIn ? 'Signing in...' : 'Sign in with Google (Gmail)'}</span>
              </button>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                All typing speed records, lesson counts, and unlocked Bangla keys are stored securely in Firestore.
              </p>
            </div>
          </div>
        </div>

        {/* Live Jatiya Layout Preview */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Default Keyboard Preview: National (Jatiya / <span className="font-bangla">জাতীয়</span>)
            </span>
            <span>G (্) + vowel sign forms standalone vowels (e.g. G + F = আ)</span>
          </div>
          <KeyboardVisual layoutId="jatiya" mode="practice" showFingerColors={true} />
        </section>
      </main>
    </div>
  );
}
