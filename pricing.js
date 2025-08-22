// pricing.js v42 — русские названия на плитках + логика городов
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

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
    SOL:{code:'SOL',  nameRu:'SOL', icon:ICON('bank')}, // нет sol.svg — временно
    XMR:{code:'XMR',  nameRu:'XMR', icon:ICON('xmr')},
    XRP:{code:'XRP',  nameRu:'XRP', icon:ICON('bank')}, // нет xrp.svg
    LTC:{code:'LTC',  nameRu:'LTC', icon:ICON('bank')}, // нет ltc.svg
    TON:{code:'TON',  nameRu:'TON', icon:ICON('bank')}, // нет ton.svg

    // Китайские сервисы (только ПОЛУЧАЮ)
    ALIPAY:{code:'ALIPAY',nameRu:'Alipay',     icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',nameRu:'WeChat',     icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',nameRu:'Карта Китая',icon:ICON('bankcn')}
  };

  // доступность по типу платежа и городу
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:   ['RUB','USD'],           // в Москве нельзя ОТДАТЬ CNY наличными
      guangzhou:['RUB','USD']            // отдача CNY наличными запрещена
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
      moscow:   ['RUB','USD'],           // CNY наличными — только Гуанчжоу
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

  // Котировки (минимально нужные)
  const R = {
    // USD <> RUB
    'USD->RUB': 81.5, 'RUB->USD': 1/81.5,
    // CNY <> RUB (минимальные)
    'CNY->RUB': 11.75,'RUB->CNY': 1/11.75,
    // USDT <> RUB
    'USDT->RUB': 81.0,'RUB->USDT': 1/81.0,

    // Рубли <> банки (1:1)
    'RUB->SBP':1,'SBP->RUB':1,'RUB->SBER':1,'SBER->RUB':1,
    'RUB->TCS':1,'TCS->RUB':1,'RUB->ALFA':1,'ALFA->RUB':1,
    'RUB->VTB':1,'VTB->RUB':1,'RUB->RAIFF':1,'RAIFF->RUB':1,
    'RUB->OZON':1,'OZON->RUB':1,'RUB->OTP':1,'OTP->RUB':1,

    // Китайские сервисы
    'USDT->ALIPAY': 7.0,'USDT->WECHAT': 7.0,'USDT->CN_CARD': 7.0,
    'RUB->ALIPAY': 1/11.75,'RUB->WECHAT': 1/11.75,'RUB->CN_CARD': 1/11.75
  };

  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i?.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

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

  const fmt = (n, d=2)=> (n==null||isNaN(n)) ? '—' : Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});

  function quote({from,to,amount}){
    const a=Number(amount||0);
    if(!from||!to||!a||a<=0) return {rate:null,total:null,rateText:'—',totalText:'—'};
    // прямой
    let direct=R[`${from}->${to}`];
    if(direct){const total=a*direct; return {rate:direct,total,rateText:`${fmt(direct,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    // через RUB
    const r1=R[`${from}->RUB`], r2=R[`RUB->${to}`];
    if(r1&&r2){const rate=r1*r2,total=a*rate;return {rate,total,rateText:`${fmt(rate,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    // через USDT
    const u1=R[`${from}->USDT`], u2=R[`USDT->${to}`];
    if(u1&&u2){const rate=u1*u2,total=a*rate;return {rate,total,rateText:`${fmt(rate,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    return {rate:null,total:null,rateText:'—',totalText:'—'};
  }

  window.PRICING = { currencies, quote };
})();
