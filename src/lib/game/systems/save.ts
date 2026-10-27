// ============================================================
// ЭХО РАЗЛОМА — система сохранений (Phase 0.3)
// saveGame / applySave (loadFrom) / toTitle + версионирование
// схемы сейва. Логика untouched: collectSave/applySave — точный
// перенос тел saveGame/loadFrom из engine.ts.
// ============================================================

import { CareerState, QuestState, SaveData, SignId } from '../types'
import { QUESTS } from '../data/quests'
import { RUNE_INIT } from '../data/frost'
import { useGame, writeSave } from '../store'
import { EngineCtx } from '../core/ctx'

/** Текущая версия схемы сейва (ключ localStorage: echo-rift-save-v1). */
export const SAVE_VERSION = 1

/**
 * Цепочка миграций схемы. Каждая миграция поднимает версию ровно на 1.
 * Сейчас актуальна v1 — цепочка пуста; старые сейвы прототипа (v1)
 * читаются как есть. При вводе v2 добавить: { from: 1, up: (d) => ({ ...d, newField, version: 2 }) }.
 */
export interface Migration {
  from: number
  up: (raw: Record<string, unknown>) => Record<string, unknown>
}
export const migrations: Migration[] = []

/**
 * Поднимает сырой сейв до актуальной версии. Возвращает null, если
 * сейв невозможно мигрировать (как раньше — readSave вернёт null).
 */
export function migrateSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null
  let data = raw as Record<string, unknown>
  const from = typeof data.version === 'number' ? data.version : -1
  if (from > SAVE_VERSION) return null
  let v = from
  while (v < SAVE_VERSION) {
    const m = migrations.find((x) => x.from === v)
    if (!m) return null // нет пути миграции — отвергаем (прежнее поведение для v≠1)
    data = m.up(data)
    v = typeof data.version === 'number' ? data.version : v + 1
  }
  return data as unknown as SaveData
}

/** Снимок состояния движка → объект SaveData (ex-saveGame, часть 1). */
export function collectSave(ctx: EngineCtx): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    playtime: ctx.playtime,
    kills: ctx.kills,
    level: ctx.level,
    xp: ctx.xp,
    lp: ctx.lp,
    gold: ctx.gold,
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    stamina: ctx.stamina,
    maxStamina: ctx.maxStamina,
    attributes: { ...ctx.attributes },
    skills: { ...ctx.skills },
    signs: JSON.parse(JSON.stringify(ctx.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
    weapon: ctx.weapon,
    armor: ctx.armor,
    inventory: ctx.inventory.map((i) => ({ ...i })),
    faction: ctx.faction,
    quests: JSON.parse(JSON.stringify(ctx.quests)) as Record<string, QuestState>,
    flags: { ...ctx.flags },
    companions: { ...ctx.companionIds },
    bestiary: [...ctx.bestiary],
    pos: { ...ctx.player.pos },
    dayClock: ctx.dayClock,
    oilKind: ctx.oilKind,
    oilT: ctx.oilT,
    // Фаза 4: одобрение и строй (старые сейвы получат дефолты в applySave)
    approval: { ...ctx.approval },
    formation: ctx.formation,
    // Фаза 5: происхождение и Тишь (старые сейвы получат дефолты в applySave)
    origin: ctx.origin,
    silence: ctx.silence,
    // Фаза 6: карьера фракции Гранита
    career: JSON.parse(JSON.stringify(ctx.career)) as CareerState,
    // Фаза 6.2: слова силы и руны пещеры
    shoutLv: { ...ctx.shoutLv },
    runes: { ...ctx.runes },
  }
}

/** Запись сейва (manual=false — автосейв, без тоста). */
export function saveGame(ctx: EngineCtx, manual = true) {
  writeSave(collectSave(ctx))
  useGame.getState().setHasSave(true)
  if (manual) ctx.toast('Игра сохранена.', 'info')
}

/** Загрузка состояния из сейва (ex-loadFrom): поля + пересоздание мира. */
export function applySave(ctx: EngineCtx, s: SaveData) {
  ctx.playtime = s.playtime
  ctx.kills = s.kills
  ctx.level = s.level
  ctx.xp = s.xp
  ctx.lp = s.lp
  ctx.gold = s.gold
  ctx.hp = s.hp
  ctx.maxHp = s.maxHp
  ctx.stamina = s.stamina
  ctx.maxStamina = s.maxStamina
  ctx.attributes = { ...s.attributes }
  ctx.skills = { ...s.skills }
  ctx.signs = JSON.parse(JSON.stringify(s.signs)) as Record<SignId, { unlocked: boolean; level: number }>
  ctx.weapon = s.weapon
  ctx.armor = s.armor
  ctx.inventory = s.inventory.map((i) => ({ ...i }))
  ctx.faction = s.faction
  // Квесты: слить со свежими дефолтами — сейвы старых версий могут не знать новых квестов (Фаза 3)
  const fresh: Record<string, QuestState> = {}
  for (const q of QUESTS) fresh[q.id] = { stage: 0, counter: 0, done: false }
  ctx.quests = { ...fresh, ...(JSON.parse(JSON.stringify(s.quests)) as Record<string, QuestState>) }
  ctx.flags = { ...s.flags }
  ctx.companionIds = { ...s.companions }
  ctx.bestiary = new Set(s.bestiary)
  // Фаза 3: сутки/масло — в старых сейвах отсутствуют, подставляем дефолты
  ctx.dayClock = typeof s.dayClock === 'number' ? s.dayClock : 0.3
  ctx.oilKind = s.oilKind ?? null
  ctx.oilT = typeof s.oilT === 'number' ? s.oilT : 0
  // Фаза 4: одобрение/строй — дефолты для сейвов до Фазы 4
  ctx.approval = {
    kaya: typeof s.approval?.kaya === 'number' ? s.approval.kaya : 45,
    torvald: typeof s.approval?.torvald === 'number' ? s.approval.torvald : 45,
  }
  ctx.formation = s.formation === 'line' ? 'line' : 'wedge'
  // Фаза 5: происхождение/Тишь — дефолты для сейвов до Фазы 5
  ctx.origin = s.origin === 'exile' || s.origin === 'ember' ? s.origin : 'warden'
  ctx.silence = typeof s.silence === 'number' ? Math.max(0, Math.min(100, s.silence)) : 0
  // Фаза 6: карьера — дефолты для сейвов до Фазы 6
  const c = s.career
  ctx.career = {
    faction: c?.faction === 'order' || c?.faction === 'coven' || c?.faction === 'watch' ? c.faction : null,
    rep: {
      order: typeof c?.rep?.order === 'number' ? c.rep.order : 0,
      coven: typeof c?.rep?.coven === 'number' ? c.rep.coven : 0,
      watch: typeof c?.rep?.watch === 'number' ? c.rep.watch : 0,
    },
    rank: {
      order: typeof c?.rank?.order === 'number' ? c.rank.order : 0,
      coven: typeof c?.rank?.coven === 'number' ? c.rank.coven : 0,
      watch: typeof c?.rank?.watch === 'number' ? c.rank.watch : 0,
    },
  }
  // Фаза 6.2: слова силы/руны — дефолты для сейвов до Фазы 6.2
  ctx.shoutLv = {
    force: typeof s.shoutLv?.force === 'number' ? Math.max(0, Math.min(2, s.shoutLv.force)) : 0,
    frost: typeof s.shoutLv?.frost === 'number' ? Math.max(0, Math.min(2, s.shoutLv.frost)) : 0,
  }
  ctx.runes = {
    rs1: typeof s.runes?.rs1 === 'number' ? Math.max(0, Math.min(2, s.runes.rs1)) : RUNE_INIT.rs1,
    rs2: typeof s.runes?.rs2 === 'number' ? Math.max(0, Math.min(2, s.runes.rs2)) : RUNE_INIT.rs2,
    rs3: typeof s.runes?.rs3 === 'number' ? Math.max(0, Math.min(2, s.runes.rs3)) : RUNE_INIT.rs3,
  }
  ctx.createPlayer({ ...s.pos })
  ctx.spawnWorld()
}

/** Сохраниться и вернуться на титульный экран. */
export function toTitle(ctx: EngineCtx) {
  saveGame(ctx, false)
  useGame.getState().setScreen('title')
}
