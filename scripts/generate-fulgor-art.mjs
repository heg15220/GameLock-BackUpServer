import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/assets/fulgor");
const write = (relative, contents) => {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return relative.replaceAll("\\", "/");
};

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[char]);

const hash = (text) => [...String(text)].reduce((acc, char) => ((acc * 33) ^ char.charCodeAt(0)) >>> 0, 2166136261);
const hue = (id, offset = 0) => (hash(id) + offset) % 360;
const svg = (w, h, body, label) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <filter id="paper"><feTurbulence baseFrequency=".045" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.4"/></filter>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${body}
</svg>`;

const uiIds = [
  "testimonial", "fisica", "temporal", "digital", "intima", "latente", "activo", "obsesivo", "cerrado",
  "impacto", "velocidad", "luz", "escudo", "sentido", "rayo", "afinidadLuz", "sombra", "materia",
  "potencia", "cuerpo", "control", "guardia", "statVelocidad", "aguante", "temple", "carga", "compostura",
  "obligacion", "quedar", "entrenar", "taller", "trabajar", "investigar", "contramedidas", "patrullar", "descansar",
  "mascara", "torso", "guantes", "botas", "cinturon", "manto", "cobre", "fibra", "ceramica", "neodimio", "optica", "nucleo",
  "impecable", "limpio", "sucio", "parcial", "fallido", "nodo", "ruta", "camara", "testigo", "reloj", "fuenteElectrica",
  "contener", "entorno", "guardar", "idioma", "dificultad", "expediente", "vinculo", "prensa", "dinero", "rango", "experiencia",
];

const motif = (id) => {
  const n = hash(id) % 8;
  if (n === 0) return '<path d="M32 10 21 31h10l-5 23 18-27H33z"/>';
  if (n === 1) return '<circle cx="32" cy="32" r="15"/><circle cx="32" cy="32" r="6"/><path d="M32 7v9M32 48v9M7 32h9M48 32h9"/>';
  if (n === 2) return '<path d="M32 8 51 18v14c0 13-8 21-19 25-11-4-19-12-19-25V18z"/><path d="m23 33 6 6 13-15"/>';
  if (n === 3) return '<path d="M11 36c9-18 33-18 42 0-9 18-33 18-42 0z"/><circle cx="32" cy="36" r="7"/>';
  if (n === 4) return '<path d="M14 50 32 10l18 40z"/><path d="M20 40h24M25 29h14"/>';
  if (n === 5) return '<path d="M13 45c0-19 8-30 19-30s19 11 19 30"/><path d="M8 45h48M23 45v10M41 45v10"/>';
  if (n === 6) return '<path d="M13 18h38v32H13z"/><path d="M19 25h26M19 33h18M19 41h22"/>';
  return '<path d="M32 9 52 21v22L32 55 12 43V21z"/><path d="M12 21l20 12 20-12M32 33v22"/>';
};

const iconSvg = (id) => svg(64, 64, `
  <rect x="3" y="3" width="58" height="58" rx="15" fill="#111827" stroke="hsl(${hue(id)} 58% 58%)" stroke-width="2"/>
  <path d="M10 50 50 10" stroke="hsl(${hue(id, 38)} 72% 60%)" stroke-width="5" opacity=".15"/>
  <g fill="none" stroke="#eaf4ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${motif(id)}</g>
  <circle cx="51" cy="13" r="4" fill="#38e1ff" opacity=".9"/>
`, id);

const techniques = [
  "chispazo", "arcoVoltaico", "punoTormenta", "yunque", "sobrecarga", "truenoSeco", "martillo", "chispaFria", "descargaCero",
  "pasoCorto", "relampago", "vaho", "fuga", "estela", "cortocircuito", "sombraLarga", "destello", "espejismo", "prisma", "fulgor",
  "cortina", "aurora", "reflejo", "alba", "pararrayos", "malla", "aguanteTec", "jaula", "tierra", "cupula", "ancla", "escucha",
  "lectura", "barrido", "pulso", "anticipo", "silencio", "rastro", "eco", "presagio",
];
const affinities = ["rayo", "materia", "luz", "sombra"];
const affinityColor = { rayo: "#38e1ff", materia: "#d28b52", luz: "#ffe6a1", sombra: "#8d72ee" };

const techniqueSvg = (id, i) => {
  const affinity = affinities[Math.floor(i / 10) % affinities.length];
  const color = affinityColor[affinity];
  const spokes = Array.from({ length: 9 }, (_, n) => {
    const a = ((n * 40 + (hash(id) % 20)) * Math.PI) / 180;
    const x1 = 64 + Math.cos(a) * 18;
    const y1 = 64 + Math.sin(a) * 18;
    const x2 = 64 + Math.cos(a) * (42 + (n % 3) * 7);
    const y2 = 64 + Math.sin(a) * (42 + (n % 3) * 7);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
  }).join("");
  return svg(128, 128, `
    <rect width="128" height="128" rx="22" fill="#0d1220"/>
    <circle cx="64" cy="64" r="50" fill="${color}" opacity=".08"/>
    <g stroke="${color}" stroke-width="5" stroke-linecap="round" filter="url(#glow)">${spokes}</g>
    <g transform="translate(32 32)" fill="none" stroke="#f4f8ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${motif(id)}</g>
    <path d="M14 106h100" stroke="${color}" stroke-width="4"/>
  `, id);
};

const cast = [
  ["dani", "#e8c9a8", "#3b2a20", "#38e1ff"], ["nuria", "#e8c9a8", "#423024", "#c8622d"],
  ["carmen", "#e2c0a0", "#4a3428", "#7d8a6f"], ["tomas", "#dcb894", "#4b4038", "#7d8a6f"],
  ["isma", "#c99b73", "#241a15", "#c8622d"], ["julia", "#e6c4a4", "#2e2119", "#7d8a6f"],
  ["oscar", "#d9b088", "#1f1a16", "#a04a2c"], ["requena", "#ddb992", "#b9b3ab", "#7d8a6f"],
  ["pilar", "#dcb99a", "#c9c3bb", "#8a7f6f"], ["yusuf", "#a9764e", "#171310", "#c8622d"],
  ["sabater", "#e0bd9c", "#33281f", "#5b7fa6"], ["marga", "#e4c1a1", "#5a2f1e", "#c8622d"],
  ["ezequiel", "#dcb694", "#7d7168", "#5b7fa6"], ["iria", "#c99b73", "#2a2018", "#7d8a6f"],
  ["tasador", "#dbb693", "#2b2b30", "#9a8f5e"], ["hierro", "#d2a479", "#22201d", "#8c5a3c"],
  ["larga", "#c8a687", "#14121c", "#6b4bd6"], ["vigia", "#a9764e", "#1b1712", "#e8d9a0"],
  ["cero", "#d7b492", "#d5cfc6", "#8f8f96"], ["chapa", "#cfa47c", "#2c2a2f", "#6f7a63"],
  ["tuerca", "#dcb08a", "#3a2c22", "#6f7a63"], ["sordo", "#c99b73", "#1a1613", "#6f7a63"],
];
const expressions = ["neutro", "tenso", "roto", "decidido"];
const mouth = {
  neutro: "M53 100q11 6 22 0", tenso: "M52 101q12-4 24 0", roto: "M52 100q12 10 24 0", decidido: "M51 98q13 8 26-1",
};

const portraitSvg = ([id, skin, hair, accent], expression) => {
  const wide = 36 + (hash(id) % 8);
  const eyeY = expression === "roto" ? 76 : 73;
  const brow = expression === "tenso" || expression === "decidido" ? 5 : -1;
  return svg(128, 154, `
    <rect width="128" height="154" rx="18" fill="#ece4d7"/>
    <path d="M0 128 128 90v64H0z" fill="${accent}" opacity=".18"/>
    <g filter="url(#paper)">
      <path d="M10 154v-17c0-18 18-31 42-34h24c24 3 42 16 42 34v17z" fill="${accent}"/>
      <ellipse cx="64" cy="68" rx="${wide}" ry="47" fill="${skin}" stroke="#29251f" stroke-width="2"/>
      <path d="M${64-wide} 65Q30 15 64 13q38 2 ${wide+64} 52-16-19-34-14-50-3-17-8-29 16z" fill="${hair}" stroke="#29251f" stroke-width="2"/>
      <path d="M43 ${eyeY-brow}q8 ${-4+brow} 15 0M70 ${eyeY}q8 ${-4-brow} 15 0" fill="none" stroke="#29251f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="51" cy="80" r="3" fill="#29251f"/><circle cx="78" cy="80" r="3" fill="#29251f"/>
      <path d="M64 81v12l-5 2${mouth[expression]}" fill="none" stroke="#29251f" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <path d="M14 135 46 113l18 18 18-18 32 22" fill="none" stroke="#f7f3ec" stroke-width="3" opacity=".65"/>
  `, `${id} ${expression}`);
};

const silhouetteSvg = ([id, , , accent]) => svg(72, 144, `
  <rect width="72" height="144" fill="none"/>
  <g fill="#101728" stroke="${accent}" stroke-width="2.5" filter="url(#glow)">
    <circle cx="36" cy="23" r="14"/>
    <path d="M36 38c14 0 22 10 23 26l4 31-10 3-4 42H38l-3-37-4 37H20l-3-42-10-3 5-31c2-16 10-26 24-26z"/>
  </g>
  ${id === "dani" ? '<path d="m38 53-9 18h12l-8 21" fill="none" stroke="#38e1ff" stroke-width="3"/>' : ""}
`, `${id} silhouette`);

const generations = ["improvisado", "taller", "aislado", "conductor", "fulgor"];
const slots = ["mascara", "torso", "guantes", "botas", "cinturon", "manto"];
const itemSvg = (id, group, i = 0) => {
  const c = group === "suit" ? ["#9b6b4d", "#67807d", "#4e7185", "#d18d42", "#38e1ff"][Math.floor(i / 6)] : `hsl(${hue(id)} 42% 48%)`;
  return svg(96, 96, `
    <rect x="4" y="4" width="88" height="88" rx="20" fill="#101728" stroke="${c}" stroke-width="3"/>
    <circle cx="48" cy="43" r="28" fill="${c}" opacity=".14"/>
    <g transform="translate(16 14)" fill="none" stroke="#eef5ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${motif(id)}</g>
    <path d="M17 78h62" stroke="${c}" stroke-width="5"/>
  `, id);
};

const districts = ["aguas", "instituto", "concha", "puerto", "financiero", "faro", "poligono", "hospital", "tolvas"];
const props = [
  "farola", "cuadroElectrico", "catenaria", "hidrante", "bocaRiego", "andamio", "contenedor", "grua", "coche", "moto", "ambulancia", "furgoneta",
  "camaraDomo", "camaraPoste", "movil", "portatil", "servidor", "antena", "puerta", "verja", "escalera", "ascensor", "conducto", "alcantarilla",
  "banco", "papelera", "cabina", "semaforo", "cartel", "vitrina", "extintor", "botiquin", "camilla", "taquilla", "mesa", "armario",
  "barril", "caja", "palet", "cadena", "candado", "tuberia", "valvula", "transformador", "generador", "bobina", "iman", "cable",
  "cofre", "llave", "guanteInduccion", "exoesqueleto", "mascaraLarga", "nucleoCero", "periodico", "expediente", "foto", "grabadora", "fragmentoManto", "huellaOzono",
];
const evidence = [
  "jirónCian", "guanteQuemado", "fibraAislante", "cobreFundido", "barroAzotea", "sangreVendaje", "llaveAlmacen", "fotoMovil", "videoMunicipal",
  "registroMetro", "ticketYusuf", "parteHospital", "horarioClase", "capturaRed", "audioPolicia", "testigoPlaza", "testigoPuerto", "coartadaNuria",
  "coartadaIsma", "olorOzono", "quemaduraMano", "insomnio", "mentiraCena", "mantoRasgado", "firmaTomas",
];

const manifest = { generatedAt: "2026-08-26", style: "Fulgor graphic-novel watercolor asset system v2", assets: {} };
for (const id of uiIds) manifest.assets[`ui:${id}`] = write(`ui/${id}.svg`, iconSvg(id));
techniques.forEach((id, i) => { manifest.assets[`technique:${id}`] = write(`techniques/${id}.svg`, techniqueSvg(id, i)); });
for (const person of cast) {
  for (const expression of expressions) manifest.assets[`portrait:${person[0]}:${expression}`] = write(`portraits/${person[0]}-${expression}.svg`, portraitSvg(person, expression));
  manifest.assets[`silhouette:${person[0]}`] = write(`silhouettes/${person[0]}.svg`, silhouetteSvg(person));
}
generations.forEach((generation, gi) => slots.forEach((slot, si) => {
  const id = `${generation}-${slot}`;
  manifest.assets[`suit:${generation}:${slot}`] = write(`suits/${generation}/${slot}.svg`, itemSvg(id, "suit", gi * 6 + si));
}));
["cobre", "fibra", "ceramica", "neodimio", "optica", "nucleo"].forEach((id, i) => {
  manifest.assets[`material:${id}`] = write(`materials/${id}.svg`, itemSvg(id, "material", i));
});
props.forEach((id, i) => { manifest.assets[`prop:${id}`] = write(`props/${id}.svg`, itemSvg(id, "prop", i)); });
evidence.forEach((id, i) => { manifest.assets[`evidence:${id}`] = write(`evidence/${id}.svg`, itemSvg(id, "evidence", i)); });

for (let chapter = 1; chapter <= 12; chapter += 1) {
  const district = districts[(chapter - 1) % districts.length];
  manifest.assets[`scene:c${chapter}`] = write(`scenes/chapter-${String(chapter).padStart(2, "0")}.svg`, svg(704, 430, `
    <rect width="704" height="430" fill="#0d1220"/>
    <image href="../districts/${district}.png" width="704" height="430" preserveAspectRatio="xMidYMid slice" opacity=".72"/>
    <path d="M0 ${310 - chapter * 3}Q180 ${250 + chapter * 2} 360 ${315 - chapter}T704 ${280 + chapter * 2}V430H0z" fill="#0d1220" opacity=".58"/>
    <path d="M0 ${342 - chapter}H704" stroke="#38e1ff" stroke-width="2" opacity=".35"/>
  `, `Chapter ${chapter} ${district}`));
}

for (const district of districts) manifest.assets[`district:${district}`] = `districts/${district}.png`;
write("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
write("README.md", `# FULGOR art library\n\nGenerated by \`npm run generate:fulgor-art\`. The manifest contains ${Object.keys(manifest.assets).length} production assets. District PNGs are art-directed raster backgrounds; all other assets are deterministic SVGs with accessible labels.\n`);

console.log(`Generated ${Object.keys(manifest.assets).length} FULGOR assets in ${ROOT}`);
