import React, { useMemo, useState } from "react";
import { getStrategyIntro } from "./strategyIntros";

const isEsLocale = () =>
  typeof navigator !== "undefined" &&
  String(navigator.language || "").toLowerCase().startsWith("es");

/**
 * StrategyIntroGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a polished pre-game screen for every strategy game. The player reads
 * a natural-language explanation of what the game is about, then taps the CTA
 * to access the existing configuration panels (where they choose their setup
 * and finally press the in-game "Iniciar partida" button to actually play).
 *
 * Falls back to rendering the bare game when no intro copy is registered.
 */
function StrategyIntroGate({ gameId, children }) {
  const locale = useMemo(() => (isEsLocale() ? "es" : "en"), []);
  const intro = useMemo(() => getStrategyIntro(gameId, locale), [gameId, locale]);
  const [opened, setOpened] = useState(false);

  if (!intro || opened) {
    return children;
  }

  const accentStyle = {
    "--strategy-intro-accent": intro.accent,
    "--strategy-intro-accent-soft": intro.accentSoft
  };

  return (
    <div
      className="strategy-intro"
      style={accentStyle}
      role="region"
      aria-label={intro.title}
      data-mobile-stage-overlay="true"
    >
      <div className="strategy-intro-card">
        <div className="strategy-intro-hero" aria-hidden="true">
          <span className="strategy-intro-glyph">{intro.icon}</span>
          <span className="strategy-intro-glow" />
        </div>

        <p className="strategy-intro-eyebrow">{intro.eyebrow}</p>
        <h2 className="strategy-intro-title">{intro.title}</h2>
        <p className="strategy-intro-lead">{intro.lead}</p>

        <div className="strategy-intro-section">
          <h3>{locale === "es" ? "¿En qué consiste?" : "What it is"}</h3>
          <p>{intro.what}</p>
        </div>

        <div className="strategy-intro-section">
          <h3>{locale === "es" ? "Lo que vas a hacer" : "What you'll do"}</h3>
          <ul>
            {intro.bullets.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>

        <p className="strategy-intro-config">{intro.configHint}</p>

        <button
          type="button"
          className="strategy-intro-cta"
          onClick={() => setOpened(true)}
          autoFocus
        >
          <span>{intro.cta}</span>
          <span className="strategy-intro-cta-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

/**
 * HOC: wraps a strategy game component so the intro gate appears first.
 */
export function withStrategyIntro(gameId, GameComponent) {
  const Wrapped = (props) => (
    <StrategyIntroGate gameId={gameId}>
      <GameComponent {...props} />
    </StrategyIntroGate>
  );
  Wrapped.displayName = `withStrategyIntro(${gameId})`;
  return Wrapped;
}

export default StrategyIntroGate;
