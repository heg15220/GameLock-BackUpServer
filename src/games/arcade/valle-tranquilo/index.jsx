import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import valleTranquiloHtml from "../../../../public/arcade/valle-tranquilo/index.html?raw";

export default function ValleTranquiloGame() {
  return (
    <div className="arcade-neon-rush-shell">
      <StandaloneHtmlGameHost
        html={valleTranquiloHtml}
        className="arcade-neon-rush-frame"
      />
    </div>
  );
}
