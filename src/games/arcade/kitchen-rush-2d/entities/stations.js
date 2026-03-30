import { STATION_LAYOUT } from "../constants";

class CookingStation {
  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.labelEs = config.labelEs;
    this.labelEn = config.labelEn;
    this.x = config.x;
    this.y = config.y;
    this.w = config.w;
    this.h = config.h;
    this.isOn = false;
    this.temperature = config.temperature ?? 20;
    this.maxTemperature = config.maxTemperature ?? 20;
    this.heatRate = config.heatRate ?? 0;
    this.coolRate = config.coolRate ?? 0;
    this.contents = [];
  }

  update(deltaTime) {
    if (this.maxTemperature <= 20) {
      this.temperature = 20;
      return;
    }

    if (this.isOn) {
      this.temperature = Math.min(this.maxTemperature, this.temperature + deltaTime * this.heatRate);
    } else {
      this.temperature = Math.max(20, this.temperature - deltaTime * this.coolRate);
    }
  }

  addItem(itemId) {
    if (!this.contents.includes(itemId)) {
      this.contents.push(itemId);
    }
  }

  removeItem(itemId) {
    const index = this.contents.indexOf(itemId);
    if (index >= 0) {
      this.contents.splice(index, 1);
    }
  }

  clear() {
    this.contents.length = 0;
  }

  getCenter() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2,
    };
  }
}

class PotStation extends CookingStation {
  constructor(config) {
    super({ ...config, maxTemperature: 100, heatRate: 20, coolRate: 10 });
    this.waterLevel = 100;
    this.targetTemperature = 92;
  }

  update(deltaTime) {
    if (this.isOn) {
      if (this.temperature < this.targetTemperature) {
        this.temperature = Math.min(this.targetTemperature, this.temperature + deltaTime * this.heatRate);
      } else {
        this.temperature = Math.max(this.targetTemperature, this.temperature - deltaTime * this.coolRate);
      }
      return;
    }

    this.temperature = Math.max(20, this.temperature - deltaTime * this.coolRate);
  }
}

class PanStation extends CookingStation {
  constructor(config) {
    super({ ...config, maxTemperature: 220, heatRate: 35, coolRate: 15 });
    this.oilLevel = 100;
    this.targetTemperature = 180;
  }

  update(deltaTime) {
    if (this.isOn) {
      if (this.temperature < this.targetTemperature) {
        this.temperature = Math.min(this.targetTemperature, this.temperature + deltaTime * this.heatRate);
      } else {
        this.temperature = Math.max(this.targetTemperature, this.temperature - deltaTime * this.coolRate);
      }
      return;
    }

    this.temperature = Math.max(20, this.temperature - deltaTime * this.coolRate);
  }
}

class OvenStation extends CookingStation {
  constructor(config) {
    super({ ...config, maxTemperature: 230, heatRate: 30, coolRate: 20 });
    this.targetTemperature = 180;
  }

  update(deltaTime) {
    if (this.isOn) {
      if (this.temperature < this.targetTemperature) {
        this.temperature = Math.min(this.targetTemperature, this.temperature + deltaTime * this.heatRate);
      } else {
        this.temperature = this.targetTemperature;
      }
      return;
    }

    this.temperature = Math.max(20, this.temperature - deltaTime * this.coolRate);
  }
}

class CuttingBoardStation extends CookingStation {
  constructor(config) {
    super(config);
    this.cuttingState = {
      active: false,
      ingredientId: null,
      progress: 0,
      requiredCuts: 4,
      currentAnimationFrame: 0,
      knifeTimerMs: 0,
    };
  }
}

export function createKitchenStations() {
  const stations = {
    [STATION_LAYOUT.fridge.id]: new CookingStation(STATION_LAYOUT.fridge),
    [STATION_LAYOUT.prep.id]: new CookingStation(STATION_LAYOUT.prep),
    [STATION_LAYOUT.cuttingBoard.id]: new CuttingBoardStation(STATION_LAYOUT.cuttingBoard),
    [STATION_LAYOUT.pan.id]: new PanStation(STATION_LAYOUT.pan),
    [STATION_LAYOUT.pot.id]: new PotStation(STATION_LAYOUT.pot),
    [STATION_LAYOUT.oven.id]: new OvenStation(STATION_LAYOUT.oven),
    [STATION_LAYOUT.plating.id]: new CookingStation(STATION_LAYOUT.plating),
    [STATION_LAYOUT.serving.id]: new CookingStation(STATION_LAYOUT.serving),
  };

  return stations;
}

export function listStations(stations) {
  return Object.values(stations);
}

export function isHeatedStation(stationType) {
  return stationType === "pot" || stationType === "pan" || stationType === "oven";
}

export { CookingStation, PotStation, PanStation, OvenStation, CuttingBoardStation };
