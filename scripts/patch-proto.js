// Патч для rustplus.proto — исправляет required -> optional
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const protoPath = join(process.cwd(), 'node_modules/@liamcottle/rustplus.js/rustplus.proto');

try {
  let content = readFileSync(protoPath, 'utf8');
  let patched = false;

  // Патч deathTime
  if (content.includes('required uint32 deathTime = 8;')) {
    content = content.replace('required uint32 deathTime = 8;', 'optional uint32 deathTime = 8;');
    patched = true;
  }

  // Патч Note.type
  if (content.includes('required int32 type = 2;') && content.includes('message Note {')) {
    content = content.replace(
      /message Note \{\s*required int32 type = 2;\s*required float x = 3;\s*required float y = 4;/g,
      'message Note {\n\t\toptional int32 type = 2;\n\t\toptional float x = 3;\n\t\toptional float y = 4;'
    );
    patched = true;
  }

  // Патч queuedPlayers - делаем optional
  if (content.includes('required uint32 queuedPlayers')) {
    content = content.replace(/required uint32 queuedPlayers/g, 'optional uint32 queuedPlayers');
    patched = true;
  }

  // Если нет поля queuedPlayers вообще, добавляем его
  if (content.includes('message AppInfo {') && !content.includes('queuedPlayers')) {
    content = content.replace(
      /(message AppInfo \{[^}]*)(})/,
      '$1\toptional uint32 queuedPlayers = 15;\n$2'
    );
    patched = true;
  }

  // Патч Member - делаем все поля optional
  if (content.includes('message Member {')) {
    content = content.replace(/required float x = /g, 'optional float x = ');
    content = content.replace(/required float y = /g, 'optional float y = ');
    content = content.replace(/required bool isOnline = /g, 'optional bool isOnline = ');
    content = content.replace(/required uint32 spawnTime = /g, 'optional uint32 spawnTime = ');
    content = content.replace(/required bool isAlive = /g, 'optional bool isAlive = ');
    patched = true;
  }

  // Патч AppTeamInfo - делаем leaderSteamId optional
  if (content.includes('message AppTeamInfo {')) {
    content = content.replace(/required uint64 leaderSteamId = /g, 'optional uint64 leaderSteamId = ');
    patched = true;
  }

  // Патч SellOrder - делаем все поля optional включая amountInStock
  if (content.includes('message SellOrder {') || content.includes('SellOrder')) {
    content = content.replace(/required bool itemIsBlueprint = /g, 'optional bool itemIsBlueprint = ');
    content = content.replace(/required bool currencyIsBlueprint = /g, 'optional bool currencyIsBlueprint = ');
    content = content.replace(/required int32 amountInStock = /g, 'optional int32 amountInStock = ');
    content = content.replace(/required uint32 amountInStock = /g, 'optional uint32 amountInStock = ');
    patched = true;
  }

  // Добавляем amountInStock если его нет в SellOrder
  if (content.includes('message SellOrder {') && !content.includes('amountInStock')) {
    content = content.replace(
      /(message SellOrder \{[^}]*)(})/,
      '$1\toptional int32 amountInStock = 7;\n\t$2'
    );
    patched = true;
  }

  if (patched) {
    writeFileSync(protoPath, content);
    console.log('✅ rustplus.proto patched (включая queuedPlayers)');
  } else {
    console.log('✅ rustplus.proto already patched');
  }
} catch (e) {
  console.error('❌ Failed to patch:', e.message);
}
