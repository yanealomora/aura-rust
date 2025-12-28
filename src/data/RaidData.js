/**
 * База данных для рейд калькулятора
 * Актуальные данные Rust 2024
 */

export const EXPLOSIVES = {
  c4: { name: 'C4', sulfur: 2200 },
  rocket: { name: 'Ракета', sulfur: 1400 },
  satchel: { name: 'Сатчель', sulfur: 480 },
  expAmmo: { name: 'Разрывные', sulfur: 25 },
  beancan: { name: 'Бобовка', sulfur: 120 },
  torpedo: { name: 'Торпеда', sulfur: 20 },
  incendRocket: { name: 'Зажиг. ракета', sulfur: 610 },
  hv: { name: 'HV ракета', sulfur: 200 },
  molotov: { name: 'Молотов', sulfur: 0 },
  flamethrower: { name: 'Огнемёт', sulfur: 0 },
  stoneSpear: { name: 'Каменный патрон', sulfur: 5 },
};

export const STRUCTURES = {
  // ═══════════════════ СТЕНЫ ═══════════════════
  'wood_wall': {
    name: 'Деревянная стена',
    hp: 250,
    destroy: { c4: 1, rocket: 2, satchel: 3, expAmmo: 56, beancan: 13, fire: true },
    best: 'Огонь (бесплатно)'
  },
  'stone_wall': {
    name: 'Каменная стена',
    hp: 500,
    destroy: { c4: 2, rocket: 4, satchel: 10, expAmmo: 200, beancan: 46 },
    best: 'C4 (1) + Разрывные (82) = 4250 серы'
  },
  'metal_wall': {
    name: 'Железная стена',
    hp: 1000,
    destroy: { c4: 4, rocket: 8, satchel: 23, expAmmo: 400, beancan: 112 },
    best: 'C4 (3) + Разрывные (70) = 8350 серы'
  },
  'armored_wall': {
    name: 'МВК стена',
    hp: 2000,
    destroy: { c4: 8, rocket: 15, satchel: 46, expAmmo: 800, beancan: 223 },
    best: 'C4 (7) + Разрывные (31) = 16175 серы'
  },

  // ═══════════════════ ДВЕРИ ═══════════════════
  'wood_door': {
    name: 'Деревянная дверь',
    hp: 200,
    destroy: { c4: 1, rocket: 1, satchel: 2, expAmmo: 20, beancan: 6, fire: true },
    best: 'Огонь (бесплатно)'
  },
  'sheet_door': {
    name: 'Железная дверь',
    hp: 250,
    destroy: { c4: 1, rocket: 2, satchel: 4, expAmmo: 63, beancan: 18 },
    best: 'Ракета (1) + Разрывные (7) = 1575 серы'
  },
  'garage_door': {
    name: 'Гаражная дверь',
    hp: 600,
    destroy: { c4: 2, rocket: 3, satchel: 9, expAmmo: 150, beancan: 42 },
    best: 'C4 (1) + Разрывные (41) = 3225 серы'
  },
  'armored_door': {
    name: 'МВК дверь',
    hp: 800,
    destroy: { c4: 3, rocket: 5, satchel: 17, expAmmo: 200, beancan: 56 },
    best: 'C4 (2) + Разрывные (30) = 5100 серы'
  },

  // ═══════════════════ ОКНА ═══════════════════
  'wood_shutters': {
    name: 'Деревянная оконная решетка',
    hp: 200,
    destroy: { c4: 1, rocket: 2, satchel: 3, expAmmo: 56, beancan: 13, fire: true },
    best: 'Огонь (бесплатно)'
  },
  'metal_bars': {
    name: 'Железная оконная решетка',
    hp: 500,
    destroy: { c4: 2, rocket: 4, satchel: 12, expAmmo: 200, beancan: 56 },
    best: 'C4 (1) + Разрывные (90) = 4450 серы'
  },
  'armored_bars': {
    name: 'МВК решетка',
    hp: 750,
    destroy: { c4: 2, rocket: 6, satchel: 18, expAmmo: 300, beancan: 84 },
    best: 'C4 (2) = 4400 серы'
  },
  'strengthened_window': {
    name: 'Окно из укрепленного стекла',
    hp: 500,
    destroy: { c4: 2, rocket: 4, satchel: 12, expAmmo: 200, beancan: 56 },
    best: 'C4 (1) + Разрывные (90) = 4450 серы'
  },
  'reinforced_window': {
    name: 'Усиленное стеклянное окно',
    hp: 350,
    destroy: { c4: 2, rocket: 3, satchel: 9, expAmmo: 140, beancan: 56 },
    best: 'C4 (1) + Разрывные (30) = 2950 серы'
  },

  // ═══════════════════ ВНЕШНИЕ СТЕНЫ И ВОРОТА ═══════════════════
  'wood_gate': {
    name: 'Деревянные ворота',
    hp: 500,
    destroy: { c4: 2, rocket: 3, satchel: 6, expAmmo: 112, beancan: 26, fire: true },
    best: 'Огонь (бесплатно)'
  },
  'stone_gate': {
    name: 'Каменные ворота',
    hp: 500,
    destroy: { c4: 2, rocket: 4, satchel: 10, expAmmo: 200, beancan: 46 },
    best: 'C4 (2) = 4400 серы'
  },
  'high_wood_wall': {
    name: 'Высокая деревянная стена',
    hp: 500,
    destroy: { c4: 2, rocket: 3, satchel: 6, expAmmo: 112, beancan: 26, fire: true },
    best: 'Огонь (бесплатно)'
  },
  'high_stone_wall': {
    name: 'Высокая каменная стена',
    hp: 500,
    destroy: { c4: 2, rocket: 4, satchel: 10, expAmmo: 200, beancan: 46 },
    best: 'C4 (2) = 4400 серы'
  },

  // ═══════════════════ ПРОЧЕЕ ═══════════════════
  'tool_cupboard': {
    name: 'Шкаф (TC)',
    hp: 100,
    destroy: { c4: 1, rocket: 1, satchel: 1, expAmmo: 10, beancan: 3 },
    best: 'Разрывные (10) = 250 серы'
  },
  'floor_grill': {
    name: 'Решётчатый настил',
    hp: 250,
    destroy: { c4: 1, rocket: 2, satchel: 4, expAmmo: 63, beancan: 18 },
    best: 'Разрывные (63) = 1575 серы'
  },
  'ladder_hatch': {
    name: 'Люк с лестницей',
    hp: 250,
    destroy: { c4: 1, rocket: 2, satchel: 4, expAmmo: 63, beancan: 18 },
    best: 'Разрывные (63) = 1575 серы'
  },
  'shop_front': {
    name: 'Металлическая витрина магазина',
    hp: 750,
    destroy: { c4: 3, rocket: 6, satchel: 20, expAmmo: 300, beancan: 84 },
    best: 'C4 (3) = 6600 серы'
  },
  'auto_turret': {
    name: 'Автоматическая турель',
    hp: 1000,
    destroy: { c4: 1, rocket: 4, satchel: 2, expAmmo: 112, beancan: 16 },
    best: 'Разрывные (112) = 2800 серы'
  },
  'shotgun_trap': {
    name: 'Гантрап/ловушка',
    hp: 300,
    destroy: { c4: 1, rocket: 2, satchel: 1, expAmmo: 34, beancan: 7 },
    best: 'Разрывные (34) = 850 серы'
  },
  'vending': {
    name: 'Магазин',
    hp: 500,
    destroy: { c4: 3, rocket: 10, satchel: 15, expAmmo: 499 },
    best: 'C4 (3) = 6600 серы'
  },
  'sam_site': {
    name: 'SAM',
    hp: 500,
    destroy: { c4: 1, rocket: 2, satchel: 5, expAmmo: 100 },
    best: 'C4 (1) = 2200 серы'
  },

  // ═══════════════════ ТОРПЕДЫ ═══════════════════
  'wood_wall_torpedo': {
    name: 'Деревянная стена (торпеды)',
    hp: 250,
    destroy: { torpedo: 20 },
    best: '20 торпед = 420 серы + 7 труб'
  },
  'stone_wall_torpedo': {
    name: 'Каменная стена (торпеды)',
    hp: 500,
    destroy: { torpedo: 81 },
    best: '81 торпеда = 1620 серы + 27 труб'
  },
  'metal_wall_torpedo': {
    name: 'Железная стена (торпеды)',
    hp: 1000,
    destroy: { torpedo: 200 },
    best: '200 торпед = 4020 серы + 67 труб'
  },
  'armored_wall_torpedo': {
    name: 'МВК стена (торпеды)',
    hp: 2000,
    destroy: { torpedo: 400 },
    best: '400 торпед = 8040 серы + 134 трубы'
  },
  'wood_door_torpedo': {
    name: 'Деревянная дверь (торпеды)',
    hp: 200,
    destroy: { torpedo: 8 },
    best: '8 торпед = 180 серы + 3 трубы'
  },
  'sheet_door_torpedo': {
    name: 'Железная дверь (торпеды)',
    hp: 250,
    destroy: { torpedo: 32 },
    best: '32 торпеды = 660 серы + 11 труб'
  },
  'armored_door_torpedo': {
    name: 'МВК дверь (торпеды)',
    hp: 800,
    destroy: { torpedo: 100 },
    best: '100 торпед = 2040 серы + 34 трубы'
  },
  'garage_door_torpedo': {
    name: 'Гаражная дверь (торпеды)',
    hp: 600,
    destroy: { torpedo: 75 },
    best: '75 торпед = 1500 серы + 25 труб'
  },

  // ═══════════════════ КАМЕННЫЙ ПАТРОН ═══════════════════
  'wood_wall_stone': {
    name: 'Деревянная стена (камень)',
    hp: 250,
    destroy: { stoneSpear: 93 },
    best: '93 патрона = 480 серы'
  },
  'stone_wall_stone': {
    name: 'Каменная стена (камень)',
    hp: 500,
    destroy: { stoneSpear: 556 },
    best: '556 патронов = 2780 серы'
  },
  'wood_door_stone': {
    name: 'Деревянная дверь (камень)',
    hp: 200,
    destroy: { stoneSpear: 45 },
    best: '45 патронов = 240 серы'
  },
  'high_wood_wall_stone': {
    name: 'Высокая деревянная стена (камень)',
    hp: 500,
    destroy: { stoneSpear: 186 },
    best: '186 патронов = 940 серы'
  },
  'high_stone_wall_stone': {
    name: 'Высокая каменная стена (камень)',
    hp: 500,
    destroy: { stoneSpear: 556 },
    best: '556 патронов = 2780 серы'
  },

  // ═══════════════════ ОГНЕМЁТ ═══════════════════
  'wood_wall_flame': {
    name: 'Деревянная стена (огнемёт)',
    hp: 250,
    destroy: { flamethrower: 196 },
    best: '196 топлива'
  },
  'wood_door_flame': {
    name: 'Деревянная дверь (огнемёт)',
    hp: 200,
    destroy: { flamethrower: 84 },
    best: '84 топлива'
  },
  'high_wood_wall_flame': {
    name: 'Высокая деревянная стена (огнемёт)',
    hp: 500,
    destroy: { flamethrower: 392 },
    best: '392 топлива'
  },

  // ═══════════════════ МОЛОТОВ ═══════════════════
  'wood_wall_molotov': {
    name: 'Деревянная стена (молотов)',
    hp: 250,
    destroy: { molotov: 4 },
    best: '4 молотова'
  },
  'wood_door_molotov': {
    name: 'Деревянная дверь (молотов)',
    hp: 200,
    destroy: { molotov: 2 },
    best: '2 молотова'
  },
  'high_wood_wall_molotov': {
    name: 'Высокая деревянная стена (молотов)',
    hp: 500,
    destroy: { molotov: 7 },
    best: '7 молотовов'
  },

  // ═══════════════════ ТРАНСПОРТ ═══════════════════
  'bradley': {
    name: 'Танк / Бредли',
    hp: 1000,
    destroy: { c4: 3, rocket: 7 },
    best: 'C4 (3) = 6600 серы или 7 ракет = 9800 серы'
  },
  'patrol_heli': {
    name: 'Патрульный вертолёт',
    hp: 10000,
    destroy: {},
    best: 'АК: 200 патронов, Болт: 134 патрона, Берданка: 250 патронов'
  },
  'tugboat': {
    name: 'Буксир',
    hp: 1500,
    destroy: { torpedo: 12, rocket: 16, c4: 8 },
    best: 'Торпеды (12) = 240 серы'
  },
};

export const CATEGORIES = {
  walls: { name: '🔶 Стены/потолки/фундаменты', items: ['wood_wall', 'stone_wall', 'metal_wall', 'armored_wall'] },
  doors: { name: '🔶 Двери', items: ['wood_door', 'sheet_door', 'garage_door', 'armored_door'] },
  windows: { name: '🔶 Окна и решетки', items: ['wood_shutters', 'metal_bars', 'armored_bars', 'strengthened_window', 'reinforced_window'] },
  external: { name: '🔶 Внешние стены и ворота', items: ['wood_gate', 'stone_gate', 'high_wood_wall', 'high_stone_wall'] },
  deployables: { name: '🔶 Прочее', items: ['tool_cupboard', 'floor_grill', 'ladder_hatch', 'shop_front', 'auto_turret', 'shotgun_trap', 'vending', 'sam_site'] },
  torpedo: { name: '🔷 Торпеды', items: ['wood_wall_torpedo', 'stone_wall_torpedo', 'metal_wall_torpedo', 'armored_wall_torpedo', 'wood_door_torpedo', 'sheet_door_torpedo', 'armored_door_torpedo', 'garage_door_torpedo'] },
  stone: { name: '🔷 Каменный патрон', items: ['wood_wall_stone', 'stone_wall_stone', 'wood_door_stone', 'high_wood_wall_stone', 'high_stone_wall_stone'] },
  fire: { name: '🔷 Огнемёт/Молотов', items: ['wood_wall_flame', 'wood_door_flame', 'high_wood_wall_flame', 'wood_wall_molotov', 'wood_door_molotov', 'high_wood_wall_molotov'] },
  vehicles: { name: '🔷 Транспорт', items: ['bradley', 'patrol_heli', 'tugboat'] }
};

export function getDestroyInfo(itemKey, count = 1) {
  const structure = STRUCTURES[itemKey];
  if (!structure) return null;
  
  const result = { name: structure.name, hp: structure.hp, count, methods: [], best: structure.best };
  const methods = [];
  
  if (structure.destroy.c4) methods.push({ name: 'C4', amount: structure.destroy.c4 * count, sulfur: structure.destroy.c4 * count * EXPLOSIVES.c4.sulfur });
  if (structure.destroy.rocket) methods.push({ name: 'Ракеты', amount: structure.destroy.rocket * count, sulfur: structure.destroy.rocket * count * EXPLOSIVES.rocket.sulfur });
  if (structure.destroy.satchel) methods.push({ name: 'Сатчели', amount: structure.destroy.satchel * count, sulfur: structure.destroy.satchel * count * EXPLOSIVES.satchel.sulfur });
  if (structure.destroy.expAmmo) methods.push({ name: 'Разрывные', amount: structure.destroy.expAmmo * count, sulfur: structure.destroy.expAmmo * count * EXPLOSIVES.expAmmo.sulfur });
  if (structure.destroy.beancan) methods.push({ name: 'Бобовки', amount: structure.destroy.beancan * count, sulfur: structure.destroy.beancan * count * EXPLOSIVES.beancan.sulfur });
  if (structure.destroy.torpedo) methods.push({ name: 'Торпеды', amount: structure.destroy.torpedo * count, sulfur: structure.destroy.torpedo * count * EXPLOSIVES.torpedo.sulfur });
  if (structure.destroy.stoneSpear) methods.push({ name: 'Каменные патроны', amount: structure.destroy.stoneSpear * count, sulfur: structure.destroy.stoneSpear * count * EXPLOSIVES.stoneSpear.sulfur });
  if (structure.destroy.flamethrower) methods.push({ name: 'Огнемёт (топливо)', amount: structure.destroy.flamethrower * count, sulfur: 0, isFire: true });
  if (structure.destroy.molotov) methods.push({ name: 'Молотов', amount: structure.destroy.molotov * count, sulfur: 0, isFire: true });
  
  methods.sort((a, b) => a.sulfur - b.sulfur);
  result.methods = methods;
  
  if (structure.destroy.fire) result.methods.unshift({ name: 'Огонь', amount: 1, sulfur: 0, isFire: true });
  
  return result;
}

export default { EXPLOSIVES, STRUCTURES, CATEGORIES, getDestroyInfo };
