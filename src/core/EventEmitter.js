class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[Event] ${event} error:`, e.message); }
    });
  }
}

export const EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
  TEAM_MESSAGE: 'teamMessage',
  PLAYER_ONLINE: 'playerOnline',
  PLAYER_OFFLINE: 'playerOffline',
  PLAYER_DEATH: 'playerDeath',
  PLAYER_SPAWNED: 'playerSpawned',
  PLAYER_AFK: 'playerAfk',
  PLAYER_BACK: 'playerBack',
  CARGO_SPAWN: 'cargoSpawn',
  CARGO_DESPAWN: 'cargoDespawn',
  HELI_SPAWN: 'heliSpawn',
  HELI_DESPAWN: 'heliDespawn',
  HELI_DOWN: 'heliDown',
  CHINOOK_SPAWN: 'chinookSpawn',
  CHINOOK_DESPAWN: 'chinookDespawn',
  CRATE_SPAWN: 'crateSpawn',
  CRATE_GONE: 'crateGone',
  RAID_ALERT: 'raidAlert',
  SMART_ALARM: 'smartAlarm',
  SHOP_NEW: 'shopNew',
  SHOP_GONE: 'shopGone',
  SHOP_SOLD: 'shopSold',
  SHOP_WATER: 'shopWater',
};

export default new EventEmitter();
