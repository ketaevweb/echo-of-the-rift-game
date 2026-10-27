'use client'

import { useEffect, useState } from 'react'
import { useGame, type DiceRollHudState } from '@/lib/game/store'
import { getEngine } from '@/lib/game/engine'

// ============================================================
// Фаза 5 — диалоговый оверлей:
//  • портретный SVG-арт всех постоянных NPC;
//  • таймер-выборы (ME2): полоса убывает, молчание = вариант;
//  • видимый бросок d20 (BG3) поверх панели;
//  • бейджи происхождения и тегов.
// ============================================================

// ---------------- Портретный арт (процедурный SVG) ----------------

/** Стилизованный бюст 64×64. Стиль: тёмный силуэт + один акцентный цвет фракции. */
function PortraitArt({ speaker, color }: { speaker: string; color: string }) {
  const uid = `pg-${speaker.replace(/[^a-zа-я]/gi, '') || 'x'}`
  const skin = '#c9a077'
  const dark = '#1a1512'
  switch (speaker) {
    case 'Бьорн':
      return (
        <Portrait color={color} uid={uid}>
          {/* седая борода */}
          <ellipse cx="32" cy="38" rx="10" ry="12" fill="#cfc4ae" />
          <ellipse cx="32" cy="31" rx="12" ry="12" fill={skin} />
          <path d="M22 34 Q32 40 42 34 L42 40 Q32 44 22 40 Z" fill="#cfc4ae" />
          {/* обруч старейшины */}
          <path d="M20 24 Q32 16 44 24" stroke="#d9a441" strokeWidth="3" fill="none" />
          <circle cx="32" cy="18" r="2.4" fill="#d9a441" />
          <circle cx="25" cy="29" r="1.6" fill={dark} />
          <circle cx="39" cy="29" r="1.6" fill={dark} />
        </Portrait>
      )
    case 'Грим':
      return (
        <Portrait color={color} uid={uid}>
          <ellipse cx="32" cy="31" rx="12" ry="12" fill={skin} />
          {/* рыжая бородка торговца */}
          <path d="M24 36 Q32 46 40 36 L40 42 Q32 50 24 42 Z" fill="#b06b3a" />
          {/* колпак-капюшон */}
          <path d="M18 28 Q20 12 32 12 Q44 12 46 28 Q40 22 32 22 Q24 22 18 28 Z" fill={color} />
          <circle cx="27" cy="30" r="1.6" fill={dark} />
          <circle cx="37" cy="30" r="1.6" fill={dark} />
          {/* монета-серьга */}
          <circle cx="21" cy="34" r="2" fill="#d9a441" />
        </Portrait>
      )
    case 'Дорн':
      return (
        <Portrait color={color} uid={uid}>
          <ellipse cx="32" cy="31" rx="12" ry="12" fill={skin} />
          <path d="M24 38 L28 50 L32 46 L36 50 L40 38 Z" fill="#6a5a48" />
          {/* шлем-наставник с гребнем */}
          <path d="M20 28 Q22 14 32 14 Q42 14 44 28 Q32 20 20 28 Z" fill={color} />
          <path d="M32 12 L32 20" stroke="#d9a441" strokeWidth="2.4" />
          {/* шрам */}
          <path d="M36 26 L39 33" stroke="#8a5a4a" strokeWidth="1.4" />
          <circle cx="27" cy="30" r="1.6" fill={dark} />
          <circle cx="38" cy="30" r="1.6" fill={dark} />
        </Portrait>
      )
    case 'Ирма':
      return (
        <Portrait color={color} uid={uid}>
          <ellipse cx="32" cy="31" rx="11" ry="12" fill="#d9b08c" />
          {/* шлем капитана с плюмажем-пламенем */}
          <path d="M20 28 Q22 13 32 13 Q42 13 44 28 Q32 21 20 28 Z" fill="#6a5a48" />
          <path d="M32 6 Q36 10 33 14 Q30 10 32 6 Z" fill={color} />
          <path d="M36 8 Q40 11 37 15" stroke={color} strokeWidth="1.8" fill="none" />
          <circle cx="27" cy="30" r="1.6" fill={dark} />
          <circle cx="37" cy="30" r="1.6" fill={dark} />
          {/* ворот Ордена */}
          <path d="M22 48 L32 42 L42 48" stroke={color} strokeWidth="2.4" fill="none" />
        </Portrait>
      )
    case 'Селена':
      return (
        <Portrait color={color} uid={uid}>
          {/* лицо в тени капюшона */}
          <ellipse cx="32" cy="32" rx="10" ry="11" fill="#b59a86" />
          <path d="M18 34 Q16 10 32 10 Q48 10 46 34 Q44 22 32 22 Q20 22 18 34 Z" fill={color} />
          <path d="M18 34 Q18 44 24 48 L22 30 Q26 24 32 24 Z" fill={color} />
          <path d="M46 34 Q46 44 40 48 L42 30 Q38 24 32 24 Z" fill={color} />
          {/* луна на лбу */}
          <path d="M32 18 Q29 21 32 24 Q34 21 32 18 Z" fill="#e8ddc0" />
          <circle cx="28" cy="31" r="1.5" fill={dark} />
          <circle cx="36" cy="31" r="1.5" fill={dark} />
        </Portrait>
      )
    case 'Кайя':
      return (
        <Portrait color={color} uid={uid}>
          {/* волосы магистр-странницы */}
          <ellipse cx="32" cy="31" rx="11" ry="12" fill="#d9b08c" />
          <path d="M20 34 Q18 14 32 14 Q46 14 44 34 Q46 46 40 50 L42 32 Q40 22 32 22 Q24 22 22 32 L24 50 Q18 46 20 34 Z" fill="#8a9a7a" />
          {/* диадема */}
          <path d="M24 24 L40 24" stroke={color} strokeWidth="2" />
          <circle cx="32" cy="22" r="2" fill={color} />
          <circle cx="27" cy="30" r="1.6" fill={dark} />
          <circle cx="37" cy="30" r="1.6" fill={dark} />
          {/* искра-знак */}
          <path d="M46 16 L48 20 L44 20 Z" fill="#bfe3ea" />
        </Portrait>
      )
    case 'Торвальд':
      return (
        <Portrait color={color} uid={uid}>
          <ellipse cx="32" cy="32" rx="12" ry="12" fill="#b98f6a" />
          {/* шлем воителя с усами-бляхой */}
          <path d="M19 30 Q19 12 32 12 Q45 12 45 30 Q38 24 32 24 Q26 24 19 30 Z" fill="#5a5248" />
          <path d="M19 30 L45 30" stroke="#8a7a5a" strokeWidth="2" />
          {/* бородка-косицы */}
          <path d="M26 40 L25 48 M38 40 L39 48" stroke="#6a4a30" strokeWidth="2.4" />
          <path d="M26 38 Q32 44 38 38 L38 42 Q32 46 26 42 Z" fill="#6a4a30" />
          <circle cx="27" cy="31" r="1.7" fill={dark} />
          <circle cx="37" cy="31" r="1.7" fill={dark} />
        </Portrait>
      )
    case 'Альра':
      return (
        <Portrait color={color} uid={uid}>
          <ellipse cx="32" cy="31" rx="11" ry="12" fill="#c9a077" />
          {/* колпак алхимика */}
          <path d="M22 26 Q26 8 32 8 Q38 8 42 26 Q32 20 22 26 Z" fill={color} />
          <path d="M22 26 Q32 21 42 26 L42 30 Q32 25 22 30 Z" fill={color} />
          {/* коса через плечо */}
          <path d="M24 34 Q20 46 26 52" stroke="#7a5a3a" strokeWidth="2.4" fill="none" />
          <circle cx="27" cy="30" r="1.6" fill={dark} />
          <circle cx="37" cy="30" r="1.6" fill={dark} />
          {/* флакон-серьга */}
          <path d="M44 36 L46 42 L42 42 Z" fill="#8fbf7f" />
        </Portrait>
      )
    case 'Пожиратель Бурь':
      return (
        <Portrait color={color} uid={uid}>
          {/* парящий голем-громовержец */}
          <ellipse cx="32" cy="34" rx="13" ry="14" fill="#241a2e" />
          <path d="M12 50 Q32 40 52 50 L52 58 Q32 50 12 58 Z" fill="#241a2e" />
          {/* рога-разряды */}
          <path d="M20 26 Q12 18 16 10 M44 26 Q52 18 48 10" stroke={color} strokeWidth="2.6" fill="none" />
          {/* пасть и глаза-молнии */}
          <path d="M24 40 Q32 46 40 40 Q32 50 24 40 Z" fill="#0a0810" />
          <circle cx="26" cy="30" r="2.2" fill={color} />
          <circle cx="38" cy="30" r="2.2" fill={color} />
          <path d="M30 20 L34 24 L31 25 L35 29" stroke={color} strokeWidth="1.4" fill="none" />
        </Portrait>
      )
    case 'Древний Алтарь':
      return (
        <Portrait color={color} uid={uid}>
          {/* камень-менгир с руной */}
          <path d="M22 58 L24 22 Q32 14 40 22 L42 58 Z" fill="#4a453a" />
          <path d="M22 22 Q32 12 42 22" stroke="#6a6252" strokeWidth="3" fill="none" />
          {/* светящаяся руна */}
          <path d="M32 30 L32 44 M32 32 L26 38 M32 32 L38 38 M32 44 L27 50 M32 44 L37 50" stroke={color} strokeWidth="2" fill="none" />
          <circle cx="32" cy="26" r="2" fill={color} opacity="0.8" />
        </Portrait>
      )
    case 'Доска объявлений':
      return (
        <Portrait color={color} uid={uid}>
          {/* доска с листами контрактов */}
          <rect x="14" y="12" width="36" height="44" rx="2" fill="#4a3a28" />
          <rect x="17" y="15" width="30" height="38" rx="1.5" fill="#5a4832" />
          <rect x="20" y="18" width="24" height="16" fill="#d9c8a0" transform="rotate(-2 32 26)" />
          <rect x="21" y="36" width="22" height="14" fill="#cfc0a0" transform="rotate(2 32 43)" />
          {/* приписка углём */}
          <path d="M23 22 H41 M23 26 H37 M23 30 H39" stroke="#3a2e20" strokeWidth="1.6" />
          <path d="M23 39 H39 M23 43 H35" stroke="#3a2e20" strokeWidth="1.4" />
          <circle cx="32" cy="14" r="1.6" fill="#8a8068" />
        </Portrait>
      )
    default:
      // Фолбэк: иконка (для нестандартных спикеров)
      return (
        <Portrait color={color} uid={uid}>
          <circle cx="32" cy="32" r="14" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
          <text x="32" y="37" textAnchor="middle" fontSize="16" fill={color}>
            ✦
          </text>
        </Portrait>
      )
  }
}

/** Общий каркас портрета: градиентный фон, рамка-виньетка, плечи. */
function Portrait({ children, color, uid }: { children: React.ReactNode; color: string; uid: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" role="img" aria-label="Портрет собеседника">
      <defs>
        <radialGradient id={uid} cx="50%" cy="32%" r="75%">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor="#14100c" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${uid})`} />
      {/* плечи */}
      <path d="M10 64 Q13 47 32 47 Q51 47 54 64 Z" fill="#2a2118" />
      <path d="M24 47 L32 53 L40 47" fill="#1c1610" />
      {children}
      {/* виньетка */}
      <rect width="64" height="64" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="6" />
    </svg>
  )
}

// ---------------- Таймер-выбор (ME2) ----------------

function TimerBar({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    let fired = false
    const t0 = performance.now()
    const iv = window.setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000)
      setLeft(l)
      if (l <= 0 && !fired) {
        fired = true
        window.clearInterval(iv)
        onTimeout()
      }
    }, 100)
    return () => window.clearInterval(iv)
  }, [seconds])
  const pct = Math.max(0, Math.min(100, (left / Math.max(0.1, seconds)) * 100))
  const urgent = left <= 3
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] tracking-[0.25em] ${urgent ? 'text-[#e08a6b]' : 'text-[#c9a3e8]'}`}>
          {urgent ? 'ТИШИНА — РЕШЕЙСЯ!' : 'ВРЕМЯ ИСТЕКАЕТ...'}
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${urgent ? 'text-[#e08a6b]' : 'text-[#c9a3e8]'}`}>
          {left.toFixed(1)}с
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-sm border border-[#3a2e20] bg-[#241c14]">
        <div
          className={`h-full transition-[width] duration-100 ease-linear ${urgent ? 'bg-[#c94f3d]' : 'bg-[#9a7fc0]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------- Видимый бросок d20 (BG3) ----------------

function D20({ value, success }: { value: number; success: boolean }) {
  const stroke = success ? '#d9a441' : '#c94f3d'
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" role="img" aria-label={`Бросок d20: ${value}`}>
      <polygon points="32,3 58,17 58,47 32,61 6,47 6,17" fill="#241c14" stroke={stroke} strokeWidth="2.5" />
      <polygon points="32,12 50,22 32,50 14,22" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.6" />
      <polygon points="32,12 50,22 32,26 14,22" fill="none" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        dominantBaseline="middle"
        className="game-title-font"
        fontSize="18"
        fontWeight="bold"
        fill={success ? '#f5c96b' : '#e08a6b'}
      >
        {value}
      </text>
    </svg>
  )
}

function DiceRollOverlay({ roll }: { roll: DiceRollHudState }) {
  const [shown, setShown] = useState(1)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const iv = window.setInterval(() => setShown(1 + Math.floor(Math.random() * 20)), 70)
    const t = window.setTimeout(() => {
      window.clearInterval(iv)
      setSettled(true)
    }, 820)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(t)
    }
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div
        className={`w-72 rounded border bg-[#14100c]/95 p-4 text-center shadow-2xl backdrop-blur-sm ${
          settled ? (roll.success ? 'border-[#d9a441]' : 'border-[#c94f3d]') : 'border-[#5a4632]'
        }`}
      >
        <p className="game-title-font text-xs tracking-[0.3em] text-[#c9b06b]">БРОСОК D20</p>
        <p className="mt-1 truncate text-[11px] text-[#cfc0a0]">{roll.label}</p>
        <div className="mt-2 flex justify-center">
          <D20 value={settled ? roll.roll : shown} success={settled ? roll.success : true} />
        </div>
        {settled ? (
          <>
            <p className="mt-2 text-sm text-[#e8d5a8]">
              <span className={roll.success ? 'text-[#f5c96b]' : 'text-[#e08a6b]'}>{roll.roll}</span>
              {' + '}
              <span className="text-[#cfc0a0]">{roll.bonus}</span>
              {' = '}
              <span className="font-bold text-[#f5e6c4]">{roll.total}</span>
              {' против '}
              <span className="text-[#c9b06b]">СЛ {roll.dc}</span>
            </p>
            <p className={`game-title-font mt-1 text-lg tracking-[0.35em] ${roll.success ? 'text-[#d9a441]' : 'text-[#c94f3d]'}`}>
              {roll.success ? 'УСПЕХ' : 'ПРОВАЛ'}
            </p>
          </>
        ) : (
          <p className="mt-2 animate-pulse text-xs text-[#8a8068]">кубик катится...</p>
        )}
      </div>
    </div>
  )
}

// ---------------- Оверлей диалога ----------------

export default function DialogueOverlay() {
  const dialogue = useGame((s) => s.dialogue)
  const diceRoll = useGame((s) => s.diceRoll)

  // Таймер-выбор: отсчёт с начала узла; молчание = вариант onTimeout
  useEffect(() => {
    if (!dialogue || !dialogue.timer || dialogue.timer <= 0) return
    const engine = getEngine()
    const choiceIdx = dialogue.onTimeout ?? dialogue.choices.length - 1
    let fired = false
    const t0 = performance.now()
    const iv = window.setInterval(() => {
      const left = dialogue.timer! - (performance.now() - t0) / 1000
      if (left <= 0 && !fired) {
        fired = true
        window.clearInterval(iv)
        engine?.chooseOption(choiceIdx)
      }
    }, 100)
    return () => window.clearInterval(iv)
  }, [dialogue])

  if (!dialogue) return null
  const engine = getEngine()
  const busy = !!diceRoll // пока кубик летит — выборы заблокированы

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-0">
      {diceRoll && <DiceRollOverlay roll={diceRoll} />}
      <div className="pointer-events-auto m-3 mb-4 w-full max-w-3xl rounded border border-[#5a4632] game-panel p-4 sm:p-5">
        <div className="flex gap-4">
          {/* Портретный арт (Фаза 5) */}
          <div className="hidden shrink-0 flex-col items-center sm:flex">
            <span
              className="h-24 w-20 overflow-hidden rounded border-2"
              style={{ borderColor: dialogue.portraitColor, background: 'rgba(20,16,12,0.9)' }}
            >
              <PortraitArt speaker={dialogue.speaker} color={dialogue.portraitColor} />
            </span>
            <span className="mt-1 h-8 w-px bg-gradient-to-b from-[#5a4632] to-transparent" />
          </div>
          {/* Текст */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <p className="game-title-font text-base font-semibold text-[#f5c96b]">{dialogue.speaker}</p>
              <p className="text-[11px] uppercase tracking-widest text-[#8a8068]">{dialogue.role}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#e8d5a8]">{dialogue.text}</p>
            {/* Таймер-выбор (Фаза 5) */}
            {dialogue.timer && dialogue.timer > 0 && (
              <div className="mt-3">
                <TimerBar key={`${dialogue.speaker}-${dialogue.text}`} seconds={dialogue.timer} onTimeout={() => engine?.chooseOption(dialogue.onTimeout ?? dialogue.choices.length - 1)} />
              </div>
            )}
            {/* Варианты */}
            <div className="mt-4 flex flex-col gap-1.5">
              {dialogue.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => engine?.chooseOption(i)}
                  disabled={busy}
                  className={`group flex items-center gap-2 rounded border px-3 py-2 text-left text-sm transition ${
                    busy
                      ? 'border-[#3a2e20] bg-[#241c14]/40 text-[#7a7060]'
                      : 'border-[#3a2e20] bg-[#241c14]/60 text-[#cfc0a0] hover:border-[#d9a441] hover:bg-[#2a2118] hover:text-[#f5c96b]'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[10px] font-bold ${busy ? 'border-[#3a2e20] text-[#5a5044]' : 'border-[#5a4632] text-[#9a8f78] group-hover:border-[#d9a441] group-hover:text-[#d9a441]'}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{c.text}</span>
                  {c.origin && (
                    <span className="shrink-0 rounded bg-[#2a1f2e] px-1.5 py-0.5 text-[10px] tracking-wider text-[#c9a3e8]" title="Реплика происхождения">
                      ✦ ПРОИСХОЖДЕНИЕ
                    </span>
                  )}
                  {c.tag && !c.origin && (
                    <span className="shrink-0 rounded bg-[#3a2e20] px-1.5 py-0.5 text-[10px] tracking-wider text-[#d9a441]">
                      {c.tag}
                    </span>
                  )}
                  {c.checkLabel && (
                    <span className="shrink-0 rounded border border-[#d9a441]/50 px-1.5 py-0.5 text-[10px] text-[#f5c96b]">
                      {c.checkLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
