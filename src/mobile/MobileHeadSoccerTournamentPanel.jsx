import React, { useEffect, useMemo, useState } from "react";

function readCharacterButtons(scopeElement) {
  if (!scopeElement) {
    return [];
  }

  const hiddenRoots = scopeElement.querySelectorAll("[data-mobile-stage-hidden='true']");
  const buttonMap = new Map();

  hiddenRoots.forEach((root, rootIndex) => {
    root.querySelectorAll(".head-soccer-character-card").forEach((button, buttonIndex) => {
      const label = button.querySelector("strong")?.textContent?.trim() || button.textContent?.trim();
      if (!label) {
        return;
      }

      const key = button.dataset.mobileHeadSoccerId || button.id || `${rootIndex}-fighter-${buttonIndex}-${label}`;
      buttonMap.set(key, {
        id: key,
        characterId: button.dataset.characterId || null,
        label,
        flag: button.querySelector(".flag")?.textContent?.trim() || "",
        disabled: Boolean(button.disabled),
        target: button,
      });
    });
  });

  return Array.from(buttonMap.values()).slice(0, 8);
}

export default function MobileHeadSoccerTournamentPanel({
  locale,
  scopeElement,
  snapshot,
}) {
  const [fighters, setFighters] = useState([]);

  useEffect(() => {
    if (!scopeElement) {
      return undefined;
    }

    const refresh = () => {
      setFighters(readCharacterButtons(scopeElement));
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(scopeElement, { childList: true, subtree: true, attributes: true });
    const intervalId = window.setInterval(refresh, 300);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, [scopeElement]);

  const isTournamentMode = snapshot?.mode === "tournament";
  const rounds = snapshot?.tournament?.rounds ?? [];
  const summary = snapshot?.tournament?.summary ?? null;
  const currentLabel = snapshot?.tournament?.currentRoundLabel ?? null;
  const selectedCharacterId = snapshot?.tournament?.playerCharacterId ?? null;
  const selectedFighter = useMemo(
    () => fighters.find((fighter) => fighter.characterId === selectedCharacterId) ?? null,
    [fighters, selectedCharacterId]
  );

  if (!isTournamentMode) {
    return null;
  }

  return (
    <section className="mobile-head-soccer-tournament">
      <div className="mobile-head-soccer-tournament__header">
        <strong>{locale === "en" ? "Tournament board" : "Panel de torneo"}</strong>
        {currentLabel ? <span>{currentLabel}</span> : null}
      </div>

      {fighters.length ? (
        <div className="mobile-head-soccer-tournament__block">
          <strong>{locale === "en" ? "Choose player" : "Elegir jugador"}</strong>
          <div className="mobile-head-soccer-tournament__fighters">
            {fighters.map((fighter) => {
              const isSelected = fighter.characterId === selectedCharacterId;
              return (
              <button
                key={fighter.id}
                type="button"
                className={`mobile-head-soccer-tournament__fighter${isSelected ? " is-selected" : ""}`}
                disabled={fighter.disabled}
                onClick={() => {
                  fighter.target.click();
                  setFighters(readCharacterButtons(scopeElement));
                }}
              >
                <span>{fighter.flag || "P1"}</span>
                <strong>{fighter.label}</strong>
              </button>
              );
            })}
          </div>
          {selectedFighter ? (
            <p className="mobile-head-soccer-tournament__note">
              {locale === "en" ? "Selected" : "Seleccionado"}: {selectedFighter.label}
            </p>
          ) : null}
        </div>
      ) : null}

      {rounds.length ? (
        <div className="mobile-head-soccer-tournament__block">
          <strong>{locale === "en" ? "Bracket" : "Cuadro"}</strong>
          <div className="mobile-head-soccer-tournament__bracket">
            {rounds.map((round) => (
              <div key={round.id} className="mobile-head-soccer-tournament__round">
                <h6>{round.label}</h6>
                {round.matches.map((match) => (
                  <article
                    key={match.id}
                    className={`mobile-head-soccer-tournament__match${match.played ? " is-played" : ""}${match.containsPlayer ? " is-player-path" : ""}`}
                  >
                    <span>{match.homeName}</span>
                    <strong>{match.played ? `${match.homeScore}-${match.awayScore}` : "VS"}</strong>
                    <span>{match.awayName}</span>
                  </article>
                ))}
              </div>
            ))}
          </div>
          {summary ? (
            <p
              className="mobile-head-soccer-tournament__summary"
              style={{ color: summary.accent || undefined }}
            >
              {summary.title}: {summary.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
