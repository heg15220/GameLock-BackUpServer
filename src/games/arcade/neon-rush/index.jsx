import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import neonRushHtml from "../../../../public/arcade/neon-rush/index.html?raw";

export default function NeonRushGame() {
  return (
    <div className="arcade-neon-rush-shell">
      <div className="arcade-neon-rush-stage-fit">
        <StandaloneHtmlGameHost
          html={neonRushHtml}
          className="arcade-neon-rush-frame"
        />
      </div>
    </div>
  );
}
