import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface DbUserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'member' | 'moderator' | 'admin';
  bio: string | null;
  preferredLanguage: string;
  isSuspended: boolean;
  createdAt: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  dbUser: DbUserProfile | null;
  stats: { bookmarks: number; comments: number; diaryEntries: number };
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUserProfile | null>(null);
  const [stats, setStats] = useState({ bookmarks: 0, comments: 0, diaryEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncProfile = useCallback(async (user: User) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.user);
        setStats(data.stats || { bookmarks: 0, comments: 0, diaryEntries: 0 });
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncProfile(user);
      } else {
        setDbUser(null);
        setStats({ bookmarks: 0, comments: 0, diaryEntries: 0 });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [syncProfile]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      if (cred.user) {
        await syncProfile(cred.user);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setAuthError(err?.message || 'Sign in was cancelled or failed.');
      return false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setDbUser(null);
    setStats({ bookmarks: 0, comments: 0, diaryEntries: 0 });
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        stats,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        getIdToken,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
