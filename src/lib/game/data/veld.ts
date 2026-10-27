// ============================================================
// ЭХО РАЗЛОМА — Вельд (Фаза 3)
// Болота к югу от долины за Хребтом: топи, туман, мёртвый лес.
// Мир общий (одна heightmap), но юг отделён непроходимым хребтом —
// переход только через Врата Тумана (portal-интеракты).
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, PropDef, SpawnZoneDef, Vec } from '../types'

// ---------------- Границы и переходы ----------------

/** Хребет между долиной и Вельдом (непроходимая полоса по y). */
export const RIDGE = { y: 2560, band: 95 }

/** Врата Тумана: точки порталов и точки выхода с другой стороны. */
export const GATES = {
  valley: { x: 1480, y: 2380, exit: { x: 1480, y: 2350 }, label: 'Долина Хеймхолл' },
  veld: { x: 1480, y: 2760, exit: { x: 1480, y: 2790 }, label: 'Вельд' },
}

export function zoneOf(y: number): 'valley' | 'veld' {
  return y > RIDGE.y ? 'veld' : 'valley'
}

// ---------------- Топи ----------------

/** Омуты Гнилых Топей — чаши ниже уровня воды, залиты тиной. */
export const POOLS: Array<{ x: number; y: number; r: number }> = [
  { x: 1150, y: 3060, r: 150 },
  { x: 1520, y: 3260, r: 120 },
  { x: 1770, y: 2950, r: 130 },
  { x: 2110, y: 3150, r: 110 },
  { x: 1350, y: 3560, r: 140 },
  { x: 960, y: 3360, r: 100 },
]

/** Пепельный курган — логово Пепельной Матери. */
export const ASH_MOTHER = { pos: { x: 2500, y: 3620 } }

// ---------------- Следопытство: цепочка следов ----------------

export interface ClueDef {
  id: string
  pos: Vec
  name: string
  text: string
}

export const VELD_CLUES: ClueDef[] = [
  {
    id: 'clue1',
    pos: { x: 1700, y: 2950 },
    name: 'Обглоданные кости',
    text: 'Кости болотного скота, обглоданные до белого блеска. Следы от когтей — шире ладони. Тварь шла на северо-восток.',
  },
  {
    id: 'clue2',
    pos: { x: 2010, y: 3170 },
    name: 'Пепельный след',
    text: 'Отпечаток лапы, заполненный серым пеплом. Земля вокруг выжжена кругом — где ступала тварь, трава не растёт.',
  },
  {
    id: 'clue3',
    pos: { x: 2280, y: 3420 },
    name: 'Выжженный круг',
    text: 'Круг выжженной земли, в центре — остов волка, оплетённый пепельными нитями. Логово близко: курган виден сквозь туман.',
  },
]

// ---------------- Дороги и пропсы Вельда ----------------

export const VELD_ROADS: Vec[][] = [
  [
    { x: 1480, y: 2760 }, { x: 1700, y: 2950 }, { x: 2010, y: 3170 },
    { x: 2280, y: 3420 }, { x: 2480, y: 3580 },
  ],
  [
    { x: 1700, y: 2950 }, { x: 1500, y: 3150 }, { x: 1220, y: 3400 },
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

function veldRoadDist(x: number, y: number): number {
  let best = Infinity
  for (const road of VELD_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function poolDist(x: number, y: number): number {
  let best = Infinity
  for (const p of POOLS) {
    const d = Math.hypot(x - p.x, y - p.y) - p.r
    if (d < best) best = d
  }
  return best
}

function veldBlocked(x: number, y: number): boolean {
  if (veldRoadDist(x, y) < 85) return true
  if (poolDist(x, y) < 60) return true
  if (Math.hypot(x - GATES.veld.x, y - GATES.veld.y) < 150) return true
  if (Math.hypot(x - ASH_MOTHER.pos.x, y - ASH_MOTHER.pos.y) < 150) return true
  return false
}

function buildDeadTrees(): PropDef[] {
  const rnd = lcg(20250)
  const trees: PropDef[] = []
  let guard = 0
  while (trees.length < 72 && guard < 5000) {
    guard++
    const x = 80 + rnd() * (3200 - 160)
    const y = 2700 + rnd() * (4100 - 2700)
    if (veldBlocked(x, y)) continue
    if (trees.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 95)) continue
    trees.push({ kind: 'deadtree', pos: { x: Math.round(x), y: Math.round(y) }, r: 11, solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return trees
}

function buildReeds(): PropDef[] {
  const rnd = lcg(7777)
  const reeds: PropDef[] = []
  let guard = 0
  while (reeds.length < 150 && guard < 6000) {
    guard++
    const x = 80 + rnd() * (3200 - 160)
    const y = 2750 + rnd() * (4050 - 2750)
    const pd = poolDist(x, y)
    if (pd < 6 || pd > 150) continue
    if (veldRoadDist(x, y) < 60) continue
    if (reeds.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 55)) continue
    reeds.push({ kind: 'reed', pos: { x: Math.round(x), y: Math.round(y) }, r: 4, solid: false, seed: Math.floor(rnd() * 9999) })
  }
  return reeds
}

function buildStumps(): PropDef[] {
  const rnd = lcg(31337)
  const stumps: PropDef[] = []
  let guard = 0
  while (stumps.length < 16 && guard < 2000) {
    guard++
    const x = 80 + rnd() * (3200 - 160)
    const y = 2700 + rnd() * (4100 - 2700)
    if (veldBlocked(x, y)) continue
    if (stumps.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 180)) continue
    stumps.push({ kind: 'stump', pos: { x: Math.round(x), y: Math.round(y) }, r: 7, solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return stumps
}

/** Пропсы Вельда + доска объявлений и врата в долине (живут здесь ради одного экспорта). */
export const VELD_PROPS: PropDef[] = [
  // Врата Тумана (две стороны хребта)
  { id: 'gate_v', kind: 'portal', pos: { x: GATES.valley.x, y: GATES.valley.y }, r: 40, solid: false, seed: 61 },
  { id: 'gate_t', kind: 'portal', pos: { x: GATES.veld.x, y: GATES.veld.y }, r: 40, solid: false, seed: 62 },
  // Доска объявлений в Хеймхолле (контракты — Фаза 3)
  { id: 'board', kind: 'board', pos: { x: 995, y: 1520 }, r: 12, solid: true, seed: 63 },
  // Пепельный курган: кромка круга из камней, кости, тлеющие валуны
  { kind: 'stone', pos: { x: 2400, y: 3540 }, r: 12, solid: true, seed: 71 },
  { kind: 'stone', pos: { x: 2600, y: 3550 }, r: 12, solid: true, seed: 72 },
  { kind: 'stone', pos: { x: 2420, y: 3700 }, r: 11, solid: true, seed: 73 },
  { kind: 'stone', pos: { x: 2590, y: 3710 }, r: 11, solid: true, seed: 74 },
  { kind: 'carcass', pos: { x: 2520, y: 3560 }, r: 14, solid: false, seed: 75 },
  { kind: 'rock', pos: { x: 2470, y: 3680 }, r: 15, solid: true, seed: 76 },
  { kind: 'rock', pos: { x: 2560, y: 3530 }, r: 13, solid: true, seed: 77 },
  ...buildDeadTrees(),
  ...buildReeds(),
  ...buildStumps(),
]

// ---------------- Спавны и интеракты Вельда ----------------

export const VELD_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'veld_a', enemy: 'bogling', center: { x: 1750, y: 3080 }, radius: 270, max: 5, respawnSec: 30 },
  { id: 'veld_b', enemy: 'bogling', center: { x: 1250, y: 3450 }, radius: 220, max: 4, respawnSec: 34 },
  { id: 'veld_shades', enemy: 'ash_shade', center: { x: 2180, y: 3320 }, radius: 240, max: 3, respawnSec: 55 },
]

export const VELD_INTERACTABLES: InteractableDef[] = [
  {
    id: 'gate_valley',
    name: 'Врата Тумана',
    pos: { x: GATES.valley.x, y: GATES.valley.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:veld',
  },
  {
    id: 'gate_veld',
    name: 'Врата Тумана',
    pos: { x: GATES.veld.x, y: GATES.veld.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:valley',
  },
  {
    id: 'board_ui',
    name: 'Доска объявлений',
    pos: { x: 995, y: 1520 },
    r: 46,
    prompt: 'Читать',
    kind: 'board',
    action: 'dialogue:notice_board',
  },
  ...VELD_CLUES.map((c) => ({
    id: c.id,
    name: c.name,
    pos: c.pos,
    r: 36,
    prompt: 'Осмотреть',
    kind: 'clue' as const,
    action: 'clue:veld',
  })),
]

export const VELD_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'veld', name: 'Вельд', rect: [0, 2650, 3200, 1550] },
  { id: 'mire', name: 'Гнилые Топи', rect: [880, 2820, 1150, 850] },
  { id: 'barrow', name: 'Пепельный курган', rect: [2180, 3350, 660, 560] },
]

export const VELD_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: GATES.valley.x, y: GATES.valley.y }, label: 'Врата Тумана' },
  { pos: { x: 1450, y: 3150 }, label: 'Гнилые Топи' },
  { pos: { ...ASH_MOTHER.pos }, label: 'Пепельный курган' },
]
