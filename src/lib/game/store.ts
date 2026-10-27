import { create } from 'zustand'
import { CareerId, Faction, FormationId, InventoryEntry, OriginId, SaveData, SignId, Stance } from './types'

export type Screen = 'title' | 'game'
export type PanelId = null | 'char' | 'inv' | 'journal' | 'pause' | 'shop' | 'trainer' | 'map' | 'ending'

export interface PartyHud {
  eid: number
  id: string
  name: string
  role: string
  hp: number
  maxHp: number
  alive: boolean
  stance: Stance
  /** Фаза 4: одобрение 0..100 (у игрока — 100, в UI не показывается). */
  approval: number
  abilities: Array<{ id: string; name: string; icon: string; cd: number; cdMax: number }>
}

export interface AbilityHud {
  id: string
  name: string
  desc: string
  icon: string
  hotkey: string
  cd: number
  cdMax: number
  unlocked: boolean
  staminaCost: number
}

/** Карьера фракции в HUD (Фаза 6). */
export interface CareerHud {
  faction: CareerId
  factionName: string
  rank: number
  rankName: string
  rep: number
  perks: string[]
}

/** Крик Ту'ум в HUD (Фаза 6.2): lv — уровень слова (0 — закрыт). */
export interface ShoutHud {
  id: string
  name: string
  icon: string
  hotkey: string
  word: string
  lv: number
  cd: number
  cdMax: number
}

export interface PlayerHud {
  level: number
  xp: number
  xpNext: number
  hp: number
  maxHp: number
  stamina: number
  maxStamina: number
  lp: number
  gold: number
  faction: Faction
  weapon: string | null
  armor: string | null
  attributes: { might: number; vigor: number; intellect: number; charisma: number }
  skills: { blade: number; vitality: number; signs: number; speech: number }
  signs: Record<SignId, { unlocked: boolean; level: number }>
  shield: number
}

export interface QuestHud {
  id: string
  name: string
  stage: number
  done: boolean
  counter: number
  summary: string
  stageText: string
  side: boolean
}

export interface DialogueChoiceHud {
  text: string
  tag?: string
  checkLabel?: string
  /** Фаза 5: реплика происхождения — особый бейдж. */
  origin?: boolean
}

export interface DialogueHudState {
  speaker: string
  role: string
  portraitIcon: string
  portraitColor: string
  text: string
  choices: DialogueChoiceHud[]
  /** Фаза 5: таймер-выбор (ME2) — секунды; onTimeout — индекс варианта молчания. */
  timer?: number
  onTimeout?: number
}

/** Фаза 5: видимый бросок d20 (BG3) — оверлей поверх диалога. */
export interface DiceRollHudState {
  label: string
  roll: number
  bonus: number
  total: number
  dc: number
  success: boolean
}

export interface ToastMsg {
  id: number
  text: string
  kind: 'info' | 'quest' | 'level' | 'warn' | 'loot'
}

export interface EndingHudState {
  epilogue: string[]
  stats: Array<[string, string]>
}

export interface ShopHudState {
  merchantName: string
  stock: string[]
}

export interface TrainerHudState {
  options: Array<{
    id: string
    name: string
    desc: string
    kind: 'skill' | 'sign' | 'attr'
    cost: string
    affordable: boolean
    maxed: boolean
  }>
}

export interface AreaToastState {
  id: number
  name: string
}

/** Активное масло на клинке (Фаза 3). */
export interface OilHudState {
  name: string
  remain: number
}

/** Экран перехода через Врата Тумана (Фаза 3). */
export interface ZoneFadeState {
  label: string
  phase: 'out' | 'in'
}

// Режим запуска игры (новая / продолжить) + выбранное происхождение (Фаза 5)
export const boot: { mode: 'new' | 'continue'; origin: OriginId } = { mode: 'new', origin: 'warden' }

/** Происхождения героя (Фаза 5): карточки выбора на титуле. */
export const ORIGINS: Array<{ id: OriginId; name: string; desc: string; tag: string }> = [
  {
    id: 'warden',
    name: 'Дозорный',
    desc: 'Годы службы на дозорных постах Хребта. Герои старых песен — твои сослуживцы. Горды, но помнят старину.',
    tag: 'Сталь и привычка к пустотам',
  },
  {
    id: 'exile',
    name: 'Изгнанник Колонии',
    desc: 'Ты выжил в Гранитной Колонии без магии и жалованья. Знаешь цену сделки и фальшивой брони, узнаёшь своих по голосу.',
    tag: 'Дороги и распознанный враг',
  },
  {
    id: 'ember',
    name: 'Пепельный послушник',
    desc: 'Ты подметал пепел Ордена Пламени и слушал его молитвы. Верёвки огня лягут на твою руку, как старые знакомые.',
    tag: 'Связь с Орденом Пламени',
  },
]

// Режим рендера: '3d' (Three.js, по умолчанию) или '2d' (легаси-канвас)
export type RenderModePref = '3d' | '2d'
export const RENDER_KEY = 'echo-rift-render-mode'

export function readRenderMode(): RenderModePref {
  if (typeof window === 'undefined') return '3d'
  try {
    return localStorage.getItem(RENDER_KEY) === '2d' ? '2d' : '3d'
  } catch {
    return '3d'
  }
}

export function writeRenderMode(mode: RenderModePref) {
  try {
    localStorage.setItem(RENDER_KEY, mode)
  } catch {
    /* приватный режим — игнорируем */
  }
}

interface GameStore {
  screen: Screen
  panel: PanelId
  party: PartyHud[]
  player: PlayerHud | null
  abilities: AbilityHud[]
  inventory: InventoryEntry[]
  quests: QuestHud[]
  trackerQuest: QuestHud | null
  contractQuest: QuestHud | null
  dialogue: DialogueHudState | null
  toasts: ToastMsg[]
  areaToast: AreaToastState | null
  bossBar: { name: string; hp: number; maxHp: number } | null
  shop: ShopHudState | null
  trainer: TrainerHudState | null
  ending: EndingHudState | null
  bestiary: string[]
  hasSave: boolean
  paused: boolean
  interactHint: string | null
  renderMode: RenderModePref
  // Фаза 3
  oil: OilHudState | null
  daytime: number
  zoneLabel: string
  zoneFade: ZoneFadeState | null
  // Фаза 4
  formation: FormationId
  // Фаза 6
  career: CareerHud | null
  // Фаза 6.2
  shouts: ShoutHud[]
  // Фаза 6.3: оборона Бастиона (волны + прочность частокола)
  siege: { wave: number; waves: number; gateHp: number } | null
  // Фаза 5
  diceRoll: DiceRollHudState | null
  setScreen: (s: Screen) => void
  setPanel: (p: PanelId) => void
  patch: (partial: Partial<GameStore>) => void
  pushToast: (text: string, kind?: ToastMsg['kind']) => void
  clearToast: (id: number) => void
  setHasSave: (v: boolean) => void
}

let toastSeq = 1

export const useGame = create<GameStore>((set) => ({
  screen: 'title',
  panel: null,
  party: [],
  player: null,
  abilities: [],
  inventory: [],
  quests: [],
  trackerQuest: null,
  contractQuest: null,
  dialogue: null,
  toasts: [],
  areaToast: null,
  bossBar: null,
  shop: null,
  trainer: null,
  ending: null,
  bestiary: [],
  hasSave: false,
  paused: false,
  interactHint: null,
  renderMode: '3d',
  oil: null,
  daytime: 0.3,
  zoneLabel: 'ХЕЙМХОЛЛ И ОКРЕСТНОСТИ',
  zoneFade: null,
  formation: 'wedge',
  career: null,
  shouts: [],
  siege: null,
  diceRoll: null,
  setScreen: (s) => set({ screen: s }),
  setPanel: (p) => set({ panel: p }),
  patch: (partial) => set(partial),
  pushToast: (text, kind = 'info') =>
    set((st) => ({
      toasts: [...st.toasts.slice(-4), { id: toastSeq++, text, kind }],
    })),
  clearToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
  setHasSave: (v) => set({ hasSave: v }),
}))

export const SAVE_KEY = 'echo-rift-save-v1'

export function readSave(): SaveData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (data.version !== 1) return null
    return data
  } catch {
    return null
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}
