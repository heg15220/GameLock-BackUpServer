import level1 from "./level-1.json";
import level2 from "./level-2.json";
import level3 from "./level-3.json";
import level4 from "./level-4.json";
import level5 from "./level-5.json";
import level6 from "./level-6.json";
import level7 from "./level-7.json";
import level8 from "./level-8.json";
import level9 from "./level-9.json";
import level10 from "./level-10.json";
import level11 from "./level-11.json";
import level12 from "./level-12.json";
import expansionLevels from "./expansionPack";
import generatedSkyRunnerLevels from "./generatedSkyRunnerMaps";

const tunedExpansionLevels = expansionLevels.map((level) => {
  if (level.id !== "abyss-crown-32" || !level.boss) {
    return level;
  }
  return {
    ...level,
    boss: {
      ...level.boss,
      finalBoss: false
    }
  };
});

export const LEVELS = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level6,
  level7,
  level8,
  level9,
  level10,
  level11,
  level12,
  ...tunedExpansionLevels,
  ...generatedSkyRunnerLevels
];
