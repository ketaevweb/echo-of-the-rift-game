// ============================================================
// ЭХО РАЗЛОМА — система инвентаря (Phase 0.4)
// addItem/removeItem/countItem/buy/sell/equip/unequip/useItem.
// Часть функций вызывает системы боя (зелья) через ctx.castAbility.
// ============================================================

import { ITEMS, SELL_RATE } from '../data/items'
import { sfx } from '../sfx'
import { EngineCtx } from '../core/ctx'
import { recalcStats } from './progression'
import { floater } from './combat'
import { careerRank } from './career'

export function addItem(ctx: EngineCtx, id: string, qty: number) {
  const def = ITEMS[id]
  if (!def) return
  const ex = ctx.inventory.find((i) => i.item === id)
  if (ex) ex.qty += qty
  else ctx.inventory.push({ item: id, qty })
  ctx.toast('Получено: ' + def.name + (qty > 1 ? ` ×${qty}` : ''), 'loot')
  ctx.syncUi()
}

export function removeItem(ctx: EngineCtx, id: string, qty: number) {
  const ex = ctx.inventory.find((i) => i.item === id)
  if (!ex) return
  ex.qty -= qty
  if (ex.qty <= 0) ctx.inventory = ctx.inventory.filter((i) => i !== ex)
  ctx.syncUi()
}

export function countItem(ctx: EngineCtx, id: string) {
  return ctx.inventory.find((i) => i.item === id)?.qty ?? 0
}

export function buyItem(ctx: EngineCtx, id: string) {
  const def = ITEMS[id]
  if (!def) return
  if (ctx.gold < def.price) {
    ctx.toast('Не хватает золота.', 'warn')
    return
  }
  ctx.gold -= def.price
  addItem(ctx, id, 1)
  sfx('coin')
}

export function sellItem(ctx: EngineCtx, id: string) {
  const def = ITEMS[id]
  if (!def || def.type === 'quest') return
  if (countItem(ctx, id) <= 0) return
  const val = Math.floor(def.price * SELL_RATE)
  removeItem(ctx, id, 1)
  ctx.gold += val
  ctx.toast(`Продано: ${def.name} (+${val} зол.)`, 'info')
  sfx('coin')
}

export function equipItem(ctx: EngineCtx, id: string) {
  const def = ITEMS[id]
  if (!def) return
  if (def.type === 'weapon') {
    if (ctx.weapon) addItem(ctx, ctx.weapon, 1)
    ctx.weapon = id
    removeItem(ctx, id, 1)
  } else if (def.type === 'armor') {
    if (ctx.armor) addItem(ctx, ctx.armor, 1)
    ctx.armor = id
    removeItem(ctx, id, 1)
  } else return
  recalcStats(ctx)
  sfx('click')
  ctx.syncUi()
}

export function unequipItem(ctx: EngineCtx, slot: 'weapon' | 'armor') {
  const cur = slot === 'weapon' ? ctx.weapon : ctx.armor
  if (!cur) return
  if (slot === 'weapon') ctx.weapon = null
  else ctx.armor = null
  addItem(ctx, cur, 1)
  recalcStats(ctx)
  sfx('click')
}

export function useItem(ctx: EngineCtx, id: string) {
  const def = ITEMS[id]
  if (def?.type === 'potion') ctx.castAbility(id)
  else if (def?.type === 'oil' && def.oil) {
    // Масло на клинок (Фаза 3): бонус против класса врагов на время.
    // Фаза 6: перк Ковена Ветвей — +25% длительности за ранг.
    const covenMult = 1 + 0.25 * careerRank(ctx, 'coven')
    const dur = Math.round(def.oil.dur * covenMult)
    ctx.oilKind = id
    ctx.oilT = dur
    floater(ctx, ctx.player.pos, def.name, '#d9a441', 13)
    ctx.toast(`${def.name} нанесено на клинок (${Math.round(dur / 60)} мин).`, 'loot')
    sfx('potion')
    ctx.syncUi()
  }
}
