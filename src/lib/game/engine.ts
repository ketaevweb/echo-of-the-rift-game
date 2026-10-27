// ============================================================
// ЭХО РАЗЛОМА — движок (Phase 0.9: фасад)
// GameEngine — публичный API для UI и владелец состояния
// (реализует EngineCtx). Вся логика живёт в systems/*,
// отрисовка — в render2d/*, цикл — в core/Game.ts.
// Правило направления: UI → движок (публичные методы),
// движок → UI (только через стор-зеркало в systems/uiSync).
// ============================================================

import {
  DialogueChoice,
  Entity,
  Faction,
  Floater,
  FormationId,
  InventoryEntry,
  OriginId,
  Particle,
  QuestState,
  SaveData,
  SignId,
  Stance,
  Telegraph,
  Vec,
} from './types'
import { LAKE, PLAYER_SPAWN, PROPS, GATES, GR_GATES, FR_GATES, MA_GATES, zoneOf } from './data/world'
import { sfx, setAmbient } from './sfx'
import { PanelId, useGame } from './store'
import { Collider, seedRot } from './core/util'
import { EngineCtx, RenderMode, SiegeState, ToastKind, ZoneId } from './core/ctx'
import { GameLoop, stepCosmetics, stepWorld } from './core/Game'
import { renderer2d } from './render2d/renderer'
import { drawScene } from './render2d/scene'
import { Renderer3d } from './render3d/Renderer3d'
import { writeRenderMode } from './store'
import { applySave, saveGame as saveGameSys, toTitle as toTitleSys } from './systems/save'
import {
  buyItem as buyItemSys,
  equipItem as equipItemSys,
  sellItem as sellItemSys,
  unequipItem as unequipItemSys,
  useItem as applyUseItem,
} from './systems/inventory'
import {
  openTrainer as openTrainerSys,
  recalcStats as recalcStatsSys,
  spendLp as spendLpSys,
  trainOption as trainOptionSys,
} from './systems/progression'
import {
  castCompanionAbility as castCompanionAbilitySys,
  createPlayer as createPlayerSys,
  spawnCompanion as spawnCompanionSys,
  spawnWorld as spawnWorldSys,
} from './systems/ai'
import { castAbility as castAbilitySys } from './systems/combat'
import { bindInput as bindInputSys, unbindInput as unbindInputSys } from './systems/input'
import { moveWithCollisions as moveWithCollisionsSys } from './systems/movement'
import { cycleFormation as cycleFormationSys } from './systems/party'
import { endPitFight } from './systems/career'
import { RUNE_INIT } from './data/frost'
import {
  chooseOption as chooseOptionSys,
  closeDialogue as closeDialogueSys,
  initQuests as initQuestsSys,
  openDialogue as openDialogueSys,
  questMarker as questMarkerSys,
} from './systems/quest'
import { syncUi as syncUiSys } from './systems/uiSync'

/** Телепорт через врата прерывает ямный бой (арена остаётся в Граните). */
function endPitFightSafe(ctx: GameEngine) {
  try {
    endPitFight(ctx)
  } catch {
    /* яма уже пуста */
  }
}

export { BESTIARY_INFO } from './data/tables'

let engineInstance: GameEngine | null = null
export function getEngine() {
  return engineInstance
}
export interface CreateEngineOpts {
  /** WebGL-канвас для 3D-режима. */
  canvas3d?: HTMLCanvasElement | null
  /** Стартовый режим рендера (по умолчанию 3d). */
  mode?: RenderMode
  /** Фаза 5: происхождение героя при новой игре (по умолчанию — Дозорный). */
  origin?: OriginId
}
export function createEngine(canvas: HTMLCanvasElement, save: SaveData | null, opts?: CreateEngineOpts) {
  engineInstance = new GameEngine(canvas, save, opts)
  if (typeof window !== 'undefined') {
    ;(window as unknown as { __echoEngine?: GameEngine }).__echoEngine = engineInstance
  }
  return engineInstance
}

export class GameEngine implements EngineCtx {
  // --- Состояние (EngineCtx) ---
  canvas: HTMLCanvasElement
  canvas3d: HTMLCanvasElement | null
  inputCanvas: HTMLCanvasElement
  renderMode: RenderMode
  view3d: Renderer3d | null = null
  baked: HTMLCanvasElement
  colliders: Collider[] = []
  props = [...PROPS].sort((a, b) => a.pos.y - b.pos.y)

  eidSeq = 1
  entities: Entity[] = []
  particles: Particle[] = []
  floaters: Floater[] = []
  telegraphs: Telegraph[] = []
  kb = new Map<number, Vec>()

  player!: Entity
  companionIds = { kaya: false, torvald: false }

  level = 1
  xp = 0
  lp = 0
  gold = 60
  hp = 100
  maxHp = 100
  stamina = 80
  maxStamina = 80
  attributes = { might: 3, vigor: 3, intellect: 3, charisma: 3 }
  skills = { blade: 0, vitality: 0, signs: 0, speech: 0 }
  signs: Record<SignId, { unlocked: boolean; level: number }> = {
    igni: { unlocked: true, level: 1 },
    aard: { unlocked: false, level: 0 },
    quen: { unlocked: false, level: 0 },
    axii: { unlocked: false, level: 0 },
    shout: { unlocked: false, level: 1 },
  }
  weapon: string | null = 'sword_rusty'
  armor: string | null = null
  inventory: InventoryEntry[] = []
  faction: Faction = 'none'

  quests: Record<string, QuestState> = {}
  flags: Record<string, boolean> = {}
  bestiary = new Set<string>()
  removedProps = new Set<string>()
  kills = 0
  playtime = 0

  keys = new Set<string>()
  camera: Vec = { ...PLAYER_SPAWN }
  shake = 0
  tacticalPaused = false
  dialogueTree: string | null = null
  dlgChoices: DialogueChoice[] = []
  targetEid: number | null = null
  time = 0
  endingAt: number | null = null
  currentArea = ''
  destroyed = false
  buffT = 0

  // --- Фаза 3: сутки, зоны, масла ---
  dayClock = 0.3
  zone: ZoneId = 'valley'
  oilT = 0
  oilKind: string | null = null
  private zoneBusy = false

  // --- Фаза 4: партия (формации/одобрение/тактика) ---
  approval = { kaya: 45, torvald: 45 }
  formation: FormationId = 'wedge'
  selEid: number | null = null

  // --- Фаза 5: происхождение, Тишь, кинокамера диалогов ---
  origin: OriginId = 'warden'
  silence = 0
  dialogueFocusEid: number | null = null

  // --- Фаза 6: карьера (Gothic) и ямные бои ---
  career = { faction: null, rep: { order: 0, coven: 0, watch: 0 }, rank: { order: 0, coven: 0, watch: 0 } }
  pitTier = 0
  pitWave = 0

  // --- Фаза 6.2: Стылое Пределье (Thu'um и руны) ---
  shoutLv = { force: 0, frost: 0 }
  runes = { ...RUNE_INIT }

  // --- Фаза 6.3: Багровая Мара (оборона бастиона, транзитное — не сейвится) ---
  siege: SiegeState | null = null

  // --- Внутреннее ---
  private ctx2d: CanvasRenderingContext2D
  private mini: HTMLCanvasElement | null = null
  private loop: GameLoop | null = null
  private dpr = 1

  constructor(canvas: HTMLCanvasElement, save: SaveData | null, opts?: CreateEngineOpts) {
    this.canvas = canvas
    this.canvas3d = opts?.canvas3d ?? null
    this.renderMode = opts?.mode ?? '3d'
    this.origin = opts?.origin ?? 'warden'
    this.inputCanvas = this.renderMode === '3d' && this.canvas3d ? this.canvas3d : canvas
    if (this.renderMode === '3d' && this.canvas3d) {
      this.view3d = new Renderer3d(this.canvas3d)
    }
    this.ctx2d = canvas.getContext('2d') as CanvasRenderingContext2D
    this.baked = renderer2d.bakeTerrain()
    this.buildColliders()
    this.initQuests()
    if (save) this.loadFrom(save)
    else this.newGame()
    this.bindInput()
    this.resize()
  }

  // ---------------- Инициализация ----------------

  private buildColliders() {
    this.colliders = [{ x: LAKE.x, y: LAKE.y, r: LAKE.r - 5, propId: 'lake' }]
    for (const p of this.props) {
      if (!p.solid) continue
      if (p.kind === 'house') {
        // Дома — прямоугольный OBB-коллайдер точно по футпринту корпуса
        // (раньше круг r = max(w,h)*0.36 был вдвое меньше — игрок проходил сквозь стены)
        const hw = (p.w ?? 120) / 2
        const hd = (p.h ?? 70) / 2
        this.colliders.push({
          x: p.pos.x,
          y: p.pos.y,
          r: Math.hypot(hw, hd),
          hw,
          hd,
          rot: seedRot(p.seed ?? 1) * 0.2, // тот же поворот, что у меша в Props3d
          propId: p.id,
        })
      } else if (p.kind === 'stall') {
        const hw = (p.w ?? 70) / 2 + 4
        const hd = (p.h ?? 42) / 2 + 4
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: Math.hypot(hw, hd), hw, hd, rot: 0, propId: p.id })
      } else if (p.kind === 'tent') {
        // Конус-палатка: радиус меша w*0.42
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: (p.w ?? 60) * 0.45, propId: p.id })
      } else {
        this.colliders.push({ x: p.pos.x, y: p.pos.y, r: p.r ?? 10, propId: p.id })
      }
    }
  }

  private newGame() {
    this.inventory = [
      { item: 'potion_heal', qty: 3 },
      { item: 'potion_stam', qty: 2 },
    ]
    recalcStatsSys(this, true)
    this.hp = this.maxHp
    this.stamina = this.maxStamina
    this.createPlayer({ ...PLAYER_SPAWN })
    this.spawnWorld()
  }

  private loadFrom(s: SaveData) {
    applySave(this, s)
  }

  // ---------------- Делегаты: спавн/ввод ----------------

  createPlayer(pos: Vec) {
    createPlayerSys(this, pos)
  }

  spawnWorld() {
    spawnWorldSys(this)
  }

  spawnCompanion(id: 'kaya' | 'torvald') {
    spawnCompanionSys(this, id)
  }

  private bindInput() {
    bindInputSys(this)
  }

  private unbindInput() {
    unbindInputSys(this)
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.canvas.width = Math.floor(w * this.dpr)
    this.canvas.height = Math.floor(h * this.dpr)
    this.view3d?.resize()
  }

  attachMinimap(c: HTMLCanvasElement | null) {
    this.mini = c
  }

  // ---------------- Цикл (делегат core/Game) ----------------

  start() {
    this.loop = new GameLoop(this)
    this.loop.start()
  }

  destroy() {
    this.destroyed = true
    this.loop?.stop()
    this.unbindInput()
    this.view3d?.dispose()
    this.view3d = null
    if (engineInstance === this) engineInstance = null
  }

  isFrozen() {
    return useGame.getState().panel !== null || this.dialogueTree !== null
  }

  /** Автосейв по расписанию цикла. */
  autosave() {
    this.saveGame(false)
  }

  /** Порядок систем симуляции — см. core/Game.stepWorld. */
  update(dt: number) {
    stepWorld(this, dt)
  }

  /** Косметика (частицы/флоатеры/тряска) — тикает даже при паузе/панелях. */
  updateCosmetics(dt: number) {
    stepCosmetics(this, dt)
  }

  // ---------------- Способности (делегаты systems/combat, ai) ----------------

  castAbility(id: string) {
    castAbilitySys(this, id)
  }

  castCompanionAbility(eid: number, abilityId: string, targetEid: number | null) {
    castCompanionAbilitySys(this, eid, abilityId, targetEid)
  }

  moveWithCollisions(e: Entity, vx: number, vy: number, dt: number) {
    moveWithCollisionsSys(this, e, vx, vy, dt)
  }

  // ---------------- Диалоги/квесты (делегаты systems/quest) ----------------

  private initQuests() {
    initQuestsSys(this)
  }

  openDialogue(treeId: string) {
    openDialogueSys(this, treeId)
  }

  chooseOption(i: number) {
    chooseOptionSys(this, i)
  }

  closeDialogue() {
    closeDialogueSys(this)
  }

  // ---------------- Предметы/прогресс (делегаты) ----------------

  buyItem(id: string) {
    buyItemSys(this, id)
  }

  sellItem(id: string) {
    sellItemSys(this, id)
  }

  equipItem(id: string) {
    equipItemSys(this, id)
  }

  unequipItem(slot: 'weapon' | 'armor') {
    unequipItemSys(this, slot)
  }

  useItem(id: string) {
    applyUseItem(this, id)
  }

  spendLp(attr: 'might' | 'vigor' | 'intellect' | 'charisma') {
    spendLpSys(this, attr)
  }

  trainOption(id: string) {
    trainOptionSys(this, id)
  }

  // ---------------- Панели / приказы / сейвы ----------------

  /** Переход через Врата Тумана / Врата Гранита: затемнение → телепорт партии → проявление. */
  travelTo(zone: ZoneId) {
    if (this.zoneBusy || this.destroyed) return
    if (zoneOf(this.player.pos.x, this.player.pos.y) === zone) return
    if (!this.player.alive) return
    this.zoneBusy = true
    // Фаза 6/6.2/6.3: из Гранита назад — через врата его стороны, из Пределья — через свои,
    // из Мары — через врата её стороны; иначе — обычные врата
    let gate =
      zone === 'veld'
        ? GATES.veld
        : zone === 'granite'
          ? GR_GATES.granite
          : zone === 'frost'
            ? FR_GATES.frost
            : zone === 'mara'
              ? MA_GATES.mara
              : GATES.valley
    const from = zoneOf(this.player.pos.x, this.player.pos.y)
    if (zone === 'valley' && from === 'granite') {
      gate = GR_GATES.valleySide
    }
    if (zone === 'granite' && from === 'frost') {
      gate = FR_GATES.graniteSide
    }
    if (zone === 'granite' && from === 'mara') {
      gate = MA_GATES.graniteSide
    }
    sfx('portal')
    useGame.getState().patch({ zoneFade: { label: gate.label, phase: 'out' } })
    window.setTimeout(() => {
      if (this.destroyed) return
      const p = { ...gate.exit }
      this.player.pos = { ...p }
      this.player.dest = null
      this.targetEid = null
      this.selEid = null
      for (const e of this.entities) {
        if (e.kind === 'companion') {
          e.pos = { x: p.x - 26, y: p.y + 18 }
          e.home = { x: p.x - 26, y: p.y + 18 } // не возвращаться в прошлую зону
          e.dest = null
        }
      }
      this.camera = { ...p }
      this.zone = zone
      this.currentArea = '' // заставит updateArea показать плашку зоны
      endPitFightSafe(this)
      useGame.getState().patch({ zoneFade: { label: gate.label, phase: 'in' } })
      this.syncUi()
      window.setTimeout(() => {
        if (this.destroyed) return
        useGame.getState().patch({ zoneFade: null })
        this.zoneBusy = false
      }, 750)
    }, 750)
  }

  /** Переключение режима рендера (2D ⇄ 3D) на живую игру. */
  setRenderMode(mode: RenderMode) {
    if (this.renderMode === mode) return
    if (mode === '3d' && !this.canvas3d) return
    this.renderMode = mode
    this.unbindInput()
    this.inputCanvas = mode === '3d' ? this.canvas3d! : this.canvas
    if (mode === '3d') this.view3d = new Renderer3d(this.canvas3d!)
    else {
      this.view3d?.dispose()
      this.view3d = null
    }
    this.bindInput()
    writeRenderMode(mode)
    useGame.getState().patch({ renderMode: mode })
    sfx('click')
    // канвас станет видимым после ре-рендера React — подгоняем размер следующим кадром
    requestAnimationFrame(() => {
      if (!this.destroyed) this.resize()
    })
  }

  openPanel(p: PanelId) {
    if (p === 'trainer') openTrainerSys(this)
    else useGame.getState().setPanel(p)
    sfx('click')
  }

  closePanel() {
    useGame.getState().setPanel(null)
  }

  setStance(eid: number) {
    const e = this.entities.find((x) => x.eid === eid)
    if (!e || e.kind !== 'companion') return
    const cur = e.stance ?? 'follow'
    const next: Stance = cur === 'follow' ? 'hold' : cur === 'hold' ? 'aggressive' : 'follow'
    e.stance = next
    if (next === 'hold') e.home = { ...e.pos }
    else e.dest = null // уходя с «держать», сбрасываем приказ движения
    this.toast(
      `${e.name}: ${next === 'follow' ? 'следовать' : next === 'hold' ? 'держать позицию' : 'атаковать всех'}`,
      'info',
    )
    sfx('click')
    this.syncUi()
  }

  // ---------------- Фаза 4: партия ----------------

  cycleFormation() {
    cycleFormationSys(this)
  }

  setTactical(on: boolean) {
    this.view3d?.setTactical(on)
  }

  saveGame(manual = true) {
    saveGameSys(this, manual)
  }

  toTitle() {
    toTitleSys(this)
  }

  // ---------------- UI-мост ----------------

  toast(text: string, kind: ToastKind = 'info') {
    useGame.getState().pushToast(text, kind)
  }

  syncUi() {
    syncUiSys(this)
    // Эмбиент по зоне (Фаза 3/6/6.2)
    setAmbient(this.zone === 'veld' ? 'veld' : this.zone === 'granite' ? 'granite' : this.zone === 'frost' ? 'frost' : this.zone === 'mara' ? 'mara' : 'valley')
  }

  // ---------------- Рендер (делегаты render2d) ----------------

  renderMinimap() {
    if (!this.mini) return
    renderer2d.drawMinimap(
      this.mini,
      this.baked,
      this.entities,
      this.player.pos,
      questMarkerSys(this),
      this.mini.width,
      this.time,
    )
  }

  renderFullMap(canvas: HTMLCanvasElement) {
    renderer2d.drawFullMap(canvas, this.baked, this.player.pos, questMarkerSys(this))
  }

  render() {
    if (this.renderMode === '3d' && this.view3d) {
      this.view3d.render({
        time: this.time,
        shake: this.shake,
        player: this.player,
        playerAlive: this.player.alive,
        entities: this.entities,
        particles: this.particles,
        floaters: this.floaters,
        telegraphs: this.telegraphs,
        targetEid: this.targetEid,
        removedProps: this.removedProps,
        zone: this.zone,
        dayT: this.dayClock,
        tactical: this.tacticalPaused,
        selEid: this.selEid,
        dialogue: this.dialogueTree !== null,
        dialogueFocus: this.dialogueFocusEid,
        silence: this.silence,
        runes: this.runes,
      })
      return
    }
    drawScene({
      ctx: this.ctx2d,
      renderer: renderer2d,
      w: this.canvas.clientWidth || 1,
      h: this.canvas.clientHeight || 1,
      dpr: this.dpr,
      camera: this.camera,
      shake: this.shake,
      time: this.time,
      baked: this.baked,
      props: this.props,
      removedProps: this.removedProps,
      entities: this.entities,
      targetEid: this.targetEid,
      particles: this.particles,
      floaters: this.floaters,
      telegraphs: this.telegraphs,
      playerAlive: this.player.alive,
      zone: this.zone,
      dayT: this.dayClock,
      tactical: this.tacticalPaused,
      selEid: this.selEid,
      silence: this.silence,
    })
  }
}
