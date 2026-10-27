// ============================================================
// ЭХО РАЗЛОМА — синхронизация UI (Phase 0.9)
// syncUi: движок → zustand-стор (зеркало HUD). Вызывается
// циклом каждые 0.12 с и точечно после значимых событий.
// Правило: стор — только зеркало, обратной логики нет.
// ============================================================

import { ABILITY_MAP } from '../data/abilities'
import { QUESTS } from '../data/quests'
import { ITEMS } from '../data/items'
import { ABILITY_BAR_IDS, ENEMY_NAME } from '../data/tables'
import { AbilityHud, CareerHud, PartyHud, QuestHud, ShoutHud, useGame } from '../store'
import { SignId } from '../types'
import type { EngineCtx } from '../core/ctx'
import { countItem } from './inventory'
import { xpNext } from './progression'
import { nearestInteraction, stageText } from './quest'
import { CAREER_NAME, CAREER_PERKS, heroRank, RANK_NAME } from './career'
import { siegeHud } from './mara'

export function syncUi(ctx: EngineCtx): void {
  const st = useGame.getState()
  const party: PartyHud[] = [
    {
      eid: ctx.player.eid,
      id: 'player',
      name: 'Смотритель',
      role: ctx.faction === 'flame' ? 'Орден Пламени' : ctx.faction === 'mist' ? 'Ковен Тумана' : 'Смотритель',
      hp: Math.max(0, Math.round(ctx.hp)),
      maxHp: ctx.maxHp,
      alive: ctx.player.alive,
      stance: 'follow',
      approval: 100,
      abilities: [],
    },
  ]
  for (const e of ctx.entities) {
    if (e.kind !== 'companion') continue
    party.push({
      eid: e.eid,
      id: e.id,
      name: e.name,
      role: e.role ?? '',
      hp: Math.max(0, Math.round(e.hp)),
      maxHp: e.maxHp,
      alive: e.alive,
      stance: e.stance ?? 'follow',
      approval: ctx.approval[e.id as 'kaya' | 'torvald'] ?? 0,
      abilities:
        e.id === 'torvald'
          ? [
              { id: 'shieldbash', name: 'Удар щитом', icon: 'ShieldHalf', cd: e.cds['shieldbash'] ?? 0, cdMax: 8 },
              { id: 'warcry', name: 'Боевой клич', icon: 'Swords', cd: e.cds['warcry'] ?? 0, cdMax: 18 },
            ]
          : [
              { id: 'frostbolt', name: 'Лёд', icon: 'Snowflake', cd: e.cds['frostbolt'] ?? 0, cdMax: 4 },
              { id: 'mend', name: 'Лечение', icon: 'HeartPulse', cd: e.cds['mend'] ?? 0, cdMax: 10 },
            ],
    })
  }
  const abilities: AbilityHud[] = ABILITY_BAR_IDS.map((id) => {
    const ab = ABILITY_MAP[id]
    let unlocked = true
    if (ab.kind === 'sign') unlocked = ctx.signs[id as SignId]?.unlocked ?? false
    if (id === 'shout') unlocked = ctx.signs.shout.unlocked
    if (ab.kind === 'potion') unlocked = countItem(ctx, id) > 0
    const cdKey = ab.kind === 'potion' ? 'potion' : id
    return {
      id,
      name: ab.name,
      desc: ab.desc,
      icon: ab.icon,
      hotkey: ab.hotkey,
      cd: ctx.player.cds[cdKey] ?? 0,
      cdMax: ab.cooldown,
      unlocked,
      staminaCost: ab.staminaCost,
    }
  })
  const quests: QuestHud[] = QUESTS.map((qd) => ({
    id: qd.id,
    name: qd.name,
    stage: ctx.quests[qd.id].stage,
    done: ctx.quests[qd.id].done,
    counter: ctx.quests[qd.id].counter,
    summary: qd.summary,
    stageText:
      ctx.quests[qd.id].stage > 0 || ctx.quests[qd.id].done ? stageText(ctx, qd.id) : qd.stages[0].text,
    side: qd.side ?? false,
  }))
  const mainQ = quests.find((q) => q.id === 'main')!
  const contractQ = quests.find((q) => q.id === 'contract')!
  const veldQ = quests.find((q) => q.id === 'veld')!
  // Фаза 6: гранитные квесты тоже попадают в трекер побочек
  const graniteQ = quests.find((q) => q.id === 'granite')!
  const oreQ = quests.find((q) => q.id === 'granite_ore')!
  const scorpQ = quests.find((q) => q.id === 'granite_scorpions')!
  // Фаза 6.2: предельные квесты тоже попадают в трекер побочек
  const frostWQ = quests.find((q) => q.id === 'frost_words')!
  const frostDQ = quests.find((q) => q.id === 'frost_dragon')!
  // Фаза 6.3: маровские квесты тоже попадают в трекер побочек
  const maraQ = quests.find((q) => q.id === 'mara')!
  const maraWQ = quests.find((q) => q.id === 'mara_wells')!
  const maraGQ = quests.find((q) => q.id === 'mara_glands')!
  const sideQ = [contractQ, veldQ, graniteQ, oreQ, scorpQ, frostWQ, frostDQ, maraQ, maraWQ, maraGQ].find(
    (q) => q.stage > 0 && !q.done,
  ) ?? null
  const boss = ctx.entities.find(
    (e) =>
      (e.enemyType === 'boss' ||
        e.enemyType === 'ash_mother' ||
        e.enemyType === 'pit_master' ||
        e.enemyType === 'dragon' ||
        e.enemyType === 'blight_mother') &&
      e.alive &&
      e.aiState !== 'idle',
  )
  // Фаза 6.2: крики Ту'ум — зеркало HUD
  const shouts: ShoutHud[] = [
    {
      id: 'shout_force',
      name: 'Крик: Сила',
      icon: 'Wind',
      hotkey: 'R',
      word: 'ФУС',
      lv: ctx.shoutLv?.force ?? 0,
      cd: ctx.player.cds['shout_force'] ?? 0,
      cdMax: ABILITY_MAP['shout_force']?.cooldown ?? 13,
    },
    {
      id: 'shout_frost',
      name: 'Крик: Мороз',
      icon: 'Snowflake',
      hotkey: 'T',
      word: 'ЛОК',
      lv: ctx.shoutLv?.frost ?? 0,
      cd: ctx.player.cds['shout_frost'] ?? 0,
      cdMax: ABILITY_MAP['shout_frost']?.cooldown ?? 16,
    },
  ]
  // Фаза 6: карьера — зеркало HUD
  const career: CareerHud | null = ctx.career.faction
    ? {
        faction: ctx.career.faction,
        factionName: CAREER_NAME[ctx.career.faction],
        rank: heroRank(ctx),
        rankName: RANK_NAME[heroRank(ctx)],
        rep: ctx.career.rep[ctx.career.faction],
        perks: CAREER_PERKS[ctx.career.faction],
      }
    : null
  const n = ctx.isFrozen() ? null : nearestInteraction(ctx)
  st.patch({
    party,
    abilities,
    player: {
      level: ctx.level,
      xp: ctx.xp,
      xpNext: xpNext(ctx),
      hp: Math.max(0, Math.round(ctx.hp)),
      maxHp: ctx.maxHp,
      stamina: Math.round(ctx.stamina),
      maxStamina: ctx.maxStamina,
      lp: ctx.lp,
      gold: ctx.gold,
      faction: ctx.faction,
      weapon: ctx.weapon,
      armor: ctx.armor,
      attributes: { ...ctx.attributes },
      skills: { ...ctx.skills },
      signs: JSON.parse(JSON.stringify(ctx.signs)) as Record<SignId, { unlocked: boolean; level: number }>,
      shield: ctx.player.shield,
    },
    inventory: ctx.inventory.map((i) => ({ ...i })),
    quests,
    trackerQuest: mainQ.done ? null : mainQ,
    contractQuest: sideQ,
    bossBar: boss ? { name: ENEMY_NAME[boss.enemyType!] ?? 'Хозяин', hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
    interactHint: n ? `${n.label} — [F]` : null,
    bestiary: [...ctx.bestiary],
    // Фаза 3: масло, сутки, зона
    oil: ctx.oilT > 0 && ctx.oilKind ? { name: ITEMS[ctx.oilKind]?.name ?? 'Масло', remain: Math.ceil(ctx.oilT) } : null,
    daytime: ctx.dayClock,
    zoneLabel:
      ctx.zone === 'veld'
        ? 'ВЕЛЬД'
        : ctx.zone === 'granite'
          ? 'ГРАНИТНАЯ ДОЛИНА'
          : ctx.zone === 'frost'
            ? 'СТЫЛОЕ ПРЕДЕЛЬЕ'
            : ctx.zone === 'mara'
              ? 'БАГРОВАЯ МАРА'
              : 'ХЕЙМХОЛЛ И ОКРЕСТНОСТИ',
    formation: ctx.formation,
    career,
    shouts,
    // Фаза 6.3: оборона Бастиона — зеркало HUD
    siege: siegeHud(ctx),
  })
}
