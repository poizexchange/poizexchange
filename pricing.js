// pricing.js v71 — матрица доступности, курсы, наценки, расчеты
(function () {
  const ICON = (n)=>`./icons/${n}.svg`;

  // Валюты/сервисы
  const C = {
    // Наличные
    RUB:{code:'RUB', nameRu:'Рубль',  icon:ICON('rub')},
    USD:{code:'USD', nameRu:'Доллар', icon:ICON('usd')},
    CNY:{code:'CNY', nameRu:'Юань',   icon:ICON('cny')},

    // Банки РФ (считаются как RUB)
    SBP:{code:'SBP',   nameRu:'СБП',        icon:ICON('sbp')},
    SBER:{code:'SBER', nameRu:'Сбер',       icon:ICON('sber')},
    TCS:{code:'TCS',   nameRu:'Т-Банк',     icon:ICON('tbank')},
    ALFA:{code:'ALFA', nameRu:'Альфа-Банк', icon:ICON('alfa')},
    VTB:{code:'VTB',   nameRu:'ВТБ',        icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',nameRu:'Райфф',     icon:ICON('raif')},
    OZON:{code:'OZON', nameRu:'Озон',       icon:ICON('ozon')},
    OTP:{code:'OTP',   nameRu:'ОТП',        icon:ICON('bank')},

    // Крипто
    USDT:{code:'USDT', nameRu:'USDT', icon:ICON('usdt')},
    BTC:{code:'BTC',   nameRu:'BTC',  icon:ICON('btc')},
    ETH:{code:'ETH',   nameRu:'ETH',  icon:ICON('eth')},
    SOL:{code:'SOL',   nameRu:'SOL',  icon:ICON('sol')},
    XMR:{code:'XMR',   nameRu:'XMR',  icon:ICON('xmr')},
    XRP:{code:'XRP',   nameRu:'XRP',  icon:ICON('xrp')},
    LTC:{code:'LTC',   nameRu:'LTC',  icon:ICON('ltc')},
    TON:{code:'TON',   nameRu:'TON',  icon:ICON('ton')},

    // Китайские сервисы (только ПОЛУЧАЮ)
    ALIPAY:{code:'ALIPAY', nameRu:'Alipay',        icon:ICON('alipay')},
    WECHAT:{code:'WECHAT', nameRu:'WeChat',        icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD', nameRu:'Карта Китая', icon:ICON('bankcn')}
  };
  const BANKS  = ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'];
  const CNPAY  = ['ALIPAY','WECHAT','CN_CARD'];

  // Доступность (важно: CNY наличными НЕЛЬЗЯ отдать; получить — только Гуанчжоу)
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:    ['RUB','USD'],     // CNY отсутствует
      guangzhou: ['RUB','USD']
    },
    bank: {
      moscow:    BANKS,
      guangzhou: BANKS
    },
    crypto: {
      moscow:    ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou: ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    },

    // ПОЛУЧАЮ
    cash_to: {
      moscow:    ['RUB','USD'],     // CNY нельзя получить в Москве
      guangzhou: ['RUB','USD','CNY']
    },
    bank_to: {
      moscow:    BANKS,
      guangzhou: BANKS
    },
    crypto_to: {
      moscow:    ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou: ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    },
    cnpay_to: {
      moscow:    CNPAY,             // показываем плитки, но курс/отправка из Москвы не будет
      guangzhou: CNPAY
    }
  };

  // Форматирование
  const fmt = (n,d=2)=> (n==null||isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});
  const two = (n)=> Math.round(n*100)/100;

  // БАЗА КУРСОВ (можно обновлять через /api/rates и /setrate в боте)
  const BASE = {
    // Нал РУБ -> нал USD/USDT: базовая стоимость USD 81.40 RUB (наценка по диапазонам)
    rubPerUsdBuy: 81.40,
    // Нал USD/USDT -> РУБ: 79.50 RUB за 1
    rubPerUsdSell: 79.50,

    // RUB/BTC и USD/BTC
    rubPerBtc: 9300000,
    usdPerBtc: 113000,

    // RUB/ETH и USD/ETH
    rubPerEth: 399000,
    usdPerEth: 4900
  };

  // Фолы по прочим монетам (USD-цены), чтобы "не было пустых"
  const USD_COIN = {
    SOL: 150,
    XMR: 150,
    XRP: 0.5,
    LTC: 80,
    TON: 8
  };

  // OVERRIDES подхватываем с бэка
  const OVERRIDES = {};
  function getK(name){ return (name in OVERRIDES) ? OVERRIDES[name] : BASE[name]; }

  // Наценка для RUB->USD(T) по сумме USD
  function usdMarkupPct(usd){
    if (usd < 700) return 0.025;
    if (usd < 1500) return 0.020;
    if (usd < 3000) return 0.017;
    if (usd < 6000) return 0.0125;
    if (usd < 10000) return 0.0095;
    return 0.007;
  }
  function rubPerUsdForBuy(usdAmount){
    const base = getK('rubPerUsdBuy');
    return base * (1 + usdMarkupPct(usdAmount));
  }

  // RUB -> CNY (по сумме CNY)
  function rubPerCnyByCnyAmount(cny){
    if (cny < 1000) return 12.9;        // 500–1000 и меньше
    if (cny < 3000) return 11.95;
    if (cny < 15000) return 11.90;
    if (cny < 30000) return 11.85;
    if (cny < 70000) return 11.80;
    return 11.75;
  }

  // USDT/USD -> CNY (по сумме USDT/USD)
  function cnyPerUsdtByAmount(u){
    if (u <= 1000)  return 6.90;
    if (u <= 3000)  return 6.95;
    if (u <= 6000)  return 7.00;
    if (u <= 10000) return 7.03;
    return 7.07;
  }
  const cnyPerUsdByAmount = cnyPerUsdtByAmount; // одинаково для USD и USDT

  // Нормализация кодов (банки — это RUB; китайские — это CNY)
  const isBank = (c)=> BANKS.includes(c);
  const isCnp  = (c)=> CNPAY.includes(c);
  function norm(c){ if(isBank(c)) return 'RUB'; if(isCnp(c)) return 'CNY'; return c; }

  // Список валют для плиток
  function currencies(kind, city, side){
    if (side==='from'){
      const key = (kind==='cash' || kind==='bank' || kind==='crypto') ? kind : 'cash';
      return (MATRIX[key][city]||[]).map(code=>C[code]).filter(Boolean);
    } else {
      let key='cash_to';
      if (kind==='bank') key='bank_to';
      else if (kind==='crypto') key='crypto_to';
      else if (kind==='cnpay') key='cnpay_to';
      let list = MATRIX[key][city]||[];
      // СЮДА правило: CNY получать можно только в Гуанчжоу (в MATRIX уже учтено)
      return list.map(code=>C[code]).filter(Boolean);
    }
  }

  // Универсальный расчет
  function quote(opts){
    const from = opts.from, to = opts.to;
    const fromKind=opts.fromKind, toKind=opts.toKind;
    const cityFrom=opts.cityFrom, cityTo=opts.cityTo;
    const amount = Number(opts.amount||0);

    // Запреты на бизнес-правила
    if (norm(from)==='CNY') return null; // отдать CNY нельзя
    if (to==='CNY' && (toKind==='cash' && cityTo!=='guangzhou')) return null; // получить CNY в Москве нельзя

    const fromN = norm(from);
    const toN   = norm(to);

    let total = null; // в целевой «toN»
    // 1) Прямые сценарии RUB ↔ USD/USDT
    if (fromN==='RUB' && (toN==='USD' || toN==='USDT')){
      // RUB -> USD/USDT: итеративно (наценка зависит от суммы USD)
      let usd = amount / rubPerUsdForBuy(amount / getK('rubPerUsdBuy')); // грубая оценка
      for (let i=0;i<3;i++){ usd = amount / rubPerUsdForBuy(usd); }
      total = usd;
    } else if ((fromN==='USD' || fromN==='USDT') && toN==='RUB'){
      total = amount * getK('rubPerUsdSell');
    }
    // 2) RUB -> CNY (через piecewise по сумме CNY)
    else if (fromN==='RUB' && toN==='CNY'){
      let cny = amount / rubPerCnyByCnyAmount(amount/12); // старт
      for (let i=0;i<3;i++){ cny = amount / rubPerCnyByCnyAmount(cny); }
      total = cny;
    }
    // 3) USD/USDT -> CNY
    else if ((fromN==='USD' || fromN==='USDT') && toN==='CNY'){
      total = amount * cnyPerUsdtByAmount(amount); // одинаково для USD и USDT
    }
    // 4) Крипто BTC / ETH
    else if (fromN==='RUB' && toN==='BTC'){ total = amount / getK('rubPerBtc'); }
    else if ((fromN==='USD' || fromN==='USDT') && toN==='BTC'){ total = amount / getK('usdPerBtc'); }
    else if (fromN==='BTC' && toN==='RUB'){ total = amount * getK('rubPerBtc'); }
    else if (fromN==='BTC' && (toN==='USD'||toN==='USDT')){ total = amount * getK('usdPerBtc'); }

    else if (fromN==='RUB' && toN==='ETH'){ total = amount / getK('rubPerEth'); }
    else if ((fromN==='USD' || fromN==='USDT') && toN==='ETH'){ total = amount / getK('usdPerEth'); }
    else if (fromN==='ETH' && toN==='RUB'){ total = amount * getK('rubPerEth'); }
    else if (fromN==='ETH' && (toN==='USD'||toN==='USDT')){ total = amount * getK('usdPerEth'); }

    // 5) Прочие крипты через USD (USD_COIN)
    else if ((fromN==='USD'||fromN==='USDT') && USD_COIN[toN]){ total = amount / USD_COIN[toN]; }
    else if (fromN in USD_COIN && (toN==='USD'||toN==='USDT')) { total = amount * USD_COIN[fromN]; }
    else if (fromN==='RUB' && (toN in USD_COIN)) { // RUB -> COIN через USD
      const usd = amount / getK('rubPerUsdBuy');      // приближенно без наценки — чтобы не занижать
      total = usd / USD_COIN[toN];
    } else if ((fromN in USD_COIN) && toN==='RUB'){   // COIN -> RUB через USD
      const usd = amount * USD_COIN[fromN];
      total = usd * getK('rubPerUsdSell');
    }

    // Фолбэк через USD или RUB если что-то не предусмотрели
    if (total==null){
      // через RUB
      if (fromN!=='RUB' && toN!=='RUB'){
        const mid = quote({from, to:'RUB', amount, fromKind, toKind, cityFrom, cityTo});
        if (mid && mid.total){
          const fin = quote({from:'RUB', to, amount: mid.total, fromKind, toKind, cityFrom, cityTo});
          if (fin && fin.total!=null) total = fin.total;
        }
      }
    }

    if (total==null) return null;

    const rate = total/amount; // сколько "получаю" за 1 "отдаю"
    return {
      rate,
      total: two(total),
      rateText: `${fmt(rate,4)} ${to} за 1 ${from}`,
      totalText: `${fmt(total,2)} ${to}`
    };
  }

  function setOverrides(obj){
    Object.assign(OVERRIDES, obj||{});
  }

  // Публичное API
  window.PRICING = { currencies, quote, setOverrides };
})();
