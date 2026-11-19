/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';

// Code-split secondary routes so initial home page loads minimal JS and renders immediately
const ExplorePage = lazy(() =>
  import('./pages/ExplorePage.tsx').then((m) => ({ default: m.ExplorePage }))
);
const StoryDetailPage = lazy(() =>
  import('./pages/StoryDetailPage.tsx').then((m) => ({ default: m.StoryDetailPage }))
);
const WriteStoryPage = lazy(() =>
  import('./pages/WriteStoryPage.tsx').then((m) => ({ default: m.WriteStoryPage }))
);
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage.tsx').then((m) => ({ default: m.CategoriesPage }))
);
const LanguagesPage = lazy(() =>
  import('./pages/LanguagesPage.tsx').then((m) => ({ default: m.LanguagesPage }))
);
const LoginPage = lazy(() =>
  import('./pages/AuthPages.tsx').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/AuthPages.tsx').then((m) => ({ default: m.RegisterPage }))
);
const CommentsPage = lazy(() =>
  import('./pages/CommentsPage.tsx').then((m) => ({ default: m.CommentsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage }))
);
const SavedStoriesPage = lazy(() =>
  import('./pages/SavedStoriesPage.tsx').then((m) => ({ default: m.SavedStoriesPage }))
);
const AboutPage = lazy(() =>
  import('./pages/StaticTrustPages.tsx').then((m) => ({ default: m.AboutPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/StaticTrustPages.tsx').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./pages/StaticTrustPages.tsx').then((m) => ({ default: m.TermsPage }))
);
const GuidelinesPage = lazy(() =>
  import('./pages/StaticTrustPages.tsx').then((m) => ({ default: m.GuidelinesPage }))
);
const SafetyPage = lazy(() =>
  import('./pages/StaticTrustPages.tsx').then((m) => ({ default: m.SafetyPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage.tsx').then((m) => ({ default: m.ContactPage }))
);
const SupportPage = lazy(() =>
  import('./pages/SupportPage.tsx').then((m) => ({ default: m.SupportPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage.tsx').then((m) => ({ default: m.AdminPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.tsx').then((m) => ({ default: m.NotFoundPage }))
);

function PeacefulRouteFallback() {
  return (
    <div className="mx-auto flex min-h-[45vh] max-w-4xl items-center justify-center px-4 py-16">
      <div className="ios-glass-bubble animate-breathe-bubble inline-flex items-center gap-3 rounded-full border border-white/80 px-6 py-3 text-sm text-[#54657A] dark:border-white/10 dark:text-[#A9BACB]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3B828E] dark:bg-[#7CC7D4]" />
        <span className="font-editorial">Opening quiet space…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Layout>
            <Suspense fallback={<PeacefulRouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/feeling/:slug" element={<StoryDetailPage />} />
                <Route path="/story/:slug" element={<StoryDetailPage />} />
                <Route path="/write" element={<WriteStoryPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/languages" element={<LanguagesPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/comments" element={<CommentsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/saved" element={<SavedStoriesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/guidelines" element={<GuidelinesPage />} />
                <Route path="/safety" element={<SafetyPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
