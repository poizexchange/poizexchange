// pricing.js v38 — валюты/банки, городские правила, котировки
(function () {
  const ICON = (name) => `./icons/${name}.svg`;

  // Валюты/банки/сервисы
  const C = {
    // Фиат/крипто
    RUB:{code:'RUB',name:'Рубль',icon:ICON('rub')},
    USD:{code:'USD',name:'Доллар',icon:ICON('usd')},
    CNY:{code:'CNY',name:'Юань', icon:ICON('cny')},

    USDT:{code:'USDT',name:'Tether',icon:ICON('usdt')},
    BTC:{code:'BTC', name:'Bitcoin',icon:ICON('btc')},
    ETH:{code:'ETH', name:'Ethereum',icon:ICON('eth')},
    SOL:{code:'SOL', name:'Solana', icon:ICON('sol')},
    XMR:{code:'XMR', name:'Monero', icon:ICON('xmr')},
    XRP:{code:'XRP', name:'XRP',    icon:ICON('xrp')},
    LTC:{code:'LTC', name:'Litecoin',icon:ICON('ltc')},
    TON:{code:'TON', name:'TON',    icon:ICON('ton')},

    // Банки РФ
    SBP:{code:'SBP',name:'СБП',icon:ICON('sbp')},
    SBER:{code:'SBER',name:'Сбер',icon:ICON('sber')},
    TCS:{code:'TCS',name:'Т-Банк',icon:ICON('tinkoff')},
    ALFA:{code:'ALFA',name:'Альфа',icon:ICON('alfa')},
    VTB:{code:'VTB',name:'ВТБ',icon:ICON('vtb')},
    RAIFF:{code:'RAIFF',name:'Райф',icon:ICON('raiff')},
    OZON:{code:'OZON',name:'Ozon',icon:ICON('ozon')},
    OTP:{code:'OTP',name:'ОТП',icon:ICON('otp')},
  };

  // Доступность по типам оплаты и городам
  // Города: moscow | guangzhou
  // Типы: cash | bank | crypto | cnpay (нам cnpay тут не нужен, убираем)
  const MATRIX = {
    // ОТДАЮ/ПОЛУЧАЮ НАЛИЧНЫЕ
    cash: {
      // Москва: отдать/получить кэш RUB, USD. CNY НЕТ (нельзя отдать и получать кэш CNY в МСК)
      // По ТЗ: "Юани можно получить только в Гуанчжоу. В Москве юани отдать нельзя."
      // => в МСК CNY отсутствует и в "Отдаю", и в "Получаю".
      moscow:   ['RUB','USD'],
      // Гуанчжоу: можно CNY (и RUB/USD при необходимости — оставлю как было в «Получаю»)
      guangzhou:['RUB','USD','CNY']
    },

    // Банки РФ — одинаково для МСК и Гуанчжоу
    bank: {
      moscow:   ['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP'],
      guangzhou:['SBP','SBER','TCS','ALFA','VTB','RAIFF','OZON','OTP']
    },

    // Крипта — одинаково для МСК и Гуанчжоу
    crypto: {
      moscow:   ['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON'],
      guangzhou:['USDT','BTC','ETH','SOL','XMR','XRP','LTC','TON']
    }
  };

  // Черный список иконок (если файла нет — подставим generic)
  const FALLBACK_ICON = ICON('bank');
  function ensureIcon(item){
    // на фронте не проверим наличия файла; если нет — хотя бы не пусто
    if(!item.icon) item.icon = FALLBACK_ICON;
    return item;
  }

  function mapCodes(codes){
    return codes.map(code => ensureIcon(C[code])).filter(Boolean);
  }

  function currencies(kind, city){
    const g = MATRIX[kind] || {};
    const codes = g[city] || [];
    return mapCodes(codes);
  }

  // КОТИРОВКИ (примерные; подставь свои реальные)
  // Ключ: "FROM->TO"
  const R = {
    // Фиат
    'USD->RUB': 81.5, 'RUB->USD': 1/81.5,
    'CNY->RUB': 11.75,'RUB->CNY': 1/11.75,

    // Крипта–RUB
    'USDT->RUB': 81.0,'RUB->USDT': 1/81.0,

    // Банки считаем как RUB (внутрироссийские)
    'RUB->SBP':1,'SBP->RUB':1,'RUB->SBER':1,'SBER->RUB':1,'RUB->TCS':1,'TCS->RUB':1,
    'RUB->ALFA':1,'ALFA->RUB':1,'RUB->VTB':1,'VTB->RUB':1,'RUB->RAIFF':1,'RAIFF->RUB':1,
    'RUB->OZON':1,'OZON->RUB':1,'RUB->OTP':1,'OTP->RUB':1,
  };

  function fmt(n, d=2){
    if(n==null || isNaN(n)) return '—';
    return Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d});
  }

  function quote({from,to,amount}){
    const a = Number(amount||0);
    if(!from || !to || !a || a<=0) return {rate:null,total:null,rateText:'—',totalText:'—'};

    const direct = R[`${from}->${to}`];
    if(direct){
      const total = a*direct;
      return { rate:direct, total, rateText:`${fmt(direct,4)} ${to} за 1 ${from}`, totalText:`${fmt(total,2)} ${to}` };
    }

    // Пытаемся конвертить через RUB как через мост
    const r1 = R[`${from}->RUB`];
    const r2 = R[`RUB->${to}`];
    if(r1 && r2){
      const rate = r1 * r2;
      const total = a*rate;
      return { rate, total, rateText:`${fmt(rate,4)} ${to} за 1 ${from}`, totalText:`${fmt(total,2)} ${to}` };
    }

    // Через USDT как через мост
    const u1 = R[`${from}->USDT`];
    const u2 = R[`USDT->${to}`];
    if(u1 && u2){
      const rate = u1 * u2;
      const total = a*rate;
      return { rate, total, rateText:`${fmt(rate,4)} ${to} за 1 ${from}`, totalText:`${fmt(total,2)} ${to}` };
    }

    return {rate:null,total:null,rateText:'—',totalText:'—'};
  }

  // ====== ДАННЫЕ ДЛЯ ТАБЛО (только НИЖАЙШИЙ курс, как просил) ======
  // РЕДАКТИРУЙ свободно под фактические значения
  const BOARD = [
    { title:'USDT→RUB (Cash)', value:'79.00₽', note:'от 5000 USDT' },
    { title:'USD→RUB (Cash)',  value:'81.50₽', note:'от 5000 USD' },
    { title:'CNY→RUB (Безнал)',value:'11.60',  note:'от 70 000¥' },
    { title:'Alipay',          value:'7¥',     note:'через USDT' },
  ];

  window.PRICING = { currencies, quote, board: BOARD };
})();
