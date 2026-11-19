import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useApp } from '../contexts/AppContext.tsx';

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string;
  languageCode: string;
  createdAt: string;
}

export function ProfilePage() {
  const { firebaseUser, dbUser, stats, loading, signInWithGoogle, signOut, getIdToken, refreshProfile } =
    useAuth();
  const { languages } = useApp();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [profileSaved, setProfileSaved] = useState(false);

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [diaryTitle, setDiaryTitle] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [diaryMood, setDiaryMood] = useState('Reflective');
  const [diaryLang, setDiaryLang] = useState('en');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setDisplayName(dbUser.displayName || '');
      setBio(dbUser.bio || '');
      setPreferredLanguage(dbUser.preferredLanguage || 'en');
    }
  }, [dbUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      const token = await getIdToken();
      const res = await fetch('/api/diary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDiaryEntries(data.entries || []);
      }
    })();
  }, [firebaseUser]);

  if (!loading && !firebaseUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Account & Private Diary
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Sign in to manage your profile preferences, saved feelings, and private diary.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-5 rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2E6A75]"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ displayName, bio, preferredLanguage }),
    });
    if (res.ok) {
      await refreshProfile();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleCreateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: diaryTitle,
        content: diaryContent,
        mood: diaryMood,
        languageCode: diaryLang,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setDiaryEntries((prev) => [data.entry, ...prev]);
      setDiaryTitle('');
      setDiaryContent('');
      refreshProfile();
    }
  };

  const handleDeleteDiary = async (id: number) => {
    const token = await getIdToken();
    const res = await fetch(`/api/diary/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setDiaryEntries((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleDeleteAccount = async () => {
    const token = await getIdToken();
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await signOut();
      navigate('/');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]">
        <div>
          <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            {dbUser?.displayName || 'Your Profile'}
          </h1>
          <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
            {dbUser?.email} · Role: {dbUser?.role}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(dbUser?.role === 'admin' || dbUser?.role === 'moderator') && (
            <Link
              to="/admin"
              className="rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Open Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="ios-glass-bubble inline-flex items-center gap-1.5 rounded-full border border-white/80 px-5 py-2 text-xs font-medium text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="ios-liquid-glass mt-6 grid grid-cols-3 gap-4 rounded-[28px] border border-white/85 p-5 dark:border-white/10">
        <div>
          <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
            {stats.bookmarks}
          </p>
          <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">Saved feelings</p>
        </div>
        <div>
          <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
            {stats.comments}
          </p>
          <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">Reflections posted</p>
        </div>
        <div>
          <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
            {diaryEntries.length}
          </p>
          <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">Private diary entries</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-5">
          <form
            onSubmit={handleProfileSave}
            className="ios-liquid-glass space-y-4 rounded-[28px] border border-white/85 p-6 dark:border-white/10"
          >
            <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              Profile Preferences
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
                Quiet Bio (private/optional)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#DFD5CD] bg-[#F7FAFD]/90 p-3.5 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#223142] dark:text-[#EEF4F8]">
                Preferred Interface Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-[40px] rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              {profileSaved ? 'Saved' : 'Save Preferences'}
            </button>
          </form>

          <div className="ios-liquid-glass rounded-[28px] border border-white/85 p-6 dark:border-white/10">
            <h2 className="font-editorial text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
              Data & Account Control
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
              You may permanently delete your account, saved feelings, comments, and private diary
              at any time.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-4 rounded-full border border-[#5B638C] px-5 py-2 text-xs font-medium text-[#5B638C] dark:border-[#FCA5A5] dark:text-[#FCA5A5]"
              >
                Delete My Account Data
              </button>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="rounded-full bg-[#5B638C] px-5 py-2 text-xs font-medium text-white"
                >
                  Confirm Permanent Deletion
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full border border-[#DFD5CD] px-5 py-2 text-xs font-medium dark:border-[#362E2C]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6 lg:col-span-7">
          <form
            onSubmit={handleCreateDiary}
            className="ios-liquid-glass space-y-4 rounded-[28px] border border-white/85 p-6 dark:border-white/10"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#3B828E]" aria-hidden="true" />
              <h2 className="font-editorial text-xl font-medium text-[#223142] dark:text-[#EEF4F8]">
                Private Diary (Only You)
              </h2>
            </div>
            <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">
              Entries saved here are strictly private to your account and are never published publicly.
            </p>

            <input
              type="text"
              required
              value={diaryTitle}
              onChange={(e) => setDiaryTitle(e.target.value)}
              placeholder="Title for today’s private feeling…"
              className="min-h-[42px] w-full rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={diaryMood}
                onChange={(e) => setDiaryMood(e.target.value)}
                aria-label="Mood"
                className="min-h-[40px] rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-xs text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              >
                <option>Reflective</option>
                <option>Heavy</option>
                <option>Hopeful</option>
                <option>Grateful</option>
                <option>Anxious</option>
              </select>

              <select
                value={diaryLang}
                onChange={(e) => setDiaryLang(e.target.value)}
                aria-label="Diary language"
                className="min-h-[40px] rounded-full border border-[#DFD5CD] bg-[#F7FAFD]/90 px-4 text-xs text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={4}
              required
              value={diaryContent}
              onChange={(e) => setDiaryContent(e.target.value)}
              placeholder="Write freely for your eyes only…"
              className="w-full rounded-2xl border border-[#DFD5CD] bg-[#F7FAFD]/90 p-4 text-sm text-[#223142] dark:border-[#362E2C] dark:bg-[#121820] dark:text-[#EEF4F8]"
            />

            <button
              type="submit"
              className="min-h-[40px] rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
            >
              Save Private Entry
            </button>
          </form>

          <div className="space-y-4">
            {diaryEntries.map((entry) => (
              <article
                key={entry.id}
                className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">
                      {entry.mood} · {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                    <h3 className="font-editorial mt-1 text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
                      {entry.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDiary(entry.id)}
                    aria-label="Delete diary entry"
                    className="rounded-full p-2 text-[#54657A] transition-colors hover:bg-white/60 hover:text-[#5B638C] dark:hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                  {entry.content}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
