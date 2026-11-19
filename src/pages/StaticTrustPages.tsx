import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  const [img1Error, setImg1Error] = useState(false);
  const [img2Error, setImg2Error] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-widest text-[#3B828E] uppercase">
        Feelings, Not a Story.
      </p>
      <h1 className="font-editorial mt-2 text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
        About AVheard
      </h1>
      <p className="mt-3 text-base leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
        A feeling does not need a beginning, a plot twist, or an ending to deserve to be heard.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[#223142] shadow-sm dark:border-white/10">
          {!img1Error ? (
            <img
              src="/src/assets/images/unheard_voice_listening_1795113046235.jpg"
              alt="Quiet reading chair and brass lamp in calm evening light"
              referrerPolicy="no-referrer"
              onError={() => setImg1Error(true)}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 items-end bg-gradient-to-br from-[#223142] to-[#54657A] p-6 text-white">
              <p className="font-editorial text-lg">A calm room to listen without judgment</p>
            </div>
          )}
        </div>
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[#223142] shadow-sm dark:border-white/10">
          {!img2Error ? (
            <img
              src="/src/assets/images/unheard_archive_letters_1795113046474.jpg"
              alt="Archival handmade cotton paper letters tied with thread"
              referrerPolicy="no-referrer"
              onError={() => setImg2Error(true)}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 items-end bg-gradient-to-br from-[#223142] to-[#3B828E] p-6 text-white">
              <p className="font-editorial text-lg">Every script preserved in its original truth</p>
            </div>
          )}
        </div>
      </div>

      <div className="ios-liquid-glass mt-10 space-y-5 rounded-[28px] border border-white/85 p-6 text-base leading-[1.8] text-[#223142] sm:p-8 dark:border-white/10 dark:text-[#DCE7F0]">
        <p>
          Most platforms ask you to perform—turn your pain into a polished narrative, chase likes,
          and translate your heart into whatever language travels fastest. <strong>AVheard</strong>{' '}
          was built around one simple truth: <strong>Feelings, Not a Story.</strong>
        </p>
        <p className="text-[#54657A] dark:text-[#A9BACB]">
          Whether you express yourself in Hindi, Bengali, Tamil, Marathi, Urdu, Hinglish, Santali,
          or English, your original script stays exactly as you wrote it. Nobody rewrites your
          feelings.
        </p>
        <p className="text-[#54657A] dark:text-[#A9BACB]">
          When you want to revisit a feeling, leave a caring reflection, or keep a private journal
          for your own eyes, optional Google sign-in unlocks saved feelings, comments, and your
          Private Diary—while public reading, listening, silent support, and anonymous expression
          always stay open to everyone.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/explore"
          className="rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#2E6A75]"
        >
          Explore Feelings
        </Link>
        <Link
          to="/write"
          className="ios-glass-bubble rounded-full border border-white/80 px-6 py-2.5 text-sm font-medium text-[#223142] transition-transform hover:-translate-y-0.5 hover:border-[#3B828E] dark:border-white/10 dark:text-[#EEF4F8]"
        >
          Share a Feeling
        </Link>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="font-editorial text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
        Privacy Policy — AVheard
      </h1>
      <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">Last updated: November 2026</p>
      <section className="ios-liquid-glass space-y-4 rounded-[28px] border border-white/85 p-6 text-sm leading-relaxed text-[#54657A] sm:p-8 dark:border-white/10 dark:text-[#A9BACB]">
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          1. Anonymous Reading & Emotional Expression
        </h2>
        <p>
          Visitors may read public feelings, listen to audio voices, send silent support, and share
          anonymous feelings without creating an account. Anonymous posts do not display IP
          addresses, emails, or personal identifiers.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          2. Zero Sale of Emotional Data
        </h2>
        <p>
          AVheard never sells, rents, or brokers sensitive feelings, private diary entries, or user
          behavioral profiles to third parties or data brokers.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          3. Private Management Tokens & Deletion
        </h2>
        <p>
          Anonymous authors receive a one-time cryptographic token (stored only as a SHA-256 hash)
          to modify or delete their own post. Signed-in members may delete their account, saved
          feelings, comments, and private diary entries at any time from their Profile page.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          4. Google AdSense & Policy Controls
        </h2>
        <p>
          Advertisements are enabled strictly after formal approval, placed separately from reading
          prose and controls, and automatically excluded from sensitive or content-warned feelings.
        </p>
      </section>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="font-editorial text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
        Terms and Conditions
      </h1>
      <div className="ios-liquid-glass space-y-4 rounded-[28px] border border-white/85 p-6 text-sm leading-relaxed text-[#54657A] sm:p-8 dark:border-white/10 dark:text-[#A9BACB]">
        <p>
          By reading, listening, or sharing on AVheard, you agree to preserve the emotional safety
          and privacy of yourself and others.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Original Voice & Ownership
        </h2>
        <p>
          You retain full rights to every feeling you write. By sharing publicly, you grant AVheard
          a non-exclusive license to display your original script, generate optional voice playback,
          and display optional reader-requested translations without modifying your original post.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Prohibited Content
        </h2>
        <p>
          Do not publish personal contact information (doxxing), hate speech, harassment, explicit
          sexual material, commercial spam, or instructions encouraging self-harm or violence.
        </p>
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Not Medical Advice
        </h2>
        <p>
          AVheard is a peer emotional sanctuary, not a clinical, medical, or emergency crisis
          service.
        </p>
      </div>
    </div>
  );
}

export function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="font-editorial text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
        Community Guidelines
      </h1>
      <div className="ios-liquid-glass space-y-4 rounded-[28px] border border-white/85 p-6 text-sm leading-relaxed text-[#54657A] sm:p-8 dark:border-white/10 dark:text-[#A9BACB]">
        <p>
          AVheard exists so people can express real feelings without fear of judgment or exposure.
          Every participant helps protect this quiet trust.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">Lead with empathy:</strong> Responses are for gentle listening and
            solidarity—not blame, mockery, or unsolicited lecturing.
          </li>
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">Protect anonymity:</strong> Never share phone numbers, social handles, full
            names of private individuals, schools, or addresses.
          </li>
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">Use content warnings thoughtfully:</strong> If your feeling touches grief,
            abuse, or heavy distress, add a short warning label so readers can choose when to open
            it.
          </li>
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">Respect every script:</strong> Honor feelings expressed in all 22 Indian
            scheduled languages, Hinglish, and English without dismissing regional voices.
          </li>
        </ul>
      </div>
    </div>
  );
}

export function SafetyPage() {
  const [targetType, setTargetType] = useState<'story' | 'account'>('story');
  const [targetRef, setTargetRef] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/deletion-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetRef, reason }),
    });
    if (res.ok) {
      setSubmitted(true);
      setTargetRef('');
      setReason('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-editorial text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Content Safety & Support
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
          If you or someone you know is in immediate distress, please reach out to trained crisis
          counselors directly. You do not have to carry everything alone.
        </p>
      </div>

      <section className="ios-liquid-glass rounded-[28px] border border-white/85 p-6 dark:border-white/10">
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          24/7 Emotional Support Helplines (India)
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">Tele-MANAS (Govt. of India):</strong>{' '}
            <span className="font-mono-tabular">14416</span> or{' '}
            <span className="font-mono-tabular">1-800-891-4416</span> (Multilingual, 24/7)
          </li>
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">KIRAN Mental Health Helpline:</strong>{' '}
            <span className="font-mono-tabular">1800-599-0019</span>
          </li>
          <li>
            <strong className="text-[#223142] dark:text-[#EEF4F8]">iCall (TISS):</strong>{' '}
            <span className="font-mono-tabular">9152987821</span> (Mon–Sat, 10 AM – 8 PM)
          </li>
        </ul>
      </section>

      <section className="ios-liquid-glass rounded-[28px] border border-white/85 p-6 dark:border-white/10">
        <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Content Removal & Takedown Request
        </h2>
        <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
          Lost your one-time management token, or spotted personal information that needs urgent
          removal? Submit a request below or write directly to{' '}
          <a
            href="mailto:thedevotee3@gmail.com"
            className="font-semibold text-[#3B828E] hover:underline dark:text-[#7CC7D4]"
          >
            thedevotee3@gmail.com
          </a>
          .
        </p>

        {submitted ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            Your removal request has been logged and prioritized for moderator review.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'story' | 'account')}
              aria-label="Removal target type"
              className="min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            >
              <option value="story">Remove an anonymous feeling (provide URL slug)</option>
              <option value="account">Request account / data erasure</option>
            </select>
            <input
              type="text"
              required
              value={targetRef}
              onChange={(e) => setTargetRef(e.target.value)}
              placeholder="Feeling slug or account reference"
              className="min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly explain why this content should be removed…"
              className="w-full rounded-2xl border border-[#DFD5CD] bg-[#F7FAFD]/90 p-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
            <button
              type="submit"
              className="min-h-[40px] rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Submit Removal Request
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
