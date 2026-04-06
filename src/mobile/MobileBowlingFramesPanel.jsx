import React from "react";

function renderFrameMarks(frame) {
  const symbols = Array.isArray(frame?.symbols) ? frame.symbols.filter(Boolean) : [];
  if (!symbols.length) {
    return "";
  }
  return symbols.join(frame?.frame === 10 ? " " : "");
}

export default function MobileBowlingFramesPanel({ locale, snapshot }) {
  if (!snapshot || snapshot.variant !== "bowling-pro-tour" || !Array.isArray(snapshot.players) || !snapshot.players.length) {
    return null;
  }

  const currentPlayerIndex = Number(snapshot.currentPlayerIndex ?? -1);

  return (
    <section className="mobile-bowling-frames">
      <header className="mobile-bowling-frames__header">
        <strong>{locale === "en" ? "Frame board" : "Marcador por cuadros"}</strong>
        <span>
          {locale === "en" ? "Frame" : "Cuadro"} {Math.min(Number(snapshot.frame ?? 1), 10)}
        </span>
      </header>

      <div className="mobile-bowling-frames__table-wrap">
        <table className="mobile-bowling-frames__table">
          <thead>
            <tr>
              <th>{locale === "en" ? "Player" : "Jugador"}</th>
              {Array.from({ length: 10 }, (_, index) => (
                <th key={`mobile-bowl-head-${index}`}>{index + 1}</th>
              ))}
              <th>{locale === "en" ? "Total" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.players.map((player, playerIndex) => (
              <tr
                key={player.name || `player-${playerIndex}`}
                className={playerIndex === currentPlayerIndex ? "is-active" : ""}
              >
                <th>{player.name}</th>
                {Array.isArray(player.frames) ? player.frames.map((frame, frameIndex) => (
                  <td key={`${player.name}-${frameIndex}`}>
                    <span className="mobile-bowling-frames__marks">{renderFrameMarks(frame) || "\u00A0"}</span>
                    <strong>{player.cumulative?.[frameIndex] ?? ""}</strong>
                  </td>
                )) : null}
                <td className="mobile-bowling-frames__total">{player.total ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
