// Скрипт для прослушивания pairing notifications
// Запусти: node listen-pairing.js
// Затем в игре нажми "Pair" на сервере

import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./rustplus.config.json', 'utf8'));

console.log('═══════════════════════════════════════');
console.log('  🎮 RUST+ PAIRING LISTENER');
console.log('═══════════════════════════════════════');
console.log('');
console.log('Жду pairing notification...');
console.log('В игре: ESC → Rust+ → выбери сервер → Pair');
console.log('');

// Используем CLI напрямую
import { spawn } from 'child_process';

const proc = spawn('npx', ['@liamcottle/rustplus.js', 'fcm-listen'], {
  stdio: 'inherit',
  shell: true,
});

proc.on('error', (err) => {
  console.error('Ошибка:', err.message);
});
