// ============================================================
// ЭХО РАЗЛОМА — 3D-эффекты (Phase 1)
// Пул частиц (Points), наземные кольца-телеграфы, всплывающий
// боевой текст (sprite с canvas-текстурой), кольцо цели.
// Никаких new в горячем цикле — всё через пулы.
// ============================================================

import * as THREE from 'three'
import { Entity, Floater, Particle, Telegraph, TelegraphShape } from '../types'
import { heightAt } from './heightmap'

const MAX_PARTICLES = 600
const MAX_RINGS = 28
const MAX_FLOATERS = 40
const MAX_TELEGRAPHS = 14
const MAX_ORDER_LINES = 6

const KIND_COLOR: Record<Particle['kind'], [number, number, number]> = {
  spark: [1.0, 0.72, 0.3],
  ring: [0.8, 0.75, 0.55],
  fire: [1.0, 0.5, 0.18],
  frost: [0.72, 0.9, 0.95],
  heal: [0.55, 0.9, 0.5],
  dust: [0.6, 0.55, 0.42],
  ember: [1.0, 0.42, 0.2],
  rune: [0.75, 0.55, 1.0],
  slam: [0.9, 0.35, 0.25],
  telegraph: [1.0, 0.35, 0.25],
}

/** Линия приказа на земле (Фаза 4): герой → компаньон. */
export interface OrderLine {
  ax: number
  ay: number
  bx: number
  by: number
  color: string
}

export class Fx3d {
  group = new THREE.Group()

  // Частицы
  private points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private pCount = 0

  // Кольца на земле (ring/slam/руны)
  private ringPool: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; active: boolean }> = []

  // Телеграфы АоЕ (круг/конус/коридор) — Фаза 2
  private telegraphPool: Array<{
    group: THREE.Group
    mesh: THREE.Mesh
    mat: THREE.MeshBasicMaterial
    shape: TelegraphShape
    width: number
    active: boolean
  }> = []

  // Всплывающий текст
  private floaterPool: Array<{ sprite: THREE.Sprite; tex: THREE.CanvasTexture; canvas: HTMLCanvasElement; active: boolean; life: number; maxLife: number; vy: number }> = []

  // Кольцо выбранной цели
  private targetRing: THREE.Mesh
  private targetRingMat: THREE.MeshBasicMaterial

  // Фаза 4: тактический оверлей — линии приказов + кольцо выбора компаньона
  private orderLines: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; active: boolean }> = []
  private selRing: THREE.Mesh
  private selRingMat: THREE.MeshBasicMaterial

  constructor() {
    // --- Points-пул ---
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 2.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, mat)
    this.points.frustumCulled = false
    this.group.add(this.points)

    // --- Кольца ---
    const ringGeo = new THREE.RingGeometry(0.82, 1, 40)
    for (let i = 0; i < MAX_RINGS; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(ringGeo, m)
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      this.group.add(mesh)
      this.ringPool.push({ mesh, mat: m, active: false })
    }

    // --- Кольцо цели ---
    this.targetRingMat = new THREE.MeshBasicMaterial({ color: 0x8fd08a, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 36), this.targetRingMat)
    this.targetRing.rotation.x = -Math.PI / 2
    this.targetRing.visible = false
    this.group.add(this.targetRing)

    // --- Фаза 4: линии приказов (тонкие полосы на земле) ---
    const lineGeo = new THREE.PlaneGeometry(1, 1)
    for (let i = 0; i < MAX_ORDER_LINES; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(lineGeo, m)
      mesh.rotation.x = -Math.PI / 2
      mesh.renderOrder = 5
      mesh.visible = false
      this.group.add(mesh)
      this.orderLines.push({ mesh, mat: m, active: false })
    }
    // Кольцо выбранного компаньона
    this.selRingMat = new THREE.MeshBasicMaterial({ color: 0xf5c96b, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 36), this.selRingMat)
    this.selRing.rotation.x = -Math.PI / 2
    this.selRing.renderOrder = 7
    this.selRing.visible = false
    this.group.add(this.selRing)

    // --- Телеграфы АоЕ ---
    for (let i = 0; i < MAX_TELEGRAPHS; i++) {
      const group = new THREE.Group()
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.renderOrder = 6
      group.add(mesh)
      group.visible = false
      this.group.add(group)
      this.telegraphPool.push({ group, mesh, mat, shape: 'circle', width: -1, active: false })
    }
  }

  /** Синхронизация пула частиц со снимком движка. */
  syncParticles(ps: Particle[]) {
    const n = Math.min(ps.length, MAX_PARTICLES)
    this.pCount = n
    for (let i = 0; i < n; i++) {
      const p = ps[i]
      const h = heightAt(p.x, p.y)
      this.positions[i * 3] = p.x
      this.positions[i * 3 + 1] = h + 1.6 + p.life * 6
      this.positions[i * 3 + 2] = p.y
      const c = KIND_COLOR[p.kind] ?? [1, 1, 1]
      const fade = Math.max(0.2, p.life / p.maxLife)
      this.colors[i * 3] = c[0] * fade
      this.colors[i * 3 + 1] = c[1] * fade
      this.colors[i * 3 + 2] = c[2] * fade
    }
    const geo = this.points.geometry
    geo.setDrawRange(0, n)
    ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(geo.attributes.color as THREE.BufferAttribute).needsUpdate = true
  }

  /** Наземные кольца: kind ring/slam/rune расширяются от точки. */
  private syncRings(ps: Particle[]) {
    let ri = 0
    for (const p of ps) {
      if (p.kind !== 'ring' && p.kind !== 'slam' && p.kind !== 'rune') continue
      if (ri >= MAX_RINGS) break
      const slot = this.ringPool[ri++]
      slot.active = true
      slot.mesh.visible = true
      const t = 1 - p.life / p.maxLife
      const radius = p.size * (0.4 + t * 1.4)
      slot.mesh.position.set(p.x, heightAt(p.x, p.y) + 0.35, p.y)
      slot.mesh.scale.setScalar(radius)
      const c = KIND_COLOR[p.kind]
      slot.mat.color.setRGB(c[0], c[1], c[2])
      slot.mat.opacity = 0.65 * (1 - t)
    }
    for (let i = ri; i < MAX_RINGS; i++) {
      const slot = this.ringPool[i]
      if (!slot.active) break
      slot.active = false
      slot.mesh.visible = false
      slot.mat.opacity = 0
    }
  }

  /** Телеграфы АоЕ: круг/конус/коридор, пульсируют до срабатывания. */
  private syncTelegraphs(ts: Telegraph[], time: number) {
    let ti = 0
    for (const t of ts) {
      if (ti >= MAX_TELEGRAPHS) break
      const slot = this.telegraphPool[ti++]
      slot.active = true
      slot.group.visible = true
      const h = heightAt(t.x, t.y)
      slot.group.position.set(t.x, h + 0.5, t.y)
      slot.mat.color.set(t.color)
      const progress = 1 - t.life / t.maxLife
      const pulse = 0.5 + 0.5 * Math.sin(time * 13)
      slot.mat.opacity = (0.2 + 0.2 * pulse) * Math.min(1, 0.4 + progress * 1.4)
      if (slot.shape !== t.shape) {
        slot.mesh.geometry.dispose()
        slot.mesh.geometry =
          t.shape === 'circle'
            ? new THREE.CircleGeometry(1, 40)
            : t.shape === 'cone'
              ? new THREE.CircleGeometry(1, 26, -1, 2)
              : new THREE.PlaneGeometry(1, 1)
        slot.shape = t.shape
        slot.width = -1
      }
      if (t.shape === 'circle') {
        // Круг слегка сжимается к моменту удара — классический телеграф
        const r = t.radius * (1.06 - progress * 0.06)
        slot.mesh.scale.setScalar(r)
        slot.mesh.position.x = 0
        slot.group.rotation.y = 0
      } else if (t.shape === 'cone') {
        // Полуугол у каждого телеграфа свой — пересобираем геометрию при смене
        const w = Math.round(t.width * 100) / 100
        if (slot.width !== w) {
          slot.mesh.geometry.dispose()
          slot.mesh.geometry = new THREE.CircleGeometry(1, 26, -t.width, t.width * 2)
          slot.width = w
        }
        slot.mesh.scale.setScalar(t.radius)
        slot.mesh.position.x = 0
        slot.group.rotation.y = -t.facing
      } else {
        // Коридор: плоскость 1×1, растянута по длине, вынесена вперёд по +X
        slot.mesh.scale.set(t.radius, t.width * 2, 1)
        slot.mesh.position.x = t.radius / 2
        slot.group.rotation.y = -t.facing
      }
    }
    for (let i = ti; i < MAX_TELEGRAPHS; i++) {
      const slot = this.telegraphPool[i]
      if (!slot.active) break
      slot.active = false
      slot.group.visible = false
      slot.mat.opacity = 0
      slot.mesh.position.x = 0
    }
  }

  /** Всплывающий боевой текст. */
  private syncFloaters(fs: Floater[]) {
    for (let i = 0; i < MAX_FLOATERS; i++) {
      const slot = this.floaterPool[i]
      if (slot) slot.active = false
    }
    const n = Math.min(fs.length, MAX_FLOATERS)
    for (let i = 0; i < n; i++) {
      const f = fs[i]
      let slot = this.floaterPool[i]
      if (!slot) {
        const canvas = document.createElement('canvas')
        canvas.width = 192
        canvas.height = 64
        const tex = new THREE.CanvasTexture(canvas)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
        sprite.renderOrder = 20
        this.group.add(sprite)
        slot = { sprite, tex, canvas, active: false, life: 0, maxLife: 1, vy: 0 }
        this.floaterPool[i] = slot
      }
      // Перерисовать текст, если он новый
      const key = `${f.text}|${f.color}|${Math.round(f.size)}`
      if (slot.sprite.userData.key !== key || !slot.active || slot.life > f.life) {
        slot.sprite.userData.key = key
        drawFloaterText(slot.canvas, f.text, f.color)
        slot.tex.needsUpdate = true
      }
      slot.active = true
      slot.life = f.life
      slot.maxLife = f.maxLife
      slot.vy = f.vy
      const h = heightAt(f.x, f.y)
      const rise = (f.maxLife - f.life) * f.vy
      slot.sprite.position.set(f.x, h + 14 + rise, f.y)
      const s = f.size / 22
      slot.sprite.scale.set(24 * s, 8 * s, 1)
      ;(slot.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, f.life / (f.maxLife * 0.5))
    }
  }

  /** Кольцо под выбранной целью. */
  updateTarget(target: Entity | null, time: number) {
    if (!target || !target.alive) {
      this.targetRing.visible = false
      return
    }
    this.targetRing.visible = true
    const r = (target.radius + 7) * (1 + Math.sin(time * 5) * 0.05)
    this.targetRing.scale.setScalar(r)
    this.targetRing.position.set(target.pos.x, heightAt(target.pos.x, target.pos.y) + 0.4, target.pos.y)
    this.targetRingMat.opacity = 0.55 + Math.sin(time * 5) * 0.2
  }

  /** Фаза 4: тактический оверлей. lines=null — всё скрыть (вышли из паузы). */
  updateTactical(lines: OrderLine[] | null, sel: Entity | null, time: number) {
    const n = lines ? Math.min(lines.length, MAX_ORDER_LINES) : 0
    for (let i = 0; i < n; i++) {
      const slot = this.orderLines[i]
      slot.active = true
      slot.mesh.visible = true
      const l = lines![i]
      const dx = l.bx - l.ax
      const dy = l.by - l.ay
      const len = Math.hypot(dx, dy)
      if (len < 2) {
        slot.mesh.visible = false
        continue
      }
      const mx = (l.ax + l.bx) / 2
      const my = (l.ay + l.by) / 2
      slot.mesh.position.set(mx, heightAt(mx, my) + 0.45, my)
      slot.mesh.scale.set(len, 2.2, 1)
      slot.mesh.rotation.z = 0
      slot.mesh.rotation.y = -Math.atan2(dy, dx)
      slot.mat.color.set(l.color)
      slot.mat.opacity = 0.55 + 0.2 * Math.sin(time * 6)
    }
    for (let i = n; i < MAX_ORDER_LINES; i++) {
      const slot = this.orderLines[i]
      if (!slot.active) break
      slot.active = false
      slot.mesh.visible = false
      slot.mat.opacity = 0
    }
    if (sel && sel.alive) {
      this.selRing.visible = true
      const r = (sel.radius + 10) * (1 + Math.sin(time * 4) * 0.07)
      this.selRing.scale.setScalar(r)
      this.selRing.position.set(sel.pos.x, heightAt(sel.pos.x, sel.pos.y) + 0.5, sel.pos.y)
      this.selRingMat.opacity = 0.65 + Math.sin(time * 4) * 0.2
    } else {
      this.selRing.visible = false
    }
  }

  /** Кадровая синхронизация (вызывается из Renderer3d). */
  update(ps: Particle[], fs: Floater[], ts: Telegraph[], target: Entity | null, time: number) {
    this.syncParticles(ps)
    this.syncRings(ps)
    this.syncTelegraphs(ts, time)
    this.syncFloaters(fs)
    this.updateTarget(target, time)
  }

  dispose() {
    this.points.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
    for (const s of this.floaterPool) {
      s.tex.dispose()
      ;(s.sprite.material as THREE.Material).dispose()
    }
    for (const t of this.telegraphPool) t.mesh.geometry.dispose()
    this.targetRing.geometry.dispose()
    this.targetRingMat.dispose()
    for (const l of this.orderLines) l.mat.dispose()
    this.selRing.geometry.dispose()
    this.selRingMat.dispose()
  }
}

function drawFloaterText(canvas: HTMLCanvasElement, text: string, color: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = 'bold 44px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = 'rgba(10,8,5,0.9)'
  ctx.lineWidth = 7
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
  ctx.fillStyle = color
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
}
