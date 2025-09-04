// pricing.js v61 — пара "FROM/TO" (FROM per 1 TO), runtime override, обратные пары, quoteReverse
(function () {
  const ICON = (name) => `./icons/${name}.svg`;
  const FALLBACK_ICON = ICON('bank');

  // ---- Справочник валют/сервисов ----
  const C = {
    RUB:   { code:'RUB',   nameRu:'Рубль',       icon:ICON('rub') },
    USD:   { code:'USD',   nameRu:'Доллар',      icon:ICON('usd') },
    CNY:   { code:'CNY',   nameRu:'Юань',        icon:ICON('cny') },

    SBP:   { code:'SBP',   nameRu:'СБП',         icon:ICON('sbp') },
    SBER:  { code:'SBER',  nameRu:'Сбер',        icon:ICON('sber') },
    TCS:   { code:'TCS',   nameRu:'Т-Банк',      icon:ICON('tbank') },
    ALFA:  { code:'ALFA',  nameRu:'Альфа-Банк',  icon:ICON('alfa') },
    VTB:   { code:'VTB',   nameRu:'ВТБ',         icon:ICON('vtb') },
    RAIFF: { code:'RAIFF', nameRu:'Райфф',       icon:ICON('raif') },
    OZON:  { code:'OZON',  nameRu:'Озон',        icon:ICON('ozon') },
    OTP:   { code:'OTP',   nameRu:'ОТП',         icon:ICON('bank') },

    USDT:  { code:'USDT',  nameRu:'USDT',        icon:ICON('usdt') },
    BTC:   { code:'BTC',   nameRu:'BTC',         icon:ICON('btc') },
    ETH:   { code:'ETH',   nameRu:'ETH',         icon:ICON('eth') },
    SOL:   { code:'SOL',   nameRu:'SOL',         icon:ICON('sol') },
    XMR:   { code:'XMR',   nameRu:'XMR',         icon:ICON('xmr') },
    XRP:   { code:'XRP',   nameRu:'XRP',         icon:ICON('xrp') },
    LTC:   { code:'LTC',   nameRu:'LTC',         icon:ICON('ltc') },
    TON:   { code:'TON',   nameRu:'TON',         icon:ICON('ton') },

    ALIPAY:{ code:'ALIPAY', nameRu:'Alipay',     icon:ICON('alipay') },
    WECHAT:{ code:'WECHAT', nameRu:'WeChat',     icon:ICON('wechat') },
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',icon:ICON('bankcn') },
  };

  const BANKS = ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'];
  const CRYPTO= ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'];
  const CNPAY = ['ALIPAY','WECHAT','CN_CARD'];

  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes   = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  // Матрица доступности
  const MATRIX = {
    cash: { moscow:['RUB','USD'], guangzhou:['RUB','USD'] },
    bank: { moscow:BANKS, guangzhou:BANKS },
    crypto: { moscow:CRYPTO, guangzhou:CRYPTO },

    cash_to: { moscow:['RUB','USD'], guangzhou:['RUB','USD','CNY'] },
    bank_to: { moscow:BANKS, guangzhou:BANKS },
    crypto_to: { moscow:CRYPTO, guangzhou:CRYPTO },
    cnpay_to: { moscow:CNPAY, guangzhou:CNPAY }
  };

  // ======= БАЗОВЫЕ КУРСЫ (дефолты), формат PAR: "FROM/TO": rate (FROM per 1 TO) =======
  const DEFAULT_PAIRS = {
    // Рубли к USD/USDT/CNY (примерные дефолты)
    'RUB/USD': 81.40,
    'RUB/USDT': 81.40,

    // USDT/ALIPAY через «CNY за 1 USDT» ~6.9 => USDT/CNY ~ 1/6.9 = 0.1449
    'USDT/CNY': 1/6.90,

    // RUB/BTC и RUB/ETH как «RUB per 1»
    'RUB/BTC': 9300000,
    'RUB/ETH': 399000,

    // USD/BTC, USD/ETH
    'USD/BTC': 113000,
    'USD/ETH': 4900,

    // Покупка RUB за USD/USDT (RUB per 1 USD/USDT) => обратные пары нам не обязательно прописывать — возьмём инверсию при необходимости
    // 'USD/RUB': 1/79.50,
    // 'USDT/RUB': 1/79.50,
  };

  // ======= RUNTIME override из API (/rates) =======
  // Формат: { "RUB/USD": 81.4, "USD/CNY": 7.30, ... }
  const RUNTIME_PAIRS = {};

  function setPair(from, to, rate){
    if (!from || !to) return;
    const key = `${from.toUpperCase()}/${to.toUpperCase()}`;
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
      RUNTIME_PAIRS[key] = rate;
    }
  }
  function overrideRates(map){
    if (!map || typeof map !== 'object') return;
    for (const k of Object.keys(map)) {
      const v = map[k];
      if (typeof v === 'number' && isFinite(v) && v > 0) {
        RUNTIME_PAIRS[k.toUpperCase()] = v;
      }
    }
  }
  function getPair(from, to){
    const k = `${from}/${to}`;
    if (k in RUNTIME_PAIRS) return RUNTIME_PAIRS[k];
    if (k in DEFAULT_PAIRS) return DEFAULT_PAIRS[k];
    return null;
  }
  function pairOrInverse(from, to){
    const p = getPair(from, to);
    if (p) return p;
    const inv = getPair(to, from);
    if (inv) return 1 / inv;
    return null;
  }

  // Вспомогательные
  const asRUB = (code) => (code === 'RUB' || BANKS.includes(code));
  const isCNP = (code) => CNPAY.includes(code);

  const fmtNum = (n, d=2) => (n == null || isNaN(n)) ? '—' :
    Number(n).toLocaleString('ru-RU',{ maximumFractionDigits:d });

  function rateText(from, to, rate){
    const decimals = rate < 1 ? 6 : 4;
    return `${fmtNum(rate, decimals)} ${from} за 1 ${to}`;
    // from per 1 to
  }

  // ======= КОТИРОВЩИК (прямой) =======
  function quote({ from, to, amount }) {
    from = (from || '').toUpperCase();
    to   = (to   || '').toUpperCase();
    const a = Number(amount || 0);
    if (!from || !to || !a || a <= 0) {
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }
    if (from === 'CNY') { // бизнес-правило — отдавать CNY нельзя
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    // Сначала пробуем явную пару/обратную:
    let rate = pairOrInverse(from, to); // FROM per 1 TO
    if (rate) {
      const total = a / rate;
      const decimalsByTo =
        (to === 'BTC') ? 8 :
        (to === 'ETH') ? 6 :
        (to === 'RUB' || to === 'USD' || to === 'USDT' || to === 'CNY') ? 2 : 2;
      return {
        rate, total,
        rateText: rateText(from, to, rate),
        totalText: `${fmtNum(total, decimalsByTo)} ${to}`,
      };
    }

    // Специальные мосты, если пара не задана:
    // (пример: RUB -> CNPAY через CNY или USDT -> CNY)
    if (asRUB(from) && isCNP(to)) {
      // через CNY: ищем RUB/CNY; если нет — RUB/USDT и USDT/CNY
      let rubPerCny = pairOrInverse('RUB', 'CNY');
      if (!rubPerCny) {
        const rubPerUsdt = pairOrInverse('RUB','USDT');
        const usdtPerCny = pairOrInverse('USDT','CNY'); // USDT per 1 CNY
        if (rubPerUsdt && usdtPerCny) rubPerCny = rubPerUsdt * usdtPerCny;
      }
      if (rubPerCny) {
        const total = a / rubPerCny; // CNY
        return {
          rate: rubPerCny,
          total,
          rateText: rateText('RUB','CNY',rubPerCny),
          totalText: `${fmtNum(total,2)} CNY`,
        };
      }
    }

    if (from === 'USDT' && isCNP(to)) {
      const usdtPerCny = pairOrInverse('USDT','CNY'); // USDT per 1 CNY
      if (usdtPerCny) {
        const cny = a / (1/usdtPerCny); // a * (CNY per 1 USDT)
        return {
          rate: usdtPerCny,
          total: cny,
          rateText: rateText('USDT','CNY',usdtPerCny),
          totalText: `${fmtNum(cny,2)} CNY`,
        };
      }
    }

    return { rate:null, total:null, rateText:'—', totalText:'—' };
  }

  // ======= ОБРАТНЫЙ КОТИРОВЩИК: given want (TO amount) => need (FROM amount) =======
  function quoteReverse({ from, to, want }){
    from = (from || '').toUpperCase();
    to   = (to   || '').toUpperCase();
    const w = Number(want || 0);
    if (!from || !to || !w || w <= 0) return { ok:false };

    let rate = pairOrInverse(from, to); // FROM per 1 TO
    if (!rate) return { ok:false };

    const need = w * rate; // сколько FROM нужно отдать
    return { ok:true, need, rate };
  }

  function currencies(kind, city, side){
    city = city || 'moscow';
    side = side || 'from';
    kind = kind || 'cash';

    if (side === 'from') {
      const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
      const lst = (MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : [];
      return mapCodes(lst.filter(x => x !== 'CNY')); // отдавать CNY нельзя
    } else {
      let key = 'cash_to';
      if (kind === 'bank')   key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay')  key = 'cnpay_to';
      const lst = (MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : [];
      return mapCodes(lst);
    }
  }

  window.PRICING = { currencies, quote, quoteReverse, overrideRates, setPair };
})();
