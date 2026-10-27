// ============================================================
// ЭХО РАЗЛОМА — 3D-пропсы (Phase 1)
// Перенос PROPS/INTERACTABLES в Three.js: деревья и камни —
// InstancedMesh, постройки — сборные меши, Разлом — портал с
// подсветкой, барьеры/травы скрываются через removedProps.
// ============================================================

import * as THREE from 'three'
import { INTERACTABLES, PROPS } from '../data/world'
import { PropDef } from '../types'
import { seedRot } from '../core/util'
import { heightAt } from './heightmap'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function groundMat(color: number, rough = 0.95): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })
}

function place(group: THREE.Group, obj: THREE.Object3D, x: number, y: number, z = 0, rotY = 0) {
  obj.position.set(x, heightAt(x, y) + z, y)
  obj.rotation.y = rotY
  group.add(obj)
}

export class Props3d {
  group = new THREE.Group()
  /** Меши, скрываемые при removedProps (барьеры, травы). */
  private removable = new Map<string, THREE.Object3D[]>()
  private fires: Array<{ light: THREE.PointLight; flame: THREE.Mesh; base: number }> = []
  /** Вращающиеся магические элементы (руна алтаря, ядра порталов). */
  private spinners: THREE.Object3D[] = []
  private herbPulse: THREE.Object3D[] = []
  /** Фаза 6.2: кольца рунных камней (обновляются цветом из состояния движка). */
  private runeRings = new Map<string, THREE.Mesh>()
  private disposables: Array<{ dispose(): void }> = []

  constructor() {
    this.buildInstanced()
    for (const p of PROPS) this.buildProp(p)
    this.buildHerbs()
  }

  // ---------------- Инстансинг: деревья/камни/кусты ----------------

  private buildInstanced() {
    const trees = PROPS.filter((p) => p.kind === 'tree')
    const rocks = PROPS.filter((p) => p.kind === 'rock')
    const shrubs = PROPS.filter((p) => p.kind === 'shrub' || p.kind === 'flower')
    const deadTrees = PROPS.filter((p) => p.kind === 'deadtree')
    const reeds = PROPS.filter((p) => p.kind === 'reed')
    const snowTrees = PROPS.filter((p) => p.kind === 'snowtree')

    if (trees.length) {
      // Ствол
      const trunkGeo = new THREE.CylinderGeometry(1.6, 2.6, 14, 6)
      trunkGeo.translate(0, 7, 0)
      const trunkMat = groundMat(0x4a3626)
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length)
      // Крона — два конуса (матрицы инстансов — МИРОВЫЕ: база дерева + локальный сдвиг * масштаб)
      const coneGeo = new THREE.ConeGeometry(8, 18, 7)
      const leafMat = groundMat(0x2e4422)
      const leaves = new THREE.InstancedMesh(coneGeo, leafMat, trees.length * 2)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      trees.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const rot = seedRot(p.seed ?? i)
        const s = 0.85 + ((p.seed ?? 7) % 100) / 220
        q.setFromAxisAngle(V(0, 1, 0), rot)
        sc.set(s, s * (0.9 + ((p.seed ?? 3) % 60) / 200), s)
        m.compose(V(p.pos.x, h, p.pos.y), q, sc)
        trunks.setMatrixAt(i, m)
        m.compose(V(p.pos.x, h + 12 * s, p.pos.y), q, sc)
        leaves.setMatrixAt(i * 2, m)
        m.compose(V(p.pos.x, h + 22 * s, p.pos.y), q, sc)
        leaves.setMatrixAt(i * 2 + 1, m)
      })
      trunks.castShadow = true
      leaves.castShadow = true
      this.group.add(trunks, leaves)
      this.disposables.push(trunkGeo, trunkMat, coneGeo, leafMat)
    }

    if (rocks.length) {
      const rockGeo = new THREE.DodecahedronGeometry(1, 0)
      const rockMat = groundMat(0x6a6a64)
      const meshes = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const e = new THREE.Euler()
      const sc = new THREE.Vector3()
      rocks.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const r = p.r ?? 10
        e.set(seedRot(p.seed ?? i) * 0.4, seedRot((p.seed ?? 0) + 91), 0)
        q.setFromEuler(e)
        sc.set(r * 1.15, r * 0.8, r * 1.05)
        m.compose(V(p.pos.x, h + r * 0.25, p.pos.y), q, sc)
        meshes.setMatrixAt(i, m)
      })
      meshes.castShadow = true
      meshes.receiveShadow = true
      this.group.add(meshes)
      this.disposables.push(rockGeo, rockMat)
    }

    if (shrubs.length) {
      const bushGeo = new THREE.IcosahedronGeometry(1, 0)
      const bushMat = groundMat(0x3c5226)
      const flowerMat = groundMat(0xa8b86a)
      const bushes = new THREE.InstancedMesh(bushGeo, bushMat, shrubs.length)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      shrubs.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        q.setFromAxisAngle(V(0, 1, 0), seedRot(p.seed ?? i))
        const s = p.kind === 'flower' ? 1.5 : 2.4
        sc.set(s, s * 0.75, s)
        m.compose(V(p.pos.x, h + s * 0.5, p.pos.y), q, sc)
        bushes.setMatrixAt(i, m)
      })
      this.group.add(bushes)
      this.disposables.push(bushGeo, bushMat, flowerMat)
    }

    // Мёртвые деревья Вельда: голый ствол + две ветки (Фаза 3)
    if (deadTrees.length) {
      const trunkGeo = new THREE.CylinderGeometry(0.9, 2.2, 15, 6)
      trunkGeo.translate(0, 7.5, 0)
      const branchGeo = new THREE.CylinderGeometry(0.45, 0.8, 8, 5)
      branchGeo.translate(0, 4, 0)
      const barkMat = groundMat(0x3a322a, 0.98)
      const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, deadTrees.length)
      const branches = new THREE.InstancedMesh(branchGeo, barkMat, deadTrees.length * 2)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const q2 = new THREE.Quaternion()
      const e2 = new THREE.Euler()
      const sc = new THREE.Vector3()
      deadTrees.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const rot = seedRot(p.seed ?? i)
        const s = 0.8 + ((p.seed ?? 7) % 100) / 240
        q.setFromAxisAngle(V(0, 1, 0), rot)
        sc.set(s, s, s)
        m.compose(V(p.pos.x, h, p.pos.y), q, sc)
        trunks.setMatrixAt(i, m)
        // Ветки: наклонены вбок от ствола
        e2.set(((p.seed ?? 1) % 7) * 0.05 + 0.55, rot + 1.9, 0)
        q2.setFromEuler(e2)
        m.compose(V(p.pos.x, h + 9.5 * s, p.pos.y), q2, sc)
        branches.setMatrixAt(i * 2, m)
        e2.set(0.7, rot + 4.6, 0)
        q2.setFromEuler(e2)
        m.compose(V(p.pos.x, h + 7.5 * s, p.pos.y), q2, sc)
        branches.setMatrixAt(i * 2 + 1, m)
      })
      trunks.castShadow = true
      branches.castShadow = true
      this.group.add(trunks, branches)
      this.disposables.push(trunkGeo, branchGeo, barkMat)
    }

    // Камыш у омутов (Фаза 3)
    if (reeds.length) {
      const reedGeo = new THREE.ConeGeometry(0.9, 6.5, 4)
      reedGeo.translate(0, 3.2, 0)
      const reedMat = groundMat(0x4a5530, 0.98)
      const mesh = new THREE.InstancedMesh(reedGeo, reedMat, reeds.length * 3)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      reeds.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        for (let k = 0; k < 3; k++) {
          const ox = ((p.seed ?? i) % 13) - 6 + k * 3.1
          const oz = (((p.seed ?? i) * 7) % 11) - 5
          q.setFromAxisAngle(V(0, 1, 0), seedRot((p.seed ?? 0) + k * 31))
          const s = 0.7 + ((p.seed ?? 3) % 50) / 90
          sc.set(s, s * (0.85 + k * 0.12), s)
          m.compose(V(p.pos.x + ox, h, p.pos.y + oz), q, sc)
          mesh.setMatrixAt(i * 3 + k, m)
        }
      })
      this.group.add(mesh)
      this.disposables.push(reedGeo, reedMat)
    }

    // Снежные ели Пределья (Фаза 6.2): тёмная хвоя под шапкой снега
    if (snowTrees.length) {
      const trunkGeo = new THREE.CylinderGeometry(1.3, 2.2, 12, 6)
      trunkGeo.translate(0, 6, 0)
      const barkMat = groundMat(0x3c3226)
      const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, snowTrees.length)
      const coneGeo = new THREE.ConeGeometry(6.5, 15, 7)
      const needleMat = groundMat(0x2a3a28)
      const snowMatI = groundMat(0xd8dee0, 0.92)
      const cones = new THREE.InstancedMesh(coneGeo, needleMat, snowTrees.length * 2)
      const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(4.4, 5.5, 7), snowMatI, snowTrees.length)
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      snowTrees.forEach((p, i) => {
        const h = heightAt(p.pos.x, p.pos.y)
        const rot = seedRot(p.seed ?? i)
        const s = 0.85 + ((p.seed ?? 7) % 100) / 200
        q.setFromAxisAngle(V(0, 1, 0), rot)
        sc.set(s, s, s)
        m.compose(V(p.pos.x, h, p.pos.y), q, sc)
        trunks.setMatrixAt(i, m)
        m.compose(V(p.pos.x, h + 11 * s, p.pos.y), q, sc)
        cones.setMatrixAt(i * 2, m)
        m.compose(V(p.pos.x, h + 19 * s, p.pos.y), q, sc)
        cones.setMatrixAt(i * 2 + 1, m)
        m.compose(V(p.pos.x, h + 26.5 * s, p.pos.y), q, sc)
        caps.setMatrixAt(i, m)
      })
      trunks.castShadow = true
      cones.castShadow = true
      this.group.add(trunks, cones, caps)
      this.disposables.push(trunkGeo, barkMat, coneGeo, needleMat, snowMatI)
    }
  }

  // ---------------- Одиночные пропсы ----------------

  private buildProp(p: PropDef) {
    const { x, y } = p.pos
    const h = () => heightAt(x, y)
    switch (p.kind) {
      case 'tree':
      case 'rock':
      case 'shrub':
      case 'flower':
        return // уже в инстансах

      case 'house': {
        const g = new THREE.Group()
        const w = p.w ?? 120
        const d = p.h ?? 70
        const bodyH = 26 + w * 0.06
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), groundMat(0x6b543c))
        body.position.y = bodyH / 2
        body.castShadow = true
        body.receiveShadow = true
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, 20 + w * 0.08, 4), groundMat(0x3d2f22))
        roof.rotation.y = Math.PI / 4
        roof.position.y = bodyH + (10 + w * 0.04)
        roof.castShadow = true
        g.add(body, roof)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.2)
        break
      }

      case 'tent': {
        const g = new THREE.Group()
        const w = p.w ?? 60
        const tent = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, w * 0.62, 5), groundMat(0x7a6248))
        tent.position.y = w * 0.31
        tent.castShadow = true
        g.add(tent)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1))
        break
      }

      case 'stall': {
        const g = new THREE.Group()
        const table = new THREE.Mesh(new THREE.BoxGeometry(70, 8, 42), groundMat(0x6b543c))
        table.position.y = 16
        const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 4, 50), groundMat(0x8a3d2e))
        roof.position.y = 40
        roof.rotation.z = 0.08
        for (const [lx, lz] of [[-30, -16], [30, -16], [-30, 16], [30, 16]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 32, 5), groundMat(0x4a3626))
          leg.position.set(lx, 16, lz)
          g.add(leg)
        }
        table.castShadow = true
        g.add(table, roof)
        place(this.group, g, x, y)
        break
      }

      case 'dummy': {
        const g = new THREE.Group()
        const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 34, 6), groundMat(0x5c4630))
        post.position.y = 17
        const cross = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 4), groundMat(0x5c4630))
        cross.position.y = 26
        const head = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 6), groundMat(0x8a7148))
        head.position.y = 37
        post.castShadow = true
        g.add(post, cross, head)
        place(this.group, g, x, y)
        break
      }

      case 'fire': {
        const g = new THREE.Group()
        for (let i = 0; i < 5; i++) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 12, 5), groundMat(0x3d2a1a))
          log.rotation.set(Math.PI / 2.4, (i / 5) * Math.PI * 2, 0)
          log.position.y = 2.4
          g.add(log)
        }
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(5, 12, 6),
          new THREE.MeshBasicMaterial({ color: 0xe8913a, transparent: true, opacity: 0.92 }),
        )
        flame.position.y = 9
        const light = new THREE.PointLight(0xff9540, 320, 190, 2)
        light.position.y = 12
        g.add(flame, light)
        place(this.group, g, x, y)
        this.fires.push({ light, flame, base: 1 })
        break
      }

      case 'fence': {
        const g = new THREE.Group()
        const w = p.w ?? 90
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 2.4), groundMat(0x54422e))
        rail.position.y = 12
        const rail2 = rail.clone()
        rail2.position.y = 6
        g.add(rail, rail2)
        const n = Math.max(2, Math.round(w / 30))
        for (let i = 0; i <= n; i++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 5), groundMat(0x4a3626))
          post.position.set(-w / 2 + (w / n) * i, 7, 0)
          g.add(post)
        }
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.1)
        break
      }

      case 'stone': {
        const g = new THREE.Group()
        const r = p.r ?? 12
        const obelisk = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, r * 3.4, r * 0.7), groundMat(0x77776f))
        obelisk.position.y = r * 1.6
        obelisk.rotation.z = (seedRot(p.seed ?? 1) - Math.PI) * 0.06
        obelisk.castShadow = true
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 0.9, 4), groundMat(0x6a6a62))
        cap.position.y = r * 3.4
        cap.rotation.y = Math.PI / 4
        g.add(obelisk, cap)
        place(this.group, g, x, y)
        break
      }

      case 'altar': {
        const g = new THREE.Group()
        const slab = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 8, 8), groundMat(0x8a8a80))
        slab.position.y = 4
        slab.castShadow = true
        const glow = new THREE.Mesh(
          new THREE.OctahedronGeometry(5, 0),
          new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.85 }),
        )
        glow.position.y = 22
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(20, 23, 32),
          new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 1
        g.add(slab, glow, ring)
        place(this.group, g, x, y)
        this.spinners.push(glow) // вращается вместе с руной алтаря
        this.herbPulse.push(ring)
        break
      }

      case 'carcass': {
        const g = new THREE.Group()
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(p.r ?? 14, 10, 3, 8), groundMat(0x5e4438))
        body.rotation.z = Math.PI / 2
        body.position.y = 5
        g.add(body)
        place(this.group, g, x, y)
        break
      }

      case 'rift': {
        const g = new THREE.Group()
        const portal = new THREE.Mesh(
          new THREE.TorusGeometry(52, 7, 10, 40),
          new THREE.MeshStandardMaterial({ color: 0x3a2a4a, emissive: 0x9a5fd0, emissiveIntensity: 1.4, roughness: 0.5 }),
        )
        portal.position.y = 62
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(50, 32),
          new THREE.MeshBasicMaterial({ color: 0x1a0f22, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
        )
        disc.position.y = 62
        const core = new THREE.Mesh(
          new THREE.TorusGeometry(26, 4, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0xc09ae8, transparent: true, opacity: 0.7 }),
        )
        core.position.y = 62
        const light = new THREE.PointLight(0xa86fe0, 900, 520, 2)
        light.position.y = 70
        g.add(portal, disc, core, light)
        place(this.group, g, x, y)
        this.spinners.push(core)
        break
      }

      case 'barrier': {
        const g = new THREE.Group()
        const shroud = new THREE.Mesh(
          new THREE.CylinderGeometry(20, 26, 46, 8, 1, true),
          new THREE.MeshStandardMaterial({
            color: 0x6a4a8a,
            emissive: 0x8a5fc0,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
          }),
        )
        shroud.position.y = 23
        g.add(shroud)
        place(this.group, g, x, y)
        if (p.id) this.removable.set(p.id, [g])
        break
      }

      // --- Фаза 3: доска объявлений, врата Тумана, пень ---

      case 'board': {
        const g = new THREE.Group()
        for (const px of [-16, 16]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 26, 6), groundMat(0x4a3626))
          post.position.set(px, 13, 0)
          post.castShadow = true
          g.add(post)
        }
        const panel = new THREE.Mesh(new THREE.BoxGeometry(42, 26, 2.4), groundMat(0x5c4630))
        panel.position.y = 22
        panel.rotation.x = -0.12
        panel.castShadow = true
        g.add(panel)
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: 0.9 })
        const papers: Array<[number, number, number]> = [
          [-11, 24, -0.14],
          [2, 21, -0.1],
          [13, 25, -0.16],
        ]
        for (const [lx, ly, rz] of papers) {
          const paper = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 10), paperMat)
          paper.position.set(lx, ly, 1.5)
          paper.rotation.set(-0.12, 0, rz)
          g.add(paper)
        }
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.15)
        break
      }

      case 'portal': {
        // Врата Тумана: каменная арка с мерцающим диском
        const g = new THREE.Group()
        const stoneMat = groundMat(0x6a6a62)
        for (const px of [-24, 24]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(9, 44, 9), stoneMat)
          pillar.position.set(px, 22, 0)
          pillar.rotation.z = (seedRot(p.seed ?? 1) - Math.PI) * 0.03
          pillar.castShadow = true
          g.add(pillar)
        }
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(64, 9, 10), stoneMat)
        lintel.position.y = 47
        lintel.rotation.z = 0.03
        lintel.castShadow = true
        g.add(lintel)
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(20, 28),
          new THREE.MeshBasicMaterial({ color: 0x9ad0a8, transparent: true, opacity: 0.34, side: THREE.DoubleSide }),
        )
        disc.position.y = 24
        const core = new THREE.Mesh(
          new THREE.TorusGeometry(11, 1.8, 6, 22),
          new THREE.MeshBasicMaterial({ color: 0xd9e8c0, transparent: true, opacity: 0.6 }),
        )
        core.position.y = 24
        const light = new THREE.PointLight(0x9ad0a8, 240, 170, 2)
        light.position.y = 26
        g.add(disc, core, light)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.4)
        this.spinners.push(core)
        break
      }

      case 'stump': {
        const g = new THREE.Group()
        const r = p.r ?? 7
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, r * 0.8, 7), groundMat(0x4a3a28))
        stump.position.y = r * 0.4
        stump.castShadow = true
        const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 7), groundMat(0x6a5a40))
        top.rotation.x = -Math.PI / 2
        top.position.y = r * 0.82
        g.add(stump, top)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1))
        break
      }

      // --- Фаза 6: Гранитная Долина ---

      case 'pit': {
        // Яма Колонии: песчаная чаша + частокол из заострённых брёвен
        const g = new THREE.Group()
        const r = p.r ?? 120
        const sand = new THREE.Mesh(new THREE.CircleGeometry(r, 40), groundMat(0x9a8256, 0.98))
        sand.rotation.x = -Math.PI / 2
        sand.position.y = 0.35
        sand.receiveShadow = true
        g.add(sand)
        const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(r + 10, 1.4, 6, 48), groundMat(0x4a3626))
        ringMesh.rotation.x = -Math.PI / 2
        ringMesh.position.y = 6
        g.add(ringMesh)
        const posts = 26
        for (let i = 0; i < posts; i++) {
          const a = (i / posts) * Math.PI * 2
          const post = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 13, 5), groundMat(0x54402c))
          post.position.set(Math.cos(a) * (r + 10), 6.5, Math.sin(a) * (r + 10))
          post.rotation.z = ((i % 3) - 1) * 0.04
          post.castShadow = true
          g.add(post)
          if (i % 4 === 0) {
            const torch = new THREE.Mesh(
              new THREE.ConeGeometry(1.4, 4, 6),
              new THREE.MeshBasicMaterial({ color: 0xe8913a, transparent: true, opacity: 0.9 }),
            )
            torch.position.set(Math.cos(a) * (r + 10), 14.5, Math.sin(a) * (r + 10))
            g.add(torch)
            const light = new THREE.PointLight(0xff9540, 150, 120, 2)
            light.position.set(Math.cos(a) * (r + 10), 16, Math.sin(a) * (r + 10))
            g.add(light)
            this.fires.push({ light, flame: torch, base: 1 })
          }
        }
        place(this.group, g, x, y)
        break
      }

      case 'mine': {
        // Вход в копи: каменная арка с чёрным проёмом
        const g = new THREE.Group()
        const arch = new THREE.Mesh(new THREE.TorusGeometry(30, 9, 8, 20, Math.PI), groundMat(0x6a6a62))
        arch.position.y = 4
        arch.castShadow = true
        const hole = new THREE.Mesh(
          new THREE.CircleGeometry(26, 20, 0, Math.PI),
          new THREE.MeshBasicMaterial({ color: 0x0c0a08 }),
        )
        hole.position.y = 3
        g.add(arch, hole)
        for (const px of [-34, 34]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 12), groundMat(0x5c5c54))
          pillar.position.set(px, 9, 0)
          pillar.castShadow = true
          g.add(pillar)
        }
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.3)
        break
      }

      case 'obelisk': {
        // Осколок Ядра: парящий кристалл с пепельным свечением
        const g = new THREE.Group()
        const r = p.r ?? 16
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(r * 1.5, 0),
          new THREE.MeshStandardMaterial({
            color: 0x4a3a5a,
            emissive: 0x9a6fd0,
            emissiveIntensity: 0.9,
            roughness: 0.3,
            metalness: 0.15,
          }),
        )
        crystal.scale.set(0.75, 1.7, 0.75)
        crystal.position.y = r * 2.1
        crystal.castShadow = true
        const glow = new THREE.PointLight(0xa86fe0, 260, 260, 2)
        glow.position.y = r * 2.2
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r * 1.1, r * 1.35, 26),
          new THREE.MeshBasicMaterial({ color: 0xc9a3e8, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.8
        g.add(crystal, glow, ring)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1))
        this.spinners.push(crystal)
        this.herbPulse.push(ring)
        break
      }

      // --- Фаза 6.2: Стылое Пределье ---

      case 'cave': {
        // Вход Пещеры Рун: ледяная арка с тёмным проёмом
        const g = new THREE.Group()
        const arch = new THREE.Mesh(new THREE.TorusGeometry(32, 9, 8, 20, Math.PI), groundMat(0x7a8482))
        arch.position.y = 4
        arch.castShadow = true
        const ice = new THREE.Mesh(new THREE.TorusGeometry(30, 2.2, 6, 20, Math.PI), groundMat(0xbfd4d6, 0.4))
        ice.position.y = 4
        const hole = new THREE.Mesh(
          new THREE.CircleGeometry(27, 20, 0, Math.PI),
          new THREE.MeshBasicMaterial({ color: 0x0a0d0c }),
        )
        hole.position.y = 3
        g.add(arch, ice, hole)
        for (const px of [-36, 36]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 13), groundMat(0x6a7470))
          pillar.position.set(px, 10, 0)
          pillar.castShadow = true
          g.add(pillar)
        }
        place(this.group, g, x, y, 0, Math.PI) // проём смотрит на юг
        break
      }

      case 'runestone': {
        // Рунный камень: монолит с парящим кольцом-символом (цвет = текущая руна)
        const g = new THREE.Group()
        const stone = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 5), groundMat(0x6e7672))
        stone.position.y = 11
        stone.rotation.z = seedRot(p.seed ?? 1) * 0.06
        stone.castShadow = true
        g.add(stone)
        // руны на камне — светлая полоска
        const strip = new THREE.Mesh(
          new THREE.PlaneGeometry(4.4, 12),
          new THREE.MeshBasicMaterial({ color: 0xd8dde2, transparent: true, opacity: 0.55 }),
        )
        strip.position.set(0, 12, 2.55)
        g.add(strip)
        // парящее кольцо символа
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(5.6, 0.8, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x9fb8a4, emissive: 0x9fb8a4, emissiveIntensity: 0.8, roughness: 0.35 }),
        )
        ring.rotation.x = Math.PI / 2.3
        ring.position.y = 27
        g.add(ring)
        const glow = new THREE.PointLight(0xbfe3ea, 90, 90, 2)
        glow.position.y = 27
        g.add(glow)
        place(this.group, g, x, y, 0, seedRot(p.seed ?? 1) * 0.4)
        this.spinners.push(ring)
        if (p.id) this.runeRings.set(p.id, ring)
        break
      }

      case 'wordwall': {
        // Стена Слова: каменная стена с тлеющими рунами (seed 501 — Сила, 502 — Мороз)
        const g = new THREE.Group()
        const isFrost = (p.seed ?? 0) === 502
        const wall = new THREE.Mesh(new THREE.BoxGeometry(p.w ?? 150, 34, 12), groundMat(0x5e6662))
        wall.position.y = 17
        wall.castShadow = true
        g.add(wall)
        // тёмная триглифная полоса с рунами
        const runes = new THREE.Mesh(
          new THREE.PlaneGeometry((p.w ?? 150) * 0.62, 9),
          new THREE.MeshBasicMaterial({ color: isFrost ? 0xbfe3ea : 0xf5c96b, transparent: true, opacity: 0.85 }),
        )
        runes.position.set(0, 20, 6.1)
        g.add(runes)
        const glow = new THREE.PointLight(isFrost ? 0xbfe3ea : 0xf5c96b, 160, 180, 2)
        glow.position.set(0, 22, 14)
        g.add(glow)
        // осыпь у подножия
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 + (i % 3), 0), groundMat(0x545c58))
          b.position.set(-40 + i * 26, 2, 10 + (i % 2) * 6)
          b.castShadow = true
          g.add(b)
        }
        place(this.group, g, x, y, 0, 0)
        this.herbPulse.push(runes)
        break
      }

      case 'rune_door': {
        // Рунная пелена: ледяная завеса (убирается решением головоломки)
        const g = new THREE.Group()
        const veil = new THREE.Mesh(
          new THREE.PlaneGeometry(64, 30),
          new THREE.MeshStandardMaterial({
            color: 0x9fd8d2,
            emissive: 0x6fc2ba,
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: 0.62,
            side: THREE.DoubleSide,
            roughness: 0.2,
          }),
        )
        veil.position.y = 15
        const frame = new THREE.Mesh(new THREE.BoxGeometry(66, 4, 6), groundMat(0x5e6662))
        frame.position.y = 31
        g.add(veil, frame)
        place(this.group, g, x, y, 0, Math.PI / 2)
        this.herbPulse.push(veil)
        if (p.id) this.removable.set(p.id, [g])
        break
      }

      case 'bastion': {
        // Фаза 6.3: ворота Бастиона Ветвей — частокол с башнями и проёмом
        const g = new THREE.Group()
        const wood = groundMat(0x5a4630)
        const woodDark = groundMat(0x463524)
        // частокол: ряд заострённых брёвен по обе стороны ворот
        const half = (p.w ?? 150) / 2
        for (let i = -7; i <= 7; i++) {
          if (Math.abs(i) < 2) continue // проём
          const bx = i * 11 + (i > 0 ? 10 : -10)
          const log = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 26, 6), i % 2 === 0 ? wood : woodDark)
          log.position.set(bx, 13, 0)
          log.castShadow = true
          g.add(log)
          const tip = new THREE.Mesh(new THREE.ConeGeometry(3.3, 4.5, 6), woodDark)
          tip.position.set(bx, 28.2, 0)
          g.add(tip)
        }
        // башни по краям ворот
        for (const tx of [-half + 8, half - 8]) {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(18, 34, 15), wood)
          tower.position.set(tx, 17, 0)
          tower.castShadow = true
          g.add(tower)
          const roof = new THREE.Mesh(new THREE.ConeGeometry(13, 9, 4), groundMat(0x7a3b2e))
          roof.position.set(tx, 38.5, 0)
          roof.rotation.y = Math.PI / 4
          g.add(roof)
          // знамя Ветвей
          const banner = new THREE.Mesh(
            new THREE.PlaneGeometry(7, 13),
            new THREE.MeshStandardMaterial({ color: 0xd9a441, emissive: 0x8a6a2a, emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.8 }),
          )
          banner.position.set(tx, 24, 8.2)
          g.add(banner)
          this.herbPulse.push(banner)
        }
        // створки ворот (приоткрыты) + тёмный проём
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), new THREE.MeshBasicMaterial({ color: 0x0d0a08 }))
        hole.position.set(0, 11, -1)
        g.add(hole)
        for (const dx of [-10.5, 10.5]) {
          const door = new THREE.Mesh(new THREE.BoxGeometry(20, 21, 2.4), groundMat(0x6a5238))
          door.position.set(dx, 10.5, 0.6)
          door.rotation.y = dx < 0 ? 0.35 : -0.35
          door.castShadow = true
          g.add(door)
        }
        // факелы у ворот
        for (const fx of [-24, 24]) {
          const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 5), woodDark)
          torch.position.set(fx, 3.5, 8)
          g.add(torch)
          const flame = new THREE.Mesh(
            new THREE.SphereGeometry(1.6, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.9 }),
          )
          flame.position.set(fx, 7.6, 8)
          g.add(flame)
          const fl = new THREE.PointLight(0xd9823a, 120, 110, 2)
          fl.position.set(fx, 9, 10)
          g.add(fl)
          this.fires.push({ light: fl, flame, base: 7.6 })
        }
        place(this.group, g, x, y, 0, Math.PI) // смотрит на юг — к мору
        break
      }

      case 'blight': {
        // Фаза 6.3: мор-сгусток — багровая лужа скверны с пульсирующим ядром
        const g = new THREE.Group()
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry((p.r ?? 22) * 1.35, 18),
          new THREE.MeshStandardMaterial({ color: 0x3a1210, emissive: 0xc93a2a, emissiveIntensity: 0.32, roughness: 0.35, transparent: true, opacity: 0.92 }),
        )
        pool.rotation.x = -Math.PI / 2
        pool.position.y = 0.3
        g.add(pool)
        // ядро — пульсирующий ком скверны
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(6.5, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x5a1a14, emissive: 0xd94a30, emissiveIntensity: 0.85, roughness: 0.3 }),
        )
        core.position.y = 4.2
        core.scale.set(1.25, 0.8, 1.25)
        g.add(core)
        this.herbPulse.push(core)
        // щупальца-жилы
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + seedRot((p.seed ?? 1) + i) * 0.5
          const rr = (p.r ?? 22) * 0.9
          const tendril = new THREE.Mesh(new THREE.ConeGeometry(1.8, 7 + (i % 3) * 2.5, 5), groundMat(0x4a1410, 0.6))
          tendril.position.set(Math.cos(a) * rr, 2.2, Math.sin(a) * rr)
          tendril.rotation.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7)
          tendril.rotation.z = -a + Math.PI / 2
          g.add(tendril)
        }
        const glow = new THREE.PointLight(0xd94a30, 130, 130, 2)
        glow.position.y = 5
        g.add(glow)
        place(this.group, g, x, y, 0, 0)
        if (p.id) this.removable.set(p.id, [g])
        break
      }
    }
  }

  // ---------------- Травы-интерактивы и гранитные жилы ----------------

  private buildHerbs() {
    for (const it of INTERACTABLES) {
      if (it.kind === 'herb') {
        const g = new THREE.Group()
        const stem = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 5), groundMat(0x7aa06a))
        stem.position.y = 4.5
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(3.4, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xcfe8c0, transparent: true, opacity: 0.75 }),
        )
        glow.position.y = 11
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(8, 9.5, 24),
          new THREE.MeshBasicMaterial({ color: 0x9fb8a4, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.6
        g.add(stem, glow, ring)
        place(this.group, g, it.pos.x, it.pos.y)
        this.removable.set(it.id, [g])
        this.herbPulse.push(ring)
      } else if (it.kind === 'ore') {
        // Гранитная жила (Фаза 6): серые камни с кристаллами руды
        const g = new THREE.Group()
        const base = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 0), groundMat(0x5e5e56))
        base.position.y = 3.2
        base.scale.set(1.5, 0.8, 1.1)
        base.castShadow = true
        const shardMat = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, emissive: 0x8090a8, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.2 })
        for (let i = 0; i < 3; i++) {
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), shardMat)
          const a = (i / 3) * Math.PI * 2
          shard.position.set(Math.cos(a) * 4, 7 + i * 1.6, Math.sin(a) * 3)
          shard.rotation.z = 0.4 * i
          g.add(shard)
        }
        place(this.group, g, it.pos.x, it.pos.y)
        this.removable.set(it.id, [g])
      }
    }
  }

  // ---------------- Кадр ----------------

  update(time: number, removed: Set<string>, darkness = 0, runes?: { rs1: number; rs2: number; rs3: number }) {
    // Огни костров мерцают; ночью — ярче (Фаза 3)
    const nightBoost = 0.8 + darkness * 1.5
    for (const f of this.fires) {
      const flick = 0.82 + Math.sin(time * 11) * 0.1 + Math.sin(time * 23.7) * 0.08
      f.light.intensity = 320 * flick * nightBoost
      const s = 0.9 + flick * 0.25
      f.flame.scale.set(s, 1 + flick * 0.4, s)
    }
    // Пульс колец трав/алтаря
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.5)
    for (const r of this.herbPulse) {
      const m = (r as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.22 + pulse * 0.3
    }
    // Вращение магических элементов
    for (const s of this.spinners) {
      s.rotation.y = time * 0.9
      s.rotation.z = Math.sin(time * 0.6) * 0.15
    }
    // Фаза 6.2: кольца рунных камней перекрашиваются по состоянию головоломки
    if (runes) {
      const colors = [0x9fb8a4, 0xd9a441, 0xd8dde2]
      for (const [id, mesh] of this.runeRings) {
        const idx = runes[id as 'rs1'] ?? 0
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.setHex(colors[idx])
        mat.emissive.setHex(colors[idx])
      }
    }
    // Скрытые пропсы (барьеры по квесту, собранные травы)
    for (const [id, objs] of this.removable) {
      const hidden = removed.has(id)
      for (const o of objs) o.visible = !hidden
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) mat.dispose()
    })
    for (const d of this.disposables) d.dispose()
  }
}
