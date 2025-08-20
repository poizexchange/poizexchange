// pricing.js v40 — исправлены имена иконок под твои файлы
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  const C = {
    // Кэш
    RUB:{code:'RUB',name:'Рубль',icon:ICON('rub')},
    USD:{code:'USD',name:'Доллар',icon:ICON('usd')},
    CNY:{code:'CNY',name:'Юань', icon:ICON('cny')},

    // Крипта
    USDT:{code:'USDT',name:'Tether',icon:ICON('usdt')},
    BTC:{code:'BTC', name:'Bitcoin',icon:ICON('btc')},
    ETH:{code:'ETH', name:'Ethereum',icon:ICON('eth')},
    SOL:{code:'SOL', name:'Solana', icon:ICON('sol')},   // (нет файла — сделай копию btc.svg→sol.svg пока)
    XMR:{code:'XMR', name:'Monero', icon:ICON('xmr')},
    XRP:{code:'XRP', name:'XRP',    icon:ICON('bank')},  // (нет xrp.svg — использует bank.svg)
    LTC:{code:'LTC', name:'Litecoin',icon:ICON('bank')}, // (нет ltc.svg — использует bank.svg)
    TON:{code:'TON', name:'TON',    icon:ICON('bank')},  // (нет ton.svg — использует bank.svg)

    // Банки РФ
    SBP:{code:'SBP',name:'СБП',icon:ICON('sbp')},
    SBER:{code:'SBER',name:'Сбер',icon:ICON('sber')},
    TCS:{code:'TCS',name:'Т-Банк',icon:ICON('tbank')},
    ALFA:{code:'ALFA',name:'Альфа',icon:ICON('alfa')},
    VTB:{code:'VTB',name:'ВТБ',icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',name:'Райф',icon:ICON('raif')},
    OZON:{code:'OZON',name:'Ozon',icon:ICON('ozon')},
    OTP:{code:'OTP',name:'ОТП',icon:ICON('bank')}, // (нет otp.svg — использует bank.svg)

    // Китайские сервисы
    ALIPAY:{code:'ALIPAY',name:'Alipay',icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',name:'WeChat',icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',name:'Карта Китая',icon:ICON('bankcn')}
  };

  const MATRIX = {
    cash: {
      moscow:   ['RUB','USD'],
      guangzhou:['RUB','USD','CNY']
    },
    bank: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
    },
    crypto: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    },
    cnpay: {
      moscow:   ['ALIPAY','WECHAT','CN_CARD'],
      guangzhou:['ALIPAY','WECHAT','CN_CARD']
    }
  };

  const FALLBACK_ICON = ICON('bank');
  function ensureIcon(item){ if(!item.icon) item.icon = FALLBACK_ICON; return item; }
  function mapCodes(codes){ return codes.map(code => ensureIcon(C[code])).filter(Boolean); }

  function currencies(kind, city){
    const g = MATRIX[kind] || {};
    const codes = g[city] || [];
    return mapCodes(codes);
  }

  const R = {
    'USD->RUB': 81.5, 'RUB->USD': 1/81.5,
    'CNY->RUB': 11.75,'RUB->CNY': 1/11.75,
    'USDT->RUB': 81.0,'RUB->USDT': 1/81.0,

    'RUB->SBP':1,'SBP->RUB':1,'RUB->SBER':1,'SBER->RUB':1,
    'RUB->TCS':1,'TCS->RUB':1,'RUB->ALFA':1,'ALFA->RUB':1,
    'RUB->VTB':1,'VTB->RUB':1,'RUB->RAIFF':1,'RAIFF->RUB':1,
    'RUB->OZON':1,'OZON->RUB':1,'RUB->OTP':1,'OTP->RUB':1,

    'USDT->ALIPAY': 7.0,'USDT->WECHAT': 7.0,'USDT->CN_CARD': 7.0,
    'RUB->ALIPAY': 1/11.75,'RUB->WECHAT': 1/11.75,'RUB->CN_CARD': 1/11.75
  };

  function fmt(n, d=2){ if(n==null||isNaN(n)) return '—'; return Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d}); }

  function quote({from,to,amount}){
    const a=Number(amount||0); if(!from||!to||!a||a<=0) return {rate:null,total:null,rateText:'—',totalText:'—'};
    let direct=R[`${from}->${to}`];
    if(direct){const total=a*direct; return {rate:direct,total,rateText:`${fmt(direct,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    const r1=R[`${from}->RUB`], r2=R[`RUB->${to}`];
    if(r1&&r2){const rate=r1*r2,total=a*rate;return {rate,total,rateText:`${fmt(rate,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    const u1=R[`${from}->USDT`], u2=R[`USDT->${to}`];
    if(u1&&u2){const rate=u1*u2,total=a*rate;return {rate,total,rateText:`${fmt(rate,4)} ${to} за 1 ${from}`,totalText:`${fmt(total,2)} ${to}`};}
    return {rate:null,total:null,rateText:'—',totalText:'—'};
  }

  const BOARD = [
    { title:'USDT→RUB (Cash)', value:'79.00₽', note:'от 5000 USDT' },
    { title:'USD→RUB (Cash)',  value:'81.50₽', note:'от 5000 USD' },
    { title:'CNY→RUB (Безнал)',value:'11.60',  note:'от 70 000¥' },
    { title:'Alipay (через USDT)', value:'7¥', note:'фикс до 30 мин' },
  ];

  window.PRICING = { currencies, quote, board: BOARD };
})();
