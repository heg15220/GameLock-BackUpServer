import resolveBrowserLanguage from "../../utils/resolveBrowserLanguage";

export const KNOWLEDGE_ARCADE_MATCH_COUNT = 10000;

export const resolveKnowledgeArcadeLocale = () => {
  const locale = resolveBrowserLanguage();
  return locale === "es" ? "es" : "en";
};

export const blurVirtualKeyboardOnEnter = (event) => {
  if (event?.key !== "Enter" || typeof window === "undefined") return;
  const isTouchSize = window.matchMedia?.(
    "(max-width: 1180px), (pointer: coarse), (hover: none)"
  )?.matches;
  if (!isTouchSize) return;
  event.currentTarget?.blur?.();
};

export const getRandomKnowledgeMatchId = () =>
  Math.floor(Math.random() * KNOWLEDGE_ARCADE_MATCH_COUNT);

export const getNextKnowledgeMatchId = (matchId) =>
  (Number(matchId) + 1) % KNOWLEDGE_ARCADE_MATCH_COUNT;

export const getRandomKnowledgeMatchIdExcept = (matchId) => {
  if (KNOWLEDGE_ARCADE_MATCH_COUNT <= 1) return 0;
  const current = ((Number(matchId) || 0) + KNOWLEDGE_ARCADE_MATCH_COUNT) % KNOWLEDGE_ARCADE_MATCH_COUNT;
  const candidate = getRandomKnowledgeMatchId();
  if (candidate !== current) {
    return candidate;
  }
  return (candidate + 1 + Math.floor(Math.random() * (KNOWLEDGE_ARCADE_MATCH_COUNT - 1)))
    % KNOWLEDGE_ARCADE_MATCH_COUNT;
};

export const createSeededRandom = (seed) => {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const shuffleWithRandom = (items, random) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export const encodeMatchWord = (value, alphabet, length = 5) => {
  const symbols = Array.from(String(alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  const safeLength = Math.max(1, Math.floor(length));
  const base = symbols.length || 26;
  let code = Math.max(0, Number(value) || 0);
  let output = "";
  for (let index = 0; index < safeLength; index += 1) {
    output = `${symbols[code % base]}${output}`;
    code = Math.floor(code / base);
  }
  return output;
};
