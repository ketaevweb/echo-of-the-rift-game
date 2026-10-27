// ============================================================
// ЭХО РАЗЛОМА — Стылое Пределье (Фаза 6.2, домен Skyrim)
// Снежная тундра за Стылым Хребтом к востоку от Гранитной Долины.
// Пещера Рун с головоломкой (рунные камни-кольца), Стены Слов
// (Ту'ум — крики), Драконий Дол с событием дракона Иммолтакса.
// Мир общий (одна heightmap) — переход через Врата Пределья.
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, PropDef, SpawnZoneDef, Vec } from '../types'

// ---------------- Границы и переходы ----------------

/** Стылый Хребет между Гранитом и Предельем (вертикальная полоса по x). */
export const FRIDGE = { x: 5390, band: 170 }

/** Врата Пределья: порталы по обе стороны хребта. */
export const FR_GATES = {
  graniteSide: { x: 5260, y: 1250, exit: { x: 5230, y: 1250 }, label: 'Гранитная Долина' },
  frost: { x: 5520, y: 1250, exit: { x: 5550, y: 1250 }, label: 'СТЫЛОЕ ПРЕДЕЛЬЕ' },
}

// ---------------- Ключевые точки ----------------

/** Стылый Приют — хаб домена: последние дома перед вечными снегами. */
export const HAVEN = { pos: { x: 5850, y: 1450 } }
/** Пещера Рун — головоломка из трёх рунных камней за рунной дверью. */
export const RUNE_CAVE = { pos: { x: 6020, y: 620 } }
/** Рунные камни: циклятся символы (0 заяц, 1 волк, 2 луна). */
export const RUNE_STONES: Array<{ id: string; pos: Vec }> = [
  { id: 'rs1', pos: { x: 5935, y: 705 } },
  { id: 'rs2', pos: { x: 6020, y: 745 } },
  { id: 'rs3', pos: { x: 6105, y: 705 } },
]
/** Решение головоломки: Заяц — Волк — Луна (подсказка на плите). */
export const RUNE_SOLUTION: Record<string, number> = { rs1: 0, rs2: 1, rs3: 2 }
export const RUNE_SYMBOLS = ['Заяц', 'Волк', 'Луна']
/** Стартовое (перепутанное) состояние камней. */
export const RUNE_INIT: { rs1: number; rs2: number; rs3: number } = { rs1: 1, rs2: 2, rs3: 0 }
/** Рунная дверь: три пелены, убираются решением головоломки. */
export const RUNE_DOOR = { pos: { x: 6020, y: 560 } }
/** Стена Слова №1: Сила (ФУС) — за рунной дверью. */
export const WORD_WALL_FORCE = { pos: { x: 6020, y: 400 } }
/** Стена Слова №2: Мороз (ЛОК) — на снежном плато, под охраной тролля. */
export const WORD_WALL_FROST = { pos: { x: 6140, y: 2330 } }
/** Драконий Дол — выжженная чаша, где начинается событие дракона. */
export const ROOST = { pos: { x: 5800, y: 3150 }, r: 420 }
/** Курган драугров. */
export const BARROW = { pos: { x: 5700, y: 2250 } }

// ---------------- Следы пожара (квест Ингрид) ----------------

export interface FrostClueDef {
  id: string
  pos: Vec
  name: string
  text: string
}

export const FROST_CLUES: FrostClueDef[] = [
  {
    id: 'fclue1',
    pos: { x: 5830, y: 2430 },
    name: 'Обугленная сосна',
    text: 'Сосна сгорела изнутри, снег вокруг растоплен и снова замёрз коркой. Огонь падал сверху — с неба.',
  },
  {
    id: 'fclue2',
    pos: { x: 5680, y: 2790 },
    name: 'Волчья стая-скелет',
    text: 'Четыре скелета волков в кругу оплавленного снега. Ни клыков, ни когтей в стороне — они дрались спинами внутрь.',
  },
  {
    id: 'fclue3',
    pos: { x: 5905, y: 2985 },
    name: 'Крыло в скале',
    text: 'В скалу впечатано что-то огромное и кожистое — обрывок крыла. Верхние тёплые ветра Пределья носят того, кто его потерял.',
  },
]

// ---------------- Дороги и пропсы Пределья ----------------

export const FROST_ROADS: Vec[][] = [
  // Врата Пределья → Стылый Приют
  [
    { x: 5550, y: 1250 }, { x: 5700, y: 1330 }, { x: 5850, y: 1450 },
  ],
  // Приют → Пещера Рун (север)
  [
    { x: 5850, y: 1500 }, { x: 5920, y: 1100 }, { x: 6020, y: 760 },
  ],
  // Приют → курган → Драконий Дол (юг)
  [
    { x: 5850, y: 1520 }, { x: 5820, y: 2450 }, { x: 5800, y: 3150 },
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
  for (const road of FROST_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function frostBlocked(x: number, y: number): boolean {
  if (roadDist(x, y) < 85) return true
  if (Math.hypot(x - FR_GATES.frost.x, y - FR_GATES.frost.y) < 150) return true
  if (Math.hypot(x - HAVEN.pos.x, y - HAVEN.pos.y) < 240) return true
  if (Math.hypot(x - RUNE_CAVE.pos.x, y - RUNE_CAVE.pos.y) < 210) return true
  for (const s of RUNE_STONES) {
    if (Math.hypot(x - s.pos.x, y - s.pos.y) < 80) return true
  }
  if (Math.hypot(x - WORD_WALL_FORCE.pos.x, y - WORD_WALL_FORCE.pos.y) < 160) return true
  if (Math.hypot(x - WORD_WALL_FROST.pos.x, y - WORD_WALL_FROST.pos.y) < 150) return true
  if (Math.hypot(x - ROOST.pos.x, y - ROOST.pos.y) < ROOST.r * 0.7) return true
  if (Math.hypot(x - BARROW.pos.x, y - BARROW.pos.y) < 150) return true
  return false
}

/** Снежные ели Пределья: тёмная хвоя под шапками снега. */
function buildSnowTrees(): PropDef[] {
  const rnd = lcg(4477)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 92 && guard < 6000) {
    guard++
    const x = FRIDGE.x + 260 + rnd() * (6360 - FRIDGE.x - 320)
    const y = 120 + rnd() * 3960
    if (frostBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 95)) continue
    out.push({ kind: 'snowtree', pos: { x: Math.round(x), y: Math.round(y) }, r: 12, solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Валуны и ледяные глыбы. */
function buildFrostRocks(): PropDef[] {
  const rnd = lcg(8123)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 40 && guard < 4000) {
    guard++
    const x = FRIDGE.x + 250 + rnd() * (6360 - FRIDGE.x - 310)
    const y = 120 + rnd() * 3960
    if (frostBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 130)) continue
    out.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 10 + Math.floor(rnd() * 9), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

export const FROST_PROPS: PropDef[] = [
  // Врата Пределья (две стороны Стылого Хребта)
  { id: 'fgate_g', kind: 'portal', pos: { x: FR_GATES.graniteSide.x, y: FR_GATES.graniteSide.y }, r: 40, solid: false, seed: 111 },
  { id: 'fgate_f', kind: 'portal', pos: { x: FR_GATES.frost.x, y: FR_GATES.frost.y }, r: 40, solid: false, seed: 112 },
  // --- Стылый Приют: дома, навес торговца, костёр ---
  { kind: 'house', pos: { x: 5770, y: 1370 }, w: 140, h: 74, solid: true, seed: 121 },
  { kind: 'house', pos: { x: 5930, y: 1350 }, w: 120, h: 66, solid: true, seed: 122 },
  { kind: 'tent', pos: { x: 5800, y: 1540 }, w: 58, h: 44, solid: true, seed: 123 },
  { kind: 'stall', pos: { x: 5940, y: 1470 }, w: 70, h: 42, solid: true, seed: 124 },
  { kind: 'fire', pos: { x: 5860, y: 1460 }, r: 11, solid: true, seed: 125 },
  { kind: 'fence', pos: { x: 5740, y: 1600 }, w: 110, h: 8, solid: false, seed: 126 },
  // --- Пещера Рун: вход, рунные камни, рунная дверь ---
  { kind: 'cave', pos: { x: RUNE_CAVE.pos.x, y: RUNE_CAVE.pos.y }, r: 44, solid: true, seed: 131 },
  { kind: 'runestone', id: 'rs1', pos: { x: RUNE_STONES[0].pos.x, y: RUNE_STONES[0].pos.y }, r: 12, solid: true, seed: 132 },
  { kind: 'runestone', id: 'rs2', pos: { x: RUNE_STONES[1].pos.x, y: RUNE_STONES[1].pos.y }, r: 12, solid: true, seed: 133 },
  { kind: 'runestone', id: 'rs3', pos: { x: RUNE_STONES[2].pos.x, y: RUNE_STONES[2].pos.y }, r: 12, solid: true, seed: 134 },
  { kind: 'rune_door', id: 'rdoor1', pos: { x: RUNE_DOOR.pos.x - 62, y: RUNE_DOOR.pos.y }, r: 20, solid: true, seed: 135 },
  { kind: 'rune_door', id: 'rdoor2', pos: { x: RUNE_DOOR.pos.x, y: RUNE_DOOR.pos.y }, r: 20, solid: true, seed: 136 },
  { kind: 'rune_door', id: 'rdoor3', pos: { x: RUNE_DOOR.pos.x + 62, y: RUNE_DOOR.pos.y }, r: 20, solid: true, seed: 137 },
  // Стена Слова: Сила (в глубине пещеры, за дверью)
  { kind: 'wordwall', pos: { x: WORD_WALL_FORCE.pos.x, y: WORD_WALL_FORCE.pos.y }, w: 150, h: 30, solid: true, seed: 501 },
  // Стена Слова: Мороз (плато на юго-востоке)
  { kind: 'wordwall', pos: { x: WORD_WALL_FROST.pos.x, y: WORD_WALL_FROST.pos.y }, w: 150, h: 30, solid: true, seed: 502 },
  // --- Курган драугров ---
  { kind: 'stone', pos: { x: BARROW.pos.x - 60, y: BARROW.pos.y - 40 }, r: 12, solid: true, seed: 141 },
  { kind: 'stone', pos: { x: BARROW.pos.x + 62, y: BARROW.pos.y - 30 }, r: 12, solid: true, seed: 142 },
  { kind: 'stone', pos: { x: BARROW.pos.x - 20, y: BARROW.pos.y + 55 }, r: 11, solid: true, seed: 143 },
  { kind: 'carcass', pos: { x: BARROW.pos.x + 25, y: BARROW.pos.y - 60 }, r: 13, solid: false, seed: 144 },
  // --- Драконий Дол: обугленные стволы, кости, оплавленные камни ---
  { kind: 'deadtree', pos: { x: 5720, y: 3060 }, r: 11, solid: true, seed: 151 },
  { kind: 'deadtree', pos: { x: 5890, y: 3120 }, r: 10, solid: true, seed: 152 },
  { kind: 'deadtree', pos: { x: 5800, y: 3290 }, r: 12, solid: true, seed: 153 },
  { kind: 'deadtree', pos: { x: 5690, y: 3230 }, r: 9, solid: true, seed: 154 },
  { kind: 'deadtree', pos: { x: 5900, y: 3250 }, r: 10, solid: true, seed: 155 },
  { kind: 'carcass', pos: { x: 5830, y: 3080 }, r: 15, solid: false, seed: 156 },
  { kind: 'carcass', pos: { x: 5760, y: 3180 }, r: 12, solid: false, seed: 157 },
  { kind: 'rock', pos: { x: 5745, y: 3130 }, r: 15, solid: true, seed: 158 },
  { kind: 'rock', pos: { x: 5865, y: 3205 }, r: 13, solid: true, seed: 159 },
  ...buildSnowTrees(),
  ...buildFrostRocks(),
]

// ---------------- NPC Пределья ----------------

export const FROST_NPCS = [
  { id: 'einar', name: 'Эйнар', role: 'Сказитель Пределья', pos: { x: 5810, y: 1400 }, color: '#c9b06b', dialogue: 'frost_einar' },
  { id: 'ingrid', name: 'Ингрид', role: 'Охотница Пределья', pos: { x: 5905, y: 1515 }, color: '#9fb8a4', dialogue: 'frost_ingrid' },
]

// ---------------- Спавны и интеракты ----------------

export const FROST_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'frost_wolves', enemy: 'wolf', center: { x: 5680, y: 1660 }, radius: 220, max: 4, respawnSec: 30 },
  { id: 'frost_draugr_a', enemy: 'draugr', center: { x: 5980, y: 860 }, radius: 160, max: 3, respawnSec: 52 },
  { id: 'frost_draugr_b', enemy: 'draugr', center: { x: 5710, y: 2320 }, radius: 170, max: 3, respawnSec: 56 },
  { id: 'frost_troll_a', enemy: 'frost_troll', center: { x: 6090, y: 2210 }, radius: 140, max: 1, respawnSec: 75 },
]

export const FROST_INTERACTABLES: InteractableDef[] = [
  {
    id: 'fgate_granite',
    name: 'Врата Пределья',
    pos: { x: FR_GATES.graniteSide.x, y: FR_GATES.graniteSide.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:frost',
  },
  {
    id: 'fgate_frost',
    name: 'Врата Пределья',
    pos: { x: FR_GATES.frost.x, y: FR_GATES.frost.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:granite',
  },
  // Рунные камни: поворот кольца
  ...RUNE_STONES.map((s) => ({
    id: s.id,
    name: 'Рунный камень',
    pos: s.pos,
    r: 40,
    prompt: 'Повернуть',
    kind: 'altar' as const,
    action: 'rune:' + s.id,
  })),
  // Плита с подсказкой
  {
    id: 'rune_slab',
    name: 'Древняя плита',
    pos: { x: 6020, y: 810 },
    r: 40,
    prompt: 'Прочесть',
    kind: 'clue' as const,
    action: 'dialogue:frost_slab',
  },
  // Рунная дверь
  {
    id: 'rune_door_ui',
    name: 'Рунная дверь',
    pos: { x: RUNE_DOOR.pos.x, y: RUNE_DOOR.pos.y },
    r: 74,
    prompt: 'Осмотреть',
    kind: 'barrier' as const,
    action: 'dialogue:frost_slab',
    cond: '!flag.runeDoorOpen',
  },
  // Стены Слов
  {
    id: 'wall_force',
    name: 'Стена Слова',
    pos: { x: WORD_WALL_FORCE.pos.x, y: WORD_WALL_FORCE.pos.y },
    r: 66,
    prompt: 'Коснуться',
    kind: 'altar' as const,
    action: 'word:force',
    cond: '!flag.wordForce',
  },
  {
    id: 'wall_frost',
    name: 'Стена Слова',
    pos: { x: WORD_WALL_FROST.pos.x, y: WORD_WALL_FROST.pos.y },
    r: 66,
    prompt: 'Коснуться',
    kind: 'altar' as const,
    action: 'word:frost',
    cond: '!flag.wordFrost',
  },
  // Следы пожара (квест Ингрид)
  ...FROST_CLUES.map((c) => ({
    id: c.id,
    name: c.name,
    pos: c.pos,
    r: 36,
    prompt: 'Осмотреть',
    kind: 'clue' as const,
    action: 'fclue:frost_dragon',
  })),
]

export const FROST_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'frost', name: 'Стылое Пределье', rect: [5560, 0, 800, 4200] },
  { id: 'haven', name: 'Стылый Приют', rect: [5650, 1270, 430, 350] },
  { id: 'rune_cave', name: 'Пещера Рун', rect: [5850, 460, 430, 420] },
  { id: 'frost_peak', name: 'Снежное плато', rect: [5960, 2140, 400, 360] },
  { id: 'dragon_dale', name: 'Драконий Дол', rect: [5560, 2760, 800, 720] },
]

export const FROST_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: FR_GATES.graniteSide.x, y: FR_GATES.graniteSide.y }, label: 'Врата Пределья' },
  { pos: { ...HAVEN.pos }, label: 'Стылый Приют' },
  { pos: { ...RUNE_CAVE.pos }, label: 'Пещера Рун' },
  { pos: { ...WORD_WALL_FROST.pos }, label: 'Стена Слова' },
  { pos: { ...ROOST.pos }, label: 'Драконий Дол' },
]
