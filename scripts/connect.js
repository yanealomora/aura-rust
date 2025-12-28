#!/usr/bin/env node
/**
 * AURA RUST - Easy Connect
 * npm run connect
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

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
  bold: '\x1b[1m'
};

console.log(`
${c.cyan}═══════════════════════════════════════${c.reset}
  ${c.green}🎮 AURA RUST - Easy Connect${c.reset}
${c.cyan}═══════════════════════════════════════${c.reset}
`);

// Создаём .env если нет
function ensureEnvFile() {
  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      copyFileSync(envExamplePath, envPath);
      console.log(`${c.green}✅ Создан .env из .env.example${c.reset}\n`);
    } else {
      writeFileSync(envPath, `# AURA RUST Config
# Rust+ Server
RUST_SERVER_IP=
RUST_SERVER_PORT=
RUST_PLAYER_ID=
RUST_PLAYER_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Discord
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=

# Web
WEB_ENABLED=true
WEB_PORT=3000
TUNNEL_SUBDOMAIN=aurarust
`);
      console.log(`${c.green}✅ Создан новый .env${c.reset}\n`);
    }
  }
}

// Читаем .env
function readEnv() {
  ensureEnvFile();
  const env = {};
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

// Сохраняем в .env
function saveEnv(updates) {
  ensureEnvFile();
  let content = readFileSync(envPath, 'utf8');
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      // Добавляем после комментария с похожим названием или в конец
      content = content.trim() + `\n${key}=${value}`;
    }
  }
  
  writeFileSync(envPath, content.trim() + '\n');
  console.log(`${c.dim}💾 Сохранено в .env${c.reset}`);
}

async function main() {
  const env = readEnv();
  
  // Проверяем существующие настройки
  if (env.RUST_SERVER_IP && env.RUST_PLAYER_TOKEN) {
    console.log(`${c.yellow}📋 Текущий сервер:${c.reset} ${env.RUST_SERVER_IP}:${env.RUST_SERVER_PORT}`);
    console.log(`${c.dim}   PlayerID: ${env.RUST_PLAYER_ID}${c.reset}\n`);
    
    console.log(`${c.cyan}[1]${c.reset} Запустить бота`);
    console.log(`${c.cyan}[2]${c.reset} Сменить сервер (FCM Listen)`);
    console.log(`${c.cyan}[3]${c.reset} Настроить уведомления`);
    console.log(`${c.cyan}[4]${c.reset} Ввести данные вручную\n`);
    
    const choice = await ask(`Выбор (1-4): `);
    
    if (choice === '1') {
      console.log(`\n${c.green}✅ Запускаю...${c.reset}\n`);
      rl.close();
      spawn('npm', ['start'], { stdio: 'inherit', shell: true, cwd: rootDir });
      return;
    } else if (choice === '3') {
      await setupNotifications();
      return;
    } else if (choice === '4') {
      await manualSetup();
      return;
    }
    // choice === '2' продолжает к FCM
  } else {
    console.log(`${c.cyan}[1]${c.reset} Автоматически (FCM Listen)`);
    console.log(`${c.cyan}[2]${c.reset} Ввести данные вручную\n`);
    
    const choice = await ask(`Выбор (1/2): `);
    if (choice === '2') {
      await manualSetup();
      return;
    }
  }
  
  // FCM Listen
  await listenForPairing();
}

async function manualSetup() {
  console.log(`
${c.cyan}═══ Ручная настройка ═══${c.reset}

${c.yellow}Как получить данные:${c.reset}
${c.dim}1. Запусти Rust на ПК
2. ESC → Rust+ → Pair With Server
3. Данные появятся в консоли браузера (F12)
   или используй: npm run listen${c.reset}
`);

  const ip = await ask(`${c.yellow}Server IP:${c.reset} `);
  const port = await ask(`${c.yellow}Server Port:${c.reset} `);
  const playerId = await ask(`${c.yellow}Player ID (Steam ID):${c.reset} `);
  const token = await ask(`${c.yellow}Player Token:${c.reset} `);
  
  if (ip && port && playerId && token) {
    saveEnv({
      'RUST_SERVER_IP': ip,
      'RUST_SERVER_PORT': port,
      'RUST_PLAYER_ID': playerId,
      'RUST_PLAYER_TOKEN': token
    });
    console.log(`\n${c.green}✅ Сервер настроен!${c.reset}`);
    
    const notif = await ask(`\n${c.yellow}Настроить уведомления? (y/n):${c.reset} `);
    if (notif.toLowerCase() === 'y') {
      await setupNotifications();
    } else {
      await startBot();
    }
  } else {
    console.log(`${c.red}❌ Заполни все поля${c.reset}`);
    rl.close();
  }
}

async function listenForPairing() {
  console.log(`
${c.yellow}📱 Жду подключение от Rust+...${c.reset}

${c.bold}Инструкция:${c.reset}
${c.cyan}1.${c.reset} Открой ${c.green}Rust${c.reset} на ПК
${c.cyan}2.${c.reset} Нажми ${c.green}ESC${c.reset} → ${c.green}Rust+${c.reset}
${c.cyan}3.${c.reset} Выбери сервер → ${c.green}Pair With Server${c.reset}
${c.cyan}4.${c.reset} Данные появятся автоматически

${c.dim}Ctrl+C чтобы отменить${c.reset}
`);
  
  const listener = spawn('npx', ['@liamcottle/rustplus.js', 'fcm-listen'], {
    shell: true,
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  let found = false;
  let servers = [];
  let buffer = '';

  listener.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Ищем JSON строки
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Оставляем неполную строку в буфере
    
    for (const line of lines) {
      // Пропускаем служебные сообщения
      if (line.includes('Registering') || line.includes('Waiting') || line.includes('FCM')) {
        console.log(c.dim + line + c.reset);
        continue;
      }
      
      // Ищем JSON с данными
      try {
        const jsonMatch = line.match(/\{[^{}]*"playerToken"[^{}]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          if (json.ip && json.playerToken && json.playerId) {
            // Проверяем дубликаты
            const exists = servers.find(s => s.ip === json.ip && s.port === json.port);
            if (!exists) {
              servers.push(json);
              console.log(`\n${c.green}✅ Сервер найден!${c.reset}`);
              console.log(`   ${c.bold}${json.name || 'Unknown'}${c.reset}`);
              console.log(`   ${c.dim}${json.ip}:${json.port}${c.reset}`);
              console.log(`   ${c.dim}PlayerID: ${json.playerId}${c.reset}\n`);
              
              // Сразу сохраняем первый найденный
              if (servers.length === 1) {
                setTimeout(() => {
                  if (!found) {
                    found = true;
                    listener.kill();
                    saveAndStart(servers[0]);
                  }
                }, 1500);
              }
            }
          }
        }
      } catch (e) {
        // Не JSON - выводим как есть если не мусор
        if (line.trim() && !line.includes('punycode') && !line.includes('Deprecation')) {
          console.log(c.dim + line + c.reset);
        }
      }
    }
  });

  listener.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('Deprecation') && !output.includes('punycode') && !output.includes('ExperimentalWarning')) {
      console.log(c.dim + output + c.reset);
    }
  });

  listener.on('close', () => {
    if (!found && servers.length === 0) {
      console.log(`\n${c.yellow}⚠️ Данные не получены${c.reset}`);
      console.log(`${c.dim}Попробуй ещё раз или введи вручную (npm run connect → 2)${c.reset}\n`);
      rl.close();
    }
  });

  // Ctrl+C
  process.on('SIGINT', () => {
    found = true;
    listener.kill();
    rl.close();
    console.log(`\n${c.yellow}Отменено${c.reset}\n`);
    process.exit();
  });
}

async function saveAndStart(data) {
  console.log(`${c.green}💾 Сохраняю настройки...${c.reset}`);
  
  saveEnv({
    'RUST_SERVER_IP': data.ip,
    'RUST_SERVER_PORT': data.port.toString(),
    'RUST_PLAYER_ID': data.playerId.toString(),
    'RUST_PLAYER_TOKEN': data.playerToken.toString()
  });
  
  console.log(`\n${c.green}✅ Готово!${c.reset}`);
  console.log(`   Сервер: ${c.bold}${data.name || data.ip}${c.reset}`);
  console.log(`   ${c.dim}${data.ip}:${data.port}${c.reset}\n`);
  
  // Спрашиваем про уведомления
  const notif = await ask(`${c.yellow}Настроить уведомления? (y/n):${c.reset} `);
  
  if (notif.toLowerCase() === 'y') {
    await setupNotifications();
  } else {
    await startBot();
  }
}

async function setupNotifications() {
  const env = readEnv();
  
  console.log(`
${c.cyan}═══ Настройка уведомлений ═══${c.reset}
`);

  // === TELEGRAM ===
  console.log(`${c.bold}📱 Telegram${c.reset}`);
  if (env.TELEGRAM_BOT_TOKEN) {
    console.log(`${c.green}✅ Уже настроен${c.reset}\n`);
  } else {
    console.log(`${c.dim}Как получить:
1. Открой @BotFather в Telegram
2. /newbot → придумай имя → получи токен
3. Напиши боту /start
4. Открой @userinfobot → получи свой Chat ID${c.reset}\n`);
    
    const token = await ask(`${c.yellow}Bot Token${c.reset} ${c.dim}(Enter пропустить):${c.reset} `);
    if (token) {
      const chatId = await ask(`${c.yellow}Chat ID:${c.reset} `);
      if (chatId) {
        saveEnv({ 'TELEGRAM_BOT_TOKEN': token, 'TELEGRAM_CHAT_ID': chatId });
        console.log(`${c.green}✅ Telegram настроен!${c.reset}\n`);
      }
    } else {
      console.log('');
    }
  }

  // === DISCORD ===
  console.log(`${c.bold}💬 Discord${c.reset}`);
  if (env.DISCORD_BOT_TOKEN) {
    console.log(`${c.green}✅ Уже настроен${c.reset}\n`);
  } else {
    console.log(`${c.dim}Как получить:
1. discord.com/developers/applications → New Application
2. Bot → Reset Token → скопируй токен
3. Bot → включи MESSAGE CONTENT INTENT
4. OAuth2 → URL Generator → bot + Send Messages
5. Скопируй ссылку → добавь бота на сервер
6. ПКМ на канал → Copy Channel ID${c.reset}\n`);
    
    const token = await ask(`${c.yellow}Bot Token${c.reset} ${c.dim}(Enter пропустить):${c.reset} `);
    if (token) {
      const channelId = await ask(`${c.yellow}Channel ID:${c.reset} `);
      if (channelId) {
        saveEnv({ 'DISCORD_BOT_TOKEN': token, 'DISCORD_CHANNEL_ID': channelId });
        console.log(`${c.green}✅ Discord настроен!${c.reset}\n`);
      }
    } else {
      console.log('');
    }
  }

  // === WEB ===
  console.log(`${c.bold}🌐 Веб-панель${c.reset}`);
  const webEnabled = env.WEB_ENABLED === 'true';
  if (webEnabled && env.TUNNEL_SUBDOMAIN) {
    console.log(`${c.green}✅ Включена:${c.reset} https://${env.TUNNEL_SUBDOMAIN}.loca.lt\n`);
    const change = await ask(`${c.yellow}Изменить поддомен? (y/n):${c.reset} `);
    if (change.toLowerCase() === 'y') {
      const subdomain = await ask(`${c.yellow}Новый поддомен:${c.reset} `);
      if (subdomain) {
        saveEnv({ 'TUNNEL_SUBDOMAIN': subdomain });
        console.log(`${c.green}✅ Новый адрес:${c.reset} https://${subdomain}.loca.lt\n`);
      }
    }
  } else {
    const enable = await ask(`${c.yellow}Включить веб-панель? (y/n):${c.reset} `);
    if (enable.toLowerCase() === 'y') {
      const subdomain = await ask(`${c.yellow}Поддомен (например aurarust):${c.reset} `);
      saveEnv({ 
        'WEB_ENABLED': 'true',
        'TUNNEL_SUBDOMAIN': subdomain || 'aurarust'
      });
      console.log(`${c.green}✅ Веб-панель:${c.reset} https://${subdomain || 'aurarust'}.loca.lt\n`);
    }
  }
  
  await startBot();
}

async function startBot() {
  const start = await ask(`\n${c.green}🚀 Запустить бота? (y/n):${c.reset} `);
  rl.close();
  
  if (start.toLowerCase() === 'y') {
    console.log(`\n${c.green}Запускаю...${c.reset}\n`);
    spawn('npm', ['start'], { stdio: 'inherit', shell: true, cwd: rootDir });
  } else {
    console.log(`\n${c.dim}Для запуска: npm start${c.reset}\n`);
    process.exit();
  }
}

main().catch(err => {
  console.error(`${c.red}Ошибка:${c.reset}`, err.message);
  rl.close();
  process.exit(1);
});
