// ============================================================
// ЭХО РАЗЛОМА — система движения (Phase 0.7)
// moveWithCollisions (с коллайдерами и отбросом kb),
// separate (расталкивание сущностей), updatePlayer
// (WASD/клик-движение, автопатака по цели, стамина).
// ============================================================

import { WORLD, RIDGE, GRIDGE, FRIDGE, MARA_RIDGE } from '../data/world'
import { Entity } from '../types'
import { EngineCtx } from '../core/ctx'
import { nearestEnemyOf } from '../core/entity'
import { careerRank } from './career'
import { meleeAttack } from './combat'

export function moveWithCollisions(ctx: EngineCtx, e: Entity, vx: number, vy: number, dt: number) {
  const kbi = ctx.kb.get(e.eid)
  let nx = e.pos.x + (vx + (kbi?.x ?? 0)) * dt
  let ny = e.pos.y + (vy + (kbi?.y ?? 0)) * dt
  if (kbi) {
    const decay = Math.pow(0.002, dt)
    kbi.x *= decay
    kbi.y *= decay
    if (Math.hypot(kbi.x, kbi.y) < 8) ctx.kb.delete(e.eid)
  }
  nx = Math.max(30, Math.min(WORLD.w - 30, nx))
  ny = Math.max(30, Math.min(WORLD.h - 30, ny))
  const er = e.radius * 0.7
  // Хребет между долиной и Вельдом непроходим (Фаза 3): переход только через Врата Тумана.
  const lo = RIDGE.y - RIDGE.band
  const hi = RIDGE.y + RIDGE.band
  if (ny > lo - er && ny < hi + er) {
    ny = e.pos.y >= RIDGE.y ? Math.max(ny, hi + er) : Math.min(ny, lo - er)
  }
  // Каменный Хребет к Граниту непроходим (Фаза 6): переход только через Врата Гранита.
  const glo = GRIDGE.x - GRIDGE.band
  const ghi = GRIDGE.x + GRIDGE.band
  if (nx > glo - er && nx < ghi + er) {
    nx = e.pos.x >= GRIDGE.x ? Math.max(nx, ghi + er) : Math.min(nx, glo - er)
  }
  // Стылый Хребет к Пределью непроходим (Фаза 6.2): переход только через Врата Пределья.
  const flo2 = FRIDGE.x - FRIDGE.band
  const fhi = FRIDGE.x + FRIDGE.band
  if (nx > flo2 - er && nx < fhi + er) {
    nx = e.pos.x >= FRIDGE.x ? Math.max(nx, fhi + er) : Math.min(nx, flo2 - er)
  }
  // Багровый хребет к Маре непроходим (Фаза 6.3): только в секторе Гранита,
  // переход — через Врата Мары. Вельд западнее не трогаем.
  const mlo = MARA_RIDGE.y - MARA_RIDGE.band
  const mhi = MARA_RIDGE.y + MARA_RIDGE.band
  if (nx > GRIDGE.x && ny > mlo - er && ny < mhi + er) {
    ny = e.pos.y >= MARA_RIDGE.y ? Math.max(ny, mhi + er) : Math.min(ny, mlo - er)
  }
  for (const c of ctx.colliders) {
    if (c.propId && ctx.removedProps.has(c.propId)) continue
    if (c.hw !== undefined && c.hd !== undefined) {
      // Прямоугольный (OBB) коллайдер — дома/лавки: круг против повёрнутого бокса.
      const cos = Math.cos(c.rot ?? 0)
      const sin = Math.sin(c.rot ?? 0)
      const dx = nx - c.x
      const dy = ny - c.y
      // мир → локальные оси бокса (соответствие rotation.y Three.js)
      const lx = dx * cos - dy * sin
      const lz = dx * sin + dy * cos
      const qx = Math.max(-c.hw, Math.min(c.hw, lx))
      const qz = Math.max(-c.hd, Math.min(c.hd, lz))
      let ex = lx - qx
      let ez = lz - qz
      const dist = Math.hypot(ex, ez)
      if (dist < er) {
        if (dist > 0.0001) {
          // снаружи: вытолкнуть по нормали от ближайшей точки бокса
          const k = (er - dist) / dist
          ex *= k
          ez *= k
        } else {
          // центр внутри бокса: вытолкнуть через ближайшую грань
          const penX = c.hw + er - Math.abs(lx)
          const penZ = c.hd + er - Math.abs(lz)
          if (penX < penZ) {
            ex = lx >= 0 ? penX : -penX
            ez = 0
          } else {
            ex = 0
            ez = lz >= 0 ? penZ : -penZ
          }
        }
        // локальный вынос → мир
        nx += ex * cos + ez * sin
        ny += -ex * sin + ez * cos
      }
    } else {
      const dx = nx - c.x
      const dy = ny - c.y
      const dist = Math.hypot(dx, dy)
      const min = c.r + er
      if (dist < min && dist > 0.001) {
        nx = c.x + (dx / dist) * min
        ny = c.y + (dy / dist) * min
      }
    }
  }
  e.pos.x = nx
  e.pos.y = ny
}

export function separate(ctx: EngineCtx) {
  const alive = ctx.entities.filter((e) => e.alive && e.kind !== 'npc')
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const b = alive[j]
      const dx = b.pos.x - a.pos.x
      const dy = b.pos.y - a.pos.y
      const dist = Math.hypot(dx, dy)
      const min = a.radius + b.radius
      if (dist < min && dist > 0.01) {
        const push = ((min - dist) / 2) * 0.6
        const ux = dx / dist
        const uy = dy / dist
        if (a.kind !== 'player') {
          a.pos.x -= ux * push
          a.pos.y -= uy * push
        }
        if (b.kind !== 'player') {
          b.pos.x += ux * push
          b.pos.y += uy * push
        }
      }
    }
  }
}

export function updatePlayer(ctx: EngineCtx, dt: number) {
  const p = ctx.player
  if (!p.alive) return
  // WASD относительно камеры: W — от камеры (вперёд по экрану), S — к камере,
  // A/D — влево/вправо по экрану. В 2D (yaw = 0) совпадает со старыми осями.
  const yaw = ctx.renderMode === '3d' && ctx.view3d ? ctx.view3d.getCameraYaw() : 0
  const fx = -Math.sin(yaw) // вперёд (от камеры к цели)
  const fy = -Math.cos(yaw)
  const rx = Math.cos(yaw) // вправо по экрану
  const ry = -Math.sin(yaw)
  let fw = 0
  let sd = 0
  if (ctx.keys.has('w') || ctx.keys.has('arrowup') || ctx.keys.has('ц')) fw += 1
  if (ctx.keys.has('s') || ctx.keys.has('arrowdown') || ctx.keys.has('ы')) fw -= 1
  if (ctx.keys.has('d') || ctx.keys.has('arrowright') || ctx.keys.has('в')) sd += 1
  if (ctx.keys.has('a') || ctx.keys.has('arrowleft') || ctx.keys.has('ф')) sd -= 1
  const mx = fx * fw + rx * sd
  const my = fy * fw + ry * sd
  const moving = mx !== 0 || my !== 0
  if (moving) {
    const l = Math.hypot(mx, my)
    p.vel = { x: (mx / l) * p.speed, y: (my / l) * p.speed }
    p.dest = null
  } else if (p.dest) {
    const dx = p.dest.x - p.pos.x
    const dy = p.dest.y - p.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist < 8) p.dest = null
    else p.vel = { x: (dx / dist) * p.speed, y: (dy / dist) * p.speed }
  } else {
    p.vel = { x: 0, y: 0 }
  }
  const target = ctx.targetEid ? ctx.entities.find((e) => e.eid === ctx.targetEid) : null
  if (target && target.alive) {
    p.facing = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x)
    const dist = Math.hypot(target.pos.x - p.pos.x, target.pos.y - p.pos.y)
    if (dist > p.attackRange + target.radius * 0.6 && !moving) {
      p.dest = { ...target.pos }
    } else if (dist <= p.attackRange + target.radius * 0.6) {
      p.dest = null
      if (p.cds['atk'] <= 0) meleeAttack(ctx, p, target)
    }
  } else if (moving) {
    p.facing = Math.atan2(p.vel.y, p.vel.x)
  }
  // Фаза 6: перк «Вольный Дозор» — +6% к скорости за ранг (лёгкая поступь разведчика)
  const watchSpd = 1 + 0.06 * careerRank(ctx, 'watch')
  moveWithCollisions(ctx, p, p.vel.x * watchSpd, p.vel.y * watchSpd, dt)
  p.walkPhase += dt * (Math.hypot(p.vel.x, p.vel.y) > 4 ? 1 : 0.2)
  const inCombat = nearestEnemyOf(ctx, p, 320) !== null
  // Перк Дозора: регенерация выносливости +2/с за ранг
  ctx.stamina = Math.min(ctx.maxStamina, ctx.stamina + (inCombat ? 6 : 14) * dt + careerRank(ctx, 'watch') * 2 * dt)
}
