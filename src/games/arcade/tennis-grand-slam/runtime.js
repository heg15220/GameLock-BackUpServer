// Tennis runtime: the game loop, the point state machine, human input, and the
// AI's turn at the ball.
//
// Player 0 is the human on the near half (side = -1); player 1 is the AI on the
// far half (side = +1).
import { createBall, cloneBall, integrate, speed } from "../shared/racket3d/physics/aero";
import {
  TENNIS_ENV,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  BALL_RADIUS,
  createWorld,
  isInCourt,
  inServiceBox,
  solveShot,
  predictShot,
  spinFor,
  SURFACES,
} from "./physics";
import {
  createAiPlayer,
  onOpponentContact,
  refineRead,
  buildMatchContext,
  decideStroke,
  decideServe,
  paceFor,
  STROKES,
} from "./ai";
import { resolveParams } from "../shared/racket3d/adaptiveAi";
import { createMatch, awardPoint, scoreLabels, pointContext, matchSummary } from "./rules";
import { PLAYERS } from "./players";
import {
  createTournament,
  humanOpponent,
  reportHumanResult,
  save as saveTournamentState,
} from "./tournament";
import { drawScene } from "./scene";

const SIM_DT = 1 / 240;
const MAX_FRAME = 0.05;

const RACKET_REACH = 1.45;
const CONTACT_MIN_Y = 0.16;
const CONTACT_MAX_Y = 2.35;
const HUMAN_SPEED = 5.9;
const HUMAN_ACCEL = 22;
const MAX_CHARGE = 0.62;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const STROKE_KEYS = {
  Space: "topspin",
  KeyJ: "topspin",
  KeyK: "flat",
  KeyL: "slice",
  KeyU: "drop",
  KeyI: "lob",
};

export class TennisRuntime {
  constructor({ canvas, locale = "es", onSnapshot, onFullscreen }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale;
    this.onSnapshot = onSnapshot;
    this.onFullscreen = onFullscreen;

    this.vW = canvas.clientWidth || 960;
    this.vH = canvas.clientHeight || 540;

    this.keys = new Set();
    this.virtualKeys = new Set();
    this.raf = 0;
    this.last = 0;
    this.paused = false;

    this.screen = "menu";
    this.config = { surface: "hard", tier: "pro", setsToWin: 2, mode: "exhibition" };
    this.tournament = null;
    this.match = null;
    this.point = null;
    this.ai = null;
    this.opponentInfo = null;
    this.banner = null;
    this.bannerTimer = 0;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    this.handleResize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
  }

  handleResize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 960;
    const h = rect.height || 540;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.vW = w;
    this.vH = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  isDown(code) {
    return this.keys.has(code) || this.virtualKeys.has(code);
  }

  onKeyDown(e) {
    if (e.repeat) return;
    const code = e.code;
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)
    ) {
      e.preventDefault();
    }
    this.keys.add(code);
    this.handlePress(code);
  }

  onKeyUp(e) {
    this.keys.delete(e.code);
    this.handleRelease(e.code);
  }

  setVirtualKey(code, down) {
    if (down) {
      if (this.virtualKeys.has(code)) return;
      this.virtualKeys.add(code);
      this.handlePress(code);
    } else {
      if (!this.virtualKeys.has(code)) return;
      this.virtualKeys.delete(code);
      this.handleRelease(code);
    }
  }

  pressVirtualKey(code) {
    this.setVirtualKey(code, true);
    // Give charge-based strokes a usable default when they arrive as a tap.
    setTimeout(() => this.setVirtualKey(code, false), 90);
  }

  handlePress(code) {
    if (code === "KeyF") {
      this.onFullscreen?.();
      return;
    }
    if (code === "KeyP" && this.screen === "play") {
      this.paused = !this.paused;
      this.emit();
      return;
    }
    if (code === "KeyR") {
      this.restart();
      return;
    }
    if (code === "Escape") {
      this.screen = "menu";
      this.emit();
      return;
    }

    if (this.screen !== "play") {
      this.handleMenuPress(code);
      return;
    }

    if (this.paused) return;

    const strokeKind = STROKE_KEYS[code];
    if (strokeKind) this.beginSwing(strokeKind);
  }

  handleRelease(code) {
    if (this.screen !== "play" || this.paused) return;
    const strokeKind = STROKE_KEYS[code];
    if (strokeKind && this.swing && this.swing.kind === strokeKind) {
      this.releaseSwing();
    }
  }

  handleMenuPress(code) {
    if (this.screen === "menu") {
      if (code === "Digit1" || code === "Enter") this.screen = "setup-exhibition";
      if (code === "Digit2") this.screen = "setup-tournament";
      this.emit();
      return;
    }
    if (this.screen === "setup-exhibition" || this.screen === "setup-tournament") {
      const surfaces = ["hard", "clay", "grass"];
      const tiers = ["rookie", "amateur", "pro", "elite", "legend"];
      if (code === "ArrowLeft" || code === "ArrowRight") {
        const dir = code === "ArrowRight" ? 1 : -1;
        const i = surfaces.indexOf(this.config.surface);
        this.config.surface = surfaces[(i + dir + surfaces.length) % surfaces.length];
      }
      if (code === "ArrowUp" || code === "ArrowDown") {
        const dir = code === "ArrowUp" ? 1 : -1;
        const i = tiers.indexOf(this.config.tier);
        this.config.tier = tiers[clamp(i + dir, 0, tiers.length - 1)];
      }
      if (code === "KeyS") {
        this.config.setsToWin = this.config.setsToWin === 2 ? 3 : 2;
      }
      if (code === "Enter" || code === "Space") {
        if (this.screen === "setup-exhibition") this.startExhibition();
        else this.startTournament();
      }
      this.emit();
      return;
    }
    if (this.screen === "bracket") {
      if (code === "Enter" || code === "Space") this.startTournamentMatch();
      this.emit();
      return;
    }
    if (this.screen === "match-over") {
      if (code === "Enter" || code === "Space") this.afterMatch();
      this.emit();
    }
  }

  // ── Match setup ───────────────────────────────────────────────────────────

  startExhibition() {
    this.config.mode = "exhibition";
    this.opponentInfo = this.pickExhibitionOpponent();
    this.beginMatch({
      opponent: this.opponentInfo,
      tierId: this.config.tier,
      surface: this.config.surface,
      setsToWin: this.config.setsToWin,
    });
  }

  // The exhibition rival is drawn from the same field, at a rating that matches
  // the tier you asked for, so "Legend" always means a top-of-the-draw name.
  pickExhibitionOpponent() {
    const tiers = ["rookie", "amateur", "pro", "elite", "legend"];
    const band = tiers.indexOf(this.config.tier) / (tiers.length - 1);
    const sorted = [...PLAYERS].sort((a, b) => a.rating - b.rating);
    const index = Math.round(band * (sorted.length - 1));
    return { ...sorted[index], tier: this.config.tier };
  }

  startTournament() {
    this.config.mode = "tournament";
    this.tournament = createTournament({
      surface: this.config.surface,
      tierCeiling: this.config.tier,
      setsToWin: this.config.setsToWin,
      humanName: this.locale === "es" ? "Tú" : "You",
    });
    this.screen = "bracket";
    this.saveTournament();
    this.emit();
  }

  resumeTournament(saved) {
    this.tournament = saved;
    this.config.surface = saved.surface;
    this.config.tier = saved.tierCeiling;
    this.config.setsToWin = saved.setsToWin;
    this.config.mode = "tournament";
    this.screen = saved.status === "playing" ? "bracket" : "tournament-over";
    this.emit();
  }

  saveTournament() {
    if (!this.tournament) return;
    saveTournamentState(this.tournament);
  }

  startTournamentMatch() {
    const rival = humanOpponent(this.tournament);
    if (!rival) return;
    this.opponentInfo = rival;
    this.beginMatch({
      opponent: rival,
      tierId: rival.tier ?? this.config.tier,
      surface: this.tournament.surface,
      setsToWin: this.tournament.setsToWin,
    });
  }

  beginMatch({ opponent, tierId, surface, setsToWin }) {
    this.world = createWorld(surface);
    this.surfaceId = surface;
    this.match = createMatch({ setsToWin, server: 0 });
    this.ai = createAiPlayer({ tierId, styleId: opponent.style ?? "allcourt", side: 1 });
    this.opponentInfo = opponent;

    this.players = [
      { side: -1, x: 0, z: -COURT_HALF_LENGTH - 0.5, vx: 0, vz: 0, human: true, fatigue: 0 },
      { side: 1, x: 0, z: COURT_HALF_LENGTH + 0.5, vx: 0, vz: 0, human: false, fatigue: 0 },
    ];

    this.screen = "play";
    this.paused = false;
    this.rallyCount = 0;
    this.recentPoints = [];
    this.setupPoint();
    this.emit();
  }

  restart() {
    if (this.screen === "play" && this.match) {
      this.beginMatch({
        opponent: this.opponentInfo,
        tierId: this.ai?.tier?.id ?? this.config.tier,
        surface: this.surfaceId,
        setsToWin: this.match.setsToWin,
      });
      return;
    }
    this.screen = "menu";
    this.emit();
  }

  // ── Point lifecycle ───────────────────────────────────────────────────────

  setupPoint() {
    const m = this.match;
    const server = m.server;
    // Games alternate between the deuce (right) and ad (left) court.
    const pointsPlayed = m.points[0] + m.points[1];
    const court = pointsPlayed % 2 === 0 ? "deuce" : "ad";

    const serverSide = server === 0 ? -1 : 1;
    const xSign = court === "deuce" ? 1 : -1;
    // Server stands just behind the baseline, on the correct side of the centre
    // mark; the ball is struck across the diagonal.
    const serveX = xSign * serverSide * COURT_HALF_WIDTH * 0.42;

    this.players[server].x = serveX;
    this.players[server].z = serverSide * (COURT_HALF_LENGTH + 0.45);
    this.players[server].vx = 0;
    this.players[server].vz = 0;

    const receiver = 1 - server;
    const recvSide = receiver === 0 ? -1 : 1;
    this.players[receiver].x = -xSign * recvSide * COURT_HALF_WIDTH * 0.55;
    this.players[receiver].z = recvSide * (COURT_HALF_LENGTH + 0.7);
    this.players[receiver].vx = 0;
    this.players[receiver].vz = 0;

    this.point = {
      phase: "serve",
      server,
      court,
      firstServe: true,
      faults: 0,
      lastHitter: null,
      bouncedOnce: false,
      bounceSide: 0,
      shots: 0,
      serveTimer: server === 0 ? 0 : 0.9, // the AI takes a beat before serving
      tossY: 0,
      over: false,
    };
    this.ball = null;
    this.swing = null;
    this.pendingSwing = null;
    this.aiSwingTimer = null;
    this.rallyCount = 0;
    this.emit();
  }

  // Everything the AI's layer B needs to read the moment.
  matchContextFor(playerIndex) {
    const m = this.match;
    const ctx = pointContext(m, playerIndex);
    const self = this.players[playerIndex];
    const opp = this.players[1 - playerIndex];

    const restZ = self.side * COURT_HALF_LENGTH * 1.02;
    const selfOffBalance = clamp(
      Math.hypot(self.x, self.z - restZ) / 6.5,
      0,
      1
    );
    const oppRestZ = opp.side * COURT_HALF_LENGTH * 1.02;
    const oppOffBalance = clamp(Math.hypot(opp.x, opp.z - oppRestZ) / 6.5, 0, 1);

    const incoming = this.ball
      ? {
          incomingSpeed: clamp(speed(this.ball) / 42, 0, 1),
          incomingSpin: clamp(Math.abs(this.ball.wx) / 200, 0, 1),
          incomingDepth: clamp(
            1 - Math.abs(Math.abs(this.ball.z) - COURT_HALF_LENGTH) / COURT_HALF_LENGTH,
            0,
            1
          ),
          contactHeight: clamp(this.ball.y / 1.6, 0, 1),
        }
      : {};

    const wins = this.recentPoints.filter((w) => w === playerIndex).length;
    const momentum = this.recentPoints.length
      ? (2 * wins) / this.recentPoints.length - 1
      : 0;

    return buildMatchContext({
      ...ctx,
      rallyLength: this.rallyCount,
      fatigue: self.fatigue,
      momentum,
      selfOffBalance,
      oppOffBalance,
      ...incoming,
    });
  }

  endPoint(winner, reason) {
    if (this.point.over) return;
    this.point.over = true;
    this.point.phase = "over";
    this.point.reason = reason;

    this.recentPoints.push(winner);
    if (this.recentPoints.length > 6) this.recentPoints.shift();

    // Fatigue grows with the rally you just played, and the AI's stamina decides
    // how much that costs it.
    const load = clamp(this.rallyCount / 22, 0, 1) * 0.05 + 0.008;
    this.players[0].fatigue = clamp(this.players[0].fatigue + load, 0, 1);
    this.players[1].fatigue = clamp(this.players[1].fatigue + load, 0, 1);

    this.match = awardPoint(this.match, winner);
    this.banner = reason;
    this.bannerTimer = 1.4;

    if (this.match.winner != null) {
      this.screen = "match-over";
      if (this.config.mode === "tournament") this.finishTournamentMatch();
    }
    this.emit();
  }

  finishTournamentMatch() {
    const humanWon = this.match.winner === 0;
    reportHumanResult(this.tournament, humanWon, matchSummary(this.match).join(" "));
    saveTournamentState(this.tournament);
  }

  afterMatch() {
    if (this.config.mode !== "tournament") {
      this.screen = "menu";
      return;
    }
    if (this.tournament.status === "playing") {
      this.screen = "bracket";
    } else {
      this.screen = "tournament-over";
    }
  }

  // ── Serving ───────────────────────────────────────────────────────────────

  humanServe(power, aimX) {
    const p = this.players[0];
    const contact = { x: p.x, y: 2.25, z: p.z };
    const box = this.point.court;
    const targetSide = 1;
    const xSign = box === "deuce" ? -1 : 1; // diagonal into the receiver's box
    const target = {
      x: xSign * COURT_HALF_WIDTH * (0.18 + 0.62 * Math.abs(aimX)) * (aimX === 0 ? 0.55 : Math.sign(aimX) === xSign ? 1 : 0.35),
      z: targetSide * 4.6,
    };
    // A second serve gives up pace for spin and margin — the same trade the AI makes.
    const first = this.point.firstServe;
    const pace = paceFor(first ? 0.55 + 0.45 * power : 0.35 + 0.30 * power);
    const spinMag = first ? 0.25 + 0.25 * (1 - power) : 0.75;
    const spin = spinFor(first ? "flat" : "kick", spinMag, 1);

    const launch = solveShot({ from: contact, target, speed: pace, spin, branch: "low" });
    if (!launch) return;

    this.launchBall(contact, launch, 0);
    this.point.phase = "rally";
  }

  aiServe() {
    const p = this.players[1];
    const contact = { x: p.x, y: 2.3, z: p.z };
    const params = resolveParams(this.ai.tier, this.matchContextFor(1));
    this.ai.params = params;

    const serve = decideServe({
      contact,
      side: 1,
      court: this.point.court,
      world: this.world,
      params,
      style: this.ai.style,
      first: this.point.firstServe,
    });
    if (!serve) return;

    this.launchBall(contact, serve.launch, 1);
    this.point.phase = "rally";
    this.lastAiShot = serve;
  }

  launchBall(contact, launch, hitter) {
    this.ball = createBall({
      x: contact.x,
      y: contact.y,
      z: contact.z,
      vx: launch.vx,
      vy: launch.vy,
      vz: launch.vz,
      wx: launch.wx,
      wy: launch.wy,
      wz: launch.wz,
    });
    this.point.lastHitter = hitter;
    this.point.bouncedOnce = false;
    this.point.bounceSide = 0;
    this.point.shots += 1;
    this.rallyCount += 1;
    this.trail = [];

    // The receiver reads the ball now: this is the moment the AI's reaction
    // clock and its (fallible) prediction start.
    if (hitter === 0) this.aiReadBall();
  }

  aiReadBall() {
    if (!this.ball) return;
    const prediction = predictShot(
      {
        vx: this.ball.vx, vy: this.ball.vy, vz: this.ball.vz,
        wx: this.ball.wx, wy: this.ball.wy, wz: this.ball.wz,
      },
      { x: this.ball.x, y: this.ball.y, z: this.ball.z },
      this.world
    );
    this.aiPrediction = prediction;
    onOpponentContact(this.ai, {
      trueLanding: { x: prediction.x, z: prediction.z },
      timeToArrive: prediction.time,
      matchContext: this.matchContextFor(1),
    });
    this.aiSwingTimer = null;
  }

  fault() {
    this.point.faults += 1;
    if (this.point.faults >= 2) {
      this.endPoint(1 - this.point.server, "double-fault");
      return;
    }
    this.point.firstServe = false;
    this.point.phase = "serve";
    this.point.serveTimer = this.point.server === 0 ? 0.35 : 1.0;
    this.ball = null;
    this.banner = "fault";
    this.bannerTimer = 1.0;
    this.emit();
  }

  // ── Human stroke ──────────────────────────────────────────────────────────

  beginSwing(kind) {
    if (this.point.over) return;
    if (this.point.phase === "serve" && this.point.server !== 0) return;
    if (this.point.phase === "rally" && this.point.lastHitter === 0) {
      // You cannot hit your own ball twice.
      if (!this.point.bouncedOnce || this.point.bounceSide === -1) return;
    }
    this.swing = { kind, charge: 0 };
  }

  releaseSwing() {
    if (!this.swing) return;
    const power = clamp(this.swing.charge / MAX_CHARGE, 0.18, 1);
    const kind = this.swing.kind;
    this.swing = null;

    const aimX = this.lateralInput();
    const aimDepth = this.depthInput();

    if (this.point.phase === "serve" && this.point.server === 0) {
      this.humanServe(power, aimX);
      return;
    }

    // Arm the swing briefly: releasing a hair early should still connect.
    this.pendingSwing = { kind, power, aimX, aimDepth, ttl: 0.22 };
  }

  lateralInput() {
    let v = 0;
    if (this.isDown("ArrowLeft") || this.isDown("KeyA")) v -= 1;
    if (this.isDown("ArrowRight") || this.isDown("KeyD")) v += 1;
    return v;
  }

  depthInput() {
    let v = 0;
    if (this.isDown("ArrowUp") || this.isDown("KeyW")) v += 1;
    if (this.isDown("ArrowDown") || this.isDown("KeyS")) v -= 1;
    return v;
  }

  canContact(player) {
    if (!this.ball) return false;
    const b = this.ball;
    // The ball must be on your half of the net.
    if (b.z * player.side < -0.35) return false;
    if (b.y < CONTACT_MIN_Y || b.y > CONTACT_MAX_Y) return false;
    const d = Math.hypot(b.x - player.x, b.z - player.z);
    return d <= RACKET_REACH;
  }

  executeHumanStroke(swing) {
    const p = this.players[0];
    const b = this.ball;
    const stroke = STROKES[swing.kind] ?? STROKES.topspin;

    // Contact where the ball actually is, not where the player is standing.
    const contact = { x: b.x, y: clamp(b.y, 0.35, 2.1), z: b.z };

    // Aim comes from the direction you were holding at contact: this is the same
    // model on the keyboard and on the mobile D-pad.
    const targetX = swing.aimX * COURT_HALF_WIDTH * 0.86;
    const depthT = 0.62 + 0.30 * swing.aimDepth;
    const targetZ = COURT_HALF_LENGTH * clamp(depthT, 0.22, 0.94);

    const target =
      stroke.kind === "drop"
        ? { x: targetX * 0.5, z: COURT_HALF_LENGTH * 0.26 }
        : { x: targetX, z: targetZ };

    const pace = paceFor(clamp(stroke.power * (0.55 + 0.55 * swing.power), 0.15, 1.1));
    const spinMag = stroke.spin * (0.55 + 0.45 * swing.power);
    const spin = spinFor(stroke.kind, spinMag, 1);

    const launch = solveShot({
      from: contact,
      target,
      speed: pace,
      spin,
      branch: stroke.branch,
    });
    if (!launch) return;

    this.launchBall(contact, launch, 0);
    p.lastStroke = stroke.kind;
    this.lastHumanStroke = stroke.kind;
  }

  executeAiStroke() {
    const p = this.players[1];
    const b = this.ball;
    const contact = { x: b.x, y: clamp(b.y, 0.35, 2.1), z: b.z };

    const params = resolveParams(this.ai.tier, this.matchContextFor(1));
    this.ai.params = params;

    const shot = decideStroke({
      contact,
      self: { x: p.x, z: p.z },
      opponent: { x: this.players[0].x, z: this.players[0].z },
      side: 1,
      world: this.world,
      params,
      style: this.ai.style,
      restZ: COURT_HALF_LENGTH * 1.02,
    });
    if (!shot) return;

    this.launchBall(contact, shot.launch, 1);
    this.lastAiShot = shot;
  }

  // ── Simulation ────────────────────────────────────────────────────────────

  step(dt) {
    if (this.screen !== "play" || this.paused) return;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner = null;
    }

    if (this.point.over) {
      this.point.overTimer = (this.point.overTimer ?? 0) + dt;
      if (this.point.overTimer > 1.5 && this.match.winner == null) {
        this.setupPoint();
      }
      return;
    }

    if (this.swing) this.swing.charge = Math.min(MAX_CHARGE, this.swing.charge + dt);

    this.moveHuman(dt);
    this.moveAi(dt);

    if (this.point.phase === "serve") {
      this.stepServe(dt);
      return;
    }

    this.stepBall(dt);
    this.tryContacts(dt);
  }

  stepServe(dt) {
    this.point.serveTimer -= dt;
    if (this.point.server === 1 && this.point.serveTimer <= 0) {
      this.aiServe();
    }
    // The human's serve fires from releaseSwing(); the toss is cosmetic and
    // driven by the charge.
    this.point.tossY = this.swing ? 1.2 + (this.swing.charge / MAX_CHARGE) * 1.4 : 0;
  }

  moveHuman(dt) {
    const p = this.players[0];
    let ix = this.lateralInput();
    let iz = this.depthInput();

    // While charging a stroke, the direction keys are aiming, not running — the
    // player plants their feet.
    if (this.swing) {
      ix *= 0.25;
      iz *= 0.25;
    }

    const len = Math.hypot(ix, iz) || 1;
    const tvx = (ix / len) * HUMAN_SPEED * Math.min(1, Math.hypot(ix, iz));
    const tvz = (iz / len) * HUMAN_SPEED * Math.min(1, Math.hypot(ix, iz));

    p.vx += clamp(tvx - p.vx, -HUMAN_ACCEL * dt, HUMAN_ACCEL * dt);
    p.vz += clamp(tvz - p.vz, -HUMAN_ACCEL * dt, HUMAN_ACCEL * dt);

    p.x = clamp(p.x + p.vx * dt, -COURT_HALF_WIDTH - 3.5, COURT_HALF_WIDTH + 3.5);
    p.z = clamp(p.z + p.vz * dt, -COURT_HALF_LENGTH - 4.5, -0.8);
  }

  moveAi(dt) {
    const p = this.players[1];
    const ai = this.ai;
    const params = ai.params ?? resolveParams(ai.tier, this.matchContextFor(1));

    let targetX;
    let targetZ;

    const restZ = COURT_HALF_LENGTH * 1.02 * (ai.style.restDepth ?? 1);

    if (this.point.phase === "serve" && this.point.server === 1) {
      // Already positioned by setupPoint.
      return;
    }

    if (this.ball && this.point.lastHitter === 0 && ai.committed) {
      if (ai.reactionTimer > 0) {
        ai.reactionTimer -= dt;
        targetX = p.x;
        targetZ = p.z;
      } else {
        // Keep re-reading: the error shrinks as the ball closes, so a weak tier
        // visibly corrects late.
        if (this.aiPrediction) {
          const remaining = Math.max(0.05, this.aiPrediction.time - (this.point.airTime ?? 0));
          refineRead(ai, {
            trueLanding: { x: this.aiPrediction.x, z: this.aiPrediction.z },
            timeToArrive: remaining,
          });
        }
        targetX = ai.committed.x;
        // Stand back off the bounce point to take the ball on the rise/fall.
        targetZ = clamp(ai.committed.z + 1.1, 1.0, COURT_HALF_LENGTH + 3.5);
      }
    } else {
      targetX = 0;
      targetZ = restZ;
    }

    const dx = targetX - p.x;
    const dz = targetZ - p.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.05) {
      const tvx = (dx / dist) * params.footSpeed;
      const tvz = (dz / dist) * params.footSpeed;
      p.vx += clamp(tvx - p.vx, -params.accel * dt, params.accel * dt);
      p.vz += clamp(tvz - p.vz, -params.accel * dt, params.accel * dt);
    } else {
      p.vx *= 0.8;
      p.vz *= 0.8;
    }

    p.x = clamp(p.x + p.vx * dt, -COURT_HALF_WIDTH - 3.5, COURT_HALF_WIDTH + 3.5);
    p.z = clamp(p.z + p.vz * dt, 0.8, COURT_HALF_LENGTH + 4.5);
  }

  stepBall(dt) {
    if (!this.ball) return;
    this.point.airTime = (this.point.airTime ?? 0) + dt;

    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(SIM_DT, remaining);
      remaining -= h;

      const prev = cloneBall(this.ball);
      integrate(this.ball, h, TENNIS_ENV);
      const event = this.world.resolve(this.ball, prev);

      if (event === "net") {
        this.onNet();
        return;
      }
      if (event === "bounce") {
        this.onBounce();
        if (this.point.over) return;
      }
    }

    this.trail = this.trail ?? [];
    this.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z });
    if (this.trail.length > 26) this.trail.shift();

    // Ball has gone dead behind a player without anyone reaching it.
    if (Math.abs(this.ball.z) > COURT_HALF_LENGTH + 9 || this.ball.y > 22) {
      const hitter = this.point.lastHitter;
      this.endPoint(1 - hitter, "out");
    }
  }

  onNet() {
    const hitter = this.point.lastHitter;
    if (this.point.shots === 1 && this.point.phase === "rally" && this.wasServe()) {
      this.fault();
      return;
    }
    this.endPoint(1 - hitter, "net");
  }

  wasServe() {
    return this.point.shots === 1;
  }

  onBounce() {
    const b = this.ball;
    const hitter = this.point.lastHitter;
    const landedSide = Math.sign(b.z) || 1;

    // Serve adjudication.
    if (this.wasServe()) {
      const serverSide = this.point.server === 0 ? -1 : 1;
      if (!inServiceBox(b.x, b.z, serverSide, this.point.court)) {
        this.fault();
        return;
      }
      this.point.bouncedOnce = true;
      this.point.bounceSide = landedSide;
      this.point.firstServe = true;
      this.point.faults = 0;
      return;
    }

    if (!this.point.bouncedOnce) {
      // First bounce after a groundstroke.
      if (!isInCourt(b.x, b.z)) {
        this.endPoint(1 - hitter, "out");
        return;
      }
      const hitterSide = this.players[hitter].side;
      if (landedSide === hitterSide) {
        // Landed on your own side: it never crossed.  Point to the opponent.
        this.endPoint(1 - hitter, "out");
        return;
      }
      this.point.bouncedOnce = true;
      this.point.bounceSide = landedSide;
      return;
    }

    // Second bounce with nobody having returned it: the hitter wins.
    this.endPoint(hitter, "winner");
  }

  tryContacts(dt) {
    if (!this.ball || this.point.over) return;

    // Human.
    if (this.pendingSwing) {
      this.pendingSwing.ttl -= dt;
      const mine = this.point.lastHitter !== 0 || this.point.bounceSide === 1;
      if (mine && this.canContact(this.players[0])) {
        const swing = this.pendingSwing;
        this.pendingSwing = null;
        this.executeHumanStroke(swing);
        return;
      }
      if (this.pendingSwing.ttl <= 0) this.pendingSwing = null;
    }

    // AI.  It may only play a ball that is on its half and that it has not just
    // hit itself.
    if (this.point.lastHitter === 0 && this.canContact(this.players[1])) {
      if (this.aiSwingTimer == null) {
        // Timing jitter: this is what produces mistimed AI shots, and it comes
        // straight from the tier (widened by pressure and fatigue).
        const params = this.ai.params ?? resolveParams(this.ai.tier, this.matchContextFor(1));
        this.aiSwingTimer = Math.max(0, params.timingJitter / 1000) * (Math.random() - 0.35);
      }
      this.aiSwingTimer -= dt;
      if (this.aiSwingTimer <= 0) {
        this.executeAiStroke();
        this.aiSwingTimer = null;
      }
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(MAX_FRAME, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.render();
  }

  advanceTime(ms) {
    const total = Math.max(0, ms) / 1000;
    let left = total;
    while (left > 0) {
      const h = Math.min(1 / 60, left);
      this.step(h);
      left -= h;
    }
    this.render();
  }

  render() {
    drawScene(this.ctx, this, this.vW, this.vH);
  }

  emit() {
    if (!this.onSnapshot) return;
    const labels = this.match ? scoreLabels(this.match) : ["0", "0"];
    this.onSnapshot({
      mode: "sports-tennis-grand-slam",
      screen: this.screen,
      paused: this.paused,
      surface: this.surfaceId ?? this.config.surface,
      tier: this.ai?.tier?.id ?? this.config.tier,
      opponent: this.opponentInfo?.name ?? null,
      opponentStyle: this.opponentInfo?.style ?? null,
      points: labels,
      games: this.match ? [...this.match.games] : [0, 0],
      sets: this.match ? [...this.match.sets] : [0, 0],
      server: this.match?.server ?? 0,
      serving: this.point?.phase === "serve",
      firstServe: this.point?.firstServe ?? true,
      setsPlayed: this.match ? matchSummary(this.match) : [],
      winner: this.match?.winner ?? null,
      tournamentRound: this.tournament?.round ?? null,
      tournamentStatus: this.tournament?.status ?? null,
      rally: this.rallyCount ?? 0,
    });
  }
}

export { SURFACES, BALL_RADIUS };
