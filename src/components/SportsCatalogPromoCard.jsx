import React from "react";

function SportsCatalogPromoCard({ index = 0, locale = "es" }) {
  const es = String(locale).toLowerCase().startsWith("es");
  const copy = es
    ? {
        eyebrow: "Susurro de paddock",
        title: "F1 fuera de pista",
        description: "Entre Race 2D Pro y Sunset Slipstream dejamos una pista discreta para quien siga viviendo los fines de semana de carrera.",
        signal: "Trackside",
        domain: "overcutf1.com",
        meta: "Subliminal ad",
        cta: "Entrar",
      }
    : {
        eyebrow: "Trackside whisper",
        title: "F1 off the grid",
        description: "Between Race 2D Pro and Sunset Slipstream there is a quiet cue for players who still live around race weekends.",
        signal: "Pit wall",
        domain: "overcutf1.com",
        meta: "Subliminal ad",
        cta: "Open",
      };

  return (
    <a
      className="game-card catalog-sports-promo-card"
      href="https://overcutf1.com"
      target="_blank"
      rel="noreferrer"
      style={{ "--delay": `${index * 60}ms` }}
      aria-label={`${copy.title} - ${copy.domain}`}
    >
      <div className="catalog-sports-promo-card__visual" aria-hidden="true">
        <span className="catalog-sports-promo-card__signal">{copy.signal}</span>
        <span className="catalog-sports-promo-card__lane is-one" />
        <span className="catalog-sports-promo-card__lane is-two" />
        <span className="catalog-sports-promo-card__lane is-three" />
        <span className="catalog-sports-promo-card__glow" />
      </div>

      <div className="card-body catalog-sports-promo-card__body">
        <div className="card-topline">
          <span className="tag">F1</span>
          <span className="chip">{copy.eyebrow}</span>
        </div>

        <h3>{copy.title}</h3>
        <p className="tagline">{copy.description}</p>

        <div className="card-meta">
          <span>{copy.domain}</span>
          <span>{copy.meta}</span>
        </div>

        <span className="enter-btn catalog-sports-promo-card__cta">{copy.cta}</span>
      </div>
    </a>
  );
}

export default SportsCatalogPromoCard;
