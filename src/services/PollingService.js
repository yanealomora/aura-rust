import rustPlus from './RustPlusService.js';
import stateCache from '../core/StateCache.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';
import { coordsToGrid } from '../core/GridHelper.js';
import { getItemName } from '../data/ItemDatabase.js';
import settings from '../core/Settings.js';
import config from '../config.js';

const MARKER_TYPES = { 4: 'chinook', 5: 'cargo', 6: 'crate', 8: 'heli' };

class PollingService {
  constructor() {
    this.intervals = [];
    this.running = false;
    this.initialScan = false;
    this.initialShopScan = false;
    this.lastPollTime = 0;
    this.shops = new Map();
    this.ourShops = new Set(); // ID наших магазинов (рядом с базой)
    this.pendingShopNotifications = []; // Буфер для группировки
    this.pendingSaleNotifications = []; // Буфер продаж
    this.notificationTimer = null;
  }

  start() {
    if (this.running) return;
    this.running = true;

    console.log('[Polling] ═══════════════════════════════════════');
    console.log('[Polling] ▶️ Запуск');
    console.log(`[Polling] Team: ${config.polling.teamInfo / 1000}с`);
    console.log(`[Polling] Markers: ${config.polling.mapMarkers / 1000}с`);
    console.log(`[Polling] Server: ${config.polling.serverInfo / 1000}с`);

    // Team polling
    this.intervals.push(setInterval(() => this._pollTeam(), config.polling.teamInfo));
    
    // Markers polling (с задержкой)
    setTimeout(() => {
      this.intervals.push(setInterval(() => this._pollMarkers(), config.polling.mapMarkers));
    }, 5000);
    
    // Server info polling
    setTimeout(() => {
      this.intervals.push(setInterval(() => this._pollServer(), config.polling.serverInfo));
    }, 10000);

    // Первый опрос
    setTimeout(() => this._pollTeam(), 1000);
    setTimeout(() => this._pollMarkers(), 3000);
    setTimeout(() => this._pollServer(), 5000);
    
    console.log('[Polling] ═══════════════════════════════════════');
  }

  stop() {
    this.running = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    console.log('[Polling] ⏹ Остановлен');
  }

  async _pollTeam() {
    const start = Date.now();
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return;

    const mapSize = rustPlus.getMapSize();

    for (const m of team.members) {
      const id = m.steamId?.toString();
      if (!id) continue;

      const prev = stateCache.getPlayer(id);

      if (prev) {
        // Онлайн/оффлайн
        if (!prev.isOnline && m.isOnline) {
          console.log(`[Poll] 🟢 ${m.name} зашёл`);
          eventBus.emit(EVENTS.PLAYER_ONLINE, { steamId: id, name: m.name });
          stateCache.addConnection({ steamId: id, name: m.name, type: 'online' });
        }
        if (prev.isOnline && !m.isOnline) {
          console.log(`[Poll] 🔴 ${m.name} вышел`);
          eventBus.emit(EVENTS.PLAYER_OFFLINE, { steamId: id, name: m.name });
          stateCache.addConnection({ steamId: id, name: m.name, type: 'offline' });
        }
        
        // Смерть
        if (prev.deathTime !== m.deathTime && m.deathTime > 0) {
          const grid = coordsToGrid(prev.x || m.x, prev.y || m.y, mapSize);
          console.log(`[Poll] 💀 ${m.name} погиб в ${grid}`);
          eventBus.emit(EVENTS.PLAYER_DEATH, { steamId: id, name: m.name, grid, x: m.x, y: m.y });
          stateCache.addDeath({ steamId: id, name: m.name, grid });
        }
        
        // AFK отслеживание
        let afkTime = prev.afkTime || 0;
        if (m.isOnline) {
          const moved = Math.abs(m.x - prev.x) > 1 || Math.abs(m.y - prev.y) > 1;
          if (moved) {
            afkTime = 0; // Сброс при движении
          } else {
            afkTime += config.polling.teamInfo / 1000; // Добавляем время
          }
        } else {
          afkTime = 0;
        }
        
        stateCache.setPlayer(id, {
          name: m.name,
          isOnline: m.isOnline,
          isAlive: m.isAlive,
          x: m.x,
          y: m.y,
          deathTime: m.deathTime,
          afkTime
        });
      } else {
        // Новый игрок
        stateCache.setPlayer(id, {
          name: m.name,
          isOnline: m.isOnline,
          isAlive: m.isAlive,
          x: m.x,
          y: m.y,
          deathTime: m.deathTime,
          afkTime: 0
        });
      }
    }

    if (!this.initialScan) {
      console.log(`[Polling] ✅ Команда: ${team.members.length} членов`);
      this.initialScan = true;
    }
    
    this.lastPollTime = Date.now() - start;
  }

  async _pollMarkers() {
    try {
      const markers = await rustPlus.getMapMarkers();
      if (!markers?.markers) return;

      const mapSize = rustPlus.getMapSize();
      const current = new Set();
      const currentShops = new Map();

      for (const m of markers.markers) {
        const id = m.id?.toString();
        if (!id) continue;
        
        // Обработка магазинов (type 3)
        if (m.type === 3) {
          const grid = coordsToGrid(m.x, m.y, mapSize);
          currentShops.set(id, {
            id,
            name: m.name || 'Магазин',
            grid,
            x: m.x,
            y: m.y,
            sellOrders: m.sellOrders || []
          });
          continue;
        }
        
        current.add(id);

        const type = MARKER_TYPES[m.type];
        if (!type) continue;

        const prev = stateCache.getMarker(id);
        if (!prev && this.initialScan) {
          const grid = coordsToGrid(m.x, m.y, mapSize);
          console.log(`[Poll] 🎯 ${type} spawn — ${grid}`);

          if (type === 'cargo') eventBus.emit(EVENTS.CARGO_SPAWN, { grid, x: m.x, y: m.y });
          if (type === 'heli') eventBus.emit(EVENTS.HELI_SPAWN, { grid, x: m.x, y: m.y });
          if (type === 'chinook') eventBus.emit(EVENTS.CHINOOK_SPAWN, { grid, x: m.x, y: m.y });
          if (type === 'crate') eventBus.emit(EVENTS.CRATE_SPAWN, { grid, x: m.x, y: m.y });
        }

        stateCache.setMarker(id, { type, x: m.x, y: m.y });
      }

      // Проверяем ушедшие маркеры
      for (const [id, data] of stateCache.getAllMarkers()) {
        if (!current.has(id)) {
          console.log(`[Poll] ❌ ${data.type} despawn`);
          if (data.type === 'cargo') eventBus.emit(EVENTS.CARGO_DESPAWN, {});
          if (data.type === 'heli') eventBus.emit(EVENTS.HELI_DESPAWN, {});
          if (data.type === 'chinook') eventBus.emit(EVENTS.CHINOOK_DESPAWN, {});
          stateCache.removeMarker(id);
        }
      }

      // Обработка магазинов
      this._processShops(currentShops);
      
    } catch (e) {
      // Игнорируем ошибки маркеров
      if (!e.message?.includes('amountInStock')) {
        console.error('[Poll] Markers error:', e.message);
      }
    }
  }

  _processShops(currentShops) {
    const mapSize = rustPlus.getMapSize();
    
    // Первый скан - запоминаем магазины
    if (!this.initialShopScan) {
      this.shops = currentShops;
      this._updateOurShops(currentShops, mapSize);
      this.initialShopScan = true;
      console.log(`[Polling] ✅ Магазины: ${currentShops.size} (наших: ${this.ourShops.size})`);
      return;
    }
    
    // Обновляем список наших магазинов по настройкам
    this._updateOurShops(currentShops, mapSize);
    
    // Новые магазины - уведомляем о ВСЕХ новых
    for (const [id, shop] of currentShops) {
      if (!this.shops.has(id)) {
        // Проверяем, не в воде ли магазин
        const isInWater = this._isInWater(shop.x, shop.y, mapSize);
        
        if (isInWater) {
          console.log(`[Poll] ⚠️ [SHOP] WATER SHOP - ${shop.grid} "${shop.name}"`);
          eventBus.emit(EVENTS.SHOP_WATER, { id: shop.id, name: shop.name, grid: shop.grid, x: shop.x, y: shop.y });
        }
        
        // Уведомляем о новом магазине
        console.log(`[Poll] [SHOP] New - ${shop.grid} "${shop.name}"`);
        eventBus.emit(EVENTS.SHOP_NEW, { id: shop.id, name: shop.name, grid: shop.grid, count: 1, isWater: isInWater });
      } else if (this.ourShops.has(id)) {
        // Проверяем продажи только в наших магазинах
        const oldShop = this.shops.get(id);
        this._checkShopSales(oldShop, shop);
      }
    }
    
    // Закрывшиеся магазины (только наши - чтобы не спамить)
    for (const [id, shop] of this.shops) {
      if (!currentShops.has(id) && this.ourShops.has(id)) {
        console.log(`[Poll] [SHOP] Gone - ${shop.grid}`);
        eventBus.emit(EVENTS.SHOP_GONE, { id: shop.id, name: shop.name, grid: shop.grid, count: 1 });
        this.ourShops.delete(id);
      }
    }
    
    this.shops = currentShops;
  }

  // Определяем наши магазины по настройкам (квадраты добавленные через !shop)
  _updateOurShops(shops, mapSize) {
    const ourGrids = settings.get('ourShops') || [];
    this.ourShops.clear();
    
    if (!ourGrids.length) return;
    
    for (const [id, shop] of shops) {
      const grid = coordsToGrid(shop.x, shop.y, mapSize);
      // Проверяем, начинается ли квадрат магазина с одного из наших
      if (ourGrids.some(g => grid.startsWith(g))) {
        this.ourShops.add(id);
      }
    }
  }

  // Проверка, находится ли точка в воде (за пределами острова)
  _isInWater(x, y, mapSize) {
    // Остров обычно занимает центральную часть карты
    // Примерно 10-15% от края - это вода
    const margin = mapSize * 0.12; // 12% от края
    
    // Если координаты близко к краю карты - это вода
    if (x < margin || x > mapSize - margin || y < margin || y > mapSize - margin) {
      return true;
    }
    
    return false;
  }

  // Отложенная отправка уведомлений (группировка)
  _scheduleNotification() {
    if (this.notificationTimer) return;
    
    this.notificationTimer = setTimeout(() => {
      this._sendGroupedNotifications();
      this.notificationTimer = null;
    }, 5000); // Ждём 5 сек для группировки
  }

  _sendGroupedNotifications() {
    // Группируем магазины
    if (this.pendingShopNotifications.length > 0) {
      const newShops = this.pendingShopNotifications.filter(n => n.type === 'new');
      const goneShops = this.pendingShopNotifications.filter(n => n.type === 'gone');
      
      if (newShops.length > 0) {
        if (newShops.length === 1) {
          const s = newShops[0].shop;
          console.log(`[Poll] 🏪 Новый магазин — ${s.grid}`);
          eventBus.emit(EVENTS.SHOP_NEW, { id: s.id, name: s.name, grid: s.grid, count: 1 });
        } else {
          const grids = newShops.map(n => n.shop.grid).join(', ');
          console.log(`[Poll] 🏪 Новые магазины (${newShops.length}) — ${grids}`);
          eventBus.emit(EVENTS.SHOP_NEW, { count: newShops.length, grids, shops: newShops.map(n => n.shop) });
        }
      }
      
      if (goneShops.length > 0) {
        if (goneShops.length === 1) {
          const s = goneShops[0].shop;
          console.log(`[Poll] 🏪❌ Магазин закрылся — ${s.grid}`);
          eventBus.emit(EVENTS.SHOP_GONE, { id: s.id, name: s.name, grid: s.grid, count: 1 });
        } else {
          const grids = goneShops.map(n => n.shop.grid).join(', ');
          console.log(`[Poll] 🏪❌ Магазины закрылись (${goneShops.length})`);
          eventBus.emit(EVENTS.SHOP_GONE, { count: goneShops.length, grids });
        }
      }
      
      this.pendingShopNotifications = [];
    }
    
    // Группируем продажи
    if (this.pendingSaleNotifications.length > 0) {
      if (this.pendingSaleNotifications.length === 1) {
        const s = this.pendingSaleNotifications[0];
        eventBus.emit(EVENTS.SHOP_SOLD, s);
      } else {
        // Группируем по магазину
        const byShop = new Map();
        for (const sale of this.pendingSaleNotifications) {
          const key = sale.grid;
          if (!byShop.has(key)) byShop.set(key, []);
          byShop.get(key).push(sale);
        }
        
        eventBus.emit(EVENTS.SHOP_SOLD, { 
          grouped: true, 
          count: this.pendingSaleNotifications.length,
          sales: this.pendingSaleNotifications,
          byShop: Object.fromEntries(byShop)
        });
      }
      
      this.pendingSaleNotifications = [];
    }
  }

  _checkShopSales(oldShop, newShop) {
    if (!oldShop.sellOrders || !newShop.sellOrders) return;
    
    for (const oldOrder of oldShop.sellOrders) {
      const newOrder = newShop.sellOrders.find(o => o.itemId === oldOrder.itemId);
      if (newOrder && oldOrder.amountInStock > newOrder.amountInStock) {
        const sold = oldOrder.amountInStock - newOrder.amountInStock;
        const itemName = getItemName(oldOrder.itemId);
        console.log(`[Poll] 💰 Продажа в ${newShop.grid}: ${sold}x ${itemName}`);
        
        this.pendingSaleNotifications.push({
          grid: newShop.grid,
          shopName: newShop.name,
          itemId: oldOrder.itemId,
          item: itemName,
          amount: sold,
          remaining: newOrder.amountInStock
        });
        this._scheduleNotification();
      }
    }
  }

  async _pollServer() {
    try {
      const info = await rustPlus.getServerInfo();
      if (info) {
        // Можно добавить отслеживание изменений онлайна
        const cached = rustPlus.getCachedServerInfo();
        if (cached && Math.abs(info.players - cached.players) >= 10) {
          console.log(`[Poll] 👥 Онлайн: ${cached.players} → ${info.players}`);
        }
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  getStats() {
    return {
      running: this.running,
      lastPollTime: this.lastPollTime,
      intervals: this.intervals.length
    };
  }
}

export default new PollingService();
