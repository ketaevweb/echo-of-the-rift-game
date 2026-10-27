// ============================================================
// ЭХО РАЗЛОМА — Гранитная Долина (Фаза 6, домен Gothic)
// Скалистая котловина под пепельным небом к востоку от долины,
// за Каменным Хребтом. Колония изгнанников, три лагеря-фракции
// в войне за Ядровой барьер, Яма Колонии, Рудник.
// Мир общий (одна heightmap) — переход через Врата Гранита.
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, PropDef, SpawnZoneDef, Vec } from '../types'
import { MARA_RIDGE } from './mara'

// ---------------- Границы и переходы ----------------

/** Каменный Хребет между долиной и Гранитной Долиной (вертикальная полоса по x). */
export const GRIDGE = { x: 3520, band: 170 }

/** Врата Гранита: порталы по обе стороны хребта. */
export const GR_GATES = {
  valleySide: { x: 3390, y: 1250, exit: { x: 3350, y: 1250 }, label: 'Долина Хеймхолл' },
  granite: { x: 3660, y: 1250, exit: { x: 3690, y: 1250 }, label: 'ГРАНИТНАЯ ДОЛИНА' },
}

// ---------------- Ключевые точки ----------------

/** Колония изгнанников — хаб домена. */
export const COLONY = { pos: { x: 4260, y: 1420 } }
/** Яма Колонии: арена ямных боёв. */
export const PIT = { pos: { x: 4300, y: 1980 }, r: 130 }
/** Рудник — вход в копи (гранитная руда). */
export const MINE = { pos: { x: 4650, y: 830 } }
/** Осколочный барьер — осколок Ядра, за который идёт война лагерей. */
export const SHARD = { pos: { x: 4330, y: 560 } }
/** Логово Мастера Ямы — он же босс домена (Страж Эха Колонии). */
export const PIT_MASTER = { pos: { x: 4380, y: 2050 } }

// ---------------- Жилы руды (побочный квест Брока) ----------------

export const ORE_VEINS: Array<{ id: string; pos: Vec }> = [
  { id: 'ore1', pos: { x: 4020, y: 1050 } },
  { id: 'ore2', pos: { x: 4560, y: 1020 } },
  { id: 'ore3', pos: { x: 4790, y: 1450 } },
  { id: 'ore4', pos: { x: 3950, y: 2350 } },
  { id: 'ore5', pos: { x: 4560, y: 2680 } },
]

// ---------------- Дороги и пропсы Гранита ----------------

export const GRANITE_ROADS: Vec[][] = [
  // Врата Гранита → Колония → Яма
  [
    { x: 3690, y: 1250 }, { x: 3990, y: 1330 }, { x: 4260, y: 1420 },
  ],
  [
    { x: 4260, y: 1480 }, { x: 4280, y: 1750 }, { x: 4300, y: 1900 },
  ],
  // Колония → Рудник → Осколочный барьер
  [
    { x: 4300, y: 1360 }, { x: 4460, y: 1100 }, { x: 4640, y: 870 },
  ],
  [
    { x: 4560, y: 780 }, { x: 4420, y: 650 }, { x: 4330, y: 600 },
  ],
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

function roadDist(x: number, y: number): number {
  let best = Infinity
  for (const road of GRANITE_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function graniteBlocked(x: number, y: number): boolean {
  if (roadDist(x, y) < 85) return true
  if (Math.hypot(x - GR_GATES.granite.x, y - GR_GATES.granite.y) < 150) return true
  if (Math.hypot(x - COLONY.pos.x, y - COLONY.pos.y) < 240) return true
  if (Math.hypot(x - PIT.pos.x, y - PIT.pos.y) < PIT.r + 60) return true
  if (Math.hypot(x - MINE.pos.x, y - MINE.pos.y) < 150) return true
  if (Math.hypot(x - SHARD.pos.x, y - SHARD.pos.y) < 160) return true
  for (const v of ORE_VEINS) {
    if (Math.hypot(x - v.pos.x, y - v.pos.y) < 90) return true
  }
  return false
}

/** Скалы Гранита: обломки осколка Ядра, торчащие всюду (Gothic-вайб).
 *  Южнее Багрового хребта — уже Мара (Фаза 6.3), туда не сеем. */
function buildBoulders(): PropDef[] {
  const rnd = lcg(60613)
  const rocks: PropDef[] = []
  let guard = 0
  const yMax = MARA_RIDGE.y - 280
  while (rocks.length < 64 && guard < 5000) {
    guard++
    const x = GRIDGE.x + 260 + rnd() * (5000 - GRIDGE.x - 340)
    const y = 120 + rnd() * (yMax - 120)
    if (graniteBlocked(x, y)) continue
    if (rocks.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 120)) continue
    rocks.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 10 + Math.floor(rnd() * 10), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return rocks
}

/** Пепельная трава: сухие кусты серо-пепельной котловины. */
function buildAshShrubs(): PropDef[] {
  const rnd = lcg(90210)
  const out: PropDef[] = []
  let guard = 0
  const yMax = MARA_RIDGE.y - 280
  while (out.length < 90 && guard < 6000) {
    guard++
    const x = GRIDGE.x + 240 + rnd() * (5000 - GRIDGE.x - 320)
    const y = 120 + rnd() * (yMax - 120)
    if (graniteBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 75)) continue
    out.push({ kind: rnd() > 0.4 ? 'shrub' : 'flower', pos: { x: Math.round(x), y: Math.round(y) }, r: 6, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Пропсы Гранитной Долины: Колония, Яма, Рудник, барьер. */
export const GRANITE_PROPS: PropDef[] = [
  // Врата Гранита (две стороны Каменного Хребта)
  { id: 'ggate_v', kind: 'portal', pos: { x: GR_GATES.valleySide.x, y: GR_GATES.valleySide.y }, r: 40, solid: false, seed: 81 },
  { id: 'ggate_g', kind: 'portal', pos: { x: GR_GATES.granite.x, y: GR_GATES.granite.y }, r: 40, solid: false, seed: 82 },
  // --- Колония: бараки, костры, стойло торговца ---
  { kind: 'house', pos: { x: 4180, y: 1330 }, w: 150, h: 78, solid: true, seed: 91 },
  { kind: 'house', pos: { x: 4340, y: 1310 }, w: 110, h: 66, solid: true, seed: 92 },
  { kind: 'tent', pos: { x: 4230, y: 1520 }, w: 58, h: 44, solid: true, seed: 93 },
  { kind: 'tent', pos: { x: 4330, y: 1560 }, w: 62, h: 46, solid: true, seed: 94 },
  { kind: 'stall', pos: { x: 4140, y: 1470 }, w: 70, h: 42, solid: true, seed: 95 },
  { kind: 'fire', pos: { x: 4270, y: 1440 }, r: 11, solid: true, seed: 96 },
  { kind: 'dummy', pos: { x: 4420, y: 1460 }, r: 12, solid: true, seed: 97 },
  { kind: 'fence', pos: { x: 4100, y: 1580 }, w: 110, h: 8, solid: false, seed: 98 },
  { kind: 'carcass', pos: { x: 4460, y: 1370 }, r: 12, solid: false, seed: 99 },
  // --- Яма: песчаная арена с частоколом и факелами ---
  { kind: 'pit', pos: { x: PIT.pos.x, y: PIT.pos.y }, r: PIT.r, solid: false, seed: 101 },
  // --- Рудник: каменная арка входа ---
  { kind: 'mine', pos: { x: MINE.pos.x, y: MINE.pos.y }, r: 44, solid: true, seed: 102 },
  // --- Осколочный барьер: три осколка-обелиска Ядра ---
  { kind: 'obelisk', pos: { x: SHARD.pos.x - 55, y: SHARD.pos.y - 20 }, r: 16, solid: true, seed: 103 },
  { kind: 'obelisk', pos: { x: SHARD.pos.x + 55, y: SHARD.pos.y - 10 }, r: 14, solid: true, seed: 104 },
  { kind: 'obelisk', pos: { x: SHARD.pos.x, y: SHARD.pos.y + 40 }, r: 18, solid: true, seed: 105 },
  { kind: 'fire', pos: { x: SHARD.pos.x - 110, y: SHARD.pos.y + 70 }, r: 11, solid: true, seed: 106 },
  { kind: 'fire', pos: { x: SHARD.pos.x + 110, y: SHARD.pos.y + 70 }, r: 11, solid: true, seed: 107 },
  ...buildBoulders(),
  ...buildAshShrubs(),
]

// ---------------- NPC Гранита ----------------

export const GRANITE_NPCS = [
  { id: 'kharan', name: 'Хран', role: 'Смотритель барьера', pos: { x: 4330, y: 660 }, color: '#c9a3e8', dialogue: 'granite_warden' },
  { id: 'kassia', name: 'Кассия', role: 'Распорядительница Ямы', pos: { x: 4190, y: 1900 }, color: '#d9a441', dialogue: 'pit_keeper' },
  { id: 'brock', name: 'Брок', role: 'Кузнец Колонии', pos: { x: 4200, y: 1470 }, color: '#b0563a', dialogue: 'smith_brock' },
  { id: 'yorv', name: 'Йорв', role: 'Офицер Ордена Пепла', pos: { x: 4330, y: 1330 }, color: '#d96b3a', dialogue: 'join_order' },
  { id: 'liara', name: 'Лиара', role: 'Послушница Ковена Ветвей', pos: { x: 4150, y: 1370 }, color: '#7a9a6a', dialogue: 'join_coven' },
  { id: 'finn', name: 'Финн', role: 'Вольный стрелок Дозора', pos: { x: 4390, y: 1500 }, color: '#c9b06b', dialogue: 'join_watch' },
]

// ---------------- Спавны и интеракты ----------------

export const GRANITE_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'gran_scorp_a', enemy: 'scorpion', center: { x: 4020, y: 2600 }, radius: 280, max: 4, respawnSec: 32 },
  { id: 'gran_scorp_b', enemy: 'scorpion', center: { x: 4560, y: 2300 }, radius: 230, max: 3, respawnSec: 36 },
  { id: 'gran_scorp_c', enemy: 'scorpion', center: { x: 4080, y: 950 }, radius: 210, max: 2, respawnSec: 40 },
]

export const GRANITE_INTERACTABLES: InteractableDef[] = [
  {
    id: 'ggate_valley',
    name: 'Врата Гранита',
    pos: { x: GR_GATES.valleySide.x, y: GR_GATES.valleySide.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:granite',
  },
  {
    id: 'ggate_granite',
    name: 'Врата Гранита',
    pos: { x: GR_GATES.granite.x, y: GR_GATES.granite.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:valley',
  },
  {
    id: 'shard_ui',
    name: 'Осколочный барьер',
    pos: { x: SHARD.pos.x, y: SHARD.pos.y },
    r: 70,
    prompt: 'Коснуться',
    kind: 'altar',
    action: 'dialogue:shard_barrier',
  },
  ...ORE_VEINS.map((v) => ({
    id: v.id,
    name: 'Гранитная жила',
    pos: v.pos,
    r: 40,
    prompt: 'Добыть',
    kind: 'ore' as const,
    action: 'ore:granite_ore',
  })),
]

export const GRANITE_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'granite', name: 'Гранитная Долина', rect: [3560, 0, 1440, 4200] },
  { id: 'colony', name: 'Колония', rect: [4020, 1220, 520, 420] },
  { id: 'pit_area', name: 'Яма Колонии', rect: [4150, 1850, 320, 280] },
  { id: 'mine_area', name: 'Рудник', rect: [4500, 700, 340, 300] },
]

export const GRANITE_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: GR_GATES.valleySide.x, y: GR_GATES.valleySide.y }, label: 'Врата Гранита' },
  { pos: { ...COLONY.pos }, label: 'Колония' },
  { pos: { ...PIT.pos }, label: 'Яма' },
  { pos: { ...MINE.pos }, label: 'Рудник' },
  { pos: { ...SHARD.pos }, label: 'Осколочный барьер' },
]
