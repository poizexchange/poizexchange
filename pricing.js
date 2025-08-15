// === БАЗОВЫЕ КУРСЫ К РУБЛЮ (1 единица валюты = сколько RUB) ===
// ⚠️ ОБНОВЛЯЙ эти цифры по мере необходимости.
// USD/USDT/CNY — у тебя уже были; для BTC/ETH/XMR вноси свои актуальные.
const RATES_RUB = {
  USD: 82.9,   // 1 USD = 82.9 RUB  (твои данные)
  USDT: 82.5,  // 1 USDT = 82.5 RUB (твои данные, можно взять первый порог)
  CNY: 11.6,   // 1 CNY = 11.60 RUB (из "RUB>CNY 1¥ = 11.60")
  BTC: 6800000, // ПРИМЕР! Замените на актуальный курс BTC→RUB
  ETH: 350000,  // ПРИМЕР! Замените на актуальный курс ETH→RUB
  XMR: 15000,   // ПРИМЕР! Замените на актуальный курс XMR→RUB
  RUB: 1
};

// Список валют (порядок важен для сетки и иконок)
const CURRENCIES = [
  { code: "USD",  title: "USD"  },
  { code: "USDT", title: "USDT" },
  { code: "CNY",  title: "CNY"  },
  { code: "BTC",  title: "BTC"  },
  { code: "ETH",  title: "ETH"  },
  { code: "XMR",  title: "XMR"  },
  { code: "RUB",  title: "RUB"  }
];

// Универсальный кросс-курс FROM→TO через RUB:
// rate(FROM→TO) = (RUB_per_unit_FROM) / (RUB_per_unit_TO)
function rateCross(from, to){
  if (!RATES_RUB[from] || !RATES_RUB[to]) return null;
  return RATES_RUB[from] / RATES_RUB[to];
}

// Котировка: сколько получу TO за amount FROM
function quotePair(from, to, amount){
  if (!isFinite(amount) || amount <= 0) return null;
  const r = rateCross(from, to);
  if (!r) return null;
  return { rate: r, total: amount * r };
}

function formatN(x){ return Number(x).toLocaleString('ru-RU',{maximumFractionDigits:2}); }

