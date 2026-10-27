// ============================================================
// ЭХО РАЗЛОМА — легаси-реэкспорт рендера (Phase 0.8)
// Старый путь @/lib/game/render сохранён: функция-реализации
// переехали в render2d/renderer.ts (канвас-2D бэкенд).
// ============================================================

export {
  bakeTerrain,
  drawEntity,
  drawFloaters,
  drawFullMap,
  drawMinimap,
  drawParticles,
  drawProp,
} from './render2d/renderer'
