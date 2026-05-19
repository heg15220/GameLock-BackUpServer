import React, { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 960;
const HEIGHT = 520;
const DT = 1 / 60;
const DT_MS = 1000 / 60;
const TURN_MS = 30000;
const MOVE_BUDGET = 260;
const MOVE_SPEED = 128;
const AIR_CONTROL = 58;
const JUMP_SPEED = 350;
const GRAVITY = 840;
const THROW_BASE = 200;
const THROW_SCALE = 400;
const BLAST_RADIUS = 108;
const BLAST_DAMAGE = 90;
const MAX_JUMP_UP = 76;
const MAX_JUMP_GAP_UP = 210;
const MAX_JUMP_GAP_FLAT = 250;
const MAX_JUMP_GAP_DOWN = 340;
const AIM_MIN = 0;
const AIM_MAX = 359;
const CANNON_USE_RANGE = 36;
const CANNON_SPEED_BONUS = 170;
const CANNON_WIND_FACTOR = 0.22;
const CANNON_MIN_TARGET_DISTANCE = 240;
const AI_RECENT_HISTORY = 14;
const TERRITORY_WAR_AUDIO_MUTED_KEY = "territoryWarAudioMuted";

function readStoredTerritoryWarMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TERRITORY_WAR_AUDIO_MUTED_KEY) === "1";
}

function createTerritoryWarAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let lastEvent = null;
  let eventCount = 0;
  let muted = Boolean(initialMuted);

  const applyMuteState = () => {
    if (master) master.gain.value = muted ? 0 : 0.2;
  };

  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      applyMuteState();
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const unlock = () => {
    const audioContext = ensure();
    if (!audioContext) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    unlocked = true;
  };

  const tone = (time, frequency, duration, options = {}) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = options.type || "triangle";
    osc.frequency.setValueAtTime(frequency, time);
    if (options.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), time + duration);
    filter.type = options.filterType || "lowpass";
    filter.frequency.value = options.filter || 1600;
    filter.Q.value = options.q || 0.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain || 0.06), time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.04);
  };

  const noise = (time, duration, options = {}) => {
    if (!ctx || !master) return;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) {
      const fade = 1 - i / size;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    source.buffer = buffer;
    filter.type = options.filterType || "bandpass";
    filter.frequency.value = options.filter || 900;
    filter.Q.value = options.q || 1;
    gain.gain.setValueAtTime(options.gain || 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(time);
    source.stop(time + duration + 0.02);
  };

  const play = (eventName, options = {}) => {
    const audioContext = ensure();
    lastEvent = {
      name: eventName,
      team: options.team || null,
      source: options.source || null,
      power: typeof options.power === "number" ? Math.round(options.power * 100) / 100 : null,
      at: Date.now(),
    };
    eventCount += 1;
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    const now = audioContext.currentTime + 0.01;
    switch (eventName) {
      case "battleStart":
        tone(now, 220, 0.11, { type: "square", gain: 0.045, to: 330, filter: 900 });
        tone(now + 0.12, 330, 0.12, { type: "square", gain: 0.045, to: 440, filter: 1100 });
        break;
      case "turnRed":
      case "turnBlue":
        tone(now, eventName === "turnRed" ? 440 : 330, 0.08, { type: "triangle", gain: 0.045 });
        tone(now + 0.08, eventName === "turnRed" ? 660 : 494, 0.1, { type: "triangle", gain: 0.045 });
        break;
      case "jump":
        tone(now, 160, 0.14, { type: "square", gain: 0.04, to: 310, filter: 1000 });
        break;
      case "charge":
        tone(now, 120, 0.18, { type: "sawtooth", gain: 0.035, to: 260, filter: 850 });
        break;
      case "cancel":
        tone(now, 240, 0.08, { type: "square", gain: 0.035, to: 120, filter: 700 });
        break;
      case "toggleCannon":
        tone(now, 180, 0.08, { type: "square", gain: 0.045, to: 260, filter: 700 });
        noise(now + 0.02, 0.06, { gain: 0.035, filter: 500 });
        break;
      case "throw":
        noise(now, 0.08, { gain: 0.06, filter: 1000 });
        tone(now, 170, 0.13, { type: "triangle", gain: 0.045, to: 90, filter: 900 });
        break;
      case "cannon":
        noise(now, 0.14, { gain: 0.11, filter: 360 });
        tone(now, 82, 0.24, { type: "sawtooth", gain: 0.09, to: 45, filter: 500 });
        break;
      case "bounce":
        tone(now, 210, 0.06, { type: "triangle", gain: 0.035, to: 130, filter: 700 });
        break;
      case "explosion":
        noise(now, 0.36, { gain: 0.13, filter: 260, q: 0.7 });
        tone(now, 70, 0.32, { type: "sawtooth", gain: 0.1, to: 36, filter: 420 });
        break;
      case "hit":
        noise(now, 0.12, { gain: 0.075, filter: 1600 });
        tone(now, 130, 0.12, { type: "square", gain: 0.045, to: 80, filter: 900 });
        break;
      case "ko":
        tone(now, 260, 0.12, { type: "square", gain: 0.055, to: 130, filter: 900 });
        tone(now + 0.12, 130, 0.16, { type: "square", gain: 0.05, to: 72, filter: 700 });
        break;
      case "victory":
        [330, 440, 554, 740].forEach((note, index) => tone(now + index * 0.1, note, 0.16, { gain: 0.055, to: note * 1.02 }));
        break;
      case "defeat":
        [294, 220, 165].forEach((note, index) => tone(now + index * 0.12, note, 0.2, { type: "sine", gain: 0.05, to: note * 0.82 }));
        break;
      case "pause":
        tone(now, 420, 0.08, { type: "square", gain: 0.035, to: 210, filter: 800 });
        break;
      default:
        break;
    }
  };

  return {
    unlock,
    play,
    setMuted: (nextMuted) => {
      muted = Boolean(nextMuted);
      if (typeof window !== "undefined") window.localStorage.setItem(TERRITORY_WAR_AUDIO_MUTED_KEY, muted ? "1" : "0");
      applyMuteState();
      return muted;
    },
    toggleMuted: () => {
      muted = !muted;
      if (typeof window !== "undefined") window.localStorage.setItem(TERRITORY_WAR_AUDIO_MUTED_KEY, muted ? "1" : "0");
      applyMuteState();
      return muted;
    },
    snapshot: () => ({
      unlocked,
      available: Boolean(ctx),
      contextState: ctx?.state || "idle",
      muted,
      lastEvent,
      eventCount,
    }),
    dispose: () => {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      master = null;
    },
  };
}

function emitWarSfx(state, eventName, options = {}) {
  state.audioLastEvent = {
    name: eventName,
    team: options.team || state.turn?.team || null,
    frame: state.frame || 0,
  };
  state.audio?.play(eventName, options);
}

function syncCanvasResolution(canvas, ctx) {
  if (!canvas || !ctx || typeof window === "undefined") return;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || canvas.clientWidth || WIDTH);
  const cssHeight = Math.max(1, rect.height || canvas.clientHeight || HEIGHT);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelWidth / WIDTH, 0, 0, pixelHeight / HEIGHT, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

const TERRAIN_PROFILE = {
  ground: { mobility: 0.86, cover: 0.66, stability: 0.94 },
  stone:  { mobility: 0.72, cover: 0.95, stability: 0.98 },
  log:    { mobility: 0.97, cover: 0.52, stability: 0.75 },
};

const TEAM = {
  red:  { color: "#dc2626", dark: "#7f1d1d", light: "#fca5a5", cpu: false, label: "Escuadron Atlas" },
  blue: { color: "#1d4ed8", dark: "#1e3a8a", light: "#93c5fd", cpu: true,  label: "Legion Sigma" },
};
const NAMES = {
  red:  ["Axel","Noa","Drake","Vela","Kiro","Maya"],
  blue: ["Nyx","Orion","Khan","Iris","Zero","Lyra"],
};

const MAPS = [
  {
    id:"wasteland", name:"Wasteland", water:false,
    skyColors:["#5fa8e8","#b8d8ff"], mountainColor:"#7a9ab8",
    groundColor:"#2d7a3a", dirtColor:"#6b4226",
    platforms:[
      {x:-40,y:420,w:310,h:160,type:"ground"},
      {x:240,y:355,w:160,h:20,type:"log"},
      {x:375,y:290,w:160,h:20,type:"log"},
      {x:510,y:230,w:160,h:20,type:"log"},
      {x:645,y:285,w:160,h:20,type:"log"},
      {x:680,y:420,w:320,h:160,type:"ground"},
      {x:760,y:358,w:80,h:62,type:"stone"},
      {x:848,y:300,w:80,h:120,type:"stone"},
    ],
    red: [{x:50,y:420},{x:100,y:420},{x:150,y:420},{x:200,y:420},{x:250,y:420},{x:270,y:355}],
    blue:[{x:730,y:420},{x:780,y:420},{x:820,y:420},{x:870,y:420},{x:790,y:358},{x:868,y:300}],
    clouds:[{x:110,y:108,w:175,h:56},{x:380,y:140,w:205,h:65},{x:700,y:100,w:162,h:52}],
  },
  {
    id:"archipelago", name:"Archipelago", water:true,
    skyColors:["#4a9fe0","#b8e0ff"], mountainColor:"#5a8ab0",
    groundColor:"#16a34a", dirtColor:"#5f4020",
    platforms:[
      {x:-30,y:400,w:260,h:160,type:"ground"},
      {x:200,y:370,w:140,h:20,type:"log"},
      {x:60,y:338,w:100,h:62,type:"stone"},
      {x:370,y:340,w:220,h:20,type:"log"},
      {x:620,y:370,w:140,h:20,type:"log"},
      {x:700,y:400,w:300,h:160,type:"ground"},
      {x:800,y:338,w:100,h:62,type:"stone"},
      {x:858,y:280,w:82,h:120,type:"stone"},
    ],
    red: [{x:40,y:400},{x:85,y:400},{x:130,y:400},{x:175,y:400},{x:100,y:338},{x:215,y:370}],
    blue:[{x:750,y:400},{x:795,y:400},{x:840,y:400},{x:885,y:400},{x:820,y:338},{x:643,y:370}],
    clouds:[{x:80,y:95,w:160,h:50},{x:360,y:115,w:230,h:72},{x:720,y:90,w:170,h:54}],
  },
  {
    id:"mesa", name:"Mesa", water:false,
    skyColors:["#e8b86d","#ffe8b0"], mountainColor:"#c08840",
    groundColor:"#b45309", dirtColor:"#92400e",
    platforms:[
      {x:-40,y:260,w:290,h:300,type:"ground"},
      {x:210,y:320,w:100,h:60,type:"stone"},
      {x:270,y:460,w:140,h:100,type:"ground"},
      {x:305,y:390,w:130,h:20,type:"log"},
      {x:415,y:340,w:130,h:20,type:"log"},
      {x:525,y:390,w:130,h:20,type:"log"},
      {x:550,y:460,w:140,h:100,type:"ground"},
      {x:650,y:320,w:100,h:60,type:"stone"},
      {x:710,y:260,w:290,h:300,type:"ground"},
    ],
    red: [{x:40,y:260},{x:90,y:260},{x:140,y:260},{x:190,y:260},{x:240,y:260},{x:225,y:320}],
    blue:[{x:760,y:260},{x:810,y:260},{x:860,y:260},{x:910,y:260},{x:718,y:260},{x:670,y:320}],
    clouds:[{x:150,y:120,w:160,h:50},{x:390,y:100,w:200,h:60},{x:680,y:130,w:155,h:48}],
  },
  {
    id:"graveyard", name:"Graveyard", water:false,
    skyColors:["#6b7280","#a8b4c0"], mountainColor:"#7a8090",
    groundColor:"#374151", dirtColor:"#2d2420",
    platforms:[
      {x:-40,y:430,w:270,h:130,type:"ground"},
      {x:200,y:370,w:120,h:60,type:"stone"},
      {x:295,y:310,w:120,h:60,type:"stone"},
      {x:390,y:255,w:180,h:215,type:"stone"},
      {x:545,y:310,w:120,h:60,type:"stone"},
      {x:640,y:370,w:120,h:60,type:"stone"},
      {x:690,y:430,w:310,h:130,type:"ground"},
    ],
    red: [{x:40,y:430},{x:85,y:430},{x:130,y:430},{x:175,y:430},{x:215,y:370},{x:308,y:310}],
    blue:[{x:740,y:430},{x:790,y:430},{x:840,y:430},{x:890,y:430},{x:652,y:370},{x:558,y:310}],
    clouds:[{x:90,y:100,w:150,h:45},{x:340,y:125,w:190,h:58},{x:680,y:95,w:168,h:52}],
  },
  {
    id:"canyon", name:"Canyon", water:false,
    skyColors:["#87ceeb","#d4eeff"], mountainColor:"#a09070",
    groundColor:"#8B6914", dirtColor:"#6b4a10",
    platforms:[
      {x:-40,y:220,w:280,h:360,type:"ground"},
      {x:200,y:340,w:110,h:40,type:"stone"},
      {x:270,y:280,w:180,h:20,type:"log"},
      {x:390,y:360,w:180,h:20,type:"log"},
      {x:260,y:420,w:440,h:140,type:"ground"},
      {x:650,y:340,w:110,h:40,type:"stone"},
      {x:720,y:220,w:280,h:360,type:"ground"},
    ],
    red: [{x:40,y:220},{x:90,y:220},{x:140,y:220},{x:190,y:220},{x:240,y:220},{x:215,y:340}],
    blue:[{x:770,y:220},{x:820,y:220},{x:870,y:220},{x:920,y:220},{x:730,y:220},{x:665,y:340}],
    clouds:[{x:100,y:85,w:160,h:48},{x:380,y:105,w:200,h:62},{x:700,y:80,w:158,h:50}],
  },
  {
    id:"skyline", name:"Skyline Ramps", water:false,
    skyColors:["#8ebce6","#e8f4ff"], mountainColor:"#8aa2ba",
    groundColor:"#3b7f54", dirtColor:"#5d3f28",
    platforms:[
      {x:-40,y:420,w:280,h:160,type:"ground"},
      {x:130,y:304,w:100,h:52,type:"stone"},
      {x:200,y:356,w:130,h:20,type:"log"},
      {x:330,y:332,w:150,h:20,type:"log"},
      {x:470,y:278,w:150,h:20,type:"log"},
      {x:620,y:332,w:150,h:20,type:"log"},
      {x:730,y:304,w:100,h:52,type:"stone"},
      {x:410,y:420,w:140,h:100,type:"ground"},
      {x:700,y:420,w:300,h:160,type:"ground"},
    ],
    red:[{x:42,y:420},{x:88,y:420},{x:134,y:420},{x:180,y:420},{x:232,y:356},{x:176,y:304}],
    blue:[{x:760,y:420},{x:808,y:420},{x:856,y:420},{x:904,y:420},{x:650,y:332},{x:780,y:304}],
    clouds:[{x:110,y:90,w:165,h:52},{x:400,y:118,w:230,h:68},{x:735,y:92,w:168,h:54}],
  },
  {
    id:"sunken-harbor", name:"Sunken Harbor", water:true,
    skyColors:["#4f9ccf","#c6e8ff"], mountainColor:"#6a90ad",
    groundColor:"#1f8a5b", dirtColor:"#584226",
    platforms:[
      {x:-40,y:395,w:250,h:165,type:"ground"},
      {x:150,y:340,w:110,h:55,type:"stone"},
      {x:250,y:312,w:130,h:20,type:"log"},
      {x:380,y:350,w:190,h:20,type:"log"},
      {x:430,y:286,w:120,h:64,type:"stone"},
      {x:560,y:312,w:130,h:20,type:"log"},
      {x:700,y:340,w:110,h:55,type:"stone"},
      {x:850,y:300,w:80,h:95,type:"stone"},
      {x:730,y:395,w:270,h:165,type:"ground"},
    ],
    red:[{x:40,y:395},{x:84,y:395},{x:128,y:395},{x:172,y:395},{x:192,y:340},{x:296,y:312}],
    blue:[{x:760,y:395},{x:804,y:395},{x:848,y:395},{x:892,y:395},{x:725,y:340},{x:878,y:300}],
    clouds:[{x:90,y:98,w:162,h:50},{x:360,y:122,w:210,h:66},{x:710,y:92,w:170,h:52}],
  },
  {
    id:"forge", name:"Iron Forge", water:false,
    skyColors:["#d9a26a","#ffe0b3"], mountainColor:"#a06f45",
    groundColor:"#855d16", dirtColor:"#6a4713",
    platforms:[
      {x:-40,y:420,w:280,h:160,type:"ground"},
      {x:180,y:360,w:110,h:60,type:"stone"},
      {x:280,y:330,w:150,h:20,type:"log"},
      {x:430,y:286,w:100,h:44,type:"stone"},
      {x:520,y:330,w:150,h:20,type:"log"},
      {x:670,y:360,w:110,h:60,type:"stone"},
      {x:330,y:420,w:300,h:100,type:"ground"},
      {x:700,y:420,w:300,h:160,type:"ground"},
    ],
    red:[{x:44,y:420},{x:92,y:420},{x:140,y:420},{x:188,y:420},{x:212,y:360},{x:314,y:330}],
    blue:[{x:754,y:420},{x:804,y:420},{x:854,y:420},{x:904,y:420},{x:702,y:360},{x:644,y:330}],
    clouds:[{x:120,y:102,w:160,h:48},{x:380,y:120,w:206,h:62},{x:690,y:96,w:170,h:52}],
  },
  {
    id:"overgrowth", name:"Overgrowth", water:false,
    skyColors:["#86d49d","#e5ffe8"], mountainColor:"#6da37c",
    groundColor:"#2d7c3c", dirtColor:"#4f3c22",
    platforms:[
      {x:-40,y:428,w:270,h:152,type:"ground"},
      {x:170,y:372,w:120,h:56,type:"stone"},
      {x:250,y:334,w:140,h:20,type:"log"},
      {x:360,y:292,w:140,h:20,type:"log"},
      {x:500,y:248,w:140,h:20,type:"log"},
      {x:640,y:304,w:140,h:20,type:"log"},
      {x:730,y:360,w:110,h:68,type:"stone"},
      {x:420,y:428,w:180,h:100,type:"ground"},
      {x:700,y:428,w:300,h:152,type:"ground"},
    ],
    red:[{x:40,y:428},{x:84,y:428},{x:128,y:428},{x:172,y:428},{x:210,y:372},{x:286,y:334}],
    blue:[{x:756,y:428},{x:804,y:428},{x:852,y:428},{x:900,y:428},{x:746,y:360},{x:668,y:304}],
    clouds:[{x:96,y:96,w:158,h:48},{x:378,y:112,w:214,h:64},{x:718,y:90,w:172,h:54}],
  },
  {
    id:"icebridge", name:"Icebridge", water:true,
    skyColors:["#97d4ff","#f1fbff"], mountainColor:"#94aac5",
    groundColor:"#3e826a", dirtColor:"#4d4b4a",
    platforms:[
      {x:-40,y:406,w:270,h:174,type:"ground"},
      {x:180,y:352,w:110,h:54,type:"stone"},
      {x:255,y:322,w:140,h:20,type:"log"},
      {x:390,y:280,w:130,h:20,type:"log"},
      {x:500,y:322,w:140,h:20,type:"log"},
      {x:660,y:352,w:110,h:54,type:"stone"},
      {x:840,y:298,w:80,h:108,type:"stone"},
      {x:700,y:406,w:300,h:174,type:"ground"},
    ],
    red:[{x:38,y:406},{x:84,y:406},{x:130,y:406},{x:176,y:406},{x:214,y:352},{x:300,y:322}],
    blue:[{x:756,y:406},{x:804,y:406},{x:852,y:406},{x:900,y:406},{x:688,y:352},{x:870,y:298}],
    clouds:[{x:88,y:86,w:160,h:46},{x:356,y:112,w:218,h:68},{x:704,y:84,w:176,h:54}],
  },
  {
    id:"catacombs", name:"Catacombs", water:false,
    skyColors:["#6f7786","#c5ccd7"], mountainColor:"#7a8092",
    groundColor:"#4b5563", dirtColor:"#3b3029",
    platforms:[
      {x:-40,y:430,w:260,h:150,type:"ground"},
      {x:180,y:380,w:110,h:50,type:"stone"},
      {x:260,y:340,w:120,h:20,type:"log"},
      {x:360,y:300,w:120,h:40,type:"stone"},
      {x:460,y:340,w:120,h:20,type:"log"},
      {x:560,y:380,w:110,h:50,type:"stone"},
      {x:320,y:430,w:320,h:120,type:"ground"},
      {x:760,y:330,w:110,h:100,type:"stone"},
      {x:700,y:430,w:300,h:150,type:"ground"},
    ],
    red:[{x:42,y:430},{x:86,y:430},{x:130,y:430},{x:174,y:430},{x:212,y:380},{x:294,y:340}],
    blue:[{x:752,y:430},{x:802,y:430},{x:852,y:430},{x:902,y:430},{x:588,y:380},{x:790,y:330}],
    clouds:[{x:92,y:98,w:154,h:44},{x:364,y:120,w:204,h:60},{x:702,y:96,w:164,h:50}],
  },
  {
    id:"frontier", name:"Frontier Ridge", water:false,
    skyColors:["#7db7e5","#dbefff"], mountainColor:"#8799ac",
    groundColor:"#4e7d34", dirtColor:"#6b4c2e",
    platforms:[
      {x:-40,y:410,w:300,h:170,type:"ground"},
      {x:220,y:350,w:100,h:60,type:"stone"},
      {x:300,y:320,w:130,h:20,type:"log"},
      {x:420,y:280,w:150,h:20,type:"log"},
      {x:560,y:320,w:130,h:20,type:"log"},
      {x:680,y:350,w:100,h:60,type:"stone"},
      {x:760,y:300,w:120,h:20,type:"log"},
      {x:390,y:410,w:180,h:100,type:"ground"},
      {x:700,y:410,w:300,h:170,type:"ground"},
    ],
    red:[{x:44,y:410},{x:92,y:410},{x:140,y:410},{x:188,y:410},{x:252,y:350},{x:336,y:320}],
    blue:[{x:758,y:410},{x:808,y:410},{x:858,y:410},{x:908,y:410},{x:714,y:350},{x:792,y:300}],
    clouds:[{x:104,y:92,w:160,h:48},{x:386,y:116,w:212,h:64},{x:716,y:90,w:166,h:52}],
  },
  {
    id:"floodgate", name:"Floodgate", water:true,
    skyColors:["#5ca6cc","#ccecff"], mountainColor:"#6c8ea6",
    groundColor:"#2f7f50", dirtColor:"#57432b",
    platforms:[
      {x:-40,y:396,w:270,h:184,type:"ground"},
      {x:170,y:344,w:120,h:52,type:"stone"},
      {x:260,y:314,w:130,h:20,type:"log"},
      {x:390,y:270,w:170,h:44,type:"stone"},
      {x:550,y:314,w:130,h:20,type:"log"},
      {x:690,y:344,w:120,h:52,type:"stone"},
      {x:820,y:300,w:110,h:96,type:"stone"},
      {x:420,y:396,w:130,h:100,type:"ground"},
      {x:700,y:396,w:300,h:184,type:"ground"},
    ],
    red:[{x:40,y:396},{x:86,y:396},{x:132,y:396},{x:178,y:396},{x:206,y:344},{x:306,y:314}],
    blue:[{x:758,y:396},{x:806,y:396},{x:854,y:396},{x:902,y:396},{x:724,y:344},{x:850,y:300}],
    clouds:[{x:90,y:88,w:164,h:50},{x:372,y:110,w:218,h:68},{x:712,y:88,w:170,h:52}],
  },
  {
    id:"sky-ruins", name:"Sky Ruins", water:false,
    skyColors:["#9ec3ef","#ecf6ff"], mountainColor:"#91a3b8",
    groundColor:"#587d55", dirtColor:"#5d4932",
    platforms:[
      {x:-40,y:420,w:270,h:160,type:"ground"},
      {x:170,y:360,w:110,h:60,type:"stone"},
      {x:250,y:322,w:120,h:20,type:"log"},
      {x:360,y:282,w:120,h:40,type:"stone"},
      {x:470,y:244,w:120,h:20,type:"log"},
      {x:590,y:282,w:120,h:40,type:"stone"},
      {x:700,y:322,w:120,h:20,type:"log"},
      {x:780,y:360,w:110,h:60,type:"stone"},
      {x:700,y:420,w:300,h:160,type:"ground"},
    ],
    red:[{x:40,y:420},{x:84,y:420},{x:128,y:420},{x:172,y:420},{x:212,y:360},{x:286,y:322}],
    blue:[{x:758,y:420},{x:806,y:420},{x:854,y:420},{x:902,y:420},{x:812,y:360},{x:744,y:322}],
    clouds:[{x:94,y:94,w:162,h:46},{x:360,y:118,w:218,h:66},{x:702,y:90,w:172,h:54}],
  },
  {
    id:"quarry", name:"Quarry", water:false,
    skyColors:["#bfc9d9","#eef2f8"], mountainColor:"#9ca6b6",
    groundColor:"#6e7c3d", dirtColor:"#5a4731",
    platforms:[
      {x:-40,y:430,w:280,h:150,type:"ground"},
      {x:200,y:382,w:120,h:48,type:"stone"},
      {x:290,y:346,w:130,h:20,type:"log"},
      {x:410,y:306,w:140,h:20,type:"log"},
      {x:540,y:346,w:130,h:20,type:"log"},
      {x:660,y:382,w:120,h:48,type:"stone"},
      {x:830,y:322,w:90,h:108,type:"stone"},
      {x:350,y:430,w:260,h:110,type:"ground"},
      {x:700,y:430,w:300,h:150,type:"ground"},
    ],
    red:[{x:44,y:430},{x:90,y:430},{x:136,y:430},{x:182,y:430},{x:236,y:382},{x:326,y:346}],
    blue:[{x:756,y:430},{x:806,y:430},{x:856,y:430},{x:906,y:430},{x:694,y:382},{x:860,y:322}],
    clouds:[{x:102,y:98,w:160,h:48},{x:384,y:120,w:214,h:64},{x:708,y:96,w:166,h:52}],
  },
  {
    id:"citadel", name:"Citadel", water:false,
    skyColors:["#9aa6bd","#e2e8f5"], mountainColor:"#8b94aa",
    groundColor:"#49653d", dirtColor:"#4a3829",
    platforms:[
      {x:-40,y:408,w:290,h:172,type:"ground"},
      {x:210,y:344,w:110,h:64,type:"stone"},
      {x:300,y:312,w:140,h:20,type:"log"},
      {x:420,y:260,w:120,h:52,type:"stone"},
      {x:520,y:312,w:140,h:20,type:"log"},
      {x:650,y:344,w:110,h:64,type:"stone"},
      {x:780,y:294,w:110,h:114,type:"stone"},
      {x:390,y:408,w:190,h:100,type:"ground"},
      {x:700,y:408,w:300,h:172,type:"ground"},
    ],
    red:[{x:40,y:408},{x:86,y:408},{x:132,y:408},{x:178,y:408},{x:248,y:344},{x:336,y:312}],
    blue:[{x:758,y:408},{x:808,y:408},{x:858,y:408},{x:908,y:408},{x:682,y:344},{x:812,y:294}],
    clouds:[{x:96,y:94,w:162,h:46},{x:372,y:116,w:210,h:62},{x:712,y:92,w:168,h:50}],
  },
  {
    id:"eclipse", name:"Eclipse Basin", water:true,
    skyColors:["#6366a8","#c7cbff"], mountainColor:"#7478a8",
    groundColor:"#355f44", dirtColor:"#45322a",
    platforms:[
      {x:-40,y:414,w:280,h:166,type:"ground"},
      {x:190,y:356,w:110,h:58,type:"stone"},
      {x:270,y:324,w:140,h:20,type:"log"},
      {x:400,y:278,w:150,h:20,type:"log"},
      {x:550,y:324,w:140,h:20,type:"log"},
      {x:680,y:356,w:110,h:58,type:"stone"},
      {x:840,y:300,w:80,h:114,type:"stone"},
      {x:380,y:414,w:200,h:100,type:"ground"},
      {x:700,y:414,w:300,h:166,type:"ground"},
    ],
    red:[{x:42,y:414},{x:88,y:414},{x:134,y:414},{x:180,y:414},{x:226,y:356},{x:310,y:324}],
    blue:[{x:758,y:414},{x:808,y:414},{x:858,y:414},{x:908,y:414},{x:712,y:356},{x:872,y:300}],
    clouds:[{x:100,y:90,w:164,h:48},{x:380,y:112,w:220,h:66},{x:722,y:90,w:172,h:54}],
  },
];

const MAP_DESC = {
  wasteland:   "Staircase of logs connects two ground bases. Climb to the peak!",
  archipelago: "Island bases over water. Float-hop across or hold your fortress.",
  mesa:        "Both teams start on tall plateaus. Fight for the pit bridges.",
  graveyard:   "Stone steps rise to a central peak. Control the top to win.",
  canyon:      "Deep ravine separates two cliffs. Cross via log bridges.",
  skyline:     "Multi-height ramps with stone anchors and long log sightlines.",
  "sunken-harbor":"Water-heavy lanes with raised docks and split vertical pressure.",
  forge:       "Dense industrial arena: stone cover plus exposed conveyor logs.",
  overgrowth:  "Climb layered vines and canopy bridges to flank from high ground.",
  icebridge:   "Slippery bridge network over deep water with narrow punish windows.",
  catacombs:   "Crypt steps reward rotation and timing between safe stone pockets.",
  frontier:    "Wide ridge with mixed terrain lanes for spacing and crossfire.",
  floodgate:   "Flooded choke points, gate towers and central control platform.",
  "sky-ruins": "Broken aerial ruins with alternating stone forts and log links.",
  quarry:      "Excavation pit with split levels, crane post and ambush ledges.",
  citadel:     "Fortified castle lanes: hold towers or break the central keep.",
  eclipse:     "High-risk basin over water; dominate the core arcs to snowball.",
};

function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}
function normalizeAngleDeg(angle){
  const wrapped=angle%360;
  return wrapped<0?wrapped+360:wrapped;
}
function angleDeltaDeg(from,to){
  return((to-from+540)%360)-180;
}
function angleDistanceDeg(a,b){
  return Math.abs(angleDeltaDeg(a,b));
}

function createInput(){
  const down=new Set(),pressed=new Set();
  return{
    press(c){if(!down.has(c))pressed.add(c);down.add(c);},
    release(c){down.delete(c);},
    down(c){return down.has(c);},
    pressed(c){return pressed.has(c);},
    clearPressed(){pressed.clear();},
    clearAll(){down.clear();pressed.clear();},
  };
}

function createRng(seed=Date.now()){
  let v=seed>>>0;
  return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};
}

function findMap(id){return MAPS.find(m=>m.id===id)??MAPS[0];}

function buildMapCannons(map){
  const redAnchor=map.red[0]??{x:70,y:420};
  const blueAnchor=map.blue[0]??{x:890,y:420};
  return[
    {
      id:`${map.id}-red-cannon`,team:"red",
      x:clamp(redAnchor.x+26,30,WIDTH-30),y:redAnchor.y,dir:1,
      powerBoost:CANNON_SPEED_BONUS,aimMin:AIM_MIN,aimMax:AIM_MAX,rangeMin:CANNON_MIN_TARGET_DISTANCE,
    },
    {
      id:`${map.id}-blue-cannon`,team:"blue",
      x:clamp(blueAnchor.x-26,30,WIDTH-30),y:blueAnchor.y,dir:-1,
      powerBoost:CANNON_SPEED_BONUS,aimMin:AIM_MIN,aimMax:AIM_MAX,rangeMin:CANNON_MIN_TARGET_DISTANCE,
    },
  ];
}

function createUnits(teamSize,map){
  const units=[];
  for(let i=0;i<teamSize;i++){
    units.push({id:`red-${i}`,team:"red",slot:i,name:NAMES.red[i],x:map.red[i].x,y:map.red[i].y,vx:0,vy:0,onGround:true,facing:1,health:100,alive:true,flashMs:0});
    units.push({id:`blue-${i}`,team:"blue",slot:i,name:NAMES.blue[i],x:map.blue[i].x,y:map.blue[i].y,vx:0,vy:0,onGround:true,facing:-1,health:100,alive:true,flashMs:0});
  }
  return units;
}

function getAlive(state,team){return state.units.filter(u=>u.team===team&&u.alive);}
function getUnit(state,id){return state.units.find(u=>u.id===id)??null;}
function getActiveUnit(state){return getUnit(state,state.turn.unitId);}
function defaultAim(team){return team==="red"?330:210;}

function createState({mapId="wasteland",teamSize=3,mode="menu"}){
  const map=findMap(mapId);
  const units=createUnits(clamp(teamSize,1,6),map);
  const cannons=buildMapCannons(map);
  return{
    mode,phase:mode==="menu"?"menu":"playing",
    mapId:map.id,map,cannons,teamSize:clamp(teamSize,1,6),units,
    rng:createRng(),
    turn:{number:1,team:"red",unitId:units.find(u=>u.team==="red")?.id??null,
      remainingMs:TURN_MS,movementLeft:MOVE_BUDGET,
      aimDeg:defaultAim("red"),charge:0,charging:false,
      acted:false,settleMs:0,state:"ready",usingCannon:false,cannonId:null,cursor:{red:-1,blue:-1}},
    wind:0,projectile:null,explosions:[],particles:[],
    ai:{
      stage:"idle",timerMs:0,desiredAim:defaultAim("blue"),desiredCharge:0.64,targetId:null,plan:null,repathMs:0,
      confidence:0.52,aggression:0.56,aimBias:0,chargeBias:0,lastDecision:null,recentShots:[],
      lastMoveX:null,stuckMs:0,stagnantTurns:0,lastUnitXById:{},
    },
    pointer:{x:WIDTH*0.5,y:HEIGHT*0.5,inside:false,down:false},
    virtual:{left:false,right:false,jump:false,aimUp:false,aimDown:false,fire:false},
    cameraShake:0,winner:null,frame:0,audio:null,audioLastEvent:null,
  };
}

function getCannonById(state,cannonId){
  if(!cannonId)return null;
  return state.cannons.find((cannon)=>cannon.id===cannonId)??null;
}

function getNearbyTeamCannon(state,teamId,x,y,maxDist=CANNON_USE_RANGE){
  let best=null,bestDist=Number.POSITIVE_INFINITY;
  for(const cannon of state.cannons){
    if(cannon.team!==teamId)continue;
    const d=Math.hypot(cannon.x-x,cannon.y-y);
    if(d<=maxDist&&d<bestDist){bestDist=d;best=cannon;}
  }
  return best;
}

function selectNextUnit(state,teamId){
  const units=state.units.filter(u=>u.team===teamId).sort((a,b)=>a.slot-b.slot);
  if(!units.length)return null;
  const alive=units.filter(u=>u.alive);
  if(!alive.length)return null;
  const start=state.turn.cursor[teamId]??-1;
  for(let off=1;off<=units.length;off++){
    const idx=(start+off)%units.length;
    if(units[idx].alive){state.turn.cursor[teamId]=idx;return units[idx];}
  }
  return alive[0];
}

function startTurn(state,teamId){
  const unit=selectNextUnit(state,teamId);
  if(!unit)return false;
  Object.assign(state.turn,{team:teamId,unitId:unit.id,remainingMs:TURN_MS,movementLeft:MOVE_BUDGET,
    aimDeg:defaultAim(teamId),charge:0,charging:false,acted:false,settleMs:0,state:"ready",usingCannon:false,cannonId:null});
  state.wind=(state.rng()-0.5)*80;
  if(TEAM[teamId].cpu){
    const enemyTeamId=teamId==="red"?"blue":"red";
    const allyAlive=getAlive(state,teamId).length;
    const enemyAlive=getAlive(state,enemyTeamId).length;
    const pressure=(enemyAlive-allyAlive)/Math.max(1,state.teamSize);
    const prevX=state.ai.lastUnitXById[unit.id];
    if(Number.isFinite(prevX)){
      const movedSinceLastTurn=Math.abs(unit.x-prevX);
      if(movedSinceLastTurn<34)state.ai.stagnantTurns=clamp(state.ai.stagnantTurns+1,0,9);
      else state.ai.stagnantTurns=Math.max(0,state.ai.stagnantTurns-1);
    }
    state.ai.lastUnitXById[unit.id]=unit.x;
    state.ai.aggression=clamp(state.ai.aggression+pressure*0.09,-0.2,1);
    state.ai.aggression=clamp(state.ai.aggression+state.ai.stagnantTurns*0.018,0,1);
    state.ai.aggression=clamp(state.ai.aggression,0.28,0.88);
    state.ai.confidence=clamp(state.ai.confidence,0.16,0.94);
    state.ai.stage="planning";
    state.ai.timerMs=220+state.rng()*220+(1-state.ai.confidence)*120;
    state.ai.desiredAim=defaultAim(teamId);state.ai.desiredCharge=0.62;
    state.ai.targetId=null;state.ai.plan=null;state.ai.repathMs=0;
    state.ai.lastMoveX=unit.x;state.ai.stuckMs=0;
    state.turn.state="planning";
  } else {
    state.ai.stage="idle";state.ai.timerMs=0;state.ai.plan=null;
    state.ai.repathMs=0;state.ai.targetId=null;state.ai.lastMoveX=null;state.ai.stuckMs=0;
  }
  emitWarSfx(state, teamId==="red"?"turnRed":"turnBlue", { team: teamId });
  return true;
}

function battleFromMenu(state){
  const fresh=createState({mapId:state.mapId,teamSize:state.teamSize,mode:"battle"});
  fresh.audio=state.audio;
  startTurn(fresh,"red");
  emitWarSfx(fresh,"battleStart", { team: "red" });
  return fresh;
}
function restartFromAny(state){
  const fresh=createState({mapId:state.mapId,teamSize:state.teamSize,mode:state.mode==="menu"?"menu":"battle"});
  fresh.audio=state.audio;
  if(fresh.mode==="battle"){
    startTurn(fresh,"red");
    emitWarSfx(fresh,"battleStart", { team: "red" });
  }
  return fresh;
}

const TOPOLOGY_CACHE=new Map();
function platformBounds(p){return{left:p.x+16,right:p.x+p.w-16,y:p.y};}
function platformCenter(p){return p.x+p.w*0.5;}
function intervalGap(al,ar,bl,br){if(ar<bl)return bl-ar;if(br<al)return al-br;return 0;}

function bestJumpLink(fp,tp){
  if(fp===tp)return null;
  const a=platformBounds(fp),b=platformBounds(tp);
  if(a.left>=a.right||b.left>=b.right)return null;
  let fromX=a.left,toX=b.left;
  if(a.right<b.left){fromX=a.right;toX=b.left;}
  else if(b.right<a.left){fromX=a.left;toX=b.right;}
  else{const ol=Math.max(a.left,b.left),or2=Math.min(a.right,b.right);fromX=(ol+or2)*0.5;toX=fromX;}
  const gap=intervalGap(a.left,a.right,b.left,b.right);
  const stepUp=a.y-b.y;
  if(stepUp>MAX_JUMP_UP)return null;
  const stepDown=Math.max(0,b.y-a.y);
  const maxGap=stepUp>0?MAX_JUMP_GAP_UP:stepDown>0?MAX_JUMP_GAP_DOWN:MAX_JUMP_GAP_FLAT;
  if(gap>maxGap)return null;
  const vp=stepUp>0?stepUp*1.7:stepDown*0.35;
  const cost=Math.abs(fromX-toX)+85+vp;
  return{fromX,toX,cost};
}

function findPlatformForPosition(map,x,y){
  let bi=-1,bs=Number.POSITIVE_INFINITY;
  for(let idx=0;idx<map.platforms.length;idx++){
    const p=map.platforms[idx];
    if(x<p.x-6||x>p.x+p.w+6)continue;
    const sc=Math.abs(y-p.y);
    if(sc<bs){bs=sc;bi=idx;}
  }
  return bs<=26?bi:-1;
}

function buildPlatformTopology(map){
  const nodes=map.platforms.map((p,i)=>({index:i,platform:p,centerX:platformCenter(p)}));
  const edges=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++)
    for(let j=0;j<nodes.length;j++){
      if(i===j)continue;
      const lnk=bestJumpLink(nodes[i].platform,nodes[j].platform);
      if(!lnk)continue;
      edges[i].push({to:j,...lnk});
    }
  return{nodes,edges};
}

function topologyFor(map){
  const cached=TOPOLOGY_CACHE.get(map.id);if(cached)return cached;
  const t=buildPlatformTopology(map);TOPOLOGY_CACHE.set(map.id,t);return t;
}

function reachablePlatformIndices(topology,startIndex){
  if(startIndex<0||startIndex>=topology.nodes.length)return new Set();
  const seen=new Set([startIndex]),queue=[startIndex];
  while(queue.length>0){const node=queue.shift();for(const e of topology.edges[node]){if(seen.has(e.to))continue;seen.add(e.to);queue.push(e.to);}}
  return seen;
}

function assertMapConnectivity(map){
  const topology=topologyFor(map);
  const redZone=new Set(),blueZone=new Set();
  for(const sp of map.red){const idx=findPlatformForPosition(map,sp.x,sp.y);if(idx>=0)redZone.add(idx);}
  for(const sp of map.blue){const idx=findPlatformForPosition(map,sp.x,sp.y);if(idx>=0)blueZone.add(idx);}
  if(redZone.size===0||blueZone.size===0)throw new Error(`Map "${map.id}" invalid spawn topology.`);
  const disconnected=[];
  for(let idx=0;idx<topology.nodes.length;idx++){
    const reach=reachablePlatformIndices(topology,idx);
    let cr=false,cb=false;
    for(const node of reach){if(redZone.has(node))cr=true;if(blueZone.has(node))cb=true;if(cr&&cb)break;}
    if(!cr||!cb)disconnected.push(idx);
  }
  if(disconnected.length>0)throw new Error(`Map "${map.id}" disconnected zones (${disconnected.join(",")}).`);
}
MAPS.forEach(assertMapConnectivity);

function applyUnitPhysics(state,dt){
  for(const unit of state.units){
    if(!unit.alive)continue;
    if(unit.flashMs>0)unit.flashMs=Math.max(0,unit.flashMs-dt*1000);
    unit.vy+=GRAVITY*dt;
    const px=unit.x,py=unit.y;
    unit.x+=unit.vx*dt;unit.y+=unit.vy*dt;
    unit.x=clamp(unit.x,12,WIDTH-12);
    let landed=false;
    for(const plat of state.map.platforms){
      if(unit.x<plat.x+5||unit.x>plat.x+plat.w-5)continue;
      if(py<=plat.y&&unit.y>=plat.y&&unit.vy>=0){unit.y=plat.y;unit.vy=0;landed=true;break;}
    }
    unit.onGround=landed;
    if(landed){unit.vx*=0.80;if(Math.abs(unit.vx)<2)unit.vx=0;}
    if(unit.y>HEIGHT+100){unit.alive=false;unit.health=0;unit.vx=0;unit.vy=0;unit.y=HEIGHT+90;unit.x=clamp(px,12,WIDTH-12);}
  }
}

function enemyTeamId(teamId){return teamId==="red"?"blue":"red";}

function chooseSimpleShotFromOrigin(originX,originY,target){
  if(!target)return{angle:210,charge:0.65};
  const sx=originX,sy=originY-28,tx=target.x,ty=target.y-24;
  const dx=tx-sx,dy=ty-sy;
  let best=null;
  for(let angle=AIM_MIN;angle<=AIM_MAX;angle+=2){
    const r=angle*Math.PI/180,cos=Math.cos(r);
    if(Math.abs(cos)<0.05)continue;
    const denom=2*cos*cos*(dx*Math.tan(r)-dy);
    if(Math.abs(denom)<1e-3)continue;
    const speedSq=GRAVITY*dx*dx/denom;
    if(speedSq<=0||!isFinite(speedSq))continue;
    const speed=Math.sqrt(speedSq),charge=(speed-THROW_BASE)/THROW_SCALE;
    if(charge<0.1||charge>1)continue;
    const preferred=dx>=0?330:210;
    const score=Math.abs(speed-(THROW_BASE+0.62*THROW_SCALE))+angleDistanceDeg(angle,preferred)*1.15;
    if(!best||score<best.score)best={angle,charge,score};
  }
  if(!best)return{angle:dx>=0?330:210,charge:clamp(0.44+Math.abs(dx)/WIDTH*0.34,0.24,0.95)};
  return{angle:best.angle,charge:best.charge};
}

function chooseSimpleShot(unit,target){
  if(!unit||!target)return{angle:210,charge:0.65};
  return chooseSimpleShotFromOrigin(unit.x,unit.y,target);
}

function terrainProfileForPlatform(map,platformIndex){
  if(platformIndex<0||platformIndex>=map.platforms.length)return TERRAIN_PROFILE.ground;
  const type=map.platforms[platformIndex]?.type??"ground";
  return TERRAIN_PROFILE[type]??TERRAIN_PROFILE.ground;
}

function pickPriorityEnemies(state,unit,enemies){
  const ai=state.ai;
  const avgX=enemies.reduce((s,e)=>s+e.x,0)/Math.max(1,enemies.length);
  const avgY=enemies.reduce((s,e)=>s+e.y,0)/Math.max(1,enemies.length);
  return enemies
    .map((enemy)=>{
      const dist=Math.hypot(enemy.x-unit.x,enemy.y-unit.y);
      const lowHp=(100-enemy.health)*1.25;
      const pressure=Math.max(0,180-dist)*0.11;
      const highGround=enemy.y<unit.y?12:0;
      const focusBonus=ai.targetId===enemy.id?20:0;
      const cluster=enemies.reduce((acc,other)=>{
        if(other.id===enemy.id)return acc;
        return acc+Math.max(0,150-Math.hypot(other.x-enemy.x,other.y-enemy.y))*0.08;
      },0);
      const centerBias=Math.max(0,260-Math.hypot(enemy.x-avgX,enemy.y-avgY))*0.05;
      return{enemy,score:lowHp+pressure+highGround+focusBonus+cluster+centerBias};
    })
    .sort((a,b)=>b.score-a.score)
    .map((entry)=>entry.enemy);
}

function evaluateCandidatePosition(state,candidate,unit,enemies,allies,aggression){
  const topology=topologyFor(state.map);
  const plat=candidate.platform>=0?state.map.platforms[candidate.platform]:null;
  const bounds=plat?platformBounds(plat):null;
  const terrain=terrainProfileForPlatform(state.map,candidate.platform);
  const centroidX=enemies.reduce((s,e)=>s+e.x,0)/Math.max(1,enemies.length);
  const centroidY=enemies.reduce((s,e)=>s+e.y,0)/Math.max(1,enemies.length);
  const distToCentroid=Math.hypot(candidate.x-centroidX,candidate.y-centroidY);
  const preferredRange=clamp(246-aggression*122,126,282);
  const rangeScore=1-clamp(Math.abs(distToCentroid-preferredRange)/350,0,1);
  const heightAdv=clamp((centroidY-candidate.y)/170,-1,1);
  const edgeMargin=bounds?Math.min(candidate.x-bounds.left,bounds.right-candidate.x):42;
  const edgeSafety=clamp(edgeMargin/70,0,1);
  const lowHealth=unit.health<=44;
  const terrainScore=lowHealth
    ? terrain.cover*0.64+terrain.stability*0.36
    : terrain.mobility*0.52+terrain.cover*0.24+terrain.stability*0.24;
  const moveOptions=candidate.platform>=0&&candidate.platform<topology.edges.length?topology.edges[candidate.platform].length:0;
  const mobilityScore=Math.min(1,moveOptions/4);
  let allyClusterPenalty=0;
  for(const ally of allies){
    if(!ally.alive||ally.id===unit.id)continue;
    const d=Math.hypot(ally.x-candidate.x,ally.y-candidate.y);
    if(d<132)allyClusterPenalty+=(132-d)/132;
  }
  let threatScore=0;
  for(const enemy of enemies){
    const d=Math.hypot(enemy.x-candidate.x,enemy.y-candidate.y);
    threatScore+=clamp(1-d/360,0,1)*(0.42+enemy.health/220);
  }
  const waterPenalty=state.map.water&&candidate.y>385?16:0;
  return edgeSafety*34+rangeScore*36+heightAdv*27+terrainScore*32+mobilityScore*16
    -threatScore*42-allyClusterPenalty*24-candidate.cost*0.23-waterPenalty;
}

function simulateProjectileLanding(state,ox,oy,angleDeg,charge,opts={}){
  const rad=angleDeg*Math.PI/180;
  const speed=THROW_BASE+charge*THROW_SCALE+(opts.speedBonus??0);
  const spawnOffsetX=opts.spawnOffsetX??18;
  const spawnOffsetY=opts.spawnOffsetY??-30;
  const windFactor=opts.windFactor??0.4;
  const p={
    x:ox+Math.cos(rad)*spawnOffsetX,
    y:oy+spawnOffsetY+Math.sin(rad)*8,
    vx:Math.cos(rad)*speed,vy:Math.sin(rad)*speed,radius:6,fuseMs:1800,bounces:0,
  };
  for(let step=0;step<220;step++){
    const px=p.x,py=p.y;
    p.vx+=state.wind*DT*windFactor;p.vy+=GRAVITY*DT;p.x+=p.vx*DT;p.y+=p.vy*DT;p.fuseMs-=DT_MS;
    if(p.x-p.radius<0){p.x=p.radius;p.vx=Math.abs(p.vx)*0.55;p.bounces++;}
    else if(p.x+p.radius>WIDTH){p.x=WIDTH-p.radius;p.vx=-Math.abs(p.vx)*0.55;p.bounces++;}
    if(p.y-p.radius<0){p.y=p.radius;p.vy=Math.abs(p.vy)*0.55;p.bounces++;}
    for(const plat of state.map.platforms){
      const l=plat.x,r=plat.x+plat.w,top=plat.y,bot=plat.y+plat.h;
      if(p.x<l-p.radius||p.x>r+p.radius||p.y<top-p.radius||p.y>bot+p.radius)continue;
      if(py+p.radius<=top&&p.y+p.radius>=top&&p.vy>0){p.y=top-p.radius;p.vy=-Math.abs(p.vy)*0.52;p.vx*=0.9;p.bounces++;continue;}
      if(py-p.radius>=bot&&p.y-p.radius<=bot&&p.vy<0){p.y=bot+p.radius;p.vy=Math.abs(p.vy)*0.5;p.bounces++;continue;}
      if(px+p.radius<=l&&p.x+p.radius>=l&&p.vx>0){p.x=l-p.radius;p.vx=-Math.abs(p.vx)*0.55;p.bounces++;continue;}
      if(px-p.radius>=r&&p.x-p.radius<=r&&p.vx<0){p.x=r+p.radius;p.vx=Math.abs(p.vx)*0.55;p.bounces++;}
    }
    if(p.fuseMs<=0||p.bounces>=8||p.y>HEIGHT+90)return{x:clamp(p.x,0,WIDTH),y:clamp(p.y,0,HEIGHT),bounces:p.bounces};
  }
  return{x:clamp(p.x,0,WIDTH),y:clamp(p.y,0,HEIGHT),bounces:p.bounces};
}

function predictedBlastDamage(unit,bx,by){
  if(!unit.alive)return 0;
  const dx=unit.x-bx,dy=(unit.y-24)-by,dist=Math.hypot(dx,dy);
  if(dist>BLAST_RADIUS)return 0;
  const ratio=1-dist/BLAST_RADIUS;
  return Math.max(6,Math.round(BLAST_DAMAGE*ratio*ratio));
}

function buildCpuCandidates(state,unit){
  const map=state.map,topology=topologyFor(map);
  const currentPlatform=findPlatformForPosition(map,unit.x,unit.y);
  const budget=state.turn.movementLeft,candidates=[],keySet=new Set(),bestPathCost=new Map();
  const budgetFlex=52;
  const maxDepth=4;
  const withCannon=(candidate)=>{
    const cannon=getNearbyTeamCannon(state,unit.team,candidate.x,candidate.y,30);
    if(cannon)candidate.cannonId=cannon.id;
    return candidate;
  };
  const push=(c)=>{
    const candidate=withCannon(c);
    const routeDepth=candidate.route?.length??0;
    const k=`${candidate.platform}:${Math.round(candidate.x)}:${routeDepth}:${candidate.cannonId??"-"}`;
    if(keySet.has(k))return;
    keySet.add(k);candidates.push(candidate);
  };
  if(currentPlatform<0){push({x:unit.x,y:unit.y,platform:-1,cost:0,route:[]});return candidates;}

  const makePoints=(bounds,biasX)=>[
    clamp(biasX,bounds.left,bounds.right),
    bounds.left,bounds.right,(bounds.left+bounds.right)*0.5,bounds.left+22,bounds.right-22,
  ];

  const explore=(platformIndex,currentX,cost,route,depth)=>{
    const platform=map.platforms[platformIndex];
    const bounds=platformBounds(platform);
    const points=makePoints(bounds,currentX);
    for(const point of points){
      const x=clamp(point,bounds.left,bounds.right);
      const totalCost=cost+Math.abs(x-currentX);
      if(totalCost>budget+budgetFlex)continue;
      push({x,y:platform.y,platform:platformIndex,cost:totalCost,route:route.map((step)=>({...step}))});
    }
    if(depth>=maxDepth)return;
    for(const edge of topology.edges[platformIndex]){
      const approach=Math.abs(currentX-edge.fromX);
      const jumpCost=approach+edge.cost;
      const nextCost=cost+jumpCost;
      if(nextCost>budget+budgetFlex)continue;
      const coarseX=Math.round(edge.toX/10);
      const pathKey=`${edge.to}:${coarseX}:${depth+1}`;
      const bestCost=bestPathCost.get(pathKey);
      if(bestCost!=null&&nextCost>=bestCost-6)continue;
      bestPathCost.set(pathKey,nextCost);
      const nextRoute=[
        ...route,
        {
          fromPlatform:platformIndex,toPlatform:edge.to,
          fromX:edge.fromX,toX:edge.toX,started:false,done:false,
        },
      ];
      explore(edge.to,edge.toX,nextCost,nextRoute,depth+1);
    }
  };

  bestPathCost.set(`${currentPlatform}:${Math.round(unit.x/10)}:0`,0);
  explore(currentPlatform,unit.x,0,[],0);

  candidates.sort((a,b)=>a.cost-b.cost);
  return candidates.slice(0,150);
}

function scoreCandidateShot(state,candidate,angle,charge,actingTeam,priorityEnemyIds,primaryTarget,shotConfig){
  const originX=shotConfig?.originX??candidate.x;
  const originY=shotConfig?.originY??candidate.y;
  const landing=simulateProjectileLanding(state,originX,originY,angle,charge,shotConfig);
  let ed=0,ad=0,ek=0,ak=0,focusDamage=0,minEnemyDist=Number.POSITIVE_INFINITY;
  for(const unit of state.units){
    if(!unit.alive)continue;
    if(unit.team!==actingTeam){
      const d=Math.hypot(unit.x-landing.x,(unit.y-24)-landing.y);
      if(d<minEnemyDist)minEnemyDist=d;
    }
    const damage=predictedBlastDamage(unit,landing.x,landing.y);
    if(damage<=0)continue;
    if(unit.team===actingTeam){
      ad+=damage;
      if(damage>=unit.health)ak++;
    } else {
      ed+=damage;
      if(priorityEnemyIds.has(unit.id))focusDamage+=damage;
      if(damage>=unit.health)ek++;
    }
  }
  const targetDistance=primaryTarget?Math.hypot(primaryTarget.x-landing.x,(primaryTarget.y-24)-landing.y):minEnemyDist;
  const score=ed*1.52+focusDamage*0.68+ek*280-ad*2.35-ak*420-targetDistance*0.045;
  return{score,landing,enemyDamage:ed,allyDamage:ad,enemyKills:ek,allyKills:ak,focusDamage,minEnemyDist};
}

function chooseAiPlan(state,unit){
  const actingTeam=unit.team;
  const enemies=getAlive(state,enemyTeamId(actingTeam));
  const allies=getAlive(state,actingTeam);
  if(enemies.length===0)return null;
  const ai=state.ai;
  const priorityEnemies=pickPriorityEnemies(state,unit,enemies);
  const primaryTarget=priorityEnemies[0]??enemies[0];
  const prioritySet=new Set(priorityEnemies.slice(0,3).map((enemy)=>enemy.id));
  const candidates=buildCpuCandidates(state,unit);
  const angleStep=ai.confidence>=0.72?5:4;
  const chargeStep=ai.confidence>=0.72?0.08:0.07;
  const allyTotalHp=allies.reduce((sum,ally)=>sum+(ally.alive?ally.health:0),0);
  const enemyTotalHp=enemies.reduce((sum,enemy)=>sum+(enemy.alive?enemy.health:0),0);
  const hpDeficit=(enemyTotalHp-allyTotalHp)/(Math.max(1,state.teamSize)*100);
  const enemyCentroidX=enemies.reduce((sum,enemy)=>sum+enemy.x,0)/Math.max(1,enemies.length);
  const enemyCentroidY=enemies.reduce((sum,enemy)=>sum+enemy.y,0)/Math.max(1,enemies.length);
  const currentDistToFight=Math.hypot(unit.x-enemyCentroidX,unit.y-enemyCentroidY);
  let best=null;
  for(const candidate of candidates){
    const positionScore=evaluateCandidatePosition(state,candidate,unit,enemies,allies,ai.aggression);
    const distToFight=Math.hypot(candidate.x-enemyCentroidX,candidate.y-enemyCentroidY);
    const advanceDelta=currentDistToFight-distToFight;
    const advanceScore=advanceDelta*(0.07+ai.aggression*0.06)+hpDeficit*20*clamp(advanceDelta/140,-1,1);
    const sameAsLastMove=Boolean(
      ai.lastDecision&&
      Math.abs(candidate.x-ai.lastDecision.moveX)<=14&&
      Math.abs(candidate.y-ai.lastDecision.moveY)<=10
    );
    const campPenalty=sameAsLastMove?(15+Math.max(0,distToFight-210)*0.04):0;
    const displacement=Math.hypot(candidate.x-unit.x,candidate.y-unit.y);
    const stagnationPenalty=displacement<36?(8+ai.stagnantTurns*8):0;
    const mobilityIntent=displacement*0.06*(0.32+ai.aggression*0.75);
    const cannon=candidate.cannonId?getCannonById(state,candidate.cannonId):null;
    const targetRange=Math.hypot(primaryTarget.x-candidate.x,primaryTarget.y-candidate.y);
    const canUseCannon=Boolean(cannon&&targetRange>=(cannon.rangeMin??CANNON_MIN_TARGET_DISTANCE));
    const variants=[{
      useCannon:false,cannonId:null,
      angleMin:AIM_MIN,angleMax:AIM_MAX,localAngleStep:angleStep,
      chargeStart:0.16,localChargeStep:chargeStep,
      shotConfig:{speedBonus:0,windFactor:0.4,spawnOffsetX:18,spawnOffsetY:-30},
      cannonBonus:0,cannonPenalty:0,
    }];
    if(canUseCannon){
      variants.push({
        useCannon:true,cannonId:cannon.id,
        angleMin:Math.max(AIM_MIN,cannon.aimMin??AIM_MIN),
        angleMax:Math.min(AIM_MAX,cannon.aimMax??AIM_MAX),
        localAngleStep:Math.max(3,angleStep-1),
        chargeStart:0.1,localChargeStep:Math.max(0.06,chargeStep-0.01),
        shotConfig:{
          originX:cannon.x,originY:cannon.y,speedBonus:cannon.powerBoost??CANNON_SPEED_BONUS,
          windFactor:CANNON_WIND_FACTOR,spawnOffsetX:22,spawnOffsetY:-18,
        },
        cannonBonus:18+Math.max(0,targetRange-CANNON_MIN_TARGET_DISTANCE)*0.032,
        cannonPenalty:targetRange<205?42:0,
      });
    }
    for(const variant of variants){
      for(let angle=variant.angleMin;angle<=variant.angleMax;angle+=variant.localAngleStep){
        for(let charge=variant.chargeStart;charge<=1.001;charge+=variant.localChargeStep){
          const shot=scoreCandidateShot(state,candidate,angle,charge,actingTeam,prioritySet,primaryTarget,variant.shotConfig);
          if(
            shot.enemyDamage<=0&&
            shot.focusDamage<=0&&
            shot.minEnemyDist>BLAST_RADIUS*1.2&&
            ai.confidence>0.45
          )continue;
          const exploration=(state.rng()-0.5)*(1-ai.confidence)*8;
          const aggressionBonus=ai.aggression*10;
          const total=shot.score+positionScore+aggressionBonus+advanceScore+variant.cannonBonus+mobilityIntent
            -campPenalty-stagnationPenalty-variant.cannonPenalty+exploration;
          if(!best||total>best.totalScore){
            best={
              totalScore:total,angle,charge,targetId:primaryTarget.id,
              moveX:candidate.x,moveY:candidate.y,platform:candidate.platform,
              route:(candidate.route??[]).map((step)=>({...step})),
              positionScore,landing:shot.landing,useCannon:variant.useCannon,cannonId:variant.cannonId,
            };
          }
        }
      }
    }
  }
  if(!best){
    const fb=chooseSimpleShotFromOrigin(unit.x,unit.y,primaryTarget);
    const fallbackCannon=getNearbyTeamCannon(state,actingTeam,unit.x,unit.y,30);
    const canFallbackCannon=Boolean(
      fallbackCannon&&Math.hypot(primaryTarget.x-unit.x,primaryTarget.y-unit.y)>=(fallbackCannon.rangeMin??CANNON_MIN_TARGET_DISTANCE)
    );
    return{
      totalScore:0,angle:fb.angle,charge:fb.charge,targetId:primaryTarget?.id??null,
      moveX:unit.x,moveY:unit.y,platform:findPlatformForPosition(state.map,unit.x,unit.y),route:[],positionScore:0,
      useCannon:canFallbackCannon,cannonId:canFallbackCannon?fallbackCannon.id:null,
    };
  }
  return best;
}

function tuneAiPlanShot(state,plan){
  if(!plan)return{angle:defaultAim("blue"),charge:0.58};
  const ai=state.ai;
  const volatility=1-ai.confidence;
  const aggressionLift=(ai.aggression-0.5)*4.6;
  const jitter=(state.rng()-0.5)*volatility*2.4;
  return{
    angle:normalizeAngleDeg(plan.angle+ai.aimBias*0.34+jitter-aggressionLift*0.16),
    charge:clamp(plan.charge+ai.chargeBias*0.46+aggressionLift*0.011+(state.rng()-0.5)*volatility*0.02,0.14,1),
  };
}

function registerAiDetonationFeedback(state,projectile,outcome){
  if(!projectile?.ownerTeam||!TEAM[projectile.ownerTeam].cpu)return;
  const ai=state.ai;
  const value=outcome.enemyDamage+outcome.enemyKills*92-outcome.allyDamage*1.7-outcome.allyKills*190;
  const success=value>24;
  ai.confidence=clamp(
    ai.confidence+(success?0.055:-0.06)+(outcome.enemyKills>0?0.03:0)-(outcome.allyDamage>0?0.045:0),
    0.16,0.94,
  );
  ai.aggression=clamp(
    ai.aggression+(success?0.03:-0.026)+(outcome.enemyDamage===0?-0.015:0)-(outcome.allyDamage>0?0.032:0),
    0.28,0.88,
  );
  const target=projectile.intendedTargetId?getUnit(state,projectile.intendedTargetId):null;
  if(target&&target.alive){
    const throwDir=Math.sign(Math.cos((projectile.intendedAimDeg??defaultAim(projectile.ownerTeam))*Math.PI/180))||1;
    const dxError=target.x-outcome.landingX;
    if(Math.abs(dxError)>38)ai.chargeBias=clamp(ai.chargeBias+(dxError*throwDir>0?0.012:-0.012),-0.2,0.2);
    else ai.chargeBias*=0.92;
    const dyError=(target.y-24)-outcome.landingY;
    if(Math.abs(dyError)>34)ai.aimBias=clamp(ai.aimBias+(dyError>0?-0.42:0.42),-9,9);
    else ai.aimBias*=0.9;
  } else {
    ai.aimBias*=0.95;ai.chargeBias*=0.95;
  }
  ai.recentShots.push({
    turn:state.turn.number,targetId:projectile.intendedTargetId??null,
    enemyDamage:Math.round(outcome.enemyDamage),allyDamage:Math.round(outcome.allyDamage),
    enemyKills:outcome.enemyKills,allyKills:outcome.allyKills,
    landingX:Math.round(outcome.landingX),landingY:Math.round(outcome.landingY),
  });
  if(ai.recentShots.length>AI_RECENT_HISTORY)ai.recentShots.shift();
}

function moveCpuTowardPlan(state,unit,dt){
  const plan=state.ai.plan;if(!plan)return true;
  let direction=0;
  const route=plan.route??[];
  if(route.length>0){
    if(!Number.isInteger(plan.routeIndex))plan.routeIndex=0;
    while(plan.routeIndex<route.length&&route[plan.routeIndex].done)plan.routeIndex++;
    if(plan.routeIndex<route.length){
      const step=route[plan.routeIndex];
      if(!step.started){
        if(Math.abs(unit.x-step.fromX)>7){
          direction=Math.sign(step.fromX-unit.x);
        } else if(unit.onGround){
          unit.vy=-JUMP_SPEED;unit.onGround=false;
          unit.vx=Math.sign(step.toX-step.fromX||1)*MOVE_SPEED;
          emitWarSfx(state,"jump", { team: unit.team });
          step.started=true;
        }
      } else if(unit.onGround){
        const currentPlatform=findPlatformForPosition(state.map,unit.x,unit.y);
        const aligned=Math.abs(unit.x-step.toX)<=18;
        if(currentPlatform===step.toPlatform&&aligned){
          step.done=true;plan.routeIndex++;
        } else if(currentPlatform===step.toPlatform){
          direction=Math.sign(step.toX-unit.x);
        }
      }
    }
  }
  const routeDone=(route.length===0)||((plan.routeIndex??route.length)>=route.length);
  if(routeDone&&Math.abs(unit.x-plan.moveX)>8)direction=Math.sign(plan.moveX-unit.x);
  if(direction!==0&&state.turn.movementLeft>0){
    const speed=unit.onGround?MOVE_SPEED:AIR_CONTROL;
    unit.vx=direction*speed;
    if(unit.onGround)state.turn.movementLeft=Math.max(0,state.turn.movementLeft-Math.abs(unit.vx)*dt);
    unit.facing=direction>0?1:-1;
  } else if(unit.onGround){unit.vx*=0.68;if(Math.abs(unit.vx)<3)unit.vx=0;}
  return(Math.abs(unit.x-plan.moveX)<=8&&routeDone)||state.turn.movementLeft<=0;
}

function spawnProjectile(state,unit){
  if(!unit||!unit.alive)return;
  const cannon=state.turn.usingCannon?getCannonById(state,state.turn.cannonId):null;
  const canUseCannon=Boolean(cannon&&Math.hypot(unit.x-cannon.x,unit.y-cannon.y)<=CANNON_USE_RANGE+4);
  const originX=canUseCannon?cannon.x:unit.x;
  const originY=canUseCannon?cannon.y:unit.y;
  const spawnOffsetX=canUseCannon?22:18;
  const spawnOffsetY=canUseCannon?-18:-30;
  const windFactor=canUseCannon?CANNON_WIND_FACTOR:0.4;
  const rad=state.turn.aimDeg*Math.PI/180,speed=THROW_BASE+state.turn.charge*THROW_SCALE+(canUseCannon?(cannon.powerBoost??CANNON_SPEED_BONUS):0);
  state.projectile={
    x:originX+Math.cos(rad)*spawnOffsetX,y:originY+spawnOffsetY+Math.sin(rad)*8,vx:Math.cos(rad)*speed,vy:Math.sin(rad)*speed,
    radius:6,fuseMs:1800,bounces:0,trail:[],
    ownerTeam:unit.team,ownerUnitId:unit.id,
    intendedTargetId:TEAM[unit.team].cpu?state.ai.targetId:null,
    intendedAimDeg:state.turn.aimDeg,intendedCharge:state.turn.charge,
    windFactor,source:canUseCannon?"cannon":"hand",
  };
  if(!canUseCannon){state.turn.usingCannon=false;state.turn.cannonId=null;}
  state.turn.charging=false;state.turn.acted=true;state.turn.state="resolving";
  emitWarSfx(state, canUseCannon?"cannon":"throw", { team: unit.team, source: canUseCannon?"cannon":"grenade", power: state.turn.charge });
}

function spawnParticles(state,x,y,count,color){
  for(let i=0;i<count;i++){
    const angle=state.rng()*Math.PI*2,speed=80+state.rng()*200;
    state.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-60,lifeMs:400+state.rng()*400,maxLife:800,radius:3+state.rng()*4,color});
  }
}

function detonate(state,x,y){
  const projectile=state.projectile;
  state.explosions.push({x,y,radius:12,maxRadius:BLAST_RADIUS,lifeMs:420});
  state.projectile=null;state.cameraShake=Math.max(state.cameraShake,1);
  spawnParticles(state,x,y,22,"#f97316");spawnParticles(state,x,y,10,"#fbbf24");
  let enemyDamage=0,allyDamage=0,enemyKills=0,allyKills=0;
  for(const unit of state.units){
    if(!unit.alive)continue;
    const dx=unit.x-x,dy=(unit.y-24)-y,dist=Math.hypot(dx,dy);
    if(dist>BLAST_RADIUS)continue;
    const ratio=1-dist/BLAST_RADIUS,damage=Math.max(6,Math.round(BLAST_DAMAGE*ratio*ratio));
    if(projectile?.ownerTeam){
      if(unit.team===projectile.ownerTeam){
        allyDamage+=damage;
        if(damage>=unit.health)allyKills++;
      } else {
        enemyDamage+=damage;
        if(damage>=unit.health)enemyKills++;
      }
    }
    unit.health=Math.max(0,unit.health-damage);unit.flashMs=250;
    const nx=dist>0?dx/dist:0,ny=dist>0?dy/dist:-1,impulse=320*ratio;
    unit.vx+=nx*impulse;unit.vy-=Math.abs(ny)*impulse+130*ratio;unit.onGround=false;
    if(unit.health<=0)unit.alive=false;
  }
  if(enemyKills+allyKills>0)emitWarSfx(state,"ko", { team: projectile?.ownerTeam, source: projectile?.source, power: enemyKills+allyKills });
  else if(enemyDamage+allyDamage>0)emitWarSfx(state,"hit", { team: projectile?.ownerTeam, source: projectile?.source, power: (enemyDamage+allyDamage)/100 });
  emitWarSfx(state,"explosion", { team: projectile?.ownerTeam, source: projectile?.source });
  registerAiDetonationFeedback(state,projectile,{enemyDamage,allyDamage,enemyKills,allyKills,landingX:x,landingY:y});
  state.turn.settleMs=950;
}

function applyProjectilePhysics(state,dt){
  const p=state.projectile;if(!p)return;
  if(p.trail.length>16)p.trail.shift();
  p.trail.push({x:p.x,y:p.y});
  const px=p.x,py=p.y;
  p.vx+=state.wind*dt*(p.windFactor??0.4);p.vy+=GRAVITY*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.fuseMs-=dt*1000;
  if(p.x-p.radius<0){p.x=p.radius;p.vx=Math.abs(p.vx)*0.55;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });}
  else if(p.x+p.radius>WIDTH){p.x=WIDTH-p.radius;p.vx=-Math.abs(p.vx)*0.55;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });}
  if(p.y-p.radius<0){p.y=p.radius;p.vy=Math.abs(p.vy)*0.55;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });}
  for(const plat of state.map.platforms){
    const l=plat.x,r=plat.x+plat.w,top=plat.y,bot=plat.y+plat.h;
    if(p.x<l-p.radius||p.x>r+p.radius||p.y<top-p.radius||p.y>bot+p.radius)continue;
    if(py+p.radius<=top&&p.y+p.radius>=top&&p.vy>0){p.y=top-p.radius;p.vy=-Math.abs(p.vy)*0.52;p.vx*=0.90;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });continue;}
    if(py-p.radius>=bot&&p.y-p.radius<=bot&&p.vy<0){p.y=bot+p.radius;p.vy=Math.abs(p.vy)*0.5;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });continue;}
    if(px+p.radius<=l&&p.x+p.radius>=l&&p.vx>0){p.x=l-p.radius;p.vx=-Math.abs(p.vx)*0.55;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });continue;}
    if(px-p.radius>=r&&p.x-p.radius<=r&&p.vx<0){p.x=r+p.radius;p.vx=Math.abs(p.vx)*0.55;p.bounces++;emitWarSfx(state,"bounce", { source:p.source });}
  }
  if(p.fuseMs<=0||p.bounces>=8||p.y>HEIGHT+90)detonate(state,clamp(p.x,0,WIDTH),clamp(p.y,0,HEIGHT));
}

function updateParticles(state,dt){
  for(let i=state.particles.length-1;i>=0;i--){
    const p=state.particles[i];p.lifeMs-=dt*1000;
    p.vx*=0.96;p.vy+=GRAVITY*0.3*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.lifeMs<=0)state.particles.splice(i,1);
  }
}

function updateExplosions(state,dt){
  if(state.cameraShake>0)state.cameraShake=Math.max(0,state.cameraShake-dt*2.4);
  for(let i=state.explosions.length-1;i>=0;i--){
    const e=state.explosions[i];e.lifeMs-=dt*1000;
    const t=1-clamp(e.lifeMs/420,0,1);e.radius=12+(e.maxRadius-12)*t;
    if(e.lifeMs<=0)state.explosions.splice(i,1);
  }
}

function checkBattleEnd(state){
  const r=getAlive(state,"red").length,b=getAlive(state,"blue").length;
  if(r>0&&b>0)return false;
  state.winner=r<=0&&b<=0?"draw":r>0?"red":"blue";
  state.phase="match-over";state.mode="battle-over";
  state.turn.charging=false;state.projectile=null;state.ai.stage="idle";state.ai.plan=null;
  emitWarSfx(state,state.winner==="red"?"victory":"defeat", { team: state.winner });
  return true;
}

function handleHumanTurn(state,input,dt){
  const unit=getActiveUnit(state);if(!unit||!unit.alive)return;
  const v=state.virtual,ptr=state.pointer;
  const left=input.down("ArrowLeft")||input.down("KeyA")||v.left;
  const right=input.down("ArrowRight")||input.down("KeyD")||v.right;
  const jump=input.pressed("ArrowUp")||input.pressed("KeyW")||v.jump;
  const aimUp=input.down("KeyQ")||v.aimUp;
  const aimDown=input.down("KeyE")||v.aimDown;
  const toggleCannon=input.pressed("KeyC");
  const fireHeld=input.down("Space")||v.fire||ptr.down;
  const cancel=input.pressed("KeyX");
  const nearbyCannon=getNearbyTeamCannon(state,unit.team,unit.x,unit.y,CANNON_USE_RANGE);
  if(state.turn.usingCannon){
    const activeCannon=getCannonById(state,state.turn.cannonId);
    if(!activeCannon||!nearbyCannon||nearbyCannon.id!==activeCannon.id){
      state.turn.usingCannon=false;state.turn.cannonId=null;
    }
  }
  if(toggleCannon&&!state.turn.acted&&!state.projectile){
    if(state.turn.usingCannon){
      state.turn.usingCannon=false;state.turn.cannonId=null;
      emitWarSfx(state,"toggleCannon", { team: unit.team, source: "off" });
    } else if(nearbyCannon){
      state.turn.usingCannon=true;state.turn.cannonId=nearbyCannon.id;
      emitWarSfx(state,"toggleCannon", { team: unit.team, source: "on" });
    }
  }
  const activeCannon=state.turn.usingCannon?getCannonById(state,state.turn.cannonId):null;
  const aimAnchorX=activeCannon?activeCannon.x:unit.x;
  const aimAnchorY=activeCannon?activeCannon.y-18:unit.y-28;
  if(ptr.inside){
    const dx=ptr.x-aimAnchorX,dy=ptr.y-aimAnchorY;
    if(Math.hypot(dx,dy)>14)state.turn.aimDeg=normalizeAngleDeg(Math.atan2(dy,dx)*180/Math.PI);
  } else if(aimUp||aimDown){
    state.turn.aimDeg=normalizeAngleDeg(state.turn.aimDeg+(aimUp?-1:1)*80*dt);
  }
  const aimRad=state.turn.aimDeg*Math.PI/180;
  const hcos=Math.cos(aimRad);
  if(hcos>0.06)unit.facing=1;else if(hcos<-0.06)unit.facing=-1;
  if(!state.turn.acted&&!state.projectile){
    const dir=Number(right)-Number(left);
    if(dir!==0&&state.turn.movementLeft>0){
      const speed=unit.onGround?MOVE_SPEED:AIR_CONTROL;
      unit.vx=dir*speed;
      if(unit.onGround)state.turn.movementLeft=Math.max(0,state.turn.movementLeft-Math.abs(unit.vx)*dt);
      unit.facing=dir>0?1:-1;
    } else if(unit.onGround){unit.vx*=0.68;if(Math.abs(unit.vx)<3)unit.vx=0;}
    if(jump&&unit.onGround){unit.vy=-JUMP_SPEED;unit.onGround=false;emitWarSfx(state,"jump", { team: unit.team });}
  }
  if(cancel){state.turn.charging=false;state.turn.charge=0;state.turn.state="aiming";emitWarSfx(state,"cancel", { team: unit.team });}
  if(!state.turn.acted&&!state.projectile){
    if(fireHeld){
      if(!state.turn.charging)emitWarSfx(state,"charge", { team: unit.team });
      state.turn.charging=true;state.turn.charge=clamp(state.turn.charge+dt*0.9,0,1);state.turn.state="charging";
    }
    else if(state.turn.charging){spawnProjectile(state,unit);}
    else{state.turn.state="aiming";}
  }
}

function adoptCpuPlan(state,unit,plan){
  if(!plan){
    state.ai.plan=null;state.ai.targetId=null;
    state.ai.desiredAim=defaultAim(unit.team);state.ai.desiredCharge=0.58;
    state.turn.usingCannon=false;state.turn.cannonId=null;
    state.ai.lastDecision=null;
    return;
  }
  const tuned=tuneAiPlanShot(state,plan);
  state.ai.plan=plan;state.ai.targetId=plan.targetId??null;
  state.turn.usingCannon=Boolean(plan.useCannon);state.turn.cannonId=plan.useCannon?plan.cannonId??null:null;
  state.ai.desiredAim=tuned.angle;state.ai.desiredCharge=tuned.charge;
  state.ai.lastDecision={
    turn:state.turn.number,targetId:state.ai.targetId,platform:plan.platform,
    moveX:Math.round(plan.moveX),moveY:Math.round(plan.moveY),
    angle:Math.round(tuned.angle*10)/10,charge:Math.round(tuned.charge*1000)/1000,
    totalScore:Math.round((plan.totalScore??0)*10)/10,useCannon:Boolean(plan.useCannon),routeLen:plan.route?.length??0,
  };
}

function handleCpuTurn(state,dt){
  const unit=getActiveUnit(state);
  if(!unit||!unit.alive||state.turn.acted||state.projectile)return;
  if(state.turn.usingCannon){
    const cannon=getCannonById(state,state.turn.cannonId);
    const valid=Boolean(cannon&&Math.hypot(unit.x-cannon.x,unit.y-cannon.y)<=CANNON_USE_RANGE+4);
    if(!valid){state.turn.usingCannon=false;state.turn.cannonId=null;}
  }
  const aimFace=()=>{const r=state.turn.aimDeg*Math.PI/180,c=Math.cos(r);if(c>0.06)unit.facing=1;else if(c<-0.06)unit.facing=-1;};
  if(state.ai.lastMoveX==null)state.ai.lastMoveX=unit.x;
  if(state.ai.stage==="planning"){
    state.turn.state="planning";state.turn.charging=false;state.turn.charge=0;
    state.ai.timerMs-=dt*1000;
    if(!state.ai.plan||state.ai.timerMs<=0){
      adoptCpuPlan(state,unit,chooseAiPlan(state,unit));
      state.ai.stage="moving";state.ai.timerMs=0;state.ai.repathMs=0;state.ai.stuckMs=0;state.ai.lastMoveX=unit.x;
    }
    return;
  }
  if(state.ai.stage==="moving"){
    state.turn.state="moving";state.turn.charging=false;
    const arrived=moveCpuTowardPlan(state,unit,dt);
    const moved=Math.abs(unit.x-(state.ai.lastMoveX??unit.x));
    if(moved<0.35&&Math.abs(unit.vx)<4&&unit.onGround)state.ai.stuckMs+=dt*1000;
    else state.ai.stuckMs=Math.max(0,state.ai.stuckMs-dt*380);
    state.ai.lastMoveX=unit.x;
    state.ai.repathMs+=dt*1000;
    if(!arrived&&(state.ai.repathMs>=860||state.ai.stuckMs>=980)){
      adoptCpuPlan(state,unit,chooseAiPlan(state,unit));
      state.ai.repathMs=0;state.ai.stuckMs=0;
    }
    if(arrived){
      state.ai.stage="aiming";
      state.ai.timerMs=70+state.rng()*(120+(1-state.ai.confidence)*80);
      state.ai.repathMs=0;state.ai.stuckMs=0;state.ai.lastMoveX=unit.x;
      unit.vx*=0.65;if(Math.abs(unit.vx)<3)unit.vx=0;
    }
    return;
  }
  if(state.ai.stage==="aiming"){
    state.turn.state="aiming";state.turn.charging=false;
    state.ai.repathMs+=dt*1000;
    if(state.ai.repathMs>=240){
      adoptCpuPlan(state,unit,chooseAiPlan(state,unit));
      state.ai.repathMs=0;
    }
    const diff=angleDeltaDeg(state.turn.aimDeg,state.ai.desiredAim);
    state.turn.aimDeg=normalizeAngleDeg(state.turn.aimDeg+Math.sign(diff)*Math.min(Math.abs(diff),72*dt));
    aimFace();state.ai.timerMs=Math.max(0,state.ai.timerMs-dt*1000);
    if(Math.abs(diff)<=1.8&&state.ai.timerMs<=0){
      state.ai.stage="charging";state.turn.charging=true;state.turn.charge=0;
      emitWarSfx(state,"charge", { team: unit.team });
    }
    return;
  }
  if(state.ai.stage==="charging"){
    state.turn.state="charging";
    const da=normalizeAngleDeg(state.ai.desiredAim),dc=clamp(state.ai.desiredCharge,0.14,1);
    const diff=angleDeltaDeg(state.turn.aimDeg,da);
    state.turn.aimDeg=normalizeAngleDeg(state.turn.aimDeg+Math.sign(diff)*Math.min(Math.abs(diff),56*dt));
    aimFace();state.turn.charging=true;state.turn.charge=clamp(state.turn.charge+dt*0.76,0,1);
    if(state.turn.charge>=dc-0.006&&Math.abs(state.turn.aimDeg-da)<2.2){
      spawnProjectile(state,unit);state.ai.stage="idle";state.ai.plan=null;state.ai.timerMs=0;state.ai.repathMs=0;state.ai.stuckMs=0;
    }
    return;
  }
  state.ai.stage="planning";state.ai.timerMs=120;state.ai.plan=null;state.ai.repathMs=0;state.ai.stuckMs=0;state.turn.state="planning";
}

function maybeAdvanceTurn(state,dt){
  if(state.phase!=="playing"||state.projectile)return;
  if(state.turn.acted){
    if(state.turn.settleMs>0){state.turn.settleMs=Math.max(0,state.turn.settleMs-dt*1000);state.turn.state="resolving";return;}
    state.turn.number++;startTurn(state,state.turn.team==="red"?"blue":"red");return;
  }
  if(state.turn.remainingMs<=0){state.turn.charging=false;state.turn.charge=0;state.turn.acted=true;state.turn.settleMs=280;state.turn.state="resolving";}
}

function stepState(state,input,dt){
  state.frame=(state.frame||0)+1;
  if(input.pressed("KeyR")){Object.assign(state,restartFromAny(state));return;}
  if(input.pressed("KeyP")&&state.mode!=="menu"){state.phase=state.phase==="paused"?"playing":"paused";emitWarSfx(state,"pause");}
  if(state.mode==="menu"){state.turn.state="ready";return;}
  if(state.phase==="paused"||state.phase==="match-over"){updateExplosions(state,dt);updateParticles(state,dt);return;}
  const active=getActiveUnit(state);
  if((!active||!active.alive)&&!state.turn.acted&&!state.projectile){
    state.turn.charging=false;state.turn.charge=0;state.turn.acted=true;
    state.turn.settleMs=Math.max(state.turn.settleMs,220);state.turn.state="resolving";
  }
  state.turn.remainingMs=Math.max(0,state.turn.remainingMs-dt*1000);
  if(TEAM[state.turn.team].cpu)handleCpuTurn(state,dt);else handleHumanTurn(state,input,dt);
  applyProjectilePhysics(state,dt);applyUnitPhysics(state,dt);
  updateExplosions(state,dt);updateParticles(state,dt);
  if(checkBattleEnd(state))return;
  maybeAdvanceTurn(state,dt);
}

// ─── Drawing: faithfully recreating the original game's visual style ──────────

function drawCloud(ctx,c){
  ctx.save();
  // Puffy white clouds like the original game
  ctx.fillStyle="rgba(255,255,255,0.95)";
  for(const[ox,oy,rx,ry]of[
    [-c.w*0.28,c.h*0.08,c.w*0.28,c.h*0.48],
    [0,-c.h*0.10,c.w*0.32,c.h*0.55],
    [c.w*0.26,c.h*0.04,c.w*0.25,c.h*0.44],
    [-c.w*0.12,c.h*0.20,c.w*0.22,c.h*0.38],
    [c.w*0.12,c.h*0.18,c.w*0.20,c.h*0.36],
  ]){
    ctx.beginPath();ctx.ellipse(c.x+ox,c.y+oy,rx,ry,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function adjustColor(hex,amount){
  const n=parseInt(hex.slice(1),16);
  const r=clamp((n>>16)+amount,0,255),g=clamp(((n>>8)&0xff)+amount,0,255),b=clamp((n&0xff)+amount,0,255);
  return`rgb(${r},${g},${b})`;
}

// Draw platforms with the classic Territory War look
function drawPlatform(ctx,p,map){
  if(p.type==="log"){
    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.25)";
    ctx.beginPath();ctx.roundRect(p.x+3,p.y+5,p.w,p.h+4,3);ctx.fill();
    // Log body - warm brown with highlights like in the screenshots
    const logGrad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
    logGrad.addColorStop(0,"#c8873a");
    logGrad.addColorStop(0.3,"#a0611a");
    logGrad.addColorStop(1,"#6b3e10");
    ctx.fillStyle=logGrad;
    ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,3);ctx.fill();
    // Individual log segments - the characteristic look of Territory War
    const segW=24;
    for(let x=p.x+4;x<p.x+p.w-8;x+=segW){
      // Segment separator
      ctx.strokeStyle="rgba(80,40,10,0.6)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x+segW-1,p.y+2);ctx.lineTo(x+segW-1,p.y+p.h-2);ctx.stroke();
      // Knot circle
      const kx=x+segW/2,ky=p.y+p.h/2;
      ctx.fillStyle="#8B5014";
      ctx.beginPath();ctx.ellipse(kx,ky,6,5,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(60,30,5,0.7)";ctx.lineWidth=1;ctx.stroke();
      // Highlight on knot
      ctx.fillStyle="rgba(200,140,60,0.35)";
      ctx.beginPath();ctx.ellipse(kx-1.5,ky-1.5,3,2.5,0,0,Math.PI*2);ctx.fill();
    }
    // Top sheen
    ctx.fillStyle="rgba(255,200,120,0.18)";
    ctx.fillRect(p.x+2,p.y+1,p.w-4,4);
    // Outline
    ctx.strokeStyle="rgba(80,40,10,0.5)";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,3);ctx.stroke();
    return;
  }
  if(p.type==="stone"){
    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(p.x+4,p.y+5,p.w,p.h);
    // Stone face - grey layered like actual stone cliff
    const stGrad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
    stGrad.addColorStop(0,"#b0b8c4");
    stGrad.addColorStop(0.15,"#8a9aaa");
    stGrad.addColorStop(0.5,"#6b7a8a");
    stGrad.addColorStop(0.85,"#555f6a");
    stGrad.addColorStop(1,"#40484f");
    ctx.fillStyle=stGrad;ctx.fillRect(p.x,p.y,p.w,p.h);
    // Horizontal rock strata lines
    for(let y=p.y+16;y<p.y+p.h-4;y+=14){
      ctx.strokeStyle="rgba(60,70,80,0.45)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(p.x+2,y);ctx.lineTo(p.x+p.w-2,y);ctx.stroke();
    }
    // Crack / fissure details
    ctx.strokeStyle="rgba(40,50,60,0.5)";ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(p.x+p.w*0.28,p.y+6);ctx.lineTo(p.x+p.w*0.22,p.y+p.h*0.45);ctx.lineTo(p.x+p.w*0.30,p.y+p.h*0.7);
    ctx.moveTo(p.x+p.w*0.68,p.y+p.h*0.3);ctx.lineTo(p.x+p.w*0.74,p.y+p.h*0.75);
    ctx.stroke();
    // Top highlight edge
    ctx.fillStyle="rgba(255,255,255,0.18)";ctx.fillRect(p.x,p.y,p.w,5);
    // Left-side highlight
    ctx.fillStyle="rgba(255,255,255,0.08)";ctx.fillRect(p.x,p.y,4,p.h);
    // Outline
    ctx.strokeStyle="rgba(40,50,60,0.6)";ctx.lineWidth=1.5;ctx.strokeRect(p.x,p.y,p.w,p.h);
    return;
  }
  // Ground platform — thick with green top, brown dirt body
  ctx.fillStyle="rgba(0,0,0,0.18)";ctx.fillRect(p.x+3,p.y+4,p.w,p.h);
  // Dirt body
  const dirtGrad=ctx.createLinearGradient(p.x,p.y+22,p.x,p.y+p.h);
  dirtGrad.addColorStop(0,map.dirtColor);
  dirtGrad.addColorStop(0.5,"#4a2c10");
  dirtGrad.addColorStop(1,"#2a1608");
  ctx.fillStyle=dirtGrad;ctx.fillRect(p.x,p.y+22,p.w,p.h-22);
  // Dirt texture horizontal lines
  for(let y=p.y+38;y<p.y+p.h;y+=16){
    ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(p.x+4,y);ctx.lineTo(p.x+p.w-4,y);ctx.stroke();
  }
  // Grass top — bright green, thick like the original
  const grassGrad=ctx.createLinearGradient(p.x,p.y,p.x,p.y+26);
  grassGrad.addColorStop(0,adjustColor(map.groundColor,45));
  grassGrad.addColorStop(0.5,map.groundColor);
  grassGrad.addColorStop(1,adjustColor(map.groundColor,-20));
  ctx.fillStyle=grassGrad;ctx.fillRect(p.x,p.y,p.w,26);
  // Grass blade tufts along the top edge
  ctx.strokeStyle=adjustColor(map.groundColor,60);ctx.lineWidth=1.5;
  for(let x=p.x+8;x<p.x+p.w-6;x+=12){
    const h=4+Math.sin(x*0.3)*2;
    ctx.beginPath();
    ctx.moveTo(x,p.y+3);ctx.lineTo(x-3,p.y-h);
    ctx.moveTo(x+5,p.y+2);ctx.lineTo(x+7,p.y-h+1);
    ctx.stroke();
  }
  // Grass-to-dirt edge line
  ctx.strokeStyle="rgba(0,0,0,0.3)";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(p.x,p.y+24);ctx.lineTo(p.x+p.w,p.y+24);ctx.stroke();
}

// Draw stickman in the classic Territory War style - simple, bold black stickmen
function drawStickman(ctx,unit,isActive){
  const{x,y,team,health,alive,flashMs,facing}=unit;
  ctx.save();
  ctx.globalAlpha=alive?1:0.28;
  const isFlash=flashMs>0;
  const teamColor=TEAM[team].color;

  // Ground shadow ellipse
  if(alive){
    ctx.fillStyle="rgba(0,0,0,0.25)";
    ctx.beginPath();ctx.ellipse(x,y+5,13,4,0,0,Math.PI*2);ctx.fill();
  }

  // ── Classic stickman drawing ──
  const headY=y-36,bodyTop=y-27,bodyBot=y-10;
  const strokeColor=isFlash?"#ffff00":"#111111";
  const fillColor=isFlash?"#ffff44":"#222222";

  ctx.lineWidth=2.8;ctx.lineCap="round";ctx.lineJoin="round";

  // Body line
  ctx.strokeStyle=strokeColor;ctx.beginPath();ctx.moveTo(x,bodyTop);ctx.lineTo(x,bodyBot);ctx.stroke();

  // Arms - the classic T-shape arms from TW
  ctx.beginPath();
  ctx.moveTo(x-10,y-20);ctx.lineTo(x+10,y-20); // horizontal arm span
  ctx.stroke();
  // Forearm angles
  ctx.beginPath();
  ctx.moveTo(x+10,y-20);ctx.lineTo(x+13*facing,y-14); // throwing arm
  ctx.stroke();

  // Legs - A-shape
  ctx.beginPath();
  ctx.moveTo(x,bodyBot);ctx.lineTo(x-9,y+2);
  ctx.moveTo(x,bodyBot);ctx.lineTo(x+9,y+2);
  ctx.stroke();

  // Head - filled circle with border
  ctx.beginPath();ctx.arc(x,headY,9,0,Math.PI*2);
  ctx.fillStyle=fillColor;ctx.fill();
  ctx.strokeStyle=strokeColor;ctx.lineWidth=2;ctx.stroke();

  // Angry face features (like the original TW stickmen)
  if(alive){
    // Eyes
    ctx.fillStyle=isFlash?"#000":"#fff";
    ctx.beginPath();ctx.arc(x+facing*3.5,headY-1,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=isFlash?"#fff":"#111";
    ctx.beginPath();ctx.arc(x+facing*3.5,headY-1,1.2,0,Math.PI*2);ctx.fill();

    // Angry eyebrow
    ctx.strokeStyle=isFlash?"#000":"#cc0000";ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(x+facing*1,headY-5);
    ctx.lineTo(x+facing*7,headY-3);
    ctx.stroke();

    // Grimace/mouth
    ctx.strokeStyle=strokeColor;ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(x+facing*2,headY+4);ctx.lineTo(x+facing*7,headY+4);
    ctx.stroke();
  }

  // Team color cap/hat on head
  ctx.fillStyle=teamColor;
  ctx.beginPath();
  ctx.moveTo(x-9,headY-3);
  ctx.arc(x,headY,9,Math.PI,0);
  ctx.closePath();ctx.fill();
  // Hat brim
  ctx.fillStyle=adjustColor(teamColor,-20);
  ctx.fillRect(x-10,headY-4,20,4);

  // Name label above
  ctx.font="bold 11px Arial, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
  const nameW=ctx.measureText(unit.name).width+10;
  // Label background matching team color
  ctx.fillStyle=team==="red"?"rgba(180,0,0,0.82)":"rgba(0,0,180,0.82)";
  ctx.beginPath();ctx.roundRect(x-nameW/2,y-62,nameW,15,3);ctx.fill();
  ctx.fillStyle="#ffffff";ctx.fillText(unit.name,x,y-55);

  // HP bar under the feet
  if(alive){
    const barW=44;
    ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(x-barW/2,y+8,barW,7);
    const hpColor=health>60?"#22c55e":health>30?"#f59e0b":"#ef4444";
    ctx.fillStyle=hpColor;ctx.fillRect(x-barW/2,y+8,barW*(health/100),7);
    ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=0.8;ctx.strokeRect(x-barW/2,y+8,barW,7);
    // HP number
    ctx.font="bold 8px Arial";ctx.fillStyle="#fff";ctx.fillText(`${health}`,x,y+12);
  }

  // Active indicator — bouncing arrow (like the red triangle in TW)
  if(isActive&&alive){
    const bounce=Math.sin(Date.now()/180)*4;
    ctx.fillStyle=teamColor;
    ctx.strokeStyle="rgba(255,255,255,0.7)";ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(x,y-76-bounce);
    ctx.lineTo(x-11,y-92-bounce);
    ctx.lineTo(x+11,y-92-bounce);
    ctx.closePath();ctx.fill();ctx.stroke();
  }

  ctx.restore();
}

function drawCannons(ctx,state,activeUnit){
  for(const cannon of state.cannons){
    const teamColor=TEAM[cannon.team].color;
    const isActive=Boolean(
      activeUnit&&
      activeUnit.team===cannon.team&&
      Math.hypot(activeUnit.x-cannon.x,activeUnit.y-cannon.y)<=CANNON_USE_RANGE&&
      state.turn.cannonId===cannon.id&&
      state.turn.usingCannon
    );
    ctx.save();
    ctx.translate(cannon.x,cannon.y);
    ctx.fillStyle="rgba(0,0,0,0.28)";
    ctx.beginPath();ctx.ellipse(0,7,19,5,0,0,Math.PI*2);ctx.fill();
    const bodyGrad=ctx.createLinearGradient(-16,-20,20,8);
    bodyGrad.addColorStop(0,isActive?adjustColor(teamColor,42):"#9ca3af");
    bodyGrad.addColorStop(1,isActive?teamColor:"#4b5563");
    ctx.fillStyle=bodyGrad;
    ctx.beginPath();ctx.roundRect(-16,-16,30,14,5);ctx.fill();
    ctx.fillStyle="#1f2937";
    ctx.beginPath();ctx.roundRect(8,-22,18,10,3);ctx.fill();
    ctx.strokeStyle=isActive?adjustColor(teamColor,75):"#c7d2fe";
    ctx.lineWidth=2;ctx.strokeRect(-7,-22,10,6);
    ctx.strokeStyle="#111827";ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(12,-17);ctx.lineTo(26,-17);ctx.stroke();
    if(isActive){
      ctx.globalAlpha=0.72;
      ctx.fillStyle=teamColor;
      ctx.beginPath();ctx.arc(27,-17,4,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
}

// Draw the aiming line/trajectory indicator
function drawAimLine(ctx,state,unit){
  if(!unit||!unit.alive||state.turn.acted||state.projectile)return;
  const activeCannon=state.turn.usingCannon?getCannonById(state,state.turn.cannonId):null;
  const useCannon=Boolean(activeCannon&&Math.hypot(unit.x-activeCannon.x,unit.y-activeCannon.y)<=CANNON_USE_RANGE+4);
  const angle=state.turn.aimDeg*Math.PI/180;
  const ox=useCannon?activeCannon.x+Math.cos(angle)*22:unit.x;
  const oy=useCannon?activeCannon.y-18:unit.y-22;
  // Line length based on charge
  const len=(useCannon?65:50)+78*state.turn.charge;
  const tx=ox+Math.cos(angle)*len,ty=oy+Math.sin(angle)*len;

  // Dashed aim line
  ctx.save();
  ctx.setLineDash([5,4]);
  ctx.strokeStyle=useCannon?"rgba(255,220,120,0.8)":"rgba(255,255,255,0.65)";ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(tx,ty);ctx.stroke();
  ctx.setLineDash([]);

  // Colored dot trail
  for(let i=1;i<=7;i++){
    const r=i/8,alpha=0.25+r*0.75;
    const color=useCannon?`rgba(251,191,36,${alpha})`:(state.turn.team==="red"?`rgba(239,68,68,${alpha})`:`rgba(59,130,246,${alpha})`);
    ctx.fillStyle=color;
    ctx.beginPath();ctx.arc(ox+(tx-ox)*r,oy+(ty-oy)*r,3-r*0.5,0,Math.PI*2);ctx.fill();
  }

  // Arrowhead at tip
  ctx.fillStyle=useCannon?"#f59e0b":(state.turn.team==="red"?"#ef4444":"#3b82f6");
  ctx.save();ctx.translate(tx,ty);ctx.rotate(angle);
  ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-7,-5.5);ctx.lineTo(-7,5.5);ctx.closePath();ctx.fill();
  ctx.restore();ctx.restore();
}

function drawProjectile(ctx,p){
  if(!p)return;
  // Green trail (like the original TW grenade trail)
  if(p.trail.length>1){
    for(let i=1;i<p.trail.length;i++){
      const alpha=(i/p.trail.length)*0.6;
      ctx.strokeStyle=`rgba(80,200,80,${alpha})`;
      ctx.lineWidth=2.5*(i/p.trail.length);
      ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(p.trail[i-1].x,p.trail[i-1].y);ctx.lineTo(p.trail[i].x,p.trail[i].y);ctx.stroke();
    }
  }
  // Grenade body - dark round with sheen
  ctx.fillStyle="#2a3a18";
  ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3d5224";
  ctx.beginPath();ctx.arc(p.x-1,p.y-1,p.radius*0.55,0,Math.PI*2);ctx.fill();
  // Shine
  ctx.fillStyle="rgba(180,255,100,0.3)";
  ctx.beginPath();ctx.arc(p.x-2,p.y-2,p.radius*0.35,0,Math.PI*2);ctx.fill();
  // Pin/lever on top
  ctx.strokeStyle="#999";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(p.x,p.y-p.radius);ctx.lineTo(p.x,p.y-p.radius-5);ctx.stroke();
  ctx.strokeStyle="#888";
  ctx.beginPath();ctx.moveTo(p.x-3,p.y-p.radius-4);ctx.lineTo(p.x+3,p.y-p.radius-4);ctx.stroke();
  // Fuse blink when low
  const fr=p.fuseMs/1800;
  if(fr<0.4&&Math.floor(Date.now()/(fr<0.15?70:140))%2===0){
    ctx.globalAlpha=0.75;
    ctx.fillStyle="#ff4400";
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius+4,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
}

function drawExplosions(ctx,explosions,particles){
  for(const pt of particles){
    const alpha=clamp(pt.lifeMs/pt.maxLife,0,1);
    ctx.globalAlpha=alpha;ctx.fillStyle=pt.color;
    ctx.beginPath();ctx.arc(pt.x,pt.y,pt.radius*alpha,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const e of explosions){
    const alpha=clamp(e.lifeMs/420,0,1);
    ctx.globalAlpha=alpha*0.4;ctx.fillStyle="#f97316";
    ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=alpha*0.75;ctx.fillStyle="#fef08a";
    ctx.beginPath();ctx.arc(e.x,e.y,e.radius*0.42,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=alpha*0.55;ctx.strokeStyle="#fb923c";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(e.x,e.y,e.radius*1.25,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
  }
}

function drawWater(ctx,map){
  if(!map.water)return;
  const waterY=420;
  const grad=ctx.createLinearGradient(0,waterY,0,HEIGHT);
  grad.addColorStop(0,"rgba(30,140,220,0.65)");
  grad.addColorStop(0.3,"rgba(20,90,190,0.82)");
  grad.addColorStop(1,"rgba(10,40,110,0.96)");
  ctx.fillStyle=grad;ctx.fillRect(0,waterY,WIDTH,HEIGHT-waterY);
  // Surface foam
  ctx.fillStyle="rgba(200,240,255,0.22)";ctx.fillRect(0,waterY,WIDTH,7);
  // Wave ripples
  const t=Date.now()/700;
  for(let i=0;i<5;i++){
    const wy=waterY+8+i*13,al=0.28-i*0.04;
    ctx.strokeStyle=`rgba(140,210,255,${al})`;ctx.lineWidth=1.2;
    ctx.beginPath();
    for(let wx=0;wx<=WIDTH;wx+=3){
      const wy2=wy+Math.sin(wx/44+t+i*1.4)*3.5;
      if(wx===0)ctx.moveTo(wx,wy2);else ctx.lineTo(wx,wy2);
    }
    ctx.stroke();
  }
}

function drawBackground(ctx,state){
  const map=state.map;
  const[sky1,sky2]=map.skyColors;
  const grad=ctx.createLinearGradient(0,0,0,HEIGHT);
  grad.addColorStop(0,sky1);grad.addColorStop(1,sky2);
  ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,HEIGHT);

  // Stars for graveyard
  if(map.id==="graveyard"){
    ctx.fillStyle="rgba(220,230,255,0.75)";
    [[50,38],[130,22],[200,58],[280,28],[350,48],[440,18],[530,42],[620,25],[700,52],[770,32],[870,40],[920,15]].forEach(([sx,sy])=>{
      ctx.beginPath();ctx.arc(sx,sy,1.2,0,Math.PI*2);ctx.fill();
    });
  }

  // Background mountains
  const mountainShapes={
    wasteland:  [[0,520],[80,285],[200,320],[350,265],[500,310],[660,258],[800,305],[960,280],[960,520]],
    archipelago:[[0,520],[60,310],[180,345],[320,290],[470,330],[600,295],[760,320],[960,300],[960,520]],
    mesa:       [[0,520],[70,240],[160,260],[280,225],[420,255],[540,235],[660,260],[800,240],[960,255],[960,520]],
    graveyard:  [[0,520],[90,320],[210,340],[340,305],[480,340],[600,310],[720,340],[860,315],[960,330],[960,520]],
    canyon:     [[0,520],[50,200],[140,225],[260,195],[400,220],[520,200],[640,215],[780,198],[900,212],[960,205],[960,520]],
  };
  const shape1=mountainShapes[map.id]??mountainShapes.wasteland;
  ctx.fillStyle=map.mountainColor;ctx.globalAlpha=0.38;
  ctx.beginPath();shape1.forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py));ctx.closePath();ctx.fill();
  ctx.globalAlpha=0.20;ctx.fillStyle=adjustColor(map.mountainColor,-22);
  ctx.beginPath();shape1.map(([px,py],i)=>[px,i===0||i===shape1.length-1?py:py+40]).forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py));ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;
}

function drawMapDecorations(ctx,map){
  if(map.id==="mesa"){
    const sg=ctx.createLinearGradient(0,445,0,HEIGHT);sg.addColorStop(0,"#c2862a");sg.addColorStop(1,"#7a4810");
    ctx.fillStyle=sg;ctx.fillRect(0,445,WIDTH,HEIGHT-445);
    ["rgba(160,100,40,0.20)","rgba(180,120,50,0.14)","rgba(140,80,30,0.24)"].forEach((c,i)=>{ctx.fillStyle=c;ctx.fillRect(260,300+i*42,440,38);});
    const drawCactus=(cx,cy)=>{
      ctx.fillStyle="#4d7c0f";ctx.fillRect(cx-5,cy,10,55);
      ctx.fillRect(cx-18,cy+14,13,8);ctx.fillRect(cx-18,cy+7,8,15);
      ctx.fillRect(cx+5,cy+18,13,8);ctx.fillRect(cx+10,cy+11,8,15);
    };
    drawCactus(85,375);drawCactus(845,370);
  }
  if(map.id==="graveyard"){
    ctx.fillStyle="#181b22";ctx.fillRect(0,462,WIDTH,HEIGHT-462);
    // Moon
    ctx.fillStyle="rgba(215,215,248,0.88)";ctx.beginPath();ctx.arc(820,72,32,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(110,115,145,0.60)";ctx.beginPath();ctx.arc(836,62,28,0,Math.PI*2);ctx.fill();
    // Tombstones
    [[60,415],[108,410],[188,415],[740,415],[802,410],[862,415]].forEach(([tx,ty])=>{
      ctx.fillStyle="#374151";ctx.fillRect(tx,ty-30,18,30);
      ctx.beginPath();ctx.arc(tx+9,ty-30,9,Math.PI,0);ctx.fill();
      ctx.strokeStyle="#4b5563";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(tx+9,ty-24);ctx.lineTo(tx+9,ty-8);ctx.moveTo(tx+5,ty-18);ctx.lineTo(tx+13,ty-18);ctx.stroke();
    });
    ctx.strokeStyle="#374151";ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(490,430);ctx.lineTo(490,308);ctx.moveTo(490,340);ctx.lineTo(448,304);ctx.moveTo(490,356);ctx.lineTo(530,320);ctx.moveTo(490,372);ctx.lineTo(462,346);ctx.stroke();
  }
  if(map.id==="canyon"){
    const fg=ctx.createLinearGradient(0,462,0,HEIGHT);fg.addColorStop(0,"#8B6010");fg.addColorStop(1,"#4a3008");
    ctx.fillStyle=fg;ctx.fillRect(0,462,WIDTH,HEIGHT-462);
    const wc=["rgba(120,80,20,0.3)","rgba(100,60,10,0.2)","rgba(150,100,30,0.25)"];
    for(let i=0;i<5;i++){ctx.fillStyle=wc[i%3];ctx.fillRect(0,262+i*32,260,20);ctx.fillRect(722,262+i*32,238,20);}
    [[305,472],[425,467],[545,474],[665,470]].forEach(([rx,ry])=>{ctx.fillStyle="rgba(100,70,20,0.42)";ctx.beginPath();ctx.ellipse(rx,ry,24,11,0,0,Math.PI*2);ctx.fill();});
  }
}

// ── The classic bottom HUD bar matching the original Territory War style ──
function drawHUD(ctx,state){
  const grad=ctx.createLinearGradient(0,0,0,36);
  grad.addColorStop(0,"rgba(8,14,28,0.92)");
  grad.addColorStop(1,"rgba(3,8,20,0.86)");
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,WIDTH,36);
  ctx.fillStyle="rgba(148,163,184,0.28)";
  ctx.fillRect(0,35,WIDTH,1);

  const chipPad=10;
  const drawChip=(x,width,color)=>{
    ctx.fillStyle="rgba(15,23,42,0.82)";
    ctx.fillRect(x,6,width,24);
    ctx.strokeStyle=color;
    ctx.lineWidth=1;
    ctx.strokeRect(x+0.5,6.5,width-1,23);
  };
  drawChip(8,188,TEAM.red.color);
  drawChip(WIDTH-196,188,TEAM.blue.color);

  ctx.font="bold 12px Orbitron, sans-serif";
  ctx.textBaseline="middle";
  ctx.textAlign="left";
  ctx.fillStyle=TEAM.red.color;
  ctx.fillText(TEAM.red.label,chipPad+12,18);
  ctx.textAlign="right";
  ctx.fillStyle=TEAM.blue.color;
  ctx.fillText(TEAM.blue.label,WIDTH-chipPad-12,18);

  ctx.fillStyle="#e2e8f0";
  ctx.textAlign="center";
  ctx.font="700 13px Rajdhani, sans-serif";
  const windStr=`${state.wind<0?"<":">"} ${Math.abs(Math.round(state.wind))} WIND`;
  ctx.fillText(`TURN ${state.turn.number}   |   ${windStr}`,WIDTH*0.5,18);

  const tr=state.turn.remainingMs/TURN_MS;
  const timerColor=tr>0.4?"#22c55e":tr>0.15?"#f59e0b":"#ef4444";
  const secs=Math.ceil(state.turn.remainingMs/1000);
  ctx.strokeStyle=timerColor;
  ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.arc(WIDTH-60,18,12,-Math.PI/2,-Math.PI/2+tr*Math.PI*2);
  ctx.stroke();
  ctx.fillStyle=timerColor;
  ctx.font="bold 9px Orbitron, sans-serif";
  ctx.textAlign="center";
  ctx.fillText(String(secs),WIDTH-60,18);
}

// The bottom HUD panel with direction, angle, power in the TW style
function drawBottomHUD(ctx,state){
  // Already handled by React UI below canvas
}

function drawTeamIcons(ctx,state){
  const reds=getAlive(state,"red"),blues=getAlive(state,"blue");
  const drawMiniMan=(ix,iy,alive,color)=>{
    ctx.fillStyle=alive?color:"rgba(80,80,80,0.4)";
    ctx.beginPath();ctx.arc(ix,iy-8,4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=alive?color:"rgba(80,80,80,0.4)";ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(ix,iy-4);ctx.lineTo(ix,iy+4);
    ctx.moveTo(ix,iy);ctx.lineTo(ix-4,iy+2);ctx.moveTo(ix,iy);ctx.lineTo(ix+4,iy+2);
    ctx.moveTo(ix,iy+4);ctx.lineTo(ix-3,iy+9);ctx.moveTo(ix,iy+4);ctx.lineTo(ix+3,iy+9);
    ctx.stroke();
  };
  for(let i=0;i<state.teamSize;i++){drawMiniMan(14+i*20,52,i<reds.length,TEAM.red.color);}
  for(let i=0;i<state.teamSize;i++){drawMiniMan(WIDTH-14-i*20,52,i<blues.length,TEAM.blue.color);}

  // Team HP bars
  const rHP=state.units.filter(u=>u.team==="red").reduce((s,u)=>s+(u.alive?u.health:0),0);
  const bHP=state.units.filter(u=>u.team==="blue").reduce((s,u)=>s+(u.alive?u.health:0),0);
  const maxHP=state.teamSize*100;

  ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(10,65,168,9);
  ctx.fillStyle=TEAM.red.color;ctx.fillRect(10,65,168*(rHP/maxHP),9);
  ctx.strokeStyle="rgba(255,255,255,0.22)";ctx.lineWidth=1;ctx.strokeRect(10,65,168,9);

  ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(WIDTH-178,65,168,9);
  ctx.fillStyle=TEAM.blue.color;ctx.fillRect(WIDTH-178+168*(1-bHP/maxHP),65,168*(bHP/maxHP),9);
  ctx.strokeStyle="rgba(255,255,255,0.22)";ctx.lineWidth=1;ctx.strokeRect(WIDTH-178,65,168,9);
}

function drawScene(ctx,state){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  drawBackground(ctx,state);
  drawWater(ctx,state.map);
  drawMapDecorations(ctx,state.map);
  state.map.clouds.forEach(c=>drawCloud(ctx,c));
  state.map.platforms.forEach(p=>drawPlatform(ctx,p,state.map));
  const active=getActiveUnit(state);
  drawCannons(ctx,state,active);
  drawExplosions(ctx,state.explosions,state.particles);
  state.units.forEach(u=>drawStickman(ctx,u,state.phase==="playing"&&active?.id===u.id));
  drawProjectile(ctx,state.projectile);
  drawAimLine(ctx,state,active);
  drawHUD(ctx,state);
  drawTeamIcons(ctx,state);
}

function snapshotOf(state){
  const active=getActiveUnit(state);
  return{
    mode:state.mode,phase:state.phase,mapId:state.mapId,teamSize:state.teamSize,
    winner:state.winner,wind:state.wind,
    turn:{...state.turn,unitName:active?.name??null},
    teams:{red:{alive:getAlive(state,"red").length,total:state.teamSize},blue:{alive:getAlive(state,"blue").length,total:state.teamSize}},
    cannons:state.cannons.map((cannon)=>({...cannon})),
    ai:{
      stage:state.ai.stage,targetId:state.ai.targetId,confidence:state.ai.confidence,aggression:state.ai.aggression,
      aimBias:state.ai.aimBias,chargeBias:state.ai.chargeBias,stagnantTurns:state.ai.stagnantTurns,lastDecision:state.ai.lastDecision,
      recentShots:state.ai.recentShots.slice(-5),
    },
    units:state.units.map(u=>({...u})),
    projectile:state.projectile?{x:Math.round(state.projectile.x),y:Math.round(state.projectile.y),vx:Math.round(state.projectile.vx),vy:Math.round(state.projectile.vy),fuseMs:Math.round(state.projectile.fuseMs),source:state.projectile.source}:null,
    explosions:state.explosions.map(e=>({x:Math.round(e.x),y:Math.round(e.y),radius:Math.round(e.radius)})),
    audio:{
      ...(state.audio?.snapshot?.()||{unlocked:false,available:false,contextState:"idle",muted:readStoredTerritoryWarMuted(),lastEvent:null,eventCount:0}),
      lastGameEvent:state.audioLastEvent,
    },
  };
}

// ─── CSS — faithful to the original Territory War flash game UI ───────────────
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Rajdhani:wght@500;700&display=swap');

  *{box-sizing:border-box;margin:0;padding:0;}

  .tw-root{
    --tw-bg-1:#050a18;
    --tw-bg-2:#0f1729;
    --tw-panel:rgba(5,10,24,0.84);
    --tw-border:rgba(148,163,184,0.34);
    --tw-text:#e5eefc;
    --tw-muted:#9cb0cf;
    background:
      radial-gradient(circle at 10% 2%, rgba(239,68,68,0.18), transparent 40%),
      radial-gradient(circle at 92% 4%, rgba(56,189,248,0.2), transparent 44%),
      linear-gradient(165deg,var(--tw-bg-1),var(--tw-bg-2));
    color:var(--tw-text);
    font-family:"Rajdhani",sans-serif;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    padding:12px;
    gap:10px;
  }

  .tw-top-bar{
    width:100%;
    max-width:980px;
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
    padding:10px 12px;
    border:1px solid var(--tw-border);
    border-radius:14px;
    background:
      linear-gradient(152deg, rgba(15,23,42,0.9), rgba(11,17,32,0.9)),
      radial-gradient(circle at 10% 10%, rgba(239,68,68,0.14), transparent 35%),
      radial-gradient(circle at 90% 80%, rgba(59,130,246,0.18), transparent 42%);
    box-shadow:0 20px 36px rgba(2,6,23,0.52);
  }

  .tw-title-block{display:grid;gap:2px;}

  .tw-title{
    font-family:"Orbitron",sans-serif;
    font-size:18px;
    font-weight:800;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:#f9fbff;
    text-shadow:0 0 14px rgba(56,189,248,0.34);
  }

  .tw-subtitle{
    font-size:14px;
    color:var(--tw-muted);
    letter-spacing:0.02em;
  }

  .tw-toolbar-right{
    display:grid;
    gap:8px;
    justify-items:end;
  }

  .tw-config{
    display:grid;
    grid-template-columns:repeat(2, minmax(180px, 1fr));
    gap:8px;
    padding:8px;
    border:1px solid rgba(148,163,184,0.32);
    border-radius:12px;
    background:rgba(15,23,42,0.72);
  }

  .tw-config label{
    display:grid;
    gap:3px;
    color:#dbeafe;
  }

  .tw-config label span{
    font-family:"Orbitron",sans-serif;
    font-size:11px;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:#93c5fd;
  }

  .tw-config select{
    height:34px;
    padding:0 10px;
    border:1px solid rgba(147,197,253,0.5);
    border-radius:10px;
    background:rgba(2,6,23,0.75);
    color:#f8fafc;
    font-family:"Rajdhani",sans-serif;
    font-size:16px;
    font-weight:700;
  }

  .tw-actions{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    justify-content:flex-end;
  }

  .tw-btn{
    min-height:34px;
    padding:0 13px;
    border:1px solid rgba(148,163,184,0.36);
    border-radius:10px;
    background:linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88));
    color:#e2e8f0;
    font-family:"Orbitron",sans-serif;
    font-size:12px;
    font-weight:700;
    letter-spacing:0.04em;
    cursor:pointer;
    transition:transform 0.14s ease, border-color 0.14s ease, filter 0.14s ease;
    text-transform:uppercase;
  }

  .tw-btn:hover{
    transform:translateY(-1px);
    border-color:rgba(125,211,252,0.8);
    filter:brightness(1.08);
  }

  .tw-btn:active{transform:translateY(0);}

  .tw-btn.red-btn{
    background:linear-gradient(145deg, rgba(220,38,38,0.92), rgba(185,28,28,0.96));
    border-color:rgba(254,202,202,0.56);
    color:#fff;
  }

  .tw-btn.blue-btn{
    background:linear-gradient(145deg, rgba(37,99,235,0.92), rgba(30,64,175,0.98));
    border-color:rgba(191,219,254,0.6);
    color:#fff;
  }

  .tw-stage-wrap{
    position:relative;
    width:100%;
    max-width:980px;
    border:1px solid rgba(148,163,184,0.34);
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 24px 42px rgba(2,6,23,0.58);
  }

  .tw-canvas{
    display:block;
    width:100%;
    height:auto;
    background:#020617;
    image-rendering:auto;
  }

  .tw-overlay{
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    background:rgba(2,6,23,0.72);
    backdrop-filter:blur(4px);
  }

  .tw-overlay-card{
    width:min(420px, 90%);
    border:1px solid rgba(125,211,252,0.42);
    border-radius:16px;
    padding:22px 24px;
    background:linear-gradient(155deg, rgba(15,23,42,0.95), rgba(2,6,23,0.94));
    box-shadow:0 20px 40px rgba(2,6,23,0.6);
    text-align:center;
  }

  .tw-overlay-card h2{
    font-family:"Orbitron",sans-serif;
    font-size:18px;
    letter-spacing:0.08em;
    margin-bottom:10px;
    text-transform:uppercase;
  }

  .tw-overlay-card p{
    color:#b6c5dd;
    font-size:17px;
    margin-bottom:14px;
    line-height:1.4;
  }

  .tw-overlay-card .tw-btn{
    width:100%;
    min-height:38px;
    font-size:13px;
  }

  .tw-winner-name{
    font-family:"Orbitron",sans-serif;
    font-size:18px;
    margin:8px 0 16px;
    letter-spacing:0.05em;
  }

  .tw-hud{
    width:100%;
    max-width:980px;
    display:grid;
    grid-template-columns:minmax(128px,148px) minmax(0,1fr) minmax(150px,176px) minmax(88px,104px) minmax(155px,188px);
    gap:0;
    border:1px solid var(--tw-border);
    border-radius:14px;
    overflow:hidden;
    background:linear-gradient(165deg, rgba(15,23,42,0.96), rgba(2,6,23,0.95));
    box-shadow:0 18px 30px rgba(2,6,23,0.52);
  }

  .tw-hud-portrait{
    background:linear-gradient(170deg, rgba(30,41,59,0.88), rgba(15,23,42,0.96));
    border-right:1px solid rgba(148,163,184,0.28);
    padding:9px 8px;
    display:grid;
    justify-items:center;
    gap:4px;
  }

  .tw-portrait-label{
    font-family:"Orbitron",sans-serif;
    font-size:10px;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:#a5b4fc;
  }

  .tw-portrait-face{
    width:54px;
    height:54px;
    border-radius:10px;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:inset 0 0 18px rgba(15,23,42,0.8);
  }

  .tw-portrait-name{
    font-family:"Orbitron",sans-serif;
    font-size:12px;
    letter-spacing:0.03em;
    color:#f8fafc;
    text-align:center;
  }

  .tw-portrait-hp{
    font-size:15px;
    font-weight:700;
  }

  .tw-hud-controls{
    display:grid;
    grid-template-columns:repeat(3, minmax(0, 1fr));
    grid-template-areas:
      "move jump angle"
      "throw throw throw";
    gap:8px 10px;
    align-content:center;
    padding:9px 10px;
    border-right:1px solid rgba(148,163,184,0.2);
  }

  .tw-ctrl-group{
    display:grid;
    justify-items:center;
    gap:4px;
  }

  .tw-ctrl-label{
    font-family:"Orbitron",sans-serif;
    font-size:9px;
    color:#93c5fd;
    letter-spacing:0.08em;
    text-transform:uppercase;
  }

  .tw-ctrl-row{
    display:flex;
    gap:4px;
  }

  .tw-ctrl-group-move{grid-area:move;}
  .tw-ctrl-group-jump{grid-area:jump;}
  .tw-ctrl-group-angle{grid-area:angle;}
  .tw-ctrl-group-throw{grid-area:throw;}

  .tw-ctrl-group-throw .tw-ctrl-row{
    justify-content:center;
    flex-wrap:wrap;
    row-gap:4px;
  }

  .tw-arr-btn{
    min-width:36px;
    height:34px;
    padding:0 9px;
    border:1px solid rgba(148,163,184,0.5);
    border-radius:10px;
    background:linear-gradient(150deg, rgba(30,41,59,0.94), rgba(15,23,42,0.92));
    color:#e2e8f0;
    font-size:16px;
    font-family:"Orbitron",sans-serif;
    font-weight:700;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    transition:transform 0.12s ease, filter 0.12s ease, border-color 0.12s ease;
    user-select:none;
    -webkit-touch-callout:none;
    touch-action:manipulation;
  }

  .tw-arr-btn:hover{
    border-color:rgba(125,211,252,0.86);
    filter:brightness(1.08);
    transform:translateY(-1px);
  }

  .tw-arr-btn:active{transform:translateY(0);}

  .tw-arr-btn.wide{min-width:78px;}

  .tw-ctrl-group-throw .tw-arr-btn.wide{min-width:96px;}

  .tw-arr-btn.red-act{
    background:linear-gradient(145deg, rgba(239,68,68,0.95), rgba(185,28,28,0.97));
    border-color:rgba(254,202,202,0.72);
    color:#fff;
    font-size:12px;
    letter-spacing:0.04em;
  }

  .tw-arr-btn.cancel-btn{
    min-width:62px;
    font-size:11px;
  }

  .tw-hud-power{
    border-right:1px solid rgba(148,163,184,0.24);
    padding:9px 10px;
    display:grid;
    align-content:center;
    justify-items:center;
    gap:4px;
    background:linear-gradient(170deg, rgba(15,23,42,0.86), rgba(2,6,23,0.94));
  }

  .tw-power-label{
    font-family:"Orbitron",sans-serif;
    font-size:10px;
    color:#93c5fd;
    letter-spacing:0.09em;
    text-transform:uppercase;
  }

  .tw-power-bar-outer{
    width:100%;
    height:24px;
    border:1px solid rgba(148,163,184,0.45);
    border-radius:8px;
    overflow:hidden;
    background:rgba(2,6,23,0.82);
  }

  .tw-power-fill{
    height:100%;
    transition:width 0.04s;
    background:linear-gradient(92deg, #22c55e 0%, #84cc16 26%, #facc15 52%, #f97316 74%, #ef4444 100%);
  }

  .tw-power-pct{
    font-family:"Orbitron",sans-serif;
    font-size:14px;
    color:#f8fafc;
  }

  .tw-hud-timer{
    border-right:1px solid rgba(148,163,184,0.24);
    display:grid;
    align-content:center;
    justify-items:center;
    gap:2px;
    padding:9px 8px;
    background:linear-gradient(170deg, rgba(30,41,59,0.84), rgba(15,23,42,0.96));
  }

  .tw-timer-label{
    font-family:"Orbitron",sans-serif;
    font-size:9px;
    letter-spacing:0.08em;
    color:#a5b4fc;
    text-transform:uppercase;
  }

  .tw-timer-value{
    font-family:"Orbitron",sans-serif;
    font-size:20px;
    font-weight:800;
    line-height:1;
  }

  .tw-hud-options{
    padding:9px 10px;
    display:grid;
    align-content:center;
    gap:4px;
    background:linear-gradient(170deg, rgba(15,23,42,0.88), rgba(2,6,23,0.95));
  }

  .tw-opts-label{
    font-family:"Orbitron",sans-serif;
    font-size:9px;
    letter-spacing:0.08em;
    color:#93c5fd;
    text-transform:uppercase;
    margin-bottom:2px;
  }

  .tw-opts-row{
    font-size:14px;
    color:#a5b4d3;
    display:flex;
    justify-content:space-between;
    gap:6px;
  }

  .tw-opts-row strong{
    color:#e2e8f0;
    font-weight:700;
  }

  .tw-info-panel{
    background:linear-gradient(165deg, rgba(15,23,42,0.85), rgba(2,6,23,0.92));
    border:1px solid rgba(148,163,184,0.3);
    border-radius:12px;
    padding:10px 12px;
    flex:1;
    min-width:180px;
  }

  .tw-info-title{
    display:block;
    font-family:"Orbitron",sans-serif;
    font-size:10px;
    color:#93c5fd;
    letter-spacing:0.08em;
    text-transform:uppercase;
    margin-bottom:6px;
  }

  .tw-info-stat{
    display:flex;
    justify-content:space-between;
    font-size:15px;
    color:#cbd5e1;
    margin-bottom:4px;
  }

  .tw-info-stat strong{font-family:"Orbitron",sans-serif;}

  .tw-touch-controls{
    width:100%;
    max-width:980px;
    display:flex;
    justify-content:space-between;
    gap:10px;
  }

  .tw-touch-group{display:flex;gap:6px;flex-wrap:wrap;}

  .tw-touch-group .tw-arr-btn{
    min-width:56px;
    height:42px;
    padding:0 14px;
    font-size:14px;
  }

  @media (max-width:980px){
    .tw-top-bar{align-items:stretch;}
    .tw-toolbar-right{width:100%;justify-items:start;}
    .tw-config{width:100%;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));}
    .tw-actions{justify-content:flex-start;}
    .tw-hud{
      grid-template-columns:minmax(120px,140px) 1fr minmax(120px,145px);
      grid-template-areas:
        "portrait controls controls"
        "power timer options";
    }
    .tw-hud-portrait{grid-area:portrait;}
    .tw-hud-controls{
      grid-area:controls;
      grid-template-columns:repeat(2,minmax(0,1fr));
      grid-template-areas:
        "move jump"
        "angle angle"
        "throw throw";
    }
    .tw-hud-power{grid-area:power;}
    .tw-hud-timer{grid-area:timer;}
    .tw-hud-options{grid-area:options;}
  }

  @media (max-width:720px){
    .tw-root{padding:10px;gap:8px;}
    .tw-title{font-size:16px;}
    .tw-subtitle{font-size:13px;}
    .tw-actions{width:100%;}
    .tw-btn{flex:1;}
    .tw-hud{
      grid-template-columns:1fr;
      grid-template-areas:none;
    }
    .tw-hud-portrait,.tw-hud-controls,.tw-hud-power,.tw-hud-timer,.tw-hud-options{
      border-right:none;
      border-top:1px solid rgba(148,163,184,0.18);
    }
    .tw-hud-portrait{border-top:none;}
    .tw-hud-controls{
      grid-template-columns:repeat(2,minmax(0,1fr));
      grid-template-areas:
        "move jump"
        "angle angle"
        "throw throw";
    }
    .tw-touch-controls{flex-direction:column;}
    .tw-touch-group{justify-content:center;}
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function TerritoryWar(){
  const canvasRef=useRef(null);
  const stateRef=useRef(createState({mode:"menu"}));
  const inputRef=useRef(createInput());
  const audioRef=useRef(null);
  const[snapshot,setSnapshot]=useState(()=>snapshotOf(stateRef.current));
  const[audioMuted,setAudioMuted]=useState(readStoredTerritoryWarMuted);
  const rafRef=useRef(null);

  const sync=useCallback(()=>setSnapshot(snapshotOf(stateRef.current)),[]);
  useEffect(()=>{
    audioRef.current=createTerritoryWarAudio(audioMuted);
    stateRef.current.audio=audioRef.current;
    return()=>{
      audioRef.current?.dispose?.();
      if(stateRef.current.audio===audioRef.current)stateRef.current.audio=null;
    };
  },[]);

  const unlockAudio=useCallback(()=>{audioRef.current?.unlock?.();},[]);
  const toggleAudioMuted=useCallback(()=>{
    unlockAudio();
    const nextMuted=audioRef.current?.toggleMuted?.();
    setAudioMuted(Boolean(nextMuted));
    sync();
  },[sync,unlockAudio]);
  const start=useCallback(()=>{unlockAudio();stateRef.current=battleFromMenu(stateRef.current);sync();},[sync,unlockAudio]);
  const restart=useCallback(()=>{unlockAudio();stateRef.current=restartFromAny(stateRef.current);sync();},[sync,unlockAudio]);
  const pause=useCallback(()=>{
    unlockAudio();
    const s=stateRef.current;if(s.mode==="menu")return;
    s.phase=s.phase==="paused"?"playing":"paused";emitWarSfx(s,"pause");sync();
  },[sync,unlockAudio]);

  const setMap=useCallback((id)=>{
    const s=stateRef.current;if(s.mode!=="menu")return;
    const map=findMap(id);s.mapId=map.id;s.map=map;
    s.cannons=buildMapCannons(map);s.turn.usingCannon=false;s.turn.cannonId=null;
    s.units=createUnits(s.teamSize,map);s.turn.unitId=s.units.find(u=>u.team==="red")?.id??null;sync();
  },[sync]);

  const setTeamSize=useCallback((v)=>{
    const s=stateRef.current;if(s.mode!=="menu")return;
    s.teamSize=clamp(Number(v),1,6);s.units=createUnits(s.teamSize,s.map);
    s.turn.unitId=s.units.find(u=>u.team==="red")?.id??null;sync();
  },[sync]);

  const setVirtual=useCallback((name,value)=>{if(value)unlockAudio();stateRef.current.virtual[name]=value;},[unlockAudio]);

  const holdProps=(name)=>({
    onMouseDown:()=>setVirtual(name,true),
    onMouseUp:()=>setVirtual(name,false),
    onMouseLeave:()=>setVirtual(name,false),
    onTouchStart:(e)=>{e.preventDefault();setVirtual(name,true);},
    onTouchEnd:(e)=>{e.preventDefault();setVirtual(name,false);},
    onContextMenu:(e)=>e.preventDefault(),
  });
  const tapProps=(name)=>({
    onMouseDown:()=>{setVirtual(name,true);setTimeout(()=>setVirtual(name,false),80);},
    onTouchStart:(e)=>{e.preventDefault();setVirtual(name,true);setTimeout(()=>setVirtual(name,false),80);},
    onContextMenu:(e)=>e.preventDefault(),
  });

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    syncCanvasResolution(canvas,ctx);
    let last=performance.now(),acc=0,snapAcc=0;
    const frame=(ts)=>{
      const delta=Math.min(90,ts-last);last=ts;acc+=delta;
      while(acc>=DT_MS){stepState(stateRef.current,inputRef.current,DT);acc-=DT_MS;}
      syncCanvasResolution(canvas,ctx);
      const state=stateRef.current;
      const shake=state.cameraShake*5;
      const ox=shake>0?(state.rng()-0.5)*shake:0;
      const oy=shake>0?(state.rng()-0.5)*shake:0;
      ctx.save();ctx.translate(ox,oy);drawScene(ctx,state);ctx.restore();
      inputRef.current.clearPressed();
      snapAcc+=delta;if(snapAcc>=70){setSnapshot(snapshotOf(state));snapAcc=0;}
      rafRef.current=requestAnimationFrame(frame);
    };
    rafRef.current=requestAnimationFrame(frame);
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  useEffect(()=>{
    const keys=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyA","KeyD","KeyW","KeyQ","KeyE","KeyX","KeyC","KeyR","KeyP"]);
    const onDown=(e)=>{
      if(e.code==="Enter"&&stateRef.current.mode==="menu"){e.preventDefault();unlockAudio();start();return;}
      if(!keys.has(e.code))return;e.preventDefault();unlockAudio();inputRef.current.press(e.code);
    };
    const onUp=(e)=>{if(keys.has(e.code)){e.preventDefault();inputRef.current.release(e.code);}};
    window.addEventListener("keydown",onDown);window.addEventListener("keyup",onUp);
    return()=>{window.removeEventListener("keydown",onDown);window.removeEventListener("keyup",onUp);};
  },[start,unlockAudio]);

  useEffect(()=>{
    const renderGameToText=()=>JSON.stringify(snapshotOf(stateRef.current));
    const advanceTime=(ms=DT_MS)=>{
      const totalMs=Math.max(0,Number(ms)||0);
      const steps=Math.max(1,Math.round(totalMs/DT_MS));
      for(let i=0;i<steps;i++){
        stepState(stateRef.current,inputRef.current,DT);
        inputRef.current.clearPressed();
      }
      sync();
    };
    window.render_game_to_text=renderGameToText;
    window.advanceTime=advanceTime;
    return()=>{
      if(window.render_game_to_text===renderGameToText)delete window.render_game_to_text;
      if(window.advanceTime===advanceTime)delete window.advanceTime;
    };
  },[sync]);

  const sn=snapshot;
  const activeUnit=sn.units.find(u=>u.id===sn.turn.unitId);
  const powerPct=sn.turn.charge*100;
  const timerSecs=Math.ceil(sn.turn.remainingMs/1000);
  const timerColor=timerSecs>15?"#44dd44":timerSecs>7?"#ffcc00":"#ff3333";

  const isTouch=typeof window!=="undefined"&&((window.matchMedia?.("(pointer: coarse)")?.matches)||(navigator.maxTouchPoints??0)>0);

  return(
    <>
      <style>{CSS}</style>
      <div className="tw-root">

        {/* Top bar */}
        <div className="tw-top-bar">
          <div className="tw-title-block">
            <div className="tw-title">Territory Game</div>
            <div className="tw-subtitle">Tactical stick duel with revamped command HUD</div>
          </div>
          <div className="tw-toolbar-right">
            {sn.mode==="menu"&&(
              <div className="tw-config">
                <label><span>Battlefield</span>
                  <select value={sn.mapId} onChange={e=>setMap(e.target.value)}>
                    {MAPS.map(m=><option key={m.id} value={m.id}>{m.name}{m.water?" 🌊":""}</option>)}
                  </select>
                </label>
                <label><span>Squad size</span>
                  <select value={sn.teamSize} onChange={e=>setTeamSize(e.target.value)}>
                    {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}v{n}</option>)}
                  </select>
                </label>
              </div>
            )}
            <div className="tw-actions">
              <button
                className="tw-btn"
                onClick={toggleAudioMuted}
                aria-pressed={!audioMuted}
                title={audioMuted?"Enable sound effects":"Disable sound effects"}
              >
                {audioMuted?"SOUND OFF":"SOUND ON"}
              </button>
              <button className="tw-btn red-btn" onClick={start}>▶ START</button>
              <button className="tw-btn" onClick={restart}>↺ RESTART</button>
              {sn.mode!=="menu"&&<button className="tw-btn" onClick={pause}>{sn.phase==="paused"?"▶ RESUME":"⏸ PAUSE"}</button>}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="tw-stage-wrap">
          <canvas
            ref={canvasRef}
            className="tw-canvas"
            width={WIDTH}height={HEIGHT}
            onPointerMove={e=>{
              const rect=e.currentTarget.getBoundingClientRect();
              const x=((e.clientX-rect.left)/rect.width)*WIDTH;
              const y=((e.clientY-rect.top)/rect.height)*HEIGHT;
              stateRef.current.pointer.x=clamp(x,0,WIDTH);
              stateRef.current.pointer.y=clamp(y,0,HEIGHT);
              stateRef.current.pointer.inside=x>=0&&x<=WIDTH&&y>=0&&y<=HEIGHT;
            }}
            onPointerDown={()=>{unlockAudio();stateRef.current.pointer.down=true;}}
            onPointerUp={()=>{stateRef.current.pointer.down=false;}}
            onPointerLeave={()=>{stateRef.current.pointer.down=false;stateRef.current.pointer.inside=false;}}
          />

          {sn.mode==="menu"&&(
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Territory Game</h2>
                <p style={{color:"#6688aa",marginBottom:6,fontSize:15}}>{MAP_DESC[sn.mapId]??"Tactical stickman combat."}</p>
                <p>Eliminate all enemies using grenades and long-range cannons. Aim carefully, manage power, and exploit terrain resources.</p>
                <br/>
                <button className="tw-btn red-btn" onClick={start}>▶ Start Battle</button>
              </div>
            </div>
          )}
          {sn.phase==="paused"&&(
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Paused</h2><p>Game is paused.</p>
                <button className="tw-btn" onClick={pause}>▶ Resume</button>
              </div>
            </div>
          )}
          {sn.phase==="match-over"&&(
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Battle Over!</h2>
                <div className="tw-winner-name" style={{color:sn.winner==="red"?"#ff4444":sn.winner==="blue"?"#4488ff":"#888"}}>
                  {sn.winner==="draw"?"Stalemate!":sn.winner==="red"?`${TEAM.red.label} win!`:`${TEAM.blue.label} win!`}
                </div>
                <button className="tw-btn red-btn" onClick={restart}>↺ Play Again</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Classic bottom HUD bar matching Territory War ── */}
        {sn.mode!=="menu"&&(
          <div className="tw-hud">

            {/* Portrait / Active unit */}
            <div className="tw-hud-portrait">
              <div className="tw-portrait-label">{TEAM[sn.turn.team].cpu?"IA":"Usuario"}</div>
              {/* SVG stickman portrait */}
              <div className="tw-portrait-face" style={{background:sn.turn.team==="red"?"#2a0808":"#08082a",border:`2px solid ${TEAM[sn.turn.team].color}`}}>
                <svg width="44" height="52" viewBox="0 0 44 52">
                  <circle cx="22" cy="11" r="9" fill="#222" stroke={TEAM[sn.turn.team].color} strokeWidth="2"/>
                  <rect x="17" y="5" width="10" height="7" fill={TEAM[sn.turn.team].color} rx="1"/>
                  <circle cx="25" cy="11" r="2" fill="#fff"/>
                  <line x1="22" y1="20" x2="22" y2="36" stroke="#222" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="11" y1="27" x2="33" y2="27" stroke="#222" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="22" y1="36" x2="14" y2="46" stroke="#222" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="22" y1="36" x2="30" y2="46" stroke="#222" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="tw-portrait-name">{activeUnit?.name??"—"}</div>
              <div className="tw-portrait-hp" style={{color:activeUnit?.health>60?"#66dd66":activeUnit?.health>30?"#ffcc44":"#ff4444"}}>
                {activeUnit?.alive?`${activeUnit.health}/100`:"---"}
              </div>
            </div>

            {/* Direction + Angle + Throw controls */}
            <div className="tw-hud-controls">
              {/* Direction */}
              <div className="tw-ctrl-group tw-ctrl-group-move">
                <div className="tw-ctrl-label">Direction</div>
                <div className="tw-ctrl-row">
                  <button className="tw-arr-btn" {...holdProps("left")}>◀</button>
                  <button className="tw-arr-btn" {...holdProps("right")}>▶</button>
                </div>
              </div>
              {/* Jump */}
              <div className="tw-ctrl-group tw-ctrl-group-jump">
                <div className="tw-ctrl-label">Jump</div>
                <button className="tw-arr-btn wide" {...tapProps("jump")}>▲ Jump</button>
              </div>
              {/* Angle */}
              <div className="tw-ctrl-group tw-ctrl-group-angle">
                <div className="tw-ctrl-label">Angle</div>
                <div className="tw-ctrl-row">
                  <button className="tw-arr-btn" {...holdProps("aimUp")}>▲</button>
                  <button className="tw-arr-btn" {...holdProps("aimDown")}>▼</button>
                </div>
                <div style={{fontSize:13,color:"#aaa",textAlign:"center"}}>{Math.round(sn.turn.aimDeg)}°</div>
              </div>
              {/* Throw + Cancel */}
              <div className="tw-ctrl-group tw-ctrl-group-throw">
                <div className="tw-ctrl-label">Throw (hold)</div>
                <div className="tw-ctrl-row">
                  <button className="tw-arr-btn wide red-act" {...holdProps("fire")}>
                    {sn.turn.charging?"🔥 Hold!":"⚡ SPACE"}
                  </button>
                  <button className="tw-arr-btn"
                    onMouseDown={()=>inputRef.current.press("KeyC")}
                    onMouseUp={()=>inputRef.current.release("KeyC")}
                    onTouchStart={(e)=>{e.preventDefault();inputRef.current.press("KeyC");}}
                    onTouchEnd={(e)=>{e.preventDefault();inputRef.current.release("KeyC");}}>
                    {sn.turn.usingCannon?"C Cannon ON":"C Cannon"}
                  </button>
                  <button className="tw-arr-btn cancel-btn"
                    onMouseDown={()=>inputRef.current.press("KeyX")}
                    onMouseUp={()=>inputRef.current.release("KeyX")}
                    onTouchStart={(e)=>{e.preventDefault();inputRef.current.press("KeyX");}}
                    onTouchEnd={(e)=>{e.preventDefault();inputRef.current.release("KeyX");}}>
                    X Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* Power bar */}
            <div className="tw-hud-power">
              <div className="tw-power-label">Power</div>
              <div className="tw-power-bar-outer">
                <div className="tw-power-fill" style={{
                  width:`${powerPct}%`,
                  backgroundPosition:`${100-powerPct}% 0`,
                }}/>
              </div>
              <div className="tw-power-pct">{Math.round(powerPct)}%</div>
              <div style={{fontSize:12,color:"#666",marginTop:2}}>
                Wind: {sn.wind<0?"◀":"▶"}{Math.abs(Math.round(sn.wind))}
              </div>
            </div>

            {/* Timer */}
            <div className="tw-hud-timer">
              <div className="tw-timer-label">Time</div>
              <div className="tw-timer-value" style={{color:timerColor}}>{timerSecs}</div>
              <div style={{fontSize:12,color:"#555"}}>Turn {sn.turn.number}</div>
            </div>

            {/* Options / stats */}
            <div className="tw-hud-options">
              <div className="tw-opts-label">Options</div>
              <div className="tw-opts-row"><span>{TEAM.red.label}</span><strong style={{color:"#cc4444"}}>{sn.teams.red.alive}/{sn.teams.red.total}</strong></div>
              <div className="tw-opts-row"><span>{TEAM.blue.label}</span><strong style={{color:"#4466ee"}}>{sn.teams.blue.alive}/{sn.teams.blue.total}</strong></div>
              <div className="tw-opts-row"><span>Map</span><strong>{sn.mapId}</strong></div>
              <div className="tw-opts-row"><span>Weapon</span><strong>{sn.turn.usingCannon?"Cannon":"Grenade"}</strong></div>
              <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                <button className="tw-btn" style={{fontSize:12,padding:"3px 8px"}} onClick={restart}>↺ Restart</button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard guide */}
        {sn.mode!=="menu"&&(
          <div style={{width:"100%",maxWidth:980,display:"flex",gap:8,flexWrap:"wrap"}}>
            <div className="tw-info-panel" style={{fontSize:13,color:"#667788",lineHeight:1.8}}>
              <span className="tw-info-title">Control Guide</span>
              <span style={{color:"#eee"}}>A/D</span> Move &nbsp;·&nbsp; <span style={{color:"#eee"}}>W</span> Jump &nbsp;·&nbsp;
              <span style={{color:"#eee"}}>Q/E</span> Aim &nbsp;·&nbsp; <span style={{color:"#eee"}}>Space</span> Charge &amp; Throw &nbsp;·&nbsp;
              <span style={{color:"#eee"}}>C</span> Cannon &nbsp;·&nbsp; <span style={{color:"#eee"}}>X</span> Cancel &nbsp;·&nbsp; <span style={{color:"#eee"}}>P</span> Pause &nbsp;·&nbsp;
              <span style={{color:"#eee"}}>R</span> Restart &nbsp;·&nbsp; <span style={{color:"#eee"}}>Mouse</span> Aim angle
            </div>
            {/* Unit roster */}
            <div className="tw-info-panel">
              <div className="tw-info-title">{TEAM.red.label}</div>
              {sn.units.filter(u=>u.team==="red").map(u=>(
                <div key={u.id} className="tw-info-stat" style={{opacity:u.alive?1:0.3}}>
                  <span>{u.name}</span>
                  <strong style={{color:u.health>60?"#44cc44":u.health>30?"#ffcc00":"#ff4444"}}>
                    {u.alive?`${u.health}HP`:"✖"}
                  </strong>
                </div>
              ))}
            </div>
            <div className="tw-info-panel">
              <div className="tw-info-title">{TEAM.blue.label}</div>
              {sn.units.filter(u=>u.team==="blue").map(u=>(
                <div key={u.id} className="tw-info-stat" style={{opacity:u.alive?1:0.3}}>
                  <span>{u.name}</span>
                  <strong style={{color:u.health>60?"#44cc44":u.health>30?"#ffcc00":"#ff4444"}}>
                    {u.alive?`${u.health}HP`:"✖"}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Touch controls overlay */}
        {isTouch&&sn.mode!=="menu"&&(
          <div className="tw-touch-controls">
            <div className="tw-touch-group">
              <button className="tw-arr-btn" {...holdProps("left")}>◀</button>
              <button className="tw-arr-btn" {...holdProps("right")}>▶</button>
              <button className="tw-arr-btn" {...tapProps("jump")}>▲</button>
            </div>
            <div className="tw-touch-group">
              <button className="tw-arr-btn" {...holdProps("aimUp")}>Aim▲</button>
              <button className="tw-arr-btn" {...holdProps("aimDown")}>Aim▼</button>
              <button className="tw-arr-btn"
                onMouseDown={()=>inputRef.current.press("KeyC")}
                onMouseUp={()=>inputRef.current.release("KeyC")}
                onTouchStart={(e)=>{e.preventDefault();inputRef.current.press("KeyC");}}
                onTouchEnd={(e)=>{e.preventDefault();inputRef.current.release("KeyC");}}>
                C
              </button>
              <button className="tw-arr-btn red-act" {...holdProps("fire")}>🔥</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
