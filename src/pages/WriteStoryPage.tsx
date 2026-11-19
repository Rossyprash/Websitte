import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Check,
  Copy,
  Edit3,
  KeyRound,
  Loader2,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getCategoryTheme } from '../lib/categoryThemes.ts';
import { CategoryIcon } from '../components/CategoryIcon.tsx';

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read audio recording.'));
    reader.readAsDataURL(blob);
  });
}

export function WriteStoryPage() {
  const {
    t,
    categories,
    languages,
    getCategoryName,
    getLanguageName,
    refreshBootstrap,
    reducedMotion,
    theme,
    setActiveEmotionSlug,
  } = useApp();
  const { getIdToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'publish' | 'manage'>('publish');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [languageCode, setLanguageCode] = useState('en');
  const [categorySlug, setCategorySlug] = useState('unspoken-feelings');
  const [contentWarning, setContentWarning] = useState('');
  const [anonymousConfirmed, setAnonymousConfirmed] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [challengeQuestion, setChallengeQuestion] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');

  // Real Voice Recording / Upload & AI Analysis state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [voiceMime, setVoiceMime] = useState<string | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [includeRealVoice, setIncludeRealVoice] = useState(true);
  const [autoCreateHeadingAndEmotion, setAutoCreateHeadingAndEmotion] = useState(true);
  const [voiceInstruction, setVoiceInstruction] = useState('');
  const [analyzingVoice, setAnalyzingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceInsight, setVoiceInsight] = useState<{
    detectedEmotionLabel?: string;
    instructionFollowed?: string;
  } | null>(null);

  // User-created custom category state
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryDesc, setCustomCategoryDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [customCategoryError, setCustomCategoryError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Ask-Before-Posting Confirmation Dialog state
  const [reviewOpen, setReviewOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] = useState<{
    slug: string;
    title: string;
    status: string;
    moderationNote: string;
    managementToken: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const [manageSlug, setManageSlug] = useState('');
  const [manageToken, setManageToken] = useState('');
  const [managedStory, setManagedStory] = useState<{
    slug: string;
    title: string;
    content: string;
    contentWarning: string | null;
    status: string;
  } | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  useEffect(() => {
    setActiveEmotionSlug(categorySlug);
    return () => setActiveEmotionSlug(null);
  }, [categorySlug, setActiveEmotionSlug]);

  const loadChallenge = async () => {
    try {
      const res = await fetch('/api/challenge');
      const data = await res.json();
      setChallengeQuestion(data.question);
      setChallengeToken(data.token);
      setChallengeAnswer('');
    } catch {}
  };

  useEffect(() => {
    loadChallenge();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      }
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
    };
  }, []);

  const clearRecordedVoice = () => {
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoiceBase64(null);
    setVoiceMime(null);
    setVoicePreviewUrl(null);
    setVoiceInsight(null);
    setVoiceError(null);
    setRecordSeconds(0);
  };

  const applyAudioBlob = async (blob: Blob, explicitMime?: string) => {
    setVoiceError(null);
    if (blob.size > 6.5 * 1024 * 1024) {
      setVoiceError('Audio file is slightly too large (max ~6.5 MB). Please record a shorter clip.');
      return;
    }
    const base64 = await blobToBase64(blob);
    const mime = (explicitMime || blob.type || 'audio/webm').split(';')[0];
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreviewUrl(URL.createObjectURL(blob));
    setVoiceBase64(base64);
    setVoiceMime(mime);
    setIncludeRealVoice(true);
  };

  const handleStartRecording = async () => {
    setVoiceError(null);
    setVoiceInsight(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone recording is unavailable in this browser. You can upload an audio file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenMime =
        typeof MediaRecorder !== 'undefined'
          ? preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
          : '';

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((tr) => tr.stop());
        mediaStreamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chosenMime || 'audio/webm',
        });
        if (blob.size > 0) {
          await applyAudioBlob(blob, recorder.mimeType || chosenMime);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setVoiceError('Microphone access was denied or unavailable. You can allow mic access or upload an audio clip.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await applyAudioBlob(file, file.type);
    e.target.value = '';
  };

  const handleAnalyzeVoice = async () => {
    if (!voiceBase64 || !voiceMime) return;
    setAnalyzingVoice(true);
    setVoiceError(null);
    setVoiceInsight(null);

    try {
      const res = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: voiceBase64,
          mimeType: voiceMime,
          instruction: voiceInstruction.trim() || undefined,
          autoCreateHeadingAndEmotion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not transcribe or analyze your voice.');
      }

      if (data.transcript) {
        setContent(data.transcript);
      }
      if (data.categorySlug) {
        setCategorySlug(data.categorySlug);
      }
      if (data.languageCode) {
        setLanguageCode(data.languageCode);
      }
      if (data.title && (autoCreateHeadingAndEmotion || voiceInstruction.trim().length > 0)) {
        setTitle(data.title);
      }
      if (data.contentWarning) {
        setContentWarning(data.contentWarning);
      }

      setVoiceInsight({
        detectedEmotionLabel: data.detectedEmotionLabel,
        instructionFollowed: data.instructionFollowed,
      });
    } catch (err: any) {
      setVoiceError(err.message || 'Voice analysis could not complete.');
    } finally {
      setAnalyzingVoice(false);
    }
  };

  const handleCreateCustomCategory = async () => {
    setCustomCategoryError(null);
    const trimmedName = customCategoryName.trim();
    if (trimmedName.length < 2) {
      setCustomCategoryError('Please enter at least 2 characters for your category name.');
      return;
    }
    setCreatingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: customCategoryDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create custom category.');
      }
      await refreshBootstrap();
      if (data.category?.slug) {
        setCategorySlug(data.category.slug);
      }
      setCustomCategoryName('');
      setCustomCategoryDesc('');
      setShowCustomCategory(false);
    } catch (err: any) {
      setCustomCategoryError(err.message || 'Could not create custom category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Step 1: Validate & ASK user before posting, offering Edit or Post
  const handleRequestReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 4) {
      setError('Please enter or auto-generate a heartfelt heading (at least 4 characters).');
      return;
    }
    if (content.trim().length < 20) {
      setError('Please share or transcribe at least 20 characters for your feeling.');
      return;
    }
    setReviewOpen(true);
  };

  // Step 2: Actually post after user confirms
  const handleConfirmPublish = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          content,
          languageCode,
          categorySlug,
          contentWarning: contentWarning.trim() || null,
          anonymousConfirmed,
          privacyAccepted,
          challengeToken,
          challengeAnswer,
          voiceAudioData: includeRealVoice && voiceBase64 ? voiceBase64 : null,
          voiceAudioMime: includeRealVoice && voiceBase64 ? voiceMime : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not share feeling.');
      }

      setReviewOpen(false);
      setPublishedResult({
        slug: data.story.slug,
        title: data.story.title,
        status: data.story.status,
        moderationNote: data.story.moderationNote,
        managementToken: data.managementToken,
      });
      setTitle('');
      setContent('');
      setContentWarning('');
      setVoiceInstruction('');
      clearRecordedVoice();
      setAnonymousConfirmed(false);
      setPrivacyAccepted(false);
      loadChallenge();
    } catch (err: any) {
      setReviewOpen(false);
      setError(err.message);
      loadChallenge();
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyManage = async (e: React.FormEvent) => {
    e.preventDefault();
    setManageError(null);
    setManageMessage(null);
    try {
      const res = await fetch('/api/stories/manage/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: manageSlug.trim(), managementToken: manageToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setManagedStory(data.story);
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleSaveManaged = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedStory) return;
    setManageError(null);
    const res = await fetch(`/api/stories/manage/${managedStory.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        managementToken: manageToken.trim(),
        title: managedStory.title,
        content: managedStory.content,
        contentWarning: managedStory.contentWarning,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setManageError(data.error || 'Could not update feeling.');
    } else {
      setManageMessage('Your feeling has been updated cleanly.');
    }
  };

  const handleDeleteManaged = async () => {
    if (!managedStory) return;
    const res = await fetch(`/api/stories/manage/${managedStory.slug}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managementToken: manageToken.trim() }),
    });
    if (res.ok) {
      setManagedStory(null);
      setManageSlug('');
      setManageToken('');
      setManageMessage('Your anonymous feeling has been permanently deleted.');
    }
  };

  const activeTheme = getCategoryTheme(categorySlug);
  const touchColor = theme === 'dark' ? activeTheme.darkTouchColor : activeTheme.touchColor;
  const lightBg = theme === 'dark' ? activeTheme.darkBgHex : activeTheme.lightBgHex;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: touchColor }}>
          Feelings, Not a Story.
        </p>
        <h1 className="font-editorial mt-1 text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          {t.write.heading}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
          {t.write.subheading}
        </p>
      </div>

      <div className="ios-liquid-glass mb-6 inline-flex rounded-full border border-white/85 p-1 dark:border-white/15">
        <button
          type="button"
          onClick={() => setActiveTab('publish')}
          className={`rounded-full px-5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'publish'
              ? 'bg-[#3B828E] text-white shadow-xs'
              : 'text-[#54657A] hover:text-[#223142] dark:text-[#A9BACB]'
          }`}
        >
          {t.write.publishTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={`rounded-full px-5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'manage'
              ? 'bg-[#3B828E] text-white shadow-xs'
              : 'text-[#54657A] hover:text-[#223142] dark:text-[#A9BACB]'
          }`}
        >
          {t.write.manageTab}
        </button>
      </div>

      {activeTab === 'publish' ? (
        publishedResult ? (
          <section className="ios-liquid-glass rounded-[28px] border border-white/85 p-8 dark:border-white/15">
            <ShieldCheck className="h-8 w-8 text-[#3B828E]" aria-hidden="true" />
            <h2 className="font-editorial mt-3 text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              {publishedResult.status === 'approved'
                ? 'Your feeling is now shared anonymously'
                : 'Your feeling was submitted for gentle review'}
            </h2>
            <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
              {publishedResult.moderationNote}
            </p>

            <div className="ios-glass-bubble mt-6 rounded-2xl border border-white/80 p-5 dark:border-white/15">
              <p className="text-xs font-semibold tracking-wider text-[#3B828E] uppercase">
                Private One-Time Management Token — Save This Now
              </p>
              <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
                Because AVheard requires no account, this token is the only key that lets you edit or
                delete this feeling later. We do not store a plain copy.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DFD5CD] bg-white/85 p-3 font-mono-tabular text-xs dark:border-[#362E2C] dark:bg-[#221D1B]">
                <div>
                  <div>
                    <span className="text-[#54657A]">Slug:</span> {publishedResult.slug}
                  </div>
                  <div className="mt-1">
                    <span className="text-[#54657A]">Token:</span> {publishedResult.managementToken}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Slug: ${publishedResult.slug}\nToken: ${publishedResult.managementToken}`
                    );
                    setCopiedToken(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3B828E] px-4 py-2 text-xs text-white hover:bg-[#2E6A75]"
                >
                  {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy credentials'}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {publishedResult.status === 'approved' && (
                <Link
                  to={`/feeling/${publishedResult.slug}`}
                  className="rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2E6A75]"
                >
                  View Shared Feeling
                </Link>
              )}
              <button
                type="button"
                onClick={() => setPublishedResult(null)}
                className="ios-glass-bubble rounded-full border border-white/80 px-6 py-2.5 text-sm font-medium text-[#223142] dark:border-white/15 dark:text-[#EEF4F8]"
              >
                Share Another Feeling
              </button>
            </div>
          </section>
        ) : (
          <>
            <form
              onSubmit={handleRequestReview}
              style={{
                backgroundImage: `radial-gradient(circle at top right, ${activeTheme.hoverTintHex}, transparent 60%)`,
                borderColor: activeTheme.borderHex,
              }}
              className="ios-liquid-glass space-y-6 rounded-[28px] border border-white/85 p-6 transition-all duration-300 sm:p-8 dark:border-white/15"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/60 pb-3 text-xs dark:border-white/10">
                <span
                  style={{ backgroundColor: lightBg, color: touchColor, borderColor: activeTheme.borderHex }}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 dark:bg-black/20">
                    <CategoryIcon slug={categorySlug} className="h-3 w-3" color={touchColor} />
                  </span>
                  <span style={{ color: touchColor }}>
                    {getCategoryName(categorySlug)} · {activeTheme.emotionLabel}
                  </span>
                </span>
              </div>

              {/* Real Voice Expression & AI Emotion / Heading Studio */}
              <div className="ios-glass-bubble rounded-3xl border border-white/85 p-5 dark:border-white/15">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-[#3B828E] dark:text-[#7CC7D4]" aria-hidden="true" />
                      <h2 className="font-editorial text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
                        Share Using Your Real Voice (Optional)
                      </h2>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                      Speak naturally in Hindi, English, Hinglish, or any regional tongue. We can
                      attach your real voice, transcribe your words, and auto-detect your emotion &
                      heading—with or without your custom instruction.
                    </p>
                  </div>

                  {isRecording && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5B638C] px-3 py-1 text-xs font-semibold text-white">
                      <span className="h-2 w-2 animate-ping rounded-full bg-white" aria-hidden="true" />
                      <span className="font-mono-tabular">Recording {formatTimer(recordSeconds)}</span>
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#3B828E] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#2E6A75]"
                    >
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{voiceBase64 ? 'Record Again' : 'Record Real Voice'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#5B638C] px-4 py-2 text-xs font-medium text-white shadow-sm hover:opacity-90"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Stop Recording ({formatTimer(recordSeconds)})</span>
                    </button>
                  )}

                  <label className="ios-glass-bubble inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border border-white/80 px-4 py-2 text-xs font-medium text-[#223142] hover:border-[#3B828E] dark:border-white/15 dark:text-[#EEF4F8]">
                    <Upload className="h-3.5 w-3.5 text-[#3B828E]" aria-hidden="true" />
                    <span>Upload Voice Clip</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileUpload}
                      className="sr-only"
                    />
                  </label>

                  {voicePreviewUrl && (
                    <button
                      type="button"
                      onClick={clearRecordedVoice}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#5B638C]/40 px-3.5 py-1.5 text-xs font-medium text-[#5B638C] hover:bg-[#5B638C]/10 dark:text-[#FCA5A5]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Remove voice</span>
                    </button>
                  )}
                </div>

                {voicePreviewUrl && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-white/75 bg-white/45 p-4 dark:border-white/10 dark:bg-black/20">
                    <audio controls src={voicePreviewUrl} className="w-full" />

                    <label className="flex items-start gap-2 text-xs text-[#223142] dark:text-[#DCE7F0]">
                      <input
                        type="checkbox"
                        checked={includeRealVoice}
                        onChange={(e) => setIncludeRealVoice(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Attach my real recorded voice audio so readers can listen directly to my voice
                      </span>
                    </label>

                    <label className="flex items-start gap-2 text-xs text-[#223142] dark:text-[#DCE7F0]">
                      <input
                        type="checkbox"
                        checked={autoCreateHeadingAndEmotion}
                        onChange={(e) => setAutoCreateHeadingAndEmotion(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Auto-create heading & detect emotion from my voice (uncheck if you only want
                        transcription & emotion detection without generating a heading)
                      </span>
                    </label>

                    <div>
                      <label
                        htmlFor="voice-instruction"
                        className="block text-[11px] font-medium text-[#54657A] dark:text-[#A9BACB]"
                      >
                        Optional instruction for heading or emotion (you can also speak instructions directly in your audio):
                      </label>
                      <input
                        id="voice-instruction"
                        type="text"
                        maxLength={220}
                        value={voiceInstruction}
                        onChange={(e) => setVoiceInstruction(e.target.value)}
                        placeholder="e.g., Make a 4-word Hindi heading, or Leave heading empty"
                        className="mt-1.5 min-h-[38px] w-full rounded-full border border-[#DFD5CD] bg-white/85 px-4 text-xs text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={analyzingVoice}
                        onClick={handleAnalyzeVoice}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#223142] px-4 py-2 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60 dark:bg-[#3B828E]"
                      >
                        {analyzingVoice ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {analyzingVoice
                            ? 'Listening & Detecting Emotion…'
                            : 'Transcribe Voice & Detect Emotion / Heading'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {voiceInsight && (
                  <div className="mt-3 rounded-2xl border border-[#C6E4D2] bg-emerald-50/75 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/35 dark:text-emerald-200">
                    <p className="font-semibold">
                      Detected Emotion: {voiceInsight.detectedEmotionLabel || getCategoryName(categorySlug)}
                    </p>
                    {voiceInsight.instructionFollowed && (
                      <p className="mt-0.5 opacity-90">{voiceInsight.instructionFollowed}</p>
                    )}
                    <p className="mt-0.5 opacity-80">
                      You can freely edit the heading, emotion, language, or words below before posting.
                    </p>
                  </div>
                )}

                {voiceError && (
                  <p className="mt-3 text-xs text-[#5B638C] dark:text-[#FCA5A5]">{voiceError}</p>
                )}
              </div>

              <div>
                <label htmlFor="story-title" className="block text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                  {t.write.titleLabel}
                </label>
                <input
                  ref={titleInputRef}
                  id="story-title"
                  type="text"
                  required
                  minLength={4}
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Write a heartfelt line or heading in any language (or auto-fill from voice)…"
                  className="mt-2 min-h-[44px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 py-2.5 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="story-lang" className="block text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                    {t.write.languageLabel}
                  </label>
                  <select
                    id="story-lang"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    className="mt-2 min-h-[44px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} — {l.name} {l.ttsSupported ? '(Audio supported)' : '(Text only)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="story-category" className="block text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                    {t.write.categoryLabel}
                  </label>
                  <select
                    id="story-category"
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="mt-2 min-h-[44px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {getCategoryName(c.slug)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bubble Emotion Room Selector + Custom Category Creator */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="block text-xs font-medium text-[#54657A] dark:text-[#A9BACB]">
                    Quick-pick emotional color bubble (or create your own if needed)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomCategory((prev) => !prev);
                      setCustomCategoryError(null);
                    }}
                    className="ios-glass-bubble inline-flex items-center gap-1 rounded-full border border-white/80 px-3 py-1 text-[11px] font-semibold text-[#3B828E] hover:border-[#3B828E] dark:border-white/15 dark:text-[#7CC7D4]"
                  >
                    <span>{showCustomCategory ? 'Close' : '+ Create Your Own Category'}</span>
                  </button>
                </div>

                {showCustomCategory && (
                  <div className="ios-glass-bubble mt-3 space-y-2.5 rounded-2xl border border-white/80 p-4 dark:border-white/15">
                    <p className="text-xs font-semibold text-[#223142] dark:text-[#EEF4F8]">
                      Can&apos;t find a category for your feeling? Create a new one:
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <input
                        type="text"
                        maxLength={45}
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Category name (e.g., Parenthood, Homesickness)"
                        className="min-h-[38px] rounded-full border border-[#DFD5CD] bg-white/85 px-3.5 text-xs text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                      />
                      <input
                        type="text"
                        maxLength={140}
                        value={customCategoryDesc}
                        onChange={(e) => setCustomCategoryDesc(e.target.value)}
                        placeholder="Short description (optional)"
                        className="min-h-[38px] rounded-full border border-[#DFD5CD] bg-white/85 px-3.5 text-xs text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                      />
                    </div>
                    {customCategoryError && (
                      <p className="text-xs text-[#5B638C] dark:text-[#FCA5A5]">{customCategoryError}</p>
                    )}
                    <button
                      type="button"
                      disabled={creatingCategory}
                      onClick={handleCreateCustomCategory}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#3B828E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2E6A75] disabled:opacity-60"
                    >
                      {creatingCategory ? 'Creating…' : 'Create & Select Category'}
                    </button>
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const cTheme = getCategoryTheme(c.slug);
                    const selected = categorySlug === c.slug;
                    const cTouch = theme === 'dark' ? cTheme.darkTouchColor : cTheme.touchColor;
                    const cBg = theme === 'dark' ? cTheme.darkBgHex : cTheme.lightBgHex;
                    return (
                      <motion.button
                        key={c.slug}
                        type="button"
                        whileHover={reducedMotion ? undefined : { y: -2, scale: 1.05 }}
                        whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                        onClick={() => setCategorySlug(c.slug)}
                        style={{
                          backgroundColor: selected ? cTouch : cBg,
                          color: selected ? '#FFFFFF' : cTouch,
                          borderColor: selected ? cTouch : cTheme.borderHex,
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                      >
                        <CategoryIcon
                          slug={c.slug}
                          className="h-3 w-3"
                          color={selected ? '#FFFFFF' : cTouch}
                        />
                        <span>{getCategoryName(c.slug)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="story-content" className="block text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                  {t.write.contentLabel}
                </label>
                <textarea
                  id="story-content"
                  rows={10}
                  required
                  minLength={20}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Let your feelings out honestly—in Devanagari, Bengali, Tamil, Urdu, Hinglish, English, or any Unicode script. No need to turn it into a story…"
                  className="mt-2 w-full rounded-2xl border border-[#DFD5CD] bg-white/75 p-4 text-sm leading-relaxed text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                />
              </div>

              <div>
                <label htmlFor="story-warning" className="block text-sm font-medium text-[#223142] dark:text-[#EEF4F8]">
                  {t.write.warningLabel}
                </label>
                <input
                  id="story-warning"
                  type="text"
                  maxLength={80}
                  value={contentWarning}
                  onChange={(e) => setContentWarning(e.target.value)}
                  placeholder="e.g., Grief & Loss, Family Conflict (leave blank if none)"
                  className="mt-2 min-h-[44px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 py-2 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                />
              </div>

              <div className="ios-glass-bubble rounded-2xl border border-white/80 p-4 text-xs leading-relaxed text-[#54657A] dark:border-white/15 dark:text-[#A9BACB]">
                <strong className="text-[#223142] dark:text-[#EEF4F8]">Privacy Warning:</strong> Never
                include phone numbers, email addresses, home addresses, workplace names, or real full
                names of private individuals.
              </div>

              <div className="space-y-3 text-sm">
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    required
                    checked={anonymousConfirmed}
                    onChange={(e) => setAnonymousConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                    {t.write.anonymousConfirm}
                  </span>
                </label>

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    required
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                    {t.write.privacyConfirm}
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="human-check" className="block text-xs font-medium text-[#54657A] dark:text-[#A9BACB]">
                  Abuse Protection Check: {challengeQuestion || 'Loading verification…'}
                </label>
                <input
                  id="human-check"
                  type="text"
                  required
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  placeholder="Enter number"
                  className="mt-1.5 min-h-[40px] w-44 rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
                />
              </div>

              {error && <p className="text-sm text-[#5B638C] dark:text-[#FCA5A5]">{error}</p>}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={reducedMotion ? undefined : { y: -2, scale: 1.03 }}
                whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className="min-h-[44px] rounded-full bg-[#3B828E] px-7 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2E6A75] disabled:opacity-50"
              >
                {submitting ? t.write.submitting : 'Review Before Posting'}
              </motion.button>
            </form>

            {/* Pre-Publish Confirmation Dialog: Ask before posting + Edit option */}
            {reviewOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-feeling-heading"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              >
                <div
                  style={{
                    backgroundImage: `radial-gradient(circle at top right, ${activeTheme.hoverTintHex}, transparent 65%)`,
                    borderColor: touchColor,
                  }}
                  className="ios-liquid-glass w-full max-w-xl rounded-[28px] border p-6 shadow-2xl sm:p-8"
                >
                  <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: touchColor }}>
                    Confirm Before Posting
                  </p>
                  <h2
                    id="review-feeling-heading"
                    className="font-editorial mt-1 text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]"
                  >
                    Ready to post this feeling anonymously?
                  </h2>
                  <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
                    Please check your heading, emotion, and words below. Would you like to edit
                    anything first, or post now?
                  </p>

                  <div className="ios-glass-bubble mt-4 space-y-3 rounded-2xl border border-white/80 p-4 text-sm dark:border-white/15">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        style={{ backgroundColor: lightBg, color: touchColor, borderColor: activeTheme.borderHex }}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold"
                      >
                        <CategoryIcon slug={categorySlug} className="h-3.5 w-3.5" color={touchColor} />
                        <span style={{ color: touchColor }}>{getCategoryName(categorySlug)}</span>
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] text-[#223142] dark:bg-black/25 dark:text-[#EEF4F8]">
                        {getLanguageName(languageCode)}
                      </span>
                      {contentWarning.trim() && (
                        <span className="text-[11px] text-[#5B638C] dark:text-[#FCA5A5]">
                          CW: {contentWarning}
                        </span>
                      )}
                    </div>

                    <h3 className="font-editorial text-lg font-semibold text-[#223142] dark:text-[#EEF4F8]">
                      {title}
                    </h3>

                    <p className="max-h-44 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[#223142] dark:text-[#DCE7F0]">
                      {content}
                    </p>

                    {includeRealVoice && voicePreviewUrl && (
                      <div className="border-t border-white/60 pt-2.5 dark:border-white/10">
                        <p className="mb-1.5 text-[11px] font-semibold" style={{ color: touchColor }}>
                          Real voice recording attached:
                        </p>
                        <audio controls src={voicePreviewUrl} className="w-full" />
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setReviewOpen(false);
                        titleInputRef.current?.focus();
                      }}
                      className="ios-glass-bubble inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-white/80 px-5 py-2 text-xs font-semibold text-[#223142] hover:border-[#3B828E] dark:border-white/15 dark:text-[#EEF4F8]"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit Feeling</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmPublish}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-[#3B828E] px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#2E6A75] disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{submitting ? 'Posting…' : 'Yes, Post Anonymously'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <section className="ios-liquid-glass rounded-[28px] border border-white/85 p-6 sm:p-8 dark:border-white/15">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#3B828E]" aria-hidden="true" />
            <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              Manage Your Anonymous Feeling
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
            Enter the feeling URL slug and private one-time management token you received after sharing.
          </p>

          <form onSubmit={handleVerifyManage} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="manage-slug" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
                Feeling Slug
              </label>
              <input
                id="manage-slug"
                type="text"
                required
                value={manageSlug}
                onChange={(e) => setManageSlug(e.target.value)}
                placeholder="e.g., quiet-rain-1a2b3c"
                className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              />
            </div>
            <div>
              <label htmlFor="manage-token" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
                Private Management Token
              </label>
              <input
                id="manage-token"
                type="password"
                required
                value={manageToken}
                onChange={(e) => setManageToken(e.target.value)}
                placeholder="unh_..."
                className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="min-h-[40px] rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
              >
                Unlock Feeling
              </button>
            </div>
          </form>

          {manageError && <p className="mt-3 text-xs text-[#5B638C] dark:text-[#FCA5A5]">{manageError}</p>}
          {manageMessage && <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">{manageMessage}</p>}

          {managedStory && (
            <form onSubmit={handleSaveManaged} className="mt-6 space-y-4 border-t border-[#D7E3EC]/70 pt-6 dark:border-[#273544]">
              <div>
                <label className="block text-xs font-medium">Title</label>
                <input
                  type="text"
                  value={managedStory.title}
                  onChange={(e) => setManagedStory({ ...managedStory, title: e.target.value })}
                  className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-white/75 px-4 text-sm dark:border-[#362E2C] dark:bg-[#121820]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Feeling Text</label>
                <textarea
                  rows={8}
                  value={managedStory.content}
                  onChange={(e) => setManagedStory({ ...managedStory, content: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#DFD5CD] bg-white/75 p-4 text-sm dark:border-[#362E2C] dark:bg-[#121820]"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="min-h-[40px] rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleDeleteManaged}
                  className="min-h-[40px] rounded-full border border-[#5B638C] px-5 py-2 text-xs font-medium text-[#5B638C] dark:border-[#FCA5A5] dark:text-[#FCA5A5]"
                >
                  Delete Permanently
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </motion.div>
  );
}
