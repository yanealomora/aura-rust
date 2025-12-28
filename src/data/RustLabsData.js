/**
 * База данных RustLabs - крафт, ресайкл, исследование, декей, апкип
 */

// ═══════════════════ КРАФТ ═══════════════════
export const CRAFT_DATA = {
  // Оружие
  'ak47': { name: 'AK-47', time: 180, ingredients: { 'hqm': 50, 'wood': 200, 'spring': 4, 'rifle_body': 1 }, workbench: 3 },
  'ak': { name: 'AK-47', time: 180, ingredients: { 'hqm': 50, 'wood': 200, 'spring': 4, 'rifle_body': 1 }, workbench: 3 },
  'lr300': { name: 'LR-300', time: 180, ingredients: { 'hqm': 25, 'spring': 3, 'rifle_body': 1 }, workbench: 3 },
  'lr': { name: 'LR-300', time: 180, ingredients: { 'hqm': 25, 'spring': 3, 'rifle_body': 1 }, workbench: 3 },
  'mp5': { name: 'MP5', time: 120, ingredients: { 'hqm': 15, 'spring': 2, 'smg_body': 1 }, workbench: 3 },
  'thompson': { name: 'Thompson', time: 120, ingredients: { 'hqm': 10, 'spring': 1, 'smg_body': 1 }, workbench: 2 },
  'tommy': { name: 'Thompson', time: 120, ingredients: { 'hqm': 10, 'spring': 1, 'smg_body': 1 }, workbench: 2 },
  'custom': { name: 'Custom SMG', time: 60, ingredients: { 'hqm': 8, 'spring': 1, 'smg_body': 1 }, workbench: 2 },
  'semi_rifle': { name: 'Semi-Auto Rifle', time: 60, ingredients: { 'hqm': 10, 'spring': 1, 'semi_body': 1 }, workbench: 2 },
  'sar': { name: 'Semi-Auto Rifle', time: 60, ingredients: { 'hqm': 10, 'spring': 1, 'semi_body': 1 }, workbench: 2 },
  'semi_pistol': { name: 'Semi-Auto Pistol', time: 30, ingredients: { 'hqm': 5, 'spring': 1, 'semi_body': 1 }, workbench: 2 },
  'p2': { name: 'Semi-Auto Pistol', time: 30, ingredients: { 'hqm': 5, 'spring': 1, 'semi_body': 1 }, workbench: 2 },
  'revolver': { name: 'Revolver', time: 30, ingredients: { 'metal_frags': 125, 'pipe': 1 }, workbench: 1 },
  'python': { name: 'Python', time: 60, ingredients: { 'hqm': 10, 'pipe': 1 }, workbench: 2 },
  'm92': { name: 'M92', time: 60, ingredients: { 'hqm': 15, 'spring': 1 }, workbench: 2 },
  'bolt': { name: 'Bolt Action', time: 180, ingredients: { 'hqm': 30, 'pipe': 1, 'spring': 2, 'rifle_body': 1 }, workbench: 3 },
  'l96': { name: 'L96', time: 180, ingredients: { 'hqm': 50, 'spring': 2, 'rifle_body': 1 }, workbench: 3 },
  'm39': { name: 'M39', time: 120, ingredients: { 'hqm': 20, 'spring': 2, 'rifle_body': 1 }, workbench: 3 },
  'pump': { name: 'Pump Shotgun', time: 60, ingredients: { 'hqm': 10, 'pipe': 2, 'spring': 1 }, workbench: 2 },
  'spas12': { name: 'Spas-12', time: 120, ingredients: { 'hqm': 15, 'pipe': 2, 'spring': 2 }, workbench: 3 },
  'spas': { name: 'Spas-12', time: 120, ingredients: { 'hqm': 15, 'pipe': 2, 'spring': 2 }, workbench: 3 },
  'double_barrel': { name: 'Double Barrel', time: 30, ingredients: { 'metal_frags': 175, 'pipe': 2 }, workbench: 1 },
  'db': { name: 'Double Barrel', time: 30, ingredients: { 'metal_frags': 175, 'pipe': 2 }, workbench: 1 },
  'eoka': { name: 'Eoka', time: 15, ingredients: { 'wood': 75, 'metal_frags': 30 }, workbench: 0 },
  
  // Взрывчатка
  'c4': { name: 'C4', time: 30, ingredients: { 'explosives': 20, 'tech_trash': 2, 'cloth': 5 }, workbench: 3 },
  'rocket': { name: 'Rocket', time: 10, ingredients: { 'explosives': 10, 'pipe': 2, 'gunpowder': 150 }, workbench: 3 },
  'satchel': { name: 'Satchel', time: 10, ingredients: { 'beancan': 4, 'rope': 1, 'cloth': 10 }, workbench: 1 },
  'beancan': { name: 'Beancan', time: 5, ingredients: { 'gunpowder': 60, 'metal_frags': 20 }, workbench: 1 },
  'explosives': { name: 'Explosives', time: 5, ingredients: { 'gunpowder': 50, 'sulfur': 10, 'metal_frags': 10, 'lowgrade': 3 }, workbench: 3 },
  'exp_ammo': { name: 'Exp 5.56', time: 3, ingredients: { 'metal_frags': 10, 'gunpowder': 20, 'sulfur': 5 }, workbench: 3 },
  'gunpowder': { name: 'Gunpowder', time: 1, ingredients: { 'charcoal': 30, 'sulfur': 20 }, workbench: 0 },
  'gp': { name: 'Gunpowder', time: 1, ingredients: { 'charcoal': 30, 'sulfur': 20 }, workbench: 0 },
  
  // Броня
  'metal_facemask': { name: 'Metal Facemask', time: 60, ingredients: { 'hqm': 15, 'sewing_kit': 1 }, workbench: 2 },
  'facemask': { name: 'Metal Facemask', time: 60, ingredients: { 'hqm': 15, 'sewing_kit': 1 }, workbench: 2 },
  'metal_chestplate': { name: 'Metal Chestplate', time: 60, ingredients: { 'hqm': 25, 'sewing_kit': 1 }, workbench: 2 },
  'chest': { name: 'Metal Chestplate', time: 60, ingredients: { 'hqm': 25, 'sewing_kit': 1 }, workbench: 2 },
  'roadsign_vest': { name: 'Roadsign Vest', time: 30, ingredients: { 'roadsign': 3, 'sewing_kit': 2 }, workbench: 2 },
  'roadsign_kilt': { name: 'Roadsign Kilt', time: 30, ingredients: { 'roadsign': 3, 'sewing_kit': 1 }, workbench: 2 },
  
  // Медицина
  'syringe': { name: 'Medical Syringe', time: 5, ingredients: { 'metal_frags': 15, 'cloth': 10, 'lowgrade': 10 }, workbench: 1 },
  'med': { name: 'Medical Syringe', time: 5, ingredients: { 'metal_frags': 15, 'cloth': 10, 'lowgrade': 10 }, workbench: 1 },
  'medkit': { name: 'Med Kit', time: 30, ingredients: { 'lowgrade': 50, 'cloth': 50 }, workbench: 2 },
  'bandage': { name: 'Bandage', time: 3, ingredients: { 'cloth': 4 }, workbench: 0 },
  
  // Инструменты
  'pickaxe': { name: 'Pickaxe', time: 30, ingredients: { 'wood': 100, 'metal_frags': 125 }, workbench: 1 },
  'hatchet': { name: 'Hatchet', time: 30, ingredients: { 'wood': 100, 'metal_frags': 75 }, workbench: 1 },
  'jackhammer': { name: 'Jackhammer', time: 60, ingredients: { 'hqm': 25, 'gears': 3 }, workbench: 2 },
  'chainsaw': { name: 'Chainsaw', time: 60, ingredients: { 'hqm': 25, 'gears': 3 }, workbench: 2 },
};

// ═══════════════════ РЕСАЙКЛ ═══════════════════
export const RECYCLE_DATA = {
  // Компоненты
  'gears': { name: 'Gears', output: { 'metal': 13, 'scrap': 10 } },
  'gear': { name: 'Gears', output: { 'metal': 13, 'scrap': 10 } },
  'spring': { name: 'Spring', output: { 'metal': 8, 'scrap': 10 } },
  'springs': { name: 'Spring', output: { 'metal': 8, 'scrap': 10 } },
  'pipe': { name: 'Pipe', output: { 'metal': 20, 'scrap': 5 } },
  'pipes': { name: 'Pipe', output: { 'metal': 20, 'scrap': 5 } },
  'sheet': { name: 'Sheet Metal', output: { 'metal': 8, 'scrap': 2 } },
  'sheet_metal': { name: 'Sheet Metal', output: { 'metal': 8, 'scrap': 2 } },
  'roadsign': { name: 'Road Sign', output: { 'metal': 75, 'scrap': 5 } },
  'blade': { name: 'Metal Blade', output: { 'metal': 15 } },
  'propane': { name: 'Propane Tank', output: { 'metal': 50 } },
  'rope': { name: 'Rope', output: { 'cloth': 15 } },
  'tarp': { name: 'Tarp', output: { 'cloth': 50 } },
  'sewing': { name: 'Sewing Kit', output: { 'cloth': 10, 'scrap': 5 } },
  'sewing_kit': { name: 'Sewing Kit', output: { 'cloth': 10, 'scrap': 5 } },
  'smg_body': { name: 'SMG Body', output: { 'metal': 100, 'scrap': 20 } },
  'semi_body': { name: 'Semi Body', output: { 'metal': 75, 'scrap': 15 } },
  'rifle_body': { name: 'Rifle Body', output: { 'metal': 200, 'scrap': 25 } },
  'tech': { name: 'Tech Trash', output: { 'scrap': 20 } },
  'tech_trash': { name: 'Tech Trash', output: { 'scrap': 20 } },
  'targeting': { name: 'Targeting Computer', output: { 'scrap': 20 } },
  'cctv': { name: 'CCTV Camera', output: { 'scrap': 10 } },
  'rf': { name: 'RF Broadcaster', output: { 'scrap': 15 } },
  'fuse': { name: 'Electric Fuse', output: { 'scrap': 5 } },
  
  // Оружие
  'revolver': { name: 'Revolver', output: { 'metal': 125, 'gear': 1, 'scrap': 5 } },
  'p2': { name: 'Semi Pistol', output: { 'metal': 175, 'gear': 2, 'scrap': 10 } },
  'semi_pistol': { name: 'Semi Pistol', output: { 'metal': 175, 'gear': 2, 'scrap': 10 } },
  'python': { name: 'Python', output: { 'metal': 250, 'gear': 2, 'scrap': 15 } },
  'sar': { name: 'SAR', output: { 'metal': 450, 'gear': 4, 'scrap': 25 } },
  'tommy': { name: 'Thompson', output: { 'metal': 400, 'gear': 3, 'scrap': 20 } },
  'thompson': { name: 'Thompson', output: { 'metal': 400, 'gear': 3, 'scrap': 20 } },
  'custom': { name: 'Custom SMG', output: { 'metal': 400, 'gear': 3, 'scrap': 20 } },
  'mp5': { name: 'MP5', output: { 'metal': 500, 'gear': 4, 'scrap': 30 } },
  'ak': { name: 'AK-47', output: { 'metal': 600, 'gear': 5, 'scrap': 50 } },
  'ak47': { name: 'AK-47', output: { 'metal': 600, 'gear': 5, 'scrap': 50 } },
  'lr': { name: 'LR-300', output: { 'metal': 600, 'gear': 5, 'scrap': 40 } },
  'lr300': { name: 'LR-300', output: { 'metal': 600, 'gear': 5, 'scrap': 40 } },
  'm39': { name: 'M39', output: { 'metal': 500, 'gear': 4, 'scrap': 30 } },
  'm92': { name: 'M92', output: { 'metal': 250, 'gear': 2, 'scrap': 15 } },
  'pump': { name: 'Pump Shotgun', output: { 'metal': 300, 'gear': 2, 'scrap': 10 } },
  'spas': { name: 'Spas-12', output: { 'metal': 350, 'gear': 3, 'scrap': 15 } },
  'db': { name: 'Double Barrel', output: { 'metal': 150, 'gear': 1, 'scrap': 5 } },
  'waterpipe': { name: 'Waterpipe', output: { 'metal': 120, 'gear': 1, 'scrap': 5 } },
  'eoka': { name: 'Eoka', output: { 'metal': 20 } },
  
  // Броня
  'hazmat': { name: 'Hazmat', output: { 'scrap': 5 } },
  'coffeecan': { name: 'Coffee Can', output: { 'metal': 125, 'scrap': 5 } },
  'riot': { name: 'Riot Helmet', output: { 'metal': 150, 'scrap': 5 } },
  'roadsign_vest': { name: 'Roadsign Vest', output: { 'metal': 200, 'scrap': 10 } },
  'roadsign_kilt': { name: 'Roadsign Kilt', output: { 'metal': 150, 'scrap': 10 } },
  'facemask': { name: 'Metal Facemask', output: { 'metal': 200, 'scrap': 10 } },
  'chest': { name: 'Metal Chest', output: { 'metal': 400, 'scrap': 20 } },
  'chestplate': { name: 'Metal Chest', output: { 'metal': 400, 'scrap': 20 } },
  
  // База
  'tc': { name: 'Tool Cupboard', output: { 'metal': 50, 'scrap': 5 } },
  'door': { name: 'Metal Door', output: { 'metal': 100, 'scrap': 5 } },
  'garage': { name: 'Garage Door', output: { 'metal': 150, 'scrap': 10 } },
  'armored_door': { name: 'Armored Door', output: { 'metal': 200, 'scrap': 20 } },
  'turret': { name: 'Auto Turret', output: { 'metal': 200, 'gear': 2, 'scrap': 50 } },
  'shotgun_trap': { name: 'Shotgun Trap', output: { 'metal': 100, 'gear': 1, 'scrap': 5 } },
  'flame_turret': { name: 'Flame Turret', output: { 'metal': 50, 'scrap': 5 } },
  'tesla': { name: 'Tesla Coil', output: { 'metal': 50, 'scrap': 5 } },
  'vending': { name: 'Vending Machine', output: { 'metal': 200, 'scrap': 25 } },
  'locker': { name: 'Locker', output: { 'metal': 75, 'scrap': 5 } },
  'furnace': { name: 'Furnace', output: { 'metal': 100 } },
  'large_furnace': { name: 'Large Furnace', output: { 'metal': 250 } },
  'refinery': { name: 'Oil Refinery', output: { 'metal': 200 } },
  'wb1': { name: 'Workbench T1', output: { 'metal': 50, 'scrap': 5 } },
  'wb2': { name: 'Workbench T2', output: { 'metal': 150, 'scrap': 10 } },
  'wb3': { name: 'Workbench T3', output: { 'metal': 300, 'scrap': 25 } },
  
  // Взрывчатка
  'satchel': { name: 'Satchel', output: { 'metal': 80, 'scrap': 10 } },
  'rocket': { name: 'Rocket', output: { 'metal': 150, 'scrap': 25 } },
  'c4': { name: 'C4', output: { 'metal': 200, 'scrap': 50 } },
  'explo': { name: 'Explo Ammo', output: { 'metal': 10, 'scrap': 1 } },
  'exp_ammo': { name: 'Explo Ammo', output: { 'metal': 10, 'scrap': 1 } },
  'explosives': { name: 'Explosives', output: { 'scrap': 20, 'metal': 50 } },
};

// ═══════════════════ ИССЛЕДОВАНИЕ ═══════════════════
export const RESEARCH_DATA = {
  // Tier 1 (75 scrap)
  'revolver': { name: 'Revolver', scrap: 75, workbench: 1 },
  'double_barrel': { name: 'Double Barrel', scrap: 75, workbench: 1 },
  'db': { name: 'Double Barrel', scrap: 75, workbench: 1 },
  'satchel': { name: 'Satchel', scrap: 75, workbench: 1 },
  'beancan': { name: 'Beancan', scrap: 75, workbench: 1 },
  'syringe': { name: 'Medical Syringe', scrap: 75, workbench: 1 },
  'med': { name: 'Medical Syringe', scrap: 75, workbench: 1 },
  
  // Tier 2 (250 scrap)
  'thompson': { name: 'Thompson', scrap: 250, workbench: 2 },
  'tommy': { name: 'Thompson', scrap: 250, workbench: 2 },
  'custom': { name: 'Custom SMG', scrap: 250, workbench: 2 },
  'semi_rifle': { name: 'Semi-Auto Rifle', scrap: 250, workbench: 2 },
  'sar': { name: 'Semi-Auto Rifle', scrap: 250, workbench: 2 },
  'semi_pistol': { name: 'Semi-Auto Pistol', scrap: 250, workbench: 2 },
  'p2': { name: 'Semi-Auto Pistol', scrap: 250, workbench: 2 },
  'python': { name: 'Python', scrap: 250, workbench: 2 },
  'pump': { name: 'Pump Shotgun', scrap: 250, workbench: 2 },
  'metal_facemask': { name: 'Metal Facemask', scrap: 250, workbench: 2 },
  'facemask': { name: 'Metal Facemask', scrap: 250, workbench: 2 },
  'metal_chestplate': { name: 'Metal Chestplate', scrap: 250, workbench: 2 },
  'chest': { name: 'Metal Chestplate', scrap: 250, workbench: 2 },
  'roadsign_vest': { name: 'Roadsign Vest', scrap: 250, workbench: 2 },
  
  // Tier 3 (500 scrap)
  'ak47': { name: 'AK-47', scrap: 500, workbench: 3 },
  'ak': { name: 'AK-47', scrap: 500, workbench: 3 },
  'lr300': { name: 'LR-300', scrap: 500, workbench: 3 },
  'lr': { name: 'LR-300', scrap: 500, workbench: 3 },
  'mp5': { name: 'MP5', scrap: 500, workbench: 3 },
  'bolt': { name: 'Bolt Action', scrap: 500, workbench: 3 },
  'l96': { name: 'L96', scrap: 500, workbench: 3 },
  'm39': { name: 'M39', scrap: 500, workbench: 3 },
  'spas12': { name: 'Spas-12', scrap: 500, workbench: 3 },
  'spas': { name: 'Spas-12', scrap: 500, workbench: 3 },
  'c4': { name: 'C4', scrap: 500, workbench: 3 },
  'rocket': { name: 'Rocket', scrap: 500, workbench: 3 },
  'exp_ammo': { name: 'Exp 5.56', scrap: 500, workbench: 3 },
};

// ═══════════════════ ДЕКЕЙ ═══════════════════
export const DECAY_DATA = {
  // Постройки (без TC)
  'twig': { name: 'Twig', time: '1 час' },
  'wood': { name: 'Wood', time: '3 часа' },
  'stone': { name: 'Stone', time: '5 часов' },
  'metal': { name: 'Metal', time: '8 часов' },
  'armored': { name: 'Armored', time: '12 часов' },
  'hqm': { name: 'Armored', time: '12 часов' },
  
  // Размещаемое
  'sleeping_bag': { name: 'Sleeping Bag', time: '24 часа (без TC)' },
  'bag': { name: 'Sleeping Bag', time: '24 часа (без TC)' },
  'bed': { name: 'Bed', time: '24 часа (без TC)' },
  'furnace': { name: 'Furnace', time: '24 часа (без TC)' },
  'large_furnace': { name: 'Large Furnace', time: '24 часа (без TC)' },
  'workbench': { name: 'Workbench', time: '24 часа (без TC)' },
  'tc': { name: 'Tool Cupboard', time: '24 часа' },
  'turret': { name: 'Auto Turret', time: '24 часа (без TC)' },
  'sam': { name: 'SAM Site', time: '24 часа (без TC)' },
};

// ═══════════════════ АПКИП ═══════════════════
export const UPKEEP_DATA = {
  // За 24 часа
  'twig': { name: 'Twig Foundation', cost: { 'wood': 10 } },
  'wood': { name: 'Wood Foundation', cost: { 'wood': 50 } },
  'stone': { name: 'Stone Foundation', cost: { 'stone': 50 } },
  'metal': { name: 'Metal Foundation', cost: { 'metal_frags': 150 } },
  'armored': { name: 'Armored Foundation', cost: { 'hqm': 25 } },
  'hqm': { name: 'Armored Foundation', cost: { 'hqm': 25 } },
  
  'wood_wall': { name: 'Wood Wall', cost: { 'wood': 20 } },
  'stone_wall': { name: 'Stone Wall', cost: { 'stone': 20 } },
  'metal_wall': { name: 'Metal Wall', cost: { 'metal_frags': 60 } },
  'armored_wall': { name: 'Armored Wall', cost: { 'hqm': 10 } },
  
  'wood_door': { name: 'Wood Door', cost: { 'wood': 10 } },
  'sheet_door': { name: 'Sheet Door', cost: { 'metal_frags': 15 } },
  'garage_door': { name: 'Garage Door', cost: { 'metal_frags': 30 } },
  'armored_door': { name: 'Armored Door', cost: { 'hqm': 5 } },
};

// ═══════════════════ CCTV КОДЫ ═══════════════════
export const CCTV_CODES = {
  'dome': { name: 'Dome', codes: ['DOME1', 'DOMETOP'] },
  'launch': { name: 'Launch Site', codes: ['OILRIG1DOCK', 'OILRIG1HELIPAD'] },
  'airfield': { name: 'Airfield', codes: ['AIRFIELDHELIPAD'] },
  'outpost': { name: 'Outpost', codes: ['OUTPOSTBACK', 'OUTPOSTFRONT'] },
  'bandit': { name: 'Bandit Camp', codes: ['BANDITCAMP1', 'BANDITCAMP2'] },
  'large': { name: 'Large Oil Rig', codes: ['OILRIG2DOCK', 'OILRIG2HELIPAD', 'OILRIG2L1', 'OILRIG2L2', 'OILRIG2L3', 'OILRIG2L4', 'OILRIG2L5', 'OILRIG2L6'] },
  'small': { name: 'Small Oil Rig', codes: ['OILRIG1DOCK', 'OILRIG1HELIPAD', 'OILRIG1L1', 'OILRIG1L2', 'OILRIG1L3'] },
  'compound': { name: 'Compound', codes: ['COMPOUNDSTREET', 'COMPOUNDCRUDE'] },
};

// ═══════════════════ DESPAWN ═══════════════════
export const DESPAWN_DATA = {
  // Оружие (40 мин)
  'ak47': { name: 'AK-47', time: '40 мин' },
  'ak': { name: 'AK-47', time: '40 мин' },
  'lr300': { name: 'LR-300', time: '40 мин' },
  'lr': { name: 'LR-300', time: '40 мин' },
  'mp5': { name: 'MP5', time: '40 мин' },
  'thompson': { name: 'Thompson', time: '40 мин' },
  'tommy': { name: 'Thompson', time: '40 мин' },
  'bolt': { name: 'Bolt Action', time: '40 мин' },
  'l96': { name: 'L96', time: '40 мин' },
  'm39': { name: 'M39', time: '40 мин' },
  'spas12': { name: 'Spas-12', time: '40 мин' },
  'spas': { name: 'Spas-12', time: '40 мин' },
  
  // Взрывчатка (1 час)
  'c4': { name: 'C4', time: '1 час' },
  'rocket': { name: 'Rocket', time: '1 час' },
  'explosives': { name: 'Explosives', time: '1 час' },
  'tech_trash': { name: 'Tech Trash', time: '1 час' },
  
  // Компоненты (40 мин)
  'rifle_body': { name: 'Rifle Body', time: '40 мин' },
  'smg_body': { name: 'SMG Body', time: '40 мин' },
  'semi_body': { name: 'Semi Body', time: '40 мин' },
  'pipe': { name: 'Metal Pipe', time: '40 мин' },
  'spring': { name: 'Metal Spring', time: '40 мин' },
  'gears': { name: 'Gears', time: '40 мин' },
  
  // Ресурсы (20 мин)
  'metal_frags': { name: 'Metal Fragments', time: '20 мин' },
  'hqm': { name: 'HQM', time: '20 мин' },
  'sulfur': { name: 'Sulfur', time: '20 мин' },
  'gunpowder': { name: 'Gunpowder', time: '20 мин' },
  'scrap': { name: 'Scrap', time: '20 мин' },
  
  // Одежда/броня (5 мин)
  'facemask': { name: 'Metal Facemask', time: '5 мин' },
  'chest': { name: 'Metal Chestplate', time: '5 мин' },
  'roadsign_vest': { name: 'Roadsign Vest', time: '5 мин' },
  
  // Карты (20 мин)
  'green_card': { name: 'Green Card', time: '20 мин' },
  'blue_card': { name: 'Blue Card', time: '20 мин' },
  'red_card': { name: 'Red Card', time: '20 мин' },
};

// ═══════════════════ ФУНКЦИИ ═══════════════════

export function getCraftInfo(itemKey) {
  return CRAFT_DATA[itemKey.toLowerCase()] || null;
}

export function getRecycleInfo(itemKey) {
  return RECYCLE_DATA[itemKey.toLowerCase()] || null;
}

export function getResearchInfo(itemKey) {
  return RESEARCH_DATA[itemKey.toLowerCase()] || null;
}

export function getDecayInfo(itemKey) {
  return DECAY_DATA[itemKey.toLowerCase()] || null;
}

export function getUpkeepInfo(itemKey) {
  return UPKEEP_DATA[itemKey.toLowerCase()] || null;
}

export function getCCTVCodes(monument) {
  return CCTV_CODES[monument.toLowerCase()] || null;
}

export function getDespawnInfo(itemKey) {
  return DESPAWN_DATA[itemKey.toLowerCase()] || null;
}

export function formatIngredients(ingredients) {
  const names = {
    'hqm': 'HQM', 'wood': 'Дерево', 'metal_frags': 'Метал', 'stone': 'Камень',
    'spring': 'Пружина', 'rifle_body': 'Тело винт', 'smg_body': 'Тело SMG',
    'semi_body': 'Тело Semi', 'pipe': 'Труба', 'gears': 'Шестерни',
    'cloth': 'Ткань', 'lowgrade': 'Топливо', 'gunpowder': 'Порох',
    'sulfur': 'Сера', 'charcoal': 'Уголь', 'explosives': 'Взрывчатка',
    'tech_trash': 'Техмусор', 'beancan': 'Бинка', 'rope': 'Верёвка',
    'roadsign': 'Знак', 'sewing_kit': 'Швейка', 'scrap': 'Скрап'
  };
  
  return Object.entries(ingredients)
    .map(([k, v]) => `${names[k] || k}:${v}`)
    .join(' ');
}

export function formatOutput(output) {
  const names = {
    'hqm': 'HQM', 'metal': 'Metal', 'metal_frags': 'Metal', 'cloth': 'Cloth',
    'scrap': 'Scrap', 'spring': 'Spring', 'tech_trash': 'Tech',
    'rope': 'Rope', 'gear': 'Gear', 'gears': 'Gear'
  };
  
  return Object.entries(output)
    .map(([k, v]) => `${names[k] || k}:${v}`)
    .join(' ');
}

export default {
  CRAFT_DATA, RECYCLE_DATA, RESEARCH_DATA, DECAY_DATA, UPKEEP_DATA, CCTV_CODES, DESPAWN_DATA,
  getCraftInfo, getRecycleInfo, getResearchInfo, getDecayInfo, getUpkeepInfo, getCCTVCodes, getDespawnInfo,
  formatIngredients, formatOutput
};
