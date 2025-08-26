// pricing.js v51 — курсы с порогами, совместим с прежним UI
(function () {
  // --- иконки (как раньше) ---
  const ICON = (name) => `./icons/${name}.svg`;
  const FALLBACK_ICON = ICON('bank');

  const C = {
    // Наличные
    RUB:{code:'RUB',nameRu:'Рубль', icon:ICON('rub')},
    USD:{code:'USD',nameRu:'Доллар',icon:ICON('usd')},
    CNY:{code:'CNY',nameRu:'Юань',  icon:ICON('cny')},

    // Банки РФ
    SBP:{code:'SBP',  nameRu:'СБП',        icon:ICON('sbp')},
    SBER:{code:'SBER',nameRu:'Сбер',       icon:ICON('sber')},
    TCS:{code:'TCS',  nameRu:'Т-Банк',     icon:ICON('tbank')},
    ALFA:{code:'ALFA',nameRu:'Альфа-Банк', icon:ICON('alfa')},
    VTB:{code:'VTB',  nameRu:'ВТБ',        icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',nameRu:'Райфф',    icon:ICON('raif')},
    OZON:{code:'OZON',nameRu:'Озон',       icon:ICON('ozon')},
    OTP:{code:'OTP',  nameRu:'ОТП',        icon:ICON('bank')}, // временная иконка

    // Крипто
    USDT:{code:'USDT',nameRu:'USDT',icon:ICON('usdt')},
    BTC:{code:'BTC',  nameRu:'BTC', icon:ICON('btc')},
    ETH:{code:'ETH',  nameRu:'ETH', icon:ICON('eth')},
    SOL:{code:'SOL',  nameRu:'SOL', icon:ICON('bank')},
    XMR:{code:'XMR',  nameRu:'XMR', icon:ICON('xmr')},
    XRP:{code:'XRP',  nameRu:'XRP', icon:ICON('bank')},
    LTC:{code:'LTC',  nameRu:'LTC', icon:ICON('bank')},
    TON:{code:'TON',  nameRu:'TON', icon:ICON('bank')},

    // Китайские сервисы (получение)
    ALIPAY:{code:'ALIPAY',nameRu:'Alipay',     icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',nameRu:'WeChat',     icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',icon:ICON('bankcn')}
  };

  // --- доступность (как было) ---
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:   ['RUB','USD'],          // отдавать CNY налом нельзя
      guangzhou:['RUB','USD']
    },
    bank: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
    },
    crypto: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    },

    // ПОЛУЧАЮ
    cash_to: {
      moscow:   ['RUB','USD'],          // CNY налом — только Гуанчжоу
      guangzhou:['RUB','USD','CNY']
    },
    bank_to: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
    },
    crypto_to: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    },
    cnpay_to: {
      moscow:   ['ALIPAY','WECHAT','CN_CARD'],
      guangzhou:['ALIPAY','WECHAT','CN_CARD']
    }
  };

  // --- банки считаем как рубль-нал по твоему правилу №4 ---
  const BANKS = new Set(['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']);
  const IS_CN = (x)=> x==='ALIPAY'||x==='WECHAT'||x==='CN_CARD';

  // --- базовые фикс-пункты из ТЗ ---
  const BASE_RUB_TO_USD = 81.40; // для RUB->USD и RUB->USDT с наценкой
  const USD_TO_RUB_CASH = 79.50; // USD(нал)->RUB(нал)
  const USDT_TO_RUB_ANY = 79.50; // USDT->RUB (нал/банки одинаково)

  const BTC_RUB = 9300000;
  const BTC_USD = 113000;
  const ETH_RUB = 399000;
  const ETH_USD = 4900;

  // --- утилиты округления ---
  function round(n, d){ const p = Math.pow(10, d); return Math.round(n * p)/p; }
  function fmt(n, d){ if(n==null||!isFinite(n)) return '—'; return Number(n).toLocaleString('ru-RU', {maximumFractionDigits:d}); }

  // --- наценки/пороговые функции ---
  // RUB(нал или банк) -> USD(нал) : RUB за 1 USD
  function rubToUsdRate(amountUSD){
    const p =
      (amountUSD >= 10000) ? 0.007  :
      (amountUSD >= 6000)  ? 0.0095 :
      (amountUSD >= 3000)  ? 0.0125 :
      (amountUSD >= 1500)  ? 0.017  :
      (amountUSD >= 700)   ? 0.02   : 0.025;
    return BASE_RUB_TO_USD * (1 + p);
  }

  // RUB(нал или банк) -> USDT : RUB за 1 USDT (те же проценты)
  const rubToUsdtRate = rubToUsdRate;

  // RUB(нал или банк) -> CNY/китайские сервисы : RUB за 1 CNY
  function rubToCnyRate(amountCNY){
    if (amountCNY >= 70000) return 11.75;
    if (amountCNY >= 30000) return 11.80;
    if (amountCNY >= 15000) return 11.85;
    if (amountCNY >= 3000)  return 11.90;
    if (amountCNY >= 1000)  return 11.95;
    if (amountCNY >= 500)   return 12.90; // 500–1000
    return 12.95; // <500
  }

  // USDT -> китайские сервисы : CNY за 1 USDT
  function usdtToCnyRate(amountUSDT){
    if (amountUSDT >= 10000) return 7.07;
    if (amountUSDT >= 6000)  return 7.03;
    if (amountUSDT >= 3000)  return 7.00;
    if (amountUSDT >= 1000)  return 6.95;
    return 6.90; // <1000
  }

  // --- базовые “мосты” для кросс-курсов (чтобы «не было пустых») ---
  // Для обраток берём типовой уровень, чтобы не зависеть от реального amount
  const RUB_USD_TIER = rubToUsdRate(1000);   // RUB за 1 USD
  const RUB_USDT_TIER = rubToUsdtRate(1000); // RUB за 1 USDT
  const RUB_CNY_TIER = rubToCnyRate(3000);   // RUB за 1 CNY (типовой)

  // прямой “плоский” роутер (без порогов, кроме явных)
  function directBase(from, to){
    if (from === to) return 1;

    // банки эквивалентны RUB по курсу (п.4)
    if (BANKS.has(from) && to === 'RUB') return 1;
    if (from === 'RUB' && BANKS.has(to)) return 1;
    if (BANKS.has(from) && (to==='USD'||to==='USDT'||to==='CNY')) return directBase('RUB', to);
    if ((from==='USD'||from==='USDT'||from==='CNY') && BANKS.has(to)) return directBase(from, 'RUB');

    // китайские сервисы ~ CNY
    if (IS_CN(from) && to==='CNY') return 1;
    if (from==='CNY' && IS_CN(to)) return 1;
    if (IS_CN(from)) return directBase('CNY', to);
    if (IS_CN(to))   return directBase(from, 'CNY');

    // RUB <-> USD
    if (from==='RUB' && to==='USD') return 1 / RUB_USD_TIER;
    if (from==='USD' && to==='RUB') return USD_TO_RUB_CASH;

    // RUB <-> USDT
    if (from==='RUB' && to==='USDT') return 1 / RUB_USDT_TIER;
    if (from==='USDT' && to==='RUB') return USDT_TO_RUB_ANY;

    // RUB <-> CNY
    if (from==='RUB' && to==='CNY') return 1 / RUB_CNY_TIER;
    if (from==='CNY' && to==='RUB') return RUB_CNY_TIER; // обратка симметричная

    // Крипта ↔ USD/USDT (из пунктов 8–9)
    if (from==='BTC' && (to==='USD'||to==='USDT')) return BTC_USD;
    if ((from==='USD'||from==='USDT') && to==='BTC') return 1 / BTC_USD;
    if (from==='ETH' && (to==='USD'||to==='USDT')) return ETH_USD;
    if ((from==='USD'||from==='USDT') && to==='ETH') return 1 / ETH_USD;

    if (from==='BTC' && to==='RUB') return BTC_RUB;
    if (from==='ETH' && to==='RUB') return ETH_RUB;

    return null;
  }

  // финальный расчёт курса “to за 1 from” с учётом порогов там, где надо
  function computeRate(from, to, amount){
    const a = Number(amount || 0);
    if (!from || !to || !(a > 0)) return null;

    // банки считаем как рубль (для пороговых функций тоже)
    const fromIsBank = BANKS.has(from);
    const toIsBank   = BANKS.has(to);
    const asRUB = (from === 'RUB' || fromIsBank);

    // Явные направления с порогами:
    if (asRUB && to === 'USD')  return rubToUsdRate(a);   // RUB/банки -> USD
    if (asRUB && to === 'USDT') return rubToUsdtRate(a);  // RUB/банки -> USDT
    if (asRUB && (to === 'CNY' || IS_CN(to))) return rubToCnyRate(a); // RUB/банки -> CNY/сервисы

    if (from === 'USD'  && to === 'RUB') return USD_TO_RUB_CASH;  // USD нал -> RUB нал
    if (from === 'USDT' && (to === 'RUB' || toIsBank)) return USDT_TO_RUB_ANY; // USDT -> RUB/банки
    if (from === 'USDT' && (to === 'CNY' || IS_CN(to))) return usdtToCnyRate(a); // USDT -> CNY/сервисы

    // Иначе — пробуем прямой базовый, потом через опорные узлы
    let r = directBase(from, to);
    if (r) return r;

    function via(mid){
      const r1 = directBase(from, mid);
      const r2 = directBase(mid, to);
      return (r1 && r2) ? (r1 * r2) : null;
    }
    return via('RUB') || via('USD') || via('USDT') || via('CNY');
  }

  // Публичный API для UI
  function quote({from,to,amount}){
    const rate = computeRate(from, to, amount);
    if (!rate) return { rate:null, total:null, rateText:'—', totalText:'—' };
    const r = round(rate, 4);
    const total = round((Number(amount||0) * rate), 2);
    return {
      rate: r,
      total: total,
      rateText: `${fmt(r, 4)} ${to} за 1 ${from}`,
      totalText: `${fmt(total, 2)} ${to}`
    };
  }

  const ensureIcon = (i)=>{ if(!i || !i.icon) return { ...(i||{}), icon: FALLBACK_ICON }; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  function currencies(kind, city, side){
    try{
      if (side === 'from') {
        const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
        return mapCodes((MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : []);
      } else {
        let key = 'cash_to';
        if (kind === 'bank') key = 'bank_to';
        else if (kind === 'crypto') key = 'crypto_to';
        else if (kind === 'cnpay') key = 'cnpay_to';
        return mapCodes((MATRIX[key] && MATRIX[key][city]) ? MATRIX[key][city] : []);
      }
    } catch(e){
      console.error('currencies() failed', e);
      return [];
    }
  }

  // Экспорт строго в таком виде — чтобы index.js нашёл window.PRICING
  window.PRICING = { currencies, quote };
})();


  window.PRICING = { currencies, quote };
})();
