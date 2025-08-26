// pricing.js v62 — полный набор валют + правила курсов/наценок
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  // ====== Справочник валют/сервисов и иконок ======
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
    OTP:{code:'OTP',  nameRu:'ОТП',        icon:ICON('bank')}, // если нет отдельной иконки

    // Крипто
    USDT:{code:'USDT',nameRu:'USDT',icon:ICON('usdt')},
    BTC:{code:'BTC',  nameRu:'BTC', icon:ICON('btc')},
    ETH:{code:'ETH',  nameRu:'ETH', icon:ICON('eth')},
    SOL:{code:'SOL',  nameRu:'SOL', icon:ICON('sol')}, // положи icons/sol.svg; иначе временно 'bank'
    XMR:{code:'XMR',  nameRu:'XMR', icon:ICON('xmr')},
    XRP:{code:'XRP',  nameRu:'XRP', icon:ICON('xrp')},
    LTC:{code:'LTC',  nameRu:'LTC', icon:ICON('ltc')},
    TON:{code:'TON',  nameRu:'TON', icon:ICON('ton')},

    // Китайские сервисы (получаю)
    ALIPAY:{code:'ALIPAY',nameRu:'Alipay',         icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',nameRu:'WeChat',         icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',  icon:ICON('bankcn')}, // Убедись, что есть ./icons/bankcn.svg
  };

  const BANKS = new Set(['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']);
  const CNPAY = new Set(['ALIPAY','WECHAT','CN_CARD']);

  // ====== Доступность валют в UI ======
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:   ['RUB','USD','CNY'],
      guangzhou:['RUB','USD','CNY'],
    },
    bank: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
    },
    crypto: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
    },

    // ПОЛУЧАЮ
    cash_to: {
      moscow:   ['RUB','USD','CNY'],
      guangzhou:['RUB','USD','CNY'],
    },
    bank_to: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
    },
    crypto_to: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
    },
    cnpay_to: {
      moscow:   ['ALIPAY','WECHAT','CN_CARD'],
      guangzhou:['ALIPAY','WECHAT','CN_CARD'],
    },
  };

  // ====== Базовые курсы (из запроса) ======
  const BASE = {
    USD_RUB_SELL: 81.40,  // RUB -> USD (мы продаём USD за рубли) — курс до наценки, дальше — ступени
    RUB_USD_BUY:  79.50,  // USD -> RUB (мы покупаем USD за рубли) — фикс

    USDT_RUB: 79.50,      // USDT -> RUB и к банкам — фикс
    // RUB -> USDT — считаем по USD_RUB_SELL с теми же ступенями

    // USDT -> CNY (китайские сервисы) — ступени отдельно (ниже)
    // RUB -> CNY (через ALIPAY/WECHAT/CN_CARD) — ступени отдельно (ниже)

    BTC_RUB: 9300000,     // RUB -> BTC (за 1 BTC столько RUB)
    BTC_USD: 113000,      // USD/USDT -> BTC (за 1 BTC столько USD/USDT)

    ETH_RUB: 399000,
    ETH_USD: 4900,
  };

  // ====== Наценки и ступенчатые курсы ======
  function marginUsd(amount){
    if (amount < 700) return 1.025;
    if (amount < 1500) return 1.02;
    if (amount < 3000) return 1.017;
    if (amount < 6000) return 1.0125;
    if (amount < 10000) return 1.0095;
    return 1.007;
  }
  const marginUsdt = marginUsd;

  function cnyRateFromRub(amountRUB){
    // RUB -> (ALIPAY/WECHAT/CN_CARD), курс в RUB за 1 CNY
    if (amountRUB < 500) return null;         // минимум 500–1000 = 12.9
    if (amountRUB <= 1000) return 12.9;
    if (amountRUB < 3000)  return 11.95;
    if (amountRUB < 15000) return 11.9;
    if (amountRUB < 30000) return 11.85;
    if (amountRUB < 70000) return 11.80;
    return 11.75;
  }

  function cnyRateFromUsdt(amountUSDT){
    // USDT -> (ALIPAY/WECHAT/CN_CARD), курс CNY за 1 USDT
    if (amountUSDT <= 1000)  return 6.90;
    if (amountUSDT <= 3000)  return 6.95;
    if (amountUSDT <= 6000)  return 7.00;
    if (amountUSDT <= 10000) return 7.03;
    return 7.07;
  }

  // ====== Утилиты округления/форматирования ======
  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  const fmt = (n, d=2)=> (n==null || isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU', {maximumFractionDigits:d});
  const round2  = (x)=> Math.round(x*100)/100;
  const round0  = (x)=> Math.round(x);
  const round6  = (x)=> Math.round(x*1e6)/1e6;
  const round4  = (x)=> Math.round(x*1e4)/1e4;

  // Банковские коды считаем как рубли по курсу наличного рубля к другим валютам
  const isBank = (code)=> BANKS.has(code);
  const isCnpay = (code)=> CNPAY.has(code);

  // ====== Поставщик списков валют для UI ======
  function currencies(kind, city, side){
    if(side === 'from') {
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

  // ====== Расчёт котировок ======
  function quote({from,to,amount}){
    amount = Number(amount||0);
    if (!from || !to || !amount || amount<=0) return {rate:null,total:null,rateText:'—',totalText:'—'};

    // Нормализуем: банки считаем как RUB (для курсообразования), но подписи оставляем оригинальные
    const fromBase = isBank(from) ? 'RUB' : from;
    const toBase   = isBank(to)   ? 'RUB' : to;

    let rate = null; // «сколько TO за 1 FROM»
    let total = null;

    // RUB -> USD (нал/банк): USD_RUB_SELL с наценкой
    if (fromBase==='RUB' && toBase==='USD') {
      rate = round2( BASE.USD_RUB_SELL * marginUsd(amount) );
      total = round0(amount / rate);
    }
    // RUB -> USDT: те же ступени, считаем как через USD_RUB_SELL
    else if (fromBase==='RUB' && toBase==='USDT') {
      rate = round2( BASE.USD_RUB_SELL * marginUsdt(amount) );
      total = round0(amount / rate);
    }
    // RUB -> CNY (китайские сервисы)
    else if (fromBase==='RUB' && isCnpay(toBase)) {
      rate = cnyRateFromRub(amount);            // RUB за 1 CNY
      if (rate) total = round0(amount / rate);  // получу CNY
    }
    // USD -> RUB (фикс 79.50)
    else if (fromBase==='USD' && toBase==='RUB') {
      rate = BASE.RUB_USD_BUY;                  // RUB за 1 USD
      total = round0(amount * rate);
    }
    // USDT -> RUB (фикс 79.50)
    else if (fromBase==='USDT' && toBase==='RUB') {
      rate = BASE.USDT_RUB;                     // RUB за 1 USDT
      total = round0(amount * rate);
    }
    // USDT -> CNY (ступени CNY за 1 USDT)
    else if (fromBase==='USDT' && isCnpay(toBase)) {
      rate = cnyRateFromUsdt(amount);           // CNY за 1 USDT
      if (rate) total = round0(amount * rate);
    }
    // RUB -> BTC / ETH
    else if (fromBase==='RUB' && toBase==='BTC') {
      // BASE.BTC_RUB: RUB за 1 BTC => rate = BTC за 1 RUB => 1/BASE; total = amount * rate
      rate = 1 / BASE.BTC_RUB;
      total = round6(amount * rate);
      rate = round6(rate);
    }
    else if (fromBase==='RUB' && toBase==='ETH') {
      rate = 1 / BASE.ETH_RUB;
      total = round4(amount * rate);
      rate = round6(rate);
    }
    // USD/USDT -> BTC / ETH (через долларовый курс)
    else if ((fromBase==='USD' || fromBase==='USDT') && toBase==='BTC') {
      rate = 1 / BASE.BTC_USD;                  // BTC за 1 USD/USDT
      total = round6(amount * rate);
      rate = round6(rate);
    }
    else if ((fromBase==='USD' || fromBase==='USDT') && toBase==='ETH') {
      rate = 1 / BASE.ETH_USD;                  // ETH за 1 USD/USDT
      total = round4(amount * rate);
      rate = round6(rate);
    }
    // Прямой RUB <-> банки (1:1)
    else if (fromBase==='RUB' && toBase==='RUB') {
      rate = 1;
      total = round0(amount);
    }
    // Фолы (попробуем через RUB или через USDT если возможно)
    else {
      // через RUB
      const try1 = quote({from, to:'RUB', amount});
      if (try1.rate && try1.total){
        const try2 = quote({from:'RUB', to, amount: try1.total});
        if (try2.rate && try2.total){
          // сводный курс (to за 1 from)
          rate  = try2.total / amount;
          total = try2.total;
        }
      }
      // через USDT
      if (!rate) {
        const t1 = quote({from, to:'USDT', amount});
        if (t1.rate && t1.total){
          const t2 = quote({from:'USDT', to, amount: t1.total});
          if (t2.rate && t2.total){
            rate  = t2.total / amount;
            total = t2.total;
          }
        }
      }
    }

    return {
      rate,
      total,
      rateText: rate ? `${fmt(rate, (toBase==='BTC'?6:(toBase==='ETH'?4:2)))} ${to} за 1 ${from}` : '—',
      totalText: total ? `${fmt(total, (toBase==='BTC'?6:(toBase==='ETH'?4:2)))} ${to}` : '—',
    };
  }

  // Экспорт
  window.PRICING = { currencies, quote };
})();

