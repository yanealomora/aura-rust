/**
 * Rust Team Chat - команды и уведомления в игровой чат
 */

import rustPlus from '../services/RustPlusService.js';
import settings from '../core/Settings.js';
import stateCache from '../core/StateCache.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';
import { coordsToGrid } from '../core/GridHelper.js';
import { getDestroyInfo } from '../data/RaidData.js';
import { getItemName } from '../data/ItemDatabase.js';
import { getCraftInfo, getRecycleInfo, getResearchInfo, getDecayInfo, getUpkeepInfo, getCCTVCodes, getDespawnInfo, formatIngredients, formatOutput } from '../data/RustLabsData.js';

class RustTeamChatNotifier {
  constructor() {
    this.enabled = true;
    this.prefix = '!';
    this.leaderSwapTimeout = null;
    this.originalLeader = null;
    this.activeTimers = [];
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.messageDelay = 2500;
    this.sentMessages = new Set();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[TeamChat] Init...');
    eventBus.on(EVENTS.TEAM_MESSAGE, (data) => this.handleMessage(data));
    this.subscribeEvents();
    eventBus.once(EVENTS.CONNECTED, () => {
      setTimeout(() => this.send(':scientist: Bot online | !help'), 3000);
    });
    console.log('[TeamChat] Ready');
  }

  async handleMessage(data) {
    const msg = data.message?.trim();
    if (!msg || !msg.startsWith(this.prefix)) return;
    if (this.sentMessages.has(msg)) {
      this.sentMessages.delete(msg);
      return;
    }
    
    const [cmd, ...args] = msg.slice(this.prefix.length).toLowerCase().split(' ');
    const validCmds = ['help','h','?','pop','p','time','t','team','events','e','where','w','afk','wipe',
      'swap','leader','raid','r','eco','rec','search','s','shop','craft','c','recycle','research','res',
      'decay','d','upkeep','up','cctv','cam','despawn','timer','alive','deaths','cargo','heli','chinook',
      'prox','mute','unmute','chat','notify','1','2','3','4','5'];
    if (!validCmds.includes(cmd)) return;
    
    console.log(`[TeamChat] CMD: ${cmd}`);
    
    try {
      if (/^[1-5]$/.test(cmd)) return this.cmdHelpPage(parseInt(cmd));
      
      switch (cmd) {
        case 'help': case 'h': case '?': return this.cmdHelp();
        case 'pop': case 'p': return this.cmdPop();
        case 'time': case 't': return this.cmdTime();
        case 'team': return this.cmdTeam();
        case 'events': case 'e': return this.cmdEvents();
        case 'where': case 'w': return this.cmdWhere(args.join(' '));
        case 'afk': return this.cmdAfk();
        case 'wipe': return this.cmdWipe();
        case 'swap': case 'leader': return this.cmdSwap(args.join(' '));
        case 'raid': case 'r': return this.cmdRaid(args.join(' '));
        case 'eco': return this.cmdEco(args.join(' '));
        case 'rec': case 'recycle': return this.cmdRecycle(args.join(' '));
        case 'search': case 's': return this.cmdSearch(args.join(' '));
        case 'shop': return this.cmdShop(args.join(' '));
        case 'craft': case 'c': return this.cmdCraft(args.join(' '));
        case 'research': case 'res': return this.cmdResearch(args.join(' '));
        case 'decay': case 'd': return this.cmdDecay(args.join(' '));
        case 'upkeep': case 'up': return this.cmdUpkeep(args.join(' '));
        case 'cctv': case 'cam': return this.cmdCCTV(args.join(' '));
        case 'despawn': return this.cmdDespawn(args.join(' '));
        case 'timer': return this.cmdTimer(args.join(' '));
        case 'alive': return this.cmdAlive();
        case 'deaths': return this.cmdDeaths();
        case 'cargo': return this.cmdCargo();
        case 'heli': return this.cmdHeli();
        case 'chinook': return this.cmdChinook();
        case 'prox': return this.cmdProx(args.join(' '));
        case 'mute': settings.mute(); return this.send(':scientist: Muted');
        case 'unmute': settings.unmute(); return this.send(':scientist: Unmuted');
        case 'chat': case 'notify': return this.cmdChat(args.join(' '));
      }
    } catch (e) {
      console.error(`[TeamChat] Error: ${e.message}`);
    }
  }

  async cmdHelp() { await this.send(':mask: HELP: !1 base !2 raid !3 info !4 events !5 other'); }
  
  async cmdHelpPage(page) {
    const pages = {
      1: ':mask: BASE: !pop !time !team !where !afk !wipe !swap',
      2: ':exclamation: RAID: !raid !eco (door/garage/stone/metal/hqm/tc)',
      3: ':scientist: INFO: !craft !rec !research !decay !upkeep !despawn !cctv',
      4: ':yellowpin: EVENTS: !events !cargo !heli !chinook !alive !deaths !prox',
      5: ':vending.machine: OTHER: !search !shop !timer !mute !chat'
    };
    if (pages[page]) await this.send(pages[page]);
  }

  async cmdPop() {
    const info = rustPlus.getCachedServerInfo();
    if (!info) return this.send('? :scientist: No data');
    const q = info.queuedPlayers > 0 ? ` +${info.queuedPlayers}` : '';
    await this.send(`? :scientist: Pop: ${info.players}/${info.maxPlayers}${q}`);
  }

  async cmdTime() {
    const time = await rustPlus.getTime();
    if (!time) return this.send('? :scientist: No data');
    const t = time.time || 0;
    const h = Math.floor(t), m = Math.floor((t - h) * 60);
    const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    await this.send(`? :electric.digitalclock: ${t >= 7 && t < 20 ? 'DAY' : 'NIGHT'} ${str}`);
  }

  async cmdTeam() {
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send('? :scientist: No data');
    const mapSize = rustPlus.getMapSize();
    const online = team.members.filter(m => m.isOnline);
    if (online.length <= 5) {
      const list = online.map(m => `${m.name}(${coordsToGrid(m.x, m.y, mapSize)})`).join(' ');
      await this.send(`? :scientist: Online ${online.length}: ${list}`);
    } else {
      await this.send(`? :scientist: Online: ${online.length}/${team.members.length}`);
    }
  }

  async cmdEvents() {
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send('? :yellowpin: No data');
    const mapSize = rustPlus.getMapSize();
    const cargo = markers.markers.find(m => m.type === 5);
    const heli = markers.markers.find(m => m.type === 8);
    const ch47 = markers.markers.find(m => m.type === 4);
    const crates = markers.markers.filter(m => m.type === 6);
    let text = '? :yellowpin: ';
    if (cargo) text += `Cargo:${coordsToGrid(cargo.x, cargo.y, mapSize)} `;
    if (heli) text += `Heli:${coordsToGrid(heli.x, heli.y, mapSize)} `;
    if (ch47) text += `Грузовой:${coordsToGrid(ch47.x, ch47.y, mapSize)} `;
    text += `Crates:${crates.length}`;
    await this.send(text);
  }

  async cmdWhere(name) {
    if (!name) return this.send('? :yellowpin: !where name');
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send('? :yellowpin: No data');
    const mapSize = rustPlus.getMapSize();
    const p = team.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    if (!p) return this.send(`? :yellowpin: ${name} not found`);
    const grid = coordsToGrid(p.x, p.y, mapSize);
    await this.send(`? :yellowpin: ${p.name}${p.isAlive ? '' : ' :skull:'} - ${grid}`);
  }

  async cmdAfk() {
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send('? :dance: No data');
    const afk = [];
    for (const m of team.members.filter(m => m.isOnline)) {
      const cached = stateCache.getPlayer(m.steamId?.toString());
      if (cached?.afkTime && cached.afkTime > 300) {
        afk.push({ name: m.name, time: Math.floor(cached.afkTime / 60) });
      }
    }
    if (!afk.length) return this.send('? :dance: No AFK');
    await this.send(`? :dance: AFK: ${afk.map(p => `${p.name}(${p.time}m)`).join(' ')}`);
  }

  async cmdWipe() {
    const info = rustPlus.getCachedServerInfo();
    if (!info?.wipeTime) return this.send('? :electric.digitalclock: No data');
    const days = Math.floor((Date.now() - info.wipeTime * 1000) / 86400000);
    const hours = Math.floor(((Date.now() - info.wipeTime * 1000) % 86400000) / 3600000);
    await this.send(`? :electric.digitalclock: Wipe: ${days}d ${hours}h ago`);
  }

  async cmdSwap(name) {
    if (!name) return this.send('? :scientist: !swap name');
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send('? :scientist: No data');
    const p = team.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    if (!p) return this.send(`? :scientist: ${name} not found`);
    if (!p.isOnline) return this.send(`? :scientist: ${p.name} offline`);
    const ok = await rustPlus.promoteToLeader(p.steamId?.toString());
    await this.send(ok ? `? :scientist: Leader -> ${p.name}` : '? :scientist: Error');
  }

  async cmdRaid(target) {
    if (!target) return this.send('? :exclamation: !raid door/garage/stone/metal/hqm/tc');
    const raid = {
      'wood': '? :exclamation: Wood door: :arrow.fire: 13 / satchel 2 / rocket 1',
      'door': '? :exclamation: Sheet: 1rocket+8explo / C4 1 / satchel 4',
      'sheet': '? :exclamation: Sheet: 1rocket+8explo / C4 1 / satchel 4',
      'garage': '? :exclamation: Garage: 2rocket+16explo / C4 2 / satchel 9',
      'armored': '? :exclamation: Armored: 4rocket+20explo / C4 3 / satchel 18',
      'armored_door': '? :exclamation: Armored: 4rocket+20explo / C4 3 / satchel 18',
      'stone': '? :exclamation: Stone: 4rocket+10explo / C4 2 / satchel 10',
      'metal': '? :exclamation: Metal: 8rocket+40explo / C4 4 / satchel 23',
      'hqm': '? :exclamation: HQM: 15rocket+60explo / C4 8 / satchel 46',
      'hatch': '? :exclamation: Hatch: 1rocket+8explo / C4 1 / satchel 4',
      'armored_hatch': '? :exclamation: Armored hatch: 4rocket+10explo / C4 2 / satchel 12',
      'tc': '? :exclamation: TC: satchel 1 / rocket 1 / explo 25',
      'turret': '? :exclamation: Turret: satchel 2 / rocket 1 / explo 40',
      'vending': '? :exclamation: Vending: satchel 3 / rocket 1 / explo 60',
      'sam': '? :exclamation: SAM: satchel 3 / rocket 1 / explo 45'
    };
    const key = target.toLowerCase();
    await this.send(raid[key] || '? :exclamation: door/garage/armored/stone/metal/hqm/tc/hatch');
  }

  async cmdEco(target) {
    if (!target) return this.send('? :exclamation: !eco door/garage/stone/metal/hqm');
    const eco = {
      'wood': '? :exclamation: Wood door: 1 hammer 185 hits ~3min',
      'door': '? :exclamation: Sheet: 12-15 hammers 2500 hits ~40min',
      'sheet': '? :exclamation: Sheet: 12-15 hammers 2500 hits ~40min',
      'garage': '? :exclamation: Garage: 25-30 hammers 5500 hits ~1.5h',
      'armored': '? :exclamation: Armored: 40-45 hammers 8500 hits ~2.5h',
      'wood_wall': '? :exclamation: Wood wall: 2 hammers 380 hits ~6min',
      'stone': '? :exclamation: Stone SOFT: 5 hammers 950 hits ~15min',
      'stone_hard': '? :exclamation: Stone HARD: 22 hammers 4300 hits ~1h',
      'metal': '? :exclamation: Metal SOFT: 11 hammers 2100 hits ~35min',
      'metal_hard': '? :exclamation: Metal HARD: 50 hammers 9500 hits ~2.5h',
      'hqm': '? :exclamation: HQM SOFT: 16-17 hammers 3200 hits ~50min',
      'hqm_hard': '? :exclamation: HQM HARD: 75+ hammers 15000+ hits ~4h',
      'hatch': '? :exclamation: Hatch: 12-13 hammers 2500 hits ~40min',
      'armored_hatch': '? :exclamation: Armored hatch: 24 hammers 4800 hits ~1.5h',
      'tc': '? :exclamation: TC: 3 hammers 420 hits ~7min',
      'turret': '? :exclamation: Turret: 7 hammers 1300 hits ~20min',
      'box': '? :exclamation: Large box: 1 hammer 160 hits ~3min',
      'locker': '? :exclamation: Locker: 2 hammers 310 hits ~5min',
      'wb1': '? :exclamation: WB1: 2 hammers 300 hits ~5min',
      'wb2': '? :exclamation: WB2: 3 hammers 520 hits ~8min',
      'wb3': '? :exclamation: WB3: 4 hammers 780 hits ~12min',
      'furnace': '? :exclamation: Furnace: 2 hammers 300 hits ~5min',
      'vending': '? :exclamation: Vending: 5 hammers 880 hits ~15min'
    };
    const key = target.toLowerCase();
    await this.send(eco[key] || '? :exclamation: door/garage/stone/metal/hqm/tc/turret');
  }

  async cmdSearch(query) {
    if (!query) return this.send(':vending.machine: !search item - find in vending');
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send(':vending.machine: No vending data');
    const mapSize = rustPlus.getMapSize();
    const shops = markers.markers.filter(m => m.type === 3);
    
    if (!shops.length) return this.send(':vending.machine: No vending machines');
    
    const results = [];
    const q = query.toLowerCase();
    
    for (const shop of shops) {
      if (!shop.sellOrders) continue;
      for (const order of shop.sellOrders) {
        if (order.amountInStock === 0) continue;
        const itemName = getItemName(order.itemId);
        const shopName = shop.name || '';
        if (itemName.toLowerCase().includes(q) || shopName.toLowerCase().includes(q)) {
          const grid = coordsToGrid(shop.x, shop.y, mapSize);
          const key = `${grid}-${order.itemId}`;
          if (!results.find(r => r.key === key)) {
            results.push({ key, grid, item: itemName.substring(0, 12), stock: order.amountInStock });
          }
        }
      }
    }
    
    if (!results.length) return this.send(`:vending.machine: ${query} - not found (${shops.length} shops)`);
    const top = results.slice(0, 3);
    let text = `:vending.machine: Found ${results.length}: `;
    text += top.map(r => `${r.grid}=${r.item}x${r.stock}`).join(' ');
    await this.send(text.substring(0, 120));
  }

  async cmdShop(args) {
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send(':vending.machine: No data');
    const mapSize = rustPlus.getMapSize();
    const shops = markers.markers.filter(m => m.type === 3);
    
    if (!args) {
      const ourShops = settings.get('ourShops') || [];
      if (!ourShops.length) return this.send(':vending.machine: No shops. !shop add GRID');
      const found = [];
      for (const shop of shops) {
        const grid = coordsToGrid(shop.x, shop.y, mapSize);
        if (ourShops.some(g => grid.startsWith(g))) {
          found.push({ grid, name: (shop.name || 'Shop').substring(0, 10) });
        }
      }
      if (!found.length) return this.send(`:vending.machine: Shops in ${ourShops.join(',')} not found`);
      return this.send(`:vending.machine: Shops: ${found.slice(0, 3).map(s => `${s.grid}:${s.name}`).join(' ')}`);
    }
    
    const parts = args.split(' ');
    const cmd = parts[0]?.toLowerCase();
    const grid = parts[1]?.toUpperCase();
    
    if (cmd === 'add' && grid) {
      const ourShops = settings.get('ourShops') || [];
      if (ourShops.includes(grid)) return this.send(`:vending.machine: ${grid} already added`);
      ourShops.push(grid);
      settings.set('ourShops', ourShops);
      return this.send(`:vending.machine: Shop ${grid} added`);
    }
    
    if ((cmd === 'del' || cmd === 'rm') && grid) {
      const ourShops = settings.get('ourShops') || [];
      const idx = ourShops.indexOf(grid);
      if (idx === -1) return this.send(`:vending.machine: ${grid} not found`);
      ourShops.splice(idx, 1);
      settings.set('ourShops', ourShops);
      return this.send(`:vending.machine: Shop ${grid} removed`);
    }
    
    if (/^[A-Z]+\d+$/i.test(args.toUpperCase())) {
      const g = args.toUpperCase();
      const ourShops = settings.get('ourShops') || [];
      if (ourShops.includes(g)) return this.send(`:vending.machine: ${g} already added`);
      ourShops.push(g);
      settings.set('ourShops', ourShops);
      return this.send(`:vending.machine: Shop ${g} added`);
    }
    
    return this.send(':vending.machine: !shop / !shop add K15 / !shop del K15');
  }

  async cmdCraft(item) {
    if (!item) return this.send(':scientist: !craft ak/mp5/c4/rocket');
    const info = getCraftInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    const time = info.time >= 60 ? `${Math.floor(info.time / 60)}m` : `${info.time}s`;
    await this.send(`:scientist: ${info.name} WB${info.workbench} ${time}: ${formatIngredients(info.ingredients)}`);
  }

  async cmdRecycle(item) {
    if (!item) return this.send(':scientist: !rec gears/spring/pipe/ak/tech');
    const info = getRecycleInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    await this.send(`:scientist: ${info.name}: ${formatOutput(info.output)}`);
  }

  async cmdResearch(item) {
    if (!item) return this.send(':scientist: !research ak/mp5/c4');
    const info = getResearchInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    await this.send(`:scientist: ${info.name}: ${info.scrap} scrap WB${info.workbench}`);
  }

  async cmdDecay(item) {
    if (!item) return this.send(':scientist: !decay wood/stone/metal/armored');
    const info = getDecayInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    await this.send(`:scientist: ${info.name}: ${info.time}`);
  }

  async cmdUpkeep(item) {
    if (!item) return this.send(':scientist: !upkeep wood/stone/metal/armored');
    const info = getUpkeepInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    await this.send(`:scientist: ${info.name} 24h: ${formatIngredients(info.cost)}`);
  }

  async cmdCCTV(monument) {
    if (!monument) return this.send(':scientist: !cctv dome/launch/airfield/outpost/bandit/large/small');
    const info = getCCTVCodes(monument);
    if (!info) return this.send(`:scientist: ${monument} not found`);
    await this.send(`:scientist: ${info.name}: ${info.codes.slice(0, 4).join(' ')}`);
  }

  async cmdDespawn(item) {
    if (!item) return this.send(':scientist: !despawn ak/c4/scrap');
    const info = getDespawnInfo(item);
    if (!info) return this.send(`:scientist: ${item} not found`);
    await this.send(`:scientist: ${info.name} despawn: ${info.time}`);
  }

  async cmdTimer(args) {
    if (!args || args === 's') {
      if (!this.activeTimers.length) return this.send(':electric.digitalclock: No timers');
      const list = this.activeTimers.slice(0, 3).map(t => `${t.name}(${Math.ceil((t.end - Date.now()) / 60000)}m)`).join(' ');
      return this.send(`:electric.digitalclock: Timers: ${list}`);
    }
    
    const presets = { 'oil': 15, 'large': 15, 'small': 15, 'cargo': 50, 'heli': 15, 'brad': 5, 'crate': 15 };
    let timerName, minutes;
    
    if (presets[args.toLowerCase()]) {
      timerName = args;
      minutes = presets[args.toLowerCase()];
    } else {
      minutes = parseInt(args);
      if (isNaN(minutes) || minutes <= 0 || minutes > 120) return this.send(':electric.digitalclock: !timer 5 / !timer oil/cargo/heli');
      timerName = 'Timer';
    }
    
    const timer = { name: timerName, end: Date.now() + minutes * 60 * 1000 };
    this.activeTimers.push(timer);
    
    setTimeout(async () => {
      await this.send(`:exclamation: ${timerName} ready!`);
      const idx = this.activeTimers.indexOf(timer);
      if (idx !== -1) this.activeTimers.splice(idx, 1);
    }, minutes * 60 * 1000);
    
    await this.send(`:electric.digitalclock: Timer ${timerName}: ${minutes}m`);
  }

  async cmdAlive() {
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send(':skull: No data');
    const alive = team.members.filter(m => m.isOnline && m.isAlive);
    const dead = team.members.filter(m => m.isOnline && !m.isAlive);
    let text = `:skull: Alive: ${alive.length}`;
    if (dead.length) text += ` Dead: ${dead.map(m => m.name).join(',')}`;
    await this.send(text.substring(0, 120));
  }

  async cmdDeaths() {
    const deaths = stateCache.get('recentDeaths') || [];
    if (!deaths.length) return this.send(':skull: No deaths');
    const text = deaths.slice(0, 3).map(d => `${d.name}(${d.grid})`).join(' ');
    await this.send(`:skull: Deaths: ${text}`);
  }

  async cmdCargo() {
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send(':yellowpin: No data');
    const mapSize = rustPlus.getMapSize();
    const cargo = markers.markers.find(m => m.type === 5);
    if (!cargo) return this.send(':yellowpin: Cargo not on map');
    await this.send(`:yellowpin: Cargo - ${coordsToGrid(cargo.x, cargo.y, mapSize)}`);
  }

  async cmdHeli() {
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send(':yellowpin: No data');
    const mapSize = rustPlus.getMapSize();
    const heli = markers.markers.find(m => m.type === 8);
    if (!heli) return this.send(':yellowpin: Heli not on map');
    await this.send(`:yellowpin: Heli - ${coordsToGrid(heli.x, heli.y, mapSize)}`);
  }

  async cmdChinook() {
    const markers = await rustPlus.getMapMarkers();
    if (!markers?.markers) return this.send(':yellowpin: No data');
    const mapSize = rustPlus.getMapSize();
    const ch47 = markers.markers.find(m => m.type === 4);
    if (!ch47) return this.send(':yellowpin: Грузовой not on map');
    await this.send(`:yellowpin: Грузовой - ${coordsToGrid(ch47.x, ch47.y, mapSize)}`);
  }

  async cmdProx(name) {
    const team = await rustPlus.getTeamInfo();
    if (!team?.members) return this.send(':yellowpin: No data');
    const online = team.members.filter(m => m.isOnline);
    if (online.length < 2) return this.send(':yellowpin: Not enough players');
    
    let target = name ? online.find(m => m.name.toLowerCase().includes(name.toLowerCase())) : online[0];
    if (!target) return this.send(`:yellowpin: ${name} not found`);
    
    const nearby = [];
    for (const m of online) {
      if (m.steamId === target.steamId) continue;
      const dist = Math.sqrt(Math.pow(m.x - target.x, 2) + Math.pow(m.y - target.y, 2));
      if (dist < 100) nearby.push({ name: m.name, dist: Math.floor(dist) });
    }
    
    if (!nearby.length) return this.send(`:yellowpin: Near ${target.name}: nobody`);
    await this.send(`:yellowpin: Near ${target.name}: ${nearby.slice(0, 3).map(n => `${n.name}(${n.dist}m)`).join(' ')}`);
  }

  async cmdChat(args) {
    if (!args) {
      const enabled = settings.get('teamChat.enabled');
      const deaths = settings.get('teamChat.deaths');
      const online = settings.get('teamChat.online');
      const events = settings.get('teamChat.events');
      return this.send(`:scientist: Chat: ${enabled ? 'ON' : 'OFF'} | deaths:${deaths ? '+' : '-'} online:${online ? '+' : '-'} events:${events ? '+' : '-'}`);
    }
    
    const cmd = args.toLowerCase();
    
    if (cmd === 'off' || cmd === 'disable') {
      settings.set('teamChat.enabled', false);
      return this.send(':scientist: Chat notifications OFF');
    }
    
    if (cmd === 'on' || cmd === 'enable') {
      settings.set('teamChat.enabled', true);
      return this.send(':scientist: Chat notifications ON');
    }
    
    if (cmd === 'deaths') {
      const val = settings.toggle('teamChat.deaths');
      return this.send(`:scientist: Deaths: ${val ? 'ON' : 'OFF'}`);
    }
    
    if (cmd === 'online' || cmd === 'joins') {
      const val = settings.toggle('teamChat.online');
      return this.send(`:scientist: Online/Offline: ${val ? 'ON' : 'OFF'}`);
    }
    
    if (cmd === 'events') {
      const val = settings.toggle('teamChat.events');
      return this.send(`:scientist: Events: ${val ? 'ON' : 'OFF'}`);
    }
    
    return this.send(':scientist: !chat on/off/deaths/online/events');
  }

  subscribeEvents() {
    if (this.eventsSubscribed) return;
    this.eventsSubscribed = true;
    
    // Проверяем настройки перед отправкой
    const canSend = (type) => {
      if (!settings.get('teamChat.enabled')) return false;
      if (type === 'death') return settings.get('teamChat.deaths');
      if (type === 'online' || type === 'offline') return settings.get('teamChat.online');
      if (type === 'event') return settings.get('teamChat.events');
      return true;
    };
    
    eventBus.on(EVENTS.PLAYER_DEATH, d => canSend('death') && this.send(`:skull: ${d.name} - ${d.grid}`));
    eventBus.on(EVENTS.PLAYER_ONLINE, d => canSend('online') && this.send(`:scientist: ON ${d.name}`));
    eventBus.on(EVENTS.PLAYER_OFFLINE, d => canSend('offline') && this.send(`:scientist: OFF ${d.name}`));
    eventBus.on(EVENTS.CARGO_SPAWN, d => canSend('event') && this.send(`:yellowpin: CARGO ${d.grid}`));
    eventBus.on(EVENTS.CARGO_DESPAWN, () => canSend('event') && this.send(':yellowpin: CARGO left'));
    eventBus.on(EVENTS.HELI_SPAWN, d => canSend('event') && this.send(`:yellowpin: HELI ${d.grid}`));
    eventBus.on(EVENTS.HELI_DESPAWN, () => canSend('event') && this.send(':yellowpin: HELI down'));
    eventBus.on(EVENTS.CHINOOK_SPAWN, d => canSend('event') && this.send(`:yellowpin: CH47 ${d.grid}`));
    eventBus.on(EVENTS.CRATE_SPAWN, d => canSend('event') && this.send(`:yellowpin: CRATE ${d.grid}`));
    eventBus.on(EVENTS.RAID_ALERT, () => this.send(':exclamation: RAID ALERT!'));
    eventBus.on(EVENTS.SHOP_NEW, d => canSend('event') && (d.count > 1 ? this.send(`:vending.machine: SHOP New (${d.count})`) : this.send(`:vending.machine: SHOP New - ${d.grid}`)));
    eventBus.on(EVENTS.SHOP_GONE, d => canSend('event') && (d.count > 1 ? this.send(`:vending.machine: SHOP Gone (${d.count})`) : this.send(`:vending.machine: SHOP Gone - ${d.grid}`)));
    eventBus.on(EVENTS.SHOP_SOLD, d => canSend('event') && (d.grouped ? this.send(`:vending.machine: SOLD (${d.count})`) : this.send(`:vending.machine: SOLD ${d.item} x${d.amount} - ${d.grid}`)));
  }

  async send(message) {
    if (!this.enabled || settings.isMuted()) return false;
    this.messageQueue.push(message);
    if (!this.isProcessingQueue) this.processQueue();
    return true;
  }

  async processQueue() {
    if (this.messageQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    this.isProcessingQueue = true;
    const message = this.messageQueue.shift();
    try {
      this.sentMessages.add(message);
      setTimeout(() => this.sentMessages.delete(message), 10000);
      await rustPlus.sendTeamMessage(message);
    } catch (e) {
      console.error('[TeamChat] Send error:', e.message);
    }
    setTimeout(() => this.processQueue(), this.messageDelay);
  }
}

export default new RustTeamChatNotifier();
