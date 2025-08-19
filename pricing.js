// v34b — тарифы и котировки

const CURRENCIES = [
  { code: "USDT", title: "💲 USDT" },
  { code: "USD",  title: "🇺🇸 USD" },
  { code: "RUB",  title: "🇷🇺 RUB" },
  { code: "CNY",  title: "🇨🇳 CNY" },
  { code: "BTC",  title: "₿ BTC"  },
  { code: "ETH",  title: "Ξ ETH"  },
  { code: "XMR",  title: "ɱ XMR"  },
];

// вспомогалки
function fmt(n){ return Number(n).toLocaleString('ru-RU', {maximumFractionDigits: 2}); }

// твои сетки (из переписки)
function rateFor(dir, amount){
  // USDT > RUB
  if (dir === 'USDT>RUB'){
    if (amount >= 10000) return 81.10;
    if (amount >= 5000)  return 81.40;
    if (amount >= 1000)  return 81.90;
    return 82.50;
  }
  // USD > RUB (комиссия 0%, применяем курс/комиссию «сведённо» как чистый курс)
  if (dir === 'USD>RUB'){
    if (amount >= 10000) return 81.50;
    if (amount >= 5000)  return 81.90;
    if (amount >= 1000)  return 82.50;
    return 82.90;
  }
  // RUB > USDT, USD, CNY — фикс
  if (dir === 'RUB>USDT') return 79.30;
  if (dir === 'RUB>USD')  return 79.90;

  // USDT > CNY
  if (dir === 'USDT>CNY'){
    if (amount >= 10000) return 7.07;
    if (amount >= 5000)  return 7.03;
    if (amount >= 1000)  return 7.00;
    return 6.90;
  }

  // RUB > CNY — два режима: по ¥ или фикс 10
  // режим выбирается в index.html, сюда приходит уже "RUB>CNY" (математика ниже)
  if (dir === 'RUB>CNY') {
    // сам курс посчитаем в quote() исходя из выбранного режима
    return null;
  }

  // RUB > CNY (табличные чеки)
  // (оставим только для справки — на табло используется отдельно)
  // Чеки 500-1000¥: 1¥ = 12.9 — это обратная задача, не используем в калькуляторе.

  // иные пары по умолчанию: нет котировки
  return null;
}

// конструктор направления (с учётом режима RUB→CNY)
function buildDirection(from, to, rubCnyMode){
  if (from === 'RUB' && to === 'CNY'){
    // в котировке вернём просто "RUB>CNY", сам режим учтём в quote()
    return 'RUB>CNY' + (rubCnyMode ? ':'+rubCnyMode : '');
  }
  return `${from}>${to}`;
}

function quote(direction, amount){
  if (!amount || amount <= 0) return {rate: 0, total: 0};

  // распарсим режим
  let dir = direction;
  let mode = null;
  if (direction.startsWith('RUB>CNY') && direction.includes(':')){
    const parts = direction.split(':');
    dir = parts[0];
    mode = parts[1]; // 'byy' | 'fix'
  }

  // обычные пары
  if (dir !== 'RUB>CNY'){
    const r = rateFor(dir, amount);
    if (r == null) return {rate: 0, total: 0};
    // считаем "сколько получит" в правой валюте
    if (dir.endsWith('>RUB') || dir.endsWith('>CNY')) {
      return {rate: r, total: fmt(amount * r)};
    }
    if (dir.startsWith('RUB>')) {
      // RUB>USDT / RUB>USD — r это кросс курс RUB_per_unit?
      // В переписке дали “руб→usdt 79.30”; интерпретируем как RUB per 1 unit (сколько RUB за 1 USDT)
      // Тогда amount (RUB) / r = получаемое кол-во в правой валюте
      return {rate: r, total: fmt(amount / r)};
    }
    // fallback
    return {rate: r, total: fmt(amount * r)};
  }

  // RUB > CNY режимы
  if (dir === 'RUB>CNY'){
    if (mode === 'fix'){ // фикс 10
      const r = 10.0; // 1¥ = 10 RUB → сколько ¥ получит: RUB / 10
      return {rate: r, total: fmt(amount / r)};
    }
    // byy: по ¥ (из USDT>CNY с «мостом» RUB>USDT≈79.3 → примерная аппроксимация)
    // Возьмём средний "рынок" для демонстрации: 1¥ = 11.7 RUB (из твоей сетки)
    const r = 11.7;
    return {rate: r, total: fmt(amount / r)};
  }

  return {rate: 0, total: 0};
}
