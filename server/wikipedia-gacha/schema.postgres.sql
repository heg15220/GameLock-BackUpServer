-- Single global sequence for all application-generated row ids. Using one
-- sequence (instead of GREATEST(MAX(id)+1)) makes id allocation atomic and
-- collision-free across profiles and tables. Seeded above the current global
-- max at startup (see initializeSchema) so it never overlaps legacy ids.
CREATE SEQUENCE IF NOT EXISTS wgc_entity_id_seq;

CREATE TABLE IF NOT EXISTS user_state (
  browser_token TEXT PRIMARY KEY,
  data_json BYTEA NOT NULL DEFAULT ''::bytea,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  code TEXT PRIMARY KEY,
  browser_token TEXT NOT NULL,
  snapshot_payload BYTEA NOT NULL DEFAULT ''::bytea,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_recovery_token
  ON recovery_codes (browser_token);

CREATE TABLE IF NOT EXISTS token_aliases (
  legacy_token TEXT PRIMARY KEY,
  current_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_token_aliases_current
  ON token_aliases (current_token);

CREATE TABLE IF NOT EXISTS browser_profiles (
  id BIGINT PRIMARY KEY,
  browser_token TEXT NOT NULL UNIQUE,
  display_name TEXT NULL,
  preferred_language TEXT NULL,
  packs_available INTEGER NOT NULL DEFAULT 10,
  max_packs INTEGER NOT NULL DEFAULT 10,
  last_pack_regen_at TEXT NOT NULL DEFAULT '',
  gems INTEGER NOT NULL DEFAULT 0,
  shards INTEGER NOT NULL DEFAULT 0,
  trophies_points INTEGER NOT NULL DEFAULT 0,
  total_pack_opens INTEGER NOT NULL DEFAULT 0,
  pity_counter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  last_seen_at TEXT NOT NULL DEFAULT '',
  last_pack_opened_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS browser_collection (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL,
  copies INTEGER NOT NULL DEFAULT 0,
  first_obtained_at TEXT NULL,
  last_obtained_at TEXT NULL,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  best_rarity_code TEXT NULL,
  topic_group TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_collection_profile_article
  ON browser_collection (browser_profile_id, article_id);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile
  ON browser_collection (browser_profile_id);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_favorite
  ON browser_collection (browser_profile_id) WHERE favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_rarity
  ON browser_collection (browser_profile_id, best_rarity_code);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_topic
  ON browser_collection (browser_profile_id, topic_group);
CREATE INDEX IF NOT EXISTS idx_browser_collection_profile_obtained
  ON browser_collection (browser_profile_id, last_obtained_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_articles_topic
  ON articles (topic_group);
CREATE INDEX IF NOT EXISTS idx_articles_rarity
  ON articles (rarity_code);
CREATE INDEX IF NOT EXISTS idx_articles_title_lower
  ON articles (LOWER(title));

CREATE TABLE IF NOT EXISTS pack_openings (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  opened_at TEXT NOT NULL DEFAULT '',
  guaranteed_sr_plus BOOLEAN NOT NULL DEFAULT FALSE,
  pack_type TEXT NULL,
  result_summary TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_pack_openings_profile
  ON pack_openings (browser_profile_id);
CREATE INDEX IF NOT EXISTS idx_pack_openings_profile_opened_desc
  ON pack_openings (browser_profile_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS pack_opening_cards (
  pack_opening_id   BIGINT NOT NULL REFERENCES pack_openings(id) ON DELETE CASCADE,
  slot_number       INTEGER NOT NULL,
  article_id        BIGINT  NOT NULL,
  language          TEXT    NOT NULL DEFAULT 'en',
  was_new           BOOLEAN NOT NULL DEFAULT FALSE,
  copies_after_pull INTEGER NOT NULL DEFAULT 0,
  shards_earned     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_opening_id, slot_number),
  FOREIGN KEY (article_id, language) REFERENCES articles (article_id, language)
);

CREATE INDEX IF NOT EXISTS idx_pack_opening_cards_article
  ON pack_opening_cards (article_id, language);

CREATE TABLE IF NOT EXISTS browser_missions (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL,
  progress_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reset_date TEXT NULL,
  created_at TEXT NULL,
  updated_at TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_missions_profile_mission_reset
  ON browser_missions (browser_profile_id, mission_id, reset_date);
CREATE INDEX IF NOT EXISTS idx_browser_missions_profile
  ON browser_missions (browser_profile_id);

CREATE TABLE IF NOT EXISTS browser_trophies (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  trophy_id INTEGER NOT NULL,
  unlocked_at TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_trophies_profile_trophy
  ON browser_trophies (browser_profile_id, trophy_id);
CREATE INDEX IF NOT EXISTS idx_browser_trophies_profile
  ON browser_trophies (browser_profile_id);

CREATE TABLE IF NOT EXISTS reward_events (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  reward_source TEXT NULL,
  reward_type TEXT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NULL,
  metadata_json TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_reward_events_profile
  ON reward_events (browser_profile_id);

CREATE TABLE IF NOT EXISTS daily_browser_stats (
  id BIGINT PRIMARY KEY,
  browser_profile_id BIGINT NOT NULL REFERENCES browser_profiles(id) ON DELETE CASCADE,
  stat_date TEXT NOT NULL,
  packs_opened INTEGER NOT NULL DEFAULT 0,
  cards_obtained INTEGER NOT NULL DEFAULT 0,
  new_cards_obtained INTEGER NOT NULL DEFAULT 0,
  duplicate_cards_obtained INTEGER NOT NULL DEFAULT 0,
  sr_or_higher_count INTEGER NOT NULL DEFAULT 0,
  ssr_or_higher_count INTEGER NOT NULL DEFAULT 0,
  ur_or_higher_count INTEGER NOT NULL DEFAULT 0,
  wikipedia_clicks INTEGER NOT NULL DEFAULT 0,
  shards_earned INTEGER NOT NULL DEFAULT 0,
  topic_counts_json TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_browser_stats_profile_date
  ON daily_browser_stats (browser_profile_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_browser_stats_profile
  ON daily_browser_stats (browser_profile_id);
