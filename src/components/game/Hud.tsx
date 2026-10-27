'use client'

import { useEffect, useRef, useState } from 'react'
import { Heart, Map, Moon, ScrollText, Shield, Snowflake, Sun, User, Volume2, VolumeX, Wind, X } from 'lucide-react'
import { isMuted, setMuted } from '@/lib/game/sfx'
import { getEngine } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import { GameIcon } from './GameIcon'

/** Цели счётчиков побочных квестов для трекера (N из M). */
const CONTRACT_TOTALS: Record<string, number> = {
  veld: 3,
  granite_ore: 4,
  granite_scorpions: 5,
  frost_dragon: 3,
  mara_wells: 3,
  mara_glands: 5,
}

const STANCE_LABEL: Record<string, string> = {
  follow: 'Следовать',
  hold: 'Держать позицию',
  aggressive: 'Атаковать всех',
}

function Bar({ value, max, color, bg = 'bg-[#241c14]' }: { value: number; max: number; color: string; bg?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-sm border border-[#3a2e20] ${bg}`}>
      <div className={`h-full ${color} transition-[width] duration-200`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function PartyFrame({
  p,
}: {
  p: { eid: number; id: string; name: string; role: string; hp: number; maxHp: number; alive: boolean; stance: string; approval: number; abilities: Array<{ id: string; name: string; icon: string; cd: number; cdMax: number }> }
}) {
  const engine = getEngine()
  const isPlayer = p.id === 'player'
  const trusted = p.approval >= 60 // порог парных приёмов (Фаза 4)
  return (
    <div className="pointer-events-auto w-56 rounded border border-[#5a4632]/80 bg-[#181410]/85 p-2 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${p.alive ? 'border-[#d9a441]/60 bg-[#241c14]' : 'border-[#c94f3d] bg-[#c94f3d]/20 text-[#e08a6b]'}`}>
            {isPlayer ? <User className="h-4 w-4 text-[#d9a441]" /> : <GameIcon name={p.id === 'kaya' ? 'Sparkles' : 'ShieldHalf'} className="h-4 w-4 text-[#9fb8a4]" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#e8d5a8]">{p.name}</p>
            <p className="truncate text-[10px] text-[#8a8068]">
              {isPlayer ? p.role : STANCE_LABEL[p.stance] ?? ''}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-[#9a8f78]">
          {p.hp}/{p.maxHp}
        </span>
      </div>
      <div className="mt-1.5">
        <Bar value={p.hp} max={p.maxHp} color={p.alive ? (isPlayer ? 'bg-[#8fbf7f]' : 'bg-[#7a9a6a]') : 'bg-[#c94f3d]'} />
      </div>
      {/* Фаза 4: одобрение компаньона — при ≥60 открываются парные приёмы */}
      {!isPlayer && (
        <div className="mt-1 flex items-center gap-1.5" title={trusted ? 'Доверие высоко — парные приёмы доступны' : 'Доверие растёт от боёв и квестов. При 60 — парные приёмы'}>
          <Heart className={`h-2.5 w-2.5 shrink-0 ${trusted ? 'text-[#e08a6b]' : 'text-[#6a5f4a]'}`} />
          <div className="h-1 w-full overflow-hidden rounded-sm bg-[#241c14]">
            <div
              className={`h-full transition-[width] duration-300 ${trusted ? 'bg-[#d9a441]' : 'bg-[#6a5f4a]'}`}
              style={{ width: `${Math.max(0, Math.min(100, p.approval))}%` }}
            />
          </div>
          <span className={`shrink-0 text-[9px] tabular-nums ${trusted ? 'text-[#f5c96b]' : 'text-[#8a8068]'}`}>{p.approval}</span>
        </div>
      )}
      {!isPlayer && (
        <div className="mt-1.5 flex items-center gap-1">
          <button
            onClick={() => engine?.setStance(p.eid)}
            className="rounded border border-[#3a2e20] bg-[#241c14] px-2 py-0.5 text-[10px] text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            title="Сменить приказ"
          >
            Приказ: {STANCE_LABEL[p.stance]}
          </button>
          {p.abilities.map((a) => {
            const cdPct = a.cdMax > 0 ? (a.cd / a.cdMax) * 100 : 0
            return (
              <button
                key={a.id}
                onClick={() => engine?.castCompanionAbility(p.eid, a.id, null)}
                disabled={a.cd > 0 || !p.alive}
                className="relative h-7 w-7 overflow-hidden rounded border border-[#3a2e20] bg-[#241c14] text-[#cfc0a0] transition hover:border-[#d9a441] disabled:opacity-60"
                title={`${a.name}${a.cd > 0 ? ` — откат ${a.cd.toFixed(1)}с` : ''}`}
              >
                <GameIcon name={a.icon} className="mx-auto h-4 w-4" />
                {a.cd > 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Hud() {
  const party = useGame((s) => s.party)
  const player = useGame((s) => s.player)
  const abilities = useGame((s) => s.abilities)
  const trackerQuest = useGame((s) => s.trackerQuest)
  const contractQuest = useGame((s) => s.contractQuest)
  const toasts = useGame((s) => s.toasts)
  const clearToast = useGame((s) => s.clearToast)
  const areaToast = useGame((s) => s.areaToast)
  const bossBar = useGame((s) => s.bossBar)
  const paused = useGame((s) => s.paused)
  const interactHint = useGame((s) => s.interactHint)
  const oil = useGame((s) => s.oil)
  const daytime = useGame((s) => s.daytime)
  const zoneLabel = useGame((s) => s.zoneLabel)
  const formation = useGame((s) => s.formation)
  const shouts = useGame((s) => s.shouts)
  const siege = useGame((s) => s.siege)
  const miniRef = useRef<HTMLCanvasElement | null>(null)
  const [muted, setMutedUi] = useState(false)

  useEffect(() => {
    const engine = getEngine()
    if (engine && miniRef.current) engine.attachMinimap(miniRef.current)
  }, [])

  // автоудаление тостов
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => setTimeout(() => clearToast(t.id), 3600))
    return () => timers.forEach(clearTimeout)
  }, [toasts, clearToast])

  // плашка области
  useEffect(() => {
    if (!areaToast) return
    const t = setTimeout(() => useGame.getState().patch({ areaToast: null }), 2400)
    return () => clearTimeout(t)
  }, [areaToast])

  const xpPct = player ? Math.min(100, (player.xp / Math.max(1, player.xpNext)) * 100) : 0
  // Сутки (Фаза 3): рассвет 0.25, закат 0.75
  const isDay = daytime > 0.23 && daytime < 0.77

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-[#e8d5a8]">
      {/* Отряд слева сверху */}
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        {party.map((p) => (
          <PartyFrame key={p.eid} p={p} />
        ))}
      </div>

      {/* Миникарта и трекер справа сверху */}
      <div className="absolute right-3 top-3 flex w-56 flex-col gap-2">
        <div className="pointer-events-auto overflow-hidden rounded border border-[#5a4632]/80 bg-[#181410]/85 p-1 backdrop-blur-sm">
          <canvas ref={miniRef} data-minimap width={214} height={160} className="h-auto w-full rounded-sm" />
          <div className="mt-1 flex items-center justify-between px-1 pb-0.5">
            <span className="flex items-center gap-1.5">
              {isDay ? <Sun className="h-3.5 w-3.5 text-[#d9a441]" /> : <Moon className="h-3.5 w-3.5 text-[#8a9a88]" />}
              <span className="text-[10px] tracking-widest text-[#8a8068]">{zoneLabel}</span>
            </span>
            <button
              onClick={() => getEngine()?.openPanel('map')}
              className="text-[#9a8f78] transition hover:text-[#d9a441]"
              title="Полная карта [M]"
            >
              <Map className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {(trackerQuest || contractQuest) && (
          <div className="pointer-events-auto rounded border border-[#5a4632]/80 bg-[#181410]/85 p-2 backdrop-blur-sm">
            {trackerQuest && (
              <div>
                <p className="text-[11px] font-semibold text-[#f5c96b]">{trackerQuest.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#cfc0a0]">
                  {trackerQuest.stage === 2 ? `${trackerQuest.stageText} (${trackerQuest.counter}/4)` : trackerQuest.stageText}
                </p>
              </div>
            )}
            {contractQuest && (
              <div className={trackerQuest ? 'mt-2 border-t border-[#3a2e20] pt-2' : ''}>
                <p className="text-[11px] font-semibold text-[#c9b06b]">{contractQuest.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#a89a7d]">
                  {contractQuest.counter > 0
                    ? `${contractQuest.stageText} (${contractQuest.counter}/${CONTRACT_TOTALS[contractQuest.id] ?? contractQuest.counter})`
                    : contractQuest.stageText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Босс-бар */}
      {bossBar && (
        <div className="absolute left-1/2 top-3 w-80 -translate-x-1/2">
          <p className="game-title-font text-center text-sm tracking-[0.3em] text-[#c9a3e8]">{bossBar.name}</p>
          <div className="mt-1">
            <Bar value={bossBar.hp} max={bossBar.maxHp} color="bg-[#a06bd9]" bg="bg-[#1a1220]" />
          </div>
        </div>
      )}

      {/* Оборона Бастиона (Фаза 6.3): волна + прочность частокола */}
      {siege && (
        <div className="absolute bottom-40 left-1/2 w-72 -translate-x-1/2 rounded border border-[#c94f3d]/60 bg-[#181410]/90 px-3 py-2 backdrop-blur-sm">
          <p className="game-title-font text-center text-[11px] tracking-[0.25em] text-[#e08a6b]">
            ОБОРОНА БАСТИОНА · ВОЛНА {Math.min(siege.wave + 1, siege.waves)}/{siege.waves}
          </p>
          <div className="mt-1.5">
            <Bar value={siege.gateHp} max={100} color="bg-[#d9a441]" bg="bg-[#241a10]" />
          </div>
          <p className="mt-1 text-center text-[10px] text-[#9a8f78]">
            Частокол: {Math.max(0, Math.ceil(siege.gateHp))}% — не дай мору его прогрызть
          </p>
        </div>
      )}

      {/* Тосты */}
      <div className="absolute left-1/2 top-16 flex w-80 -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm ${
              t.kind === 'quest'
                ? 'border-[#d9a441]/60 bg-[#2a2010]/90 text-[#f5c96b]'
                : t.kind === 'level'
                  ? 'border-[#f5c96b]/70 bg-[#33270e]/90 text-[#ffe4a0]'
                  : t.kind === 'warn'
                    ? 'border-[#c94f3d]/60 bg-[#2a1410]/90 text-[#e08a6b]'
                    : t.kind === 'loot'
                      ? 'border-[#5a4632] bg-[#1c1712]/90 text-[#c9b06b]'
                      : 'border-[#5a4632] bg-[#1c1712]/90 text-[#cfc0a0]'
            }`}
          >
            <span className="flex items-center gap-2">
              {t.kind === 'quest' && <ScrollText className="h-3.5 w-3.5 shrink-0" />}
              {t.kind === 'level' && <GameIcon name="Sparkles" className="h-3.5 w-3.5 shrink-0" />}
              {t.kind === 'warn' && <Heart className="h-3.5 w-3.5 shrink-0" />}
              {t.kind === 'loot' && <GameIcon name="Gem" className="h-3.5 w-3.5 shrink-0" />}
              {t.text}
            </span>
            <button onClick={() => clearToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Плашка области */}
      {areaToast && (
        <div key={areaToast.id} className="absolute left-1/2 top-1/4 -translate-x-1/2 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="game-title-font text-3xl font-semibold tracking-[0.35em] text-[#f5e6c4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {areaToast.name.toUpperCase()}
          </p>
          <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-[#d9a441] to-transparent" />
        </div>
      )}

      {/* Тактическая пауза (Фаза 4): приказы DAO-lite */}
      {paused && (
        <>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p className="game-title-font rounded border border-[#d9a441]/70 bg-[#181410]/90 px-6 py-2 text-xl tracking-[0.4em] text-[#f5c96b]">
              ТАКТИЧЕСКАЯ ПАУЗА
            </p>
          </div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded border border-[#5a4632]/70 bg-[#181410]/90 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-[11px] leading-relaxed text-[#cfc0a0]">
              <span className="text-[#f5c96b]">ЛКМ по компаньону</span> — выбрать · <span className="text-[#f5c96b]">ЛКМ по земле</span> — приказ движения · <span className="text-[#f5c96b]">ЛКМ по врагу</span> — цель отряда
            </p>
            <p className="mt-0.5 text-[10px] text-[#8a8068]">
              <span className="text-[#f5c96b]">V</span> — строй: {formation === 'wedge' ? 'клин' : 'линия'} · <span className="text-[#f5c96b]">Tab</span> — цель · <span className="text-[#f5c96b]">Пробел</span> — отпустить мир
            </p>
          </div>
        </>
      )}

      {/* Подсказка взаимодействия */}
      {interactHint && !paused && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
          <p className="rounded border border-[#d9a441]/50 bg-[#181410]/90 px-3 py-1 text-xs text-[#f5c96b]">{interactHint}</p>
        </div>
      )}

      {/* Меню слева снизу */}
      <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-col gap-2">
        <div className="flex gap-1.5">
          {[
            { id: 'char', label: 'C', icon: 'User', title: 'Персонаж [C]' },
            { id: 'inv', label: 'I', icon: 'Backpack', title: 'Инвентарь [I]' },
            { id: 'journal', label: 'J', icon: 'ScrollText', title: 'Журнал [J]' },
            { id: 'map', label: 'M', icon: 'Map', title: 'Карта [M]' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => getEngine()?.openPanel(b.id as 'char')}
              title={b.title}
              className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            >
              <GameIcon name={b.icon} className="h-4 w-4" />
              <span className="sr-only">{b.title}</span>
            </button>
          ))}
          <button
            onClick={() => getEngine()?.openPanel('pause')}
            title="Меню [Esc]"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441] hover:text-[#f5c96b]"
          >
            <GameIcon name="Settings" className="h-4 w-4" />
            <span className="sr-only">Меню</span>
          </button>
          <button
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedUi(next)
            }}
            title="Звук"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#5a4632] bg-[#181410]/85 text-[#cfc0a0] backdrop-blur-sm transition hover:border-[#d9a441]"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span className="sr-only">Звук</span>
          </button>
        </div>
      </div>

      {/* Панель умений снизу по центру */}
      {player && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-end gap-1.5 rounded border border-[#5a4632]/70 bg-[#181410]/85 p-2 backdrop-blur-sm">
            {/* Фаза 6.2: крики Ту'ум (R/T) — слева от бара умений */}
            {shouts.map((sh) => {
              const cdPct = sh.cdMax > 0 ? (sh.cd / sh.cdMax) * 100 : 0
              const open = sh.lv > 0
              return (
                <button
                  key={sh.id}
                  onClick={() => getEngine()?.castAbility(sh.id)}
                  disabled={!open || sh.cd > 0}
                  className={`relative h-12 w-12 overflow-hidden rounded border ${
                    open
                      ? 'border-[#f5c96b]/50 bg-[#1c1a10]'
                      : 'border-[#3a2e20] bg-[#181410] opacity-40'
                  }`}
                  title={
                    open
                      ? `${sh.name} [${sh.hotkey}] — слово «${sh.word}» ${sh.lv >= 2 ? 'II' : 'I'}${sh.cd > 0 ? ` — откат ${sh.cd.toFixed(1)}с` : ''}`
                      : `${sh.name} — слово не открыто. Ищи Стены Слов в Стылом Пределье.`
                  }
                >
                  {sh.id === 'shout_force' ? (
                    <Wind className="mx-auto mt-2 h-6 w-6 text-[#f5c96b]" />
                  ) : (
                    <Snowflake className="mx-auto mt-2 h-6 w-6 text-[#bfe3ea]" />
                  )}
                  <span className="absolute left-1 top-0.5 text-[9px] font-bold text-[#d9a441]">{sh.hotkey}</span>
                  {open && (
                    <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-[#f5c96b]">
                      {sh.lv >= 2 ? 'II' : 'I'}
                    </span>
                  )}
                  {sh.cd > 0 && (
                    <>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {sh.cd.toFixed(0)}
                      </span>
                    </>
                  )}
                  {!open && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Shield className="h-4 w-4 text-[#8a8068]" />
                    </span>
                  )}
                </button>
              )
            })}
            <div className="mx-0.5 h-10 w-px bg-[#3a2e20]" />
            {abilities.map((a) => {
              const cdPct = a.cdMax > 0 ? (a.cd / a.cdMax) * 100 : 0
              return (
                <button
                  key={a.id}
                  onClick={() => getEngine()?.castAbility(a.id)}
                  disabled={!a.unlocked || a.cd > 0}
                  className={`ability-slot group relative h-12 w-12 overflow-hidden rounded ${!a.unlocked ? 'opacity-40' : ''}`}
                  title={`${a.name} [${a.hotkey}]${a.staminaCost ? ` — ${a.staminaCost} ОВ` : ''}\n${a.desc}`}
                >
                  <GameIcon name={a.icon} className="mx-auto mt-2 h-6 w-6 text-[#e8d5a8]" />
                  <span className="absolute left-1 top-0.5 text-[9px] font-bold text-[#d9a441]">{a.hotkey}</span>
                  {a.staminaCost > 0 && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-[#9a8f78]">{a.staminaCost}</span>
                  )}
                  {a.cd > 0 && (
                    <>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${cdPct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {a.cd.toFixed(0)}
                      </span>
                    </>
                  )}
                  {!a.unlocked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Shield className="h-4 w-4 text-[#8a8068]" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Масло на клинке (Фаза 3) */}
          {oil && (
            <div className="mx-auto mb-1 flex w-fit items-center gap-1.5 rounded border border-[#d9a441]/50 bg-[#181410]/90 px-2 py-0.5">
              <GameIcon name="Droplets" className="h-3 w-3 text-[#d9a441]" />
              <span className="text-[10px] text-[#f5c96b]">{oil.name}</span>
              <span className="text-[10px] tabular-nums text-[#9a8f78]">{oil.remain}с</span>
            </div>
          )}
          {/* XP полоска */}
          <div className="mx-auto mt-1 w-72">
            <div className="h-1 overflow-hidden rounded-full bg-[#241c14]">
              <div className="h-full bg-[#c9b06b]/80" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
