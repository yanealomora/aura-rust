/**
 * База данных предметов Rust
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Загружаем полную базу из rustplusplus
let ITEMS_FULL = {};
try {
  ITEMS_FULL = require('./items.json');
} catch (e) {
  console.log('[ItemDB] items.json not found, using fallback');
}

// Получить название по ID
export function getItemName(itemId) {
  const id = itemId?.toString();
  const item = ITEMS_FULL[id];
  if (item) return item.name || item.shortname || `#${id}`;
  return `Item#${id}`;
}

// Получить shortname по ID
export function getItemShortname(itemId) {
  const id = itemId?.toString();
  const item = ITEMS_FULL[id];
  return item?.shortname || id;
}

// Поиск предмета по названию
export function searchItem(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const [id, item] of Object.entries(ITEMS_FULL)) {
    const name = item.name || '';
    const shortname = item.shortname || '';
    if (name.toLowerCase().includes(q) || shortname.toLowerCase().includes(q)) {
      results.push({ id, name: item.name, shortname: item.shortname });
    }
  }
  return results;
}

export default { getItemName, getItemShortname, searchItem };
