import { AreaDef, InteractableDef, NpcDef, PropDef, SpawnZoneDef, Vec } from '../types'
import {
  ASH_MOTHER,
  GATES,
  RIDGE,
  VELD_AREAS,
  VELD_CLUES,
  VELD_INTERACTABLES,
  VELD_MARKERS,
  VELD_PROPS,
  VELD_ROADS,
  VELD_SPAWN_ZONES,
} from './veld'
import {
  GRANITE_AREAS,
  GRANITE_INTERACTABLES,
  GRANITE_MARKERS,
  GRANITE_NPCS,
  GRANITE_PROPS,
  GRANITE_ROADS,
  GRANITE_SPAWN_ZONES,
  GRIDGE,
  GR_GATES,
} from './granite'
import {
  FROST_AREAS,
  FROST_INTERACTABLES,
  FROST_MARKERS,
  FROST_NPCS,
  FROST_PROPS,
  FROST_ROADS,
  FROST_SPAWN_ZONES,
  FRIDGE,
  FR_GATES,
} from './frost'
import {
  BASTION,
  BASTION_GATE,
  BLIGHT_WELLS,
  MA_GATES,
  MARA_AREAS,
  MARA_INTERACTABLES,
  MARA_MARKERS,
  MARA_NPCS,
  MARA_PROPS,
  MARA_RIDGE,
  MARA_ROADS,
  MARA_SPAWN_ZONES,
} from './mara'

/** Мир: долина Хеймхолл на северо-западе, Вельд на юге за Хребтом (Фаза 3),
 *  Гранитная Долина на востоке за Каменным Хребтом (Фаза 6),
 *  Стылое Пределье за Стылым Хребтом (Фаза 6.2),
 *  Багровая Мара на юге Гранита за Багровым хребтом (Фаза 6.3). */
export const WORLD = { w: 6360, h: 4200 }

/** Южная граница «старой» долины — генераторы леса/камней долины клампятся к ней. */
const VALLEY_BOTTOM = 2380

export const PLAYER_SPAWN: Vec = { x: 960, y: 1780 }

/** Верхняя граница «Долины» на карте (до Хребта). */
const RIDGE_OF_WORLD = RIDGE.y + 40

export const AREAS: AreaDef[] = [
  { id: 'heimarhall', name: 'Хеймхолл', rect: [660, 1330, 680, 480] },
  { id: 'murkwood', name: 'Сумрачный лес', rect: [260, 200, 1300, 1000] },
  { id: 'stones', name: 'Камни Древних', rect: [1980, 460, 460, 420] },
  { id: 'lake', name: 'Озеро Лун', rect: [1300, 1950, 640, 430] },
  { id: 'camp', name: 'Лагерь разбойников', rect: [2380, 1520, 500, 380] },
  { id: 'rift', name: 'Сердце Разлома', rect: [2660, 100, 520, 480] },
  ...VELD_AREAS,
  ...GRANITE_AREAS,
  ...FROST_AREAS,
  ...MARA_AREAS,
  { id: 'wilds', name: 'Долина', rect: [0, 0, WORLD.w, RIDGE_OF_WORLD] },
]

export const LAKE = { x: 1600, y: 2160, r: 160 }

// Дороги для рендера и проверки препятствий (долина + Вельд)
export const ROADS: Vec[][] = [
  [
    { x: 960, y: 1820 }, { x: 960, y: 1480 },
  ],
  [
    { x: 960, y: 1520 }, { x: 1450, y: 1180 }, { x: 1980, y: 830 }, { x: 2200, y: 700 },
  ],
  [
    { x: 920, y: 1340 }, { x: 830, y: 1080 }, { x: 890, y: 830 },
  ],
  [
    { x: 1080, y: 1700 }, { x: 1440, y: 1940 }, { x: 1430, y: 2040 },
  ],
  [
    { x: 1150, y: 1500 }, { x: 1900, y: 1600 }, { x: 2430, y: 1640 },
  ],
  [
    { x: 2200, y: 660 }, { x: 2580, y: 540 }, { x: 2880, y: 440 },
  ],
  // Тропа к Вратам Тумана и вельдские тропы (Фаза 3)
  [
    { x: 1430, y: 2040 }, { x: 1460, y: 2230 }, { x: 1480, y: 2350 },
  ],
  ...VELD_ROADS,
  // Тропы Гранитной Долины (Фаза 6)
  ...GRANITE_ROADS,
  // Тропы Стылого Пределья (Фаза 6.2)
  ...FROST_ROADS,
  // Тропы Багровой Мары (Фаза 6.3)
  ...MARA_ROADS,
]

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function blocked(px: number, py: number): boolean {
  // Хребет между долиной и Вельдом — не застраиваем
  if (Math.abs(py - RIDGE.y) < 340) return true
  // Каменный Хребет к Граниту (Фаза 6)
  if (Math.abs(px - GRIDGE.x) < 340) return true
  // Стылый Хребет к Пределью (Фаза 6.2)
  if (Math.abs(px - FRIDGE.x) < 340) return true
  // Деревня, лагерь, озеро, камни, разлом, врата
  if (px > 640 && px < 1380 && py > 1310 && py < 1830) return true
  if (px > 2380 && px < 2900 && py > 1500 && py < 1920) return true
  if (Math.hypot(px - LAKE.x, py - LAKE.y) < LAKE.r + 120) return true
  if (Math.hypot(px - 2200, py - 650) < 200) return true
  if (px > 2640 && px < 3200 && py > 80 && py < 600) return true
  if (Math.hypot(px - GATES.valley.x, py - GATES.valley.y) < 150) return true
  if (Math.hypot(px - GR_GATES.valleySide.x, py - GR_GATES.valleySide.y) < 150) return true
  if (Math.hypot(px - FR_GATES.graniteSide.x, py - FR_GATES.graniteSide.y) < 150) return true
  // Дороги (включая вельдские и гранитные)
  for (const road of ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      if (distToSeg(px, py, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y) < 85) return true
    }
  }
  return false
}

function buildTrees(): PropDef[] {
  const rnd = lcg(1337)
  const trees: PropDef[] = []
  let guard = 0
  while (trees.length < 130 && guard < 4000) {
    guard++
    const x = 60 + rnd() * (GRIDGE.x - 240)
    const y = 60 + rnd() * (VALLEY_BOTTOM - 120)
    if (blocked(x, y)) continue
    if (trees.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 90)) continue
    trees.push({ kind: 'tree', pos: { x: Math.round(x), y: Math.round(y) }, r: 13, solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return trees
}

function buildRocks(): PropDef[] {
  const rnd = lcg(777)
  const rocks: PropDef[] = []
  let guard = 0
  while (rocks.length < 42 && guard < 2000) {
    guard++
    const x = 60 + rnd() * (GRIDGE.x - 240)
    const y = 60 + rnd() * (VALLEY_BOTTOM - 120)
    if (blocked(x, y)) continue
    if (rocks.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 140)) continue
    rocks.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 9 + Math.floor(rnd() * 8), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return rocks
}

// Простые прямоугольники-исключения для кустов
const NO_SHRUB_RECTS: Array<[number, number, number, number]> = [
  [640, 1310, 740, 520],
  [2380, 1500, 520, 420],
  [2640, 80, 560, 520],
]

function inRects(x: number, y: number, rects: Array<[number, number, number, number]>) {
  return rects.some(([rx, ry, rw, rh]) => x > rx && x < rx + rw && y > ry && y < ry + rh)
}

function buildShrubsFixed(): PropDef[] {
  const rnd = lcg(4242)
  const shrubs: PropDef[] = []
  let guard = 0
  while (shrubs.length < 90 && guard < 3000) {
    guard++
    const x = 60 + rnd() * (GRIDGE.x - 240)
    const y = 60 + rnd() * (VALLEY_BOTTOM - 120)
    if (inRects(x, y, NO_SHRUB_RECTS)) continue
    if (Math.hypot(x - LAKE.x, y - LAKE.y) < LAKE.r + 30) continue
    if (shrubs.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 70)) continue
    shrubs.push({ kind: rnd() > 0.5 ? 'shrub' : 'flower', pos: { x: Math.round(x), y: Math.round(y) }, r: 6, seed: Math.floor(rnd() * 9999) })
  }
  return shrubs
}

export const PROPS: PropDef[] = [
  // --- Хеймхолл ---
  { kind: 'house', pos: { x: 930, y: 1400 }, w: 190, h: 96, solid: true, seed: 1 },
  { kind: 'house', pos: { x: 1100, y: 1460 }, w: 120, h: 70, solid: true, seed: 2 },
  { kind: 'house', pos: { x: 840, y: 1660 }, w: 115, h: 68, solid: true, seed: 3 },
  { kind: 'stall', pos: { x: 1060, y: 1585 }, w: 70, h: 42, solid: true, seed: 4 },
  { kind: 'dummy', pos: { x: 840, y: 1548 }, r: 12, solid: true, seed: 5 },
  { kind: 'fire', pos: { x: 960, y: 1560 }, r: 11, solid: true, seed: 6 },
  { kind: 'fence', pos: { x: 760, y: 1480 }, w: 90, h: 8, solid: false, seed: 7 },
  { kind: 'fence', pos: { x: 760, y: 1620 }, w: 90, h: 8, solid: false, seed: 8 },
  { kind: 'fence', pos: { x: 1180, y: 1700 }, w: 110, h: 8, solid: false, seed: 9 },
  // --- Камни Древних ---
  { kind: 'stone', pos: { x: 2120, y: 620 }, r: 13, solid: true, seed: 11 },
  { kind: 'stone', pos: { x: 2280, y: 620 }, r: 13, solid: true, seed: 12 },
  { kind: 'stone', pos: { x: 2110, y: 720 }, r: 12, solid: true, seed: 13 },
  { kind: 'stone', pos: { x: 2295, y: 715 }, r: 12, solid: true, seed: 14 },
  { kind: 'stone', pos: { x: 2200, y: 560 }, r: 12, solid: true, seed: 15 },
  { kind: 'altar', pos: { x: 2200, y: 660 }, r: 16, solid: false, seed: 16 },
  // --- Лагерь бандитов ---
  { kind: 'tent', pos: { x: 2500, y: 1600 }, w: 62, h: 46, solid: true, seed: 21 },
  { kind: 'tent', pos: { x: 2620, y: 1570 }, w: 58, h: 44, solid: true, seed: 22 },
  { kind: 'tent', pos: { x: 2700, y: 1660 }, w: 60, h: 46, solid: true, seed: 23 },
  { kind: 'fire', pos: { x: 2590, y: 1640 }, r: 11, solid: true, seed: 24 },
  { kind: 'fence', pos: { x: 2480, y: 1730 }, w: 130, h: 8, solid: false, seed: 25 },
  { kind: 'dummy', pos: { x: 2650, y: 1740 }, r: 12, solid: true, seed: 26 },
  // --- Берлога альфы ---
  { kind: 'carcass', pos: { x: 700, y: 470 }, r: 16, solid: false, seed: 31 },
  { kind: 'carcass', pos: { x: 760, y: 430 }, r: 12, solid: false, seed: 32 },
  { kind: 'rock', pos: { x: 640, y: 420 }, r: 16, solid: true, seed: 33 },
  { kind: 'rock', pos: { x: 780, y: 500 }, r: 14, solid: true, seed: 34 },
  // --- Сердце Разлома ---
  { kind: 'rift', pos: { x: 2980, y: 230 }, r: 60, solid: false, seed: 41 },
  { kind: 'rock', pos: { x: 2840, y: 300 }, r: 18, solid: true, seed: 42 },
  { kind: 'rock', pos: { x: 3060, y: 330 }, r: 20, solid: true, seed: 43 },
  { kind: 'rock', pos: { x: 2950, y: 140 }, r: 17, solid: true, seed: 44 },
  // Барьер перед Разломом (убирается по квесту)
  { id: 'barrier', kind: 'barrier', pos: { x: 2880, y: 452 }, r: 22, solid: true, seed: 45 },
  { id: 'barrier2', kind: 'barrier', pos: { x: 2935, y: 470 }, r: 22, solid: true, seed: 46 },
  { id: 'barrier3', kind: 'barrier', pos: { x: 2990, y: 455 }, r: 22, solid: true, seed: 47 },
  // Озеро: ритуальные камни
  { kind: 'stone', pos: { x: 1420, y: 2075 }, r: 10, solid: true, seed: 51 },
  { kind: 'stone', pos: { x: 1810, y: 2230 }, r: 10, solid: true, seed: 52 },
  ...VELD_PROPS,
  ...GRANITE_PROPS,
  ...FROST_PROPS,
  ...MARA_PROPS,
  ...buildTrees(),
  ...buildRocks(),
  ...buildShrubsFixed(),
]

export const NPCS: NpcDef[] = [
  { id: 'bjorn', name: 'Бьорн', role: 'Старейшина', pos: { x: 965, y: 1475 }, color: '#d9a441', dialogue: 'elder_bjorn' },
  { id: 'grim', name: 'Грим', role: 'Торговец', pos: { x: 1078, y: 1615 }, color: '#c9b06b', dialogue: 'merchant_grim' },
  { id: 'alra', name: 'Альра', role: 'Алхимик', pos: { x: 1180, y: 1560 }, color: '#7a9a6a', dialogue: 'alchemist_alra' },
  { id: 'dorn', name: 'Дорн', role: 'Наставник', pos: { x: 868, y: 1585 }, color: '#b08356', dialogue: 'trainer_dorn' },
  { id: 'irma', name: 'Ирма', role: 'Капитан Ордена', pos: { x: 1215, y: 1510 }, color: '#d96b3a', dialogue: 'recruit_flame' },
  { id: 'selena', name: 'Селена', role: 'Архимаг Ковена', pos: { x: 742, y: 1462 }, color: '#9a7fc0', dialogue: 'recruit_mist' },
  { id: 'kaya', name: 'Кайя', role: 'Магистр-странница', pos: { x: 2150, y: 700 }, color: '#9fb8a4', dialogue: 'stones_kaya' },
  { id: 'torvald_npc', name: 'Торвальд', role: 'Воитель', pos: { x: 2255, y: 705 }, color: '#7a8a4a', dialogue: 'stones_torvald' },
  // Гранитная Долина (Фаза 6)
  ...GRANITE_NPCS,
  // Стылое Пределье (Фаза 6.2)
  ...FROST_NPCS,
  // Багровая Мара (Фаза 6.3)
  ...MARA_NPCS,
]

export const SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'forest_a', enemy: 'wolf', center: { x: 900, y: 720 }, radius: 300, max: 5, respawnSec: 28 },
  { id: 'forest_b', enemy: 'wolf', center: { x: 1150, y: 980 }, radius: 200, max: 3, respawnSec: 32 },
  { id: 'camp_melee', enemy: 'bandit', center: { x: 2540, y: 1650 }, radius: 130, max: 4, respawnSec: 45 },
  { id: 'camp_ranged', enemy: 'archer', center: { x: 2660, y: 1590 }, radius: 110, max: 2, respawnSec: 50 },
  { id: 'rift_a', enemy: 'horror', center: { x: 2860, y: 280 }, radius: 130, max: 3, respawnSec: 60 },
  ...VELD_SPAWN_ZONES,
  ...GRANITE_SPAWN_ZONES,
  ...FROST_SPAWN_ZONES,
  ...MARA_SPAWN_ZONES,
]

export const UNIQUE_SPAWNS: Array<{ id: string; enemy: 'alpha' | 'captain' | 'boss'; pos: Vec; cond?: string }> = [
  { id: 'alpha', enemy: 'alpha', pos: { x: 720, y: 450 } },
  { id: 'captain', enemy: 'captain', pos: { x: 2590, y: 1690 } },
  { id: 'boss', enemy: 'boss', pos: { x: 2950, y: 270 } },
]

export const INTERACTABLES: InteractableDef[] = [
  { id: 'altar', name: 'Древний алтарь', pos: { x: 2200, y: 660 }, r: 46, prompt: 'Осмотреть', kind: 'altar', action: 'dialogue:altar' },
  { id: 'herb1', name: 'Лунная трава', pos: { x: 1420, y: 2020 }, r: 34, prompt: 'Собрать', kind: 'herb', action: 'gather:moon_herb' },
  { id: 'herb2', name: 'Лунная трава', pos: { x: 1480, y: 2300 }, r: 34, prompt: 'Собрать', kind: 'herb', action: 'gather:moon_herb' },
  { id: 'herb3', name: 'Лунная трава', pos: { x: 1790, y: 2160 }, r: 34, prompt: 'Собрать', kind: 'herb', action: 'gather:moon_herb' },
  { id: 'herb4', name: 'Лунная трава', pos: { x: 1650, y: 2320 }, r: 34, prompt: 'Собрать', kind: 'herb', action: 'gather:moon_herb' },
  { id: 'barrier_ui', name: 'Пелена Разлома', pos: { x: 2935, y: 470 }, r: 60, prompt: 'Осмотреть', kind: 'barrier', action: 'dialogue:barrier', cond: 'quest.main<5' },
  ...VELD_INTERACTABLES,
  ...GRANITE_INTERACTABLES,
  ...FROST_INTERACTABLES,
  ...MARA_INTERACTABLES,
]

export const AREA_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: 960, y: 1560 }, label: 'Хеймхолл' },
  { pos: { x: 900, y: 700 }, label: 'Сумрачный лес' },
  { pos: { x: 2200, y: 650 }, label: 'Камни Древних' },
  { pos: { x: 1600, y: 2160 }, label: 'Озеро Лун' },
  { pos: { x: 2590, y: 1640 }, label: 'Лагерь' },
  { pos: { x: 2950, y: 280 }, label: 'Разлом' },
  ...VELD_MARKERS,
  ...GRANITE_MARKERS,
  ...FROST_MARKERS,
  ...MARA_MARKERS,
]

// Реэкспорты Вельда/Гранита/Пределья/Марый для движка/рендеров (единая точка импорта мира)
export { ASH_MOTHER, GATES, POOLS, RIDGE, VELD_CLUES } from './veld'
export { COLONY, GRIDGE, GR_GATES, MINE, ORE_VEINS, PIT, PIT_MASTER, SHARD } from './granite'
export {
  BARROW,
  FROST_CLUES,
  FRIDGE,
  FR_GATES,
  HAVEN,
  ROOST,
  RUNE_CAVE,
  RUNE_DOOR,
  RUNE_INIT,
  RUNE_SOLUTION,
  RUNE_STONES,
  RUNE_SYMBOLS,
  WORD_WALL_FORCE,
  WORD_WALL_FROST,
} from './frost'
export {
  BASTION,
  BASTION_GATE,
  BLIGHT_WELLS,
  BREACH_CAMPS,
  MA_GATES,
  MARA_RIDGE,
  MORASS,
  SIEGE_BREAK,
  SIEGE_GATE_HP,
  SIEGE_WAVES,
} from './mara'

/** Зона по мировой точке: Пределье (восток за Стылым Хребтом) приоритетнее,
 *  затем Гранит (восток за Каменным Хребтом), в юге которого — Мара (Фаза 6.3),
 *  затем Вельд (юг за Хребтом), остальное — долина. */
export function zoneOf(x: number, y: number): 'valley' | 'veld' | 'granite' | 'frost' | 'mara' {
  if (x > FRIDGE.x) return 'frost'
  if (x > GRIDGE.x) return y > MARA_RIDGE.y ? 'mara' : 'granite'
  return y > RIDGE.y ? 'veld' : 'valley'
}
