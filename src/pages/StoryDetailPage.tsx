import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  Flag,
  Heart,
  Languages,
  Share2,
  Shield,
  Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { AudioPlayer } from '../components/AudioPlayer.tsx';
import { AdPlacement } from '../components/AdPlacement.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

interface StoryDetail {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  languageCode: string;
  categorySlug: string;
  contentWarning: string | null;
  isAdEligible: boolean;
  readingTimeMinutes: number;
  supportCount: number;
  viewCount: number;
  createdAt: string;
  authorLabel: string;
  ttsSupported: boolean;
  hasRealVoice?: boolean;
  voiceAudioData?: string | null;
  voiceAudioMime?: string | null;
}

interface CommentItem {
  id: number;
  storyId: number;
  parentId: number | null;
  authorAlias: string;
  body: string;
  createdAt: string;
}

export function StoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    t,
    getCategoryName,
    getLanguageName,
    visitorKey,
    reducedMotion,
    theme,
    setActiveEmotionSlug,
  } = useApp();
  const { firebaseUser, dbUser, getIdToken, signInWithGoogle } = useAuth();
  const isAdmin = dbUser?.role === 'admin' || dbUser?.role === 'moderator';

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({
    empathy: 0,
    strength: 0,
    heard: 0,
    solidarity: 0,
  });
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [warningRevealed, setWarningRevealed] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [translated, setTranslated] = useState<{
    title: string;
    content: string;
    target: string;
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [anonymousAlias, setAnonymousAlias] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Personal contact info / PII');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setTranslated(null);
    setWarningRevealed(false);

    (async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`/api/stories/${slug}`, { headers });
        if (res.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setStory(data.story);
        setReactions(data.reactions || { empathy: 0, strength: 0, heard: 0, solidarity: 0 });
        setComments(data.comments || []);
        setIsBookmarked(Boolean(data.isBookmarked));
        if (data.story?.categorySlug) {
          setActiveEmotionSlug(data.story.categorySlug);
        }

        if (data.story?.title) {
          document.title = `${data.story.title} — AVheard`;
        }
      } catch (err) {
        console.error('Feeling detail fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      setActiveEmotionSlug(null);
      document.title = 'Feelings, Not a Story. — AVheard';
    };
  }, [slug, firebaseUser, setActiveEmotionSlug]);

  const handleReact = async (reactionType: string) => {
    if (!story) return;
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/stories/${story.id}/react`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType, sessionKey: visitorKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions((prev) => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) + (data.active ? 1 : -1)),
        }));
      }
    } catch {}
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: story?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {}
  };

  const handleBookmark = async () => {
    if (!story) return;
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    const token = await getIdToken();
    const res = await fetch(`/api/bookmarks/${story.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setIsBookmarked(Boolean(data.saved));
    }
  };

  const handleTranslate = async (targetLanguage: 'English' | 'Hindi' | 'Hinglish') => {
    if (!story) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation unavailable');
      setTranslated({
        title: data.translated.title,
        content: data.translated.content,
        target: targetLanguage,
      });
    } catch (err: any) {
      setTranslateError(err.message || 'Could not translate right now.');
    } finally {
      setTranslating(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || !firebaseUser) return;
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/stories/${story.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          body: commentBody,
          parentId: replyToId,
          anonymousAlias,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not post reflection');
      setComments((prev) => [...prev, data.comment]);
      setCommentBody('');
      setReplyToId(null);
    } catch (err: any) {
      setCommentError(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'story',
        targetId: story.id,
        reason: reportReason,
        details: reportDetails,
      }),
    });
    if (res.ok) {
      setReportDone(true);
      setReportDetails('');
    }
  };

  const handleAdminDeleteStory = async () => {
    if (!story || !isAdmin) return;
    const token = await getIdToken();
    const res = await fetch(`/api/admin/stories/${story.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      navigate('/explore');
    }
  };

  const handleAdminHideStory = async () => {
    if (!story || !isAdmin) return;
    const token = await getIdToken();
    const res = await fetch(`/api/admin/stories/${story.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'removed' }),
    });
    if (res.ok) {
      navigate('/explore');
    }
  };

  const handleAdminDeleteComment = async (commentId: number) => {
    if (!isAdmin) return;
    const token = await getIdToken();
    const res = await fetch(`/api/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="ios-liquid-glass h-8 w-40 animate-pulse rounded-full" />
        <div className="ios-liquid-glass mt-6 h-12 w-full animate-pulse rounded-3xl" />
        <div className="ios-liquid-glass mt-6 h-72 w-full animate-pulse rounded-[28px]" />
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Feeling not found
        </h1>
        <p className="mt-3 text-sm text-[#54657A] dark:text-[#A9BACB]">
          This feeling may have been removed by its anonymous author or moderation.
        </p>
        <Link
          to="/explore"
          className="mt-6 inline-flex rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2E6A75]"
        >
          {t.story.backToExplore}
        </Link>
      </div>
    );
  }

  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<number, CommentItem[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const displayedTitle = translated ? translated.title : story.title;
  const displayedContent = translated ? translated.content : story.content;
  const catTheme = getCategoryTheme(story.categorySlug);
  const touchColor = theme === 'dark' ? catTheme.darkTouchColor : catTheme.touchColor;
  const lightBg = theme === 'dark' ? catTheme.darkBgHex : catTheme.lightBgHex;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
    >
      <Link
        to="/explore"
        className="ios-glass-bubble inline-flex items-center gap-1.5 rounded-full border border-white/80 px-4 py-1.5 text-xs font-medium text-[#54657A] hover:text-[#223142] dark:border-white/10 dark:text-[#A9BACB] dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t.story.backToExplore}</span>
      </Link>

      {isAdmin && (
        <div className="ios-glass-bubble mt-4 flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-[#3B828E]/40 px-4 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#3B828E] dark:text-[#7CC7D4]">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Owner Control</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin"
              className="rounded-full border border-[#DFD5CD] px-3 py-1 font-medium hover:border-[#3B828E]"
            >
              Open Full Admin Panel
            </Link>
            <button
              type="button"
              onClick={handleAdminHideStory}
              className="rounded-full border border-[#B85D68] px-3 py-1 font-medium text-[#B85D68]"
            >
              Hide Post
            </button>
            <button
              type="button"
              onClick={handleAdminDeleteStory}
              className="inline-flex items-center gap-1 rounded-full bg-[#5B638C] px-3 py-1 font-medium text-white"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Delete Post</span>
            </button>
          </div>
        </div>
      )}

      {/* Liquid Glass Bubble Feeling Header */}
      <header
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${catTheme.hoverTintHex}, transparent 65%)`,
        }}
        className="ios-liquid-glass mt-6 rounded-[28px] border border-white/85 p-6 sm:p-8 dark:border-white/10"
      >
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5 text-xs text-[#54657A] dark:text-[#A9BACB]">
          <Link
            to={`/explore?category=${story.categorySlug}`}
            style={{ backgroundColor: lightBg, color: touchColor }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-transform hover:scale-105"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/75 dark:bg-black/20">
              <CategoryIcon slug={story.categorySlug} className="h-3 w-3" color={touchColor} />
            </span>
            <span>{getCategoryName(story.categorySlug)}</span>
          </Link>
          <span>Original language: {getLanguageName(story.languageCode)}</span>
          <span aria-hidden="true">·</span>
          <span>{t.story.anonymousAuthor}</span>
          <span aria-hidden="true">·</span>
          <span>
            {new Date(story.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{story.readingTimeMinutes} min read</span>
        </div>

        <h1 className="font-editorial text-3xl leading-tight font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
          {displayedTitle}
        </h1>

        {/* Action Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              whileHover={reducedMotion ? undefined : { scale: 1.04 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              onClick={handleShare}
              className="ios-glass-bubble inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/80 px-3.5 py-1.5 text-xs font-medium text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8] whitespace-nowrap shrink-0"
            >
              {shareCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{shareCopied ? 'Link copied' : t.story.shareStory}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={reducedMotion ? undefined : { scale: 1.04 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              onClick={handleBookmark}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                isBookmarked
                  ? 'border-[#3B828E] bg-[#3B828E] text-white'
                  : 'ios-glass-bubble border-white/80 text-[#223142] hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isBookmarked ? t.story.savedStory : t.story.saveStory}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={reducedMotion ? undefined : { scale: 1.04 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              onClick={() => setReportOpen((prev) => !prev)}
              className="ios-glass-bubble inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/80 px-3.5 py-1.5 text-xs font-medium text-[#54657A] hover:text-[#5B638C] dark:border-white/10 dark:text-[#A9BACB] whitespace-nowrap shrink-0"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.story.reportStory}</span>
            </motion.button>
          </div>

          {/* Optional Translation Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Languages className="h-3.5 w-3.5 text-[#3B828E]" aria-hidden="true" />
            {translated ? (
              <button
                type="button"
                onClick={() => setTranslated(null)}
                className="font-medium text-[#3B828E] underline underline-offset-4"
              >
                {t.story.showOriginal} ({getLanguageName(story.languageCode)})
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[#54657A] dark:text-[#A9BACB]">Translate:</span>
                {(['English', 'Hindi', 'Hinglish'] as const).map((langOpt) => (
                  <button
                    key={langOpt}
                    type="button"
                    disabled={translating}
                    onClick={() => handleTranslate(langOpt)}
                    className="ios-glass-bubble rounded-full border border-white/80 px-3 py-1 text-xs text-[#223142] hover:border-[#3B828E] disabled:opacity-50 dark:border-white/10 dark:text-[#EEF4F8]"
                  >
                    {langOpt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {translateError && (
          <p className="mt-2 text-xs text-[#5B638C] dark:text-[#FCA5A5]">{translateError}</p>
        )}
      </header>

      {/* Report Panel */}
      {reportOpen && (
        <section
          aria-label="Report inappropriate feeling"
          className="ios-liquid-glass mt-6 rounded-[28px] border border-white/85 p-6 dark:border-white/10"
        >
          {reportDone ? (
            <p className="text-sm text-[#223142] dark:text-[#EEF4F8]">
              Thank you. Your safety report has been logged for moderator review.
            </p>
          ) : (
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <p className="text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                Report feeling for safety review (no login needed)
              </p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                aria-label="Report reason"
                className="w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD] px-4 py-2.5 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              >
                <option>Personal contact info / PII</option>
                <option>Harassment or hate speech</option>
                <option>Self-harm crisis or unsafe content</option>
                <option>Spam or commercial promotion</option>
                <option>Other guideline violation</option>
              </select>
              <textarea
                rows={2}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Optional context for moderators…"
                className="w-full rounded-2xl border border-[#DFD5CD] bg-[#F7FAFD] px-4 py-2.5 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#5B638C] px-5 py-2 text-xs font-medium text-white"
                >
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="rounded-full border border-[#DFD5CD] px-5 py-2 text-xs font-medium text-[#223142] dark:border-[#362E2C] dark:text-[#EEF4F8]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Audio Listening Player */}
      <AudioPlayer
        storyId={story.id}
        title={displayedTitle}
        content={displayedContent}
        languageCode={translated ? (translated.target === 'Hindi' ? 'hi' : 'en') : story.languageCode}
        ttsSupported={story.ttsSupported || Boolean(translated)}
        realVoiceData={translated ? null : story.voiceAudioData}
        realVoiceMime={translated ? null : story.voiceAudioMime}
      />

      {/* Content Warning Gate or Reading Prose */}
      {story.contentWarning && !warningRevealed ? (
        <div className="ios-liquid-glass my-8 rounded-[28px] border border-white/85 p-8 text-center dark:border-white/10">
          <AlertTriangle className="mx-auto h-7 w-7 text-[#5B638C] dark:text-[#FCA5A5]" aria-hidden="true" />
          <h2 className="font-editorial mt-3 text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            Content Notice
          </h2>
          <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
            The author added a gentle content warning: <strong>{story.contentWarning}</strong>.
          </p>
          <button
            type="button"
            onClick={() => setWarningRevealed(true)}
            className="mt-5 rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2E6A75]"
          >
            Continue Reading
          </button>
        </div>
      ) : (
        <div className="ios-liquid-glass my-8 space-y-5 rounded-[28px] border border-white/85 p-6 text-base leading-[1.85] text-[#223142] sm:p-10 sm:text-[17px] dark:border-white/10 dark:text-[#DCE7F0]">
          {translated && (
            <p className="text-xs italic text-[#3B828E]">
              Showing {translated.target} reading translation. The original script remains preserved.
            </p>
          )}
          {displayedContent.split(/\n{2,}/).map((para, idx) => (
            <p
              key={idx}
              className={
                idx === 0
                  ? 'first-letter:font-editorial first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-5xl first-letter:leading-none first-letter:font-medium'
                  : ''
              }
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Emotional Support Reactions (No login required) */}
      <section
        aria-label="Emotional support reactions"
        style={{
          backgroundImage: `radial-gradient(circle at bottom right, ${catTheme.hoverTintHex}, transparent 70%)`,
        }}
        className="ios-liquid-glass my-10 rounded-[28px] border border-white/85 p-6 dark:border-white/10"
      >
        <h2 className="text-sm font-semibold text-[#223142] dark:text-[#EEF4F8]">
          {t.story.supportHeading}
        </h2>
        <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
          Let this anonymous heart know their feeling reached you. No login required.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {[
            { id: 'empathy', label: 'I feel this' },
            { id: 'heard', label: 'You are heard' },
            { id: 'strength', label: 'Sending strength' },
            { id: 'solidarity', label: 'Not alone' },
          ].map((btn) => (
            <motion.button
              key={btn.id}
              type="button"
              whileTap={reducedMotion ? undefined : { scale: 0.92 }}
              whileHover={reducedMotion ? undefined : { y: -3, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              onClick={() => handleReact(btn.id)}
              className="ios-glass-bubble inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/80 px-4 py-2 text-xs font-medium text-[#223142] transition-colors hover:border-[#3B828E] hover:text-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]"
            >
              <Heart className="h-3.5 w-3.5" style={{ color: touchColor }} aria-hidden="true" />
              <span>{btn.label}</span>
              <span className="font-mono-tabular text-[#54657A] dark:text-[#A9BACB]">
                {reactions[btn.id] || 0}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <AdPlacement
        placement="storyDetail"
        isEligible={story.isAdEligible}
        hasContentWarning={Boolean(story.contentWarning)}
      />

      {/* Comments Section (Login Required) */}
      <section aria-label="Comments" className="mt-12 border-t border-[#D7E3EC] pt-8 dark:border-[#24303D]">
        <h2 className="font-editorial text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          {t.story.commentsHeading} ({comments.length})
        </h2>

        {firebaseUser ? (
          <form onSubmit={handleCommentSubmit} className="mt-5 space-y-3">
            {replyToId && (
              <div className="ios-glass-bubble flex items-center justify-between rounded-full border border-white/80 px-4 py-2 text-xs text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]">
                <span>Replying to reflection #{replyToId}</span>
                <button
                  type="button"
                  onClick={() => setReplyToId(null)}
                  className="underline"
                >
                  Cancel reply
                </button>
              </div>
            )}
            <label htmlFor="comment-box" className="sr-only">
              Write a supportive reflection
            </label>
            <textarea
              id="comment-box"
              rows={3}
              required
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a gentle, supportive reflection…"
              className="ios-liquid-glass w-full rounded-2xl border border-white/85 p-4 text-sm text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-[#54657A] dark:text-[#A9BACB]">
                <input
                  type="checkbox"
                  checked={anonymousAlias}
                  onChange={(e) => setAnonymousAlias(e.target.checked)}
                />
                <span>Display as anonymous Reader Alias</span>
              </label>

              <motion.button
                type="submit"
                disabled={commentSubmitting}
                whileHover={reducedMotion ? undefined : { scale: 1.03 }}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className="min-h-[40px] rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75] disabled:opacity-50"
              >
                {commentSubmitting ? 'Posting…' : 'Post Reflection'}
              </motion.button>
            </div>
            {commentError && (
              <p className="text-xs text-[#5B638C] dark:text-[#FCA5A5]">{commentError}</p>
            )}
          </form>
        ) : (
          <div className="ios-liquid-glass mt-5 rounded-[28px] border border-white/85 p-6 dark:border-white/10">
            <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">{t.story.loginToComment}</p>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="mt-3 min-h-[40px] rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Sign In to Comment
            </button>
          </div>
        )}

        <div className="mt-8 space-y-5">
          {rootComments.length === 0 ? (
            <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
              No reflections yet. Be the first to leave a kind note.
            </p>
          ) : (
            rootComments.map((c) => (
              <div
                key={c.id}
                className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/10"
              >
                <div className="flex items-center justify-between text-xs text-[#54657A] dark:text-[#A9BACB]">
                  <span className="font-medium text-[#223142] dark:text-[#EEF4F8]">
                    {c.authorAlias}
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#223142] dark:text-[#DCE7F0]">
                  {c.body}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {firebaseUser && (
                    <button
                      type="button"
                      onClick={() => setReplyToId(c.id)}
                      className="text-xs font-medium text-[#3B828E] hover:underline"
                    >
                      Reply
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleAdminDeleteComment(c.id)}
                      className="text-xs font-medium text-[#5B638C] hover:underline dark:text-[#FCA5A5]"
                    >
                      Delete Comment
                    </button>
                  )}
                </div>

                {repliesByParent[c.id]?.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-[#E4EEF5]/70 pt-3 pl-4 dark:border-[#273544]">
                    {repliesByParent[c.id].map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center justify-between text-xs text-[#54657A] dark:text-[#A9BACB]">
                          <span className="font-medium text-[#223142] dark:text-[#EEF4F8]">
                            {reply.authorAlias}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteComment(reply.id)}
                                className="text-[11px] text-[#5B638C] hover:underline dark:text-[#FCA5A5]"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-[#223142] dark:text-[#DCE7F0]">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </motion.article>
  );
}
