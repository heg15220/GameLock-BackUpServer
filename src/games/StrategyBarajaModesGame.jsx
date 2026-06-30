import React, { useMemo, useState } from "react";
import StrategyBriscaDeckGame from "./StrategyBriscaDeckGame";
import StrategyMusDeckGame from "./StrategyMusDeckGame";
import StrategyEscobaDeckGame from "./StrategyEscobaDeckGame";

const isEs = () =>
  typeof navigator !== "undefined" &&
  String(navigator.language || "").toLowerCase().startsWith("es");

const normalizeLocale = (locale) => (locale === "es" || locale === "en" ? locale : null);

const TEXT = {
  es: {
    brisca: "Brisca/Tute",
    mus: "Mus",
    escoba: "Escoba del 15",
    helper: "Selecciona modalidad de baraja",
    modeLabel: "Modo",
    activeMode: "Activo",
    legal:
      "Ilustraciones de la baraja espanola: Basquetteur, «Baraja de 40 cartas», Wikimedia Commons, bajo CC BY-SA 3.0. Recortadas y adaptadas para este juego; las adaptaciones se ofrecen bajo la misma licencia. Repositorio intermediario: mcmd/playingcards.io-spanish.playing.cards (GPL-3.0).",
    author: "Autor",
    original: "Obra original",
    license: "CC BY-SA 3.0",
    repository: "Repositorio",
    repositoryLicense: "GPL-3.0",
  },
  en: {
    brisca: "Brisca/Tute",
    mus: "Mus",
    escoba: "Sweep 15",
    helper: "Select card mode",
    modeLabel: "Mode",
    activeMode: "Active",
    legal:
      "Spanish-deck illustrations: Basquetteur, “Baraja de 40 cartas”, Wikimedia Commons, under CC BY-SA 3.0. Cropped and adapted for this game; adaptations are offered under the same license. Intermediate repository: mcmd/playingcards.io-spanish.playing.cards (GPL-3.0).",
    author: "Author",
    original: "Original work",
    license: "CC BY-SA 3.0",
    repository: "Repository",
    repositoryLicense: "GPL-3.0",
  },
};

function StrategyBarajaModesGame({ locale: localeOverride }) {
  const locale = useMemo(
    () => normalizeLocale(localeOverride) ?? (isEs() ? "es" : "en"),
    [localeOverride]
  );
  const t = TEXT[locale] || TEXT.en;
  const [mode, setMode] = useState("brisca");
  const modeLabel = mode === "mus" ? t.mus : mode === "escoba" ? t.escoba : t.brisca;

  return (
    <div className="strategy-baraja-modes">
      <div className="baraja-mode-switch" aria-label={t.helper}>
        <label htmlFor="baraja-mode-select">
          <span>{t.modeLabel}</span>
          <select
            id="baraja-mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            data-mode-select="baraja"
          >
            <option value="brisca" data-mode="brisca">
              {t.brisca}
            </option>
            <option value="mus" data-mode="mus">
              {t.mus}
            </option>
            <option value="escoba" data-mode="escoba">
              {t.escoba}
            </option>
          </select>
        </label>
        <p className="baraja-mode-active">
          {t.activeMode}: <strong>{modeLabel}</strong>
        </p>
      </div>
      {mode === "mus" ? (
        <StrategyMusDeckGame locale={locale} />
      ) : mode === "escoba" ? (
        <StrategyEscobaDeckGame locale={locale} />
      ) : (
        <StrategyBriscaDeckGame locale={locale} />
      )}
      <footer className="baraja-legal-footer">
        <p>{t.legal}</p>
        <nav aria-label={t.legal}>
          <a href="https://commons.wikimedia.org/wiki/User:Basquetteur" target="_blank" rel="noreferrer">
            {t.author}: Basquetteur
          </a>
          <a href="https://commons.wikimedia.org/wiki/File:Baraja_de_40_cartas.png" target="_blank" rel="noreferrer">
            {t.original}
          </a>
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="license noreferrer">
            {t.license}
          </a>
          <a href="https://github.com/mcmd/playingcards.io-spanish.playing.cards" target="_blank" rel="noreferrer">
            {t.repository}
          </a>
          <a href="https://github.com/mcmd/playingcards.io-spanish.playing.cards/blob/master/LICENSE" target="_blank" rel="license noreferrer">
            {t.repositoryLicense}
          </a>
        </nav>
      </footer>
    </div>
  );
}

export default StrategyBarajaModesGame;
