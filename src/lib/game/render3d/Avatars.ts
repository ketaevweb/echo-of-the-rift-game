// ============================================================
// ЭХО РАЗЛОМА — 3D-аватары сущностей (Phase 1)
// AvatarFactory: сборка героя/спутника/NPC/зверей из примитивов,
// процедурная анимация (шаг, выпад атаки, каст, оглушение,
// смерть), HP-бары-биллборды. Логика боя знает только координаты.
// ============================================================

import * as THREE from 'three'
import { Entity } from '../types'
import { heightAt } from './heightmap'

const UP = new THREE.Vector3(0, 1, 0)

function mat(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts })
}

/** Собирает все материалы подветки — для вспышки урона/смерти. */
interface MatEntry {
  m: THREE.MeshStandardMaterial
  baseEmissive: THREE.Color
  baseIntensity: number
}

function collectMats(root: THREE.Object3D): MatEntry[] {
  const out: MatEntry[] = []
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (!m) return
    if (Array.isArray(m)) {
      for (const x of m) {
        if ((x as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const sm = x as THREE.MeshStandardMaterial
          out.push({ m: sm, baseEmissive: sm.emissive.clone(), baseIntensity: sm.emissiveIntensity })
        }
      }
    } else if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      const sm = m as THREE.MeshStandardMaterial
      out.push({ m: sm, baseEmissive: sm.emissive.clone(), baseIntensity: sm.emissiveIntensity })
    }
  })
  return out
}

// ---------------- Человеческие аватары ----------------

interface HumanoidRefs {
  legL: THREE.Object3D
  legR: THREE.Object3D
  armR: THREE.Object3D
  torso: THREE.Object3D
  head: THREE.Object3D
}

function buildHumanoid(
  cloakColor: string,
  skinColor = 0xc9a07a,
  opts?: { hood?: boolean; staff?: boolean; sword?: boolean; scale?: number; bandana?: number; helmet?: boolean; horns?: boolean },
): { group: THREE.Group; refs: HumanoidRefs } {
  const s = 0.65 * (opts?.scale ?? 1)
  const group = new THREE.Group()
  const cloak = mat(new THREE.Color(cloakColor).getHex())
  const skin = mat(skinColor)
  const dark = mat(0x2e2620)

  // Ноги
  const legGeo = new THREE.CapsuleGeometry(2.6, 8, 3, 6)
  const legL = new THREE.Group()
  const legR = new THREE.Group()
  const legLm = new THREE.Mesh(legGeo, dark)
  const legRm = new THREE.Mesh(legGeo, dark)
  legLm.position.y = -6
  legRm.position.y = -6
  legLm.castShadow = true
  legRm.castShadow = true
  legL.add(legLm)
  legR.add(legRm)
  legL.position.set(-3.4, 14, 0)
  legR.position.set(3.4, 14, 0)

  // Торс (мантия)
  const torso = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(6.4, 10, 4, 8), cloak)
  body.position.y = 6
  body.castShadow = true
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 2.2, 8), mat(0x4a3626))
  belt.position.y = 0.5
  torso.add(body, belt)
  torso.position.y = 14

  // Голова
  const head = new THREE.Group()
  const skull = new THREE.Mesh(new THREE.SphereGeometry(4.6, 10, 8), skin)
  skull.castShadow = true
  head.add(skull)
  if (opts?.hood) {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(6, 9.5, 7), cloak)
    hood.position.y = 2.6
    hood.rotation.x = 0.22
    head.add(hood)
  } else if (opts?.helmet) {
    const helm = new THREE.Mesh(new THREE.ConeGeometry(5.2, 6.5, 8), mat(0x8a8a80))
    helm.position.y = 3.4
    head.add(helm)
  } else if (opts?.bandana !== undefined) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 2, 8), mat(opts.bandana))
    band.position.y = 1.6
    head.add(band)
  }
  head.position.y = 13.5
  torso.add(head)

  // Левая рука (простая)
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(2, 8, 3, 6), cloak)
  armL.position.set(-8, 7, 0)
  armL.rotation.z = 0.35
  torso.add(armL)

  // Правая рука + оружие
  const armR = new THREE.Group()
  const armRm = new THREE.Mesh(new THREE.CapsuleGeometry(2, 8, 3, 6), cloak)
  armRm.position.y = -4
  armR.add(armRm)
  if (opts?.sword) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 20, 3.6), mat(0xb8b8b0, { metalness: 0.55, roughness: 0.35 }))
    blade.position.y = -16
    const guard = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 2), mat(0x8a6a30, { metalness: 0.4 }))
    guard.position.y = -6
    armR.add(blade, guard)
  } else if (opts?.staff) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 26, 5), mat(0x5c4630))
    shaft.position.y = -8
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x9fb8a4, emissive: 0x6a9a7a, emissiveIntensity: 1.1 }),
    )
    orb.position.y = 6
    armR.add(shaft, orb)
  }
  armR.position.set(8, 7, 0)
  torso.add(armR)

  group.add(legL, legR, torso)

  if (opts?.horns) {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(1.8, 9, 5), mat(0x2a1a20))
      horn.position.set(side * 4.4, 4, 0)
      horn.rotation.z = -side * 0.6
      head.add(horn)
    }
  }

  // Глобальный масштаб: рост человека ≈ 26 юнитов мира (радиус сущности 13)
  group.scale.setScalar(0.65 * (opts?.scale ?? 1))
  return { group, refs: { legL, legR, armR, torso, head } }
}

// ---------------- Звери ----------------

interface WolfRefs {
  legs: THREE.Object3D[]
  body: THREE.Object3D
}

function buildWolf(scale = 1, alpha = false): { group: THREE.Group; refs: WolfRefs } {
  const group = new THREE.Group()
  const furColor = alpha ? 0x3a3230 : 0x6a5a48
  const fur = mat(furColor)
  const dark = mat(0x26201a)

  const body = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(5.2, 16, 4, 8), fur)
  trunk.rotation.z = Math.PI / 2
  trunk.position.y = 11
  trunk.castShadow = true
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(3.4, 6, 3, 6), fur)
  neck.position.set(11, 13.5, 0)
  neck.rotation.z = -0.7
  const headG = new THREE.Group()
  const skull = new THREE.Mesh(new THREE.BoxGeometry(7, 5.4, 5.4), fur)
  const snout = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3, 3.4), dark)
  snout.position.x = 5
  const earGeo = new THREE.ConeGeometry(1.4, 3.4, 4)
  const earL = new THREE.Mesh(earGeo, fur)
  const earR = new THREE.Mesh(earGeo, fur)
  earL.position.set(-1.6, 3.6, 1.6)
  earR.position.set(-1.6, 3.6, -1.6)
  headG.add(skull, snout, earL, earR)
  headG.position.set(15, 16, 0)
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 8, 3, 5), fur)
  tail.position.set(-12, 13, 0)
  tail.rotation.z = 0.9
  body.add(trunk, neck, headG, tail)

  if (alpha) {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe05038 })
    for (const sz of [-1.4, 1.4]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), eyeMat)
      eye.position.set(17.6, 16.6, sz)
      body.add(eye)
    }
  }

  const legs: THREE.Object3D[] = []
  const legGeo = new THREE.CapsuleGeometry(1.5, 7, 3, 5)
  for (const [lx, lz] of [[9, 3.4], [9, -3.4], [-8, 3.4], [-8, -3.4]]) {
    const leg = new THREE.Group()
    const lm = new THREE.Mesh(legGeo, dark)
    lm.position.y = -5
    leg.add(lm)
    leg.position.set(lx, 9, lz)
    legs.push(leg)
    body.add(leg)
  }

  group.add(body)
  group.scale.setScalar(0.75 * scale)
  return { group, refs: { legs, body } }
}

// ---------------- Порождение Разлома ----------------

function buildHorror(scale = 1): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const shroud = new THREE.Mesh(
    new THREE.ConeGeometry(9, 24, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x3a2a4a,
      emissive: 0x7a4ac0,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
  )
  shroud.position.y = 13
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd0a0ff })
  for (const sz of [-2.4, 2.4]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 4), eyeMat)
    eye.position.set(3.4, 17, sz)
    body.add(eye)
  }
  const glow = new THREE.PointLight(0x9a5fd0, 60, 90, 2)
  glow.position.y = 14
  body.add(shroud, glow)
  group.add(body)
  group.scale.setScalar(0.8 * scale)
  return { group, refs: { body } }
}

// ---------------- Вельд: болотник / пепельные (Фаза 3) ----------------

/** Болотник — присосистый ком тины с пастью; скачет. */
function buildBogling(scale = 1): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const hide = mat(0x4a5230)
  const dark = mat(0x2c3220)
  const trunk = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), hide)
  trunk.scale.set(1.15, 0.85, 1)
  trunk.position.y = 5.4
  trunk.castShadow = true
  const maw = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.6, 4.5), dark)
  maw.position.set(5.6, 4.2, 0)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe8d568 })
  for (const sz of [-2.6, 2.6]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.15, 6, 5), eyeMat)
    eye.position.set(5.8, 7.4, sz)
    body.add(eye)
  }
  for (const [lx, lz] of [[-3, 3.4], [-3, -3.4], [3.4, 2.6], [3.4, -2.6]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 3.4, 3, 5), dark)
    leg.position.set(lx, 1.4, lz)
    body.add(leg)
  }
  body.add(trunk, maw)
  group.add(body)
  group.scale.setScalar(0.78 * scale)
  return { group, refs: { body } }
}

/** Пепельный мрак — полупрозрачный сгоревший силуэт с углями в груди. */
function buildAshShade(scale = 1): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const shroud = new THREE.Mesh(
    new THREE.ConeGeometry(8.5, 25, 7, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x35302c,
      emissive: 0xc05a2a,
      emissiveIntensity: 0.32,
      transparent: true,
      opacity: 0.74,
      side: THREE.DoubleSide,
    }),
  )
  shroud.position.y = 13.5
  const emberCore = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff8a4a, transparent: true, opacity: 0.8 }),
  )
  emberCore.position.set(0, 15, 0)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffa04a })
  for (const sz of [-2.2, 2.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), eyeMat)
    eye.position.set(3.6, 18.5, sz)
    body.add(eye)
  }
  const glow = new THREE.PointLight(0xc05a2a, 45, 80, 2)
  glow.position.y = 15
  body.add(shroud, emberCore, glow)
  group.add(body)
  group.scale.setScalar(0.8 * scale)
  return { group, refs: { body } }
}

/** Пепельная Мать — высокая обугленная фигура с тлеющим нутром. */
function buildAshMother(): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(16, 44, 9, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x3a3430,
      emissive: 0xb04a20,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      roughness: 0.95,
    }),
  )
  robe.position.y = 24
  robe.castShadow = true
  const cowl = new THREE.Mesh(new THREE.ConeGeometry(6.5, 10, 7), mat(0x26221f))
  cowl.position.set(0, 47, 0)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffb04a })
  for (const sz of [-2.6, 2.6]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 4), eyeMat)
    eye.position.set(4.4, 46, sz)
    body.add(eye)
  }
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: 0.85 }),
  )
  core.position.set(0, 30, 2)
  const glow = new THREE.PointLight(0xd05a20, 170, 200, 2)
  glow.position.y = 30
  // Рога-крона из пепла
  for (const [hx, hz, hr] of [[-4.5, 0, 0.7], [4.5, 0, -0.7], [0, 4.5, 0]]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(1.6, 10, 5), mat(0x1e1a17))
    horn.position.set(hx, 52, hz)
    horn.rotation.z = hr
    body.add(horn)
  }
  body.add(robe, cowl, core, glow)
  group.add(body)
  group.scale.setScalar(1.45)
  return { group, refs: { body } }
}

// ---------------- Гранит: скорпион / Мастер Ямы (Фаза 6) ----------------

/** Гранитный скорпион: панцирь, клешни, хвост-коса. Морда по +X. */
function buildScorpion(scale = 1): { group: THREE.Group; refs: { body: THREE.Object3D; tail: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const shell = mat(0x7a7160)
  const shellDark = mat(0x5c544a)
  const trunk = new THREE.Mesh(new THREE.SphereGeometry(6.4, 10, 8), shell)
  trunk.scale.set(1.35, 0.8, 1)
  trunk.position.y = 4.6
  trunk.castShadow = true
  const rump = new THREE.Mesh(new THREE.SphereGeometry(4.6, 8, 6), shellDark)
  rump.scale.set(1.1, 0.85, 1)
  rump.position.x = -5.4
  rump.position.y = 4.2
  // Клешни
  for (const sz of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 5.4, 3, 5), shell)
    arm.rotation.x = Math.PI / 2
    arm.position.set(6.4, 3.4, sz * 4.6)
    const claw = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 3.4), shellDark)
    claw.position.set(10.6, 3.4, sz * 5.4)
    body.add(arm, claw)
  }
  // Хвост-коса над спиной
  const tail = new THREE.Group()
  let seg = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 5, 3, 5), shellDark)
  seg.rotation.x = Math.PI / 2
  seg.position.x = -4
  tail.add(seg)
  let prev = tail
  for (let i = 1; i < 4; i++) {
    const joint = new THREE.Group()
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(1.5 - i * 0.14, 4.6, 3, 5), shellDark)
    s.rotation.x = Math.PI / 2
    s.position.x = -4.4
    joint.add(s)
    joint.position.x = -4.4
    joint.rotation.z = -0.42 // сегменты загибаются вверх дугой
    prev.add(joint)
    prev = joint
  }
  const sting = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 5), mat(0xd9a441))
  sting.position.x = -3.4
  sting.rotation.z = Math.PI / 2
  prev.add(sting)
  tail.position.set(-4, 7, 0)
  tail.rotation.z = 0.55
  // Глаза
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9a441 })
  for (const sz of [-2.2, 2.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 4), eyeMat)
    eye.position.set(5.4, 6.4, sz)
    body.add(eye)
  }
  // Ноги
  for (const [lx, lz] of [[-2, 5.6], [-2, -5.6], [2.6, 5.2], [2.6, -5.2], [-5, 4.6], [-5, -4.6]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 4.4, 3, 4), shellDark)
    leg.position.set(lx, 1.8, lz)
    body.add(leg)
  }
  body.add(trunk, rump, tail)
  group.add(body)
  group.scale.setScalar(0.85 * scale)
  return { group, refs: { body, tail } }
}

// ---------------- Пределье: драугр / тролль / дракон (Фаза 6.2) ----------------

/** Драугр: мёртвый воин в истлевшей броне с тусклым клинком. */
function buildDraugr(): { group: THREE.Group; refs: HumanoidRefs } {
  const built = buildHumanoid('#6a7a6a', 0x9aa89a, { helmet: true, sword: true })
  // Гнилые лохмотья-накидка
  const rag = new THREE.Mesh(
    new THREE.ConeGeometry(7.4, 16, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x3c443c, roughness: 0.98, side: THREE.DoubleSide }),
  )
  rag.position.y = 9
  built.group.add(rag)
  // Ледяные глаза
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xbfe3ea })
  for (const sz of [-1.7, 1.7]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 4), eyeMat)
    eye.position.set(0, 29.4, sz)
    built.group.add(eye)
  }
  return built
}

/** Стылый тролль: гора белой шерсти на двух кулаках. */
function buildFrostTroll(): { group: THREE.Group; refs: HumanoidRefs } {
  const built = buildHumanoid('#d8dcd4', 0xb8b4a4, { scale: 1.55 })
  // Шерстяная грива
  const mane = new THREE.Mesh(new THREE.SphereGeometry(6.4, 9, 7), mat(0xe4e8e0))
  mane.position.set(0, 28.5, -1.4)
  mane.scale.set(1.15, 0.8, 1)
  built.group.add(mane)
  // Морозные наросты на плечах
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xc8dfe2, emissive: 0x9fd8d8, emissiveIntensity: 0.25, roughness: 0.3 })
  for (const sz of [-1, 1]) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 5), iceMat)
    shard.position.set(sz * 9.4, 27, 0)
    shard.rotation.z = sz * 0.5
    built.group.add(shard)
  }
  return built
}

// ---------------- Мара: упырь / абом / Мор-Мать (Фаза 6.3) ----------------

/** Мор-упырь: сгорбленный бегун в багровой корке, глаза — угли скверны. */
function buildGhoul(): { group: THREE.Group; refs: HumanoidRefs } {
  const built = buildHumanoid('#8a5a4a', 0x9a6a56, { scale: 0.95 })
  // горб скверны на спине
  const hump = new THREE.Mesh(new THREE.SphereGeometry(5.2, 8, 6), mat(0x5a2a22, { roughness: 0.55 }))
  hump.position.set(0, 21, -3.4)
  hump.scale.set(1.2, 0.8, 1)
  built.group.add(hump)
  // багровые прожилки на торсе
  const veins = new THREE.Mesh(
    new THREE.SphereGeometry(5.4, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a1a12, emissive: 0xc93a24, emissiveIntensity: 0.5, roughness: 0.4 }),
  )
  veins.position.set(0, 19.5, 2.2)
  veins.scale.set(0.72, 0.5, 0.42)
  built.group.add(veins)
  // глаза-угли
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff7a3a })
  for (const sz of [-1.7, 1.7]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), eyeMat)
    eye.position.set(0, 27.8, sz)
    built.group.add(eye)
  }
  return built
}

/** Мор-абом: сросшаяся громила — осадный таран Мары. */
function buildAbomination(): { group: THREE.Group; refs: HumanoidRefs } {
  const built = buildHumanoid('#6a4238', 0x8a5a48, { scale: 1.75, horns: true })
  // сросшиеся наросты-коконы на плечах
  const flesh = new THREE.MeshStandardMaterial({ color: 0x5a1a14, emissive: 0xb03a20, emissiveIntensity: 0.42, roughness: 0.45 })
  for (const sz of [-1, 1]) {
    const cocoon = new THREE.Mesh(new THREE.SphereGeometry(5.6, 9, 7), flesh)
    cocoon.position.set(sz * 10.4, 27, -1.2)
    cocoon.scale.set(1.15, 0.85, 0.95)
    built.group.add(cocoon)
  }
  // брюшной мешок скверны
  const sack = new THREE.Mesh(new THREE.SphereGeometry(7.4, 9, 7), flesh)
  sack.position.set(0, 13.5, 3.4)
  sack.scale.set(1.1, 1.15, 0.75)
  built.group.add(sack)
  return built
}

/** Мор-Мать: брющной мешок Мары. Морда по +X, тело — refs.body. */
function buildBlightMother(): { group: THREE.Group; refs: { body: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x4a1610, emissive: 0xb03a20, emissiveIntensity: 0.4, roughness: 0.5 })
  const crustMat = mat(0x3a1210, { roughness: 0.7 })

  // Брющной мешок — главный объём
  const bulk = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 10), fleshMat)
  bulk.scale.set(1.35, 1.05, 1.1)
  bulk.position.y = 11
  bulk.castShadow = true
  // корка-панцирь сверху
  const shell = new THREE.Mesh(new THREE.SphereGeometry(11.4, 12, 8), crustMat)
  shell.scale.set(1.3, 0.62, 1.06)
  shell.position.y = 14.5
  // «голова»-отросток вперёд
  const snout = new THREE.Mesh(new THREE.ConeGeometry(4.4, 12, 7), crustMat)
  snout.rotation.z = -Math.PI / 2
  snout.position.set(14.5, 12.5, 0)
  // глаза-угли
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6a2a })
  for (const sz of [-3.4, 3.4]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 4), eyeMat)
    eye.position.set(17.5, 13.5, sz)
    body.add(eye)
  }
  // щупальца по бокам и сзади
  const tendrils: Array<[number, number, number]> = [
    [-8, 8, -8], [-8, 8, 8], [-13, 7, 0], [0, 8, -11], [0, 8, 11], [6, 9, -9.5],
  ]
  for (const [tx, ty, tz] of tendrils) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(1.9, 11, 5), fleshMat)
    t.position.set(tx, ty - 2, tz)
    t.rotation.z = Math.PI - 0.5 + Math.random() * 0.4
    t.rotation.x = Math.atan2(tz, tx)
    body.add(t)
  }
  // светящееся ядро скверны в брюхе
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xd94a30, transparent: true, opacity: 0.85 }),
  )
  core.position.set(0, 9.5, 6.5)
  const glow = new THREE.PointLight(0xc93820, 160, 190, 2)
  glow.position.y = 12
  body.add(bulk, shell, snout, core, glow)
  group.add(body)
  group.scale.setScalar(1.5)
  return { group, refs: { body } }
}

/** Иммолтакс: крылатая тень Стылого Пределья. Морда по +X, тело — refs.body (высота полёта правит движок). */
function buildDragon(): { group: THREE.Group; refs: { body: THREE.Object3D; wingL: THREE.Object3D; wingR: THREE.Object3D; tail: THREE.Object3D } } {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const scaleMat = mat(0x4a3230, { roughness: 0.72 })
  const scaleDark = mat(0x33221f)
  const emberMat = new THREE.MeshStandardMaterial({ color: 0x6a2a20, emissive: 0xd05a20, emissiveIntensity: 0.5, roughness: 0.5 })

  // Корпус
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(7.2, 20, 4, 9), scaleMat)
  trunk.rotation.x = Math.PI / 2
  trunk.position.y = 14
  trunk.castShadow = true
  // Шея вверх-вперёд
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(3.1, 13, 3, 7), scaleMat)
  neck.position.set(13, 22, 0)
  neck.rotation.z = -0.7
  // Голова с пастью и рогами
  const head = new THREE.Mesh(new THREE.ConeGeometry(3.4, 11, 7), scaleMat)
  head.position.set(21, 28, 0)
  head.rotation.z = -Math.PI / 2 + 0.12
  head.castShadow = true
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 6), scaleDark)
  jaw.position.set(23.5, 26, 0)
  jaw.rotation.z = -Math.PI / 2 - 0.2
  const glow = new THREE.PointLight(0xd05a20, 110, 130, 2)
  glow.position.set(24, 27, 0)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffb04a })
  for (const sz of [-2.2, 2.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 4), eyeMat)
    eye.position.set(19.5, 29.5, sz)
    body.add(eye)
  }
  for (const sz of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5.5, 5), scaleDark)
    horn.position.set(18, 31.5, sz * 2.2)
    horn.rotation.z = -0.5
    horn.rotation.x = sz * 0.4
    body.add(horn)
  }
  // Хвост: сегменты назад
  const tail = new THREE.Group()
  let prev: THREE.Object3D = tail
  for (let i = 0; i < 4; i++) {
    const joint = new THREE.Group()
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(2.4 - i * 0.5, 7 - i * 0.8, 3, 6), i % 2 ? scaleDark : scaleMat)
    s.rotation.x = Math.PI / 2
    s.position.x = -4.4
    joint.add(s)
    joint.position.x = i === 0 ? -12 : -7.6
    prev.add(joint)
    prev = joint
  }
  const tailFin = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 4), emberMat)
  tailFin.rotation.z = Math.PI / 2
  tailFin.position.x = -3
  prev.add(tailFin)
  tail.position.y = 15
  // Крылья: кожистая перепонка на костях
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x55322c, roughness: 0.85, side: THREE.DoubleSide })
  const makeWing = (side: 1 | -1) => {
    const wing = new THREE.Group()
    const bone1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 12, 3, 5), scaleDark)
    bone1.rotation.x = Math.PI / 2
    bone1.position.set(-2, 0, side * 6)
    const bone2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 10, 3, 5), scaleDark)
    bone2.rotation.x = Math.PI / 2
    bone2.rotation.z = side * 0.55
    bone2.position.set(-4, 0.5, side * 12)
    const membrane = new THREE.Mesh(new THREE.PlaneGeometry(22, 15), wingMat)
    membrane.rotation.x = -Math.PI / 2
    membrane.rotation.z = side * 0.35
    membrane.position.set(-5, 0.6, side * 10.5)
    wing.add(bone1, bone2, membrane)
    wing.position.set(3, 19, 0)
    return wing
  }
  const wingL = makeWing(-1)
  const wingR = makeWing(1)
  // Лапы
  for (const [lx, lz] of [[6, 4.6], [6, -4.6], [-4, 5], [-4, -5]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 7, 3, 6), scaleDark)
    leg.position.set(lx, 6, lz)
    body.add(leg)
  }
  // Грудное свечение (древний огонь внутри)
  const core = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), emberMat)
  core.position.set(4, 14, 0)
  body.add(trunk, neck, head, jaw, glow, tail, core, wingL, wingR)
  group.add(body)
  group.scale.setScalar(1.35)
  return { group, refs: { body, wingL, wingR, tail } }
}

/** Мастер Ямы: кряжистый боец в цепях с импровизированной косой-цепом. */
function buildPitMaster(): { group: THREE.Group; refs: HumanoidRefs } {
  const built = buildHumanoid('#8a6a3a', 0xb08858, { sword: true, scale: 1.9 })
  // Наплечники-обрезки + цепь на поясе
  const iron = mat(0x6a6a70, { metalness: 0.5, roughness: 0.45 })
  for (const sz of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(4.4, 8, 6), iron)
    pad.position.set(sz * 7.6, 21.5, 0)
    pad.scale.set(1, 0.7, 1)
    built.group.add(pad)
  }
  const chain = new THREE.Mesh(new THREE.TorusGeometry(6.4, 1.1, 6, 18), iron)
  chain.rotation.x = Math.PI / 2
  chain.position.y = 14
  built.group.add(chain)
  return built
}

// ---------------- Аватар сущности ----------------

export class Avatar {
  group = new THREE.Group()
  private refs: Partial<HumanoidRefs & WolfRefs & { body: THREE.Object3D }> = {}
  private mats: MatEntry[] = []
  private hpBar: HpBar
  private deadTilt = 0
  private eid: number
  /** Модель собрана «мордой по +X» (звери/хоррор) — формула поворота другая. */
  private forwardX = false
  /** Текущая высота полёта дракона (для плавного захода на посадку). */
  private dragonAlt = 1

  constructor(e: Entity) {
    this.eid = e.eid
    const arch = this.archetype(e)
    let built: { group: THREE.Group; refs: object }
    switch (arch) {
      case 'player':
        built = buildHumanoid(e.color, 0xc9a07a, { hood: true, sword: true })
        break
      case 'companion':
        built = e.id === 'kaya'
          ? buildHumanoid(e.color, 0xc9a07a, { hood: true, staff: true })
          : buildHumanoid(e.color, 0xc9a07a, { sword: true, scale: 1.15 })
        break
      case 'npc':
        built = buildHumanoid(e.color, 0xc9a07a, { scale: 1 })
        break
      case 'wolf':
        built = buildWolf(1)
        break
      case 'alpha':
        built = buildWolf(1.65, true)
        break
      case 'bandit':
        built = buildHumanoid(e.color, 0xbfa07a, { bandana: 0xa03a2a, sword: true })
        break
      case 'archer':
        built = buildHumanoid(e.color, 0xbfa07a, { bandana: 0x6a5a30 })
        break
      case 'captain':
        built = buildHumanoid(e.color, 0xbfa07a, { helmet: true, sword: true, scale: 1.25 })
        break
      case 'horror':
        built = buildHorror(1)
        break
      case 'bogling':
        built = buildBogling(1)
        break
      case 'ash_shade':
        built = buildAshShade(1)
        break
      case 'ash_mother':
        built = buildAshMother()
        break
      case 'scorpion':
        built = buildScorpion(1)
        break
      case 'pit_master':
        built = buildPitMaster()
        break
      case 'draugr':
        built = buildDraugr()
        break
      case 'frost_troll':
        built = buildFrostTroll()
        break
      case 'ghoul':
        built = buildGhoul()
        break
      case 'abomination':
        built = buildAbomination()
        break
      case 'blight_mother':
        built = buildBlightMother()
        break
      case 'dragon':
        built = buildDragon()
        break
      case 'boss':
        built = buildHumanoid(e.color, 0x6a5a5a, { horns: true, sword: true, scale: 2.5 })
        break
      default:
        built = buildHumanoid(e.color, 0xbfa07a)
        break
    }
    // Переносим содержимое собранной группы в свою
    while (built.group.children.length) {
      const c = built.group.children[0]
      this.group.add(c)
    }
    this.group.scale.copy(built.group.scale)
    this.refs = built.refs as Avatar['refs']
    this.forwardX =
      arch === 'wolf' || arch === 'alpha' || arch === 'horror' ||
      arch === 'bogling' || arch === 'ash_shade' || arch === 'ash_mother' ||
      arch === 'scorpion' || arch === 'dragon' || arch === 'blight_mother'
    this.mats = collectMats(this.group)
    this.hpBar = new HpBar()
    this.group.add(this.hpBar.obj)
    this.group.userData.eid = e.eid
  }

  private archetype(e: Entity):
    | 'player'
    | 'companion'
    | 'npc'
    | 'wolf'
    | 'alpha'
    | 'bandit'
    | 'archer'
    | 'captain'
    | 'horror'
    | 'bogling'
    | 'ash_shade'
    | 'ash_mother'
    | 'scorpion'
    | 'pit_master'
    | 'draugr'
    | 'frost_troll'
    | 'ghoul'
    | 'abomination'
    | 'blight_mother'
    | 'dragon'
    | 'boss'
    | 'humanoid' {
    if (e.kind === 'player') return 'player'
    if (e.kind === 'companion') return 'companion'
    if (e.kind === 'npc') return 'npc'
    switch (e.enemyType) {
      case 'wolf': return 'wolf'
      case 'alpha': return 'alpha'
      case 'bandit': return 'bandit'
      case 'archer': return 'archer'
      case 'captain': return 'captain'
      case 'horror': return 'horror'
      case 'bogling': return 'bogling'
      case 'ash_shade': return 'ash_shade'
      case 'ash_mother': return 'ash_mother'
      case 'scorpion': return 'scorpion'
      case 'pit_master': return 'pit_master'
      case 'draugr': return 'draugr'
      case 'frost_troll': return 'frost_troll'
      case 'ghoul': return 'ghoul'
      case 'abomination': return 'abomination'
      case 'blight_mother': return 'blight_mother'
      case 'dragon': return 'dragon'
      case 'boss': return 'boss'
      default: return 'humanoid'
    }
  }

  /** Кадровое обновление: позиция, поворот, анимация. */
  update(e: Entity, time: number, camera: THREE.Camera, isTarget: boolean) {
    const h = heightAt(e.pos.x, e.pos.y)
    const speed = Math.hypot(e.vel.x, e.vel.y)
    const moving = speed > 6

    // Позиция и поворот (facing — угол в плоскости мира).
    // Humanoid смотрит по локальной +Z (поворот π/2 − facing),
    // звери/хоррор — по локальной +X (поворот −facing), иначе бегут боком.
    this.group.position.set(e.pos.x, h, e.pos.y)
    const targetRot = this.forwardX ? -e.facing : Math.PI / 2 - e.facing
    let dr = targetRot - this.group.rotation.y
    while (dr > Math.PI) dr -= Math.PI * 2
    while (dr < -Math.PI) dr += Math.PI * 2
    this.group.rotation.y += dr * Math.min(1, dt10())

    // Смерть: заваливание набок + оглушение-дёргание + наклон рывка (Фаза 2)
    const tiltTarget = e.alive ? 0 : 1.45
    this.deadTilt += (tiltTarget - this.deadTilt) * 0.08
    const stunned = e.alive && e.stunT > 0
    const dashing = e.alive && (e.dashT ?? 0) > 0
    this.group.rotation.z = this.deadTilt * 0.5 + (stunned ? Math.sin(time * 14) * 0.05 : 0)
    this.group.rotation.x = -this.deadTilt * 0.2 + (dashing ? -0.3 : 0)

    // Шаг
    const swing = moving ? Math.sin(e.walkPhase * 7) * 0.55 : Math.sin(time * 1.6) * 0.05
    if (this.refs.legs) {
      // зверь: лапы качаются вдоль корпуса (вокруг локальной Z, морда по +X)
      this.refs.legs.forEach((leg, i) => {
        leg.rotation.z = moving ? Math.sin(e.walkPhase * 9 + (i % 2 ? Math.PI : 0)) * 0.6 : 0
      })
      if (this.refs.body) {
        this.refs.body.position.y = moving ? Math.abs(Math.sin(e.walkPhase * 9)) * 1.1 : 0
        // Прыжок-выпад зверя при атаке (вперёд по локальной +X)
        this.refs.body.position.x = e.attackT > 0 ? Math.sin((1 - e.attackT / 0.28) * Math.PI) * 7 : 0
      }
    } else if (this.refs.legL && this.refs.legR) {
      this.refs.legL.rotation.x = swing
      this.refs.legR.rotation.x = -swing
      if (this.refs.torso) {
        this.refs.torso.position.y = 14 + (moving ? Math.abs(Math.sin(e.walkPhase * 7)) * 1.4 : Math.sin(time * 1.6) * 0.4)
        // Выпад атаки корпусом вперёд (humanoid смотрит по локальной +Z)
        this.refs.torso.position.z = e.attackT > 0 ? Math.sin((1 - e.attackT / 0.28) * Math.PI) * 6 : 0
        const windingSlam = e.alive && e.slamT > 0
        const windingCharge = e.alive && (e.chargeT ?? 0) > 0
        this.refs.torso.rotation.x = windingCharge ? -0.14 : windingSlam ? 0.12 : 0
      }
    }

    // Выпад атаки / каст / телеграфные позы босса (Фаза 2)
    if (this.refs.armR) {
      if (e.alive && e.slamT > 0) {
        // Замах слэма: клинок вскинут над головой и дрожит — читается издалека
        this.refs.armR.rotation.x = -2.5 + Math.sin(time * 30) * 0.06
      } else if (e.alive && (e.chargeT ?? 0) > 0) {
        // Замах рывка: занос назад, корпус сжался
        this.refs.armR.rotation.x = 1.15
      } else if (e.castT > 0) {
        this.refs.armR.rotation.x = -2.2
      } else if (e.attackT > 0) {
        this.refs.armR.rotation.x = -1.4 + (0.28 - e.attackT) * 12
      } else {
        this.refs.armR.rotation.x = moving ? Math.sin(e.walkPhase * 7 + Math.PI) * 0.4 : 0
      }
    }

    // Порождение Разлома/пепельные парят; болотник скачет
    if (this.refs.body && (e.enemyType === 'horror' || e.enemyType === 'ash_shade' || e.enemyType === 'ash_mother')) {
      const hover = e.enemyType === 'ash_mother' ? 10 : 6
      const amp = e.enemyType === 'ash_mother' ? 2.8 : 2.4
      this.refs.body.position.y = hover + Math.sin(time * 2.2 + this.eid) * amp
      this.refs.body.rotation.y = Math.sin(time * 1.1) * 0.25
    } else if (this.refs.body && e.enemyType === 'bogling') {
      this.refs.body.position.y = moving ? Math.abs(Math.sin(e.walkPhase * 10)) * 3.4 : Math.sin(time * 3 + this.eid) * 0.8
      this.refs.body.rotation.x = moving ? Math.sin(e.walkPhase * 10) * 0.14 : 0
    } else if (this.refs.body && e.enemyType === 'scorpion') {
      // Скорпион: семенит низко, хвост покачивается, при замахе хвост заносятся вперёд
      this.refs.body.position.y = moving ? Math.abs(Math.sin(e.walkPhase * 12)) * 0.9 : Math.sin(time * 2 + this.eid) * 0.4
      const tail = (this.refs as { tail?: THREE.Object3D }).tail
      if (tail) {
        tail.rotation.z = 0.55 + (e.attackT > 0 ? Math.sin((1 - e.attackT / 0.28) * Math.PI) * 0.5 : Math.sin(time * 1.7 + this.eid) * 0.1)
      }
    }

    // Фаза 6.2: дракон — высота полёта по cds['alt'] (лерп движка), взмахи крыльев, хвост
    if (this.refs.body && e.enemyType === 'dragon') {
      const alt = e.cds['alt'] ?? 0
      this.dragonAlt += (alt - this.dragonAlt) * 0.12
      const hover = 14 + this.dragonAlt * 40
      this.refs.body.position.y = hover + (this.dragonAlt > 0.5 ? Math.sin(time * 2.4) * 1.6 : 0)
      const flap = this.dragonAlt > 0.5 ? Math.sin(time * 7.5) * 0.55 : Math.sin(time * 1.4) * 0.06
      const wings = this.refs as unknown as { wingL?: THREE.Object3D; wingR?: THREE.Object3D }
      if (wings.wingL) wings.wingL.rotation.z = flap
      if (wings.wingR) wings.wingR.rotation.z = -flap
      const tailRef = (this.refs as unknown as { tail?: THREE.Object3D }).tail
      if (tailRef) tailRef.rotation.z = Math.sin(time * 1.6) * 0.14
    }

    // Вспышка урона
    const flash = e.hitT > 0 ? 1.6 : 0
    for (const entry of this.mats) {
      if (flash > 0) {
        entry.m.emissive.setRGB(flash * 0.4, 0.02, 0.02)
        entry.m.emissiveIntensity = 1
      } else {
        entry.m.emissive.copy(entry.baseEmissive)
        entry.m.emissiveIntensity = entry.baseIntensity
      }
    }

    // HP-бар
    const show = e.kind !== 'player' && (isTarget || (e.hp < e.maxHp && e.alive) || e.kind === 'enemy')
    this.hpBar.update(camera, this.group.position, e.hp / e.maxHp, !!show, !!e.boss)
  }

  dispose() {
    this.hpBar.dispose()
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else if (m) m.dispose()
    })
  }
}

/** Плавный коэффициент поворота (константа вместо dt-замыкания). */
function dt10(): number {
  return 0.18
}

// ---------------- HP-бар (биллборд) ----------------

class HpBar {
  obj = new THREE.Group()
  private fg: THREE.Mesh
  private fgMat: THREE.MeshBasicMaterial
  private canvas: HTMLCanvasElement | null = null

  constructor() {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.75, depthTest: false }),
    )
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x8fbf6a, depthTest: false })
    this.fg = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.4), this.fgMat)
    this.fg.position.z = 0.01
    this.obj.add(bg, this.fg)
    this.obj.renderOrder = 10
    this.obj.visible = false
    this.obj.position.y = 30
  }

  update(camera: THREE.Camera, pos: THREE.Vector3, ratio: number, show: boolean, boss: boolean) {
    if (!show) {
      this.obj.visible = false
      return
    }
    this.obj.visible = true
    this.obj.position.y = boss ? 66 : 30
    // Биллборд: повернуться к камере
    this.obj.quaternion.copy(camera.quaternion)
    const r = Math.max(0, Math.min(1, ratio))
    this.fg.scale.x = Math.max(0.001, r)
    this.fg.position.x = -(18 * (1 - r)) / 2
    this.fgMat.color.setRGB(0.56 + (1 - r) * 0.44, 0.75 * r + 0.1, 0.3 * r + 0.05)
  }

  dispose() {
    this.obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | undefined
      if (m) m.dispose()
    })
  }
}

export class AvatarFactory {
  private map = new Map<number, Avatar>()
  private parent: THREE.Group

  constructor(parent: THREE.Group) {
    this.parent = parent
  }

  /** Синхронизация пула аватаров со списком сущностей. */
  sync(entities: Entity[]): Map<number, Avatar> {
    const seen = new Set<number>()
    for (const e of entities) {
      seen.add(e.eid)
      if (!this.map.has(e.eid)) {
        const av = new Avatar(e)
        this.map.set(e.eid, av)
        this.parent.add(av.group)
      }
    }
    for (const [eid, av] of this.map) {
      if (!seen.has(eid)) {
        av.dispose()
        this.parent.remove(av.group)
        this.map.delete(eid)
      }
    }
    return this.map
  }

  dispose() {
    for (const av of this.map.values()) av.dispose()
    this.map.clear()
  }
}

export { UP }
