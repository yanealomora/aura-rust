import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import rustPlus from '../services/RustPlusService.js';
import settings from '../core/Settings.js';
import eventBus, { EVENTS } from '../core/EventEmitter.js';
import { coordsToGrid } from '../core/GridHelper.js';
import steamService from '../services/SteamService.js';
import battleMetricsService from '../services/BattleMetricsService.js';
import deviceManager, { DEVICE_TYPES } from '../services/DeviceManager.js';
import { STRUCTURES, CATEGORIES, getDestroyInfo } from '../data/RaidData.js';
import { getItemName } from '../data/ItemDatabase.js';
import { getCraftInfo, getRecycleInfo, getResearchInfo, getDecayInfo, getUpkeepInfo, getCCTVCodes, getDespawnInfo, formatIngredients, formatOutput } from '../data/RustLabsData.js';
import accessControl from '../core/AccessControl.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const ADMIN_ID = process.env.DISCORD_ADMIN_ID;
const PREFIX = '!';

// Цвета
const C = {
  rust: 0xCD412B, green: 0x43B581, red: 0xF04747, orange: 0xFAA61A,
  blue: 0x5865F2, dark: 0x2F3136, cargo: 0x3498DB, heli: 0xE74C3C
};

function isAdmin(id) { return id === ADMIN_ID; }
function hasAccess(id) { return accessControl.hasAccess(id) || isAdmin(id); }

// ═══════════════════ МЕНЮ ═══════════════════
function mainMenu() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cmd_team').setLabel('👥 Команда').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cmd_status').setLabel('📊 Сервер').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cmd_events').setLabel('🎯 События').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cmd_time').setLabel('🕐 Время').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_shops').setLabel('🏪 Магазины').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_devices').setLabel('💡 Устройства').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_raid').setLabel('💣 Рейд').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('menu_cameras').setLabel('📷 Камеры').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cmd_map').setLabel('🗺️ Карта').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cmd_settings').setLabel('⚙️ Настройки').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function backBtn(id = 'menu_main') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('refresh_' + id.replace('menu_', 'cmd_')).setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(id).setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
}


// ═══════════════════ СТАРТ ═══════════════════
async function sendStart(target, isUpdate = false) {
  const info = rustPlus.getCachedServerInfo();
  const ok = rustPlus.isConnected();
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 RUST EVENT BOT')
    .setColor(ok ? C.green : C.red)
    .setDescription(`**Rust+:** ${ok ? '✅ Подключён' : '❌ Отключён'}`)
    .setTimestamp();
  
  if (info) {
    embed.addFields(
      { name: '🖥️ Сервер', value: info.name, inline: false },
      { name: '👥 Онлайн', value: `${info.players}/${info.maxPlayers}${info.queuedPlayers > 0 ? ` (+${info.queuedPlayers})` : ''}`, inline: true }
    );
    if (info.wipeTime) {
      const d = Math.floor((Date.now() - info.wipeTime * 1000) / 86400000);
      embed.addFields({ name: '⏰ Вайп', value: `${d}д назад`, inline: true });
    }
  }
  
  if (isUpdate) await target.update({ embeds: [embed], components: mainMenu(), files: [] });
  else await target.send({ embeds: [embed], components: mainMenu() });
}

// ═══════════════════ КОМАНДА ═══════════════════
async function sendTeam(ch, upd = null) {
  const team = await rustPlus.getTeamInfo();
  if (!team?.members?.length) {
    const e = new EmbedBuilder().setTitle('👥 Команда').setDescription('❌ Нет данных').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  const mapSize = rustPlus.getMapSize();
  const on = team.members.filter(m => m.isOnline);
  const off = team.members.filter(m => !m.isOnline);
  const leader = team.leaderSteamId?.toString();
  
  const embed = new EmbedBuilder().setTitle(`👥 Команда (${team.members.length})`).setColor(C.green).setTimestamp();
  
  if (on.length) {
    let t = '';
    on.forEach(m => {
      const grid = coordsToGrid(m.x, m.y, mapSize);
      const cr = m.steamId?.toString() === leader ? ' 👑' : '';
      const dead = m.isAlive ? '' : ' 💀';
      t += `🟢 **${m.name}**${cr}${dead} — \`${grid}\`\n`;
    });
    embed.addFields({ name: `Онлайн (${on.length})`, value: t, inline: false });
  }
  
  if (off.length) {
    let t = '';
    off.slice(0, 6).forEach(m => {
      const cr = m.steamId?.toString() === leader ? ' 👑' : '';
      t += `🔴 ${m.name}${cr}\n`;
    });
    if (off.length > 6) t += `*...ещё ${off.length - 6}*`;
    embed.addFields({ name: `Оффлайн (${off.length})`, value: t, inline: false });
  }
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_team').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row], files: [] }) : await ch.send({ embeds: [embed], components: [row] });
}

// ═══════════════════ СЕРВЕР ═══════════════════
async function sendStatus(ch, upd = null) {
  const info = rustPlus.getCachedServerInfo() || await rustPlus.getServerInfo();
  if (!info) {
    const e = new EmbedBuilder().setTitle('📊 Сервер').setDescription('❌ Нет данных').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  const pop = Math.round(info.players / info.maxPlayers * 100);
  const bar = '▓'.repeat(Math.floor(pop / 5)) + '░'.repeat(20 - Math.floor(pop / 5));
  
  const embed = new EmbedBuilder()
    .setTitle('📊 Сервер')
    .setDescription(`**${info.name}**`)
    .setColor(C.blue)
    .addFields(
      { name: '👥 Онлайн', value: `\`${bar}\`\n**${info.players}**/${info.maxPlayers} (${pop}%)${info.queuedPlayers > 0 ? `\n⏳ Очередь: ${info.queuedPlayers}` : ''}`, inline: false },
      { name: '🗺️ Карта', value: `${info.mapSize}m`, inline: true },
      { name: '🌱 Сид', value: `${info.seed || '?'}`, inline: true }
    )
    .setTimestamp();
  
  if (info.wipeTime) {
    const d = Math.floor((Date.now() - info.wipeTime * 1000) / 86400000);
    const h = Math.floor(((Date.now() - info.wipeTime * 1000) % 86400000) / 3600000);
    embed.addFields({ name: '⏰ Вайп', value: `${d}д ${h}ч назад`, inline: true });
  }
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_status').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row], files: [] }) : await ch.send({ embeds: [embed], components: [row] });
}

// ═══════════════════ СОБЫТИЯ ═══════════════════
async function sendEvents(ch, upd = null) {
  const markers = await rustPlus.getMapMarkers();
  if (!markers?.markers) {
    const e = new EmbedBuilder().setTitle('🎯 События').setDescription('❌ Нет данных').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  const mapSize = rustPlus.getMapSize();
  const cargo = markers.markers.filter(m => m.type === 5);
  const heli = markers.markers.filter(m => m.type === 8);
  const ch47 = markers.markers.filter(m => m.type === 4);
  const crates = markers.markers.filter(m => m.type === 6);
  
  const embed = new EmbedBuilder()
    .setTitle('🎯 События')
    .setColor(C.orange)
    .addFields(
      { name: '🚢 Cargo', value: cargo.length ? `\`${coordsToGrid(cargo[0].x, cargo[0].y, mapSize)}\`` : '—', inline: true },
      { name: '🚁 Heli', value: heli.length ? `\`${coordsToGrid(heli[0].x, heli[0].y, mapSize)}\`` : '—', inline: true },
      { name: '🛩️ CH-47', value: ch47.length ? `\`${coordsToGrid(ch47[0].x, ch47[0].y, mapSize)}\`` : '—', inline: true },
      { name: `📦 Crates (${crates.length})`, value: crates.length ? crates.slice(0, 3).map(c => `\`${coordsToGrid(c.x, c.y, mapSize)}\``).join(' ') : '—', inline: false }
    )
    .setTimestamp();
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_events').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row], files: [] }) : await ch.send({ embeds: [embed], components: [row] });
}

// ═══════════════════ ВРЕМЯ ═══════════════════
async function sendTime(ch, upd = null) {
  const time = await rustPlus.getTime();
  if (!time) {
    const e = new EmbedBuilder().setTitle('🕐 Время').setDescription('❌ Нет данных').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  const t = time.time || 0;
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const isDay = t >= (time.sunrise || 7) && t < (time.sunset || 20);
  
  const embed = new EmbedBuilder()
    .setTitle(`${isDay ? '☀️' : '🌙'} Время — ${str}`)
    .setColor(isDay ? 0xFFD700 : 0x191970)
    .addFields(
      { name: '☀️ Рассвет', value: `${time.sunrise || 7}:00`, inline: true },
      { name: '🌙 Закат', value: `${time.sunset || 20}:00`, inline: true }
    )
    .setTimestamp();
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_time').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row], files: [] }) : await ch.send({ embeds: [embed], components: [row] });
}


// ═══════════════════ КАРТА С СЕТКОЙ ═══════════════════
async function sendMap(ch, upd = null) {
  const map = await rustPlus.getMap();
  const info = rustPlus.getCachedServerInfo();
  
  if (!map?.jpgImage) {
    const e = new EmbedBuilder().setTitle('🗺️ Карта').setDescription('❌ Недоступна').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  // Добавляем сетку на карту
  const mapWithGrid = await addGridToMap(Buffer.from(map.jpgImage), info?.mapSize || 4000);
  
  const embed = new EmbedBuilder()
    .setTitle('🗺️ Карта сервера')
    .setColor(C.rust)
    .setImage('attachment://map.png')
    .addFields(
      { name: '📐 Размер', value: `${info?.mapSize || '?'}m`, inline: true },
      { name: '🌱 Сид', value: `${info?.seed || '?'}`, inline: true }
    )
    .setTimestamp();
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_map').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  const attachment = new AttachmentBuilder(mapWithGrid, { name: 'map.png' });
  
  upd ? await upd.update({ embeds: [embed], components: [row], files: [attachment] }) : await ch.send({ embeds: [embed], components: [row], files: [attachment] });
}

// Добавление сетки на карту
async function addGridToMap(imageBuffer, mapSize) {
  // Используем canvas для добавления сетки
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const img = await loadImage(imageBuffer);
    
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Рисуем карту
    ctx.drawImage(img, 0, 0);
    
    // Настройки сетки
    const gridSize = mapSize / 150; // ~150м на клетку
    const cellsX = Math.ceil(mapSize / 150);
    const cellsY = Math.ceil(mapSize / 150);
    const cellWidth = img.width / cellsX;
    const cellHeight = img.height / cellsY;
    
    // Рисуем линии сетки
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= cellsX; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, img.height);
      ctx.stroke();
    }
    
    for (let i = 0; i <= cellsY; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(img.width, i * cellHeight);
      ctx.stroke();
    }
    
    // Подписи координат (A-Z по горизонтали, 0-26 по вертикали)
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const visibleCells = Math.min(26, cellsX);
    const step = Math.ceil(cellsX / visibleCells);
    
    for (let i = 0; i < visibleCells; i++) {
      const x = (i * step + step / 2) * cellWidth;
      ctx.fillText(letters[i], x, 16);
      ctx.fillText(letters[i], x, img.height - 4);
    }
    
    for (let i = 0; i < Math.min(26, cellsY); i += step) {
      const y = (i + 0.5) * cellHeight;
      ctx.fillText(String(i), 10, y + 5);
      ctx.fillText(String(i), img.width - 10, y + 5);
    }
    
    return canvas.toBuffer('image/png');
  } catch (e) {
    // Если canvas не установлен, возвращаем оригинал
    console.log('[Discord] Canvas not available, returning original map');
    return imageBuffer;
  }
}

// ═══════════════════ МАГАЗИНЫ ═══════════════════
async function sendShops(ch, upd = null, page = 0) {
  const markers = await rustPlus.getMapMarkers();
  if (!markers?.markers) {
    const e = new EmbedBuilder().setTitle('🏪 Магазины').setDescription('❌ Нет данных').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn()], files: [] }) : ch.send({ embeds: [e], components: [backBtn()] });
  }
  
  const mapSize = rustPlus.getMapSize();
  const shops = markers.markers.filter(m => m.type === 3);
  const perPage = 8;
  const totalPages = Math.ceil(shops.length / perPage) || 1;
  const pageShops = shops.slice(page * perPage, (page + 1) * perPage);
  
  const embed = new EmbedBuilder()
    .setTitle(`🏪 Магазины (${shops.length})`)
    .setColor(0x9C27B0)
    .setFooter({ text: `Стр. ${page + 1}/${totalPages}` })
    .setTimestamp();
  
  if (!shops.length) {
    embed.setDescription('Нет активных магазинов');
  } else {
    let desc = '';
    pageShops.forEach(s => {
      const grid = coordsToGrid(s.x, s.y, mapSize);
      desc += `\`${grid}\` **${(s.name || 'Магазин').substring(0, 25)}**\n`;
      if (s.sellOrders?.length) {
        const item = getItemName(s.sellOrders[0].itemId);
        desc += `└ ${item.substring(0, 20)} *(${s.sellOrders.length})*\n`;
      }
    });
    embed.setDescription(desc);
  }
  
  const rows = [];
  const nav = new ActionRowBuilder();
  if (page > 0) nav.addComponents(new ButtonBuilder().setCustomId(`shops_${page - 1}`).setLabel('◀️').setStyle(ButtonStyle.Primary));
  nav.addComponents(new ButtonBuilder().setCustomId('noop').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true));
  if (page < totalPages - 1) nav.addComponents(new ButtonBuilder().setCustomId(`shops_${page + 1}`).setLabel('▶️').setStyle(ButtonStyle.Primary));
  rows.push(nav);
  
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_shops').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  ));
  
  upd ? await upd.update({ embeds: [embed], components: rows, files: [] }) : await ch.send({ embeds: [embed], components: rows });
}

// ═══════════════════ УСТРОЙСТВА ═══════════════════
async function sendDevices(ch, upd = null) {
  const devices = deviceManager.getAll();
  
  const embed = new EmbedBuilder().setTitle('💡 Устройства').setColor(C.orange).setTimestamp();
  
  if (!devices.length) {
    embed.setDescription('Нет устройств\n\n`!adddevice ID название`');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
    );
    return upd ? upd.update({ embeds: [embed], components: [row], files: [] }) : ch.send({ embeds: [embed], components: [row] });
  }
  
  let desc = '';
  const rows = [];
  
  for (const d of devices) {
    const s = await deviceManager.getStatus(d.id);
    desc += `${s?.value ? '🟢' : '🔴'} **${d.name}**\n`;
    
    if (rows.length < 3) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dev_on_${d.id}`).setLabel(`🟢 ${d.name}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`dev_off_${d.id}`).setLabel('🔴').setStyle(ButtonStyle.Danger)
      ));
    }
  }
  embed.setDescription(desc);
  
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_devices').setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  ));
  
  upd ? await upd.update({ embeds: [embed], components: rows.slice(0, 5), files: [] }) : await ch.send({ embeds: [embed], components: rows.slice(0, 5) });
}

// ═══════════════════ КАМЕРЫ ═══════════════════
async function sendCameras(ch, upd = null) {
  const embed = new EmbedBuilder()
    .setTitle('📷 CCTV Камеры')
    .setDescription('Выберите камеру')
    .setColor(C.dark)
    .setTimestamp();
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cam_OILRIG1').setLabel('Small Oil').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cam_OILRIG2').setLabel('Large Oil').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cam_DOME1').setLabel('Dome').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cam_AIRFIELD1').setLabel('Airfield').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cam_COMPOUND').setLabel('Outpost').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cam_LAUNCHSITE1').setLabel('Launch').setStyle(ButtonStyle.Secondary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row1, row2, row3], files: [] }) : await ch.send({ embeds: [embed], components: [row1, row2, row3] });
}

async function sendCamera(ch, code) {
  const frame = await rustPlus.getCameraFrame(code);
  if (!frame?.jpgImage) return ch.send(`❌ Камера **${code}** недоступна`);
  
  const embed = new EmbedBuilder()
    .setTitle(`📷 ${code}`)
    .setColor(C.dark)
    .setImage('attachment://cam.jpg')
    .setTimestamp();
  
  const attachment = new AttachmentBuilder(Buffer.from(frame.jpgImage), { name: 'cam.jpg' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cam_${code}`).setLabel('🔄').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('menu_cameras').setLabel('◀️ Камеры').setStyle(ButtonStyle.Secondary)
  );
  
  await ch.send({ embeds: [embed], files: [attachment], components: [row] });
}


// ═══════════════════ РЕЙД КАЛЬКУЛЯТОР ═══════════════════
async function sendRaidMenu(ch, upd = null) {
  const embed = new EmbedBuilder()
    .setTitle('💣 Raid Calculator')
    .setDescription('Выберите категорию или `!raid предмет`')
    .setColor(0xE91E63)
    .setTimestamp();
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rcat_doors').setLabel('🚪 Двери').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rcat_walls').setLabel('🧱 Стены').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rcat_windows').setLabel('🪟 Окна').setStyle(ButtonStyle.Danger)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rcat_gates').setLabel('🚧 Ворота').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rcat_deployables').setLabel('📦 Прочее').setStyle(ButtonStyle.Danger)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row1, row2, row3], files: [] }) : await ch.send({ embeds: [embed], components: [row1, row2, row3] });
}

async function sendRaidCategory(ch, catKey, upd = null) {
  const cat = CATEGORIES[catKey];
  if (!cat) return;
  
  const embed = new EmbedBuilder()
    .setTitle(`💣 ${cat.name}`)
    .setColor(0xE91E63)
    .setTimestamp();
  
  // Создаём кнопки для каждого предмета
  const rows = [];
  const items = cat.items;
  
  for (let i = 0; i < items.length; i += 3) {
    const row = new ActionRowBuilder();
    for (let j = i; j < Math.min(i + 3, items.length); j++) {
      const key = items[j];
      const struct = STRUCTURES[key];
      if (struct) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`raid_${key}`)
            .setLabel(struct.name.replace(/[🚪🧱🪟🚧📦🧰🔫🚀🏪]/g, '').trim().substring(0, 20))
            .setStyle(ButtonStyle.Secondary)
        );
      }
    }
    if (row.components.length) rows.push(row);
  }
  
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_raid').setLabel('◀️ Назад').setStyle(ButtonStyle.Secondary)
  ));
  
  upd ? await upd.update({ embeds: [embed], components: rows.slice(0, 5), files: [] }) : await ch.send({ embeds: [embed], components: rows.slice(0, 5) });
}

async function sendRaidInfo(ch, itemKey, count = 1, upd = null) {
  const info = getDestroyInfo(itemKey, count);
  if (!info) {
    const e = new EmbedBuilder().setTitle('💣 Рейд').setDescription('❌ Не найдено').setColor(C.red);
    return upd ? upd.update({ embeds: [e], components: [backBtn('menu_raid')], files: [] }) : ch.send({ embeds: [e], components: [backBtn('menu_raid')] });
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`💣 ${info.name}${count > 1 ? ` x${count}` : ''}`)
    .setColor(0xE91E63)
    .addFields({ name: '❤️ HP', value: `${(info.hp * count).toLocaleString()}`, inline: true })
    .setTimestamp();
  
  let methods = '';
  info.methods.forEach(m => {
    if (m.isFire) {
      methods += `**${m.name}** — бесплатно\n`;
    } else {
      methods += `**${m.name}:** ${m.amount} *(🟡 ${m.sulfur.toLocaleString()})*\n`;
    }
  });
  embed.addFields({ name: '💥 Способы', value: methods || 'Нет данных', inline: false });
  
  if (info.best) {
    embed.addFields({ name: '✨ Лучший способ', value: info.best, inline: false });
  }
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`raidx_${itemKey}_1`).setLabel('x1').setStyle(count === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`raidx_${itemKey}_2`).setLabel('x2').setStyle(count === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`raidx_${itemKey}_4`).setLabel('x4').setStyle(count === 4 ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`raidx_${itemKey}_8`).setLabel('x8').setStyle(count === 8 ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('menu_raid').setLabel('◀️ Назад').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row1, row2], files: [] }) : await ch.send({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════ НАСТРОЙКИ ═══════════════════
async function sendSettings(ch, upd = null) {
  const n = settings.settings.notifications;
  const muted = settings.isMuted();
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Настройки')
    .setColor(C.dark)
    .setDescription(muted ? '🔇 **Уведомления ВЫКЛ**' : '🔊 **Уведомления ВКЛ**')
    .addFields(
      { name: 'Игроки', value: `${n.deaths ? '✅' : '❌'} Смерти\n${n.online ? '✅' : '❌'} Входы\n${n.offline ? '✅' : '❌'} Выходы`, inline: true },
      { name: 'События', value: `${n.cargo ? '✅' : '❌'} Cargo\n${n.heli ? '✅' : '❌'} Heli\n${n.crate ? '✅' : '❌'} Crates`, inline: true },
      { name: 'Другое', value: `${n.shops ? '✅' : '❌'} Магазины\n${n.raidAlert ? '✅' : '❌'} Raid Alert`, inline: true }
    )
    .setTimestamp();
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('set_deaths').setLabel('💀').setStyle(n.deaths ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_online').setLabel('🟢').setStyle(n.online ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_offline').setLabel('🔴').setStyle(n.offline ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_cargo').setLabel('🚢').setStyle(n.cargo ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_heli').setLabel('🚁').setStyle(n.heli ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('set_crate').setLabel('📦').setStyle(n.crate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_shops').setLabel('🏪').setStyle(n.shops ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('set_raidAlert').setLabel('🚨').setStyle(n.raidAlert ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('set_mute').setLabel(muted ? '🔊 Включить' : '🔇 Выключить').setStyle(muted ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('menu_main').setLabel('◀️ Меню').setStyle(ButtonStyle.Secondary)
  );
  
  upd ? await upd.update({ embeds: [embed], components: [row1, row2, row3], files: [] }) : await ch.send({ embeds: [embed], components: [row1, row2, row3] });
}


// ═══════════════════ RUSTLABS ═══════════════════
async function sendCraft(ch, item) {
  const info = getCraftInfo(item);
  if (!info) return ch.send(`❌ **${item}** не найден`);
  const time = info.time >= 60 ? `${Math.floor(info.time / 60)}м ${info.time % 60 || ''}с` : `${info.time}с`;
  const embed = new EmbedBuilder()
    .setTitle(`🔨 ${info.name}`)
    .setColor(C.blue)
    .addFields(
      { name: 'Верстак', value: info.workbench, inline: true },
      { name: 'Время', value: time, inline: true },
      { name: 'Ингредиенты', value: formatIngredients(info.ingredients), inline: false }
    );
  await ch.send({ embeds: [embed] });
}

async function sendRecycle(ch, item) {
  const info = getRecycleInfo(item);
  if (!info) return ch.send(`❌ **${item}** не найден`);
  const embed = new EmbedBuilder()
    .setTitle(`♻️ ${info.name}`)
    .setColor(C.green)
    .addFields({ name: 'Выход', value: formatOutput(info.output), inline: false });
  await ch.send({ embeds: [embed] });
}

async function sendResearch(ch, item) {
  const info = getResearchInfo(item);
  if (!info) return ch.send(`❌ **${item}** не найден`);
  const embed = new EmbedBuilder()
    .setTitle(`📚 ${info.name}`)
    .setColor(C.blue)
    .addFields(
      { name: '⚙️ Скрап', value: `${info.scrap}`, inline: true },
      { name: 'Верстак', value: info.workbench, inline: true }
    );
  await ch.send({ embeds: [embed] });
}

// ═══════════════════ MESSAGE HANDLER ═══════════════════
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  
  const ch = msg.channel;
  const content = msg.content.trim();
  
  // Авто-чек Steam ссылок и SteamID без команды
  const steamLinkMatch = content.match(/(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(?:profiles|id)\/([^\s\/]+)/i);
  const steamIdMatch = content.match(/^(\d{17})$/);
  
  if (steamLinkMatch || steamIdMatch) {
    if (!hasAccess(msg.author.id)) return;
    const query = steamLinkMatch ? steamLinkMatch[1] : steamIdMatch[1];
    return sendPlayerCheck(ch, query);
  }
  
  // Обычные команды
  if (!content.startsWith(PREFIX)) return;
  if (!hasAccess(msg.author.id)) return msg.channel.send('❌ Нет доступа');
  
  const args = content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  try {
    switch (cmd) {
      case 'start': case 'menu': await sendStart(ch); break;
      case 'team': await sendTeam(ch); break;
      case 'status': await sendStatus(ch); break;
      case 'events': await sendEvents(ch); break;
      case 'time': await sendTime(ch); break;
      case 'map': await sendMap(ch); break;
      case 'shops': await sendShops(ch); break;
      case 'devices': await sendDevices(ch); break;
      case 'settings': await sendSettings(ch); break;
      
      case 'say': {
        const m = args.join(' ');
        if (!m) return ch.send('❌ `!say сообщение`');
        const ok = await rustPlus.sendTeamMessage(m);
        await ch.send(ok ? '✅ Отправлено в игровой чат' : '❌ Ошибка');
        break;
      }
      
      case 'swap': {
        const name = args.join(' ');
        if (!name) return ch.send('❌ `!swap ник`');
        const team = await rustPlus.getTeamInfo();
        if (!team?.members) return ch.send('❌ Нет данных');
        const p = team.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
        if (!p) return ch.send(`❌ **${name}** не найден`);
        if (!p.isOnline) return ch.send(`❌ **${p.name}** оффлайн`);
        const ok = await rustPlus.promoteToLeader(p.steamId?.toString());
        await ch.send(ok ? `👑 Лидерка → **${p.name}**` : '❌ Ошибка');
        break;
      }
      
      case 'craft': await sendCraft(ch, args.join(' ')); break;
      case 'recycle': await sendRecycle(ch, args.join(' ')); break;
      case 'research': await sendResearch(ch, args.join(' ')); break;
      
      case 'raid': {
        if (!args.length) return sendRaidMenu(ch);
        // Поиск по ключу или названию
        let key = args[0].toLowerCase();
        if (!STRUCTURES[key]) {
          // Поиск по названию
          key = Object.keys(STRUCTURES).find(k => 
            STRUCTURES[k].name.toLowerCase().includes(key) || k.includes(key)
          );
        }
        if (!key) return ch.send('❌ Не найдено. Используй `!raid` для меню');
        await sendRaidInfo(ch, key, parseInt(args[1]) || 1);
        break;
      }
      
      case 'cam': {
        const code = args[0]?.toUpperCase();
        if (!code) return ch.send('📷 `!cam КОД`\n\nOILRIG1, DOME1, AIRFIELD1, COMPOUND');
        await sendCamera(ch, code);
        break;
      }
      
      case 'adddevice': {
        if (args.length < 2) return ch.send('`!adddevice ID название`');
        deviceManager.add(args[0], args.slice(1).join(' '), 1);
        await ch.send(`✅ Добавлено: **${args.slice(1).join(' ')}**`);
        break;
      }
      
      case 'on': {
        const q = args.join(' ');
        const d = /^\d+$/.test(q) ? deviceManager.get(q) : deviceManager.findByName(q);
        if (!d) return ch.send('❌ Не найдено');
        const r = await deviceManager.turnOn(d.id);
        await ch.send(r.success ? `🟢 **${d.name}** включён` : '❌ Ошибка');
        break;
      }
      
      case 'off': {
        const q = args.join(' ');
        const d = /^\d+$/.test(q) ? deviceManager.get(q) : deviceManager.findByName(q);
        if (!d) return ch.send('❌ Не найдено');
        const r = await deviceManager.turnOff(d.id);
        await ch.send(r.success ? `🔴 **${d.name}** выключен` : '❌ Ошибка');
        break;
      }
      
      case 'mute': settings.mute(parseInt(args[0]) || null); await ch.send('🔇 Уведомления выключены'); break;
      case 'unmute': settings.unmute(); await ch.send('🔊 Уведомления включены'); break;
      
      case 'check': case 'player': case 'lookup': {
        const query = args.join(' ');
        if (!query) return ch.send('❌ `!check ник/steamid`');
        await sendPlayerCheck(ch, query);
        break;
      }
      
      case 'bm': case 'battlemetrics': {
        const query = args.join(' ');
        if (!query) return ch.send('❌ `!bm ник`');
        await sendBMSearch(ch, query);
        break;
      }
    }
  } catch (e) {
    console.error('[Discord] Cmd:', e.message);
    await ch.send('❌ Ошибка');
  }
});


// ═══════════════════ INTERACTION HANDLER ═══════════════════
client.on('interactionCreate', async (i) => {
  if (!i.isButton() && !i.isStringSelectMenu()) return;
  if (!hasAccess(i.user.id)) return i.reply({ content: '❌ Нет доступа', ephemeral: true });
  
  const ch = i.channel;
  const id = i.customId;
  
  try {
    // Main
    if (id === 'menu_main') return sendStart(i, true);
    if (id === 'cmd_team') return sendTeam(ch, i);
    if (id === 'cmd_status') return sendStatus(ch, i);
    if (id === 'cmd_events') return sendEvents(ch, i);
    if (id === 'cmd_time') return sendTime(ch, i);
    if (id === 'cmd_map') return sendMap(ch, i);
    if (id === 'cmd_settings') return sendSettings(ch, i);
    
    // Shops
    if (id === 'menu_shops') return sendShops(ch, i, 0);
    if (id.startsWith('shops_')) return sendShops(ch, i, parseInt(id.split('_')[1]));
    
    // Devices
    if (id === 'menu_devices') return sendDevices(ch, i);
    if (id.startsWith('dev_on_')) {
      const r = await deviceManager.turnOn(id.replace('dev_on_', ''));
      return i.reply({ content: r.success ? '🟢 Включено' : '❌ Ошибка', ephemeral: true });
    }
    if (id.startsWith('dev_off_')) {
      const r = await deviceManager.turnOff(id.replace('dev_off_', ''));
      return i.reply({ content: r.success ? '🔴 Выключено' : '❌ Ошибка', ephemeral: true });
    }
    
    // Cameras
    if (id === 'menu_cameras') return sendCameras(ch, i);
    if (id.startsWith('cam_')) {
      await i.deferUpdate();
      return sendCamera(ch, id.replace('cam_', ''));
    }
    
    // Raid - категории
    if (id === 'menu_raid') return sendRaidMenu(ch, i);
    if (id.startsWith('rcat_')) return sendRaidCategory(ch, id.replace('rcat_', ''), i);
    
    // Raid - предметы
    if (id.startsWith('raid_')) return sendRaidInfo(ch, id.replace('raid_', ''), 1, i);
    if (id.startsWith('raidx_')) {
      const parts = id.replace('raidx_', '').split('_');
      const count = parseInt(parts.pop());
      const key = parts.join('_');
      return sendRaidInfo(ch, key, count, i);
    }
    
    // Settings
    if (id.startsWith('set_')) {
      const key = id.replace('set_', '');
      if (key === 'mute') {
        settings.isMuted() ? settings.unmute() : settings.mute();
      } else {
        settings.toggle(`notifications.${key}`);
      }
      return sendSettings(ch, i);
    }
    
    // Refresh
    if (id.startsWith('refresh_')) {
      const cmd = id.replace('refresh_', '');
      if (cmd === 'cmd_team') return sendTeam(ch, i);
      if (cmd === 'cmd_status') return sendStatus(ch, i);
      if (cmd === 'cmd_events') return sendEvents(ch, i);
      if (cmd === 'cmd_time') return sendTime(ch, i);
      if (cmd === 'cmd_map') return sendMap(ch, i);
    }
    
    // BattleMetrics player
    if (id.startsWith('bm_')) {
      await i.deferUpdate();
      return sendBMPlayer(ch, id.replace('bm_', ''));
    }
    
    await i.deferUpdate();
  } catch (e) {
    console.error('[Discord] Interaction:', e.message);
    try { if (!i.replied && !i.deferred) await i.reply({ content: '❌ Ошибка', ephemeral: true }); } catch {}
  }
});

// ═══════════════════ PLAYER CHECKER ═══════════════════
async function sendPlayerCheck(ch, query) {
  const msg = await ch.send('🔍 Поиск...');
  
  // Определяем тип запроса
  let steamId = query;
  
  // Если это не SteamID, пробуем найти через BattleMetrics
  if (!/^\d{17}$/.test(query)) {
    // Пробуем как vanity URL
    const resolved = await steamService.resolveVanityUrl(query);
    if (resolved) {
      steamId = resolved;
    } else {
      // Ищем через BattleMetrics
      const bmResults = await battleMetricsService.searchPlayer(query, 1);
      if (bmResults.length && bmResults[0].positiveMatch) {
        // Нашли в BM, но нужен SteamID - показываем BM профиль
        return sendBMPlayer(ch, bmResults[0].id, msg);
      }
      return msg.edit('❌ Игрок не найден. Попробуй SteamID или точный ник.');
    }
  }
  
  // Получаем данные Steam
  const profile = await steamService.getFullProfile(steamId);
  if (profile.error) return msg.edit(`❌ ${profile.error}`);
  
  // Получаем данные BattleMetrics
  const bmSearch = await battleMetricsService.searchPlayer(profile.name, 5);
  const bmPlayer = bmSearch.find?.(p => p.positiveMatch) || bmSearch[0];
  let bmData = null;
  let servers = [];
  
  if (bmPlayer) {
    bmData = await battleMetricsService.getPlayer(bmPlayer.id);
    servers = await battleMetricsService.getPlayerServers(bmPlayer.id, 10);
  }
  
  // Создаём embed
  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${profile.name}`)
    .setURL(profile.profileUrl)
    .setThumbnail(profile.avatar)
    .setColor(profile.analysis.trustScore >= 70 ? C.green : profile.analysis.trustScore >= 40 ? C.orange : C.red)
    .setTimestamp();
  
  // Основная инфа
  let info = `${profile.status}\n`;
  info += `👁️ ${profile.visibility}\n`;
  if (profile.country) info += `🌍 ${profile.country}\n`;
  if (profile.created) {
    const age = Math.floor((Date.now() - profile.created.getTime()) / (1000 * 60 * 60 * 24 * 365 * 10)) / 10;
    info += `📅 Аккаунт: ${age}г\n`;
  }
  if (profile.gameInfo) info += `🎮 Играет: ${profile.gameInfo}\n`;
  embed.addFields({ name: '📋 Профиль', value: info, inline: true });
  
  // Rust часы
  if (profile.rustHours) {
    let rust = '';
    if (profile.rustHours.hasRust) {
      rust += `⏱️ **${profile.rustHours.hours}** часов\n`;
      if (profile.rustHours.hours2weeks) rust += `📊 За 2 нед: ${profile.rustHours.hours2weeks}ч\n`;
    } else {
      rust += '❓ Скрыто/нет игры\n';
    }
    embed.addFields({ name: '🎮 Rust', value: rust, inline: true });
  }
  
  // Баны
  if (profile.bans) {
    let bans = '';
    if (profile.bans.vacBanned) bans += `🔴 VAC: ${profile.bans.vacBans} (${profile.bans.daysSinceLastBan}д)\n`;
    else bans += '✅ VAC: чисто\n';
    if (profile.bans.gameBans > 0) bans += `🔴 Game: ${profile.bans.gameBans}\n`;
    else bans += '✅ Game: чисто\n';
    if (profile.bans.communityBanned) bans += '🔴 Community ban\n';
    embed.addFields({ name: '🛡️ Баны', value: bans, inline: true });
  }
  
  // Trust Score
  let trust = `**${profile.analysis.trustLevel}** (${profile.analysis.trustScore}/100)\n`;
  if (profile.analysis.flags.length) {
    trust += profile.analysis.flags.join('\n');
  }
  embed.addFields({ name: '📊 Анализ', value: trust, inline: false });
  
  // BattleMetrics данные
  if (bmData && !bmData.error) {
    let bmInfo = '';
    if (bmData.isOnline && bmData.currentServer) {
      bmInfo += `🟢 **Онлайн:** ${bmData.currentServer.name.substring(0, 40)}\n`;
    } else {
      const lastSeen = bmData.lastSeen ? new Date(bmData.lastSeen) : null;
      if (lastSeen) {
        const ago = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
        if (ago < 60) bmInfo += `🔴 Был ${ago}м назад\n`;
        else if (ago < 1440) bmInfo += `🔴 Был ${Math.floor(ago / 60)}ч назад\n`;
        else bmInfo += `🔴 Был ${Math.floor(ago / 1440)}д назад\n`;
      }
    }
    
    // Серверы
    if (servers.length) {
      bmInfo += `\n**Последние серверы:**\n`;
      for (const s of servers.slice(0, 5)) {
        const serverInfo = await battleMetricsService.getServer(s.id);
        if (serverInfo && !serverInfo.error) {
          const time = battleMetricsService.formatPlaytime(s.timePlayed || 0);
          bmInfo += `• ${serverInfo.name.substring(0, 35)} (${time})\n`;
        }
      }
    }
    
    if (bmInfo) embed.addFields({ name: '📡 BattleMetrics', value: bmInfo.substring(0, 1024), inline: false });
  }
  
  // Кнопки
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Steam').setStyle(ButtonStyle.Link).setURL(profile.profileUrl)
  );
  
  if (bmPlayer) {
    row.addComponents(
      new ButtonBuilder().setLabel('BattleMetrics').setStyle(ButtonStyle.Link).setURL(battleMetricsService.getPlayerUrl(bmPlayer.id))
    );
  }
  
  await msg.edit({ content: '', embeds: [embed], components: [row] });
}

async function sendBMSearch(ch, query) {
  const results = await battleMetricsService.searchPlayer(query, 10);
  
  if (!results.length || results.error) {
    return ch.send(`❌ **${query}** не найден в BattleMetrics`);
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`🔍 BattleMetrics: ${query}`)
    .setColor(C.blue)
    .setTimestamp();
  
  let desc = '';
  results.forEach((p, i) => {
    const lastSeen = p.lastSeen ? new Date(p.lastSeen) : null;
    let ago = '';
    if (lastSeen) {
      const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
      if (mins < 5) ago = '🟢 онлайн';
      else if (mins < 60) ago = `${mins}м`;
      else if (mins < 1440) ago = `${Math.floor(mins / 60)}ч`;
      else ago = `${Math.floor(mins / 1440)}д`;
    }
    desc += `**${i + 1}.** ${p.name} ${p.positiveMatch ? '✅' : ''} ${ago}\n`;
  });
  
  embed.setDescription(desc);
  
  // Кнопки для первых 5
  const rows = [];
  const row = new ActionRowBuilder();
  results.slice(0, 5).forEach((p, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bm_${p.id}`)
        .setLabel(`${i + 1}. ${p.name.substring(0, 15)}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  rows.push(row);
  
  await ch.send({ embeds: [embed], components: rows });
}

async function sendBMPlayer(ch, playerId, editMsg = null) {
  const player = await battleMetricsService.getPlayer(playerId);
  if (player.error) {
    const msg = `❌ ${player.error}`;
    return editMsg ? editMsg.edit(msg) : ch.send(msg);
  }
  
  const servers = await battleMetricsService.getPlayerServers(playerId, 10);
  
  const embed = new EmbedBuilder()
    .setTitle(`📡 ${player.name}`)
    .setURL(battleMetricsService.getPlayerUrl(playerId))
    .setColor(player.isOnline ? C.green : C.dark)
    .setTimestamp();
  
  let info = '';
  if (player.isOnline && player.currentServer) {
    info += `🟢 **Онлайн**\n`;
    info += `🖥️ ${player.currentServer.name}\n`;
    info += `👥 ${player.currentServer.players}/${player.currentServer.maxPlayers}\n`;
  } else {
    const lastSeen = player.lastSeen ? new Date(player.lastSeen) : null;
    if (lastSeen) {
      const ago = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
      if (ago < 60) info += `🔴 Был ${ago}м назад\n`;
      else if (ago < 1440) info += `🔴 Был ${Math.floor(ago / 60)}ч назад\n`;
      else info += `🔴 Был ${Math.floor(ago / 1440)}д назад\n`;
    }
  }
  embed.addFields({ name: '📋 Статус', value: info || 'Нет данных', inline: false });
  
  // История серверов
  if (servers.length) {
    let serverList = '';
    for (const s of servers.slice(0, 8)) {
      const serverInfo = await battleMetricsService.getServer(s.id);
      if (serverInfo && !serverInfo.error) {
        const time = battleMetricsService.formatPlaytime(s.timePlayed || 0);
        serverList += `• ${serverInfo.name.substring(0, 40)} (**${time}**)\n`;
      }
    }
    if (serverList) embed.addFields({ name: '🖥️ Серверы', value: serverList.substring(0, 1024), inline: false });
  }
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('BattleMetrics').setStyle(ButtonStyle.Link).setURL(battleMetricsService.getPlayerUrl(playerId))
  );
  
  if (editMsg) {
    await editMsg.edit({ content: '', embeds: [embed], components: [row] });
  } else {
    await ch.send({ embeds: [embed], components: [row] });
  }
}

// ═══════════════════ УВЕДОМЛЕНИЯ ═══════════════════
async function notify(embed) {
  if (!CHANNEL_ID || settings.isMuted()) return;
  try {
    const ch = await client.channels.fetch(CHANNEL_ID);
    if (ch) await ch.send({ embeds: [embed] });
  } catch (e) { console.error('[Discord] Notify:', e.message); }
}

function subscribe() {
  eventBus.on(EVENTS.PLAYER_DEATH, d => {
    if (!settings.get('notifications.deaths')) return;
    notify(new EmbedBuilder().setTitle('💀 Смерть в команде').setDescription(`**${d.name}** погиб в \`${d.grid}\``).setColor(C.red).setTimestamp());
  });
  
  eventBus.on(EVENTS.PLAYER_ONLINE, d => {
    if (!settings.get('notifications.online')) return;
    notify(new EmbedBuilder().setTitle('🟢 Игрок онлайн').setDescription(`**${d.name}** зашёл в игру`).setColor(C.green).setTimestamp());
  });
  
  eventBus.on(EVENTS.PLAYER_OFFLINE, d => {
    if (!settings.get('notifications.offline')) return;
    notify(new EmbedBuilder().setTitle('🔴 Игрок оффлайн').setDescription(`**${d.name}** вышел из игры`).setColor(C.red).setTimestamp());
  });
  
  eventBus.on(EVENTS.CARGO_SPAWN, d => {
    if (!settings.get('notifications.cargo')) return;
    notify(new EmbedBuilder().setTitle('🚢 Cargo Ship').setDescription(`Грузовой корабль появился в \`${d.grid}\``).setColor(C.cargo).setTimestamp());
  });
  
  eventBus.on(EVENTS.CARGO_DESPAWN, () => {
    if (!settings.get('notifications.cargo')) return;
    notify(new EmbedBuilder().setTitle('🚢 Cargo Ship').setDescription('Грузовой корабль покинул карту').setColor(C.dark).setTimestamp());
  });
  
  eventBus.on(EVENTS.HELI_SPAWN, d => {
    if (!settings.get('notifications.heli')) return;
    notify(new EmbedBuilder().setTitle('🚁 Patrol Helicopter').setDescription(`Патрульный вертолёт появился в \`${d.grid}\``).setColor(C.heli).setTimestamp());
  });
  
  eventBus.on(EVENTS.HELI_DESPAWN, () => {
    if (!settings.get('notifications.heli')) return;
    notify(new EmbedBuilder().setTitle('🚁 Patrol Helicopter').setDescription('Патрульный вертолёт уничтожен').setColor(C.dark).setTimestamp());
  });
  
  eventBus.on(EVENTS.CHINOOK_SPAWN, d => {
    if (!settings.get('notifications.chinook')) return;
    notify(new EmbedBuilder().setTitle('🛩️ CH-47 Chinook').setDescription(`Грузовой вертолёт появился в \`${d.grid}\``).setColor(0x9B59B6).setTimestamp());
  });
  
  eventBus.on(EVENTS.CRATE_SPAWN, d => {
    if (!settings.get('notifications.crate')) return;
    notify(new EmbedBuilder().setTitle('📦 Locked Crate').setDescription(`Запертый ящик появился в \`${d.grid}\``).setColor(C.orange).setTimestamp());
  });
  
  eventBus.on(EVENTS.RAID_ALERT, () => {
    if (!settings.get('notifications.raidAlert')) return;
    notify(new EmbedBuilder().setTitle('🚨🚨🚨 RAID ALERT 🚨🚨🚨').setDescription('**Обнаружена активность рейда!**\nПроверьте базу!').setColor(C.red).setTimestamp());
  });
  
  eventBus.on(EVENTS.SHOP_NEW, d => {
    if (!settings.get('notifications.shops')) return;
    const embed = new EmbedBuilder().setTitle('🏪 Новый магазин').setColor(0x9C27B0).setTimestamp();
    if (d.count > 1) embed.setDescription(`Появилось **${d.count}** магазинов`);
    else embed.setDescription(`${d.name || 'Vending Machine'} в \`${d.grid}\``);
    notify(embed);
  });
  
  eventBus.on(EVENTS.SHOP_WATER, d => {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ МАГАЗИН В ВОДЕ')
      .setDescription(`**${d.name || 'Vending Machine'}**\nКоординаты: \`${d.grid}\``)
      .setColor(0xFF6B6B)
      .setTimestamp();
    notify(embed);
  });
  
  eventBus.on(EVENTS.CONNECTED, () => notify(new EmbedBuilder().setTitle('✅ Rust+ подключён').setColor(C.green).setTimestamp()));
  eventBus.on(EVENTS.DISCONNECTED, () => notify(new EmbedBuilder().setTitle('❌ Rust+ отключён').setColor(C.red).setTimestamp()));
}

// ═══════════════════ INIT ═══════════════════
class DiscordNotifier {
  init() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.log('[Discord] ⚠️ DISCORD_BOT_TOKEN не задан');
      return;
    }
    
    console.log('[Discord] ═══════════════════════════════════════');
    subscribe();
    
    client.once('ready', () => console.log(`[Discord] ✅ ${client.user.tag}`));
    client.login(process.env.DISCORD_BOT_TOKEN).catch(e => console.error('[Discord] ❌', e.message));
    console.log('[Discord] ═══════════════════════════════════════');
  }
}

export default new DiscordNotifier();
