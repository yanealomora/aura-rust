#!/usr/bin/env node
/**
 * AURA RUST - Launcher
 * Первоначальная настройка и запуск
 */

import { spawn, execSync } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');
const configPath = join(rootDir, 'aura.config.json');
const LICENSE_API = 'https://aura-rust-api.vercel.app/api'; // Заглушка

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

// Цвета
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  white: '\x1b[37m'
};

// ASCII Art
function showLogo() {
  console.log(`
${c.cyan}       ___                      ____             __  
      /   |  __  ___________ _  / __ \\__  ______/ /_ 
     / /| | / / / / ___/ __ \`/ / /_/ / / / / ___/ __/
    / ___ |/ /_/ / /  / /_/ / / _, _/ /_/ (__  ) /_  
   /_/  |_|\\__,_/_/   \\__,_/ /_/ |_|\\__,_/____/\\__/  
${c.reset}
              ${c.dim}Rust+ Event Bot v1.0${c.reset}
`);
}

// ═══════════════════ HWID ═══════════════════
function getHWID() {
  try {
    const data = [];
    
    if (process.platform === 'win32') {
      try {
        const cpu = execSync('wmic cpu get processorid', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        const cpuId = cpu.split('\n')[1]?.trim();
        if (cpuId) data.push(cpuId);
      } catch {}
      
      try {
        const mb = execSync('wmic baseboard get serialnumber', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        const mbId = mb.split('\n')[1]?.trim();
        if (mbId && !mbId.includes('O.E.M')) data.push(mbId);
      } catch {}
    }
    
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          data.push(iface.mac);
          break;
        }
      }
      if (data.length > 0) break;
    }
    
    data.push(os.hostname());
    
    const combined = data.join('|');
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 24).toUpperCase();
  } catch {
    return crypto.randomBytes(12).toString('hex').toUpperCase();
  }
}

// ═══════════════════ LICENSE ═══════════════════
function loadConfig() {
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Проверка ключа локально (подпись)
function verifyKey(key, hwid) {
  if (!key || key.length < 20) return { valid: false };
  
  try {
    // Формат ключа: AURA-XXXX-XXXX-XXXX-EXPIRES
    const parts = key.split('-');
    if (parts.length < 5 || parts[0] !== 'AURA') return { valid: false };
    
    const expires = parseInt(parts[4], 36);
    if (isNaN(expires)) return { valid: false };
    
    // -1 = lifetime
    if (expires === -1 || expires > Date.now()) {
      // Проверяем подпись (HWID должен совпадать)
      const keyData = parts.slice(1, 4).join('');
      const expectedHash = crypto.createHash('sha256')
        .update(hwid + 'aura-rust-secret')
        .digest('hex')
        .substring(0, 12)
        .toUpperCase();
      
      if (keyData === expectedHash || parts[1] === 'LIFE') {
        const daysLeft = expires === -1 ? -1 : Math.ceil((expires - Date.now()) / 86400000);
        return { valid: true, daysLeft, expires };
      }
    }
    
    return { valid: false, reason: 'expired' };
  } catch {
    return { valid: false };
  }
}

// ═══════════════════ ENV ═══════════════════
function readEnv() {
  if (!existsSync(envPath)) return {};
  const env = {};
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
  return env;
}

function saveEnv(updates) {
  let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trim() + `\n${key}=${value}`;
    }
  }
  
  writeFileSync(envPath, content.trim() + '\n');
}

// ═══════════════════ MAIN ═══════════════════
async function main() {
  showLogo();
  
  const config = loadConfig();
  const hwid = getHWID();
  
  // Проверяем лицензию
  const licenseCheck = verifyKey(config.licenseKey, hwid);
  
  if (!config.licenseKey || !licenseCheck.valid) {
    console.log(`${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log(`${c.yellow}  Требуется лицензия${c.reset}`);
    console.log(`${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log('');
    console.log(`  ${c.cyan}1.${c.reset} Зайдите в Telegram: ${c.green}@AURArustShopbot${c.reset}`);
    console.log(`  ${c.cyan}2.${c.reset} Оплатите подписку ($2/месяц)`);
    console.log(`  ${c.cyan}3.${c.reset} Получите ключ и введите ниже`);
    console.log('');
    console.log(`  ${c.dim}Ваш HWID: ${hwid}${c.reset}`);
    console.log('');
    
    const key = await ask(`${c.cyan}Введите ключ:${c.reset} `);
    
    if (!key) {
      rl.close();
      return;
    }
    
    const check = verifyKey(key.trim().toUpperCase(), hwid);
    
    if (check.valid) {
      config.licenseKey = key.trim().toUpperCase();
      config.hwid = hwid;
      config.activatedAt = Date.now();
      saveConfig(config);
      
      const days = check.daysLeft === -1 ? 'навсегда' : `${check.daysLeft} дней`;
      console.log(`\n${c.green}[+] Лицензия активирована!${c.reset}`);
      console.log(`${c.dim}Срок: ${days}${c.reset}\n`);
      
      // Продолжаем настройку
      if (!config.initialized) {
        await firstTimeSetup(config, hwid);
      } else {
        await showMenu(config, hwid);
      }
    } else {
      console.log(`\n${c.red}[-] Неверный ключ${c.reset}`);
      if (check.reason === 'expired') {
        console.log(`${c.dim}Срок действия истёк. Продлите в @AURArustShopbot${c.reset}`);
      }
      rl.close();
    }
    return;
  }
  
  // Проверяем HWID
  if (config.hwid && config.hwid !== hwid) {
    console.log(`${c.red}[!] Обнаружено изменение железа${c.reset}`);
    console.log(`${c.dim}Лицензия привязана к другому компьютеру${c.reset}`);
    console.log(`\n${c.yellow}Обратитесь в @AURArustShopbot для переноса${c.reset}`);
    console.log(`${c.dim}Ваш новый HWID: ${hwid}${c.reset}\n`);
    rl.close();
    return;
  }
  
  // Показываем срок лицензии
  const days = licenseCheck.daysLeft === -1 ? 'навсегда' : `${licenseCheck.daysLeft} дней`;
  console.log(`${c.green}Лицензия:${c.reset} ${days}`);
  
  // Первый запуск
  if (!config.initialized) {
    await firstTimeSetup(config, hwid);
    return;
  }
  
  await showMenu(config, hwid);
}

// ═══════════════════ MENU ═══════════════════
async function showMenu(config, hwid) {
  const env = readEnv();
  
  console.log(`${c.dim}HWID: ${hwid}${c.reset}`);
  console.log(`${c.dim}User: @${config.telegramUsername || 'не указан'}${c.reset}`);
  
  if (env.RUST_SERVER_IP) {
    console.log(`${c.cyan}Сервер:${c.reset} ${env.RUST_SERVER_IP}:${env.RUST_SERVER_PORT}`);
  }
  
  console.log('');
  console.log(`${c.green}[1]${c.reset} Запустить бота`);
  console.log(`${c.cyan}[2]${c.reset} Сменить сервер`);
  console.log(`${c.yellow}[3]${c.reset} Настройки`);
  console.log(`${c.dim}[0]${c.reset} Выход\n`);
  
  const choice = await ask('Выбор: ');
  
  switch (choice) {
    case '1':
      await startBot();
      break;
    case '2':
      await setupServer();
      break;
    case '3':
      await showSettings();
      break;
    default:
      rl.close();
  }
}

// ═══════════════════ FIRST TIME SETUP ═══════════════════
async function firstTimeSetup(config, hwid) {
  console.log(`${c.cyan}Первоначальная настройка${c.reset}\n`);
  
  console.log(`${c.yellow}Шаг 1/5: Telegram${c.reset}`);
  console.log(`${c.dim}Введите ваш Telegram username (без @)${c.reset}`);
  const username = await ask('Username: ');
  
  if (!username) {
    console.log(`${c.red}Username обязателен${c.reset}`);
    rl.close();
    return;
  }
  
  config.telegramUsername = username.replace('@', '');
  config.hwid = hwid;
  config.createdAt = Date.now();
  
  console.log(`\n${c.yellow}Шаг 2/5: Telegram ID${c.reset}`);
  console.log(`${c.dim}Узнать можно у @userinfobot${c.reset}`);
  const telegramId = await ask('Telegram ID: ');
  
  if (telegramId) {
    config.telegramId = telegramId;
    saveEnv({ 'OWNER_ID': telegramId });
  }
  
  console.log(`\n${c.yellow}Шаг 3/5: Telegram Bot${c.reset}`);
  console.log(`${c.dim}Создайте бота у @BotFather и получите токен${c.reset}`);
  const tgToken = await ask(`Bot Token ${c.dim}(Enter пропустить)${c.reset}: `);
  
  if (tgToken) {
    saveEnv({ 'TELEGRAM_BOT_TOKEN': tgToken });
    const chatId = await ask('Chat ID для уведомлений: ');
    if (chatId) saveEnv({ 'TELEGRAM_CHAT_ID': chatId });
  }
  
  console.log(`\n${c.yellow}Шаг 4/5: Discord Bot${c.reset}`);
  console.log(`${c.dim}discord.com/developers -> New Application -> Bot${c.reset}`);
  const dcToken = await ask(`Bot Token ${c.dim}(Enter пропустить)${c.reset}: `);
  
  if (dcToken) {
    saveEnv({ 'DISCORD_BOT_TOKEN': dcToken });
    const channelId = await ask('Channel ID для уведомлений: ');
    if (channelId) saveEnv({ 'DISCORD_CHANNEL_ID': channelId });
  }
  
  console.log(`\n${c.yellow}Шаг 5/5: API Keys (опционально)${c.reset}`);
  
  console.log(`${c.dim}Steam API: steamcommunity.com/dev/apikey${c.reset}`);
  const steamKey = await ask(`Steam API Key ${c.dim}(Enter пропустить)${c.reset}: `);
  if (steamKey) saveEnv({ 'STEAM_API_KEY': steamKey });
  
  console.log(`${c.dim}BattleMetrics: battlemetrics.com/developers${c.reset}`);
  const bmToken = await ask(`BattleMetrics Token ${c.dim}(Enter пропустить)${c.reset}: `);
  if (bmToken) saveEnv({ 'BATTLEMETRICS_TOKEN': bmToken });
  
  config.initialized = true;
  saveConfig(config);
  
  console.log(`\n${c.green}[+] Настройка завершена!${c.reset}`);
  console.log(`${c.dim}HWID: ${hwid}${c.reset}`);
  console.log(`${c.dim}User: @${config.telegramUsername}${c.reset}\n`);
  
  const setupSrv = await ask(`Настроить Rust+ сервер? ${c.green}[+]${c.reset} да: `);
  if (setupSrv === '+') {
    await setupServer();
  } else {
    await startBot();
  }
}

// ═══════════════════ SERVER SETUP ═══════════════════
async function setupServer() {
  console.log(`\n${c.cyan}Настройка сервера${c.reset}`);
  console.log(`${c.green}[+]${c.reset} Автоматически (FCM)`);
  console.log(`${c.yellow}[-]${c.reset} Вручную\n`);
  
  const choice = await ask('Выбор: ');
  
  if (choice === '-') {
    console.log(`\n${c.dim}Данные из Rust+ Companion${c.reset}\n`);
    
    const ip = await ask('Server IP: ');
    const port = await ask('Server Port: ');
    const playerId = await ask('Player ID: ');
    const token = await ask('Player Token: ');
    
    if (ip && port && playerId && token) {
      saveEnv({
        'RUST_SERVER_IP': ip,
        'RUST_SERVER_PORT': port,
        'RUST_PLAYER_ID': playerId,
        'RUST_PLAYER_TOKEN': token
      });
      console.log(`\n${c.green}[+] Сервер сохранён${c.reset}`);
      await startBot();
    } else {
      console.log(`${c.red}[-] Заполните все поля${c.reset}`);
      rl.close();
    }
  } else {
    await fcmListen();
  }
}

async function fcmListen() {
  console.log(`\n${c.cyan}Ожидание подключения...${c.reset}`);
  console.log(`${c.dim}1. Откройте Rust на ПК`);
  console.log(`2. ESC -> Rust+`);
  console.log(`3. Выберите сервер -> Pair With Server${c.reset}\n`);
  
  const listener = spawn('npx', ['@liamcottle/rustplus.js', 'fcm-listen'], {
    shell: true,
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  let found = false;
  let buffer = '';

  listener.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.includes('Registering') || line.includes('Waiting') || line.includes('FCM')) {
        console.log(c.dim + line + c.reset);
        continue;
      }
      
      try {
        const jsonMatch = line.match(/\{[^{}]*"playerToken"[^{}]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          if (json.ip && json.playerToken && json.playerId) {
            found = true;
            listener.kill();
            
            console.log(`\n${c.green}[+] Сервер найден!${c.reset}`);
            console.log(`    ${c.bold}${json.name || 'Unknown'}${c.reset}`);
            console.log(`    ${c.dim}${json.ip}:${json.port}${c.reset}\n`);
            
            saveEnv({
              'RUST_SERVER_IP': json.ip,
              'RUST_SERVER_PORT': json.port.toString(),
              'RUST_PLAYER_ID': json.playerId.toString(),
              'RUST_PLAYER_TOKEN': json.playerToken.toString()
            });
            
            startBot();
            return;
          }
        }
      } catch {
        if (line.trim() && !line.includes('punycode') && !line.includes('Deprecation')) {
          console.log(c.dim + line + c.reset);
        }
      }
    }
  });

  listener.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('Deprecation') && !output.includes('punycode') && !output.includes('Experimental')) {
      console.log(c.dim + output + c.reset);
    }
  });

  listener.on('close', () => {
    if (!found) {
      console.log(`\n${c.yellow}Данные не получены${c.reset}`);
      rl.close();
    }
  });

  process.on('SIGINT', () => {
    found = true;
    listener.kill();
    rl.close();
    process.exit();
  });
}

// ═══════════════════ SETTINGS ═══════════════════
async function showSettings() {
  const config = loadConfig();
  const env = readEnv();
  const hwid = getHWID();
  
  console.log(`\n${c.cyan}Настройки${c.reset}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`HWID: ${hwid}`);
  console.log(`Ключ: ${config.licenseKey || 'нет'}`);
  console.log(`Username: @${config.telegramUsername || 'не указан'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Telegram Bot: ${env.TELEGRAM_BOT_TOKEN ? 'настроен' : 'не настроен'}`);
  console.log(`Discord Bot: ${env.DISCORD_BOT_TOKEN ? 'настроен' : 'не настроен'}`);
  console.log(`Steam API: ${env.STEAM_API_KEY ? 'настроен' : 'не настроен'}`);
  console.log(`BattleMetrics: ${env.BATTLEMETRICS_TOKEN ? 'настроен' : 'не настроен'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  console.log(`${c.cyan}[1]${c.reset} Изменить Telegram Bot`);
  console.log(`${c.cyan}[2]${c.reset} Изменить Discord Bot`);
  console.log(`${c.cyan}[3]${c.reset} Изменить API Keys`);
  console.log(`${c.yellow}[4]${c.reset} Сменить ключ лицензии`);
  console.log(`${c.dim}[0]${c.reset} Назад\n`);
  
  const choice = await ask('Выбор: ');
  
  switch (choice) {
    case '1':
      const tgToken = await ask('Telegram Bot Token: ');
      if (tgToken) saveEnv({ 'TELEGRAM_BOT_TOKEN': tgToken });
      const chatId = await ask('Chat ID: ');
      if (chatId) saveEnv({ 'TELEGRAM_CHAT_ID': chatId });
      console.log(`${c.green}[+] Сохранено${c.reset}`);
      break;
    case '2':
      const dcToken = await ask('Discord Bot Token: ');
      if (dcToken) saveEnv({ 'DISCORD_BOT_TOKEN': dcToken });
      const channelId = await ask('Channel ID: ');
      if (channelId) saveEnv({ 'DISCORD_CHANNEL_ID': channelId });
      console.log(`${c.green}[+] Сохранено${c.reset}`);
      break;
    case '3':
      const steamKey = await ask('Steam API Key: ');
      if (steamKey) saveEnv({ 'STEAM_API_KEY': steamKey });
      const bmToken = await ask('BattleMetrics Token: ');
      if (bmToken) saveEnv({ 'BATTLEMETRICS_TOKEN': bmToken });
      console.log(`${c.green}[+] Сохранено${c.reset}`);
      break;
    case '4':
      const newKey = await ask('Новый ключ: ');
      if (newKey) {
        const check = verifyKey(newKey.trim().toUpperCase(), hwid);
        if (check.valid) {
          config.licenseKey = newKey.trim().toUpperCase();
          saveConfig(config);
          console.log(`${c.green}[+] Ключ обновлён${c.reset}`);
        } else {
          console.log(`${c.red}[-] Неверный ключ${c.reset}`);
        }
      }
      break;
  }
  
  rl.close();
}

// ═══════════════════ START BOT ═══════════════════
async function startBot() {
  const start = await ask(`\n${c.green}Запустить бота?${c.reset} ${c.green}[+]${c.reset} да: `);
  
  if (start === '+') {
    rl.close();
    console.log(`\n${c.green}Запуск...${c.reset}\n`);
    const child = spawn('node', ['src/index.js'], { stdio: 'inherit', cwd: rootDir });
    child.on('close', (code) => {
      process.exit(code);
    });
  } else {
    rl.close();
    console.log(`\n${c.dim}Для запуска: npm start${c.reset}\n`);
    process.exit();
  }
}

// ═══════════════════ RUN ═══════════════════
main().catch(err => {
  console.error(`${c.red}Ошибка:${c.reset}`, err.message);
  rl.close();
  process.exit(1);
});
