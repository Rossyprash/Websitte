import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { InterfaceLanguage } from '../lib/i18n.ts';
import {
  DEFAULT_AMBIENT_WATERCOLOR,
  getCategoryTheme,
} from '../lib/categoryThemes.ts';

function AnimatedAVheardMark({ compact = false }: { compact?: boolean }) {
  const { reducedMotion, activeEmotionSlug, theme } = useApp();
  const activeColor = activeEmotionSlug
    ? getCategoryTheme(activeEmotionSlug)[theme === 'dark' ? 'darkTouchColor' : 'touchColor']
    : theme === 'dark'
      ? '#7CC7D4'
      : '#286E7A';

  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}
    >
      {/* Breathing circular acoustic drops */}
      <span
        className={`inline-flex items-center ${compact ? 'gap-[3px] h-3' : 'gap-1 h-4'}`}
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((bar) => (
          <motion.span
            key={bar}
            animate={
              reducedMotion
                ? undefined
                : {
                    scale: [0.85, 1.2, 1.2, 0.85],
                    opacity: [0.72, 1, 1, 0.72],
                    y: compact ? [0, -1, -1, 0] : [0.5, -2, -2, 0.5],
                    backgroundColor: activeColor,
                  }
            }
            transition={{
              scale: {
                duration: 3.8,
                times: [0, 0.42, 0.54, 1],
                repeat: Infinity,
                delay: bar * 0.24,
                ease: 'easeInOut',
              },
              opacity: {
                duration: 3.8,
                times: [0, 0.42, 0.54, 1],
                repeat: Infinity,
                delay: bar * 0.24,
                ease: 'easeInOut',
              },
              y: {
                duration: 3.8,
                times: [0, 0.42, 0.54, 1],
                repeat: Infinity,
                delay: bar * 0.24,
                ease: 'easeInOut',
              },
              backgroundColor: { duration: 0.6 },
            }}
            style={{ backgroundColor: activeColor }}
            className={`${compact ? 'h-1.5 w-1.5' : 'h-2 w-2'} rounded-full`}
          />
        ))}
      </span>

      <span
        className={`font-sans font-bold tracking-[0.015em] antialiased text-[#1E2E3E] dark:text-[#F0F6FA] ${
          compact ? 'text-[12.5px] leading-[1.1]' : 'text-lg leading-[1.1]'
        }`}
      >
        AV
        <span style={{ color: activeColor, transition: 'color 0.5s ease' }} className="font-extrabold">
          heard
        </span>
      </span>
    </motion.span>
  );
}

const FLOATING_GLASS_BUBBLES = [
  { size: 112, left: '6%', top: '16%', driftX: 11, driftY: -13, driftDuration: 56, breatheDuration: 7.8, delay: 0 },
  { size: 74, left: '85%', top: '14%', driftX: -12, driftY: 10, driftDuration: 62, breatheDuration: 7.4, delay: 1.2 },
  { size: 136, left: '78%', top: '56%', driftX: -10, driftY: -14, driftDuration: 68, breatheDuration: 8.8, delay: 0.7 },
  { size: 90, left: '13%', top: '66%', driftX: 13, driftY: -11, driftDuration: 64, breatheDuration: 8.2, delay: 2.1 },
  { size: 54, left: '47%', top: '24%', driftX: -9, driftY: 11, driftDuration: 52, breatheDuration: 7.2, delay: 2.8 },
  { size: 96, left: '53%', top: '80%', driftX: 10, driftY: -10, driftDuration: 66, breatheDuration: 8.4, delay: 1.4 },
  { size: 42, left: '26%', top: '38%', driftX: 9, driftY: -9, driftDuration: 50, breatheDuration: 7.4, delay: 0.9 },
  { size: 64, left: '66%', top: '34%', driftX: -11, driftY: 9, driftDuration: 58, breatheDuration: 8.0, delay: 3.1 },
  { size: 48, left: '91%', top: '42%', driftX: -8, driftY: -11, driftDuration: 54, breatheDuration: 7.6, delay: 1.9 },
  { size: 78, left: '34%', top: '88%', driftX: 9, driftY: -12, driftDuration: 65, breatheDuration: 8.6, delay: 2.4 },
  { size: 40, left: '4%', top: '46%', driftX: 8, driftY: 10, driftDuration: 48, breatheDuration: 7.2, delay: 0.4 },
];

const NON_EMOTION_ROUTES = new Set([
  '/',
  '/about',
  '/languages',
  '/saved',
  '/profile',
  '/comments',
  '/contact',
  '/login',
  '/register',
  '/privacy',
  '/terms',
  '/guidelines',
  '/safety',
  '/admin',
]);

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    t,
    interfaceLang,
    setInterfaceLang,
    theme,
    toggleTheme,
    highContrast,
    toggleHighContrast,
    reducedMotion,
    activeEmotionSlug,
    setActiveEmotionSlug,
  } = useApp();
  const { firebaseUser, dbUser, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [clickBubbles, setClickBubbles] = useState<
    Array<{ id: number; x: number; y: number; color: string }>
  >([]);
  const location = useLocation();
  const navigate = useNavigate();

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickSearch.trim();
    if (trimmed) {
      navigate(`/explore?q=${encodeURIComponent(trimmed)}`);
      setQuickSearch('');
    } else {
      navigate('/explore');
    }
  };

  useEffect(() => {
    if (NON_EMOTION_ROUTES.has(location.pathname)) {
      setActiveEmotionSlug(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, setActiveEmotionSlug]);

  const handleGoHome = () => {
    setMobileMenuOpen(false);
    setActiveEmotionSlug(null);
    window.dispatchEvent(new CustomEvent('avheard:home-reset'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const emotionTheme = activeEmotionSlug ? getCategoryTheme(activeEmotionSlug) : null;
  const washPrimary = emotionTheme
    ? emotionTheme.watercolorPrimary
    : DEFAULT_AMBIENT_WATERCOLOR.primary;
  const washSecondary = emotionTheme
    ? emotionTheme.watercolorSecondary
    : DEFAULT_AMBIENT_WATERCOLOR.secondary;
  const washAccent = emotionTheme
    ? emotionTheme.watercolorAccent
    : DEFAULT_AMBIENT_WATERCOLOR.accent;
  const activeBubbleColor = emotionTheme ? emotionTheme.touchColor : '#3B828E';

  useEffect(() => {
    const handlePointerDown = (ev: PointerEvent) => {
      const id = Date.now() + Math.random();
      setClickBubbles((prev) => [
        ...prev.slice(-3),
        { id, x: ev.clientX, y: ev.clientY, color: activeBubbleColor },
      ]);
      window.setTimeout(() => {
        setClickBubbles((prev) => prev.filter((b) => b.id !== id));
      }, 750);
    };
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [activeBubbleColor]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#EEF4F8] text-[#223142] dark:bg-[#121820] dark:text-[#EAF1F6]">
      {/* Live Apple iOS 26 Watercolor & Floating Glass Bubble Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <motion.div
          animate={{
            background: `radial-gradient(circle at 30% 30%, ${washPrimary}, transparent 68%)`,
            x: reducedMotion ? 0 : [0, 24, 24, 0],
            y: reducedMotion ? 0 : [0, -18, -18, 0],
            scale: reducedMotion ? 1 : [0.94, 1.12, 1.12, 0.94],
            opacity: reducedMotion ? 0.85 : [0.65, 0.95, 0.95, 0.65],
          }}
          transition={{
            background: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
            x: { duration: 8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
          }}
          className="absolute -top-32 -left-24 h-[560px] w-[560px] rounded-full blur-3xl dark:opacity-45"
        />
        <motion.div
          animate={{
            background: `radial-gradient(circle at 70% 40%, ${washSecondary}, transparent 70%)`,
            x: reducedMotion ? 0 : [0, -24, -24, 0],
            y: reducedMotion ? 0 : [0, 20, 20, 0],
            scale: reducedMotion ? 1 : [0.95, 1.1, 1.1, 0.95],
            opacity: reducedMotion ? 0.85 : [0.6, 0.92, 0.92, 0.6],
          }}
          transition={{
            background: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
            x: { duration: 9, delay: 1.5, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 9, delay: 1.5, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 9, delay: 1.5, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 9, delay: 1.5, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
          }}
          className="absolute top-10 -right-28 h-[620px] w-[620px] rounded-full blur-3xl dark:opacity-40"
        />
        <motion.div
          animate={{
            background: `radial-gradient(circle at 50% 60%, ${washAccent}, transparent 72%)`,
            scale: reducedMotion ? 1 : [0.95, 1.1, 1.1, 0.95],
            opacity: reducedMotion ? 0.75 : [0.55, 0.88, 0.88, 0.55],
          }}
          transition={{
            background: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 7.5, delay: 0.8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 7.5, delay: 0.8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
          }}
          className="absolute bottom-[-180px] left-1/4 h-[540px] w-[640px] rounded-full blur-3xl dark:opacity-35"
        />

        {/* Serene, Loving Slow-Moving & Breathing Translucent Liquid Glass Bubbles (GPU-lightweight) */}
        {FLOATING_GLASS_BUBBLES.map((bubble, i) => (
          <motion.div
            key={i}
            animate={{
              x: [0, bubble.driftX * 0.5, bubble.driftX, bubble.driftX * 0.4, 0],
              y: [0, bubble.driftY * 0.5, bubble.driftY, bubble.driftY * 0.55, 0],
            }}
            transition={{
              x: {
                duration: bubble.driftDuration,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: bubble.delay,
                ease: [0.37, 0, 0.63, 1],
              },
              y: {
                duration: bubble.driftDuration * 1.15,
                repeat: Infinity,
                repeatType: 'mirror',
                delay: bubble.delay * 0.85,
                ease: [0.37, 0, 0.63, 1],
              },
            }}
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              top: bubble.top,
            }}
            className="absolute will-change-transform"
          >
            <motion.div
              animate={{
                scale: [0.96, 1.045, 1.045, 0.96],
                opacity: [0.46, 0.72, 0.72, 0.46],
                borderColor: emotionTheme
                  ? emotionTheme.borderHex
                  : 'rgba(255, 255, 255, 0.76)',
              }}
              transition={{
                scale: {
                  duration: bubble.breatheDuration,
                  times: [0, 0.44, 0.54, 1],
                  repeat: Infinity,
                  delay: bubble.delay,
                  ease: [0.37, 0, 0.63, 1],
                },
                opacity: {
                  duration: bubble.breatheDuration,
                  times: [0, 0.44, 0.54, 1],
                  repeat: Infinity,
                  delay: bubble.delay,
                  ease: [0.37, 0, 0.63, 1],
                },
                borderColor: { duration: 0.9 },
              }}
              style={{
                background: `radial-gradient(circle at 28% 24%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.34) 36%, ${washPrimary} 72%, rgba(255,255,255,0.12) 100%)`,
                boxShadow:
                  'inset 0 2px 7px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(255,255,255,0.35), 0 10px 26px -14px rgba(167,109,114,0.14)',
              }}
              className="h-full w-full rounded-full border will-change-transform dark:opacity-25"
            />
          </motion.div>
        ))}
      </div>

      {/* Liquid Glass Bubble Ripple Layer on Any Click / Tap */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {clickBubbles.map((bubble) => (
          <React.Fragment key={bubble.id}>
            <span
              style={{
                left: bubble.x,
                top: bubble.y,
                borderColor: bubble.color,
                background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.62), ${bubble.color}26 70%, transparent 100%)`,
                boxShadow: `0 0 18px ${bubble.color}38, inset 0 1px 2px rgba(255,255,255,0.9)`,
              }}
              className="av-bubble-ripple absolute h-12 w-12 rounded-full border backdrop-blur-[2px]"
            />
            <span
              style={{
                left: bubble.x - 10,
                top: bubble.y - 6,
                background: `radial-gradient(circle, rgba(255,255,255,0.9), ${bubble.color}55)`,
              }}
              className="av-bubble-droplet absolute h-2.5 w-2.5 rounded-full"
            />
            <span
              style={{
                left: bubble.x + 12,
                top: bubble.y - 4,
                background: `radial-gradient(circle, rgba(255,255,255,0.85), ${bubble.color}55)`,
              }}
              className="av-bubble-droplet absolute h-2 w-2 rounded-full"
            />
          </React.Fragment>
        ))}
      </div>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-[#3B828E] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      {/* Normal-Flow Compact Liquid Glass Header — Width hugs quote font to button */}
      <div className="relative z-40 flex flex-col items-center gap-2 px-3 pt-3 sm:px-4">
        <header className="ios-liquid-nav w-fit max-w-full rounded-full border border-white/85 px-3.5 py-2 sm:px-5 sm:py-2.5 dark:border-white/15">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Zone 1 (Top-Left): Website Quote — Feelings, Not a Story. */}
            <Link
              to="/"
              className="font-editorial text-sm font-medium tracking-tight text-[#223142] whitespace-nowrap shrink-0 transition-colors hover:text-[#3B828E] sm:text-lg dark:text-[#EAF1F6] dark:hover:text-[#7CC7D4]"
            >
              {t.tagline}
            </Link>

            {/* Zone 2: 5 concise single-line nav links */}
            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-5 text-sm font-medium text-[#54657A] dark:text-[#A9BACB]"
            >
              <Link
                to="/explore"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#223142] dark:hover:text-white ${
                  isActive('/explore')
                    ? 'text-[#3B828E] underline decoration-2 underline-offset-8 dark:text-[#7CC7D4]'
                    : ''
                }`}
              >
                {t.nav.explore}
              </Link>
              <Link
                to="/categories"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#223142] dark:hover:text-white ${
                  isActive('/categories')
                    ? 'text-[#3B828E] underline decoration-2 underline-offset-8 dark:text-[#7CC7D4]'
                    : ''
                }`}
              >
                {t.nav.categories}
              </Link>
              <Link
                to="/languages"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#223142] dark:hover:text-white ${
                  isActive('/languages')
                    ? 'text-[#3B828E] underline decoration-2 underline-offset-8 dark:text-[#7CC7D4]'
                    : ''
                }`}
              >
                {t.nav.languages}
              </Link>
              <Link
                to="/write"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#223142] dark:hover:text-white ${
                  isActive('/write')
                    ? 'text-[#3B828E] underline decoration-2 underline-offset-8 dark:text-[#7CC7D4]'
                    : ''
                }`}
              >
                {t.nav.write}
              </Link>
              <Link
                to="/about"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#223142] dark:hover:text-white ${
                  isActive('/about')
                    ? 'text-[#3B828E] underline decoration-2 underline-offset-8 dark:text-[#7CC7D4]'
                    : ''
                }`}
              >
                {t.nav.about}
              </Link>
            </nav>

            {/* Zone 3: 1 primary CTA + Mobile Menu Button */}
            <div className="flex items-center gap-2 shrink-0">
              <motion.div
                whileHover={reducedMotion ? undefined : { scale: 1.04, y: -1 }}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className={reducedMotion ? undefined : 'animate-breathe'}
              >
                {firebaseUser ? (
                  <Link
                    to="/profile"
                    className="inline-flex min-h-[36px] items-center rounded-full bg-[#3B828E] px-4 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-8px_rgba(59,130,142,0.55)] transition-colors hover:bg-[#2E6A75] sm:min-h-[40px] sm:px-5 sm:py-2 whitespace-nowrap shrink-0"
                  >
                    {dbUser?.displayName || t.nav.profile}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex min-h-[36px] items-center rounded-full bg-[#3B828E] px-4 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-8px_rgba(59,130,142,0.55)] transition-colors hover:bg-[#2E6A75] sm:min-h-[40px] sm:px-5 sm:py-2 whitespace-nowrap shrink-0"
                  >
                    {t.nav.signIn}
                  </Link>
                )}
              </motion.div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="ios-glass-bubble inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-white/85 text-[#223142] md:hidden dark:border-white/15 dark:text-[#EAF1F6]"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="ios-liquid-glass w-full max-w-xs rounded-3xl border border-white/85 p-4 md:hidden dark:border-white/15">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2.5 text-sm font-medium text-[#223142] dark:text-[#EAF1F6]">
              <Link to="/explore" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {t.nav.explore}
              </Link>
              <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {t.nav.categories}
              </Link>
              <Link to="/languages" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {t.nav.languages}
              </Link>
              <Link to="/write" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {t.nav.write}
              </Link>
              <Link to="/comments" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Reflections
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {t.nav.about}
              </Link>
              {firebaseUser && (
                <>
                  <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="py-1">
                    {t.nav.saved}
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="py-1">
                    {t.nav.profile}
                  </Link>
                  {(dbUser?.role === 'admin' || dbUser?.role === 'moderator') && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-1 text-[#3B828E] dark:text-[#7CC7D4]"
                    >
                      {t.nav.admin}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="py-1 text-left text-[#4E6478] dark:text-[#A8C2D8]"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </nav>
          </div>
        )}

        {/* Normal-Flow Compact Accessibility & Language Capsule */}
        <div className="ios-liquid-glass w-fit max-w-full rounded-full border border-white/80 px-3 py-1.5 text-xs text-[#54657A] sm:px-4 dark:border-white/15 dark:text-[#A9BACB]">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {firebaseUser && (
              <div className="hidden sm:flex items-center gap-2.5 pr-1">
                <Link to="/saved" className="hover:text-[#223142] dark:hover:text-white">
                  {t.nav.saved}
                </Link>
                <Link to="/comments" className="hover:text-[#223142] dark:hover:text-white">
                  Reflections
                </Link>
                {(dbUser?.role === 'admin' || dbUser?.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className="font-medium text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
                  >
                    {t.nav.admin}
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleQuickSearch} className="relative hidden lg:block">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#54657A]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search feelings…"
                aria-label="Quick search feelings"
                className="ios-glass-bubble w-40 rounded-full border border-white/85 py-1 pr-3 pl-8 text-xs text-[#223142] placeholder-[#6B7D92] transition-all focus:w-52 focus:border-[#3B828E] focus:outline-none dark:border-white/15 dark:text-[#EAF1F6]"
              />
            </form>

            <label className="flex items-center gap-1.5">
              <span className="sr-only">{t.accessibility.interfaceLang}</span>
              <select
                value={interfaceLang}
                onChange={(e) => setInterfaceLang(e.target.value as InterfaceLanguage)}
                aria-label="Interface language"
                className="ios-glass-bubble rounded-full border border-white/85 px-2.5 py-1 text-xs text-[#223142] dark:border-white/15 dark:text-[#EAF1F6]"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>

            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={`rounded-full border px-2.5 py-1 transition-all whitespace-nowrap shrink-0 ${
                highContrast
                  ? 'border-[#3B828E] bg-[#3B828E] text-white'
                  : 'ios-glass-bubble border-white/85 text-[#223142] dark:border-white/15 dark:text-[#EAF1F6]'
              }`}
            >
              {t.accessibility.contrast}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="ios-glass-bubble inline-flex items-center gap-1 rounded-full border border-white/85 px-2.5 py-1 text-[#223142] dark:border-white/15 dark:text-[#EAF1F6] whitespace-nowrap shrink-0"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.accessibility.themeDark}</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.accessibility.themeLight}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <main id="main-content" className="relative z-10 flex-1">
        {children}
      </main>

      {/* Bottom-Left Floating Symmetrical Compact Breathing AVheard Home Bubble */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, x: -12, scale: 0.94 }}
        animate={
          reducedMotion
            ? { opacity: 1 }
            : {
                opacity: 1,
                x: 0,
                scale: [1, 1.035, 1.035, 1],
              }
        }
        transition={{
          opacity: { duration: 0.4 },
          x: { type: 'spring', stiffness: 260, damping: 20 },
          scale: { duration: 6.8, times: [0, 0.44, 0.54, 1], repeat: Infinity, ease: 'easeInOut' },
        }}
        whileHover={reducedMotion ? undefined : { scale: 1.07 }}
        whileTap={reducedMotion ? undefined : { scale: 0.95 }}
        className="fixed bottom-3 left-3 z-40 grid place-items-center sm:bottom-4 sm:left-4"
      >
        {!reducedMotion && (
          <span
            aria-hidden="true"
            style={{
              borderColor: emotionTheme ? emotionTheme.touchColor : '#3B828E',
              background: `radial-gradient(circle, ${washPrimary}, transparent 70%)`,
            }}
            className="animate-breathe-ring pointer-events-none absolute inset-0 rounded-full border opacity-35"
          />
        )}
        <button
          type="button"
          onClick={handleGoHome}
          aria-label="Go to AVheard Home"
          title="Back to AVheard Home"
          className="relative inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-white/95 bg-white/88 px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_6px_18px_-6px_rgba(59,130,142,0.28)] backdrop-blur-xl dark:border-white/20 dark:bg-[#19232E]/90 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_6px_18px_-6px_rgba(0,0,0,0.65)]"
        >
          <AnimatedAVheardMark compact />
        </button>
      </motion.div>

      <footer className="relative z-10 mt-16 border-t border-white/80 bg-[#F7FAFD]/88 backdrop-blur-2xl dark:border-[#24303D] dark:bg-[#151D26]/92">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="flex flex-col justify-start md:col-span-1">
            <div>
              <p className="font-editorial text-lg font-medium text-[#223142] dark:text-[#EAF1F6]">
                {t.tagline}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                Anonymous reading, listening, and emotional expression across Indian languages and
                English.
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-[#223142] uppercase dark:text-[#EAF1F6]">
              Discover
            </h2>
            <ul className="space-y-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
              <li><Link to="/explore" className="hover:text-[#3B828E] dark:hover:text-white">Explore Feelings</Link></li>
              <li><Link to="/categories" className="hover:text-[#3B828E] dark:hover:text-white">Categories</Link></li>
              <li><Link to="/languages" className="hover:text-[#3B828E] dark:hover:text-white">Languages</Link></li>
              <li><Link to="/write" className="hover:text-[#3B828E] dark:hover:text-white">Share Anonymously</Link></li>
              <li><Link to="/comments" className="hover:text-[#3B828E] dark:hover:text-white">Community Reflections</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-[#223142] uppercase dark:text-[#EAF1F6]">
              Account & Sanctuary
            </h2>
            <ul className="space-y-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
              <li><Link to="/login" className="hover:text-[#3B828E] dark:hover:text-white">Login</Link></li>
              <li><Link to="/register" className="hover:text-[#3B828E] dark:hover:text-white">Create Account</Link></li>
              <li><Link to="/saved" className="hover:text-[#3B828E] dark:hover:text-white">Saved Feelings</Link></li>
              <li><Link to="/profile" className="hover:text-[#3B828E] dark:hover:text-white">Profile & Private Diary</Link></li>
              <li><Link to="/admin" className="hover:text-[#3B828E] dark:hover:text-white">Admin Panel</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-[#223142] uppercase dark:text-[#EAF1F6]">
              Support & Safety
            </h2>
            <ul className="space-y-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
              <li><Link to="/support" className="hover:text-[#3B828E] dark:hover:text-white">Support & Helplines</Link></li>
              <li><Link to="/about" className="hover:text-[#3B828E] dark:hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[#3B828E] dark:hover:text-white">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-[#3B828E] dark:hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#3B828E] dark:hover:text-white">Terms & Conditions</Link></li>
              <li><Link to="/guidelines" className="hover:text-[#3B828E] dark:hover:text-white">Community Guidelines</Link></li>
              <li><Link to="/safety" className="hover:text-[#3B828E] dark:hover:text-white">Content Safety</Link></li>
              <li className="pt-1 text-xs">
                <a
                  href="mailto:thedevotee3@gmail.com"
                  className="font-medium text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
                >
                  thedevotee3@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/70 py-5 text-xs text-[#54657A] dark:border-[#24303D] dark:text-[#96A9BC]">
          <div className="mx-auto flex max-w-6xl justify-end px-4 sm:px-6">
            <div className="flex flex-col items-end gap-1.5 text-right">
              <p>© {new Date().getFullYear()} AVheard — Feelings, Not a Story. Quietly built for human voices in every script.</p>
              <p className="inline-flex items-center justify-end gap-1.5 italic">
                <span>Made with</span>
                <Heart className="h-3.5 w-3.5 text-[#3B828E] dark:text-[#7CC7D4]" aria-hidden="true" />
                <span>for every heart</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
