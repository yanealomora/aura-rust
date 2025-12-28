import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import rustPlus from '../services/RustPlusService.js';
import settings from '../core/Settings.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';
import { coordsToGrid } from '../core/GridHelper.js';
import deviceManager from '../services/DeviceManager.js';
import { STRUCTURES, CATEGORIES, getDestroyInfo } from '../data/RaidData.js';
import { getCraftInfo, getRecycleInfo, getResearchInfo } from '../data/RustLabsData.js';
import { getItemName } from '../data/ItemDatabase.js';
import steamService from '../services/SteamService.js';
import battleMetricsService from '../services/BattleMetricsService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.WEB_PORT || 3000;

// История событий
const eventsHistory = [];
const MAX_HISTORY = 50;

function addToHistory(event) {
  eventsHistory.unshift({ ...event, time: new Date().toISOString() });
  if (eventsHistory.length > MAX_HISTORY) eventsHistory.pop();
}

// Статика и JSON
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// ═══════════════════ API ═══════════════════
app.get('/api/status', async (req, res) => {
  const info = rustPlus.getCachedServerInfo();
  const time = await rustPlus.getTime();
  res.json({ connected: rustPlus.isConnected(), server: info, time, settings: settings.settings });
});

app.get('/api/team', async (req, res) => {
  const team = await rustPlus.getTeamInfo();
  const mapSize = rustPlus.getMapSize();
  if (team?.members) {
    team.members = team.members.map(m => ({ ...m, grid: coordsToGrid(m.x, m.y, mapSize) }));
  }
  res.json(team || { members: [] });
});

app.get('/api/events', async (req, res) => {
  const markers = await rustPlus.getMapMarkers();
  const mapSize = rustPlus.getMapSize();
  if (!markers?.markers) return res.json({ markers: [], mapSize });
  const events = markers.markers.map(m => ({ ...m, grid: coordsToGrid(m.x, m.y, mapSize) }));
  res.json({ markers: events, mapSize });
});

app.get('/api/map', async (req, res) => {
  const map = await rustPlus.getMap();
  if (!map?.jpgImage) return res.status(404).send('Map not available');
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from(map.jpgImage));
});

app.get('/api/devices', async (req, res) => {
  const devices = deviceManager.getAll();
  const result = [];
  for (const d of devices) {
    const status = await deviceManager.getStatus(d.id);
    result.push({ ...d, status: status?.value || false });
  }
  res.json(result);
});

app.post('/api/device/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const result = action === 'on' ? await deviceManager.turnOn(id) : await deviceManager.turnOff(id);
  res.json(result);
});

app.post('/api/device', async (req, res) => {
  const { id, name, type } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });
  deviceManager.add(id, name, type || 'switch');
  res.json({ success: true });
});

app.delete('/api/device/:id', async (req, res) => {
  deviceManager.remove(req.params.id);
  res.json({ success: true });
});

app.get('/api/settings', (req, res) => res.json(settings.settings));

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (key === 'mute') value ? settings.mute() : settings.unmute();
  else settings.set(key, value);
  res.json({ success: true, settings: settings.settings });
});

app.get('/api/shops', async (req, res) => {
  const markers = await rustPlus.getMapMarkers();
  const mapSize = rustPlus.getMapSize();
  if (!markers?.markers) return res.json([]);
  const shops = markers.markers.filter(m => m.type === 3).map(s => ({
    ...s,
    grid: coordsToGrid(s.x, s.y, mapSize),
    items: s.sellOrders?.map(o => ({ ...o, itemName: getItemName(o.itemId) })) || []
  }));
  res.json(shops);
});

app.get('/api/raid', (req, res) => res.json({ categories: CATEGORIES, structures: STRUCTURES }));

app.get('/api/raid/:key', (req, res) => {
  const info = getDestroyInfo(req.params.key, parseInt(req.query.count) || 1);
  res.json(info || { error: 'Not found' });
});

// ═══════════════════ PLAYER CHECKER API ═══════════════════
app.get('/api/player/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: 'Query required' });
  
  // Поиск через BattleMetrics
  const results = await battleMetricsService.searchPlayer(query, 10);
  res.json(results);
});

app.get('/api/player/steam/:id', async (req, res) => {
  const steamId = req.params.id;
  
  // Если это не SteamID, пробуем как vanity URL
  let resolvedId = steamId;
  if (!/^\d{17}$/.test(steamId)) {
    const resolved = await steamService.resolveVanityUrl(steamId);
    if (resolved) resolvedId = resolved;
    else return res.json({ error: 'Не найден' });
  }
  
  const profile = await steamService.getFullProfile(resolvedId);
  res.json(profile);
});

app.get('/api/player/bm/:id', async (req, res) => {
  const player = await battleMetricsService.getPlayer(req.params.id);
  res.json(player);
});

app.get('/api/player/bm/:id/servers', async (req, res) => {
  const servers = await battleMetricsService.getPlayerServers(req.params.id, 20);
  
  // Получаем инфу о серверах
  const result = [];
  for (const s of servers) {
    const serverInfo = await battleMetricsService.getServer(s.id);
    if (serverInfo && !serverInfo.error) {
      result.push({
        ...s,
        server: {
          id: serverInfo.id,
          name: serverInfo.name,
          players: serverInfo.players,
          maxPlayers: serverInfo.maxPlayers,
          rank: serverInfo.rank
        }
      });
    }
  }
  res.json(result);
});

app.get('/api/player/check/:query', async (req, res) => {
  const query = req.params.query;
  
  // Определяем тип запроса
  let steamId = query;
  let bmPlayerId = null;
  
  // Если это не SteamID
  if (!/^\d{17}$/.test(query)) {
    // Пробуем как vanity URL
    const resolved = await steamService.resolveVanityUrl(query);
    if (resolved) {
      steamId = resolved;
    } else {
      // Ищем через BattleMetrics
      const bmResults = await battleMetricsService.searchPlayer(query, 5);
      if (bmResults.length) {
        bmPlayerId = bmResults[0].id;
        // Пробуем найти Steam профиль по имени
        steamId = null;
      } else {
        return res.json({ error: 'Игрок не найден' });
      }
    }
  }
  
  const result = { steam: null, bm: null, servers: [], friends: [] };
  
  // Steam данные
  if (steamId) {
    result.steam = await steamService.getFullProfile(steamId);
    // Получаем друзей
    result.friends = await steamService.getFriends(steamId);
  }
  
  // BattleMetrics данные
  if (bmPlayerId) {
    result.bm = await battleMetricsService.getPlayer(bmPlayerId);
    result.servers = await battleMetricsService.getPlayerServers(bmPlayerId, 15);
  } else if (result.steam && !result.steam.error) {
    // Ищем в BM по имени
    const bmSearch = await battleMetricsService.searchPlayer(result.steam.name, 5);
    const bmPlayer = bmSearch.find?.(p => p.positiveMatch) || bmSearch[0];
    if (bmPlayer) {
      result.bm = await battleMetricsService.getPlayer(bmPlayer.id);
      result.servers = await battleMetricsService.getPlayerServers(bmPlayer.id, 15);
    }
  }
  
  // Получаем инфу о серверах
  if (result.servers.length) {
    const serversWithInfo = [];
    for (const s of result.servers) {
      const serverInfo = await battleMetricsService.getServer(s.id);
      if (serverInfo && !serverInfo.error) {
        serversWithInfo.push({
          ...s,
          server: serverInfo
        });
      }
    }
    result.servers = serversWithInfo;
  }
  
  res.json(result);
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const ok = await rustPlus.sendTeamMessage(message);
  res.json({ success: ok });
});

// История событий
app.get('/api/history', (req, res) => {
  res.json(eventsHistory);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('[Web] Client connected');
  socket.on('disconnect', () => console.log('[Web] Client disconnected'));
});

function broadcast(event, data) { io.emit(event, data); }

function subscribeEvents() {
  eventBus.on(EVENTS.PLAYER_DEATH, d => {
    const event = { type: 'death', title: `${d.name} погиб`, grid: d.grid };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.PLAYER_ONLINE, d => {
    const event = { type: 'online', title: `${d.name} зашёл` };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.PLAYER_OFFLINE, d => {
    const event = { type: 'offline', title: `${d.name} вышел` };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.CARGO_SPAWN, d => {
    const event = { type: 'cargo', title: 'Cargo Ship', grid: d.grid };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.CARGO_DESPAWN, () => {
    const event = { type: 'cargo', title: 'Cargo ушёл' };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.HELI_SPAWN, d => {
    const event = { type: 'heli', title: 'Patrol Heli', grid: d.grid };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.HELI_DESPAWN, () => {
    const event = { type: 'heli', title: 'Heli уничтожен' };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.CHINOOK_SPAWN, d => {
    const event = { type: 'chinook', title: 'CH-47', grid: d.grid };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.CRATE_SPAWN, d => {
    const event = { type: 'crate', title: 'Locked Crate', grid: d.grid };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.RAID_ALERT, () => {
    const event = { type: 'alert', title: 'RAID ALERT!' };
    addToHistory(event);
    broadcast('event', event);
  });
  eventBus.on(EVENTS.CONNECTED, () => broadcast('status', { connected: true }));
  eventBus.on(EVENTS.DISCONNECTED, () => broadcast('status', { connected: false }));
  eventBus.on(EVENTS.TEAM_MESSAGE, d => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    broadcast('chat', { name: d.name, message: d.message, time });
  });
  
  // Периодическое обновление
  setInterval(async () => {
    const info = rustPlus.getCachedServerInfo();
    const time = await rustPlus.getTime();
    const team = await rustPlus.getTeamInfo();
    const mapSize = rustPlus.getMapSize();
    if (team?.members) team.members = team.members.map(m => ({ ...m, grid: coordsToGrid(m.x, m.y, mapSize) }));
    io.emit('update', { server: info, time, team, connected: rustPlus.isConnected() });
  }, 5000);
}

class WebServer {
  tunnelUrl = null;
  tunnel = null;
  
  async init() {
    if (process.env.WEB_ENABLED !== 'true') {
      console.log('[Web] ⚠️ Отключён (WEB_ENABLED!=true)');
      return;
    }
    
    console.log('[Web] ═══════════════════════════════════════');
    subscribeEvents();
    
    server.listen(PORT, async () => {
      console.log(`[Web] ✅ http://localhost:${PORT}`);
      
      // Туннель
      if (process.env.TUNNEL_SUBDOMAIN) {
        await this.setupTunnel();
      } else {
        console.log('[Web] ⚠️ TUNNEL_SUBDOMAIN не указан в .env');
      }
    });
    
    console.log('[Web] ═══════════════════════════════════════');
  }
  
  async setupTunnel() {
    const subdomain = process.env.TUNNEL_SUBDOMAIN;
    
    const connect = async (attempt = 1) => {
      try {
        console.log(`[Web] 🔄 Подключение к туннелю (${subdomain})...`);
        
        this.tunnel = await localtunnel({ 
          port: PORT, 
          subdomain: subdomain
        });
        
        this.tunnelUrl = this.tunnel.url;
        
        // Проверяем что получили НАШИ поддомен
        if (this.tunnelUrl.includes(subdomain)) {
          console.log(`[Web] 🌐 ${this.tunnelUrl}`);
        } else {
          // Получили чужой поддомен - закрываем и пробуем снова
          console.log(`[Web] ⚠️ Поддомен "${subdomain}" занят, получен: ${this.tunnelUrl}`);
          this.tunnel.close();
          
          if (attempt < 3) {
            console.log(`[Web] 🔄 Повторная попытка через 5 сек...`);
            setTimeout(() => connect(attempt + 1), 5000);
            return;
          } else {
            console.log(`[Web] ❌ Не удалось получить поддомен "${subdomain}"`);
            console.log(`[Web] 💡 Попробуй другой поддомен в .env`);
            this.tunnelUrl = null;
            return;
          }
        }
        
        this.tunnel.on('close', () => {
          console.log('[Web] ⚠️ Туннель закрыт, переподключение через 5 сек...');
          this.tunnelUrl = null;
          setTimeout(() => connect(), 5000);
        });
        
        this.tunnel.on('error', (err) => {
          console.log('[Web] ⚠️ Ошибка туннеля:', err.message);
        });
        
      } catch (e) {
        console.log(`[Web] ⚠️ Ошибка туннеля:`, e.message);
        if (attempt < 3) {
          console.log(`[Web] 🔄 Повторная попытка через 10 сек...`);
          setTimeout(() => connect(attempt + 1), 10000);
        } else {
          console.log(`[Web] ❌ Туннель недоступен`);
          console.log(`[Web] 💡 Доступ только локально: http://localhost:${PORT}`);
        }
      }
    };
    
    await connect();
  }
  
  getUrl() { return this.tunnelUrl || `http://localhost:${PORT}`; }
}

export default new WebServer();
