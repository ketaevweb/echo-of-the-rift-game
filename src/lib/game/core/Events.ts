// ============================================================
// ЭХО РАЗЛОМА — шина событий (Phase 0.9)
// Типизированная шина для кросс-системных событий.
// Systems эмитят, кто хочет — слушает (UI-звуки, метрики,
// ачивки, музыкальный директор в Фазе 8). Слабая связность:
// эмиттер не знает слушателей.
// ============================================================

export interface GameEventMap {
  'enemy:killed': { eid: number; enemyType: string; byPlayer: boolean }
  'player:died': Record<string, never>
  'player:levelup': { level: number }
  'quest:advance': { questId: string; stage: number; done: boolean }
  'flag:set': { flag: string; value: boolean }
  'faction:join': { faction: string }
  'item:acquired': { item: string; qty: number }
}

type Handler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void

export class EventBus {
  private handlers = new Map<keyof GameEventMap, Set<Handler<keyof GameEventMap>>>()

  on<K extends keyof GameEventMap>(event: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(fn as Handler<keyof GameEventMap>)
    return () => set!.delete(fn as Handler<keyof GameEventMap>)
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const fn of set) (fn as Handler<K>)(payload)
  }

  clear() {
    this.handlers.clear()
  }
}

/** Глобальная шина игры. Живёт столько же, сколько вкладка. */
export const bus = new EventBus()
