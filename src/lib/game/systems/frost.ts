// ============================================================
// ЭХО РАЗЛОМА — Стылое Пределье (Фаза 6.2, домен Skyrim)
// Событие дракона Иммолтакса (воздушные круги → стрейф →
// посадка → наземная фаза → душа дракона), Стены Слов
// (изучение криков Ту'ум), головоломка рунных камней.
// ============================================================

import { ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { RUNE_SOLUTION, RUNE_STONES, RUNE_SYMBOLS, ROOST } from '../data/world'
import { Entity } from '../types'
import { sfx } from '../sfx'
import { d } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { makeEntity, nearestParty } from '../core/entity'
import { damage, floater, meleeAttack, ring, spawnTelegraph } from './combat'
import { advanceQuest } from './quest'

// ---------------- Слова силы (Стены Слов) ----------------

/** Взять слово силы у Стены Слов: lv 0 → 1 (и до 2 — вторая стена того же крика). */
export function learnWord(ctx: EngineCtx, word: 'force' | 'frost') {
  const flag = word === 'force' ? 'wordForce' : 'wordFrost'
  const was = ctx.shoutLv[word]
  if (was >= 2) return
  ctx.shoutLv[word] = Math.min(2, was + 1)
  ctx.flags[flag] = true
  const name = word === 'force' ? 'СИЛА' : 'МОРОЗ'
  floater(ctx, ctx.player.pos, '«' + name + '»', '#f5c96b', 20)
  ring(ctx, ctx.player.pos, '#f5c96b', 70, 0.9)
  ctx.toast(
    was === 0
      ? `Стена Слова отдаёт своё слово: «${name}»! Крик изучен (${word === 'force' ? 'R' : 'T'}).`
      : `Второе слово «${name}» впитано — крик стал сильнее.`,
    'level',
  )
  sfx('level')
  // Квест «Слова на камне»: прикосновение к Стене Силы завершает путь
  const q = ctx.quests.frost_words
  if (word === 'force' && q && !q.done && q.stage > 0 && q.stage < 4) advanceQuest(ctx, 'frost_words', 4)
  ctx.syncUi()
}

/** Душа дракона: поглощение — все открытые крики крепнут (lv +1); если ни один не открыт — голос пробуждается. */
export function dragonSoulAbsorb(ctx: EngineCtx) {
  const anyOpen = ctx.shoutLv.force > 0 || ctx.shoutLv.frost > 0
  if (anyOpen) {
    if (ctx.shoutLv.force > 0) ctx.shoutLv.force = Math.min(2, ctx.shoutLv.force + 1)
    if (ctx.shoutLv.frost > 0) ctx.shoutLv.frost = Math.min(2, ctx.shoutLv.frost + 1)
    ctx.toast('ДРЕВНИЙ ГОЛОС: слова силы крепнут в твоём горле!', 'level')
  } else {
    ctx.shoutLv.force = 1
    ctx.toast('ДРЕВНИЙ ГОЛОС: душа дракона пробуждает слово СИЛЫ! (R)', 'level')
  }
  floater(ctx, ctx.player.pos, 'СИЛА ДРЕВНИХ!', '#f5c96b', 20)
  ring(ctx, ctx.player.pos, '#f5c96b', 120, 1.1)
  sfx('level')
  ctx.syncUi()
}

// ---------------- Головоломка рунных камней ----------------

/** Повернуть кольцо камня (0→1→2→0) и проверить решение. */
export function cycleRune(ctx: EngineCtx, id: string) {
  if (!(id in ctx.runes)) return
  if (ctx.flags.runeDoorOpen) {
    floater(ctx, ctx.player.pos, 'Камни поют правильно.', '#bfe3ea', 13)
    return
  }
  ctx.runes[id as 'rs1'] = ((ctx.runes[id as 'rs1'] ?? 0) + 1) % 3
  const sym = RUNE_SYMBOLS[ctx.runes[id as 'rs1']]
  floater(ctx, ctx.player.pos, sym, '#bfe3ea', 15)
  sfx('shield')
  checkRuneSolution(ctx)
  ctx.syncUi()
}

/** Совпали ли все три камня с решением старины. */
function runesSolved(ctx: EngineCtx): boolean {
  return RUNE_STONES.every((s) => (ctx.runes[s.id] ?? -1) === RUNE_SOLUTION[s.id])
}

function checkRuneSolution(ctx: EngineCtx) {
  if (ctx.flags.runeDoorOpen || !runesSolved(ctx)) return
  ctx.flags.runeDoorOpen = true
  ctx.removedProps.add('rdoor1')
  ctx.removedProps.add('rdoor2')
  ctx.removedProps.add('rdoor3')
  ctx.shake = 6
  ring(ctx, { x: 6020, y: 560 }, '#bfe3ea', 110, 0.9)
  floater(ctx, { x: 6020, y: 560 }, 'РУНЫ ПОЮТ!', '#bfe3ea', 18)
  ctx.toast('Рунные камни запели в лад — пелена над пещерой опала!', 'quest')
  sfx('level')
  const q = ctx.quests.frost_words
  if (q && !q.done && q.stage > 0 && q.stage < 3) advanceQuest(ctx, 'frost_words', 3)
}

// ---------------- Дракон Иммолтакс ----------------

/** Спавн дракона события (идемпотентен). */
export function spawnDragon(ctx: EngineCtx) {
  if (ctx.flags.dragonDead) return
  if (ctx.entities.some((e) => e.enemyType === 'dragon' && e.alive)) return
  const st = ENEMY_STATS.dragon
  const e = makeEntity(ctx, {
    id: 'dragon',
    name: ENEMY_NAME.dragon,
    pos: { x: ROOST.pos.x, y: ROOST.pos.y - 220 },
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
    enemyType: 'dragon',
    boss: true,
    aggroR: 0,
    leashR: 9999,
    aiState: 'chase',
  })
  // Старт в воздухе: alt 1 (летит), таймер кругов, бросок огня
  e.cds['alt'] = 1
  e.cds['airT'] = 3
  e.cds['fire'] = 2.5
  ctx.entities.push(e)
  ctx.shake = 7
  sfx('boss')
  floater(ctx, e.pos, 'СТЫЛЫЕ ВЕТРА РВУТСЯ!', '#e0653a', 18)
}

/** Триггер события: игрок с квестом вошёл в Драконий Дол. */
export function updateFrost(ctx: EngineCtx, dt: number) {
  const q = ctx.quests.frost_dragon
  if (q && !q.done && q.stage === 2 && !ctx.flags.dragonDead) {
    if (Math.hypot(ctx.player.pos.x - ROOST.pos.x, ctx.player.pos.y - ROOST.pos.y) < 380) {
      spawnDragon(ctx)
      advanceQuest(ctx, 'frost_dragon', 3)
      ctx.toast('Тень накрывает Дол. Иммолтакс заметил тебя!', 'warn')
    }
  }
  const dragon = ctx.entities.find((e) => e.enemyType === 'dragon' && e.alive)
  if (dragon) dragonLogic(ctx, dragon, dt)
}

/**
 * ИИ дракона: воздух (круги над Долом + огненные бомбы) → стрейф-пролёт
 * (телеграф-полоса) → посадка (наземная фаза: укусы, струя огня, взмах крыльев)
 * → снова взлёт. Полный перехват: обычное движение врага не выполняется.
 */
export function dragonLogic(ctx: EngineCtx, e: Entity, dt: number) {
  if (e.cds['alt'] === undefined) e.cds['alt'] = 1
  const airborne = e.cds['alt'] > 0.5
  // Высота аватара лерпится к цели (полёт/земля)
  const altGoal = e.cds['airT'] !== undefined && e.cds['airT'] > 0 ? 1 : 0
  e.cds['alt'] += (altGoal - e.cds['alt']) * Math.min(1, dt * 1.4)

  const prey = nearestParty(ctx, e.pos, 1e9)
  const dist = prey ? Math.hypot(prey.pos.x - e.pos.x, prey.pos.y - e.pos.y) : 1e9
  const inReach = dist < 640

  // --- Замах стрейфа: полоса-телеграф через жертву, потом пролёт ---
  if ((e.chargeT ?? 0) > 0) {
    e.chargeT = (e.chargeT ?? 0) - dt
    e.vel = { x: 0, y: 0 }
    if ((e.chargeT ?? 0) <= 0) {
      e.chargeT = 0
      e.dashT = 0.62
      e.dashDir = e.chargeDir ?? e.facing
      e.dashHits = new Set()
      e.cds['airT'] = 4 // после пролёта ещё немного в воздухе
      sfx('boss')
    }
    return
  }
  // --- Стрейф-пролёт: несёмся по полосе, сметая партию ---
  if ((e.dashT ?? 0) > 0) {
    e.dashT = (e.dashT ?? 0) - dt
    const dir = e.dashDir ?? e.facing
    e.facing = dir
    e.vel = { x: Math.cos(dir) * 720, y: Math.sin(dir) * 720 }
    ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
    if (!e.dashHits) e.dashHits = new Set()
    for (const a of ctx.entities) {
      if (a.team !== 'party' || !a.alive) continue
      if (e.dashHits.has(a.eid)) continue
      if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < e.radius + 52) {
        e.dashHits.add(a.eid)
        damage(ctx, a, d(10) + e.dmgMod, { color: '#e0653a' })
        ctx.kb.set(a.eid, { x: Math.cos(dir) * 430, y: Math.sin(dir) * 430 })
        sfx('hit')
      }
    }
    if ((e.dashT ?? 0) <= 0) {
      e.dashT = 0
      e.dashHits = undefined
      ctx.shake = 6
    }
    return
  }

  if (airborne) {
    // --- Круги над Долом ---
    e.cds['airT'] = (e.cds['airT'] ?? 0) - dt
    if (e.cds['ang'] === undefined) e.cds['ang'] = Math.atan2(e.pos.y - ROOST.pos.y, e.pos.x - ROOST.pos.x)
    e.cds['ang'] += dt * 0.85
    const rr = 235
    const tx = ROOST.pos.x + Math.cos(e.cds['ang']) * rr
    const ty = ROOST.pos.y + Math.sin(e.cds['ang']) * rr
    const dx = tx - e.pos.x
    const dy = ty - e.pos.y
    const l = Math.hypot(dx, dy) || 1
    e.vel = { x: (dx / l) * 150, y: (dy / l) * 150 }
    ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
    e.walkPhase += dt * 2.2
    e.facing = Math.atan2(e.vel.y, e.vel.x)
    // Огненная бомба: круг-телеграф на земле у жертвы, взрыв по таймеру
    e.cds['fire'] = (e.cds['fire'] ?? 2) - dt
    if (e.cds['fire'] <= 0 && inReach) {
      e.cds['fire'] = 3.4
      e.slamT = 1.0 // бомба «летит» секунду
      e.bombX = prey ? prey.pos.x : e.pos.x
      e.bombY = prey ? prey.pos.y : e.pos.y
      spawnTelegraph(ctx, {
        shape: 'circle',
        x: e.bombX,
        y: e.bombY,
        facing: 0,
        radius: 115,
        width: 0,
        life: 1.0,
        maxLife: 1.0,
        color: '#e0653a',
      })
      floater(ctx, { x: e.bombX, y: e.bombY }, 'ОГОНЬ С НЕБА!', '#e0653a', 15)
      sfx('fire')
    }
    // Бомба взрывается
    if (e.slamT > 0) {
      e.slamT -= dt
      if (e.slamT <= 0) {
        ring(ctx, { x: e.bombX ?? e.pos.x, y: e.bombY ?? e.pos.y }, '#e0653a', 115, 0.6, 'slam')
        ctx.shake = 6
        sfx('boss')
        for (const a of ctx.entities) {
          if (a.team !== 'party' || !a.alive) continue
          if (Math.hypot(a.pos.x - (e.bombX ?? e.pos.x), a.pos.y - (e.bombY ?? e.pos.y)) < 120) {
            damage(ctx, a, d(6) + d(6) + e.dmgMod, { color: '#e08a5a' })
            a.burnT = Math.max(a.burnT, 3)
            a.burnTick = 0.6
          }
        }
      }
    }
    // Садится: воздух кончился и стрейф уже сделан (или жертва далеко)
    if ((e.cds['airT'] ?? 0) <= 0) {
      e.cds['groundT'] = 17
      e.cds['breath'] = 3
      e.cds['wings'] = 6
      floater(ctx, e.pos, 'ИММОЛТАКС САДИТСЯ!', '#e0653a', 16)
      sfx('boss')
    }
    return
  }

  // --- Наземная фаза ---
  e.cds['groundT'] = (e.cds['groundT'] ?? 0) - dt
  if (!prey) {
    e.vel = { x: 0, y: 0 }
    if ((e.cds['groundT'] ?? 0) <= 0) {
      e.cds['airT'] = 9
      e.cds['fire'] = 2
    }
    return
  }
  e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)
  // Движение к жертве
  const stopAt = e.attackRange + prey.radius * 0.6
  let vx = 0
  let vy = 0
  if (dist > stopAt) {
    vx = Math.cos(e.facing) * e.speed
    vy = Math.sin(e.facing) * e.speed
  }
  ctx.moveWithCollisions(e, vx, vy, dt)
  e.walkPhase += dt * (Math.hypot(vx, vy) > 4 ? 1.2 : 0.2)
  // Укус
  if (e.cds['atk'] <= 0 && dist <= e.attackRange + prey.radius * 0.6) meleeAttack(ctx, e, prey)
  // Струя огня: конус-телеграф, затем урон по конусу
  e.cds['breath'] = (e.cds['breath'] ?? 4) - dt
  if (e.cds['breath'] <= 0 && dist < 300) {
    e.cds['breath'] = 8.5
    e.slamT = 0.85
    e.castT = 0.85
    spawnTelegraph(ctx, {
      shape: 'cone',
      x: e.pos.x,
      y: e.pos.y,
      facing: e.facing,
      radius: 250,
      width: 0.52,
      life: 0.85,
      maxLife: 0.85,
      color: '#e0653a',
      followEid: e.eid,
    })
    floater(ctx, e.pos, 'Пламя древних!', '#e0653a', 15)
  }
  if (e.slamT > 0) {
    e.slamT -= dt
    if (e.slamT <= 0) {
      e.castT = 0
      sfx('fire')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        const da = Math.atan2(a.pos.y - e.pos.y, a.pos.x - e.pos.x)
        const dd = Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y)
        let diff = Math.abs(((da - e.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        if (dd < 255 && diff < 0.55) {
          damage(ctx, a, d(6) + d(6) + d(6), { color: '#e08a5a' })
          a.burnT = Math.max(a.burnT, 4)
          a.burnTick = 0.5
        }
      }
    }
    return
  }
  // Взмах крыльев: круг-удар вокруг
  e.cds['wings'] = (e.cds['wings'] ?? 7) - dt
  if (e.cds['wings'] <= 0 && dist < 210) {
    e.cds['wings'] = 10
    e.slamT = 0.9
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 170,
      width: 0,
      life: 0.9,
      maxLife: 0.9,
      color: '#e0653a',
      followEid: e.eid,
    })
    floater(ctx, e.pos, 'Крылья бури!', '#e0653a', 15)
  }
  // Взлёт: время на земле вышло
  if ((e.cds['groundT'] ?? 0) <= 0) {
    e.cds['airT'] = 9
    e.cds['fire'] = 2
    floater(ctx, e.pos, 'Он поднимается в небо!', '#e0653a', 14)
  }
}
