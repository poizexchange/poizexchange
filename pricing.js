// pricing.js v37 — источники валют, фильтры по типу оплаты и городу
// Возвращаем ГЛОБАЛЬНЫЙ window.PRICING
(function () {
  // Иконки лежат в ./icons
  const ICON = (name) => `./icons/${name}.svg`;

  // Справочник валют/сервисов
  const CURRENCIES = {
    RUB:  { code:'RUB',  name:'Рубль',        icon: ICON('rub') },
    USD:  { code:'USD',  name:'Доллар',       icon: ICON('usd') },
    CNY:  { code:'CNY',  name:'Юань',         icon: ICON('cny') },
    USDT: { code:'USDT', name:'Tether',       icon: ICON('usdt') },
    BTC:  { code:'BTC',  name:'Bitcoin',      icon: ICON('btc') },
    ETH:  { code:'ETH',  name:'Ethereum',     icon: ICON('eth') },

    ALI:  { code:'ALIPAY',  name:'Alipay',    icon: ICON('alipay') },
    WECH: { code:'WECHAT',  name:'WeChat',    icon: ICON('wechat') },
    CNC:  { code:'CN_CARD', name:'Карта Китая', icon: ICON('bankcn') },
  };

  // Доступность по типам оплаты и городам
  // Города: moscow | guangzhou
  // Типы оплаты: cash | bank | crypto | cnpay
  const MATRIX = {
    // ОТДАЮ/ПОЛУЧАЮ НАЛИЧНЫЕ
    cash: {
      moscow:   ['RUB','USD'/*, 'USDT' если нужен кэш USDT в МСК*/],
      guangzhou:['CNY' /* только юани в Гуанчжоу */]
    },

    // БАНК
    bank: {
      moscow:   ['RUB','USD'],
      guangzhou:['CNY','USD'] // при желании оставь только CNY
    },

    // КРИПТО
    crypto: {
      moscow:   ['USDT','BTC','ETH'],
      guangzhou:['USDT','BTC','ETH']
    },

    // Китайские сервисы (получаю)
    cnpay: {
      moscow:   ['ALI','WECH','CNC'],
      guangzhou:['ALI','WECH','CNC']
    }
  };

  // Базовые курсы и расчёт (пример!)
  // Ты просил обновить курсы — здесь можно держать агрегированные коэффициенты.
  // В реальном боте у тебя может быть своя логика.
  const RATES = {
    // Примеры (поправь под свои реальные курсы):
    // пара задаётся как FROM->TO (например RUB->USDT)
    'RUB->USDT': 1/80,
    'USDT->RUB': 80,

    'USD->RUB': 81.5,
    'RUB->USD': 1/81.5,

    'CNY->RUB': 11.75,      // для безнала, а для кэша можешь сдвинуть
    'RUB->CNY': 1/11.75,

    // Китайские сервисы — грубые коэффициенты:
    'RUB->ALIPAY': 1/7*11.75, // через привязку к 7 CNY за 1 USDT и т.п.
    'RUB->WECHAT': 1/7*11.75,
    'RUB->CN_CARD':1/7*11.75,
    'ALIPAY->RUB': 7/11.75,
    'WECHAT->RUB': 7/11.75,
    'CN_CARD->RUB':7/11.75,
  };

  // Хелперы
  function listFromMatrix(kind, city) {
    const group = MATRIX[kind];
    if (!group) return [];
    const codes = group[city] || [];
    return codes.map(code => {
      // код может быть "ALI" (Alipay) — но во внешней карточке хотим ALIPAY
      const map = {
        ALI: 'ALIPAY',
        WECH: 'WECHAT',
        CNC: 'CN_CARD'
      };
      const real = map[code] || code;
      return CURRENCIES[real];
    }).filter(Boolean);
  }

  function fmt(n, digits = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('ru-RU', {maximumFractionDigits: digits});
  }

  // Публичные методы:
  // currencies(kind, city) -> массив карточек {code, name, icon}
  function currencies(kind, city) {
    // запасной дефолт города
    const safeCity = (city === 'moscow' || city === 'guangzhou') ? city : 'moscow';
    return listFromMatrix(kind, safeCity);
  }

  // quote({ fromPay, toPay, from, to, amount })
  function quote(opts) {
    const { from, to, amount } = opts || {};
    const amt = Number(amount || 0);
    if (!from || !to || !amt || amt <= 0) {
      return { rate: null, total: null, rateText: '—', totalText: '—' };
    }
    const key = `${from}->${to}`;
    const rate = RATES[key] || null;
    if (!rate) return { rate: null, total: null, rateText: '—', totalText: '—' };

    const total = amt * rate;
    return {
      rate,
      total,
      rateText: `${fmt(rate, 4)} ${to} за 1 ${from}`,
      totalText: `${fmt(total, 2)} ${to}`,
    };
  }

  window.PRICING = { currencies, quote };
})();
