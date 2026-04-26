-- Migration 001: extract article-level data into a canonical `articles` table
-- and reduce `pack_opening_cards` to per-pull state only.
--
-- Idempotent. Safe to apply on a database created by a previous schema version.
-- For a fresh install, schema.postgres.sql already includes the final shape and
-- this migration becomes a no-op.

BEGIN;

CREATE TABLE IF NOT EXISTS articles (
  article_id        BIGINT NOT NULL,
  language          TEXT   NOT NULL,
  title             TEXT   NOT NULL DEFAULT '',
  rarity_code       TEXT   NULL,
  quality_score     INTEGER NOT NULL DEFAULT 0,
  atk               INTEGER NOT NULL DEFAULT 0,
  def_stat          INTEGER NOT NULL DEFAULT 0,
  image_url         TEXT NULL,
  extract_text      TEXT NULL,
  long_extract_text TEXT NULL,
  flavor_text       TEXT NULL,
  source_url        TEXT NULL,
  topic_group       TEXT NULL,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, language)
);

CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles (topic_group);
CREATE INDEX IF NOT EXISTS idx_articles_rarity ON articles (rarity_code);

-- Backfill articles from existing denormalized pack_opening_cards rows.
-- Uses NULLIF(language, '') to avoid landing rows with empty-string language.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pack_opening_cards' AND column_name = 'extract_text'
  ) THEN
    INSERT INTO articles (
      article_id, language, title, rarity_code, quality_score, atk, def_stat,
      image_url, extract_text, long_extract_text, flavor_text, source_url, topic_group
    )
    SELECT DISTINCT ON (poc.article_id, COALESCE(bp.preferred_language, 'en'))
      poc.article_id::BIGINT,
      COALESCE(bp.preferred_language, 'en') AS language,
      ''::TEXT AS title,
      poc.rarity,
      COALESCE(poc.quality_score, 0),
      COALESCE(poc.atk, 0),
      COALESCE(poc.def_stat, 0),
      poc.image_url,
      poc.extract_text,
      poc.long_extract_text,
      poc.flavor_text,
      poc.source_url,
      poc.topic_group
    FROM pack_opening_cards poc
    JOIN pack_openings po ON po.id = poc.pack_opening_id
    JOIN browser_profiles bp ON bp.id = po.browser_profile_id
    ORDER BY poc.article_id, COALESCE(bp.preferred_language, 'en')
    ON CONFLICT (article_id, language) DO NOTHING;
  END IF;
END $$;

-- Add the `language` column to pack_opening_cards (lean shape) if missing.
ALTER TABLE pack_opening_cards
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- Backfill language from the parent pack_openings → browser_profiles chain.
UPDATE pack_opening_cards poc
SET language = COALESCE(bp.preferred_language, 'en')
FROM pack_openings po
JOIN browser_profiles bp ON bp.id = po.browser_profile_id
WHERE po.id = poc.pack_opening_id
  AND (poc.language IS NULL OR poc.language = '' OR poc.language = 'en');

-- Drop the denormalized columns now redundant with `articles`.
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS rarity;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS quality_score;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS atk;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS def_stat;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS image_url;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS extract_text;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS long_extract_text;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS flavor_text;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS source_url;
ALTER TABLE pack_opening_cards DROP COLUMN IF EXISTS topic_group;

-- Add FK to articles. Wrapped in DO to make it idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pack_opening_cards_article_fk'
  ) THEN
    ALTER TABLE pack_opening_cards
      ADD CONSTRAINT pack_opening_cards_article_fk
      FOREIGN KEY (article_id, language)
      REFERENCES articles (article_id, language);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pack_opening_cards_article
  ON pack_opening_cards (article_id, language);

-- New indexes on browser_collection (covering sortBy / filters in /collection).
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_favorite
  ON browser_collection (browser_profile_id) WHERE favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_rarity
  ON browser_collection (browser_profile_id, best_rarity_code);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_topic
  ON browser_collection (browser_profile_id, topic_group);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_obtained
  ON browser_collection (browser_profile_id, last_obtained_at DESC);

-- Pack history is read with ORDER BY opened_at DESC LIMIT N.
CREATE INDEX IF NOT EXISTS idx_pack_openings_profile_opened_desc
  ON pack_openings (browser_profile_id, opened_at DESC);

COMMIT;
