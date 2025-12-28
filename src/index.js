/**
 * RUST EVENT BOT - Main Entry Point
 * Модульная архитектура
 */

import 'dotenv/config';
import rustPlus from './services/RustPlusService.js';
import pollingService from './services/PollingService.js';
import telegramNotifier from './notifiers/TelegramNotifier.js';
import discordNotifier from './notifiers/DiscordNotifier.js';
import teamChatNotifier from './notifiers/RustTeamChatNotifier.js';
import adminBot from './admin/AdminBot.js';
import eventBus, { EVENTS } from './core/EventEmitter.js';

// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════');
console.log('  AURA RUST');
console.log('  Headless 24/7 Event Relay');
console.log('═══════════════════════════════════════');

// ═══════════════════ MAIN ═══════════════════

async function main() {
  // 1. Admin Bot (для управления лицензиями)
  console.log('[Main] Инициализация Admin Bot...');
  adminBot.init();

  // 2. Telegram
  console.log('[Main] Инициализация Telegram...');
  telegramNotifier.init();

  // 3. Discord
  console.log('[Main] Инициализация Discord...');
  discordNotifier.init();

  // 4. Team Chat
  console.log('[Main] Инициализация TeamChat...');
  teamChatNotifier.init();

  // 5. Rust+
  console.log('[Main] Подключение к Rust+...');
  try {
    await rustPlus.connect();
    console.log('[Main] Подключено к Rust+');
  } catch (err) {
    console.error('[Main] Ошибка подключения:', err.message);
    console.log('[Main] Повторная попытка через 10 сек...');
  }

  // 6. Polling после подключения
  eventBus.on(EVENTS.CONNECTED, () => {
    console.log('[Main] Запуск polling...');
    pollingService.start();
  });

  eventBus.on(EVENTS.DISCONNECTED, () => {
    console.log('[Main] Остановка polling...');
    pollingService.stop();
  });

  // Если уже подключены - запускаем polling
  if (rustPlus.isConnected()) {
    pollingService.start();
  }
}

// ═══════════════════ SHUTDOWN ═══════════════════

process.on('SIGINT', () => {
  console.log('\n[Main] Завершение...');
  pollingService.stop();
  rustPlus.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  // Игнорируем ошибку amountInStock от protobuf
  if (err.message?.includes('amountInStock')) {
    return;
  }
  console.error('[Main] Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  // Игнорируем ошибку amountInStock
  if (err?.message?.includes('amountInStock')) {
    return;
  }
  console.error('[Main] Unhandled:', err);
});

// ═══════════════════ START ═══════════════════

main();
