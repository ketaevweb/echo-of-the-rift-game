import { DialogueTree, PortraitDef } from '../types'

export const PORTRAITS: Record<string, PortraitDef> = {
  Бьорн: { icon: 'Crown', color: '#d9a441', title: 'Старейшина Хеймхолла' },
  Грим: { icon: 'Coins', color: '#c9b06b', title: 'Торговец' },
  Дорн: { icon: 'GraduationCap', color: '#b08356', title: 'Наставник' },
  Ирма: { icon: 'Flame', color: '#d96b3a', title: 'Капитан Ордена Пламени' },
  Селена: { icon: 'MoonStar', color: '#9a7fc0', title: 'Архимаг Ковена Тумана' },
  Кайя: { icon: 'Sparkles', color: '#9fb8a4', title: 'Магистр-странница' },
  Торвальд: { icon: 'ShieldHalf', color: '#7a8a4a', title: 'Воитель' },
  'Древний Алтарь': { icon: 'Landmark', color: '#c9b06b', title: 'Камни Древних' },
  'Пожиратель Бурь': { icon: 'Skull', color: '#a06bd9', title: 'Голос из Разлома' },
  Альра: { icon: 'FlaskConical', color: '#7a9a6a', title: 'Алхимик Хеймхолла' },
  'Доска объявлений': { icon: 'ScrollText', color: '#c9b06b', title: 'Контракты Хеймхолла' },
  // Фаза 6: Гранитная Долина
  Хран: { icon: 'Landmark', color: '#c9a3e8', title: 'Смотритель Осколочного барьера' },
  Кассия: { icon: 'Drama', color: '#d9a441', title: 'Распорядительница Ямы' },
  Брок: { icon: 'Hammer', color: '#b0563a', title: 'Кузнец Колонии' },
  Йорв: { icon: 'Flame', color: '#d96b3a', title: 'Офицер Ордена Пепла' },
  Лиара: { icon: 'Leaf', color: '#7a9a6a', title: 'Послушница Ковена Ветвей' },
  Финн: { icon: 'Crosshair', color: '#c9b06b', title: 'Вольный стрелок Дозора' },
  'Мастер Ямы': { icon: 'Anvil', color: '#a8894a', title: 'Хозяин арены Колонии' },
  'Осколочный барьер': { icon: 'Gem', color: '#c9a3e8', title: 'Осколок Ядра' },
  // Фаза 6.2: Стылое Пределье
  Эйнар: { icon: 'BookOpen', color: '#c9b06b', title: 'Сказитель Стылого Приюта' },
  Ингрид: { icon: 'Crosshair', color: '#9fb8a4', title: 'Охотница Стылого Пределья' },
  'Древняя плита': { icon: 'ScrollText', color: '#bfe3ea', title: 'Пещера Рун' },
  'Стена Слова': { icon: 'Landmark', color: '#f5c96b', title: 'Ту\'ум — голос древних' },
  Иммолтакс: { icon: 'Flame', color: '#c94f3d', title: 'Крылатая тень Пределья' },
  // Фаза 6.3: Багровая Мара
  'Командор Мейра': { icon: 'Crown', color: '#d9a441', title: 'Командор Бастиона Ветвей' },
  'Досент Хольт': { icon: 'FlaskConical', color: '#9a7fc0', title: 'Изучатель мора' },
  'Сигнальный рог': { icon: 'Volume2', color: '#d9a441', title: 'Бастион Ветвей' },
  'Мор-Мать': { icon: 'Skull', color: '#c94f3d', title: 'Матка багровой скверны' },
}

export const DIALOGUES: Record<string, DialogueTree> = {
  // ---------------- Доска объявлений (Фаза 3: контракты W3) ----------------
  notice_board: {
    id: 'notice_board',
    start: () => 'board',
    nodes: {
      board: {
        speaker: 'Доска объявлений',
        role: 'Хеймхолл',
        text: 'Несколько листов прибито гвоздями. Свежий, на обрывке пепельной бумаги, начеркан углём: «Топы уносят скот. Дети перестали ходить к камышам. Кто положит конец — будет щедро одарён».',
        choices: [
          {
            text: '«ПЕПЕЛЬНАЯ МАТЬ»: награда за голову твари из Вельда. (Взять контракт)',
            cond: 'quest.veld<1',
            action: 'quest:veld:1;bestiary:ash_mother',
            goto: 'accepted',
          },
          { text: 'Перечитать контракт.', cond: 'quest.veld>=1,quest.veld<4', goto: 'hint' },
          { text: '(Изучить примечание бестиария на полях)', goto: 'hint' },
          { text: 'Отойти.', goto: null },
        ],
      },
      accepted: {
        speaker: 'Доска объявлений',
        text: '«Тварь зовут Пепельной Матерью. Начни от Врат Тумана на юге: по следам выйдешь к её кургану за Гнилыми Топями. Доказательство — пепельное сердце — отнеси Альре, она хранит награду». Внизу приписка: «Спектры не любят масла против спектров».',
        choices: [{ text: 'Запомнить. (Юг, Врата Тумана)', goto: null }],
      },
      hint: {
        speaker: 'Доска объявлений',
        text: '«Спектры не любят масла против спектров. Пепел взрывается — читай землю: круг на земле значит беги. Не дай окружить себя в камышах».',
        choices: [{ text: 'Полезно знать.', goto: null }],
      },
    },
  },

  // ---------------- Альра, алхимик (Фаза 3) ----------------
  alchemist_alra: {
    id: 'alchemist_alra',
    start: (ctx) => {
      const v = ctx.quest('veld')
      if (v.stage === 3 && ctx.has('ash_heart')) return 'turnin'
      if (v.stage >= 1 && v.stage < 3) return 'progress'
      if (v.done) return 'after'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Альра',
        text: 'Смотритель, говорят. Хорошо. Мои настойки стоят дороже гримовых, зато от них не отваливаются пальцы. Масла, зелья — подходи.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Что ты знаешь о Вельде?', goto: 'veld_lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      veld_lore: {
        speaker: 'Альра',
        text: 'Юг, за Хребтом — Вельд. Топы, туман и твари, которых я не берусь называть. Если пойдёшь — возьми масло: на тварей или на спектры, смотря что у тебя на ужин. Наносится на клинок, держится четыре минуты.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Спасибо.', goto: null },
        ],
      },
      progress: {
        speaker: 'Альра',
        text: 'Идёшь по контракту? Следы начни искать сразу за Вратами — тварь не таится, она хозяйка там. Принесёшь пепельное сердце — награда твоя.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'Иду.', goto: null },
        ],
      },
      turnin: {
        speaker: 'Альра',
        text: 'Ты пахнешь пеплом и... оно ещё тлеет! Пепельное сердце Матери, живьём. Деревня будет дышать спокойно. Держи обещанное — и вот, масло спектров, по-соседски.',
        choices: [
          {
            text: '(Отдать Пепельное сердце — 220 золота и опыт)',
            action: 'take:ash_heart:1;gold:220;xp:260;give:oil_specter:1;quest:veld:4;silence:-2',
            goto: 'turnin_done',
          },
          { text: 'Позже.', goto: null },
        ],
      },
      turnin_done: {
        speaker: 'Альра',
        text: 'Вельд не станет добрее, но сегодня дети дойдут до камышей и вернутся. Заходи, Смотритель — у меня всегда есть работа и всегда есть масло.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      after: {
        speaker: 'Альра',
        text: 'Легенда живая ходит по деревне. Масла, зелья — как всегда, по-соседски.',
        choices: [
          { text: 'Показать товары.', tag: 'Торговля', action: 'open:shop:alra', goto: null },
          { text: 'До встречи.', goto: null },
        ],
      },
    },
  },

  // ---------------- Старейшина Бьорн ----------------
  elder_bjorn: {
    id: 'elder_bjorn',
    start: (ctx) => {
      const q = ctx.quest('main')
      if (q.done) return 'thanks'
      if (q.stage >= 5) return 'final'
      if (q.stage === 4) return 'proof_remind'
      if (q.stage === 3) return 'stones_remind'
      if (q.stage === 2) return 'forest_remind'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Бьорн',
        text: 'Ты из Смотрителей? Хорошо. Небо над Хеймхоллом треснуло три ночи назад. Из дыры лезут волки размером с медведя и твари, которых я не назову. Долине нужен тот, кто умеет убивать такое.',
        choices: [
          { text: 'Что за дыра в небе?', goto: 'lore' },
          {
            text: '(Дозорный) Смотритель Дозора, четвёртая смена у Хребта. Я видел, как рассвет над Хеймхоллом трескался один раз уже.',
            origin: 'warden',
            cond: 'origin:warden',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_warden',
          },
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
          { text: 'До встречи.', goto: null },
        ],
      },
      origin_warden: {
        speaker: 'Бьорн',
        text: 'Четвёртая смена... Значит, ты знал старого Хаммела. Он носил тот же знак Дозора, что и мой дед. Дозор не забыл дорогу к Хеймхоллу — да поможет тебе и его память, Смотритель.',
        choices: [
          { text: 'Его память — со мной.', goto: 'lore' },
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
        ],
      },
      lore: {
        speaker: 'Бьорн',
        text: 'Старики зовут это Разломом. Говорят, за ним — миры, где магия жжёт небо, а разум пожирает плоть. Мы запирали его Камнями Древних веками. Теперь печать слаба. Что-то тянет оттуда силу... и голод.',
        choices: [
          { text: 'Я возьмусь. Что нужно делать?', action: 'quest:main:2;xp:25', goto: 'accept' },
          { text: 'Хм. Надо подумать.', action: 'silence:+2', goto: null },
        ],
      },
      accept: {
        speaker: 'Бьорн',
        text: 'Начни с Сумрачного леса на северо-западе. Волки озверели — режут скот и людей. Разберись со стаей, а там я пойму, что за сила шевелится в Разломе.',
        choices: [{ text: 'Лес так лес. (Получить задание)', goto: null }],
      },
      forest_remind: {
        speaker: 'Бьорн',
        text: 'Лес на северо-западе, Смотритель. Пока волки режут овец — долина не поверит в своего героя.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      stones_remind: {
        speaker: 'Бьорн',
        text: 'Хорошая работа в лесу. Теперь к Камням Древних — там видели двух странников, магов, что чтят старую печать. Найди общий язык.',
        choices: [{ text: 'Уже иду.', goto: null }],
      },
      proof_remind: {
        speaker: 'Бьорн',
        text: 'Путь к Разлому откроют только тому, кого признает долина. Вожак стаи, главарь бандитов... или лунные травы для Ковена — выбирай.',
        choices: [{ text: 'Понял.', goto: null }],
      },
      final: {
        speaker: 'Бьорн',
        text: 'Ты идёшь прямо к Разлому? Тогда возьми. Это всё, чем Хеймхолл может помочь — остальное зависит от твоего клинка.',
        choices: [
          { text: '(Взять припасы)', cond: '!flag.elderAid', action: 'give:potion_heal:2;gold:50;flag:elderAid;xp:30', goto: 'final_after' },
          { text: 'Всё, что я должен знать?', cond: 'flag.elderAid', goto: 'final_after' },
        ],
      },
      final_after: {
        speaker: 'Бьорн',
        text: 'Если увидишь Пожирателя — не слушай его голос. Он говорит чужими устами. Удачи, Смотритель.',
        choices: [{ text: 'Расскажи, что за Пожиратель.', goto: 'final_lore' }, { text: 'Уже ухожу.', goto: null }],
      },
      final_lore: {
        speaker: 'Бьорн',
        text: 'Наш прадед запирал Разлом словом силы. Голос Древних на алтаре у Камней — твоя лучшая ставка. А его слуги жгутся как солома: держи огонь наготове.',
        choices: [{ text: 'Спасибо.', goto: null }],
      },
      thanks: {
        speaker: 'Бьорн',
        text: 'Разлом затих, и сны вернулись к людям. Хеймхолл запомнит тебя, Смотритель. Возьми — клинок старой работы, он ждал хозяина вроде тебя.',
        choices: [
          { text: '(Принять Рунный клинок)', cond: '!flag.elderReward', action: 'give:sword_rune:1;gold:150;xp:300;flag:elderReward', goto: 'thanks2' },
          { text: 'Служу долине.', cond: 'flag.elderReward', goto: null },
        ],
      },
      thanks2: {
        speaker: 'Бьорн',
        text: 'Что теперь? Долина большая. Бандиты, волки, туман над озером... Смотрителю всегда найдётся работа.',
        choices: [{ text: 'Поживём — увидим.', goto: null }],
      },
    },
  },

  // ---------------- Торговец Грим ----------------
  merchant_grim: {
    id: 'merchant_grim',
    start: (ctx) => (ctx.flag('contractGiven') && !ctx.flag('contractDone') && ctx.has('alpha_pelt') ? 'turnin' : 'greet'),
    nodes: {
      greet: {
        speaker: 'Грим',
        text: 'Ага, свежее лицо! Хочешь глянуть товар? А ещё у меня висит контракт — зверь режет овец у леса. Плата честная.',
        choices: [
          {
            text: '(Изгнанник Колонии) Грим? Грим Зольный, ладонь-весы из Нижнего яруса? Меня выставили из Колонии раньше, чем тебя повысили.',
            origin: 'exile',
            cond: 'origin:exile',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_exile',
          },
          { text: 'Покажи, что есть.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Расскажи про контракт.', cond: '!flag.contractGiven', goto: 'contract' },
          { text: 'Расскажи про контракт.', cond: 'flag.contractGiven,!flag.contractDone', goto: 'contract_wait' },
          { text: 'Есть новости?', goto: 'rumors' },
          { text: 'До встречи.', goto: null },
        ],
      },
      origin_exile: {
        speaker: 'Грим',
        text: 'Зольный... Да ты что — изгонённый из Колонии, как и я! Никто не помнит, что мы платили за выход: всё, что имело вес. Такому, как мы, Хеймхолл — второй шанс. Держи скидку по-землячески, и заходи.',
        choices: [
          { text: 'Покажи, что есть.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Расскажи про контракт.', cond: '!flag.contractGiven', goto: 'contract' },
          { text: 'Есть новости?', goto: 'rumors' },
        ],
      },
      turnin: {
        speaker: 'Грим',
        text: 'Мои глаза! Это же она — лютая волчица! Овцы могут спать спокойно. Держи обещанное, Смотритель.',
        choices: [
          { text: '(Отдать шкуру — 120 золота)', action: 'take:alpha_pelt:1;gold:120;xp:150;flag:contractDone;quest:contract:3', goto: 'turnin_done' },
        ],
      },
      turnin_done: {
        speaker: 'Грим',
        text: 'Заходи ещё — свежий стальной клинок как раз по руке охотнику.',
        choices: [
          { text: 'Покажи товар.', tag: 'Торговля', action: 'open:shop', goto: null },
          { text: 'Позже.', goto: null },
        ],
      },
      contract: {
        speaker: 'Грим',
        text: 'Огромная волчица, белёсый загривок, глаз горит как уголёк. Пастухи зовут её Лютой. За шкуру — 120 золотых. В бестиарии пишут: старый зверь боится открытого огня. Игни, если у тебя ведьмачьи замашки.',
        choices: [
          { text: '(Взять контракт)', action: 'quest:contract:1;flag:contractGiven;xp:15', goto: 'contract_taken' },
          { text: 'Не мой профиль.', goto: null },
        ],
      },
      contract_taken: {
        speaker: 'Грим',
        text: 'Ищи её в глубине Сумрачного леса, у костей. И не жалей огня!',
        choices: [{ text: 'Жди вестей.', goto: null }],
      },
      contract_wait: {
        speaker: 'Грим',
        text: 'Лютая всё ещё бегает? Глубина леса, у старых костей. Огонь, друг мой, огонь.',
        choices: [{ text: 'Ясно.', goto: null }],
      },
      rumors: {
        speaker: 'Грим',
        text: 'Говорят, у бандитов на востоке новый главарь — эдакий фехтовальщик с двумя шрамами. А Ковен ищет лунные травы: платят бронёй, шитой туманом. Ходят слухи и о голосе в Разломе... но я торгую солью, а не страшилками.',
        choices: [{ text: 'К занятиям.', goto: null }],
      },
    },
  },

  // ---------------- Наставник Дорн ----------------
  trainer_dorn: {
    id: 'trainer_dorn',
    start: 'greet',
    nodes: {
      greet: {
        speaker: 'Дорн',
        text: 'Так-так. Смотритель с ржавым клинком и голыми замашками. За золото и очки обучения я сделаю из тебя воина. Знаки, клинок, дыхание — всё тренируемо, если хватит упорства.',
        choices: [
          { text: 'Учить меня.', tag: 'Тренировки', action: 'open:trainer', goto: null },
          { text: 'Что за очки обучения?', goto: 'lp_info' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lp_info: {
        speaker: 'Дорн',
        text: 'Каждый новый уровень даёт очки обучения — ОН. Трать их у меня на приёмы и знаки. Атрибуты — сам, в своих мыслях. Не копи, как скупой гном: мёртвому запас не нужен.',
        choices: [{ text: 'Логично. Учить меня.', tag: 'Тренировки', action: 'open:trainer', goto: null }, { text: 'Позже.', goto: null }],
      },
    },
  },

  // ---------------- Ирма, Орден Пламени ----------------
  recruit_flame: {
    id: 'recruit_flame',
    start: (ctx) => {
      if (ctx.faction === 'flame') return 'joined'
      if (ctx.faction === 'mist') return 'rival'
      const q = ctx.quest('flame')
      if (q.stage > 0 && !q.done && ctx.flag('captainDead')) return 'reward'
      if (q.stage > 0) return 'task_wait'
      return 'intro'
    },
    nodes: {
      intro: {
        speaker: 'Ирма',
        text: 'Стой. Орден Пламени охраняет этот тракт, пока Разлом жрёт долину. Мы платим сталью и укрытием. Но лезть в наше братство без дела не советую.',
        timer: 8,
        onTimeout: 2,
        choices: [
          {
            text: '(Пепельный послушник) Я подметал пепел в домне Ордена. Вера́вки огня ещё тёплые.',
            origin: 'ember',
            cond: 'origin:ember',
            tag: 'Происхождение',
            action: 'xp:30;flag:origin_told;silence:-2',
            goto: 'origin_ember',
          },
          { text: 'Что за Орден?', goto: 'info' },
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Обойдусь.', goto: null },
        ],
      },
      origin_ember: {
        speaker: 'Ирма',
        text: 'Домна... третьей печи? Я сама варила сталь для мостовых кованых щитов. Послушники гасят свой огонь в голодных годах — но твой ещё дышит, вижу. Орден помнит своих, даже выброшенных. Служи — и вернёшься в братство.',
        choices: [
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Что за Орден?', goto: 'info' },
        ],
      },
      info: {
        speaker: 'Ирма',
        text: 'Ковен Тумана шепчет заклятия, а мы держим строй. Ковен знает — Разлом не запечатать словами. Нужна сталь, огонь и порядок. Проявишь себя — получишь доспех Ордена.',
        choices: [
          { text: 'Я хочу служить.', action: 'quest:flame:1;flag:flameGiven', goto: 'task' },
          { text: 'Ещё подумаю.', goto: null },
        ],
      },
      task: {
        speaker: 'Ирма',
        text: 'Разбойники на востоке режут беженцев с тракта. Их главарь — твой пропуск в Орден. Убей его и вернись.',
        choices: [{ text: 'Сделаю.', goto: null }],
      },
      task_wait: {
        speaker: 'Ирма',
        text: 'Лагерь на востоке всё ещё дымит кострами. Главарь жив — Орден ждёт.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      reward: {
        speaker: 'Ирма',
        text: 'Главарь мёртв, лагерь разбежался. Долина будет помнить. Орден Пламени принимает тебя — носи нашу сталь.',
        choices: [
          { text: '(Присоединиться к Ордену)', action: 'faction:flame;give:armor_order:1;gold:100;xp:150;quest:flame:3;flag:flameJoined', goto: 'joined_new' },
          { text: 'Сначала подумаю.', goto: null },
        ],
      },
      joined_new: {
        speaker: 'Ирма',
        text: 'Теперь тракт под нашей защитой вдвоём. Держись, брат по стали.',
        choices: [{ text: 'Служу.', goto: null }],
      },
      joined: {
        speaker: 'Ирма',
        text: 'Рад видеть, брат по стали. Держи строй — Разлом ещё дыышит... то есть дышит. Привыкай к огню.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      rival: {
        speaker: 'Ирма',
        text: 'Ты пахнешь туманом Ковена. Не трать моё время — шептуны и сталь не смешивают. Но за долину... спасибо. Пока.',
        choices: [{ text: 'Как знаешь.', goto: null }],
      },
    },
  },

  // ---------------- Селена, Ковен Тумана ----------------
  recruit_mist: {
    id: 'recruit_mist',
    start: (ctx) => {
      if (ctx.faction === 'mist') return 'joined'
      if (ctx.faction === 'flame') return 'rival'
      const q = ctx.quest('mist')
      if (q.stage > 0 && !q.done && ctx.has('moon_herb', 3)) return 'reward'
      if (q.stage > 0) return 'task_wait'
      return 'intro'
    },
    nodes: {
      intro: {
        speaker: 'Селена',
        text: 'Ты слышишь это гудение, странник? Разлом — рана в ткани мира, и сталь её не зашьёт. Ковен Тумана переписывает печать. Нам не хватает рук... и лунной травы.',
        timer: 8,
        onTimeout: 2,
        choices: [
          { text: 'Что за Ковен?', goto: 'info' },
          { text: 'Чем я могу помочь?', action: 'quest:mist:1;flag:mistGiven', goto: 'task' },
          { text: 'Пойду.', goto: null },
        ],
      },
      info: {
        speaker: 'Селена',
        text: 'Мы — последние, кто помнит слова печати. Орден Пламени хорош в ярости, но Разлом гаснет не от мечей, а от знания. Помоги Ковену — и броня, шитая туманом, станет твоей.',
        choices: [
          { text: 'Чем я могу помочь?', action: 'quest:mist:1;flag:mistGiven', goto: 'task' },
          { text: 'Ещё подумаю.', goto: null },
        ],
      },
      task: {
        speaker: 'Селена',
        text: 'На берегу Озера Лун, южнее, растёт трава с бледным светом. Принеси три стебля — и Ковен примет тебя как своего.',
        choices: [{ text: 'Будет сделано.', goto: null }],
      },
      task_wait: {
        speaker: 'Селена',
        text: 'Три стебля лунной травы, странник. Озеро Лун — на юге. Ищи бледное свечение в сумраке.',
        choices: [{ text: 'Иду.', goto: null }],
      },
      reward: {
        speaker: 'Селена',
        text: 'Ты чувствуешь? Трава ещё поёт. С этими стеблями печать простоит ещё долгий год. Ковен Тумана зовёт тебя своим.',
        choices: [
          { text: '(Отдать травы и присоединиться)', action: 'take:moon_herb:3;faction:mist;give:armor_robe:1;xp:150;quest:mist:3;flag:mistJoined', goto: 'joined_new' },
          { text: 'Сначала подумаю.', goto: null },
        ],
      },
      joined_new: {
        speaker: 'Селена',
        text: 'Знаки станут твоими песнями, странник. Иди — и пусть туман скроет твои шаги.',
        choices: [{ text: 'Служу Ковену.', goto: null }],
      },
      joined: {
        speaker: 'Селена',
        text: 'Печать держится, странник. Ковен помнит твою службу. Кстати, лунная трава — неплохой товар, если найдёшь лишнюю.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      rival: {
        speaker: 'Селена',
        text: 'Сталь Ордена уже греет твоё плечо. Что ж. Когда огонь не справится — Ковен будет здесь. Он всегда здесь.',
        choices: [{ text: 'Как знаешь.', goto: null }],
      },
    },
  },

  // ---------------- Кайя у Камней Древних ----------------
  stones_kaya: {
    id: 'stones_kaya',
    start: (ctx) => (ctx.companion('kaya') ? 'joined_chat' : 'intro'),
    nodes: {
      intro: {
        speaker: 'Кайя',
        text: 'Смотри-ка, Смотритель. Я Кайя, магистр-странница, а это Торвальд — он молчит, зато его щит говорит за него. Мы держим печать Камней, пока Разлом расширяется. Один ты с ним не справишься.',
        timer: 10,
        onTimeout: 2,
        choices: [
          { text: 'Что вы знаете о Разломе?', goto: 'lore' },
          { text: 'Тогда пойдём вместе.', action: 'join:kaya;join:torvald;quest:main:4;xp:60;silence:-3', goto: 'joined' },
          { text: 'Справлюсь и один.', action: 'silence:+4', goto: 'lone' },
        ],
      },
      lore: {
        speaker: 'Кайя',
        text: 'Разлом тянет силу из-за грани. Там — миры, где мысль материальна, а голодные тени носят чужие лица. Пожиратель Бурь — лишь пасть чего-то большего. Убей его, и рана затянется... на время.',
        choices: [
          { text: 'Тогда пойдём вместе.', action: 'join:kaya;join:torvald;quest:main:4;xp:60;silence:-3', goto: 'joined' },
          { text: 'Позже.', goto: null },
        ],
      },
      lone: {
        speaker: 'Торвальд',
        text: 'Гордость — хорошая броня, худая обивка. Когда надумаешь — мы здесь.',
        choices: [{ text: 'Запомню.', goto: null }],
      },
      joined: {
        speaker: 'Кайя',
        text: 'Торвальд, бери алебарду — идём с Смотрителем. Кайя в деле, Разлом поплачет. Строй: я — сзади, он — перед тобой.',
        choices: [{ text: 'В путь.', goto: null }],
      },
      joined_chat: {
        speaker: 'Кайя',
        text: 'Веди, Смотритель. Лёд наготове, Торвальд щёлкает щитом — значит, всё в порядке.',
        choices: [{ text: 'В путь.', goto: null }],
      },
    },
  },

  stones_torvald: {
    id: 'stones_torvald',
    start: (ctx) => (ctx.companion('torvald') ? 'joined_chat' : 'intro'),
    nodes: {
      intro: {
        speaker: 'Торвальд',
        text: 'Хм. Смотритель, значит. В моей деревне таких хоронили с почётом. Если идёшь к дыре в небе — я с Кайей. Она болтает, я — влетаю.',
        choices: [{ text: 'Запомню.', goto: null }],
      },
      joined_chat: {
        speaker: 'Торвальд',
        text: 'Строй держу, ты кроишь. Всё как на войне, Смотритель.',
        choices: [{ text: 'В путь.', goto: null }],
      },
    },
  },

  // ---------------- Алтарь (Голос Древних) ----------------
  altar: {
    id: 'altar',
    start: (ctx) => {
      if (ctx.flag('shoutUnlocked')) return 'learned'
      const q = ctx.quest('main')
      if (q.stage >= 3) return ctx.lp >= 3 ? 'offer' : 'no_lp'
      return 'not_ready'
    },
    nodes: {
      not_ready: {
        speaker: 'Древний Алтарь',
        text: 'Руны холодны. Камни Древних отвечают лишь тем, кого долина признала своим.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
      no_lp: {
        speaker: 'Древний Алтарь',
        text: 'Руны теплеют, но твоя память пуста. Чтобы удержать Голос Древних, нужно 3 очка обучения.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
      offer: {
        speaker: 'Древний Алтарь',
        text: 'Руны вспыхивают янтарём. Слово, что держало Разлом веками, ждёт твоего горла. Выучить Голос Древних? (3 ОН)',
        choices: [
          { text: 'Прикоснуться к рунам (3 ОН)', action: 'sign:shout;lp:-3;flag:shoutUnlocked;xp:40', goto: 'learned2' },
          { text: '(Отойти)', goto: null },
        ],
      },
      learned2: {
        speaker: 'Древний Алтарь',
        text: 'FUS... RO... В груди отдаётся эхом чужое слово — твоё теперь. Крикни — и камень услышит.',
        choices: [{ text: '(Испытать силу)', goto: null }],
      },
      learned: {
        speaker: 'Древний Алтарь',
        text: 'Голос Древних уже в тебе. Руны гудят одобрительно.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
    },
  },

  // ---------------- Барьер Разлома ----------------
  barrier: {
    id: 'barrier',
    start: 'greet',
    nodes: {
      greet: {
        speaker: '???',
        text: 'Воздух звенит и режет, как стекло. За пеленой — пепельные поля Сердца Разлома. Барьер признает лишь тех, кого долина назвала своим. Докажи себя — и путь откроется.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
    },
  },

  // ---------------- Босс ----------------
  boss_intro: {
    id: 'boss_intro',
    start: 'intro',
    nodes: {
      intro: {
        speaker: 'Пожиратель Бурь',
        text: 'Ты пахнешь судьбой, крошка-убийца. Я ел королей. Я ел богов с их молитвами. Твоя долина — между зубами. Скажи мне... какой вкус у отчаяния?',
        timer: 8,
        onTimeout: 0,
        choices: [
          { text: '(Обнажить клинок) Утренний.', action: 'boss:fight;silence:+6', goto: null },
          {
            text: '«Разлом сожрёт тебя первым — и я от него не отдам».',
            tag: 'Убеждение',
            check: { dc: 15, label: 'Убеждение (СЛ 15)' },
            goto: 'weaken',
            gotoFail: 'taunt_fail',
            action: 'boss:fight;boss:weaken;silence:-4',
          },
          { text: '(Отступить)', goto: null },
        ],
      },
      weaken: {
        speaker: 'Пожиратель Бурь',
        text: 'Гррх... слова... жгут изнутри... Ты испортил мне аппетит, крошка. Придётся есть тебя первым — и с плохим настроением.',
        choices: [{ text: '(Атаковать!)', goto: null }],
      },
      taunt_fail: {
        speaker: 'Пожиратель Бурь',
        text: 'ХА! Маленький голосок для такой большой пасти. Я собирался съесть тебя первым. Теперь — медленно.',
        choices: [{ text: '(Атаковать!)', action: 'boss:fight', goto: null }],
      },
    },
  },

  // ============================================================
  // Фаза 6: ГРАНИТНАЯ ДОЛИНА (Gothic) — карьера, ямы, Мастер Ямы
  // ============================================================

  // ---------------- Осколочный барьер (интеракт) ----------------
  shard_barrier: {
    id: 'shard_barrier',
    start: 'greet',
    nodes: {
      greet: {
        speaker: 'Осколочный барьер',
        text: 'Три многогранника Ядра сплетены швом света. Воздух дрожит. Внутри тебя что-то отвечает на это гудение — осколок в твоей голове тёплый, как чужая ладонь.',
        choices: [
          { text: '(Коснуться осколка)', cond: 'quest.granite<1', action: 'quest:granite:1', goto: 'touch' },
          { text: '(Отдёрнуть руку)', goto: null },
        ],
      },
      touch: {
        speaker: 'Осколочный барьер',
        text: 'Сквозь гул прорывается слово: «Хран». Осколок показывает: где-то у барьера ждёт человек с тремя лагерями за спиной и войной в глазах.',
        choices: [{ text: '(Найти Храна)', goto: null }],
      },
    },
  },

  // ---------------- Хран — Смотритель барьера ----------------
  granite_warden: {
    id: 'granite_warden',
    start: (c) => {
      const st = c.quest('granite').stage
      if (c.quest('granite').done || st >= 5) return 'done_text'
      if (st === 4) return 'reward'
      if (st === 3) return 'wait'
      if (st === 2) return 'prodding'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Хран',
        text: 'Котловина видела тысячи таких, как ты. Но осколок барьера гудит на тебя, как на своего. Значит, судьба. Слушай: культ Осколка растёт, а голос у него — Мастер Ямы. Три лагеря грызутся за барьер, и Колония трещит по швам.',
        choices: [
          { text: '«Что нужно Колонии?»', cond: 'quest.granite<2', action: 'quest:granite:2', goto: 'task' },
          { text: '(Отойти)', goto: null },
        ],
      },
      task: {
        speaker: 'Хран',
        text: 'Яма — закон Колонии: толпа признаёт только победителей. Возьми карьеру в одном из лагерей, дорастай до «Бойца» — и выиграй бой III у Кассии. Тогда Яма примет твой вызов Мастеру.',
        choices: [{ text: '«Значит, начнём с Ямы.»', goto: 'task2' }],
      },
      task2: {
        speaker: 'Хран',
        text: 'И запомни: мир сильнее тебя. Пока не вырастешь — не лезь к скорпионам Рудника и не суйся в яму за ставкой, которой нет.',
        choices: [{ text: '(Кивнуть)', goto: null }],
      },
      prodding: {
        speaker: 'Хран',
        text: 'Кассия ждёт у Ямы. Бой III, не меньше — толпа должна реветь твоё имя, иначе Мастер не выйдет.',
        choices: [{ text: '(Идти к Яме)', goto: null }],
      },
      wait: {
        speaker: 'Хран',
        text: 'Заслон Ямы гремит. Мастер ждёт. Не позорь Колонию — и приходи живым.',
        choices: [{ text: '(К арене)', goto: null }],
      },
      reward: {
        speaker: 'Хран',
        text: 'Мастер Ямы сгнил в собственных цепях, а барьер молчит. Возьми: это отпечаток Ядра, осколок из сердца барьера. Шесть таких — ключи, говорят старики. Твой — первый.',
        choices: [
          { text: '(Принять Ключ-осколок)', action: 'key:key_granite;quest:granite:5;gold:200;xp:350;rep:order:5;rep:coven:5;rep:watch:5', goto: 'keyed' },
        ],
      },
      keyed: {
        speaker: 'Хран',
        text: 'Барьер шепчет спокойнее. Колония запомнит, на чьей стороне стоял Смотритель. Война за барьер — не кончена. Но сегодня — пейте, Колония!',
        choices: [{ text: '(Отойти)', goto: null }],
      },
      done_text: {
        speaker: 'Хран',
        text: 'Ключ у тебя. Дальше — Сердце Разлома и то, что гремит за ним. Барьер будет держаться, пока держится Колония.',
        choices: [{ text: '(Отойти)', goto: null }],
      },
    },
  },

  // ---------------- Кассия — ямные бои ----------------
  pit_keeper: {
    id: 'pit_keeper',
    start: (c) => (c.quest('granite').stage === 3 ? 'call_master' : 'greet'),
    nodes: {
      greet: {
        speaker: 'Кассия',
        text: 'Яма — закон Колонии. Ставка — твоё золото, слава — твоя репутация, шрамы — твоя беда. Выбирай карточку, гладиатор.',
        choices: [
          { text: '«Драчун из рудников» — ставка 25, выплата 60.', cond: 'gold>=25', action: 'pit:start:1' },
          { text: '«Пара головорезов» — ставка 60, выплата 140.', cond: 'gold>=60', action: 'pit:start:2' },
          { text: '«Чемпион ямы» — ставка 110, выплата 270.', cond: 'gold>=110,rank>=2', action: 'pit:start:3' },
          { text: '«Что за бои?»', goto: 'info' },
          { text: '(Уйти)', goto: null },
        ],
      },
      info: {
        speaker: 'Кассия',
        text: 'Три карточки: драчун, головорезы, чемпион. Чемпион — только для тех, кто дослужился до «Бойца» в своём лагере. Проиграешь — ставка остаётся в яме. Яма всё помнит.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
      call_master: {
        speaker: 'Кассия',
        text: 'Ты выиграл чемпионский бой, и толпа ходит ходуном. Заслон гремит — Мастер Ямы ждёт на арене. Хочешь объявить вызов по правилам?',
        choices: [
          { text: 'ВЫЗВАТЬ МАСТЕРА ЯМЫ', action: 'boss:fight_pit' },
          { text: '(Ещё не готов)', goto: null },
        ],
      },
    },
  },

  // ---------------- Брок — кузнец ----------------
  smith_brock: {
    id: 'smith_brock',
    start: (c) => {
      if (c.quest('granite_ore').done) return 'done_text'
      if (c.quest('granite_ore').stage === 1 && c.has('granite_ore', 4)) return 'forge'
      if (c.quest('granite_ore').stage >= 1) return 'wait_text'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Брок',
        text: 'Молот бьёт в такт пульсу Разлома. Кузнец даже не поднимает глаз: «Для чужих — лавка. Для своих — ковка. А своими не считаю, пока не принесёшь гранитной руды».',
        choices: [
          { text: '«Где взять руду?»', cond: 'quest.granite_ore<1', action: 'quest:granite_ore:1', goto: 'task' },
          { text: 'Лавка кузнеца', action: 'open:shop:brock' },
          { text: '(Уйти)', goto: null },
        ],
      },
      task: {
        speaker: 'Брок',
        text: 'Жилы у Рудника на северо-востоке котловины. Пять штук светятся серединой, ты не перепутаешь. Принеси четыре — и я сковал бы для тебя тесак, каких Орден не видал.',
        choices: [{ text: '(К Руднику)', goto: null }],
      },
      wait_text: {
        speaker: 'Брок',
        text: 'Руды мало. Жилы у Рудника, я сказал. Молот ждать не любит.',
        choices: [
          { text: 'Лавка кузнеца', action: 'open:shop:brock' },
          { text: '(Уйти)', goto: null },
        ],
      },
      forge: {
        speaker: 'Брок',
        text: 'Ха! Слажено бьёшь — руда как отобранная. Ну, держи слово: горн горячий, тесак будет злой.',
        choices: [
          { text: '(Отдать 4 руды)', action: 'take:granite_ore:4;give:colony_blade:1;quest:granite_ore:3;xp:80;gold:60;rep:order:2;rep:coven:2;rep:watch:2', goto: 'forged' },
        ],
      },
      forged: {
        speaker: 'Брок',
        text: '«Ядровой тесак». Тяжёлый, как приговор. Носи и помни: Колония кует своим.',
        choices: [
          { text: 'Лавка кузнеца', action: 'open:shop:brock' },
          { text: '(Уйти)', goto: null },
        ],
      },
      done_text: {
        speaker: 'Брок',
        text: 'Тесак послужит. Заходи в лавку — для своих цены честные.',
        choices: [
          { text: 'Лавка кузнеца', action: 'open:shop:brock' },
          { text: '(Уйти)', goto: null },
        ],
      },
    },
  },

  // ---------------- Вербовщики трёх лагерей ----------------
  join_order: {
    id: 'join_order',
    start: 'greet',
    nodes: {
      greet: {
        speaker: 'Йорв',
        text: 'Орден Пепла — порядок против Тишины. Мы держим барьер строем и молимся огню. У нас дисциплина, жалованье и лучшие знаки в котловине. Но свободных мы не жалуем.',
        choices: [
          { text: 'Вступить в Орден Пепла', cond: '!career,quest.main>=3', action: 'career:join:order', goto: 'joined' },
          { text: 'Повысить ранг (слава 30 → 250 зол., 70 → 600 зол.)', cond: 'career==order,rank<3', action: 'career:rank:order', goto: 'ranked' },
          { text: '«Что даёт карьера?»', goto: 'perks' },
          { text: '(Уйти)', goto: null },
        ],
      },
      joined: {
        speaker: 'Йорв',
        text: 'Добро пожаловать в строй, новобранец. Пепел на плаще — на удачу. Знаки твои отныне горят ярче с каждым рангом.',
        choices: [{ text: '(К службе)', goto: null }],
      },
      ranked: {
        speaker: 'Йорв',
        text: 'Ранг — это доверие строя. Слава ямы и служба Ордену считаются. Взнос — в казну барьера. Служи — расти.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
      perks: {
        speaker: 'Йорв',
        text: 'Знаки сильнее на двенадцать процентов за ранг; ветеран Ордена держит строй так, что броня дышит глубже. Орден Пепла не даёт лёгких путей — даёт надёжные.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
    },
  },
  join_coven: {
    id: 'join_coven',
    start: 'greet',
    nodes: {
      greet: {
        speaker: 'Лиара',
        text: 'Ковен Ветвей верит: эхо — это семена. Мы варим масла и зелья, читаем следы монстров и растим новое из старого. Ковен не спросит, чисты ли твои руки — но помнит каждую услугу.',
        choices: [
          { text: 'Вступить в Ковен Ветвей', cond: '!career,quest.main>=3', action: 'career:join:coven', goto: 'joined' },
          { text: 'Повысить ранг (слава 30 → 250 зол., 70 → 600 зол.)', cond: 'career==coven,rank<3', action: 'career:rank:coven', goto: 'ranked' },
          { text: '«Что даёт карьера?»', goto: 'perks' },
          { text: '(Уйти)', goto: null },
        ],
      },
      joined: {
        speaker: 'Лиара',
        text: 'Ветвь приняла тебя. Масла на твоём клинке будут держаться дольше, а зелья — глубже. Не подведи рощу.',
        choices: [{ text: '(К роще)', goto: null }],
      },
      ranked: {
        speaker: 'Лиара',
        text: 'Слава ямы и услуги Ковену считаются. Взнос идёт в семенной запас. Расти — и роща вырастет с тобой.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
      perks: {
        speaker: 'Лиара',
        text: 'Масла держатся на четверть дольше за ранг, зелья лечат на шесть очков за ранг. Ковен Ветвей — это терпение и химия.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
    },
  },
  join_watch: {
    id: 'join_watch',
    start: (c) => {
      const q = c.quest('granite_scorpions')
      if (q.stage === 1 && q.counter >= 5) return 'turnin'
      if (q.stage === 1) return 'wait_text'
      if (q.done) return 'done_text'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Финн',
        text: 'Вольный Дозор: никаких хозяев, только торговые пути и хорошие клинки. Мы продали бы и собственную тень — если б цена была честной. В Колонии я на заработках, но свой караван я соберу.',
        choices: [
          { text: 'Вступить в Вольный Дозор', cond: '!career,quest.main>=3', action: 'career:join:watch', goto: 'joined' },
          { text: '«Клеймо из панцирей?»', cond: 'quest.granite_scorpions<1', action: 'quest:granite_scorpions:1', goto: 'task' },
          { text: 'Повысить ранг (слава 30 → 250 зол., 70 → 600 зол.)', cond: 'career==watch,rank<3', action: 'career:rank:watch', goto: 'ranked' },
          { text: '«Что даёт карьера?»', goto: 'perks' },
          { text: '(Уйти)', goto: null },
        ],
      },
      joined: {
        speaker: 'Финн',
        text: 'Рукопожатие — и никаких бумаг. Дозор идёт быстрее прочих и никогда не устаёт. Почти.',
        choices: [{ text: '(К путям)', goto: null }],
      },
      task: {
        speaker: 'Финн',
        text: 'Караваны Дозора не возят тех, кто не держал клеймо. Пять панцирей гранитных скорпионов из котловины — и имя Финна откроет тебе лагерные ворота.',
        choices: [{ text: '(В котловину)', goto: null }],
      },
      wait_text: {
        speaker: 'Финн',
        text: 'Панцири сами себя не соберут. Скорпионы рыщут у Рудника и в южной россыпи. Удачи, гладиатор.',
        choices: [{ text: '(Уйти)', goto: null }],
      },
      turnin: {
        speaker: 'Финн',
        text: 'Пять панцирей, ни одним меньше — клеймо готово! Дозор запомнит. Держи монеты — половина от первой прибыли каравана, честно.',
        choices: [
          { text: '(Отдать клеймо)', action: 'quest:granite_scorpions:2;gold:90;xp:120;rep:watch:5', goto: 'done_text' },
        ],
      },
      ranked: {
        speaker: 'Финн',
        text: 'Слава — валюта честная. Взнос — в общий котёл. С каждым рангом ты ходишь легче и дышишь ровнее.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
      perks: {
        speaker: 'Финн',
        text: 'Со второго ранга — «глаз Дозора»: девятнадцатка на кости тоже считается критом. Плюс лёгкая поступь и дыхание: скорость и выносливость растут с рангом.',
        choices: [{ text: '(Назад)', goto: 'greet' }],
      },
      done_text: {
        speaker: 'Финн',
        text: 'Клеймо собрано — караваны будут рады. Обращайся, Дозор помнит своих.',
        choices: [{ text: '(Уйти)', goto: null }],
      },
    },
  },

  // ---------------- Мастер Ямы (интро у арены) ----------------
  pit_intro: {
    id: 'pit_intro',
    start: 'intro',
    nodes: {
      intro: {
        speaker: 'Мастер Ямы',
        text: 'Значит, ты тот, кто гремит в Колонии. Я слышу Осколок сквозь барьер — он шепчет твоё имя, Смотритель. Яма сделала меня хозяином этой котловины. Она сделает из тебя удобрение. Выходи — или ползи.',
        timer: 8,
        onTimeout: 0,
        choices: [
          { text: '(Выйти на арену)', action: 'boss:fight_pit', goto: null },
          {
            text: '«Твои чемпионы шептались о тебе в темноте — они боялись не Осколка. Тебя.»',
            tag: 'Убеждение',
            check: { dc: 14, label: 'Убеждение (СЛ 14)' },
            goto: 'shaken',
            gotoFail: 'taunt_fail',
            action: 'boss:fight_pit;boss:weaken_pit;silence:-2',
          },
          { text: '(Отступить от Ямы)', goto: null },
        ],
      },
      shaken: {
        speaker: 'Мастер Ямы',
        text: 'Цепи дрожат в его руках: «Они... молчали. Я СЛЫШАЛ их молчание!» Толпа гудит — он вышел на арену злее и слабее обычного.',
        choices: [{ text: '(Бой!)', goto: null }],
      },
      taunt_fail: {
        speaker: 'Мастер Ямы',
        text: 'Слова против цепей? Толпа хохочет. Он выбирает цепь потолще — и начинает бой с настроением.',
        choices: [{ text: '(Бой!)', action: 'boss:fight_pit', goto: null }],
      },
    },
  },

  // ---------------- Фаза 6.2: Стылое Пределье ----------------

  // Эйнар, сказитель — квест «Слова на камне»
  frost_einar: {
    id: 'frost_einar',
    start: (ctx) => {
      const q = ctx.quest('frost_words')
      if (q.done) return 'after'
      if (q.stage >= 1) return 'progress'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Эйнар',
        text: 'Присядь, путник, к огню. Я — Эйнар, и я помню песни, что старше этого Разлома. Древние говорили с миром голосом — Ту\'умом. Снег перед их словами вспыхивал. Ты — не такой, как прочие: в твоём горле я слышу отголосок.',
        choices: [
          { text: '«Что за голос?»', goto: 'lore' },
          { text: '(Спросить о Стенах Слов — взять путь)', cond: 'quest.frost_words<1', action: 'quest:frost_words:1;bestiary:draugr', goto: 'quest_start' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lore: {
        speaker: 'Эйнар',
        text: 'Ту\'ум — это не крик. Это язык, на котором мир был сложен. Стены Слов — камни, где голос древних застыл: прикоснись — и слово уйдёт в тебя. В Пещере Рун к северу отсюда такая стена стоит. Но дверь там рунная, а руны эти старше меня.',
        choices: [
          { text: '(Спросить о Стене Слова — взять путь)', cond: 'quest.frost_words<1', action: 'quest:frost_words:1;bestiary:draugr', goto: 'quest_start' },
          { text: 'Спасибо за историю.', goto: null },
        ],
      },
      quest_start: {
        speaker: 'Эйнар',
        text: 'Стена ждёт того, кто умеет читать камень. На плите у пещеры — подсказка старины: «Заяц бежит от Волка, Волк воет на Луну». Порядок — начало песни. И остерегайся мёртвых стражей — драугров. Они не любят гостей.',
        choices: [{ text: 'Иду к пещере.', goto: null }],
      },
      progress: {
        speaker: 'Эйнар',
        text: 'Пещера — на север, за елями. Помни песню: Заяц — первым, Волк — вторым, Луна — третьей. Так стояли предки.',
        choices: [{ text: 'Помню.', goto: null }],
      },
      after: {
        speaker: 'Эйнар',
        text: 'Слышишь? Ветер сегодня поёт иначе. Слово Силы теперь в твоём горле — говори им по делу, герой. И возвращайся: у меня есть песни, которых ты ещё не слышал.',
        choices: [
          { text: '(Подарок сказителя за пройденный путь — Стылый клинок)', cond: 'quest.frost_words>=4,!flag.frostBladePaid', action: 'flag:frostBladePaid;give:frost_blade:1;gold:150;xp:280', goto: 'gift' },
          { text: '(Послушать песню о Ту\'уме)', goto: 'lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      gift: {
        speaker: 'Эйнар',
        text: 'Этот клинок лежал у меня со времён отца — сталь Пределья не ржавеет. Пусть служит тому, кто говорит с миром голосом. 150 монет — на дорожные хлеба.',
        choices: [{ text: '(Принять)', goto: null }],
      },
    },
  },

  // Ингрид, охотница — квест «Голос в буране»
  frost_ingrid: {
    id: 'frost_ingrid',
    start: (ctx) => {
      const q = ctx.quest('frost_dragon')
      if (q.done) return 'after'
      if (q.stage >= 4) return 'turnin'
      if (q.stage >= 1) return 'progress'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Ингрид',
        text: 'Стой. Здесь охотится я — а дичь нынче странная. В прошлом буране я видела тень: шире дома, крылья — как паруса. Где она пролетает, снег вспыхивает и остаётся дымить. Мой отец звал такое «драконом», но драконы — сказки.',
        choices: [
          { text: '«Сказки иногда жгут небо.» (Взяться за охоту)', cond: 'quest.frost_dragon<1', action: 'quest:frost_dragon:1;bestiary:dragon', goto: 'quest_start' },
          { text: 'Что ты знаешь о Пределье?', goto: 'lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lore: {
        speaker: 'Ингрид',
        text: 'Пределье — последнее место, куда не сунулся ни Разлом, ни Орден. Снег здесь вечный, а старики говорят: под ним спят герои, которые однажды встанут. Драугры в пещерах и курганах — их стража. Не трогай их могилы без нужды.',
        choices: [
          { text: '(Вернуться к разговору о тени)', goto: 'greet' },
          { text: 'До встречи.', goto: null },
        ],
      },
      quest_start: {
        speaker: 'Ингрид',
        text: 'Тень ходит над южной дорогой, за курганом — то место зовут Драконьим Долом. Осмотри выжженные следы по пути: я хочу знать, с чем имею дело, прежде чем ставить капканы.',
        choices: [{ text: 'Осмотрю следы.', goto: null }],
      },
      progress: {
        speaker: 'Ингрид',
        text: 'Следы — вдоль южной дороги. Когда поймёшь, что это — возвращайся. И, Смотритель: не лезь под огонь. Я видела, как тень садится. Она не уходит голодной.',
        choices: [{ text: 'Буду начеку.', goto: null }],
      },
      turnin: {
        speaker: 'Ингрид',
        text: 'Небо над Приютом чистое впервые за зиму. Ты... убил сказку. Держи плащ — сшит из шкур, что ты же и добыл, — и золото: Приют скинулся всем миром.',
        choices: [
          { text: '(Принять награду — 320 золота, плащ, опыт)', cond: '!flag.frostDragonPaid', action: 'flag:frostDragonPaid;gold:320;xp:500;give:cloak_frost:1;quest:frost_dragon:5;silence:-2', goto: 'paid' },
          { text: 'Позже.', goto: null },
        ],
      },
      paid: {
        speaker: 'Ингрид',
        text: 'Плащ держит мороз лучше любого огня. И — спасибо. Отец бы не поверил, что драконью сказку кончит Смотритель из долины.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      after: {
        speaker: 'Ингрид',
        text: 'Клык его забери себе — сказителям дороже золота. А я присмотрю за Долом: вдруг там была не одна тень.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
    },
  },

  // Древняя плита у Пещеры Рун (подсказка-паззл)
  frost_slab: {
    id: 'frost_slab',
    start: 'slab',
    nodes: {
      slab: {
        speaker: 'Древняя плита',
        text: 'Ледяная корка стёрла полтекста, но начало читается: «Первая песня старины: Заяц бежит — Волк воет — Луна глядит. Так стояли камни, так стояли предки, так мир будет стоять...»',
        choices: [
          { text: '(Запомнить порядок: Заяц — Волк — Луна)', goto: 'order' },
          { text: 'Отойти.', goto: null },
        ],
      },
      order: {
        speaker: 'Древняя плита',
        text: 'Три камня перед пещерой дремлют с перепутанными кольцами. Поверни их — пусть песня встанет в свой порядок.',
        choices: [{ text: 'Отойти.', goto: null }],
      },
    },
  },

  // ---------------- Фаза 6.3: Багровая Мара ----------------
  // Командор Мейра — квест «Оборона Бастиона»
  mara_meira: {
    id: 'mara_meira',
    start: (ctx) => {
      const q = ctx.quest('mara')
      if (q.done) return 'after'
      if (q.stage >= 4) return 'turnin'
      if (q.stage >= 2) return 'during'
      if (q.stage >= 1) return 'ready'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Командор Мейра',
        text: 'Смотритель? Хуже некогда: мор вышел из Логова и точит песок под частоколом. Третий день хороню своих — а похоронок больше, чем стрел. Мне нужны клинки, а не отговорки. Ты выглядишь так, будто смерть — твой напарник.',
        choices: [
          { text: '«Бастион простоит, пока я стою.» (Взяться за оборону)', cond: 'quest.mara<1', action: 'quest:mara:1;bestiary:ghoul', goto: 'taken' },
          { text: 'Что такое Мара?', goto: 'lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lore: {
        speaker: 'Командор Мейра',
        text: 'Мара — юг Гранита, где земля прогнила до багрового цвета. Скверна там точит жилы, из жил лезут упыри, а над всем этим стоит Мать. Мы — Бастион Ветвей: пока мы держим, мор не пойдёт в Колонию и в долину.',
        choices: [
          { text: '(Вернуться к разговору об обороне)', goto: 'greet' },
          { text: 'До встречи.', goto: null },
        ],
      },
      taken: {
        speaker: 'Командор Мейра',
        text: 'Вот и славно. Осмотрись: рог на воротах, ворот грызут первыми. Мои стрелки уйдут за вал — остальное держишь ты и твоя партия. Приказывай им, Смотритель: у частокола нет лишних людей.',
        choices: [{ text: 'Рог услышу.', goto: null }],
      },
      ready: {
        speaker: 'Командор Мейра',
        text: 'Земля под частоколом поёт скверной — сегодня или завтра, мор пойдёт. Рог у ворот: удар — и полосу пустоши оголят. Встань между воротами и мором. Партия — твой строй: держи их по клину или в линию, как сочтёшь.',
        choices: [
          { text: '(Бить рог — начать оборону бастиона)', cond: 'quest.mara==1', action: 'quest:mara:2;siege:start', goto: 'siege_started' },
          { text: 'Позже.', goto: null },
        ],
      },
      siege_started: {
        speaker: 'Командор Мейра',
        text: 'ВОЛНА! Стрелки — за вал! Смотритель, частокол — на тебе: как упыри жрут ворота — руби их быстрее, чем они грызут!',
        choices: [{ text: 'Держать строй!', goto: null }],
      },
      during: {
        speaker: 'Командор Мейра',
        text: 'Мор отступил отлёживаться — но Мать где-то там, в Логове, и она запомнила дорогу. Хочешь ещё штурм — бей рог у ворот. Частокол починят к новому визиту.',
        choices: [
          { text: '(Бить рог — отбить ещё один штурм)', cond: 'quest.mara==2', action: 'siege:start' },
          { text: 'До встречи.', goto: null },
        ],
      },
      turnin: {
        speaker: 'Командор Мейра',
        text: 'Ветер с юга снова чистый. Мор-Мать сдохла — ты хоть понимаешь, что сделал? Бастион обязан тебе словами, которые не выговоришь. Держи: клинок из нашей стали и всё золото, что есть в казне.',
        choices: [
          { text: '(Принять награду — 350 золота, Клинок Бастиона, опыт)', cond: '!flag.maraPaid', action: 'flag:maraPaid;gold:350;xp:700;give:bastion_blade:1;quest:mara:5', goto: 'paid' },
          { text: 'Позже.', goto: null },
        ],
      },
      paid: {
        speaker: 'Командор Мейра',
        text: 'Клеймо Ветвей на клинке — это клятва: где мор — там Бастион, а где Бастион — ты. Возвращайся, если южный ветер снова станет красным.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      after: {
        speaker: 'Командор Мейра',
        text: 'Скверна в жилах убывает — Хольт небось до сих пор не верит своему счастью. Пока Мора молчит, мы куем и строим. Это и есть победа, Смотритель.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
    },
  },

  // Досент Хольт — побочные «Скверна в жилах» и «Желёзы скверны»
  mara_holt: {
    id: 'mara_holt',
    start: (ctx) => {
      const wells = ctx.quest('mara_wells')
      const glands = ctx.quest('mara_glands')
      if (wells.done && glands.done) return 'after'
      if (wells.stage >= 2 && !wells.done) return 'wells_turnin'
      if (glands.stage >= 2 && !glands.done) return 'glands_turnin'
      return 'greet'
    },
    nodes: {
      greet: {
        speaker: 'Досент Хольт',
        text: 'Не стой над душой — банки живые!.. А, Смотритель. Мор — не голод, не болезнь и не гнев. Мор — метаболизм. Земля Мары проглотила что-то живое и теперь переваривает всё вокруг. Хотите вернуть землю? Кормите её наоборот.',
        choices: [
          { text: '«Скажи, что жечь.» (Скверна в жилах)', cond: 'quest.mara_wells<1', action: 'quest:mara_wells:1', goto: 'wells_taken' },
          { text: '«Нужны образцы?» (Желёзы скверны)', cond: 'quest.mara_glands<1', action: 'quest:mara_glands:1', goto: 'glands_taken' },
          { text: 'Расскажи о мора.', goto: 'lore' },
          { text: 'До встречи.', goto: null },
        ],
      },
      lore: {
        speaker: 'Досент Хольт',
        text: 'Упыри — органы передвижения. Абомы — осадные. Мать — репродуктивная. А сгустки — это рты: мор ест ими землю и выхаркивает себя же. Логично? Логично. Бронзовый порошок из кузни сбивает метаболизм с толку — жги сгустки в жилах.',
        choices: [
          { text: '(Вернуться к делам)', goto: 'greet' },
          { text: 'До встречи.', goto: null },
        ],
      },
      wells_taken: {
        speaker: 'Досент Хольт',
        text: 'Три сгустка: один на юго-западе пустоши, второй — на северо-востоке у дороги, третий — на юге, почти у самого Логова. Подойди и выжги. И не наступай в лужу — лужа тоже голодная.',
        choices: [{ text: 'Жду золы.', goto: null }],
      },
      wells_turnin: {
        speaker: 'Досент Хольт',
        text: 'Жилы остыли, цвет уходит! Земля помнит здоровый цвет — я это докажу. Держи: горжету Ветвей — плевки Моры скользят по ней, — и золото из фонда науки. Наука платит, когда может.',
        choices: [
          { text: '(Принять награду — 140 золота, Горжета, опыт)', cond: '!flag.maraWellsPaid', action: 'flag:maraWellsPaid;gold:140;xp:260;give:watch_gorget:1;quest:mara_wells:3', goto: 'wells_paid' },
          { text: 'Позже.', goto: null },
        ],
      },
      wells_paid: {
        speaker: 'Досент Хольт',
        text: 'Первая жила чиста за триста лет. Смотришь? Земля вздохнула. Остальное — вопрос порошка и терпения.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      glands_taken: {
        speaker: 'Досент Хольт',
        text: 'Мор-желёзы: пульсирующий узел под кожей упыря, у абома — целый гроздь. Три штуки с упырей — или с абомов, что добудешь. Аккуратнее: железки кусаются даже отрезанные.',
        choices: [{ text: 'Принесу гроздь.', goto: null }],
      },
      glands_turnin: {
        speaker: 'Досент Хольт',
        text: 'Пять штук, целые, не гнилые! Смотритель, вы — кладезь биоматериала. Вот золото из фонда — и спасибо. Теперь я покажу колонии, чем мор кончается.',
        choices: [
          { text: '(Отдать 5 мор-желёз — 160 золота, опыт)', cond: 'has.ghoul_gland:5', action: 'take:ghoul_gland:5;gold:160;xp:240;quest:mara_glands:3', goto: 'glands_paid' },
          { text: 'Желёз пока не хватает.', goto: null },
        ],
      },
      glands_paid: {
        speaker: 'Досент Хольт',
        text: 'В банке щёлкает — слышите? Это первый мор-образец, который умер сам. Метаболизм — машина, а машину можно остановить.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
      after: {
        speaker: 'Досент Хольт',
        text: 'Записи, банки, свежая зола... Смотритель, приходите через месяц — я покажу вам первую в истории карту выздоровления Мары.',
        choices: [{ text: 'До встречи.', goto: null }],
      },
    },
  },

  // Сигнальный рог бастиона — объявить штурм (повтор после провала/передышки)
  mara_horn: {
    id: 'mara_horn',
    start: 'horn',
    nodes: {
      horn: {
        speaker: 'Сигнальный рог',
        text: 'Бронзовый рог на воротах, изогнут как клык. Мейра велела бить в него, когда будешь готов принять штурм: стрелки уйдут за вал, и пустошь оголят.',
        choices: [
          { text: '(Бить рог — принять штурм Моры)', cond: 'quest.mara==2', action: 'siege:start' },
          { text: 'Пока не время.', goto: null },
        ],
      },
    },
  },
}
