/* Каталог машин. Все характеристики 1..10 — они реально влияют на геймплей (см. game.js). */
window.CARS = [
  {
    id: 'vesta',
    name: 'Веста Спорт',
    sub: 'Lada Vesta Sport',
    price: 0,
    color: '#ff5fa2',
    speed: 7, handling: 8, magnet: 5,
    note: 'Стартовая красотка: лёгкая и послушная.'
  },
  {
    id: 'zhiguli',
    name: 'Семёрка',
    sub: 'ВАЗ-2107',
    price: 250,
    color: '#c39bff',
    speed: 6, handling: 9, magnet: 6,
    note: 'Классика с глиттером. Крутится как на льду — в хорошем смысле.'
  },
  {
    id: 'niva',
    name: 'Нива Легенд',
    sub: 'Lada Niva Legend',
    price: 600,
    color: '#7ee8c4',
    speed: 7, handling: 7, magnet: 8,
    note: 'Проедет везде и соберёт всё, что блестит.'
  },
  {
    id: 'moskvich',
    name: 'Москвич 3',
    sub: 'Moskvich 3',
    price: 1100,
    color: '#ff9c6e',
    speed: 8, handling: 8, magnet: 6,
    note: 'Свежий кроссовер персикового цвета.'
  },
  {
    id: 'volga',
    name: 'Волга ГАЗ-21',
    sub: 'GAZ-21 Volga',
    price: 1800,
    color: '#ffd9c9',
    speed: 8, handling: 6, magnet: 9,
    note: 'Ретро-икона с хромом и жемчужным перламутром.'
  },
  {
    id: 'patriot',
    name: 'УАЗ Патриот',
    sub: 'UAZ Patriot',
    price: 2600,
    color: '#b98cff',
    speed: 9, handling: 5, magnet: 7,
    note: 'Большая, тяжёлая, сиреневая. Дорогу уступают все.'
  },
  {
    id: 'senat',
    name: 'Аурус Сенат',
    sub: 'Aurus Senat',
    price: 4000,
    color: '#f5cf6b',
    speed: 10, handling: 7, magnet: 10,
    note: 'Золотой лимузин. Финальная мечта гаража.'
  }
];

window.CAR_BY_ID = Object.fromEntries(window.CARS.map(c => [c.id, c]));
window.CAR_SPRITE = id => 'assets/cars/' + id + '.png';
