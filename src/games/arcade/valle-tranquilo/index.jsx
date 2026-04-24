import React from "react";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import valleTranquiloHtml from "../../../arcade/valle-tranquilo/index.html?raw";
import useEmbeddedMobileShellBodyClassName from "../useEmbeddedMobileShellBodyClassName";

export default function ValleTranquiloGame() {
  const { bodyClassName, shellRef } = useEmbeddedMobileShellBodyClassName();

  return (
    <div ref={shellRef} className="arcade-valle-tranquilo-shell">
      <StandaloneHtmlGameHost
        html={valleTranquiloHtml}
        bodyClassName={bodyClassName}
        className="arcade-valle-tranquilo-frame"
      />
    </div>
  );
}
