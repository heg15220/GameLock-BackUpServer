CREATE TABLE browser_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_token CHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(80) NULL,
  packs_available INT NOT NULL DEFAULT 10,
  max_packs INT NOT NULL DEFAULT 10,
  last_pack_regen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gems INT NOT NULL DEFAULT 0,
  shards INT NOT NULL DEFAULT 0,
  trophies_points INT NOT NULL DEFAULT 0,
  total_pack_opens INT NOT NULL DEFAULT 0,
  pity_counter INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  wikipedia_page_id BIGINT NOT NULL,
  wikipedia_title VARCHAR(255) NOT NULL,
  wikipedia_slug VARCHAR(255) NOT NULL,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  source_url VARCHAR(500) NOT NULL,
  image_url VARCHAR(500) NULL,
  extract_text TEXT NULL,
  content_length INT NOT NULL DEFAULT 0,
  section_count INT NOT NULL DEFAULT 0,
  reference_count INT NOT NULL DEFAULT 0,
  pageviews_30d BIGINT NOT NULL DEFAULT 0,
  quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  rarity_code VARCHAR(10) NOT NULL,
  atk INT NOT NULL DEFAULT 0,
  def_stat INT NOT NULL DEFAULT 0,
  flavor_text TEXT NULL,
  topic_group VARCHAR(80) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_article_lang_page (language_code, wikipedia_page_id),
  UNIQUE KEY uq_article_lang_slug (language_code, wikipedia_slug),
  INDEX idx_articles_rarity (rarity_code),
  INDEX idx_articles_quality (quality_score),
  INDEX idx_articles_topic (topic_group)
);

CREATE TABLE article_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_article_categories_article (article_id),
  INDEX idx_article_categories_name (category_name)
);

CREATE TABLE pack_openings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  guaranteed_sr_plus BOOLEAN NOT NULL DEFAULT FALSE,
  pack_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  result_summary VARCHAR(255) NULL,
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE,
  INDEX idx_pack_openings_browser (browser_profile_id),
  INDEX idx_pack_openings_opened_at (opened_at)
);

CREATE TABLE pack_cards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pack_opening_id BIGINT NOT NULL,
  slot_number INT NOT NULL,
  article_id BIGINT NOT NULL,
  rarity_at_pull VARCHAR(10) NOT NULL,
  was_new BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_count_before INT NOT NULL DEFAULT 0,
  shards_earned INT NOT NULL DEFAULT 0,
  FOREIGN KEY (pack_opening_id) REFERENCES pack_openings(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_pack_cards_pack (pack_opening_id),
  INDEX idx_pack_cards_article (article_id)
);

CREATE TABLE browser_collection (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  article_id BIGINT NOT NULL,
  copies INT NOT NULL DEFAULT 1,
  first_obtained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_obtained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  best_rarity_code VARCHAR(10) NOT NULL,
  obtained_from_last_pack_opening_id BIGINT NULL,
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (obtained_from_last_pack_opening_id) REFERENCES pack_openings(id) ON DELETE SET NULL,
  UNIQUE KEY uq_browser_article (browser_profile_id, article_id),
  INDEX idx_browser_collection_browser (browser_profile_id),
  INDEX idx_browser_collection_favorite (favorite)
);

CREATE TABLE missions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  reward_type VARCHAR(30) NOT NULL,
  reward_amount INT NOT NULL,
  mission_scope VARCHAR(20) NOT NULL DEFAULT 'daily',
  target_type VARCHAR(40) NOT NULL,
  target_value INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE browser_missions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  mission_id BIGINT NOT NULL,
  progress_value INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reset_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_browser_mission_reset (browser_profile_id, mission_id, reset_date),
  INDEX idx_browser_missions_browser (browser_profile_id)
);

CREATE TABLE trophies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon_key VARCHAR(80) NULL
);

CREATE TABLE browser_trophies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  trophy_id BIGINT NOT NULL,
  unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (trophy_id) REFERENCES trophies(id) ON DELETE CASCADE,
  UNIQUE KEY uq_browser_trophy (browser_profile_id, trophy_id),
  INDEX idx_browser_trophies_browser (browser_profile_id)
);

CREATE TABLE reward_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  reward_source VARCHAR(30) NOT NULL,
  reward_type VARCHAR(30) NOT NULL,
  reward_amount INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json JSON NULL,
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE,
  INDEX idx_reward_events_browser (browser_profile_id),
  INDEX idx_reward_events_created (created_at)
);

CREATE TABLE daily_browser_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  browser_profile_id BIGINT NOT NULL,
  stat_date DATE NOT NULL,
  packs_opened INT NOT NULL DEFAULT 0,
  cards_obtained INT NOT NULL DEFAULT 0,
  new_cards_obtained INT NOT NULL DEFAULT 0,
  sr_or_higher_count INT NOT NULL DEFAULT 0,
  wikipedia_clicks INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_browser_day (browser_profile_id, stat_date),
  FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
);
