import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Shuffle } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { StoryCard, StorySummary } from '../components/StoryCard.tsx';
import { AdPlacement } from '../components/AdPlacement.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

export function ExplorePage() {
  const {
    categories,
    languages,
    t,
    getCategoryName,
    reducedMotion,
    theme,
    setActiveEmotionSlug,
  } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sort, setSort] = useState(searchParams.get('sort') || 'latest');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [language, setLanguage] = useState(searchParams.get('language') || 'all');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);

  const [stories, setStories] = useState<StorySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSort(searchParams.get('sort') || 'latest');
    setCategory(searchParams.get('category') || 'all');
    setLanguage(searchParams.get('language') || 'all');
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    setActiveEmotionSlug(category !== 'all' ? category : null);
    return () => setActiveEmotionSlug(null);
  }, [category, setActiveEmotionSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('sort', sort);
    if (category !== 'all') params.set('category', category);
    if (language !== 'all') params.set('language', language);
    if (query.trim()) params.set('q', query.trim());
    params.set('page', String(page));
    params.set('limit', '9');

    (async () => {
      try {
        const res = await fetch(`/api/stories?${params.toString()}`);
        const data = await res.json();
        if (!active) return;
        setStories(data.stories || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Explore fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [sort, category, language, query, page]);

  const updateFilter = (next: Record<string, string>) => {
    const updated = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all') updated.delete(k);
      else updated.set(k, v);
    }
    setPage(1);
    setSearchParams(updated);
  };

  const handleRandom = async () => {
    const res = await fetch('/api/stories?random=true');
    const data = await res.json();
    if (data.stories?.[0]?.slug) {
      navigate(`/feeling/${data.stories[0].slug}`);
    }
  };

  const activeCategoryTheme = category !== 'all' ? getCategoryTheme(category) : null;
  const activeTouch = activeCategoryTheme
    ? theme === 'dark'
      ? activeCategoryTheme.darkTouchColor
      : activeCategoryTheme.touchColor
    : '#3B828E';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]"
      >
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase transition-colors duration-300"
            style={{ color: activeTouch }}
          >
            {activeCategoryTheme
              ? `${getCategoryName(category)} · ${activeCategoryTheme.emotionLabel}`
              : 'Feelings, Not a Story.'}
          </p>
          <h1 className="font-editorial mt-1 text-3xl font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
            {category !== 'all' ? getCategoryName(category) : 'Explore Feelings'}
          </h1>
          <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
            Read and listen freely across languages and lived emotions. Switching categories transforms the watercolor mood live.
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.04 }}
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          onClick={handleRandom}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#3B828E] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2E6A75] whitespace-nowrap shrink-0"
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          <span>{t.hero.ctaRandom}</span>
        </motion.button>
      </motion.div>

      {/* Bubble Emotion Room Switcher */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.05 }}
          whileTap={reducedMotion ? undefined : { scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          onClick={() => updateFilter({ category: 'all' })}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            category === 'all'
              ? 'border-[#3B828E] bg-[#3B828E] text-white shadow-sm'
              : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
          }`}
        >
          All Rooms
        </motion.button>
        {categories.map((c) => {
          const cTheme = getCategoryTheme(c.slug);
          const isSelected = category === c.slug;
          const touch = theme === 'dark' ? cTheme.darkTouchColor : cTheme.touchColor;
          const lightBg = theme === 'dark' ? cTheme.darkBgHex : cTheme.lightBgHex;
          return (
            <motion.button
              key={c.slug}
              type="button"
              whileHover={reducedMotion ? undefined : { y: -2, scale: 1.05 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              onClick={() => updateFilter({ category: isSelected ? 'all' : c.slug })}
              onMouseEnter={() => setActiveEmotionSlug(c.slug)}
              onMouseLeave={() => setActiveEmotionSlug(category !== 'all' ? category : null)}
              style={{
                backgroundColor: isSelected ? touch : lightBg,
                color: isSelected ? '#FFFFFF' : touch,
                borderColor: isSelected ? touch : cTheme.borderHex,
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs transition-shadow hover:shadow-sm"
            >
              <CategoryIcon
                slug={c.slug}
                className="h-3.5 w-3.5"
                color={isSelected ? '#FFFFFF' : touch}
              />
              <span>{getCategoryName(c.slug)}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Discovery Controls */}
      <div className="mt-5 grid gap-4 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#54657A]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateFilter({ q: e.target.value });
            }}
            placeholder={t.discovery.searchPlaceholder}
            aria-label={t.discovery.searchPlaceholder}
            className="ios-liquid-glass min-h-[44px] w-full rounded-full border border-white/85 pr-4 pl-10 text-sm text-[#223142] placeholder-[#9B8E89] dark:border-white/10 dark:text-[#EEF4F8]"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={category}
            onChange={(e) => updateFilter({ category: e.target.value })}
            aria-label="Filter by category"
            className="ios-liquid-glass min-h-[44px] w-full rounded-full border border-white/85 px-4 text-sm text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
          >
            <option value="all">{t.discovery.allCategories}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {getCategoryName(c.slug)}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={language}
            onChange={(e) => updateFilter({ language: e.target.value })}
            aria-label="Filter by language"
            className="ios-liquid-glass min-h-[44px] w-full rounded-full border border-white/85 px-4 text-sm text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
          >
            <option value="all">{t.discovery.allLanguages}</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort Segmented Control */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Sort feelings"
          className="ios-liquid-glass inline-flex flex-wrap items-center gap-1 rounded-full border border-white/85 p-1 dark:border-white/10"
        >
          {[
            { id: 'latest', label: t.discovery.latest },
            { id: 'trending', label: t.discovery.trending },
            { id: 'supported', label: t.discovery.mostSupported },
            { id: 'featured', label: t.discovery.featured },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sort === tab.id}
              onClick={() => updateFilter({ sort: tab.id })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sort === tab.id
                  ? 'bg-[#3B828E] text-white shadow-xs'
                  : 'text-[#54657A] hover:text-[#223142] dark:text-[#A9BACB] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="font-mono-tabular text-xs text-[#54657A] dark:text-[#A9BACB]">
          {total} {total === 1 ? 'feeling' : 'feelings'} found
        </p>
      </div>

      <AdPlacement placement="listing" />

      {loading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="ios-liquid-glass h-56 animate-pulse rounded-[28px] border border-white/80 dark:border-white/10"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="ios-liquid-glass mt-10 rounded-[28px] border border-white/85 p-10 text-center dark:border-white/10">
          <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">{t.discovery.noResults}</p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="mt-4 rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story, idx) => (
            <StoryCard key={story.id} story={story} index={idx} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="ios-glass-bubble min-h-[40px] rounded-full border border-white/80 px-5 py-2 text-xs font-medium text-[#223142] disabled:opacity-40 dark:border-white/10 dark:text-[#EEF4F8]"
          >
            Previous
          </button>
          <span className="font-mono-tabular text-xs text-[#54657A] dark:text-[#A9BACB]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="ios-glass-bubble min-h-[40px] rounded-full border border-white/80 px-5 py-2 text-xs font-medium text-[#223142] disabled:opacity-40 dark:border-white/10 dark:text-[#EEF4F8]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
