import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('member'), // 'member' | 'moderator' | 'admin'
  bio: text('bio'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  isSuspended: boolean('is_suspended').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  nameHi: text('name_hi').notNull(),
  nameHinglish: text('name_hinglish').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const languages = pgTable('languages', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  nativeName: text('native_name').notNull(),
  ttsSupported: boolean('tts_supported').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

export const stories = pgTable('stories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt').notNull(),
  languageCode: text('language_code').notNull(),
  categorySlug: text('category_slug').notNull(),
  contentWarning: text('content_warning'),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
  managementTokenHash: text('management_token_hash'),
  status: text('status').notNull().default('approved'), // 'approved' | 'pending' | 'flagged' | 'removed'
  moderationNote: text('moderation_note'),
  isFeatured: boolean('is_featured').notNull().default(false),
  isStoryOfTheDay: boolean('is_story_of_the_day').notNull().default(false),
  isAdEligible: boolean('is_ad_eligible').notNull().default(true),
  readingTimeMinutes: integer('reading_time_minutes').notNull().default(1),
  supportCount: integer('support_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  trendingScore: integer('trending_score').notNull().default(0),
  voiceAudioData: text('voice_audio_data'),
  voiceAudioMime: text('voice_audio_mime'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const storyReactions = pgTable('story_reactions', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  reactionType: text('reaction_type').notNull(), // 'empathy' | 'strength' | 'heard' | 'solidarity'
  actorKey: text('actor_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorAlias: text('author_alias').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('approved'), // 'approved' | 'flagged' | 'removed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storyId: integer('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const diaryEntries = pgTable('diary_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood').notNull().default('Reflective'),
  languageCode: text('language_code').notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'story' | 'comment'
  targetId: integer('target_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  reporterIpHash: text('reporter_ip_hash'),
  status: text('status').notNull().default('open'), // 'open' | 'resolved' | 'dismissed'
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deletionRequests = pgTable('deletion_requests', {
  id: serial('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'story' | 'account'
  targetRef: text('target_ref').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const audioCache = pgTable('audio_cache', {
  id: serial('id').primaryKey(),
  cacheKey: text('cache_key').notNull().unique(),
  audioBase64: text('audio_base64').notNull(),
  mimeType: text('mime_type').notNull().default('audio/wav'),
  voiceName: text('voice_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adConfig = pgTable('ad_config', {
  id: serial('id').primaryKey(),
  adsenseEnabled: boolean('adsense_enabled').notNull().default(false),
  publisherId: text('publisher_id').notNull().default(''),
  homeSlotId: text('home_slot_id').notNull().default(''),
  categorySlotId: text('category_slot_id').notNull().default(''),
  listingSlotId: text('listing_slot_id').notNull().default(''),
  storyDetailSlotId: text('story_detail_slot_id').notNull().default(''),
  excludeContentWarned: boolean('exclude_content_warned').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  adminUid: text('admin_uid').notNull(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
  comments: many(comments),
  bookmarks: many(bookmarks),
  diaryEntries: many(diaryEntries),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(users, {
    fields: [stories.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  reactions: many(storyReactions),
  bookmarks: many(bookmarks),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  story: one(stories, {
    fields: [comments.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
