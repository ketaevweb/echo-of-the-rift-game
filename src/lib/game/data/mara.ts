// ============================================================
// ЭХО РАЗЛОМА — Багровая Мара (Фаза 6.3, домен DAO)
// Багровая пустошь на юге Гранитной Долины, за Багровым хребтом.
// Бастион Ветвей — последний оплод перед мором: оборона от волн
// (DAO Siege of Vigil), мор-сгустки, Мор-Мать в финале штурма.
// Мир общий (одна heightmap) — переход через Врата Мары.
// Data-only: никаких импортов движка.
// ============================================================

import { InteractableDef, EnemyType, PropDef, SpawnZoneDef, Vec } from '../types'

// ---------------- Границы и переходы ----------------

/** Багровый хребет между Гранитом и Марой (горизонтальная полоса по y,
 *  только в диапазоне Гранитной Долины по x — Вельд западнее не трогаем). */
export const MARA_RIDGE = { y: 3350, band: 120 }

/** Врата Мары: порталы по обе стороны хребта. */
export const MA_GATES = {
  graniteSide: { x: 4450, y: 3220, exit: { x: 4450, y: 3180 }, label: 'ГРАНИТНАЯ ДОЛИНА' },
  mara: { x: 4450, y: 3480, exit: { x: 4450, y: 3520 }, label: 'БАГРОВАЯ МАРА' },
}

// ---------------- Ключевые точки ----------------

/** Бастион Ветвей — хаб домена и арена обороны. */
export const BASTION = { pos: { x: 4380, y: 3800 } }
/** Ворота бастиона: точка, которую грызёт мор во время штурма. */
export const BASTION_GATE = { x: 4380, y: 3722 }
/** Лагеря прорыва Моры: волны выходят с двух сторон пустоши. */
export const BREACH_CAMPS: Vec[] = [
  { x: 4960, y: 3560 },
  { x: 3840, y: 4020 },
]
/** Мор-сгустки (побочный квест Хольта): выжечь скверну в жилах земли. */
export const BLIGHT_WELLS: Array<{ id: string; pos: Vec }> = [
  { id: 'mw1', pos: { x: 3820, y: 3560 } },
  { id: 'mw2', pos: { x: 5140, y: 3640 } },
  { id: 'mw3', pos: { x: 4180, y: 4120 } },
]
/** Логово Моры (южная кромка): сюда уходит дорога от бастиона. */
export const MORASS = { pos: { x: 4460, y: 4100 } }

// ---------------- Волны штурма (правило домена: 1 механика) ----------------

/** Состав волн обороны Бастиона (Фаза 6.3): последняя — с Мор-Матерью. */
export const SIEGE_WAVES: EnemyType[][] = [
  ['ghoul', 'ghoul', 'ghoul', 'ghoul'],
  ['ghoul', 'ghoul', 'ghoul', 'ghoul', 'abomination'],
  ['ghoul', 'ghoul', 'abomination', 'abomination', 'abomination'],
  ['ghoul', 'ghoul', 'ghoul', 'abomination', 'abomination', 'abomination'],
  ['ghoul', 'ghoul', 'abomination', 'abomination', 'blight_mother'],
]
/** Прочность частокола (0..100) и пауза между волнами. */
export const SIEGE_GATE_HP = 100
export const SIEGE_BREAK = 8

// ---------------- Дороги и пропсы Мары ----------------

export const MARA_ROADS: Vec[][] = [
  // Врата Мары → Бастион Ветвей
  [
    { x: 4450, y: 3520 }, { x: 4420, y: 3620 }, { x: 4380, y: 3720 },
  ],
  // Бастион → лагерь прорыва (юго-запад)
  [
    { x: 4340, y: 3840 }, { x: 4120, y: 3950 }, { x: 3860, y: 4010 },
  ],
  // Бастион → северо-восток (мимо сгустка)
  [
    { x: 4440, y: 3780 }, { x: 4680, y: 3660 }, { x: 4930, y: 3580 },
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
  for (const road of MARA_ROADS) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSeg(x, y, road[i].x, road[i].y, road[i + 1].x, road[i + 1].y)
      if (d < best) best = d
    }
  }
  return best
}

function maraBlocked(x: number, y: number): boolean {
  if (roadDist(x, y) < 85) return true
  if (Math.hypot(x - MA_GATES.mara.x, y - MA_GATES.mara.y) < 150) return true
  if (Math.hypot(x - BASTION.pos.x, y - BASTION.pos.y) < 260) return true
  for (const w of BLIGHT_WELLS) {
    if (Math.hypot(x - w.pos.x, y - w.pos.y) < 110) return true
  }
  for (const c of BREACH_CAMPS) {
    if (Math.hypot(x - c.x, y - c.y) < 130) return true
  }
  if (Math.hypot(x - MORASS.pos.x, y - MORASS.pos.y) < 180) return true
  return false
}

/** Мёртвые деревья Мары: чёрные стволы с багровыми прожилками. */
function buildDeadTrees(): PropDef[] {
  const rnd = lcg(31337)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 46 && guard < 4000) {
    guard++
    const x = 3600 + rnd() * 1720
    const y = 3460 + rnd() * 640
    if (maraBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 95)) continue
    out.push({ kind: 'deadtree', pos: { x: Math.round(x), y: Math.round(y) }, r: 11, solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

/** Багровые камни: обломки, сочащиеся скверной. */
function buildMaraRocks(): PropDef[] {
  const rnd = lcg(73331)
  const out: PropDef[] = []
  let guard = 0
  while (out.length < 34 && guard < 3000) {
    guard++
    const x = 3600 + rnd() * 1720
    const y = 3460 + rnd() * 660
    if (maraBlocked(x, y)) continue
    if (out.some((t) => Math.hypot(t.pos.x - x, t.pos.y - y) < 130)) continue
    out.push({ kind: 'rock', pos: { x: Math.round(x), y: Math.round(y) }, r: 9 + Math.floor(rnd() * 9), solid: true, seed: Math.floor(rnd() * 9999) })
  }
  return out
}

export const MARA_PROPS: PropDef[] = [
  // Врата Мары (две стороны Багрового хребта)
  { id: 'mgate_g', kind: 'portal', pos: { x: MA_GATES.graniteSide.x, y: MA_GATES.graniteSide.y }, r: 40, solid: false, seed: 161 },
  { id: 'mgate_m', kind: 'portal', pos: { x: MA_GATES.mara.x, y: MA_GATES.mara.y }, r: 40, solid: false, seed: 162 },
  // --- Бастион Ветвей: частокол, ворота, бараки, рог, костры ---
  { kind: 'bastion', id: 'bastion_gate', pos: { x: BASTION_GATE.x, y: BASTION_GATE.y }, w: 150, h: 34, solid: true, seed: 171 },
  { kind: 'house', pos: { x: 4270, y: 3830 }, w: 120, h: 64, solid: true, seed: 172 },
  { kind: 'house', pos: { x: 4480, y: 3850 }, w: 104, h: 60, solid: true, seed: 173 },
  { kind: 'tent', pos: { x: 4330, y: 3760 }, w: 54, h: 42, solid: true, seed: 174 },
  { kind: 'fire', pos: { x: 4380, y: 3840 }, r: 11, solid: true, seed: 175 },
  { kind: 'fire', pos: { x: 4290, y: 3720 }, r: 10, solid: true, seed: 176 },
  { kind: 'fence', pos: { x: 4240, y: 3700 }, w: 90, h: 8, solid: false, seed: 177 },
  { kind: 'fence', pos: { x: 4520, y: 3700 }, w: 90, h: 8, solid: false, seed: 178 },
  { kind: 'dummy', pos: { x: 4440, y: 3910 }, r: 12, solid: true, seed: 179 },
  { kind: 'stall', pos: { x: 4520, y: 3780 }, w: 66, h: 40, solid: true, seed: 180 },
  // --- Мор-сгустки (квест Хольта) ---
  { kind: 'blight', id: 'mw1', pos: { x: BLIGHT_WELLS[0].pos.x, y: BLIGHT_WELLS[0].pos.y }, r: 22, solid: false, seed: 181 },
  { kind: 'blight', id: 'mw2', pos: { x: BLIGHT_WELLS[1].pos.x, y: BLIGHT_WELLS[1].pos.y }, r: 22, solid: false, seed: 182 },
  { kind: 'blight', id: 'mw3', pos: { x: BLIGHT_WELLS[2].pos.x, y: BLIGHT_WELLS[2].pos.y }, r: 22, solid: false, seed: 183 },
  // --- Кости и знамёна у лагерей прорыва ---
  { kind: 'carcass', pos: { x: 4930, y: 3590 }, r: 14, solid: false, seed: 184 },
  { kind: 'carcass', pos: { x: 3870, y: 3990 }, r: 13, solid: false, seed: 185 },
  { kind: 'stone', pos: { x: 4990, y: 3540 }, r: 11, solid: true, seed: 186 },
  { kind: 'stone', pos: { x: 3800, y: 4050 }, r: 12, solid: true, seed: 187 },
  // --- Морные омуты: у Логова Моры рваные багровые валуны ---
  { kind: 'rock', pos: { x: 4420, y: 4070 }, r: 15, solid: true, seed: 188 },
  { kind: 'rock', pos: { x: 4520, y: 4120 }, r: 13, solid: true, seed: 189 },
  ...buildDeadTrees(),
  ...buildMaraRocks(),
]

// ---------------- NPC Мары ----------------

export const MARA_NPCS = [
  { id: 'meira', name: 'Командор Мейра', role: 'Командор Бастиона', pos: { x: 4410, y: 3758 }, color: '#d9a441', dialogue: 'mara_meira' },
  { id: 'holt', name: 'Досент Хольт', role: 'Изучатель мора', pos: { x: 4310, y: 3790 }, color: '#9a7fc0', dialogue: 'mara_holt' },
]

// ---------------- Спавны и интеракты ----------------

export const MARA_SPAWN_ZONES: SpawnZoneDef[] = [
  { id: 'mara_ghoul_a', enemy: 'ghoul', center: { x: 4700, y: 3560 }, radius: 220, max: 4, respawnSec: 40 },
  { id: 'mara_ghoul_b', enemy: 'ghoul', center: { x: 3900, y: 3900 }, radius: 240, max: 4, respawnSec: 44 },
  { id: 'mara_abom', enemy: 'abomination', center: { x: 5060, y: 3960 }, radius: 200, max: 2, respawnSec: 70 },
]

export const MARA_INTERACTABLES: InteractableDef[] = [
  {
    id: 'mgate_granite',
    name: 'Врата Мары',
    pos: { x: MA_GATES.graniteSide.x, y: MA_GATES.graniteSide.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:mara',
  },
  {
    id: 'mgate_mara',
    name: 'Врата Мары',
    pos: { x: MA_GATES.mara.x, y: MA_GATES.mara.y },
    r: 64,
    prompt: 'Войти',
    kind: 'portal',
    action: 'portal:granite',
  },
  // Сигнальный рог бастиона: объявить штурм (квест Мейры)
  {
    id: 'war_horn',
    name: 'Сигнальный рог',
    pos: { x: 4380, y: 3748 },
    r: 46,
    prompt: 'Бить рог',
    kind: 'altar',
    action: 'dialogue:mara_horn',
    cond: 'quest.mara==2',
  },
  // Мор-сгустки: выжечь скверну (квест Хольта, только пока он в работе)
  ...BLIGHT_WELLS.map((w) => ({
    id: w.id,
    name: 'Мор-сгусток',
    pos: w.pos,
    r: 44,
    prompt: 'Выжечь',
    kind: 'altar' as const,
    action: 'purge:mara_wells',
    cond: 'quest.mara_wells==1',
  })),
]

export const MARA_AREAS: Array<{ id: string; name: string; rect: [number, number, number, number] }> = [
  { id: 'mara', name: 'Багровая Мара', rect: [3560, 3420, 1790, 780] },
  { id: 'bastion', name: 'Бастион Ветвей', rect: [4180, 3640, 420, 330] },
  { id: 'morass', name: 'Логово Моры', rect: [4260, 3980, 420, 220] },
]

export const MARA_MARKERS: Array<{ pos: Vec; label: string }> = [
  { pos: { x: MA_GATES.graniteSide.x, y: MA_GATES.graniteSide.y }, label: 'Врата Мары' },
  { pos: { ...BASTION.pos }, label: 'Бастион Ветвей' },
  { pos: { ...MORASS.pos }, label: 'Логово Моры' },
]
