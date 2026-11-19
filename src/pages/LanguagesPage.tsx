import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { StoryCard, StorySummary } from '../components/StoryCard.tsx';

export function LanguagesPage() {
  const { languages, reducedMotion } = useApp();
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const url =
      selectedLang === 'all'
        ? '/api/stories?limit=9'
        : `/api/stories?language=${encodeURIComponent(selectedLang)}&limit=12`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (active) setStories(data.stories || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLang]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
    >
      <div className="border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]">
        <p className="text-xs font-semibold tracking-widest text-[#3B828E] uppercase">
          Feelings, Not a Story.
        </p>
        <h1 className="font-editorial mt-1 text-3xl font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
          Feelings by Language & Script
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
          AVheard preserves every feeling in its original script across all 22 languages of the
          Eighth Schedule of the Indian Constitution, Hinglish, English, and Unicode input. Voice
          playback is shown only where verified TTS support is available.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <motion.button
          type="button"
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.05 }}
          whileTap={reducedMotion ? undefined : { scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          onClick={() => setSelectedLang('all')}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
            selectedLang === 'all'
              ? 'border-[#3B828E] bg-[#3B828E] text-white shadow-sm'
              : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
          }`}
        >
          All Languages ({languages.length})
        </motion.button>
        {languages.map((lang) => {
          const active = selectedLang === lang.code;
          return (
            <motion.button
              key={lang.code}
              type="button"
              whileHover={reducedMotion ? undefined : { y: -2, scale: 1.05 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              onClick={() => setSelectedLang(lang.code)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'border-[#3B828E] bg-[#3B828E] text-white shadow-sm'
                  : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
              }`}
            >
              <span>{lang.nativeName}</span>
              <span className="opacity-70">({lang.name})</span>
              {lang.ttsSupported ? (
                <Volume2 className="h-3 w-3 opacity-80" aria-label="Voice supported" />
              ) : (
                <VolumeX className="h-3 w-3 opacity-50" aria-label="Text only" />
              )}
            </motion.button>
          );
        })}
      </div>

      <section className="mt-10">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ios-liquid-glass h-48 animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="ios-liquid-glass rounded-[28px] border border-white/85 p-8 text-center dark:border-white/10">
            <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
              No published feelings in this language yet. Be the first voice in your script.
            </p>
            <Link
              to="/write"
              className="mt-4 inline-flex rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Express in this language
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((s, idx) => (
              <StoryCard key={s.id} story={s} index={idx} />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
