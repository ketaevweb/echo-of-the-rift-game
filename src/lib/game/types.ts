// ============================================================
// ЭХО РАЗЛОМА — общие типы игры
// Вдохновлено: The Witcher 3, Dragon Age: Origins, Skyrim,
// Baldur's Gate 3, Gothic 2, Mass Effect 2
// ============================================================

export interface Vec {
  x: number
  y: number
}

export type Faction = 'none' | 'flame' | 'mist'
export type Stance = 'follow' | 'hold' | 'aggressive'

/** Карьера фракции (Фаза 6, Gothic): Орден Пепла / Ковен Ветвей / Вольный Дозор.
 *  Вербовка и ранги — в Гранитной Долине, «война за барьер». */
export type CareerId = 'order' | 'coven' | 'watch'
export interface CareerState {
  faction: CareerId | null
  rep: { order: number; coven: number; watch: number }
  rank: { order: number; coven: number; watch: number }
}
/** Строй отряда (Фаза 4): клин — Торвальд впереди-сбоку, Кайя позади;
 *  линия — оба флангах сзади. */
export type FormationId = 'wedge' | 'line'

export type SignId = 'igni' | 'aard' | 'quen' | 'axii' | 'shout'

/** Происхождение героя (GDD 02 §5): выбор на титуле, открывает уникальные реплики. */
export type OriginId = 'exile' | 'ember' | 'warden'

export interface Attributes {
  might: number // Мощь — атака и урон в ближнем бою
  vigor: number // Стойкость — HP и КД (AC)
  intellect: number // Разум — сила знаков
  charisma: number // Обаяние — убеждение в диалогах
}

export interface SkillRanks {
  blade: number // Владение клинком
  vitality: number // Живучесть
  signs: number // Ловкость знаков
  speech: number // Красноречие
}

export interface SignState {
  unlocked: boolean
  level: number
}

export type ItemType = 'potion' | 'weapon' | 'armor' | 'misc' | 'quest' | 'oil'

export interface ItemDef {
  id: string
  name: string
  desc: string
  type: ItemType
  price: number
  damage?: number
  ac?: number
  heal?: number
  stamina?: number
  icon: string // имя иконки lucide
  /** Масло (Фаза 3): наносится на клинок, бонус против класса врагов. */
  oil?: { targets: 'beast' | 'specter'; bonus: number; dur: number }
}

export interface InventoryEntry {
  item: string
  qty: number
}

export type AbilityKind = 'sign' | 'shout' | 'potion' | 'companion'

export interface AbilityDef {
  id: string
  name: string
  desc: string
  icon: string
  hotkey: string
  kind: AbilityKind
  cooldown: number
  staminaCost: number
  range: number
  owner: 'player' | 'torvald' | 'kaya'
  startUnlocked: boolean
  maxLevel?: number
  learnLp?: number // стоимость изучения у наставника (очки обучения)
  learnGold?: number
}

// ---------------- Квесты ----------------

export interface QuestStage {
  text: string
}

export interface QuestDef {
  id: string
  name: string
  summary: string
  stages: QuestStage[]
  side?: boolean
}

export interface QuestState {
  stage: number
  counter: number
  done: boolean
}

// ---------------- Диалоги ----------------

export interface DialogueCheck {
  dc: number
  label: string
}

export interface DialogueChoice {
  text: string
  tag?: string
  check?: DialogueCheck
  goto?: string | null
  gotoFail?: string | null
  action?: string
  cond?: string
  /** Фаза 5: реплика происхождения — особый бейдж в UI (доступность — через cond). */
  origin?: OriginId
}

export interface DialogueNode {
  speaker: string
  role?: string
  text: string
  choices: DialogueChoice[]
  /** Фаза 5: таймер-выбор (ME2): секунды до авто-выбора; 0/undefined — без таймера. */
  timer?: number
  /** Индекс варианта «молчания» — выбирается по истечении таймера. */
  onTimeout?: number
}

export interface DialogueTree {
  id: string
  start: string | ((ctx: DialogueCtx) => string)
  nodes: Record<string, DialogueNode>
}

export interface DialogueCtx {
  quest: (id: string) => QuestState
  flag: (name: string) => boolean
  faction: Faction
  companion: (id: string) => boolean
  has: (item: string, qty?: number) => boolean
  lp: number
  gold: number
}

export interface PortraitDef {
  icon: string
  color: string
  title: string
}

// ---------------- Мир ----------------

export interface PropDef {
  id?: string
  kind:
    | 'tree'
    | 'rock'
    | 'house'
    | 'tent'
    | 'stone'
    | 'fire'
    | 'fence'
    | 'dummy'
    | 'stall'
    | 'carcass'
    | 'rift'
    | 'barrier'
    | 'altar'
    | 'shrub'
    | 'flower'
    // Фаза 3 (Вельд):
    | 'board'
    | 'portal'
    | 'deadtree'
    | 'reed'
    | 'stump'
    // Фаза 6 (Гранитная Долина):
    | 'pit'
    | 'mine'
    | 'obelisk'
    | 'ore'
    // Фаза 6.2 (Стылое Пределье):
    | 'cave'
    | 'runestone'
    | 'wordwall'
    | 'rune_door'
    | 'snowtree'
    // Фаза 6.3 (Багровая Мара):
    | 'blight'
    | 'bastion'
  pos: Vec
  w?: number
  h?: number
  r?: number
  solid?: boolean
  seed?: number
}

export interface NpcDef {
  id: string
  name: string
  role: string
  pos: Vec
  color: string
  dialogue: string
  wander?: boolean
}

export interface SpawnZoneDef {
  id: string
  enemy: EnemyType
  center: Vec
  radius: number
  max: number
  respawnSec: number
}

export type EnemyType =
  | 'wolf'
  | 'alpha'
  | 'bandit'
  | 'archer'
  | 'captain'
  | 'horror'
  | 'boss'
  // Фаза 3 (Вельд):
  | 'bogling'
  | 'ash_shade'
  | 'ash_mother'
  // Фаза 6 (Гранитная Долина):
  | 'scorpion'
  | 'pit_master'
  // Фаза 6.2 (Стылое Пределье):
  | 'draugr'
  | 'frost_troll'
  | 'dragon'
  // Фаза 6.3 (Багровая Мара):
  | 'ghoul'
  | 'abomination'
  | 'blight_mother'

export interface InteractableDef {
  id: string
  name: string
  pos: Vec
  r: number
  prompt: string
  kind: 'altar' | 'herb' | 'barrier' | 'clue' | 'portal' | 'board' | 'ore'
  action: string
  cond?: string
}

export interface AreaDef {
  id: string
  name: string
  rect: [number, number, number, number] // x, y, w, h
}

// ---------------- Сущности движка ----------------

export interface EnemyStats {
  hp: number
  ac: number
  atk: number
  dmgDice: number
  dmgSides: number
  dmgMod: number
  speed: number
  aggroR: number
  leashR: number
  attackRange: number
  attackCd: number
  xp: number
  radius: number
  ranged?: number
}

export interface Entity {
  id: string
  eid: number
  kind: 'player' | 'companion' | 'npc' | 'enemy'
  name: string
  role?: string
  pos: Vec
  vel: Vec
  radius: number
  facing: number
  color: string
  hp: number
  maxHp: number
  alive: boolean
  team: 'party' | 'village' | 'hostile'
  speed: number
  atkBonus: number
  ac: number
  dmgDice: number
  dmgSides: number
  dmgMod: number
  attackCd: number
  attackRange: number
  ranged?: number
  enemyType?: EnemyType
  boss?: boolean
  aiState: 'idle' | 'wander' | 'chase' | 'attack' | 'return'
  home: Vec
  aggroR: number
  leashR: number
  wanderT: number
  stunT: number
  burnT: number
  burnTick: number
  slowT: number
  shield: number
  targetEid: number | null
  attackT: number
  hitT: number
  castT: number
  cds: Record<string, number>
  respawnAt?: number
  npc?: NpcDef
  summonStage: number
  slamT: number // телеграф удара босса
  walkPhase: number
  downT: number // время возрождения спутника
  dest: Vec | null // приказ движения
  stance?: Stance // приказ спутнику
  zoneId?: string // зона респавна для врага
  // --- Фаза 2: рывок босса (транзитные, в сейв не пишутся) ---
  chargeT?: number // замах рывка (телеграф-коридор)
  chargeDir?: number // зафиксированное направление рывка
  dashT?: number // активный рывок
  dashDir?: number
  dashHits?: Set<number> // кого уже задел текущий рывок
  // --- Фаза 6.2: дракон (транзитные, в сейв не пишутся) ---
  bombX?: number // точка падения огненной бомбы
  bombY?: number
}

// ---------------- Телеграфы АоЕ (Фаза 2) ----------------

export type TelegraphShape = 'circle' | 'cone' | 'line'

/** Зона опасности на земле: подсвечивается до срабатывания удара.
 *  Чисто визуал — урон наносит логика боя, телеграф только показывает.
 *  followEid — телеграф ездит за сущностью (босс не замирает при замахе). */
export interface Telegraph {
  shape: TelegraphShape
  x: number
  y: number
  facing: number // направление для cone/line
  radius: number // circle: радиус; cone: дальность; line: длина
  width: number // cone: полуугол (рад); line: полуширина
  life: number
  maxLife: number
  color: string
  followEid?: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  kind: 'spark' | 'ring' | 'fire' | 'frost' | 'heal' | 'dust' | 'ember' | 'rune' | 'slam' | 'telegraph'
  vx0?: number
  vy0?: number
}

export interface Floater {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  size: number
  vy: number
}

// ---------------- Сохранение ----------------

export interface SaveData {
  version: number
  savedAt: number
  playtime: number
  kills: number
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
  signs: Record<SignId, SignState>
  weapon: string | null
  armor: string | null
  inventory: InventoryEntry[]
  faction: Faction
  quests: Record<string, QuestState>
  flags: Record<string, boolean>
  companions: { kaya: boolean; torvald: boolean }
  bestiary: string[]
  pos: Vec
  // --- Фаза 3: сутки и масло (в старых сейвах отсутствуют — applySave подставит дефолты) ---
  dayClock: number
  oilKind: string | null
  oilT: number
  // --- Фаза 4: одобрение компаньонов и строй (в старых сейвах нет — дефолты) ---
  approval: { kaya: number; torvald: number }
  formation: FormationId
  // --- Фаза 5: происхождение и счётчик Тишины (в старых сейвах нет — дефолты) ---
  origin: OriginId
  silence: number
  // --- Фаза 6: карьера фракции Гранитной Долины (в старых сейвах нет — дефолты) ---
  career: CareerState
  // --- Фаза 6.2: слова силы (0 — не открыт, 1 — слово, 2 — два слова) и руны пещеры ---
  shoutLv: { force: number; frost: number }
  runes: { rs1: number; rs2: number; rs3: number }
}
