// ============================================================
// ЭХО РАЗЛОМА — система партии (Фаза 4: DAO/ME2-слой)
// Формации (клин/линия) относительно направления игрока,
// одобрение компаньонов (0..100, ≥60 открывает синергии),
// парные приёмы: «Стена и Молот» (Торвальд+Аард) и
// «Мороз и Пламя» (Кайя+Игни).
// ============================================================

import { Entity, FormationId, Vec } from '../types'
import { sfx } from '../sfx'
import { d } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { beam, damage, floater, ring } from './combat'

/** Порог одобрения, открывающий парные приёмы. */
export const APPROVAL_SYNERGY = 60

// ---------------- Одобрение ----------------

/** Изменить одобрение компаньона (кламп 0..100). При пересечении порога 60 — тост. */
export function addApproval(ctx: EngineCtx, id: 'kaya' | 'torvald', delta: number) {
  if (!ctx.companionIds[id]) return
  const before = ctx.approval[id]
  const after = Math.max(0, Math.min(100, before + delta))
  if (after === before) return
  ctx.approval[id] = after
  const crossed = before < APPROVAL_SYNERGY && after >= APPROVAL_SYNERGY
  if (crossed) {
    const name = id === 'kaya' ? 'Кайя' : 'Торвальд'
    ctx.toast(`${name} доверяет тебе (${after}/100) — открыты парные приёмы!`, 'quest')
    sfx('level')
  }
  ctx.syncUi()
}

/** Одобрение за убийство: +1 живому компаньону рядом (участвовал в бою). */
export function approvalOnKill(ctx: EngineCtx, preyPos: Vec) {
  for (const e of ctx.entities) {
    if (e.kind !== 'companion' || !e.alive) continue
    if (e.id !== 'kaya' && e.id !== 'torvald') continue
    if (Math.hypot(e.pos.x - preyPos.x, e.pos.y - preyPos.y) < 420) {
      ctx.approval[e.id] = Math.min(100, ctx.approval[e.id] + 1)
    }
  }
}

/** Одобрение за завершение квеста: +6 всем вербованным. */
export function approvalOnQuestDone(ctx: EngineCtx) {
  if (ctx.companionIds.kaya) addApproval(ctx, 'kaya', 6)
  if (ctx.companionIds.torvald) addApproval(ctx, 'torvald', 6)
}

/** Компаньон выведен из боя: −3. */
export function approvalOnDowned(ctx: EngineCtx, e: Entity) {
  if (e.id === 'kaya' || e.id === 'torvald') addApproval(ctx, e.id, -3)
}

// ---------------- Формации ----------------

/** Слот компаньона в строю относительно направления игрока.
 *  idx 0 — Торвальд (щит), idx 1 — Кайя (тыл). */
export function formationSlot(ctx: EngineCtx, idx: number): Vec {
  const facing = ctx.player.facing
  const p = ctx.player.pos
  if (ctx.formation === 'line') {
    // Строй: фланги чуть позади героя (левый idx0, правый idx1)
    const a = facing + Math.PI + (idx === 0 ? -0.7 : 0.7)
    return { x: p.x + Math.cos(a) * 44, y: p.y + Math.sin(a) * 44 }
  }
  // Клин: idx0 — впереди-слева, idx1 — позади по центру
  const a = idx === 0 ? facing - 0.55 : facing + Math.PI
  const dist = idx === 0 ? 46 : 40
  return { x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist }
}

/** Индекс компаньона в строю (по id). */
export function companionIndex(id: string): number {
  return id === 'torvald' ? 0 : 1
}

/** Сменить строй (клин ⇄ линия). */
export function cycleFormation(ctx: EngineCtx) {
  const next: FormationId = ctx.formation === 'wedge' ? 'line' : 'wedge'
  ctx.formation = next
  ctx.toast(
    next === 'wedge' ? 'Строй отряда: клин.' : 'Строй отряда: линия.',
    'info',
  )
  sfx('click')
  ctx.syncUi()
}

// ---------------- Синергии пар (Фаза 4) ----------------

/** «Стена и Молот» — Торвальд встречает волну Аарда ударом щита:
 *  все враги в конусе дольше оглушены и получают доп. урон. */
export function trySynergyWallAndHammer(ctx: EngineCtx, coneEnemies: Entity[]) {
  if (coneEnemies.length === 0) return
  const tor = ctx.entities.find((e) => e.id === 'torvald' && e.kind === 'companion' && e.alive)
  if (!tor) return
  if (ctx.approval.torvald < APPROVAL_SYNERGY) return
  if ((tor.cds['shieldbash'] ?? 0) > 0) return
  // Рядом с героем (волна должна его «достать»)
  if (Math.hypot(tor.pos.x - ctx.player.pos.x, tor.pos.y - ctx.player.pos.y) > 260) return
  tor.cds['shieldbash'] = 8
  tor.attackT = 0.3
  sfx('shield')
  ring(ctx, tor.pos, '#d9a441', 70, 0.7)
  beam(ctx, tor.pos, ctx.player.pos, '#d9a441')
  floater(ctx, tor.pos, 'СТЕНА И МОЛОТ!', '#d9a441', 18)
  for (const e of coneEnemies) {
    e.stunT = Math.max(e.stunT, 2.4)
    damage(ctx, e, d(6) + 4, { color: '#d9a441' })
    const a = Math.atan2(e.pos.y - ctx.player.pos.y, e.pos.x - ctx.player.pos.x)
    ctx.kb.set(e.eid, { x: Math.cos(a) * 160, y: Math.sin(a) * 160 })
    floater(ctx, e.pos, 'Оглушён!', '#d9a441', 12)
  }
  ctx.shake = 6
}

/** «Мороз и Пламя» — Игни испаряет ледяную стрелу Кайи:
 *  паровой взрыв вокруг цели — АоЕ урон и замедление. */
export function trySynergyFrostAndFlame(ctx: EngineCtx, coneEnemies: Entity[]) {
  if (coneEnemies.length === 0) return
  const kaya = ctx.entities.find((e) => e.id === 'kaya' && e.kind === 'companion' && e.alive)
  if (!kaya) return
  if (ctx.approval.kaya < APPROVAL_SYNERGY) return
  if ((kaya.cds['frostbolt'] ?? 0) > 0) return
  // Кайя видит цель (стрела должна долететь)
  const t = nearestOf(kaya, coneEnemies)
  if (!t || Math.hypot(t.pos.x - kaya.pos.x, t.pos.y - kaya.pos.y) > 300) return
  kaya.cds['frostbolt'] = 4
  kaya.castT = 0.3
  sfx('frost')
  beam(ctx, kaya.pos, t.pos, '#bfe3ea')
  ring(ctx, t.pos, '#bfe3ea', 90, 0.7)
  floater(ctx, t.pos, 'МОРОЗ И ПЛАМЯ!', '#bfe3ea', 18)
  for (const e of ctx.entities) {
    if (e.kind !== 'enemy' || !e.alive) continue
    if (Math.hypot(e.pos.x - t.pos.x, e.pos.y - t.pos.y) > 95) continue
    damage(ctx, e, d(6) + d(6) + 3, { color: '#9fd8e2' })
    e.slowT = Math.max(e.slowT, 3)
  }
}

// ---------------- Хелперы ----------------

function nearestOf(from: Entity, list: Entity[]): Entity | null {
  let best: Entity | null = null
  let bd = Infinity
  for (const e of list) {
    const dist = Math.hypot(e.pos.x - from.pos.x, e.pos.y - from.pos.y)
    if (dist < bd) {
      bd = dist
      best = e
    }
  }
  return best
}
