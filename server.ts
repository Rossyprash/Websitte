import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  adConfig,
  adminAuditLogs,
  audioCache,
  bookmarks,
  categories,
  comments,
  contactMessages,
  deletionRequests,
  diaryEntries,
  languages,
  reports,
  stories,
  storyReactions,
  users,
} from './src/db/schema.ts';
import { AuthRequest, optionalAuth, requireAdmin, requireAuth } from './src/middleware/auth.ts';
import { ensureSeeded } from './src/lib/seed.ts';
import {
  buildExcerpt,
  createHumanChallenge,
  createSlug,
  estimateReadingTime,
  generateManagementToken,
  hashString,
  rateLimit,
  sanitizeTextInput,
  verifyHumanChallenge,
} from './src/lib/security.ts';
import {
  analyzeVoiceFeeling,
  AVAILABLE_TTS_VOICES,
  generateSpeechAudio,
  moderateStoryContent,
  translateStoryText,
} from './src/lib/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

async function writeAuditLog(
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId: string | number,
  details?: string
) {
  if (!req.dbUser) return;
  try {
    await db.insert(adminAuditLogs).values({
      adminUid: req.dbUser.uid,
      adminEmail: req.dbUser.email,
      action,
      targetType,
      targetId: String(targetId),
      details: details || '',
    });
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AVheard' });
});

app.get('/api/challenge', (_req, res) => {
  res.json(createHumanChallenge());
});

interface CachedPayload {
  json: Buffer;
  gzip: Buffer;
  expiresAt: number;
}

let bootstrapCache: CachedPayload | null = null;
let homeCache: CachedPayload | null = null;
const storiesListCache = new Map<string, CachedPayload>();

function makeCachedPayload(data: unknown, ttlMs: number): CachedPayload {
  const json = Buffer.from(JSON.stringify(data), 'utf8');
  const gzip = gzipSync(json, { level: 6 });
  return { json, gzip, expiresAt: Date.now() + ttlMs };
}

function sendCachedJson(
  req: express.Request,
  res: express.Response,
  entry: CachedPayload,
  cacheControl: string
) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Vary', 'Accept-Encoding');
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', String(entry.gzip.length));
    return res.send(entry.gzip);
  }
  res.setHeader('Content-Length', String(entry.json.length));
  return res.send(entry.json);
}

function invalidatePublicCache() {
  bootstrapCache = null;
  homeCache = null;
  storiesListCache.clear();
}

const STORY_SUMMARY_SELECT = {
  id: stories.id,
  slug: stories.slug,
  title: stories.title,
  excerpt: stories.excerpt,
  languageCode: stories.languageCode,
  categorySlug: stories.categorySlug,
  contentWarning: stories.contentWarning,
  isFeatured: stories.isFeatured,
  isStoryOfTheDay: stories.isStoryOfTheDay,
  isAdEligible: stories.isAdEligible,
  readingTimeMinutes: stories.readingTimeMinutes,
  supportCount: stories.supportCount,
  viewCount: stories.viewCount,
  trendingScore: stories.trendingScore,
  createdAt: stories.createdAt,
};

async function buildBootstrapEntry(): Promise<CachedPayload> {
  await ensureSeeded();
  const [catRows, langRows, adRows, [{ value: totalStories }]] = await Promise.all([
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder),
    db.select().from(languages).where(eq(languages.isActive, true)).orderBy(languages.name),
    db.select().from(adConfig).limit(1),
    db.select({ value: count() }).from(stories).where(eq(stories.status, 'approved')),
  ]);

  const payload = {
    categories: catRows,
    languages: langRows,
    adConfig: adRows[0] ?? {
      adsenseEnabled: false,
      publisherId: '',
      homeSlotId: '',
      categorySlotId: '',
      listingSlotId: '',
      storyDetailSlotId: '',
      excludeContentWarned: true,
    },
    ttsVoices: AVAILABLE_TTS_VOICES,
    totalStories: Number(totalStories ?? 0),
  };

  const entry = makeCachedPayload(payload, 60_000);
  bootstrapCache = entry;
  return entry;
}

async function buildHomeEntry(): Promise<CachedPayload> {
  await ensureSeeded();
  const [sotdRows, featuredRows, latestRows, trendingRows] = await Promise.all([
    db
      .select(STORY_SUMMARY_SELECT)
      .from(stories)
      .where(and(eq(stories.status, 'approved'), eq(stories.isStoryOfTheDay, true)))
      .orderBy(desc(stories.createdAt))
      .limit(1),
    db
      .select(STORY_SUMMARY_SELECT)
      .from(stories)
      .where(and(eq(stories.status, 'approved'), eq(stories.isFeatured, true)))
      .orderBy(desc(stories.createdAt))
      .limit(3),
    db
      .select(STORY_SUMMARY_SELECT)
      .from(stories)
      .where(eq(stories.status, 'approved'))
      .orderBy(desc(stories.createdAt))
      .limit(6),
    db
      .select(STORY_SUMMARY_SELECT)
      .from(stories)
      .where(eq(stories.status, 'approved'))
      .orderBy(desc(stories.trendingScore), desc(stories.createdAt))
      .limit(3),
  ]);

  const entry = makeCachedPayload(
    {
      storyOfTheDay: sotdRows[0] ?? latestRows[0] ?? null,
      featuredStories: featuredRows,
      latestStories: latestRows,
      trendingStories: trendingRows,
    },
    15_000
  );
  homeCache = entry;
  return entry;
}

// Public bootstrap: categories, languages, AdSense settings, total count (cached & pre-gzipped)
app.get('/api/bootstrap', async (req, res) => {
  try {
    const entry =
      bootstrapCache && bootstrapCache.expiresAt > Date.now()
        ? bootstrapCache
        : await buildBootstrapEntry();
    return sendCachedJson(req, res, entry, 'public, max-age=60, stale-while-revalidate=300');
  } catch (error) {
    console.error('Bootstrap failed:', error);
    res.status(500).json({ error: 'Unable to load platform configuration.' });
  }
});

// Single-roundtrip consolidated homepage payload (replaces 4 parallel fetches)
app.get('/api/home', async (req, res) => {
  try {
    const entry =
      homeCache && homeCache.expiresAt > Date.now() ? homeCache : await buildHomeEntry();
    return sendCachedJson(req, res, entry, 'public, max-age=15, stale-while-revalidate=60');
  } catch (error) {
    console.error('Home feed failed:', error);
    res.status(500).json({ error: 'Unable to load home feelings right now.' });
  }
});

// Community Custom Category Creation (allows contributors to create a fitting category if needed)
app.post('/api/categories', rateLimit(10 * 60 * 1000, 10, 'create_custom_category'), async (req, res) => {
  try {
    await ensureSeeded();
    const rawName = sanitizeTextInput(String(req.body?.name || ''), 45);
    const rawDesc = sanitizeTextInput(String(req.body?.description || ''), 180);

    if (rawName.length < 2) {
      return res.status(400).json({ error: 'Category name must be at least 2 characters.' });
    }

    const baseSlug = rawName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36);

    const candidateSlug =
      baseSlug.length >= 2
        ? baseSlug
        : `emotion-${Date.now().toString(36)}`;

    // Check if an active or matching category already exists by slug or case-insensitive name
    const existing = await db
      .select()
      .from(categories)
      .where(or(eq(categories.slug, candidateSlug), ilike(categories.name, rawName)))
      .limit(1);

    if (existing.length > 0) {
      if (!existing[0].isActive) {
        const reactivated = await db
          .update(categories)
          .set({ isActive: true })
          .where(eq(categories.id, existing[0].id))
          .returning();
        invalidatePublicCache();
        return res.status(200).json({ category: reactivated[0], existed: true });
      }
      return res.status(200).json({ category: existing[0], existed: true });
    }

    const mod = await moderateStoryContent(rawName, `${rawName}. ${rawDesc || 'Personal emotional space.'}`, 'en', null);
    if (mod.status === 'flagged') {
      return res.status(400).json({
        error: 'Please choose a respectful, emotionally safe category name without personal contact details.',
      });
    }

    const inserted = await db
      .insert(categories)
      .values({
        slug: candidateSlug,
        name: rawName,
        nameHi: rawName,
        nameHinglish: rawName,
        description: rawDesc || `A shared community room for ${rawName} feelings.`,
        sortOrder: 40,
        isActive: true,
      })
      .returning();

    invalidatePublicCache();
    res.status(201).json({ category: inserted[0], existed: false });
  } catch (error) {
    console.error('Create custom category error:', error);
    res.status(500).json({ error: 'Could not create category right now.' });
  }
});

// Public story discovery: latest, trending, supported, featured, storyOfTheDay, random, search, category, language, pagination
app.get('/api/stories', async (req, res) => {
  try {
    await ensureSeeded();
    const sort = String(req.query.sort || 'latest');
    const category = String(req.query.category || '').trim();
    const language = String(req.query.language || '').trim();
    const q = String(req.query.q || '').trim();
    const random = req.query.random === 'true';
    const storyOfTheDay = req.query.storyOfTheDay === 'true';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(30, Math.max(1, Number(req.query.limit || 12)));
    const offset = (page - 1) * limit;

    const conditions = [eq(stories.status, 'approved')];
    if (category && category !== 'all') {
      conditions.push(eq(stories.categorySlug, category));
    }
    if (language && language !== 'all') {
      conditions.push(eq(stories.languageCode, language));
    }
    if (sort === 'featured') {
      conditions.push(eq(stories.isFeatured, true));
    }
    if (storyOfTheDay) {
      conditions.push(eq(stories.isStoryOfTheDay, true));
    }
    if (q) {
      const pattern = `%${q}%`;
      const searchExpr = or(ilike(stories.title, pattern), ilike(stories.content, pattern));
      if (searchExpr) conditions.push(searchExpr);
    }

    const whereClause = and(...conditions);

    if (random) {
      const randomRows = await db
        .select(STORY_SUMMARY_SELECT)
        .from(stories)
        .where(whereClause)
        .orderBy(sql`RANDOM()`)
        .limit(1);
      return res.json({ stories: randomRows, total: randomRows.length, page: 1, totalPages: 1 });
    }

    const cacheKey = `${sort}|${category}|${language}|${q}|${storyOfTheDay}|${page}|${limit}`;
    const cached = storiesListCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return sendCachedJson(req, res, cached, 'public, max-age=15, stale-while-revalidate=60');
    }

    const orderBy =
      sort === 'trending'
        ? [desc(stories.trendingScore), desc(stories.createdAt)]
        : sort === 'supported'
          ? [desc(stories.supportCount), desc(stories.createdAt)]
          : [desc(stories.createdAt)];

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select(STORY_SUMMARY_SELECT)
        .from(stories)
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(stories).where(whereClause),
    ]);

    const responsePayload = {
      stories: rows,
      total: Number(total ?? 0),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total ?? 0) / limit)),
    };

    if (!q && storiesListCache.size < 40) {
      const entry = makeCachedPayload(responsePayload, 15_000);
      storiesListCache.set(cacheKey, entry);
      return sendCachedJson(req, res, entry, 'public, max-age=15, stale-while-revalidate=60');
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Fetch stories error:', error);
    res.status(500).json({ error: 'Unable to load stories right now.' });
  }
});

// Public story detail by slug
app.get('/api/stories/:slug', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const slug = String(req.params.slug || '');
    const found = await db
      .select()
      .from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.status, 'approved')))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'Story not found or no longer public.' });
    }

    const story = found[0];

    // Increment view & trending counters asynchronously without blocking response
    db.update(stories)
      .set({
        viewCount: story.viewCount + 1,
        trendingScore: story.trendingScore + 1,
      })
      .where(eq(stories.id, story.id))
      .catch((err) => console.error('View increment failed:', err));

    const [reactionRows, commentRows, langRow] = await Promise.all([
      db
        .select({
          reactionType: storyReactions.reactionType,
          total: count(),
        })
        .from(storyReactions)
        .where(eq(storyReactions.storyId, story.id))
        .groupBy(storyReactions.reactionType),
      db
        .select({
          id: comments.id,
          storyId: comments.storyId,
          parentId: comments.parentId,
          authorAlias: comments.authorAlias,
          body: comments.body,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(eq(comments.storyId, story.id), eq(comments.status, 'approved')))
        .orderBy(comments.createdAt),
      db.select().from(languages).where(eq(languages.code, story.languageCode)).limit(1),
    ]);

    let isBookmarked = false;
    if (req.dbUser) {
      const bm = await db
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, req.dbUser.id), eq(bookmarks.storyId, story.id)))
        .limit(1);
      isBookmarked = bm.length > 0;
    }

    const reactions: Record<string, number> = {
      empathy: 0,
      strength: 0,
      heard: 0,
      solidarity: 0,
    };
    for (const r of reactionRows) {
      reactions[r.reactionType] = Number(r.total);
    }

    res.json({
      story: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        content: story.content,
        excerpt: story.excerpt,
        languageCode: story.languageCode,
        categorySlug: story.categorySlug,
        contentWarning: story.contentWarning,
        isFeatured: story.isFeatured,
        isStoryOfTheDay: story.isStoryOfTheDay,
        isAdEligible: story.isAdEligible,
        readingTimeMinutes: story.readingTimeMinutes,
        supportCount: story.supportCount,
        viewCount: story.viewCount + 1,
        createdAt: story.createdAt,
        authorLabel: 'Anonymous Voice',
        ttsSupported: langRow[0]?.ttsSupported ?? false,
        hasRealVoice: Boolean(story.voiceAudioData),
        voiceAudioData: story.voiceAudioData || null,
        voiceAudioMime: story.voiceAudioMime || null,
      },
      reactions,
      comments: commentRows,
      isBookmarked,
    });
  } catch (error) {
    console.error('Story detail error:', error);
    res.status(500).json({ error: 'Unable to load this story.' });
  }
});

// Real Voice Transcription + Automatic Emotion & Heading Analysis (with optional user instruction)
app.post('/api/voice/analyze', rateLimit(5 * 60 * 1000, 15, 'voice_analyze'), async (req, res) => {
  try {
    await ensureSeeded();
    const { audioBase64, mimeType, instruction, userInstruction, autoCreateHeadingAndEmotion } =
      req.body || {};
    const combinedInstruction = instruction ?? userInstruction;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Please record or upload a voice audio clip first.' });
    }
    if (audioBase64.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: 'Voice recording is too large. Please keep it under 3 minutes.' });
    }

    const langRows = await db.select().from(languages).where(eq(languages.isActive, true));
    const result = await analyzeVoiceFeeling({
      audioBase64,
      mimeType: String(mimeType || 'audio/webm'),
      userInstruction: combinedInstruction
        ? sanitizeTextInput(String(combinedInstruction), 500)
        : '',
      autoCreateHeadingAndEmotion: autoCreateHeadingAndEmotion !== false,
      validLanguageCodes: langRows.map((l) => l.code),
    });

    res.json(result);
  } catch (error: any) {
    console.error('Voice analyze error:', error);
    res.status(500).json({
      error: error.message || 'Could not understand the voice recording. Please try again.',
    });
  }
});

// Publish an anonymous story WITHOUT requiring login (rate-limited + challenge-verified + safety-checked)
app.post(
  '/api/stories',
  rateLimit(10 * 60 * 1000, 8, 'publish_story'),
  optionalAuth,
  async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const {
        title,
        content,
        languageCode,
        categorySlug,
        contentWarning,
        anonymousConfirmed,
        privacyAccepted,
        challengeToken,
        challengeAnswer,
        voiceAudioData,
        voiceAudioMime,
      } = req.body || {};

      if (!anonymousConfirmed || !privacyAccepted) {
        return res.status(400).json({
          error: 'Please confirm anonymous publishing and review the privacy notice before submitting.',
        });
      }

      if (!challengeToken || !verifyHumanChallenge(String(challengeToken), String(challengeAnswer))) {
        return res.status(400).json({
          error: 'Verification check did not match. Please answer the simple verification question.',
        });
      }

      const cleanTitle = sanitizeTextInput(String(title || ''), 160);
      const cleanContent = sanitizeTextInput(String(content || ''), 20000);
      const cleanWarning = contentWarning ? sanitizeTextInput(String(contentWarning), 80) : null;

      if (cleanTitle.length < 4) {
        return res.status(400).json({ error: 'Please write a heading of at least 4 characters.' });
      }
      if (cleanContent.length < 20) {
        return res.status(400).json({ error: 'Please share at least 20 characters of your feeling.' });
      }

      let safeVoiceData: string | null = null;
      let safeVoiceMime: string | null = null;
      if (
        typeof voiceAudioData === 'string' &&
        voiceAudioData.length > 0 &&
        voiceAudioData.length <= 5 * 1024 * 1024 &&
        typeof voiceAudioMime === 'string' &&
        voiceAudioMime.startsWith('audio/')
      ) {
        safeVoiceData = voiceAudioData;
        safeVoiceMime = voiceAudioMime.slice(0, 64);
      }

      const [langExists, catExists] = await Promise.all([
        db.select().from(languages).where(eq(languages.code, String(languageCode || 'en'))).limit(1),
        db.select().from(categories).where(eq(categories.slug, String(categorySlug || 'other'))).limit(1),
      ]);

      const validLang = langExists[0]?.code ?? 'en';
      const validCat = catExists[0]?.slug ?? 'other';

      // Automated spam & emotional safety check
      const moderation = await moderateStoryContent(cleanTitle, cleanContent, validLang, cleanWarning);

      const managementToken = generateManagementToken();
      const managementTokenHash = hashString(managementToken);
      const slug = createSlug(cleanTitle);

      const inserted = await db
        .insert(stories)
        .values({
          slug,
          title: cleanTitle,
          content: cleanContent,
          excerpt: buildExcerpt(cleanContent),
          languageCode: validLang,
          categorySlug: validCat,
          contentWarning: moderation.suggestedWarning,
          authorId: req.dbUser?.id ?? null,
          managementTokenHash,
          status: moderation.status,
          moderationNote: moderation.reason,
          isAdEligible: moderation.isAdEligible,
          readingTimeMinutes: estimateReadingTime(cleanContent),
          voiceAudioData: safeVoiceData,
          voiceAudioMime: safeVoiceMime,
        })
        .returning();

      invalidatePublicCache();
      res.status(201).json({
        story: {
          id: inserted[0].id,
          slug: inserted[0].slug,
          title: inserted[0].title,
          status: inserted[0].status,
          moderationNote: inserted[0].moderationNote,
        },
        managementToken,
      });
    } catch (error) {
      console.error('Publish story error:', error);
      res.status(500).json({ error: 'Failed to publish your feeling. Please try again.' });
    }
  }
);

// Anonymous post management using one-time private management token
app.post('/api/stories/manage/verify', async (req, res) => {
  try {
    const { slug, managementToken } = req.body || {};
    if (!slug || !managementToken) {
      return res.status(400).json({ error: 'Story URL slug and management token are required.' });
    }
    const tokenHash = hashString(String(managementToken).trim());
    const found = await db
      .select()
      .from(stories)
      .where(and(eq(stories.slug, String(slug).trim()), eq(stories.managementTokenHash, tokenHash)))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'No story matched that slug and management token.' });
    }

    const s = found[0];
    res.json({
      story: {
        id: s.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        languageCode: s.languageCode,
        categorySlug: s.categorySlug,
        contentWarning: s.contentWarning,
        status: s.status,
      },
    });
  } catch (error) {
    console.error('Manage verify error:', error);
    res.status(500).json({ error: 'Could not verify management token.' });
  }
});

app.patch('/api/stories/manage/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '');
    const { managementToken, title, content, contentWarning } = req.body || {};
    const tokenHash = hashString(String(managementToken || '').trim());

    const found = await db
      .select()
      .from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.managementTokenHash, tokenHash)))
      .limit(1);

    if (found.length === 0) {
      return res.status(403).json({ error: 'Invalid management token for this story.' });
    }

    const cleanTitle = sanitizeTextInput(String(title || found[0].title), 160);
    const cleanContent = sanitizeTextInput(String(content || found[0].content), 20000);
    const cleanWarning = contentWarning ? sanitizeTextInput(String(contentWarning), 80) : null;

    const moderation = await moderateStoryContent(
      cleanTitle,
      cleanContent,
      found[0].languageCode,
      cleanWarning
    );

    const updated = await db
      .update(stories)
      .set({
        title: cleanTitle,
        content: cleanContent,
        excerpt: buildExcerpt(cleanContent),
        contentWarning: moderation.suggestedWarning,
        status: moderation.status,
        moderationNote: moderation.reason,
        isAdEligible: moderation.isAdEligible,
        readingTimeMinutes: estimateReadingTime(cleanContent),
        updatedAt: new Date(),
      })
      .where(eq(stories.id, found[0].id))
      .returning();

    invalidatePublicCache();
    res.json({ story: updated[0] });
  } catch (error) {
    console.error('Manage update error:', error);
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

app.delete('/api/stories/manage/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '');
    const token = String(req.body?.managementToken || req.headers['x-management-token'] || '').trim();
    const tokenHash = hashString(token);

    const found = await db
      .select()
      .from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.managementTokenHash, tokenHash)))
      .limit(1);

    if (found.length === 0) {
      return res.status(403).json({ error: 'Invalid management token for this story.' });
    }

    await db.delete(stories).where(eq(stories.id, found[0].id));
    invalidatePublicCache();
    res.json({ deleted: true });
  } catch (error) {
    console.error('Manage delete error:', error);
    res.status(500).json({ error: 'Failed to remove story.' });
  }
});

// Public emotional support reactions (NO login required)
app.post('/api/stories/:id/react', rateLimit(60 * 1000, 30, 'react'), optionalAuth, async (req: AuthRequest, res) => {
  try {
    const storyId = Number(req.params.id);
    const reactionType = String(req.body?.reactionType || 'empathy');
    const sessionKey = sanitizeTextInput(String(req.body?.sessionKey || ''), 80);

    if (!['empathy', 'strength', 'heard', 'solidarity'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type.' });
    }

    const actorKey = req.dbUser
      ? `user:${req.dbUser.uid}:${reactionType}`
      : `anon:${hashString(sessionKey || req.ip || 'visitor')}:${reactionType}`;

    const existing = await db
      .select()
      .from(storyReactions)
      .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.actorKey, actorKey)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(storyReactions).where(eq(storyReactions.id, existing[0].id));
      await db
        .update(stories)
        .set({
          supportCount: sql`GREATEST(0, ${stories.supportCount} - 1)`,
        })
        .where(eq(stories.id, storyId));
      invalidatePublicCache();
      return res.json({ active: false, reactionType });
    }

    await db.insert(storyReactions).values({
      storyId,
      reactionType,
      actorKey,
    });
    await db
      .update(stories)
      .set({
        supportCount: sql`${stories.supportCount} + 1`,
        trendingScore: sql`${stories.trendingScore} + 3`,
      })
      .where(eq(stories.id, storyId));

    invalidatePublicCache();
    res.json({ active: true, reactionType });
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'Could not save support reaction.' });
  }
});

// Optional story translation (never alters original script in database)
app.post('/api/stories/:id/translate', rateLimit(5 * 60 * 1000, 20, 'translate'), async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const target = String(req.body?.targetLanguage || 'English');
    if (target !== 'English' && target !== 'Hindi' && target !== 'Hinglish') {
      return res.status(400).json({ error: 'Unsupported target translation language.' });
    }

    const found = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (found.length === 0 || found[0].status !== 'approved') {
      return res.status(404).json({ error: 'Story not found.' });
    }

    const translated = await translateStoryText(found[0].title, found[0].content, target);
    res.json({ translated, targetLanguage: target });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message || 'Translation failed.' });
  }
});

// Public Text-to-Speech endpoint with PostgreSQL audio caching & honest fallback
app.post('/api/stories/:id/tts', rateLimit(5 * 60 * 1000, 25, 'tts'), async (req, res) => {
  try {
    const storyId = Number(req.params.id);
    const voiceName = String(req.body?.voiceName || 'Kore');

    const found = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (found.length === 0 || found[0].status !== 'approved') {
      return res.status(404).json({ error: 'Story not found.' });
    }

    const story = found[0];
    const langRows = await db.select().from(languages).where(eq(languages.code, story.languageCode)).limit(1);
    const lang = langRows[0];

    if (!lang || !lang.ttsSupported) {
      return res.json({
        available: false,
        fallback: 'browser',
        reason: `Neural studio voice is not available for ${lang?.name || story.languageCode}. Browser speech synthesis or text-only reading is available.`,
      });
    }

    const cacheKey = `${story.id}:${voiceName}:${story.languageCode}`;
    const cached = await db.select().from(audioCache).where(eq(audioCache.cacheKey, cacheKey)).limit(1);
    if (cached.length > 0) {
      return res.json({
        available: true,
        cached: true,
        audioBase64: cached[0].audioBase64,
        mimeType: cached[0].mimeType,
        voiceName: cached[0].voiceName,
      });
    }

    const fullText = `${story.title}.\n\n${story.content}`;
    const generated = await generateSpeechAudio(fullText, lang.name, voiceName);

    if (!generated) {
      return res.json({
        available: false,
        fallback: 'browser',
        reason: 'Voice studio is temporarily resting. Using browser voice or text reading fallback.',
      });
    }

    await db
      .insert(audioCache)
      .values({
        cacheKey,
        audioBase64: generated.audioBase64,
        mimeType: generated.mimeType,
        voiceName,
      })
      .onConflictDoNothing();

    res.json({
      available: true,
      cached: false,
      audioBase64: generated.audioBase64,
      mimeType: generated.mimeType,
      voiceName,
    });
  } catch (error) {
    console.error('TTS route error:', error);
    res.json({
      available: false,
      fallback: 'browser',
      reason: 'Could not synthesize cloud audio. Switched to browser voice fallback.',
    });
  }
});

// Comments & replies (LOGIN REQUIRED)
app.post('/api/stories/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const storyId = Number(req.params.id);
    const body = sanitizeTextInput(String(req.body?.body || ''), 1200);
    const parentId = req.body?.parentId ? Number(req.body.parentId) : null;
    const useAlias = req.body?.anonymousAlias !== false;

    if (body.length < 2) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const storyRows = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
    if (storyRows.length === 0 || storyRows[0].status !== 'approved') {
      return res.status(404).json({ error: 'Story not found.' });
    }

    const alias = useAlias
      ? `Kind Reader #${(req.dbUser!.id * 37 + 104) % 900 + 100}`
      : req.dbUser!.displayName || 'Community Member';

    const inserted = await db
      .insert(comments)
      .values({
        storyId,
        parentId,
        userId: req.dbUser!.id,
        authorAlias: alias,
        body,
        status: 'approved',
      })
      .returning();

    res.status(201).json({ comment: inserted[0] });
  } catch (error) {
    console.error('Comment post error:', error);
    res.status(500).json({ error: 'Could not post comment.' });
  }
});

// Recent community comments feed for /comments page
app.get('/api/comments/recent', async (_req, res) => {
  try {
    await ensureSeeded();
    const rows = await db
      .select({
        id: comments.id,
        body: comments.body,
        authorAlias: comments.authorAlias,
        createdAt: comments.createdAt,
        storyTitle: stories.title,
        storySlug: stories.slug,
        storyCategory: stories.categorySlug,
      })
      .from(comments)
      .innerJoin(stories, eq(comments.storyId, stories.id))
      .where(and(eq(comments.status, 'approved'), eq(stories.status, 'approved')))
      .orderBy(desc(comments.createdAt))
      .limit(30);

    res.json({ comments: rows });
  } catch (error) {
    console.error('Recent comments error:', error);
    res.status(500).json({ error: 'Unable to load community reflections.' });
  }
});

// Public reporting without login
app.post('/api/reports', rateLimit(10 * 60 * 1000, 10, 'reports'), async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body || {};
    if (!['story', 'comment'].includes(targetType) || !targetId || !reason) {
      return res.status(400).json({ error: 'Target type, ID, and reason are required.' });
    }

    const rawIp = req.ip || 'unknown';
    await db.insert(reports).values({
      targetType,
      targetId: Number(targetId),
      reason: sanitizeTextInput(String(reason), 120),
      details: details ? sanitizeTextInput(String(details), 600) : null,
      reporterIpHash: hashString(rawIp),
      status: 'open',
    });

    res.status(201).json({ received: true });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: 'Could not submit report.' });
  }
});

// Content removal / deletion request
app.post('/api/deletion-requests', rateLimit(15 * 60 * 1000, 5, 'deletion_req'), async (req, res) => {
  try {
    const { targetType, targetRef, reason } = req.body || {};
    if (!['story', 'account'].includes(targetType) || !targetRef || !reason) {
      return res.status(400).json({ error: 'Please provide the reference and reason for removal.' });
    }
    await db.insert(deletionRequests).values({
      targetType,
      targetRef: sanitizeTextInput(String(targetRef), 180),
      reason: sanitizeTextInput(String(reason), 800),
      status: 'pending',
    });
    res.status(201).json({ submitted: true });
  } catch (error) {
    console.error('Deletion request error:', error);
    res.status(500).json({ error: 'Failed to submit deletion request.' });
  }
});

// Contact form
app.post('/api/contact', rateLimit(15 * 60 * 1000, 5, 'contact'), async (req, res) => {
  try {
    const name = sanitizeTextInput(String(req.body?.name || ''), 80);
    const email = sanitizeTextInput(String(req.body?.email || ''), 120);
    const subject = sanitizeTextInput(String(req.body?.subject || ''), 140);
    const message = sanitizeTextInput(String(req.body?.message || ''), 2000);

    if (!name || !email || !subject || message.length < 10) {
      return res.status(400).json({ error: 'Please complete all fields before sending.' });
    }

    await db.insert(contactMessages).values({ name, email, subject, message });
    res.status(201).json({ sent: true });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Authenticated user profile, bookmarks & private diary
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.dbUser!.id;
    const [[{ value: bookmarkCount }], [{ value: commentCount }], [{ value: diaryCount }]] =
      await Promise.all([
        db.select({ value: count() }).from(bookmarks).where(eq(bookmarks.userId, userId)),
        db.select({ value: count() }).from(comments).where(eq(comments.userId, userId)),
        db.select({ value: count() }).from(diaryEntries).where(eq(diaryEntries.userId, userId)),
      ]);

    res.json({
      user: req.dbUser,
      stats: {
        bookmarks: Number(bookmarkCount ?? 0),
        comments: Number(commentCount ?? 0),
        diaryEntries: Number(diaryCount ?? 0),
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

app.patch('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const displayName = sanitizeTextInput(String(req.body?.displayName || ''), 60);
    const bio = sanitizeTextInput(String(req.body?.bio || ''), 400);
    const preferredLanguage = ['en', 'hi', 'hinglish'].includes(req.body?.preferredLanguage)
      ? req.body.preferredLanguage
      : req.dbUser!.preferredLanguage;

    const updated = await db
      .update(users)
      .set({
        displayName: displayName || req.dbUser!.displayName,
        bio,
        preferredLanguage,
      })
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.delete('/api/auth/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(users).where(eq(users.id, req.dbUser!.id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Account delete error:', error);
    res.status(500).json({ error: 'Could not delete account data.' });
  }
});

app.get('/api/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        bookmarkId: bookmarks.id,
        savedAt: bookmarks.createdAt,
        id: stories.id,
        slug: stories.slug,
        title: stories.title,
        excerpt: stories.excerpt,
        languageCode: stories.languageCode,
        categorySlug: stories.categorySlug,
        readingTimeMinutes: stories.readingTimeMinutes,
        supportCount: stories.supportCount,
        createdAt: stories.createdAt,
      })
      .from(bookmarks)
      .innerJoin(stories, eq(bookmarks.storyId, stories.id))
      .where(and(eq(bookmarks.userId, req.dbUser!.id), eq(stories.status, 'approved')))
      .orderBy(desc(bookmarks.createdAt));

    res.json({ bookmarks: rows });
  } catch (error) {
    console.error('Bookmarks fetch error:', error);
    res.status(500).json({ error: 'Failed to load saved stories.' });
  }
});

app.post('/api/bookmarks/:storyId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const existing = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, req.dbUser!.id), eq(bookmarks.storyId, storyId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
      return res.json({ saved: false });
    }

    await db.insert(bookmarks).values({ userId: req.dbUser!.id, storyId });
    res.json({ saved: true });
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({ error: 'Failed to update saved stories.' });
  }
});

// Private Diary (Login required, visible strictly to the owner)
app.get('/api/diary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const entries = await db
      .select()
      .from(diaryEntries)
      .where(eq(diaryEntries.userId, req.dbUser!.id))
      .orderBy(desc(diaryEntries.createdAt));
    res.json({ entries });
  } catch (error) {
    console.error('Diary fetch error:', error);
    res.status(500).json({ error: 'Failed to load private diary.' });
  }
});

app.post('/api/diary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const title = sanitizeTextInput(String(req.body?.title || ''), 140);
    const content = sanitizeTextInput(String(req.body?.content || ''), 15000);
    const mood = sanitizeTextInput(String(req.body?.mood || 'Reflective'), 40);
    const languageCode = sanitizeTextInput(String(req.body?.languageCode || 'en'), 20);

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and reflection text are required.' });
    }

    const inserted = await db
      .insert(diaryEntries)
      .values({
        userId: req.dbUser!.id,
        title,
        content,
        mood,
        languageCode,
      })
      .returning();

    res.status(201).json({ entry: inserted[0] });
  } catch (error) {
    console.error('Diary create error:', error);
    res.status(500).json({ error: 'Failed to save diary entry.' });
  }
});

app.delete('/api/diary/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const entryId = Number(req.params.id);
    await db
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, req.dbUser!.id)));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Diary delete error:', error);
    res.status(500).json({ error: 'Failed to delete diary entry.' });
  }
});

// Protected Administrator Panel Endpoints
app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const [
      allStories,
      allComments,
      allReports,
      allCategories,
      allLanguages,
      allUsers,
      allAdConfigs,
      allDeletions,
      allAuditLogs,
      allContacts,
    ] = await Promise.all([
      db.select().from(stories).orderBy(desc(stories.createdAt)).limit(300),
      db
        .select({
          id: comments.id,
          storyId: comments.storyId,
          parentId: comments.parentId,
          userId: comments.userId,
          authorAlias: comments.authorAlias,
          body: comments.body,
          status: comments.status,
          createdAt: comments.createdAt,
          storyTitle: stories.title,
          storySlug: stories.slug,
        })
        .from(comments)
        .leftJoin(stories, eq(comments.storyId, stories.id))
        .orderBy(desc(comments.createdAt))
        .limit(300),
      db.select().from(reports).orderBy(desc(reports.createdAt)).limit(150),
      db.select().from(categories).orderBy(categories.sortOrder, categories.name),
      db.select().from(languages).orderBy(languages.name),
      db.select().from(users).orderBy(desc(users.createdAt)).limit(200),
      db.select().from(adConfig).limit(1),
      db.select().from(deletionRequests).orderBy(desc(deletionRequests.createdAt)).limit(80),
      db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(120),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(80),
    ]);

    const approvedCount = allStories.filter((s) => s.status === 'approved').length;
    const pendingCount = allStories.filter((s) => s.status === 'pending' || s.status === 'flagged').length;
    const openReportsCount = allReports.filter((r) => r.status === 'open').length;
    const totalViews = allStories.reduce((acc, s) => acc + s.viewCount, 0);
    const totalSupports = allStories.reduce((acc, s) => acc + s.supportCount, 0);

    res.json({
      analytics: {
        totalStories: allStories.length,
        approvedStories: approvedCount,
        moderationQueue: pendingCount,
        openReports: openReportsCount,
        totalUsers: allUsers.length,
        totalViews,
        totalSupports,
      },
      stories: allStories,
      comments: allComments,
      reports: allReports,
      categories: allCategories,
      languages: allLanguages,
      users: allUsers,
      adConfig: allAdConfigs[0] ?? null,
      deletionRequests: allDeletions,
      auditLogs: allAuditLogs,
      contactMessages: allContacts,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

app.patch('/api/admin/stories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const {
      status,
      isFeatured,
      isStoryOfTheDay,
      isAdEligible,
      moderationNote,
      title,
      content,
      categorySlug,
      languageCode,
      contentWarning,
    } = req.body || {};

    if (isStoryOfTheDay === true) {
      await db.update(stories).set({ isStoryOfTheDay: false });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (typeof isFeatured === 'boolean') updates.isFeatured = isFeatured;
    if (typeof isStoryOfTheDay === 'boolean') updates.isStoryOfTheDay = isStoryOfTheDay;
    if (typeof isAdEligible === 'boolean') updates.isAdEligible = isAdEligible;
    if (typeof moderationNote === 'string') updates.moderationNote = sanitizeTextInput(moderationNote, 300);
    if (typeof title === 'string' && title.trim().length >= 3) {
      updates.title = sanitizeTextInput(title, 160);
    }
    if (typeof content === 'string' && content.trim().length >= 10) {
      const cleanBody = sanitizeTextInput(content, 20000);
      updates.content = cleanBody;
      updates.excerpt = buildExcerpt(cleanBody);
      updates.readingTimeMinutes = estimateReadingTime(cleanBody);
    }
    if (typeof categorySlug === 'string' && categorySlug.trim()) {
      updates.categorySlug = sanitizeTextInput(categorySlug, 60);
    }
    if (typeof languageCode === 'string' && languageCode.trim()) {
      updates.languageCode = sanitizeTextInput(languageCode, 20);
    }
    if (contentWarning !== undefined) {
      updates.contentWarning = contentWarning ? sanitizeTextInput(String(contentWarning), 80) : null;
    }

    const updated = await db.update(stories).set(updates).where(eq(stories.id, id)).returning();
    invalidatePublicCache();
    await writeAuditLog(req, 'UPDATE_STORY', 'story', id, JSON.stringify(Object.keys(updates)));
    res.json({ story: updated[0] });
  } catch (error) {
    console.error('Admin story update error:', error);
    res.status(500).json({ error: 'Failed to update story.' });
  }
});

app.delete('/api/admin/stories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(stories).where(eq(stories.id, id));
    invalidatePublicCache();
    await writeAuditLog(req, 'DELETE_STORY', 'story', id, 'Permanent admin deletion');
    res.json({ deleted: true });
  } catch (error) {
    console.error('Admin story delete error:', error);
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

app.patch('/api/admin/comments/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updates: Record<string, any> = {};
    if (typeof req.body?.status === 'string') {
      updates.status = req.body.status;
    }
    if (typeof req.body?.body === 'string' && req.body.body.trim().length > 0) {
      updates.body = sanitizeTextInput(req.body.body, 1200);
    }
    const updated = await db.update(comments).set(updates).where(eq(comments.id, id)).returning();
    await writeAuditLog(req, 'MODERATE_COMMENT', 'comment', id, JSON.stringify(updates));
    res.json({ comment: updated[0] });
  } catch (error) {
    console.error('Admin comment update error:', error);
    res.status(500).json({ error: 'Failed to moderate comment.' });
  }
});

app.delete('/api/admin/comments/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(comments).where(eq(comments.id, id));
    await writeAuditLog(req, 'DELETE_COMMENT', 'comment', id, 'Permanent admin deletion');
    res.json({ deleted: true });
  } catch (error) {
    console.error('Admin comment delete error:', error);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

app.patch('/api/admin/reports/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || 'resolved');
    const resolutionNote = sanitizeTextInput(String(req.body?.resolutionNote || ''), 300);
    const updated = await db
      .update(reports)
      .set({ status, resolutionNote })
      .where(eq(reports.id, id))
      .returning();
    await writeAuditLog(req, 'RESOLVE_REPORT', 'report', id, `status=${status}`);
    res.json({ report: updated[0] });
  } catch (error) {
    console.error('Admin report error:', error);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

app.post('/api/admin/categories', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { slug, name, nameHi, nameHinglish, description } = req.body || {};
    if (!slug || !name) {
      return res.status(400).json({ error: 'Slug and category name are required.' });
    }
    const inserted = await db
      .insert(categories)
      .values({
        slug: sanitizeTextInput(String(slug).toLowerCase(), 40),
        name: sanitizeTextInput(String(name), 60),
        nameHi: sanitizeTextInput(String(nameHi || name), 60),
        nameHinglish: sanitizeTextInput(String(nameHinglish || name), 60),
        description: sanitizeTextInput(String(description || ''), 240),
        sortOrder: 50,
      })
      .returning();
    invalidatePublicCache();
    await writeAuditLog(req, 'CREATE_CATEGORY', 'category', inserted[0].slug);
    res.status(201).json({ category: inserted[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

app.patch('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updates: Record<string, any> = {};
    if (typeof req.body?.isActive === 'boolean') updates.isActive = req.body.isActive;
    if (req.body?.name) {
      const cleanName = sanitizeTextInput(String(req.body.name), 60);
      updates.name = cleanName;
      updates.nameHi = cleanName;
      updates.nameHinglish = cleanName;
    }
    if (typeof req.body?.description === 'string') {
      updates.description = sanitizeTextInput(req.body.description, 240);
    }
    const updated = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    invalidatePublicCache();
    await writeAuditLog(req, 'UPDATE_CATEGORY', 'category', id, JSON.stringify(updates));
    res.json({ category: updated[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (existing.length > 0 && existing[0].slug !== 'other') {
      await db
        .update(stories)
        .set({ categorySlug: 'other' })
        .where(eq(stories.categorySlug, existing[0].slug));
      await db.delete(categories).where(eq(categories.id, id));
      invalidatePublicCache();
      await writeAuditLog(req, 'DELETE_CATEGORY', 'category', id, `slug=${existing[0].slug}`);
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

app.patch('/api/admin/languages/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updates: Record<string, any> = {};
    if (typeof req.body?.isActive === 'boolean') updates.isActive = req.body.isActive;
    if (typeof req.body?.ttsSupported === 'boolean') updates.ttsSupported = req.body.ttsSupported;
    const updated = await db.update(languages).set(updates).where(eq(languages.id, id)).returning();
    invalidatePublicCache();
    await writeAuditLog(req, 'UPDATE_LANGUAGE', 'language', id, JSON.stringify(updates));
    res.json({ language: updated[0] });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Failed to update language.' });
  }
});

app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updates: Record<string, any> = {};
    if (['member', 'moderator', 'admin'].includes(req.body?.role)) {
      updates.role = req.body.role;
    }
    if (typeof req.body?.isSuspended === 'boolean') {
      updates.isSuspended = req.body.isSuspended;
    }
    const updated = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    await writeAuditLog(req, 'UPDATE_USER', 'user', id, JSON.stringify(updates));
    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (req.dbUser?.id === id) {
      return res.status(400).json({ error: 'Cannot delete the currently signed-in owner account.' });
    }
    await db.delete(users).where(eq(users.id, id));
    await writeAuditLog(req, 'DELETE_USER', 'user', id, 'Permanent user deletion');
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

app.patch('/api/admin/ad-config', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(adConfig).limit(1);
    const payload = {
      adsenseEnabled: Boolean(req.body?.adsenseEnabled),
      publisherId: sanitizeTextInput(String(req.body?.publisherId || ''), 60),
      homeSlotId: sanitizeTextInput(String(req.body?.homeSlotId || ''), 60),
      categorySlotId: sanitizeTextInput(String(req.body?.categorySlotId || ''), 60),
      listingSlotId: sanitizeTextInput(String(req.body?.listingSlotId || ''), 60),
      storyDetailSlotId: sanitizeTextInput(String(req.body?.storyDetailSlotId || ''), 60),
      excludeContentWarned: req.body?.excludeContentWarned !== false,
      updatedAt: new Date(),
    };

    let saved;
    if (existing.length > 0) {
      saved = await db
        .update(adConfig)
        .set(payload)
        .where(eq(adConfig.id, existing[0].id))
        .returning();
    } else {
      saved = await db.insert(adConfig).values(payload).returning();
    }

    invalidatePublicCache();
    await writeAuditLog(
      req,
      'UPDATE_ADSENSE_CONFIG',
      'ad_config',
      saved[0].id,
      `enabled=${payload.adsenseEnabled}`
    );
    res.json({ adConfig: saved[0] });
  } catch (error) {
    console.error('Update AdSense config error:', error);
    res.status(500).json({ error: 'Failed to save advertisement configuration.' });
  }
});

app.patch('/api/admin/deletion-requests/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || 'completed');
    const updated = await db
      .update(deletionRequests)
      .set({ status })
      .where(eq(deletionRequests.id, id))
      .returning();

    if (status === 'completed' && updated[0]?.targetType === 'story') {
      await db
        .update(stories)
        .set({ status: 'removed' })
        .where(eq(stories.slug, updated[0].targetRef));
    }

    invalidatePublicCache();
    await writeAuditLog(req, 'PROCESS_DELETION_REQUEST', 'deletion_request', id, `status=${status}`);
    res.json({ deletionRequest: updated[0] });
  } catch (error) {
    console.error('Deletion request update error:', error);
    res.status(500).json({ error: 'Failed to process deletion request.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), { maxAge: '365d', immutable: true })
    );
    app.use(express.static(distPath, { maxAge: '7d', etag: true, lastModified: true }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AVheard server listening on http://localhost:${PORT}`);
    // Pre-warm database & in-memory gzip caches so the very first visitor loads instantaneously
    Promise.allSettled([buildBootstrapEntry(), buildHomeEntry()]).catch(() => {});
  });
}

startServer();
