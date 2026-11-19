import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';

interface RecentComment {
  id: number;
  body: string;
  authorAlias: string;
  createdAt: string;
  storyTitle: string;
  storySlug: string;
  storyCategory: string;
}

export function CommentsPage() {
  const { getCategoryName } = useApp();
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/comments/recent')
      .then((r) => r.json())
      .then((data) => setComments(data.comments || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="border-b border-[#D7E3EC] pb-6 dark:border-[#24303D]">
        <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Community Reflections
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Gentle responses left by signed-in community readers across shared feelings.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-liquid-glass h-28 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="ios-liquid-glass mt-8 rounded-[28px] border border-white/85 p-8 text-center dark:border-white/10">
          <MessageSquare className="mx-auto h-6 w-6 text-[#3B828E]" aria-hidden="true" />
          <p className="mt-3 text-sm text-[#54657A] dark:text-[#A9BACB]">
            No reflections have been posted yet. Open any feeling to leave a kind note.
          </p>
          <Link
            to="/explore"
            className="mt-4 inline-flex rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
          >
            Explore Feelings
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {comments.map((c) => (
            <article
              key={c.id}
              className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#54657A] dark:text-[#A9BACB]">
                <span>
                  <strong className="text-[#223142] dark:text-[#EEF4F8]">{c.authorAlias}</strong>{' '}
                  reflected on{' '}
                  <Link
                    to={`/feeling/${c.storySlug}`}
                    className="font-medium text-[#3B828E] underline underline-offset-4"
                  >
                    {c.storyTitle}
                  </Link>
                </span>
                <span>
                  {getCategoryName(c.storyCategory)} · {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#223142] dark:text-[#DCE7F0]">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
