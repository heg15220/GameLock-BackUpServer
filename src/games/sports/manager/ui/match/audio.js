// Modo mánager — sonido del estadio.
//
// Grabaciones reales CC0 de Freesound (ver public/legal/audio-licenses.txt):
// ambiente del Millerntor de St. Pauli y de un estadio noruego, rugidos de gol
// del Millerntor y de Leeuwarden, el «uuuh» de 60.000 personas en el Mineirão,
// cánticos de Brighton, San Siro y Hannover, pitos y abucheos, aplausos y el
// silbato del árbitro. Están recortadas, normalizadas y, los ambientes, con
// bucle sin costura.
//
// El público es el del equipo local: ruge con sus goles, se lamenta con sus
// ocasiones falladas, pita las faltas del rival y canta cuando su equipo
// aprieta. Con los goles del visitante se oye un rumor de decepción y, de
// fondo, la esquina visitante. El sonido nunca bloquea ni tumba el partido:
// si el navegador no deja crear el contexto, el partido sigue mudo.

import bedCalmUrl from '../../assets/sounds/bed-calm.mp3';
import bedLivelyUrl from '../../assets/sounds/bed-lively.mp3';
import bedDrumsUrl from '../../assets/sounds/bed-drums.mp3';
import goal1Url from '../../assets/sounds/goal-1.mp3';
import goal2Url from '../../assets/sounds/goal-2.mp3';
import goal3Url from '../../assets/sounds/goal-3.mp3';
import goal4Url from '../../assets/sounds/goal-4.mp3';
import ooh1Url from '../../assets/sounds/ooh-1.mp3';
import ooh2Url from '../../assets/sounds/ooh-2.mp3';
import ooh3Url from '../../assets/sounds/ooh-3.mp3';
import groanUrl from '../../assets/sounds/groan.mp3';
import chant1Url from '../../assets/sounds/chant-1.mp3';
import chant2Url from '../../assets/sounds/chant-2.mp3';
import chant3Url from '../../assets/sounds/chant-3.mp3';
import boo1Url from '../../assets/sounds/boo-1.mp3';
import boo2Url from '../../assets/sounds/boo-2.mp3';
import applauseUrl from '../../assets/sounds/applause.mp3';
import whistleLongUrl from '../../assets/sounds/whistle-long.mp3';
import whistleShortUrl from '../../assets/sounds/whistle-short.mp3';
import whistleFoulUrl from '../../assets/sounds/whistle-foul.mp3';

const SAMPLES = {
  bedCalm: bedCalmUrl, bedLively: bedLivelyUrl, bedDrums: bedDrumsUrl,
  goal1: goal1Url, goal2: goal2Url, goal3: goal3Url, goal4: goal4Url,
  ooh1: ooh1Url, ooh2: ooh2Url, ooh3: ooh3Url, groan: groanUrl,
  chant1: chant1Url, chant2: chant2Url, chant3: chant3Url,
  boo1: boo1Url, boo2: boo2Url, applause: applauseUrl,
  whistleLong: whistleLongUrl, whistleShort: whistleShortUrl, whistleFoul: whistleFoulUrl,
};

const STORAGE_KEY = 'gamelock-manager-match-sound';
const MASTER = 0.75;

export function readSoundPreference() {
  try { return window.localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}
export function writeSoundPreference(on) {
  try { window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class StadiumAudio {
  constructor({ enabled = true, homeIsUser = true, big = false, neutral = false } = {}) {
    this.enabled = enabled;
    this.ctx = null;
    this.buffers = new Map();
    this.loading = null;
    this.beds = null;
    this.big = big;
    this.neutral = neutral;
    this.homeIsUser = homeIsUser;
    this.lastCue = new Map();
    this.excitement = 0; // 0 calm – 1 roaring
    this.target = 0.2;
    this.playing = false;
    this.nextChantAt = 0;
    this.nextBooAt = 0;
    this.chant = null;
  }

  /** Create the context on a user gesture (the kick-off button). */
  start() {
    if (!this.enabled) return;
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      try { this.ctx = new Ctor(); } catch { this.ctx = null; return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(this.ctx.destination);
      this.crowdBus = this.ctx.createGain();
      this.crowdBus.gain.value = 1;
      this.crowdBus.connect(this.master);
      // Away fans: far corner of the ground, muffled.
      this.farFilter = this.ctx.createBiquadFilter();
      this.farFilter.type = 'lowpass';
      this.farFilter.frequency.value = 1400;
      this.farGain = this.ctx.createGain();
      this.farGain.gain.value = 0.35;
      this.farFilter.connect(this.farGain);
      this.farGain.connect(this.master);
      this.load();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    this.playing = true;
    this.startBeds();
  }

  load() {
    if (this.loading || !this.ctx) return this.loading;
    const ctx = this.ctx;
    // Beds first: they carry the atmosphere from the first second.
    const order = ['bedCalm', 'bedLively', 'whistleLong', 'whistleShort', 'whistleFoul', ...Object.keys(SAMPLES).filter((k) => !['bedCalm', 'bedLively', 'whistleLong', 'whistleShort', 'whistleFoul'].includes(k))];
    this.loading = (async () => {
      for (const name of order) {
        try {
          const res = await fetch(SAMPLES[name]);
          const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buffer);
          if (name === 'bedLively' || name === 'bedCalm' || name === 'bedDrums') this.startBeds();
        } catch { /* stays silent */ }
      }
    })();
    return this.loading;
  }

  startBeds() {
    if (!this.ctx || !this.playing) return;
    this.beds ||= {};
    for (const [name, base] of [['bedCalm', 0.8], ['bedLively', 0.0], ['bedDrums', 0.0]]) {
      if (this.beds[name] || !this.buffers.get(name)) continue;
      if (name === 'bedDrums' && !this.big) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers.get(name);
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = base;
      src.connect(gain);
      gain.connect(this.crowdBus);
      // Start each loop at a random point so the two beds never phase together.
      src.start(0, Math.random() * src.buffer.duration);
      this.beds[name] = { src, gain };
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) { if (on) this.start(); return; }
    this.master.gain.setTargetAtTime(on ? MASTER : 0, this.ctx.currentTime, 0.15);
    if (on && this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
  }

  /** Paused match: the crowd murmurs on, lower. */
  setPaused(paused) {
    if (!this.ctx) return;
    this.crowdBus.gain.setTargetAtTime(paused ? 0.35 : 1, this.ctx.currentTime, 0.4);
  }

  /**
   * Called every frame with the state of play. `homeAttack` 0-1 is how close
   * the home side is to scoring; `awayAttack` the same for the visitors.
   */
  update(dtMs, { homeAttack = 0, awayAttack = 0, minute = 0, diff = 0, owner = null } = {}) {
    if (!this.ctx || !this.enabled || !this.beds) return;
    const now = this.ctx.currentTime;
    // Visitors keeping the ball late on with the lead: the stands whistle them.
    this.awayHold = owner === 'away' ? (this.awayHold || 0) + dtMs : 0;
    if (!this.neutral && this.awayHold > 9000 && minute >= 75 && diff < 0 && this.throttle('timewasting', 25000)) this.play(pick(['boo2', 'boo1']), { gain: 0.42, cap: 6 });
    // The home crowd rises when its team attacks and goes tense when it defends.
    this.target = 0.15 + homeAttack * 0.75 + (diff > 0 ? 0.08 : 0) + (minute > 80 && Math.abs(diff) <= 1 ? 0.12 : 0) - awayAttack * 0.1;
    this.excitement += (this.target - this.excitement) * Math.min(1, dtMs / 900);
    const e = Math.max(0, Math.min(1, this.excitement));
    this.beds.bedCalm?.gain.gain.setTargetAtTime(0.85 - e * 0.45, now, 0.4);
    this.beds.bedLively?.gain.gain.setTargetAtTime(0.1 + e * 0.85, now, 0.4);
    this.beds.bedDrums?.gain.gain.setTargetAtTime(this.big ? 0.12 + e * 0.35 : 0, now, 0.6);
    // Chants when the home side has the ball and the game is alive.
    const clock = performance.now();
    if (clock > this.nextChantAt && !this.chant && homeAttack > 0.25 && !this.neutral) {
      this.nextChantAt = clock + 38000 + Math.random() * 40000;
      this.chant = this.play(pick(['chant1', 'chant2', 'chant3']), { gain: 0.42 + e * 0.25 });
      setTimeout(() => { this.chant = null; }, 18000);
    }
  }

  /** One-shot sample. */
  play(name, { gain = 1, rate = 1, far = false, delay = 0, cap = 0 } = {}) {
    if (!this.ctx || !this.enabled) return null;
    const buffer = this.buffers.get(name);
    if (!buffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(far ? this.farFilter : this.master);
    const at = this.ctx.currentTime + delay;
    src.start(at);
    if (cap > 0) {
      g.gain.setValueAtTime(gain, at + Math.max(0, cap - 0.6));
      g.gain.linearRampToValueAtTime(0.0001, at + cap);
      src.stop(at + cap + 0.05);
    }
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch { /* gone */ } };
    return { src, gain: g };
  }

  throttle(key, ms) {
    const now = performance.now();
    if ((this.lastCue.get(key) || 0) + ms > now) return false;
    this.lastCue.set(key, now);
    return true;
  }

  /** Match moments from the director. */
  cue(type, info = {}) {
    if (!this.ctx || !this.enabled) return;
    const home = info.side === 'home';
    switch (type) {
      case 'whistle-kickoff': if (this.throttle('w', 600)) this.play('whistleLong', { gain: 0.55 }); break;
      case 'whistle-foul': if (this.throttle('w', 400)) this.play('whistleFoul', { gain: 0.5 }); break;
      case 'whistle-period':
        if (this.throttle('w', 900)) { this.play('whistleShort', { gain: 0.55 }); this.play('whistleLong', { gain: 0.55, delay: 0.42 }); this.play('applause', { gain: 0.35, delay: 0.9, cap: 6 }); }
        break;
      case 'whistle-end':
        if (this.throttle('end', 4000)) {
          this.play('whistleShort', { gain: 0.6 }); this.play('whistleShort', { gain: 0.6, delay: 0.38 }); this.play('whistleLong', { gain: 0.6, delay: 0.76 });
          this.play('applause', { gain: 0.55, delay: 1.2 });
        }
        break;
      case 'foul':
        if (this.throttle('w', 400)) this.play('whistleFoul', { gain: 0.5 });
        // The home end whistles every foul by the visitors.
        if (!this.neutral && !home && this.throttle('boo', 9000) && Math.random() < (info.inBox ? 1 : 0.55)) this.play(pick(['boo1', 'boo2']), { gain: 0.38, delay: 0.3, cap: 5 });
        if (!this.neutral && home && info.inBox && this.throttle('boo', 6000)) this.play('boo1', { gain: 0.5, delay: 0.4, cap: 7 });
        break;
      case 'card':
        if (!this.neutral && home && this.throttle('boo', 6000)) this.play(pick(['boo1', 'boo2']), { gain: 0.5, cap: 6 });
        else if (!this.neutral && !home && this.throttle('cheer', 5000)) this.play('applause', { gain: 0.35, cap: 3.5 });
        break;
      case 'goal':
        this.stopChant();
        if (info.disallowed) { this.play(home ? 'goal' + (1 + Math.floor(Math.random() * 4)) : 'groan', { gain: home ? 0.9 : 0.6, cap: home ? 4 : 0 }); break; }
        if (home || this.neutral) {
          this.play(pick(['goal1', 'goal2', 'goal3', 'goal4']), { gain: 1 });
          this.nextChantAt = performance.now() + 9000;
          setTimeout(() => { if (!this.chant) this.chant = this.play(pick(['chant1', 'chant2', 'chant3']), { gain: 0.6 }); setTimeout(() => { this.chant = null; }, 18000); }, 9000);
        } else {
          this.play('groan', { gain: 0.7 });
          this.play(pick(['goal1', 'goal2', 'goal3']), { gain: 0.5, far: true, cap: 7 });
        }
        break;
      case 'var':
        if (!this.neutral) this.play(home ? 'boo1' : 'applause', { gain: 0.6, cap: 7 });
        break;
      case 'miss': {
        const big = info.xg >= 0.18 || info.kind === 'post';
        if (home || this.neutral) {
          if (big && this.throttle('ooh', 2500)) this.play(pick(info.kind === 'post' ? ['ooh2', 'ooh1'] : ['ooh1', 'ooh2', 'ooh3']), { gain: 0.85 });
          else if (this.throttle('ooh', 2500) && Math.random() < 0.6) this.play(pick(['ooh3', 'groan']), { gain: 0.45 });
        } else if (big && this.throttle('relief', 3000)) {
          // The visitors miss a big one: relief and applause for the keeper.
          this.play('applause', { gain: info.kind === 'save' ? 0.5 : 0.3, cap: 4 });
        }
        break;
      }
      case 'shot': if ((home || this.neutral) && this.ctx) { this.excitement = Math.min(1, this.excitement + 0.25); } break;
      case 'corner': if (home && !this.neutral && this.throttle('corner', 8000)) this.play('applause', { gain: 0.28, cap: 3 }); break;
      case 'penalty': this.excitement = 1; break;
      case 'tension': if (home || this.neutral) this.excitement = Math.min(1, this.excitement + 0.18); break;
      default:
    }
  }

  stopChant() {
    if (!this.chant || !this.ctx) return;
    try { this.chant.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); this.chant.src.stop(this.ctx.currentTime + 1); } catch { /* ended */ }
    this.chant = null;
  }

  stop() {
    this.playing = false;
    if (!this.ctx) return;
    try { this.ctx.close(); } catch { /* closed */ }
    this.ctx = null;
    this.beds = null;
  }
}

/**
 * Trophy and season-review moments outside the match: the roar, then the
 * stands singing. Plain audio elements (no context to keep alive), silent when
 * the manager muted the stadium.
 */
export function playCelebration(kind = 'trophy') {
  if (typeof window === 'undefined' || !readSoundPreference()) return;
  try {
    const layers = kind === 'trophy'
      ? [[goal1Url, 0.75, 0], [applauseUrl, 0.5, 2200], [chant2Url, 0.5, 5200]]
      : [[applauseUrl, 0.45, 0], [chant1Url, 0.35, 2500]];
    for (const [url, volume, delay] of layers) {
      setTimeout(() => {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(() => undefined);
      }, delay);
    }
  } catch { /* no audio */ }
}
