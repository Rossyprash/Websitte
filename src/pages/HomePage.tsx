import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bookmark,
  Heart,
  Loader2,
  Pause,
  Play,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { StoryCard, StorySummary } from '../components/StoryCard.tsx';
import { AdPlacement } from '../components/AdPlacement.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

type HomeSortTab = 'all' | 'latest' | 'trending' | 'supported';

const HOME_CACHE_KEY = 'avheard_home_v1';

interface CachedHomeFeed {
  storyOfTheDay?: StorySummary | null;
  featuredStories?: StorySummary[];
  latestStories?: StorySummary[];
  trendingStories?: StorySummary[];
}

function readHomeCache(): CachedHomeFeed | null {
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function HomePage() {
  const {
    t,
    categories,
    languages,
    getCategoryName,
    getLanguageName,
    totalStories,
    reducedMotion,
    theme,
    visitorKey,
    setActiveEmotionSlug,
  } = useApp();
  const { firebaseUser, getIdToken, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const initialHomeCache = readHomeCache();
  const [storyOfTheDay, setStoryOfTheDay] = useState<StorySummary | null>(
    initialHomeCache?.storyOfTheDay ?? null
  );
  const [featuredStories, setFeaturedStories] = useState<StorySummary[]>(
    initialHomeCache?.featuredStories ?? []
  );
  const [latestStories, setLatestStories] = useState<StorySummary[]>(
    initialHomeCache?.latestStories ?? []
  );
  const [trendingStories, setTrendingStories] = useState<StorySummary[]>(
    initialHomeCache?.trendingStories ?? []
  );
  const [loading, setLoading] = useState(!initialHomeCache?.latestStories?.length);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Interactive "Explore Emotions" strip state
  const [activeSortTab, setActiveSortTab] = useState<HomeSortTab>('all');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [filteredStories, setFilteredStories] = useState<StorySummary[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);

  // Interactive "Feeling of the Day" quick Listen / Support / Bookmark state
  const [sotdSupportCount, setSotdSupportCount] = useState<number>(
    initialHomeCache?.storyOfTheDay?.supportCount ?? 0
  );
  const [sotdSupported, setSotdSupported] = useState(false);
  const [sotdBookmarked, setSotdBookmarked] = useState(false);
  const [sotdSpeed, setSotdSpeed] = useState<number>(1);
  const [sotdAudioStatus, setSotdAudioStatus] = useState<
    'idle' | 'loading' | 'playing' | 'paused'
  >('idle');
  const sotdAudioRef = useRef<HTMLAudioElement | null>(null);
  const sotdAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const onHomeReset = () => {
      setSelectedEmotion(null);
      setActiveSortTab('all');
      setFilteredStories(null);
    };
    window.addEventListener('avheard:home-reset', onHomeReset);
    return () => window.removeEventListener('avheard:home-reset', onHomeReset);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/home');
        if (!res.ok) throw new Error('Failed to load home feed');
        const data = await res.json();
        if (!active) return;

        const primarySotd = data.storyOfTheDay ?? data.latestStories?.[0] ?? null;
        setStoryOfTheDay(primarySotd);
        if (primarySotd) {
          setSotdSupportCount(primarySotd.supportCount || 0);
        }
        setFeaturedStories(data.featuredStories || []);
        setLatestStories(data.latestStories || []);
        setTrendingStories(data.trendingStories || []);
        try {
          localStorage.setItem(
            HOME_CACHE_KEY,
            JSON.stringify({
              storyOfTheDay: primarySotd,
              featuredStories: data.featuredStories || [],
              latestStories: data.latestStories || [],
              trendingStories: data.trendingStories || [],
            })
          );
        } catch {}
      } catch (err) {
        console.error('Home load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Quietly prefetch key navigation chunks during browser idle time for zero-wait clicks
  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const prefetch = () => {
      import('./ExplorePage.tsx').catch(() => {});
      import('./CategoriesPage.tsx').catch(() => {});
      import('./WriteStoryPage.tsx').catch(() => {});
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(prefetch);
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(prefetch, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // Cleanup inline Feeling of the Day audio on unmount
  useEffect(() => {
    return () => {
      if (sotdAudioRef.current) {
        sotdAudioRef.current.pause();
        sotdAudioRef.current = null;
      }
      if (sotdAudioUrlRef.current) {
        URL.revokeObjectURL(sotdAudioUrlRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (sotdAudioRef.current) {
      sotdAudioRef.current.playbackRate = sotdSpeed;
    }
  }, [sotdSpeed]);

  // Fetch filtered feelings when user interacts with Explore Emotions sort tabs or emotion tiles
  useEffect(() => {
    if (activeSortTab === 'all' && !selectedEmotion) {
      setFilteredStories(null);
      return;
    }

    let active = true;
    setFilterLoading(true);
    const params = new URLSearchParams();
    params.set('sort', activeSortTab === 'all' ? 'latest' : activeSortTab);
    if (selectedEmotion) params.set('category', selectedEmotion);
    params.set('limit', '6');

    (async () => {
      try {
        const res = await fetch(`/api/stories?${params.toString()}`);
        const data = await res.json();
        if (active) setFilteredStories(data.stories || []);
      } catch {
        if (active) setFilteredStories([]);
      } finally {
        if (active) setFilterLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeSortTab, selectedEmotion]);

  const handleRandomFeeling = async () => {
    try {
      const res = await fetch('/api/stories?random=true');
      const data = await res.json();
      if (data.stories?.[0]?.slug) {
        navigate(`/feeling/${data.stories[0].slug}`);
      }
    } catch {}
  };

  const handleSotdSupport = async () => {
    if (!storyOfTheDay) return;
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/stories/${storyOfTheDay.id}/react`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType: 'empathy', sessionKey: visitorKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setSotdSupported(Boolean(data.active));
        setSotdSupportCount((prev) => Math.max(0, prev + (data.active ? 1 : -1)));
      }
    } catch {}
  };

  const handleSotdBookmark = async () => {
    if (!storyOfTheDay) return;
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/bookmarks/${storyOfTheDay.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSotdBookmarked(Boolean(data.saved));
      }
    } catch {}
  };

  const handleSotdListen = async () => {
    if (!storyOfTheDay) return;

    if (sotdAudioRef.current) {
      if (sotdAudioStatus === 'playing') {
        sotdAudioRef.current.pause();
        setSotdAudioStatus('paused');
        return;
      }
      if (sotdAudioStatus === 'paused') {
        await sotdAudioRef.current.play();
        setSotdAudioStatus('playing');
        return;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      if (sotdAudioStatus === 'playing') {
        window.speechSynthesis.pause();
        setSotdAudioStatus('paused');
        return;
      }
      if (sotdAudioStatus === 'paused') {
        window.speechSynthesis.resume();
        setSotdAudioStatus('playing');
        return;
      }
    }

    setSotdAudioStatus('loading');
    try {
      const res = await fetch(`/api/stories/${storyOfTheDay.id}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceName: 'Kore' }),
      });
      const data = await res.json();
      if (data.available && data.audioBase64) {
        const binaryStr = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
        if (sotdAudioUrlRef.current) URL.revokeObjectURL(sotdAudioUrlRef.current);
        const url = URL.createObjectURL(blob);
        sotdAudioUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = sotdSpeed;
        audio.onended = () => setSotdAudioStatus('idle');
        sotdAudioRef.current = audio;
        await audio.play();
        setSotdAudioStatus('playing');
        return;
      }
    } catch {}

    // Graceful browser voice fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${storyOfTheDay.title}. ${storyOfTheDay.excerpt}`
      );
      utterance.lang = storyOfTheDay.languageCode === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = sotdSpeed;
      utterance.onend = () => setSotdAudioStatus('idle');
      utterance.onerror = () => setSotdAudioStatus('idle');
      setSotdAudioStatus('playing');
      window.speechSynthesis.speak(utterance);
    } else {
      setSotdAudioStatus('idle');
    }
  };

  const sotdTheme = storyOfTheDay ? getCategoryTheme(storyOfTheDay.categorySlug) : null;
  const sotdTouch = sotdTheme
    ? theme === 'dark'
      ? sotdTheme.darkTouchColor
      : sotdTheme.touchColor
    : '#3B828E';
  const sotdTagBg = sotdTheme
    ? theme === 'dark'
      ? sotdTheme.darkBgHex
      : sotdTheme.lightBgHex
    : '#E3F2F5';

  const displayedDiscoveryStories = filteredStories ?? latestStories;
  const discoveryTitle = selectedEmotion
    ? `${getCategoryName(selectedEmotion)} Feelings`
    : activeSortTab === 'trending'
      ? t.discovery.trending
      : activeSortTab === 'supported'
        ? t.discovery.mostSupported
        : t.discovery.latest;

  return (
    <div>
      {/* Hero Section on Warm Cream Watercolor Canvas */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-9 pb-10 sm:px-6 lg:pt-12">
          <div className="grid items-stretch gap-8 lg:grid-cols-12">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-between lg:col-span-7"
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <span className="ios-glass-bubble inline-flex items-center gap-1.5 rounded-full border border-white/80 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-[#3B828E] uppercase dark:border-white/10 dark:text-[#7CC7D4]">
                    <span>A Space for Every Emotion</span>
                    <Heart className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium tracking-wide text-[#54657A] dark:text-[#A9BACB]">
                    {t.hero.kicker}
                  </span>
                </div>

                <h1 className="font-editorial text-4xl leading-[1.13] font-medium text-[#223142] sm:text-5xl dark:text-[#EEF4F8]">
                  {t.hero.title.includes('raw human feelings') ? (
                    <>
                      A quiet sanctuary for{' '}
                      <span className="text-[#3B828E] dark:text-[#7CC7D4]">
                        raw human feelings
                      </span>
                      —not polished stories.
                    </>
                  ) : (
                    t.hero.title
                  )}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                  {t.hero.subtitle}
                </p>
              </div>

              <div className="mt-7">
                <div className="flex flex-wrap items-center gap-3">
                  <motion.div
                    whileHover={reducedMotion ? undefined : { y: -2, scale: 1.03 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    className={reducedMotion ? undefined : 'animate-breathe'}
                  >
                    <Link
                      to="/explore"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-10px_rgba(59,130,142,0.65)] transition-colors hover:bg-[#2E6A75] whitespace-nowrap shrink-0"
                    >
                      <span>{t.hero.ctaRead}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={reducedMotion ? undefined : { y: -2, scale: 1.03 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  >
                    <Link
                      to="/write"
                      className="ios-liquid-glass inline-flex min-h-[44px] items-center rounded-full border border-white/80 px-6 py-2.5 text-sm font-medium text-[#223142] transition-colors hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8] whitespace-nowrap shrink-0"
                    >
                      {t.hero.ctaWrite}
                    </Link>
                  </motion.div>
                  <motion.button
                    type="button"
                    whileHover={reducedMotion ? undefined : { y: -2, scale: 1.04 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    onClick={handleRandomFeeling}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-[#3B828E] transition-colors hover:bg-white/60 dark:text-[#7CC7D4] dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="h-4 w-4" aria-hidden="true" />
                    <span>{t.hero.ctaRandom}</span>
                  </motion.button>
                </div>

                {/* Delicate Muted Rose Breathing Heart-Wave Flourish */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 420 34"
                  fill="none"
                  className="mt-4 hidden h-7 w-full max-w-md text-[#3B828E]/55 sm:block dark:text-[#7CC7D4]/45"
                >
                  <path
                    d="M4 24 C 65 28, 120 12, 168 18 C 180 20, 187 9, 194 9 C 201 9, 203 18, 203 21 C 203 18, 206 9, 213 9 C 220 9, 226 20, 238 18 C 288 12, 348 27, 416 14"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </motion.div>

            {/* Keep Existing Sanctuary Hero Artwork Untouched */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={
                reducedMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: [1, 1.018, 1.018, 1] }
              }
              whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 7.2, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
              }}
              className="lg:col-span-5"
            >
              <div className="relative h-full min-h-[260px] overflow-hidden rounded-[28px] border border-white/80 bg-[#223142] shadow-[0_20px_44px_-16px_rgba(69,57,54,0.24)] dark:border-white/10">
                {!heroImgFailed ? (
                  <>
                    <img
                      src="/src/assets/images/unheard_sanctuary_hero_1795113046400.jpg"
                      alt="Quiet dusk writing desk beside a rain-speckled window with an open journal and warm tea"
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#172432]/88 via-[#172432]/45 to-transparent p-6">
                      <p className="font-editorial text-base text-white">
                        “Feelings, Not a Story.”
                      </p>
                      <p className="mt-0.5 text-xs text-[#DCE7F0]">
                        Written anonymously · Preserved in your native script
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col justify-end bg-gradient-to-br from-[#F7FAFD] via-[#EEF4F8] to-[#D8ECF2] p-6 text-[#223142]">
                    <Sparkles className="mb-3 h-6 w-6 text-[#3B828E]" aria-hidden="true" />
                    <p className="font-editorial text-2xl">{t.tagline}</p>
                    <p className="mt-1 text-sm text-[#54657A]">
                      Thirteen watercolor emotional rooms for honest expression.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Full-Width 4-Column Liquid Glass Bubble Sanctuary Facts Strip */}
          <div className="ios-liquid-glass animate-breathe-box mt-8 grid grid-cols-2 gap-4 rounded-[28px] border border-white/85 p-6 sm:grid-cols-4 dark:border-white/15">
            <div>
              <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
                {totalStories}
              </p>
              <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">Public feelings heard</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-semibold text-[#3B828E] dark:text-[#7CC7D4]">
                {languages.length || 25}
              </p>
              <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">Supported scripts & tongues</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-semibold text-[#3B7F60] dark:text-[#8ED4B3]">
                {categories.length || 13}
              </p>
              <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">Watercolor emotion rooms</p>
            </div>
            <div>
              <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
                0
              </p>
              <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">Accounts needed to read or express</p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Emotions Strip — A colour for every feeling + Live Filter Tabs */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1 h-9 w-1 rounded-full bg-[#3B828E] dark:bg-[#7CC7D4]"
            />
            <div>
              <h2 className="font-editorial text-2xl font-medium text-[#223142] sm:text-[28px] dark:text-[#EEF4F8]">
                Explore Emotions
              </h2>
              <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
                A colour for every feeling. Tap any room to filter live or watch the sanctuary mood shift.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter homepage feelings"
              className="ios-liquid-glass inline-flex flex-wrap items-center gap-1 rounded-full border border-white/85 p-1 dark:border-white/10"
            >
              {[
                { id: 'all' as const, label: 'All' },
                { id: 'latest' as const, label: 'Latest' },
                { id: 'trending' as const, label: 'Trending' },
                { id: 'supported' as const, label: 'Most Supported' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSortTab === tab.id}
                  onClick={() => setActiveSortTab(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeSortTab === tab.id
                      ? 'bg-[#3B828E] text-white shadow-xs'
                      : 'text-[#54657A] hover:text-[#223142] dark:text-[#A9BACB] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#3B828E] transition-colors hover:underline dark:text-[#7CC7D4] whitespace-nowrap shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* 13 Emotion Liquid Glass Breathing Tiles — Symbol & Text Colored by Emotion */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
          {categories.map((c, idx) => {
            const catTheme = getCategoryTheme(c.slug);
            const touch = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
            const isSelected = selectedEmotion === c.slug;

            return (
              <div
                key={c.slug}
                className="transition-transform duration-300 hover:-translate-y-1 active:scale-95"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEmotion((prev) => (prev === c.slug ? null : c.slug))
                  }
                  onMouseEnter={() => setActiveEmotionSlug(c.slug)}
                  onMouseLeave={() =>
                    setActiveEmotionSlug(selectedEmotion ? selectedEmotion : null)
                  }
                  style={{
                    backgroundImage: `radial-gradient(circle at top center, ${catTheme.hoverTintHex}, transparent 75%)`,
                    borderColor: isSelected ? touch : catTheme.borderHex,
                    animationDelay: `${(idx % 6) * 0.5}s`,
                    boxShadow: isSelected
                      ? `0 16px 32px -12px ${catTheme.watercolorPrimary}, inset 0 1.5px 1.5px rgba(255,255,255,0.98)`
                      : undefined,
                  }}
                  aria-pressed={isSelected}
                  className={`ios-liquid-glass group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border px-3 py-4 text-center transition-colors ${
                    reducedMotion ? '' : 'animate-breathe-box'
                  }`}
                >
                  <span
                    style={{
                      animationDelay: `${(idx % 6) * 0.55}s`,
                      borderColor: catTheme.borderHex,
                    }}
                    className={`ios-glass-bubble flex h-10 w-10 items-center justify-center rounded-full border shadow-sm ${
                      reducedMotion ? '' : 'animate-breathe-bubble'
                    }`}
                  >
                    <CategoryIcon slug={c.slug} className="h-5 w-5" color={touch} />
                  </span>
                  <span
                    style={{ color: touch }}
                    className="text-xs font-semibold leading-tight transition-colors"
                  >
                    {getCategoryName(c.slug)}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: touch, opacity: isSelected ? 1 : 0.55 }}
                    className="h-1 w-8 rounded-full transition-all group-hover:w-12 group-hover:opacity-100"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feeling of the Day + Join Our Community Sanctuary Row */}
      {storyOfTheDay && sotdTheme && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-12">
            {/* Left 8 cols: Enhanced Feeling of the Day with Quick Listen, Speed, Support & Bookmark */}
            <div
              onMouseEnter={() => setActiveEmotionSlug(storyOfTheDay.categorySlug)}
              onMouseLeave={() => setActiveEmotionSlug(selectedEmotion || null)}
              style={{
                backgroundImage: `radial-gradient(circle at top right, ${sotdTheme.hoverTintHex}, transparent 60%)`,
                borderColor: sotdTheme.borderHex,
              }}
              className={`ios-liquid-glass flex flex-col justify-between rounded-[28px] border p-7 transition-colors duration-300 hover:border-[#3B828E] sm:p-9 lg:col-span-8 ${
                reducedMotion ? '' : 'animate-breathe-box'
              }`}
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#54657A] dark:text-[#A9BACB]">
                    <span className="ios-glass-bubble inline-flex items-center gap-1 rounded-full border border-white/80 px-3 py-1 text-[11px] font-semibold tracking-wider text-[#3B828E] uppercase dark:border-white/10 dark:text-[#7CC7D4]">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      <span>{t.discovery.storyOfTheDay}</span>
                    </span>
                    <Link
                      to={`/explore?category=${storyOfTheDay.categorySlug}`}
                      style={{ backgroundColor: sotdTagBg, color: sotdTouch }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-transform hover:scale-105"
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/75 dark:bg-black/20 ${
                          reducedMotion ? '' : 'animate-breathe-bubble'
                        }`}
                      >
                        <CategoryIcon slug={storyOfTheDay.categorySlug} className="h-3 w-3" color={sotdTouch} />
                      </span>
                      <span>{getCategoryName(storyOfTheDay.categorySlug)}</span>
                    </Link>
                    <span>Anonymous Heart</span>
                    <span aria-hidden="true">·</span>
                    <span>{getLanguageName(storyOfTheDay.languageCode)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{storyOfTheDay.readingTimeMinutes} min read</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSotdBookmark}
                    aria-label={sotdBookmarked ? 'Saved feeling' : 'Save this feeling'}
                    aria-pressed={sotdBookmarked}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      sotdBookmarked
                        ? 'border-[#3B828E] bg-[#3B828E] text-white'
                        : 'ios-glass-bubble border-white/80 text-[#54657A] hover:border-[#3B828E] hover:text-[#3B828E] dark:border-white/10 dark:text-[#A9BACB]'
                    }`}
                  >
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <h2 className="font-editorial text-2xl font-medium text-[#223142] sm:text-3xl dark:text-[#EEF4F8]">
                  <Link
                    to={`/feeling/${storyOfTheDay.slug}`}
                    className="transition-colors hover:text-[#3B828E] dark:hover:text-[#7CC7D4]"
                  >
                    {storyOfTheDay.title}
                  </Link>
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                  {storyOfTheDay.excerpt}
                </p>
              </div>

              {/* Inline Audio Listen, Speed Selector, Instant Support & Read Feeling Controls */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EEF5]/70 pt-5 dark:border-[#273544]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative inline-flex">
                    {!reducedMotion && sotdAudioStatus === 'playing' && (
                      <span
                        aria-hidden="true"
                        className="animate-breathe-ring pointer-events-none absolute -inset-1 rounded-full border border-[#3B828E]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSotdListen}
                      disabled={sotdAudioStatus === 'loading'}
                      className="ios-glass-bubble relative inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#B9DCE3] bg-[#E3F2F5]/85 px-4 py-1.5 text-xs font-semibold text-[#3B828E] transition-transform hover:scale-105 dark:border-white/10 dark:bg-[#1B2D38] dark:text-[#8BD3DF] whitespace-nowrap shrink-0"
                    >
                      {sotdAudioStatus === 'loading' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : sotdAudioStatus === 'playing' ? (
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {sotdAudioStatus === 'loading'
                          ? 'Preparing…'
                          : sotdAudioStatus === 'playing'
                            ? 'Pause'
                            : sotdAudioStatus === 'paused'
                              ? 'Resume'
                              : 'Listen'}
                      </span>
                    </button>
                  </div>

                  <select
                    value={sotdSpeed}
                    onChange={(e) => setSotdSpeed(Number(e.target.value))}
                    aria-label="Feeling playback speed"
                    className="ios-glass-bubble min-h-[38px] rounded-full border border-white/80 px-3 py-1.5 text-xs font-medium text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                  </select>

                  <motion.button
                    type="button"
                    whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                    onClick={handleSotdSupport}
                    aria-pressed={sotdSupported}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      sotdSupported
                        ? 'border-[#3B828E] bg-[#E3F2F5] text-[#3B828E] dark:bg-[#1B2D38] dark:text-[#8BD3DF]'
                        : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${sotdSupported ? 'fill-current' : ''}`}
                      style={{ color: sotdTouch }}
                      aria-hidden="true"
                    />
                    <span className="font-mono-tabular">Support ({sotdSupportCount})</span>
                  </motion.button>
                </div>

                <motion.div
                  whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                >
                  <Link
                    to={`/feeling/${storyOfTheDay.slug}`}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#2E6A75] whitespace-nowrap shrink-0"
                  >
                    <span>{t.discovery.readStory}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Right 4 cols: Join Our Community Warm Rose Liquid Glass Sanctuary Card */}
            <aside
              style={{
                backgroundImage:
                  theme === 'dark'
                    ? 'radial-gradient(circle at top right, rgba(124, 199, 212, 0.16), transparent 65%)'
                    : 'radial-gradient(circle at top right, rgba(128, 204, 196, 0.28), transparent 65%)',
              }}
              className={`ios-liquid-glass relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/85 p-7 lg:col-span-4 dark:border-white/15 ${
                reducedMotion ? '' : 'animate-breathe-box'
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[#3B828E] dark:text-[#7CC7D4]">
                  <Heart className="h-5 w-5 fill-current" aria-hidden="true" />
                  <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
                    Join Our Community
                  </h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                  A safe space to share, listen and feel together—anonymously and in your own language.
                </p>
              </div>

              {/* Handcrafted Watercolor Envelope & Floating Hearts Motif */}
              <div className="my-5 flex items-center justify-end pr-2" aria-hidden="true">
                <svg viewBox="0 0 120 84" className="h-20 w-28 opacity-90">
                  <path
                    d="M16 32 L60 58 L104 32 L104 72 C104 75 101 78 98 78 L22 78 C19 78 16 75 16 72 Z"
                    fill={theme === 'dark' ? '#1C2733' : '#FFFFFF'}
                    stroke="#3B828E"
                    strokeOpacity="0.45"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M16 32 L54 14 C58 12 62 12 66 14 L104 32"
                    fill={theme === 'dark' ? '#243545' : '#E3F2F5'}
                    stroke="#3B828E"
                    strokeOpacity="0.45"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M57 26 C57 22 51 21 50 25 C49 29 57 34 57 34 C57 34 65 29 64 25 C63 21 57 22 57 26 Z"
                    fill="#3B828E"
                  />
                  <path
                    d="M78 14 C78 11 74 11 73 14 C72 17 78 20 78 20 C78 20 84 17 83 14 C82 11 78 11 78 14 Z"
                    fill="#5FA5B1"
                  />
                  <path
                    d="M42 15 C42 13 39 12 38 15 C37 17 42 20 42 20 C42 20 47 17 46 15 C45 12 42 13 42 15 Z"
                    fill="#94CDD6"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col gap-2.5">
                <motion.div
                  whileHover={reducedMotion ? undefined : { scale: 1.03, y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  className={reducedMotion ? undefined : 'animate-breathe'}
                >
                  <Link
                    to="/write"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#3B828E] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-10px_rgba(59,130,142,0.65)] transition-colors hover:bg-[#2E6A75]"
                  >
                    <span>Express a Feeling</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </motion.div>
                <Link
                  to="/write?tab=manage"
                  className="text-center text-xs font-medium text-[#54657A] underline-offset-4 hover:text-[#3B828E] hover:underline dark:text-[#A9BACB] dark:hover:text-[#7CC7D4]"
                >
                  Manage an existing feeling with your private token
                </Link>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Policy-Compliant AdSense Placement (Active only after approval) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AdPlacement placement="home" />
      </div>

      {/* Featured Feelings */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-editorial text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            {t.discovery.featured}
          </h2>
          <Link
            to="/explore?sort=featured"
            className="text-sm font-medium text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="ios-liquid-glass h-52 animate-pulse rounded-[28px] border border-white/80 dark:border-white/10"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {(featuredStories.length > 0 ? featuredStories : trendingStories).map((story, idx) => (
              <StoryCard key={story.id} story={story} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Latest / Filtered Feelings Grid */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-editorial text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              {discoveryTitle}
            </h2>
            {(selectedEmotion || activeSortTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmotion(null);
                  setActiveSortTab('all');
                }}
                className="ios-glass-bubble rounded-full border border-white/80 px-3 py-1 text-xs font-medium text-[#3B828E] hover:border-[#3B828E] dark:border-white/10 dark:text-[#7CC7D4]"
              >
                Reset filter
              </button>
            )}
          </div>
          <Link
            to={selectedEmotion ? `/explore?category=${selectedEmotion}` : '/explore'}
            className="text-sm font-medium text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
          >
            {selectedEmotion ? `Open ${getCategoryName(selectedEmotion)} room` : 'Explore archive'}
          </Link>
        </div>

        {filterLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="ios-liquid-glass h-52 animate-pulse rounded-[28px] border border-white/80 dark:border-white/10"
              />
            ))}
          </div>
        ) : displayedDiscoveryStories.length === 0 ? (
          <div className="ios-liquid-glass rounded-[28px] border border-white/85 p-8 text-center dark:border-white/10">
            <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
              No feelings in this emotion room yet. Be the first voice here.
            </p>
            <Link
              to="/write"
              className="mt-4 inline-flex rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Share a Feeling
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedDiscoveryStories.map((story, idx) => (
              <StoryCard key={story.id} story={story} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Category & Language Browse Strip — Hovering any emotion bubble morphs the live iOS 26 watercolor canvas */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="ios-liquid-glass animate-breathe-box rounded-[28px] border border-white/85 p-7 sm:p-9 dark:border-white/15">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
                Browse by emotion
              </h2>
              <p className="mt-1 text-sm text-[#54657A] dark:text-[#A9BACB]">
                Hover or open any bubble to shift the sanctuary watercolor to that emotion.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const catTheme = getCategoryTheme(c.slug);
                  const touch = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
                  return (
                    <motion.div
                      key={c.slug}
                      whileHover={reducedMotion ? undefined : { y: -3, scale: 1.05 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    >
                      <Link
                        to={`/explore?category=${c.slug}`}
                        onMouseEnter={() => setActiveEmotionSlug(c.slug)}
                        onMouseLeave={() => setActiveEmotionSlug(selectedEmotion || null)}
                        style={{
                          backgroundImage: `radial-gradient(circle at top left, ${catTheme.hoverTintHex}, transparent 80%)`,
                          color: touch,
                          borderColor: catTheme.borderHex,
                        }}
                        className="ios-glass-bubble inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-shadow hover:shadow-sm"
                      >
                        <CategoryIcon slug={c.slug} className="h-3.5 w-3.5" color={touch} />
                        <span style={{ color: touch }}>{getCategoryName(c.slug)}</span>
                      </Link>
                    </motion.div>
                  );
                })}
                <Link
                  to="/categories"
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#3B828E] underline underline-offset-4 dark:text-[#7CC7D4]"
                >
                  Open emotional rooms
                </Link>
              </div>
            </div>

            <div>
              <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
                Feel in your mother tongue
              </h2>
              <p className="mt-1 text-sm text-[#54657A] dark:text-[#A9BACB]">
                22 Eighth Schedule Indian languages, Hinglish, and English preserved in native script.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {languages.slice(0, 10).map((l) => (
                  <motion.div
                    key={l.code}
                    whileHover={reducedMotion ? undefined : { y: -3, scale: 1.05 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  >
                    <Link
                      to={`/explore?language=${l.code}`}
                      className="ios-glass-bubble inline-flex rounded-full border border-white/80 px-3.5 py-1.5 text-xs font-medium text-[#223142] transition-colors hover:border-[#3B828E] hover:text-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8] dark:hover:border-[#7CC7D4]"
                    >
                      {l.nativeName}
                    </Link>
                  </motion.div>
                ))}
                <Link
                  to="/languages"
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[#3B828E] underline underline-offset-4 dark:text-[#7CC7D4]"
                >
                  All 25+ scripts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
