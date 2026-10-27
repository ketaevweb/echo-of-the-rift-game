// ============================================================
// ЭХО РАЗЛОМА — общие утилиты ядра (Phase 0.2)
// Чистые функции без состояния; ничего не знают о движке.
// ============================================================

/** Круглый либо прямоугольный (OBB) коллайдер мира (дом/палатка/камень/озеро). */
export interface Collider {
  x: number
  y: number
  /** Радиус круглого коллайдера (используется, если hw/hd не заданы). */
  r: number
  propId?: string
  /** Прямоугольный коллайдер: полуширина по локальной X. */
  hw?: number
  /** Прямоугольный коллайдер: полуглубина по локальной Z. */
  hd?: number
  /** Поворот прямоугольника вокруг Y (рад), совпадает с rotY меша. */
  rot?: number
}

/** Случайное число в диапазоне [a, b). */
export function rndRange(a: number, b: number) {
  return a + Math.random() * (b - a)
}

/** Бросок dN (1..sides). */
export function d(sides: number) {
  return 1 + Math.floor(Math.random() * sides)
}

/** Детерминированный «случайный» поворот по seed (рад) — общий для мешей и коллайдеров. */
export function seedRot(seed: number): number {
  return ((seed * 137.508) % 360) * (Math.PI / 180)
}

/** Минимальная разница углов в радианах (0..PI). */
export function angleDiff(a: number, b: number) {
  let x = Math.abs(a - b) % (Math.PI * 2)
  if (x > Math.PI) x = Math.PI * 2 - x
  return x
}
