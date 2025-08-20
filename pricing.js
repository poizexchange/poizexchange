(function () {
  const ICON = (code) => `./icons/${code.toLowerCase()}.svg`;

  const registry = {
    CASH: [
      { code: 'USD',  name: 'Доллар',     icon: ICON('usd')  },
      { code: 'RUB',  name: 'Рубли',      icon: ICON('rub')  },
      { code: 'USDT', name: 'Tether',     icon: ICON('usdt') },
      { code: 'CNY',  name: 'Юани',       icon: ICON('cny')  },
    ],
    BANK: [
      { code: 'RUB',  name: 'Рубли (банк РФ)', icon: ICON('rub')  },
      { code: 'USD',  name: 'Доллар (банк)',   icon: ICON('usd')  },
      { code: 'USDT', name: 'Tether',          icon: ICON('usdt') },
    ],
    CRYPTO: [
      { code: 'USDT', name: 'Tether',   icon: ICON('usdt') },
      { code: 'BTC',  name: 'Bitcoin',  icon: ICON('btc')  },
      { code: 'ETH',  name: 'Ethereum', icon: ICON('eth')  },
    ],
    CNPAY: [
      { code: 'ALIPAY', name: 'Alipay',      icon: ICON('alipay') },
      { code: 'WECHAT', name: 'WeChat Pay',  icon: ICON('wechat') },
      { code: 'CNCARD', name: 'Карта Китая', icon: ICON('bankcn') },
    ],
  };

  const RULES = {
    'USDT->ALIPAY': { rate: 7, fmt: (r) => `1 USDT = ${r} ¥` },
    'USD->RUB':     { rate: 81.5, fmt: (r) => `1 USD = ${r.toFixed(2)} ₽` },
    'RUB->USD':     { rate: 1/81.5, fmt: (r) => `1 ₽ = ${(1/r).toFixed(4)} USD` },
    'USDT->RUB':    { rate: 79.0, fmt: (r) => `1 USDT = ${r.toFixed(2)} ₽` },
    'RUB->USDT':    { rate: 1/82.05, fmt:(r)=> `1 ₽ = ${(1/r).toFixed(4)} USDT` },
  };

  function payKey(kind) {
    if (kind === 'cash')   return 'CASH';
    if (kind === 'bank')   return 'BANK';
    if (kind === 'crypto') return 'CRYPTO';
    if (kind === 'cnpay')  return 'CNPAY';
    return 'CASH';
  }

  const PRICING = {
    currencies(kind) {
      return registry[payKey(kind)] || [];
    },
    quote({ fromPay, toPay, from, to, amount }) {
      let rule = RULES[`${from}->${to}`];

      if (!rule && to === 'ALIPAY' && from === 'USDT') rule = RULES['USDT->ALIPAY'];
      if (!rule && from === 'ALIPAY' && to === 'USDT') rule = { rate: 1/7, fmt:(r)=>`1 ¥ = ${(1/r).toFixed(4)} USDT` };

      if (!rule) {
        if (from === 'USD'  && to === 'RUB') rule = RULES['USD->RUB'];
        if (from === 'RUB'  && to === 'USD') rule = RULES['RUB->USD'];
        if (from === 'USDT' && to === 'RUB') rule = RULES['USDT->RUB'];
        if (from === 'RUB'  && to === 'USDT') rule = RULES['RUB->USDT'];
      }

      if (!rule) return { rate: null, rateText: 'нет котировки', totalText: '—', total: null };

      const rate  = rule.rate;
      const total = amount * rate;
      return {
        rate,
        total,
        rateText: typeof rule.fmt === 'function' ? rule.fmt(rate) : String(rate),
        totalText: isFinite(total) ? total.toFixed(2) : '—'
      };
    }
  };

  window.PRICING = PRICING;
})();
