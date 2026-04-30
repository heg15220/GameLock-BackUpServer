import React from "react";
import { getLocalizedGame } from "../i18n";

function GameCard({ game, index, locale, onLaunch, t, promoNote = null }) {
  const lg = getLocalizedGame(game, locale);

  return (
    <article
      className="game-card"
      style={{ "--delay": `${index * 60}ms` }}
    >
      <img
        className="card-image"
        src={lg.image}
        alt={lg.title}
        loading="lazy"
      />

      <div className="card-body">
        <div className="card-topline">
          <span className="tag">{lg.category}</span>
          <span className="chip">{game.sessionTime}</span>
        </div>

        <h3>{lg.title}</h3>
        <p className="catalog-description">{lg.catalogDescription}</p>

        <div className="card-meta">
          <span>{t("difficulty")}: {lg.difficulty}</span>
          <span>{lg.multiplayer}</span>
        </div>

        <button
          type="button"
          className="enter-btn"
          onClick={() => onLaunch(game.id)}
        >
          {t("startGame")}
        </button>

        {promoNote ? (
          <div className="catalog-subliminal catalog-subliminal--sports">
            <strong>
              {promoNote.textPrefix}{" "}
              <a
                href={`https://${promoNote.domain}`}
                target="_blank"
                rel="noreferrer"
              >
                {promoNote.domain}
              </a>
            </strong>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default GameCard;
