// ============================================================
// ЭХО РАЗЛОМА — интерфейс рендерера (Phase 0.8)
// IRenderer — мост между движком и бэкендом отрисовки.
// Сейчас реализация — канвас-2D (render2d/renderer2d);
// в Фазе 1 появится render3d (Three.js) под тем же интерфейсом.
// ============================================================

import { Entity, Floater, Particle, PropDef, Vec } from '../types'

export interface IRenderer {
  /** Запечь статичный террейн мира в offscreen-канвас (один раз на игру). */
  bakeTerrain(): HTMLCanvasElement
  /** Отрисовать проп (дерево/дом/камень/...) с сортировкой по Y снаружи. */
  drawProp(ctx: CanvasRenderingContext2D, p: PropDef, t: number): void
  /** Отрисовать сущность; isTarget включает маркер выделения. */
  drawEntity(ctx: CanvasRenderingContext2D, e: Entity, t: number, isTarget: boolean): void
  /** Частицы (искры/кольца/огонь). */
  drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void
  /** Всплывающий боевой текст. */
  drawFloaters(ctx: CanvasRenderingContext2D, fs: Floater[]): void
  /** Миникарта в HUD-канвасе. */
  drawMinimap(
    mini: HTMLCanvasElement,
    baked: HTMLCanvasElement,
    entities: Entity[],
    playerPos: Vec,
    questMarker: Vec | null,
    size: number,
    t: number,
  ): void
  /** Полная карта (панель «Карта»). */
  drawFullMap(canvas: HTMLCanvasElement, baked: HTMLCanvasElement, playerPos: Vec, questMarker: Vec | null): void
}
