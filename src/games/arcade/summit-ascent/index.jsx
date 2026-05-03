import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import summitAscentHtml from "../../../arcade/summit-ascent/index.html?raw";
import summitAscentCss from "../../../arcade/summit-ascent/styles.css?raw";
import summitAscentJs from "../../../arcade/summit-ascent/game.js?raw";
import useEmbeddedMobileShellBodyClassName from "../useEmbeddedMobileShellBodyClassName";

const SUMMIT_ASCENT_SCRIPTS = [summitAscentJs];
const SUMMIT_ASCENT_STYLES = [summitAscentCss];

export default function SummitAscentGame() {
  const { bodyClassName, shellRef } = useEmbeddedMobileShellBodyClassName(true);

  return (
    <div ref={shellRef} className="arcade-summit-ascent-shell">
      <StandaloneHtmlGameHost
        html={summitAscentHtml}
        scripts={SUMMIT_ASCENT_SCRIPTS}
        styles={SUMMIT_ASCENT_STYLES}
        bodyClassName={bodyClassName}
        className="arcade-summit-ascent-frame"
      />
    </div>
  );
}
