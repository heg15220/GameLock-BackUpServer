// Pádel Pro Arena — sonido híbrido.
//
// Las mecánicas son muestras: un impacto es un cuerpo real golpeando otro, y el
// sonido que define al pádel —la bola contra la pared de cristal— no se
// consigue con osciladores. Son grabaciones CC0 de BigSoundBank (ver
// public/legal/audio-licenses.txt), recortadas a un solo golpe: 64 KB en total.
//
// La red sigue sintetizada a propósito: es un thud sordo y amortiguado, no hay
// grabación CC0 de "bola muriendo en la cinta", y la síntesis hace bien
// exactamente eso. Además cada señal conserva su versión sintética como
// respaldo, así que el juego suena desde el primer golpe mientras las muestras
// se decodifican de fondo. El sonido nunca bloquea ni tumba el partido.
//
// Duraciones: cada fichero ya está cortado a su gesto (impactos de 0,3 s,
// aplauso de punto 1,9 s, ovación de juego 3,5 s) y CUE_MS pone además el techo
// en reproducción, porque un peloteo encadena golpes muy seguidos y un impacto
// que se alargue se convierte en barro.

import paddleUrl from "./assets/sounds/paddle.mp3";
import smashUrl from "./assets/sounds/smash.mp3";
import floorUrl from "./assets/sounds/floor.mp3";
import glassUrl from "./assets/sounds/glass.mp3";
import clapUrl from "./assets/sounds/clap.mp3";
import whistleUrl from "./assets/sounds/whistle.mp3";

const MASTER_VOLUME = 0.5;

const SAMPLES = {
  paddle: { url: paddleUrl, gain: 0.9 },
  smash: { url: smashUrl, gain: 1 },
  floor: { url: floorUrl, gain: 0.7 },
  glass: { url: glassUrl, gain: 0.8 },
  clap: { url: clapUrl, gain: 0.55 },
  whistle: { url: whistleUrl, gain: 0.6 },
};

// Techo por situación de juego.
export const CUE_MS = {
  paddle: 300,
  smash: 360,
  floor: 300,
  // Un golpe seco contra el cristal, no la resonancia de un panel entero: la
  // bola toca y sigue, y el peloteo no se detiene a escucharlo.
  glass: 180,
  clap: 1600, // el público reconoce el punto y se aparta
  whistle: 850,
};
const CUE_RELEASE = 0.06;

// Intervalo mínimo entre dos disparos de la MISMA señal. Es una red de
// seguridad de mezcla, no una regla de juego: dos golpes de pala separados por
// menos de esto son físicamente imposibles en un peloteo (serían 20 por
// segundo), así que lo único que puede suprimir es un duplicado. Señales
// distintas —pala y cristal, por ejemplo— no se estorban entre sí: son dos
// sucesos reales y deben sonar los dos.
const RETRIGGER_MS = { paddle: 50, smash: 50, floor: 50, glass: 50 };

export default class PadelAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.buffers = new Map();
    this.loading = null;
    this.lastFiredAt = new Map();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }
  getEnabled() {
    return this.enabled;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!this.context) {
      try {
        this.context = new Ctor();
      } catch {
        // El navegador puede negarse (Chrome limita los contextos por página).
        // Quedarse mudo es aceptable; tumbar el partido no.
        this.context = null;
        return null;
      }
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.context.destination);
      this._loadSamples();
    }
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => undefined);
    }
    return this.context;
  }

  // Se decodifican de fondo; hasta que llegan, cada señal usa su síntesis.
  _loadSamples() {
    if (this.loading || !this.context) return this.loading;
    const ctx = this.context;
    this.loading = Promise.all(
      Object.entries(SAMPLES).map(async ([name, def]) => {
        try {
          const res = await fetch(def.url);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* se queda en síntesis */
        }
      }),
    );
    return this.loading;
  }

  // Dispara una muestra acotada a su gesto. Devuelve false si aún no está
  // decodificada, para que la señal caiga en su versión sintética.
  _sample(name, { gain = 1, rate = 1 } = {}) {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if (!ctx || !this.master || !buffer) return false;
    // Duplicado a quemarropa: se descarta, pero se devuelve true para que la
    // señal no caiga en su versión sintética y suene precisamente lo que
    // estamos evitando.
    if (this._isRetrigger(name, ctx.currentTime * 1000)) return true;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const env = ctx.createGain();
    const level = (SAMPLES[name]?.gain ?? 1) * gain;
    src.connect(env);
    env.connect(this.master);

    const now = ctx.currentTime;
    const natural = buffer.duration / (rate || 1);
    const cap = (CUE_MS[name] ?? 0) / 1000;
    const len = cap > 0 ? Math.min(cap, natural) : natural;

    env.gain.setValueAtTime(level, now);
    if (len < natural - 0.005) {
      const release = Math.min(CUE_RELEASE, len * 0.4);
      env.gain.setValueAtTime(level, now + len - release);
      env.gain.linearRampToValueAtTime(0.0001, now + len);
    }
    src.start(now);
    src.stop(now + len + 0.02);
    src.onended = () => {
      src.disconnect();
      env.disconnect();
    };
    return true;
  }

  // ¿Esta señal se acaba de disparar? Expuesto para poder fijarlo en tests.
  _isRetrigger(name, nowMs) {
    const gap = RETRIGGER_MS[name];
    if (!gap) return false;
    const last = this.lastFiredAt.get(name);
    if (last != null && nowMs - last < gap) return true;
    this.lastFiredAt.set(name, nowMs);
    return false;
  }

  // Envelope de tono simple.
  _tone(freq, { type = "sine", dur = 0.12, gain = 0.5, decay = 0.1, sweep = 0 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), now + dur);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(dur, decay));
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + Math.max(dur, decay) + 0.02);
  }

  // Ráfaga de ruido filtrado (bote de cristal, aplausos, arena).
  _noise({ dur = 0.15, gain = 0.4, type = "bandpass", freq = 1200, q = 1 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // Un peloteo encadena golpes muy seguidos; sin variación de tono la misma
  // muestra repetida suena a ametralladora en vez de a partido.
  _vary(spread = 0.08) {
    return 1 - spread + Math.random() * spread * 2;
  }

  // ─── Mecánicas ─────────────────────────────────────────────────────────────
  paddle() {
    if (this._sample("paddle", { rate: this._vary() })) return;
    this._tone(220, { type: "square", dur: 0.06, gain: 0.5, sweep: -120 });
    this._noise({ dur: 0.05, gain: 0.25, freq: 2600, q: 0.7 });
  }
  smash() {
    // Algo más grave que el golpe plano: pesa más.
    if (this._sample("smash", { rate: 0.88 * this._vary(0.05) })) return;
    this._tone(180, { type: "square", dur: 0.09, gain: 0.6, sweep: -90 });
    this._noise({ dur: 0.07, gain: 0.35, freq: 3200, q: 0.6 });
  }
  floor() {
    if (this._sample("floor", { rate: this._vary() })) return;
    this._tone(140, { type: "sine", dur: 0.1, gain: 0.42, sweep: -60 });
  }
  glass() {
    if (this._sample("glass", { rate: this._vary(0.06) })) return;
    this._noise({ dur: 0.22, gain: 0.34, type: "bandpass", freq: 3400, q: 6 });
    this._tone(2100, { type: "sine", dur: 0.12, gain: 0.18, sweep: 400 });
  }
  net() {
    // Sintetizada a propósito: un thud sordo y amortiguado sin equivalente CC0.
    this._tone(90, { type: "sine", dur: 0.14, gain: 0.4, sweep: -30 });
  }

  // ─── Situaciones ───────────────────────────────────────────────────────────
  // El público solo aplaude. Nada de vítores ni gritos: la grabación es de
  // palmas a secas, y todo punto se reconoce igual, cierre juego o no.
  clap() {
    if (this._sample("clap")) return;
    this._noise({ dur: 0.5, gain: 0.3, type: "lowpass", freq: 1800, q: 0.3 });
  }
  whistle() {
    if (this._sample("whistle")) return;
    this._tone(2000, { type: "sine", dur: 0.18, gain: 0.3, sweep: 300 });
  }

  dispose() {
    if (this.context && this.context.state !== "closed") {
      this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.master = null;
    this.buffers.clear();
    this.loading = null;
    this.lastFiredAt.clear();
  }
}
