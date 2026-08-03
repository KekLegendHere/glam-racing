/* Каталог машин. Характеристики 1..10 — они реально влияют на геймплей (см. game.js).
   Спрайты нарисованы «в духе» прототипов: без логотипов и фирменных знаков.
   Список отсортирован по цене — в таком же порядке он выводится в гараже. */
window.CARS = [
  {
    id: 'vesta', name: 'Веста Спорт', sub: 'в духе Lada Vesta Sport', price: 0,
    color: '#ff5fa2', speed: 7, handling: 8, magnet: 5,
    note: 'Стартовая красотка: лёгкая и послушная.'
  },
  {
    id: 'zhiguli', name: 'Семёрка', sub: 'в духе ВАЗ-2107', price: 150,
    color: '#c39bff', speed: 6, handling: 9, magnet: 6,
    note: 'Классика с глиттером и сердечками на крыше.'
  },
  {
    id: 'cinquecento', name: 'Чинквеченто', sub: 'в духе Fiat 500', price: 250,
    color: '#ffe9a8', speed: 5, handling: 10, magnet: 6,
    note: 'Самая маленькая в гараже — проскочит там, где не влезет никто.'
  },
  {
    id: 'mini', name: 'Мини Купер', sub: 'в духе classic Mini Cooper', price: 350,
    color: '#ff5d5d', speed: 6, handling: 10, magnet: 6,
    note: 'Колёса по углам, поворот — как по рельсам.'
  },
  {
    id: 'beetle', name: 'Жук', sub: 'в духе VW Beetle', price: 450,
    color: '#9fe6c4', speed: 6, handling: 9, magnet: 7,
    note: 'Мятный, круглый и с ромашками. Икона всех времён.'
  },
  {
    id: 'clio', name: 'Клио', sub: 'в духе Renault Clio', price: 600,
    color: '#c9a8ff', speed: 7, handling: 9, magnet: 6,
    note: 'Французский хэтчбек с радужной полосой на боку.'
  },
  {
    id: 'niva', name: 'Нива Легенд', sub: 'в духе Lada Niva Legend', price: 750,
    color: '#7ee8c4', speed: 7, handling: 7, magnet: 8,
    note: 'Проедет везде и соберёт всё, что блестит.'
  },
  {
    id: 'gti', name: 'Гольф GTI', sub: 'в духе VW Golf GTI mk2', price: 900,
    color: '#ff6b5c', speed: 8, handling: 9, magnet: 6,
    note: 'Тот самый горячий хэтч, с которого всё началось.'
  },
  {
    id: 'bus', name: 'Хиппи-бус', sub: 'в духе VW T1 Bus', price: 1050,
    color: '#6fd8d0', speed: 5, handling: 6, magnet: 10,
    note: 'Медленный, зато собирает кристаллы всей улицей.'
  },
  {
    id: 'pickup', name: 'Пикап', sub: 'в духе Ford F-150', price: 1200,
    color: '#ffd9b0', speed: 8, handling: 5, magnet: 8,
    note: 'Здоровенный кузов и характер: дорогу уступают все.'
  },
  {
    id: 'miata', name: 'Родстер', sub: 'в духе Mazda MX-5 Miata', price: 1350,
    color: '#ff8ec9', speed: 7, handling: 10, magnet: 6,
    note: 'Открытый верх, розовый лак и идеальная развесовка.'
  },
  {
    id: 'moskvich', name: 'Москвич 3', sub: 'в духе Moskvich 3', price: 1500,
    color: '#ff9c6e', speed: 8, handling: 8, magnet: 6,
    note: 'Свежий кроссовер персикового цвета.'
  },
  {
    id: 'e30', name: 'Тройка E30', sub: 'в духе BMW E30', price: 1650,
    color: '#a8c8ff', speed: 8, handling: 9, magnet: 6,
    note: 'Восьмидесятые, тонкие стойки и безупречные грани.'
  },
  {
    id: 'wrangler', name: 'Вранглер', sub: 'в духе Jeep Wrangler', price: 1850,
    color: '#5fd3c8', speed: 7, handling: 7, magnet: 9,
    note: 'Без крыши и без тормозов в хорошем смысле.'
  },
  {
    id: 'volga', name: 'Волга ГАЗ-21', sub: 'в духе GAZ-21 Volga', price: 2050,
    color: '#ffd9c9', speed: 8, handling: 6, magnet: 9,
    note: 'Ретро-икона с хромом и жемчужным перламутром.'
  },
  {
    id: 'typer', name: 'Тайп R', sub: 'в духе Honda Civic Type R', price: 2250,
    color: '#fff0f6', speed: 9, handling: 9, magnet: 5,
    note: 'Огромное антикрыло и злой характер под белым лаком.'
  },
  {
    id: 'mustang', name: 'Мустанг', sub: 'в духе Ford Mustang fastback', price: 2450,
    color: '#2fb8b0', speed: 9, handling: 6, magnet: 7,
    note: 'Бирюзовый фастбек шестидесятых. Громкий во всех смыслах.'
  },
  {
    id: 'defender', name: 'Дефендер', sub: 'в духе Land Rover Defender', price: 2650,
    color: '#a8c4a0', speed: 8, handling: 6, magnet: 10,
    note: 'Квадратный, невозмутимый, с багажником на крыше.'
  },
  {
    id: 'rally', name: 'Ралли WRX', sub: 'в духе Subaru Impreza WRX STI', price: 2850,
    color: '#5fa8ff', speed: 9, handling: 10, magnet: 6,
    note: 'Полный привод: держит любую траекторию.'
  },
  {
    id: 'camaro', name: 'Камаро', sub: 'в духе Chevrolet Camaro', price: 3050,
    color: '#a95fff', speed: 9, handling: 7, magnet: 6,
    note: 'Фиолетовый мускул-кар с серебряными полосами.'
  },
  {
    id: 'charger', name: 'Чарджер', sub: 'в духе Dodge Charger 1970', price: 3250,
    color: '#3a2a44', speed: 10, handling: 5, magnet: 7,
    note: 'Чёрный, длинный, с розовой полосой на капоте.'
  },
  {
    id: 'patriot', name: 'УАЗ Патриот', sub: 'в духе UAZ Patriot', price: 3450,
    color: '#b98cff', speed: 9, handling: 5, magnet: 7,
    note: 'Большая, тяжёлая, сиреневая. Дорогу уступают все.'
  },
  {
    id: 'gelik', name: 'Гелик', sub: 'в духе Mercedes G-Class', price: 3700,
    color: '#f2b9c4', speed: 9, handling: 6, magnet: 8,
    note: 'Розовый кубик с хромом. Заметен из космоса.'
  },
  {
    id: 'electra', name: 'Электра', sub: 'в духе Tesla Model 3', price: 3950,
    color: '#cfa8ff', speed: 10, handling: 9, magnet: 7,
    note: 'Бесшумная, со стеклянной крышей и мгновенным разгоном.'
  },
  {
    id: 'supra', name: 'Супра', sub: 'в духе Toyota Supra A80', price: 4200,
    color: '#ff9a4d', speed: 10, handling: 8, magnet: 6,
    note: 'Легенда девяностых с огромным антикрылом.'
  },
  {
    id: 'gtr', name: 'Скайлайн', sub: 'в духе Nissan Skyline GT-R R34', price: 4500,
    color: '#7ec8ff', speed: 10, handling: 9, magnet: 6,
    note: 'Годзилла: разгон, цепкость и голубой металлик.'
  },
  {
    id: 'etype', name: 'Родстер E', sub: 'в духе Jaguar E-Type', price: 4800,
    color: '#4f8f5f', speed: 9, handling: 8, magnet: 9,
    note: 'Самый длинный капот в гараже и кремовый салон.'
  },
  {
    id: 'nine11', name: 'Девять-одиннадцать', sub: 'в духе Porsche 911', price: 5100,
    color: '#e8c78a', speed: 10, handling: 10, magnet: 7,
    note: 'Золотой эталон: быстрая и абсолютно предсказуемая.'
  },
  {
    id: 'rossa', name: 'Росса', sub: 'в духе Ferrari F40', price: 5500,
    color: '#ff3d6e', speed: 10, handling: 9, magnet: 8,
    note: 'Среднемоторный суперкар цвета фуксии.'
  },
  {
    id: 'wedge', name: 'Клин', sub: 'в духе Lamborghini Countach', price: 6000,
    color: '#f4f0ff', speed: 10, handling: 8, magnet: 10,
    note: 'Перламутровый клин из восьмидесятых. Плакат на стене.'
  },
  {
    id: 'senat', name: 'Аурус Сенат', sub: 'в духе Aurus Senat', price: 6500,
    color: '#f5cf6b', speed: 10, handling: 7, magnet: 10,
    note: 'Золотой лимузин. Финальная мечта гаража.'
  }
];

window.CAR_BY_ID = Object.fromEntries(window.CARS.map(c => [c.id, c]));
window.CAR_SPRITE = id => 'assets/cars/' + id + '.webp';
