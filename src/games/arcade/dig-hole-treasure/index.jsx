import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import digHoleHtml from "../../../../public/arcade/dig-hole-treasure/index.html?raw";
import digHoleCss from "../../../../public/arcade/dig-hole-treasure/styles.css?raw";
import digHoleJs from "../../../../public/arcade/dig-hole-treasure/game.js?raw";

const DIG_HOLE_SCRIPTS = [digHoleJs];
const DIG_HOLE_STYLES = [digHoleCss];

export default function DigHoleTreasureGame() {
  return (
    <div className="arcade-neon-rush-shell">
      <StandaloneHtmlGameHost
        html={digHoleHtml}
        scripts={DIG_HOLE_SCRIPTS}
        styles={DIG_HOLE_STYLES}
        className="arcade-neon-rush-frame"
      />
    </div>
  );
}
