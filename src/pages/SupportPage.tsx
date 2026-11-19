import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Heart, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { StorySummary } from '../components/StoryCard.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

export function SupportPage() {
  const { visitorKey, getCategoryName, theme } = useApp();
  const [supportedFeelings, setSupportedFeelings] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    fetch('/api/stories?sort=supported&limit=6')
      .then((r) => r.json())
      .then((data) => {
        if (active) setSupportedFeelings(data.stories || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sendSilentSupport = async (storyId: number) => {
    try {
      const res = await fetch(`/api/stories/${storyId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType: 'empathy', sessionKey: visitorKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setSentIds((prev) => ({ ...prev, [storyId]: Boolean(data.active) }));
        setSupportedFeelings((prev) =>
          prev.map((s) =>
            s.id === storyId
              ? { ...s, supportCount: Math.max(0, s.supportCount + (data.active ? 1 : -1)) }
              : s
          )
        );
      }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div className="border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]">
        <p className="text-xs font-semibold tracking-widest text-[#3B828E] uppercase dark:text-[#7CC7D4]">
          Support & Emotional Care
        </p>
        <h1 className="font-editorial mt-1 text-3xl font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
          You are heard here.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
          Send silent emotional support to anonymous voices without logging in, reach 24/7 trained
          counselors when life feels heavy, or write directly to our team.
        </p>
      </div>

      {/* Interactive Send Silent Support Grid */}
      <section aria-label="Send silent support">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-editorial text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            Voices Waiting for Silent Support
          </h2>
          <Link
            to="/explore?sort=supported"
            className="text-sm font-medium text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
          >
            Explore all supported feelings
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="ios-liquid-glass h-48 rounded-[28px] border border-white/80" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {supportedFeelings.map((story, idx) => {
              const catTheme = getCategoryTheme(story.categorySlug);
              const touch = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
              const bgHex = theme === 'dark' ? catTheme.darkBgHex : catTheme.lightBgHex;
              const isSent = Boolean(sentIds[story.id]);
              return (
                <motion.div
                  key={story.id}
                  whileHover={{ y: -4, scale: 1.015 }}
                  style={{
                    animationDelay: `${(idx % 6) * 0.65}s`,
                    backgroundImage: `radial-gradient(circle at top right, ${catTheme.hoverTintHex}, transparent 65%)`,
                  }}
                  className="ios-liquid-glass flex flex-col justify-between rounded-[28px] border border-white/85 p-6 dark:border-white/10"
                >
                  <div>
                    <span
                      style={{ backgroundColor: bgHex, color: touch }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                    >
                      <CategoryIcon slug={story.categorySlug} className="h-3 w-3" color={touch} />
                      <span>{getCategoryName(story.categorySlug)}</span>
                    </span>
                    <h3 className="font-editorial mt-3 text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
                      <Link to={`/feeling/${story.slug}`} className="hover:text-[#3B828E]">
                        {story.title}
                      </Link>
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                      {story.excerpt}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#E4EEF5]/70 pt-3 dark:border-[#273544]">
                    <button
                      type="button"
                      onClick={() => sendSilentSupport(story.id)}
                      aria-pressed={isSent}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        isSent
                          ? 'border-[#3B828E] bg-[#3B828E] text-white'
                          : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isSent ? 'fill-current' : ''}`} aria-hidden="true" />
                      <span className="font-mono-tabular">Support ({story.supportCount})</span>
                    </button>

                    <Link
                      to={`/feeling/${story.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
                    >
                      <span>Read</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Helplines & Direct Contact Details */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="ios-liquid-glass rounded-[28px] border border-white/85 p-7 dark:border-white/10">
          <div className="flex items-center gap-2 text-[#3B828E] dark:text-[#7CC7D4]">
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              24/7 Emotional Support Helplines (India)
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
            Free, confidential support from trained mental health counselors whenever you need someone
            to talk to directly.
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-[#223142] dark:text-[#DCE7F0]">
            <li>
              <strong>Tele-MANAS:</strong>{' '}
              <span className="font-mono-tabular text-[#3B828E] dark:text-[#7CC7D4]">14416</span> or{' '}
              <span className="font-mono-tabular">1-800-891-4416</span> (24/7, Multilingual)
            </li>
            <li>
              <strong>KIRAN Helpline:</strong>{' '}
              <span className="font-mono-tabular text-[#3B828E] dark:text-[#7CC7D4]">1800-599-0019</span>
            </li>
            <li>
              <strong>iCall (TISS):</strong>{' '}
              <span className="font-mono-tabular text-[#3B828E] dark:text-[#7CC7D4]">9152987821</span>{' '}
              (Mon–Sat, 10 AM – 8 PM)
            </li>
          </ul>
        </div>

        <div className="ios-liquid-glass flex flex-col justify-between rounded-[28px] border border-white/85 p-7 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 text-[#3B7F60] dark:text-[#8ED4B3]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
                Direct Care & Contact Details
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
              For platform help, urgent content takedowns, accessibility support, or feedback, reach
              out directly via Gmail:
            </p>
            <a
              href="mailto:thedevotee3@gmail.com"
              className="ios-glass-bubble mt-4 inline-flex items-center gap-2 rounded-full border border-white/80 px-5 py-2.5 text-sm font-semibold text-[#3B828E] hover:border-[#3B828E] dark:border-white/10 dark:text-[#7CC7D4]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>thedevotee3@gmail.com</span>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              <span>Open Contact Form</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              to="/safety"
              className="ios-glass-bubble inline-flex items-center rounded-full border border-white/80 px-5 py-2 text-xs font-medium text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
            >
              Content Removal Request
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
