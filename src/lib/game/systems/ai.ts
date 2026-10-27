// ============================================================
// ЭХО РАЗЛОМА — система ИИ и спавна (Phase 0.6)
// Спавн: createPlayer/spawnWorld/spawnZoneEnemy/spawnUnique/
// spawnCompanion. ИИ: updateEnemy/bossLogic/summonHorrors,
// updateCompanion (ИИ спутников) + castCompanionAbility.
// ============================================================

import { ABILITY_MAP, ENEMY_STATS } from '../data/abilities'
import { ENEMY_NAME } from '../data/tables'
import { ASH_MOTHER, BLIGHT_WELLS, NPCS, PLAYER_SPAWN, SPAWN_ZONES, UNIQUE_SPAWNS, VELD_CLUES } from '../data/world'
import { Entity, Stance, Vec } from '../types'
import { sfx } from '../sfx'
import { d, rndRange } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { makeEntity, nearestEnemyOf, nearestParty } from '../core/entity'
import { playerAc, playerAtk } from './progression'
import { beam, damage, floater, meleeAttack, rangedAttack, ring, spawnTelegraph } from './combat'
import { openDialogue } from './quest'
import { companionIndex, formationSlot } from './party'
import { pitMasterLogic, spawnPitMaster } from './career'
import { blightMotherLogic } from './mara'
import { spawnDragon } from './frost'

export { spawnPitMaster }

// ---------------- Инициализация/спавн ----------------

export function createPlayer(ctx: EngineCtx, pos: Vec) {
  ctx.player = makeEntity(ctx, {
    id: 'player',
    kind: 'player',
    name: 'Смотритель',
    pos: { ...pos },
    color: '#c46a2b',
    radius: 13,
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    team: 'party',
    speed: 160,
    atkBonus: playerAtk(ctx).atkBonus,
    ac: playerAc(ctx),
    dmgDice: 1,
    dmgSides: 6,
    dmgMod: playerAtk(ctx).mod,
    attackCd: 0.9,
    attackRange: 52,
    aggroR: 0,
    leashR: 99999,
  })
  ctx.entities.push(ctx.player)
}

export function spawnWorld(ctx: EngineCtx) {
  for (const n of NPCS) {
    if (n.id === 'kaya' && ctx.companionIds.kaya) continue
    if (n.id === 'torvald_npc' && ctx.companionIds.torvald) continue
    ctx.entities.push(
      makeEntity(ctx, {
        id: n.id,
        kind: 'npc',
        name: n.name,
        role: n.role,
        pos: { ...n.pos },
        color: n.color,
        radius: 13,
        hp: 1,
        maxHp: 1,
        team: 'village',
        speed: 0,
        npc: n,
      }),
    )
  }
  for (const z of SPAWN_ZONES) {
    for (let i = 0; i < z.max; i++) spawnZoneEnemy(ctx, z)
  }
  for (const u of UNIQUE_SPAWNS) {
    if (u.enemy === 'alpha' && ctx.flags.alphaDead) continue
    if (u.enemy === 'captain' && ctx.flags.captainDead) continue
    if (u.enemy === 'boss' && ctx.flags.bossDead) continue
    spawnUnique(ctx, u.enemy, u.pos)
  }
  // Вельд (Фаза 3): Пепельная Мать появляется после прочтения всех следов
  if (ctx.flags.ashMotherRevealed && !ctx.flags.ashMotherDead) {
    spawnAshMother(ctx)
  }
  // Гранит (Фаза 6): Мастер Ямы выходит, если квест дошёл до вызова
  if (ctx.flags.pitMasterRevealed && !ctx.flags.pitMasterDead) {
    spawnPitMaster(ctx)
  }
  // Пределье (Фаза 6.2): бой с драконом, прерванный загрузкой сейва, продолжается
  if (
    ctx.quests.frost_dragon?.stage === 3 &&
    !ctx.flags.dragonDead &&
    ctx.player.pos.x > 5500
  ) {
    spawnDragon(ctx)
  }
  for (const c of VELD_CLUES) {
    if (ctx.flags['clue_' + c.id]) ctx.removedProps.add(c.id)
  }
  // Фаза 6.3: выжженные мор-сгустки остаются выжженными после загрузки
  for (const w of BLIGHT_WELLS) {
    if (ctx.flags['well_' + w.id]) ctx.removedProps.add(w.id)
  }
  // Фаза 4: спавним по наличию в мире (а не по флагу — сейв ставит
  // companionIds=true до spawnWorld, и старый гвард молча терял партию при загрузке)
  if (ctx.companionIds.kaya && !ctx.entities.some((x) => x.kind === 'companion' && x.id === 'kaya')) spawnCompanion(ctx, 'kaya')
  if (ctx.companionIds.torvald && !ctx.entities.some((x) => x.kind === 'companion' && x.id === 'torvald')) spawnCompanion(ctx, 'torvald')
  if (ctx.flags.gateOpen) {
    ctx.removedProps.add('barrier')
    ctx.removedProps.add('barrier2')
    ctx.removedProps.add('barrier3')
  }
  for (let i = 1; i <= 4; i++) {
    if (ctx.flags['herb_herb' + i]) ctx.removedProps.add('herb' + i)
  }
}

export function spawnZoneEnemy(ctx: EngineCtx, z: (typeof SPAWN_ZONES)[number]) {
  const st = ENEMY_STATS[z.enemy]
  const a = Math.random() * Math.PI * 2
  const rr = Math.random() * z.radius
  const pos = { x: z.center.x + Math.cos(a) * rr, y: z.center.y + Math.sin(a) * rr }
  const e = makeEntity(ctx, {
    id: z.enemy,
    name: ENEMY_NAME[z.enemy],
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
    enemyType: z.enemy,
    aggroR: st.aggroR,
    leashR: st.leashR,
  })
  e.zoneId = z.id
  e.home = { ...pos }
  ctx.entities.push(e)
}

export function spawnUnique(ctx: EngineCtx, type: 'alpha' | 'captain' | 'boss' | 'ash_mother', pos: Vec) {
  const st = ENEMY_STATS[type]
  const e = makeEntity(ctx, {
    id: type,
    name: ENEMY_NAME[type],
    pos: { ...pos },
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
    boss: type === 'boss',
    aggroR: type === 'boss' ? 0 : st.aggroR,
    leashR: st.leashR,
  })
  ctx.entities.push(e)
}

export function spawnCompanion(ctx: EngineCtx, id: 'kaya' | 'torvald') {
  // Гвард по сущности в мире (а не по флагу вербовки): флаг уже true при загрузке сейва
  if (ctx.entities.some((x) => x.kind === 'companion' && x.id === id)) return
  ctx.companionIds[id] = true
  const npcDef = NPCS.find((n) => n.id === (id === 'torvald' ? 'torvald_npc' : id))
  const isKaya = id === 'kaya'
  const e = makeEntity(ctx, {
    id,
    kind: 'companion',
    name: npcDef?.name ?? id,
    role: npcDef?.role ?? '',
    pos: { x: ctx.player.pos.x - 26, y: ctx.player.pos.y + 18 },
    color: isKaya ? '#9fb8a4' : '#7a8a4a',
    radius: 13,
    hp: (isKaya ? 70 : 110) + (ctx.level - 1) * 10,
    maxHp: (isKaya ? 70 : 110) + (ctx.level - 1) * 10,
    team: 'party',
    speed: 158,
    atkBonus: isKaya ? 4 : 5,
    ac: isKaya ? 12 : 13,
    dmgDice: 1,
    dmgSides: isKaya ? 6 : 8,
    dmgMod: isKaya ? 2 : 3,
    attackCd: isKaya ? 1.8 : 1.1,
    attackRange: isKaya ? 220 : 46,
    ranged: isKaya ? 240 : undefined,
    aggroR: 0,
    leashR: 99999,
    stance: 'follow',
  })
  ctx.entities.push(e)
  ctx.entities = ctx.entities.filter(
    (x) => !(x.kind === 'npc' && x.id === (id === 'torvald' ? 'torvald_npc' : id)),
  )
}

// ---------------- ИИ спутников ----------------

export function updateCompanion(ctx: EngineCtx, e: Entity, dt: number) {
  if (!e.alive) {
    e.downT -= dt
    if (e.downT <= 0) {
      e.alive = true
      e.hp = Math.round(e.maxHp * 0.45)
      floater(ctx, e.pos, 'На ноги!', '#8fbf7f', 14)
    }
    return
  }
  const stance: Stance = e.stance ?? 'follow'
  const player = ctx.player
  let desired: Vec | null = null
  let target: Entity | null = null

  if (stance === 'hold') {
    // Фаза 4: приказ движения из тактической паузы — идём в точку, встаём на пост
    if (e.dest) {
      const dx = e.dest.x - e.pos.x
      const dy = e.dest.y - e.pos.y
      if (Math.hypot(dx, dy) < 12) e.dest = null
      else desired = { ...e.dest }
    } else if (Math.hypot(e.home.x - e.pos.x, e.home.y - e.pos.y) > 14) desired = { ...e.home }
    target = nearestEnemyOf(ctx, e, 260)
  } else if (stance === 'aggressive') {
    target = nearestEnemyOf(ctx, e, 460)
    if (!target) {
      const slot = formationSlot(ctx, companionIndex(e.id))
      desired = slot
    }
  } else {
    const t = ctx.targetEid ? ctx.entities.find((x) => x.eid === ctx.targetEid) : null
    if (t && t.alive && Math.hypot(t.pos.x - e.pos.x, t.pos.y - e.pos.y) < 400) target = t
    else target = nearestEnemyOf(ctx, e, 240)
    // Фаза 4: слот формации (клин/линия) вместо жёстких офсетов.
    desired = formationSlot(ctx, companionIndex(e.id))
  }
  if (target) {
    const dist = Math.hypot(target.pos.x - e.pos.x, target.pos.y - e.pos.y)
    const stopAt = e.ranged ? e.ranged * 0.75 : e.attackRange + target.radius * 0.6
    desired = dist > stopAt ? { ...target.pos } : null
    e.facing = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x)
    if (dist <= (e.ranged ?? e.attackRange) + target.radius * 0.6 && e.cds['atk'] <= 0) {
      if (e.ranged) rangedAttack(ctx, e, target)
      else meleeAttack(ctx, e, target)
    }
    if (e.id === 'torvald') {
      if (e.cds['shieldbash'] <= 0 && dist < 70) castCompanionAbility(ctx, e.eid, 'shieldbash', target.eid)
      if (e.cds['warcry'] <= 0 && dist < 300) castCompanionAbility(ctx, e.eid, 'warcry', target.eid)
    }
    if (e.id === 'kaya' && e.cds['frostbolt'] <= 0 && dist < 260) {
      castCompanionAbility(ctx, e.eid, 'frostbolt', target.eid)
    }
  }
  // Фаза 4: активный приказ движения важнее погони (атаки в радиусе не прерываются)
  if ((e.stance ?? 'follow') === 'hold' && e.dest) desired = { x: e.dest.x, y: e.dest.y }
  if (e.id === 'kaya' && e.cds['mend'] <= 0) castCompanionAbility(ctx, e.eid, 'mend', null)

  if (desired) {
    const dx = desired.x - e.pos.x
    const dy = desired.y - e.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist > 10) {
      const sp = e.speed * (e.slowT > 0 ? 0.5 : 1)
      e.vel = { x: (dx / dist) * sp, y: (dy / dist) * sp }
    } else e.vel = { x: 0, y: 0 }
  } else {
    e.vel = { x: 0, y: 0 }
  }
  if (!target && Math.hypot(e.vel.x, e.vel.y) > 4) {
    e.facing = Math.atan2(e.vel.y, e.vel.x)
  }
  ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
  e.walkPhase += dt * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1 : 0.2)
}

export function castCompanionAbility(ctx: EngineCtx, eid: number, abilityId: string, targetEid: number | null) {
  const e = ctx.entities.find((x) => x.eid === eid)
  if (!e || !e.alive) return
  if ((e.cds[abilityId] ?? 0) > 0) return
  const target = targetEid ? ctx.entities.find((x) => x.eid === targetEid) : null
  switch (abilityId) {
    case 'shieldbash': {
      const t = target ?? nearestEnemyOf(ctx, e, 70)
      if (!t) return
      e.cds['shieldbash'] = ABILITY_MAP['shieldbash'].cooldown
      t.stunT = Math.max(t.stunT, 1.3)
      damage(ctx, t, d(6) + 2, { color: '#c9c4bc' })
      floater(ctx, t.pos, 'Оглушён!', '#c9c4bc', 12)
      sfx('hit')
      break
    }
    case 'warcry': {
      e.cds['warcry'] = ABILITY_MAP['warcry'].cooldown
      ctx.buffT = 6
      ring(ctx, e.pos, '#d9a441', 60, 0.6)
      floater(ctx, e.pos, 'Клич!', '#d9a441', 14)
      sfx('shield')
      break
    }
    case 'frostbolt': {
      const t = target ?? nearestEnemyOf(ctx, e, 260)
      if (!t) return
      e.cds['frostbolt'] = ABILITY_MAP['frostbolt'].cooldown
      damage(ctx, t, d(4) + d(4) + 2, { color: '#bfe3ea' })
      t.slowT = 2.5
      beam(ctx, e.pos, t.pos, '#bfe3ea')
      sfx('frost')
      break
    }
    case 'mend': {
      let lowAlly: Entity | null = null
      let lowRatio = 0.6
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        const r = a.hp / a.maxHp
        if (r < lowRatio && Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 280) {
          lowRatio = r
          lowAlly = a
        }
      }
      if (!lowAlly) return
      e.cds['mend'] = ABILITY_MAP['mend'].cooldown
      const amount = Math.round(lowAlly.maxHp * 0.3)
      lowAlly.hp = Math.min(lowAlly.maxHp, lowAlly.hp + amount)
      if (lowAlly.kind === 'player') ctx.hp = lowAlly.hp
      floater(ctx, lowAlly.pos, '+' + amount, '#8fbf7f', 14)
      ring(ctx, lowAlly.pos, '#8fbf7f', 30, 0.5)
      sfx('heal')
      break
    }
  }
  ctx.syncUi()
}

// ---------------- Вельд: Пепельная Мать (Фаза 3) ----------------

/** Мини-босс Вельда: спавнится у кургана, если контракт дошёл до стадии охоты. */
export function spawnAshMother(ctx: EngineCtx) {
  if (ctx.flags.ashMotherDead) return
  if (ctx.entities.some((e) => e.enemyType === 'ash_mother' && e.alive)) return
  spawnUnique(ctx, 'ash_mother', { ...ASH_MOTHER.pos })
}

/** Пепельный взрыв + призыв болотников по фазам HP. */
export function ashMotherLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  // --- Пепельный взрыв: телеграф-круг следует за ней ---
  if (e.slamT > 0) {
    e.slamT -= dt
    if (e.slamT <= 0) {
      ring(ctx, e.pos, '#e0703a', 150, 0.7, 'slam')
      ctx.shake = 8
      sfx('boss')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 155) {
          damage(ctx, a, d(6) + d(6) + e.dmgMod, { color: '#e08a5a' })
          ctx.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 3, y: (a.pos.y - e.pos.y) * 3 })
        }
      }
    }
    return
  }
  if (e.cds['burst'] === undefined) e.cds['burst'] = 5
  if (e.cds['burst'] <= 0 && dist < 250) {
    e.cds['burst'] = 9
    e.slamT = 0.9
    floater(ctx, e.pos, 'Пепел воспаряет!', '#e0703a', 15)
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 150,
      width: 0,
      life: 0.9,
      maxLife: 0.9,
      color: '#e0703a',
      followEid: e.eid,
    })
    return
  }
  // Фазы: призыв болотников
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonBoglings(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonBoglings(ctx, e)
  }
}

export function summonBoglings(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.bogling
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'bogling',
      name: ENEMY_NAME.bogling,
      pos: { x: e.pos.x + Math.cos(a) * 70, y: e.pos.y + Math.sin(a) * 70 },
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
      enemyType: 'bogling',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    ctx.entities.push(h)
    ring(ctx, h.pos, '#7a8a4a', 40, 0.6)
  }
  floater(ctx, e.pos, 'Топи отвечают ей!', '#a3c06b', 15)
  sfx('boss')
}

// ---------------- ИИ врагов ----------------

export function updateEnemy(ctx: EngineCtx, e: Entity, dt: number) {
  if (!e.alive) {
    if (e.respawnAt !== undefined && ctx.time >= e.respawnAt) {
      if (Math.hypot(ctx.player.pos.x - e.home.x, ctx.player.pos.y - e.home.y) > 500) {
        e.alive = true
        e.hp = e.maxHp
        e.aiState = 'idle'
        e.burnT = 0
        e.stunT = 0
        const zone = SPAWN_ZONES.find((z) => z.id === e.zoneId)
        if (zone) {
          const a = Math.random() * Math.PI * 2
          const rr = Math.random() * zone.radius
          e.pos = { x: zone.center.x + Math.cos(a) * rr, y: zone.center.y + Math.sin(a) * rr }
          e.home = { ...e.pos }
        }
        e.respawnAt = undefined
      }
    }
    return
  }
  // Интро босса долины (у Мор-Матери/Мастера Ямы свои события — только свой enemyType)
  if (e.enemyType === 'boss' && !ctx.flags.bossIntroDone) {
    if (Math.hypot(ctx.player.pos.x - e.pos.x, ctx.player.pos.y - e.pos.y) < 340) {
      ctx.flags.bossIntroDone = true
      e.aggroR = 400
      openDialogue(ctx, 'boss_intro')
      return
    }
  }
  // Интро Мастера Ямы (Фаза 6): таймер-выбор у арены
  if (e.enemyType === 'pit_master' && !ctx.flags.pitIntroDone) {
    if (Math.hypot(ctx.player.pos.x - e.pos.x, ctx.player.pos.y - e.pos.y) < 380) {
      ctx.flags.pitIntroDone = true
      e.aggroR = 420
      openDialogue(ctx, 'pit_intro')
      return
    }
  }
  if (e.stunT > 0) {
    e.vel = { x: 0, y: 0 }
    ctx.moveWithCollisions(e, 0, 0, dt)
    return
  }
  const prey = nearestParty(ctx, e.pos, e.aiState === 'idle' || e.aiState === 'wander' ? e.aggroR : 1e9)
  const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.y - e.home.y)

  // поводок: слишком далеко от дома — возвращаемся
  if (e.aiState === 'chase' && homeDist > e.leashR) {
    e.aiState = 'return'
  }

  if (e.aiState === 'return') {
    if (homeDist < 20) {
      e.aiState = 'idle'
      e.hp = e.maxHp
    } else {
      const dx = e.home.x - e.pos.x
      const dy = e.home.y - e.pos.y
      const l = Math.hypot(dx, dy)
      e.vel = { x: (dx / l) * e.speed, y: (dy / l) * e.speed }
      e.facing = Math.atan2(dy, dx)
      ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.12 * dt)
      e.walkPhase += dt
    }
    return
  }

  if (!prey) {
    if (e.aiState === 'chase' || e.aiState === 'attack') {
      e.aiState = 'return'
    } else {
      e.wanderT -= dt
      if (e.wanderT <= 0) {
        e.wanderT = rndRange(1.5, 4)
        const a = Math.random() * Math.PI * 2
        const rr = rndRange(0, 60)
        e.dest = { x: e.home.x + Math.cos(a) * rr, y: e.home.y + Math.sin(a) * rr }
      }
      if (e.dest) {
        const dx = e.dest.x - e.pos.x
        const dy = e.dest.y - e.pos.y
        const l = Math.hypot(dx, dy)
        if (l < 6) e.dest = null
        else {
          e.vel = { x: (dx / l) * e.speed * 0.35, y: (dy / l) * e.speed * 0.35 }
          e.facing = Math.atan2(e.vel.y, e.vel.x)
          ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
          e.walkPhase += dt
          return
        }
      }
      e.vel = { x: 0, y: 0 }
    }
    return
  }

  e.aiState = 'chase'
  const dist = Math.hypot(prey.pos.x - e.pos.x, prey.pos.y - e.pos.y)
  // Замах рывка босса: направление зафиксировано (иначе коридор-телеграф врал бы)
  if (!((e.chargeT ?? 0) > 0)) {
    e.facing = Math.atan2(prey.pos.y - e.pos.y, prey.pos.x - e.pos.x)
  }

  if (e.boss && e.enemyType !== 'dragon') bossLogic(ctx, e, dist, dt)
  if (e.enemyType === 'ash_mother') ashMotherLogic(ctx, e, dist, dt)
  if (e.enemyType === 'pit_master') pitMasterLogic(ctx, e, dist, dt)
  // Фаза 6.3: Мор-Мать управляет собой полностью (взрыв/плевок/призыв)
  if (e.enemyType === 'blight_mother') blightMotherLogic(ctx, e, dist, dt)
  // Фаза 6.2: дракон управляет собой полностью (полёт/стрейф/посадка)
  if (e.enemyType === 'dragon') return

  // Замах/рывок босса: обычное движение и атаки заблокированы —
  // вся логика внутри bossLogic (return после него не выходим,
  // но дистанционно он уже управляет боссом)
  if ((e.chargeT ?? 0) > 0 || (e.dashT ?? 0) > 0) {
    e.vel = { x: 0, y: 0 }
    e.walkPhase += dt * ((e.dashT ?? 0) > 0 ? 2 : 0.3)
    return
  }

  const isRanged = !!e.ranged
  const wantRange = isRanged ? e.ranged! * 0.85 : e.attackRange + prey.radius * 0.6
  let vx = 0
  let vy = 0
  if (isRanged) {
    if (dist < wantRange * 0.55) {
      // Слишком близко — отступаем
      vx = -Math.cos(e.facing) * e.speed
      vy = -Math.sin(e.facing) * e.speed
    } else if (dist > wantRange) {
      vx = Math.cos(e.facing) * e.speed
      vy = Math.sin(e.facing) * e.speed
    } else if (e.cds['atk'] > 0.15) {
      // В удобном поясе: стрейф поперёк луча (Фаза 2), чтобы не стоять столбом под ударом
      const s = e.eid % 2 === 0 ? 1 : -1
      const pa = e.facing + (Math.PI / 2) * s
      vx = Math.cos(pa) * e.speed * 0.5
      vy = Math.sin(pa) * e.speed * 0.5
    }
  } else if (dist > wantRange) {
    if (dist > wantRange * 1.5 && !e.boss) {
      // Фланкирование (Фаза 2): каждый враг заходит на свой сектор дуги вокруг цели
      // (стабильно по eid — стая естественно окружает, как волки в W3)
      const base = Math.atan2(e.pos.y - prey.pos.y, e.pos.x - prey.pos.x)
      const flankA = (((e.eid * 7) % 9) - 4) * 0.32 // −1.28..+1.28 рад
      const fa = base + flankA
      const tx = prey.pos.x + Math.cos(fa) * wantRange * 0.85
      const ty = prey.pos.y + Math.sin(fa) * wantRange * 0.85
      const dx = tx - e.pos.x
      const dy = ty - e.pos.y
      const l = Math.hypot(dx, dy) || 1
      vx = (dx / l) * e.speed
      vy = (dy / l) * e.speed
    } else {
      vx = Math.cos(e.facing) * e.speed
      vy = Math.sin(e.facing) * e.speed
    }
  }
  const spd = e.slowT > 0 ? 0.5 : 1
  ctx.moveWithCollisions(e, vx * spd, vy * spd, dt)
  e.walkPhase += dt * (Math.hypot(vx, vy) > 4 ? 1 : 0.2)

  if (e.cds['atk'] <= 0) {
    if (isRanged && dist < e.ranged!) rangedAttack(ctx, e, prey)
    else if (!isRanged && dist <= e.attackRange + prey.radius * 0.6) meleeAttack(ctx, e, prey)
  }
}

export function bossLogic(ctx: EngineCtx, e: Entity, dist: number, dt: number) {
  // --- Активный рывок (Фаза 2): несёмся по коридору, сметая партию ---
  if ((e.dashT ?? 0) > 0) {
    e.dashT = (e.dashT ?? 0) - dt
    const dir = e.dashDir ?? e.facing
    e.facing = dir
    const sp = 660
    e.vel = { x: Math.cos(dir) * sp, y: Math.sin(dir) * sp }
    ctx.moveWithCollisions(e, e.vel.x, e.vel.y, dt)
    if (!e.dashHits) e.dashHits = new Set()
    for (const a of ctx.entities) {
      if (a.team !== 'party' || !a.alive) continue
      if (e.dashHits.has(a.eid)) continue
      if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < e.radius + 46) {
        e.dashHits.add(a.eid)
        damage(ctx, a, d(10) + d(10) + e.dmgMod, { color: '#e0653a' })
        ctx.kb.set(a.eid, { x: Math.cos(dir) * 420, y: Math.sin(dir) * 420 })
        sfx('hit')
      }
    }
    if ((e.dashT ?? 0) <= 0) {
      e.dashT = 0
      e.dashHits = undefined
      ctx.shake = 5
    }
    return
  }
  // --- Замах рывка: стоим, направление заперто, телеграф-коридор уже на земле ---
  if ((e.chargeT ?? 0) > 0) {
    e.chargeT = (e.chargeT ?? 0) - dt
    e.vel = { x: 0, y: 0 }
    if ((e.chargeT ?? 0) <= 0) {
      e.chargeT = 0
      e.dashT = 0.5
      e.dashDir = e.chargeDir ?? e.facing
      e.dashHits = new Set()
      ctx.shake = 7
      sfx('boss')
    }
    return
  }
  // --- Замах слэма: телеграф-круг следует за боссом, удар по истечении ---
  if (e.slamT > 0) {
    e.slamT -= dt
    if (e.slamT <= 0) {
      ring(ctx, e.pos, '#c94f3d', 170, 0.7, 'slam')
      ctx.shake = 10
      sfx('boss')
      for (const a of ctx.entities) {
        if (a.team !== 'party' || !a.alive) continue
        if (Math.hypot(a.pos.x - e.pos.x, a.pos.y - e.pos.y) < 175) {
          damage(ctx, a, d(8) + d(8) + e.dmgMod, { color: '#e0653a' })
          ctx.kb.set(a.eid, { x: (a.pos.x - e.pos.x) * 4, y: (a.pos.y - e.pos.y) * 4 })
        }
      }
    }
    return
  }
  if (e.cds['slam'] === undefined) e.cds['slam'] = 4
  if (e.cds['slam'] <= 0 && dist < 200) {
    e.cds['slam'] = 7
    e.slamT = 0.9
    floater(ctx, e.pos, 'Буря близко!', '#a06bd9', 16)
    spawnTelegraph(ctx, {
      shape: 'circle',
      x: e.pos.x,
      y: e.pos.y,
      facing: 0,
      radius: 175,
      width: 0,
      life: 0.9,
      maxLife: 0.9,
      color: '#c94f3d',
      followEid: e.eid,
    })
    return
  }
  // --- Фаза ярости (<66% HP): рывок с коридором-телеграфом ---
  if (e.cds['charge'] === undefined) e.cds['charge'] = 6
  const enraged = e.hp / e.maxHp < 0.66
  if (enraged && e.cds['charge'] <= 0 && dist > 130 && dist < 520) {
    e.cds['charge'] = 9
    e.chargeDir = e.facing
    e.chargeT = 0.85
    floater(ctx, e.pos, 'Разлом несёт меня!', '#a06bd9', 16)
    spawnTelegraph(ctx, {
      shape: 'line',
      x: e.pos.x,
      y: e.pos.y,
      facing: e.facing,
      radius: Math.min(520, dist + 150),
      width: 54,
      life: 0.85,
      maxLife: 0.85,
      color: '#c94f3d',
      followEid: e.eid,
    })
    return
  }
  const ratio = e.hp / e.maxHp
  if (ratio < 0.66 && e.summonStage < 1) {
    e.summonStage = 1
    summonHorrors(ctx, e)
  }
  if (ratio < 0.33 && e.summonStage < 2) {
    e.summonStage = 2
    summonHorrors(ctx, e)
  }
}

export function summonHorrors(ctx: EngineCtx, e: Entity) {
  for (let i = 0; i < 2; i++) {
    const st = ENEMY_STATS.horror
    const a = Math.random() * Math.PI * 2
    const h = makeEntity(ctx, {
      id: 'horror',
      name: ENEMY_NAME.horror,
      pos: { x: e.pos.x + Math.cos(a) * 60, y: e.pos.y + Math.sin(a) * 60 },
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
      enemyType: 'horror',
      aggroR: st.aggroR,
      leashR: 9999,
      aiState: 'chase',
    })
    ctx.entities.push(h)
    ring(ctx, h.pos, '#a06bd9', 40, 0.6)
  }
  floater(ctx, e.pos, 'Разлом извергает слуг!', '#a06bd9', 15)
  sfx('boss')
}
