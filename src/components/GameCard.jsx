import React from "react";
import { getLocalizedGame } from "../i18n";
import { buildLocalizedGamePath } from "../seo/seoRoutes";

function GameCard({ game, index, locale, onLaunch, t, promoNote = null }) {
  const lg = getLocalizedGame(game, locale);
  const gamePath = buildLocalizedGamePath(locale, game.id);

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

        <a
          className="enter-btn"
          href={gamePath}
          aria-label={`${t("startGame")}: ${lg.title}`}
          onClick={(event) => {
            event.preventDefault();
            onLaunch(game.id);
          }}
        >
          {t("startGame")}
        </a>

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
