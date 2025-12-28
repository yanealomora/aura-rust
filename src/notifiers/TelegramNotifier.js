import { Telegraf } from 'telegraf';
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
import licenseManager from '../core/LicenseManager.js';
import adminBot from '../admin/AdminBot.js';
import accessControl from '../core/AccessControl.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bmCache = new Map();
const userState = new Map();

// ═══════════════════ MIDDLEWARE ═══════════════════
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  
  // Владелец всегда проходит
  if (licenseManager.isOwner(userId)) {
    return next();
  }
  
  // Проверка лицензии
  const license = licenseManager.check(userId);
  
  if (!license.valid) {
    // Если /start - показываем запрос доступа
    if (ctx.message?.text === '/start') {
      // Отправляем запрос владельцу
      adminBot.sendAccessRequest(userId, username, firstName);
      
      return ctx.reply(`AURA RUST

Для использования бота нужна лицензия.
Ваш запрос отправлен администратору.

ID: ${userId}`);
    }
    
    if (license.reason === 'expired') {
      return ctx.reply(`Лицензия истекла

Для продления обратитесь к администратору.
ID: ${userId}`);
    }
    
    if (license.reason === 'blocked') {
      return ctx.reply('Доступ заблокирован');
    }
    
    return ctx.reply(`Нет лицензии

Отправьте /start для запроса доступа.
ID: ${userId}`);
  }
  
  return next();
});

// ═══════════════════ АДМИН КОМАНДЫ ═══════════════════
bot.command('admin', async (ctx) => {
  if (!licenseManager.isOwner(ctx.from.id)) return ctx.reply('Только для владельца');
  
  const stats = licenseManager.getStats();
  
  let text = `АДМИН ПАНЕЛЬ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `Статистика:\n`;
  text += `Активных: ${stats.active}\n`;
  text += `Истекших: ${stats.expired}\n`;
  text += `Заблокированных: ${stats.blocked}\n`;
  text += `Lifetime: ${stats.lifetime}\n`;
  text += `Всего: ${stats.total}`;
  
  const btns = {
    inline_keyboard: [
      [{ text: 'Пользователи', callback_data: 'admin_users' }],
      [{ text: 'Выдать лицензию', callback_data: 'admin_grant' }]
    ]
  };
  
  await ctx.reply(text, { reply_markup: btns });
});

// Команда для выдачи лицензии
bot.command('grant', async (ctx) => {
  if (!licenseManager.isOwner(ctx.from.id)) return ctx.reply('Только для владельца');
  
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('Использование: /grant ID [тип]\nТипы: FREE, WEEK, MONTH, LIFETIME');
  
  const userId = args[0];
  const type = (args[1] || 'MONTH').toUpperCase();
  
  const result = licenseManager.grant(userId, type, ctx.from.id.toString());
  
  if (result.success) {
    const days = result.daysLeft === -1 ? 'навсегда' : `${result.daysLeft} дней`;
    ctx.reply(`Лицензия выдана\n\nID: ${userId}\nТип: ${type}\nСрок: ${days}`);
  } else {
    ctx.reply(`Ошибка: ${result.error}`);
  }
});

// Команда для отзыва
bot.command('revoke', async (ctx) => {
  if (!licenseManager.isOwner(ctx.from.id)) return ctx.reply('Только для владельца');
  
  const userId = ctx.message.text.split(' ')[1];
  if (!userId) return ctx.reply('Использование: /revoke ID');
  
  const result = licenseManager.revoke(userId, ctx.from.id.toString());
  ctx.reply(result.success ? `Лицензия ${userId} отозвана` : `Ошибка: ${result.error}`);
});

// ═══════════════════ ГЛАВНОЕ МЕНЮ ═══════════════════
const MAIN_MENU = {
  inline_keyboard: [
    [{ text: '👥 Команда', callback_data: 'cmd_team' }, { text: '📊 Сервер', callback_data: 'cmd_status' }],
    [{ text: '🎯 События', callback_data: 'cmd_events' }, { text: '🕐 Время', callback_data: 'cmd_time' }],
    [{ text: '🏪 Магазины', callback_data: 'menu_shops' }, { text: '💡 Устройства', callback_data: 'menu_devices' }],
    [{ text: '💣 Рейд', callback_data: 'menu_raid' }, { text: '📷 Камеры', callback_data: 'menu_cameras' }],
    [{ text: '🗺 Карта', callback_data: 'cmd_map' }, { text: '⚙️ Настройки', callback_data: 'cmd_settings' }]
  ]
};

// ═══════════════════ КОМАНДЫ ═══════════════════
bot.command('start', async (ctx) => {
  const info = rustPlus.getCachedServerInfo();
  let text = '🎮 RUST EVENT BOT\n━━━━━━━━━━━━━━━━━━━━\n';
  text += `🔌 Rust+: ${rustPlus.isConnected() ? '✅' : '❌'}\n`;
  if (info) {
    text += `\n🎮 ${info.name}\n`;
    text += `👥 ${info.players}/${info.maxPlayers}`;
    if (info.queuedPlayers > 0) text += ` (+${info.queuedPlayers})`;
    if (info.wipeTime) {
      const days = Math.floor((Date.now() - info.wipeTime * 1000) / 86400000);
      text += `\n⏰ Вайп: ${days}д назад`;
    }
  }
  await ctx.reply(text, { reply_markup: MAIN_MENU });
});

bot.command('menu', ctx => ctx.reply('📋 Меню', { reply_markup: MAIN_MENU }));

// Помощь
bot.command('help', async ctx => {
  let text = '📖 КОМАНДЫ\n━━━━━━━━━━━━━━━━━━━━\n\n';
  text += '🎮 ОСНОВНЫЕ\n';
  text += '/start — Главное меню\n';
  text += '/team — Команда\n';
  text += '/events — События\n';
  text += '/time — Время\n';
  text += '/map — Карта\n';
  text += '/shops — Магазины\n';
  text += '/search предмет — Поиск в магазинах\n';
  text += '/devices — Устройства\n';
  text += '/settings — Настройки\n\n';
  
  text += '💬 ЧАТ\n';
  text += '/say сообщение — В игровой чат\n';
  text += '/swap ник — Передать лидерку\n\n';
  
  text += '💣 РЕЙД\n';
  text += '/raid — Калькулятор\n';
  text += '/raid предмет — Инфо о предмете\n\n';
  
  text += '📚 RUSTLABS\n';
  text += '/craft предмет — Крафт\n';
  text += '/recycle предмет — Ресайкл\n';
  text += '/research предмет — Изучение\n';
  text += '/decay тип — Декей\n';
  text += '/upkeep тип — Апкип\n';
  text += '/despawn предмет — Деспавн\n';
  text += '/cctv монумент — Коды камер\n\n';
  
  text += '🔍 ЧЕКЕР\n';
  text += 'Просто отправь SteamID, ник или ссылку\n\n';
  
  text += '📷 КАМЕРЫ\n';
  text += '/cam КОД — Скриншот камеры\n\n';
  
  text += '🔇 МЬЮТ\n';
  text += '/mute [минуты] — Выкл уведомления\n';
  text += '/unmute — Вкл уведомления';
  
  await ctx.reply(text);
});

// Отправка в игровой чат
bot.command('say', async ctx => {
  const msg = ctx.message.text.split(' ').slice(1).join(' ');
  if (!msg) return ctx.reply('❌ /say сообщение');
  const ok = await rustPlus.sendTeamMessage(msg);
  await ctx.reply(ok ? '✅ Отправлено' : '❌ Ошибка');
});

// Swap лидера
bot.command('swap', async ctx => {
  const name = ctx.message.text.split(' ').slice(1).join(' ');
  if (!name) return ctx.reply('❌ /swap ник');
  const team = await rustPlus.getTeamInfo();
  if (!team?.members) return ctx.reply('❌ Нет данных');
  const player = team.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
  if (!player) return ctx.reply(`❌ ${name} не найден`);
  if (!player.isOnline) return ctx.reply(`❌ ${player.name} оффлайн`);
  const ok = await rustPlus.promoteToLeader(player.steamId?.toString());
  await ctx.reply(ok ? `👑 Лидерка → ${player.name}` : '❌ Ошибка');
});

// ═══════════════════ RUSTLABS КОМАНДЫ ═══════════════════
bot.command('craft', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /craft ak/mp5/c4/rocket...');
  const info = getCraftInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  const time = info.time >= 60 ? `${Math.floor(info.time / 60)}м${info.time % 60 ? info.time % 60 + 'с' : ''}` : `${info.time}с`;
  const ing = formatIngredients(info.ingredients);
  await ctx.reply(`🔨 ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n⚙️ Верстак: ${info.workbench}\n⏱ Время: ${time}\n\n📦 ${ing}`);
});

bot.command('recycle', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /recycle pipe/spring/tech_trash...');
  const info = getRecycleInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  const out = formatOutput(info.output);
  await ctx.reply(`♻️ ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n📦 ${out}`);
});

bot.command('research', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /research ak/mp5/c4...');
  const info = getResearchInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  await ctx.reply(`📚 ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n🔬 Скрап: ${info.scrap}\n⚙️ Верстак: ${info.workbench}`);
});

bot.command('decay', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /decay wood/stone/metal/armored');
  const info = getDecayInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  await ctx.reply(`⏰ ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n🕐 Декей: ${info.time}`);
});

bot.command('upkeep', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /upkeep wood/stone/metal/armored');
  const info = getUpkeepInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  const cost = formatIngredients(info.cost);
  await ctx.reply(`🏠 ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n📦 За 24ч: ${cost}`);
});

bot.command('despawn', async ctx => {
  const item = ctx.message.text.split(' ').slice(1).join(' ');
  if (!item) return ctx.reply('❌ /despawn ak/c4/scrap...');
  const info = getDespawnInfo(item);
  if (!info) return ctx.reply(`❌ ${item} не найден`);
  await ctx.reply(`⏱️ ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n🕐 Despawn: ${info.time}`);
});

bot.command('cctv', async ctx => {
  const monument = ctx.message.text.split(' ').slice(1).join(' ');
  if (!monument) {
    let text = '📹 CCTV КОДЫ\n━━━━━━━━━━━━━━━━━━━━\n\n';
    text += '/cctv dome\n/cctv launch\n/cctv airfield\n/cctv outpost\n/cctv bandit\n/cctv large\n/cctv small';
    return ctx.reply(text);
  }
  const info = getCCTVCodes(monument);
  if (!info) return ctx.reply(`❌ ${monument} не найден`);
  await ctx.reply(`📹 ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n${info.codes.join('\n')}`);
});

// ═══════════════════ ОСНОВНЫЕ ФУНКЦИИ ═══════════════════
async function sendTeam(ctx, edit = false) {
  const team = await rustPlus.getTeamInfo();
  if (!team?.members?.length) return edit ? ctx.editMessageText('❌ Нет данных') : ctx.reply('❌ Нет данных');
  
  const mapSize = rustPlus.getMapSize();
  const online = team.members.filter(m => m.isOnline);
  const offline = team.members.filter(m => !m.isOnline);
  const leader = team.leaderSteamId?.toString();
  
  let text = `👥 КОМАНДА (${team.members.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (online.length) {
    text += `\n🟢 Online (${online.length})\n`;
    online.forEach(m => {
      const grid = coordsToGrid(m.x, m.y, mapSize);
      const isLeader = m.steamId?.toString() === leader ? '👑' : '';
      const dead = m.isAlive ? '' : '💀';
      text += `${isLeader}${m.name}${dead} — ${grid}\n`;
    });
  }
  if (offline.length) {
    text += `\n🔴 Offline (${offline.length})\n`;
    offline.slice(0, 5).forEach(m => {
      const isLeader = m.steamId?.toString() === leader ? '👑' : '';
      text += `${isLeader}${m.name}\n`;
    });
    if (offline.length > 5) text += `...и ещё ${offline.length - 5}\n`;
  }
  
  const btns = { inline_keyboard: [[{ text: '🔄', callback_data: 'cmd_team' }, { text: '◀️', callback_data: 'menu_main' }]] };
  edit ? await ctx.editMessageText(text, { reply_markup: btns }) : await ctx.reply(text, { reply_markup: btns });
}

async function sendStatus(ctx, edit = false) {
  const info = rustPlus.getCachedServerInfo() || await rustPlus.getServerInfo();
  if (!info) return edit ? ctx.editMessageText('❌ Нет данных') : ctx.reply('❌ Нет данных');
  
  const pop = Math.round(info.players / info.maxPlayers * 100);
  const bar = '█'.repeat(Math.floor(pop/10)) + '░'.repeat(10 - Math.floor(pop/10));
  
  let text = `📊 СЕРВЕР\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `🎮 ${info.name}\n\n`;
  text += `👥 ${info.players}/${info.maxPlayers} (${pop}%)\n[${bar}]`;
  if (info.queuedPlayers > 0) text += `\n⏳ Очередь: ${info.queuedPlayers}`;
  text += `\n\n🗺 ${info.mapSize}m | 🌱 ${info.seed || '?'}`;
  if (info.wipeTime) {
    const d = Math.floor((Date.now() - info.wipeTime * 1000) / 86400000);
    const h = Math.floor(((Date.now() - info.wipeTime * 1000) % 86400000) / 3600000);
    text += `\n⏰ Вайп: ${d}д ${h}ч назад`;
  }
  
  const btns = { inline_keyboard: [[{ text: '🔄', callback_data: 'cmd_status' }, { text: '◀️', callback_data: 'menu_main' }]] };
  edit ? await ctx.editMessageText(text, { reply_markup: btns }) : await ctx.reply(text, { reply_markup: btns });
}

async function sendEvents(ctx, edit = false) {
  const markers = await rustPlus.getMapMarkers();
  if (!markers?.markers) return edit ? ctx.editMessageText('❌ Нет данных') : ctx.reply('❌ Нет данных');
  
  const mapSize = rustPlus.getMapSize();
  const cargo = markers.markers.filter(m => m.type === 5);
  const heli = markers.markers.filter(m => m.type === 8);
  const ch47 = markers.markers.filter(m => m.type === 4);
  const crates = markers.markers.filter(m => m.type === 6);
  
  let text = '🎯 СОБЫТИЯ\n━━━━━━━━━━━━━━━━━━━━\n\n';
  text += cargo.length ? `🚢 Cargo — ${coordsToGrid(cargo[0].x, cargo[0].y, mapSize)}\n` : '🚢 Cargo: нет\n';
  text += heli.length ? `🚁 Патрульный — ${coordsToGrid(heli[0].x, heli[0].y, mapSize)}\n` : '🚁 Патрульный: нет\n';
  text += ch47.length ? `🛩 Грузовой — ${coordsToGrid(ch47[0].x, ch47[0].y, mapSize)}\n` : '🛩 Грузовой: нет\n';
  text += `\n📦 Crates: ${crates.length}`;
  if (crates.length) crates.slice(0, 3).forEach(c => text += `\n  • ${coordsToGrid(c.x, c.y, mapSize)}`);
  
  const btns = { inline_keyboard: [[{ text: '🔄', callback_data: 'cmd_events' }, { text: '◀️', callback_data: 'menu_main' }]] };
  edit ? await ctx.editMessageText(text, { reply_markup: btns }) : await ctx.reply(text, { reply_markup: btns });
}

async function sendTime(ctx, edit = false) {
  const time = await rustPlus.getTime();
  if (!time) return edit ? ctx.editMessageText('❌ Нет данных') : ctx.reply('❌ Нет данных');
  
  const t = time.time || 0;
  const h = Math.floor(t), m = Math.floor((t - h) * 60);
  const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const isDay = t >= (time.sunrise || 7) && t < (time.sunset || 20);
  
  let text = `🕐 ВРЕМЯ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `${isDay ? '☀️ ДЕНЬ' : '🌙 НОЧЬ'} ${str}\n\n`;
  text += `🌅 ${time.sunrise || 7}:00 — 🌇 ${time.sunset || 20}:00`;
  
  const btns = { inline_keyboard: [[{ text: '🔄', callback_data: 'cmd_time' }, { text: '◀️', callback_data: 'menu_main' }]] };
  edit ? await ctx.editMessageText(text, { reply_markup: btns }) : await ctx.reply(text, { reply_markup: btns });
}

async function sendMap(ctx, edit = false) {
  const map = await rustPlus.getMap();
  if (!map?.jpgImage) {
    const errText = '❌ Карта недоступна';
    const btns = { inline_keyboard: [[{ text: '◀️ Меню', callback_data: 'menu_main' }]] };
    return edit ? ctx.editMessageText(errText, { reply_markup: btns }) : ctx.reply(errText, { reply_markup: btns });
  }
  const info = rustPlus.getCachedServerInfo();
  if (edit) {
    try { await ctx.deleteMessage(); } catch {}
  }
  await ctx.replyWithPhoto(
    { source: Buffer.from(map.jpgImage) },
    { caption: `🗺 ${info?.mapSize || '?'}m | 🌱 ${info?.seed || '?'}`, reply_markup: { inline_keyboard: [[{ text: '◀️ Меню', callback_data: 'menu_main_new' }]] } }
  );
}

// ═══════════════════ МАГАЗИНЫ ═══════════════════
async function sendShops(ctx, edit = false, page = 0) {
  const markers = await rustPlus.getMapMarkers();
  if (!markers?.markers) return edit ? ctx.editMessageText('❌ Нет данных') : ctx.reply('❌ Нет данных');
  
  const mapSize = rustPlus.getMapSize();
  const shops = markers.markers.filter(m => m.type === 3);
  
  const perPage = 10;
  const totalPages = Math.ceil(shops.length / perPage);
  const start = page * perPage;
  const pageShops = shops.slice(start, start + perPage);
  
  let text = `🏪 МАГАЗИНЫ (${shops.length}) — стр ${page + 1}/${totalPages}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (!shops.length) {
    text += 'Нет активных магазинов';
  } else {
    pageShops.forEach(shop => {
      const grid = coordsToGrid(shop.x, shop.y, mapSize);
      const name = shop.name || 'Магазин';
      text += `📍 ${grid} — ${name.substring(0, 22)}\n`;
      if (shop.sellOrders?.length) {
        const item = getItemName(shop.sellOrders[0].itemId);
        text += `  💰 ${item.substring(0, 15)} (${shop.sellOrders.length})\n`;
      }
    });
  }
  
  const navBtns = [];
  if (page > 0) navBtns.push({ text: '◀️', callback_data: `shops_page_${page - 1}` });
  navBtns.push({ text: `${page + 1}/${totalPages}`, callback_data: 'noop' });
  if (page < totalPages - 1) navBtns.push({ text: '▶️', callback_data: `shops_page_${page + 1}` });
  
  const btns = { inline_keyboard: [
    navBtns,
    [{ text: '🔍 Поиск', callback_data: 'shop_search' }],
    [{ text: '🔄', callback_data: 'menu_shops' }, { text: '◀️', callback_data: 'menu_main' }]
  ]};
  edit ? await ctx.editMessageText(text, { reply_markup: btns }) : await ctx.reply(text, { reply_markup: btns });
}

bot.command('shops', ctx => sendShops(ctx));
bot.command('search', async ctx => {
  const query = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
  if (!query) return ctx.reply('❌ /search предмет');
  await searchShopItem(ctx, query);
});

async function searchShopItem(ctx, query) {
  const markers = await rustPlus.getMapMarkers();
  if (!markers?.markers) return ctx.reply('❌ Нет данных');
  
  const mapSize = rustPlus.getMapSize();
  const shops = markers.markers.filter(m => m.type === 3);
  const results = [];
  
  for (const shop of shops) {
    if (!shop.sellOrders) continue;
    for (const order of shop.sellOrders) {
      const itemName = getItemName(order.itemId);
      // Поиск по названию предмета или магазина
      if (shop.name?.toLowerCase().includes(query) || 
          itemName.toLowerCase().includes(query)) {
        results.push({
          grid: coordsToGrid(shop.x, shop.y, mapSize),
          name: shop.name || 'Магазин',
          item: itemName,
          itemId: order.itemId,
          qty: order.quantity,
          cost: order.costPerItem,
          stock: order.amountInStock || '?'
        });
      }
    }
  }
  
  if (!results.length) return ctx.reply(`❌ "${query}" не найден`);
  
  let text = `🔍 ПОИСК: ${query}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  results.slice(0, 10).forEach(r => {
    text += `📍 ${r.grid} — ${r.name.substring(0, 20)}\n`;
    text += `  💰 ${r.item}: ${r.qty}x (${r.stock} шт)\n`;
  });
  if (results.length > 10) text += `\n...и ещё ${results.length - 10}`;
  
  await ctx.reply(text);
}

// ═══════════════════ УСТРОЙСТВА ═══════════════════
bot.command('devices', async ctx => {
  const devices = deviceManager.getAll();
  if (!devices.length) return ctx.reply('💡 Нет устройств\n/adddevice ID название');
  let text = '💡 УСТРОЙСТВА\n━━━━━━━━━━━━━━━━━━━━\n\n';
  const btns = [];
  for (const d of devices) {
    const s = await deviceManager.getStatus(d.id);
    text += `${DEVICE_TYPES[d.type]?.emoji || '❓'} ${d.name} ${s?.value ? '🟢' : '🔴'}\n`;
    if (DEVICE_TYPES[d.type]?.canToggle) btns.push([{ text: `🟢 ${d.name}`, callback_data: `dev_on_${d.id}` }, { text: '🔴', callback_data: `dev_off_${d.id}` }]);
  }
  btns.push([{ text: '🔄', callback_data: 'menu_devices' }, { text: '◀️', callback_data: 'menu_main' }]);
  await ctx.reply(text, { reply_markup: { inline_keyboard: btns } });
});

bot.command('adddevice', ctx => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('/adddevice ID название');
  deviceManager.add(args[0], args.slice(1).join(' '), 1);
  ctx.reply(`✅ Добавлено: ${args.slice(1).join(' ')}`);
});
bot.command('removedevice', ctx => ctx.reply(deviceManager.remove(ctx.message.text.split(' ')[1]) ? '✅' : '❌'));
bot.command('on', async ctx => { const q = ctx.message.text.split(' ').slice(1).join(' '); const d = /^\d+$/.test(q) ? deviceManager.get(q) : deviceManager.findByName(q); if (!d) return ctx.reply('❌'); ctx.reply((await deviceManager.turnOn(d.id)).success ? `🟢 ${d.name}` : '❌'); });
bot.command('off', async ctx => { const q = ctx.message.text.split(' ').slice(1).join(' '); const d = /^\d+$/.test(q) ? deviceManager.get(q) : deviceManager.findByName(q); if (!d) return ctx.reply('❌'); ctx.reply((await deviceManager.turnOff(d.id)).success ? `🔴 ${d.name}` : '❌'); });

// ═══════════════════ ЧЕКЕР ═══════════════════
bot.command('check', async ctx => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) return ctx.reply('🔍 /check ник/steamid/ссылка');
  
  // Извлекаем SteamID из ссылки
  let q = query;
  const steamMatch = q.match(/steamcommunity\.com\/(?:profiles|id)\/([^\s\/]+)/i);
  if (steamMatch) q = steamMatch[1];
  
  await ctx.reply('🔍 Поиск...');
  
  // Если это SteamID
  if (/^\d{17}$/.test(q)) {
    return searchSteam(ctx, q);
  }
  
  // Пробуем как vanity URL
  const resolved = await steamService.resolveVanityUrl(q);
  if (resolved) {
    return searchSteam(ctx, resolved);
  }
  
  // Поиск по нику
  return searchByName(ctx, q);
});

// ═══════════════════ КАМЕРЫ ═══════════════════
bot.command('cam', async ctx => {
  const code = ctx.message.text.split(' ')[1]?.toUpperCase();
  if (!code) return ctx.reply('📷 /cam КОД\n\nOILRIG1, DOME1, AIRFIELD1, COMPOUND');
  await ctx.reply(`📷 ${code}...`);
  const frame = await rustPlus.getCameraFrame(code);
  if (!frame?.jpgImage) return ctx.reply('❌ Недоступно');
  await ctx.replyWithPhoto({ source: Buffer.from(frame.jpgImage) }, { caption: `📷 ${code}` });
});

// ═══════════════════ РЕЙД ═══════════════════
bot.command('raid', async ctx => {
  const args = ctx.message.text.split(' ').slice(1);
  if (!args.length) {
    const btns = Object.entries(CATEGORIES).filter(([k]) => k !== 'floors').map(([k, c]) => [{ text: c.name, callback_data: `raid_cat_${k}` }]);
    btns.push([{ text: '◀️', callback_data: 'menu_main' }]);
    return ctx.reply('💣 РЕЙД\n━━━━━━━━━━━━━━━━━━━━\n\n/raid предмет [кол-во]', { reply_markup: { inline_keyboard: btns } });
  }
  const info = getDestroyInfo(args[0], parseInt(args[1]) || 1);
  if (!info) return ctx.reply('❌ Не найдено');
  let text = `💣 ${info.name}${info.count > 1 ? ` x${info.count}` : ''}\n━━━━━━━━━━━━━━━━━━━━\n\n❤️ ${info.hp * info.count}\n\n`;
  info.methods.forEach(m => text += `• ${m.name}: ${m.amount} (🟡${m.sulfur.toLocaleString()})\n`);
  await ctx.reply(text);
});

// ═══════════════════ НАСТРОЙКИ ═══════════════════
async function showSettings(ctx, edit = false) {
  const n = settings.settings.notifications;
  const muted = settings.isMuted();
  
  let text = `⚙️ НАСТРОЙКИ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `🔔 ${muted ? '🔇 ВЫКЛ' : '🔊 ВКЛ'}\n\n`;
  text += `💀 Смерти: ${n.deaths ? '✅' : '❌'}\n`;
  text += `🟢 Входы: ${n.online ? '✅' : '❌'}\n`;
  text += `🔴 Выходы: ${n.offline ? '✅' : '❌'}\n`;
  text += `🚢 Cargo: ${n.cargo ? '✅' : '❌'}\n`;
  text += `🚁 Патрульный: ${n.heli ? '✅' : '❌'}\n`;
  text += `🛩 Chinook: ${n.chinook ? '✅' : '❌'}\n`;
  text += `📦 Crates: ${n.crate ? '✅' : '❌'}\n`;
  text += `🏪 Магазины: ${n.shops ? '✅' : '❌'}\n`;
  text += `💰 Продажи: ${n.shopSales ? '✅' : '❌'}\n`;
  text += `🌊 Магаз в воде: ${n.shopWater ? '✅' : '❌'}\n`;
  text += `🚨 Raid Alert: ${n.raidAlert ? '✅' : '❌'}`;
  
  const kb = { inline_keyboard: [
    [{ text: `💀${n.deaths ? '✅' : '❌'}`, callback_data: 'set_deaths' }, { text: `🟢${n.online ? '✅' : '❌'}`, callback_data: 'set_online' }, { text: `🔴${n.offline ? '✅' : '❌'}`, callback_data: 'set_offline' }],
    [{ text: `🚢${n.cargo ? '✅' : '❌'}`, callback_data: 'set_cargo' }, { text: `🚁${n.heli ? '✅' : '❌'}`, callback_data: 'set_heli' }, { text: `🛩${n.chinook ? '✅' : '❌'}`, callback_data: 'set_chinook' }],
    [{ text: `📦${n.crate ? '✅' : '❌'}`, callback_data: 'set_crate' }, { text: `🏪${n.shops ? '✅' : '❌'}`, callback_data: 'set_shops' }, { text: `💰${n.shopSales ? '✅' : '❌'}`, callback_data: 'set_shopSales' }],
    [{ text: `🌊${n.shopWater ? '✅' : '❌'}`, callback_data: 'set_shopWater' }, { text: `🚨${n.raidAlert ? '✅' : '❌'}`, callback_data: 'set_raidAlert' }],
    [{ text: muted ? '🔊 Вкл' : '🔇 Выкл', callback_data: 'set_mute' }],
    [{ text: '◀️', callback_data: 'menu_main' }]
  ]};
  edit ? await ctx.editMessageText(text, { reply_markup: kb }) : await ctx.reply(text, { reply_markup: kb });
}

bot.command('settings', ctx => showSettings(ctx));
bot.command('mute', ctx => { settings.mute(parseInt(ctx.message.text.split(' ')[1]) || null); ctx.reply('🔇'); });
bot.command('unmute', ctx => { settings.unmute(); ctx.reply('🔊'); });

// ═══════════════════ CALLBACKS ═══════════════════
bot.on('callback_query', async ctx => {
  const d = ctx.callbackQuery.data;
  try {
    if (d === 'cmd_team') { await ctx.answerCbQuery(); return sendTeam(ctx, true); }
    if (d === 'cmd_status') { await ctx.answerCbQuery(); return sendStatus(ctx, true); }
    if (d === 'cmd_events') { await ctx.answerCbQuery(); return sendEvents(ctx, true); }
    if (d === 'cmd_time') { await ctx.answerCbQuery(); return sendTime(ctx, true); }
    if (d === 'cmd_map') { await ctx.answerCbQuery(); return sendMap(ctx, true); }
    if (d === 'cmd_settings') { await ctx.answerCbQuery(); return showSettings(ctx, true); }
    if (d === 'menu_main') { await ctx.editMessageText('📋 Меню', { reply_markup: MAIN_MENU }); return ctx.answerCbQuery(); }
    if (d === 'menu_main_new') { await ctx.reply('📋 Меню', { reply_markup: MAIN_MENU }); return ctx.answerCbQuery(); }
    
    // Магазины
    if (d === 'menu_shops') { await ctx.answerCbQuery(); return sendShops(ctx, true, 0); }
    if (d.startsWith('shops_page_')) {
      const page = parseInt(d.replace('shops_page_', ''));
      await ctx.answerCbQuery();
      return sendShops(ctx, true, page);
    }
    if (d === 'noop') { return ctx.answerCbQuery(); }
    if (d === 'shop_search') {
      userState.set(ctx.chat.id, { action: 'shop_search' });
      await ctx.answerCbQuery();
      return ctx.reply('🔍 Введи название предмета:');
    }
    
    // Устройства
    if (d === 'menu_devices') {
      await ctx.answerCbQuery();
      const devices = deviceManager.getAll();
      if (!devices.length) return ctx.editMessageText('💡 Нет устройств\n/adddevice ID название', { reply_markup: { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_main' }]] } });
      let text = '💡 УСТРОЙСТВА\n━━━━━━━━━━━━━━━━━━━━\n\n';
      const btns = [];
      for (const dev of devices) {
        const s = await deviceManager.getStatus(dev.id);
        text += `${DEVICE_TYPES[dev.type]?.emoji || '❓'} ${dev.name} ${s?.value ? '🟢' : '🔴'}\n`;
        if (DEVICE_TYPES[dev.type]?.canToggle) btns.push([{ text: `🟢 ${dev.name}`, callback_data: `dev_on_${dev.id}` }, { text: '🔴', callback_data: `dev_off_${dev.id}` }]);
      }
      btns.push([{ text: '🔄', callback_data: 'menu_devices' }, { text: '◀️', callback_data: 'menu_main' }]);
      return ctx.editMessageText(text, { reply_markup: { inline_keyboard: btns } });
    }
    if (d.startsWith('dev_on_')) { const r = await deviceManager.turnOn(d.replace('dev_on_', '')); return ctx.answerCbQuery(r.success ? '🟢' : '❌'); }
    if (d.startsWith('dev_off_')) { const r = await deviceManager.turnOff(d.replace('dev_off_', '')); return ctx.answerCbQuery(r.success ? '🔴' : '❌'); }
    
    // Камеры
    if (d === 'menu_cameras') {
      const btns = [[{ text: '🛢 OILRIG1', callback_data: 'cam_OILRIG1' }, { text: '🛢 OILRIG2', callback_data: 'cam_OILRIG2' }],
        [{ text: '🏭 DOME1', callback_data: 'cam_DOME1' }, { text: '✈️ AIRFIELD1', callback_data: 'cam_AIRFIELD1' }],
        [{ text: '🏪 COMPOUND', callback_data: 'cam_COMPOUND' }, { text: '🚀 LAUNCH1', callback_data: 'cam_LAUNCHSITE1' }],
        [{ text: '◀️', callback_data: 'menu_main' }]];
      await ctx.editMessageText('📷 КАМЕРЫ', { reply_markup: { inline_keyboard: btns } });
      return ctx.answerCbQuery();
    }
    if (d.startsWith('cam_')) {
      const code = d.replace('cam_', '');
      await ctx.answerCbQuery(`📷 ${code}`);
      const f = await rustPlus.getCameraFrame(code);
      if (!f?.jpgImage) return ctx.reply('❌');
      return ctx.replyWithPhoto({ source: Buffer.from(f.jpgImage) }, { caption: `📷 ${code}` });
    }
    
    // Рейд
    if (d === 'menu_raid') {
      const btns = Object.entries(CATEGORIES).filter(([k]) => k !== 'floors').map(([k, c]) => [{ text: c.name, callback_data: `raid_cat_${k}` }]);
      btns.push([{ text: '◀️', callback_data: 'menu_main' }]);
      await ctx.editMessageText('💣 РЕЙД', { reply_markup: { inline_keyboard: btns } });
      return ctx.answerCbQuery();
    }
    if (d.startsWith('raid_cat_')) {
      const cat = CATEGORIES[d.replace('raid_cat_', '')];
      if (!cat) return ctx.answerCbQuery('❌');
      const btns = cat.items.map(k => [{ text: STRUCTURES[k].name, callback_data: `raid_${k}` }]);
      btns.push([{ text: '◀️', callback_data: 'menu_raid' }]);
      await ctx.editMessageText(`💣 ${cat.name}`, { reply_markup: { inline_keyboard: btns } });
      return ctx.answerCbQuery();
    }
    if (d.startsWith('raid_x_')) {
      const parts = d.replace('raid_x_', '').split('_');
      const count = parseInt(parts.pop());
      const itemKey = parts.join('_');
      const info = getDestroyInfo(itemKey, count);
      if (!info) return ctx.answerCbQuery('❌');
      let text = `💣 ${info.name} x${count}\n━━━━━━━━━━━━━━━━━━━━\n\n❤️ ${(info.hp * count).toLocaleString()}\n\n`;
      info.methods.forEach(m => text += `• ${m.name}: ${m.amount} (🟡${m.sulfur.toLocaleString()})\n`);
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: [[{ text: '◀️', callback_data: `raid_${itemKey}` }]] } });
      return ctx.answerCbQuery();
    }
    if (d.startsWith('raid_')) {
      const itemKey = d.replace('raid_', '');
      const info = getDestroyInfo(itemKey, 1);
      if (!info) return ctx.answerCbQuery('❌');
      let text = `💣 ${info.name}\n━━━━━━━━━━━━━━━━━━━━\n\n❤️ ${info.hp}\n\n`;
      info.methods.forEach(m => text += `• ${m.name}: ${m.amount} (🟡${m.sulfur.toLocaleString()})\n`);
      const btns = [[{ text: 'x1', callback_data: `raid_x_${itemKey}_1` }, { text: 'x2', callback_data: `raid_x_${itemKey}_2` }, { text: 'x4', callback_data: `raid_x_${itemKey}_4` }], [{ text: '◀️', callback_data: 'menu_raid' }]];
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: btns } });
      return ctx.answerCbQuery();
    }
    
    // Настройки
    if (d.startsWith('set_')) {
      const key = d.replace('set_', '');
      if (key === 'mute') { settings.isMuted() ? settings.unmute() : settings.mute(); await ctx.answerCbQuery(settings.isMuted() ? '🔇' : '🔊'); }
      else { const v = settings.toggle(`notifications.${key}`); await ctx.answerCbQuery(v ? '✅' : '❌'); }
      return showSettings(ctx, true);
    }
    
    // BattleMetrics
    if (d.startsWith('bm_player_')) {
      const playerId = d.replace('bm_player_', '');
      await ctx.answerCbQuery('🔍');
      return showBMPlayer(ctx, playerId);
    }
    if (d.startsWith('bm_refresh_')) {
      const playerId = d.replace('bm_refresh_', '');
      await ctx.answerCbQuery('🔄');
      return showBMPlayer(ctx, playerId, true);
    }
    if (d.startsWith('bm_name_')) {
      const name = decodeURIComponent(d.replace('bm_name_', ''));
      await ctx.answerCbQuery('🔍');
      return searchByName(ctx, name);
    }
    
    // Админ функции
    if (d.startsWith('approve_')) {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      const userId = d.replace('approve_', '');
      const result = accessControl.approveUser(userId, ctx.from.id);
      if (result.success) {
        await ctx.editMessageText('✅ Пользователь одобрен');
        try {
          await bot.telegram.sendMessage(userId, '✅ Ваш запрос одобрен! Теперь вы можете пользоваться ботом.');
        } catch (e) {}
      }
      return ctx.answerCbQuery('✅ Одобрено');
    }
    
    if (d.startsWith('reject_')) {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      const userId = d.replace('reject_', '');
      accessControl.rejectUser(userId);
      await ctx.editMessageText('❌ Запрос отклонён');
      try {
        await bot.telegram.sendMessage(userId, '❌ Ваш запрос отклонён администратором.');
      } catch (e) {}
      return ctx.answerCbQuery('❌ Отклонено');
    }
    
    if (d === 'admin_users') {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      const users = accessControl.getAllUsers().filter(u => u.approved);
      let text = `👥 ПОЛЬЗОВАТЕЛИ (${users.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      users.slice(0, 10).forEach((u, i) => {
        text += `${i + 1}. ${u.firstName} (@${u.username})\n`;
      });
      if (users.length > 10) text += `\n...и ещё ${users.length - 10}`;
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]] } });
      return ctx.answerCbQuery();
    }
    
    if (d === 'admin_requests') {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      const pending = accessControl.getPendingRequests();
      let text = `⏳ ЗАПРОСЫ (${pending.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      if (!pending.length) {
        text += 'Нет ожидающих запросов';
      } else {
        pending.slice(0, 5).forEach((req, i) => {
          text += `${i + 1}. ${req.firstName} (@${req.username})\nID: ${req.userId}\n\n`;
        });
      }
      const btns = pending.length ? pending.slice(0, 3).map(req => [
        { text: `✅ ${req.firstName}`, callback_data: `approve_${req.userId}` },
        { text: '❌', callback_data: `reject_${req.userId}` }
      ]) : [];
      btns.push([{ text: '◀️ Назад', callback_data: 'admin_back' }]);
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: btns } });
      return ctx.answerCbQuery();
    }
    
    if (d === 'admin_logs') {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      try {
        const fs = await import('fs');
        if (fs.existsSync('usage.log')) {
          const logs = fs.readFileSync('usage.log', 'utf8').split('\n').slice(-20).join('\n');
          await ctx.editMessageText(`📊 ПОСЛЕДНИЕ ЛОГИ\n━━━━━━━━━━━━━━━━━━━━\n\n${logs}`, { reply_markup: { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]] } });
        } else {
          await ctx.editMessageText('📊 Логи пусты', { reply_markup: { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]] } });
        }
      } catch (e) {
        await ctx.editMessageText('❌ Ошибка чтения логов', { reply_markup: { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'admin_back' }]] } });
      }
      return ctx.answerCbQuery();
    }
    
    if (d === 'admin_back') {
      if (!accessControl.isAdmin(ctx.from.id)) return ctx.answerCbQuery('🚫 Только для админа');
      const stats = accessControl.getStats();
      const pending = accessControl.getPendingRequests();
      
      let text = `👑 АДМИН ПАНЕЛЬ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📊 Статистика:\n`;
      text += `✅ Одобрено: ${stats.approved}\n`;
      text += `⏳ Ожидает: ${stats.pending}\n`;
      text += `🚫 Заблокировано: ${stats.blocked}\n`;
      text += `👥 Всего: ${stats.total}\n\n`;
      
      if (pending.length) {
        text += `⏳ Ожидающие запросы:\n`;
        pending.slice(0, 5).forEach((req, i) => {
          text += `${i + 1}. ${req.firstName} (@${req.username})\n`;
        });
      }
      
      const btns = {
        inline_keyboard: [
          [{ text: '👥 Пользователи', callback_data: 'admin_users' }],
          [{ text: '📋 Запросы', callback_data: 'admin_requests' }],
          [{ text: '📊 Логи', callback_data: 'admin_logs' }]
        ]
      };
      
      await ctx.editMessageText(text, { reply_markup: btns });
      return ctx.answerCbQuery();
    }
    
    await ctx.answerCbQuery();
  } catch (e) { console.error('[TG] CB:', e.message); await ctx.answerCbQuery('❌'); }
});

// ═══════════════════ TEXT HANDLER ═══════════════════
bot.on('text', async ctx => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return;
  
  try {
    const chatId = ctx.chat.id;
    const state = userState.get(chatId);
    
    // Поиск по магазинам
    if (state?.action === 'shop_search') {
      userState.delete(chatId);
      return searchShopItem(ctx, text.toLowerCase());
    }
    
    // BattleMetrics выбор
    const cache = bmCache.get(chatId);
    if (cache && /^\d+$/.test(text)) {
      const num = parseInt(text) - 1;
      if (num >= 0 && num < cache.length) {
        bmCache.delete(chatId);
        return showBMPlayer(ctx, cache[num].id);
      }
    }
    
    // Steam ID
    if (/^\d{17}$/.test(text)) return searchSteam(ctx, text);
    const steamMatch = text.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (steamMatch) return searchSteam(ctx, steamMatch[1]);
    const vanityMatch = text.match(/steamcommunity\.com\/id\/([^\/\s]+)/);
    if (vanityMatch) {
      await ctx.reply('🔍...');
      const steamId = await steamService.resolveVanityUrl(vanityMatch[1]);
      return steamId ? searchSteam(ctx, steamId) : ctx.reply('❌');
    }
    
    // BattleMetrics URL
    const bmMatch = text.match(/battlemetrics\.com\/players\/(\d+)/);
    if (bmMatch) return showBMPlayer(ctx, bmMatch[1]);
    
    // Поиск по имени
    if (text.length >= 2 && text.length <= 32 && !/^[\d\s]+$/.test(text)) {
      return searchByName(ctx, text);
    }
  } catch (e) { console.error('[TG] Text:', e.message); }
});

async function searchSteam(ctx, steamId) {
  await ctx.reply('🔍 Загрузка Steam...');
  const p = await steamService.getFullProfile(steamId);
  if (p.error) return ctx.reply(`❌ ${p.error}`);
  
  let text = `👤 ${p.name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `${p.status}\n`;
  text += `👁 ${p.visibility}\n`;
  
  if (p.created) {
    const years = Math.floor((Date.now() - p.created.getTime()) / (365 * 24 * 60 * 60 * 1000));
    text += `📅 Аккаунт: ${years} лет\n`;
  }
  
  if (p.country) text += `🌍 ${p.country}\n`;
  
  text += '\n';
  
  // Rust часы
  if (p.rustHours?.hasRust) {
    text += `🎮 Rust: ${p.rustHours.hours}h всего\n`;
    if (p.rustHours.hours2weeks > 0) {
      text += `📊 За 2 недели: ${p.rustHours.hours2weeks}h\n`;
    }
  } else {
    text += `🎮 Rust: скрыт/нет\n`;
  }
  
  // Баны (только game ban)
  if (p.bans?.gameBans > 0) {
    text += `\n⛔ Game бан: ${p.bans.gameBans}x\n`;
  }
  
  // Рейтинг доверия
  if (p.analysis) {
    text += `\n${p.analysis.trustLevel} (${p.analysis.trustScore}/100)\n`;
    if (p.analysis.flags.length) {
      text += p.analysis.flags.slice(0, 3).join('\n');
    }
  }
  
  const btns = [
    [{ text: '🔗 Steam', url: p.profileUrl }],
    [{ text: '🔍 BattleMetrics', callback_data: `bm_name_${encodeURIComponent(p.name)}` }]
  ];
  
  if (p.avatar) {
    await ctx.replyWithPhoto(p.avatar, { caption: text, reply_markup: { inline_keyboard: btns } });
  } else {
    await ctx.reply(text, { reply_markup: { inline_keyboard: btns } });
  }
}

async function searchByName(ctx, name) {
  await ctx.reply('🔍 Поиск...');
  
  const results = await battleMetricsService.searchPlayer(name, 30);
  if (results.error || !results.length) return ctx.reply('❌ Не найдено');
  
  // Строгая фильтрация - только точное совпадение символов
  const filtered = results.filter(p => {
    // 1. Точное совпадение
    if (p.name === name) return true;
    
    // 2. Длина должна быть точно такой же
    if (p.name.length !== name.length) return false;
    
    // 3. Символы должны совпадать 1 в 1 (только регистр может отличаться)
    if (p.name.toLowerCase() === name.toLowerCase()) return true;
    
    return false;
  });
  
  let list = filtered.slice(0, 6);
  if (!list.length) return ctx.reply('❌ Не найдено');
  
  bmCache.set(ctx.chat.id, list);
  
  let text = `🎮 ПОИСК: ${name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  list.forEach((p, i) => {
    const status = p.private ? '🔒' : '👤';
    const url = battleMetricsService.getPlayerUrl(p.id);
    text += `${i + 1}. ${status} <a href="${url}">${escapeHtml(p.name)}</a>\n`;
  });
  
  text += '\nНажми номер для подробностей';
  
  // Только кнопки с номерами
  const numBtns = list.map((p, i) => ({ text: `${i + 1}`, callback_data: `bm_player_${p.id}` }));
  
  await ctx.reply(text, { 
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [numBtns] } 
  });
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function showBMPlayer(ctx, playerId, edit = false) {
  if (!edit) await ctx.reply('🔍 Загрузка BM...');
  
  const p = await battleMetricsService.getPlayer(playerId);
  if (p.error) return edit ? ctx.editMessageText(`❌ ${p.error}`) : ctx.reply(`❌ ${p.error}`);
  
  let text = `🎮 ${p.name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += p.isOnline ? '🟢 ОНЛАЙН\n' : '🔴 Оффлайн\n';
  
  if (p.lastSeen) {
    const ago = Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 60000);
    if (ago < 60) {
      text += `⏱ ${ago}м назад\n`;
    } else if (ago < 1440) {
      text += `⏱ ${Math.floor(ago / 60)}ч назад\n`;
    } else {
      text += `⏱ ${Math.floor(ago / 1440)}д назад\n`;
    }
  }
  
  if (p.currentServer) {
    text += `\n🎮 ${p.currentServer.name.substring(0, 35)}\n`;
    text += `👥 ${p.currentServer.players}/${p.currentServer.maxPlayers}\n`;
    if (p.currentServer.rank) text += `📊 Ранг: #${p.currentServer.rank}\n`;
  }
  
  const btns = [
    [{ text: `🔗 ${p.name}`, url: battleMetricsService.getPlayerUrl(playerId) }],
    [{ text: '🔄 Обновить', callback_data: `bm_refresh_${playerId}` }]
  ];
  
  if (edit) {
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: btns } });
  } else {
    await ctx.reply(text, { reply_markup: { inline_keyboard: btns } });
  }
}

// ═══════════════════ УВЕДОМЛЕНИЯ ═══════════════════
async function send(text) { if (!CHAT_ID || settings.isMuted()) return; try { await bot.telegram.sendMessage(CHAT_ID, text); } catch {} }

function subscribe() {
  eventBus.on(EVENTS.PLAYER_DEATH, d => settings.get('notifications.deaths') && send(`💀 ${d.name} погиб\n📍 ${d.grid}`));
  eventBus.on(EVENTS.PLAYER_ONLINE, d => settings.get('notifications.online') && send(`🟢 ${d.name} зашёл`));
  eventBus.on(EVENTS.PLAYER_OFFLINE, d => settings.get('notifications.offline') && send(`🔴 ${d.name} вышел`));
  eventBus.on(EVENTS.CARGO_SPAWN, d => settings.get('notifications.cargo') && send(`🚢 CARGO — ${d.grid}`));
  eventBus.on(EVENTS.CARGO_DESPAWN, () => settings.get('notifications.cargo') && send(`🚢 Cargo ушёл`));
  eventBus.on(EVENTS.HELI_SPAWN, d => settings.get('notifications.heli') && send(`🚁 ПАТРУЛЬНЫЙ — ${d.grid}`));
  eventBus.on(EVENTS.HELI_DESPAWN, () => settings.get('notifications.heli') && send(`🚁 Патрульный сбит`));
  eventBus.on(EVENTS.CHINOOK_SPAWN, d => settings.get('notifications.chinook') && send(`🛩 ГРУЗОВОЙ — ${d.grid}`));
  eventBus.on(EVENTS.CRATE_SPAWN, d => settings.get('notifications.crate') && send(`📦 CRATE — ${d.grid}`));
  eventBus.on(EVENTS.RAID_ALERT, () => settings.get('notifications.raidAlert') && send(`🚨🚨🚨 RAID ALERT! 🚨🚨🚨`));
  
  // Магазины (группированные)
  eventBus.on(EVENTS.SHOP_NEW, d => {
    if (!settings.get('notifications.shops')) return;
    if (d.count > 1) {
      send(`🏪 Новые магазины (${d.count})\n📍 ${d.grids}`);
    } else {
      send(`🏪 Новый магазин — ${d.grid}\n${d.name || ''}`);
    }
  });
  
  eventBus.on(EVENTS.SHOP_GONE, d => {
    if (!settings.get('notifications.shops')) return;
    if (d.count > 1) {
      send(`🏪❌ Магазины закрылись (${d.count})`);
    } else {
      send(`🏪❌ Магазин закрылся — ${d.grid}`);
    }
  });
  
  eventBus.on(EVENTS.SHOP_SOLD, d => {
    if (!settings.get('notifications.shopSales')) return;
    if (d.grouped) {
      let text = `💰 Продажи (${d.count})\n`;
      for (const sale of d.sales.slice(0, 5)) {
        text += `• ${sale.item} x${sale.amount} — ${sale.grid}\n`;
      }
      if (d.count > 5) text += `...и ещё ${d.count - 5}`;
      send(text);
    } else {
      send(`💰 Продажа — ${d.grid}\n${d.item} x${d.amount}`);
    }
  });
  
  eventBus.on(EVENTS.SHOP_WATER, d => {
    if (!settings.get('notifications.shopWater')) return;
    send(`⚠️ МАГАЗИН В ВОДЕ\n📍 ${d.grid}\n${d.name || 'Vending Machine'}`);
  });
  
  eventBus.on(EVENTS.CONNECTED, () => send('✅ Бот подключён'));
  eventBus.on(EVENTS.DISCONNECTED, () => send('❌ Бот отключён'));
}

class TelegramNotifier {
  init() {
    console.log('[Telegram] ═══════════════════════════════════════');
    subscribe();
    bot.launch({ dropPendingUpdates: true }).then(() => console.log('[Telegram] ✅ Запущен')).catch(e => {
      if (!e.message.includes('ECONNRESET') && !e.message.includes('ETIMEDOUT')) {
        console.error('[Telegram] ❌', e.message);
      }
    });
    console.log('[Telegram] ═══════════════════════════════════════');
  }
  send(text) { return send(text); }
}

export default new TelegramNotifier();
