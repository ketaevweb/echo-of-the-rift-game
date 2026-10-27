// ============================================================
// ЭХО РАЗЛОМА — система боя (Phase 0.6)
// meleeAttack/rangedAttack/damage/onEnemyKilled/onPlayerDeath/
// castAbility/enemiesInCone/updateStatuses + частицы и
// всплывающий текст (floater/ring/beam/coneParticles/
// updateParticles/tickCds).
// ============================================================

import { ABILITY_MAP, ENEMY_STATS, FIRE_WEAK, SHOUT_WEAK, STUN2_WEAK, STUN_WEAK } from '../data/abilities'
import { ITEMS } from '../data/items'
import { BESTIARY_INFO, OIL_TARGETS } from '../data/tables'
import { PLAYER_SPAWN, SPAWN_ZONES } from '../data/world'
import { Entity, Particle, SignId, Telegraph, Vec } from '../types'
import { useGame } from '../store'
import { sfx } from '../sfx'
import { angleDiff, d, rndRange } from '../core/util'
import { EngineCtx } from '../core/ctx'
import { nearestEnemyOf } from '../core/entity'
import { heightAt } from '../render3d/heightmap'
import { addItem, countItem, removeItem } from './inventory'
import { gainXp, signPower } from './progression'
import { advanceQuest, checkProof } from './quest'
import { approvalOnDowned, approvalOnKill, trySynergyFrostAndFlame, trySynergyWallAndHammer } from './party'
import { careerRank, endPitFight } from './career'
import { dragonSoulAbsorb } from './frost'

// ---------------- Атаки ----------------

/** Высотный бонус (Фаза 2): атакующий заметно выше цели — +2 к броску и
 *  +15% урона (как «высокая земля» в тактиках), ниже — −2 к броску. */
function heightMod(a: Entity, t: Entity): number {
  const dh = heightAt(a.pos.x, a.pos.y) - heightAt(t.pos.x, t.pos.y)
  if (dh > 12) return 2
  if (dh < -12) return -2
  return 0
}

/** Бонус масла (Фаза 3): урон игрока против класса врагов, пока масло активно.
 *  Фаза 6: перк Ковена Ветвей — +2 урона за ранг. */
function oilBonus(ctx: EngineCtx, a: Entity, t: Entity): number {
  if (a.kind !== 'player' || ctx.oilT <= 0 || !ctx.oilKind) return 0
  const def = ITEMS[ctx.oilKind]
  if (!def?.oil) return 0
  return OIL_TARGETS[def.oil.targets].has(t.enemyType ?? '')
    ? def.oil.bonus + careerRank(ctx, 'coven') * 2
    : 0
}

export function meleeAttack(ctx: EngineCtx, a: Entity, t: Entity) {
  a.cds['atk'] = a.attackCd
  a.attackT = 0.28
  sfx('swing')
  const buff = a.team === 'party' && ctx.buffT > 0 ? 2 : 0
  const hMod = heightMod(a, t)
  const roll = d(20)
  const total = roll + a.atkBonus + buff + hMod
  // Фаза 6: перк «Вольный Дозор» ранг 2+ — 19 тоже считается критом (но не авто-попаданием)
  const watchCrit = a.kind === 'player' && roll === 19 && careerRank(ctx, 'watch') >= 2
  if (roll === 20 || watchCrit || (roll !== 1 && total >= t.ac)) {
    const crit = roll === 20 || watchCrit
    const dmg =
      Math.max(1, Math.round(d(a.dmgSides) * a.dmgDice * (crit ? 2 : 1) * (hMod > 0 ? 1.15 : 1)) + a.dmgMod) +
      oilBonus(ctx, a, t)
    damage(ctx, t, dmg, { crit, color: a.team === 'party' ? '#f5c96b' : '#e0653a' })
    if (t.kind !== 'player' && t.team !== 'party') sfx('hit')
  } else {
    floater(ctx, t.pos, 'Промах', '#9a9a90', 12)
  }
}

export function rangedAttack(ctx: EngineCtx, a: Entity, t: Entity) {
  a.cds['atk'] = a.attackCd
  a.attackT = 0.25
  const buff = a.team === 'party' && ctx.buffT > 0 ? 2 : 0
  const hMod = heightMod(a, t)
  const roll = d(20)
  const total = roll + a.atkBonus + buff + hMod
  if (roll === 20 || (roll !== 1 && total >= t.ac)) {
    const crit = roll === 20
    const dmg =
      Math.max(1, Math.round(d(a.dmgSides) * a.dmgDice * (crit ? 2 : 1) * (hMod > 0 ? 1.15 : 1)) + a.dmgMod) +
      oilBonus(ctx, a, t)
    damage(ctx, t, dmg, { crit, color: a.team === 'party' ? '#f5c96b' : '#e0653a' })
    beam(ctx, a.pos, t.pos, a.team === 'party' ? '#bfe3ea' : '#d9c04f')
    if (t.kind !== 'player' && t.team !== 'party') sfx('hit')
  } else {
    floater(ctx, t.pos, 'Промах', '#9a9a90', 12)
    beam(ctx, a.pos, t.pos, 'rgba(200,200,190,0.4)')
  }
}

export function damage(ctx: EngineCtx, t: Entity, amount: number, opts: { crit?: boolean; silent?: boolean; color?: string } = {}) {
  if (!t.alive) return
  let amt = amount
  if (t.shield > 0) {
    const absorbed = Math.min(t.shield, amt)
    t.shield -= absorbed
    amt -= absorbed
    if (absorbed > 0) floater(ctx, t.pos, 'Квен −' + absorbed, '#d9a441', 12)
  }
  if (amt > 0) {
    t.hp -= amt
    t.hitT = 0.15
    if (!opts.silent) {
      floater(
        ctx,
        t.pos,
        opts.crit ? 'КРИТ ' + amt : String(amt),
        opts.color ?? (t.team === 'party' ? '#e0653a' : '#f5c96b'),
        opts.crit ? 20 : 15,
      )
    }
    if (t.kind === 'player') ctx.hp = t.hp
    if (t.kind === 'player' || t.kind === 'companion') sfx('hit')
  }
  if (t.team === 'hostile' && t.aiState === 'idle') t.aiState = 'chase'
  if (t.hp <= 0) {
    t.hp = 0
    t.alive = false
    if (t.kind === 'enemy') onEnemyKilled(ctx, t)
    else if (t.kind === 'companion') {
      t.downT = 12
      approvalOnDowned(ctx, t) // Фаза 4: компаньон выведен из боя — доверие падает
      floater(ctx, t.pos, t.name + ' выведен из боя!', '#e0653a', 14)
    } else if (t.kind === 'player') onPlayerDeath(ctx)
  }
}

export function onEnemyKilled(ctx: EngineCtx, e: Entity) {
  const type = e.enemyType!
  ctx.kills++
  sfx('death')
  approvalOnKill(ctx, e.pos) // Фаза 4: живой компаньон рядом — +1 доверие
  if (e.zoneId) {
    const z = SPAWN_ZONES.find((zz) => zz.id === e.zoneId)
    if (z) e.respawnAt = ctx.time + z.respawnSec
  }
  const st = ENEMY_STATS[type]
  gainXp(ctx, st.xp)
  let goldLoot = 0
  if (type === 'wolf') {
    if (Math.random() < 0.6) addItem(ctx, 'wolf_pelt', 1)
    if (Math.random() < 0.4) addItem(ctx, 'wolf_fang', 1)
  } else if (type === 'bandit' || type === 'archer') {
    goldLoot = 8 + Math.floor(Math.random() * 14)
  } else if (type === 'alpha') {
    addItem(ctx, 'alpha_pelt', 1)
    goldLoot = 40
  } else if (type === 'horror') {
    if (Math.random() < 0.5) addItem(ctx, 'rift_shard', 1)
  } else if (type === 'captain') {
    goldLoot = 60
  } else if (type === 'bogling') {
    if (Math.random() < 0.55) addItem(ctx, 'bog_bile', 1)
  } else if (type === 'ash_shade') {
    if (Math.random() < 0.35) addItem(ctx, 'rift_shard', 1)
  } else if (type === 'ash_mother') {
    ctx.flags.ashMotherDead = true
    goldLoot = 120
    addItem(ctx, 'ash_heart', 1)
    if (ctx.quests.veld.stage === 2) advanceQuest(ctx, 'veld', 3)
  } else if (type === 'scorpion') {
    if (Math.random() < 0.45) addItem(ctx, 'granite_ore', 1)
    if (Math.random() < 0.6) addItem(ctx, 'granite_chitin', 1)
    // Клеймо скорпионов (Фаза 6): счётчик квеста Финна
    if (ctx.quests.granite_scorpions.stage === 1 && !ctx.quests.granite_scorpions.done) {
      ctx.quests.granite_scorpions.counter++
      const c = ctx.quests.granite_scorpions.counter
      if (c >= 5) ctx.toast('Пять панцирей собраны — к Финну в Колонию!', 'quest')
      else ctx.toast(`Клеймо скорпионов: ${c}/5`, 'info')
    }
  } else if (type === 'pit_master') {
    ctx.flags.pitMasterDead = true
    goldLoot = 140
    if (ctx.quests.granite.stage === 3) advanceQuest(ctx, 'granite', 4)
    useGame.getState().patch({ bossBar: null })
  } else if (type === 'draugr') {
    goldLoot = 14 + Math.floor(Math.random() * 18)
    if (Math.random() < 0.3) addItem(ctx, 'rift_shard', 1)
  } else if (type === 'frost_troll') {
    goldLoot = 45
    if (Math.random() < 0.6) addItem(ctx, 'wolf_pelt', 1)
  } else if (type === 'dragon') {
    // Фаза 6.2: дракон Иммолтакс пал — душа дракона поглощается
    ctx.flags.dragonDead = true
    goldLoot = 180
    addItem(ctx, 'frost_fang', 1)
    if (ctx.quests.frost_dragon.stage === 3) advanceQuest(ctx, 'frost_dragon', 4)
    dragonSoulAbsorb(ctx)
    useGame.getState().patch({ bossBar: null })
  } else if (type === 'ghoul') {
    // Фаза 6.3: мор-упырь — железа для Хольта, счётчик квеста
    goldLoot = 10 + Math.floor(Math.random() * 10)
    if (Math.random() < 0.55) addItem(ctx, 'ghoul_gland', 1)
    bumpGlands(ctx)
  } else if (type === 'abomination') {
    goldLoot = 40 + Math.floor(Math.random() * 16)
    if (Math.random() < 0.85) addItem(ctx, 'ghoul_gland', 1)
    bumpGlands(ctx)
  } else if (type === 'blight_mother') {
    // Фаза 6.3: Мор-Мать пала
    ctx.flags.blightMotherDead = true
    goldLoot = 220
    addItem(ctx, 'blight_heart', 1)
    useGame.getState().patch({ bossBar: null })
  } else if (type === 'boss') {
    goldLoot = 150
    addItem(ctx, 'rift_shard', 3)
  }
  if (goldLoot > 0) {
    ctx.gold += goldLoot
    floater(ctx, e.pos, '+' + goldLoot + ' золота', '#e8d5a8', 13)
  }
  if (!ctx.bestiary.has(type)) {
    ctx.bestiary.add(type)
    ctx.toast('Бестиарий: ' + BESTIARY_INFO[type].name, 'quest')
  }
  if (type === 'wolf' && ctx.quests.main.stage === 2 && !ctx.quests.main.done) {
    ctx.quests.main.counter++
    if (ctx.quests.main.counter >= 4) advanceQuest(ctx, 'main', 3)
    else ctx.toast(`Волки: ${ctx.quests.main.counter}/4`, 'info')
  }
  if (type === 'alpha') {
    ctx.flags.alphaDead = true
    if (ctx.quests.contract.stage === 1) advanceQuest(ctx, 'contract', 2)
    checkProof(ctx)
  }
  if (type === 'captain') {
    ctx.flags.captainDead = true
    if (ctx.quests.flame.stage === 1) advanceQuest(ctx, 'flame', 2)
    checkProof(ctx)
  }
  if (type === 'boss') {
    ctx.flags.bossDead = true
    advanceQuest(ctx, 'main', 6)
    useGame.getState().patch({ bossBar: null })
    ctx.endingAt = ctx.time + 1.8
  }
  if (ctx.targetEid === e.eid) ctx.targetEid = null
}

/** Фаза 6.3: счётчик мор-желёз для квеста Хольта (добыто с туш). */
function bumpGlands(ctx: EngineCtx) {
  const q = ctx.quests.mara_glands
  if (q.stage === 1 && !q.done) {
    q.counter++
    const c = q.counter
    if (c >= 5) ctx.toast('Пять мор-желёз собраны — к досенту Хольту в Бастион!', 'quest')
    else ctx.toast(`Желёзы скверны: ${c}/5`, 'info')
  }
}

export function onPlayerDeath(ctx: EngineCtx) {
  ctx.player.alive = false
  endPitFight(ctx) // Фаза 6: яма не прощает — бой прерван, ставка сгорела
  ctx.toast('Ты пал... Но Смотрители не умирают так просто.', 'warn')
  sfx('death')
  setTimeout(() => {
    if (ctx.destroyed) return
    ctx.player.alive = true
    ctx.player.pos = { ...PLAYER_SPAWN }
    ctx.player.dest = null
    ctx.hp = Math.round(ctx.maxHp * 0.6)
    ctx.player.hp = ctx.hp
    ctx.stamina = ctx.maxStamina
    ctx.gold = Math.max(0, ctx.gold - 30)
    for (const e of ctx.entities) {
      if (e.kind === 'companion' && !e.alive) {
        e.alive = true
        e.downT = 0
        e.hp = Math.round(e.maxHp * 0.5)
        e.pos = { x: ctx.player.pos.x - 26, y: ctx.player.pos.y + 18 }
      }
      if (e.kind === 'enemy' && e.alive) e.aiState = 'return'
    }
    ctx.targetEid = null
    ctx.camera.x = ctx.player.pos.x
    ctx.camera.y = ctx.player.pos.y
    ctx.toast('Ты очнулся в Хеймхолле. −30 золота на лечение.', 'info')
    ctx.syncUi()
  }, 1800)
}

// ---------------- Способности игрока ----------------

export function castAbility(ctx: EngineCtx, id: string) {
  if (ctx.isFrozen() || ctx.tacticalPaused || !ctx.player.alive) return
  const ab = ABILITY_MAP[id]
  if (!ab) return
  if (ab.kind === 'potion') {
    if (ctx.player.cds['potion'] > 0) return
    const inv = ctx.inventory.find((i) => i.item === id)
    if (!inv || inv.qty <= 0) {
      ctx.toast('Ничего выпить нет.', 'warn')
      return
    }
    const def = ITEMS[id]
    if (def.heal) {
      // Фаза 6: перк Ковена Ветвей — зелья лечат на +6 ОЗ за ранг
      const amount = def.heal + careerRank(ctx, 'coven') * 6
      ctx.hp = Math.min(ctx.maxHp, ctx.hp + amount)
      ctx.player.hp = ctx.hp
      floater(ctx, ctx.player.pos, '+' + amount, '#8fbf7f', 15)
    }
    if (def.stamina) {
      ctx.stamina = Math.min(ctx.maxStamina, ctx.stamina + def.stamina)
      floater(ctx, ctx.player.pos, '+' + def.stamina + ' ОВ', '#bfe3ea', 13)
    }
    removeItem(ctx, id, 1)
    ctx.player.cds['potion'] = ab.cooldown
    sfx('potion')
    ctx.syncUi()
    return
  }
  if (id === 'shout' && !ctx.signs.shout.unlocked) return
  // Фаза 6.2: крики Ту'ум открываются только у Стен Слов
  if (id === 'shout_force' && (ctx.shoutLv?.force ?? 0) < 1) return
  if (id === 'shout_frost' && (ctx.shoutLv?.frost ?? 0) < 1) return
  if (ab.kind === 'sign' && !ctx.signs[id as SignId]?.unlocked) return
  if (ctx.player.cds[id] > 0) return
  if (ctx.stamina < ab.staminaCost) {
    floater(ctx, ctx.player.pos, 'Нет сил!', '#9a9a90', 12)
    return
  }
  ctx.stamina -= ab.staminaCost
  ctx.player.cds[id] = ab.cooldown
  ctx.player.castT = 0.25
  const signLevel = ctx.signs[id as SignId]?.level ?? 1
  // Фаза 6: перк «Орден Пепла» — знаки сильнее на +12% за ранг
  const orderMult = 1 + 0.12 * careerRank(ctx, 'order')
  const power = signPower(ctx) * orderMult
  const target = ctx.targetEid ? ctx.entities.find((e) => e.eid === ctx.targetEid) : null

  if (id === 'igni') {
    if (target?.alive) ctx.player.facing = Math.atan2(target.pos.y - ctx.player.pos.y, target.pos.x - ctx.player.pos.x)
    sfx('fire')
    coneParticles(ctx, ctx.player.pos, ctx.player.facing, 150, '#e08a3a')
    spawnTelegraph(ctx, { shape: 'cone', x: ctx.player.pos.x, y: ctx.player.pos.y, facing: ctx.player.facing, radius: 150, width: 0.62, life: 0.3, maxLife: 0.3, color: '#e08a3a' })
    const cone = enemiesInCone(ctx, 150, 0.62)
    for (const e of cone) {
      const weak = FIRE_WEAK.has(e.enemyType ?? 'wolf') ? 2 : 1
      damage(ctx, e, Math.round(d(6) * 2 * power * weak), { color: '#e08a3a' })
      e.burnT = 4
      e.burnTick = 0.5
    }
    // Фаза 4: синергия с Кайей — паровой взрыв на цели конуса
    trySynergyFrostAndFlame(ctx, cone)
  } else if (id === 'aard') {
    if (target?.alive) ctx.player.facing = Math.atan2(target.pos.y - ctx.player.pos.y, target.pos.x - ctx.player.pos.x)
    sfx('shield')
    coneParticles(ctx, ctx.player.pos, ctx.player.facing, 160, '#d9e3ea')
    spawnTelegraph(ctx, { shape: 'cone', x: ctx.player.pos.x, y: ctx.player.pos.y, facing: ctx.player.facing, radius: 160, width: 0.95, life: 0.3, maxLife: 0.3, color: '#d9e3ea' })
    const cone = enemiesInCone(ctx, 160, 0.95)
    for (const e of cone) {
      damage(ctx, e, Math.round(d(4) * power), { color: '#d9e3ea' })
      // Фаза 6: панцирь трескается — скорпион/Мастер Ямы держат Аард вдвое дольше
      const stunMult = STUN2_WEAK.has(e.enemyType ?? 'wolf') ? 2 : 1
      e.stunT = Math.max(e.stunT, (1.1 + signLevel * 0.15) * stunMult)
      const a = Math.atan2(e.pos.y - ctx.player.pos.y, e.pos.x - ctx.player.pos.x)
      ctx.kb.set(e.eid, { x: Math.cos(a) * 300, y: Math.sin(a) * 300 })
    }
    // Фаза 4: синергия с Торвальдом — усиленный стан всего конуса
    trySynergyWallAndHammer(ctx, cone)
  } else if (id === 'quen') {
    const sh = Math.round((25 + 12 * ctx.level) * power)
    ctx.player.shield = sh
    floater(ctx, ctx.player.pos, 'Квен: ' + sh, '#d9a441', 14)
    ring(ctx, ctx.player.pos, '#d9a441', 40, 0.6)
    sfx('shield')
  } else if (id === 'axii') {
    const t =
      target && target.alive && Math.hypot(target.pos.x - ctx.player.pos.x, target.pos.y - ctx.player.pos.y) < 240
        ? target
        : nearestEnemyOf(ctx, ctx.player, 240)
    sfx('mind')
    if (t) {
      const dur = (2.4 + signLevel * 0.5) * (STUN_WEAK.has(t.enemyType ?? 'wolf') ? 1.6 : 1)
      t.stunT = Math.max(t.stunT, dur)
      floater(ctx, t.pos, 'Аксий!', '#c9a3e8', 14)
      ring(ctx, t.pos, '#c9a3e8', 24, 0.5)
    } else {
      floater(ctx, ctx.player.pos, 'Никого рядом', '#9a9a90', 12)
    }
  } else if (id === 'shout') {
    sfx('shout')
    ctx.shake = 12
    ring(ctx, ctx.player.pos, '#f5c96b', 210, 0.8)
    spawnTelegraph(ctx, { shape: 'circle', x: ctx.player.pos.x, y: ctx.player.pos.y, facing: 0, radius: 210, width: 0, life: 0.35, maxLife: 0.35, color: '#f5c96b' })
    for (const e of ctx.entities) {
      if (e.kind !== 'enemy' || !e.alive) continue
      if (Math.hypot(e.pos.x - ctx.player.pos.x, e.pos.y - ctx.player.pos.y) < 210) {
        damage(ctx, e, d(6) * 3 * power, { color: '#f5c96b' })
        e.stunT = Math.max(e.stunT, 1.2)
        const a = Math.atan2(e.pos.y - ctx.player.pos.y, e.pos.x - ctx.player.pos.x)
        ctx.kb.set(e.eid, { x: Math.cos(a) * 360, y: Math.sin(a) * 360 })
      }
    }
  } else if (id === 'shout_force') {
    // Фаза 6.2: ТУ'УМ — СИЛА: волна голоса роняет всех перед героем
    const lv = ctx.shoutLv.force
    const mult = 1 + 0.45 * (lv - 1)
    if (target?.alive) ctx.player.facing = Math.atan2(target.pos.y - ctx.player.pos.y, target.pos.x - ctx.player.pos.x)
    sfx('shout')
    ctx.shake = 9
    coneParticles(ctx, ctx.player.pos, ctx.player.facing, 190, '#f5c96b')
    spawnTelegraph(ctx, { shape: 'cone', x: ctx.player.pos.x, y: ctx.player.pos.y, facing: ctx.player.facing, radius: 190, width: 0.8, life: 0.32, maxLife: 0.32, color: '#f5c96b' })
    const cone = enemiesInCone(ctx, 190, 0.8)
    for (const e of cone) {
      damage(ctx, e, Math.round((d(6) + d(4)) * mult * power), { color: '#f5c96b' })
      // Мёртвая воля драугров расшатывается голосом древних
      const stunMult = SHOUT_WEAK.has(e.enemyType ?? 'wolf') ? 1.7 : 1
      e.stunT = Math.max(e.stunT, 1.3 * stunMult)
      const a = Math.atan2(e.pos.y - ctx.player.pos.y, e.pos.x - ctx.player.pos.x)
      ctx.kb.set(e.eid, { x: Math.cos(a) * 440, y: Math.sin(a) * 440 })
      floater(ctx, e.pos, 'ФУС!', '#f5c96b', 14)
    }
  } else if (id === 'shout_frost') {
    // Фаза 6.2: ТУ'УМ — МОРОЗ: ледяное дыхание жжёт холодом и замедляет
    const lv = ctx.shoutLv.frost
    const mult = 1 + 0.45 * (lv - 1)
    if (target?.alive) ctx.player.facing = Math.atan2(target.pos.y - ctx.player.pos.y, target.pos.x - ctx.player.pos.x)
    sfx('frost')
    coneParticles(ctx, ctx.player.pos, ctx.player.facing, 180, '#bfe3ea')
    spawnTelegraph(ctx, { shape: 'cone', x: ctx.player.pos.x, y: ctx.player.pos.y, facing: ctx.player.facing, radius: 180, width: 0.7, life: 0.32, maxLife: 0.32, color: '#bfe3ea' })
    const cone = enemiesInCone(ctx, 180, 0.7)
    for (const e of cone) {
      damage(ctx, e, Math.round((d(8) + d(6)) * mult * power), { color: '#bfe3ea' })
      e.slowT = Math.max(e.slowT, 3.5 + lv)
      floater(ctx, e.pos, 'ЛОК!', '#bfe3ea', 14)
    }
  }
  ctx.syncUi()
}

export function enemiesInCone(ctx: EngineCtx, range: number, halfAngle: number): Entity[] {
  return ctx.entities.filter((e) => {
    if (e.kind !== 'enemy' || !e.alive) return false
    const dist = Math.hypot(e.pos.x - ctx.player.pos.x, e.pos.y - ctx.player.pos.y)
    if (dist > range + e.radius) return false
    const a = Math.atan2(e.pos.y - ctx.player.pos.y, e.pos.x - ctx.player.pos.x)
    return angleDiff(a, ctx.player.facing) < halfAngle
  })
}

// ---------------- Телеграфы АоЕ (Фаза 2) ----------------

/** Ставит зону опасности на землю. Чисто визуал: урон наносит боевая логика.
 *  followEid — телеграф следует за сущностью (босс может двигаться при замахе). */
export function spawnTelegraph(ctx: EngineCtx, t: Telegraph) {
  ctx.telegraphs.push(t)
  if (ctx.telegraphs.length > 24) ctx.telegraphs.shift()
}

/** Тик телеграфов: жизнь + слежение за сущностью. Вызывается из stepWorld. */
export function updateTelegraphs(ctx: EngineCtx, dt: number) {
  if (ctx.telegraphs.length === 0) return
  for (const t of ctx.telegraphs) {
    t.life -= dt
    if (t.followEid !== undefined) {
      const src = ctx.entities.find((x) => x.eid === t.followEid)
      if (src) {
        t.x = src.pos.x
        t.y = src.pos.y
        t.facing = src.facing
      }
    }
  }
  ctx.telegraphs = ctx.telegraphs.filter((t) => t.life > 0)
}

// ---------------- Статусы ----------------

export function updateStatuses(ctx: EngineCtx, e: Entity, dt: number) {
  if (!e.alive) return
  if (e.stunT > 0) e.stunT -= dt
  if (e.slowT > 0) e.slowT -= dt
  if (e.burnT > 0) {
    e.burnT -= dt
    e.burnTick -= dt
    if (e.burnTick <= 0) {
      e.burnTick = 0.5
      damage(ctx, e, Math.max(1, Math.round(2 * signPower(ctx))), {
        silent: true,
        color: '#e08a3a',
      })
    }
  }
}

// ---------------- Эффекты ----------------

export function floater(ctx: EngineCtx, pos: Vec, text: string, color: string, size: number) {
  ctx.floaters.push({
    x: pos.x + rndRange(-6, 6),
    y: pos.y - 18,
    text,
    color,
    life: 1.1,
    maxLife: 1.1,
    size,
    vy: -34,
  })
  if (ctx.floaters.length > 40) ctx.floaters.shift()
}

export function ring(ctx: EngineCtx, pos: Vec, color: string, size: number, life: number, kind: Particle['kind'] = 'ring') {
  ctx.particles.push({ x: pos.x, y: pos.y, vx: 0, vy: 0, life, maxLife: life, size, color, kind })
}

export function beam(ctx: EngineCtx, a: Vec, b: Vec, color: string) {
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    ctx.particles.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      vx: rndRange(-10, 10),
      vy: rndRange(-10, 10),
      life: 0.25,
      maxLife: 0.25,
      size: 2.4,
      color,
      kind: 'spark',
    })
  }
}

export function coneParticles(ctx: EngineCtx, pos: Vec, facing: number, range: number, color: string) {
  for (let i = 0; i < 26; i++) {
    const a = facing + rndRange(-0.55, 0.55)
    const dist = rndRange(20, range)
    ctx.particles.push({
      x: pos.x + Math.cos(a) * dist * 0.3,
      y: pos.y + Math.sin(a) * dist * 0.3 - 6,
      vx: Math.cos(a) * dist * 2.4,
      vy: Math.sin(a) * dist * 2.4,
      life: rndRange(0.2, 0.42),
      maxLife: 0.42,
      size: rndRange(2.5, 5),
      color,
      kind: 'fire',
    })
  }
}

export function updateParticles(ctx: EngineCtx, dt: number) {
  for (const p of ctx.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'fire' || p.kind === 'spark') {
      p.vx *= 0.92
      p.vy *= 0.92
    }
  }
  ctx.particles = ctx.particles.filter((p) => p.life > 0)
  for (const f of ctx.floaters) {
    f.life -= dt
    f.y += f.vy * dt
    f.vy *= 0.95
  }
  ctx.floaters = ctx.floaters.filter((f) => f.life > 0)
}

export function tickCds(e: Entity, dt: number) {
  for (const k of Object.keys(e.cds)) {
    if (e.cds[k] > 0) e.cds[k] = Math.max(0, e.cds[k] - dt)
  }
  e.attackT = Math.max(0, e.attackT - dt)
  e.hitT = Math.max(0, e.hitT - dt)
  e.castT = Math.max(0, e.castT - dt)
}
