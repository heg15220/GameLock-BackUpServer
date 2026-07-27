// Draft de Leyendas NBA — hoja de estilos embebida (scoped bajo .nbald). Se inyecta
// una sola vez. Identidad: parqué de madera, noche de pabellón, marcador de
// retransmisión, cartas coleccionables y el "dado de década". Todo self-contained.

export const NBALD_CSS = `
.nbald{--court:#b9752e;--night:#0f1420;--panel:#191f2e;--panel2:#212a3d;
  --line:#2f3a52;--ink:#eef2f9;--muted:#93a0b8;--accent:#ff6a2b;--gold:#f4c445;
  --win:#37d67a;--lose:#ef5a6a;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --cond:"Arial Narrow","Roboto Condensed",system-ui,sans-serif;
  color:var(--ink);}
.nbald *{box-sizing:border-box;}
.nbald-stage{background:
  radial-gradient(120% 80% at 50% -10%,#243149 0%,var(--night) 60%);
  border:1px solid var(--line);border-radius:14px;padding:16px;min-height:420px;
  position:relative;overflow:hidden;}
.nbald-stage::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(115deg,transparent 0 34px,rgba(185,117,46,.05) 34px 36px);}
.nbald h3,.nbald h4{margin:0;font-family:var(--cond);letter-spacing:.02em;}
.nbald-eyebrow{font-family:var(--cond);text-transform:uppercase;letter-spacing:.22em;
  font-size:.72rem;color:var(--accent);font-weight:700;}
.nbald-muted{color:var(--muted);}
.nbald-btn{font:inherit;cursor:pointer;border:1px solid var(--line);
  background:var(--panel2);color:var(--ink);border-radius:10px;padding:9px 15px;
  font-weight:600;transition:transform .08s,border-color .15s,background .15s;}
.nbald-btn:hover{border-color:var(--accent);}
.nbald-btn:active{transform:translateY(1px);}
.nbald-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.nbald-btn--primary{background:linear-gradient(180deg,#ff8146,var(--accent));
  border-color:transparent;color:#1a0f07;font-weight:800;}
.nbald-btn--ghost{background:transparent;}
.nbald-btn:disabled{opacity:.4;cursor:not-allowed;}
.nbald-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.nbald-between{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}

/* Menú */
.nbald-hero{display:grid;gap:14px;max-width:560px;margin:6% auto;text-align:center;
  position:relative;z-index:1;}
.nbald-hero h3{font-size:2.4rem;line-height:.98;text-transform:uppercase;
  background:linear-gradient(180deg,#fff,var(--gold));-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.nbald-ball{font-size:2.6rem;filter:drop-shadow(0 6px 14px rgba(255,106,43,.4));}
.nbald-field{display:grid;gap:6px;text-align:left;}
.nbald-field label{font-family:var(--cond);text-transform:uppercase;letter-spacing:.12em;
  font-size:.74rem;color:var(--muted);}
.nbald-input{font:inherit;background:var(--panel);border:1px solid var(--line);
  color:var(--ink);border-radius:10px;padding:11px 13px;width:100%;}
.nbald-input:focus-visible{outline:2px solid var(--accent);outline-offset:1px;}
.nbald-seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;}
.nbald-seg button{font:inherit;background:transparent;color:var(--muted);border:0;
  padding:7px 12px;cursor:pointer;font-weight:700;}
.nbald-seg button[aria-pressed="true"]{background:var(--accent);color:#1a0f07;}

/* Draft */
.nbald-draftbar{display:flex;justify-content:space-between;align-items:center;gap:12px;
  margin-bottom:14px;position:relative;z-index:1;flex-wrap:wrap;}
.nbald-pips{display:flex;gap:5px;}
.nbald-pip{width:22px;height:6px;border-radius:3px;background:var(--line);}
.nbald-pip.is-done{background:var(--gold);}
.nbald-pip.is-now{background:var(--accent);}
.nbald-die-wrap{display:grid;gap:14px;place-items:center;padding:26px 0;position:relative;z-index:1;}
.nbald-die{width:120px;height:120px;border-radius:20px;display:grid;place-items:center;
  background:linear-gradient(150deg,#31405c,#0e1524);
  border:1px solid var(--line);box-shadow:inset 0 2px 0 rgba(255,255,255,.06),0 14px 30px rgba(0,0,0,.4);}
.nbald-die b{font-family:var(--cond);font-size:2.5rem;font-weight:800;letter-spacing:.02em;
  color:var(--gold);}
.nbald-die.is-rolling{animation:nbald-shake .5s linear infinite;}
@keyframes nbald-shake{0%,100%{transform:translateY(0) rotate(-3deg);}
  50%{transform:translateY(-6px) rotate(3deg);}}
.nbald-decadetag{font-family:var(--cond);text-transform:uppercase;letter-spacing:.14em;
  color:var(--muted);}
.nbald-cardgrid{display:grid;gap:11px;position:relative;z-index:1;
  grid-template-columns:repeat(auto-fill,minmax(148px,1fr));}
.nbald-card{position:relative;text-align:left;cursor:pointer;border:1px solid var(--line);
  border-radius:13px;padding:11px 11px 10px;background:
   linear-gradient(160deg,var(--panel2),var(--panel));
  transition:transform .1s,border-color .15s,box-shadow .15s;overflow:hidden;}
.nbald-card::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(120deg,transparent 40%,rgba(255,255,255,.06) 50%,transparent 60%);}
.nbald-card:hover{border-color:var(--accent);transform:translateY(-3px);
  box-shadow:0 12px 24px rgba(0,0,0,.35);}
.nbald-card:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.nbald-card.is-static{cursor:default;}
.nbald-card.is-static:hover{transform:none;border-color:var(--line);box-shadow:none;}
.nbald-card.is-sel{border-color:var(--gold);box-shadow:0 0 0 2px rgba(244,196,69,.4);}
.nbald-ovr{position:absolute;top:9px;right:10px;font-family:var(--cond);font-weight:800;
  font-size:1.5rem;line-height:1;color:var(--gold);}
.nbald-ovr small{display:block;font-size:.5rem;letter-spacing:.16em;color:var(--muted);
  text-align:right;}
.nbald-role{display:inline-block;font-family:var(--cond);text-transform:uppercase;
  letter-spacing:.1em;font-size:.66rem;font-weight:700;color:var(--accent);
  border:1px solid var(--line);border-radius:6px;padding:1px 6px;}
.nbald-cname{font-weight:700;margin:8px 0 2px;font-size:.98rem;line-height:1.05;
  padding-right:38px;}
.nbald-cdecade{font-size:.72rem;color:var(--muted);}
.nbald-cstats{display:flex;gap:9px;margin-top:8px;font-family:var(--mono);font-size:.72rem;
  color:var(--muted);}
.nbald-cstats b{color:var(--ink);font-weight:700;}

/* Plantilla / listas */
.nbald-rosterrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;position:relative;z-index:1;}
.nbald-chip{display:flex;align-items:center;gap:6px;border:1px solid var(--line);
  border-radius:20px;padding:3px 4px 3px 9px;background:var(--panel);font-size:.8rem;}
.nbald-chip b{font-family:var(--mono);color:var(--gold);}
.nbald-chip .r{font-family:var(--cond);font-size:.62rem;letter-spacing:.08em;
  color:var(--accent);border:1px solid var(--line);border-radius:5px;padding:0 4px;}

/* Marcador de partido */
.nbald-scoreboard{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;
  gap:8px;background:linear-gradient(180deg,#0c1220,#131b2c);border:1px solid var(--line);
  border-radius:14px;padding:14px 16px;position:relative;z-index:1;}
.nbald-sb-team{text-align:center;}
.nbald-sb-team .nm{font-family:var(--cond);text-transform:uppercase;letter-spacing:.06em;
  font-weight:700;font-size:1.02rem;}
.nbald-sb-score{font-family:var(--cond);font-weight:800;font-size:3rem;line-height:1;
  color:var(--gold);font-variant-numeric:tabular-nums;}
.nbald-sb-mid{text-align:center;font-family:var(--mono);color:var(--muted);font-size:.8rem;}
.nbald-sb-mid b{display:block;color:var(--accent);font-size:1.1rem;font-family:var(--cond);}
.nbald-feed{margin-top:12px;height:150px;overflow:hidden;border:1px solid var(--line);
  border-radius:12px;background:var(--panel);position:relative;z-index:1;
  display:flex;flex-direction:column;padding:8px 12px;}
.nbald-feed p{margin:0;padding:3px 0;font-size:.86rem;border-bottom:1px dashed rgba(255,255,255,.05);}
.nbald-feed p .sc{font-family:var(--mono);color:var(--muted);font-size:.76rem;margin-right:8px;}
.nbald-feed p.is-3{color:var(--gold);} .nbald-feed p.is-d{color:#7fd7ff;}

/* Tablas */
.nbald-table{width:100%;border-collapse:collapse;font-size:.82rem;position:relative;z-index:1;}
.nbald-table th,.nbald-table td{padding:6px 7px;text-align:right;border-bottom:1px solid var(--line);
  font-variant-numeric:tabular-nums;font-family:var(--mono);}
.nbald-table th{font-family:var(--cond);letter-spacing:.06em;color:var(--muted);
  font-size:.72rem;text-transform:uppercase;}
.nbald-table td.l,.nbald-table th.l{text-align:left;font-family:inherit;}
.nbald-table tr.is-user td{background:rgba(255,106,43,.08);}
.nbald-table tr.mvp td.l{color:var(--gold);font-weight:700;}
.nbald-scroll{overflow-x:auto;}
.nbald-panelbox{border:1px solid var(--line);border-radius:12px;background:var(--panel);
  padding:12px;position:relative;z-index:1;}
.nbald-grid2{display:grid;gap:14px;grid-template-columns:1fr 1fr;}
@media(max-width:640px){.nbald-grid2{grid-template-columns:1fr;}
  .nbald-hero h3{font-size:1.9rem;}}

/* Cuadro de playoffs */
.nbald-bracket{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;position:relative;z-index:1;}
.nbald-round{display:flex;flex-direction:column;gap:10px;min-width:180px;justify-content:space-around;}
.nbald-round h5{margin:0 0 2px;font-family:var(--cond);text-transform:uppercase;
  letter-spacing:.1em;font-size:.72rem;color:var(--muted);}
.nbald-series{border:1px solid var(--line);border-radius:10px;background:var(--panel);
  padding:7px 9px;font-size:.82rem;}
.nbald-series.is-user{border-color:var(--accent);}
.nbald-series .t{display:flex;justify-content:space-between;gap:8px;padding:1px 0;}
.nbald-series .t.w{color:var(--gold);font-weight:700;}
.nbald-series .sd{color:var(--muted);font-family:var(--mono);font-size:.72rem;}

/* Campeón */
.nbald-champ{display:grid;gap:12px;place-items:center;text-align:center;margin:5% auto;
  max-width:520px;position:relative;z-index:1;}
.nbald-trophy{font-size:4.5rem;filter:drop-shadow(0 8px 20px rgba(244,196,69,.5));
  animation:nbald-pop .6s ease;}
@keyframes nbald-pop{0%{transform:scale(.4);opacity:0;}100%{transform:scale(1);opacity:1;}}
.nbald-champ h3{font-size:2.2rem;text-transform:uppercase;color:var(--gold);}

/* Cancha de draft: huecos por posición + banquillo */
.nbald-draftlayout{display:grid;gap:16px;grid-template-columns:minmax(0,360px) 1fr;
  align-items:start;position:relative;z-index:1;}
@media(max-width:720px){.nbald-draftlayout{grid-template-columns:1fr;}}
.nbald-courtwrap{display:grid;gap:10px;}
.nbald-court{position:relative;width:100%;max-width:400px;margin:0 auto;aspect-ratio:5/4.4;
  background:linear-gradient(180deg,#cd9450,#b9752e);border:2px solid #e6b877;
  border-radius:9px 9px 4px 4px;overflow:hidden;box-shadow:inset 0 0 40px rgba(0,0,0,.28);}
.nbald-court::before{content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent 0 26px,rgba(0,0,0,.06) 26px 27px);}
.nbald-key{position:absolute;top:0;left:50%;transform:translateX(-50%);width:32%;height:32%;
  border:2px solid rgba(255,255,255,.55);border-top:0;background:rgba(120,60,10,.18);}
.nbald-3pt{position:absolute;top:-34%;left:50%;transform:translateX(-50%);width:104%;
  aspect-ratio:1;border:2px solid rgba(255,255,255,.42);border-radius:50%;}
.nbald-hoop{position:absolute;top:5%;left:50%;transform:translateX(-50%);width:9%;aspect-ratio:1;
  border:2.5px solid #ff6a2b;border-radius:50%;}
.nbald-spot{position:absolute;transform:translate(-50%,-50%);z-index:2;}
.nbald-hole{width:60px;height:60px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);
  display:grid;place-items:center;text-align:center;color:#fff;font-family:var(--cond);
  text-transform:uppercase;letter-spacing:.04em;font-size:.6rem;font-weight:700;
  background:rgba(60,30,6,.28);line-height:1;}
.nbald-tok{width:76px;border-radius:10px;padding:5px 4px;text-align:center;
  background:linear-gradient(160deg,#212a3d,#141a27);border:1px solid var(--line);
  cursor:default;transition:transform .08s,border-color .15s,box-shadow .15s;}
.nbald-tok .o{font-family:var(--cond);font-weight:800;color:var(--gold);font-size:1.15rem;line-height:1;}
.nbald-tok .rc{font-family:var(--cond);font-size:.54rem;letter-spacing:.08em;color:var(--accent);
  display:block;margin-top:1px;}
.nbald-tok .n{font-size:.62rem;line-height:1.05;margin-top:2px;max-width:70px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-inline:auto;}
.nbald-tok.click{cursor:pointer;}
.nbald-tok.click:hover{border-color:var(--gold);transform:translateY(-2px);
  box-shadow:0 8px 18px rgba(0,0,0,.4);}
.nbald-tok.click:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.nbald-tok.on{border-color:var(--accent);box-shadow:0 0 0 2px rgba(255,106,43,.35);}
.nbald-benchzone{border:1px dashed var(--line);border-radius:10px;padding:9px 10px;background:var(--panel);}
.nbald-benchzone .lbl{font-family:var(--cond);text-transform:uppercase;letter-spacing:.14em;
  font-size:.68rem;color:var(--muted);}
.nbald-benchslots{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.nbald-benchhole{width:76px;height:58px;border-radius:10px;border:2px dashed var(--line);
  display:grid;place-items:center;color:var(--muted);font-size:1.3rem;}

@media(prefers-reduced-motion:reduce){
  .nbald *{animation:none!important;transition:none!important;}}
`;
