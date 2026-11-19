import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, Search, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useApp } from '../contexts/AppContext.tsx';

type AdminTab =
  | 'analytics'
  | 'stories'
  | 'comments'
  | 'reports'
  | 'categories'
  | 'languages'
  | 'users'
  | 'contacts'
  | 'adsense'
  | 'deletions'
  | 'logs';

export function AdminPage() {
  const { firebaseUser, dbUser, getIdToken, signInWithGoogle, loading: authLoading } = useAuth();
  const { refreshBootstrap } = useApp();

  const [tab, setTab] = useState<AdminTab>('analytics');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [storySearch, setStorySearch] = useState('');
  const [storyStatusFilter, setStoryStatusFilter] = useState<string>('all');
  const [commentSearch, setCommentSearch] = useState('');

  // Edit story modal state
  const [editingStory, setEditingStory] = useState<any | null>(null);
  // Edit comment inline state
  const [editingComment, setEditingComment] = useState<{ id: number; body: string } | null>(null);
  // Edit category inline state
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);

  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [adForm, setAdForm] = useState({
    adsenseEnabled: false,
    publisherId: '',
    homeSlotId: '',
    categorySlotId: '',
    listingSlotId: '',
    storyDetailSlotId: '',
    excludeContentWarned: true,
  });
  const [adSaved, setAdSaved] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Access denied');
      setData(json);
      if (json.adConfig) {
        setAdForm({
          adsenseEnabled: Boolean(json.adConfig.adsenseEnabled),
          publisherId: json.adConfig.publisherId || '',
          homeSlotId: json.adConfig.homeSlotId || '',
          categorySlotId: json.adConfig.categorySlotId || '',
          listingSlotId: json.adConfig.listingSlotId || '',
          storyDetailSlotId: json.adConfig.storyDetailSlotId || '',
          excludeContentWarned: json.adConfig.excludeContentWarned !== false,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!authLoading && firebaseUser && (dbUser?.role === 'admin' || dbUser?.role === 'moderator')) {
      loadOverview();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, firebaseUser, dbUser, loadOverview]);

  const flashMsg = (msg: string) => {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(null), 2600);
  };

  const adminPatch = async (url: string, body: Record<string, unknown>, msg?: string) => {
    const token = await getIdToken();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await loadOverview();
      await refreshBootstrap();
      if (msg) flashMsg(msg);
    }
  };

  const adminDelete = async (url: string, msg?: string) => {
    const token = await getIdToken();
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadOverview();
      await refreshBootstrap();
      if (msg) flashMsg(msg);
    }
  };

  const handleSaveEditedStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;
    await adminPatch(
      `/api/admin/stories/${editingStory.id}`,
      {
        title: editingStory.title,
        content: editingStory.content,
        categorySlug: editingStory.categorySlug,
        languageCode: editingStory.languageCode,
        contentWarning: editingStory.contentWarning,
        status: editingStory.status,
      },
      'Post updated.'
    );
    setEditingStory(null);
  };

  const handleSaveEditedComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment) return;
    await adminPatch(
      `/api/admin/comments/${editingComment.id}`,
      { body: editingComment.body },
      'Comment updated.'
    );
    setEditingComment(null);
  };

  const handleSaveEditedCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await adminPatch(
      `/api/admin/categories/${editingCategory.id}`,
      { name: editingCategory.name, description: editingCategory.description },
      'Category updated.'
    );
    setEditingCategory(null);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug: newCatSlug,
        name: newCatName,
        description: newCatDesc,
      }),
    });
    if (res.ok) {
      setNewCatSlug('');
      setNewCatName('');
      setNewCatDesc('');
      await loadOverview();
      await refreshBootstrap();
      flashMsg('Category added.');
    }
  };

  const handleSaveAdSense = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminPatch('/api/admin/ad-config', adForm);
    setAdSaved(true);
    setTimeout(() => setAdSaved(false), 2500);
  };

  if (!authLoading && !firebaseUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <Shield className="mx-auto h-7 w-7 text-[#3B828E]" aria-hidden="true" />
        <h1 className="font-editorial mt-3 text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Protected Admin Panel
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Sign in with an administrator account to access moderation, AdSense configuration, and
          audit logs.
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

  if (!authLoading && dbUser && dbUser.role !== 'admin' && dbUser.role !== 'moderator') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
          Access Restricted
        </h1>
        <p className="mt-2 text-sm text-[#54657A] dark:text-[#A9BACB]">
          Administrator or moderator privileges are required to view this dashboard.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex rounded-full bg-[#3B828E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2E6A75]"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'stories', label: 'All Posts' },
    { id: 'comments', label: 'All Comments' },
    { id: 'categories', label: 'Categories' },
    { id: 'reports', label: 'Reports' },
    { id: 'users', label: 'Users' },
    { id: 'languages', label: 'Languages' },
    { id: 'contacts', label: 'Contact Inbox' },
    { id: 'adsense', label: 'Google AdSense' },
    { id: 'deletions', label: 'Removal Requests' },
    { id: 'logs', label: 'Audit Logs' },
  ];

  const filteredStories = (data?.stories || []).filter((s: any) => {
    const matchesStatus = storyStatusFilter === 'all' || s.status === storyStatusFilter;
    const q = storySearch.trim().toLowerCase();
    const matchesQ =
      !q ||
      s.title?.toLowerCase().includes(q) ||
      s.content?.toLowerCase().includes(q) ||
      s.categorySlug?.toLowerCase().includes(q);
    return matchesStatus && matchesQ;
  });

  const filteredComments = (data?.comments || []).filter((c: any) => {
    const q = commentSearch.trim().toLowerCase();
    return (
      !q ||
      c.body?.toLowerCase().includes(q) ||
      c.authorAlias?.toLowerCase().includes(q) ||
      c.storyTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7E3EC] pb-6 dark:border-[#273544]">
        <div>
          <h1 className="font-editorial text-3xl font-medium text-[#223142] dark:text-[#EEF4F8]">
            AVheard Owner Control Center
          </h1>
          <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">
            Signed in as {dbUser?.email} ({dbUser?.role}) — full control over every post, comment,
            category, user & setting.
          </p>
        </div>
        {actionMsg && (
          <span className="ios-glass-bubble rounded-full border border-[#3B828E]/50 px-4 py-1.5 text-xs font-semibold text-[#3B828E] dark:text-[#7CC7D4]">
            {actionMsg}
          </span>
        )}
      </div>

      <div className="ios-liquid-glass mt-6 flex flex-wrap gap-1.5 rounded-3xl border border-white/85 p-1.5 dark:border-white/15">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === item.id
                ? 'bg-[#3B828E] text-white shadow-xs'
                : 'text-[#54657A] hover:text-[#223142] dark:text-[#A9BACB] dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ios-liquid-glass mt-8 h-64 animate-pulse rounded-[28px]" />
      ) : error ? (
        <p className="mt-8 text-sm text-[#B85D68] dark:text-[#FCA5A5]">{error}</p>
      ) : data ? (
        <div className="mt-8">
          {tab === 'analytics' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Feelings', val: data.analytics.totalStories },
                { label: 'Approved Public', val: data.analytics.approvedStories },
                { label: 'Total Comments', val: data.comments.length },
                { label: 'Active Categories', val: data.categories.filter((c: any) => c.isActive).length },
                { label: 'Moderation Queue', val: data.analytics.moderationQueue },
                { label: 'Open Reports', val: data.analytics.openReports },
                { label: 'Registered Users', val: data.analytics.totalUsers },
                { label: 'AdSense Status', val: adForm.adsenseEnabled ? 'Active' : 'Pending Approval' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/15"
                >
                  <p className="font-mono-tabular text-2xl font-semibold text-[#223142] dark:text-[#EEF4F8]">
                    {stat.val}
                  </p>
                  <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'stories' && (
            <div className="space-y-4">
              <div className="ios-liquid-glass flex flex-wrap items-center gap-3 rounded-3xl border border-white/85 p-4 dark:border-white/15">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54657A]" />
                  <input
                    type="search"
                    value={storySearch}
                    onChange={(e) => setStorySearch(e.target.value)}
                    placeholder="Search posts by title, content, or category…"
                    className="w-full rounded-full border border-[#DFD5CD] bg-white/80 py-2 pr-4 pl-9 text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
                <select
                  value={storyStatusFilter}
                  onChange={(e) => setStoryStatusFilter(e.target.value)}
                  aria-label="Filter posts by status"
                  className="rounded-full border border-[#DFD5CD] bg-white/80 px-4 py-2 text-xs dark:border-[#273544] dark:bg-[#121820]"
                >
                  <option value="all">All statuses ({data.stories.length})</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="flagged">Flagged</option>
                  <option value="removed">Hidden / Removed</option>
                </select>
              </div>

              {filteredStories.map((s: any) => (
                <div
                  key={s.id}
                  className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/15"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">
                        #{s.id} · {s.categorySlug} · {s.languageCode} · Status:{' '}
                        <strong className="uppercase">{s.status}</strong> · Views: {s.viewCount} ·
                        Ad Eligible: {s.isAdEligible ? 'Yes' : 'No'}
                      </p>
                      <h2 className="font-editorial mt-1 text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
                        {s.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#54657A] dark:text-[#A9BACB]">{s.excerpt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/feeling/${s.slug}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[#DFD5CD] px-3 py-1 text-xs dark:border-[#273544]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingStory({ ...s })}
                        className="inline-flex items-center gap-1 rounded-full border border-[#3B828E] px-3 py-1 text-xs font-medium text-[#3B828E] dark:text-[#7CC7D4]"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(`/api/admin/stories/${s.id}`, { status: 'approved' }, 'Post approved.')
                        }
                        className="rounded-full border border-[#DFD5CD] px-3 py-1 text-xs dark:border-[#273544]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(`/api/admin/stories/${s.id}`, { status: 'removed' }, 'Post hidden.')
                        }
                        className="rounded-full border border-[#B85D68] px-3 py-1 text-xs text-[#B85D68] dark:text-[#FCA5A5]"
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminDelete(`/api/admin/stories/${s.id}`, 'Post permanently deleted.')
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-[#5B638C] px-3 py-1 text-xs text-white hover:opacity-90"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/stories/${s.id}`,
                            { isFeatured: !s.isFeatured },
                            'Featured status updated.'
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs ${
                          s.isFeatured
                            ? 'bg-[#3B828E] text-white'
                            : 'border border-[#DFD5CD] dark:border-[#273544]'
                        }`}
                      >
                        {s.isFeatured ? 'Featured ✓' : 'Feature'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/stories/${s.id}`,
                            { isStoryOfTheDay: !s.isStoryOfTheDay },
                            'Feeling of the Day updated.'
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs ${
                          s.isStoryOfTheDay
                            ? 'bg-[#3B828E] text-white'
                            : 'border border-[#DFD5CD] dark:border-[#273544]'
                        }`}
                      >
                        {s.isStoryOfTheDay ? 'Feeling of Day ✓' : 'Set Feeling of Day'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/stories/${s.id}`,
                            { isAdEligible: !s.isAdEligible },
                            'Ad eligibility updated.'
                          )
                        }
                        className="rounded-full border border-[#DFD5CD] px-3 py-1 text-xs dark:border-[#273544]"
                      >
                        {s.isAdEligible ? 'Exclude Ads' : 'Allow Ads'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-4">
              <div className="ios-liquid-glass rounded-3xl border border-white/85 p-4 dark:border-white/15">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-[#54657A]" />
                  <input
                    type="search"
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    placeholder="Search comments by text, author, or post title…"
                    className="w-full rounded-full border border-[#DFD5CD] bg-white/80 py-2 pr-4 pl-9 text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
              </div>

              {filteredComments.map((c: any) => (
                <div
                  key={c.id}
                  className="ios-liquid-glass space-y-3 rounded-3xl border border-white/85 p-4 dark:border-white/15"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#54657A] dark:text-[#A9BACB]">
                        {c.authorAlias} · On:{' '}
                        {c.storySlug ? (
                          <Link
                            to={`/feeling/${c.storySlug}`}
                            className="font-medium text-[#3B828E] hover:underline"
                          >
                            {c.storyTitle}
                          </Link>
                        ) : (
                          `Feeling #${c.storyId}`
                        )}{' '}
                        · Status: <strong className="uppercase">{c.status}</strong>
                      </p>
                      {editingComment?.id === c.id ? (
                        <form onSubmit={handleSaveEditedComment} className="mt-2 space-y-2">
                          <textarea
                            rows={2}
                            required
                            value={editingComment?.body ?? ''}
                            onChange={(e) =>
                              setEditingComment((prev) =>
                                prev ? { ...prev, body: e.target.value } : null
                              )
                            }
                            className="w-full rounded-2xl border border-[#DFD5CD] bg-white/85 p-3 text-sm dark:border-[#273544] dark:bg-[#121820]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="rounded-full bg-[#3B828E] px-4 py-1 text-xs text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingComment(null)}
                              className="rounded-full border border-[#DFD5CD] px-4 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-1 text-sm">{c.body}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingComment({ id: c.id, body: c.body })}
                        className="rounded-full border border-[#3B828E] px-3 py-1 text-xs text-[#3B828E]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/comments/${c.id}`,
                            { status: 'approved' },
                            'Comment approved.'
                          )
                        }
                        className="rounded-full border border-[#DFD5CD] px-3.5 py-1 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/comments/${c.id}`,
                            { status: 'removed' },
                            'Comment hidden.'
                          )
                        }
                        className="rounded-full border border-[#B85D68] px-3.5 py-1 text-xs text-[#B85D68]"
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminDelete(`/api/admin/comments/${c.id}`, 'Comment permanently deleted.')
                        }
                        className="rounded-full bg-[#5B638C] px-3.5 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-3">
              {data.reports.length === 0 ? (
                <p className="text-sm text-[#54657A]">No reports submitted yet.</p>
              ) : (
                data.reports.map((r: any) => (
                  <div
                    key={r.id}
                    className="ios-liquid-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/85 p-4 dark:border-white/15"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {r.targetType} #{r.targetId} · {r.reason} · Status: {r.status}
                      </p>
                      {r.details && <p className="mt-1 text-xs text-[#54657A]">{r.details}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/reports/${r.id}`,
                            { status: 'resolved', resolutionNote: 'Reviewed by admin' },
                            'Report resolved.'
                          )
                        }
                        className="rounded-full bg-[#3B828E] px-4 py-1 text-xs text-white"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            `/api/admin/reports/${r.id}`,
                            { status: 'dismissed' },
                            'Report dismissed.'
                          )
                        }
                        className="rounded-full border border-[#DFD5CD] px-4 py-1 text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleAddCategory}
                className="ios-liquid-glass grid gap-3 rounded-[28px] border border-white/85 p-5 sm:grid-cols-3 dark:border-white/15"
              >
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="slug (e.g. parenthood)"
                  className="min-h-[40px] rounded-full border border-[#DFD5CD] bg-white/80 px-4 text-xs dark:border-[#273544] dark:bg-[#121820]"
                />
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Display Name"
                  className="min-h-[40px] rounded-full border border-[#DFD5CD] bg-white/80 px-4 text-xs dark:border-[#273544] dark:bg-[#121820]"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description"
                  className="min-h-[40px] rounded-full border border-[#DFD5CD] bg-white/80 px-4 text-xs dark:border-[#273544] dark:bg-[#121820]"
                />
                <button
                  type="submit"
                  className="min-h-[38px] rounded-full bg-[#3B828E] px-5 py-2 text-xs font-medium text-white hover:bg-[#2E6A75] sm:w-fit"
                >
                  Add Category
                </button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                {data.categories.map((cat: any) => (
                  <div
                    key={cat.id}
                    className="ios-liquid-glass flex flex-col justify-between gap-3 rounded-3xl border border-white/85 p-4 dark:border-white/15"
                  >
                    {editingCategory?.id === cat.id ? (
                      <form onSubmit={handleSaveEditedCategory} className="space-y-2">
                        <input
                          type="text"
                          required
                          value={editingCategory?.name ?? ''}
                          onChange={(e) =>
                            setEditingCategory((prev) =>
                              prev ? { ...prev, name: e.target.value } : null
                            )
                          }
                          className="w-full rounded-full border border-[#DFD5CD] bg-white/85 px-3 py-1.5 text-xs dark:border-[#273544] dark:bg-[#121820]"
                        />
                        <input
                          type="text"
                          value={editingCategory?.description ?? ''}
                          onChange={(e) =>
                            setEditingCategory((prev) =>
                              prev ? { ...prev, description: e.target.value } : null
                            )
                          }
                          className="w-full rounded-full border border-[#DFD5CD] bg-white/85 px-3 py-1.5 text-xs dark:border-[#273544] dark:bg-[#121820]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-full bg-[#3B828E] px-3.5 py-1 text-xs text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="rounded-full border border-[#DFD5CD] px-3.5 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{cat.name}</p>
                          <p className="text-xs text-[#54657A]">{cat.slug}</p>
                          <p className="mt-1 text-xs text-[#54657A]">{cat.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCategory({
                                id: cat.id,
                                name: cat.name,
                                description: cat.description,
                              })
                            }
                            className="rounded-full border border-[#3B828E] px-3 py-1 text-xs text-[#3B828E]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              adminPatch(
                                `/api/admin/categories/${cat.id}`,
                                { isActive: !cat.isActive },
                                'Category visibility updated.'
                              )
                            }
                            className="rounded-full border border-[#DFD5CD] px-3 py-1 text-xs dark:border-[#273544]"
                          >
                            {cat.isActive ? 'Active' : 'Hidden'}
                          </button>
                          {cat.slug !== 'other' && (
                            <button
                              type="button"
                              onClick={() =>
                                adminDelete(
                                  `/api/admin/categories/${cat.id}`,
                                  'Category deleted.'
                                )
                              }
                              className="rounded-full bg-[#5B638C] px-3 py-1 text-xs text-white"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'languages' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.languages.map((lang: any) => (
                <div
                  key={lang.id}
                  className="ios-liquid-glass flex items-center justify-between rounded-3xl border border-white/85 p-4 dark:border-white/15"
                >
                  <div>
                    <p className="text-sm font-medium">{lang.nativeName}</p>
                    <p className="text-xs text-[#54657A]">
                      {lang.name} ({lang.code})
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        adminPatch(`/api/admin/languages/${lang.id}`, {
                          ttsSupported: !lang.ttsSupported,
                        })
                      }
                      className="rounded-full border border-[#DFD5CD] px-2.5 py-1 text-[11px] dark:border-[#273544]"
                    >
                      {lang.ttsSupported ? 'TTS On' : 'Text Only'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminPatch(`/api/admin/languages/${lang.id}`, { isActive: !lang.isActive })
                      }
                      className="rounded-full border border-[#DFD5CD] px-2.5 py-1 text-[11px] dark:border-[#273544]"
                    >
                      {lang.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-3">
              {data.users.map((u: any) => (
                <div
                  key={u.id}
                  className="ios-liquid-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/85 p-4 dark:border-white/15"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {u.displayName || 'Member'} ({u.email})
                    </p>
                    <p className="text-xs text-[#54657A]">
                      Role: {u.role} · {u.isSuspended ? 'Suspended' : 'Active'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        adminPatch(
                          `/api/admin/users/${u.id}`,
                          { role: e.target.value },
                          'User role updated.'
                        )
                      }
                      aria-label={`Change role for ${u.email}`}
                      className="rounded-full border border-[#DFD5CD] bg-white/80 px-3 py-1 text-xs dark:border-[#273544] dark:bg-[#121820]"
                    >
                      <option value="member">member</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        adminPatch(
                          `/api/admin/users/${u.id}`,
                          { isSuspended: !u.isSuspended },
                          'User status updated.'
                        )
                      }
                      className="rounded-full border border-[#B85D68] px-3.5 py-1 text-xs text-[#B85D68]"
                    >
                      {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    {u.id !== dbUser?.id && (
                      <button
                        type="button"
                        onClick={() =>
                          adminDelete(`/api/admin/users/${u.id}`, 'User account removed.')
                        }
                        className="rounded-full bg-[#5B638C] px-3.5 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-3">
              {!data.contactMessages || data.contactMessages.length === 0 ? (
                <p className="text-sm text-[#54657A]">No contact messages received yet.</p>
              ) : (
                data.contactMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className="ios-liquid-glass rounded-3xl border border-white/85 p-5 dark:border-white/15"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#54657A]">
                      <span>
                        <strong>{msg.name}</strong> ({msg.email})
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="mt-1 font-editorial text-lg font-medium text-[#223142] dark:text-[#EEF4F8]">
                      {msg.subject}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'adsense' && (
            <form
              onSubmit={handleSaveAdSense}
              className="ios-liquid-glass max-w-2xl space-y-4 rounded-[28px] border border-white/85 p-6 dark:border-white/15"
            >
              <h2 className="font-editorial text-xl font-medium">Google AdSense Policy Controls</h2>
              <p className="text-xs leading-relaxed text-[#54657A] dark:text-[#A9BACB]">
                Keep AdSense disabled until Google AdSense formally approves AVheard. Ads are placed
                only outside reading prose and automatically excluded from sensitive feelings.
              </p>

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={adForm.adsenseEnabled}
                  onChange={(e) => setAdForm({ ...adForm, adsenseEnabled: e.target.checked })}
                />
                <span>Activate Google AdSense (only after AdSense approval)</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={adForm.excludeContentWarned}
                  onChange={(e) => setAdForm({ ...adForm, excludeContentWarned: e.target.checked })}
                />
                <span>Exclude content-warned and sensitive feelings from monetization</span>
              </label>

              <div>
                <label className="block text-xs font-medium">AdSense Publisher ID (ca-pub-...)</label>
                <input
                  type="text"
                  value={adForm.publisherId}
                  onChange={(e) => setAdForm({ ...adForm, publisherId: e.target.value })}
                  placeholder="ca-pub-0000000000000000"
                  className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/80 px-4 font-mono-tabular text-xs dark:border-[#273544] dark:bg-[#121820]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium">Home Slot ID</label>
                  <input
                    type="text"
                    value={adForm.homeSlotId}
                    onChange={(e) => setAdForm({ ...adForm, homeSlotId: e.target.value })}
                    className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/80 px-4 font-mono-tabular text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Category Slot ID</label>
                  <input
                    type="text"
                    value={adForm.categorySlotId}
                    onChange={(e) => setAdForm({ ...adForm, categorySlotId: e.target.value })}
                    className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/80 px-4 font-mono-tabular text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Listing Slot ID</label>
                  <input
                    type="text"
                    value={adForm.listingSlotId}
                    onChange={(e) => setAdForm({ ...adForm, listingSlotId: e.target.value })}
                    className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/80 px-4 font-mono-tabular text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Feeling Detail Slot ID</label>
                  <input
                    type="text"
                    value={adForm.storyDetailSlotId}
                    onChange={(e) => setAdForm({ ...adForm, storyDetailSlotId: e.target.value })}
                    className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/80 px-4 font-mono-tabular text-xs dark:border-[#273544] dark:bg-[#121820]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[42px] rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
              >
                {adSaved ? 'Configuration Saved' : 'Save AdSense Configuration'}
              </button>
            </form>
          )}

          {tab === 'deletions' && (
            <div className="space-y-3">
              {data.deletionRequests.length === 0 ? (
                <p className="text-sm text-[#54657A]">No removal requests pending.</p>
              ) : (
                data.deletionRequests.map((d: any) => (
                  <div
                    key={d.id}
                    className="ios-liquid-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/85 p-4 dark:border-white/15"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {d.targetType}: {d.targetRef} · Status: {d.status}
                      </p>
                      <p className="mt-1 text-xs text-[#54657A]">{d.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(`/api/admin/deletion-requests/${d.id}`, { status: 'completed' })
                        }
                        className="rounded-full bg-[#3B828E] px-4 py-1 text-xs text-white"
                      >
                        Approve & Remove
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(`/api/admin/deletion-requests/${d.id}`, { status: 'rejected' })
                        }
                        className="rounded-full border border-[#DFD5CD] px-4 py-1 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'logs' && (
            <div className="ios-liquid-glass overflow-x-auto rounded-[28px] border border-white/85 dark:border-white/15">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#D7E3EC] text-[#54657A] dark:border-[#273544]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EEF5] dark:divide-[#273544]">
                  {data.auditLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-mono-tabular">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{log.adminEmail}</td>
                      <td className="px-4 py-3 font-medium">{log.action}</td>
                      <td className="px-4 py-3 font-mono-tabular">
                        {log.targetType} #{log.targetId}
                      </td>
                      <td className="px-4 py-3 text-[#54657A]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Edit Post Modal */}
      {editingStory && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveEditedStory}
            className="ios-liquid-glass w-full max-w-2xl space-y-4 rounded-[28px] border border-white/85 p-6 shadow-2xl sm:p-7"
          >
            <h2 className="font-editorial text-2xl font-medium text-[#223142] dark:text-[#EEF4F8]">
              Edit Post #{editingStory.id}
            </h2>
            <div>
              <label className="block text-xs font-medium">Heading</label>
              <input
                type="text"
                required
                value={editingStory.title}
                onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/85 px-4 text-sm dark:border-[#273544] dark:bg-[#121820]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium">Category Slug</label>
                <select
                  value={editingStory.categorySlug}
                  onChange={(e) =>
                    setEditingStory({ ...editingStory, categorySlug: e.target.value })
                  }
                  className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/85 px-3 text-xs dark:border-[#273544] dark:bg-[#121820]"
                >
                  {(data?.categories || []).map((c: any) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Status</label>
                <select
                  value={editingStory.status}
                  onChange={(e) => setEditingStory({ ...editingStory, status: e.target.value })}
                  className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/85 px-3 text-xs dark:border-[#273544] dark:bg-[#121820]"
                >
                  <option value="approved">approved</option>
                  <option value="pending">pending</option>
                  <option value="flagged">flagged</option>
                  <option value="removed">removed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Content Warning</label>
                <input
                  type="text"
                  value={editingStory.contentWarning || ''}
                  onChange={(e) =>
                    setEditingStory({ ...editingStory, contentWarning: e.target.value })
                  }
                  className="mt-1 min-h-[40px] w-full rounded-full border border-[#DFD5CD] bg-white/85 px-3 text-xs dark:border-[#273544] dark:bg-[#121820]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium">Feeling Text</label>
              <textarea
                rows={7}
                required
                value={editingStory.content}
                onChange={(e) => setEditingStory({ ...editingStory, content: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-[#DFD5CD] bg-white/85 p-4 text-sm dark:border-[#273544] dark:bg-[#121820]"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="rounded-full border border-[#DFD5CD] px-5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#3B828E] px-6 py-2 text-xs font-medium text-white hover:bg-[#2E6A75]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
