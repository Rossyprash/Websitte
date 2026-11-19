import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-mono-tabular text-xs tracking-widest text-[#3B828E] uppercase">
        404
      </p>
      <h1 className="font-editorial mt-3 text-4xl font-medium text-[#223142] dark:text-[#EEF4F8]">
        This page could not be found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
        The feeling or page you are looking for may have moved or been removed by its author.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2E6A75]"
        >
          Return Home
        </Link>
        <Link
          to="/explore"
          className="ios-glass-bubble rounded-full border border-white/80 px-6 py-2.5 text-sm font-medium text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
        >
          Explore Feelings
        </Link>
      </div>
    </div>
  );
}
