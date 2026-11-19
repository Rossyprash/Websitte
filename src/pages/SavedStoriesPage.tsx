import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { StoryCard, StorySummary } from '../components/StoryCard.tsx';

export function SavedStoriesPage() {
  const { firebaseUser, getIdToken, signInWithGoogle, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch('/api/bookmarks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSaved(data.bookmarks || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [firebaseUser, authLoading]);

  if (!authLoading && !firebaseUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <Bookmark className="mx-auto h-7 w-7 text-[#3B828E]" aria-hidden="true" />
        <h1 className="font-editorial mt-3 text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Saved Feelings
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Sign in to keep a personal collection of feelings you want to revisit.
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]">
        <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Saved Feelings
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Your private sanctuary shelf, visible only to you.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-liquid-glass h-48 animate-pulse rounded-[28px]" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="ios-liquid-glass mt-8 rounded-[28px] border border-white/85 p-8 text-center dark:border-white/10">
          <p className="text-sm text-[#54657A] dark:text-[#A9BACB]">
            You haven’t saved any feelings yet.
          </p>
          <Link
            to="/explore"
            className="mt-4 inline-flex rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
          >
            Explore Feelings
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {saved.map((story, idx) => (
            <StoryCard key={story.id} story={story} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
