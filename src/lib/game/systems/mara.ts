// ============================================================
// ЭХО РАЗЛОМА — Багровая Мара (Фаза 6.3, домен DAO)
// Оборона Бастиона: волновой штурм с прочностью частокола
// (волны + приказы партии из Фазы 4), Мор-Мать как финальный
// босс события, выжигание мор-сгустков.
// ============================================================

import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { BASTION_GATE, BREACH_CAMPS, SIEGE_BREAK, SIEGE_GATE_HP, SIEGE_WAVES } from '../data/world'
import { Entity } from '../types'
import { sfx } from '../sfx'
import { d } from '../core/util'
import { EngineCtx, SiegeState } from '../core/ctx'
import { makeEntity, nearestParty } from '../core/entity'
import { damage, floater, meleeAttack, ring, spawnTelegraph } from './combat'
import { advanceQuest } from './quest'

// ---------------- Оборона Бастиона (волны + приказы) ----------------

/** Бить в рог: начинается штурм Моры (идемпотентно). */
export function startSiege(ctx: EngineCtx) {
  const q = ctx.quests.mara
  if (!q || q.done || q.stage < 2) return
  if (ctx.siege) {
    ctx.toast('Штурм уже идёт — держи частокол!', 'warn')
    return
  }
  ctx.siege = { wave: 0, gateHp: SIEGE_GATE_HP, breakT: 2.5, pending: [], spawnT: 0 }
  sfx('boss')
  ctx.shake = 5
  // Фаза 4 × Фаза 6.3: партия получает приказ «держать ворота»
  // (игрок может перестроить их в тактической паузе: Space + ЛКМ)
  for (const c of ctx.entities) {
    if (c.kind !== 'companion' || !c.alive) continue
    c.stance = 'hold'
    c.home = { x: BASTION_GATE.x + (c.id === 'torvald' ? -36 : 36), y: BASTION_GATE.y + 34 }
    c.dest = null
  }
  ring(ctx, BASTION_GATE, '#c94f3d', 120, 1.1)
  floater(ctx, BASTION_GATE, 'РОГ БЬЁТ ТРЕВОГУ!', '#c94f3d', 20)
  ctx.toast('Оборона Бастиона: держи частокол! Партия встала у ворот (Space — тактические приказы).', 'quest')
  ctx.syncUi()
}

/** Спавн осадной твари из лагерей прорыва. */
function spawnSiegeEnemy(ctx: EngineCtx, type: Entity['enemyType']) {
  if (!type) return
  // Мор-Мать не вылезает второй раз (если уже убита в прерванном штурме)
  if (type === 'blight_mother' && ctx.flags.blightMotherDead) return
  const camp = BREACH_CAMPS[Math.floor(Math.random() * BREACH_CAMPS.length)]
  const st = ENEMY_STATS[type]
  const a = Math.random() * Math.PI * 2
  const rr = Math.random() * 55
  const pos = { x: camp.x + Math.cos(a) * rr, y: camp.y + Math.sin(a) * rr }
  const e = makeEntity(ctx, {
    id: type,
    name: ENEMY_NAME[type] ?? type,
    pos,
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
    enemyType: type,
    boss: type === 'blight_mother',
    aggroR: type === 'blight_mother' ? 0 : st.aggroR,
    leashR: 99999,
    aiState: 'chase',
  })
  e.zoneId = 'siege' // не из зоны респавна — осадная тварь
  e.home = { ...pos }
  ctx.entities.push(e)
  ring(ctx, pos, '#c94f3d', 44, 0.7)
  if (type === 'blight_mother') {
    ctx.shake = 7
    sfx('boss')
    floater(ctx, pos, 'МОР-МАТЬ ВЫШЛА!', '#c94f3d', 18)
    ctx.toast('Мор-Мать вышла из Логова! Это последняя волна — убей её!', 'warn')
  }
}

/** Победа: волны отбиты, Мора отступает. */
function siegeVictory(ctx: EngineCtx) {
  ctx.siege = null
  ctx.flags.bastionHeld = true
  sfx('level')
  ctx.shake = 4
  ring(ctx, BASTION_GATE, '#d9a441', 150, 1.2)
  floater(ctx, BASTION_GATE, 'МОРА ОТСТУПИЛА!', '#d9a441', 20)
  ctx.toast('Штурм отбит! Бастион Ветвей стоит — отчитайся Командору Мейре.', 'quest')
  const q = ctx.quests.mara
  if (q && !q.done && q.stage === 2) advanceQuest(ctx, 'mara', 4)
  ctx.syncUi()
}

/** Провал: частокол пробит, мор рассеивается (квест остаётся — рог можно бить снова). */
function siegeFail(ctx: EngineCtx) {
  ctx.siege = null
  sfx('boss')
  for (const e of ctx.entities) {
    if (e.kind === 'enemy' && e.zoneId === 'siege' && e.alive) {
      e.alive = false
      e.respawnAt = undefined
      ring(ctx, e.pos, '#c94f3d', 34, 0.6)
    }
  }
  ctx.toast('Частокол пробит... Мор разошёлся, но ворота чинят. Бей рог снова!', 'warn')
  floater(ctx, BASTION_GATE, 'ЧАСТОКОЛ ПРОБИТ', '#c94f3d', 18)
  ctx.syncUi()
}

/** Тик осады: спавн волн, грызня частокола, победа/провал. */
export function updateMara(ctx: EngineCtx, dt: number) {
  const S: SiegeState | null = ctx.siege
  if (!S) return
  // Пауза между волнами: починка частокола
  if (S.breakT > 0) {
    S.breakT -= dt
    if (S.breakT <= 0) {
      S.pending = [...SIEGE_WAVES[S.wave]]
      S.spawnT = 0
      floater(ctx, BASTION_GATE, `ВОЛНА ${S.wave + 1}!`, '#e0653a', 18)
      ctx.toast(`Оборона Бастиона: волна ${S.wave + 1} из ${SIEGE_WAVES.length}!`, 'warn')
      sfx('boss')
    }
    return
  }
  // Выплёвываем волну из лагерей прорыва
  if (S.pending.length > 0) {
    S.spawnT -= dt
    if (S.spawnT <= 0) {
      const type = S.pending.shift()
      spawnSiegeEnemy(ctx, type as Entity['enemyType'])
      S.spawnT = 0.55
    }
    return
  }
  // Волна в бою: мор грызёт частокол, пока живы осадные твари
  let alive = 0
  for (const e of ctx.entities) {
    if (e.kind === 'enemy' && e.zoneId === 'siege' && e.alive) alive++
  }
  if (alive === 0) {
    S.wave++
    if (S.wave >= SIEGE_WAVES.length) {
      siegeVictory(ctx)
      return
    }
    S.gateHp = Math.min(SIEGE_GATE_HP, S.gateHp + 10)
    S.breakT = SIEGE_BREAK
    ctx.toast(`Волна отбита! Частокол чинят (${Math.round(S.gateHp)}%). Следующая волна — через ${SIEGE_BREAK} с.`, 'quest')
    sfx('level')
    ctx.syncUi()
    return
  }
  S.gateHp -= alive * 0.55 * dt
  if (S.gateHp <= 0) {
    S.gateHp = 0
    siegeFail(ctx)
  }
}

// ---------------- Мор-Мать (босс домена) ----------------

/**
 * ИИ Мор-Матери: мор-взрыв (круг-телеграф), плевок скверны (конус →
 * горение/замедление), призыв упырей по фазам HP. Полный перехват
 * движения (как у Пепельной Матери), вызывается из updateEnemy.
 */
export function blightMotherLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  const prey = nearestParty(ctx, e.pos, 1e9)
  if (prey) e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)

  // --- Мор-взрыв: круг-телеграф следует за ней ---
  if (e.slamT > 0) {
    e.slamT -= dt
    if (e.slamT <= 0) {
      ring(ctx, e.pos, '#c94f3d', 165, 0.7, 'slam')
      ctx.shake = 8
      sfx('boss')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 170) {
          damage(ctx, a, d(8) + e.dmgMod, { color: '#c94f3d' })
          a.slowT = Math.max(a.slowT, 2)
          ctx.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 3.4, y: (a.pos.y - e.pos.y) * 3.4 })
        }
      }
    }
    return
  }
  if (e.cds['burst'] === undefined) e.cds['burst'] = 5
  if (e.cds['burst'] <= 0 && dist < 240) {
    e.cds['burst'] = 8.5
    e.slamT = 0.95
    floater(ctx, e.pos, 'Скверна рвётся наружу!', '#c94f3d', 16)
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 165,
      width: 0,
      life: 0.95,
      maxLife: 0.95,
      color: '#c94f3d',
      followEid: e.eid,
    })
    return
  }
  // --- Плевок скверны: конус, горение + замедление ---
  if (e.slamT <= 0) {
    e.cds['spit'] = (e.cds['spit'] ?? 4) - dt
    if (e.cds['spit'] <= 0 && dist < 260 && e.ranged && dist < e.ranged) {
      e.cds['spit'] = 7
      e.castT = 0.8
      e.slamT = 0.8
      spawnTelegraph(ctx, {
        shape: 'cone',
        x: e.pos.x,
        y: e.pos.y,
        facing: e.facing,
        radius: 260,
        width: 0.5,
        life: 0.8,
        maxLife: 0.8,
        color: '#d96b3a',
        followEid: e.eid,
      })
      floater(ctx, e.pos, 'Мор-плевок!', '#d96b3a', 15)
      sfx('frost')
      // отложенный урон по конусу — через cds-таймер «spitHit»
      e.cds['spitHit'] = 0.8
      return
    }
    if ((e.cds['spitHit'] ?? 0) > 0) {
      e.cds['spitHit'] = (e.cds['spitHit'] ?? 0) - dt
      if ((e.cds['spitHit'] ?? 0) <= 0) {
        e.castT = 0
        sfx('fire')
        for (const a of ctx.entities) {
          if (a.team !== 'party' || !a.alive) continue
          const da = Math.atan2(a.pos.y - e.pos.y, a.pos.x - e.pos.x)
          const dd = Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y)
          let diff = Math.abs(((da - e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
          if (dd < 265 && diff < 0.52) {
            damage(ctx, a, d(6) + d(4) + 2, { color: '#d96b3a' })
            a.burnT = Math.max(a.burnT, 4)
            a.burnTick = 0.55
            a.slowT = Math.max(a.slowT, 3)
          }
        }
        return
      }
    }
  }
  // --- Фазы: призыв упырей из брюшного мешка ---
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonGhouls(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonGhouls(ctx, e)
  }
  // Кусает в упор (обычная автоатака босса)
  if (prey && e.cds['atk'] <= 0 && dist <= e.attackRange + prey.radius * 0.6) {
    meleeAttack(ctx, e, prey)
  }
}

/** Упыри из брюшного мешка Мор-Матери. */
export function summonGhouls(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.ghoul
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'ghoul',
      name: ENEMY_NAME.ghoul,
      pos: { x: e.pos.x + Math.cos(a) * 66, y: e.pos.y + Math.sin(a) * 66 },
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
      enemyType: 'ghoul',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    h.zoneId = 'siege'
    h.home = { ...h.pos }
    ctx.entities.push(h)
    ring(ctx, h.pos, '#c94f3d', 40, 0.6)
  }
  floater(ctx, e.pos, 'Мать рождает голод!', '#c94f3d', 15)
  sfx('boss')
}

// ---------------- Мор-сгустки (побочный Хольта) ----------------

/** Зеркало для UI: прогресс осады в стор (null — нет штурма). */
export function siegeHud(ctx: EngineCtx) {
  if (!ctx.siege) return null
  return { wave: ctx.siege.wave, waves: SIEGE_WAVES.length, gateHp: Math.max(0, Math.round(ctx.siege.gateHp)) }
}
