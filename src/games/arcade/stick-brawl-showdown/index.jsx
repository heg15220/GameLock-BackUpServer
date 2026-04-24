import React from "react";
import AdPreviewCard from "../../../components/AdPreviewCard";
import StandaloneHtmlGameHost from "../../../components/StandaloneHtmlGameHost";
import { MOBILE_APP_COMPACT_AD_SLOT } from "../../../config/adPreview";
import fightingGameHtml from "./fighting_game.html?raw";
import useEmbeddedMobileShellBodyClassName from "../useEmbeddedMobileShellBodyClassName";

export default function StickBrawlShowdown() {
  const adLocale = typeof document !== "undefined" && String(document.documentElement?.lang ?? "").toLowerCase().startsWith("en")
    ? "en"
    : "es";
  const { bodyClassName, shellRef } = useEmbeddedMobileShellBodyClassName();

  return (
    <div ref={shellRef} className="mini-game stick-brawl-showdown-game">
      <div className="fighter-stage phaser-canvas-shell stick-brawl-showdown-stage">
        <div className="stick-brawl-showdown-frame-wrap">
          <StandaloneHtmlGameHost
            html={fightingGameHtml}
            bodyClassName={bodyClassName}
            className="stick-brawl-showdown-frame"
          />
        </div>
      </div>
      <div className="stick-brawl-showdown-inline-ad">
        <AdPreviewCard
          slot={MOBILE_APP_COMPACT_AD_SLOT}
          locale={adLocale}
          className="stick-brawl-showdown-inline-ad__card"
        />
      </div>
    </div>
  );
}
