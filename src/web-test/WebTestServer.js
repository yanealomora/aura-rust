/**
 * AURA RUST - Web Test Server
 * Новый дизайн с Steam авторизацией
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rustPlus from '../services/RustPlusService.js';
import settings from '../core/Settings.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';
import { coordsToGrid } from '../core/GridHelper.js';
import deviceManager from '../services/DeviceManager.js';
import { STRUCTURES, CATEGORIES, getDestroyInfo } from '../data/RaidData.js';
import { getItemName } from '../data/ItemDatabase.js';
import steamService from '../services/SteamService.js';
import battleMetricsService from '../services/BattleMetricsService.js';
import accessControl from '../core/AccessControl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
// Railway использует PORT, локально WEB_TEST_PORT
const PORT = process.env.PORT || process.env.WEB_TEST_PORT || 3001;

// Домен - Railway даёт RAILWAY_PUBLIC_DOMAIN
let DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.WEB_TEST_DOMAIN || `http://localhost:${PORT}`;

// История событий
const eventsHistory = [];
const MAX_HISTORY = 50;

function addToHistory(event) {
  eventsHistory.unshift({ ...event, time: new Date().toISOString() });
  if (eventsHistory.length > MAX_HISTORY) eventsHistory.pop();
}

// Разрешённые Steam ID
const ALLOWED_STEAM_IDS = (process.env.ALLOWED_STEAM_IDS || '').split(',').filter(Boolean);

// Session & Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'aura-rust-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Функция для настройки Steam Strategy с динамическим доменом
function setupSteamStrategy(domain) {
  if (!process.env.STEAM_API_KEY) {
    console.log('[WebTest] STEAM_API_KEY not set - auth disabled');
    return;
  }
  
  passport.use(new SteamStrategy({
    returnURL: `${domain}/auth/steam/return`,
    realm: domain,
    apiKey: process.env.STEAM_API_KEY
  }, (identifier, profile, done) => {
    const user = {
      steamId: profile.id,
      name: profile.displayName,
      avatar: profile.photos[2]?.value || profile.photos[0]?.value,
      profileUrl: profile._json.profileurl
    };
    return done(null, user);
  }));
  
  console.log(`[WebTest] Steam auth configured for: ${domain}`);
}

// Middleware
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// Auth check middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    if (ALLOWED_STEAM_IDS.length === 0 || ALLOWED_STEAM_IDS.includes(req.user.steamId)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied' });
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Auth routes
app.get('/auth/steam', (req, res, next) => {
  passport.authenticate('steam')(req, res, next);
});

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => res.redirect('/')
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    const hasAccess = ALLOWED_STEAM_IDS.length === 0 || ALLOWED_STEAM_IDS.includes(req.user.steamId);
    res.json({ ...req.user, hasAccess });
  } else {
    res.json(null);
  }
});


// ═══════════════════ API ═══════════════════
app.get('/api/status', requireAuth, async (req, res) => {
  const info = rustPlus.getCachedServerInfo();
  const time = await rustPlus.getTime();
  res.json({ connected: rustPlus.isConnected(), server: info, time, settings: settings.settings });
});

app.get('/api/team', requireAuth, async (req, res) => {
  const team = await rustPlus.getTeamInfo();
  const mapSize = rustPlus.getMapSize();
  if (team?.members) {
    team.members = team.members.map(m => ({ ...m, grid: coordsToGrid(m.x, m.y, mapSize) }));
  }
  res.json(team || { members: [] });
});

app.get('/api/events', requireAuth, async (req, res) => {
  const markers = await rustPlus.getMapMarkers();
  const mapSize = rustPlus.getMapSize();
  if (!markers?.markers) return res.json({ markers: [], mapSize });
  const events = markers.markers.map(m => ({ ...m, grid: coordsToGrid(m.x, m.y, mapSize) }));
  res.json({ markers: events, mapSize });
});

app.get('/api/history', requireAuth, (req, res) => {
  res.json(eventsHistory);
});

app.get('/api/map', requireAuth, async (req, res) => {
  const map = await rustPlus.getMap();
  if (!map?.jpgImage) return res.status(404).send('Map not available');
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from(map.jpgImage));
});

app.get('/api/shops', requireAuth, async (req, res) => {
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

app.get('/api/devices', requireAuth, async (req, res) => {
  const devices = deviceManager.getAll();
  const result = [];
  for (const d of devices) {
    const status = await deviceManager.getStatus(d.id);
    result.push({ ...d, status: status?.value || false });
  }
  res.json(result);
});

app.post('/api/device/:id/:action', requireAuth, async (req, res) => {
  const { id, action } = req.params;
  const result = action === 'on' ? await deviceManager.turnOn(id) : await deviceManager.turnOff(id);
  res.json(result);
});

app.get('/api/raid', requireAuth, (req, res) => res.json({ categories: CATEGORIES, structures: STRUCTURES }));

app.get('/api/raid/:key', requireAuth, (req, res) => {
  const info = getDestroyInfo(req.params.key, parseInt(req.query.count) || 1);
  res.json(info || { error: 'Not found' });
});

app.post('/api/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  const ok = await rustPlus.sendTeamMessage(message);
  res.json({ success: ok });
});

app.get('/api/settings', requireAuth, (req, res) => res.json(settings.settings));

app.post('/api/settings', requireAuth, (req, res) => {
  const { key, value } = req.body;
  if (key === 'mute') value ? settings.mute() : settings.unmute();
  else settings.set(key, value);
  res.json({ success: true, settings: settings.settings });
});

// ═══════════════════ PLAYER CHECKER API ═══════════════════
app.get('/api/player/search', requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: 'Query required' });
  const results = await battleMetricsService.searchPlayer(query, 15);
  res.json(results);
});

app.get('/api/player/steam/:id', requireAuth, async (req, res) => {
  const steamId = req.params.id;
  let resolvedId = steamId;
  if (!/^\d{17}$/.test(steamId)) {
    const resolved = await steamService.resolveVanityUrl(steamId);
    if (resolved) resolvedId = resolved;
    else return res.json({ error: 'Not found' });
  }
  const profile = await steamService.getFullProfile(resolvedId);
  const friends = await steamService.getFriends(resolvedId);
  res.json({ ...profile, friends });
});

app.get('/api/player/bm/:id', requireAuth, async (req, res) => {
  const player = await battleMetricsService.getPlayer(req.params.id);
  res.json(player);
});

app.get('/api/player/bm/:id/servers', requireAuth, async (req, res) => {
  const servers = await battleMetricsService.getPlayerServers(req.params.id, 20);
  const result = [];
  for (const s of servers) {
    const serverInfo = await battleMetricsService.getServer(s.id);
    if (serverInfo && !serverInfo.error) {
      result.push({ ...s, server: serverInfo });
    }
  }
  res.json(result);
});

app.get('/api/player/check/:query', requireAuth, async (req, res) => {
  const query = req.params.query;
  let steamId = query;
  
  // Если это SteamID
  if (/^\d{17}$/.test(query)) {
    const result = { steam: null, bm: null, servers: [], friends: [], bmProfiles: [] };
    
    // Steam данные
    result.steam = await steamService.getFullProfile(steamId);
    result.friends = await steamService.getFriends(steamId);
    
    // Ищем ВСЕ BM профили с таким же ником
    if (result.steam && !result.steam.error) {
      const bmSearch = await battleMetricsService.searchPlayer(result.steam.name, 15);
      result.bmProfiles = bmSearch; // Все профили
      
      // Берём первый для серверов
      const bmPlayer = bmSearch.find?.(p => p.positiveMatch) || bmSearch[0];
      if (bmPlayer) {
        result.bm = await battleMetricsService.getPlayer(bmPlayer.id);
        result.servers = await battleMetricsService.getPlayerServers(bmPlayer.id, 15);
        
        // Получаем инфу о серверах
        const serversWithInfo = [];
        for (const s of result.servers) {
          const serverInfo = await battleMetricsService.getServer(s.id);
          if (serverInfo && !serverInfo.error) {
            serversWithInfo.push({ ...s, server: serverInfo });
          }
        }
        result.servers = serversWithInfo;
      }
    }
    
    return res.json(result);
  }
  
  // Поиск по нику - возвращаем список BM профилей
  const bmResults = await battleMetricsService.searchPlayer(query, 15);
  res.json({ bmProfiles: bmResults });
});


// Socket.IO
io.on('connection', (socket) => {
  console.log('[WebTest] Client connected');
  socket.on('disconnect', () => console.log('[WebTest] Client disconnected'));
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

class WebTestServer {
  async init() {
    if (process.env.WEB_TEST_ENABLED !== 'true') {
      console.log('[WebTest] Disabled (WEB_TEST_ENABLED!=true)');
      return;
    }
    
    console.log('[WebTest] ═══════════════════════════════════════');
    subscribeEvents();
    
    server.listen(PORT, async () => {
      console.log(`[WebTest] http://localhost:${PORT}`);
      
      // Railway - уже есть публичный домен
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        DOMAIN = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        setupSteamStrategy(DOMAIN);
        console.log(`[WebTest] Railway: ${DOMAIN}`);
      }
      // Cloudflare Tunnel
      else if (process.env.CLOUDFLARE_TUNNEL_TOKEN) {
        DOMAIN = process.env.WEB_TEST_DOMAIN || `http://localhost:${PORT}`;
        setupSteamStrategy(DOMAIN);
        console.log(`[WebTest] Cloudflare Tunnel: ${DOMAIN}`);
      }
      // ngrok для локальной разработки
      else if (process.env.NGROK_AUTH_TOKEN) {
        await this.setupNgrok();
      }
      // Local only
      else {
        DOMAIN = `http://localhost:${PORT}`;
        setupSteamStrategy(DOMAIN);
        console.log(`[WebTest] Local only: ${DOMAIN}`);
      }
    });
    
    console.log('[WebTest] ═══════════════════════════════════════');
  }
  
  async setupNgrok() {
    try {
      const ngrok = await import('ngrok');
      const url = await ngrok.default.connect({
        addr: PORT,
        authtoken: process.env.NGROK_AUTH_TOKEN
      });
      
      DOMAIN = url;
      setupSteamStrategy(DOMAIN);
      
      console.log(`[WebTest] ngrok: ${url}`);
    } catch (e) {
      console.log(`[WebTest] ngrok error: ${e.message}`);
      DOMAIN = `http://localhost:${PORT}`;
      setupSteamStrategy(DOMAIN);
    }
  }
}

export default new WebTestServer();
