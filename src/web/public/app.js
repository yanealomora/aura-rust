const socket = io();
let data = { server: null, team: null, events: [], shops: [], settings: null };
const history = [];
const chatHistory = [];
let raidData = null;
let mapZoom = 1;
let mapPan = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let rustChatEnabled = localStorage.getItem('rustChatEnabled') !== 'false';

// SVG Icons
const icons = {
  skull: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v-4a8 8 0 1 1 8 0v4"/></svg>',
  signIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  signOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/></svg>',
  heli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  sulfur: '<svg viewBox="0 0 24 24" style="width:14px;height:14px"><circle cx="12" cy="12" r="10" fill="#f39c12"/></svg>'
};

// Snowflakes
function createSnowflakes() {
  const container = document.getElementById('snowflakes');
  for (let i = 0; i < 40; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.innerHTML = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
    flake.style.left = Math.random() * 100 + '%';
    flake.style.animationDuration = (Math.random() * 10 + 10) + 's';
    flake.style.animationDelay = Math.random() * 10 + 's';
    flake.style.fontSize = (Math.random() * 8 + 8) + 'px';
    flake.style.opacity = Math.random() * 0.5 + 0.2;
    container.appendChild(flake);
  }
}
createSnowflakes();


// Socket events
socket.on('connect', () => setStatus(true));
socket.on('disconnect', () => setStatus(false));
socket.on('status', d => setStatus(d.connected));
socket.on('update', d => { data = { ...data, ...d }; updateUI(); });
socket.on('event', e => { addEvent(e); toast(e.title, e.type === 'alert' ? 'error' : 'info'); });
socket.on('chat', msg => { if (rustChatEnabled) addChatMessage(msg); });

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`page-${link.dataset.page}`).classList.add('active');
    if (link.dataset.page === 'map') initMap();
    if (link.dataset.page === 'shops') loadShops();
    if (link.dataset.page === 'raid') loadRaid();
    if (link.dataset.page === 'settings') loadSettings();
  });
});

// Init
async function init() {
  await refresh();
  await loadHistory();
  setInterval(refresh, 10000);
  document.getElementById('shopSearch')?.addEventListener('input', e => filterShops(e.target.value));
  initMapDrag();
}

async function loadHistory() {
  try {
    const events = await fetch('/api/history').then(r => r.json());
    events.forEach(e => {
      history.push({ ...e, time: new Date(e.time) });
    });
    updateEventsList();
    updateActiveEvents();
  } catch (e) { console.error('History:', e); }
}

async function refresh() {
  try {
    const [status, team, events] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/team').then(r => r.json()),
      fetch('/api/events').then(r => r.json())
    ]);
    data = { server: status.server, team, events: events.markers, mapSize: events.mapSize, settings: status.settings, time: status.time };
    setStatus(status.connected);
    updateUI();
  } catch (e) { console.error('Refresh:', e); }
}

function setStatus(connected) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className = `status-dot ${connected ? 'on' : 'off'}`;
  text.textContent = connected ? 'Подключён' : 'Отключён';
}

function updateUI() {
  updateHeader();
  updateStats();
  updateTeamList();
  updateEventsList();
  updateMiniMap();
  updateTeamGrid();
  updateActiveEvents();
}

function updateHeader() {
  const s = data.server;
  if (!s) return;
  document.getElementById('serverName').textContent = s.name || 'Загрузка...';
  document.getElementById('players').textContent = `${s.players || 0}/${s.maxPlayers || 0}`;
  if (data.time) {
    const h = Math.floor(data.time.time), m = Math.floor((data.time.time - h) * 60);
    document.getElementById('gameTime').textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  if (s.wipeTime) {
    const d = Math.floor((Date.now() - s.wipeTime * 1000) / 86400000);
    document.getElementById('wipe').textContent = `Вайп: ${d}д`;
  }
}

function updateStats() {
  const team = data.team?.members || [];
  const events = data.events || [];
  document.getElementById('statOnline').textContent = team.filter(m => m.isOnline).length;
  document.getElementById('statTeam').textContent = team.length;
  document.getElementById('statEvents').textContent = events.filter(e => [4, 5, 6, 8].includes(e.type)).length;
  document.getElementById('statShops').textContent = events.filter(e => e.type === 3).length;
}

function updateTeamList() {
  const el = document.getElementById('teamList');
  const team = data.team?.members || [];
  const leader = data.team?.leaderSteamId?.toString();
  el.innerHTML = team.slice(0, 6).map(m => `
    <div class="team-member">
      <div class="member-dot ${m.isOnline ? 'on' : 'off'}"></div>
      <div class="member-info">
        <div class="member-name">${m.name} ${m.steamId?.toString() === leader ? icons.crown : ''}</div>
        ${m.isOnline ? `<div class="member-grid">${m.grid || '?'}</div>` : ''}
      </div>
    </div>
  `).join('') || '<div style="padding:16px;color:var(--text3)">Нет данных</div>';
}


function updateEventsList() {
  const el = document.getElementById('eventsList');
  el.innerHTML = history.slice(0, 6).map(e => `
    <div class="event-item ${e.type}">
      <div class="event-icon ${e.type}">${getIconSvg(e.type)}</div>
      <div class="event-info">
        <div class="event-title">${e.title}</div>
        <div class="event-time">${e.grid ? e.grid + ' • ' : ''}${timeAgo(e.time)}</div>
      </div>
    </div>
  `).join('') || '<div style="padding:16px;color:var(--text3)">Нет событий</div>';
}

function updateMiniMap() {
  // Маркеры игроков отключены - координаты неточные
  const markers = document.getElementById('miniMarkers');
  markers.innerHTML = '';
}

function updateTeamGrid() {
  const el = document.getElementById('teamGrid');
  if (!el) return;
  const team = data.team?.members || [];
  const leader = data.team?.leaderSteamId?.toString();
  el.innerHTML = team.map(m => `
    <div class="team-card">
      <div class="team-avatar ${m.isOnline ? 'on' : 'off'}">${icons.user}</div>
      <div>
        <div class="member-name" style="font-weight:600;margin-bottom:4px">${m.name} ${m.steamId?.toString() === leader ? icons.crown : ''}</div>
        <div style="color:var(--text3);font-size:13px">${m.isOnline ? m.grid || 'Unknown' : 'Оффлайн'}</div>
      </div>
    </div>
  `).join('');
}

function updateActiveEvents() {
  const el = document.getElementById('activeEvents');
  if (!el) return;
  const events = data.events || [];
  const cargo = events.find(e => e.type === 5);
  const heli = events.find(e => e.type === 8);
  const chinook = events.find(e => e.type === 4);
  const crates = events.filter(e => e.type === 6);
  
  el.innerHTML = `
    <div class="card event-card cargo ${cargo ? 'active' : ''}">${icons.ship}<h4>Cargo</h4><div class="grid">${cargo ? cargo.grid : '—'}</div></div>
    <div class="card event-card heli ${heli ? 'active' : ''}">${icons.heli}<h4>Heli</h4><div class="grid">${heli ? heli.grid : '—'}</div></div>
    <div class="card event-card chinook ${chinook ? 'active' : ''}">${icons.heli}<h4>CH-47</h4><div class="grid">${chinook ? chinook.grid : '—'}</div></div>
    <div class="card event-card crate ${crates.length ? 'active' : ''}">${icons.box}<h4>Crates</h4><div class="grid">${crates.length || 0}</div></div>
  `;
  
  const hist = document.getElementById('eventsHistory');
  if (hist) {
    hist.innerHTML = history.slice(0, 10).map(e => `
      <div class="event-item ${e.type}">
        <div class="event-icon ${e.type}">${getIconSvg(e.type)}</div>
        <div class="event-info">
          <div class="event-title">${e.title}</div>
          <div class="event-time">${e.grid ? e.grid + ' • ' : ''}${timeAgo(e.time)}</div>
        </div>
      </div>
    `).join('') || '<div style="padding:16px;color:var(--text3)">Нет событий</div>';
  }
}

// Map zoom & drag
function initMap() {
  // Маркеры игроков отключены - координаты неточные
  const markers = document.getElementById('fullMarkers');
  markers.innerHTML = '';
  updateMapTransform();
}

function initMapDrag() {
  const container = document.getElementById('mapContainer');
  if (!container) return;
  
  container.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart = { x: e.clientX - mapPan.x, y: e.clientY - mapPan.y };
  });
  
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    mapPan.x = e.clientX - dragStart.x;
    mapPan.y = e.clientY - dragStart.y;
    updateMapTransform();
  });
  
  document.addEventListener('mouseup', () => isDragging = false);
  
  container.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    mapZoom = Math.max(0.5, Math.min(4, mapZoom + delta));
    document.getElementById('zoomLevel').textContent = Math.round(mapZoom * 100) + '%';
    updateMapTransform();
  });
}

function zoomMap(dir) {
  mapZoom = Math.max(0.5, Math.min(4, mapZoom + dir * 0.25));
  document.getElementById('zoomLevel').textContent = Math.round(mapZoom * 100) + '%';
  updateMapTransform();
}

function resetMapZoom() {
  mapZoom = 1;
  mapPan = { x: 0, y: 0 };
  document.getElementById('zoomLevel').textContent = '100%';
  updateMapTransform();
}

function updateMapTransform() {
  const map = document.getElementById('fullMap');
  if (map) map.style.transform = `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`;
}


// Shops
async function loadShops() {
  try {
    const shops = await fetch('/api/shops').then(r => r.json());
    data.shops = shops;
    renderShops(shops);
  } catch (e) { console.error('Shops:', e); }
}

function renderShops(shops) {
  const el = document.getElementById('shopsGrid');
  el.innerHTML = shops.map(s => `
    <div class="shop-card">
      <div class="shop-header">
        <span class="shop-name">${s.name || 'Vending Machine'}</span>
        <span class="shop-grid selectable">${s.grid}</span>
      </div>
      <div class="shop-items">
        ${s.items.slice(0, 4).map(i => `<div class="shop-item">${i.itemName} — ${i.quantity}x</div>`).join('')}
        ${s.items.length > 4 ? `<div class="shop-item" style="color:var(--text3)">+${s.items.length - 4}</div>` : ''}
      </div>
    </div>
  `).join('') || '<div style="color:var(--text3)">Нет магазинов</div>';
}

function filterShops(query) {
  if (!query) return renderShops(data.shops || []);
  const q = query.toLowerCase();
  const filtered = (data.shops || []).filter(s => 
    s.name?.toLowerCase().includes(q) || s.items.some(i => i.itemName.toLowerCase().includes(q))
  );
  renderShops(filtered);
}

// Raid
async function loadRaid() {
  if (raidData) return renderRaidCategories();
  try {
    raidData = await fetch('/api/raid').then(r => r.json());
    renderRaidCategories();
  } catch (e) { console.error('Raid:', e); }
}

function renderRaidCategories() {
  const el = document.getElementById('raidCategories');
  el.innerHTML = Object.entries(raidData.categories).map(([key, cat]) => 
    `<div class="raid-cat" onclick="showRaidCategory('${key}')">${cat.name}</div>`
  ).join('');
}

function showRaidCategory(key) {
  const cat = raidData.categories[key];
  document.querySelectorAll('.raid-cat').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  const el = document.getElementById('raidResult');
  el.innerHTML = `<div class="raid-items">${cat.items.map(k => {
    const s = raidData.structures[k];
    return `<div class="raid-item" onclick="showRaidItem('${k}')">${s.name}</div>`;
  }).join('')}</div>`;
}

async function showRaidItem(key, count = 1) {
  try {
    const info = await fetch(`/api/raid/${key}?count=${count}`).then(r => r.json());
    if (info.error) return;
    const el = document.getElementById('raidResult');
    el.innerHTML = `
      <div class="card" style="padding:24px">
        <h3 style="font-family:'Rajdhani',sans-serif;font-size:20px">${info.name}${count > 1 ? ` x${count}` : ''}</h3>
        <div class="raid-hp">${icons.heart} <strong class="selectable">${(info.hp * count).toLocaleString()}</strong> HP</div>
        <div class="raid-methods">
          ${info.methods.map(m => `
            <div class="raid-method">
              <span>${m.name}: <strong class="selectable">${m.amount}</strong></span>
              <span class="raid-sulfur">${m.isFire ? 'Бесплатно' : icons.sulfur + ' ' + m.sulfur.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        ${info.best ? `<div class="raid-best"><span class="raid-best-title">${icons.star} Лучший способ</span> <span class="selectable">${info.best}</span></div>` : ''}
        <div class="raid-count">
          ${[1, 2, 4, 8].map(n => `<button class="${count === n ? 'active' : ''}" onclick="showRaidItem('${key}', ${n})">x${n}</button>`).join('')}
        </div>
      </div>
    `;
  } catch (e) { console.error('Raid item:', e); }
}


// Settings
async function loadSettings() {
  try {
    const settings = await fetch('/api/settings').then(r => r.json());
    
    // Discord/Telegram notifications
    const el = document.getElementById('settingsList');
    const items = [
      { key: 'notifications.deaths', label: 'Смерти' },
      { key: 'notifications.online', label: 'Входы' },
      { key: 'notifications.offline', label: 'Выходы' },
      { key: 'notifications.cargo', label: 'Cargo Ship' },
      { key: 'notifications.heli', label: 'Patrol Heli' },
      { key: 'notifications.crate', label: 'Locked Crates' },
      { key: 'notifications.raidAlert', label: 'Raid Alert' },
    ];
    
    el.innerHTML = items.map(i => {
      const val = getVal(settings, i.key);
      return `<div class="setting-item">
        <div class="setting-label">${i.label}</div>
        <label class="toggle"><input type="checkbox" ${val ? 'checked' : ''} onchange="setSetting('${i.key}', this.checked)"><span class="toggle-slider"></span></label>
      </div>`;
    }).join('');
    
    el.innerHTML += `<div class="setting-item" style="margin-top:16px;padding-top:16px;border-top:2px solid var(--border)">
      <div class="setting-label"><strong>Все уведомления</strong></div>
      <label class="toggle"><input type="checkbox" ${!settings.muted ? 'checked' : ''} onchange="setSetting('mute', !this.checked)"><span class="toggle-slider"></span></label>
    </div>`;
    
    // Team chat notifications
    const chatEl = document.getElementById('chatSettingsList');
    const chatItems = [
      { key: 'teamChat.enabled', label: 'Включить уведомления в чат' },
      { key: 'teamChat.deaths', label: 'Смерти' },
      { key: 'teamChat.online', label: 'Входы/Выходы' },
      { key: 'teamChat.events', label: 'События (Cargo, Heli и т.д.)' },
    ];
    
    chatEl.innerHTML = chatItems.map(i => {
      const val = getVal(settings, i.key);
      const isMain = i.key === 'teamChat.enabled';
      return `<div class="setting-item ${isMain ? 'main-setting' : ''}">
        <div class="setting-label">${isMain ? '<strong>' + i.label + '</strong>' : i.label}</div>
        <label class="toggle"><input type="checkbox" ${val ? 'checked' : ''} onchange="setSetting('${i.key}', this.checked)"><span class="toggle-slider"></span></label>
      </div>`;
    }).join('');
    
    // Rust chat settings (local)
    const rustChatEl = document.getElementById('rustChatSettingsList');
    rustChatEl.innerHTML = `<div class="setting-item main-setting">
      <div class="setting-label"><strong>Показывать чат Rust</strong></div>
      <label class="toggle"><input type="checkbox" ${rustChatEnabled ? 'checked' : ''} onchange="toggleRustChat(this.checked)"><span class="toggle-slider"></span></label>
    </div>`;
    
    // Devices
    loadDevices();
  } catch (e) { console.error('Settings:', e); }
}

function toggleRustChat(enabled) {
  rustChatEnabled = enabled;
  localStorage.setItem('rustChatEnabled', enabled);
  if (!enabled) {
    chatHistory.length = 0;
    updateChatMessages();
  }
  toast(enabled ? 'Чат включён' : 'Чат выключен', 'success');
}

async function loadDevices() {
  try {
    const devices = await fetch('/api/devices').then(r => r.json());
    const el = document.getElementById('devicesList');
    if (!devices.length) {
      el.innerHTML = '<div style="padding:16px;color:var(--text3)">Нет устройств</div>';
      return;
    }
    el.innerHTML = devices.map(d => `
      <div class="device-item">
        <div class="device-item-info">
          <div>
            <div class="device-item-name">${d.name}</div>
            <div class="device-item-id">ID: ${d.id}</div>
          </div>
        </div>
        <div class="device-item-actions">
          <button class="btn-icon small ${d.status ? 'btn-success' : ''}" onclick="toggleDevice('${d.id}')">
            ${d.status ? icons.check : icons.x}
          </button>
          <button class="btn-icon small btn-danger" onclick="removeDevice('${d.id}')">
            ${icons.x}
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error('Devices:', e); }
}

async function toggleDevice(id) {
  try {
    const devices = await fetch('/api/devices').then(r => r.json());
    const device = devices.find(d => d.id === id);
    const action = device?.status ? 'off' : 'on';
    await fetch(`/api/device/${id}/${action}`, { method: 'POST' });
    loadDevices();
    toast('Устройство переключено', 'success');
  } catch (e) { toast('Ошибка', 'error'); }
}

async function removeDevice(id) {
  try {
    await fetch(`/api/device/${id}`, { method: 'DELETE' });
    loadDevices();
    toast('Устройство удалено', 'success');
  } catch (e) { toast('Ошибка', 'error'); }
}

function showAddDeviceModal() {
  document.getElementById('addDeviceModal').style.display = 'flex';
}

function hideAddDeviceModal() {
  document.getElementById('addDeviceModal').style.display = 'none';
  document.getElementById('deviceIdInput').value = '';
  document.getElementById('deviceNameInput').value = '';
}

async function addDevice() {
  const id = document.getElementById('deviceIdInput').value.trim();
  const name = document.getElementById('deviceNameInput').value.trim();
  const type = document.getElementById('deviceTypeInput').value;
  
  if (!id || !name) {
    toast('Заполните все поля', 'error');
    return;
  }
  
  try {
    await fetch('/api/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, type })
    });
    hideAddDeviceModal();
    loadDevices();
    toast('Устройство добавлено', 'success');
  } catch (e) { toast('Ошибка', 'error'); }
}

async function setSetting(key, value) {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    toast('Сохранено', 'success');
  } catch (e) { toast('Ошибка', 'error'); }
}

// Chat
function addChatMessage(msg) {
  chatHistory.unshift(msg);
  if (chatHistory.length > 50) chatHistory.pop();
  updateChatMessages();
}

function updateChatMessages() {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  el.innerHTML = chatHistory.slice(0, 15).map(m => `
    <div class="chat-msg">
      <span class="name selectable">${m.name}</span>: <span class="selectable">${m.message}</span>
      <span class="time">${m.time || ''}</span>
    </div>
  `).join('') || '<div style="padding:16px;color:var(--text3)">Нет сообщений</div>';
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }).then(r => r.json());
    toast(r.success ? 'Отправлено' : 'Ошибка', r.success ? 'success' : 'error');
    if (r.success) input.value = '';
  } catch (e) { toast('Ошибка', 'error'); }
}

document.getElementById('chatInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendChat(); });

// Helpers
function addEvent(e) {
  history.unshift({ ...e, time: new Date() });
  if (history.length > 50) history.pop();
  updateEventsList();
  updateActiveEvents();
}

function getIconSvg(type) {
  const map = { death: icons.skull, online: icons.signIn, offline: icons.signOut, cargo: icons.ship, heli: icons.heli, chinook: icons.heli, crate: icons.box, alert: icons.alert };
  return map[type] || icons.info;
}

function timeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'сейчас';
  if (s < 3600) return `${Math.floor(s / 60)}м`;
  if (s < 86400) return `${Math.floor(s / 3600)}ч`;
  return date.toLocaleTimeString();
}

function getVal(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj); }

function toast(msg, type = 'info') {
  const el = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${type === 'success' ? icons.check : type === 'error' ? icons.x : icons.info} ${msg}`;
  el.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ═══════════════════ PLAYER CHECKER ═══════════════════
async function searchPlayer() {
  const input = document.getElementById('checkerSearch');
  let query = input.value.trim();
  if (!query) return toast('Введи ник или SteamID', 'error');
  
  // Извлекаем SteamID из ссылки
  const steamLinkMatch = query.match(/steamcommunity\.com\/(?:profiles|id)\/([^\s\/]+)/i);
  if (steamLinkMatch) query = steamLinkMatch[1];
  
  const resultEl = document.getElementById('checkerResult');
  const graphEl = document.getElementById('playerGraph');
  resultEl.innerHTML = '<div class="card" style="padding:24px;text-align:center"><div class="loading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> Поиск...</div></div>';
  graphEl.innerHTML = '';
  
  // Если это SteamID - сразу проверяем
  if (/^\d{17}$/.test(query)) {
    try {
      const data = await fetch(`/api/player/check/${encodeURIComponent(query)}`).then(r => r.json());
      if (data.error) {
        resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red)">${icons.x} ${data.error}</div>`;
        return;
      }
      renderPlayerResult(data);
    } catch (e) {
      resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red)">${icons.x} Ошибка: ${e.message}</div>`;
    }
    return;
  }
  
  // Поиск по нику - показываем список BM профилей
  try {
    const bmResults = await fetch(`/api/player/search?q=${encodeURIComponent(query)}`).then(r => r.json());
    if (bmResults.length > 0) {
      renderBMSearchResults(bmResults, query);
    } else {
      resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text3)">Игроки не найдены</div>`;
    }
  } catch (e) {
    resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red)">${icons.x} Ошибка: ${e.message}</div>`;
  }
}

function renderBMSearchResults(results, query) {
  const resultEl = document.getElementById('checkerResult');
  const graphEl = document.getElementById('playerGraph');
  graphEl.innerHTML = '';
  
  let html = `
    <div class="card" style="padding:24px">
      <div class="card-header" style="margin-bottom:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--rust)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Найдено ${results.length} игроков по запросу "${query}"</div>
      <p style="color:var(--text3);margin-bottom:16px;font-size:13px">Нажми на игрока для подробностей</p>
      <div class="bm-results-list">
        ${results.map((p, i) => {
          const lastSeen = p.lastSeen ? new Date(p.lastSeen) : null;
          let ago = '';
          if (lastSeen) {
            const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
            if (mins < 5) ago = '<span style="color:var(--green)">онлайн</span>';
            else if (mins < 60) ago = `${mins}м назад`;
            else if (mins < 1440) ago = `${Math.floor(mins / 60)}ч назад`;
            else ago = `${Math.floor(mins / 1440)}д назад`;
          }
          return `
            <div class="bm-result-item" onclick="selectBMPlayer('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
              <div class="bm-result-name">
                <span class="bm-result-num">${i + 1}.</span>
                <span class="selectable">${p.name}</span>
                ${p.positiveMatch ? '<span class="bm-match">точное</span>' : ''}
              </div>
              <div class="bm-result-info">${ago}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  resultEl.innerHTML = html;
}

async function selectBMPlayer(bmId, playerName) {
  const resultEl = document.getElementById('checkerResult');
  const graphEl = document.getElementById('playerGraph');
  resultEl.innerHTML = '<div class="card" style="padding:24px;text-align:center"><div class="loading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> Загрузка...</div></div>';
  graphEl.innerHTML = '';
  
  try {
    // Получаем BM данные и серверы
    const [bm, servers] = await Promise.all([
      fetch(`/api/player/bm/${bmId}`).then(r => r.json()),
      fetch(`/api/player/bm/${bmId}/servers`).then(r => r.json())
    ]);
    
    if (bm.error) {
      resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red)">${icons.x} ${bm.error}</div>`;
      return;
    }
    
    // Пробуем найти Steam профиль по имени
    let steam = null;
    let friends = [];
    const name = playerName || bm.name;
    if (name) {
      try {
        const steamData = await fetch(`/api/player/check/${encodeURIComponent(name)}`).then(r => r.json());
        if (steamData.steam && !steamData.steam.error) {
          steam = steamData.steam;
          friends = steamData.friends || [];
        }
      } catch (e) {}
    }
    
    renderPlayerResult({ steam, bm, servers, friends });
  } catch (e) {
    resultEl.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red)">${icons.x} Ошибка: ${e.message}</div>`;
  }
}

function renderPlayerResult(data) {
  const resultEl = document.getElementById('checkerResult');
  const { steam, bm, servers, friends } = data;
  
  let html = '<div class="checker-grid">';
  
  // Steam карточка
  if (steam && !steam.error) {
    const trustColor = steam.analysis.trustScore >= 70 ? 'var(--green)' : steam.analysis.trustScore >= 40 ? 'var(--orange)' : 'var(--red)';
    
    html += `
      <div class="card checker-card">
        <div class="checker-header">
          <img src="${steam.avatar}" class="checker-avatar">
          <div>
            <h3 class="selectable">${steam.name}</h3>
            <div class="checker-status">${steam.status}</div>
          </div>
        </div>
        
        <div class="checker-section">
          <div class="checker-row"><span>Профиль</span><span>${steam.visibility}</span></div>
          ${steam.country ? `<div class="checker-row"><span>Страна</span><span>${steam.country}</span></div>` : ''}
          ${steam.created ? `<div class="checker-row"><span>Создан</span><span>${new Date(steam.created).toLocaleDateString()}</span></div>` : ''}
          ${steam.gameInfo ? `<div class="checker-row"><span>Играет</span><span>${steam.gameInfo}</span></div>` : ''}
        </div>
        
        ${steam.rustHours ? `
        <div class="checker-section">
          <h4>Rust</h4>
          ${steam.rustHours.hasRust ? `
            <div class="checker-row"><span>Всего</span><span class="selectable">${steam.rustHours.hours}ч</span></div>
            ${steam.rustHours.hours2weeks ? `<div class="checker-row"><span>За 2 нед</span><span>${steam.rustHours.hours2weeks}ч</span></div>` : ''}
          ` : '<div style="color:var(--text3)">Скрыто или нет игры</div>'}
        </div>
        ` : ''}
        
        ${steam.bans ? `
        <div class="checker-section">
          <h4>Баны</h4>
          <div class="checker-row"><span>VAC</span><span style="color:${steam.bans.vacBanned ? 'var(--red)' : 'var(--green)'}">${steam.bans.vacBanned ? `${steam.bans.vacBans} (${steam.bans.daysSinceLastBan}д)` : 'Чисто'}</span></div>
          <div class="checker-row"><span>Game</span><span style="color:${steam.bans.gameBans > 0 ? 'var(--red)' : 'var(--green)'}">${steam.bans.gameBans > 0 ? steam.bans.gameBans : 'Чисто'}</span></div>
          ${steam.bans.communityBanned ? '<div class="checker-row"><span>Community</span><span style="color:var(--red)">Забанен</span></div>' : ''}
        </div>
        ` : ''}
        
        <div class="checker-section">
          <h4>Анализ</h4>
          <div class="trust-score" style="--score-color:${trustColor}">
            <div class="trust-bar" style="width:${steam.analysis.trustScore}%"></div>
            <span>${steam.analysis.trustLevel} (${steam.analysis.trustScore}/100)</span>
          </div>
          ${steam.analysis.flags.length ? `<div class="checker-flags">${steam.analysis.flags.join('<br>')}</div>` : ''}
        </div>
        
        <div class="checker-links">
          <a href="${steam.profileUrl}" target="_blank" class="btn">Steam</a>
        </div>
      </div>
    `;
  }
  
  // BattleMetrics карточка
  if (bm && !bm.error) {
    html += `
      <div class="card checker-card">
        <div class="checker-header">
          <div class="checker-bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
          <div>
            <h3 class="selectable">${bm.name}</h3>
            <div class="checker-status">${bm.isOnline ? 'Онлайн' : 'Оффлайн'}</div>
          </div>
        </div>
        
        ${bm.isOnline && bm.currentServer ? `
        <div class="checker-section">
          <h4>Сейчас играет</h4>
          <div class="current-server">
            <div class="server-name selectable">${bm.currentServer.name}</div>
            <div class="server-info">${bm.currentServer.players}/${bm.currentServer.maxPlayers} | #${bm.currentServer.rank || '?'}</div>
          </div>
        </div>
        ` : `
        <div class="checker-section">
          <div class="checker-row"><span>Последний раз</span><span>${bm.lastSeen ? formatTimeAgo(new Date(bm.lastSeen)) : 'Неизвестно'}</span></div>
        </div>
        `}
        
        <div class="checker-links">
          <a href="https://www.battlemetrics.com/players/${bm.id}" target="_blank" class="btn">BattleMetrics</a>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  
  // Серверы
  if (servers && servers.length) {
    html += `
      <div class="card" style="margin-top:24px">
        <div class="card-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--rust)"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> История серверов (${servers.length})</div>
        <div class="servers-list">
          ${servers.map(s => `
            <div class="server-item">
              <div class="server-item-name selectable">${s.server?.name || 'Unknown'}</div>
              <div class="server-item-info">
                <span>${formatPlaytime(s.timePlayed || 0)}</span>
                ${s.server?.players ? `<span>${s.server.players}/${s.server.maxPlayers}</span>` : ''}
                ${s.server?.rank ? `<span>#${s.server.rank}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Граф серверов
    renderServerGraph(servers);
  }
  
  // Друзья
  if (friends && friends.length) {
    html += `
      <div class="card" style="margin-top:24px">
        <div class="card-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--green)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Друзья Steam (${friends.length})</div>
        <div class="friends-list">
          ${friends.map(f => `
            <div class="friend-item">
              <img src="${f.avatar}" class="friend-avatar">
              <div class="friend-info">
                <div class="friend-name selectable">${f.name}</div>
                <div class="friend-status">${f.gameInfo ? 'Играет: ' + f.gameInfo : (f.isOnline ? 'Онлайн' : 'Оффлайн')}</div>
              </div>
              <div class="friend-indicator ${f.isOnline ? 'on' : 'off'}"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  resultEl.innerHTML = html;
}

function renderServerGraph(servers) {
  const graphEl = document.getElementById('playerGraph');
  if (!servers.length) return;
  
  // Группируем серверы по времени игры
  const sorted = [...servers].sort((a, b) => (b.timePlayed || 0) - (a.timePlayed || 0)).slice(0, 10);
  const maxTime = sorted[0]?.timePlayed || 1;
  
  let html = `
    <div class="card">
      <div class="card-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--orange)"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> Время на серверах</div>
      <div class="server-graph">
        ${sorted.map(s => {
          const percent = Math.max(5, (s.timePlayed || 0) / maxTime * 100);
          const name = s.server?.name?.substring(0, 30) || 'Unknown';
          return `
            <div class="graph-bar-container">
              <div class="graph-label selectable">${name}</div>
              <div class="graph-bar-wrapper">
                <div class="graph-bar" style="width:${percent}%"></div>
                <span class="graph-value">${formatPlaytime(s.timePlayed || 0)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <div class="card" style="margin-top:24px">
      <div class="card-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--cyan)"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Граф серверов</div>
      <div class="spider-graph-container">
        <canvas id="spiderCanvas" width="400" height="400"></canvas>
      </div>
    </div>
  `;
  
  graphEl.innerHTML = html;
  
  // Рисуем паутину
  setTimeout(() => drawSpiderGraph(sorted), 100);
}

function drawSpiderGraph(servers) {
  const canvas = document.getElementById('spiderCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.min(centerX, centerY) - 40;
  
  // Очищаем
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const count = Math.min(servers.length, 8);
  if (count === 0) return;
  
  const maxTime = servers[0]?.timePlayed || 1;
  const angleStep = (2 * Math.PI) / count;
  
  // Рисуем паутину (фон)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Круги
  for (let r = 0.25; r <= 1; r += 0.25) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * r, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Лучи
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
    ctx.stroke();
  }
  
  // Рисуем данные
  ctx.fillStyle = 'rgba(205, 65, 43, 0.3)';
  ctx.strokeStyle = 'rgba(205, 65, 43, 0.8)';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = (servers[i]?.timePlayed || 0) / maxTime;
    const radius = maxRadius * Math.max(0.1, value);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Точки и подписи
  ctx.fillStyle = '#cd412b';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = (servers[i]?.timePlayed || 0) / maxTime;
    const radius = maxRadius * Math.max(0.1, value);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Точка
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Подпись
    const labelRadius = maxRadius + 20;
    const labelX = centerX + Math.cos(angle) * labelRadius;
    const labelY = centerY + Math.sin(angle) * labelRadius;
    
    ctx.fillStyle = '#aaa';
    const name = servers[i]?.server?.name?.substring(0, 15) || 'Unknown';
    ctx.fillText(name, labelX, labelY + 4);
    ctx.fillStyle = '#cd412b';
  }
}

function formatPlaytime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

function formatTimeAgo(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}м назад`;
  if (mins < 1440) return `${Math.floor(mins / 60)}ч назад`;
  return `${Math.floor(mins / 1440)}д назад`;
}

document.getElementById('checkerSearch')?.addEventListener('keypress', e => { if (e.key === 'Enter') searchPlayer(); });

init();