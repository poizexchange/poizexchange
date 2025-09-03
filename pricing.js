// pricing.js v44 — курс «FROM per 1 TO», матрица доступности, тарифы
(function () {
  const ICON = (name) => `./icons/${name}.svg`;
  const FALLBACK_ICON = ICON('bank');

  const C = {
    RUB:{code:'RUB',nameRu:'Рубль',icon:ICON('rub')},
    USD:{code:'USD',nameRu:'Доллар',icon:ICON('usd')},
    CNY:{code:'CNY',nameRu:'Юань',icon:ICON('cny')},

    SBP:{code:'SBP',nameRu:'СБП',icon:ICON('sbp')},
    SBER:{code:'SBER',nameRu:'Сбер',icon:ICON('sber')},
    TCS:{code:'TCS',nameRu:'Т-Банк',icon:ICON('tbank')},
    ALFA:{code:'ALFA',nameRu:'Альфа-Банк',icon:ICON('alfa')},
    VTB:{code:'VTB',nameRu:'ВТБ',icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',nameRu:'Райфф',icon:ICON('raif')},
    OZON:{code:'OZON',nameRu:'Озон',icon:ICON('ozon')},
    OTP:{code:'OTP',nameRu:'ОТП',icon:ICON('bank')},

    USDT:{code:'USDT',nameRu:'USDT',icon:ICON('usdt')},
    BTC:{code:'BTC',nameRu:'BTC',icon:ICON('btc')},
    ETH:{code:'ETH',nameRu:'ETH',icon:ICON('eth')},
    SOL:{code:'SOL',nameRu:'SOL',icon:ICON('sol')},
    XMR:{code:'XMR',nameRu:'XMR',icon:ICON('xmr')},
    XRP:{code:'XRP',nameRu:'XRP',icon:ICON('xrp')},
    LTC:{code:'LTC',nameRu:'LTC',icon:ICON('ltc')},
    TON:{code:'TON',nameRu:'TON',icon:ICON('ton')},

    ALIPAY:{code:'ALIPAY',nameRu:'Alipay',icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',nameRu:'WeChat',icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',icon:ICON('bankcn')},
  };

  const BANKS = ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'];
  const CRYPTO= ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'];
  const CNPAY = ['ALIPAY','WECHAT','CN_CARD'];

  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes   = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  // Матрица доступности (отдавать CNY запрещено)
  const MATRIX = {
    cash: { moscow:['RUB','USD'], guangzhou:['RUB','USD'] },
    bank: { moscow:BANKS, guangzhou:BANKS },
    crypto:{ moscow:CRYPTO, guangzhou:CRYPTO },

    cash_to: { moscow:['RUB','USD'], guangzhou:['RUB','USD','CNY'] },
    bank_to: { moscow:BANKS, guangzhou:BANKS },
    crypto_to:{ moscow:CRYPTO, guangzhou:CRYPTO },
    cnpay_to: { moscow:CNPAY, guangzhou:CNPAY }
  };

  // Базовые споты
  const SPOT = {
    RUB_per_USD_base_cash: 81.40,
    RUB_per_USD_cash_buy: 79.50,
    RUB_per_USDT_cash_buy: 79.50,
    RUB_per_BTC: 9300000,
    RUB_per_ETH: 399000,
    USD_per_BTC: 113000,
    USD_per_ETH: 4900,
  };

  // Лестницы
  function usdMarkupPerc(usdAmount){
    if (usdAmount >= 10000) return 0.0070;
    if (usdAmount >= 6000)  return 0.0095;
    if (usdAmount >= 3000)  return 0.0125;
    if (usdAmount >= 1500)  return 0.0170;
    if (usdAmount >= 700)   return 0.0200;
    return 0.0250;
  }
  function rubPerCnyByTier(cnyAmount){
    if (cnyAmount >= 70000) return 11.75;
    if (cnyAmount >= 30000) return 11.80;
    if (cnyAmount >= 15000) return 11.85;
    if (cnyAmount >= 3000)  return 11.90;
    if (cnyAmount >= 1000)  return 11.95;
    if (cnyAmount >= 500)   return 12.90;
    return 12.90;
  }
  function cnyPerUsdtByTier(usdtAmount){
    if (usdtAmount >= 10000) return 7.07;
    if (usdtAmount >= 6000)  return 7.00;
    if (usdtAmount >= 3000)  return 6.95;
    return 6.90;
  }

  const asRUB = (code) => (code === 'RUB' || BANKS.includes(code));
  const isCNP = (code) => CNPAY.includes(code);

  const fmtNum = (n, d=2) => (n == null || isNaN(n)) ? '—' :
    Number(n).toLocaleString('ru-RU',{ maximumFractionDigits:d });
  function rateText(from, to, rate){
    const decimals = rate < 1 ? 6 : 4;
    return `${fmtNum(rate, decimals)} ${from} за 1 ${to}`;
  }

  // Котировщик: rate = FROM per 1 TO; total = сколько ПОЛУЧУ
  function quote({ from, to, amount }) {
    from = (from || '').toUpperCase();
    to   = (to   || '').toUpperCase();
    const a = Number(amount || 0);
    if (!from || !to || !a || a <= 0) {
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }
    if (from === 'CNY') return { rate:null, total:null, rateText:'—', totalText:'—' };

    let rate = null, total = null;

    // RUB/BANK -> USD
    if (asRUB(from) && to === 'USD') {
      const usdEst = a / SPOT.RUB_per_USD_base_cash;
      const m = usdMarkupPerc(usdEst);
      const rubPerUsd = SPOT.RUB_per_USD_base_cash * (1 + m);
      rate = rubPerUsd; total = a / rate;
      return { rate,total, rateText:rateText(from,to,rate), totalText:`${fmtNum(total,2)} USD` };
    }
    // RUB/BANK -> USDT
    if (asRUB(from) && to === 'USDT') {
      const usdtEst = a / SPOT.RUB_per_USD_base_cash;
      const m = usdMarkupPerc(usdtEst);
      const rubPerUsdt = SPOT.RUB_per_USD_base_cash * (1 + m);
      rate = rubPerUsdt; total = a / rate;
      return { rate,total, rateText:rateText(from,to,rate), totalText:`${fmtNum(total,2)} USDT` };
    }
    // RUB/BANK -> CNPAY
    if (asRUB(from) && isCNP(to)) {
      let rubPerCny = rubPerCnyByTier(1000);
      let cny = a / rubPerCny;
      for (let i=0;i<4;i++){ rubPerCny = rubPerCnyByTier(cny); cny = a / rubPerCny; }
      rate = rubPerCny; total = cny;
      return { rate,total, rateText:rateText(from,'CNY',rate), totalText:`${fmtNum(total,2)} CNY` };
    }
    // USD -> RUB
    if (from === 'USD' && asRUB(to)) {
      rate = 1 / SPOT.RUB_per_USD_cash_buy; total = a / rate;
      return { rate,total, rateText:rateText('USD',to,rate), totalText:`${fmtNum(total,0)} ${to}` };
    }
    // USDT -> RUB
    if (from === 'USDT' && asRUB(to)) {
      rate = 1 / SPOT.RUB_per_USDT_cash_buy; total = a / rate;
      return { rate,total, rateText:rateText('USDT',to,rate), totalText:`${fmtNum(total,0)} ${to}` };
    }
    // USDT -> CNPAY
    if (from === 'USDT' && isCNP(to)) {
      const cnyPerUsdt = cnyPerUsdtByTier(a);
      rate = 1 / cnyPerUsdt; total = a / rate;
      return { rate,total, rateText:rateText('USDT','CNY',rate), totalText:`${fmtNum(total,2)} CNY` };
    }
    // RUB/BANK -> BTC/ETH
    if (asRUB(from) && to === 'BTC') {
      rate = SPOT.RUB_per_BTC; total = a / rate;
      return { rate,total, rateText:rateText(from,'BTC',rate), totalText:`${fmtNum(total,8)} BTC` };
    }
    if (asRUB(from) && to === 'ETH') {
      rate = SPOT.RUB_per_ETH; total = a / rate;
      return { rate,total, rateText:rateText(from,'ETH',rate), totalText:`${fmtNum(total,6)} ETH` };
    }
    // USD/USDT -> BTC/ETH
    if ((from === 'USD' || from === 'USDT') && to === 'BTC') {
      rate = SPOT.USD_per_BTC; total = a / rate;
      return { rate,total, rateText:rateText(from,'BTC',rate), totalText:`${fmtNum(total,8)} BTC` };
    }
    if ((from === 'USD' || from === 'USDT') && to === 'ETH') {
      rate = SPOT.USD_per_ETH; total = a / rate;
      return { rate,total, rateText:rateText(from,'ETH',rate), totalText:`${fmtNum(total,6)} ETH` };
    }

    // Фолбэки
    if (asRUB(from) && asRUB(to)) return { rate:null, total:null, rateText:'—', totalText:'—' };
    if ((from === 'USD' && to === 'USDT') || (from === 'USDT' && to === 'USD')) {
      const rate = 1, total = a; return { rate,total, rateText:rateText(from,to,rate), totalText:`${fmtNum(total,2)} ${to}` };
    }
    if (isCNP(to)) {
      let usdtInterm = null;
      if (from === 'USD') usdtInterm = a;
      else if (asRUB(from)) {
        const usdtEst = a / SPOT.RUB_per_USD_base_cash;
        const m = usdMarkupPerc(usdtEst);
        const rubPerUsdt = SPOT.RUB_per_USD_base_cash * (1 + m);
        usdtInterm = a / rubPerUsdt;
      } else if (from === 'BTC') {
        const usd = a * SPOT.USD_per_BTC; usdtInterm = usd;
      } else if (from === 'ETH') {
        const usd = a * SPOT.USD_per_ETH; usdtInterm = usd;
      }
      if (usdtInterm != null && usdtInterm > 0) {
        const cnyPerUsdt = cnyPerUsdtByTier(usdtInterm);
        const rate = 1 / cnyPerUsdt;
        const cnyTotal = usdtInterm * cnyPerUsdt;
        return { rate,total:cnyTotal, rateText:rateText(from,'CNY',rate), totalText:`${fmtNum(cnyTotal,2)} CNY` };
      }
    }

    return { rate:null, total:null, rateText:'—', totalText:'—' };
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
      if (kind === 'bank') key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay') key = 'cnpay_to';
      const lst = (MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : [];
      return mapCodes(lst);
    }
  }

  window.PRICING = { currencies, quote };
})();
