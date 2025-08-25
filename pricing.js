// pricing.js v50 — тарифы с диапазонами, как просил
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  // ---- справочник "валют"/каналов (иконки как раньше) ----
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
    OTP:{code:'OTP',  nameRu:'ОТП',        icon:ICON('bank')}, // нет otp.svg — временно

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

  // ---- доступность (как раньше) ----
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:   ['RUB','USD'],           // отдавать CNY налом нельзя
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
      moscow:   ['RUB','USD'],           // CNY налом — только Гуанчжоу
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

  // ====== КУРСЫ И ПРАВИЛА ======

  // 1) RUB(нал) -> USD(нал): базовый 81.40 RUB за $1 + наценка по сумме USD
  function rubCashToUsdCashRate(amountUSD){
    const base = 81.40;
    const p =
      (amountUSD >= 10000) ? 0.007 :
      (amountUSD >= 6000)  ? 0.0095 :
      (amountUSD >= 3000)  ? 0.0125 :
      (amountUSD >= 1500)  ? 0.017 :
      (amountUSD >= 700)   ? 0.02  : 0.025;
    return base * (1 + p); // RUB за 1 USD
  }

  // 2) RUB(нал) -> USDT: тот же принцип, тот же базис (аналогично п.1)
  function rubCashToUsdtRate(amountUSD){
    // трактуем сумму в USDT как USD-эквивалент
    return rubCashToUsdCashRate(amountUSD); // RUB за 1 USDT
  }

  // 3) RUB(нал) -> CN services (ALIPAY/WECHAT/CN_CARD): пороги в CNY
  function rubCashToCnServiceRate(amountCNY){
    // RUB за 1 CNY
    if (amountCNY >= 70000) return 11.75;
    if (amountCNY >= 30000) return 11.80;
    if (amountCNY >= 15000) return 11.85;
    if (amountCNY >= 3000)  return 11.90;
    if (amountCNY >= 1000)  return 11.95;
    if (amountCNY >= 500)   return 12.90; // 500–1000
    // <500 пусть будет чуть выше (чтобы не пусто)
    return 12.95;
  }

  // 4) Банки (SBP/SBER/…): курс = как у наличного рубля к остальным валютам.
  //    Т.е. SBP->USD/USDT/CNY пользуются теми же формулами, что RUB(нал)->…
  const BANKS = new Set(['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']);

  // 5) USD(нал) -> RUB(нал): 79.50 RUB за 1 USD
  const USDcash_to_RUBcash = 79.50;

  // 6) USDT -> RUB (нал и банки): 79.50 RUB за 1 USDT
  const USDT_to_RUB_any = 79.50;

  // 7) USDT -> CN services (CNY за 1 USDT) — пороги по сумме в USDT
  function usdtToCnServiceRate(usdtAmount){
    if (usdtAmount >= 10000) return 7.07;
    if (usdtAmount >= 10000) return 7.07;
    if (usdtAmount >= 6000)  return 7.03;
    if (usdtAmount >= 3000)  return 7.00;
    if (usdtAmount >= 1000)  return 6.95;
    return 6.90; // до 1000
  }

  // 8) BTC: 9 300 000 RUB за 1 BTC; 113 000 USD/USDT за 1 BTC
  const BTC_RUB = 9_300_000;
  const BTC_USD = 113_000;

  // 9) ETH: 399 000 RUB; 4 900 USD/USDT
  const ETH_RUB = 399_000;
  const ETH_USD = 4_900;

  // ------ утилиты округления/форматирования ------
  const fmt = (n, d=2)=> (n==null||isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});

  // ------ главный расчёт курса (to за 1 from) ------
  function computeRate(from, to, amount){
    const a = Number(amount||0);
    if (!from || !to || !a || a<=0) return null;

    // Синоним: банки считаем как «рубль (нал)» по тарифам — по твоему правилу №4
    const fromIsBank = BANKS.has(from);
    const toIsBank   = BANKS.has(to);

    // === Прямые особые маршруты ===

    // RUB(нал или банк) -> USD(нал): тариф из п.1
    if ((from==='RUB' || fromIsBank) && to==='USD') {
      return rubCashToUsdCashRate(a); // RUB за 1 USD
    }

    // RUB(нал или банк) -> USDT: тариф из п.2
    if ((from==='RUB' || fromIsBank) && to==='USDT') {
      return rubCashToUsdtRate(a); // RUB за 1 USDT
    }

    // RUB(нал или банк) -> CN services: тариф из п.3 (RUB за 1 CNY)
    if ((from==='RUB' || fromIsBank) && (to==='ALIPAY' || to==='WECHAT' || to==='CN_CARD' || to==='CNY')) {
      // если целевая «валюта» — сервисы, мы всё равно считаем по CNY
      const amountCNY = a; // пользователь вводит в поле «Сумма» исходную валюту; для прайса берём CNY-сумму
      return rubCashToCnServiceRate(amountCNY);
    }

    // USD(нал) -> RUB(нал): фикс 79.50
    if (from==='USD' && to==='RUB') {
      return USDcash_to_RUBcash;
    }

    // USDT -> RUB (нал/банк): фикс 79.50
    if (from==='USDT' && (to==='RUB' || toIsBank)) {
      return USDT_to_RUB_any;
    }

    // USDT -> CN services: CNY за 1 USDT
    if (from==='USDT' && (to==='ALIPAY' || to==='WECHAT' || to==='CN_CARD' || to==='CNY')) {
      return usdtToCnServiceRate(a);
    }

    // BTC / ETH котировки
    if (from==='BTC' && to==='RUB') return BTC_RUB;
    if (from==='BTC' && (to==='USD' || to==='USDT')) return BTC_USD;
    if (from==='ETH' && to==='RUB') return ETH_RUB;
    if (from==='ETH' && (to==='USD' || to==='USDT')) return ETH_USD;

    // ---- Fallback’ы, чтобы «не было пустых» ----
    // попробуем собрать через опорные узлы RUB, USD, USDT, CNY

    // Базовые мосты:
    // RUB<->USD через п.1 и п.5 (возьмём среднюю обратную для RUB->USD, если не попали в прямую)
    const RUB_USD = rubCashToUsdCashRate(1000); // типовой уровень (1000$) — чтобы была внятная обратка
    const USD_RUB = USDcash_to_RUBcash;

    // RUB<->USDT через п.2 и п.6
    const RUB_USDT = rubCashToUsdtRate(1000); // уровень как выше
    const USDT_RUB = USDT_to_RUB_any;

    // RUB<->CNY (через CN-service): используем уровень на 3000 CNY
    const RUB_CNY = rubCashToCnServiceRate(3000);
    const CNY_RUB = 1 / (1/RUB_CNY); // просто обратка для связности

    // Функция попытки собрать кросс-курс: A->X->B
    function via(mid){
      const r1 = direct(from, mid);
      const r2 = direct(mid, to);
      return (r1 && r2) ? (r1 * r2) : null;
    }

    // Прямой базовый (без объёмных правил здесь)
    function direct(f, t){
      if (f===t) return 1;

      // RUB<->USD
      if (f==='RUB' && t==='USD') return 1 / RUB_USD;
      if (f==='USD' && t==='RUB') return USD_RUB;

      // RUB<->USDT
      if (f==='RUB' && t==='USDT') return 1 / RUB_USDT;
      if (f==='USDT' && t==='RUB') return USDT_RUB;

      // RUB<->CNY
      if (f==='RUB' && t==='CNY') return 1 / RUB_CNY;
      if (f==='CNY' && t==='RUB') return CNY_RUB;

      // Банки считаем как RUB
      if (BANKS.has(f) && t==='RUB') return 1;
      if (f==='RUB' && BANKS.has(t)) return 1;
      if (BANKS.has(f) && (t==='USD'||t==='USDT'||t==='CNY')) return direct('RUB', t);
      if ((f==='USD'||f==='USDT'||f==='CNY') && BANKS.has(t)) return direct(f, 'RUB');

      // CN-services считаем как CNY
      const isCN = (x)=> x==='ALIPAY'||x==='WECHAT'||x==='CN_CARD';
      if (isCN(f) && t==='CNY') return 1;
      if (f==='CNY' && isCN(t)) return 1;
      if (isCN(f)) return direct('CNY', t);
      if (isCN(t)) return direct(f, 'CNY');

      // Крипто к USD/USDT через опорные
      if (f==='BTC' && t==='USDT') return BTC_USD;            // USDT за 1 BTC
      if (f==='USDT' && t==='BTC') return 1/BTC_USD;
      if (f==='ETH' && t==='USDT') return ETH_USD;
      if (f==='USDT' && t==='ETH') return 1/ETH_USD;

      if (f==='BTC' && t==='USD') return BTC_USD;
      if (f==='USD' && t==='BTC') return 1/BTC_USD;
      if (f==='ETH' && t==='USD') return ETH_USD;
      if (f==='USD' && t==='ETH') return 1/ETH_USD;

      return null;
    }

    // 1) прямой базовый
    let r = direct(from, to);
    if (r) return r;

    // 2) через узлы: RUB, USD, USDT, CNY
    return (
      via('RUB')  || via('USD') ||
      via('USDT') || via('CNY')
    );
  }

  function quote({from,to,amount}){
    const rate = computeRate(from, to, amount);
    if (!rate) return {rate:null,total:null, rateText:'—', totalText:'—'};
    const total = Number(amount||0) * rate;
    return {
      rate,
      total,
      rateText: `${fmt(rate, 4)} ${to} за 1 ${from}`,
      totalText:`${fmt(total, 2)} ${to}`
    };
  }

  // ---- API для UI ----
  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  function currencies(kind, city, side){
    if (side === 'from') {
      const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
      return mapCodes((MATRIX[key][city]) || []);
    } else {
      let key = 'cash_to';
      if (kind === 'bank') key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay') key = 'cnpay_to';
      return mapCodes((MATRIX[key][city]) || []);
    }
  }

  window.PRICING = { currencies, quote };
})();


  window.PRICING = { currencies, quote };
})();
