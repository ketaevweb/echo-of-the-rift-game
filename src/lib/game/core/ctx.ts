// ============================================================
// ЭХО РАЗЛОМА — контекст движка (Phase 0)
// EngineCtx — интерфейс состояния движка, который передаётся
// в системы (systems/*) первым аргументом. GameEngine реализует
// его структурно: системы не знают о классе, только о полях.
// Правило: системы мутируют состояние ТОЛЬКО через ctx.
// ============================================================

import { Attributes, CareerState, DialogueChoice, Entity, Faction, Floater, FormationId, InventoryEntry, OriginId, Particle, PropDef, QuestState, SignId, SkillRanks, Telegraph, Vec } from '../types'
import { Collider } from './util'
import type { PanelId } from '../store'

export type ToastKind = 'info' | 'quest' | 'level' | 'warn' | 'loot'

/** Зона мира (Фаза 3/6): долина на севере, Вельд за Хребтом на юге,
 *  Гранитная Долина за Каменным Хребтом на востоке, Стылое Пределье
 *  за Стылым Хребтом на востоке (Фаза 6.2), Багровая Мара за Багровым
 *  хребтом на юге Гранита (Фаза 6.3). */
export type ZoneId = 'valley' | 'veld' | 'granite' | 'frost' | 'mara'

/** Оборона Бастиона (Фаза 6.3, DAO): состояние штурма (транзитное, в сейв не пишется).
 *  wave — индекс волны, gateHp — прочность частокола 0..100, breakT — пауза между
 *  волнами, pending — очередь спавна текущей волны, spawnT — шаг спавна. */
export interface SiegeState {
  wave: number
  gateHp: number
  breakT: number
  pending: string[]
  spawnT: number
}

// ---------------- Мост 3D-рендера (Фаза 1) ----------------

/** Снимок состояния движка для 3D-рендера (структурно = SceneView3d). */
export interface View3dSnapshot {
  time: number
  shake: number
  player: Entity
  playerAlive: boolean
  entities: Entity[]
  particles: Particle[]
  floaters: Floater[]
  telegraphs: Telegraph[]
  targetEid: number | null
  removedProps: Set<string>
  /** Зона игрока и фаза суток — для атмосферы (Фаза 3). */
  zone: ZoneId
  dayT: number
  /** Фаза 4: тактическая пауза — id выбранного приказом компаньона. */
  selEid: number | null
  /** Фаза 5: диалог активен + eid сущности-спикера (кинокамера; null — наезд на героя). */
  dialogue: boolean
  dialogueFocus: number | null
  /** Фаза 5: Тишь 0..100 — выцветание мира (LUT-вайб). */
  silence: number
  /** Фаза 6.2: символы рунных камней пещеры (для рендера колец). */
  runes: { rs1: number; rs2: number; rs3: number }
}

/** Минимальный интерфейс 3D-вью, которым пользуется движок/ввод. */
export interface View3dBridge {
  render(view: View3dSnapshot): void
  /** Точка мира под курсором (для приказов движения). */
  screenToGround(sx: number, sy: number): Vec | null
  /** Сущность под курсором (проекционный пикинг). */
  pickAtScreen(sx: number, sy: number, padPx: number): {
    eid: number
    kind: Entity['kind']
    alive: boolean
    enemyType?: Entity['enemyType']
    npcDialogue?: string
  } | null
  /** Азимут орбиты камеры (рад) — для WASD относительно камеры. */
  getCameraYaw(): number
  /** Фаза 4: изометрический отъём камеры в тактической паузе. */
  setTactical(on: boolean): void
  resize(): void
  dispose(): void
}

export type RenderMode = '2d' | '3d'

export interface EngineCtx {
  // --- Метрики сессии ---
  playtime: number
  kills: number

  // --- Прогресс игрока ---
  level: number
  xp: number
  lp: number
  gold: number
  hp: number
  maxHp: number
  stamina: number
  maxStamina: number
  attributes: Attributes
  skills: SkillRanks
  signs: Record<SignId, { unlocked: boolean; level: number }>
  weapon: string | null
  armor: string | null
  inventory: InventoryEntry[]
  faction: Faction

  // --- Мир/квесты ---
  quests: Record<string, QuestState>
  flags: Record<string, boolean>
  companionIds: { kaya: boolean; torvald: boolean }
  bestiary: Set<string>
  player: Entity

  // --- Сущности и эффекты ---
  eidSeq: number
  entities: Entity[]
  particles: Particle[]
  floaters: Floater[]
  telegraphs: Telegraph[]
  kb: Map<number, Vec>

  // --- Рендер/ввод/цикл ---
  canvas: HTMLCanvasElement
  /** Активный канвас ввода (= canvas в 2D, webgl-канвас в 3D). */
  inputCanvas: HTMLCanvasElement
  renderMode: RenderMode
  view3d: View3dBridge | null
  setRenderMode(mode: RenderMode): void
  baked: HTMLCanvasElement
  colliders: Collider[]
  props: PropDef[]
  removedProps: Set<string>
  keys: Set<string>
  camera: Vec
  shake: number
  tacticalPaused: boolean
  dialogueTree: string | null
  dlgChoices: DialogueChoice[]
  targetEid: number | null
  time: number
  currentArea: string
  endingAt: number | null
  buffT: number
  destroyed: boolean

  // --- Фаза 3: сутки, зоны, масла ---
  /** Фаза суток 0..1 (0.25 рассвет, 0.5 полдень, 0.75 закат). */
  dayClock: number
  /** Текущая зона игрока (пересчитывается в stepWorld). */
  zone: ZoneId
  /** Активное масло: остаток секунд и id предмета. */
  oilT: number
  oilKind: string | null
  /** Переход через Врата Тумана: затемнение + телепорт партии. */
  travelTo(zone: ZoneId): void

  // --- Фаза 4: партия (формации/одобрение/тактика) ---
  /** Одобрение компаньонов 0..100: ≥60 открывает парные приёмы (синергии). */
  approval: { kaya: number; torvald: number }
  /** Текущий строй отряда: клин или линия. */
  formation: FormationId
  /** Выбранный в тактической паузе компаньон (для приказов движения). */
  selEid: number | null
  /** Сменить строй (клин ⇄ линия) — клавиша V. */
  cycleFormation(): void
  /** Вкл/выкл тактическую камеру (изометрический отъём). */
  setTactical(on: boolean): void

  // --- Фаза 6: карьера (Gothic) и ямные бои ---
  /** Карьера фракции: вербовка/ранги в Гранитной Долине, перки в бою. */
  career: CareerState
  /** Активный ямный бой: тир (0 — нет боя), текущая волна. */
  pitTier: number
  pitWave: number

  // --- Фаза 6.2: Стылое Пределье (Thu'um и руны) ---
  /** Слова силы: 0 — не открыт, 1 — слово, 2 — два слова (после души дракона). */
  shoutLv: { force: number; frost: number }
  /** Положение колец рунных камней пещеры (0 заяц / 1 волк / 2 луна). */
  runes: { rs1: number; rs2: number; rs3: number }

  // --- Фаза 6.3: Багровая Мара (оборона бастиона) ---
  /** Активный штурм Моры: волны, прочность частокола (null — нет осады). */
  siege: SiegeState | null

  // --- Фаза 5: происхождение, Тишь, кинокамера диалогов ---
  /** Происхождение героя — источник уникальных реплик (cond: origin:X). */
  origin: OriginId
  /** Скрытый счётчик Тишины 0..100: растёт от «дешёвых» решений, выцветает мир. */
  silence: number
  /** Сущность-собеседник для кинокамеры (null — наезд на героя). */
  dialogueFocusEid: number | null

  // --- Хуки, реализуемые движком (делегируют в системы/инициализацию) ---
  toast(text: string, kind?: ToastKind): void
  createPlayer(pos: Vec): void
  spawnWorld(): void
  spawnCompanion(id: 'kaya' | 'torvald'): void
  syncUi(): void
  castAbility(id: string): void
  isFrozen(): boolean
  /** Косметический тик (частицы/флоатеры/тряска) — идёт даже при паузе/панелях. */
  updateCosmetics(dt: number): void
  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number): void
  openPanel(p: PanelId): void
  closePanel(): void
}
