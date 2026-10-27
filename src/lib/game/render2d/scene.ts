// ============================================================
// ЭХО РАЗЛОМА — сборка кадра (Phase 0.8)
// drawScene: композиция кадра 2D-рендера (террейн, пропсы,
// травы-интерактивы, телеграф слэма босса, сущности, частицы,
// текст, виньетка, красная пелена смерти). Движок только
// передаёт снимок состояния (SceneView).
// ============================================================

import { INTERACTABLES, VELD_CLUES } from '../data/world'
import { Entity, Floater, Particle, PropDef, Telegraph, Vec } from '../types'
import { rndRange } from '../core/util'
import { IRenderer } from './types'
import { daylightOf } from '../data/tables'

export interface SceneView {
  ctx: CanvasRenderingContext2D
  renderer: IRenderer
  w: number
  h: number
  dpr: number
  camera: Vec
  shake: number
  time: number
  baked: HTMLCanvasElement
  props: PropDef[]
  removedProps: Set<string>
  entities: Entity[]
  targetEid: number | null
  particles: Particle[]
  floaters: Floater[]
  telegraphs: Telegraph[]
  playerAlive: boolean
  // Фаза 3: атмосфера
  zone: 'valley' | 'veld' | 'granite' | 'frost' | 'mara'
  dayT: number
  // Фаза 4: тактическая пауза — линии приказов + кольцо выбора
  tactical?: boolean
  selEid?: number | null
  // Фаза 5: Тишь 0..100 — выцветание мира
  silence?: number
}

export function drawScene(v: SceneView) {
  const ctx = v.ctx
  const w = v.w
  const h = v.h
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  ctx.fillStyle = '#1a2014'
  ctx.fillRect(0, 0, w, h)
  const shakeX = v.shake > 0 ? rndRange(-v.shake, v.shake) : 0
  const shakeY = v.shake > 0 ? rndRange(-v.shake, v.shake) : 0
  ctx.save()
  ctx.translate(Math.round(w / 2 - v.camera.x + shakeX), Math.round(h / 2 - v.camera.y + shakeY))
  ctx.drawImage(v.baked, 0, 0)
  for (const p of v.props) {
    if (p.id && v.removedProps.has(p.id)) continue
    v.renderer.drawProp(ctx, p, v.time)
  }
  // травы-интерактивы (визуал)
  for (const it of INTERACTABLES) {
    if (it.kind !== 'herb' || v.removedProps.has(it.id)) continue
    const pulse = 0.5 + 0.5 * Math.sin(v.time * 2.5 + it.pos.x)
    ctx.fillStyle = `rgba(200,230,190,${0.35 + pulse * 0.3})`
    ctx.beginPath()
    ctx.arc(it.pos.x, it.pos.y - 8, 5 + pulse * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#9fb8a4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(it.pos.x, it.pos.y)
    ctx.lineTo(it.pos.x, it.pos.y - 10)
    ctx.moveTo(it.pos.x, it.pos.y - 5)
    ctx.lineTo(it.pos.x - 5, it.pos.y - 11)
    ctx.moveTo(it.pos.x, it.pos.y - 5)
    ctx.lineTo(it.pos.x + 5, it.pos.y - 11)
    ctx.stroke()
  }
  // следы следопытства (Фаза 3): пепельная метка
  for (const c of VELD_CLUES) {
    if (v.removedProps.has(c.id)) continue
    const pulse = 0.5 + 0.5 * Math.sin(v.time * 2 + c.pos.x)
    ctx.fillStyle = `rgba(224,112,58,${0.3 + pulse * 0.3})`
    ctx.beginPath()
    ctx.arc(c.pos.x, c.pos.y - 6, 5 + pulse * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e0703a'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(c.pos.x, c.pos.y, 9 + pulse * 2, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Телеграфы АоЕ (Фаза 2): круг/конус/коридор с пульсацией
  for (const t of v.telegraphs) {
    const a = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(v.time * 13))
    ctx.fillStyle = t.color
    ctx.globalAlpha = a
    if (t.shape === 'circle') {
      const r = t.radius * (1.06 - (1 - t.life / t.maxLife) * 0.06)
      ctx.beginPath()
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = Math.min(1, a + 0.25)
      ctx.strokeStyle = t.color
      ctx.lineWidth = 3
      ctx.stroke()
    } else if (t.shape === 'cone') {
      ctx.beginPath()
      ctx.moveTo(t.x, t.y)
      ctx.arc(t.x, t.y, t.radius, t.facing - t.width, t.facing + t.width)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(t.facing)
      ctx.fillRect(0, -t.width, t.radius, t.width * 2)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  const sorted = [...v.entities].sort((a, b) => a.pos.y - b.pos.y)
  // Фаза 4: линии приказов — под сущностями
  if (v.tactical) {
    const player = v.entities.find((e) => e.kind === 'player')
    if (player) {
      ctx.setLineDash([7, 6])
      ctx.lineWidth = 1.8
      ctx.globalAlpha = 0.75
      for (const e of v.entities) {
        if (e.kind !== 'companion' || !e.alive) continue
        ctx.strokeStyle = e.color
        ctx.beginPath()
        ctx.moveTo(player.pos.x, player.pos.y)
        ctx.lineTo(e.pos.x, e.pos.y)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
  }
  for (const e of sorted) {
    v.renderer.drawEntity(ctx, e, v.time, v.targetEid === e.eid)
  }
  // Фаза 4: кольцо выбора компаньона — над сущностями
  if (v.tactical && v.selEid) {
    const sel = v.entities.find((e) => e.eid === v.selEid && e.alive)
    if (sel) {
      const pulse = 1 + Math.sin(v.time * 4) * 0.07
      ctx.strokeStyle = '#f5c96b'
      ctx.lineWidth = 2.4
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(sel.pos.x, sel.pos.y, (sel.radius + 9) * pulse, (sel.radius + 9) * 0.55 * pulse, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  v.renderer.drawParticles(ctx, v.particles)
  v.renderer.drawFloaters(ctx, v.floaters)
  ctx.restore()
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(10,8,5,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)
  // Атмосфера (Фаза 3): ночь и мрак Вельда
  const dl = daylightOf(v.dayT)
  const night = (1 - dl) * 0.5
  if (night > 0.01) {
    ctx.fillStyle = `rgba(8,10,14,${night})`
    ctx.fillRect(0, 0, w, h)
  }
  if (v.zone === 'veld') {
    ctx.fillStyle = 'rgba(58,68,44,0.16)'
    ctx.fillRect(0, 0, w, h)
  }
  // Фаза 6: пепельная пыл в Граните
  if (v.zone === 'granite') {
    ctx.fillStyle = 'rgba(78,68,52,0.14)'
    ctx.fillRect(0, 0, w, h)
  }
  // Фаза 6.2: белёсая метель Стылого Пределья
  if (v.zone === 'frost') {
    ctx.fillStyle = 'rgba(206,216,214,0.13)'
    ctx.fillRect(0, 0, w, h)
    // снежные хлопья на экране
    const t = v.time
    ctx.fillStyle = 'rgba(240,246,244,0.5)'
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 137.5 + t * (26 + (i % 5) * 9)) % (w + 40)) - 20
      const sy = ((i * 91.7 + t * (44 + (i % 7) * 11)) % (h + 40)) - 20
      ctx.beginPath()
      ctx.arc(sx, sy, 1.2 + (i % 3) * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Фаза 5: Тишь — выцветание мира (composite 'saturation' + гаснущий серый)
  const s = Math.min(1, (v.silence ?? 0) / 100)
  if (s > 0.02) {
    ctx.globalCompositeOperation = 'saturation'
    ctx.fillStyle = `rgba(128,128,128,${(s * 0.75).toFixed(3)})`
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = `rgba(10,10,10,${(s * 0.18).toFixed(3)})`
    ctx.fillRect(0, 0, w, h)
  }
  if (!v.playerAlive) {
    ctx.fillStyle = 'rgba(60,10,10,0.5)'
    ctx.fillRect(0, 0, w, h)
  }
}
