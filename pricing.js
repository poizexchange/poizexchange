// pricing.js v43 — “курс за получаемую валюту”, новые правила и тарифы
(function () {
  const ICON = (name) => `./icons/${name}.svg`;
  const FALLBACK_ICON = ICON('bank');

  // ---- Справочник валют/сервисов + иконки (как в вашем UI) ----
  const C = {
    // Наличные
    RUB:   { code:'RUB',   nameRu:'Рубль',       icon:ICON('rub') },
    USD:   { code:'USD',   nameRu:'Доллар',      icon:ICON('usd') },
    CNY:   { code:'CNY',   nameRu:'Юань',        icon:ICON('cny') },

    // Банки РФ (курс как у наличного рубля к остальным валютам)
    SBP:   { code:'SBP',   nameRu:'СБП',         icon:ICON('sbp') },
    SBER:  { code:'SBER',  nameRu:'Сбер',        icon:ICON('sber') },
    TCS:   { code:'TCS',   nameRu:'Т-Банк',      icon:ICON('tbank') },
    ALFA:  { code:'ALFA',  nameRu:'Альфа-Банк',  icon:ICON('alfa') },
    VTB:   { code:'VTB',   nameRu:'ВТБ',         icon:ICON('vtb') },
    RAIFF: { code:'RAIFF', nameRu:'Райфф',       icon:ICON('raif') },
    OZON:  { code:'OZON',  nameRu:'Озон',        icon:ICON('ozon') },
    OTP:   { code:'OTP',   nameRu:'ОТП',         icon:ICON('bank') },

    // Крипта
    USDT:  { code:'USDT',  nameRu:'USDT',        icon:ICON('usdt') },
    BTC:   { code:'BTC',   nameRu:'BTC',         icon:ICON('btc') },
    ETH:   { code:'ETH',   nameRu:'ETH',         icon:ICON('eth') },
    SOL:   { code:'SOL',   nameRu:'SOL',         icon:ICON('sol') },
    XMR:   { code:'XMR',   nameRu:'XMR',         icon:ICON('xmr') },
    XRP:   { code:'XRP',   nameRu:'XRP',         icon:ICON('xrp') },
    LTC:   { code:'LTC',   nameRu:'LTC',         icon:ICON('ltc') },
    TON:   { code:'TON',   nameRu:'TON',         icon:ICON('ton') },

    // Китайские сервисы (получаю)
    ALIPAY:{ code:'ALIPAY', nameRu:'Alipay',     icon:ICON('alipay') },
    WECHAT:{ code:'WECHAT', nameRu:'WeChat',     icon:ICON('wechat') },
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',icon:ICON('bankcn') },
  };

  const BANKS = ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'];
  const CRYPTO= ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'];
  const CNPAY = ['ALIPAY','WECHAT','CN_CARD'];

  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes   = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  // ---- Матрица доступности (города/режимы) ----
  // ВАЖНО: отдать CNY нельзя нигде. Получить CNY наличными — только Гуанчжоу.
  const MATRIX = {
    // отдаю
    cash: {
      moscow:    ['RUB','USD'],      // CNY удалить из отдаю
      guangzhou: ['RUB','USD'],
    },
    bank: {
      moscow:    BANKS,
      guangzhou: BANKS,
    },
    crypto: {
      moscow:    CRYPTO,
      guangzhou: CRYPTO,
    },
    // получаю
    cash_to: {
      moscow:    ['RUB','USD'],      // CNY скрываем
      guangzhou: ['RUB','USD','CNY'],
    },
    bank_to: {
      moscow:    BANKS,
      guangzhou: BANKS,
    },
    crypto_to: {
      moscow:    CRYPTO,
      guangzhou: CRYPTO,
    },
    cnpay_to: {
      moscow:    CNPAY,
      guangzhou: CNPAY,
    }
  };

  // ---- Базовые споты/фиксированные курсы (где есть спред) ----
  // Запоминаем: мы показываем и считаем РЕЙТ как «СКОЛЬКО ОТДАЮ за 1 ПОЛУЧАЮ» (FROM per 1 TO).
  const SPOT = {
    // НАЛИЧНЫЕ: RUB -> USD (получаю USD) — базовый 81.40 RUB/1 USD + наценка по сумме USD.
    RUB_per_USD_base_cash: 81.40,

    // USD -> RUB (получаю RUB) — фикс 79.50 RUB/1 USD
    RUB_per_USD_cash_buy: 79.50,

    // USDT -> RUB/Банки — 79.50 RUB/1 USDT
    RUB_per_USDT_cash_buy: 79.50,

    // RUB -> BTC/ETH (получаю BTC/ETH)
    RUB_per_BTC: 9300000,
    RUB_per_ETH: 399000,

    // USD/USDT -> BTC/ETH (получаю BTC/ETH)
    USD_per_BTC: 113000,
    USD_per_ETH: 4900,
  };

  // ---- Наценки/лестницы ----
  // RUB -> USD/USDT (получаю USD/USDT): наценка по объёму ПОЛУЧАЕМОГО USD/USDT
  function usdMarkupPerc(usdAmount){
    if (usdAmount >= 10000) return 0.0070;
    if (usdAmount >= 6000)  return 0.0095;
    if (usdAmount >= 3000)  return 0.0125;
    if (usdAmount >= 1500)  return 0.0170;
    if (usdAmount >= 700)   return 0.0200;
    return 0.0250; // 1..699
  }

  // RUB -> CNY через китайские сервисы (ALIPAY/WECHAT/CN_CARD), тариф по объёму получаемых CNY
  function rubPerCnyByTier(cnyAmount){
    if (cnyAmount >= 70000) return 11.75;
    if (cnyAmount >= 30000) return 11.80;
    if (cnyAmount >= 15000) return 11.85;
    if (cnyAmount >= 3000)  return 11.90;
    if (cnyAmount >= 1000)  return 11.95;
    if (cnyAmount >= 500)   return 12.90; // 500–999
    return 12.90; // меньше 500 — берём как 500–999
  }

  // USDT -> ALIPAY/WECHAT/CN_CARD — тариф по объёму ОТДАВАЕМОГО USDT; даны CNY за 1 USDT
  function cnyPerUsdtByTier(usdtAmount){
    if (usdtAmount >= 10000) return 7.07;
    if (usdtAmount >= 6000)  return 7.00;
    if (usdtAmount >= 3000)  return 6.95;
    // до 1000 USDT
    return 6.90;
  }

  // ---- Банки считаем как РУБЛИ (тот же курс, что у наличных рублей к прочим валютам) ----
  const asRUB = (code) => (code === 'RUB' || BANKS.includes(code));
  const isCNP = (code) => CNPAY.includes(code);

  // ---- Форматирование ----
  const fmtNum = (n, d=2) => (n == null || isNaN(n)) ? '—' :
    Number(n).toLocaleString('ru-RU',{ maximumFractionDigits:d });

  function rateText(from, to, rate){
    // rate = FROM per 1 TO
    const decimals = rate < 1 ? 6 : 4;
    return `${fmtNum(rate, decimals)} ${from} за 1 ${to}`;
  }

  // ---- Котировщик: считает rate (FROM per 1 TO) и total (сколько ПОЛУЧУ) ----
  function quote({ from, to, amount }) {
    from = (from || '').toUpperCase();
    to   = (to   || '').toUpperCase();
    const a = Number(amount || 0);
    if (!from || !to || !a || a <= 0) {
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    // Бизнес-правила: отдавать CNY нельзя
    if (from === 'CNY') {
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    let rate = null; // FROM per 1 TO
    let total = null;

    // ====== ЯВНЫЕ СЛУЧАИ ======

    // RUB/BANK -> USD  (получаю USD), с наценкой
    if (asRUB(from) && to === 'USD') {
      // оценим USD без наценки по базовому курсу:
      const usdEst = a / SPOT.RUB_per_USD_base_cash;
      const m = usdMarkupPerc(usdEst);
      const rubPerUsd = SPOT.RUB_per_USD_base_cash * (1 + m); // сколько RUB за 1 USD
      rate = rubPerUsd;                 // FROM per 1 TO
      total = a / rate;                 // сколько USD получу
      return {
        rate, total,
        rateText: rateText(from, to, rate),
        totalText: `${fmtNum(total, 2)} ${to}`,
      };
    }

    // RUB/BANK -> USDT (получаю USDT), та же лестница, что и к USD
    if (asRUB(from) && to === 'USDT') {
      const usdtEst = a / SPOT.RUB_per_USD_base_cash; // берём базу как для USD
      const m = usdMarkupPerc(usdtEst);
      const rubPerUsdt = SPOT.RUB_per_USD_base_cash * (1 + m);
      rate = rubPerUsdt;                // руб за 1 usdt
      total = a / rate;
      return {
        rate, total,
        rateText: rateText(from, to, rate),
        totalText: `${fmtNum(total, 2)} ${to}`,
      };
    }

    // RUB/BANK -> CNPAY (получаю CNY), тарификация по сумме получаемых CNY
    if (asRUB(from) && isCNP(to)) {
      // нужно найти rubPerCny с учётом итоговой суммы CNY.
      // итеративно: сначала грубо оценим cny, затем уточним тариф.
      let rubPerCny = rubPerCnyByTier(1000); // старт с 1000
      let cny = a / rubPerCny;
      for (let i=0;i<4;i++){
        rubPerCny = rubPerCnyByTier(cny);
        cny = a / rubPerCny;
      }
      rate = rubPerCny; // RUB за 1 CNY
      total = cny;
      return {
        rate, total,
        rateText: rateText(from, 'CNY', rate),
        totalText: `${fmtNum(total, 2)} CNY`,
      };
    }

    // USD -> RUB 79.50
    if (from === 'USD' && asRUB(to)) {
      // rate = USD per 1 RUB
      rate = 1 / SPOT.RUB_per_USD_cash_buy;
      total = a / rate; // сколько RUB получу = a * 79.5
      return {
        rate, total,
        rateText: rateText('USD', to, rate),
        totalText: `${fmtNum(total, 0)} ${to}`,
      };
    }

    // USDT -> RUB/Банки 79.50
    if (from === 'USDT' && asRUB(to)) {
      rate = 1 / SPOT.RUB_per_USDT_cash_buy; // USDT per 1 RUB
      total = a / rate;
      return {
        rate, total,
        rateText: rateText('USDT', to, rate),
        totalText: `${fmtNum(total, 0)} ${to}`,
      };
    }

    // USDT -> CNPAY — тариф CNY за 1 USDT
    if (from === 'USDT' && isCNP(to)) {
      const cnyPerUsdt = cnyPerUsdtByTier(a); // CNY за 1 USDT
      rate = 1 / cnyPerUsdt; // USDT per 1 CNY
      total = a / rate;      // = a * cnyPerUsdt
      return {
        rate, total,
        rateText: rateText('USDT', 'CNY', rate),
        totalText: `${fmtNum(total, 2)} CNY`,
      };
    }

    // RUB/BANK -> BTC/ETH
    if (asRUB(from) && to === 'BTC') {
      rate = SPOT.RUB_per_BTC;      // RUB per 1 BTC
      total = a / rate;
      return {
        rate, total,
        rateText: rateText(from, 'BTC', rate),
        totalText: `${fmtNum(total, 8)} BTC`,
      };
    }
    if (asRUB(from) && to === 'ETH') {
      rate = SPOT.RUB_per_ETH;      // RUB per 1 ETH
      total = a / rate;
      return {
        rate, total,
        rateText: rateText(from, 'ETH', rate),
        totalText: `${fmtNum(total, 6)} ETH`,
      };
    }

    // USD/USDT -> BTC/ETH
    if ((from === 'USD' || from === 'USDT') && to === 'BTC') {
      rate = SPOT.USD_per_BTC;      // USD per 1 BTC
      total = a / rate;
      return {
        rate, total,
        rateText: rateText(from, 'BTC', rate),
        totalText: `${fmtNum(total, 8)} BTC`,
      };
    }
    if ((from === 'USD' || from === 'USDT') && to === 'ETH') {
      rate = SPOT.USD_per_ETH;      // USD per 1 ETH
      total = a / rate;
      return {
        rate, total,
        rateText: rateText(from, 'ETH', rate),
        totalText: `${fmtNum(total, 6)} ETH`,
      };
    }

    // ====== ПРОСТЫЕ ФОЛБЭКИ, чтобы ничего не оставалось пустым ======

    // RUB/BANK <-> банки 1:1
    if (asRUB(from) && asRUB(to)) {
      // рубль на рубль не меняем: просто нулим
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    // USD <-> USDT (почти 1:1 для расчёта)
    if ((from === 'USD' && to === 'USDT') || (from === 'USDT' && to === 'USD')) {
      rate = 1; total = a; // FROM per 1 TO = 1, получаешь ту же цифру
      return {
        rate, total,
        rateText: rateText(from, to, rate),
        totalText: `${fmtNum(total, 2)} ${to}`,
      };
    }

    // Любая валюта -> USDT -> CNPAY (косвенно): оценим через USDT~USD
    if (!rate && isCNP(to)) {
      // через USDT: сначала прикинем, сколько выйдет USDT из FROM,
      // затем применим cnyPerUsdtByTier по количеству USDT (fromAmountInterm).
      // Простейшие мосты:
      let usdtInterm = null;

      if (from === 'USD') usdtInterm = a;                 // 1:1
      else if (asRUB(from)) {                             // RUB -> USDT по базовой + наценка
        const usdtEst = a / SPOT.RUB_per_USD_base_cash;
        const m = usdMarkupPerc(usdtEst);
        const rubPerUsdt = SPOT.RUB_per_USD_base_cash * (1 + m);
        usdtInterm = a / rubPerUsdt;
      } else if (from === 'BTC') {
        // BTC -> USD затем -> USDT
        const usd = a * SPOT.USD_per_BTC; // приблизительно
        usdtInterm = usd; // 1:1
      } else if (from === 'ETH') {
        const usd = a * SPOT.USD_per_ETH;
        usdtInterm = usd;
      }

      if (usdtInterm != null && usdtInterm > 0) {
        const cnyPerUsdt = cnyPerUsdtByTier(usdtInterm);
        rate = 1 / cnyPerUsdt; // FROM per 1 CNY — условный через USDT, для текста покажем FROM/CNY
        // реальный total в CNY: через usdtInterm
        const cnyTotal = usdtInterm * cnyPerUsdt;
        return {
          rate, total: cnyTotal,
          rateText: rateText(from, 'CNY', rate),
          totalText: `${fmtNum(cnyTotal, 2)} CNY`,
        };
      }
    }

    // Ничего не подошло
    return { rate:null, total:null, rateText:'—', totalText:'—' };
  }

  // ---- Публикуем API ----
  function currencies(kind, city, side){
    city = city || 'moscow';
    side = side || 'from';
    kind = kind || 'cash';

    if (side === 'from') {
      const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
      const lst = (MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : [];
      // гарантированно удаляем CNY из отдаю
      return mapCodes(lst.filter(x => x !== 'CNY'));
    } else {
      let key = 'cash_to';
      if (kind === 'bank')   key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay')  key = 'cnpay_to';
      const lst = (MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : [];
      // в Москве CNY скрыт, в гуанчжоу доступен (матрица уже учитывает)
      return mapCodes(lst);
    }
  }

  window.PRICING = { currencies, quote };
})();
