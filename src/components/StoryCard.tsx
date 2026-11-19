import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Volume2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from './CategoryIcon.tsx';

export interface StorySummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  languageCode: string;
  categorySlug: string;
  contentWarning?: string | null;
  isFeatured?: boolean;
  isStoryOfTheDay?: boolean;
  isAdEligible?: boolean;
  hasRealVoice?: boolean;
  readingTimeMinutes: number;
  supportCount: number;
  viewCount: number;
  createdAt: string;
}

export function StoryCard({ story, index = 0 }: { story: StorySummary; index?: number }) {
  const { getCategoryName, getLanguageName, languages, t, reducedMotion, theme } = useApp();
  const [hovered, setHovered] = useState(false);
  const langObj = languages.find((l) => l.code === story.languageCode);
  const catTheme = getCategoryTheme(story.categorySlug);
  const touchColor = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
  const tagBg = theme === 'dark' ? catTheme.darkBgHex : catTheme.lightBgHex;

  const formattedDate = new Date(story.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 22,
        delay: Math.min(index * 0.05, 0.25),
      }}
      whileHover={reducedMotion ? undefined : { y: -5, scale: 1.015 }}
      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="h-full"
    >
      <div
        style={{
          borderColor: hovered ? touchColor : catTheme.borderHex,
          animationDelay: `${(index % 6) * 0.75}s`,
          backgroundImage: `radial-gradient(circle at top right, ${catTheme.hoverTintHex}, transparent 62%)`,
          boxShadow: hovered
            ? `0 20px 40px -16px ${catTheme.watercolorPrimary}, inset 0 1.5px 1.5px rgba(255,255,255,0.98)`
            : undefined,
        }}
        className={`ios-liquid-glass group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/85 p-6 transition-colors duration-300 dark:border-white/15 ${
          reducedMotion ? '' : 'animate-breathe-box'
        }`}
      >
        {/* Liquid watercolor hover sheen */}
        <motion.div
          aria-hidden="true"
          animate={{
            opacity: hovered ? 1 : 0.35,
            scale: hovered ? 1.08 : 0.95,
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: `radial-gradient(circle at top right, ${catTheme.hoverTintHex}, transparent 70%)`,
          }}
          className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full blur-xl"
        />

        <div className="relative z-10">
          {/* Circular Category Icon + Pill Tag in Emotion Colors + Clean Inline Metadata */}
          <div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#54657A] dark:text-[#A9BACB]">
            <Link
              to={`/explore?category=${story.categorySlug}`}
              style={{
                backgroundColor: tagBg,
                color: touchColor,
                borderColor: catTheme.borderHex,
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm transition-transform duration-150 hover:scale-105"
            >
              <span
                style={{ animationDelay: `${(index % 6) * 0.7}s` }}
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 dark:bg-black/25 ${
                  reducedMotion ? '' : 'animate-breathe-bubble'
                }`}
              >
                <CategoryIcon slug={story.categorySlug} className="h-3 w-3" color={touchColor} />
              </span>
              <span style={{ color: touchColor }}>{getCategoryName(story.categorySlug)}</span>
            </Link>
            <span>{getLanguageName(story.languageCode)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{story.readingTimeMinutes} min read</span>
            {story.contentWarning && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#5B638C] dark:text-[#FCA5A5]">
                  CW: {story.contentWarning}
                </span>
              </>
            )}
          </div>

          <h3 className="font-editorial mb-3 text-xl leading-snug font-medium text-[#223142] transition-colors dark:text-[#EEF4F8]">
            <Link
              to={`/feeling/${story.slug}`}
              style={{ color: hovered ? touchColor : undefined }}
              className="transition-colors focus:outline-none"
            >
              {story.title}
            </Link>
          </h3>

          <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
            {story.excerpt}
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/60 pt-4 text-xs text-[#54657A] dark:border-white/10 dark:text-[#A9BACB]">
          <div className="flex items-center gap-2">
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-tabular" style={{ color: touchColor }}>
              <Heart className="h-3 w-3" style={{ color: touchColor }} aria-hidden="true" />
              {story.supportCount}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {(story.hasRealVoice || langObj?.ttsSupported) && (
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: touchColor }}
                title={story.hasRealVoice ? 'Real speaker voice available' : t.discovery.listenAvailable}
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">
                  {story.hasRealVoice ? 'Real Voice' : t.discovery.listenAvailable}
                </span>
              </span>
            )}
            <Link
              to={`/feeling/${story.slug}`}
              style={{ color: touchColor }}
              className="font-semibold underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-80"
            >
              {t.discovery.readStory}
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
