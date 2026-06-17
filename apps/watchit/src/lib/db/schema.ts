import {
  pgTable,
  uuid,
  text,
  timestamp,
  smallint,
  boolean,
  doublePrecision,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  // Required by the Auth.js Drizzle adapter.
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  timezone: text('timezone').notNull().default('UTC'),
  digestHour: smallint('digest_hour').notNull().default(8),
  interfaceLocale: text('interface_locale').notNull().default('en'),
  // Empty array = no filter, include articles in every detected language.
  preferredContentLanguages: text('preferred_content_languages')
    .array()
    .notNull()
    .default([]),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Auth.js (NextAuth) adapter tables ---

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const feeds = pgTable('feeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  topic: text('topic').notNull(),
  searchQueries: text('search_queries').array().notNull().default([]),
  focusMode: text('focus_mode').notNull().default('webSearch'),
  active: boolean('active').notNull().default(true),
  articlesPerDigest: smallint('articles_per_digest').notNull().default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedId: uuid('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    sourceDomain: text('source_domain'),
    language: text('language'), // ISO 639-1 code detected from title+summary
    publishedAt: timestamp('published_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    topics: text('topics').array().notNull().default([]),
    rawTopics: jsonb('raw_topics').$type<Record<string, number>>().default({}),
  },
  (table) => ({
    feedUrlUnique: uniqueIndex('articles_feed_id_url_idx').on(table.feedId, table.url),
  }),
);

export const digests = pgTable('digests', {
  id: uuid('id').primaryKey().defaultRandom(),
  feedId: uuid('feed_id')
    .notNull()
    .references(() => feeds.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending | sent | failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  articleIds: uuid('article_ids').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const digestArticles = pgTable(
  'digest_articles',
  {
    digestId: uuid('digest_id')
      .notNull()
      .references(() => digests.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.digestId, table.articleId] }),
  }),
);

export const interactions = pgTable(
  'interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    digestId: uuid('digest_id').references(() => digests.id, { onDelete: 'set null' }),
    type: text('type').notNull(), // click | like | dislike
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userArticleIdx: index('interactions_user_article_idx').on(table.userId, table.articleId),
    userTypeIdx: index('interactions_user_type_idx').on(table.userId, table.type, table.createdAt),
  }),
);

export const topicPreferences = pgTable(
  'topic_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    score: doublePrecision('score').notNull().default(0),
    signalCount: integer('signal_count').notNull().default(0),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.topic] }),
    userScoreIdx: index('topic_preferences_user_score_idx').on(table.userId, table.score),
  }),
);

export const trackingTokens = pgTable(
  'tracking_tokens',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    digestId: uuid('digest_id').references(() => digests.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // click | like | dislike
    // Set once the token is resolved, so the optional comment form can find
    // the interaction it should attach the comment to.
    interactionId: uuid('interaction_id').references(() => interactions.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => ({
    expiresIdx: index('tracking_tokens_expires_idx').on(table.expiresAt),
  }),
);
