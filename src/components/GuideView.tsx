interface GuideViewProps {
  onStartPractice: () => void;
}

export function GuideView({ onStartPractice }: GuideViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            How DPSbr Adaptive Bangla Training Works
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            An English-guided method to build fast, accurate Bengali touch-typing muscle memory.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartPractice}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap shrink-0"
        >
          Go to Practice
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          01. The Keybr Adaptive Method for Bangla
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Instead of forcing all 50+ Bengali letters and vowel signs at once, DPSbr starts you with 6 high-frequency core keys (<span className="font-bangla font-semibold">ক, া, র, ন, ত, ম</span>) that immediately form real Bangla words like <span className="font-bangla font-semibold">নাম, রাত, তারা, কারণ</span>. As your speed and accuracy on each active key reach your target WPM (default 30 WPM), the next character automatically unlocks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          02. Understanding Bangla Unicode Keystrokes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Consonant + Vowel Signs (কার)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Even when a vowel sign like <span className="font-bangla font-semibold">ি</span> (i-kar) or <span className="font-bangla font-semibold">ে</span> (e-kar) visually appears to the left of a consonant, Unicode Bangla always types the <strong>consonant first, then the vowel sign</strong>.
            </p>
            <div className="pt-1 text-xs font-mono-tabular text-slate-700 dark:text-slate-200">
              Example: <span className="font-bangla text-base font-bold">কি</span> ={' '}
              <span className="font-bangla text-sm">ক</span> +{' '}
              <span className="font-bangla text-sm">ি</span> ·{' '}
              <span className="font-bangla text-base font-bold">কে</span> ={' '}
              <span className="font-bangla text-sm">ক</span> +{' '}
              <span className="font-bangla text-sm">ে</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Conjunct Ligatures (যুক্তাক্ষর)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To join two consonants into a ligature, place <strong>Hasanta (<span className="font-bangla font-semibold">্</span>)</strong> between them. DPSbr shows the exact key sequence in the Syllable Keystroke Strip above the text.
            </p>
            <div className="pt-1 text-xs font-mono-tabular text-slate-700 dark:text-slate-200">
              Example: <span className="font-bangla text-base font-bold">ক্ষ</span> ={' '}
              <span className="font-bangla text-sm">ক</span> +{' '}
              <span className="font-bangla text-sm">্</span> +{' '}
              <span className="font-bangla text-sm">ষ</span> ·{' '}
              <span className="font-bangla text-base font-bold">স্ত</span> ={' '}
              <span className="font-bangla text-sm">স</span> +{' '}
              <span className="font-bangla text-sm">্</span> +{' '}
              <span className="font-bangla text-sm">ত</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          03. Which Keyboard Layout Should You Choose?
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Layout</th>
                <th className="py-3 px-4 font-medium">Best For</th>
                <th className="py-3 px-4 font-medium">Setup Needed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  Probhat (প্রভাত)
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                  Beginners &amp; cross-platform learners (macOS/Linux/Windows). One key per letter, easy phonetic clues.
                </td>
                <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                  Built-in (zero setup)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  Unijoy / Bijoy (ইউনিজয়)
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                  Publishing, office jobs, and high-speed desktop touch typing in Bangladesh &amp; West Bengal.
                </td>
                <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                  Built-in (zero setup)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  Jatiya / National (জাতীয়)
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                  Official Bangladesh government typing exams &amp; ergonomic home-row efficiency.
                </td>
                <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                  Built-in (zero setup)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  System IME / Avro
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                  Practicing speed &amp; accuracy with your own installed Avro Phonetic or OS Bangla keyboard.
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  Uses your OS keyboard
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
