// ============================================================
// ЭХО РАЗЛОМА — 3D-террейн (Phase 1)
// Чанковый heightmap-меш с vertex colors, вода Озера Лун,
// градиентное небо. Запекается один раз на игру.
// ============================================================

import * as THREE from 'three'
import { LAKE, POOLS, WORLD } from '../data/world'
import { heightAt, terrainColorAt, WATER_LEVEL } from './heightmap'

const CHUNK_X = 8
// Мир вытянут на юг (Вельд) — считаем чанки так, чтобы размер куска остался ~400
const CHUNK_Z = Math.max(6, Math.round((WORLD.h / WORLD.w) * CHUNK_X))
const SEG = 30 // сегментов на чанк по оси

export class Terrain {
  group = new THREE.Group()
  private chunks: THREE.Mesh[] = []
  private water!: THREE.Mesh
  private waterMat!: THREE.MeshStandardMaterial
  private poolMats: THREE.MeshStandardMaterial[] = []

  constructor() {
    this.buildChunks()
    this.buildWater()
    this.buildPools()
  }

  private buildChunks() {
    const cw = WORLD.w / CHUNK_X
    const ch = WORLD.h / CHUNK_Z
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
    const color: [number, number, number] = [0, 0, 0]

    for (let cx = 0; cx < CHUNK_X; cx++) {
      for (let cz = 0; cz < CHUNK_Z; cz++) {
        const geo = new THREE.PlaneGeometry(cw, ch, SEG, SEG)
        geo.rotateX(-Math.PI / 2)
        const pos = geo.attributes.position as THREE.BufferAttribute
        const colors = new Float32Array(pos.count * 3)
        const ox = cx * cw
        const oz = cz * ch
        for (let i = 0; i < pos.count; i++) {
          const lx = pos.getX(i)
          const lz = pos.getZ(i)
          const wx = ox + lx + cw / 2
          const wz = oz + lz + ch / 2
          const h = heightAt(wx, wz)
          pos.setY(i, h)
          terrainColorAt(wx, wz, h, color)
          colors[i * 3] = color[0]
          colors[i * 3 + 1] = color[1]
          colors[i * 3 + 2] = color[2]
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geo.computeVertexNormals()
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(ox + cw / 2, 0, oz + ch / 2)
        mesh.receiveShadow = true
        mesh.matrixAutoUpdate = false
        mesh.updateMatrix()
        this.chunks.push(mesh)
        this.group.add(mesh)
      }
    }
  }

  private buildWater() {
    const geo = new THREE.CircleGeometry(LAKE.r + 26, 48)
    geo.rotateX(-Math.PI / 2)
    this.waterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.11, 0.22, 0.23),
      transparent: true,
      opacity: 0.86,
      roughness: 0.15,
      metalness: 0.1,
    })
    this.water = new THREE.Mesh(geo, this.waterMat)
    this.water.position.set(LAKE.x, WATER_LEVEL, LAKE.y)
    this.group.add(this.water)
  }

  /** Тинистые омуты Гнилых Топей (Фаза 3). */
  private buildPools() {
    for (const p of POOLS) {
      const geo = new THREE.CircleGeometry(p.r + 6, 28)
      geo.rotateX(-Math.PI / 2)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.13, 0.16, 0.1),
        transparent: true,
        opacity: 0.92,
        roughness: 0.32,
        metalness: 0.05,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(p.x, WATER_LEVEL - 0.3, p.y)
      this.group.add(mesh)
      this.poolMats.push(mat)
    }
  }

  /** Лёгкая анимация воды (вызывается каждый кадр). */
  update(time: number) {
    this.water.position.y = WATER_LEVEL + Math.sin(time * 0.8) * 0.07
    const rip = 0.8 + Math.sin(time * 1.7) * 0.08
    this.waterMat.roughness = rip
    for (let i = 0; i < this.poolMats.length; i++) {
      this.poolMats[i].roughness = 0.3 + Math.sin(time * 1.1 + i * 1.7) * 0.1
    }
  }

  dispose() {
    for (const c of this.chunks) c.geometry.dispose()
    this.water.geometry.dispose()
    this.waterMat.dispose()
    for (const m of this.poolMats) m.dispose()
  }
}

/** Градиентное небо-сфера (без текстур). */
export function buildSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(4200, 24, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0.42, 0.5, 0.56) },
      horizon: { value: new THREE.Color(0.82, 0.8, 0.7) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vPos;
      void main() {
        float t = clamp(normalize(vPos).y * 1.4 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, t), 1.0);
      }
    `,
  })
  const sky = new THREE.Mesh(geo, mat)
  sky.frustumCulled = false
  return sky
}
