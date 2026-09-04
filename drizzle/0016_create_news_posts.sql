-- 0016: News and blog posts for the public "News & events" section.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS "news_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "category" text NOT NULL DEFAULT 'News',
  "summary" text NOT NULL,
  "body" text NOT NULL,
  "cover_image_url" text,
  "author_name" text,
  "published" boolean NOT NULL DEFAULT false,
  "published_at" timestamp with time zone,
  "published_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "news_posts_slug_idx" ON "news_posts" ("slug");
CREATE INDEX IF NOT EXISTS "news_posts_published_idx" ON "news_posts" ("published", "created_at");