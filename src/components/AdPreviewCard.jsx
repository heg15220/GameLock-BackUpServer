import React from "react";
import { useOptionalConsent } from "./ConsentContext";
import { isAdPreviewEnabledByCode } from "../config/adPreview";

const CARD_COPY = {
  es: {
    eyebrow: "Espacio publicitario",
    title: "Google Ads listo",
    description: "Sustituye este bloque por el enlace, la creatividad o la unidad real cuando llegue la campana.",
    disabledEyebrow: "Publicidad desactivada",
    disabledTitle: "Sin seguimiento publicitario",
    disabledDescription: "Este espacio queda reservado, pero no cargara anuncios ni enlaces publicitarios sin consentimiento.",
    pending: "Enlace pendiente",
    visit: "Abrir destino",
    consentPending: "Consentimiento pendiente",
  },
  en: {
    eyebrow: "Ad slot",
    title: "Google Ads ready",
    description: "Replace this block with the real link, creative, or ad unit when the campaign is ready.",
    disabledEyebrow: "Advertising disabled",
    disabledTitle: "No advertising tracking",
    disabledDescription: "This slot is reserved, but it will not load ads or advertising links without consent.",
    pending: "Pending link",
    visit: "Open target",
    consentPending: "Consent pending",
  },
};

function AdPreviewCard({ slot, locale = "es", className = "", style }) {
  const copy = CARD_COPY[locale] ?? CARD_COPY.es;
  const consent = useOptionalConsent();
  const advertisingAllowed = isAdPreviewEnabledByCode() && Boolean(consent?.advertising);
  const canLink = advertisingAllowed && slot?.targetUrl;
  const RootTag = canLink ? "a" : "article";
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
      data-linked={canLink ? "true" : "false"}
      data-ad-consent={advertisingAllowed ? "granted" : "denied"}
    >
      <span className="ad-preview-card__eyebrow">
        {advertisingAllowed ? copy.eyebrow : copy.disabledEyebrow}
      </span>
      <strong className="ad-preview-card__title">
        {advertisingAllowed ? copy.title : copy.disabledTitle}
      </strong>
      <p className="ad-preview-card__description">
        {advertisingAllowed ? copy.description : copy.disabledDescription}
      </p>
      <div className="ad-preview-card__meta">
        <span>{slot?.sizeLabel ?? "Adaptive"}</span>
        <span>{slot?.fallbackSize ?? "Adaptive"}</span>
      </div>
      <div className="ad-preview-card__footer">
        <span>{slot?.adUnitId || copy.pending}</span>
        <span>{advertisingAllowed ? (slot?.targetUrl ? copy.visit : copy.pending) : copy.consentPending}</span>
      </div>
    </RootTag>
  );
}

export default AdPreviewCard;
