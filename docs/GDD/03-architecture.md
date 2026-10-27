# GDD 03 — Техническая Архитектура и Рефакторинг

> Пакет GDD «Эхо Разлома» · Документ 3 из 5
> Стек: **Next.js 16 (App Router) + TypeScript 5 + Three.js (WebGL2) + Zustand + WebAudio**

---

## 1. Принципы

1. **Игра остаётся играбельной после каждого шага рефакторинга** (strangler fig pattern: старый код мигрирует по модулям, сборка никогда не ломается).
2. **Data-driven:** контент (предметы, диалоги, квесты, монстры, тренеры, домены) — в конфигах `src/lib/game/data/`, движок их только исполняет.
3. **Ядро без UI:** модули `src/lib/game/` не знают о React. Единственный мост — zustand-стор `store.ts` (зеркало HUD) и публичные методы движка.
4. **Бюджеты — это код:** лимиты фрейма/памяти фиксируются константами, а не надеждой.
5. Type-safety: `bunx tsc --noEmit` входит в ритуал каждого этапа (баг с кнопками Hood-панели прошёл бы через это).

---

## 2. Слои приложения

```
src/app/page.tsx            — единственный маршрут: TitleScreen ⇄ GameView
src/components/game/        — React-оверлеи (HUD, панели, диалоги) — читают стор, зовут движок
src/lib/game/
  core/                     — жизненный цикл, время, события, RNG
  ecs/                      — сущности/компоненты/реестр систем (легковесный)
  systems/                  — игровая логика (бой, ИИ, партия, квесты...)
  world/                    — террейн, домены, пропсы, спавны, интерактивы
  render3d/                 — Three.js: рендерер, камера, свет, постэффекты, аватары
  render2d/                 — легаси-канвас (существующий render.ts) до Фазы 1
  data/                     — контент (TS-конфиги, типизированные)
  audio/                    — sfx-синтезатор, музыкальные слои
  store.ts / types.ts       — UI-зеркало + доменные типы
```

---

## 3. Целевая архитектура ядра (после Phase 0)

### 3.1 Core
- `core/Game.ts` — владеет циклом rAF, порядком систем, isFrozen-состоянием.
- `core/Clock.ts` — dt с клампом (макс 50 мс), счётчики fps, timeScale (пауза).
- `core/Events.ts` — типизированная шина (`on/emit/off`) для кросс-системных событий (`enemy:killed`, `quest:advance`, `flag:set`, `party:approval`).
- `core/Rng.ts` — детерминированный LCG (сидится в сейве — одинаковый мир и дроп).

### 3.2 ECS-легковес (без библиотек)
- Сущность = числовой `eid` + Map<компонент>. Компоненты — простые интерфейсы (`Transform`, `Vitals`, `Combatant`, `AiMind`, `PartyMember`, `DialogueAgent`, `Renderable3D`).
- Системы — функции `(world, dt)`, зарегистрированные в фиксированном порядке: Input → Party Orders → AI → Movement → Combat → Statuses → Quests → Particles → Sync UI.
- Обоснование: текущий `Entity` уже близок к этому; ECS-lite даёт дешёвую декомпозицию без смены парадигмы.

### 3.3 Системы (миграция из engine.ts — см. §6)
| Система | Забирает из engine.ts | Строки (сейчас) |
|---|---|---|
| `systems/input.ts` | bindInput, onKeyDown/Up, onPointerDown | 505–614 |
| `systems/movement.ts` | moveWithCollisions, separate, updatePlayer/Companion перемещение | 721–843 |
| `systems/combat.ts` | melee/ranged, damage, enemiesInCone, castAbility, statuses | 1153–1498 |
| `systems/ai.ts` | updateEnemy, bossLogic, updateCompanion (ИИ-часть) | 845–1152 |
| `systems/party.ts` | setStance, castCompanionAbility, одобрение/лояльность (новое) | 910–968, 2120 |
| `systems/quest.ts` | initQuests, advanceQuest, dialogueCtx, openDialogue… runAction | 229–234, 1517–1900 |
| `systems/inventory.ts` | addItem…useItem, buy/sell, equip | 1902–1992 |
| `systems/progression.ts` | recalcStats, gainXp, spendLp, тренеры | 247–369, 1312–1332, 1979–2109 |
| `systems/save.ts` | saveGame, loadFrom, toTitle + версионирование схемы | 2135–2203 |
| `systems/world.ts` | spawnWorld, зоны, updateArea, интерактивы | 370–504, 1774–1863 |

### 3.4 Render3D (Фаза 1)
- `render3d/Renderer.ts` — WebGLRenderer (antialias по мощности устройства), tone mapping ACES, sRGB, shadow map PCFSoft 2048.
- `render3d/CameraRig.ts` — third-person орбита с коллизией лучом (не проваливается сквозь террейн), тактический отъём при паузе, диалоговый наезд.
- `render3d/Terrain.ts` — чанковый heightmap-террейн (splat-текстуры: трава/камень/снег/мор), LOD по дистанции.
- `render3d/AvatarFactory.ts` — сборка персонажей из примитивов + GLTF (фаза 2), AnimationMixer-пул.
- `render3d/Effects.ts` — EffectComposer: Bloom (только яркие), Vignette, FXAA, цветокор по домену.
- `render3d/Minimap.ts` — рендер верхнего вида в offscreen → канвас HUD (существующий UI сохраняется).

### 3.5 Данные и сейвы
- Схема сейва: `{ v: number, ... }`; миграции цепочкой `migrations: Migration[]` — старые сейвы прототипа поднимаются (флаг совместимости `echo-rift-save-v1`).
- Контент в `data/`: расширение существующих (items/abilities/quests/dialogues/world) новыми: `trainers.ts`, `realms.ts`, `shouts.ts`, `companions.ts`, `endings.ts`.

---

## 4. Производительность (бюджеты)

| Метрика | Бюджет |
|---|---|
| CPU фрейм (JS) | ≤ 6 мс при 60 FPS |
| Draw calls | ≤ 350 (инстансинг травы/камней/деревьев) |
| Треугольники в кадре | ≤ 700k |
| Память текстур | ≤ 350 МБ (KTX2/сжатие, атласы) |
| Партиклы | пул 500, никаких new в цикле |
| Сущности активные | ≤ 60 (спавн по дистанции, despawn за туманом) |

Приёмы: Object pooling (снаряды/эффекты), InstancedMesh для растительности, фрустум-куллинг three из коробки + ручной по чанкам, лёгкие коллбэки (никаких аллокаций в hot path), затухание тиков AI по дистанции.

---

## 5. Рефакторинг Phase 0 — план по шагам (каждый шаг = зелёный lint + работающая игра)

**Шаг 0.1 — Инфраструктура качества**
- `bunx tsc --noEmit` — прогнать, зафиксировать базу; добавить скрипт `typecheck` в package.json.
- Eslint-проход.

**Шаг 0.2 — Вынос данных и утилит (безопасный)**
- `data/*` уже отдельно; из engine.ts вынести константы: `ABILITY_BAR_IDS`, `BESTIARY_INFO`, `ENEMY_NAME`, `ATTR_NAMES`, утилиты `rndRange/d/angleDiff` → `core/util.ts`, `data/tables.ts`.

**Шаг 0.3 — Сейвы**
- `systems/save.ts`: saveGame/loadFrom/toTitle + версионирование. Движок делегирует.

**Шаг 0.4 — Инвентарь/магазин/тренеры**
- `systems/inventory.ts` + `systems/progression.ts` (buy/sell/equip/train). UI-методы остаются фасадами на движке (публичный API не ломается).

**Шаг 0.5 — Диалоги/квесты**
- `systems/quest.ts` (dialogueCtx, openDialogue, chooseOption, runAction, runInteractable, advanceQuest, initQuests).

**Шаг 0.6 — Бой и ИИ**
- `systems/combat.ts` (атаки, урон, конусы, статусы, каст знаков), `systems/ai.ts` (враги, босс, компаньоны-ИИ).

**Шаг 0.7 — Движение/ввод**
- `systems/movement.ts`, `systems/input.ts` (биндинги инжектятся движком).

**Шаг 0.8 — Рендер-мост**
- `render2d/` принимает текущий render.ts как есть (модуль), engine вызывает через интерфейс `IRenderer` — подготовка к двойному бэкенду (2D/3D).

**Шаг 0.9 — Core**
- `core/Game.ts`, `core/Clock.ts`, `core/Events.ts`: движок превращается в композицию систем; GameEngine остаётся фасадом для UI (публичные методы — делегаты).

**Критерий готовности Phase 0:** engine.ts ≤ 400 строк (фасад), каждая система ≤ 500 строк, `tsc --noEmit` чистый, игра проходит smoke-путь браузером (титул → бой → панель → сейв).

---

## 6. Мост с UI (не меняется в Phase 0)

- Стор `store.ts` — только зеркало: движок патчит его (syncUi каждые 120 мс + точечные события), React читает.
- UI → движок: только публичные методы через `getEngine()` (правило одного направления).
- Тосты/панели/подсказки — как сейчас. Это позволяет переписывать рендер и логику, не трогая React-слой.

---

## 7. Риски и их обработка

| Риск | Митигация |
|---|---|
| 3D-переписывание ломает боёвку | Интерфейс `IRenderer` + фазовый переход: логика боёвки не знает о рендере (только координаты/события) |
| Производительность WebGL на слабых железах | Качество-пресеты (Low/Med/High), авто-даунгрейд при < 45 FPS |
| Схема сейвов уезжает вперёд | Версия + миграции с первого дня |
| Разрастание UI-компонентов | Панели остаются на shadcn; новые экраны — по шаблону существующих |
| Потеря контекста между сессиями | worklog.md — обязательный ритуал каждого агента |
