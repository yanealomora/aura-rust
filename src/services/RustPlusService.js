import RustPlus from '@liamcottle/rustplus.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAT_LOG_FILE = path.join(__dirname, '../../chat.log');

class RustPlusService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.mapSize = 4000;
    this.serverInfo = null;
    this.reconnectAttempts = 0;
  }

  async connect() {
    if (this.connecting) return;

    return new Promise((resolve, reject) => {
      this.connecting = true;
      console.log('[RustPlus] ═══════════════════════════════════════');
      console.log(`[RustPlus] Подключение к ${config.rust.ip}:${config.rust.port}`);
      console.log(`[RustPlus] PlayerID: ${config.rust.playerId}`);
      console.log(`[RustPlus] Token: ${config.rust.playerToken}`);

      // Try Facepunch proxy if direct connection fails multiple times
      const useFacepunchProxy = this.reconnectAttempts >= 3;
      if (useFacepunchProxy) {
        console.log('[RustPlus] Trying Facepunch proxy...');
      }

      this.client = new RustPlus(
        config.rust.ip,
        config.rust.port,
        config.rust.playerId,
        parseInt(config.rust.playerToken),
        useFacepunchProxy
      );

      const timeout = setTimeout(() => {
        if (!this.connected) {
          this.connecting = false;
          this.reconnectAttempts++;
          reject(new Error('Timeout'));
        }
      }, 30000);

      this.client.on('connected', async () => {
        clearTimeout(timeout);
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        console.log('[RustPlus] Подключено!');

        try {
          const info = await this.getServerInfo();
          if (info) {
            this.serverInfo = info;
            this.mapSize = info.mapSize || 4000;
            console.log(`[RustPlus] Сервер: ${info.name}`);
            console.log(`[RustPlus] Игроки: ${info.players}/${info.maxPlayers}`);
          }
        } catch {}

        eventBus.emit(EVENTS.CONNECTED);
        resolve();
      });

      this.client.on('disconnected', () => {
        console.log('[RustPlus] Отключено');
        const wasConnected = this.connected;
        this.connected = false;
        this.connecting = false;
        if (wasConnected) {
          eventBus.emit(EVENTS.DISCONNECTED);
        }
        this.reconnectAttempts++;
        const delay = Math.min(10000 * this.reconnectAttempts, 60000);
        console.log(`[RustPlus] Переподключение через ${delay/1000} сек... (попытка ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      });

      this.client.on('error', (err) => {
        console.error('[RustPlus] Ошибка:', err.message);
        if (err.message?.includes('Not Found')) {
          console.error('[RustPlus] Сервер не найден или токен неверный');
        }
        if (err.message?.includes('Parse Error')) {
          console.error('[RustPlus] Сервер вернул неожиданный ответ');
          console.error('[RustPlus] Проверьте: 1) Сервер онлайн 2) Порт правильный 3) Токен актуальный');
        }
      });

      this.client.on('request', (req) => {
        if (req.error) {
          console.error('[RustPlus] Request error:', req.error);
        }
      });

      this.client.on('message', (msg) => this._handleMessage(msg));
      this.client.connect();
    });
  }

  _handleMessage(msg) {
    if (msg?.broadcast?.teamMessage) {
      const tm = msg.broadcast.teamMessage.message;
      console.log(`[RustPlus] 💬 ${tm.name}: "${tm.message}"`);
      
      // Логирование чата в файл
      const timestamp = new Date().toISOString();
      const logLine = `${timestamp} | ${tm.steamId || 'unknown'} | ${tm.name} | ${tm.message}\n`;
      fs.appendFile(CHAT_LOG_FILE, logLine, (err) => {
        if (err) console.error('[RustPlus] Chat log error:', err.message);
      });
      
      eventBus.emit(EVENTS.TEAM_MESSAGE, {
        steamId: tm.steamId?.toString(),
        name: tm.name,
        message: tm.message,
      });
    }

    if (msg?.broadcast?.entityChanged) {
      const e = msg.broadcast.entityChanged;
      if (e.payload?.value === true) {
        console.log(`[RustPlus] 🔔 Alarm ${e.entityId}`);
        eventBus.emit(EVENTS.RAID_ALERT, { entityId: e.entityId });
      }
    }
  }

  async getTeamInfo() {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ getTeamInfo: {} }, 15000);
      return res?.teamInfo || null;
    } catch { return null; }
  }

  async getMapMarkers() {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ getMapMarkers: {} }, 15000);
      return res?.mapMarkers || null;
    } catch { return null; }
  }

  async getServerInfo() {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ getInfo: {} }, 15000);
      if (res?.info) this.serverInfo = res.info;
      return res?.info || null;
    } catch { return null; }
  }

  async getTime() {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ getTime: {} }, 10000);
      return res?.time || null;
    } catch { return null; }
  }

  async getMap() {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ getMap: {} }, 30000);
      return res?.map || null;
    } catch { return null; }
  }

  getMapSize() { return this.mapSize; }
  isConnected() { return this.connected; }
  getCachedServerInfo() { return this.serverInfo; }

  // ═══════════════════ SMART DEVICES ═══════════════════

  async getEntityInfo(entityId) {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({ 
        entityId: entityId,
        getEntityInfo: {} 
      }, 10000);
      return res?.entityInfo || null;
    } catch { return null; }
  }

  async setEntityValue(entityId, value) {
    if (!this.connected) return false;
    try {
      await this.client.sendRequestAsync({
        entityId: entityId,
        setEntityValue: { value: value }
      }, 10000);
      return true;
    } catch { return false; }
  }

  async turnOn(entityId) {
    return this.setEntityValue(entityId, true);
  }

  async turnOff(entityId) {
    return this.setEntityValue(entityId, false);
  }

  async toggleEntity(entityId) {
    const info = await this.getEntityInfo(entityId);
    if (!info) return false;
    return this.setEntityValue(entityId, !info.payload?.value);
  }

  // ═══════════════════ CAMERA ═══════════════════

  async getCameraFrame(identifier, frame = 0) {
    if (!this.connected) return null;
    try {
      const res = await this.client.sendRequestAsync({
        getCameraFrame: {
          identifier: identifier,
          frame: frame
        }
      }, 15000);
      return res?.cameraFrame || null;
    } catch (e) {
      console.error('[RustPlus] Camera error:', e.message);
      return null;
    }
  }

  // ═══════════════════ TEAM CHAT ═══════════════════

  async sendTeamMessage(message) {
    if (!this.connected) return false;
    try {
      await this.client.sendRequestAsync({
        sendTeamMessage: { message: message }
      }, 10000);
      return true;
    } catch { return false; }
  }

  // ═══════════════════ PROMOTE ═══════════════════

  async promoteToLeader(steamId) {
    if (!this.connected) return false;
    try {
      await this.client.sendRequestAsync({
        promoteToLeader: { steamId: steamId }
      }, 10000);
      return true;
    } catch { return false; }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.connected = false;
    }
  }
}

export default new RustPlusService();
