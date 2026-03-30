export class Ingredient {
  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.state = config.state || "raw";
    this.cutLevel = config.cutLevel || 0;
    this.cookLevel = config.cookLevel || 0;
    this.burnLevel = config.burnLevel || 0;
    this.temperature = config.temperature || 20;
    this.stationId = config.stationId || null;
    this.position = config.position || { x: 0, y: 0 };
    this.size = config.size || { w: 44, h: 44 };
    this.stackable = Boolean(config.stackable);
    this.spriteKey = config.spriteKey;
    this.traits = config.traits || {};
    this.cookMethod = config.cookMethod || null;
    this.cookQuality = config.cookQuality || "raw";
  }

  cut() {
    if (!this.traits.canCut) {
      return;
    }
    this.cutLevel += 1;
  }

  cook(amount) {
    this.cookLevel += Math.max(0, amount);
  }

  burn(amount) {
    this.burnLevel += Math.max(0, amount);
  }

  moveTo(x, y) {
    this.position.x = x;
    this.position.y = y;
  }

  toSnapshot() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      cutLevel: Math.round(this.cutLevel * 100) / 100,
      cookLevel: Math.round(this.cookLevel * 100) / 100,
      burnLevel: Math.round(this.burnLevel * 100) / 100,
      temperature: Math.round(this.temperature * 10) / 10,
      stationId: this.stationId,
      position: {
        x: Math.round(this.position.x),
        y: Math.round(this.position.y),
      },
      size: { ...this.size },
      spriteKey: this.spriteKey,
      cookMethod: this.cookMethod,
      cookQuality: this.cookQuality,
    };
  }
}
