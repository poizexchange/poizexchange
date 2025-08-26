// pricing.js v61 — матрица валют, иконки, новые курсы и наценки
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  // ---- справочник "плиток" ----
  const C = {
    // Наличные
    RUB:   { code:'RUB',   nameRu:'Рубль',      icon:ICON('rub') },
    USD:   { code:'USD',   nameRu:'Доллар',     icon:ICON('usd') },
    CNY:   { code:'CNY',   nameRu:'Юань',       icon:ICON('cny') },

    // Банки РФ
    SBP:   { code:'SBP',   nameRu:'СБП',        icon:ICON('sbp') },
    SBER:  { code:'SBER',  nameRu:'Сбер',       icon:ICON('sber') },
    TCS:   { code:'TCS',   nameRu:'Т-Банк',     icon:ICON('tbank') },
    ALFA:  { code:'ALFA',  nameRu:'Альфа-Банк', icon:ICON('alfa') },
    VTB:   { code:'VTB',   nameRu:'ВТБ',        icon:ICON('vtb') },
    RAIFF: { code:'RAIFF', nameRu:'Райфф',      icon:ICON('raif') },
    OZON:  { code:'OZON',  nameRu:'Озон',       icon:ICON('ozon') },
    OTP:   { code:'OTP',   nameRu:'ОТП',        icon:ICON('bank') },

    // Крипта
    USDT:  { code:'USDT',  nameRu:'USDT',       icon:ICON('usdt') },
    BTC:   { code:'BTC',   nameRu:'BTC',        icon:ICON('btc') },
    ETH:   { code:'ETH',   nameRu:'ETH',        icon:ICON('eth') },
    SOL:   { code:'SOL',   nameRu:'SOL',        icon:ICON('sol')  || ICON('bank') },
    XMR:   { code:'XMR',   nameRu:'XMR',        icon:ICON('xmr') },
    XRP:   { code:'XRP',   nameRu:'XRP',        icon:ICON('xrp')  || ICON('bank') },
    LTC:   { code:'LTC',   nameRu:'LTC',        icon:ICON('ltc')  || ICON('bank') },
    TON:   { code:'TON',   nameRu:'TON',        icon:ICON('ton')  || ICON('bank') },

    // Китайские сервисы (получаю)
    ALIPAY:{ code:'ALIPAY', nameRu:'Alipay',         icon:ICON('alipay') },
    WECHAT:{ code:'WECHAT', nameRu:'WeChat',         icon:ICON('wechat') },
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',    icon:ICON('bankcn') },
  };

  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  // ---- доступность по способам и городам ----
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:    ['RUB','USD'],       // наличные CNY "отдаю" запрещены
      guangzhou: ['RUB','USD'],       // то же
    },
    bank: {
      moscow:    ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou: ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
    },
    crypto: {
      moscow:    ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou: ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
    },

    // ПОЛУЧАЮ
    cash_to: {
      moscow:    ['RUB','USD'],       // наличные CNY можно получить только в Гуанчжоу
      guangzhou: ['RUB','USD','CNY'],
    },
    bank_to: {
      moscow:    ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou: ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
    },
    crypto_to: {
      moscow:    ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou: ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
    },
    cnpay_to: {
      moscow:    ['ALIPAY','WECHAT','CN_CARD'],
      guangzhou: ['ALIPAY','WECHAT','CN_CARD'],
    },
  };

  // ---- базовые курсы (без наценок/ступеней) ----
  const BASE = {
    // кэш USD↔RUB
    USD_RUB_CASH_BUY:  81.40, // руб за 1 USD (когда клиент ПОКУПАЕТ usd за руб) — база до наценки
    USD_RUB_CASH_SELL: 79.50, // руб за 1 USD (когда клиент СДАЁТ usd за руб)

    // USDT↔RUB для наличных и банков
    USDT_RUB: 79.50,          // руб за 1 USDT (когда клиент отдаёт usdt)

    // BTC/ETH справочные
    BTC_RUB: 9300000,         // руб за 1 BTC
    BTC_USD: 113000,          // usd/usdt за 1 BTC
    ETH_RUB: 399000,          // руб за 1 ETH
    ETH_USD: 4900,            // usd/usdt за 1 ETH

    // CNY — по умолчанию, если не попали в ступени (используем среднюю)
    RUB_PER_CNY_DEFAULT: 11.95,
  };

  // ---- наценки/ступени ----

  // RUB(cash) -> USD(cash): tiers по ОБЪЁМУ В USD
  function usdMarkupByUsdAmount(usd){
    if (usd >= 10000) return 0.0070;
    if (usd >=  6000) return 0.0095;
    if (usd >=  3000) return 0.0125;
    if (usd >=  1500) return 0.0170;
    if (usd >=   700) return 0.0200;
    return 0.0250;
  }

  // RUB(cash) -> USDT: те же ступени, но по USDT
  function usdtMarkupByUsdtAmount(usdt){
    if (usdt >= 10000) return 0.0070;
    if (usdt >=  6000) return 0.0095;
    if (usdt >=  3000) return 0.0125;
    if (usdt >=  1500) return 0.0170;
    if (usdt >=   700) return 0.0200;
    return 0.0250;
  }

  // RUB(cash) -> CNPAY (CNY): ступени по объёму в CNY
  function rubPerCnyByCnyAmount(cny){
    if (cny >= 70000) return 11.75;
    if (cny >= 30000) return 11.80;
    if (cny >= 15000) return 11.85;
    if (cny >=  3000) return 11.90;
    if (cny >=  1000) return 11.95;
    if (cny >=   500) return 12.90; // оговорённый «плохой» курс для 500–999
    // меньше 500 — используем базу
    return BASE.RUB_PER_CNY_DEFAULT;
    }

  // USDT -> CNPAY (CNY): ступени по USDT
  function cnyPerUsdtByUsdtAmount(usdt){
    if (usdt >  10000) return 7.07;
    if (usdt >   6000) return 7.03;
    if (usdt >   3000) return 7.00;
    if (usdt >   1000) return 6.95;
    return 6.90;
  }

  // ---- утилиты форматирования ----
  const fmtNum = (n, d=2)=> (n==null||isNaN(n)) ? '—' :
    Number(n).toLocaleString('ru-RU', { maximumFractionDigits:d });

  // округления
  function round2(x){ return Math.round(x * 100) / 100; }
  function round4(x){ return Math.round(x * 10000) / 10000; }

  // ---- публичное API ----
  function currencies(kind, city, side){
    if (side === 'from') {
      const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
      return mapCodes((MATRIX[key][city]) || []);
    } else {
      let key = 'cash_to';
      if (kind === 'bank')   key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay')  key = 'cnpay_to';
      return mapCodes((MATRIX[key][city]) || []);
    }
  }

  // расчёт котировки с учётом ступеней и направлений
  function quote({from, to, amount}){
    const a = Number(amount || 0);
    if (!from || !to || !a || a <= 0) {
      return { rate:null, total:null, rateText:'—', totalText:'—' };
    }

    // 1) RUB(cash) -> USD(cash): база 81.40 + наценка (в руб/за $), мы считаем USD за 1 RUB
    if (from==='RUB' && to==='USD'){
      // эстимируем объём в USD без наценки, чтобы попасть в правильный порог
      const usd_est = a / BASE.USD_RUB_CASH_BUY;
      const m = usdMarkupByUsdAmount(usd_est);
      const rub_per_usd = BASE.USD_RUB_CASH_BUY * (1 + m);
      const rate = 1 / rub_per_usd;               // USD за 1 RUB
      const total = round2(a * rate);             // USD
      const rateTxt = `${fmtNum(round4(rate),4)} USD за 1 RUB`;
      const totalTxt = `${fmtNum(total,2)} USD`;
      return { rate, total, rateText:rateTxt, totalText:totalTxt };
    }

    // 2) USD(cash) -> RUB(cash): фикс 79.50 руб/$
    if (from==='USD' && to==='RUB'){
      const rate = BASE.USD_RUB_CASH_SELL;        // RUB за 1 USD
      const total = round2(a * rate);
      return { rate, total, rateText:`${fmtNum(rate,4)} RUB за 1 USD`, totalText:`${fmtNum(total,2)} RUB` };
    }

    // 3) RUB(cash) -> USDT: база 79.50 + ступенчатая наценка (в руб/за 1 USDT)
    if (from==='RUB' && to==='USDT'){
      const usdt_est = a / BASE.USDT_RUB;
      const m = usdtMarkupByUsdtAmount(usdt_est);
      const rub_per_usdt = BASE.USDT_RUB * (1 + m);
      const rate = 1 / rub_per_usdt;              // USDT за 1 RUB
      const total = round6(a * rate);
      return { rate, total,
        rateText:`${fmtNum(round4(rate),4)} USDT за 1 RUB`,
        totalText:`${fmtNum(total,2)} USDT`
      };
    }

    // 4) USDT -> RUB (нал/банк): фикс 79.50 руб/USDT
    if (from==='USDT' && (to==='RUB' || ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'].includes(to))){
      const rate = BASE.USDT_RUB;                 // RUB за 1 USDT
      const total = round2(a * rate);
      return { rate, total, rateText:`${fmtNum(rate,4)} RUB за 1 USDT`, totalText:`${fmtNum(total,2)} RUB` };
    }

    // 5) RUB(cash) -> CNPAY (CNY): ступени в руб/за CNY
    if (from==='RUB' && ['ALIPAY','WECHAT','CN_CARD','CNY'].includes(to)){
      // оценим объём в CNY по базовой ставке, чтобы выбрать ступень
      const cny_est = a / BASE.RUB_PER_CNY_DEFAULT;
      const rub_per_cny = rubPerCnyByCnyAmount(cny_est);
      const rate = 1 / rub_per_cny;               // CNY за 1 RUB
      const total = round2(a * rate);             // CNY
      return { rate, total, rateText:`${fmtNum(round4(rate),4)} CNY за 1 RUB`, totalText:`${fmtNum(total,2)} CNY` };
    }

    // 6) USDT -> CNPAY (CNY): ступени в CNY за 1 USDT
    if (from==='USDT' && ['ALIPAY','WECHAT','CN_CARD','CNY'].includes(to)){
      const cny_per_usdt = cnyPerUsdtByUsdtAmount(a);
      const rate = cny_per_usdt;                  // CNY за 1 USDT
      const total = round2(a * rate);
      return { rate, total, rateText:`${fmtNum(rate,4)} CNY за 1 USDT`, totalText:`${fmtNum(total,2)} CNY` };
    }

    // 7) BTC/ETH справочные пары
    if (from==='RUB' && to==='BTC'){ const rate = 1/BASE.BTC_RUB; const total = round8(a*rate);
      return { rate, total, rateText:`${fmtNum(round8(rate),8)} BTC за 1 RUB`, totalText:`${fmtNum(total,8)} BTC` }; }
    if (['USD','USDT'].includes(from) && to==='BTC'){ const rate = 1/BASE.BTC_USD; const total = round8(a*rate);
      return { rate, total, rateText:`${fmtNum(round8(rate),8)} BTC за 1 ${from}`, totalText:`${fmtNum(total,8)} BTC` }; }
    if (from==='RUB' && to==='ETH'){ const rate = 1/BASE.ETH_RUB; const total = round8(a*rate);
      return { rate, total, rateText:`${fmtNum(round8(rate),8)} ETH за 1 RUB`, totalText:`${fmtNum(total,8)} ETH` }; }
    if (['USD','USDT'].includes(from) && to==='ETH'){ const rate = 1/BASE.ETH_USD; const total = round8(a*rate);
      return { rate, total, rateText:`${fmtNum(round8(rate),8)} ETH за 1 ${from}`, totalText:`${fmtNum(total,8)} ETH` }; }

    // 8) Простые мосты 1:1 внутри RUB/банков (чтобы не было «пустых»)
    const RUB_BANKS = ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'];
    if (from==='RUB' && RUB_BANKS.includes(to))  { const rate=1; const total=a; return {rate,total,rateText:'1.0000 '+to+' за 1 RUB', totalText:`${fmtNum(total,2)} ${to}`}; }
    if (RUB_BANKS.includes(from) && to==='RUB')  { const rate=1; const total=a; return {rate,total,rateText:'1.0000 RUB за 1 '+from, totalText:`${fmtNum(total,2)} RUB`}; }

    // 9) Попытка через RUB мост (from->RUB, RUB->to), если есть
    const r1 = baseRate(`${from}->RUB`);
    const r2 = baseRate(`RUB->${to}`);
    if (r1 && r2){
      const rate = r1 * r2;
      const total = round2(a * rate);
      return { rate, total, rateText:`${fmtNum(round4(rate),4)} ${to} за 1 ${from}`, totalText:`${fmtNum(total,2)} ${to}` };
    }

    // 10) Попытка через USDT мост
    const u1 = baseRate(`${from}->USDT`);
    const u2 = baseRate(`USDT->${to}`);
    if (u1 && u2){
      const rate = u1 * u2;
      const total = round2(a * rate);
      return { rate, total, rateText:`${fmtNum(round4(rate),4)} ${to} за 1 ${from}`, totalText:`${fmtNum(total,2)} ${to}` };
    }

    // не знаем как — вернём пусто
    return { rate:null, total:null, rateText:'—', totalText:'—' };
  }

  // Базовые (простые) константные пары — для мостов
  function baseRate(pair){
    switch (pair) {
      case 'USD->RUB':   return BASE.USD_RUB_CASH_SELL;      // сдаёт USD — получает RUB
      case 'RUB->USD':   return 1 / (BASE.USD_RUB_CASH_BUY * (1 + 0.02)); // грубая база с средней наценкой
      case 'USDT->RUB':  return BASE.USDT_RUB;
      case 'RUB->USDT':  return 1 / (BASE.USDT_RUB * (1 + 0.02)); // базово с небольшой наценкой
      case 'RUB->CNY':   return 1 / BASE.RUB_PER_CNY_DEFAULT;
      case 'CNY->RUB':   return BASE.RUB_PER_CNY_DEFAULT;
      default:           return null;
    }
  }

  // доп. округления
  function round6(x){ return Math.round(x * 1e6) / 1e6; }
  function round8(x){ return Math.round(x * 1e8) / 1e8; }

  // экспорт
  window.PRICING = { currencies, quote };
})();

