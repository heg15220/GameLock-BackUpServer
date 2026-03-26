import React from "react";
import fightingGameHtml from "./fighting_game.html?raw";

export default function StickBrawlShowdown() {
  return (
    <div className="mini-game" style={{ padding: 0, overflow: "hidden" }}>
      <iframe
        title="Brawl Sticks"
        srcDoc={fightingGameHtml}
        style={{
          width: "100%",
          height: "860px",
          border: "none",
          display: "block",
          background: "#07070f",
        }}
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      />
    </div>
  );
}

