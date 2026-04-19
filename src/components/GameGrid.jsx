import React from "react";
import GameCard from "./GameCard";
import { useTranslations } from "../i18n";

function getSportsPromoCopy(locale) {
  const es = String(locale).toLowerCase().startsWith("es");

  return es
    ? {
        textPrefix: "Te gusta la F1? Visita",
        domain: "overcutf1.com",
      }
    : {
        textPrefix: "Like F1? Visit",
        domain: "overcutf1.com",
      };
}

function GameGrid({ games, onLaunchGame, showSportsInterstitial = false }) {
  const { t, locale } = useTranslations();
  const sportsPromoCopy = getSportsPromoCopy(locale);

  return (
    <div className="games-grid">
      {games.map((game, index) => (
        <GameCard
          key={game.id}
          game={game}
          index={index}
          locale={locale}
          t={t}
          onLaunch={onLaunchGame}
          promoNote={
            showSportsInterstitial && game.id === "racing-race2dpro"
              ? sportsPromoCopy
              : null
          }
        />
      ))}
    </div>
  );
}

export default GameGrid;
