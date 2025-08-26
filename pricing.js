// pricing.js v43 — матрица доступности + правила цен/порогов + котировки
(function () {
  const ICON = (name) => `./icons/${name}.svg`;
  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };

  // ---- Справочник валют/сервисов с русскими подписями ----
  const C = {
    // Наличные
    RUB : {code:'RUB', nameRu:'Рубль',  icon:ICON('rub')},
    USD : {code:'USD', nameRu:'Доллар', icon:ICON('usd')},
    CNY : {code:'CNY', nameRu:'Юань',   icon:ICON('cny')},

    // Банки РФ
    SBP   : {code:'SBP',   nameRu:'СБП',        icon:ICON('sbp')},
    SBER  : {code:'SBER',  nameRu:'Сбер',       icon:ICON('sber')},
    TCS   : {code:'TCS',   nameRu:'Т-Банк',     icon:ICON('tbank')},
    ALFA  : {code:'ALFA',  nameRu:'Альфа-Банк', icon:ICON('alfa')},
    VTB   : {code:'VTB',   nameRu:'ВТБ',        icon:ICON('vtb')},
    RAIFF : {code:'RAIFF', nameRu:'Райфф',      icon:ICON('raif')},
    OZON  : {code:'OZON',  nameRu:'Озон',       icon:ICON('ozon')},
    OTP   : {code:'OTP',   nameRu:'ОТП',        icon:ICON('bank')},

    // Криптовалюты
    USDT : {code:'USDT', nameRu:'USDT', icon:ICON('usdt')},
    BTC  : {code:'BTC',  nameRu:'BTC',  icon:ICON('btc')},
    ETH  : {code:'ETH',  nameRu:'ETH',  icon:ICON('eth')},
    LTC  : {code:'LTC',  nameRu:'LTC',  icon:ICON('ltc')},
    XMR  : {code:'XMR',  nameRu:'XMR',  icon:ICON('xmr')},
    SOL  : {code:'SOL',  nameRu:'SOL',  icon:ICON('sol')},
    XRP  : {code:'XRP',  nameRu:'XRP',  icon:ICON('xrp')},
    TON  : {code:'TON',  nameRu:'TON',  icon:ICON('ton')},

    // Китайские сервисы
    ALIPAY : {code:'ALIPAY', nameRu:'Alipay',       icon:ICON('alipay')},
    WECHAT : {code:'WECHAT', nameRu:'WeChat',       icon:ICON('wechat')},
    CN_CARD: {code:'CN_CARD',nameRu:'Карта Китая',  icon:ICON('bankcn')}
  };

  // ---- Доступность (что показываем в «Отдаю / Получаю») ----
  // Правила из чата:
  // • отдавать CNY нельзя вообще
  // • получить CNY наличными можно только в Гуанчжоу
  // • кэш/банк/крипто — как раньше
  const MATRIX = {
    // ОТДАЮ
    from: {
      cash: {
        moscow:    ['RUB','USD'],     // CNY отдавать нельзя
        guangzhou: ['RUB','USD']      // CNY отдавать нельзя
      },
      bank: {
        moscow:    ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
        guangzhou: ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
      },
      crypto: {
        moscow:    ['USDT','BTC','ETH','LTC','XMR','SOL','XRP','TON'],
        guangzhou: ['USDT','BTC','ETH','LTC','XMR','SOL','XRP','TON']
      }
    },
    // ПОЛУЧАЮ
    to: {
      cash: {
        moscow:    ['RUB','USD'],          // CNY кэш в Москве не выдаём
        guangzhou: ['RUB','USD','CNY']     // CNY кэш только тут
      },
      bank: {
        moscow:    ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
        guangzhou: ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
      },
      crypto: {
        moscow:    ['USDT','BTC','ETH','LTC','XMR','SOL','XRP','TON'],
        guangzhou: ['USDT','BTC','ETH','LTC','XMR','SOL','XRP','TON']
      },
      cnpay: {
        moscow:    ['ALIPAY','WECHAT','CN_CARD'],
        guangzhou: ['ALIPAY','WECHAT','CN_CARD']
      }
    }
  };

  // ---- Базовые параметры и хелперы округления/формата ----
  const fmtNum = (n, d=2) =>
    (n==null || isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU', {minimumFractionDigits:0, maximumFractionDigits:d});

  const round2 = (n)=> Math.round(n * 100) / 100;
  const round4 = (n)=> Math.round(n * 10000) / 10000;

  // ---- Тарифы (пороговые функции) ----
  // 1) CASH RUB -> USD (курс 81.40 RUB за 1 USD, но применяется НАЦЕНКА по сумме USD)
  function priceRUBtoUSD_perUSD(amountUSD){
    const base = 81.40; // руб за $1
    let extra = 0.025;  // <700 — 2.5%
    if (amountUSD >= 700   && amountUSD <= 1499) extra = 0.020;
    if (amountUSD >= 1500  && amountUSD <= 2999) extra = 0.017;
    if (amountUSD >= 3000  && amountUSD <= 6000) extra = 0.0125;
    if (amountUSD >= 6001  && amountUSD <= 9999) extra = 0.0095;
    if (amountUSD >= 10000)                      extra = 0.007;
    return base * (1 + extra);                   // руб/1 USD
  }

  // 2) CASH RUB -> USDT (аналогичная наценка по «долларовым» суммам)
  function priceRUBtoUSDT_perUSDT(amountUSDT){
    const base = 81.40; // считаем USDT≈USD
    let extra = 0.025;
    if (amountUSDT >= 700   && amountUSDT <= 1499) extra = 0.020;
    if (amountUSDT >= 1500  && amountUSDT <= 2999) extra = 0.017;
    if (amountUSDT >= 3000  && amountUSDT <= 6000) extra = 0.0125;
    if (amountUSDT >= 6001  && amountUSDT <= 9999) extra = 0.0095;
    if (amountUSDT >= 10000)                       extra = 0.007;
    return base * (1 + extra);                     // руб/1 USDT
  }

  // 3) RUB -> Китайские сервисы (руб/1 CNY) — пороги по сумме CNY
  function priceRUBtoCNY_perCNY(amountCNY){
    // от 500–1000 = 12.90, от 1000 = 11.95, от 3000 = 11.90, от 15000 = 11.85, от 30000 = 11.80, от 70000 = 11.75
    if (amountCNY >= 70000) return 11.75;
    if (amountCNY >= 30000) return 11.80;
    if (amountCNY >= 15000) return 11.85;
    if (amountCNY >= 3000)  return 11.90;
    if (amountCNY >= 1000)  return 11.95;
    if (amountCNY >= 500)   return 12.90;
    return 12.90; // по умолчанию до 500 — держим 12.90, чтобы не оставлять «дыру»
  }

  // 4) USD cash -> RUB cash (79.50 RUB за $1)
  const priceUSDtoRUB_perUSD = 79.50;

  // 5) USDT -> RUB (кэш и банки) (79.50 RUB за 1 USDT)
  const priceUSDTtoRUB_perUSDT = 79.50;

  // 6) USDT -> Китайские сервисы: по последней просьбе — держим как у USD к тем же сервисам.
  // Для USD->CNPAY явного прайса нет, посчитаем через мост USD->RUB (обратный к RUB->USD) и RUB->CNY.
  // USD->RUB (покупка RUB за USD) примем как 79.50, тогда RUB->CNY как в функции priceRUBtoCNY_perCNY.
  // Итоговая USD->CNY ≈ (RUB/CNY) / (RUB/USD), но нам нужен CNY за 1 USD (то есть CNY/USD).
  // CNY за 1 USD = (RUB/USD) / (RUB/CNY).
  function priceUSDtoCNY_perUSD(amountUSD){
    // сначала оценим целевой объём в CNY, чтобы выбрать порог
    // приблизительно: возьмём среднюю ставку RUB->CNY для оценки (12.0), затем уточнять смысла мало — порог широкими ступенями
    const approxRUBperUSD = priceUSDtoRUB_perUSD; // 79.50 руб / USD
    // прицельно возьмём порог по amountCNY, исходя из ожидаемой выдачи за amountUSD
    // CNY per USD = RUB/USD / RUB/CNY
    // чтобы понять amountCNY, надо умножить amountUSD * (CNY per USD). Мы не знаем его до вычисления.
    // упростим: сначала грубо через 12.0, чтобы выбрать порог, затем посчитаем точный курс.
    const approxCNYperUSD = 79.50 / 12.0; // ≈ 6.625
    const amountCNY = amountUSD * approxCNYperUSD;

    const rubPerCNY = priceRUBtoCNY_perCNY(amountCNY); // выберем ступень
    const cnyPerUSD = approxRUBperUSD / rubPerCNY;     // итог: CNY за 1 USD
    return cnyPerUSD;
  }
  // И как просили: USDT->CNY == USD->CNY (та же логика)
  function priceUSDTtoCNY_perUSDT(amountUSDT){
    return priceUSDtoCNY_perUSD(amountUSDT);
  }

  // 7) Крипто котировки (BTC/ETH):
  // RUB->BTC = 9,300,000 руб за 1 BTC; USD/USDT->BTC = 113,000 за 1 BTC
  const RUB_per_BTC  = 9300000;
  const USD_per_BTC  = 113000; // и для USDT тоже
  // RUB->ETH = 399,000; USD/USDT->ETH = 4,900
  const RUB_per_ETH  = 399000;
  const USD_per_ETH  = 4900;

  // ---- Вспомогательные классификаторы ----
  const isBank = (code)=> ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'].includes(code);
  const isCrypto = (code)=> ['USDT','BTC','ETH','LTC','XMR','SOL','XRP','TON'].includes(code);
  const isCnpay = (code)=> ['ALIPAY','WECHAT','CN_CARD'].includes(code);

  // ---- Основной прайс-двигатель: возвращает rate и total ----
  // ВАЖНО: rate трактуем как «СКОЛЬКО ПОЛУЧАЕМ (to) за 1 ЕДИНУЦУ ОТДАЁМ (from)»
  function makeQuote({from, to, amount}) {
    const A = Number(amount || 0);
    if (!from || !to || !(A > 0)) return null;

    // Блок запретов из требований
    if (from === 'CNY') return null; // отдавать CNY нельзя

    // --- Прямые кейсы по прайсу ---
    // RUB cash/bank -> USD: считаем сколько USD за 1 RUB
    if (from === 'RUB' && to === 'USD') {
      const rubPer1USD = priceRUBtoUSD_perUSD(A);     // RUB / 1 USD
      const usdPerRub  = 1 / rubPer1USD;              // USD / 1 RUB
      return {rate: round4(usdPerRub), total: round2(A * usdPerRub)};
    }
    // RUB -> USDT
    if (from === 'RUB' && to === 'USDT') {
      const rubPer1USDT = priceRUBtoUSDT_perUSDT(A);  // RUB / 1 USDT
      const usdtPerRub  = 1 / rubPer1USDT;            // USDT / 1 RUB
      return {rate: round4(usdtPerRub), total: round2(A * usdtPerRub)};
    }
    // RUB -> CNY (включая выдачу в Alipay/WeChat/CN_CARD — считаем как CNY)
    if (from === 'RUB' && (to === 'CNY' || isCnpay(to))) {
      const cnyPerRub = 1 / priceRUBtoCNY_perCNY(A);  // CNY / 1 RUB
      return {rate: round4(cnyPerRub), total: round2(A * cnyPerRub)};
    }

    // USD -> RUB
    if (from === 'USD' && to === 'RUB') {
      const rub = priceUSDtoRUB_perUSD;               // RUB / 1 USD
      return {rate: round4(rub), total: round2(A * rub)};
    }

    // USDT -> RUB (и в банки курс тот же)
    if (from === 'USDT' && (to === 'RUB' || isBank(to))) {
      const rub = priceUSDTtoRUB_perUSDT;             // RUB / 1 USDT
      return {rate: round4(rub), total: round2(A * rub)};
    }

    // USD -> CNY / USDT -> CNY (и на Alipay/WeChat/CN_CARD)
    if ((from === 'USD' || from === 'USDT') && (to === 'CNY' || isCnpay(to))) {
      const per = (from === 'USD') ? priceUSDtoCNY_perUSD(A) : priceUSDTtoCNY_perUSDT(A); // CNY / 1 (USD|USDT)
      return {rate: round4(per), total: round2(A * per)};
    }

    // --- Крипта BTC/ETH прайс ---
    // RUB -> BTC/ETH
    if (from === 'RUB' && to === 'BTC') {
      const btcPerRub = 1 / RUB_per_BTC;
      return {rate: round8(btcPerRub), total: round8(A * btcPerRub)};
    }
    if (from === 'RUB' && to === 'ETH') {
      const ethPerRub = 1 / RUB_per_ETH;
      return {rate: round8(ethPerRub), total: round8(A * ethPerRub)};
    }
    // USD/USDT -> BTC/ETH
    if ((from === 'USD' || from === 'USDT') && to === 'BTC') {
      const btcPer = 1 / USD_per_BTC;
      return {rate: round8(btcPer), total: round8(A * btcPer)};
    }
    if ((from === 'USD' || from === 'USDT') && to === 'ETH') {
      const ethPer = 1 / USD_per_ETH;
      return {rate: round8(ethPer), total: round8(A * ethPer)};
    }

    // Банки -> всё остальное: курс такой же как у наличного рубля.
    // Значит интерпретируем «из банка RUB» эквивалент «RUB cash».
    if (isBank(from)) {
      // 1) в RUB: банк->RUB 1:1
      if (to === 'RUB') return {rate: 1, total: round2(A * 1)};
      // 2) в USD/USDT/CNY/крипту — переиспользуем правила как для RUB
      return makeQuote({from:'RUB', to, amount:A});
    }

    // Из крипты (кроме USDT вверху) → попробуем через USDT:
    if (isCrypto(from) && from !== 'USDT') {
      // пробуем мост from -> USDT (пока не задано — нет прямых), оставим пусто
      // чтобы не "ломать", попытаемся через RUB: from->RUB не задан — fallback нет
      // вернём null, UI покажет «—»
      return null;
    }

    // RUB -> банки: 1:1
    if (from === 'RUB' && isBank(to)) {
      return {rate: 1, total: round2(A)};
    }

    // USD -> банки: пусть идёт как USD->RUB затем RUB->банк (1:1)
    if (from === 'USD' && isBank(to)) {
      const rub = priceUSDtoRUB_perUSD;
      return {rate: round4(rub), total: round2(A * rub)};
    }

    // USDT -> банки — уже обработано выше (79.50)

    // Остальные пары попробуем через мосты:
    // 1) Через RUB
    let r1 = makeQuote({from, to:'RUB', amount:1});
    let r2 = makeQuote({from:'RUB', to, amount:A});
    if (r1 && r2 && r1.rate>0) {
      const rate = r2.rate / r1.rate;
      return {rate: round4(rate), total: round2(A * rate)};
    }
    // 2) Через USD
    r1 = makeQuote({from, to:'USD', amount:1});
    r2 = makeQuote({from:'USD', to, amount:A});
    if (r1 && r2 && r1.rate>0) {
      const rate = r2.rate / r1.rate;
      return {rate: round4(rate), total: round2(A * rate)};
    }
    // 3) Через USDT
    r1 = makeQuote({from, to:'USDT', amount:1});
    r2 = makeQuote({from:'USDT', to, amount:A});
    if (r1 && r2 && r1.rate>0) {
      const rate = r2.rate / r1.rate;
      return {rate: round4(rate), total: round2(A * rate)};
    }

    return null;
  }

  function round8(n){ return Math.round(n * 1e8) / 1e8; }

  // ---- Публичный API ----
  function currencies(kind, city, side){
    const sideKey = side === 'from' ? 'from' : 'to';
    let key = 'cash';
    if (kind === 'bank') key = 'bank';
    else if (kind === 'crypto') key = 'crypto';
    else if (kind === 'cnpay') key = 'cnpay';

    const list = (MATRIX[sideKey][key][city] || [])
      .filter(code => !(side === 'from' && code === 'CNY')) // отдавать CNY нельзя
      .map(code => ensureIcon(C[code]))
      .filter(Boolean);
    return list;
  }

  function quote({from, to, amount}){
    const q = makeQuote({from, to, amount});
    if (!q) return {rate:null, total:null, rateText:'—', totalText:'—'};
    return {
      rate: q.rate,
      total: q.total,
      rateText: `${fmtNum(q.rate, 4)} ${to} за 1 ${from}`,
      totalText: `${fmtNum(q.total, 2)} ${to}`
    };
  }

  window.PRICING = { currencies, quote };
})();
