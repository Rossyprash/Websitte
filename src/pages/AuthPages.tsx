import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const { firebaseUser, signInWithGoogle, authError, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (firebaseUser) {
      navigate('/profile');
    }
  }, [firebaseUser, navigate]);

  const handleSignIn = async () => {
    const ok = await signInWithGoogle();
    if (ok) navigate('/profile');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="ios-liquid-glass rounded-[28px] border border-white/85 p-8 dark:border-white/10">
        <ShieldCheck className="h-7 w-7 text-[#3B828E]" aria-hidden="true" />
        <h1 className="font-editorial mt-4 text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          {mode === 'login' ? 'Welcome back to AVheard' : 'Create your sanctuary account'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
          {mode === 'login'
            ? 'Sign in with Google to leave reflections, save feelings, and access your private diary.'
            : 'Reading, listening, and expressing feelings anonymously never require an account. Create an account only if you want to comment, save feelings, or keep a private diary.'}
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={handleSignIn}
          className="mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#2E6A75] disabled:opacity-50"
        >
          Continue with Google
        </button>

        {authError && (
          <p className="mt-3 text-xs text-[#5B638C] dark:text-[#FCA5A5]">{authError}</p>
        )}

        <div className="mt-6 border-t border-[#D7E3EC] pt-4 text-xs text-[#54657A] dark:border-[#273544] dark:text-[#A9BACB]">
          {mode === 'login' ? (
            <p>
              New here?{' '}
              <Link to="/register" className="text-[#3B828E] underline">
                Learn about optional accounts
              </Link>
            </p>
          ) : (
            <p>
              Already signed in before?{' '}
              <Link to="/login" className="text-[#3B828E] underline">
                Sign in here
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  return <AuthCard mode="login" />;
}

export function RegisterPage() {
  return <AuthCard mode="register" />;
}
