import React from "react";

const CARD_COPY = {
  es: {
    eyebrow: "Espacio publicitario",
    title: "Google Ads listo",
    description: "Sustituye este bloque por el enlace, la creatividad o la unidad real cuando llegue la campaña.",
    pending: "Enlace pendiente",
    visit: "Abrir destino",
  },
  en: {
    eyebrow: "Ad slot",
    title: "Google Ads ready",
    description: "Replace this block with the real link, creative, or ad unit when the campaign is ready.",
    pending: "Pending link",
    visit: "Open target",
  },
};

function AdPreviewCard({ slot, locale = "es", className = "", style }) {
  const copy = CARD_COPY[locale] ?? CARD_COPY.es;
  const RootTag = slot?.targetUrl ? "a" : "article";
  const rootProps =
    RootTag === "a"
      ? {
          href: slot.targetUrl,
          target: "_blank",
          rel: "noreferrer",
        }
      : {};

  return (
    <RootTag
      {...rootProps}
      className={["ad-preview-card", className].filter(Boolean).join(" ")}
      style={style}
      data-provider={slot?.provider ?? "placeholder"}
      data-linked={slot?.targetUrl ? "true" : "false"}
    >
      <span className="ad-preview-card__eyebrow">{copy.eyebrow}</span>
      <strong className="ad-preview-card__title">{copy.title}</strong>
      <p className="ad-preview-card__description">{copy.description}</p>
      <div className="ad-preview-card__meta">
        <span>{slot?.sizeLabel ?? "Adaptive"}</span>
        <span>{slot?.fallbackSize ?? "Adaptive"}</span>
      </div>
      <div className="ad-preview-card__footer">
        <span>{slot?.adUnitId || copy.pending}</span>
        <span>{slot?.targetUrl ? copy.visit : copy.pending}</span>
      </div>
    </RootTag>
  );
}

export default AdPreviewCard;
