import React, { useMemo } from "react";
import { getLocalizedGame, localizeCategory } from "../i18n";
import { buildLocalizedGamePath } from "../seo/seoRoutes";

function SeoGameIndex({ games, locale, onLaunchGame }) {
  const groupedGames = useMemo(() => {
    const groups = new Map();

    games.forEach((game) => {
      const localizedGame = getLocalizedGame(game, locale);
      const category = localizedGame.category || localizeCategory(game.category, locale);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push({ game, localizedGame });
    });

    return [...groups.entries()].map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.localizedGame.title.localeCompare(b.localizedGame.title, locale)),
    }));
  }, [games, locale]);

  return (
    <nav
      className="seo-game-index"
      aria-label={locale === "en" ? "All GameLock games" : "Todos los juegos de GameLock"}
    >
      <h2>{locale === "en" ? "All games" : "Todos los juegos"}</h2>
      <div className="seo-game-index-groups">
        {groupedGames.map((group) => (
          <section className="seo-game-index-group" key={group.category}>
            <h3>{group.category}</h3>
            <ul>
              {group.items.map(({ game, localizedGame }) => (
                <li key={game.id}>
                  <a
                    href={buildLocalizedGamePath(locale, game.id)}
                    onClick={(event) => {
                      event.preventDefault();
                      onLaunchGame(game.id);
                    }}
                  >
                    {localizedGame.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

export default SeoGameIndex;
