import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import digHoleHtml from "../../../arcade/dig-hole-treasure/index.html?raw";
import digHoleCss from "../../../arcade/dig-hole-treasure/styles.css?raw";
import digHoleJs from "../../../arcade/dig-hole-treasure/game.js?raw";
import useEmbeddedMobileShellBodyClassName from "../useEmbeddedMobileShellBodyClassName";

const DIG_HOLE_SCRIPTS = [digHoleJs];
const DIG_HOLE_STYLES = [digHoleCss];

export default function DigHoleTreasureGame() {
  const { bodyClassName, shellRef } = useEmbeddedMobileShellBodyClassName(true);

  return (
    <div ref={shellRef} className="arcade-dig-hole-treasure-shell">
      <StandaloneHtmlGameHost
        html={digHoleHtml}
        scripts={DIG_HOLE_SCRIPTS}
        styles={DIG_HOLE_STYLES}
        bodyClassName={bodyClassName}
        className="arcade-dig-hole-treasure-frame"
      />
    </div>
  );
}
