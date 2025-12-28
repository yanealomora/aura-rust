/**
 * AURA RUST - Web Test App
 */

const socket = io();
let user = null;
let data = { server: null, team: null, events: [] };
const history = [];
const chatHistory = [];

// Icons
const icons = {
  skull: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v-4a8 8 0 1 1 8 0v4"/></svg>',
  signIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  signOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/></svg>',
  heli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
};

// Init
async function init() {
  // Check auth
  const res = await fetch('/auth/user');
  user = await res.json();
  
  if (!user) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    return;
  }
  
  if (!user.hasAccess) {
    document.getElementById('loginScreen').innerHTML = `
      <div class="login-bg"></div>
      <div class="login-card">
        <h2 style="color:var(--red);margin-bottom:16px">Access Denied</h2>
        <p style="color:var(--text2);margin-bottom:24px">У вас нет доступа к этому приложению</p>
        <a href="/auth/logout" class="steam-btn" style="background:var(--red)">Выйти</a>
      </div>
    `;
    return;
  }
  
  // Show app
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  
  // Set user info
  document.getElementById('userAvatar').src = user.avatar;
  document.getElementById('userName').textContent = user.name;
  
  // Setup navigation
  setupNav();
  
  // Load data
  await refresh();
  await loadHistory();
  setInterval(refresh, 10000);
  
  // Socket events
  socket.on('event', e => { addEvent(e); });
  socket.on('chat', msg => { addChatMessage(msg); });
  socket.on('update', d => { data = { ...data, ...d }; updateDashboard(); });
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(`page-${link.dataset.page}`).classList.add('active');
      
      if (link.dataset.page === 'raid') loadRaid();
    });
  });
  
  document.getElementById('searchInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') search();
  });
  
  document.getElementById('chatInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendChat();
  });
}

async function refresh() {
  try {
    const [status, team, events] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/team').then(r => r.json()),
      fetch('/api/events').then(r => r.json())
    ]);
    data = { server: status.server, team, events: events.markers, time: status.time };
    updateDashboard();
  } catch (e) { console.error('Refresh:', e); }
}

async function loadHistory() {
  try {
    const events = await fetch('/api/history').then(r => r.json());
    events.forEach(e => history.push({ ...e, time: new Date(e.time) }));
    updateEvents();
  } catch (e) {}
}


// Dashboard
function updateDashboard() {
  const s = data.server;
  if (s) {
    document.getElementById('serverName').textContent = s.name || 'Loading...';
    document.getElementById('serverPlayers').textContent = `${s.players || 0}/${s.maxPlayers || 0}`;
    
    if (data.time) {
      const h = Math.floor(data.time.time), m = Math.floor((data.time.time - h) * 60);
      document.getElementById('serverTime').textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    if (s.wipeTime) {
      const d = Math.floor((Date.now() - s.wipeTime * 1000) / 86400000);
      document.getElementById('serverWipe').textContent = `Wipe: ${d}d`;
    }
  }
  
  const team = data.team?.members || [];
  const events = data.events || [];
  
  document.getElementById('statOnline').textContent = team.filter(m => m.isOnline).length;
  document.getElementById('statTeam').textContent = team.length;
  document.getElementById('statEvents').textContent = events.filter(e => [4, 5, 6, 8].includes(e.type)).length;
  document.getElementById('statShops').textContent = events.filter(e => e.type === 3).length;
  
  updateTeam();
}

function updateTeam() {
  const el = document.getElementById('teamGrid');
  const team = data.team?.members || [];
  
  el.innerHTML = team.map(m => `
    <div class="team-card">
      <div class="team-avatar ${m.isOnline ? 'online' : ''}">${icons.user}</div>
      <div>
        <div class="team-name">${m.name}</div>
        <div class="team-status">${m.isOnline ? m.grid || 'Online' : 'Offline'}</div>
      </div>
    </div>
  `).join('');
}

function updateEvents() {
  const el = document.getElementById('eventsList');
  el.innerHTML = history.slice(0, 15).map(e => `
    <div class="event-item ${e.type}">
      <div class="event-icon">${getIcon(e.type)}</div>
      <div class="event-info">
        <div class="event-title">${e.title}</div>
        <div class="event-time">${e.grid ? e.grid + ' • ' : ''}${timeAgo(e.time)}</div>
      </div>
    </div>
  `).join('') || '<div class="loading">No events</div>';
}

function addEvent(e) {
  history.unshift({ ...e, time: new Date() });
  if (history.length > 50) history.pop();
  updateEvents();
  toast(e.title, e.type === 'alert' ? 'error' : 'info');
}

function addChatMessage(msg) {
  chatHistory.unshift(msg);
  if (chatHistory.length > 50) chatHistory.pop();
  updateChat();
}

function updateChat() {
  const el = document.getElementById('chatMessages');
  el.innerHTML = chatHistory.slice(0, 20).map(m => `
    <div class="chat-msg">
      <span class="name">${m.name}</span>: ${m.message}
      <span class="time">${m.time}</span>
    </div>
  `).join('') || '<div class="loading">No messages</div>';
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
    
    if (r.success) input.value = '';
    toast(r.success ? 'Sent' : 'Error', r.success ? 'success' : 'error');
  } catch (e) { toast('Error', 'error'); }
}

// ═══════════════════ PLAYER CHECKER ═══════════════════
async function search() {
  let query = document.getElementById('searchInput').value.trim();
  if (!query) return toast('Enter nickname or SteamID', 'error');
  
  // Extract SteamID from link
  const linkMatch = query.match(/steamcommunity\.com\/(?:profiles|id)\/([^\s\/]+)/i);
  if (linkMatch) query = linkMatch[1];
  
  const resultsEl = document.getElementById('searchResults');
  const infoEl = document.getElementById('playerInfo');
  const graphEl = document.getElementById('graphContainer');
  
  resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';
  infoEl.innerHTML = '';
  graphEl.innerHTML = '';
  
  try {
    const data = await fetch(`/api/player/check/${encodeURIComponent(query)}`).then(r => r.json());
    
    if (data.error) {
      resultsEl.innerHTML = `<div class="loading" style="color:var(--red)">${data.error}</div>`;
      return;
    }
    
    // Если есть список BM профилей - показываем их
    if (data.bmProfiles && data.bmProfiles.length > 0 && !data.steam) {
      renderBMResults(data.bmProfiles, query);
      return;
    }
    
    // Если есть Steam данные - показываем полную инфу
    resultsEl.innerHTML = '';
    renderPlayerInfo(data);
    
  } catch (e) {
    resultsEl.innerHTML = `<div class="loading" style="color:var(--red)">Error: ${e.message}</div>`;
  }
}

function renderBMResults(results, query) {
  const el = document.getElementById('searchResults');
  
  el.innerHTML = `
    <div style="margin-bottom:16px;color:var(--text2)">Found ${results.length} players for "${query}"</div>
    <div class="results-list">
      ${results.map((p, i) => {
        const ago = p.lastSeen ? formatTimeAgo(new Date(p.lastSeen)) : '';
        return `
          <div class="result-item" onclick="selectBMPlayer('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
            <div class="result-item-left">
              <div class="result-num">${i + 1}</div>
              <div class="result-name">${p.name}</div>
              ${p.positiveMatch ? '<span class="result-match">exact</span>' : ''}
            </div>
            <div class="result-time">${ago}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function selectBMPlayer(bmId, name) {
  const resultsEl = document.getElementById('searchResults');
  const infoEl = document.getElementById('playerInfo');
  const graphEl = document.getElementById('graphContainer');
  
  resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div>Loading player...</div>';
  infoEl.innerHTML = '';
  graphEl.innerHTML = '';
  
  try {
    const [bm, servers] = await Promise.all([
      fetch(`/api/player/bm/${bmId}`).then(r => r.json()),
      fetch(`/api/player/bm/${bmId}/servers`).then(r => r.json())
    ]);
    
    // Try to find Steam profile
    let steam = null, friends = [];
    try {
      const steamData = await fetch(`/api/player/steam/${encodeURIComponent(name)}`).then(r => r.json());
      if (!steamData.error) {
        steam = steamData;
        friends = steamData.friends || [];
      }
    } catch (e) {}
    
    resultsEl.innerHTML = '';
    renderPlayerInfo({ steam, bm, servers, friends, bmProfiles: [] });
    
  } catch (e) {
    resultsEl.innerHTML = `<div class="loading" style="color:var(--red)">Error: ${e.message}</div>`;
  }
}


function renderPlayerInfo(data) {
  const { steam, bm, servers, friends, bmProfiles } = data;
  const infoEl = document.getElementById('playerInfo');
  const graphEl = document.getElementById('graphContainer');
  
  let html = '<div class="player-grid">';
  
  // Steam Card
  if (steam && !steam.error) {
    const score = steam.analysis?.trustScore || 50;
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    
    html += `
      <div class="player-card">
        <div class="player-header">
          <img src="${steam.avatar}" class="player-avatar">
          <div>
            <div class="player-name">${steam.name}</div>
            <div class="player-status">${steam.status}</div>
          </div>
        </div>
        
        <div class="player-section">
          <div class="player-row"><span>Profile</span><span>${steam.visibility}</span></div>
          ${steam.country ? `<div class="player-row"><span>Country</span><span>${steam.country}</span></div>` : ''}
          ${steam.created ? `<div class="player-row"><span>Created</span><span>${new Date(steam.created).toLocaleDateString()}</span></div>` : ''}
          ${steam.gameInfo ? `<div class="player-row"><span>Playing</span><span>${steam.gameInfo}</span></div>` : ''}
        </div>
        
        ${steam.rustHours ? `
        <div class="player-section">
          <h4>Rust Hours</h4>
          ${steam.rustHours.hasRust ? `
            <div class="player-row"><span>Total</span><span>${steam.rustHours.hours}h</span></div>
            ${steam.rustHours.hours2weeks ? `<div class="player-row"><span>2 weeks</span><span>${steam.rustHours.hours2weeks}h</span></div>` : ''}
          ` : '<div style="color:var(--text3)">Hidden or no game</div>'}
        </div>
        ` : ''}
        
        ${steam.bans ? `
        <div class="player-section">
          <h4>Bans</h4>
          <div class="player-row"><span>VAC</span><span style="color:${steam.bans.vacBanned ? 'var(--red)' : 'var(--green)'}">${steam.bans.vacBanned ? `${steam.bans.vacBans} (${steam.bans.daysSinceLastBan}d)` : 'Clean'}</span></div>
          <div class="player-row"><span>Game</span><span style="color:${steam.bans.gameBans > 0 ? 'var(--red)' : 'var(--green)'}">${steam.bans.gameBans > 0 ? steam.bans.gameBans : 'Clean'}</span></div>
        </div>
        ` : ''}
        
        <div class="player-section">
          <h4>Trust Score</h4>
          <div class="trust-bar">
            <div class="trust-fill ${level}" style="width:${score}%"></div>
            <div class="trust-text">${steam.analysis?.trustLevel || 'Unknown'} (${score}/100)</div>
          </div>
          ${steam.analysis?.flags?.length ? `<div class="player-flags">${steam.analysis.flags.join('<br>')}</div>` : ''}
        </div>
        
        <div class="player-links">
          <a href="${steam.profileUrl}" target="_blank">Steam Profile</a>
        </div>
      </div>
    `;
  }
  
  // BattleMetrics Card
  if (bm && !bm.error) {
    html += `
      <div class="player-card">
        <div class="player-header">
          <div class="player-avatar-icon">${icons.globe}</div>
          <div>
            <div class="player-name">${bm.name}</div>
            <div class="player-status">${bm.isOnline ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        
        ${bm.isOnline && bm.currentServer ? `
        <div class="player-section">
          <h4>Currently Playing</h4>
          <div style="padding:12px;background:var(--bg3);border-radius:10px;border-left:3px solid var(--green)">
            <div style="font-weight:600;margin-bottom:4px">${bm.currentServer.name}</div>
            <div style="font-size:13px;color:var(--text3)">${bm.currentServer.players}/${bm.currentServer.maxPlayers}</div>
          </div>
        </div>
        ` : `
        <div class="player-section">
          <div class="player-row"><span>Last seen</span><span>${bm.lastSeen ? formatTimeAgo(new Date(bm.lastSeen)) : 'Unknown'}</span></div>
        </div>
        `}
        
        <div class="player-links">
          <a href="https://www.battlemetrics.com/players/${bm.id}" target="_blank">BattleMetrics</a>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  
  // BM Profiles list (all profiles with same name)
  if (bmProfiles && bmProfiles.length > 1) {
    html += `
      <div class="bm-profiles card" style="margin-top:24px">
        <div class="card-header">${icons.globe} All BattleMetrics Profiles (${bmProfiles.length})</div>
        <div style="padding:16px">
          ${bmProfiles.map(p => `
            <div class="bm-profile-item" onclick="selectBMPlayer('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
              <div class="bm-profile-name">${p.name}</div>
              <div class="bm-profile-time">${p.lastSeen ? formatTimeAgo(new Date(p.lastSeen)) : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Servers
  if (servers && servers.length) {
    html += `
      <div class="servers-section card" style="margin-top:24px">
        <div class="card-header">${icons.server} Server History (${servers.length})</div>
        <div class="servers-list">
          ${servers.map(s => `
            <div class="server-item">
              <div class="server-name">${s.server?.name || 'Unknown'}</div>
              <div class="server-stats">
                <span>${formatPlaytime(s.timePlayed || 0)}</span>
                ${s.server?.players ? `<span>${s.server.players}/${s.server.maxPlayers}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Friends
  if (friends && friends.length) {
    html += `
      <div class="friends-section card" style="margin-top:24px">
        <div class="card-header">${icons.users} Steam Friends (${friends.length})</div>
        <div class="friends-grid">
          ${friends.map(f => `
            <div class="friend-item">
              <img src="${f.avatar}" class="friend-avatar">
              <div class="friend-info">
                <div class="friend-name">${f.name}</div>
                <div class="friend-status">${f.gameInfo || (f.isOnline ? 'Online' : 'Offline')}</div>
              </div>
              <div class="friend-dot ${f.isOnline ? 'online' : 'offline'}"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  infoEl.innerHTML = html;
  
  // Draw spider graph
  if (servers && servers.length) {
    drawSpiderGraph(servers);
  }
}

function drawSpiderGraph(servers) {
  const graphEl = document.getElementById('graphContainer');
  const sorted = [...servers].sort((a, b) => (b.timePlayed || 0) - (a.timePlayed || 0)).slice(0, 8);
  
  if (sorted.length < 3) return;
  
  graphEl.innerHTML = `
    <div class="graph-section">
      <div class="graph-card">
        <div class="graph-header">${icons.target} Server Activity Graph</div>
        <div class="spider-container">
          <canvas id="spiderCanvas" width="400" height="400"></canvas>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const canvas = document.getElementById('spiderCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = Math.min(cx, cy) - 50;
    const count = sorted.length;
    const maxTime = sorted[0]?.timePlayed || 1;
    const step = (2 * Math.PI) / count;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let r = 0.25; r <= 1; r += 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * r, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    for (let i = 0; i < count; i++) {
      const angle = i * step - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
    }
    
    // Data
    ctx.fillStyle = 'rgba(205, 65, 43, 0.3)';
    ctx.strokeStyle = 'rgba(205, 65, 43, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = i * step - Math.PI / 2;
      const val = (sorted[i]?.timePlayed || 0) / maxTime;
      const r = maxR * Math.max(0.1, val);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Points & Labels
    ctx.fillStyle = '#cd412b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < count; i++) {
      const angle = i * step - Math.PI / 2;
      const val = (sorted[i]?.timePlayed || 0) / maxTime;
      const r = maxR * Math.max(0.1, val);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      const lx = cx + Math.cos(angle) * (maxR + 25);
      const ly = cy + Math.sin(angle) * (maxR + 25);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillText(sorted[i]?.server?.name?.substring(0, 12) || '?', lx, ly + 4);
      ctx.fillStyle = '#cd412b';
    }
  }, 100);
}


// ═══════════════════ RAID CALCULATOR ═══════════════════
let raidData = null;

async function loadRaid() {
  if (raidData) return renderRaidCategories();
  try {
    raidData = await fetch('/api/raid').then(r => r.json());
    renderRaidCategories();
  } catch (e) {}
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
      <div class="raid-result">
        <h3>${info.name}${count > 1 ? ` x${count}` : ''}</h3>
        <div class="raid-hp">${icons.heart} <strong>${(info.hp * count).toLocaleString()}</strong> HP</div>
        <div class="raid-methods">
          ${info.methods.map(m => `
            <div class="raid-method">
              <span>${m.name}: <strong>${m.amount}</strong></span>
              <span class="raid-sulfur">${m.isFire ? 'Free' : m.sulfur.toLocaleString() + ' sulfur'}</span>
            </div>
          `).join('')}
        </div>
        ${info.best ? `<div class="raid-best"><div class="raid-best-title">Best Method</div>${info.best}</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:20px">
          ${[1, 2, 4, 8].map(n => `<button class="raid-cat ${count === n ? 'active' : ''}" onclick="showRaidItem('${key}', ${n})">x${n}</button>`).join('')}
        </div>
      </div>
    `;
  } catch (e) {}
}

// ═══════════════════ HELPERS ═══════════════════
function getIcon(type) {
  const map = { death: icons.skull, online: icons.signIn, offline: icons.signOut, cargo: icons.ship, heli: icons.heli, chinook: icons.heli, crate: icons.box, alert: icons.alert };
  return map[type] || icons.alert;
}

function timeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function formatTimeAgo(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 5) return 'online';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function formatPlaytime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  el.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Start
init();
