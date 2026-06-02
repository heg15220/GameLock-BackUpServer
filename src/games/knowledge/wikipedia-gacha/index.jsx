import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdPreviewCard from "../../../components/AdPreviewCard";
import useMobileGameViewport from "../../../mobile/useMobileGameViewport";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import {
  bootstrapWikipediaGachaSession,
  claimWikipediaGachaRewardedAdPacks,
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
import { canShowRewardedAdCta } from "./packUiState";
import { ENABLE_MONETIZATION_PREVIEW } from "../../../config/monetizationGate";
import "./styles.css";

const STORAGE_KEY = "wikipedia_gacha_browser_token";
const TAB_ORDER = ["home", "packs", "collection", "missions", "trophies"];
const RARITY_ORDER = ["LR", "UR", "SSR", "SR", "R", "UC", "C"];
const TOP_TIER_RARITIES = new Set(RARITY_ORDER.slice(0, 2));
const PACK_PITY_TARGET = 10;
const PACK_REGEN_SECONDS = 60;
const REWARDED_AD_DURATION_SECONDS = 5;
const REWARDED_AD_PREVIEW_SLOT = {
  id: "wikipedia-gacha-rewarded-ad",
  provider: "google-ads-rewarded-preview",
  sizeLabel: "Rewarded vignette",
  fallbackSize: "Fullscreen +3 packs",
};

const RARITY_ACCENTS = {
  C: "#6f7f8d",
  UC: "#2f9b8f",
  R: "#78b84a",
  SR: "#2f8fe3",
  SSR: "#b85de6",
  UR: "#f2a93b",
  LR: "#ffd24a",
};
const RARITY_META = {
  C: {
    label: { es: "AP", en: "NO" },
    fullLabel: { es: "Apunte", en: "Note" },
    dropWeight: 32,
    statMultiplier: 0.8,
  },
  UC: {
    label: { es: "FI", en: "FI" },
    fullLabel: { es: "Ficha", en: "File" },
    dropWeight: 23,
    statMultiplier: 0.9,
  },
  R: {
    label: { es: "EN", en: "EN" },
    fullLabel: { es: "Entrada", en: "Entry" },
    dropWeight: 20,
    statMultiplier: 1,
  },
  SR: {
    label: { es: "MO", en: "MO" },
    fullLabel: { es: "Monografia", en: "Monograph" },
    dropWeight: 13,
    statMultiplier: 1.15,
  },
  SSR: {
    label: { es: "CO", en: "CO" },
    fullLabel: { es: "Codice", en: "Codex" },
    dropWeight: 7,
    statMultiplier: 1.3,
  },
  UR: {
    label: { es: "CA", en: "CA" },
    fullLabel: { es: "Canon", en: "Canon" },
    dropWeight: 4,
    statMultiplier: 1.5,
  },
  LR: {
    label: { es: "LE", en: "LE" },
    fullLabel: { es: "Legendaria", en: "Legendary" },
    dropWeight: 1,
    statMultiplier: 1.8,
  },
};
const PACK_SHARE_CARD_WIDTH = 288;
const PACK_SHARE_CARD_HEIGHT = 408;
const PACK_SHARE_CARD_GAP = 22;

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth, maxLines) {
  const tokens = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const lines = [];
  let currentLine = "";

  tokens.forEach((token) => {
    const candidate = currentLine ? `${currentLine} ${token}` : token;
    if (!currentLine || ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      return;
    }
    lines.push(currentLine);
    currentLine = token;
  });

  if (currentLine) lines.push(currentLine);
  if (lines.length <= maxLines) return lines;

  const clamped = lines.slice(0, maxLines);
  let finalLine = clamped[maxLines - 1];
  while (finalLine.length > 0 && ctx.measureText(`${finalLine}...`).width > maxWidth) {
    finalLine = finalLine.slice(0, -1).trimEnd();
  }
  clamped[maxLines - 1] = finalLine ? `${finalLine}...` : "...";
  return clamped;
}

function loadCardImage(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("pack_share_blob_failed"));
    }, "image/png");
  });
}

function hexToRgb(hex) {
  const normalized = String(hex ?? "").replace("#", "").trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function mixHexColors(colorA, colorB, weight = 0.5, alpha = 1) {
  const first = hexToRgb(colorA);
  const second = hexToRgb(colorB);
  const clampedWeight = Math.max(0, Math.min(1, weight));
  const r = Math.round((first.r * clampedWeight) + (second.r * (1 - clampedWeight)));
  const g = Math.round((first.g * clampedWeight) + (second.g * (1 - clampedWeight)));
  const b = Math.round((first.b * clampedWeight) + (second.b * (1 - clampedWeight)));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorWithAlpha(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawChamferedRect(ctx, x, y, width, height, chamfer) {
  const cut = Math.min(chamfer, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width - cut, y);
  ctx.lineTo(x + width, y + cut);
  ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x + cut, y + height);
  ctx.lineTo(x, y + height - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function drawTopicGlyphCanvas(ctx, topicGroup, x, y, size) {
  const normalized = String(topicGroup ?? "").toLowerCase();
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.6, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#f8fafc";

  if (normalized.includes("people") || normalized.includes("persona") || normalized.includes("person")) {
    ctx.beginPath();
    ctx.arc(0, -size * 0.18, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, size * 0.34);
    ctx.quadraticCurveTo(0, size * 0.02, size * 0.34, size * 0.34);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (normalized.includes("bio") || normalized.includes("taxon") || normalized.includes("science")) {
    ctx.beginPath();
    ctx.moveTo(size * 0.36, -size * 0.34);
    ctx.quadraticCurveTo(-size * 0.22, -size * 0.34, -size * 0.26, size * 0.3);
    ctx.quadraticCurveTo(size * 0.22, size * 0.24, size * 0.36, -size * 0.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, size * 0.26);
    ctx.quadraticCurveTo(size * 0.04, 0, size * 0.28, -size * 0.14);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (normalized.includes("geo") || normalized.includes("location") || normalized.includes("places")) {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.42);
    ctx.quadraticCurveTo(-size * 0.36, size * 0.06, -size * 0.36, -size * 0.1);
    ctx.arc(0, -size * 0.1, size * 0.3, Math.PI, 0, false);
    ctx.quadraticCurveTo(size * 0.36, size * 0.06, 0, size * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.42);
  ctx.lineTo(-size * 0.34, -size * 0.2);
  ctx.lineTo(-size * 0.34, size * 0.22);
  ctx.lineTo(0, size * 0.42);
  ctx.lineTo(size * 0.34, size * 0.22);
  ctx.lineTo(size * 0.34, -size * 0.2);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.42);
  ctx.lineTo(0, size * 0.42);
  ctx.moveTo(-size * 0.34, -size * 0.2);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * 0.34, -size * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawStackCardForShare(ctx, card, image, x, y, width, height, locale) {
  const scale = width / 240;
  const accent = getRarityAccent(getRarity(card));
  const title = getTitle(card);
  const rarity = getRarity(card);
  const rarityLabel = getRarityDisplay(rarity, locale);
  const topicLabel = card?.topicGroup ?? (locale === "es" ? "Archivo" : "Archive");
  const qualityValue = Number.isFinite(Number(card?.qualityScore)) ? Number(card.qualityScore) : "--";
  const serialId = String(card?.articleId ?? card?.id ?? "----").padStart(4, "0");
  const chamfer = 11 * scale;
  const innerInset = 8 * scale;
  const contentX = x + innerInset;
  const contentY = y + innerInset;
  const contentWidth = width - (innerInset * 2);
  const contentHeight = height - (innerInset * 2);
  const headerHeight = 40 * scale;
  const artMargin = 4 * scale;
  const artHeight = 140 * scale;
  const statsHeight = 50 * scale;
  const serialHeight = 18 * scale;
  const artY = contentY + headerHeight + artMargin;
  const artX = contentX + artMargin;
  const artWidth = contentWidth - (artMargin * 2);
  const blurbY = artY + artHeight;
  const blurbHeight = contentY + contentHeight - statsHeight - serialHeight - blurbY;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 30 * scale;
  ctx.shadowOffsetY = 16 * scale;
  drawChamferedRect(ctx, x, y, width, height, chamfer);
  ctx.fillStyle = "rgba(5, 8, 14, 0.98)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawChamferedRect(ctx, x, y, width, height, chamfer);
  const frameGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  frameGradient.addColorStop(0, mixHexColors(accent, "#f8fafc", 0.56));
  frameGradient.addColorStop(0.44, mixHexColors(accent, "#e5e7eb", 0.42));
  frameGradient.addColorStop(1, mixHexColors(accent, "#0f172a", 0.3));
  ctx.fillStyle = frameGradient;
  ctx.fill();
  ctx.strokeStyle = mixHexColors(accent, "#1f2937", 0.55);
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawChamferedRect(ctx, x + (5 * scale), y + (5 * scale), width - (10 * scale), height - (10 * scale), 10 * scale);
  ctx.strokeStyle = mixHexColors(accent, "#ffffff", 0.44, 0.34);
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.restore();

  const cornerGlowSpots = [
    [x + (contentWidth * 0.08), y + (height * 0.09)],
    [x + (width * 0.92), y + (height * 0.09)],
    [x + (width * 0.08), y + (height * 0.91)],
    [x + (width * 0.92), y + (height * 0.91)],
  ];
  cornerGlowSpots.forEach(([gx, gy]) => {
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 18 * scale);
    glow.addColorStop(0, mixHexColors(accent, "#ffffff", 0.34, 0.16));
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(gx - (22 * scale), gy - (22 * scale), 44 * scale, 44 * scale);
  });

  const fxGlow = ctx.createRadialGradient(x + (width * 0.18), y + (height * 0.08), 0, x + (width * 0.18), y + (height * 0.08), width * 0.34);
  fxGlow.addColorStop(0, mixHexColors(accent, "#ffffff", 0.42, 0.24));
  fxGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = fxGlow;
  ctx.fillRect(x, y, width, height);

  const bottomGlow = ctx.createRadialGradient(x + (width * 0.85), y + height, 0, x + (width * 0.85), y + height, width * 0.5);
  bottomGlow.addColorStop(0, mixHexColors(accent, "#ffffff", 0.24, 0.12));
  bottomGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(x, y, width, height);

  ctx.save();
  drawRoundedRect(ctx, contentX, contentY, contentWidth, contentHeight, 10 * scale);
  const innerGradient = ctx.createLinearGradient(contentX, contentY, contentX, contentY + contentHeight);
  innerGradient.addColorStop(0, "rgba(10, 16, 28, 0.92)");
  innerGradient.addColorStop(1, mixHexColors(accent, "#0b111c", 0.22, 0.98));
  ctx.fillStyle = innerGradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, contentX, contentY, contentWidth, contentHeight, 10 * scale);
  ctx.clip();
  for (let lineY = contentY; lineY < contentY + contentHeight; lineY += 3 * scale) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(contentX, lineY, contentWidth, 1 * scale);
  }
  for (let lineX = contentX; lineX < contentX + contentWidth; lineX += 4 * scale) {
    ctx.fillStyle = "rgba(255,255,255,0.016)";
    ctx.fillRect(lineX, contentY, 1 * scale, contentHeight);
  }
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, contentX, contentY, contentWidth, headerHeight, 10 * scale);
  ctx.clip();
  const headerGradient = ctx.createLinearGradient(contentX, contentY, contentX + contentWidth, contentY);
  headerGradient.addColorStop(0, mixHexColors(accent, "#000000", 0.4, 0.88));
  headerGradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(contentX, contentY, contentWidth, headerHeight);
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(contentX, contentY + headerHeight, contentWidth, 1 * scale);

  ctx.fillStyle = mixHexColors(accent, "#ffffff", 0.76);
  ctx.font = `700 ${8.8 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillText(rarityLabel, contentX + (10 * scale), contentY + (15 * scale));
  ctx.beginPath();
  ctx.fillStyle = mixHexColors(accent, "#ffffff", 0.76);
  ctx.arc(contentX + (26 * scale), contentY + (12 * scale), 2.3 * scale, 0, Math.PI * 2);
  ctx.fill();

  let titleFontSize = 13 * scale;
  if (title.length > 72) titleFontSize = 11.3 * scale;
  else if (title.length > 48) titleFontSize = 12 * scale;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 2 * scale;
  ctx.fillStyle = "#f5f8ff";
  ctx.font = `700 ${titleFontSize}px "Cinzel", "Times New Roman", serif`;
  wrapCanvasText(ctx, title, 108 * scale, 2).forEach((line, index) => {
    ctx.fillText(line, contentX + (34 * scale), contentY + (14 * scale) + (index * 13 * scale));
  });
  ctx.restore();

  const pillHeight = 15 * scale;
  const qualityText = `Q ${qualityValue}`;
  ctx.save();
  drawRoundedRect(ctx, contentX + contentWidth - (80 * scale), contentY + (5 * scale), 68 * scale, pillHeight, 999);
  ctx.fillStyle = colorWithAlpha("#03080f", 0.42);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#d5deea";
  ctx.font = `700 ${6.5 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillText(topicLabel.slice(0, 14).toUpperCase(), contentX + contentWidth - (75 * scale), contentY + (15 * scale));

  ctx.save();
  drawRoundedRect(ctx, contentX + contentWidth - (58 * scale), contentY + (22 * scale), 46 * scale, pillHeight, 999);
  ctx.fillStyle = mixHexColors(accent, "#000000", 0.18, 0.74);
  ctx.fill();
  ctx.strokeStyle = mixHexColors(accent, "#ffffff", 0.56, 0.35);
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#fff4b0";
  ctx.fillText(qualityText, contentX + contentWidth - (51 * scale), contentY + (32 * scale));

  ctx.save();
  drawRoundedRect(ctx, artX, artY, artWidth, artHeight, 1.5 * scale);
  ctx.clip();
  const artGradient = ctx.createLinearGradient(artX, artY, artX, artY + artHeight);
  artGradient.addColorStop(0, mixHexColors(accent, "#232938", 0.36));
  artGradient.addColorStop(1, mixHexColors(accent, "#171b26", 0.24));
  ctx.fillStyle = artGradient;
  ctx.fillRect(artX, artY, artWidth, artHeight);
  if (image) {
    const imageScale = Math.max(artWidth / image.width, artHeight / image.height);
    const drawWidth = image.width * imageScale;
    const drawHeight = image.height * imageScale;
    const drawX = artX + ((artWidth - drawWidth) / 2);
    const drawY = artY + ((artHeight - drawHeight) / 2);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.font = `700 ${100 * scale}px "DM Serif Display", "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.fillText((title[0] ?? "W").toUpperCase(), artX + (artWidth / 2), artY + (94 * scale));
    ctx.fillStyle = "#f1f5f9";
    ctx.font = `700 ${13 * scale}px "Space Grotesk", "Segoe UI", sans-serif`;
    wrapCanvasText(ctx, title, artWidth - (28 * scale), 2).forEach((line, index) => {
      ctx.fillText(line, artX + (artWidth / 2), artY + (artHeight / 2) + (index * 15 * scale));
    });
    ctx.textAlign = "left";
  }
  const artSheen = ctx.createLinearGradient(artX, artY, artX, artY + artHeight);
  artSheen.addColorStop(0, "rgba(255,255,255,0.14)");
  artSheen.addColorStop(0.24, "rgba(255,255,255,0)");
  artSheen.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = artSheen;
  ctx.fillRect(artX, artY, artWidth, artHeight);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(artX, artY, artWidth, 1 * scale);
  ctx.fillRect(artX, artY + artHeight - (1 * scale), artWidth, 1 * scale);

  const topicBadgeRadius = 13 * scale;
  const topicBadgeX = artX + artWidth - (20 * scale);
  const topicBadgeY = artY + (20 * scale);
  const topicGlow = ctx.createRadialGradient(topicBadgeX - (5 * scale), topicBadgeY - (5 * scale), 0, topicBadgeX, topicBadgeY, topicBadgeRadius);
  topicGlow.addColorStop(0, mixHexColors(accent, "#ffffff", 0.45, 0.5));
  topicGlow.addColorStop(1, "rgba(18,24,34,0.92)");
  ctx.beginPath();
  ctx.arc(topicBadgeX, topicBadgeY, topicBadgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = topicGlow;
  ctx.fill();
  ctx.strokeStyle = mixHexColors(accent, "#d1d5db", 0.7);
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  drawTopicGlyphCanvas(ctx, topicLabel, topicBadgeX, topicBadgeY + (0.5 * scale), 8 * scale);

  ctx.beginPath();
  ctx.arc(artX + (16 * scale), artY + artHeight - (16 * scale), 10 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${7 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillText("i", artX + (13 * scale), artY + artHeight - (13 * scale));

  ctx.save();
  drawRoundedRect(ctx, artX, blurbY, artWidth, blurbHeight, 0);
  const blurbGradient = ctx.createLinearGradient(artX, blurbY, artX, blurbY + blurbHeight);
  blurbGradient.addColorStop(0, mixHexColors(accent, "#111827", 0.2, 0.42));
  blurbGradient.addColorStop(1, "rgba(10,16,28,0.44)");
  ctx.fillStyle = blurbGradient;
  ctx.fill();
  ctx.restore();

  const blurb = getBlurb(card);
  const lines = wrapCanvasText(ctx, blurb, artWidth - (16 * scale), 6);
  const firstLetter = blurb.charAt(0);
  const remaining = blurb.slice(1).trimStart();
  ctx.fillStyle = mixHexColors(accent, "#fff6c6", 0.72);
  ctx.font = `700 ${15 * scale}px "Cinzel", "Times New Roman", serif`;
  ctx.fillText(firstLetter, artX + (8 * scale), blurbY + (18 * scale));
  ctx.fillStyle = "#e5edf8";
  ctx.font = `500 ${7.7 * scale}px "Cormorant Garamond", "Times New Roman", serif`;
  const blurbLines = wrapCanvasText(ctx, remaining, artWidth - (28 * scale), 6);
  blurbLines.forEach((line, index) => {
    ctx.fillText(line, artX + (18 * scale), blurbY + (18 * scale) + (index * 10 * scale));
  });

  const serialY = contentY + contentHeight - statsHeight - serialHeight;
  ctx.strokeStyle = mixHexColors(accent, "#ffffff", 0.4, 0.26);
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.beginPath();
  ctx.moveTo(contentX + (8 * scale), serialY);
  ctx.lineTo(contentX + contentWidth - (8 * scale), serialY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#d9e2f2";
  ctx.font = `700 ${6.4 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillText(`#${serialId}`, contentX + (8 * scale), serialY + (12 * scale));
  ctx.textAlign = "center";
  ctx.fillText(rarityLabel, contentX + (contentWidth / 2), serialY + (12 * scale));
  ctx.textAlign = "right";
  ctx.fillText(`x${Number(card?.copies ?? 1)}`, contentX + contentWidth - (8 * scale), serialY + (12 * scale));
  ctx.textAlign = "left";

  const statsY = contentY + contentHeight - statsHeight;
  const statsGradient = ctx.createLinearGradient(contentX, statsY, contentX, statsY + statsHeight);
  statsGradient.addColorStop(0, mixHexColors(accent, "#000000", 0.22, 0.82));
  statsGradient.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  ctx.fillStyle = statsGradient;
  ctx.fillRect(contentX, statsY, contentWidth, statsHeight);
  ctx.fillStyle = mixHexColors(accent, "#000000", 0.18, 0.24);
  ctx.fillRect(contentX, statsY, contentWidth / 2, statsHeight);
  ctx.fillRect(contentX + (contentWidth / 2), statsY, contentWidth / 2, statsHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(contentX + (contentWidth / 2), statsY);
  ctx.lineTo(contentX + (contentWidth / 2), statsY + statsHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(contentX, statsY);
  ctx.lineTo(contentX + contentWidth, statsY);
  ctx.stroke();

  ctx.fillStyle = "#f87171";
  ctx.font = `800 ${7 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("ATK", contentX + (contentWidth * 0.25), statsY + (16 * scale));
  ctx.fillStyle = "#60a5fa";
  ctx.fillText("DEF", contentX + (contentWidth * 0.75), statsY + (16 * scale));
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${16 * scale}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillText(`${Number(card?.atk) || 0}`, contentX + (contentWidth * 0.25), statsY + (34 * scale));
  ctx.fillText(`${Number(card?.def ?? card?.defStat) || 0}`, contentX + (contentWidth * 0.75), statsY + (34 * scale));
  ctx.textAlign = "left";
}

async function buildPackShareCanvas(cards, locale) {
  const trimmedCards = cards.slice(0, 5);
  const canvasPadding = 34;
  const canvasWidth = (canvasPadding * 2) + (PACK_SHARE_CARD_WIDTH * trimmedCards.length) + (PACK_SHARE_CARD_GAP * Math.max(0, trimmedCards.length - 1));
  const canvasHeight = (canvasPadding * 2) + PACK_SHARE_CARD_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("pack_share_canvas_failed");

  const imageAssets = await Promise.all(trimmedCards.map((card) => loadCardImage(card?.imageUrl)));

  const background = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  background.addColorStop(0, "#05080f");
  background.addColorStop(0.55, "#0a1422");
  background.addColorStop(1, "#111f33");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const glow = ctx.createRadialGradient(canvasWidth * 0.22, 80, 40, canvasWidth * 0.22, 80, 420);
  glow.addColorStop(0, "rgba(72, 162, 255, 0.24)");
  glow.addColorStop(1, "rgba(72, 162, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  trimmedCards.forEach((card, index) => {
    const x = canvasPadding + (index * (PACK_SHARE_CARD_WIDTH + PACK_SHARE_CARD_GAP));
    const y = canvasPadding;
    const image = imageAssets[index];
    drawStackCardForShare(ctx, card, image, x, y, PACK_SHARE_CARD_WIDTH, PACK_SHARE_CARD_HEIGHT, locale);
  });

  return canvas;
}

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
  if (error?.code === "rewarded_ad_not_available") {
    return es
      ? "El anuncio con recompensa solo aparece cuando no quedan sobres."
      : "The rewarded ad is only available when no packs remain.";
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

function getRarityAccent(rarity) {
  return RARITY_ACCENTS[rarity] ?? RARITY_ACCENTS.C;
}

function getRarityLabel(rarity, locale) {
  const language = locale === "es" ? "es" : "en";
  return RARITY_META[rarity]?.label?.[language] ?? rarity;
}

function getRarityDisplay(rarity, locale) {
  const label = getRarityLabel(rarity, locale);
  return `${label} ${rarity}`;
}

function getRarityFullLabel(rarity, locale) {
  const language = locale === "es" ? "es" : "en";
  return RARITY_META[rarity]?.fullLabel?.[language] ?? getRarityLabel(rarity, locale);
}

function getRarityTitle(rarity, locale) {
  const meta = RARITY_META[rarity];
  if (!meta) return rarity;
  const label = getRarityFullLabel(rarity, locale);
  const multiplier = meta.statMultiplier.toFixed(meta.statMultiplier % 1 ? 2 : 0);
  return locale === "es"
    ? `${label} (${rarity}) - peso ${meta.dropWeight}, ATK/DEF x${multiplier}`
    : `${label} (${rarity}) - weight ${meta.dropWeight}, ATK/DEF x${multiplier}`;
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
  if (rewardSource === "rewarded_ad") {
    return es ? "Anuncio" : "Ad";
  }
  return es ? "Sistema" : "System";
}

const MISSION_COPY = {
  "open-1-pack": {
    es: { title: "Calentamiento del archivista", description: "Abre 1 sobre." },
    en: { title: "Archivist Warm-up", description: "Open 1 pack." },
  },
  "open-2-packs": {
    es: { title: "Borrador de archivo", description: "Abre 2 sobres en un solo dia." },
    en: { title: "Archive Draft", description: "Open 2 packs in a single day." },
  },
  "collect-2-new": {
    es: { title: "Descubrimientos nuevos", description: "Consigue 2 cartas nuevas hoy." },
    en: { title: "Fresh Discoveries", description: "Get 2 new cards today." },
  },
  "pull-sr-plus": {
    es: { title: "Pico de calidad", description: "Obtiene 1 carta MO+." },
    en: { title: "Quality Spike", description: "Obtain 1 MO+ card." },
  },
  "click-wikipedia": {
    es: { title: "Abrir la fuente", description: "Visita 1 articulo en Wikipedia." },
    en: { title: "Open The Source", description: "Visit 1 article on Wikipedia." },
  },
  "favorite-1-card": {
    es: { title: "Eleccion del curador", description: "Marca 1 carta como favorita." },
    en: { title: "Curator's Pick", description: "Mark 1 favorite card." },
  },
  "collect-3-cards": {
    es: { title: "Entrada al archivo", description: "Consigue 3 cartas hoy." },
    en: { title: "Archive Intake", description: "Obtain 3 cards today." },
  },
  "open-4-packs": {
    es: { title: "Sesion larga", description: "Abre 4 sobres en un solo dia." },
    en: { title: "Long Session", description: "Open 4 packs in a single day." },
  },
  "open-6-packs": {
    es: { title: "Barrido de la boveda", description: "Abre 6 sobres en un solo dia." },
    en: { title: "Vault Sweep", description: "Open 6 packs in a single day." },
  },
  "collect-5-new": {
    es: { title: "Expansion del catalogo", description: "Consigue 5 cartas nuevas hoy." },
    en: { title: "Catalog Expansion", description: "Get 5 new cards today." },
  },
  "collect-10-cards": {
    es: { title: "Entrada masiva", description: "Consigue 10 cartas hoy." },
    en: { title: "Bulk Intake", description: "Obtain 10 cards today." },
  },
  "collect-4-duplicates": {
    es: { title: "Camara de ecos", description: "Consigue 4 cartas duplicadas hoy." },
    en: { title: "Echo Chamber", description: "Obtain 4 duplicate cards today." },
  },
  "earn-60-shards": {
    es: { title: "Pase de refinado", description: "Gana 60 shards por duplicados hoy." },
    en: { title: "Refinement Pass", description: "Earn 60 shards from duplicates today." },
  },
  "pull-2-sr-plus": {
    es: { title: "Relevo de rareza", description: "Obtiene 2 cartas MO+ hoy." },
    en: { title: "Rarity Relay", description: "Obtain 2 MO+ cards today." },
  },
  "pull-ssr-plus": {
    es: { title: "Ruptura abstracta", description: "Obtiene 1 carta CO+ hoy." },
    en: { title: "Abstract Breakthrough", description: "Obtain 1 CO+ card today." },
  },
  "click-2-sources": {
    es: { title: "Corredor de notas", description: "Visita 2 paginas de articulos en Wikipedia hoy." },
    en: { title: "Footnote Runner", description: "Visit 2 article pages on Wikipedia today." },
  },
  "click-4-sources": {
    es: { title: "Inmersion en referencias", description: "Visita 4 paginas de articulos en Wikipedia hoy." },
    en: { title: "Reference Dive", description: "Visit 4 article pages on Wikipedia today." },
  },
  "favorite-3-cards": {
    es: { title: "Muro del curador", description: "Marca 3 cartas como favoritas." },
    en: { title: "Curator Wall", description: "Mark 3 favorite cards." },
  },
  "favorite-6-cards": {
    es: { title: "Rotacion de galeria", description: "Marca 6 cartas como favoritas." },
    en: { title: "Gallery Rotation", description: "Mark 6 favorite cards." },
  },
  "science-dive": {
    es: { title: "Lote de ciencia", description: "Consigue 2 cartas de Science hoy." },
    en: { title: "Science Stack", description: "Obtain 2 Science cards today." },
  },
  "history-dive": {
    es: { title: "Lote de historia", description: "Consigue 2 cartas de History hoy." },
    en: { title: "History Stack", description: "Obtain 2 History cards today." },
  },
  "geography-dive": {
    es: { title: "Lote de geografia", description: "Consigue 2 cartas de Geography hoy." },
    en: { title: "Geography Stack", description: "Obtain 2 Geography cards today." },
  },
  "technology-dive": {
    es: { title: "Lote de tecnologia", description: "Consigue 2 cartas de Technology hoy." },
    en: { title: "Technology Stack", description: "Obtain 2 Technology cards today." },
  },
  "art-dive": {
    es: { title: "Lote de arte", description: "Consigue 2 cartas de Art hoy." },
    en: { title: "Art Stack", description: "Obtain 2 Art cards today." },
  },
  "culture-dive": {
    es: { title: "Lote de cultura", description: "Consigue 2 cartas de Culture hoy." },
    en: { title: "Culture Stack", description: "Obtain 2 Culture cards today." },
  },
  "society-dive": {
    es: { title: "Lote de sociedad", description: "Consigue 2 cartas de Society hoy." },
    en: { title: "Society Stack", description: "Obtain 2 Society cards today." },
  },
  "mathematics-dive": {
    es: { title: "Lote de matematicas", description: "Consigue 2 cartas de Mathematics hoy." },
    en: { title: "Mathematics Stack", description: "Obtain 2 Mathematics cards today." },
  },
  "collect-1-new": {
    es: { title: "Espacio en la estanteria", description: "Consigue 1 carta nueva hoy." },
    en: { title: "New Shelf Space", description: "Get 1 new card today." },
  },
};

const TROPHY_COPY = {
  "first-card": {
    es: { name: "Primera tirada", description: "Consigue tu primera carta." },
    en: { name: "First Pull", description: "Obtain your first card." },
  },
  "first-sr": {
    es: { name: "Bengala de senal", description: "Consigue tu primera carta MO+." },
    en: { name: "Signal Flare", description: "Obtain your first MO+ card." },
  },
  "first-ssr": {
    es: { name: "Abstracto dorado", description: "Consigue tu primera carta CO+." },
    en: { name: "Golden Abstract", description: "Obtain your first CO+ card." },
  },
  "unique-15": {
    es: { name: "Mini biblioteca", description: "Colecciona 15 cartas unicas." },
    en: { name: "Mini Library", description: "Collect 15 unique cards." },
  },
  "duplicates-10": {
    es: { name: "Eco de archivo", description: "Acumula 10 copias duplicadas." },
    en: { name: "Archive Echo", description: "Accumulate 10 duplicate copies." },
  },
  "science-collector": {
    es: { name: "Curador de ciencia", description: "Colecciona 6 cartas de Science." },
    en: { name: "Science Curator", description: "Collect 6 Science cards." },
  },
  "history-collector": {
    es: { name: "Curador de historia", description: "Colecciona 5 cartas de History." },
    en: { name: "History Curator", description: "Collect 5 History cards." },
  },
  "first-ur": {
    es: { name: "Evento ambar", description: "Consigue tu primera carta CA+." },
    en: { name: "Amber Event", description: "Obtain your first CA+ card." },
  },
  "first-lr": {
    es: { name: "Cita legendaria", description: "Consigue tu primera carta LE." },
    en: { name: "Legendary Citation", description: "Obtain your first LE card." },
  },
  "first-sr-plus-set": {
    es: { name: "Cluster de senales", description: "Colecciona 3 cartas distintas MO+." },
    en: { name: "Signal Cluster", description: "Collect 3 distinct MO+ cards." },
  },
  "unique-40": {
    es: { name: "Sala de lectura", description: "Colecciona 40 cartas unicas." },
    en: { name: "Reading Room", description: "Collect 40 unique cards." },
  },
  "unique-80": {
    es: { name: "Gran archivo", description: "Colecciona 80 cartas unicas." },
    en: { name: "Grand Archive", description: "Collect 80 unique cards." },
  },
  "unique-150": {
    es: { name: "Estanterias infinitas", description: "Colecciona 150 cartas unicas." },
    en: { name: "Endless Stacks", description: "Collect 150 unique cards." },
  },
  "duplicates-30": {
    es: { name: "Estante resonante", description: "Acumula 30 copias duplicadas." },
    en: { name: "Resonant Shelf", description: "Accumulate 30 duplicate copies." },
  },
  "duplicates-75": {
    es: { name: "Eco recursivo", description: "Acumula 75 copias duplicadas." },
    en: { name: "Recursive Echo", description: "Accumulate 75 duplicate copies." },
  },
  "copies-120": {
    es: { name: "Peso de papel", description: "Alcanza 120 copias totales en el archivo." },
    en: { name: "Paperweight", description: "Reach 120 total copies in the archive." },
  },
  "packs-10": {
    es: { name: "Rutina de tiradas", description: "Abre 10 sobres en total." },
    en: { name: "Routine Puller", description: "Open 10 packs overall." },
  },
  "packs-25": {
    es: { name: "Turno de noche", description: "Abre 25 sobres en total." },
    en: { name: "Night Shift", description: "Open 25 packs overall." },
  },
  "packs-50": {
    es: { name: "Operador de archivadores", description: "Abre 50 sobres en total." },
    en: { name: "Binder Operator", description: "Open 50 packs overall." },
  },
  "packs-100": {
    es: { name: "Motor del archivo", description: "Abre 100 sobres en total." },
    en: { name: "Archive Engine", description: "Open 100 packs overall." },
  },
  "favorites-3": {
    es: { name: "Estante personal", description: "Marca 3 cartas como favoritas." },
    en: { name: "Personal Shelf", description: "Mark 3 favorite cards." },
  },
  "favorites-10": {
    es: { name: "Muro del curador", description: "Marca 10 cartas como favoritas." },
    en: { name: "Curator's Wall", description: "Mark 10 favorite cards." },
  },
  "geography-collector": {
    es: { name: "Curador del atlas", description: "Colecciona 6 cartas de Geography." },
    en: { name: "Atlas Curator", description: "Collect 6 Geography cards." },
  },
  "technology-collector": {
    es: { name: "Curador de tecnologia", description: "Colecciona 6 cartas de Technology." },
    en: { name: "Tech Curator", description: "Collect 6 Technology cards." },
  },
  "art-collector": {
    es: { name: "Curador de galeria", description: "Colecciona 6 cartas de Art." },
    en: { name: "Gallery Curator", description: "Collect 6 Art cards." },
  },
  "culture-collector": {
    es: { name: "Curador de cultura", description: "Colecciona 6 cartas de Culture." },
    en: { name: "Culture Curator", description: "Collect 6 Culture cards." },
  },
  "society-collector": {
    es: { name: "Curador civico", description: "Colecciona 6 cartas de Society." },
    en: { name: "Civic Curator", description: "Collect 6 Society cards." },
  },
  "mathematics-collector": {
    es: { name: "Curador de numeros", description: "Colecciona 4 cartas de Mathematics." },
    en: { name: "Numbers Curator", description: "Collect 4 Mathematics cards." },
  },
  "topic-variety-4": {
    es: { name: "Referencias cruzadas", description: "Colecciona cartas de 4 grupos tematicos distintos." },
    en: { name: "Cross-Referenced", description: "Collect cards from 4 different topic groups." },
  },
  "topic-variety-7": {
    es: { name: "Lector universal", description: "Colecciona cartas de 7 grupos tematicos distintos." },
    en: { name: "Universal Reader", description: "Collect cards from 7 different topic groups." },
  },
  "wikipedia-clicks-5": {
    es: { name: "Fuente primaria", description: "Abre 5 articulos en Wikipedia." },
    en: { name: "Primary Source", description: "Open 5 articles on Wikipedia." },
  },
  "wikipedia-clicks-25": {
    es: { name: "Peregrino de notas", description: "Abre 25 articulos en Wikipedia." },
    en: { name: "Footnote Pilgrim", description: "Open 25 articles on Wikipedia." },
  },
  "mission-claims-5": {
    es: { name: "Guarda de listas", description: "Reclama 5 recompensas de mision." },
    en: { name: "Checklist Keeper", description: "Claim 5 mission rewards." },
  },
  "mission-claims-20": {
    es: { name: "Jefe de despacho", description: "Reclama 20 recompensas de mision." },
    en: { name: "Dispatch Chief", description: "Claim 20 mission rewards." },
  },
  "shards-250": {
    es: { name: "Reserva de shards", description: "Mantiene 250 shards a la vez." },
    en: { name: "Shard Cache", description: "Hold 250 shards at once." },
  },
  "shards-1000": {
    es: { name: "Deposito de shards", description: "Mantiene 1000 shards a la vez." },
    en: { name: "Shard Reserve", description: "Hold 1000 shards at once." },
  },
  "gems-250": {
    es: { name: "Libro mayor de gemas", description: "Mantiene 250 gemas a la vez." },
    en: { name: "Gem Ledger", description: "Hold 250 gems at once." },
  },
  "gems-750": {
    es: { name: "Tesoreria de gemas", description: "Mantiene 750 gemas a la vez." },
    en: { name: "Gem Treasury", description: "Hold 750 gems at once." },
  },
  "ssr-set-5": {
    es: { name: "Estante de prestigio", description: "Colecciona 5 cartas distintas CO+." },
    en: { name: "Prestige Shelf", description: "Collect 5 distinct CO+ cards." },
  },
};

function getLocalizedMissionCopy(code, locale) {
  const language = locale === "es" ? "es" : "en";
  return MISSION_COPY[code]?.[language] ?? null;
}

function getLocalizedTrophyCopy(code, locale) {
  const language = locale === "es" ? "es" : "en";
  return TROPHY_COPY[code]?.[language] ?? null;
}

function localizeMissionEntry(mission, locale) {
  const localized = getLocalizedMissionCopy(mission?.code, locale);
  if (!localized) return mission;
  return {
    ...mission,
    title: localized.title,
    description: localized.description,
  };
}

function localizeTrophyEntry(trophy, locale) {
  const localized = getLocalizedTrophyCopy(trophy?.code, locale);
  if (!localized) return trophy;
  return {
    ...trophy,
    name: localized.name,
    description: localized.description,
  };
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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5 14.5v3A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-3"
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

function RarityBadge({ rarity, locale }) {
  const label = getRarityLabel(rarity, locale);
  return (
    <span
      className="wg-rarity-badge"
      style={{ "--wg-rarity-accent": getRarityAccent(rarity) }}
      title={getRarityTitle(rarity, locale)}
      aria-label={getRarityTitle(rarity, locale)}
    >
      <span>{label}</span>
      <small>{rarity}</small>
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

function SmallCard({ item, archiveLabel, copiesLabel, favoriteTag, onOpen, onToggleFavorite, formatNumber, locale }) {
  const rarity = getRarity(item);
  return (
    <article className="wg-mini-card" style={{ "--wg-rarity-accent": getRarityAccent(rarity) }}>
      <button type="button" className="wg-card-open" onClick={() => onOpen(item.articleId)}>
        <div className="wg-card-headline">
          <RarityBadge rarity={rarity} locale={locale} />
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

function PackShowcase({ card, archiveLabel, qualityLabel, copiesLabel, shardsLabel, newLabel, formatNumber, locale }) {
  const rarity = getRarity(card);
  return (
    <article className="wg-showcase-card" style={{ "--wg-rarity-accent": getRarityAccent(rarity) }}>
      <div className="wg-card-headline">
        <RarityBadge rarity={rarity} locale={locale} />
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

function StackCard({ card, archiveLabel, formatNumber, onOpen, onToggleFavorite, onCardActivate, locale }) {
  const rarity = getRarity(card);
  const rarityLabel = getRarityLabel(rarity, locale);
  const rarityDisplay = getRarityDisplay(rarity, locale);
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
      style={{ "--wg-rarity-accent": getRarityAccent(rarity) }}
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
              <span className="wg-stack-rarity" title={getRarityTitle(rarity, locale)}>
                <span>{rarityLabel}</span>
                <small>{rarity}</small>
              </span>
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
            <span>{rarityDisplay}</span>
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
  locale,
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
            locale={locale}
            onOpen={() => {}}
            onToggleFavorite={() => {}}
          />
        </div>
        <p className="wg-detail-flip-hint">{flipHint}</p>
      </div>

      <article className="wg-detail-flip-face is-back">
        <header className="wg-detail-back-head">
          <RarityBadge rarity={rarity} locale={locale} />
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

function MissionCard({
  mission,
  title,
  progressLabel,
  rewardLabel,
  doneLabel,
  claimedLabel,
  claimLabel,
  activeLabel,
  busy,
  onClaim,
  formatRewardTypeLabel,
}) {
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
          {rewardLabel}: +{mission.rewardAmount} {formatRewardTypeLabel(mission.rewardType)}
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

function MobileNavButton({ label, badge, active, onClick }) {
  return (
    <button
      type="button"
      className={`wg-mobile-tab-btn${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      {badge ? <small>{badge}</small> : null}
    </button>
  );
}

export default function WikipediaGachaGame() {
  const browserLocale = useMemo(resolveBrowserLanguage, []);
  const viewport = useMobileGameViewport();
  const isMobileViewport = viewport.isMobile;
  const isPortraitViewport = viewport.orientation === "portrait";
  const [locale, setLocale] = useState(browserLocale);
  const es = locale === "es";
  const formatNumber = useMemo(() => {
    const formatter = new Intl.NumberFormat(es ? "es-ES" : "en-US");
    return (value) => formatter.format(Number(value) || 0);
  }, [es]);

  const text = useMemo(() => ({
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
    guaranteed: es ? "MO+ garantizada" : "Guaranteed MO+",
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
    specialPackHint: es ? "Se activa cada 10 sobres y garantiza al menos 1 carta CA o LE." : "It unlocks every 10 packs and guarantees at least 1 CA or LE card.",
    tapToOpen: es ? "▲ TOCA PARA ABRIR ▲" : "▲ TAP TO OPEN ▲",
    watchAd: es ? "Ver anuncio (+3 sobres)" : "Watch ad (+3 packs)",
    adRewardReady: es ? "Recompensa lista: +3 sobres" : "Reward ready: +3 packs",
    adModalTitle: es ? "Anuncio con recompensa" : "Rewarded ad",
    adModalSubtitle: es ? "Cierra el anuncio al terminar para recuperar 3 sobres al instante." : "Close the ad after viewing to recover 3 packs instantly.",
    adSponsored: es ? "Patrocinado" : "Sponsored",
    adClose: es ? "Cerrar anuncio" : "Close ad",
    adCloseIn: es ? "Cerrar en" : "Close in",
    adRewardOk: es ? "Ya tienes hasta 3 sobres listos tras ver el anuncio." : "You now have up to 3 packs ready after viewing the ad.",
    adVignetteTitle: es ? "Recupera sobres sin esperar" : "Recover packs without waiting",
    adVignetteCopy: es ? "Mira un anuncio a pantalla completa y desbloquea 3 sobres extra para seguir abriendo ahora." : "Watch a full-screen ad and unlock 3 extra packs to keep opening right now.",
    quickRules: es ? "Reglas rapidas" : "Quick rules",
    support: es ? "Soporte" : "Support",
    missionRewardNote: es ? "Las misiones mezclan sobres, gemas y shards segun la dificultad." : "Missions rotate between packs, gems, and shards depending on difficulty.",
    noPackCards: es ? "Abre un sobre para cargar cartas en la baraja." : "Open a pack to load cards into the deck.",
    fullHandReady: es ? "Todas vistas: mazo en mano." : "All seen: full hand view.",
    tapToFlip: es ? "Toca la carta para girarla." : "Tap the card to flip it.",
    tapToNextCard: es ? "Toca de nuevo para pasar a la siguiente." : "Tap again to move to the next card.",
    dailyMissionUnlocked: es ? "Mision diaria desbloqueada" : "Daily mission unlocked",
    topRarityPull: es ? "Drop CA/LE" : "CA/LE pull",
    topRarityPullHint: es ? "Has obtenido una carta de la capa mas escasa del archivo." : "You pulled a card from the archive's scarcest layer.",
    cardCarousel: es ? "Carrusel de cartas" : "Card carousel",
    sourceLink: es ? "Ver fuente" : "View source",
    sharePack: es ? "Compartir" : "Share",
    sharingPack: es ? "Generando..." : "Generating...",
    backToGacha: es ? "Volver al Gacha" : "Back to Gacha",
    sharePackOk: es ? "Imagen del sobre descargada." : "Pack image downloaded.",
    sharePackError: es ? "No se pudo generar la imagen del sobre." : "Could not generate the pack image.",
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
  }), [es]);

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
  const [shareBusy, setShareBusy] = useState(false);
  const [rewardedAdOpen, setRewardedAdOpen] = useState(false);
  const [rewardedAdSecondsLeft, setRewardedAdSecondsLeft] = useState(0);
  const [rewardedAdClaimBusy, setRewardedAdClaimBusy] = useState(false);
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
  const shellScrollRef = useRef(null);
  const articleModalRef = useRef(null);
  const articleDetailCardRef = useRef(null);
  const packHeroRef = useRef(null);
  const packsSectionRef = useRef(null);
  const packsStageRef = useRef(null);
  const collectionSectionRef = useRef(null);

  useEffect(() => {
    tokenRef.current = browserToken;
  }, [browserToken]);

  const commitBrowserToken = (nextToken) => {
    if (!nextToken || nextToken === tokenRef.current) {
      return nextToken ?? tokenRef.current;
    }
    window.localStorage.setItem(STORAGE_KEY, nextToken);
    tokenRef.current = nextToken;
    setBrowserToken(nextToken);
    return nextToken;
  };

  useEffect(() => {
    nowRef.current = nowMs;
  }, [nowMs]);

  useEffect(() => {
    setDetailCardFlipped(false);
  }, [selectedArticle?.articleId, selectedArticle?.id]);

  useEffect(() => {
    if (!selectedArticle) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      articleModalRef.current?.scrollTo?.({ top: 0, behavior: "auto" });

      if (isMobileViewport) {
        window.scrollTo?.({ top: 0, behavior: "auto" });
        shellScrollRef.current?.scrollTo?.({ top: 0, behavior: "auto" });
        articleDetailCardRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        return;
      }

      articleDetailCardRef.current?.scrollIntoView?.({
        behavior: "auto",
        block: "center",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedArticle?.articleId, selectedArticle?.id, isMobileViewport]);

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
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const targetPageSize = isMobileViewport ? 8 : 12;
    setCollectionFilters((current) => (
      current.pageSize === targetPageSize
        ? current
        : { ...current, pageSize: targetPageSize, page: 1 }
    ));
  }, [isMobileViewport]);

  const scrollShellTarget = useCallback((element, { behavior = "smooth", block = "start", padding = 18 } = {}) => {
    if (!element) {
      return;
    }

    const shell = shellScrollRef.current;
    const shellRect = shell?.getBoundingClientRect?.();
    const shellEscapesViewport =
      !shellRect
      || shellRect.height > window.innerHeight + 24
      || shell.clientHeight > window.innerHeight + 24;

    if (
      !shell
      || shellEscapesViewport
      || typeof shell.scrollTo !== "function"
      || shell.scrollHeight <= shell.clientHeight + 4
    ) {
      element.scrollIntoView({
        behavior,
        block: block === "center" ? "center" : "start",
        inline: "nearest",
      });
      return;
    }

    const elementRect = element.getBoundingClientRect();
    const currentTop = shell.scrollTop;
    const elementTop = currentTop + (elementRect.top - shellRect.top);
    const centeredTop = elementTop - Math.max(0, (shell.clientHeight - elementRect.height) / 2);
    const startTop = elementTop - padding;

    shell.scrollTo({
      top: Math.max(0, block === "center" ? centeredTop : startTop),
      behavior,
    });
  }, []);

  useEffect(() => {
    const target =
      activeTab === "home"
        ? packHeroRef.current
        : activeTab === "packs"
        ? packsStageRef.current ?? packsSectionRef.current
        : activeTab === "collection"
        ? collectionSectionRef.current
        : null;

    if (!target) {
      if (isMobileViewport) {
        shellScrollRef.current?.scrollTo?.({ top: 0, behavior: "auto" });
      }
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollShellTarget(target, {
        behavior: "auto",
        block: activeTab === "home" || activeTab === "packs" ? "center" : "start",
        padding: activeTab === "packs" ? 0 : 18,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, isMobileViewport, scrollShellTarget]);

  useEffect(() => {
    if (activeTab !== "home" || loading) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollShellTarget(packHeroRef.current, {
        behavior: "auto",
        block: "center",
        padding: 18,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, dashboardStampMs, loading, scrollShellTarget]);

  useEffect(() => {
    if (!rewardedAdOpen || rewardedAdSecondsLeft <= 0) return undefined;
    const timeoutId = window.setTimeout(() => {
      setRewardedAdSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [rewardedAdOpen, rewardedAdSecondsLeft]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        let token = tokenRef.current;
        if (!token) {
          token = (await bootstrapWikipediaGachaSession({}, browserLocale)).browserToken;
          commitBrowserToken(token);
        }
        try {
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(token, browserLocale),
            fetchWikipediaGachaCollection(token, toCollectionParams(collectionFilters), browserLocale),
            fetchWikipediaGachaMissions(token, browserLocale),
            fetchWikipediaGachaTrophies(token, false, browserLocale),
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
          const freshToken = (await bootstrapWikipediaGachaSession({}, browserLocale)).browserToken;
          commitBrowserToken(freshToken);
          const [dashboardData, collectionData, missionsData, trophiesData] = await Promise.all([
            fetchWikipediaGachaSession(freshToken, browserLocale),
            fetchWikipediaGachaCollection(freshToken, toCollectionParams(collectionFilters), browserLocale),
            fetchWikipediaGachaMissions(freshToken, browserLocale),
            fetchWikipediaGachaTrophies(freshToken, false, browserLocale),
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
      void fetchWikipediaGachaCollection(browserToken, toCollectionParams(collectionFilters), browserLocale)
        .then(setCollection)
        .catch((error) => setErrorMessage(getErrorMessage(error, es)));
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [browserLocale, browserToken, collectionFilters, es]);

  const refreshAll = async (message = "") => {
    if (!tokenRef.current) return null;
    const sessionToken = tokenRef.current;
    setBusy(true);
    setErrorMessage("");
    try {
      const [dashboardResult, collectionResult, missionsResult, trophiesResult] = await Promise.allSettled([
        fetchWikipediaGachaSession(sessionToken, browserLocale),
        fetchWikipediaGachaCollection(sessionToken, toCollectionParams(collectionFilters), browserLocale),
        fetchWikipediaGachaMissions(sessionToken, browserLocale),
        fetchWikipediaGachaTrophies(sessionToken, false, browserLocale),
      ]);

      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }

      const dashboardData = dashboardResult.value;
      commitBrowserToken(dashboardData?.browserToken);
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
      title: getLocalizedMissionCopy(mission.code, locale)?.title ?? mission.title,
      rewardAmount: mission.rewardAmount,
      rewardType: mission.rewardType,
    }));

    setMissionUnlockFeed((current) => [...current, ...entries].slice(-4));
    const baseDuration = isMobileViewport ? 2200 : 4300;
    const stagger = isMobileViewport ? 180 : 240;
    entries.forEach((entry, index) => {
      const timeoutId = window.setTimeout(() => {
        setMissionUnlockFeed((current) => current.filter((notice) => notice.id !== entry.id));
        missionFeedTimeoutsRef.current = missionFeedTimeoutsRef.current.filter((scheduled) => scheduled !== timeoutId);
      }, baseDuration + index * stagger);
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

  useEffect(() => {
    if (activeTab !== "packs" || !currentPackCards.length) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollShellTarget(packsStageRef.current ?? packsSectionRef.current, {
        behavior: isMobileViewport ? "smooth" : "auto",
        block: "center",
        padding: 0,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, currentPackCards.length, isMobileViewport, scrollShellTarget]);

  const handleOpenPack = async () => {
    if (!tokenRef.current || busy || loading) return;
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const previousMissionsById = new Map(
        (missions.missions ?? []).map((mission) => [mission.id, { completed: Boolean(mission.completed) }])
      );
      const result = await openWikipediaGachaPack(tokenRef.current, browserLocale);
      commitBrowserToken(result?.browserToken);
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

    if (canWatchRewardedAd) {
      setRewardedAdSecondsLeft(REWARDED_AD_DURATION_SECONDS);
      setRewardedAdOpen(true);
      setStatusMessage("");
      setErrorMessage("");
      return;
    }

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

  const handleCloseRewardedAdAndClaim = async () => {
    if (!tokenRef.current || rewardedAdSecondsLeft > 0 || rewardedAdClaimBusy) return;
    setRewardedAdClaimBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const rewardResult = await claimWikipediaGachaRewardedAdPacks(tokenRef.current, browserLocale);
      commitBrowserToken(rewardResult?.browserToken);
      setRewardedAdOpen(false);
      setRewardedAdSecondsLeft(0);
      await refreshAll(text.adRewardOk);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    } finally {
      setRewardedAdClaimBusy(false);
    }
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
      const updated = await toggleWikipediaGachaFavorite(tokenRef.current, articleId, favorite, browserLocale);
      commitBrowserToken(updated?.browserToken);
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
      setSelectedArticle(await fetchWikipediaGachaArticle(tokenRef.current, articleId, browserLocale));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };

  const handleOpenSource = async (article) => {
    if (!tokenRef.current || !article?.articleId || !article?.sourceUrl) return;
    try {
      const clickResult = await registerWikipediaGachaArticleClick(tokenRef.current, article.articleId, browserLocale);
      commitBrowserToken(clickResult?.browserToken);
      window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, es));
    }
  };

  const handleSharePack = async () => {
    if (!currentPackCards.length || shareBusy) return;

    setShareBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const shareCanvas = await buildPackShareCanvas(currentPackCards, locale);
      const blob = await canvasToBlob(shareCanvas);
      const downloadUrl = window.URL.createObjectURL(blob);
      const filenameId = packMetaSource?.packOpeningId ?? Date.now();
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `wikipedia-gacha-pack-${filenameId}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1200);
      setStatusMessage(text.sharePackOk);
    } catch (_error) {
      setErrorMessage(text.sharePackError);
    } finally {
      setShareBusy(false);
    }
  };

  const handleClaimMission = async (missionId) => {
    if (!tokenRef.current) return;
    setBusy(true);
    try {
      const claimResult = await claimWikipediaGachaMission(tokenRef.current, missionId, browserLocale);
      commitBrowserToken(claimResult?.browserToken);
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
      const result = await exportWikipediaGachaRecovery(tokenRef.current, browserLocale);
      commitBrowserToken(result?.browserToken);
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
      const imported = await importWikipediaGachaRecovery(tokenRef.current, recoveryImport.trim(), browserLocale);
      commitBrowserToken(imported?.browserToken);
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
  const latestGuaranteedPackOpened = Boolean(
    packResult?.guaranteedSrPlus || dashboard?.recentPackHistory?.[0]?.guaranteedSrPlus
  );
  const canWatchRewardedAd = ENABLE_MONETIZATION_PREVIEW && canShowRewardedAdCta({
    loading,
    busy,
    packHeroAnimState,
    packStatus,
    pityTarget: PACK_PITY_TARGET,
    latestGuaranteedPackOpened,
  });
  const collectionSummary = collection.summary ?? dashboard?.collectionSummary ?? { uniqueCards: 0, totalCopies: 0, favorites: 0, rarityBreakdown: {} };
  const missionSummary = missions.summary ?? dashboard?.missionSummary ?? { total: 0, completed: 0, claimable: 0 };
  const trophySummary = trophies.summary ?? dashboard?.trophySummary ?? { total: 0, unlocked: 0, points: 0 };
  const historyEntries = dashboard?.recentPackHistory ?? [];
  const recentRewardEvents = dashboard?.recentRewardEvents ?? [];
  const missionRewardHistory = useMemo(
    () => recentRewardEvents.filter((entry) => entry.rewardSource === "mission_claim"),
    [recentRewardEvents]
  );
  const localizedMissions = useMemo(
    () => (missions.missions ?? []).map((mission) => localizeMissionEntry(mission, locale)),
    [missions.missions, locale]
  );
  const localizedTrophies = useMemo(
    () => (trophies.trophies ?? []).map((trophy) => localizeTrophyEntry(trophy, locale)),
    [trophies.trophies, locale]
  );
  const localizedMissionRewardHistory = useMemo(
    () =>
      missionRewardHistory.map((entry) => ({
        ...entry,
        missionTitle:
          getLocalizedMissionCopy(entry.missionCode, locale)?.title ??
          entry.missionTitle ??
          null,
      })),
    [missionRewardHistory, locale]
  );
  const missionRewardTotals = useMemo(
    () =>
      localizedMissionRewardHistory.reduce(
        (accumulator, rewardEntry) => {
          const rewardType = normalizeRewardType(rewardEntry.rewardType);
          if (rewardType === "packs" || rewardType === "gems" || rewardType === "shards") {
            accumulator[rewardType] += Number(rewardEntry.rewardAmount) || 0;
          }
          return accumulator;
        },
        { packs: 0, gems: 0, shards: 0 }
      ),
    [localizedMissionRewardHistory]
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
      rewardedAd: {
        available: canWatchRewardedAd,
        open: rewardedAdOpen,
        secondsLeft: rewardedAdSecondsLeft,
        claiming: rewardedAdClaimBusy,
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
        totalLogged: localizedMissionRewardHistory.length,
        totalsByType: missionRewardTotals,
        latest: localizedMissionRewardHistory.length
          ? {
              rewardType: normalizeRewardType(localizedMissionRewardHistory[0].rewardType),
              rewardAmount: localizedMissionRewardHistory[0].rewardAmount ?? 0,
              missionTitle: localizedMissionRewardHistory[0].missionTitle ?? null,
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

  const isTabletViewport = viewport.formFactor === "tablet";
  const shellClassName = [
    "wg-shell",
    "antialiased",
    isMobileViewport ? "is-mobile" : "",
    isTabletViewport ? "is-tablet" : "",
    isMobileViewport && isPortraitViewport ? "is-mobile-portrait" : "",
    isMobileViewport && !isPortraitViewport ? "is-mobile-landscape" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const mobileTabMeta = {
    home: { badge: packStatus?.packsAvailable ? `${packStatus.packsAvailable}` : null },
    collection: { badge: collectionSummary.uniqueCards ? `${collectionSummary.uniqueCards}` : null },
    packs: { badge: currentPackCards.length ? `${currentPackCards.length}` : null },
    missions: { badge: missionSummary.claimable ? `${missionSummary.claimable}` : null },
    trophies: { badge: trophySummary.unlocked ? `${trophySummary.unlocked}` : null },
  };

  const rewardedAdModal = rewardedAdOpen ? (
    <div className="wg-rewarded-ad-backdrop" role="presentation">
      <article className="wg-rewarded-ad-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="wg-rewarded-ad-close"
          onClick={() => void handleCloseRewardedAdAndClaim()}
          disabled={rewardedAdSecondsLeft > 0 || rewardedAdClaimBusy}
        >
          {rewardedAdSecondsLeft > 0
            ? `${text.adCloseIn} ${rewardedAdSecondsLeft}s`
            : rewardedAdClaimBusy
              ? text.opening
              : text.adClose}
        </button>

        <div className="wg-rewarded-ad-shell">
          <span className="wg-rewarded-ad-sponsored">{text.adSponsored}</span>
          <div className="wg-rewarded-ad-copy">
            <h3>{text.adModalTitle}</h3>
            <p>{text.adModalSubtitle}</p>
          </div>
          <div className="wg-rewarded-ad-card">
            <AdPreviewCard slot={REWARDED_AD_PREVIEW_SLOT} locale={locale} className="wg-rewarded-ad-preview-card" />
          </div>
          <div className="wg-rewarded-ad-reward">
            <span>{text.watchAd}</span>
            <strong>{rewardedAdSecondsLeft > 0 ? `${rewardedAdSecondsLeft}s` : text.adRewardReady}</strong>
          </div>
        </div>
      </article>
    </div>
  ) : null;

  const articleModal = selectedArticle ? (
    <div className={`wg-modal-backdrop${isMobileViewport ? " is-mobile" : ""}`} role="presentation" onClick={() => setSelectedArticle(null)}>
      <article
        ref={articleModalRef}
        className={`wg-modal${isMobileViewport ? " is-mobile" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wg-section-head">
          <div>
            <h3>{getTitle(selectedArticle)}</h3>
            <p>{selectedArticle.topicGroup ?? text.archive}</p>
          </div>
          <button type="button" className="wg-secondary-btn" onClick={() => setSelectedArticle(null)}>{text.close}</button>
        </div>
        <div className="wg-modal-grid">
          <div className="wg-modal-card-shell">
            <div className="wg-modal-stack-preview" ref={articleDetailCardRef}>
              <DetailFlipCard
                card={selectedArticle}
                archiveLabel={text.archive}
                formatNumber={formatNumber}
                locale={locale}
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
  ) : null;

  return (
    <section className={shellClassName} ref={shellScrollRef}>
      {isMobileViewport ? (
        <header className="wg-mobile-header">
          <div className="wg-mobile-header-top">
            <div className="wg-mobile-brand">
              <span className="wg-kicker">{text.archive}</span>
              <h2>Wikipedia Gacha</h2>
              <p>{es ? "Cliente móvil nativo del archivo y colección." : "Native mobile archive and collection client."}</p>
            </div>
            <div className="wg-mobile-header-actions">
              <button
                type="button"
                className="wg-top-icon wg-lang-toggle"
                aria-label={es ? "Switch to English" : "Cambiar a Espanol"}
                onClick={() => setLocale((current) => (current === "es" ? "en" : "es"))}
              >
                {es ? "EN" : "ES"}
              </button>
              <button type="button" className="wg-top-icon wg-top-icon-info" aria-label={text.sync} onClick={() => void refreshAll(text.syncOk)}>
                ?
              </button>
            </div>
          </div>
        </header>
      ) : null}

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
            <strong>{rareDropFx.rarities.map((rarity) => getRarityLabel(rarity, locale)).join(" / ")}</strong>
            <p>{text.topRarityPullHint}</p>
          </div>
        ) : null}
        {missionUnlockFeed.length ? (
          <aside className="wg-mission-unlock-stack">
            {missionUnlockFeed.map((notice) => (
              <article key={notice.id} className="wg-mission-unlock-toast">
                <header>
                  <strong>{text.dailyMissionUnlocked}</strong>
                  <span>+{notice.rewardAmount} {getRewardTypeLabel(notice.rewardType, es)}</span>
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
              <div className="wg-home-pack-status-card">
                <div className="wg-home-pack-status-inline">
                  <span className="wg-home-pack-status-label">{text.dailyPacks}</span>
                  <strong className="wg-home-pack-status-value">{packStatus?.packsAvailable ?? "--"} / {packStatus?.maxPacks ?? "--"}</strong>
                  <div className="wg-home-pack-status-chip">
                    {packStatus && packStatus.packsAvailable >= packStatus.maxPacks ? text.packsReady : `${packFillPercent}%`}
                  </div>
                </div>

                <div className="wg-home-pack-status-subline">
                  <span>{text.nextPack}</span>
                  <strong>{formatCountdown(packStatus?.secondsUntilNextPack ?? 0)}</strong>
                </div>

                <div className="wg-home-pack-status-meter is-pity">
                  <div className="wg-home-pack-status-meter-head">
                    <span>{text.specialPackReady}</span>
                    <strong>
                      {pityPullsRemaining <= 0 ? text.guaranteed : `${pityPullsRemaining} ${text.pullsUntilGold}`}
                    </strong>
                  </div>
                  <div className="wg-progress-bar is-pity">
                    <span style={{ width: `${Math.round(((PACK_PITY_TARGET - pityPullsRemaining) / PACK_PITY_TARGET) * 100)}%` }} />
                  </div>
                </div>
              </div>
              {specialPackReady ? (
                <div className="wg-special-pack-banner">
                  <strong>{text.specialPackReady}</strong>
                  <p>{text.specialPackHint}</p>
                </div>
              ) : null}

              <button
                type="button"
                id="gacha-pack-container"
                ref={packHeroRef}
                className={`wg-pack-hero${packHeroAnimState !== "idle" ? " is-opening" : ""}${packHeroAnimState === "burst" ? " is-burst" : ""}${specialPackReady ? " is-special" : ""}${canWatchRewardedAd ? " is-rewarded" : ""}`}
                onClick={handleOpenPackFromHero}
                disabled={busy || rewardedAdClaimBusy || loading || packHeroAnimState !== "idle"}
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
                    ? canWatchRewardedAd
                      ? text.watchAd
                      : specialPackReady
                      ? text.specialPackReady
                      : text.tapToOpen
                    : text.opening}
                </span>
              </button>

              {canWatchRewardedAd ? (
                <div className="wg-home-rewarded-ad-panel">
                  <div className="wg-home-rewarded-ad-copy">
                    <strong>{text.adVignetteTitle}</strong>
                    <p>{text.adVignetteCopy}</p>
                  </div>
                  <AdPreviewCard slot={REWARDED_AD_PREVIEW_SLOT} locale={locale} className="wg-home-rewarded-ad-card" />
                </div>
              ) : null}
            </div>

            <div className="wg-home-intel-grid">
              <div className="wg-home-mission-card">
                <h3>{text.missionsTab}</h3>
                <div className="wg-home-mission-list">
                  {localizedMissions.length ? (
                    localizedMissions.slice(0, 5).map((mission) => (
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
          <section className="wg-stack-panel" ref={packsSectionRef}>
            <div className="wg-stack-shell is-deck" ref={packsStageRef}>
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
                                  locale={locale}
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
                              locale={locale}
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
                              style={{ "--wg-rarity-accent": getRarityAccent(getRarity(focusedPackCard)) }}
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
                                locale={locale}
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
                  </div>
                )}
              </div>
            </div>

            <div className="wg-stack-footer">
              <div className="wg-stack-return-actions">
                {allPackCardsSeen ? (
                  <button
                    type="button"
                    className="wg-secondary-btn with-icon wg-share-pack-btn"
                    onClick={() => void handleSharePack()}
                    disabled={shareBusy || !currentPackCards.length}
                  >
                    <ShareIcon />
                    <span>{shareBusy ? text.sharingPack : text.sharePack}</span>
                  </button>
                ) : null}

                <div className="wg-back-gacha-wrap">
                  <button type="button" className="wg-back-gacha-btn" onClick={() => setActiveTab("home")}>
                    {text.backToGacha}
                  </button>
                </div>
              </div>

              <div className="wg-pack-actions-row">
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
                    <strong>{card ? `${getRarityLabel(getRarity(card), locale)} - ${getTitle(card)}` : text.pending}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

          {!loading && activeTab === "collection" ? (
            <section className="wg-panel" ref={collectionSectionRef}>
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
                  <article key={rarity} className="wg-rarity-summary-card" style={{ "--wg-rarity-accent": getRarityAccent(rarity) }}>
                    <RarityBadge rarity={rarity} locale={locale} />
                    <strong>{collectionSummary.rarityBreakdown?.[rarity] ?? 0}</strong>
                  </article>
                ))}
              </div>

              <div className="wg-filter-shell">
                <div className="wg-filter-grid">
                  <input type="text" value={collectionFilters.query} placeholder={text.searchPlaceholder} onChange={(event) => setCollectionFilters((current) => ({ ...current, query: event.target.value, page: 1 }))} />
                  <select value={collectionFilters.rarity} onChange={(event) => setCollectionFilters((current) => ({ ...current, rarity: event.target.value, page: 1 }))}>
                    <option value="">{text.rarityPlaceholder}</option>
                    {RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{getRarityDisplay(rarity, locale)}</option>)}
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
                      locale={locale}
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

                {localizedMissionRewardHistory.length ? (
                  <div className="wg-reward-log-shell is-missions">
                    {localizedMissionRewardHistory.slice(0, 8).map((rewardEntry) => {
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

              {localizedMissions.length ? (
                <div className="wg-mission-grid">
                  {localizedMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} progressLabel={text.progress} rewardLabel={text.reward} doneLabel={text.done} claimedLabel={text.claimed} claimLabel={text.claim} activeLabel={text.active} busy={busy} onClaim={(missionId) => void handleClaimMission(missionId)} formatRewardTypeLabel={(rewardType) => getRewardTypeLabel(rewardType, es)} />
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
                {localizedTrophies.length ? localizedTrophies.map((trophy) => <TrophyCard key={trophy.id} trophy={trophy} pointsLabel={text.points} unlockedLabel={text.unlocked} lockedLabel={text.locked} />) : <p className="wg-empty">{es ? "Todavia no hay trofeos en el archivo." : "There are no trophies in this archive yet."}</p>}
              </div>
            </section>
          ) : null}
        {!loading && activeTab === "home" ? (
          isMobileViewport ? (
            <section className="wg-mobile-home-utility">
              <article className="wg-panel wg-mobile-compact-panel wg-mobile-economy-panel">
                <div className="wg-mobile-status-rail">
                  <article>
                    <span>{text.dailyPacks}</span>
                    <strong>{packStatus?.packsAvailable ?? "--"} / {packStatus?.maxPacks ?? "--"}</strong>
                  </article>
                  <article>
                    <span>{text.nextPack}</span>
                    <strong>{packStatus?.packsAvailable >= packStatus?.maxPacks ? text.packFull : formatCountdown(packStatus?.secondsUntilNextPack ?? 0)}</strong>
                  </article>
                  <article>
                    <span>Pity</span>
                    <strong>{packStatus?.pityCounter ?? 0} / {PACK_PITY_TARGET}</strong>
                  </article>
                  <article>
                    <span>{text.gems}</span>
                    <strong>{formatNumber(dashboard?.profile?.gems ?? 0)}</strong>
                  </article>
                </div>
              </article>

              <article className="wg-panel wg-mobile-compact-panel">
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
                <div className="wg-mobile-rule-pills">
                  {(es
                    ? ["5 cartas", "MO+ cada 10", "1 sobre/min", "Dupes -> shards"]
                    : ["5 cards", "MO+ every 10", "1 pack/min", "Dupes -> shards"]).map((rule) => (
                    <span key={rule}>{rule}</span>
                  ))}
                </div>
              </article>

              <article className="wg-panel wg-mobile-compact-panel">
                <div className="wg-section-head">
                  <div>
                    <h3>{text.support}</h3>
                    <p>{es ? "Respaldo rápido del progreso." : "Quick progress backup."}</p>
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
          ) : (
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
                        "Cada 10 sobres abiertos, el siguiente es un sobre especial con garantia de al menos 1 carta CA o LE.",
                        "Los sobres regeneran 1 por minuto hasta el tope.",
                        "Los duplicados entregan shards y el progreso queda ligado al navegador.",
                      ]
                    : [
                        "Each pack contains 5 cards.",
                        "Every 10 opened packs, the next one becomes a special pack with at least 1 CA or LE card guaranteed.",
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
          )
        ) : null}
      </main>

      {isMobileViewport ? (
        <nav className="wg-mobile-tabbar" aria-label={es ? "Secciones del archivo" : "Archive sections"}>
          {navTabs.map((tab) => (
            <MobileNavButton
              key={tab.id}
              label={tab.label}
              badge={mobileTabMeta[tab.id]?.badge}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
      ) : null}

      <footer className="wg-footer">
        <p className="wg-footer-subnote">
          {es
            ? "Servicio no oficial y no afiliado con Wikipedia."
            : "This service is unofficial and not affiliated with Wikipedia."}
        </p>
      </footer>

      {rewardedAdModal}
      {articleModal}
    </section>
  );
}
