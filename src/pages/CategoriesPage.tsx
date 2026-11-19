import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { StoryCard, StorySummary } from '../components/StoryCard.tsx';
import { AdPlacement } from '../components/AdPlacement.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

export function CategoriesPage() {
  const { categories, getCategoryName, reducedMotion, theme, setActiveEmotionSlug } = useApp();
  const [selectedSlug, setSelectedSlug] = useState<string>('all');
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveEmotionSlug(selectedSlug !== 'all' ? selectedSlug : null);
    return () => setActiveEmotionSlug(null);
  }, [selectedSlug, setActiveEmotionSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const url =
      selectedSlug === 'all'
        ? '/api/stories?limit=6'
        : `/api/stories?category=${encodeURIComponent(selectedSlug)}&limit=9`;

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
  }, [selectedSlug]);

  const activeTheme = selectedSlug !== 'all' ? getCategoryTheme(selectedSlug) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]"
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase transition-colors duration-300"
          style={{
            color: activeTheme
              ? theme === 'dark'
                ? activeTheme.darkTouchColor
                : activeTheme.touchColor
              : '#3B828E',
          }}
        >
          {activeTheme ? `${getCategoryName(selectedSlug)} · ${activeTheme.emotionLabel}` : 'Feelings, Not a Story.'}
        </p>
        <h1 className="font-editorial mt-1 text-3xl font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
          Emotional Spaces
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#54657A] dark:text-[#A9BACB]">
          Select or glide across any room—the entire watercolor atmosphere shifts live to match that emotion.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, idx) => {
          const active = selectedSlug === cat.slug;
          const isHovered = hoveredSlug === cat.slug;
          const catTheme = getCategoryTheme(cat.slug);
          const touchColor = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
          const lightBg = theme === 'dark' ? catTheme.darkBgHex : catTheme.lightBgHex;

          return (
            <motion.div
              key={cat.slug}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 290,
                damping: 22,
                delay: Math.min(idx * 0.03, 0.3),
              }}
              whileHover={reducedMotion ? undefined : { y: -5, scale: 1.018 }}
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
              onMouseEnter={() => {
                setHoveredSlug(cat.slug);
                setActiveEmotionSlug(cat.slug);
              }}
              onMouseLeave={() => {
                setHoveredSlug(null);
                setActiveEmotionSlug(selectedSlug !== 'all' ? selectedSlug : null);
              }}
              onClick={() => setSelectedSlug(active ? 'all' : cat.slug)}
              className="h-full"
            >
              <div
                style={{
                  animationDelay: `${(idx % 6) * 0.65}s`,
                  borderColor: active || isHovered ? touchColor : catTheme.borderHex,
                  backgroundImage: `radial-gradient(circle at top right, ${catTheme.hoverTintHex}, transparent 68%)`,
                  boxShadow:
                    active || isHovered
                      ? `0 20px 38px -16px ${catTheme.watercolorPrimary}`
                      : undefined,
                }}
                className={`ios-liquid-glass group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-[28px] border border-white/85 p-5 transition-colors duration-200 dark:border-white/15 ${
                  reducedMotion ? '' : 'animate-breathe-box'
                }`}
              >
                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    {/* Bubble Category Tag with Emotion Light Background + Breathing Circular Category Icon */}
                    <span
                      style={{
                        backgroundColor: lightBg,
                        color: touchColor,
                        borderColor: catTheme.borderHex,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold"
                    >
                      <span
                        style={{ animationDelay: `${(idx % 6) * 0.65}s` }}
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 dark:bg-black/25 ${
                          reducedMotion ? '' : 'animate-breathe-bubble'
                        }`}
                      >
                        <CategoryIcon slug={cat.slug} className="h-3 w-3" color={touchColor} />
                      </span>
                      <span style={{ color: touchColor }}>{catTheme.emotionLabel}</span>
                    </span>
                  </div>
                  <h2
                    style={{ color: touchColor }}
                    className="font-editorial text-xl font-medium transition-colors"
                  >
                    {getCategoryName(cat.slug)}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                    {cat.description}
                  </p>
                </div>
                <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/60 pt-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlug(active ? 'all' : cat.slug);
                    }}
                    style={{ color: touchColor }}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold hover:underline"
                  >
                    {active ? 'Showing room' : 'Open emotion'}
                  </button>
                  <Link
                    to={`/explore?category=${cat.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: touchColor }}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    <span>Explore all</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AdPlacement placement="category" />

      <section className="mt-10">
        <h2 className="font-editorial mb-5 text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          {selectedSlug === 'all' ? 'Recent Feelings Across Categories' : getCategoryName(selectedSlug)}
        </h2>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ios-liquid-glass h-48 animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
            No feelings in this room yet.{' '}
            <Link to="/write" className="text-[#3B828E] underline dark:text-[#7CC7D4]">
              Express the first one anonymously
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((s, idx) => (
              <StoryCard key={s.id} story={s} index={idx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
