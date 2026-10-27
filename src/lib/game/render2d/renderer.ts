import { Entity, Floater, Particle, PropDef, Vec } from '../types'
import { AREA_MARKERS, LAKE, POOLS, RIDGE, ROADS, WORLD, GRIDGE, COLONY, PIT, SHARD, FRIDGE, HAVEN, ROOST } from '../data/world'

// ---------------- Терен (запекается один раз) ----------------

export function bakeTerrain(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = WORLD.w
  c.height = WORLD.h
  const ctx = c.getContext('2d') as CanvasRenderingContext2D

  // База — тёмная северная тайга
  ctx.fillStyle = '#39472c'
  ctx.fillRect(0, 0, WORLD.w, WORLD.h)

  // Шумовые пятна
  let seed = 99
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * WORLD.w
    const y = rnd() * WORLD.h
    const r = 14 + rnd() * 60
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(47,58,36,0.35)' : 'rgba(72,88,48,0.25)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Снежная дымка на севере
  for (let i = 0; i < 500; i++) {
    const x = rnd() * WORLD.w
    const y = rnd() * 700
    ctx.fillStyle = 'rgba(220,225,215,0.05)'
    ctx.beginPath()
    ctx.arc(x, y, 20 + rnd() * 70, 0, Math.PI * 2)
    ctx.fill()
  }

  // Зона Разлома — пепел и трещины
  const rg = ctx.createRadialGradient(2950, 280, 60, 2950, 280, 420)
  rg.addColorStop(0, 'rgba(74,58,80,0.95)')
  rg.addColorStop(0.6, 'rgba(64,50,70,0.6)')
  rg.addColorStop(1, 'rgba(64,50,70,0)')
  ctx.fillStyle = rg
  ctx.fillRect(2500, -140, 800, 840)
  for (let i = 0; i < 26; i++) {
    const x = 2720 + rnd() * 480
    const y = 100 + rnd() * 420
    ctx.strokeStyle = 'rgba(150,100,190,0.30)'
    ctx.lineWidth = 1 + rnd() * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70)
    ctx.lineTo(x + (rnd() - 0.5) * 110, y + (rnd() - 0.5) * 110)
    ctx.stroke()
  }

  // Дороги
  const drawRoad = (pts: { x: number; y: number }[], w1: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = w1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  for (const road of ROADS) drawRoad(road, 40, 'rgba(96,78,52,0.85)')
  for (const road of ROADS) drawRoad(road, 26, 'rgba(122,101,68,0.9)')

  // Площадь деревни
  ctx.fillStyle = 'rgba(110,90,60,0.85)'
  ctx.beginPath()
  ctx.ellipse(960, 1560, 190, 130, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(130,108,72,0.9)'
  ctx.beginPath()
  ctx.ellipse(960, 1560, 120, 84, 0, 0, Math.PI * 2)
  ctx.fill()

  // Пятно лагеря
  ctx.fillStyle = 'rgba(96,78,52,0.8)'
  ctx.beginPath()
  ctx.ellipse(2590, 1650, 130, 95, 0, 0, Math.PI * 2)
  ctx.fill()

  // Круг Камней Древних
  ctx.fillStyle = 'rgba(105,88,60,0.8)'
  ctx.beginPath()
  ctx.ellipse(2200, 660, 120, 95, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(217,164,65,0.30)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(2200, 660, 92, 74, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Озеро Лун
  ctx.fillStyle = 'rgba(138,122,84,0.55)'
  ctx.beginPath()
  ctx.arc(LAKE.x, LAKE.y, LAKE.r + 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1d3d42'
  ctx.beginPath()
  ctx.arc(LAKE.x, LAKE.y, LAKE.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(23,51,58,0.9)'
  ctx.beginPath()
  ctx.arc(LAKE.x, LAKE.y, LAKE.r - 34, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2
    const rr = 40 + rnd() * (LAKE.r - 60)
    ctx.strokeStyle = 'rgba(190,220,210,0.14)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(LAKE.x + Math.cos(a) * rr, LAKE.y + Math.sin(a) * rr, 14 + rnd() * 20, 0, Math.PI)
    ctx.stroke()
  }

  // --- Фаза 3: Хребет и Вельд ---
  // Хребет — серая полоса гор
  const mg = ctx.createLinearGradient(0, RIDGE.y - 200, 0, RIDGE.y + 200)
  mg.addColorStop(0, 'rgba(74,72,62,0)')
  mg.addColorStop(0.5, 'rgba(86,84,72,0.95)')
  mg.addColorStop(1, 'rgba(74,76,58,0)')
  ctx.fillStyle = mg
  ctx.fillRect(0, RIDGE.y - 200, WORLD.w, 400)
  // Болота — тёмно-торфяная база + пятна тины
  const vg = ctx.createLinearGradient(0, RIDGE.y + 120, 0, WORLD.h)
  vg.addColorStop(0, 'rgba(58,64,42,0.55)')
  vg.addColorStop(1, 'rgba(42,48,32,0.85)')
  ctx.fillStyle = vg
  ctx.fillRect(0, RIDGE.y + 120, WORLD.w, WORLD.h - RIDGE.y - 120)
  for (let i = 0; i < 500; i++) {
    const x = rnd() * WORLD.w
    const y = RIDGE.y + 200 + rnd() * (WORLD.h - RIDGE.y - 260)
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(52,62,38,0.3)' : 'rgba(38,44,30,0.35)'
    ctx.beginPath()
    ctx.arc(x, y, 16 + rnd() * 50, 0, Math.PI * 2)
    ctx.fill()
  }
  // Омуты Топей
  for (const p of POOLS) {
    ctx.fillStyle = 'rgba(40,44,28,0.6)'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r + 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#242c1c'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(76,88,52,0.5)'
    ctx.beginPath()
    ctx.arc(p.x - p.r * 0.2, p.y - p.r * 0.15, p.r * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Фаза 6: Каменный Хребет и Гранитная Долина ---
  // Вертикальный хребет — серая полоса гор
  const gmg = ctx.createLinearGradient(GRIDGE.x - 200, 0, GRIDGE.x + 200, 0)
  gmg.addColorStop(0, 'rgba(84,82,72,0)')
  gmg.addColorStop(0.5, 'rgba(94,92,80,0.95)')
  gmg.addColorStop(1, 'rgba(80,76,62,0)')
  ctx.fillStyle = gmg
  ctx.fillRect(GRIDGE.x - 200, 0, 400, WORLD.h)
  // Пепельная котловина: серая база + пыльные пятна
  const gg = ctx.createLinearGradient(GRIDGE.x + 100, 0, WORLD.w, 0)
  gg.addColorStop(0, 'rgba(86,80,66,0.55)')
  gg.addColorStop(1, 'rgba(64,60,50,0.75)')
  ctx.fillStyle = gg
  ctx.fillRect(GRIDGE.x + 100, 0, WORLD.w - GRIDGE.x - 100, WORLD.h)
  for (let i = 0; i < 420; i++) {
    const x = GRIDGE.x + 240 + rnd() * (WORLD.w - GRIDGE.x - 320)
    const y = rnd() * WORLD.h
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(96,88,70,0.28)' : 'rgba(56,52,44,0.3)'
    ctx.beginPath()
    ctx.arc(x, y, 16 + rnd() * 50, 0, Math.PI * 2)
    ctx.fill()
  }
  // Площадь Колонии
  ctx.fillStyle = 'rgba(104,88,60,0.85)'
  ctx.beginPath()
  ctx.ellipse(COLONY.pos.x, COLONY.pos.y, 185, 130, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(124,104,72,0.9)'
  ctx.beginPath()
  ctx.ellipse(COLONY.pos.x, COLONY.pos.y, 118, 82, 0, 0, Math.PI * 2)
  ctx.fill()
  // Яма: песчаная арена + кольцо частокола
  ctx.fillStyle = 'rgba(150,124,86,0.55)'
  ctx.beginPath()
  ctx.arc(PIT.pos.x, PIT.pos.y, PIT.r + 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a8905e'
  ctx.beginPath()
  ctx.arc(PIT.pos.x, PIT.pos.y, PIT.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(150,124,86,0.5)'
  ctx.beginPath()
  ctx.arc(PIT.pos.x - 24, PIT.pos.y - 18, PIT.r * 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(74,54,38,0.8)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(PIT.pos.x, PIT.pos.y, PIT.r + 14, 0, Math.PI * 2)
  ctx.stroke()
  // Осколочный барьер — пепельное свечение
  const sg = ctx.createRadialGradient(SHARD.pos.x, SHARD.pos.y, 10, SHARD.pos.x, SHARD.pos.y, 200)
  sg.addColorStop(0, 'rgba(180,140,220,0.5)')
  sg.addColorStop(1, 'rgba(180,140,220,0)')
  ctx.fillStyle = sg
  ctx.fillRect(SHARD.pos.x - 200, SHARD.pos.y - 200, 400, 400)

  // --- Фаза 6.2: Стылый Хребет и Стылое Пределье ---
  // Вертикальный хребет — снежные скалы
  const fmg = ctx.createLinearGradient(FRIDGE.x - 200, 0, FRIDGE.x + 200, 0)
  fmg.addColorStop(0, 'rgba(120,122,116,0)')
  fmg.addColorStop(0.5, 'rgba(168,172,168,0.95)')
  fmg.addColorStop(1, 'rgba(140,146,142,0)')
  ctx.fillStyle = fmg
  ctx.fillRect(FRIDGE.x - 200, 0, 400, WORLD.h)
  // Снежная тундра: белая база + проталины
  const fg2 = ctx.createLinearGradient(FRIDGE.x + 100, 0, WORLD.w, 0)
  fg2.addColorStop(0, 'rgba(196,204,202,0.75)')
  fg2.addColorStop(1, 'rgba(214,220,218,0.9)')
  ctx.fillStyle = fg2
  ctx.fillRect(FRIDGE.x + 100, 0, WORLD.w - FRIDGE.x - 100, WORLD.h)
  for (let i = 0; i < 380; i++) {
    const x = FRIDGE.x + 240 + rnd() * (WORLD.w - FRIDGE.x - 320)
    const y = rnd() * WORLD.h
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(158,166,160,0.3)' : 'rgba(228,234,232,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, 16 + rnd() * 50, 0, Math.PI * 2)
    ctx.fill()
  }
  // Площадь Приюта — вытоптанный снег
  ctx.fillStyle = 'rgba(148,140,120,0.6)'
  ctx.beginPath()
  ctx.ellipse(HAVEN.pos.x, HAVEN.pos.y, 165, 115, 0, 0, Math.PI * 2)
  ctx.fill()
  // Драконий Дол — выжженный уголь
  const ro = ctx.createRadialGradient(ROOST.pos.x, ROOST.pos.y, 40, ROOST.pos.x, ROOST.pos.y, ROOST.r)
  ro.addColorStop(0, 'rgba(38,32,28,0.9)')
  ro.addColorStop(0.7, 'rgba(52,44,38,0.55)')
  ro.addColorStop(1, 'rgba(52,44,38,0)')
  ctx.fillStyle = ro
  ctx.beginPath()
  ctx.arc(ROOST.pos.x, ROOST.pos.y, ROOST.r, 0, Math.PI * 2)
  ctx.fill()

  // Тёмная рамка мира
  const edge = 90
  const eg = ctx.createLinearGradient(0, 0, edge, 0)
  eg.addColorStop(0, 'rgba(20,26,16,0.9)')
  eg.addColorStop(1, 'rgba(20,26,16,0)')
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, edge, WORLD.h)
  ctx.save()
  ctx.translate(WORLD.w, 0)
  ctx.scale(-1, 1)
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, edge, WORLD.h)
  ctx.restore()
  const eg2 = ctx.createLinearGradient(0, 0, 0, edge)
  eg2.addColorStop(0, 'rgba(20,26,16,0.9)')
  eg2.addColorStop(1, 'rgba(20,26,16,0)')
  ctx.fillStyle = eg2
  ctx.fillRect(0, 0, WORLD.w, edge)
  ctx.save()
  ctx.translate(0, WORLD.h)
  ctx.scale(1, -1)
  ctx.fillStyle = eg2
  ctx.fillRect(0, 0, WORLD.w, edge)
  ctx.restore()

  return c
}

// ---------------- Пропсы ----------------

export function drawProp(ctx: CanvasRenderingContext2D, p: PropDef, t: number) {
  const { pos } = p
  switch (p.kind) {
    case 'tree': {
      const s = 0.85 + ((p.seed ?? 0) % 30) / 100
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, 16 * s, 6 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3628'
      ctx.fillRect(pos.x - 3, pos.y - 12, 6, 14)
      const layers = [
        { w: 30, h: 34, y: -22 },
        { w: 24, h: 30, y: -44 },
        { w: 17, h: 26, y: -64 },
      ]
      layers.forEach((L, i) => {
        ctx.fillStyle = i === 2 ? '#31523a' : '#26402c'
        ctx.beginPath()
        ctx.moveTo(pos.x - L.w * s, pos.y + L.y * s)
        ctx.lineTo(pos.x + L.w * s, pos.y + L.y * s)
        ctx.lineTo(pos.x, pos.y + (L.y - L.h) * s)
        ctx.closePath()
        ctx.fill()
      })
      // снежная шапка
      ctx.fillStyle = 'rgba(225,230,220,0.5)'
      ctx.beginPath()
      ctx.moveTo(pos.x - 8 * s, pos.y - 74 * s)
      ctx.lineTo(pos.x + 8 * s, pos.y - 74 * s)
      ctx.lineTo(pos.x, pos.y - 88 * s)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'rock': {
      const r = p.r ?? 10
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, r * 1.2, r * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6a6a62'
      ctx.beginPath()
      ctx.moveTo(pos.x - r, pos.y + 2)
      ctx.lineTo(pos.x - r * 0.5, pos.y - r * 1.1)
      ctx.lineTo(pos.x + r * 0.6, pos.y - r * 0.9)
      ctx.lineTo(pos.x + r, pos.y + 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(230,230,225,0.35)'
      ctx.beginPath()
      ctx.moveTo(pos.x - r * 0.5, pos.y - r * 1.1)
      ctx.lineTo(pos.x + r * 0.2, pos.y - r * 0.4)
      ctx.lineTo(pos.x - r * 0.2, pos.y - r * 0.2)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'house': {
      const w = p.w ?? 120
      const h = p.h ?? 70
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + h * 0.45, w * 0.6, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5a4632'
      ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, h)
      ctx.fillStyle = '#4a3826'
      ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, 6)
      ctx.fillStyle = '#7a3b2e'
      ctx.beginPath()
      ctx.moveTo(pos.x - w / 2 - 10, pos.y - h / 2)
      ctx.lineTo(pos.x + w / 2 + 10, pos.y - h / 2)
      ctx.lineTo(pos.x + w * 0.2, pos.y - h / 2 - 34)
      ctx.lineTo(pos.x - w * 0.2, pos.y - h / 2 - 34)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#3a2c1c'
      ctx.fillRect(pos.x - 10, pos.y + h / 2 - 26, 20, 26)
      ctx.fillStyle = '#d9a441'
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + pos.x)
      ctx.fillRect(pos.x + w / 2 - 22, pos.y - 8, 10, 10)
      ctx.globalAlpha = 1
      break
    }
    case 'tent': {
      const w = p.w ?? 60
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 12, w * 0.55, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6d5636'
      ctx.beginPath()
      ctx.moveTo(pos.x - w / 2, pos.y + 12)
      ctx.lineTo(pos.x + w / 2, pos.y + 12)
      ctx.lineTo(pos.x, pos.y - 34)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#59452a'
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y + 12)
      ctx.lineTo(pos.x + w / 2, pos.y + 12)
      ctx.lineTo(pos.x, pos.y - 34)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'stone': {
      const r = p.r ?? 12
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, r * 1.1, r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#70706a'
      ctx.fillRect(pos.x - r * 0.7, pos.y - r * 2.6, r * 1.4, r * 2.6)
      ctx.fillStyle = '#5a5a54'
      ctx.fillRect(pos.x + r * 0.2, pos.y - r * 2.6, r * 0.5, r * 2.6)
      ctx.fillStyle = `rgba(217,164,65,${0.45 + 0.25 * Math.sin(t * 2 + pos.x)})`
      ctx.fillRect(pos.x - 2, pos.y - r * 2.1, 4, 10)
      break
    }
    case 'fire': {
      const flick = Math.sin(t * 9 + pos.x) * 0.5 + 0.5
      const g = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, 70)
      g.addColorStop(0, `rgba(230,150,60,${0.35 + flick * 0.12})`)
      g.addColorStop(1, 'rgba(230,150,60,0)')
      ctx.fillStyle = g
      ctx.fillRect(pos.x - 70, pos.y - 70, 140, 140)
      ctx.fillStyle = '#4a3628'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e08a3a'
      ctx.beginPath()
      ctx.moveTo(pos.x - 7, pos.y)
      ctx.quadraticCurveTo(pos.x, pos.y - 22 - flick * 8, pos.x + 7, pos.y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f5c96b'
      ctx.beginPath()
      ctx.moveTo(pos.x - 4, pos.y)
      ctx.quadraticCurveTo(pos.x, pos.y - 13 - flick * 5, pos.x + 4, pos.y)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'fence': {
      const w = p.w ?? 80
      ctx.strokeStyle = '#5a4632'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(pos.x - w / 2, pos.y - 10)
      ctx.lineTo(pos.x + w / 2, pos.y - 10)
      ctx.moveTo(pos.x - w / 2, pos.y)
      ctx.lineTo(pos.x + w / 2, pos.y)
      ctx.stroke()
      const posts = Math.floor(w / 26)
      for (let i = 0; i <= posts; i++) {
        const px = pos.x - w / 2 + (w / posts) * i
        ctx.fillStyle = '#4a3826'
        ctx.fillRect(px - 2, pos.y - 16, 4, 20)
      }
      break
    }
    case 'dummy': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#7a6544'
      ctx.fillRect(pos.x - 3, pos.y - 30, 6, 34)
      ctx.fillStyle = '#8a7a54'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 36, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#7a6544'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(pos.x - 14, pos.y - 26)
      ctx.lineTo(pos.x + 14, pos.y - 26)
      ctx.stroke()
      break
    }
    case 'stall': {
      const w = p.w ?? 70
      ctx.fillStyle = '#5a4632'
      ctx.fillRect(pos.x - w / 2, pos.y - 14, w, 22)
      ctx.fillStyle = '#d9a441'
      ctx.beginPath()
      ctx.moveTo(pos.x - w / 2 - 6, pos.y - 14)
      ctx.lineTo(pos.x + w / 2 + 6, pos.y - 14)
      ctx.lineTo(pos.x + w / 2 - 2, pos.y - 34)
      ctx.lineTo(pos.x - w / 2 + 2, pos.y - 34)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#b03a2e'
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(pos.x - w / 2 + 2 + i * (w / 4), pos.y - 33, w / 8, 18)
      }
      break
    }
    case 'carcass': {
      ctx.fillStyle = '#8a8078'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y, (p.r ?? 14) * 1.2, (p.r ?? 14) * 0.6, 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#c9c4bc'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(pos.x - 8, pos.y - 4)
      ctx.lineTo(pos.x - 16, pos.y - 14)
      ctx.moveTo(pos.x + 6, pos.y - 6)
      ctx.lineTo(pos.x + 14, pos.y - 16)
      ctx.stroke()
      break
    }
    case 'altar': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 6, 20, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(pos.x, pos.y - 8, 2, pos.x, pos.y - 8, 46)
      g.addColorStop(0, `rgba(217,164,65,${0.3 + pulse * 0.2})`)
      g.addColorStop(1, 'rgba(217,164,65,0)')
      ctx.fillStyle = g
      ctx.fillRect(pos.x - 46, pos.y - 54, 92, 92)
      ctx.fillStyle = '#70706a'
      ctx.fillRect(pos.x - 14, pos.y - 10, 28, 14)
      ctx.fillStyle = '#8a8a82'
      ctx.fillRect(pos.x - 18, pos.y - 18, 36, 10)
      ctx.fillStyle = `rgba(245,201,107,${0.7 + pulse * 0.3})`
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 22, 4 + pulse * 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'rift': {
      const rot = t * 0.8
      ctx.save()
      ctx.translate(pos.x, pos.y)
      const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 120)
      g.addColorStop(0, 'rgba(150,90,200,0.5)')
      g.addColorStop(0.5, 'rgba(110,60,150,0.25)')
      g.addColorStop(1, 'rgba(110,60,150,0)')
      ctx.fillStyle = g
      ctx.fillRect(-120, -120, 240, 240)
      ctx.fillStyle = '#1d1428'
      ctx.beginPath()
      ctx.ellipse(0, -20, 52, 78, 0, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i % 2 ? 'rgba(217,120,65,0.8)' : 'rgba(170,110,220,0.8)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(0, -20, 30 + i * 14, 56 + i * 16, rot + i * 0.9, 0, Math.PI * 1.4)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'barrier': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + pos.x)
      ctx.fillStyle = `rgba(150,100,190,${0.25 + pulse * 0.15})`
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, (p.r ?? 20) + 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3a55'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, p.r ?? 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(200,150,240,${0.5 + pulse * 0.4})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, (p.r ?? 20) + 2, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'shrub': {
      ctx.fillStyle = '#2f4a2c'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2)
      ctx.arc(pos.x + 6, pos.y + 2, 5, 0, Math.PI * 2)
      ctx.arc(pos.x - 6, pos.y + 2, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'flower': {
      ctx.fillStyle = '#3f5a32'
      ctx.fillRect(pos.x - 1, pos.y - 6, 2, 7)
      ctx.fillStyle = (p.seed ?? 0) % 2 ? '#d9c04f' : '#c97a9a'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 8, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    // --- Фаза 3: Вельд ---
    case 'deadtree': {
      const s = 0.85 + ((p.seed ?? 0) % 30) / 100
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, 12 * s, 5 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#3a322a'
      ctx.lineWidth = 4 * s
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(pos.x + 2, pos.y - 26 * s)
      ctx.stroke()
      ctx.lineWidth = 2 * s
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y - 12 * s)
      ctx.lineTo(pos.x - 9 * s, pos.y - 20 * s)
      ctx.moveTo(pos.x + 1, pos.y - 17 * s)
      ctx.lineTo(pos.x + 10 * s, pos.y - 26 * s)
      ctx.stroke()
      break
    }
    case 'reed': {
      const sway = Math.sin(t * 1.6 + pos.x * 0.1) * 2.4
      ctx.strokeStyle = '#4a5530'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(pos.x - 4, pos.y)
      ctx.quadraticCurveTo(pos.x - 4 + sway * 0.5, pos.y - 5, pos.x - 4 + sway, pos.y - 10)
      ctx.moveTo(pos.x, pos.y)
      ctx.quadraticCurveTo(pos.x + sway * 0.5, pos.y - 6, pos.x + sway, pos.y - 13)
      ctx.moveTo(pos.x + 4, pos.y)
      ctx.quadraticCurveTo(pos.x + 4 + sway * 0.5, pos.y - 4, pos.x + 4 + sway, pos.y - 9)
      ctx.stroke()
      break
    }
    case 'stump': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 2, 8, 3.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3a28'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6a5a40'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 1.5, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'board': {
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 2, 18, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3626'
      ctx.fillRect(pos.x - 14, pos.y - 24, 4, 26)
      ctx.fillRect(pos.x + 10, pos.y - 24, 4, 26)
      ctx.fillStyle = '#5c4630'
      ctx.fillRect(pos.x - 19, pos.y - 34, 38, 22)
      ctx.fillStyle = '#d8cfb4'
      ctx.fillRect(pos.x - 13, pos.y - 31, 9, 12)
      ctx.fillRect(pos.x - 1, pos.y - 28, 9, 12)
      ctx.fillRect(pos.x + 10, pos.y - 30, 7, 10)
      break
    }
    case 'portal': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 2, 30, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6a6a62'
      ctx.fillRect(pos.x - 27, pos.y - 46, 8, 46)
      ctx.fillRect(pos.x + 19, pos.y - 46, 8, 46)
      ctx.fillRect(pos.x - 30, pos.y - 52, 60, 8)
      ctx.fillStyle = `rgba(154,208,168,${0.18 + pulse * 0.2})`
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 22, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(217,232,192,${0.5 + pulse * 0.4})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 22, 10 + pulse * 2, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    // --- Фаза 6: Гранитная Долина ---
    case 'pit': {
      // Частокол арены: столбы по кругу + песчаное дно (базовая заливка уже в bake)
      const r = p.r ?? 120
      ctx.strokeStyle = '#4a3626'
      ctx.lineWidth = 4
      const posts = 22
      for (let i = 0; i < posts; i++) {
        const a = (i / posts) * Math.PI * 2
        const px = pos.x + Math.cos(a) * (r + 14)
        const py = pos.y + Math.sin(a) * (r + 14)
        ctx.fillStyle = '#5a422c'
        ctx.fillRect(px - 3, py - 16, 6, 20)
        ctx.fillStyle = '#3d2c1c'
        ctx.fillRect(px - 3, py - 16, 6, 5)
      }
      ctx.strokeStyle = 'rgba(74,54,38,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r + 14, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'mine': {
      // Вход в копи: каменная арка с тёмным проёмом
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 6, 44, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5c5c56'
      ctx.beginPath()
      ctx.moveTo(pos.x - 40, pos.y + 6)
      ctx.lineTo(pos.x - 28, pos.y - 52)
      ctx.quadraticCurveTo(pos.x, pos.y - 74, pos.x + 28, pos.y - 52)
      ctx.lineTo(pos.x + 40, pos.y + 6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#141210'
      ctx.beginPath()
      ctx.moveTo(pos.x - 22, pos.y + 6)
      ctx.lineTo(pos.x - 16, pos.y - 36)
      ctx.quadraticCurveTo(pos.x, pos.y - 50, pos.x + 16, pos.y - 36)
      ctx.lineTo(pos.x + 22, pos.y + 6)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(20,16,12,0.4)'
      ctx.lineWidth = 2
      ctx.stroke()
      break
    }
    case 'obelisk': {
      // Осколок Ядра: парящий кристалл с пепельным свечением
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + pos.x)
      const r = p.r ?? 16
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, r * 1.1, r * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(pos.x, pos.y - r * 2, 2, pos.x, pos.y - r * 2, r * 3)
      g.addColorStop(0, `rgba(190,150,230,${0.35 + pulse * 0.2})`)
      g.addColorStop(1, 'rgba(190,150,230,0)')
      ctx.fillStyle = g
      ctx.fillRect(pos.x - r * 3, pos.y - r * 5, r * 6, r * 6)
      ctx.fillStyle = '#5a4a6a'
      ctx.beginPath()
      ctx.moveTo(pos.x - r * 0.6, pos.y)
      ctx.lineTo(pos.x - r * 0.45, pos.y - r * 2.6)
      ctx.lineTo(pos.x, pos.y - r * 3.4)
      ctx.lineTo(pos.x + r * 0.5, pos.y - r * 2.4)
      ctx.lineTo(pos.x + r * 0.65, pos.y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = `rgba(220,190,255,${0.5 + pulse * 0.4})`
      ctx.beginPath()
      ctx.moveTo(pos.x - r * 0.18, pos.y - r * 1.1)
      ctx.lineTo(pos.x, pos.y - r * 3.2)
      ctx.lineTo(pos.x + r * 0.2, pos.y - r * 1.2)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'ore': {
      // Гранитная жила: серые камни с седыми кристаллами
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + pos.x)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, 16, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5e5e56'
      ctx.beginPath()
      ctx.moveTo(pos.x - 13, pos.y + 2)
      ctx.lineTo(pos.x - 7, pos.y - 10)
      ctx.lineTo(pos.x + 6, pos.y - 8)
      ctx.lineTo(pos.x + 13, pos.y + 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = `rgba(216,224,236,${0.55 + pulse * 0.35})`
      ctx.beginPath()
      ctx.moveTo(pos.x - 3, pos.y - 2)
      ctx.lineTo(pos.x, pos.y - 16)
      ctx.lineTo(pos.x + 4, pos.y - 3)
      ctx.closePath()
      ctx.fill()
      break
    }
    // --- Фаза 6.2: Стылое Пределье ---
    case 'cave': {
      // Вход пещеры: ледяная арка с тёмным проёмом
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 5, 40, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#7a8482'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + 6, 30, Math.PI, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(191,212,214,0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + 6, 34, Math.PI + 0.1, Math.PI * 2 - 0.1)
      ctx.stroke()
      ctx.fillStyle = '#0a0d0c'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, 24, 20, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(pos.x - 24, pos.y - 6, 48, 10)
      break
    }
    case 'runestone': {
      // Рунный камень: монолит со светящейся руной
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + pos.x)
      const runeColors = ['#9fb8a4', '#d9a441', '#d8dde2']
      const idx = ((p.seed ?? 0) % 3 + 3) % 3
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, 14, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6e7672'
      ctx.beginPath()
      ctx.moveTo(pos.x - 6, pos.y + 2)
      ctx.lineTo(pos.x - 5, pos.y - 20)
      ctx.lineTo(pos.x + 5, pos.y - 22)
      ctx.lineTo(pos.x + 7, pos.y + 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = runeColors[idx]
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6 + pulse * 0.4
      ctx.strokeRect(pos.x - 3, pos.y - 16, 6, 12)
      ctx.globalAlpha = 1
      break
    }
    case 'wordwall': {
      // Стена Слова: тёмная стена с тлеющей полосой рун
      const w = p.w ?? 150
      const isFrost = (p.seed ?? 0) === 502
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + pos.y)
      ctx.fillStyle = '#5e6662'
      ctx.fillRect(pos.x - w / 2, pos.y - 34, w, 34)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(pos.x - w / 2, pos.y - 34, w, 6)
      ctx.fillStyle = isFrost ? `rgba(191,227,234,${0.55 + pulse * 0.35})` : `rgba(245,201,107,${0.55 + pulse * 0.35})`
      ctx.fillRect(pos.x - w * 0.31, pos.y - 26, w * 0.62, 7)
      break
    }
    case 'rune_door': {
      // Рунная пелена: ледяная завеса поперёк прохода
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + pos.x)
      ctx.fillStyle = `rgba(159,216,210,${0.35 + pulse * 0.2})`
      ctx.fillRect(pos.x - 8, pos.y - 26, 16, 30)
      ctx.fillStyle = '#5e6662'
      ctx.fillRect(pos.x - 10, pos.y - 30, 20, 5)
      break
    }
    case 'snowtree': {
      // Снежная ель: тёмная хвоя под шапкой снега
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 3, 13, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3c3226'
      ctx.fillRect(pos.x - 2, pos.y - 8, 4, 10)
      ctx.fillStyle = '#2a3a28'
      ctx.beginPath()
      ctx.moveTo(pos.x - 11, pos.y - 6)
      ctx.lineTo(pos.x, pos.y - 30)
      ctx.lineTo(pos.x + 11, pos.y - 6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#d8dee0'
      ctx.beginPath()
      ctx.moveTo(pos.x - 6, pos.y - 22)
      ctx.lineTo(pos.x, pos.y - 31)
      ctx.lineTo(pos.x + 6, pos.y - 22)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'bastion': {
      // Фаза 6.3: ворота Бастиона — частокол с башнями и проёмом
      const w = p.w ?? 150
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 4, w * 0.55, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      // частокол (заострённые брёвна)
      for (let i = -7; i <= 7; i++) {
        if (Math.abs(i) < 2) continue
        const bx = pos.x + i * 11 + (i > 0 ? 10 : -10)
        ctx.fillStyle = i % 2 === 0 ? '#5a4630' : '#463524'
        ctx.fillRect(bx - 3, pos.y - 22, 6, 24)
        ctx.beginPath()
        ctx.moveTo(bx - 3, pos.y - 22)
        ctx.lineTo(bx, pos.y - 27)
        ctx.lineTo(bx + 3, pos.y - 22)
        ctx.closePath()
        ctx.fill()
      }
      // башни
      const half = w / 2
      for (const tx of [pos.x - half + 8, pos.x + half - 8]) {
        ctx.fillStyle = '#5a4630'
        ctx.fillRect(tx - 9, pos.y - 34, 18, 36)
        ctx.fillStyle = '#7a3b2e'
        ctx.beginPath()
        ctx.moveTo(tx - 12, pos.y - 34)
        ctx.lineTo(tx, pos.y - 44)
        ctx.lineTo(tx + 12, pos.y - 34)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#d9a441'
        ctx.fillRect(tx - 3, pos.y - 28, 6, 12)
      }
      // ворота (приоткрыты)
      ctx.fillStyle = '#0d0a08'
      ctx.fillRect(pos.x - 20, pos.y - 21, 40, 22)
      ctx.fillStyle = '#6a5238'
      ctx.fillRect(pos.x - 20, pos.y - 21, 17, 22)
      ctx.fillRect(pos.x + 3, pos.y - 21, 17, 22)
      break
    }
    case 'blight': {
      // Фаза 6.3: мор-сгусток — багровая лужа с пульсирующим ядром
      const r = p.r ?? 22
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + pos.x)
      ctx.fillStyle = 'rgba(58,18,16,0.85)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y, r * 1.35, r * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(201,58,42,${0.4 + pulse * 0.35})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y, r * 1.1, r * 0.5, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = `rgba(217,74,48,${0.55 + pulse * 0.35})`
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y - 5 - pulse * 2, r * 0.34, r * 0.26, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
}

// ---------------- Сущности ----------------

function shadowBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.55, r * 1.1, r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number, color: string) {
  ctx.fillStyle = 'rgba(20,16,12,0.8)'
  ctx.fillRect(x - w / 2, y, w, 4)
  ctx.fillStyle = color
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, ratio)), 2)
}

function drawWeaponSwing(ctx: CanvasRenderingContext2D, e: Entity, color: string) {
  if (e.attackT <= 0) return
  const p = 1 - e.attackT / 0.28
  const a0 = e.facing - 1.1 + p * 2.2
  ctx.save()
  ctx.translate(e.pos.x, e.pos.y - 6)
  ctx.rotate(a0)
  ctx.strokeStyle = color
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(e.radius * 0.4, 0)
  ctx.lineTo(e.radius * 1.5, 0)
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = `rgba(255,240,200,${0.35 * (1 - p)})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(e.pos.x, e.pos.y - 6, e.radius * 1.35, e.facing - 0.7, e.facing + 0.7)
  ctx.stroke()
}

function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  t: number,
  cloak: string,
  weapon: 'sword' | 'staff' | 'shield' | 'bow' | 'none',
) {
  const bob = Math.sin(e.walkPhase * 10) * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1.6 : 0.4)
  shadowBlob(ctx, e.pos.x, e.pos.y, e.radius)
  const bx = e.pos.x
  const by = e.pos.y - 8 + bob
  // тело-плащ
  ctx.fillStyle = e.hitT > 0 ? '#ffffff' : cloak
  ctx.beginPath()
  ctx.ellipse(bx, by, e.radius * 0.78, e.radius * 0.95, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(bx - e.radius * 0.25, by + 3, e.radius * 0.4, e.radius * 0.7, 0, 0, Math.PI * 2)
  ctx.fill()
  // голова
  ctx.fillStyle = '#d8b088'
  ctx.beginPath()
  ctx.arc(bx, by - e.radius * 0.95, e.radius * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a2c1c'
  ctx.beginPath()
  ctx.arc(bx, by - e.radius * 1.15, e.radius * 0.42, Math.PI, Math.PI * 2)
  ctx.fill()
  // оружие
  const fx = Math.cos(e.facing)
  const fy = Math.sin(e.facing)
  if (weapon === 'shield') {
    ctx.fillStyle = '#7a8a4a'
    ctx.beginPath()
    ctx.ellipse(bx + fx * e.radius * 0.9 - fy * e.radius * 0.5, by + fy * e.radius * 0.9 + fx * e.radius * 0.5, e.radius * 0.45, e.radius * 0.6, e.facing, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4a522c'
    ctx.lineWidth = 2
    ctx.stroke()
    drawWeaponSwing(ctx, e, '#c9c4bc')
  } else if (weapon === 'staff') {
    ctx.strokeStyle = '#6a5638'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(bx - fy * e.radius * 0.7, by + fx * e.radius * 0.7)
    ctx.lineTo(bx - fy * e.radius * 0.7 + fx * 6, by + fx * e.radius * 0.7 + fy * 6 - e.radius * 1.6)
    ctx.stroke()
    const glow = 0.6 + 0.4 * Math.sin(t * 4 + e.eid)
    ctx.fillStyle = `rgba(159,184,164,${glow})`
    ctx.beginPath()
    ctx.arc(bx - fy * e.radius * 0.7 + fx * 6, by + fx * e.radius * 0.7 + fy * 6 - e.radius * 1.7, 3.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (weapon === 'bow') {
    ctx.strokeStyle = '#8a7a54'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(bx + fx * e.radius, by + fy * e.radius, e.radius * 0.8, e.facing - 1.2, e.facing + 1.2)
    ctx.stroke()
  } else if (weapon === 'sword') {
    drawWeaponSwing(ctx, e, '#c9c4bc')
  }
  // щит Квена
  if (e.shield > 0) {
    ctx.strokeStyle = `rgba(217,164,65,${0.5 + 0.3 * Math.sin(t * 6)})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(bx, by - 4, e.radius + 7, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawWolf(ctx: CanvasRenderingContext2D, e: Entity, big: boolean) {
  const s = big ? 1.45 : 1
  const bob = Math.sin(e.walkPhase * 12) * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1.4 : 0.3)
  shadowBlob(ctx, e.pos.x, e.pos.y, e.radius * s)
  const bx = e.pos.x
  const by = e.pos.y - 7 * s + bob
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(e.facing)
  ctx.fillStyle = e.hitT > 0 ? '#ffffff' : big ? '#7d7466' : '#565a5c'
  ctx.beginPath()
  ctx.ellipse(0, 0, e.radius * 1.25 * s, e.radius * 0.72 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // голова
  ctx.beginPath()
  ctx.ellipse(e.radius * 1.05 * s, -2 * s, e.radius * 0.55 * s, e.radius * 0.45 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // уши
  ctx.fillStyle = '#3d3a36'
  ctx.beginPath()
  ctx.moveTo(e.radius * 0.9 * s, -e.radius * 0.5 * s)
  ctx.lineTo(e.radius * 1.1 * s, -e.radius * 1.0 * s)
  ctx.lineTo(e.radius * 1.25 * s, -e.radius * 0.4 * s)
  ctx.closePath()
  ctx.fill()
  // хвост
  ctx.strokeStyle = e.hitT > 0 ? '#ffffff' : big ? '#6d6455' : '#484c4e'
  ctx.lineWidth = 4 * s
  ctx.beginPath()
  ctx.moveTo(-e.radius * 1.1 * s, 0)
  ctx.quadraticCurveTo(-e.radius * 1.7 * s, Math.sin(e.walkPhase * 9) * 4, -e.radius * 2 * s, -4 * s)
  ctx.stroke()
  // глаза
  ctx.fillStyle = big ? '#e0653a' : '#d9a441'
  ctx.beginPath()
  ctx.arc(e.radius * 1.35 * s, -4 * s, 1.8 * s, 0, Math.PI * 2)
  ctx.arc(e.radius * 1.35 * s, 1 * s, 1.8 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHorror(ctx: CanvasRenderingContext2D, e: Entity, t: number) {
  shadowBlob(ctx, e.pos.x, e.pos.y, e.radius)
  const by = e.pos.y - 12 + Math.sin(t * 3 + e.eid) * 2
  ctx.fillStyle = e.hitT > 0 ? '#ffffff' : 'rgba(122,90,146,0.85)'
  ctx.beginPath()
  ctx.arc(e.pos.x, by, e.radius * 0.85, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(40,25,55,0.9)'
  ctx.beginPath()
  ctx.arc(e.pos.x + 3, by - 2, e.radius * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(220,170,255,0.9)'
  ctx.beginPath()
  ctx.arc(e.pos.x + 4, by - 3, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(122,90,146,0.7)'
  ctx.lineWidth = 2.5
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + t * 1.5
    ctx.beginPath()
    ctx.moveTo(e.pos.x, by)
    ctx.quadraticCurveTo(
      e.pos.x + Math.cos(a) * e.radius * 1.2, by + Math.sin(a) * e.radius * 0.8 + 4,
      e.pos.x + Math.cos(a) * e.radius * 1.5, e.pos.y + Math.sin(a) * e.radius * 0.5 + 8,
    )
    ctx.stroke()
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Entity, t: number) {
  shadowBlob(ctx, e.pos.x, e.pos.y, e.radius * 1.2)
  const by = e.pos.y - 16 + Math.sin(t * 2) * 2
  const pulse = 0.5 + 0.5 * Math.sin(t * 5)
  // аура
  const g = ctx.createRadialGradient(e.pos.x, by, 6, e.pos.x, by, e.radius * 2.4)
  g.addColorStop(0, `rgba(160,107,217,${0.25 + pulse * 0.12})`)
  g.addColorStop(1, 'rgba(160,107,217,0)')
  ctx.fillStyle = g
  ctx.fillRect(e.pos.x - e.radius * 2.4, by - e.radius * 2.4, e.radius * 4.8, e.radius * 4.8)
  // масса
  ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#3d2f4d'
  ctx.beginPath()
  ctx.ellipse(e.pos.x, by, e.radius * 1.05, e.radius * 1.25, 0, 0, Math.PI * 2)
  ctx.fill()
  // шипы-рога
  ctx.fillStyle = '#2a1f38'
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    ctx.beginPath()
    ctx.moveTo(e.pos.x + i * e.radius * 0.38, by - e.radius * 0.9)
    ctx.lineTo(e.pos.x + i * e.radius * 0.6, by - e.radius * 2.0)
    ctx.lineTo(e.pos.x + i * e.radius * 0.75, by - e.radius * 0.7)
    ctx.closePath()
    ctx.fill()
  }
  // ядро
  ctx.fillStyle = `rgba(208,138,58,${0.75 + pulse * 0.25})`
  ctx.beginPath()
  ctx.arc(e.pos.x, by, e.radius * 0.42 + pulse * 2, 0, Math.PI * 2)
  ctx.fill()
  // глаза
  ctx.fillStyle = '#d97a3a'
  ctx.beginPath()
  ctx.arc(e.pos.x - 8, by - e.radius * 0.5, 3, 0, Math.PI * 2)
  ctx.arc(e.pos.x + 8, by - e.radius * 0.5, 3, 0, Math.PI * 2)
  ctx.fill()
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  t: number,
  isTarget: boolean,
) {
  if (!e.alive) return
  if (isTarget) {
    ctx.strokeStyle = 'rgba(217,164,65,0.85)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.ellipse(e.pos.x, e.pos.y + e.radius * 0.55, e.radius + 9, (e.radius + 9) * 0.45, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  switch (e.enemyType) {
    case 'wolf':
      drawWolf(ctx, e, false)
      break
    case 'alpha':
      drawWolf(ctx, e, true)
      break
    case 'horror':
      drawHorror(ctx, e, t)
      break
    case 'draugr':
      // Пределье 2D: мёртвый воин в истлевшей броне
      drawHumanoid(ctx, e, t, '#6a7a6a', 'sword')
      break
    case 'ghoul':
      // Мара 2D: сгорбленный упырь в багровой корке
      drawHumanoid(ctx, e, t, '#8a5a4a', 'sword')
      break
    case 'abomination':
      // Мара 2D: сросшаяся громила
      drawHumanoid(ctx, e, t, '#6a4238', 'sword')
      break
    case 'blight_mother': {
      // Мора-Мать 2D: брющной мешок с щупальцами и ядром
      const bob = Math.sin(t * 2.1 + e.eid) * 2
      shadowBlob(ctx, e.pos.x, e.pos.y, e.radius * 1.2)
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#4a1610'
      ctx.beginPath()
      ctx.ellipse(e.pos.x, e.pos.y - e.radius * 0.7 - bob, e.radius * 1.25, e.radius * 0.95, 0, 0, Math.PI * 2)
      ctx.fill()
      // щупальца
      ctx.strokeStyle = e.hitT > 0 ? '#ffffff' : '#3a1210'
      ctx.lineWidth = 4
      for (let i = 0; i < 5; i++) {
        const a = t * 1.2 + (i / 5) * Math.PI * 2 + e.eid
        ctx.beginPath()
        ctx.moveTo(e.pos.x + Math.cos(a) * e.radius * 0.8, e.pos.y - 6 - bob)
        ctx.quadraticCurveTo(
          e.pos.x + Math.cos(a) * e.radius * 1.5,
          e.pos.y + 2,
          e.pos.x + Math.cos(a) * e.radius * 1.7,
          e.pos.y + 8,
        )
        ctx.stroke()
      }
      // ядро скверны
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + e.eid)
      ctx.fillStyle = `rgba(217,74,48,${0.6 + pulse * 0.35})`
      ctx.beginPath()
      ctx.arc(e.pos.x + e.radius * 0.4, e.pos.y - e.radius * 0.6 - bob, 5 + pulse * 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffb04a'
      ctx.beginPath()
      ctx.arc(e.pos.x + e.radius * 1.05, e.pos.y - e.radius * 1.1 - bob, 2, 0, Math.PI * 2)
      ctx.arc(e.pos.x + e.radius * 1.05, e.pos.y - e.radius * 0.6 - bob, 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'frost_troll':
      // Стылый тролль: белошёрстная громила
      drawHumanoid(ctx, e, t, '#d8dcd4', 'sword')
      break
    case 'dragon': {
      // Иммолтакс 2D: крылатая тень в полёте/на земле
      const alt = e.cds['alt'] ?? 0
      shadowBlob(ctx, e.pos.x, e.pos.y, e.radius * (1 + alt * 0.35))
      ctx.save()
      ctx.translate(e.pos.x, e.pos.y - 10 - alt * 46)
      ctx.rotate(e.facing)
      const flap = Math.sin(t * (alt > 0.5 ? 7.5 : 1.4)) * (alt > 0.5 ? 0.5 : 0.08)
      // крылья
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#55322c'
      for (const sz of [-1, 1]) {
        ctx.save()
        ctx.rotate(sz * flap)
        ctx.beginPath()
        ctx.moveTo(-6, sz * 4)
        ctx.quadraticCurveTo(2, sz * 26, 16, sz * 20)
        ctx.quadraticCurveTo(6, sz * 12, 10, sz * 4)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      // корпус
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#4a3230'
      ctx.beginPath()
      ctx.ellipse(0, 0, e.radius * 1.25, e.radius * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      // голова/хвост
      ctx.beginPath()
      ctx.ellipse(e.radius * 1.3, -e.radius * 0.3, e.radius * 0.5, e.radius * 0.32, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#33221f'
      ctx.beginPath()
      ctx.ellipse(-e.radius * 1.5, e.radius * 0.1, e.radius * 0.9, e.radius * 0.24, 0.1, 0, Math.PI * 2)
      ctx.fill()
      // угли в пасти
      ctx.fillStyle = '#ffb04a'
      ctx.beginPath()
      ctx.arc(e.radius * 1.7, -e.radius * 0.3, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'bogling': {
      // Вельд 2D: присосистый ком тины
      shadowBlob(ctx, e.pos.x, e.pos.y, e.radius)
      const hop = Math.abs(Math.sin(e.walkPhase * 10)) * 3
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#4a5230'
      ctx.beginPath()
      ctx.ellipse(e.pos.x, e.pos.y - 5 - hop, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#2c3220'
      ctx.beginPath()
      ctx.ellipse(e.pos.x + e.radius * 0.45, e.pos.y - 4 - hop, e.radius * 0.4, e.radius * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8d568'
      ctx.beginPath()
      ctx.arc(e.pos.x + e.radius * 0.4, e.pos.y - 8 - hop, 1.8, 0, Math.PI * 2)
      ctx.arc(e.pos.x + e.radius * 0.4, e.pos.y - 4 - hop, 1.8, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'ash_shade':
    case 'ash_mother': {
      // Пепельные: парящий обугленный силуэт с углями
      const big = e.enemyType === 'ash_mother'
      const hover = Math.sin(t * 2.2 + e.eid) * 2
      shadowBlob(ctx, e.pos.x, e.pos.y, e.radius)
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : 'rgba(48,42,38,0.92)'
      ctx.beginPath()
      ctx.moveTo(e.pos.x - e.radius * (big ? 1.1 : 0.85), e.pos.y)
      ctx.quadraticCurveTo(e.pos.x - e.radius * (big ? 0.7 : 0.5), e.pos.y - e.radius * (big ? 3.4 : 2.4) - hover, e.pos.x, e.pos.y - e.radius * (big ? 3.8 : 2.7) - hover)
      ctx.quadraticCurveTo(e.pos.x + e.radius * (big ? 0.7 : 0.5), e.pos.y - e.radius * (big ? 3.4 : 2.4) - hover, e.pos.x + e.radius * (big ? 1.1 : 0.85), e.pos.y)
      ctx.closePath()
      ctx.fill()
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + e.eid)
      ctx.fillStyle = `rgba(255,122,48,${0.5 + pulse * 0.4})`
      ctx.beginPath()
      ctx.arc(e.pos.x, e.pos.y - e.radius * (big ? 1.6 : 1.2) - hover, big ? 5 : 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffb04a'
      ctx.beginPath()
      ctx.arc(e.pos.x - 3, e.pos.y - e.radius * (big ? 2.9 : 2.2) - hover, 1.6, 0, Math.PI * 2)
      ctx.arc(e.pos.x + 3, e.pos.y - e.radius * (big ? 2.9 : 2.2) - hover, 1.6, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'boss':
      drawBoss(ctx, e, t)
      break
    case 'scorpion': {
      // Гранитный скорпион: панцирь, клешни, хвост-коса
      const bob = Math.sin(e.walkPhase * 11) * (Math.hypot(e.vel.x, e.vel.y) > 4 ? 1.2 : 0.3)
      shadowBlob(ctx, e.pos.x, e.pos.y, e.radius)
      ctx.save()
      ctx.translate(e.pos.x, e.pos.y - 6 + bob)
      ctx.rotate(e.facing)
      // хвост над спиной (дуга назад-вверх)
      ctx.strokeStyle = e.hitT > 0 ? '#ffffff' : '#6a6154'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-e.radius * 0.8, 0)
      ctx.quadraticCurveTo(-e.radius * 1.9, -10 - bob * 2, -e.radius * 1.1, -18 - bob * 3)
      ctx.stroke()
      // жало
      ctx.fillStyle = '#d9a441'
      ctx.beginPath()
      ctx.arc(-e.radius * 1.1, -19 - bob * 3, 2.6, 0, Math.PI * 2)
      ctx.fill()
      // панцирь (сегменты)
      ctx.fillStyle = e.hitT > 0 ? '#ffffff' : '#7a7160'
      ctx.beginPath()
      ctx.ellipse(0, 0, e.radius * 1.1, e.radius * 0.72, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5c544a'
      ctx.beginPath()
      ctx.ellipse(-e.radius * 0.55, 0, e.radius * 0.5, e.radius * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      // клешни
      ctx.fillStyle = '#8a8070'
      ctx.beginPath()
      ctx.ellipse(e.radius * 1.15, -e.radius * 0.55, e.radius * 0.42, e.radius * 0.28, 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(e.radius * 1.15, e.radius * 0.55, e.radius * 0.42, e.radius * 0.28, -0.5, 0, Math.PI * 2)
      ctx.fill()
      // глаза
      ctx.fillStyle = '#d9a441'
      ctx.beginPath()
      ctx.arc(e.radius * 0.55, -2.5, 1.6, 0, Math.PI * 2)
      ctx.arc(e.radius * 0.55, 2.5, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break
    }
    default: {
      const weapon =
        e.id === 'kaya'
          ? 'staff'
          : e.id === 'torvald'
            ? 'shield'
            : e.enemyType === 'archer'
              ? 'bow'
              : e.enemyType
                ? 'sword'
                : e.role === 'Архимаг Ковена' || e.role === 'Магистр-странница'
                  ? 'staff'
                  : 'sword'
      drawHumanoid(ctx, e, t, e.color, weapon)
    }
  }
  // оглушение
  if (e.stunT > 0) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i / 3) * Math.PI * 2
      ctx.fillStyle = '#f5c96b'
      ctx.beginPath()
      ctx.arc(e.pos.x + Math.cos(a) * 10, e.pos.y - e.radius * 2.4 + Math.sin(a) * 4, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // горение
  if (e.burnT > 0) {
    for (let i = 0; i < 2; i++) {
      const px = e.pos.x + Math.sin(t * 12 + i * 2 + e.eid) * 6
      ctx.fillStyle = `rgba(224,138,58,${0.5 + Math.random() * 0.3})`
      ctx.beginPath()
      ctx.arc(px, e.pos.y - 6 - Math.random() * 14, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // замедление
  if (e.slowT > 0) {
    ctx.strokeStyle = 'rgba(200,230,240,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(e.pos.x, e.pos.y, e.radius + 4, 0, Math.PI * 2)
    ctx.stroke()
  }
  // каст
  if (e.castT > 0) {
    ctx.strokeStyle = 'rgba(159,184,164,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(e.pos.x, e.pos.y, e.radius + 10 - (0.4 - e.castT) * 20, 0, Math.PI * 2)
    ctx.stroke()
  }
  // полоса HP
  if (e.kind === 'enemy' && e.hp < e.maxHp) {
    hpBar(ctx, e.pos.x, e.pos.y - e.radius * 2.2 - 8, Math.max(26, e.radius * 2), e.hp / e.maxHp, e.boss ? '#a06bd9' : '#c94f3d')
  }
  if (e.kind === 'companion' && e.hp < e.maxHp) {
    hpBar(ctx, e.pos.x, e.pos.y - e.radius * 2.2 - 8, 26, e.hp / e.maxHp, '#8fbf7f')
  }
  // имя
  if (e.kind === 'npc' || e.kind === 'companion') {
    ctx.font = '11px ui-sans-serif, system-ui'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const tw = ctx.measureText(e.name).width
    ctx.fillRect(e.pos.x - tw / 2 - 4, e.pos.y - e.radius * 2.2 - 24, tw + 8, 14)
    ctx.fillStyle = e.kind === 'companion' ? '#c9e0b8' : '#e8d5a8'
    ctx.fillText(e.name, e.pos.x, e.pos.y - e.radius * 2.2 - 13)
  }
}

// ---------------- Частицы и текст ----------------

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]) {
  for (const p of ps) {
    const a = p.life / p.maxLife
    ctx.globalAlpha = Math.max(0, a)
    if (p.kind === 'ring' || p.kind === 'slam') {
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.kind === 'slam' ? 4 : 2.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 - a) * 2.2 + 6, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

export function drawFloaters(ctx: CanvasRenderingContext2D, fs: Floater[]) {
  ctx.textAlign = 'center'
  for (const f of fs) {
    const a = Math.min(1, f.life / f.maxLife + 0.25)
    ctx.font = `${f.size}px ui-sans-serif, system-ui`
    ctx.globalAlpha = Math.max(0, Math.min(1, a))
    ctx.strokeStyle = 'rgba(10,8,6,0.9)'
    ctx.lineWidth = 3
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
}

// ---------------- Миникарта и полная карта ----------------

export function drawMinimap(
  mini: HTMLCanvasElement,
  baked: HTMLCanvasElement,
  entities: Entity[],
  playerPos: Vec,
  questMarker: Vec | null,
  size: number,
  t: number,
) {
  const ctx = mini.getContext('2d')
  if (!ctx) return
  const scale = size / WORLD.w
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(baked, 0, 0, WORLD.w, WORLD.h, 0, 0, size, size * (WORLD.h / WORLD.w))
  const mh = size * (WORLD.h / WORLD.w)
  const dot = (x: number, y: number, color: string, r: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x * scale, y * (mh / WORLD.h), r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const e of entities) {
    if (!e.alive) continue
    if (e.kind === 'npc') dot(e.pos.x, e.pos.y, '#e8d5a8', 2)
    else if (e.kind === 'companion') dot(e.pos.x, e.pos.y, '#c9e0b8', 2)
    else if (e.kind === 'enemy' && e.aiState !== 'return') dot(e.pos.x, e.pos.y, '#c94f3d', 2)
  }
  if (questMarker) {
    const pulse = 2 + Math.sin(t * 4) * 1
    ctx.strokeStyle = '#f5c96b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(questMarker.x * scale, questMarker.y * (mh / WORLD.h), 4 + pulse, 0, Math.PI * 2)
    ctx.stroke()
  }
  // игрок
  ctx.fillStyle = '#f5c96b'
  ctx.beginPath()
  ctx.arc(playerPos.x * scale, playerPos.y * (mh / WORLD.h), 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1
  ctx.stroke()
}

export function drawFullMap(
  canvas: HTMLCanvasElement,
  baked: HTMLCanvasElement,
  playerPos: Vec,
  questMarker: Vec | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(baked, 0, 0, WORLD.w, WORLD.h, 0, 0, w, h)
  const sx = w / WORLD.w
  const sy = h / WORLD.h
  ctx.font = '12px ui-serif, Georgia, serif'
  ctx.textAlign = 'center'
  for (const m of AREA_MARKERS) {
    ctx.fillStyle = 'rgba(20,16,12,0.6)'
    const tw = ctx.measureText(m.label).width
    ctx.fillRect(m.pos.x * sx - tw / 2 - 5, m.pos.y * sy - 18, tw + 10, 16)
    ctx.fillStyle = '#e8d5a8'
    ctx.fillText(m.label, m.pos.x * sx, m.pos.y * sy - 6)
  }
  if (questMarker) {
    ctx.strokeStyle = '#f5c96b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(questMarker.x * sx, questMarker.y * sy, 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(questMarker.x * sx, questMarker.y * sy, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#f5c96b'
    ctx.fill()
  }
  ctx.fillStyle = '#f5c96b'
  ctx.beginPath()
  ctx.arc(playerPos.x * sx, playerPos.y * sy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

import { IRenderer } from './types'

/** Канвас-2D бэкенд IRenderer (легаси-рендер прототипа). */
export const renderer2d: IRenderer = {
  bakeTerrain,
  drawProp,
  drawEntity,
  drawParticles,
  drawFloaters,
  drawMinimap,
  drawFullMap,
}
