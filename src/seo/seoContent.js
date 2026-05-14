import { getLocalizedGame, localizeCategory } from "../i18n";
import { buildAbsoluteUrl, normalizeLocale, SITE_COPY, SITE_NAME } from "./seoConfig";
import { buildLocalizedCategoryPath, buildLocalizedGamePath, buildLocalizedPath } from "./seoRoutes";

const MAX_DESCRIPTION_LENGTH = 158;

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

function truncateSentence(value, maxLength = MAX_DESCRIPTION_LENGTH) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 90 ? lastSpace : maxLength - 1).trim()}.`;
}

export function getHomeSeo(games, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const copy = SITE_COPY[normalizedLocale];
  const homePath = buildLocalizedPath(normalizedLocale, "/");

  return {
    title: copy.homeTitle,
    description: copy.homeDescription,
    canonicalPath: homePath,
    type: "website",
    structuredData: [
      {
        "@type": "WebSite",
        "@id": `${buildAbsoluteUrl(homePath)}#website`,
        name: SITE_NAME,
        url: buildAbsoluteUrl(homePath),
        inLanguage: normalizedLocale,
        description: copy.homeDescription,
      },
      {
        "@type": "Organization",
        "@id": `${buildAbsoluteUrl(homePath)}#organization`,
        name: SITE_NAME,
        url: buildAbsoluteUrl(homePath),
        logo: buildAbsoluteUrl("/favicon.png"),
      },
      {
        "@type": "ItemList",
        "@id": `${buildAbsoluteUrl(homePath)}#game-catalog`,
        name: normalizedLocale === "en" ? "GameLock game catalog" : "Catalogo de juegos GameLock",
        itemListElement: games.map((game, index) => {
          const localizedGame = getLocalizedGame(game, normalizedLocale);
          return {
            "@type": "ListItem",
            position: index + 1,
            url: buildAbsoluteUrl(buildLocalizedGamePath(normalizedLocale, game.id)),
            name: cleanText(localizedGame.title),
          };
        }),
      },
    ],
  };
}

export function getGameSeo(game, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const localizedGame = getLocalizedGame(game, normalizedLocale);
  const gamePath = buildLocalizedGamePath(normalizedLocale, game.id);
  const descriptionSuffix =
    normalizedLocale === "en"
      ? "Play instantly in your browser with no sign-up."
      : "Juega al instante desde el navegador y sin registro.";
  const description = truncateSentence(`${localizedGame.catalogDescription} ${descriptionSuffix}`);
  const title =
    normalizedLocale === "en"
      ? `${localizedGame.title} online | ${SITE_NAME}`
      : `${localizedGame.title} online gratis | ${SITE_NAME}`;
  const imageUrl = localizedGame.image ? buildAbsoluteUrl(localizedGame.image) : buildAbsoluteUrl("/favicon.png");

  return {
    title,
    description,
    canonicalPath: gamePath,
    type: "article",
    imageUrl,
    structuredData: [
      {
        "@type": "VideoGame",
        "@id": `${buildAbsoluteUrl(gamePath)}#game`,
        name: cleanText(localizedGame.title),
        url: buildAbsoluteUrl(gamePath),
        description,
        image: imageUrl,
        genre: cleanText(localizedGame.category),
        gamePlatform: "Web browser",
        operatingSystem: "Any",
        applicationCategory: "Game",
        playMode: cleanText(localizedGame.multiplayer),
        timeRequired: cleanText(game.sessionTime),
        inLanguage: normalizedLocale,
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: buildAbsoluteUrl(buildLocalizedPath(normalizedLocale, "/")),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${buildAbsoluteUrl(gamePath)}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: buildAbsoluteUrl(buildLocalizedPath(normalizedLocale, "/")),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: cleanText(localizedGame.category),
            item: buildAbsoluteUrl(buildLocalizedCategoryPath(normalizedLocale, game.category)),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: cleanText(localizedGame.title),
            item: buildAbsoluteUrl(gamePath),
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${buildAbsoluteUrl(gamePath)}#webpage`,
        name: title,
        url: buildAbsoluteUrl(gamePath),
        description,
        inLanguage: normalizedLocale,
        isPartOf: {
          "@id": `${buildAbsoluteUrl(buildLocalizedPath(normalizedLocale, "/"))}#website`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: imageUrl,
        },
      },
    ],
  };
}

export function getCategorySeo(games, categoryKey, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const categoryPath = buildLocalizedCategoryPath(normalizedLocale, categoryKey);
  const localizedCategory = localizeCategory(categoryKey, normalizedLocale);
  const categoryGames = games.filter((game) => game.category === categoryKey);
  const title =
    normalizedLocale === "en"
      ? `${localizedCategory} browser games | ${SITE_NAME}`
      : `Juegos de ${localizedCategory.toLowerCase()} online gratis | ${SITE_NAME}`;
  const description =
    normalizedLocale === "en"
      ? `Play ${categoryGames.length} free ${localizedCategory.toLowerCase()} games in your browser on GameLock, instantly and with no sign-up.`
      : `Juega ${categoryGames.length} juegos de ${localizedCategory.toLowerCase()} gratis en GameLock, al instante desde el navegador y sin registro.`;

  return {
    title,
    description,
    canonicalPath: categoryPath,
    type: "website",
    structuredData: [
      {
        "@type": "CollectionPage",
        "@id": `${buildAbsoluteUrl(categoryPath)}#collection`,
        name: title,
        url: buildAbsoluteUrl(categoryPath),
        description,
        inLanguage: normalizedLocale,
        isPartOf: {
          "@id": `${buildAbsoluteUrl(buildLocalizedPath(normalizedLocale, "/"))}#website`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${buildAbsoluteUrl(categoryPath)}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: buildAbsoluteUrl(buildLocalizedPath(normalizedLocale, "/")),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: cleanText(localizedCategory),
            item: buildAbsoluteUrl(categoryPath),
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${buildAbsoluteUrl(categoryPath)}#games`,
        name: title,
        itemListElement: categoryGames.map((game, index) => {
          const localizedGame = getLocalizedGame(game, normalizedLocale);
          return {
            "@type": "ListItem",
            position: index + 1,
            url: buildAbsoluteUrl(buildLocalizedGamePath(normalizedLocale, game.id)),
            name: cleanText(localizedGame.title),
          };
        }),
      },
    ],
  };
}

export function buildStructuredDataGraph(items) {
  return {
    "@context": "https://schema.org",
    "@graph": items,
  };
}
