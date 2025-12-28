/**
 * Менеджер устройств - управление Smart Switch, Alarm, Storage Monitor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rustPlus from './RustPlusService.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEVICES_FILE = path.join(__dirname, '../../devices.json');

// Типы устройств
export const DEVICE_TYPES = {
  1: { name: 'Smart Switch', emoji: '💡', canToggle: true },
  2: { name: 'Smart Alarm', emoji: '🚨', canToggle: false },
  3: { name: 'Storage Monitor', emoji: '📦', canToggle: false },
};

class DeviceManager {
  constructor() {
    this.devices = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(DEVICES_FILE)) {
        return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[Devices] Load error:', e.message);
    }
    return {};
  }

  _save() {
    try {
      fs.writeFileSync(DEVICES_FILE, JSON.stringify(this.devices, null, 2));
    } catch (e) {
      console.error('[Devices] Save error:', e.message);
    }
  }

  // Добавить устройство
  add(entityId, name, type = 1) {
    this.devices[entityId] = {
      id: entityId,
      name: name,
      type: type,
      addedAt: Date.now()
    };
    this._save();
    return this.devices[entityId];
  }

  // Удалить устройство
  remove(entityId) {
    if (this.devices[entityId]) {
      delete this.devices[entityId];
      this._save();
      return true;
    }
    return false;
  }

  // Получить устройство
  get(entityId) {
    return this.devices[entityId] || null;
  }

  // Получить все устройства
  getAll() {
    return Object.values(this.devices);
  }

  // Получить по типу
  getByType(type) {
    return Object.values(this.devices).filter(d => d.type === type);
  }

  // Найти по имени
  findByName(name) {
    const lower = name.toLowerCase();
    return Object.values(this.devices).find(d => 
      d.name.toLowerCase().includes(lower)
    );
  }

  // Получить статус устройства
  async getStatus(entityId) {
    const device = this.devices[entityId];
    if (!device) return null;

    const info = await rustPlus.getEntityInfo(entityId);
    if (!info) return { ...device, online: false };

    return {
      ...device,
      online: true,
      value: info.payload?.value || false,
      capacity: info.payload?.capacity,
      items: info.payload?.items
    };
  }

  // Получить статус всех устройств
  async getAllStatus() {
    const results = [];
    for (const device of Object.values(this.devices)) {
      const status = await this.getStatus(device.id);
      if (status) results.push(status);
    }
    return results;
  }

  // Включить устройство
  async turnOn(entityId) {
    const device = this.devices[entityId];
    if (!device) return { error: 'Устройство не найдено' };
    
    const typeInfo = DEVICE_TYPES[device.type];
    if (!typeInfo?.canToggle) return { error: 'Это устройство нельзя переключать' };

    const success = await rustPlus.turnOn(entityId);
    return { success, device };
  }

  // Выключить устройство
  async turnOff(entityId) {
    const device = this.devices[entityId];
    if (!device) return { error: 'Устройство не найдено' };
    
    const typeInfo = DEVICE_TYPES[device.type];
    if (!typeInfo?.canToggle) return { error: 'Это устройство нельзя переключать' };

    const success = await rustPlus.turnOff(entityId);
    return { success, device };
  }

  // Переключить устройство
  async toggle(entityId) {
    const device = this.devices[entityId];
    if (!device) return { error: 'Устройство не найдено' };
    
    const typeInfo = DEVICE_TYPES[device.type];
    if (!typeInfo?.canToggle) return { error: 'Это устройство нельзя переключать' };

    const success = await rustPlus.toggleEntity(entityId);
    return { success, device };
  }

  // Включить/выключить по имени
  async toggleByName(name) {
    const device = this.findByName(name);
    if (!device) return { error: 'Устройство не найдено' };
    return this.toggle(device.id);
  }

  // Получить содержимое Storage Monitor
  async getStorageContents(entityId) {
    const device = this.devices[entityId];
    if (!device || device.type !== 3) return null;

    const info = await rustPlus.getEntityInfo(entityId);
    if (!info?.payload?.items) return null;

    return {
      device,
      capacity: info.payload.capacity,
      items: info.payload.items.map(item => ({
        id: item.itemId,
        amount: item.quantity,
        condition: item.itemCondition
      }))
    };
  }
}

export default new DeviceManager();
