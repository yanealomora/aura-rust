import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = path.join(__dirname, '../../settings.json');

const DEFAULT_SETTINGS = {
  notifications: {
    deaths: true,
    online: true,
    offline: true,
    afk: false,
    cargo: true,
    heli: true,
    chinook: true,
    crate: true,
    raidAlert: true,
    smartAlarm: true,
    shops: true,
    shopSales: false,
    shopWater: true,
  },
  teamChat: {
    enabled: true,
    deaths: true,
    online: true,
    offline: true,
    events: true,
  },
  muted: false,
  mutedUntil: null,
};

class Settings {
  constructor() {
    this.settings = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  _save() {
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2)); } catch {}
  }

  get(key) {
    const keys = key.split('.');
    let val = this.settings;
    for (const k of keys) val = val?.[k];
    return val;
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.settings;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._save();
  }

  toggle(key) {
    const val = !this.get(key);
    this.set(key, val);
    return val;
  }

  isMuted() {
    if (!this.settings.muted) return false;
    if (this.settings.mutedUntil && Date.now() > this.settings.mutedUntil) {
      this.settings.muted = false;
      this._save();
      return false;
    }
    return true;
  }

  mute(minutes = null) {
    this.settings.muted = true;
    this.settings.mutedUntil = minutes ? Date.now() + minutes * 60000 : null;
    this._save();
  }

  unmute() {
    this.settings.muted = false;
    this.settings.mutedUntil = null;
    this._save();
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this._save();
  }
}

export default new Settings();
