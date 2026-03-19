import fs from "node:fs/promises";
import path from "node:path";
import { STORAGE_VERSION } from "./constants.mjs";

const DEFAULT_NEXT_IDS = {
  profile: 1,
  collection: 1,
  packOpening: 1,
  browserMission: 1,
  browserTrophy: 1,
  rewardEvent: 1,
  dailyStat: 1,
};

export function createEmptyState() {
  return {
    version: STORAGE_VERSION,
    nextIds: { ...DEFAULT_NEXT_IDS },
    browserProfiles: [],
    browserCollection: [],
    packOpenings: [],
    browserMissions: [],
    browserTrophies: [],
    rewardEvents: [],
    dailyBrowserStats: [],
    recoveries: [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripTransientKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripTransientKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("__"))
        .map(([key, nestedValue]) => [key, stripTransientKeys(nestedValue)])
    );
  }
  return value;
}

async function ensureParentDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export function createJsonStore({ storeFile }) {
  let queue = Promise.resolve();

  async function readState() {
    try {
      const raw = await fs.readFile(storeFile, "utf8");
      return {
        ...createEmptyState(),
        ...JSON.parse(raw),
      };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return createEmptyState();
      }
      throw error;
    }
  }

  async function writeState(state) {
    await ensureParentDirectory(storeFile);
    await fs.writeFile(storeFile, JSON.stringify(state, null, 2), "utf8");
  }

  async function update(mutator) {
    queue = queue.then(async () => {
      const current = await readState();
      const draft = clone(current);
      const next = (await mutator(draft)) ?? draft;
      await writeState(stripTransientKeys(next));
      return clone(next);
    });
    return queue;
  }

  return {
    read: readState,
    write: writeState,
    update,
  };
}
