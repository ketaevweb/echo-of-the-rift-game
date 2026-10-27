// ============================================================
// ЭХО РАЗЛОМА — 3D-рендерер (Phase 1)
// Renderer3d: WebGL-сцена (террейн/пропсы/аватары/FX), камера
// третьего лица с орбитой (ПКМ-драг + колесо), луч в землю для
// клик-движения, проекционный пикинг сущностей, тряска камеры.
// Реализует мост View3dBridge для движка (см. core/ctx).
// ============================================================

import * as THREE from 'three'
import { Entity, Vec } from '../types'
import { WORLD, zoneOf } from '../data/world'
import { heightAt } from './heightmap'
import { Terrain, buildSky } from './Terrain'
import { Props3d } from './Props'
import { AvatarFactory } from './Avatars'
import { Fx3d, OrderLine } from './Fx'
import { daylightOf } from '../data/tables'
import type { ZoneId } from '../core/ctx'

// Цвета колец рунных камней (Фаза 6.2): заяц — бледный мох, волк — янтарь, луна — серебро
const RUNE_COLORS = [0x9fb8a4, 0xd9a441, 0xd8dde2]

// ---------------- Снимок состояния движка ----------------

export interface SceneView3d {
  time: number
  shake: number
  player: Entity
  playerAlive: boolean
  entities: Entity[]
  particles: import('../types').Particle[]
  floaters: import('../types').Floater[]
  telegraphs: import('../types').Telegraph[]
  targetEid: number | null
  removedProps: Set<string>
  zone: ZoneId
  dayT: number
  /** Фаза 4: тактическая пауза — отъём камеры + линии приказов. */
  tactical: boolean
  selEid: number | null
  /** Фаза 5: диалог активен + eid сущности-спикера (кинокамера; null — наезд на героя). */
  dialogue: boolean
  dialogueFocus: number | null
  /** Фаза 5: Тишь 0..100 — выцветание мира. */
  silence: number
  /** Фаза 6.2: символы рунных камней пещеры. */
  runes: { rs1: number; rs2: number; rs3: number }
}

export interface EntityPick {
  eid: number
  kind: Entity['kind']
  alive: boolean
  enemyType?: Entity['enemyType']
  npcDialogue?: string
}

// ---------------- Renderer3d ----------------

export class Renderer3d {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private amb: THREE.AmbientLight
  private sky: THREE.Mesh
  private skyMat: THREE.ShaderMaterial
  private terrain: Terrain
  private props: Props3d
  private entityGroup = new THREE.Group()
  private avatars: AvatarFactory
  private fx: Fx3d
  private camInitialized = false

  // Атмосфера (Фаза 3): текущие значения лерпятся к целям зоны/времени суток
  private daylight = 1
  private fog = new THREE.FogExp2(0xb4bc9e, 0.00092)
  private sunDay = new THREE.Color(0xffe0b0)
  private sunDusk = new THREE.Color(0xff9a50)
  /** Фаза 5: текущая Тишь 0..1 (лерпится к цели — мир выцветает плавно). */
  private silenceAmt = 0
  /** Фаза 6.2: снегопад Пределья (Points-облако над камерой). */
  private snow: THREE.Points
  private snowMat: THREE.PointsMaterial

  // Орбита камеры (Фаза 4): user-значения правит ввод, pitch/dist —
  // анимируемые текущие (лерп к целям, тактика отъезжает в изометрию)
  private yaw = 0
  private userPitch = 0.62
  private userDist = 120
  private pitch = 0.62
  private dist = 120
  private tactical = false
  private camTarget = new THREE.Vector3()
  private dragging = false
  private lastX = 0
  private lastY = 0

  // Лучи/векторы (переиспользуемые, без аллокаций в кадре)
  private raycaster = new THREE.Raycaster()
  private ndc = new THREE.Vector2()
  private tmpV = new THREE.Vector3()

  private canvas: HTMLCanvasElement
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.88

    this.camera = new THREE.PerspectiveCamera(55, 1, 1, 9000)

    // Туман и фон — тёплые, без синевы; лерпятся по зоне/суткам (Фаза 3)
    this.scene.fog = this.fog

    // Свет
    this.hemi = new THREE.HemisphereLight(0xd8dcc4, 0x55613f, 0.72)
    this.scene.add(this.hemi)
    this.amb = new THREE.AmbientLight(0xffffff, 0.22)
    this.scene.add(this.amb)
    this.sun = new THREE.DirectionalLight(0xffe0b0, 1.55)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    const sc = this.sun.shadow.camera
    sc.near = 10
    sc.far = 700
    sc.left = -220
    sc.right = 220
    sc.top = 220
    sc.bottom = -220
    this.sun.shadow.bias = -0.0006
    this.scene.add(this.sun, this.sun.target)

    // Мир
    this.sky = buildSky()
    this.skyMat = this.sky.material as THREE.ShaderMaterial
    this.scene.add(this.sky)
    this.terrain = new Terrain()
    this.scene.add(this.terrain.group)
    this.props = new Props3d()
    this.scene.add(this.props.group)
    this.scene.add(this.entityGroup)
    this.avatars = new AvatarFactory(this.entityGroup)
    this.fx = new Fx3d()
    this.scene.add(this.fx.group)

    // Фаза 6.2: снегопад — статичное облако точек, заворачивается по высоте
    const snowGeo = new THREE.BufferGeometry()
    const N = 850
    const arr = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 800
      arr[i * 3 + 1] = Math.random() * 90
      arr[i * 3 + 2] = (Math.random() - 0.5) * 800
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    this.snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.snow = new THREE.Points(snowGeo, this.snowMat)
    this.snow.visible = false
    this.snow.frustumCulled = false
    this.scene.add(this.snow)

    this.bindOrbit()
    this.resize()
  }

  // ---------------- Орбита камеры ----------------

  /** Азимут орбиты (рад) — движок использует для WASD относительно камеры. */
  getCameraYaw(): number {
    return this.yaw
  }

  /** Фаза 4: тактическая камера — изометрический отъём (DAO-вайб).
   *  yaw остаётся свободным (вращать можно и в паузе). */
  setTactical(on: boolean) {
    this.tactical = on
  }

  private bindOrbit() {
    const c = this.canvas
    c.addEventListener('pointerdown', this.onOrbitDown)
    window.addEventListener('pointermove', this.onOrbitMove)
    window.addEventListener('pointerup', this.onOrbitUp)
    c.addEventListener('wheel', this.onWheel, { passive: false })
    c.addEventListener('contextmenu', this.onCtxMenu)
  }

  private onCtxMenu = (e: Event) => e.preventDefault()

  private onOrbitDown = (e: PointerEvent) => {
    if (e.button === 2 || e.button === 1) {
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
    }
  }

  private onOrbitMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.yaw -= dx * 0.0052
    this.userPitch = Math.max(0.16, Math.min(1.25, this.userPitch + dy * 0.004))
  }

  private onOrbitUp = () => {
    this.dragging = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.userDist = Math.max(40, Math.min(260, this.userDist + e.deltaY * 0.09))
  }

  private updateCamera(view: SceneView3d) {
    const p = view.player.pos
    const px = Math.max(40, Math.min(WORLD.w - 40, p.x))
    const pz = Math.max(40, Math.min(WORLD.h - 40, p.y))
    // Первый кадр — мгновенно ставим камеру к герою, без перелёта через полкарты
    if (!this.camInitialized) {
      this.camInitialized = true
      this.camTarget.set(px, 0, pz)
    }

    // Фаза 5: цели кадра — по умолчанию обычная орбита, в тактике изометрия,
    // в диалоге — кинокадр (наезд + over-the-shoulder от спикера)
    let goalYaw: number | null = null
    let goalPitch = this.tactical ? Math.max(this.userPitch, 1.08) : this.userPitch
    let goalDist = this.tactical ? Math.max(this.userDist, 235) : this.userDist
    let tx = px
    let tz = pz
    if (view.dialogue) {
      const f = view.dialogueFocus != null ? view.entities.find((x) => x.eid === view.dialogueFocus) : null
      if (f) {
        // Кинокадр: цель между героем и спикером (к спикеру), камера сбоку-сзади
        // от героя — спикер крупно в кадре, герой на переднем плане (rack focus)
        const dxf = p.x - f.pos.x
        const dzf = p.y - f.pos.y
        const dTotal = Math.max(30, Math.hypot(dxf, dzf))
        goalYaw = Math.atan2(dzf, dxf) + 0.55
        goalDist = Math.min(78, dTotal * 0.55 + 34)
        goalPitch = 0.3
        tx = Math.max(40, Math.min(WORLD.w - 40, f.pos.x + dxf * 0.62))
        tz = Math.max(40, Math.min(WORLD.h - 40, f.pos.y + dzf * 0.62))
      } else {
        // Интерактив без сущности (алтарь/барьер/доска): интимный наезд на героя
        goalDist = Math.min(goalDist, 58)
        goalPitch = Math.min(goalPitch, 0.38)
      }
    }

    // Плавное слежение за целью кадра
    const lerp = 1 - Math.pow(0.00002, 1 / 60)
    this.camTarget.x += (tx - this.camTarget.x) * lerp
    this.camTarget.z += (tz - this.camTarget.z) * lerp
    // yaw в диалоге — по кратчайшей дуге (камера обходит к нужному боку)
    if (goalYaw !== null) {
      const dy = ((goalYaw - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      this.yaw += dy * 0.06
    }
    // Фаза 4: анимация наклона/дистанции к тактической изометрии или к пользовательской орбите
    const k = 0.08
    this.pitch += (goalPitch - this.pitch) * k
    this.dist += (goalDist - this.dist) * k
    const groundH = heightAt(this.camTarget.x, this.camTarget.z)
    const focusY = groundH + 6

    const cp = Math.cos(this.pitch)
    const cx = this.camTarget.x + Math.sin(this.yaw) * this.dist * cp
    const cz = this.camTarget.z + Math.cos(this.yaw) * this.dist * cp
    const cy = focusY + Math.sin(this.pitch) * this.dist

    // Камера не проваливается под рельеф
    const camGround = heightAt(cx, cz)
    const camY = Math.max(cy, camGround + 4)

    // Тряска (удары/слэм босса)
    let sx = 0
    let sy = 0
    if (view.shake > 0) {
      sx = (Math.random() - 0.5) * view.shake * 0.5
      sy = (Math.random() - 0.5) * view.shake * 0.5
    }

    this.camera.position.set(cx + sx, camY + sy, cz)
    this.camera.lookAt(this.camTarget.x, focusY + sy * 0.4, this.camTarget.z)

    // Небо следует за камерой (мир стал больше — сфера должна везде накрывать)
    this.sky.position.copy(this.camera.position)

    // Солнце следует за героем (покрытие теней); высота зависит от суток (Фаза 3)
    const sunY = groundH + 40 + this.daylight * 160
    this.sun.position.set(this.camTarget.x + 120, sunY, this.camTarget.z + 70)
    this.sun.target.position.set(this.camTarget.x, groundH, this.camTarget.z)
    this.sun.target.updateMatrixWorld()
  }

  // ---------------- Атмосфера: зона + сутки (Фаза 3) ----------------

  private tmpColor = new THREE.Color()
  private tmpColor2 = new THREE.Color()
  private sunMara = new THREE.Color(0.85, 0.35, 0.28)

  /** Лерпит туман/небо/свет к целям зоны и времени суток; Тишь выцветает картинку. */
  private updateAtmosphere(zone: ZoneId, dayT: number, silenceGoal: number) {
    this.daylight = daylightOf(dayT)
    const veld = zone === 'veld'
    const granite = zone === 'granite'
    const frost = zone === 'frost'
    const mara = zone === 'mara'
    const dl = this.daylight
    const k = 0.045 // плавность перехода (в т.ч. через затемнение портала)
    this.silenceAmt += (Math.max(0, Math.min(1, silenceGoal / 100)) - this.silenceAmt) * k

    // Туман
    if (mara) {
      // Мара: багровая мор-дымка, гуще к ночи (DAO-вайб: мор-погода)
      this.tmpColor.setRGB(0.20 + dl * 0.30, 0.08 + dl * 0.10, 0.07 + dl * 0.08)
      this.fog.density += (0.0026 - dl * 0.0008 - this.fog.density) * k
    } else if (frost) {
      // Пределье: белёсая метель — светло-серый туман, гуще к ночи
      this.tmpColor.setRGB(0.42 + dl * 0.38, 0.47 + dl * 0.36, 0.46 + dl * 0.34)
      this.fog.density += (0.0026 - dl * 0.0009 - this.fog.density) * k
    } else if (granite) {
      // Гранит: пепельно-пылевой туман, тёплый серый
      this.tmpColor.setRGB(0.24 + dl * 0.42, 0.21 + dl * 0.36, 0.17 + dl * 0.28)
      this.fog.density += (0.0019 - dl * 0.0007 - this.fog.density) * k
    } else if (veld) {
      this.tmpColor.setRGB(0.16 + dl * 0.32, 0.19 + dl * 0.33, 0.12 + dl * 0.28) // ночь → день
      this.fog.density += (0.0023 - dl * 0.0008 - this.fog.density) * k
    } else {
      this.tmpColor.setRGB(0.07 + dl * 0.65, 0.09 + dl * 0.66, 0.09 + dl * 0.52)
      this.fog.density += (0.00165 - dl * 0.00073 - this.fog.density) * k
    }
    this.fog.color.lerp(this.tmpColor, k)

    // Небо
    const top = this.skyMat.uniforms.top.value as THREE.Color
    const hor = this.skyMat.uniforms.horizon.value as THREE.Color
    if (mara) {
      // Небо Мары: кроваво-багровый купол, гнилой горизонт
      this.tmpColor.setRGB(0.18 + dl * 0.30, 0.07 + dl * 0.09, 0.06 + dl * 0.07)
      this.tmpColor2.setRGB(0.34 + dl * 0.40, 0.12 + dl * 0.14, 0.10 + dl * 0.10)
    } else if (frost) {
      // Небо Пределья: серо-белый купол, бледный горизонт (без синевы)
      this.tmpColor.setRGB(0.44 + dl * 0.34, 0.48 + dl * 0.33, 0.47 + dl * 0.31)
      this.tmpColor2.setRGB(0.58 + dl * 0.36, 0.61 + dl * 0.33, 0.58 + dl * 0.30)
    } else if (granite) {
      // Пепельное небо Готики: серо-теплый купол, пыльный горизонт
      this.tmpColor.setRGB(0.20 + dl * 0.30, 0.18 + dl * 0.27, 0.16 + dl * 0.21)
      this.tmpColor2.setRGB(0.34 + dl * 0.44, 0.29 + dl * 0.38, 0.22 + dl * 0.28)
    } else if (veld) {
      this.tmpColor.setRGB(0.10 + dl * 0.24, 0.12 + dl * 0.25, 0.10 + dl * 0.19)
      this.tmpColor2.setRGB(0.14 + dl * 0.46, 0.16 + dl * 0.44, 0.12 + dl * 0.38)
    } else {
      this.tmpColor.setRGB(0.10 + dl * 0.32, 0.12 + dl * 0.38, 0.13 + dl * 0.43)
      this.tmpColor2.setRGB(0.12 + dl * 0.70, 0.12 + dl * 0.68, 0.10 + dl * 0.60)
    }
    top.lerp(this.tmpColor, k)
    hor.lerp(this.tmpColor2, k)

    // Свет
    const zoneDim = frost ? 0.94 : granite ? 0.82 : veld ? 0.78 : mara ? 0.72 : 1
    this.sun.intensity += ((0.04 + dl * 1.55 * zoneDim) - this.sun.intensity) * k
    // цвет солнца: на низком солнце — тёплый закатный
    const dusk = Math.max(0, 1 - Math.abs(Math.sin((dayT - 0.25) * Math.PI * 2)) * 2.6)
    this.tmpColor.copy(this.sunDay).lerp(this.sunDusk, dusk * 0.8)
    // В Маре солнце — багровый диск сквозь скверну
    if (mara) this.tmpColor.lerp(this.sunMara, 0.55)
    this.sun.color.lerp(this.tmpColor, k)
    this.hemi.intensity += ((0.16 + dl * 0.58) - this.hemi.intensity) * k
    if (mara) {
      this.hemi.color.lerp(this.tmpColor.setRGB(0.34 + dl * 0.30, 0.14 + dl * 0.12, 0.12 + dl * 0.10), k)
    } else if (frost) {
      this.hemi.color.lerp(this.tmpColor.setRGB(0.62 + dl * 0.32, 0.66 + dl * 0.30, 0.64 + dl * 0.28), k)
    } else {
      this.hemi.color.lerp(this.tmpColor.setRGB(0.28 + dl * 0.57, 0.32 + dl * 0.54, 0.30 + dl * 0.47), k)
    }
    this.amb.intensity += ((0.07 + dl * 0.16) - this.amb.intensity) * k

    // Фаза 5: Тишь — выцветание (desaturation) и гаснущий свет
    if (this.silenceAmt > 0.005) {
      const ds = this.silenceAmt * 0.62
      this.desat(this.fog.color, ds)
      this.desat(top, ds)
      this.desat(hor, ds)
      this.desat(this.sun.color, ds)
      this.desat(this.hemi.color, ds)
      const dim = 1 - this.silenceAmt * 0.24
      this.sun.intensity *= dim
      this.hemi.intensity *= dim
      this.amb.intensity *= dim
    }
  }

  /** Тишина съедает насыщенность цвета (выцветание LUT). */
  private desat(c: THREE.Color, amt: number) {
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    c.setHSL(hsl.h, hsl.s * (1 - amt), hsl.l)
  }

  // ---------------- Пикинг и луч в землю ----------------

  private setPointer(sx: number, sy: number) {
    const rect = this.canvas.getBoundingClientRect()
    this.ndc.x = ((sx - rect.left) / rect.width) * 2 - 1
    this.ndc.y = -((sy - rect.top) / rect.height) * 2 + 1
  }

  /** Точка мира (x, y) под курсором — для приказов движения. */
  screenToGround(sx: number, sy: number): Vec | null {
    this.setPointer(sx, sy)
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const origin = this.raycaster.ray.origin
    const dir = this.raycaster.ray.direction
    // Маршевый пересчёт с рельефом: шагаем по лучу, ищем пересечение heightAt
    let t = 10
    for (let i = 0; i < 220; i++) {
      const step = Math.max(1.5, t * 0.03)
      t += step
      const x = origin.x + dir.x * t
      const z = origin.z + dir.z * t
      const y = origin.y + dir.y * t
      if (x < -200 || x > WORLD.w + 200 || z < -200 || z > WORLD.h + 200) return null
      if (y - heightAt(x, z) <= 0) {
        // Бинарное уточнение
        let lo = t - step
        let hi = t
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2
          const mx = origin.x + dir.x * mid
          const mz = origin.z + dir.z * mid
          const my = origin.y + dir.y * mid
          if (my - heightAt(mx, mz) <= 0) hi = mid
          else lo = mid
        }
        const fx = origin.x + dir.x * hi
        const fz = origin.z + dir.z * hi
        return { x: Math.max(30, Math.min(WORLD.w - 30, fx)), y: Math.max(30, Math.min(WORLD.h - 30, fz)) }
      }
      if (t > 2600) return null
    }
    return null
  }

  /** Ближайшая сущность к курсору в экранных пикселях (отрезок ноги→голова). */
  pickAtScreen(sx: number, sy: number, padPx: number): EntityPick | null {
    this.setPointer(sx, sy)
    const rect = this.canvas.getBoundingClientRect()
    let best: EntityPick | null = null
    let bestD = padPx
    for (const e of this.avatarsSyncedEntities) {
      if (!e.alive && e.kind !== 'npc') continue
      const h = heightAt(e.pos.x, e.pos.y)
      const headH = e.boss && e.enemyType !== 'dragon' ? 58 : e.enemyType === 'dragon' ? 76 : e.enemyType === 'wolf' || e.enemyType === 'alpha' ? 18 : e.enemyType === 'horror' ? 26 : e.enemyType === 'ash_mother' ? 82 : e.enemyType === 'ash_shade' ? 24 : e.enemyType === 'bogling' ? 12 : e.enemyType === 'scorpion' ? 15 : e.enemyType === 'pit_master' ? 46 : e.enemyType === 'frost_troll' ? 42 : 28
      // Экранные координаты ног и головы
      this.tmpV.set(e.pos.x, h + 1, e.pos.y)
      this.tmpV.project(this.camera)
      if (this.tmpV.z > 1) continue
      const x0 = ((this.tmpV.x + 1) / 2) * rect.width + rect.left
      const y0 = ((-this.tmpV.y + 1) / 2) * rect.height + rect.top
      this.tmpV.set(e.pos.x, h + headH, e.pos.y)
      this.tmpV.project(this.camera)
      const x1 = ((this.tmpV.x + 1) / 2) * rect.width + rect.left
      const y1 = ((-this.tmpV.y + 1) / 2) * rect.height + rect.top
      // Расстояние от клика до вертикального отрезка силуэта
      const dx = x1 - x0
      const dy = y1 - y0
      const l2 = dx * dx + dy * dy
      let t = l2 > 0 ? ((sx - x0) * dx + (sy - y0) * dy) / l2 : 0
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(sx - (x0 + t * dx), sy - (y0 + t * dy))
      if (d < bestD) {
        bestD = d
        best = {
          eid: e.eid,
          kind: e.kind,
          alive: e.alive,
          enemyType: e.enemyType,
          npcDialogue: e.npc?.dialogue,
        }
      }
    }
    return best
  }

  private avatarsSyncedEntities: Entity[] = []

  // ---------------- Кадр ----------------

  resize() {
    if (this.disposed) return
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  render(view: SceneView3d) {
    if (this.disposed) return
    this.avatarsSyncedEntities = view.entities

    this.updateAtmosphere(view.zone ?? zoneOf(view.player.pos.x, view.player.pos.y), view.dayT ?? 0.4, view.silence ?? 0)

    const avatars = this.avatars.sync(view.entities)
    for (const e of view.entities) {
      const av = avatars.get(e.eid)
      if (!av) continue
      av.group.visible = true
      av.update(e, view.time, this.camera, view.targetEid === e.eid)
    }

    this.terrain.update(view.time)
    // Тишь гасит огни мира (костры/факелы) — «гаснут костры» по GDD 01
    this.props.update(view.time, view.removedProps, Math.min(1, 1 - this.daylight + this.silenceAmt * 0.5), view.runes)
    const target = view.targetEid ? view.entities.find((x) => x.eid === view.targetEid) ?? null : null
    this.fx.update(view.particles, view.floaters, view.telegraphs, target, view.time)

    // Фаза 4: тактический оверлей — линии приказов и кольцо выбора
    if (view.tactical) {
      const lines: OrderLine[] = []
      for (const e of view.entities) {
        if (e.kind !== 'companion' || !e.alive) continue
        lines.push({ ax: view.player.pos.x, ay: view.player.pos.y, bx: e.pos.x, by: e.pos.y, color: e.color })
      }
      const sel = view.selEid ? view.entities.find((x) => x.eid === view.selEid) ?? null : null
      this.fx.updateTactical(lines, sel, view.time)
    } else {
      this.fx.updateTactical(null, null, view.time)
    }

    this.updateCamera(view)

    // Фаза 6.2/6.3: осадки — снег Пределья или мор-искры Мары (те же точки, другой цвет)
    const snowGoal = view.zone === 'frost' ? 0.85 : view.zone === 'mara' ? 0.55 : 0
    this.snowMat.opacity += (snowGoal - this.snowMat.opacity) * 0.05
    // цвет: снег — белый, мор — багровые хлопья скверны
    const snowWhite = view.zone !== 'mara' ? 1 : 0
    this.snowMat.color.setRGB(
      this.snowMat.color.r + (snowWhite - this.snowMat.color.r) * 0.05,
      this.snowMat.color.g + ((view.zone === 'mara' ? 0.28 : 1) - this.snowMat.color.g) * 0.05,
      this.snowMat.color.b + ((view.zone === 'mara' ? 0.24 : 1) - this.snowMat.color.b) * 0.05,
    )
    this.snow.visible = this.snowMat.opacity > 0.02
    if (this.snow.visible) {
      // в Маре мор-испарения падают медленно и плывут вбок
      const fall = view.zone === 'mara' ? 5.5 : 13
      this.snow.position.set(
        Math.round(this.camTarget.x / 100) * 100,
        30 - ((view.time * fall) % 50),
        Math.round(this.camTarget.z / 100) * 100,
      )
      this.snow.position.x += Math.sin(view.time * 0.6) * (view.zone === 'mara' ? 14 : 6)
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    const c = this.canvas
    c.removeEventListener('pointerdown', this.onOrbitDown)
    window.removeEventListener('pointermove', this.onOrbitMove)
    window.removeEventListener('pointerup', this.onOrbitUp)
    c.removeEventListener('wheel', this.onWheel)
    c.removeEventListener('contextmenu', this.onCtxMenu)
    this.terrain.dispose()
    this.props.dispose()
    this.avatars.dispose()
    this.fx.dispose()
    this.snow.geometry.dispose()
    this.snowMat.dispose()
    this.renderer.dispose()
  }
}
