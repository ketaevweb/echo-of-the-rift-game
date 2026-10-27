// ============================================================
// ЭХО РАЗЛОМА — фабрика сущностей и запросы (Phase 0.6)
// makeEntity/nearestParty/nearestEnemyOf/pickEntity — чистые
// хелперы над EngineCtx, используются системами и вводом.
// ============================================================

import { Entity, Vec } from '../types'
import { EngineCtx } from './ctx'

export function makeEntity(ctx: EngineCtx, base: Partial<Entity>): Entity {
  return {
    id: base.id ?? 'e',
    eid: ctx.eidSeq++,
    kind: base.kind ?? 'enemy',
    name: base.name ?? '',
    role: base.role,
    pos: base.pos ?? { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: base.radius ?? 14,
    facing: base.facing ?? 0,
    color: base.color ?? '#8a7a54',
    hp: base.hp ?? 30,
    maxHp: base.maxHp ?? base.hp ?? 30,
    alive: base.alive ?? true,
    team: base.team ?? 'hostile',
    speed: base.speed ?? 110,
    atkBonus: base.atkBonus ?? 3,
    ac: base.ac ?? 11,
    dmgDice: base.dmgDice ?? 1,
    dmgSides: base.dmgSides ?? 6,
    dmgMod: base.dmgMod ?? 0,
    attackCd: base.attackCd ?? 1.3,
    attackRange: base.attackRange ?? 44,
    ranged: base.ranged,
    enemyType: base.enemyType,
    boss: base.boss,
    aiState: base.aiState ?? 'idle',
    home: base.home ? { ...base.home } : { ...(base.pos ?? { x: 0, y: 0 }) },
    aggroR: base.aggroR ?? 200,
    leashR: base.leashR ?? 600,
    wanderT: 0,
    stunT: 0,
    burnT: 0,
    burnTick: 0,
    slowT: 0,
    shield: 0,
    targetEid: null,
    attackT: 0,
    hitT: 0,
    castT: 0,
    cds: { atk: 0 },
    respawnAt: undefined,
    summonStage: 0,
    slamT: 0,
    walkPhase: 0,
    downT: 0,
    dest: null,
    stance: base.stance,
    zoneId: base.zoneId,
    npc: base.npc,
  }
}

export function nearestParty(ctx: EngineCtx, from: Vec, maxDist = 1e9): Entity | null {
  let best: Entity | null = null
  let bd = maxDist
  for (const e of ctx.entities) {
    if ((e.kind !== 'player' && e.kind !== 'companion') || !e.alive) continue
    const dist = Math.hypot(e.pos.x - from.x, e.pos.y - from.y)
    if (dist < bd) {
      bd = dist
      best = e
    }
  }
  return best
}

export function nearestEnemyOf(ctx: EngineCtx, from: Entity, maxDist: number): Entity | null {
  let best: Entity | null = null
  let bd = maxDist
  for (const e of ctx.entities) {
    if (e.kind !== 'enemy' || !e.alive) continue
    const dist = Math.hypot(e.pos.x - from.pos.x, e.pos.y - from.pos.y)
    if (dist < bd) {
      bd = dist
      best = e
    }
  }
  return best
}

export function pickEntity(ctx: EngineCtx, p: Vec, filter: (e: Entity) => boolean, extra = 0): Entity | null {
  let best: Entity | null = null
  let bd = 1e9
  for (const e of ctx.entities) {
    if (!filter(e)) continue
    const dist = Math.hypot(e.pos.x - p.x, e.pos.y - p.y)
    if (dist < e.radius + extra && dist < bd) {
      bd = dist
      best = e
    }
  }
  return best
}
