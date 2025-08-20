// pricing.js v41 — иконки под твои файлы + корректные списки
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  const C = {
    // КЭШ
    RUB:{code:'RUB',name:'RUB',icon:ICON('rub')},
    USD:{code:'USD',name:'USD',icon:ICON('usd')},
    CNY:{code:'CNY',name:'CNY',icon:ICON('cny')},

    // КРИПТО
    USDT:{code:'USDT',name:'USDT',icon:ICON('usdt')},
    BTC:{code:'BTC', name:'BTC', icon:ICON('btc')},
    ETH:{code:'ETH', name:'ETH', icon:ICON('eth')},
    SOL:{code:'SOL', name:'SOL', icon:ICON('bank')}, // нет sol.svg — временно bank.svg
    XMR:{code:'XMR', name:'XMR', icon:ICON('xmr')},
    XRP:{code:'XRP', name:'XRP', icon:ICON('bank')}, // нет xrp.svg
    LTC:{code:'LTC', name:'LTC', icon:ICON('bank')}, // нет ltc.svg
    TON:{code:'TON', name:'TON', icon:ICON('bank')}, // нет ton.svg

    // БАНКИ РФ
    SBP:{code:'SBP',name:'SBP',icon:ICON('sbp')},
    SBER:{code:'SBER',name:'SBER',icon:ICON('sber')},
    TCS:{code:'TCS',name:'T-Bank',icon:ICON('tbank')},
    ALFA:{code:'ALFA',name:'Alfa',icon:ICON('alfa')},
    VTB:{code:'VTB',name:'VTB',icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',name:'Raif',icon:ICON('raif')},
    OZON:{code:'OZON',name:'Ozon',icon:ICON('ozon')},
    OTP:{code:'OTP',name:'OTP',icon:ICON('bank')}, // нет otp.svg

    // Китайские сервисы (только ПОЛУЧАЮ)
    ALIPAY:{code:'ALIPAY',name:'Alipay',icon:ICON('alipay')},
    WECHAT:{code:'WECHAT',name:'WeChat',icon:ICON('wechat')},
    CN_CARD:{code:'CN_CARD',name:'CN Card',icon:ICON('bankcn')}
  };

  // доступность валют по типу платежа и городу
  const MATRIX = {
    // ОТДАЮ
    cash: {
      moscow:   ['RUB','USD'],           // << нет CNY наличными
      guangzhou:['RUB','USD']            // отдавать CNY наличными нельзя
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
      moscow:   ['RUB','USD'],           // << CNY наличными ТОЛЬКО в Гуанчжоу
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

  const FALLBACK_ICON = ICON('bank');
  const ensureIcon = (i)=>{ if(!i.icon) i.icon=FALLBACK_ICON; return i; };
  const mapCodes = (codes)=> codes.map(code => ensureIcon(C[code])).filter(Boolean);

  function currencies(kind, city, side){
    // side: 'from' | 'to'
    if(side === 'from') {
      // для "отдаю" китайские сервисы не показываем
      const key = (kind === 'cash' || kind === 'bank' || kind === 'crypto') ? kind : 'cash';
      return mapCodes((MATRIX[key][city]) || []);
    } else {
      // для "получаю"
      let key = 'cash_to';
      if (kind === 'bank') key = 'bank_to';
      else if (kind === 'crypto') key = 'crypto_to';
      else if (kind === 'cnpay') key = 'cnpay_to';
      return mapCodes((MATRIX[key][city]) || []);
    }
  }

  // Котировки (минимально нужные; остальное строим через мосты)
  const R = {
    // рубли/доллары
    'USD->RUB': 81.5, 'RUB->USD': 1/81.5,
    // юани
    'CNY->RUB': 11.75,'RUB->CNY': 1/11.75,
    // USDT
    'USDT->RUB': 81.0,'RUB->USDT': 1/81.0,

    // рубли <> банки РФ (1:1)
    'RUB->SBP':1,'SBP->RUB':1,'RUB->SBER':1,'SBER->RUB':1,
    'RUB->TCS':1,'TCS->RUB':1,'RUB->ALFA':1,'ALFA->RUB':1,
    'RUB->VTB':1,'VTB->RUB':1,'RUB->RAIFF':1,'RAIFF->RUB':1,
    'RUB->OZON':1,'OZON->RUB':1,'RUB->OTP':1,'OTP->RUB':1,

    // Китайские сервисы (можно считать через USDT=7¥ или через RUB-CNY)
    'USDT->ALIPAY': 7.0,'USDT->WECHAT': 7.0,'USDT->CN_CARD': 7.0,
    'RUB->ALIPAY': 1/11.75,'RUB->WECHAT': 1/11.75,'RUB->CN_CARD': 1/11.75
  };

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

  // Табло (минимум; ты можешь редактировать)
  const BOARD = [
    { title:'USDT→RUB (Cash)',  value:'79.00₽', note:'≥ 5000 USDT' },
    { title:'USD→RUB (Cash)',   value:'81.50₽', note:'≥ 5000 USD' },
    { title:'CNY→RUB (Non-cash)',value:'11.60', note:'≥ 70 000¥' },
    { title:'Alipay/WeChat',    value:'7¥',     note:'фикс 30 мин' },
  ];

  window.PRICING = { currencies, quote, board: BOARD };
})();
