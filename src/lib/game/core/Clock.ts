// ============================================================
// ЭХО РАЗЛОМА — часы игры (Phase 0.9)
// Clock: детерминированный шаг времени с клампом dt.
// Гарантирует, что после лага/свёрнутой вкладки мир не
// «телепортируется»: dt никогда не превышает MAX_DT.
// ============================================================

export const MAX_DT = 0.05 // 50 мс — бюджет одного шага симуляции

export class Clock {
  private lastT = 0

  /** Вызывается раз на кадр с меткой requestAnimationFrame. Возвращает dt в секундах. */
  tick(now: number): number {
    if (this.lastT === 0) {
      this.lastT = now
      return 0
    }
    const dt = Math.min(MAX_DT, (now - this.lastT) / 1000)
    this.lastT = now
    return dt
  }

  reset() {
    this.lastT = 0
  }
}
