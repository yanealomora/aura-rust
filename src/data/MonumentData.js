/**
 * Данные о монументах и камерах
 */

// Монументы с координатами (относительные)
export const MONUMENTS = {
  airfield: { name: 'Аэродром', token: 'airfield' },
  bandit_camp: { name: 'Лагерь бандитов', token: 'bandit_camp' },
  dome: { name: 'Купол', token: 'dome' },
  harbor_1: { name: 'Порт 1', token: 'harbor_1' },
  harbor_2: { name: 'Порт 2', token: 'harbor_2' },
  junkyard: { name: 'Свалка', token: 'junkyard' },
  large_oil_rig: { name: 'Большая нефтевышка', token: 'large_oil_rig' },
  launch_site: { name: 'Космодром', token: 'launch_site' },
  military_tunnel: { name: 'Военные туннели', token: 'military_tunnel' },
  outpost: { name: 'Аутпост', token: 'outpost' },
  power_plant: { name: 'Электростанция', token: 'power_plant' },
  satellite: { name: 'Спутниковая тарелка', token: 'satellite' },
  sewer: { name: 'Канализация', token: 'sewer' },
  small_oil_rig: { name: 'Малая нефтевышка', token: 'oil_rig_small' },
  train_yard: { name: 'Депо', token: 'train_yard' },
  water_treatment: { name: 'Водоочистка', token: 'water_treatment' },
  excavator: { name: 'Экскаватор', token: 'excavator' },
  arctic_base: { name: 'Арктическая база', token: 'arctic_research_base' },
  ferry: { name: 'Паром', token: 'ferry_terminal' },
  fishing_village: { name: 'Рыбацкая деревня', token: 'fishing_village' },
  lighthouse: { name: 'Маяк', token: 'lighthouse' },
  mining_outpost: { name: 'Шахтёрский аванпост', token: 'mining_outpost' },
  oxums: { name: 'Oxum\'s Gas Station', token: 'gas_station' },
  supermarket: { name: 'Супермаркет', token: 'supermarket' },
  warehouse: { name: 'Склад', token: 'warehouse' },
};

// Коды камер по категориям
export const CAMERAS = {
  '🛢 Нефтевышки': [
    { code: 'OILRIG1', name: 'Малая нефтевышка 1' },
    { code: 'OILRIG2', name: 'Малая нефтевышка 2' },
    { code: 'OILRIG1L1', name: 'Большая нефтевышка 1' },
    { code: 'OILRIG1L2', name: 'Большая нефтевышка 2' },
    { code: 'OILRIG1L3', name: 'Большая нефтевышка 3' },
    { code: 'OILRIG1L4', name: 'Большая нефтевышка 4' },
    { code: 'OILRIG1HELI', name: 'Большая нефтевышка вертолёт' },
    { code: 'OILRIG1DOCK', name: 'Большая нефтевышка док' },
  ],
  '🏭 Монументы': [
    { code: 'DOME1', name: 'Купол' },
    { code: 'AIRFIELD1', name: 'Аэродром 1' },
    { code: 'AIRFIELD2', name: 'Аэродром 2' },
    { code: 'AIRFIELD3', name: 'Аэродром 3' },
    { code: 'AIRFIELD4', name: 'Аэродром 4' },
    { code: 'LAUNCHSITE1', name: 'Космодром 1' },
    { code: 'LAUNCHSITE2', name: 'Космодром 2' },
    { code: 'LAUNCHSITE3', name: 'Космодром 3' },
    { code: 'LAUNCHSITE4', name: 'Космодром 4' },
    { code: 'TRAINYARD1', name: 'Депо' },
    { code: 'POWERPLANT1', name: 'Электростанция' },
    { code: 'JUNKYARD1', name: 'Свалка' },
    { code: 'EXCAVATOR1', name: 'Экскаватор' },
    { code: 'MILITARY1', name: 'Военные туннели' },
    { code: 'SEWER1', name: 'Канализация' },
    { code: 'SATELLITE1', name: 'Спутниковая тарелка' },
    { code: 'WATER1', name: 'Водоочистка' },
  ],
  '🏪 Сейфзоны': [
    { code: 'COMPOUND', name: 'Аутпост' },
    { code: 'COMPOUNDCCTV', name: 'Аутпост CCTV' },
    { code: 'COMPOUNDSTREET', name: 'Аутпост улица' },
    { code: 'COMPOUNDCRUDE', name: 'Аутпост нефть' },
    { code: 'BANDIT1', name: 'Лагерь бандитов 1' },
    { code: 'BANDIT2', name: 'Лагерь бандитов 2' },
    { code: 'TOWNWEAPONS', name: 'Оружейный магазин' },
  ],
  '⚓ Порты': [
    { code: 'DOCKS1', name: 'Порт 1' },
    { code: 'DOCKS2', name: 'Порт 2' },
    { code: 'DOCKS3', name: 'Порт 3' },
    { code: 'DOCKS4', name: 'Порт 4' },
  ],
};

// Все коды камер в одном массиве
export const ALL_CAMERA_CODES = Object.values(CAMERAS).flat().map(c => c.code);

export default { MONUMENTS, CAMERAS, ALL_CAMERA_CODES };
