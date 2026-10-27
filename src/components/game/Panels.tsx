'use client'

import { useEffect, useRef, useState } from 'react'
import { Coins, ScrollText, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getEngine, BESTIARY_INFO } from '@/lib/game/engine'
import { ITEMS } from '@/lib/game/data/items'
import { isMuted, setMuted } from '@/lib/game/sfx'
import { boot, useGame } from '@/lib/game/store'
import { GameIcon } from './GameIcon'

function Panel({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`game-panel flex max-h-[88vh] w-full flex-col rounded-lg ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex items-center justify-between border-b border-[#5a4632] px-5 py-3">
          <div>
            <h2 className="game-title-font text-lg tracking-[0.25em] text-[#f5c96b]">{title.toUpperCase()}</h2>
            {subtitle && <p className="text-[11px] text-[#8a8068]">{subtitle}</p>}
          </div>
          <button
            onClick={() => getEngine()?.closePanel()}
            className="rounded border border-[#5a4632] p-1.5 text-[#9a8f78] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="game-scroll overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2 ${className}`}>
      {children}
    </div>
  )
}

function AttrLine({ name, value, attr, hint }: { name: string; value: number; attr: 'might' | 'vigor' | 'intellect' | 'charisma'; hint: string }) {
  const lp = useGame((s) => s.player?.lp ?? 0)
  return (
    <Row>
      <div>
        <p className="text-sm text-[#e8d5a8]">
          {name}: <span className="font-bold text-[#f5c96b]">{value}</span>
        </p>
        <p className="text-[11px] text-[#8a8068]">{hint}</p>
      </div>
      <button
        onClick={() => getEngine()?.spendLp(attr)}
        disabled={lp < 3}
        className="shrink-0 rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-3 py-1.5 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +1 (3 ОН)
      </button>
    </Row>
  )
}

function CharPanel() {
  const player = useGame((s) => s.player)
  const career = useGame((s) => s.career)
  if (!player) return null
  const signList: Array<{ id: 'igni' | 'aard' | 'quen' | 'axii'; name: string }> = [
    { id: 'igni', name: 'Игни — огонь' },
    { id: 'aard', name: 'Аард — телекинез' },
    { id: 'quen', name: 'Квен — щит' },
    { id: 'axii', name: 'Аксий — обман' },
  ]
  return (
    <Panel title="Персонаж" subtitle={`Уровень ${player.level} · Опыт ${player.xp}/${player.xpNext}`} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">АТРИБУТЫ · ОН: {player.lp}</p>
          <AttrLine name="Мощь" value={player.attributes.might} attr="might" hint="Атака и урон клинком" />
          <AttrLine name="Стойкость" value={player.attributes.vigor} attr="vigor" hint="Здоровье и класс брони" />
          <AttrLine name="Разум" value={player.attributes.intellect} attr="intellect" hint="Сила знаков" />
          <AttrLine name="Обаяние" value={player.attributes.charisma} attr="charisma" hint="Убеждение в диалогах" />
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">НАВЫКИ (НАСТАВНИК)</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Row className="!justify-start">Клинок: <b className="ml-auto text-[#f5c96b]">{player.skills.blade}/5</b></Row>
            <Row className="!justify-start">Живучесть: <b className="ml-auto text-[#f5c96b]">{player.skills.vitality}/5</b></Row>
            <Row className="!justify-start">Знаки: <b className="ml-auto text-[#f5c96b]">{player.skills.signs}/5</b></Row>
            <Row className="!justify-start">Красноречие: <b className="ml-auto text-[#f5c96b]">{player.skills.speech}/5</b></Row>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="game-title-font text-xs tracking-[0.25em] text-[#9a8f78]">СНАРЯЖЕНИЕ</p>
          <Row>
            <span className="flex items-center gap-2 text-sm text-[#e8d5a8]">
              <GameIcon name="Sword" className="h-4 w-4 text-[#c9b06b]" /> Оружие
            </span>
            <span className="text-sm text-[#f5c96b]">{player.weapon ? ITEMS[player.weapon].name : '— кулаки —'}</span>
          </Row>
          <Row>
            <span className="flex items-center gap-2 text-sm text-[#e8d5a8]">
              <GameIcon name="Shirt" className="h-4 w-4 text-[#c9b06b]" /> Броня
            </span>
            <span className="text-sm text-[#f5c96b]">{player.armor ? ITEMS[player.armor].name : '— нет —'}</span>
          </Row>
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">ЗНАКИ</p>
          {signList.map((s) => {
            const st = player.signs[s.id]
            return (
              <Row key={s.id}>
                <span className={`text-sm ${st.unlocked ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>{s.name}</span>
                <span className={`text-xs ${st.unlocked ? 'text-[#f5c96b]' : 'text-[#6a6152]'}`}>
                  {st.unlocked ? `ур. ${st.level}` : 'не изучен'}
                </span>
              </Row>
            )
          })}
          <Row>
            <span className={`text-sm ${player.signs.shout.unlocked ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>
              Голос Древних — крик силы
            </span>
            <span className={`text-xs ${player.signs.shout.unlocked ? 'text-[#f5c96b]' : 'text-[#6a6152]'}`}>
              {player.signs.shout.unlocked ? 'изучен' : 'алтарь у Камней'}
            </span>
          </Row>
          <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">СОСТОЯНИЕ</p>
          <Row>
            <span className="text-sm text-[#e8d5a8]">Золото</span>
            <span className="flex items-center gap-1 text-sm font-bold text-[#e8d5a8]">
              <Coins className="h-4 w-4 text-[#e8c56b]" /> {player.gold}
            </span>
          </Row>
          <Row>
            <span className="text-sm text-[#e8d5a8]">Фракция</span>
            <span className="text-sm text-[#f5c96b]">
              {player.faction === 'flame' ? 'Орден Пламени' : player.faction === 'mist' ? 'Ковен Тумана' : 'Вольный'}
            </span>
          </Row>
          {career && (
            <>
              <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">КАРЬЕРА КОЛОНИИ (ФАЗА 6)</p>
              <Row>
                <span className="text-sm text-[#e8d5a8]">{career.factionName}</span>
                <span className="text-sm text-[#f5c96b]">{career.rankName}</span>
              </Row>
              <Row>
                <span className="text-sm text-[#e8d5a8]">Слава лагеря</span>
                <span className="text-sm text-[#f5c96b]">{career.rep}/100</span>
              </Row>
              {career.perks.map((p) => (
                <p key={p} className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-1.5 text-xs text-[#b8ab8c]">
                  ✦ {p}
                </p>
              ))}
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}

function InvPanel() {
  const inventory = useGame((s) => s.inventory)
  const player = useGame((s) => s.player)
  if (!player) return null
  const equipped = [
    { slot: 'weapon' as const, label: 'Оружие', item: player.weapon },
    { slot: 'armor' as const, label: 'Броня', item: player.armor },
  ]
  return (
    <Panel title="Инвентарь" subtitle={`Золото: ${player.gold}`}>
      <div className="flex flex-col gap-2">
        {equipped.map((eq) => (
          <Row key={eq.slot}>
            <span className="text-sm text-[#e8d5a8]">
              {eq.label}: <span className="text-[#f5c96b]">{eq.item ? ITEMS[eq.item].name : '— пусто —'}</span>
            </span>
            {eq.item && (
              <button
                onClick={() => getEngine()?.unequipItem(eq.slot)}
                className="rounded border border-[#5a4632] px-3 py-1 text-xs text-[#cfc0a0] transition hover:border-[#d9a441] hover:text-[#f5c96b]"
              >
                Снять
              </button>
            )}
          </Row>
        ))}
        <p className="game-title-font mt-3 text-xs tracking-[0.25em] text-[#9a8f78]">СУМКА</p>
        {inventory.length === 0 && <p className="text-sm text-[#8a8068]">Пусто. Как в карманах после таверны.</p>}
        {inventory.map((inv) => {
          const def = ITEMS[inv.item]
          if (!def) return null
          return (
            <Row key={inv.item}>
              <div className="flex min-w-0 items-center gap-2">
                <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#e8d5a8]">
                    {def.name} {inv.qty > 1 && <span className="text-[#c9b06b]">×{inv.qty}</span>}
                  </p>
                  <p className="truncate text-[11px] text-[#8a8068]">{def.desc}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {def.type === 'weapon' || def.type === 'armor' ? (
                  <button
                    onClick={() => getEngine()?.equipItem(inv.item)}
                    className="rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-2.5 py-1 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25"
                  >
                    Надеть
                  </button>
                ) : null}
                {def.type === 'potion' && (
                  <button
                    onClick={() => getEngine()?.useItem(inv.item)}
                    className="rounded border border-[#8fbf7f]/60 bg-[#8fbf7f]/10 px-2.5 py-1 text-xs text-[#a8d89a] transition hover:bg-[#8fbf7f]/25"
                  >
                    Выпить
                  </button>
                )}
                {def.type === 'oil' && (
                  <button
                    onClick={() => getEngine()?.useItem(inv.item)}
                    className="rounded border border-[#d9a441]/60 bg-[#d9a441]/10 px-2.5 py-1 text-xs text-[#f5c96b] transition hover:bg-[#d9a441]/25"
                  >
                    Нанести
                  </button>
                )}
                {def.type !== 'quest' && (
                  <span className="flex items-center rounded border border-[#3a2e20] px-2 py-1 text-[11px] text-[#8a8068]">
                    {Math.floor(def.price * 0.4)} зол.
                  </span>
                )}
              </div>
            </Row>
          )
        })}
        <p className="mt-2 text-[11px] text-[#8a8068]">Продать вещи можно у торговца Грима в Хеймхолле.</p>
      </div>
    </Panel>
  )
}

function JournalPanel() {
  const quests = useGame((s) => s.quests)
  const bestiary = useGame((s) => s.bestiary)
  const order = ['wolf', 'alpha', 'bandit', 'archer', 'captain', 'horror', 'boss']
  return (
    <Panel title="Журнал" wide>
      <Tabs defaultValue="quests">
        <TabsList className="bg-[#241c14] border border-[#5a4632]">
          <TabsTrigger value="quests" className="data-[state=active]:text-[#f5c96b]">
            Квесты
          </TabsTrigger>
          <TabsTrigger value="bestiary" className="data-[state=active]:text-[#f5c96b]">
            Бестиарий
          </TabsTrigger>
        </TabsList>
        <TabsContent value="quests" className="mt-4 flex flex-col gap-3">
          {quests
            .filter((q) => q.stage > 0 || q.done)
            .map((q) => (
            <div
              key={q.id}
              className={`rounded border p-3 ${q.done ? 'border-[#3a2e20] bg-[#1c1712]/60 opacity-70' : q.side ? 'border-[#3a2e20] bg-[#211a12]/70' : 'border-[#d9a441]/40 bg-[#241c12]/80'}`}
            >
              <p className={`text-sm font-semibold ${q.done ? 'text-[#8a8068] line-through' : q.side ? 'text-[#c9b06b]' : 'text-[#f5c96b]'}`}>
                {q.name}
              </p>
              <p className="mt-1 text-[11px] italic leading-snug text-[#8a8068]">{q.summary}</p>
              {!q.done && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-[#e8d5a8]">
                  <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d9a441]" />
                  {q.stage === 2 && q.id === 'main' ? `${q.stageText} (${q.counter}/4)` : q.id === 'mist' && q.stage === 1 ? `${q.stageText} (${q.counter}/3)` : q.stageText}
                </p>
              )}
              {q.done && <p className="mt-1 text-sm text-[#8a8068]">{q.stageText}</p>}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="bestiary" className="mt-4 flex flex-col gap-3">
          {order.map((k) => {
            const info = BESTIARY_INFO[k]
            const known = bestiary.includes(k)
            return (
              <div key={k} className={`rounded border p-3 ${known ? 'border-[#3a2e20] bg-[#211a12]/70' : 'border-[#2a2218] bg-[#1a1510]/60'}`}>
                <p className={`text-sm font-semibold ${known ? 'text-[#e8d5a8]' : 'text-[#6a6152]'}`}>{known ? info.name : '???'}</p>
                {known ? (
                  <>
                    <p className="mt-1 text-[12px] leading-snug text-[#b0a488]">{info.text}</p>
                    <p className="mt-1 text-[12px] text-[#d9a441]">Слабость: {info.weakness}</p>
                  </>
                ) : (
                  <p className="mt-1 text-[12px] text-[#5a5245]">Запись появится после первой победы над таким врагом.</p>
                )}
              </div>
            )
          })}
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function ShopPanel() {
  const shop = useGame((s) => s.shop)
  const inventory = useGame((s) => s.inventory)
  const player = useGame((s) => s.player)
  if (!shop || !player) return null
  return (
    <Panel title="Торговля" subtitle={`${shop.merchantName} · твоё золото: ${player.gold}`} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="game-title-font mb-2 text-xs tracking-[0.25em] text-[#9a8f78]">ТОВАР ГРИМА</p>
          <div className="flex flex-col gap-2">
            {shop.stock.map((id) => {
              const def = ITEMS[id]
              const can = player.gold >= def.price
              return (
                <Row key={id}>
                  <div className="flex min-w-0 items-center gap-2">
                    <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[#e8d5a8]">{def.name}</p>
                      <p className="truncate text-[11px] text-[#8a8068]">{def.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => getEngine()?.buyItem(id)}
                    disabled={!can}
                    className={`shrink-0 rounded border px-2.5 py-1 text-xs ${can ? 'border-[#d9a441]/60 bg-[#d9a441]/10 text-[#f5c96b] hover:bg-[#d9a441]/25' : 'border-[#3a2e20] text-[#6a6152]'}`}
                  >
                    {def.price} зол.
                  </button>
                </Row>
              )
            })}
          </div>
        </div>
        <div>
          <p className="game-title-font mb-2 text-xs tracking-[0.25em] text-[#9a8f78]">ПРОДАТЬ (40% ЦЕНЫ)</p>
          <div className="game-scroll flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {inventory.filter((i) => ITEMS[i.item] && ITEMS[i.item].type !== 'quest').length === 0 && (
              <p className="text-sm text-[#8a8068]">Торг нечем.</p>
            )}
            {inventory
              .filter((i) => ITEMS[i.item] && ITEMS[i.item].type !== 'quest')
              .map((i) => {
                const def = ITEMS[i.item]
                return (
                  <Row key={i.item}>
                    <span className="flex min-w-0 items-center gap-2 text-sm text-[#e8d5a8]">
                      <GameIcon name={def.icon} className="h-4 w-4 shrink-0 text-[#c9b06b]" />
                      <span className="truncate">
                        {def.name} {i.qty > 1 && <span className="text-[#c9b06b]">×{i.qty}</span>}
                      </span>
                    </span>
                    <button
                      onClick={() => getEngine()?.sellItem(i.item)}
                      className="shrink-0 rounded border border-[#8fbf7f]/50 bg-[#8fbf7f]/10 px-2.5 py-1 text-xs text-[#a8d89a] transition hover:bg-[#8fbf7f]/25"
                    >
                      +{Math.floor(def.price * 0.4)} зол.
                    </button>
                  </Row>
                )
              })}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function TrainerPanel() {
  const trainer = useGame((s) => s.trainer)
  const player = useGame((s) => s.player)
  if (!trainer || !player) return null
  return (
    <Panel title="Наставник Дорн" subtitle={`Твои очки обучения: ${player.lp} · золото: ${player.gold}`}>
      <div className="flex flex-col gap-2">
        {trainer.options.map((o) => (
          <Row key={o.id}>
            <div className="min-w-0">
              <p className="text-sm text-[#e8d5a8]">{o.name}</p>
              <p className="truncate text-[11px] text-[#8a8068]">{o.desc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-[#c9b06b]">{o.cost}</span>
              <button
                onClick={() => getEngine()?.trainOption(o.id)}
                disabled={!o.affordable || o.maxed}
                className={`rounded border px-2.5 py-1 text-xs ${o.maxed ? 'border-[#3a2e20] text-[#6a6152]' : o.affordable ? 'border-[#d9a441]/60 bg-[#d9a441]/10 text-[#f5c96b] hover:bg-[#d9a441]/25' : 'border-[#3a2e20] text-[#6a6152]'}`}
              >
                {o.maxed ? 'Предел' : 'Учить'}
              </button>
            </div>
          </Row>
        ))}
      </div>
    </Panel>
  )
}

function MapPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (canvasRef.current) getEngine()?.renderFullMap(canvasRef.current)
  }, [])
  return (
    <Panel title="Карта долины" subtitle="Янтарь — твоя позиция, кольцо — текущая цель" wide>
      <canvas ref={canvasRef} width={1024} height={768} className="h-auto w-full rounded border border-[#5a4632]" />
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#8a8068] sm:grid-cols-3">
        <span>◈ Хеймхолл — деревня и NPCs</span>
        <span>◈ Сумрачный лес — волки, контракт</span>
        <span>◈ Камни Древних — алтарь и спутники</span>
        <span>◈ Озеро Лун — лунные травы</span>
        <span>◈ Лагерь — разбойники, испытание</span>
        <span>◈ Сердце Разлома — финал</span>
      </div>
    </Panel>
  )
}

function reloadContinue() {
  boot.mode = 'continue'
  useGame.getState().patch({ panel: null, screen: 'title' })
  setTimeout(() => useGame.getState().setScreen('game'), 60)
}

function PausePanel() {
  const hasSave = useGame((s) => s.hasSave)
  const renderMode = useGame((s) => s.renderMode)
  const [muted, setMutedState] = useState(isMuted())
  return (
    <Panel title="Пауза" subtitle="Долина подождёт. Ненадолго.">
      <div className="flex flex-col gap-2">
        <MenuBtn onClick={() => getEngine()?.closePanel()} primary>
          Продолжить
        </MenuBtn>
        <MenuBtn onClick={() => getEngine()?.saveGame(true)}>Сохранить игру</MenuBtn>
        <MenuBtn onClick={reloadContinue} disabled={!hasSave}>
          Загрузить последнее сохранение
        </MenuBtn>
        <MenuBtn onClick={() => getEngine()?.setRenderMode(renderMode === '3d' ? '2d' : '3d')}>
          Графика: {renderMode === '3d' ? '3D (Three.js)' : 'Legacy 2D'}
        </MenuBtn>
        <MenuBtn
          onClick={() => {
            const v = !muted
            setMuted(v)
            setMutedState(v)
          }}
        >
          Звук: {muted ? 'выкл' : 'вкл'}
        </MenuBtn>
        <div className="mt-2 rounded border border-[#3a2e20] bg-[#211a12]/70 p-3 text-[12px] leading-relaxed text-[#a89a7d]">
          <p className="mb-1 font-semibold text-[#c9b06b]">Управление</p>
          WASD / ЛКМ — движение · ЛКМ по врагу — цель · 1–4 знаки · 5 — Голос Древних · Q/E — зелья ·
          F — взаимодействие · Пробел — тактическая пауза и приказы · V — строй · Tab — цель ·
          C/I/J/M — панели · Esc — меню
          {renderMode === '3d' && (
            <>
              <br />
              <span className="text-[#8fbf6a]">3D: ПКМ (зажать) — поворот камеры · колесо — зум</span>
            </>
          )}
        </div>
        <MenuBtn
          onClick={() => {
            getEngine()?.toTitle()
          }}
          danger
        >
          Выйти в главное меню
        </MenuBtn>
      </div>
    </Panel>
  )
}

function MenuBtn({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-4 py-2.5 text-sm tracking-wider transition ${
        primary
          ? 'border-[#d9a441] bg-[#d9a441]/15 text-[#f5c96b] hover:bg-[#d9a441]/30'
          : danger
            ? 'border-[#c94f3d]/60 bg-[#c94f3d]/10 text-[#e08a6b] hover:bg-[#c94f3d]/25'
            : 'border-[#5a4632] bg-[#211a12]/70 text-[#cfc0a0] hover:border-[#d9a441] hover:text-[#f5c96b]'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function EndingPanel() {
  const ending = useGame((s) => s.ending)
  if (!ending) return null
  return (
    <Panel title="Разлом затих" wide>
      <div className="flex flex-col gap-3">
        {ending.epilogue.map((p, i) => (
          <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'text-[#f5c96b]' : 'text-[#cfc0a0]'}`}>
            {p}
          </p>
        ))}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ending.stats.map(([k, v]) => (
            <div key={k} className="rounded border border-[#3a2e20] bg-[#211a12]/70 px-3 py-2">
              <p className="text-[11px] text-[#8a8068]">{k}</p>
              <p className="text-sm font-bold text-[#e8d5a8]">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <MenuBtn primary onClick={() => getEngine()?.closePanel()}>
            Свободная игра
          </MenuBtn>
          <MenuBtn
            onClick={() => {
              getEngine()?.toTitle()
            }}
          >
            Главное меню
          </MenuBtn>
        </div>
      </div>
    </Panel>
  )
}

export default function Panels() {
  const panel = useGame((s) => s.panel)
  if (!panel) return null
  switch (panel) {
    case 'char':
      return <CharPanel />
    case 'inv':
      return <InvPanel />
    case 'journal':
      return <JournalPanel />
    case 'shop':
      return <ShopPanel />
    case 'trainer':
      return <TrainerPanel />
    case 'map':
      return <MapPanel />
    case 'pause':
      return <PausePanel />
    case 'ending':
      return <EndingPanel />
    default:
      return null
  }
}
