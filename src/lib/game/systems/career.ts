// ============================================================
// ЭХО РАЗЛОМА — карьера фракций и ямы Колонии (Фаза 6, Gothic)
// Три лагеря Гранитной Долины в войне за Ядровой барьер:
//  • Орден Пепла (order) — знаки сильнее, ранг 3: +2 КД брони
//  • Ковен Ветвей (coven) — масла дольше, зелья лечат сильнее
//  • Вольный Дозор (watch) — крит с 19 (ранг 2+), скорость/стамина
// Ямные бои: ставки, волны противников, слава Колонии (репутация).
// ============================================================

import { CareerId, Entity } from '../types'
import { PIT, PIT_MASTER } from '../data/world'
import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { sfx } from '../sfx'
import { EngineCtx } from '../core/ctx'
import { makeEntity } from '../core/entity'
import { damage, floater, ring, spawnTelegraph } from './combat'
import { gainXp } from './progression'
import { advanceQuest } from './quest'
import { addApproval } from './party'

// ---------------- Карьера ----------------

export const CAREER_NAME: Record<CareerId, string> = {
  order: 'Орден Пепла',
  coven: 'Ковен Ветвей',
  watch: 'Вольный Дозор',
}

/** Ранг 0 — не в карьере; 1 — Новобранец; 2 — Боец; 3 — Ветеран. */
export const RANK_NAME = ['—', 'Новобранец', 'Боец', 'Ветеран']

/** Требования рангов: репутация + взнос золотом. */
export const RANK_REQ = [
  { rep: 0, gold: 0 },
  { rep: 0, gold: 0 },
  { rep: 30, gold: 250 },
  { rep: 70, gold: 600 },
]

/** Описание перков карьеры — для UI и диалогов. */
export const CAREER_PERKS: Record<CareerId, string[]> = {
  order: ['Знаки сильнее на +12% за ранг', 'Ранг 3: +2 к классу брони'],
  coven: ['Масла держатся на +25% дольше за ранг', 'Зелья лечат на +6 ОЗ за ранг'],
  watch: ['Ранг 2+: криты выпадают на 19–20', '+6% скорости и реген выносливости за ранг'],
}

/** Вступить в карьеру фракции (одна карьера на героя — Gothic-правило выбора). */
export function joinCareer(ctx: EngineCtx, id: CareerId) {
  if (ctx.career.faction) {
    ctx.toast(`Ты уже связан с «${CAREER_NAME[ctx.career.faction]}». Прежний лагерь не забывает предателей.`, 'warn')
    return
  }
  ctx.career.faction = id
  ctx.career.rep[id] = Math.min(100, ctx.career.rep[id] + 10)
  // Вербовка — сразу «Новобранец» (ранг 1)
  if (ctx.career.rank[id] < 1) ctx.career.rank[id] = 1
  // Gothic-напряжение: чужие лагеря хмурятся
  for (const other of ['order', 'coven', 'watch'] as CareerId[]) {
    if (other !== id) ctx.career.rep[other] = Math.max(0, ctx.career.rep[other] - 5)
  }
  ctx.toast(`Ты вступил в ${CAREER_NAME[id]}! Новобранец Колонии.`, 'quest')
  sfx('level')
  ctx.syncUi()
}

/** Репутация карьеры (кламп 0..100). */
export function addRep(ctx: EngineCtx, id: CareerId, delta: number) {
  const before = ctx.career.rep[id]
  const after = Math.max(0, Math.min(100, before + delta))
  if (after === before) return
  ctx.career.rep[id] = after
  if (delta > 0) ctx.toast(`Слава в «${CAREER_NAME[id]}»: ${after}/100`, 'info')
  ctx.syncUi()
}

/** Ранг в конкретной карьере (даже если герой в другой — репутации общие). */
export function careerRank(ctx: EngineCtx, id: CareerId): number {
  return ctx.career.faction === id ? ctx.career.rank[id] : 0
}

/** Ранг активной карьеры героя (0 — нет карьеры). */
export function heroRank(ctx: EngineCtx): number {
  return ctx.career.faction ? ctx.career.rank[ctx.career.faction] : 0
}

/** Повышение ранга у вербовщика: репутация + взнос; чужие лагеря ревнуют. */
export function rankUp(ctx: EngineCtx, id: CareerId) {
  if (ctx.career.faction !== id) {
    ctx.toast(`Сначала вступи в ${CAREER_NAME[id]}.`, 'warn')
    return
  }
  const cur = ctx.career.rank[id]
  if (cur >= 3) {
    ctx.toast('Высший ранг уже твой.', 'info')
    return
  }
  const req = RANK_REQ[cur + 1]
  if (ctx.career.rep[id] < req.rep) {
    ctx.toast(`Нужна слава ${req.rep}+ (сейчас ${ctx.career.rep[id]}).`, 'warn')
    return
  }
  if (ctx.gold < req.gold) {
    ctx.toast(`Взнос: ${req.gold} золота.`, 'warn')
    return
  }
  ctx.gold -= req.gold
  ctx.career.rank[id] = cur + 1
  // Чужие лагеря теряют доверие (война за барьер)
  for (const other of ['order', 'coven', 'watch'] as CareerId[]) {
    if (other !== id) ctx.career.rep[other] = Math.max(0, ctx.career.rep[other] - 8)
  }
  ctx.toast(`${CAREER_NAME[id]}: новый ранг «${RANK_NAME[cur + 1]}»!`, 'level')
  sfx('level')
  ring(ctx, ctx.player.pos, '#f5c96b', 70, 0.8)
  ctx.syncUi()
}

// ---------------- Ямные бои ----------------

export interface PitFightDef {
  tier: number
  name: string
  bet: number
  reward: number
  reqLevel: number
  reqRank: number
  waves: Array<Array<{ type: 'bandit' | 'archer' | 'scorpion' | 'captain'; n: number }>>
}

/** Карточки ямы у Кассии. */
export const PIT_FIGHTS: PitFightDef[] = [
  {
    tier: 1,
    name: 'Драчун из рудников',
    bet: 25,
    reward: 60,
    reqLevel: 1,
    reqRank: 0,
    waves: [[{ type: 'bandit', n: 1 }]],
  },
  {
    tier: 2,
    name: 'Пара головорезов',
    bet: 60,
    reward: 140,
    reqLevel: 4,
    reqRank: 0,
    waves: [
      [{ type: 'bandit', n: 2 }],
      [{ type: 'archer', n: 1 }, { type: 'bandit', n: 1 }],
    ],
  },
  {
    tier: 3,
    name: 'Чемпион ямы',
    bet: 110,
    reward: 270,
    reqLevel: 6,
    reqRank: 2,
    waves: [
      [{ type: 'scorpion', n: 2 }],
      [{ type: 'captain', n: 1 }],
    ],
  },
]

/** Начать ямный бой: ставка взята, партия в арене, первая волна вышла. */
export function startPitFight(ctx: EngineCtx, tier: number) {
  const def = PIT_FIGHTS.find((f) => f.tier === tier)
  if (!def || ctx.pitTier > 0) return
  if (ctx.gold < def.bet) {
    ctx.toast(`Ставка ${def.bet} золота — у тебя нет столько.`, 'warn')
    return
  }
  ctx.gold -= def.bet
  ctx.pitTier = tier
  ctx.pitWave = 0
  // Арена лечит и телепортирует партию (Gothic: яма не терпит слабых)
  ctx.hp = ctx.maxHp
  ctx.player.hp = ctx.hp
  ctx.stamina = ctx.maxStamina
  const enter = { x: PIT.pos.x, y: PIT.pos.y + 90 }
  ctx.player.pos = { ...enter }
  ctx.player.dest = null
  ctx.camera = { ...enter }
  let i = 0
  for (const e of ctx.entities) {
    if (e.kind === 'companion') {
      e.pos = { x: enter.x - 40 + i * 40, y: enter.y + 20 }
      e.home = { ...e.pos }
      e.dest = null
      e.hp = e.maxHp
      i++
    }
  }
  ctx.targetEid = null
  spawnPitWave(ctx)
  ctx.toast(`ЯМНЫЙ БОЙ: ${def.name}. Ставка ${def.bet} золота — толпа ревёт!`, 'quest')
  sfx('boss')
  ctx.syncUi()
}

/** Спавн текущей волны: противники выходят из-за частокола. */
function spawnPitWave(ctx: EngineCtx) {
  const def = PIT_FIGHTS.find((f) => f.tier === ctx.pitTier)
  if (!def) return
  const wave = def.waves[Math.min(ctx.pitWave, def.waves.length - 1)]
  let k = 0
  for (const spec of wave) {
    for (let i = 0; i < spec.n; i++) {
      const st = ENEMY_STATS[spec.type]
      const a = Math.PI * 1.35 + k * 0.5
      const rr = 55 + (k % 2) * 30
      const e = makeEntity(ctx, {
        id: spec.type,
        name: ENEMY_NAME[spec.type],
        pos: { x: PIT.pos.x + Math.cos(a) * rr, y: PIT.pos.y + Math.sin(a) * rr },
        radius: st.radius,
        hp: st.hp,
        maxHp: st.hp,
        speed: st.speed,
        atkBonus: st.atk,
        ac: st.ac,
        dmgDice: st.dmgDice,
        dmgSides: st.dmgSides,
        dmgMod: st.dmgMod,
        attackCd: st.attackCd,
        attackRange: st.attackRange,
        ranged: st.ranged,
        enemyType: spec.type,
        aggroR: 9999,
        leashR: 900,
        aiState: 'chase',
      })
      e.zoneId = 'pit'
      e.home = { ...e.pos }
      ctx.entities.push(e)
      ring(ctx, e.pos, '#d9a441', 42, 0.6)
      k++
    }
  }
}

/** Тик ямы (из stepWorld): волны, победа, слава. Дешёвый guard — pitTier===0. */
export function updatePit(ctx: EngineCtx) {
  if (ctx.pitTier === 0) return
  const def = PIT_FIGHTS.find((f) => f.tier === ctx.pitTier)
  if (!def) {
    ctx.pitTier = 0
    return
  }
  const alive = ctx.entities.some((e) => e.kind === 'enemy' && e.alive && e.zoneId === 'pit')
  if (alive) return
  if (ctx.pitWave + 1 < def.waves.length) {
    ctx.pitWave++
    ctx.toast(`Волна ${ctx.pitWave + 1}! Двери ямы скрипят...`, 'warn')
    sfx('boss')
    spawnPitWave(ctx)
    return
  }
  // Победа: ставка ×выплатой + слава + доверие отряда
  const profit = def.reward
  ctx.gold += profit
  ctx.pitTier = 0
  ctx.pitWave = 0
  ctx.toast(`ТОЛПА РВЁТ ГЛОТКИ! Выигрыш: +${profit} золота (ставка ${def.bet} возвращена с лихвой).`, 'loot')
  floater(ctx, ctx.player.pos, 'ПОБЕДА В ЯМЕ!', '#f5c96b', 18)
  if (ctx.career.faction) addRep(ctx, ctx.career.faction, 3)
  else ctx.toast('Без карьеры слава ямы мертва: вступи в лагерь Колонии.', 'info')
  addApproval(ctx, 'kaya', 1)
  addApproval(ctx, 'torvald', 1)
  gainXp(ctx, 30 + def.tier * 25)
  sfx('level')
  // Главный квест Гранита: тир III — «заслужить право на яму» → Мастер выходит на арену
  if (def.tier === 3 && ctx.quests.granite.stage === 2 && !ctx.quests.granite.done) {
    advanceQuest(ctx, 'granite', 3)
  }
  ctx.syncUi()
}

/** Прервать яму (смерть/телепорт): противников убрать, ставку не возвращать. */
export function endPitFight(ctx: EngineCtx) {
  if (ctx.pitTier === 0) return
  ctx.pitTier = 0
  ctx.pitWave = 0
  ctx.entities = ctx.entities.filter((e) => !(e.kind === 'enemy' && e.zoneId === 'pit'))
}

// ---------------- Мастер Ямы (босс домена) ----------------

/** Мастер Ямы выходит на арену, когда герой заслужил право на бой. */
export function spawnPitMaster(ctx: EngineCtx) {
  if (ctx.flags.pitMasterDead) return
  if (ctx.entities.some((e) => e.enemyType === 'pit_master' && e.alive)) return
  const st = ENEMY_STATS.pit_master
  const e = makeEntity(ctx, {
    id: 'pit_master',
    name: ENEMY_NAME.pit_master,
    pos: { ...PIT_MASTER.pos },
    color: '#8a6a3a',
    radius: st.radius,
    hp: st.hp,
    maxHp: st.hp,
    speed: st.speed,
    atkBonus: st.atk,
    ac: st.ac,
    dmgDice: st.dmgDice,
    dmgSides: st.dmgSides,
    dmgMod: st.dmgMod,
    attackCd: st.attackCd,
    attackRange: st.attackRange,
    enemyType: 'pit_master',
    aggroR: 0,
    leashR: 9999,
  })
  ctx.entities.push(e)
}

/** Логика Мастера Ямы: цеп-слэм с телеграфом + «Яма отвечает!» — призыв скорпионов. */
export function pitMasterLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  if (e.slamT > 0) {
    e.slamT -= dt
    if (e.slamT <= 0) {
      ring(ctx, e.pos, '#c9a44a', 150, 0.7, 'slam')
      ctx.shake = 8
      sfx('boss')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 155) {
          damage(ctx, a, dmgRoll(e, 8, 8), { color: '#e0a04a' })
          ctx.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 3.4, y: (a.pos.y - e.pos.y) * 3.4 })
        }
      }
    }
    return
  }
  if (e.cds['slam'] === undefined) e.cds['slam'] = 3.5
  if (e.cds['slam'] <= 0 && dist < 220) {
    e.cds['slam'] = 7.5
    e.slamT = 0.95
    floater(ctx, e.pos, 'ЦЕПИ ГОСПАДНЯ!', '#c9a44a', 15)
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 150,
      width: 0,
      life: 0.95,
      maxLife: 0.95,
      color: '#c9a44a',
      followEid: e.eid,
    })
    return
  }
  const ratio = e.hp / e.maxHp
  if (ratio < 0.6 && e.summonStage < 1) {
    e.summonStage = 1
    summonScorpions(ctx, e)
  }
}

function dmgRoll(e: Entity, dice: number, sides: number): number {
  let total = e.dmgMod
  for (let i = 0; i < dice; i++) total += 1 + Math.floor(Math.random() * sides)
  return total
}

function summonScorpions(ctx: EngineCtx, e: Entity) {
  const st = ENEMY_STATS.scorpion
  for (let i = 0; i < 2; i++) {
    const a = Math.random() * Math.PI * 2
    const s = makeEntity(ctx, {
      id: 'scorpion',
      name: ENEMY_NAME.scorpion,
      pos: { x: e.pos.x + Math.cos(a) * 80, y: e.pos.y + Math.sin(a) * 80 },
      radius: st.radius,
      hp: st.hp,
      maxHp: st.hp,
      speed: st.speed,
      atkBonus: st.atk,
      ac: st.ac,
      dmgDice: st.dmgDice,
      dmgSides: st.dmgSides,
      dmgMod: st.dmgMod,
      attackCd: st.attackCd,
      attackRange: st.attackRange,
      enemyType: 'scorpion',
      aggroR: 9999,
      leashR: 700,
      aiState: 'chase',
    })
    s.zoneId = 'pit_master_summon'
    s.home = { ...s.pos }
    ctx.entities.push(s)
    ring(ctx, s.pos, '#a89a6a', 40, 0.6)
  }
  floater(ctx, e.pos, 'Яма отвечает!', '#c9a44a', 15)
  sfx('boss')
}
