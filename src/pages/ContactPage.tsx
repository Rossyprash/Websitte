import React, { useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const contactEmail = 'thedevotee3@gmail.com';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send message.');
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-2 text-[#3B828E]">
        <Mail className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wider uppercase">Contact</span>
      </div>
      <h1 className="font-editorial mt-2 text-3xl font-medium text-[#223142] sm:text-4xl dark:text-[#EEF4F8]">
        Contact AVheard
      </h1>
      <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
        Questions about accessibility, language support, safety partnerships, or moderation? Reach
        out directly by email or send us a note below.
      </p>

      {/* Direct Contact Details Card */}
      <div className="ios-liquid-glass mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/85 p-5 sm:p-6 dark:border-white/10">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#3B828E] uppercase dark:text-[#7CC7D4]">
            Contact Details
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-1 inline-flex items-center gap-2 text-base font-semibold text-[#223142] hover:text-[#3B828E] hover:underline dark:text-[#EEF4F8] dark:hover:text-[#7CC7D4]"
          >
            <Mail className="h-4 w-4 text-[#3B828E]" aria-hidden="true" />
            <span>{contactEmail}</span>
          </a>
        </div>

        <button
          type="button"
          onClick={handleCopyEmail}
          className="ios-glass-bubble inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/80 px-4 py-1.5 text-xs font-medium text-[#223142] transition-transform hover:scale-105 dark:border-white/10 dark:text-[#EEF4F8]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-[#3B828E]" aria-hidden="true" />
              <span>Copy Gmail</span>
            </>
          )}
        </button>
      </div>

      {sent ? (
        <div className="ios-liquid-glass mt-6 rounded-[28px] border border-white/85 p-8 dark:border-white/10">
          <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            Message received
          </h2>
          <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
            Thank you for reaching out. Our editorial & safety team reviews messages carefully.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="ios-liquid-glass mt-6 space-y-4 rounded-[28px] border border-white/85 p-6 sm:p-8 dark:border-white/10"
        >
          <div>
            <label htmlFor="contact-name" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
              Reply Email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
          </div>
          <div>
            <label htmlFor="contact-subject" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
          </div>
          <div>
            <label htmlFor="contact-msg" className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
              Message
            </label>
            <textarea
              id="contact-msg"
              rows={5}
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#DFD5CD] bg-[#F7FAFD]/90 p-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />
          </div>
          {error && <p className="text-xs text-[#5B638C] dark:text-[#FCA5A5]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-full bg-[#3B828E] px-7 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#2E6A75]"
          >
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
}
