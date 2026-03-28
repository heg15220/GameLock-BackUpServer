import React, { useEffect, useMemo, useRef, useState } from "react";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import {
  bootstrapWikipediaGachaSession,
  claimWikipediaGachaMission,
  exportWikipediaGachaRecovery,
  fetchWikipediaGachaArticle,
  fetchWikipediaGachaCollection,
  fetchWikipediaGachaMissions,
  fetchWikipediaGachaSession,
  fetchWikipediaGachaTrophies,
  importWikipediaGachaRecovery,
  openWikipediaGachaPack,
  registerWikipediaGachaArticleClick,
  toggleWikipediaGachaFavorite,
} from "./backendClient";
import "./styles.css";

const STORAGE_KEY = "wikipedia_gacha_browser_token";
const TAB_ORDER = ["home", "packs", "collection", "missions", "trophies"];
const RARITY_ORDER = ["LR", "UR", "SSR", "SR", "R", "UC", "C"];
const TOP_TIER_RARITIES = new Set(RARITY_ORDER.slice(0, 2));
const PACK_PITY_TARGET = 10;
const PACK_REGEN_SECONDS = 60;

const RARITY_ACCENTS = {
  C: "#8e8a82",
  UC: "#7a93b8",
  R: "#3fcb6a",
  SR: "#48a2ff",
  SSR: "#ff7a4b",
  UR: "#ffca48",
  LR: "#f0edcd",
};

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getErrorMessage(error, es) {
  if (error?.code === "invalid_browser_token") {
    return es
      ? "La sesion local del navegador ya no es valida. Recarga el juego para crear otra."
      : "The local browser session is no longer valid. Reload the game to create a fresh one.";
  }
  if (error?.code === "no_packs_available") {
    return es
      ? "No quedan sobres disponibles. Espera la recarga o reclama misiones."
      : "No packs are available. Wait for regeneration or claim missions.";
  }
  if (error?.message) return error.message;
  return es
    ? "No se puede contactar con el backend local de Wikipedia Gacha."
    : "I cannot reach the local Wikipedia Gacha backend.";
}

function getTitle(card) {
  return card?.title ?? card?.wikipediaTitle ?? "Unknown article";
}

function getRarity(card) {
  return card?.rarity ?? card?.rarityCode ?? "C";
}

function getDef(card) {
  return card?.def ?? card?.defStat ?? 0;
}

function normalizeArticleCopy(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getBlurb(card) {
  const extract = normalizeArticleCopy(card?.cardDescription ?? card?.extractText ?? card?.description ?? card?.summary);
  if (extract) return extract;
  const flavor = normalizeArticleCopy(card?.flavorText);
  if (flavor) return flavor;
  return card?.topicGroup
    ? `${card.topicGroup} archive entry added to your browser vault.`
    : "Wikipedia entry archived for your browser collection.";
}

function getExtendedBlurb(card) {
  const detailedExtract = normalizeArticleCopy(
    card?.longExtractText ??
      card?.extendedExtractText ??
      card?.cardDescriptionLong ??
      card?.longDescription
  );
  if (detailedExtract) return detailedExtract;
  return getBlurb(card);
}

function toCollectionParams(filters) {
  return {
    q: filters.query,
    rarity: filters.rarity || undefined,
    topicGroup: filters.topicGroup || undefined,
    favorite: filters.favorite ? true : undefined,
    duplicatesOnly: filters.duplicatesOnly ? true : undefined,
    sortBy: filters.sortBy,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

function getDisplayPackStatus(packStatus) {
  const maxPacks = Math.max(0, Number(packStatus?.maxPacks) || 0);
  const rawAvailable = Math.max(0, Number(packStatus?.packsAvailable) || 0);
  return {
    ...packStatus,
    maxPacks,
    packsAvailable: maxPacks > 0 ? Math.min(maxPacks, rawAvailable) : rawAvailable,
  };
}

function getPackFillPercent(packStatus) {
  if (!packStatus?.maxPacks) return 0;
  return Math.round((packStatus.packsAvailable / packStatus.maxPacks) * 100);
}

function getPackRegenPercent(packStatus) {
  if (!packStatus) return 0;
  if (packStatus.packsAvailable >= packStatus.maxPacks) return 100;
  const seconds = Math.max(0, Number(packStatus.secondsUntilNextPack) || 0);
  return Math.round(
    ((PACK_REGEN_SECONDS - Math.min(PACK_REGEN_SECONDS, seconds)) / PACK_REGEN_SECONDS) * 100
  );
}

function getMissionPercent(mission) {
  const targetValue = Math.max(1, Number(mission?.targetValue) || 1);
  const progressValue = Math.max(0, Number(mission?.progressValue) || 0);
  return Math.max(0, Math.min(100, Math.round((progressValue / targetValue) * 100)));
}

function formatDateTime(value, locale) {
  try {
    return new Date(value).toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (_error) {
    return value;
  }
}

function normalizeRewardType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pack") return "packs";
  if (normalized === "gem") return "gems";
  if (normalized === "shard") return "shards";
  if (normalized === "packs" || normalized === "gems" || normalized === "shards") {
    return normalized;
  }
  return "reward";
}

function getRewardTypeLabel(rewardType, es) {
  const normalized = normalizeRewardType(rewardType);
  if (normalized === "packs") return es ? "sobres" : "packs";
  if (normalized === "gems") return es ? "gemas" : "gems";
  if (normalized === "shards") return "shards";
  return es ? "recompensa" : "reward";
}

function getRewardSourceLabel(rewardSource, es) {
  if (rewardSource === "mission_claim") {
    return es ? "Mision" : "Mission";
  }
  if (rewardSource === "duplicate_cards") {
    return es ? "Duplicados" : "Duplicates";
  }
  return es ? "Sistema" : "System";
}

function buildClaimMessage(mission, es, fallbackMessage) {
  if (!mission) return fallbackMessage;
  return es
    ? `Recompensa reclamada: +${mission.rewardAmount} ${getRewardTypeLabel(mission.rewardType, true)}.`
    : `Reward claimed: +${mission.rewardAmount} ${getRewardTypeLabel(mission.rewardType, false)}.`;
}

function FavoriteIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 17.7 6.1 21l1.6-6.6L2.6 10l6.7-.6L12 3.2l2.7 6.2 6.7.6-5.1 4.4 1.6 6.6Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InspectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.2v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.4" r="1" fill="currentColor" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13 5h6v6M10 14 19 5M19 13v4.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryTile({ label, value, accent, note }) {
  return (
    <article className="wg-summary-tile" style={{ "--wg-summary-accent": accent }}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function RarityBadge({ rarity }) {
  return (
    <span
      className="wg-rarity-badge"
      style={{ "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }}
    >
      {rarity}
    </span>
  );
}

function ArticleArt({ article, compact = false, archiveLabel }) {
  const title = getTitle(article);
  return (
    <div className={`wg-card-art${compact ? " is-compact" : ""}${article?.imageUrl ? " has-image" : ""}`}>
      {article?.imageUrl ? (
        <img src={article.imageUrl} alt={title} loading="lazy" />
      ) : (
        <>
          <div className="wg-card-monogram">{title[0]?.toUpperCase() ?? "W"}</div>
          <div className="wg-card-gridlines" />
        </>
      )}
      <div className="wg-card-art-overlay">
        <span>{article?.topicGroup ?? archiveLabel}</span>
      </div>
    </div>
  );
}

function SmallCard({ item, archiveLabel, copiesLabel, favoriteTag, onOpen, onToggleFavorite, formatNumber }) {
  const rarity = getRarity(item);
  return (
    <article className="wg-mini-card" style={{ "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }}>
      <button type="button" className="wg-card-open" onClick={() => onOpen(item.articleId)}>
        <div className="wg-card-headline">
          <RarityBadge rarity={rarity} />
          <span className="wg-chip">{item.topicGroup ?? archiveLabel}</span>
          {item.favorite ? <span className="wg-new-pill">{favoriteTag}</span> : null}
        </div>
        <ArticleArt article={item} compact archiveLabel={archiveLabel} />
        <div className="wg-card-copy">
          <h4>{getTitle(item)}</h4>
          <p>{getBlurb(item)}</p>
        </div>
      </button>
      <div className="wg-card-footer">
        <div className="wg-stat-row">
          <span>ATK</span>
          <strong>{formatNumber(item.atk)}</strong>
        </div>
        <div className="wg-stat-row">
          <span>DEF</span>
          <strong>{formatNumber(getDef(item))}</strong>
        </div>
        <div className="wg-stat-row is-copy">
          <span>{copiesLabel}</span>
          <strong>x{item.copies}</strong>
        </div>
        <button type="button" className={`wg-icon-btn${item.favorite ? " is-active" : ""}`} onClick={() => onToggleFavorite(item.articleId, !item.favorite)}>
          <FavoriteIcon active={Boolean(item.favorite)} />
        </button>
      </div>
    </article>
  );
}

function PackShowcase({ card, archiveLabel, qualityLabel, copiesLabel, shardsLabel, newLabel, formatNumber }) {
  const rarity = getRarity(card);
  return (
    <article className="wg-showcase-card" style={{ "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }}>
      <div className="wg-card-headline">
        <RarityBadge rarity={rarity} />
        <span className="wg-chip">{card.topicGroup ?? archiveLabel}</span>
        {card.wasNew ? <span className="wg-new-pill">{newLabel}</span> : null}
        <span className="wg-chip">{qualityLabel} {card.qualityScore}</span>
      </div>
      <ArticleArt article={card} archiveLabel={archiveLabel} />
      <div className="wg-showcase-body">
        <h3>{getTitle(card)}</h3>
        <p>{getBlurb(card)}</p>
      </div>
      <div className="wg-showcase-stats">
        <div className="wg-showcase-stat is-attack">
          <span>ATK</span>
          <strong>{formatNumber(card.atk)}</strong>
        </div>
        <div className="wg-showcase-stat is-defense">
          <span>DEF</span>
          <strong>{formatNumber(getDef(card))}</strong>
        </div>
        <div className="wg-showcase-meta">
          <span>{qualityLabel} {card.qualityScore}</span>
          <span>+{card.shardsEarned ?? 0} {shardsLabel}</span>
          <span>{copiesLabel} {card.copiesAfterPull ?? card.copies ?? 1}</span>
        </div>
      </div>
    </article>
  );
}

function TopicGlyph({ topicGroup }) {
  const normalized = String(topicGroup ?? "").toLowerCase();
  if (normalized.includes("people") || normalized.includes("persona") || normalized.includes("person")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 18.5c1.4-3 3.2-4.5 5.5-4.5s4.1 1.5 5.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalized.includes("bio") || normalized.includes("taxon") || normalized.includes("science")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.5 6.5c-6 0-10 3.7-10 9.5 5.8 0 9.5-4 9.5-10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 16c1.4-1.4 3.2-3.2 6-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalized.includes("geo") || normalized.includes("location") || normalized.includes("places")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 5 8v8l7 4 7-4V8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v16M5 8l7 4 7-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function StackCard({ card, archiveLabel, formatNumber, onOpen, onToggleFavorite, onCardActivate }) {
  const rarity = getRarity(card);
  const title = getTitle(card);
  const titleClassName = `wg-stack-title${
    title.length > 72 ? " is-longer" : title.length > 48 ? " is-long" : ""
  }`;
  const hasImage = Boolean(card?.imageUrl);
  const articleId = card.articleId ?? card.id;
  const topicLabel = card.topicGroup ?? archiveLabel;
  const qualityValue = Number.isFinite(Number(card?.qualityScore)) ? Number(card.qualityScore) : "--";
  const serialId = articleId ? String(articleId).padStart(4, "0") : "----";
  const handleActivate = () => {
    if (!articleId) return;
    if (typeof onCardActivate === "function") {
      onCardActivate(articleId);
      return;
    }
    if (typeof onOpen === "function") onOpen(articleId);
  };

  return (
    <article
      className="wg-stack-card"
      style={{ "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
    >
      <button
        type="button"
        className={`wg-stack-favorite${card.favorite ? " is-active" : ""}`}
        title={card.favorite ? "Remove favorite" : "Add favorite"}
        aria-label={card.favorite ? "Remove favorite" : "Add favorite"}
        onClick={(event) => {
          event.stopPropagation();
          if (articleId && typeof onToggleFavorite === "function") onToggleFavorite(articleId, !card.favorite);
        }}
      >
        <FavoriteIcon active={Boolean(card.favorite)} />
      </button>

      <div className="wg-stack-frame">
        <div className="wg-stack-fx" />
        <div className="wg-stack-inner">
          <header className="wg-stack-header">
            <div className="wg-stack-header-main">
              <span className="wg-stack-rarity">{rarity}</span>
              <span className={titleClassName}>{title}</span>
            </div>
            <div className="wg-stack-header-meta">
              <span className="wg-stack-topic-tag">{topicLabel}</span>
              <span className="wg-stack-quality-badge">Q {qualityValue}</span>
            </div>
          </header>

          <div className="wg-stack-art">
            <span className="wg-stack-topic" title={card.topicGroup ?? archiveLabel} aria-label={card.topicGroup ?? archiveLabel}>
              <TopicGlyph topicGroup={card.topicGroup} />
            </span>
            {hasImage ? (
              <img src={card.imageUrl} alt={title} loading="lazy" />
            ) : (
              <div className="wg-stack-art-fallback">
                <span>W</span>
                <h2>{title}</h2>
              </div>
            )}
            <button
              type="button"
              className="wg-stack-info"
              data-no-stack-swipe="1"
              aria-label="Inspect card"
              onClick={(event) => {
                event.stopPropagation();
                if (articleId && typeof onOpen === "function") onOpen(articleId);
              }}
            >
              i
            </button>
          </div>

          <div className="wg-stack-blurb">
            <p>{getBlurb(card)}</p>
          </div>

          <div className="wg-stack-serial">
            <span>#{serialId}</span>
            <span>{rarity}</span>
            <span>x{formatNumber(card?.copies ?? 1)}</span>
          </div>

          <footer className="wg-stack-stats">
            <div className="wg-stack-stat is-attack">
              <span>ATK</span>
              <strong>{formatNumber(card.atk)}</strong>
            </div>
            <div className="wg-stack-stat is-defense">
              <span>DEF</span>
              <strong>{formatNumber(getDef(card))}</strong>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}

function DetailFlipCard({
  card,
  archiveLabel,
  formatNumber,
  isFlipped,
  onFlip,
  flipHint,
  flipBackHint,
  detailDescriptionTitle,
}) {
  const rarity = getRarity(card);
  const title = getTitle(card);
  const detailText = getExtendedBlurb(card);

  return (
    <div
      className={`wg-detail-flip${isFlipped ? " is-flipped" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? flipBackHint : flipHint}
      onClick={onFlip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <div className="wg-detail-flip-face is-front">
        <div className="wg-detail-front-card">
          <StackCard
            card={card}
            archiveLabel={archiveLabel}
            formatNumber={formatNumber}
            onOpen={() => {}}
            onToggleFavorite={() => {}}
          />
        </div>
        <p className="wg-detail-flip-hint">{flipHint}</p>
      </div>

      <article className="wg-detail-flip-face is-back">
        <header className="wg-detail-back-head">
          <RarityBadge rarity={rarity} />
          <span className="wg-chip">{card.topicGroup ?? archiveLabel}</span>
        </header>
        <h4>{title}</h4>
        <h5>{detailDescriptionTitle}</h5>
        <p className="wg-detail-back-description">{detailText}</p>
        <p className="wg-detail-flip-hint">{flipBackHint}</p>
      </article>
    </div>
  );
}

function TrophyIcon({ iconKey }) {
  if (iconKey === "atom") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="1.7" fill="currentColor" />
        <ellipse cx="12" cy="12" rx="8" ry="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="3.4" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.4 6.4c3.1 3.1 8.1 8.1 11.2 11.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (iconKey === "laurel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18c-3-1-4.8-3.6-5-7 2 .7 3.5 2.1 4.3 4.1M15 18c3-1 4.8-3.6 5-7-2 .7-3.5 2.1-4.3 4.1M12 8v11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (iconKey === "shelf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h4v10H5zM10 5h4v12h-4zM15 8h4v9h-4zM4 18h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }

  if (iconKey === "echo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 12a6 6 0 0 1 6-6M4 12a8 8 0 0 1 8-8M18 12a6 6 0 0 0-6-6M20 12a8 8 0 0 0-8-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (iconKey === "gold-frame") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="8" y="8" width="8" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (iconKey === "flare") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 4 1.7 4.8L18.5 10l-4.8 1.2L12 16l-1.7-4.8L5.5 10l4.8-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function MissionCard({ mission, title, progressLabel, rewardLabel, doneLabel, claimedLabel, claimLabel, activeLabel, busy, onClaim }) {
  const progressPercent = getMissionPercent(mission);
  const statusLabel = mission.claimed ? claimedLabel : mission.completed ? doneLabel : activeLabel;
  return (
    <article className={`wg-mission-card${mission.completed ? " is-completed" : ""}${mission.claimed ? " is-claimed" : ""}`}>
      <div className="wg-section-head">
        <div>
          <h3>{mission.title}</h3>
          <p>{mission.description}</p>
        </div>
        <span className={`wg-mission-state${mission.completed ? " is-completed" : ""}${mission.claimed ? " is-claimed" : ""}`}>
          {statusLabel}
        </span>
      </div>
      <div className="wg-mission-progress-head">
        <span>{progressLabel}</span>
        <strong>{mission.progressValue}/{mission.targetValue}</strong>
      </div>
      <div className="wg-progress-bar">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="wg-row-meta">
        <span className="wg-pill-accent">
          {rewardLabel}: +{mission.rewardAmount} {mission.rewardType}
        </span>
        <button type="button" className="wg-primary-btn" disabled={!mission.completed || mission.claimed || busy} onClick={() => onClaim(mission.id)}>
          {mission.claimed ? claimedLabel : mission.completed ? claimLabel : activeLabel}
        </button>
      </div>
    </article>
  );
}

function TrophyCard({ trophy, pointsLabel, unlockedLabel, lockedLabel }) {
  return (
    <article className={`wg-trophy-card${trophy.unlocked ? " is-unlocked" : ""}`}>
      <span className="wg-trophy-icon">
        <TrophyIcon iconKey={trophy.iconKey} />
      </span>
      <div className="wg-trophy-copy">
        <h3>{trophy.name}</h3>
        <p>{trophy.description}</p>
      </div>
      <small>
        +{trophy.points} {pointsLabel} | {trophy.unlocked ? unlockedLabel : lockedLabel}
      </small>
    </article>
  );
}

export default function WikipediaGachaGame() {
  const browserLocale = useMemo(resolveBrowserLanguage, []);
  const [locale, setLocale] = useState(browserLocale);
  const es = locale === "es";
  const formatNumber = useMemo(() => {
    const formatter = new Intl.NumberFormat(es ? "es-ES" : "en-US");
    return (value) => formatter.format(Number(value) || 0);
  }, [es]);

  const text = {
    archive: es ? "Archivo" : "Archive",
    quality: "Q",
    copies: es ? "Copias" : "Copies",
    shards: es ? "shards" : "shards",
    favoriteTag: "Fav",
    favoriteOnly: es ? "Solo favoritas" : "Favorites only",
    duplicateOnly: es ? "Solo duplicadas" : "Duplicates only",
    sync: es ? "Sincronizar" : "Sync",
    syncOk: es ? "Estado sincronizado." : "State synced.",
    openPack: es ? "Abrir sobre" : "Open pack",
    opening: es ? "Abriendo..." : "Opening...",
    inspect: es ? "Inspeccionar" : "Inspect",
    wikipedia: "Wikipedia",
    close: es ? "Cerrar" : "Close",
    exportCode: es ? "Exportar codigo" : "Export code",
    importCode: es ? "Importar codigo" : "Import code",
    recoveryOk: es ? "Coleccion restaurada." : "Collection restored.",
    exportOk: es ? "Codigo de respaldo generado." : "Backup code generated.",
    claimOk: es ? "Recompensa reclamada." : "Reward claimed.",
    dailyPacks: es ? "Sobres diarios" : "Daily packs",
    nextPack: es ? "Siguiente sobre" : "Next pack",
    gems: es ? "Gemas" : "Gems",
    trophyPoints: es ? "Puntos trofeo" : "Trophy pts",
    unique: es ? "Unicas" : "Unique",
    missionsReady: es ? "Misiones listas" : "Missions ready",
    trophiesUnlocked: es ? "Trofeos abiertos" : "Trophies unlocked",
    totalPulls: es ? "Tiradas totales" : "Total pulls",
    packFull: es ? "Sobres al maximo" : "Packs full",
    searchPlaceholder: es ? "Buscar por titulo..." : "Search by title...",
    rarityPlaceholder: es ? "Rareza" : "Rarity",
    topicPlaceholder: es ? "Tema" : "Topic",
    noSource: es ? "Sin enlace" : "No source",
    categories: es ? "Categorias" : "Categories",
    noCategories: es ? "Sin categorias" : "No categories",
    reward: es ? "Recompensa" : "Reward",
    progress: es ? "Progreso" : "Progress",
    done: es ? "Completada" : "Completed",
    claimed: es ? "Reclamada" : "Claimed",
    claim: es ? "Reclamar" : "Claim",
    active: es ? "En curso" : "In progress",
    unlocked: es ? "Desbloqueado" : "Unlocked",
    locked: es ? "Bloqueado" : "Locked",
    points: es ? "Puntos" : "Points",
    guaranteed: es ? "SR+ garantizado" : "Guaranteed SR+",
    newCard: es ? "Nueva" : "New",
    duplicateCard: es ? "Duplicada" : "Duplicate",
    pending: es ? "Pendiente" : "Pending",
    rail: es ? "Slots del sobre" : "Pack slots",
    reveal: es ? "Reveal de sobre" : "Pack reveal",
    currentPack: es ? "Sobre actual" : "Current pack",
    latestPack: es ? "Ultimo pack" : "Latest pack",
    gachaTab: "Gacha",
    collectionTab: es ? "Coleccion" : "Collection",
    battleTab: es ? "Cartas" : "Cards",
    missionsTab: es ? "Misiones" : "Missions",
    trophiesTab: es ? "Trofeos" : "Trophies",
    packsReady: es ? "Sobres cargados" : "Packs full",
    specialPackReady: es ? "Sobre especial listo" : "Special pack ready",
    specialPackHint: es ? "Se activa cada 10 sobres y garantiza al menos 1 carta SR+." : "It unlocks every 10 packs and guarantees at least 1 SR+ card.",
    tapToOpen: es ? "▲ TOCA PARA ABRIR ▲" : "▲ TAP TO OPEN ▲",
    quickRules: es ? "Reglas rapidas" : "Quick rules",
    support: es ? "Soporte" : "Support",
    missionRewardNote: es ? "Recompensa: +2 sobres por mision completada" : "Reward: +2 packs per completed mission",
    noPackCards: es ? "Abre un sobre para cargar cartas en la baraja." : "Open a pack to load cards into the deck.",
    fullHandReady: es ? "Todas vistas: mazo en mano." : "All seen: full hand view.",
    tapToFlip: es ? "Toca la carta para girarla." : "Tap the card to flip it.",
    tapToNextCard: es ? "Toca de nuevo para pasar a la siguiente." : "Tap again to move to the next card.",
    dailyMissionUnlocked: es ? "Mision diaria desbloqueada" : "Daily mission unlocked",
    topRarityPull: es ? "Drop de rareza maxima" : "Top-tier rarity pull",
    topRarityPullHint: es ? "Has obtenido una carta de las rarezas mas altas." : "You pulled at least one card from the top rarities.",
    cardCarousel: es ? "Carrusel de cartas" : "Card carousel",
    sourceLink: es ? "Ver fuente" : "View source",
    backToGacha: es ? "Volver al Gacha" : "Back to Gacha",
    detailFlipHint: es ? "Haz click en la carta para ver mas descripcion." : "Click the card to read more description.",
    detailFlipBackHint: es ? "Haz click para volver al frente." : "Click to flip back to the front.",
    detailDescriptionTitle: es ? "Descripcion extendida" : "Extended description",
    pullsUntilGold: es ? "sobres hasta sobre especial" : "packs until special pack",
    rewardVaultTitle: es ? "Boveda de recompensas" : "Reward vault",
    rewardVaultSubtitle: es ? "Las recompensas de misiones quedan registradas y disponibles para usar al instante." : "Mission rewards are logged and become instantly usable.",
    rewardVaultHint: es ? "Ultimas recompensas de misiones" : "Latest mission rewards",
    noMissionRewards: es ? "Todavia no has reclamado recompensas de mision hoy." : "You have not claimed mission rewards yet today.",
    rewardHistoryTitle: es ? "Historial de recompensas" : "Reward history",
    rewardHistorySubtitle: es ? "Todo lo reclamado y su utilidad directa." : "Everything claimed and its immediate utility.",
    claimedAt: es ? "Reclamada" : "Claimed",
    rewardSource: es ? "Origen" : "Source",
    useRewardsNow: es ? "Usar recompensas" : "Use rewards now",
    reviewMissions: es ? "Ver misiones" : "Review missions",
    unknownMission: es ? "Mision diaria" : "Daily mission",
    totalMissionRewards: es ? "Total reclamado hoy" : "Total claimed today",
  };

  const [activeTab, setActiveTab] = useState("home");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dashboardStampMs, setDashboardStampMs] = useState(() => Date.now());
  const [browserToken, setBrowserToken] = useState(() => window.localStorage.getItem(STORAGE_KEY) ?? "");
  const [dashboard, setDashboard] = useState(null);
  const [collection, setCollection] = useState({ items: [], total: 0, page: 1, pageSize: 12, availableTopics: [], summary: null });
  const [missions, setMissions] = useState({ missions: [], summary: null });
  const [trophies, setTrophies] = useState({ trophies: [], summary: null });
  const [collectionFilters, setCollectionFilters] = useState({ query: "", rarity: "", topicGroup: "", favorite: false, duplicatesOnly: false, sortBy: "recent", page: 1, pageSize: 12 });
  const [packResult, setPackResult] = useState(null);
  const [revealCursor, setRevealCursor] = useState(0);
  const [revealFace, setRevealFace] = useState("back");
  const [seenPackCardIndices, setSeenPackCardIndices] = useState([]);
  const [fanShiftDirection, setFanShiftDirection] = useState("");
  const [handCenterIndex, setHandCenterIndex] = useState(0);
  const [packHeroAnimState, setPackHeroAnimState] = useState("idle");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [detailCardFlipped, setDetailCardFlipped] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryImport, setRecoveryImport] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [missionUnlockFeed, setMissionUnlockFeed] = useState([]);
  const [rareDropFx, setRareDropFx] = useState(null);

  const tokenRef = useRef(browserToken);
  const nowRef = useRef(nowMs);
  const autoRefreshKeyRef = useRef("");
  const packHeroTimeoutsRef = useRef([]);
  const revealFlipTimeoutRef = useRef(null);
  const fanShiftTimeoutRef = useRef(null);
  const missionFeedTimeoutsRef = useRef([]);
  const rareDropTimeoutRef = useRef(null);

  useEffect(() => {
    tokenRef.current = browserToken;
  }, [browserToken]);

  useEffect(() => {
    nowRef.current = nowMs;
  }, [nowMs]);

  useEffect(() => {
    setDetailCardFlipped(false);
  }, [selectedArticle?.articleId, selectedArticle?.id]);

  const clearPackHeroTimeouts = () => {
    packHeroTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    packHeroTimeoutsRef.current = [];
  };

  const clearRevealTimeouts = () => {
    if (revealFlipTimeoutRef.current) {
      window.clearTimeout(revealFlipTimeoutRef.current);
      revealFlipTimeoutRef.current = null;
    }
  };

  const clearFanShiftTimeout = () => {
    if (fanShiftTimeoutRef.current) {
      window.clearTimeout(fanShiftTimeoutRef.current);
      fanShiftTimeoutRef.current = null;
    }
  };

  const clearMissionFeedTimeouts = () => {
    missionFeedTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    missionFeedTimeoutsRef.current = [];
  };

  const clearRareDropTimeout = () => {
    if (rareDropTimeoutRef.current) {
      window.clearTimeout(rareDropTimeoutRef.current);
      rareDropTimeoutRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearPackHeroTimeouts();
      clearRevealTimeouts();
      clearFanShiftTimeout();
      clearMissionFeedTimeouts();
      clearRareDropTimeout();
    },
    []
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs((current) => current + 200), 200);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        let token = tokenRef.current;
        if (!token) {
          token = (await bootstrapWikipediaGachaSession()).browserToken;
          window.localStorage.setItem(STORAGE_KEY, token);
          setBrowserToken(token);
        }
        try {
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(token),
            fetchWikipediaGachaCollection(token, toCollectionParams(collectionFilters)),
            fetchWikipediaGachaMissions(token),
            fetchWikipediaGachaTrophies(token),
          ]);
          setDashboard(dashboardData);
          setDashboardStampMs(nowRef.current);
          setCollection(collectionData);
          setMissions(missionsData);
          setTrophies(trophiesData);
        } catch (error) {
          if (error?.code !== "invalid_browser_token") throw error;
          // Token stale (backend restarted or DB reset) — create a fresh session
          window.localStorage.removeItem(STORAGE_KEY);
          const freshToken = (await bootstrapWikipediaGachaSession()).browserToken;
          window.localStorage.setItem(STORAGE_KEY, freshToken);
          setBrowserToken(freshToken);
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(freshToken),
            fetchWikipediaGachaCollection(freshToken, toCollectionParams(collectionFilters)),
            fetchWikipediaGachaMissions(freshToken),
            fetchWikipediaGachaTrophies(freshToken),
          ]);
          setDashboard(dashboardData);
          setDashboardStampMs(nowRef.current);
          setCollection(collectionData);
          setMissions(missionsData);
          setTrophies(trophiesData);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, es));
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!browserToken) return undefined;
    const timeoutId = window.setTimeout(() => {
      void fetchWikipediaGachaCollection(browserToken, toCollectionParams(collectionFilters))
        .then(setCollection)
        .catch((error) => setErrorMessage(getErrorMessage(error, es)));
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [browserToken, collectionFilters, es]);

  const refreshAll = async (message = "") => {
    if (!tokenRef.current) return null;
    const sessionToken = tokenRef.current;
    setBusy(true);
    setErrorMessage("");
    try {
      const [dashboardResult, collectionResult, missionsResult, trophiesResult] = await Promise.allSettled([
        fetchWikipediaGachaSession(sessionToken),
        fetchWikipediaGachaCollection(sessionToken, toCollectionParams(collectionFilters)),
        fetchWikipediaGachaMissions(sessionToken),
        fetchWikipediaGachaTrophies(sessionToken),
      ]);

      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }

      const dashboardData = dashboardResult.value;
      const collectionData = collectionResult.status === "fulfilled" ? collectionResult.value : null;
      const missionsData = missionsResult.status === "fulfilled" ? missionsResult.value : null;
      const trophiesData = trophiesResult.status === "fulfilled" ? trophiesResult.value : null;

      setDashboard(dashboardData);
      setDashboardStampMs(nowRef.current);
      if (collectionData) setCollection(collectionData);
      if (missionsData) setMissions(missionsData);
      if (trophiesData) setTrophies(trophiesData);

      if (collectionResult.status !== "fulfilled" || missionsResult.status !== "fulfilled" || trophiesResult.status !== "fulfilled") {
        const partialErrors = [collectionResult, missionsResult, trophiesResult]
          .filter((result) => result.status !== "fulfilled")
          .map((result) => result.reason);
        console.warn("[wikipedia-gacha] partial refresh failed", partialErrors);
      }

      if (message) setStatusMessage(message);
      return { dashboardData, collectionData, missionsData, trophiesData };
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const showMissionUnlockFeed = (missionsUnlocked) => {
    if (!missionsUnlocked.length) return;
    const baseTime = Date.now();
    const entries = missionsUnlocked.slice(0, 3).map((mission, index) => ({
      id: `mission-unlock-${mission.id}-${baseTime}-${index}`,
      title: mission.title,
      rewardAmount: mission.rewardAmount,
      rewardType: mission.rewardType,
    }));

    setMissionUnlockFeed((current) => [...current, ...entries].slice(-4));
    entries.forEach((entry, index) => {
      const timeoutId = window.setTimeout(() => {
        setMissionUnlockFeed((current) => current.filter((notice) => notice.id !== entry.id));
        missionFeedTimeoutsRef.current = missionFeedTimeoutsRef.current.filter((scheduled) => scheduled !== timeoutId);
      }, 4300 + index * 240);
      missionFeedTimeoutsRef.current.push(timeoutId);
    });
  };

  const showTopRarityFx = (packCards) => {
    const topRarityCards = packCards.filter((card) => TOP_TIER_RARITIES.has(getRarity(card)));
    if (!topRarityCards.length) return;
    const rarities = [...new Set(topRarityCards.map((card) => getRarity(card)))].sort(
      (left, right) => RARITY_ORDER.indexOf(left) - RARITY_ORDER.indexOf(right)
    );
    const eventId = `top-rarity-${Date.now()}`;
    setRareDropFx({ id: eventId, rarities, topRarity: rarities[0] ?? "UR" });
    clearRareDropTimeout();
    rareDropTimeoutRef.current = window.setTimeout(() => {
      setRareDropFx((current) => (current?.id === eventId ? null : current));
      rareDropTimeoutRef.current = null;
    }, 2200);
  };

  const livePackStatus = useMemo(() => {
    if (!dashboard?.packStatus) return null;
    const elapsedSeconds = Math.floor((nowMs - dashboardStampMs) / 1000);
    return getDisplayPackStatus({
      ...dashboard.packStatus,
      secondsUntilNextPack: Math.max(0, dashboard.packStatus.secondsUntilNextPack - elapsedSeconds),
    });
  }, [dashboard, dashboardStampMs, nowMs]);

  useEffect(() => {
    if (!browserToken || !dashboard?.packStatus || !livePackStatus) return;
    if (dashboard.packStatus.packsAvailable >= dashboard.packStatus.maxPacks) return;
    if (livePackStatus.secondsUntilNextPack !== 0) return;
    const refreshKey = `${dashboard.packStatus.packsAvailable}:${dashboard.packStatus.lastPackRegenAt}`;
    if (autoRefreshKeyRef.current === refreshKey) return;
    autoRefreshKeyRef.current = refreshKey;
    void refreshAll();
  }, [browserToken, dashboard, livePackStatus]);

  const revealedCount = packResult ? Math.max(0, Math.min(packResult.cards.length, Math.floor((nowMs - packResult.startedAtMs) / 240))) : 0;
  const currentPackCards = packResult?.cards ?? dashboard?.recentPackHistory?.[0]?.cards ?? [];
  const visiblePackCards = packResult ? currentPackCards.slice(0, Math.max(1, revealedCount)) : currentPackCards;
  const packDeckSignature = useMemo(
    () => currentPackCards.map((card, index) => String(card.articleId ?? card.id ?? `${getTitle(card)}-${index}`)).join("|"),
    [currentPackCards]
  );
  const clampedRevealCursor = Math.max(0, Math.min(revealCursor, Math.max(0, currentPackCards.length - 1)));
  const focusedPackCard = currentPackCards[clampedRevealCursor] ?? null;
  const focusedPackDeckIndex = clampedRevealCursor;
  const canCyclePackDeck = currentPackCards.length > 1;
  const allPackCardsSeen = currentPackCards.length > 0 && seenPackCardIndices.length >= currentPackCards.length;
  const revealHistoryIndices = useMemo(
    () => seenPackCardIndices.filter((index) => index < clampedRevealCursor).sort((a, b) => a - b).slice(-4),
    [seenPackCardIndices, clampedRevealCursor]
  );
  const clampedHandCenterIndex = Math.max(0, Math.min(handCenterIndex, Math.max(0, currentPackCards.length - 1)));
  const activePackDeckIndex = allPackCardsSeen ? clampedHandCenterIndex : focusedPackDeckIndex;
  const activePackCard = allPackCardsSeen
    ? currentPackCards[clampedHandCenterIndex] ?? focusedPackCard
    : focusedPackCard;

  useEffect(() => {
    clearRevealTimeouts();
    clearFanShiftTimeout();
    setFanShiftDirection("");
    setRevealCursor(0);
    setRevealFace("back");
    setSeenPackCardIndices([]);
    setHandCenterIndex(0);
  }, [packDeckSignature]);

  const handleOpenPack = async () => {
    if (!tokenRef.current || busy || loading) return;
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const previousMissionsById = new Map(
        (missions.missions ?? []).map((mission) => [mission.id, { completed: Boolean(mission.completed) }])
      );
      const result = await openWikipediaGachaPack(tokenRef.current);
      setPackResult({ ...result, startedAtMs: nowRef.current + 120 });
      setDashboard((current) => {
        if (!current) return current;
        const parsedPityCounter = Number(result.pityCounter);
        const parsedPacksRemaining = Number(result.packStatus?.packsAvailable ?? result.packsRemaining);
        const parsedTotalPackOpens = Number(result.totalPackOpens);
        const hasPityCounter = Number.isFinite(parsedPityCounter);
        const hasPacksRemaining = Number.isFinite(parsedPacksRemaining);
        const hasTotalPackOpens = Number.isFinite(parsedTotalPackOpens);
        const nextPityCounter = hasPityCounter
          ? Math.max(0, Math.min(PACK_PITY_TARGET, Math.floor(parsedPityCounter)))
          : current.packStatus?.pityCounter ?? 0;
        const nextPackStatus = getDisplayPackStatus(
          result.packStatus
            ? result.packStatus
            : {
                ...(current.packStatus ?? {}),
                packsAvailable: hasPacksRemaining
                  ? Math.max(0, parsedPacksRemaining)
                  : current.packStatus?.packsAvailable,
                pityCounter: nextPityCounter,
                nextPackGuaranteedSrPlus: nextPityCounter >= PACK_PITY_TARGET,
              }
        );
        return {
          ...current,
          profile: {
            ...(current.profile ?? {}),
            packsAvailable: hasPacksRemaining
              ? Math.max(0, parsedPacksRemaining)
              : current.profile?.packsAvailable,
            pityCounter: nextPityCounter,
            totalPackOpens: hasTotalPackOpens
              ? Math.max(0, Math.floor(parsedTotalPackOpens))
              : current.profile?.totalPackOpens,
          },
          packStatus: nextPackStatus,
        };
      });
      setDashboardStampMs(nowRef.current);
      setActiveTab("packs");
      showTopRarityFx(result.cards ?? []);

      const refreshed = await refreshAll();
      const updatedMissions = refreshed?.missionsData?.missions ?? [];
      if (updatedMissions.length) {
        const unlockedNow = updatedMissions.filter((mission) => {
          if (!mission.completed || mission.claimed) return false;
          return !previousMissionsById.get(mission.id)?.completed;
        });
        showMissionUnlockFeed(unlockedNow);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPackFromHero = () => {
    if (!tokenRef.current || busy || loading || packHeroAnimState !== "idle") return;
    if ((packStatus?.packsAvailable ?? 0) <= 0) return;

    clearPackHeroTimeouts();
    setPackHeroAnimState("priming");

    const burstTimeoutId = window.setTimeout(() => {
      setPackHeroAnimState("burst");
    }, 560);
    const openTimeoutId = window.setTimeout(() => {
      setActiveTab("packs");
      void handleOpenPack();
    }, 820);
    const resetTimeoutId = window.setTimeout(() => {
      setPackHeroAnimState("idle");
    }, 1800);

    packHeroTimeoutsRef.current.push(burstTimeoutId, openTimeoutId, resetTimeoutId);
  };

  const handleRevealCurrentCard = () => {
    if (allPackCardsSeen) return;
    if (!currentPackCards.length) return;
    if (revealFace !== "back") return;

    clearRevealTimeouts();
    setRevealFace("flipping");

    revealFlipTimeoutRef.current = window.setTimeout(() => {
      setRevealFace("front");
      revealFlipTimeoutRef.current = null;
    }, 320);
  };

  const handleAdvanceRevealedCard = () => {
    if (allPackCardsSeen) return;
    if (!currentPackCards.length) return;
    if (revealFace !== "front") return;

    const revealedIndex = clampedRevealCursor;
    const lastIndex = Math.max(0, currentPackCards.length - 1);
    const isLastCard = revealedIndex >= lastIndex;

    setSeenPackCardIndices((current) => (current.includes(revealedIndex) ? current : [...current, revealedIndex]));
    if (isLastCard) {
      setHandCenterIndex(revealedIndex);
      return;
    }

    setRevealCursor(revealedIndex + 1);
    setRevealFace("back");
  };

  const handleRevealStep = () => {
    if (revealFace === "back") {
      handleRevealCurrentCard();
      return;
    }
    if (revealFace === "front") handleAdvanceRevealedCard();
  };

  const handleShiftPackDeck = (direction) => {
    if (!canCyclePackDeck || fanShiftDirection) return;

    if (allPackCardsSeen) {
      const nextIndex = Math.max(0, Math.min(clampedHandCenterIndex + direction, currentPackCards.length - 1));
      if (nextIndex === clampedHandCenterIndex) return;
      clearFanShiftTimeout();
      setFanShiftDirection(direction < 0 ? "left" : "right");
      fanShiftTimeoutRef.current = window.setTimeout(() => {
        setFanShiftDirection("");
        fanShiftTimeoutRef.current = null;
      }, 460);
      setHandCenterIndex(nextIndex);
      return;
    }
  };

  const handleSelectPackSlot = (targetDeckIndex) => {
    if (allPackCardsSeen) {
      if (targetDeckIndex === clampedHandCenterIndex) return;
      const direction = targetDeckIndex > clampedHandCenterIndex ? 1 : -1;
      clearFanShiftTimeout();
      setFanShiftDirection(direction < 0 ? "left" : "right");
      fanShiftTimeoutRef.current = window.setTimeout(() => {
        setFanShiftDirection("");
        fanShiftTimeoutRef.current = null;
      }, 460);
      setHandCenterIndex(targetDeckIndex);
      return;
    }
    clearRevealTimeouts();
    setRevealCursor(targetDeckIndex);
    setRevealFace("back");
  };

  const handleToggleFavorite = async (articleId, favorite) => {
    if (!tokenRef.current) return;
    try {
      const updated = await toggleWikipediaGachaFavorite(tokenRef.current, articleId, favorite);
      setCollection((current) => ({
        ...current,
        items: current.items.map((item) => (item.articleId === articleId ? { ...item, favorite: updated.favorite } : item)),
      }));
      if ((selectedArticle?.articleId ?? selectedArticle?.id) === articleId) {
        setSelectedArticle((current) => (current ? { ...current, favorite: updated.favorite } : current));
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };

  const handleSelectArticle = async (articleId) => {
    if (!tokenRef.current) return;
    try {
      setSelectedArticle(await fetchWikipediaGachaArticle(tokenRef.current, articleId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };

  const handleOpenSource = async (article) => {
    if (!tokenRef.current || !article?.articleId || !article?.sourceUrl) return;
    try {
      await registerWikipediaGachaArticleClick(tokenRef.current, article.articleId);
      window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };

  const handleClaimMission = async (missionId) => {
    if (!tokenRef.current) return;
    setBusy(true);
    try {
      const claimResult = await claimWikipediaGachaMission(tokenRef.current, missionId);
      await refreshAll(buildClaimMessage(claimResult?.mission, es, text.claimOk));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };

  const handleExportRecovery = async () => {
    if (!tokenRef.current) return;
    setBusy(true);
    try {
      const result = await exportWikipediaGachaRecovery(tokenRef.current);
      setRecoveryCode(result.recoveryCode);
      setStatusMessage(text.exportOk);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };

  const handleImportRecovery = async () => {
    if (!tokenRef.current || !recoveryImport.trim()) return;
    setBusy(true);
    try {
      await importWikipediaGachaRecovery(tokenRef.current, recoveryImport.trim());
      setRecoveryImport("");
      await refreshAll(text.recoveryOk);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handleKeydown = (event) => {
      if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
      if (["1", "2", "3", "4", "5"].includes(event.key)) setActiveTab(TAB_ORDER[Number(event.key) - 1]);
      if ((event.key === " " || event.key === "Enter") && activeTab === "packs") {
        event.preventDefault();
        if (currentPackCards.length && !allPackCardsSeen) {
          handleRevealStep();
        } else if (!currentPackCards.length) {
          void handleOpenPack();
        }
      }
      if (event.key === "ArrowLeft" && activeTab === "packs" && currentPackCards.length > 1 && allPackCardsSeen) {
        event.preventDefault();
        handleShiftPackDeck(-1);
      }
      if (event.key === "ArrowRight" && activeTab === "packs" && currentPackCards.length > 1) {
        event.preventDefault();
        if (allPackCardsSeen) {
          handleShiftPackDeck(1);
        } else {
          handleRevealStep();
        }
      }
      if (event.key.toLowerCase() === "r") void refreshAll(text.syncOk);
      if (event.key === "Escape") setSelectedArticle(null);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeTab, currentPackCards.length, text.syncOk, canCyclePackDeck, allPackCardsSeen, revealFace, clampedRevealCursor]);

  const packStatus = livePackStatus ?? getDisplayPackStatus(dashboard?.packStatus ?? null);
  const pityPullsRemaining = packStatus ? Math.max(0, PACK_PITY_TARGET - (packStatus.pityCounter ?? 0)) : PACK_PITY_TARGET;
  const specialPackReady = Boolean(packStatus?.nextPackGuaranteedSrPlus);
  const packFillPercent = getPackFillPercent(packStatus);
  const packRegenPercent = getPackRegenPercent(packStatus);
  const collectionSummary = collection.summary ?? dashboard?.collectionSummary ?? { uniqueCards: 0, totalCopies: 0, favorites: 0, rarityBreakdown: {} };
  const missionSummary = missions.summary ?? dashboard?.missionSummary ?? { total: 0, completed: 0, claimable: 0 };
  const trophySummary = trophies.summary ?? dashboard?.trophySummary ?? { total: 0, unlocked: 0, points: 0 };
  const historyEntries = dashboard?.recentPackHistory ?? [];
  const recentRewardEvents = dashboard?.recentRewardEvents ?? [];
  const missionRewardHistory = useMemo(
    () => recentRewardEvents.filter((entry) => entry.rewardSource === "mission_claim"),
    [recentRewardEvents]
  );
  const missionRewardTotals = useMemo(
    () =>
      missionRewardHistory.reduce(
        (accumulator, rewardEntry) => {
          const rewardType = normalizeRewardType(rewardEntry.rewardType);
          if (rewardType === "packs" || rewardType === "gems" || rewardType === "shards") {
            accumulator[rewardType] += Number(rewardEntry.rewardAmount) || 0;
          }
          return accumulator;
        },
        { packs: 0, gems: 0, shards: 0 }
      ),
    [missionRewardHistory]
  );
  const packSlots = Array.from({ length: Math.max(currentPackCards.length || 0, 5) }, (_, index) => currentPackCards[index] ?? null);
  const packMetaSource = packResult ?? historyEntries[0] ?? null;
  const collectionTotalPages = Math.max(1, Math.ceil(collection.total / (collection.pageSize || 1)));
  const sortOptions = [
    { value: "recent", label: es ? "Recientes" : "Recent" },
    { value: "rarity_desc", label: es ? "Rareza" : "Rarity" },
    { value: "atk_desc", label: "ATK" },
    { value: "def_desc", label: "DEF" },
    { value: "title_asc", label: es ? "Nombre" : "Name" },
  ];
  const navTabs = [
    { id: "home", label: text.gachaTab },
    { id: "collection", label: text.collectionTab },
    { id: "packs", label: text.battleTab },
    { id: "missions", label: text.missionsTab },
    { id: "trophies", label: text.trophiesTab },
  ];
  const focusedPackSource = activePackCard ?? currentPackCards[0] ?? null;

  useGameRuntimeBridge(
    {
      mode: loading ? "loading" : errorMessage ? "error" : "ready",
      coordinateSystem: "ui_dom_top_left_x_right_y_down",
      activeTab,
      browserTokenSuffix: browserToken ? browserToken.slice(-8) : null,
      profile: {
        packsAvailable: packStatus?.packsAvailable ?? 0,
        maxPacks: packStatus?.maxPacks ?? 0,
        gems: dashboard?.profile?.gems ?? 0,
        shards: dashboard?.profile?.shards ?? 0,
        trophiesPoints: dashboard?.profile?.trophiesPoints ?? 0,
        pityCounter: packStatus?.pityCounter ?? 0,
        secondsUntilNextPack: packStatus?.secondsUntilNextPack ?? 0,
        nextPackGuaranteedSrPlus: Boolean(packStatus?.nextPackGuaranteedSrPlus),
      },
      collection: {
        total: collection.total,
        page: collection.page,
        visibleItems: collection.items.length,
        filters: {
          q: collectionFilters.query,
          rarity: collectionFilters.rarity,
          topicGroup: collectionFilters.topicGroup,
          favorite: collectionFilters.favorite,
          duplicatesOnly: collectionFilters.duplicatesOnly,
        },
      },
      latestPack: currentPackCards.length
        ? {
            packOpeningId: packMetaSource?.packOpeningId ?? null,
            guaranteedSrPlus: Boolean(packMetaSource?.guaranteedSrPlus),
            revealedCount: visiblePackCards.length,
            totalCards: currentPackCards.length,
            cards: currentPackCards.map((card, index) => ({
              title: getTitle(card),
              rarity: getRarity(card),
              wasNew: Boolean(card.wasNew),
              visible: index < visiblePackCards.length,
            })),
          }
        : null,
      missions: {
        total: missionSummary.total ?? 0,
        completed: missionSummary.completed ?? 0,
        claimable: missionSummary.claimable ?? 0,
      },
      missionRewards: {
        totalLogged: missionRewardHistory.length,
        totalsByType: missionRewardTotals,
        latest: missionRewardHistory.length
          ? {
              rewardType: normalizeRewardType(missionRewardHistory[0].rewardType),
              rewardAmount: missionRewardHistory[0].rewardAmount ?? 0,
              missionTitle: missionRewardHistory[0].missionTitle ?? null,
            }
          : null,
      },
      trophies: {
        total: trophySummary.total ?? 0,
        unlocked: trophySummary.unlocked ?? 0,
        points: trophySummary.points ?? 0,
      },
      selectedArticle: selectedArticle
        ? {
            articleId: selectedArticle.articleId ?? selectedArticle.id,
            title: getTitle(selectedArticle),
            rarity: getRarity(selectedArticle),
          }
        : null,
    },
    (state) => state,
    (ms) => setNowMs((current) => current + ms)
  );

  return (
    <section className="wg-shell antialiased">
      <nav className="wg-top-nav">
        <button
          type="button"
          className="wg-top-icon wg-lang-toggle"
          aria-label={es ? "Switch to English" : "Cambiar a Espanol"}
          onClick={() => setLocale((current) => (current === "es" ? "en" : "es"))}
        >
          {es ? "EN" : "ES"}
        </button>

        <div className="wg-top-tabs">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`wg-top-tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="wg-top-tools">
          <button type="button" className="wg-top-icon wg-top-icon-info" aria-label={text.sync} onClick={() => void refreshAll(text.syncOk)}>
            ?
          </button>
        </div>
      </nav>

      <div className={`wg-live-feedback-layer${activeTab === "packs" ? " is-packs" : ""}`} aria-live="polite">
        {rareDropFx ? (
          <div className={`wg-rare-drop-fx is-${String(rareDropFx.topRarity).toLowerCase()}`}>
            <span className="wg-rare-drop-kicker">{text.topRarityPull}</span>
            <strong>{rareDropFx.rarities.join(" · ")}</strong>
            <p>{text.topRarityPullHint}</p>
          </div>
        ) : null}
        {missionUnlockFeed.length ? (
          <aside className="wg-mission-unlock-stack">
            {missionUnlockFeed.map((notice) => (
              <article key={notice.id} className="wg-mission-unlock-toast">
                <header>
                  <strong>{text.dailyMissionUnlocked}</strong>
                  <span>+{notice.rewardAmount} {String(notice.rewardType).toUpperCase()}</span>
                </header>
                <p>{notice.title}</p>
              </article>
            ))}
          </aside>
        ) : null}
      </div>

      <main className="wg-main-content">
        {errorMessage ? <div className="wg-banner is-error">{errorMessage}</div> : null}
        {statusMessage ? <div className="wg-banner is-ok">{statusMessage}</div> : null}

        {loading ? <section className="wg-panel">Bootstrapping browser archive...</section> : null}

        {!loading && activeTab === "home" ? (
          <section className="wg-home-stage">
            <div className="wg-home-center">
              <div className="wg-pack-status-pill">
                <span>{text.dailyPacks}:</span>
                <strong>{packStatus?.packsAvailable ?? "--"} / {packStatus?.maxPacks ?? "--"}</strong>
              </div>
              <p className="wg-pack-subline">
                {packStatus && packStatus.packsAvailable >= packStatus.maxPacks
                  ? text.packsReady
                  : `${text.nextPack}: ${formatCountdown(packStatus?.secondsUntilNextPack ?? 0)}`}
              </p>
              <p className="wg-pack-progress">
                {pityPullsRemaining <= 0 ? text.guaranteed : `${pityPullsRemaining} ${text.pullsUntilGold}`}
              </p>
              {specialPackReady ? (
                <div className="wg-special-pack-banner">
                  <strong>{text.specialPackReady}</strong>
                  <p>{text.specialPackHint}</p>
                </div>
              ) : null}

              <button
                type="button"
                id="gacha-pack-container"
                className={`wg-pack-hero${packHeroAnimState !== "idle" ? " is-opening" : ""}${packHeroAnimState === "burst" ? " is-burst" : ""}${specialPackReady ? " is-special" : ""}`}
                onClick={handleOpenPackFromHero}
                disabled={busy || packHeroAnimState !== "idle" || (packStatus?.packsAvailable ?? 0) <= 0}
              >
                <span className="wg-pack-hero-aura" aria-hidden="true" />
                <span className="wg-pack-hero-rim" aria-hidden="true" />
                <span className="wg-pack-hero-spark is-1" aria-hidden="true" />
                <span className="wg-pack-hero-spark is-2" aria-hidden="true" />
                <span className="wg-pack-hero-spark is-3" aria-hidden="true" />
                <span className="wg-pack-hero-spark is-4" aria-hidden="true" />
                <div className="wg-pack-hero-art">
                  <div className="wg-pack-envelope">
                    <div className="wg-pack-envelope-paper" />
                    <img className="wg-pack-logo-globe" src="/wikipedia-logo-globe.png" alt="Wikipedia globe logo" />
                    <img className="wg-pack-logo-w" src="/wikipedia-logo-w.png" alt="Wikipedia W logo" />
                  </div>
                </div>
                <span className="wg-pack-call-action">
                  {packHeroAnimState === "idle"
                    ? specialPackReady
                      ? text.specialPackReady
                      : text.tapToOpen
                    : text.opening}
                </span>
              </button>
            </div>

            <div className="wg-home-intel-grid">
              <div className="wg-home-mission-card">
                <h3>{text.missionsTab}</h3>
                <div className="wg-home-mission-list">
                  {missions.missions.length ? (
                    missions.missions.slice(0, 5).map((mission) => (
                      <article key={mission.id} className="wg-home-mission-row">
                        <span>{mission.title}</span>
                        <span>{mission.progressValue}/{mission.targetValue}</span>
                      </article>
                    ))
                  ) : (
                    <p className="wg-empty">{es ? "No hay misiones activas." : "No active missions."}</p>
                  )}
                </div>
                <p className="wg-mission-reward-note">{text.missionRewardNote}</p>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "packs" ? (
          <section className="wg-stack-panel">
            <div className="wg-stack-shell is-deck">
              <div className="wg-stack-track">
                {currentPackCards.length ? (
                  allPackCardsSeen ? (
                    <div className={`wg-hand-wrap${fanShiftDirection ? ` is-shifting-${fanShiftDirection}` : ""}`}>
                      <div className="wg-hand-shell">
                        {canCyclePackDeck ? (
                          <>
                            <button
                              type="button"
                              className="wg-hand-nav is-prev"
                              aria-label={es ? "Mover mazo a la izquierda" : "Move deck left"}
                              onClick={() => handleShiftPackDeck(-1)}
                              disabled={Boolean(fanShiftDirection) || clampedHandCenterIndex <= 0}
                            >
                              {"<"}
                            </button>
                            <button
                              type="button"
                              className="wg-hand-nav is-next"
                              aria-label={es ? "Mover mazo a la derecha" : "Move deck right"}
                              onClick={() => handleShiftPackDeck(1)}
                              disabled={Boolean(fanShiftDirection) || clampedHandCenterIndex >= currentPackCards.length - 1}
                            >
                              {">"}
                            </button>
                          </>
                        ) : null}
                        <div className="wg-hand-viewport">
                          {currentPackCards.map((card, index) => {
                            const offset = index - clampedHandCenterIndex;
                            if (Math.abs(offset) > 4) return null;
                            const depth = Math.abs(offset);
                            const translateX = offset * 16;
                            const translateY = depth * 8;
                            const scale = Math.max(0.88, 1 - depth * 0.03);
                            const rotate = offset * 2;
                            const layer = 120 - depth;
                            const isActive = offset === 0;
                            return (
                              <div
                                key={`${card.articleId ?? card.id ?? getTitle(card)}-${index}`}
                                className={`wg-hand-layer${isActive ? " is-active" : ""}`}
                                style={{
                                  "--wg-hand-x": `${translateX}px`,
                                  "--wg-hand-y": `${translateY}px`,
                                  "--wg-hand-scale": scale,
                                  "--wg-hand-rotate": `${rotate}deg`,
                                  "--wg-hand-z": layer,
                                }}
                              >
                                <StackCard
                                  card={card}
                                  archiveLabel={text.archive}
                                  formatNumber={formatNumber}
                                  onOpen={(articleId) => void handleSelectArticle(articleId)}
                                  onToggleFavorite={(articleId, favorite) => void handleToggleFavorite(articleId, favorite)}
                                  onCardActivate={() => {
                                    const articleId = card.articleId ?? card.id;
                                    if (articleId) void handleSelectArticle(articleId);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="wg-deck-stage">
                      {revealHistoryIndices.map((historyIndex, listIndex) => {
                        const historyCard = currentPackCards[historyIndex];
                        if (!historyCard) return null;
                        const distance = revealHistoryIndices.length - listIndex;
                        const translateX = -Math.min(176, 56 + (distance - 1) * 42);
                        const translateY = 8 + distance * 8;
                        const scale = Math.max(0.88, 1 - distance * 0.03);
                        const rotate = -distance * 2;
                        const layer = 104 - distance;
                        return (
                          <div
                            key={`revealed-left-${historyIndex}`}
                            className="wg-stack-layer wg-deck-history-layer"
                            style={{
                              "--wg-stack-x": `${translateX}px`,
                              "--wg-stack-y": `${translateY}px`,
                              "--wg-stack-scale": scale,
                              "--wg-stack-rotate": `${rotate}deg`,
                              "--wg-stack-z": layer,
                            }}
                          >
                            <StackCard
                              card={historyCard}
                              archiveLabel={text.archive}
                              formatNumber={formatNumber}
                              onOpen={(articleId) => void handleSelectArticle(articleId)}
                              onToggleFavorite={(articleId, favorite) => void handleToggleFavorite(articleId, favorite)}
                            />
                          </div>
                        );
                      })}
                      {focusedPackCard ? (
                        <div className="wg-stack-layer is-active wg-deck-active">
                          <div className={`wg-reveal-flip${revealFace === "back" ? "" : " is-flipped"}${revealFace === "flipping" ? " is-animating" : ""}`}>
                            <button
                              type="button"
                              className="wg-reveal-face is-back"
                              aria-label={text.tapToFlip}
                              onClick={handleRevealCurrentCard}
                              style={{ "--wg-rarity-accent": RARITY_ACCENTS[getRarity(focusedPackCard)] ?? "#8e8a82" }}
                            >
                              <span className="wg-reveal-back-glow" aria-hidden="true" />
                              <span className="wg-reveal-back-frame" aria-hidden="true" />
                              <span className="wg-reveal-back-mark">
                                <img src="/wikipedia-logo-w.png" alt="Wikipedia W logo" />
                              </span>
                            </button>
                            <div className="wg-reveal-face is-front">
                              <StackCard
                                card={focusedPackCard}
                                archiveLabel={text.archive}
                                formatNumber={formatNumber}
                                onOpen={(articleId) => void handleSelectArticle(articleId)}
                                onToggleFavorite={(articleId, favorite) => void handleToggleFavorite(articleId, favorite)}
                                onCardActivate={handleAdvanceRevealedCard}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div className="wg-pack-empty-state">
                    <p>{text.noPackCards}</p>
                    <button type="button" className="wg-primary-btn" onClick={() => void handleOpenPack()}>
                      {busy ? text.opening : text.openPack}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="wg-stack-footer">
              <div className="wg-back-gacha-wrap">
                <button type="button" className="wg-back-gacha-btn" onClick={() => setActiveTab("home")}>
                  {text.backToGacha}
                </button>
              </div>

              <div className="wg-pack-actions-row">
                <button type="button" className="wg-primary-btn" onClick={() => void handleOpenPack()}>
                  {busy ? text.opening : text.openPack}
                </button>
                <button
                  type="button"
                  className="wg-secondary-btn with-icon"
                  onClick={() => focusedPackSource && void handleSelectArticle(focusedPackSource.articleId)}
                  disabled={!focusedPackSource}
                >
                  <InspectIcon />
                  <span>{text.inspect}</span>
                </button>
                <button
                  type="button"
                  className="wg-secondary-btn with-icon"
                  onClick={() => focusedPackSource && void handleOpenSource({ articleId: focusedPackSource.articleId, sourceUrl: focusedPackSource.sourceUrl })}
                  disabled={!focusedPackSource?.sourceUrl}
                >
                  <ExternalIcon />
                  <span>{text.sourceLink}</span>
                </button>
              </div>

              {canCyclePackDeck && !allPackCardsSeen ? (
                <p className="wg-deck-hint">{revealFace === "front" ? text.tapToNextCard : text.tapToFlip}</p>
              ) : null}
              {allPackCardsSeen ? (
                <p className="wg-deck-hint">{text.fullHandReady}</p>
              ) : null}

              <div className="wg-stack-slots">
                {packSlots.map((card, index) => (
                  <button
                    key={`slot-${index}`}
                    type="button"
                    className={`wg-stack-slot${activePackDeckIndex === index ? " is-active" : ""}`}
                    onClick={() => {
                      if (!card) return;
                      handleSelectPackSlot(index);
                    }}
                    disabled={!card || (!allPackCardsSeen && index !== clampedRevealCursor)}
                  >
                    <span>#{index + 1}</span>
                    <strong>{card ? `${getRarity(card)} - ${getTitle(card)}` : text.pending}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

          {!loading && activeTab === "collection" ? (
            <section className="wg-panel">
              <div className="wg-section-head">
                <div>
                  <h3>{es ? "Coleccion" : "Collection"}</h3>
                  <p>{es ? "La tabla se convierte en una galeria real de cartas." : "The utilitarian table becomes a real card gallery."}</p>
                </div>
                <span className="wg-pill-muted">{text.totalPulls}: {dashboard?.profile?.totalPackOpens ?? 0}</span>
              </div>

              <div className="wg-summary-grid is-collection">
                <SummaryTile label={es ? "Copias" : "Copies"} value={formatNumber(collectionSummary.totalCopies)} accent="#48a2ff" />
                <SummaryTile label={es ? "Favoritas" : "Favorites"} value={formatNumber(collectionSummary.favorites)} accent="#ff7a4b" />
                <SummaryTile label={text.unique} value={formatNumber(collectionSummary.uniqueCards)} accent="#3fcb6a" />
              </div>

              <div className="wg-rarity-summary-grid">
                {RARITY_ORDER.map((rarity) => (
                  <article key={rarity} className="wg-rarity-summary-card" style={{ "--wg-rarity-accent": RARITY_ACCENTS[rarity] ?? "#8e8a82" }}>
                    <RarityBadge rarity={rarity} />
                    <strong>{collectionSummary.rarityBreakdown?.[rarity] ?? 0}</strong>
                  </article>
                ))}
              </div>

              <div className="wg-filter-shell">
                <div className="wg-filter-grid">
                  <input type="text" value={collectionFilters.query} placeholder={text.searchPlaceholder} onChange={(event) => setCollectionFilters((current) => ({ ...current, query: event.target.value, page: 1 }))} />
                  <select value={collectionFilters.rarity} onChange={(event) => setCollectionFilters((current) => ({ ...current, rarity: event.target.value, page: 1 }))}>
                    <option value="">{text.rarityPlaceholder}</option>
                    {RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                  </select>
                  <select value={collectionFilters.topicGroup} onChange={(event) => setCollectionFilters((current) => ({ ...current, topicGroup: event.target.value, page: 1 }))}>
                    <option value="">{text.topicPlaceholder}</option>
                    {collection.availableTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                  </select>
                </div>

                <div className="wg-sort-row">
                  {sortOptions.map((option) => (
                    <button key={option.value} type="button" className={collectionFilters.sortBy === option.value ? "is-active" : ""} onClick={() => setCollectionFilters((current) => ({ ...current, sortBy: option.value, page: 1 }))}>
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="wg-toggle-row">
                  <label className="wg-check">
                    <input type="checkbox" checked={collectionFilters.favorite} onChange={(event) => setCollectionFilters((current) => ({ ...current, favorite: event.target.checked, page: 1 }))} />
                    {text.favoriteOnly}
                  </label>
                  <label className="wg-check">
                    <input type="checkbox" checked={collectionFilters.duplicatesOnly} onChange={(event) => setCollectionFilters((current) => ({ ...current, duplicatesOnly: event.target.checked, page: 1 }))} />
                    {text.duplicateOnly}
                  </label>
                </div>
              </div>

              {collection.items.length ? (
                <>
                <div className="wg-collection-grid">
                  {collection.items.map((item) => (
                    <StackCard
                      key={item.articleId}
                      card={item}
                      archiveLabel={text.archive}
                      formatNumber={formatNumber}
                      onOpen={(articleId) => void handleSelectArticle(articleId)}
                      onToggleFavorite={(articleId, favorite) => void handleToggleFavorite(articleId, favorite)}
                    />
                  ))}
                </div>
                  <div className="wg-pagination">
                    <button type="button" className="wg-secondary-btn" disabled={collection.page <= 1} onClick={() => setCollectionFilters((current) => ({ ...current, page: current.page - 1 }))}>{"<"}</button>
                    <span>{es ? `Pagina ${collection.page} / ${collectionTotalPages}` : `Page ${collection.page} / ${collectionTotalPages}`}</span>
                    <button type="button" className="wg-secondary-btn" disabled={collection.page >= collectionTotalPages} onClick={() => setCollectionFilters((current) => ({ ...current, page: current.page + 1 }))}>{">"}</button>
                  </div>
                </>
              ) : (
                <p className="wg-empty">{es ? "No hay cartas que cumplan esos filtros." : "No cards match those filters."}</p>
              )}
            </section>
          ) : null}

          {!loading && activeTab === "missions" ? (
            <section className="wg-panel">
              <div className="wg-section-head">
                <div>
                  <h3>{es ? "Misiones diarias" : "Daily missions"}</h3>
                  <p>{es ? "Cada objetivo muestra progreso, estado y recompensa en la misma tarjeta." : "Each goal exposes progress, state, and reward on the same card."}</p>
                </div>
                <span className="wg-pill-muted">{text.missionsReady}: {missionSummary.claimable ?? 0}</span>
              </div>

              <div className="wg-summary-grid is-missions">
                <SummaryTile label={text.missionsReady} value={formatNumber(missionSummary.claimable)} accent="#ffbf2f" />
                <SummaryTile label={text.done} value={formatNumber(missionSummary.completed)} accent="#3fcb6a" />
                <SummaryTile label={text.progress} value={`${formatNumber(missionSummary.completed)} / ${formatNumber(missionSummary.total)}`} accent="#48a2ff" />
              </div>

              <article className="wg-mission-ledger-panel">
                <div className="wg-section-head">
                  <div>
                    <h3>{text.rewardHistoryTitle}</h3>
                    <p>{text.rewardHistorySubtitle}</p>
                  </div>
                  <span className="wg-pill-muted">{text.totalMissionRewards}: {formatNumber(missionRewardHistory.length)}</span>
                </div>

                <div className="wg-mission-ledger-grid">
                  <article>
                    <span>{text.dailyPacks}</span>
                    <strong>+{formatNumber(missionRewardTotals.packs)}</strong>
                  </article>
                  <article>
                    <span>{text.gems}</span>
                    <strong>+{formatNumber(missionRewardTotals.gems)}</strong>
                  </article>
                  <article>
                    <span>{text.shards}</span>
                    <strong>+{formatNumber(missionRewardTotals.shards)}</strong>
                  </article>
                </div>

                {missionRewardHistory.length ? (
                  <div className="wg-reward-log-shell is-missions">
                    {missionRewardHistory.slice(0, 8).map((rewardEntry) => {
                      const rewardType = normalizeRewardType(rewardEntry.rewardType);
                      return (
                        <article key={rewardEntry.id} className={`wg-reward-log-row is-${rewardType}`}>
                          <div>
                            <strong>+{formatNumber(rewardEntry.rewardAmount)} {getRewardTypeLabel(rewardType, es)}</strong>
                            <p>{rewardEntry.missionTitle ?? text.unknownMission}</p>
                          </div>
                          <small>
                            {text.rewardSource}: {getRewardSourceLabel(rewardEntry.rewardSource, es)} · {text.claimedAt}: {formatDateTime(rewardEntry.createdAt, locale)}
                          </small>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="wg-empty">{text.noMissionRewards}</p>
                )}
              </article>

              {missions.missions.length ? (
                <div className="wg-mission-grid">
                  {missions.missions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} progressLabel={text.progress} rewardLabel={text.reward} doneLabel={text.done} claimedLabel={text.claimed} claimLabel={text.claim} activeLabel={text.active} busy={busy} onClaim={(missionId) => void handleClaimMission(missionId)} />
                  ))}
                </div>
              ) : (
                <p className="wg-empty">{es ? "No hay misiones activas." : "No active missions."}</p>
              )}
            </section>
          ) : null}

          {!loading && activeTab === "trophies" ? (
            <section className="wg-panel">
              <div className="wg-section-head">
                <div>
                  <h3>{es ? "Trofeos" : "Trophies"}</h3>
                  <p>{es ? "Los logros pasan a un muro de gabinete con estado y puntos visibles." : "Achievements now live on a cabinet wall with visible state and points."}</p>
                </div>
                <span className="wg-pill-muted">{text.trophyPoints}: {formatNumber(trophySummary.points)}</span>
              </div>

              <div className="wg-summary-grid is-trophies">
                <SummaryTile label={es ? "Total" : "Total"} value={formatNumber(trophySummary.total)} accent="#7a93b8" />
                <SummaryTile label={text.trophiesUnlocked} value={formatNumber(trophySummary.unlocked)} accent="#3fcb6a" />
                <SummaryTile label={text.points} value={formatNumber(trophySummary.points)} accent="#ffbf2f" />
              </div>

              <div className="wg-trophy-grid">
                {trophies.trophies.length ? trophies.trophies.map((trophy) => <TrophyCard key={trophy.id} trophy={trophy} pointsLabel={text.points} unlockedLabel={text.unlocked} lockedLabel={text.locked} />) : <p className="wg-empty">{es ? "Todavia no hay trofeos en el archivo." : "There are no trophies in this archive yet."}</p>}
              </div>
            </section>
          ) : null}
        {!loading && activeTab === "home" ? (
          <section className="wg-support-grid">
            <article className="wg-panel">
              <div className="wg-section-head">
                <h3>{text.quickRules}</h3>
                {packStatus?.nextPackGuaranteedSrPlus ? <span className="wg-pill-accent">{text.guaranteed}</span> : null}
              </div>
              <div className="wg-rule-meters">
                <article className="wg-rule-meter-card">
                  <div className="wg-meter-head">
                    <span>{es ? "Recarga" : "Refill"}</span>
                    <strong>{packRegenPercent}%</strong>
                  </div>
                  <div className="wg-progress-bar is-refill">
                    <span style={{ width: `${packRegenPercent}%` }} />
                  </div>
                </article>
                <article className="wg-rule-meter-card">
                  <div className="wg-meter-head">
                    <span>Pity</span>
                    <strong>{packStatus?.pityCounter ?? 0} / {PACK_PITY_TARGET}</strong>
                  </div>
                  <div className="wg-progress-bar is-pity">
                    <span style={{ width: `${Math.round(((packStatus?.pityCounter ?? 0) / PACK_PITY_TARGET) * 100)}%` }} />
                  </div>
                </article>
              </div>
              <ul className="wg-rule-list">
                {(es
                  ? [
                      "Cada pack contiene 5 cartas.",
                      "Cada 10 sobres abiertos, el siguiente es un sobre especial con garantia SR+.",
                      "Los sobres regeneran 1 por minuto hasta el tope.",
                      "Los duplicados entregan shards y el progreso queda ligado al navegador.",
                    ]
                  : [
                      "Each pack contains 5 cards.",
                      "Every 10 opened packs, the next one becomes a special pack with SR+ guarantee.",
                      "Packs regenerate once per minute until the cap.",
                      "Duplicates grant shards and progress stays bound to the browser.",
                    ]).map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </article>

            <article className="wg-panel">
              <div className="wg-section-head">
                <div>
                  <h3>{text.support}</h3>
                  <p>{es ? "Exporta o importa un codigo para mover tu progreso." : "Export or import a code to move your progress."}</p>
                </div>
                <span className="wg-pill-muted">{browserToken ? browserToken.slice(-8) : "--"}</span>
              </div>
              <div className="wg-recovery-box">
                <button type="button" className="wg-secondary-btn" onClick={() => void handleExportRecovery()}>{text.exportCode}</button>
                {recoveryCode ? <code>{recoveryCode}</code> : null}
                <input type="text" value={recoveryImport} placeholder="WKVLT-XXXX-XXXX-XXXX" onChange={(event) => setRecoveryImport(event.target.value.toUpperCase())} />
                <button type="button" className="wg-primary-btn" onClick={() => void handleImportRecovery()}>{text.importCode}</button>
              </div>
            </article>
          </section>
        ) : null}
      </main>

      <footer className="wg-footer">
        <p className="wg-footer-note">
          {es
            ? "Este sitio es independiente. Si quieres apoyar el proyecto visita la pagina de contacto."
            : "This site is independently operated. If you would like to support it, please visit the contact page."}
        </p>
        <p className="wg-footer-subnote">
          {es
            ? "Servicio no oficial y no afiliado con Wikipedia."
            : "This service is unofficial and not affiliated with Wikipedia."}
        </p>
        <div className="wg-footer-links">
          <a href="/privacy?lang=EN">Privacy Policy</a>
          <span>|</span>
          <a href="/terms?lang=EN">Terms of Service</a>
          <span>|</span>
          <a href="/contact?lang=EN">Contact</a>
        </div>
      </footer>

      {selectedArticle ? (
        <div className="wg-modal-backdrop" role="presentation" onClick={() => setSelectedArticle(null)}>
          <article className="wg-modal" onClick={(event) => event.stopPropagation()}>
            <div className="wg-section-head">
              <div>
                <h3>{getTitle(selectedArticle)}</h3>
                <p>{selectedArticle.topicGroup ?? text.archive}</p>
              </div>
              <button type="button" className="wg-secondary-btn" onClick={() => setSelectedArticle(null)}>{text.close}</button>
            </div>
            <div className="wg-modal-grid">
              <div className="wg-modal-card-shell">
                <div className="wg-modal-stack-preview">
                  <DetailFlipCard
                    card={selectedArticle}
                    archiveLabel={text.archive}
                    formatNumber={formatNumber}
                    isFlipped={detailCardFlipped}
                    onFlip={() => setDetailCardFlipped((current) => !current)}
                    flipHint={text.detailFlipHint}
                    flipBackHint={text.detailFlipBackHint}
                    detailDescriptionTitle={text.detailDescriptionTitle}
                  />
                </div>
              </div>
              <div className="wg-article-stats">
                <h4>{es ? "Estadisticas de la carta" : "Card stats"}</h4>
                <p><span>ATK</span><strong>{formatNumber(selectedArticle.atk)}</strong></p>
                <p><span>DEF</span><strong>{formatNumber(getDef(selectedArticle))}</strong></p>
                <p><span>Q-Score</span><strong>{selectedArticle.qualityScore}</strong></p>
                <p><span>{text.copies}</span><strong>{selectedArticle.copies ?? 0}</strong></p>
                <div className="wg-category-block">
                  <span>{text.categories}</span>
                  <div className="wg-category-list">
                    {(selectedArticle.categories ?? []).length ? (selectedArticle.categories ?? []).map((category) => <span key={category}>{category}</span>) : <span>{text.noCategories}</span>}
                  </div>
                </div>
                <button type="button" className="wg-primary-btn" onClick={() => void handleOpenSource({ articleId: selectedArticle.articleId ?? selectedArticle.id, sourceUrl: selectedArticle.sourceUrl })} disabled={!selectedArticle.sourceUrl}>
                  {selectedArticle.sourceUrl ? (es ? "Ver en Wikipedia" : "View on Wikipedia") : text.noSource}
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
