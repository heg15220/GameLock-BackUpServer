import React, { useMemo } from "react";
import GameCard from "./GameCard";
import SportsCatalogPromoCard from "./SportsCatalogPromoCard";
import { useTranslations } from "../i18n";

const SPORTS_PROMO_ID = "__sports-catalog-promo__";

function buildGridItems(games, showSportsInterstitial) {
  if (!showSportsInterstitial) {
    return games;
  }

  const raceIndex = games.findIndex((game) => game.id === "racing-race2dpro");
  const sunsetIndex = games.findIndex((game) => game.id === "racing-sunset-slipstream");

  if (raceIndex === -1 || sunsetIndex === -1 || raceIndex === sunsetIndex) {
    return games;
  }

  const insertIndex = Math.max(raceIndex, sunsetIndex);
  return [
    ...games.slice(0, insertIndex),
    { id: SPORTS_PROMO_ID, type: "sports-promo" },
    ...games.slice(insertIndex),
  ];
}

function GameGrid({ games, onLaunchGame, showSportsInterstitial = false }) {
  const { t, locale } = useTranslations();
  const gridItems = useMemo(
    () => buildGridItems(games, showSportsInterstitial),
    [games, showSportsInterstitial]
  );

  return (
    <div className="games-grid">
      {gridItems.map((item, index) => (
        item?.type === "sports-promo" ? (
          <SportsCatalogPromoCard
            key={SPORTS_PROMO_ID}
            index={index}
            locale={locale}
          />
        ) : (
          <GameCard
            key={item.id}
            game={item}
            index={index}
            locale={locale}
            t={t}
            onLaunch={onLaunchGame}
          />
        )
      ))}
    </div>
  );
}

export default GameGrid;
