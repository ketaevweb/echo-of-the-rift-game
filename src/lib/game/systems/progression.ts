// ============================================================
// ЭХО РАЗЛОМА — система прогрессии (Phase 0.4)
// recalcStats / playerAtk / playerAc / signPower / xpNext /
// gainXp / spendLp / магазин (openShop) / тренеры
// (buildTrainerOptions/openTrainer/trainOption).
// ============================================================

import { ABILITY_MAP } from '../data/abilities'
import { ALRA_STOCK, BROCK_STOCK, ITEMS, MERCHANT_STOCK } from '../data/items'
import { ATTR_NAMES } from '../data/tables'
import { SignId } from '../types'
import { TrainerHudState, useGame } from '../store'
import { sfx } from '../sfx'
import { EngineCtx } from '../core/ctx'
import { floater, ring } from './combat'
import { careerRank } from './career'

export function recalcStats(ctx: EngineCtx, full = false) {
  const newMaxHp = 80 + ctx.attributes.vigor * 8 + ctx.skills.vitality * 15 + (ctx.level - 1) * 8
  if (full) ctx.maxHp = newMaxHp
  else if (newMaxHp !== ctx.maxHp) {
    const ratio = ctx.hp / ctx.maxHp
    ctx.maxHp = newMaxHp
    ctx.hp = Math.min(ctx.maxHp, Math.max(1, Math.round(ratio * ctx.maxHp)))
  }
  ctx.maxStamina = 70 + ctx.attributes.vigor * 3 + (ctx.level - 1) * 4
  ctx.stamina = Math.min(ctx.stamina, ctx.maxStamina)
  refreshPlayerStats(ctx)
}

export function refreshPlayerStats(ctx: EngineCtx) {
  if (!ctx.player) return
  ctx.player.maxHp = ctx.maxHp
  ctx.player.hp = Math.max(0, Math.min(ctx.player.hp, ctx.maxHp))
  ctx.player.atkBonus = playerAtk(ctx).atkBonus
  ctx.player.ac = playerAc(ctx)
  ctx.player.dmgMod = playerAtk(ctx).mod
}

export function playerAtk(ctx: EngineCtx) {
  const w = ctx.weapon ? ITEMS[ctx.weapon] : null
  return {
    atkBonus: 2 + Math.floor(ctx.level / 2) + Math.floor(ctx.attributes.might / 2) + ctx.skills.blade,
    mod: (w?.damage ?? 2) + Math.floor(ctx.attributes.might / 2),
  }
}

export function playerAc(ctx: EngineCtx) {
  const a = ctx.armor ? ITEMS[ctx.armor] : null
  // Фаза 6: перк «Орден Пепла» ранг 3 — +2 к классу брони (дисциплина строя)
  const orderAc = careerRank(ctx, 'order') >= 3 ? 2 : 0
  return 10 + (a?.ac ?? 0) + Math.floor(ctx.attributes.vigor / 2) + orderAc
}

export function signPower(ctx: EngineCtx) {
  const robe = ctx.armor === 'armor_robe' ? 0.1 : 0
  return 1 + ctx.skills.signs * 0.15 + (ctx.attributes.intellect - 3) * 0.08 + robe
}

export function xpNext(ctx: EngineCtx) {
  return 100 + (ctx.level - 1) * 60
}

export function gainXp(ctx: EngineCtx, n: number) {
  ctx.xp += n
  floater(ctx, ctx.player.pos, '+' + n + ' опыта', '#c9b06b', 12)
  let next = xpNext(ctx)
  while (ctx.xp >= next) {
    ctx.xp -= next
    ctx.level++
    ctx.lp += 5
    recalcStats(ctx)
    ctx.hp = ctx.maxHp
    ctx.player.hp = ctx.maxHp
    ctx.stamina = ctx.maxStamina
    ctx.toast(`Уровень ${ctx.level}! +5 очков обучения`, 'level')
    sfx('level')
    ring(ctx, ctx.player.pos, '#f5c96b', 60, 0.9)
    next = xpNext(ctx)
  }
}

export function spendLp(ctx: EngineCtx, attr: 'might' | 'vigor' | 'intellect' | 'charisma') {
  if (ctx.lp < 3) {
    ctx.toast('Нужно 3 очка обучения.', 'warn')
    return
  }
  ctx.lp -= 3
  ctx.attributes[attr]++
  recalcStats(ctx)
  ctx.toast(`${ATTR_NAMES[attr]} повышена!`, 'level')
  sfx('level')
  ctx.syncUi()
}

// ---------------- Магазин и тренер ----------------

/** Торговцы (Фаза 3/6): Грим в лавке, Альра-алхимик, Брок в Колонии. */
const SHOPS: Record<'grim' | 'alra' | 'brock', { name: string; stock: string[] }> = {
  grim: { name: 'Грим', stock: MERCHANT_STOCK },
  alra: { name: 'Альра', stock: ALRA_STOCK },
  brock: { name: 'Брок', stock: BROCK_STOCK },
}

export function openShop(ctx: EngineCtx, merchant: 'grim' | 'alra' | 'brock' = 'grim') {
  const s = SHOPS[merchant]
  useGame.getState().patch({ shop: { merchantName: s.name, stock: [...s.stock] }, panel: 'shop' })
}

export function buildTrainerOptions(ctx: EngineCtx): TrainerHudState {
  const opts: TrainerHudState['options'] = []
  const skillDefs: Array<{ key: 'blade' | 'vitality' | 'signs' | 'speech'; name: string; desc: string }> = [
    { key: 'blade', name: 'Владение клинком', desc: '+1 к атаке за ранг.' },
    { key: 'vitality', name: 'Живучесть', desc: '+15 к макс. здоровью за ранг.' },
    { key: 'signs', name: 'Ловкость знаков', desc: '+15% к силе знаков за ранг.' },
    { key: 'speech', name: 'Красноречие', desc: '+1 к проверкам убеждения за ранг.' },
  ]
  for (const sd of skillDefs) {
    const r = ctx.skills[sd.key]
    const maxed = r >= 5
    const lpCost = sd.key === 'speech' ? 3 : 2
    const goldCost = sd.key === 'speech' ? 60 : 40 + r * 20
    opts.push({
      id: 'skill:' + sd.key,
      name: `${sd.name} (${r}/5)`,
      desc: sd.desc,
      kind: 'skill',
      cost: `${lpCost} ОН + ${goldCost} зол.`,
      maxed,
      affordable: !maxed && ctx.lp >= lpCost && ctx.gold >= goldCost,
    })
  }
  const signDefs: Array<{ id: SignId; name: string }> = [
    { id: 'aard', name: 'Аард' },
    { id: 'quen', name: 'Квен' },
    { id: 'axii', name: 'Аксий' },
  ]
  for (const sd of signDefs) {
    const st = ctx.signs[sd.id]
    if (!st.unlocked) {
      const lpCost = sd.id === 'axii' ? 3 : 2
      const goldCost = sd.id === 'axii' ? 90 : 60
      opts.push({
        id: 'sign:' + sd.id,
        name: `Изучить знак: ${sd.name}`,
        desc: ABILITY_MAP[sd.id].desc,
        kind: 'sign',
        cost: `${lpCost} ОН + ${goldCost} зол.`,
        maxed: false,
        affordable: ctx.lp >= lpCost && ctx.gold >= goldCost,
      })
    } else if (st.level < 3) {
      opts.push({
        id: 'signup:' + sd.id,
        name: `${sd.name} → уровень ${st.level + 1}`,
        desc: 'Усилить знак: больше урона и длительности.',
        kind: 'sign',
        cost: '2 ОН + 80 зол.',
        maxed: false,
        affordable: ctx.lp >= 2 && ctx.gold >= 80,
      })
    }
  }
  return { options: opts }
}

export function openTrainer(ctx: EngineCtx) {
  useGame.getState().patch({ trainer: buildTrainerOptions(ctx), panel: 'trainer' })
}

export function trainOption(ctx: EngineCtx, id: string) {
  const [kind, key] = id.split(':')
  if (kind === 'skill') {
    const sk = key as 'blade' | 'vitality' | 'signs' | 'speech'
    if (ctx.skills[sk] >= 5) return
    const lpCost = sk === 'speech' ? 3 : 2
    const goldCost = sk === 'speech' ? 60 : 40 + ctx.skills[sk] * 20
    if (ctx.lp < lpCost || ctx.gold < goldCost) {
      ctx.toast('Не хватает ОН или золота.', 'warn')
      return
    }
    ctx.lp -= lpCost
    ctx.gold -= goldCost
    ctx.skills[sk]++
    recalcStats(ctx)
    ctx.toast('Тренировка завершена!', 'level')
    sfx('level')
  } else if (kind === 'sign') {
    const signId = key as SignId
    const st = ctx.signs[signId]
    if (!st.unlocked) {
      const lpCost = signId === 'axii' ? 3 : 2
      const goldCost = signId === 'axii' ? 90 : 60
      if (ctx.lp < lpCost || ctx.gold < goldCost) {
        ctx.toast('Не хватает ОН или золота.', 'warn')
        return
      }
      ctx.lp -= lpCost
      ctx.gold -= goldCost
      st.unlocked = true
      st.level = 1
      ctx.toast(`Знак изучен: ${ABILITY_MAP[signId].name}!`, 'level')
      sfx('level')
    } else if (st.level < 3) {
      if (ctx.lp < 2 || ctx.gold < 80) {
        ctx.toast('Не хватает ОН или золота.', 'warn')
        return
      }
      ctx.lp -= 2
      ctx.gold -= 80
      st.level++
      ctx.toast(`${ABILITY_MAP[signId].name} усилен до уровня ${st.level}!`, 'level')
      sfx('level')
    }
  }
  useGame.getState().patch({ trainer: buildTrainerOptions(ctx) })
  ctx.syncUi()
}
