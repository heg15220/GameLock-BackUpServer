import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import neonRushHtml from "../../../arcade/neon-rush/index.html?raw";
import useEmbeddedMobileShellBodyClassName from "../useEmbeddedMobileShellBodyClassName";

export default function NeonRushGame() {
  const { bodyClassName, shellRef } = useEmbeddedMobileShellBodyClassName();

  return (
    <div ref={shellRef} className="arcade-neon-rush-shell">
      <div className="arcade-neon-rush-stage-fit">
        <StandaloneHtmlGameHost
          html={neonRushHtml}
          bodyClassName={bodyClassName}
          className="arcade-neon-rush-frame"
        />
      </div>
    </div>
  );
}
