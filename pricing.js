// /opt/poizexchange1/webapp/pricing.js  (или где у тебя лежит фронт на Pages; версию кэша подними до v=35)
window.CURRENCIES = [
  { code: "RUB", title: "₽ RUB" },
  { code: "USD", title: "$ USD (новые)" },
  { code: "USDT", title: "USDT" },
  { code: "CNY", title: "¥ CNY" },
  { code: "BTC", title: "₿ BTC" },
  { code: "ETH", title: "Ξ ETH" },
  { code: "XMR", title: "ɱ XMR" }
];

// Примерные тарифы/квоты — адаптируй под свою логику v34:
window.PRICING = {
  // RUB -> CNY (пополнение китайских сервисов)
  "RUB→CNY": [
    { up_to: 1000, rate: 11.85 },
    { up_to: 3000, rate: 11.75 },
    { up_to: 15000, rate: 11.70 },
    { up_to: 30000, rate: 11.65 },
    { up_to: 70000, rate: 11.60 },
    { up_to: Infinity, rate: 11.60 }
  ],
  // USDT -> RUB (cash)
  "USDT→RUB": [
    { up_to: 5000, buy_rate: 77.00, sell_rate: 82.05 }, // Покупаем USDT/Продаём за руб
    { up_to: Infinity, buy_rate: 79.00, sell_rate: 81.50 }
  ],
  // USD (наличные, «синие») -> RUB (cash)
  "USD→RUB": [
    { up_to: 5000, buy_rate: 79.30, sell_rate: 82.05 },
    { up_to: Infinity, buy_rate: 79.30, sell_rate: 81.50 }
  ],
  // Для остальных пар оставь твою старую схему v34 или заглушки:
};

// Вспомогательные функции v34 (оставь как у тебя было)
window.formatN = (n) => (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("ru-RU");

// Пример унифицированной котировки (подгони под твой калькулятор v34):
window.quote = function (dir, amount) {
  const rowset = PRICING[dir];
  if (!rowset || !amount) return null;

  // выбираем подходящий тариф
  const row = rowset.find(r => amount <= r.up_to) || rowset[rowset.length - 1];

  if ("rate" in row) {
    const rate = row.rate;
    return { rate, total: amount / rate }; // например RUB→CNY: отдаёшь рубли, получаешь юани
  } else {
    // схемы с buy/sell (cash)
    // тут выбирай buy_rate/sell_rate в зависимости от твоей логики интерфейса (покупка/продажа)
    // ниже — пример "получишь рубли" по buy_rate:
    const rate = row.buy_rate;
    return { rate, total: amount * rate };
  }
};
