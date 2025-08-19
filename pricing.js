// Мини-прайс и расчёт
window.RATES = {
  // USD→RUB (нал)
  USD_RUB: { buy: 79.30, sell: 82.05, buy5k:79.30, sell5k:81.50 },

  // USDT→RUB (нал)
  USDT_RUB_CASH: { buy_upto5k:77.00, sell_upto5k:82.05, buy_from5k:79.00, sell_from5k:81.50 },

  // CNY (Alipay / WeChat / карты)
  CNY_RUB: [11.85, 11.75, 11.70, 11.65, 11.60],
  CNY_CHECKS: 12.9,

  // Курс USDT/Alipay
  USDT_CNY: 7.00
};

// формат
function fmt(n){ return (Math.round(n*100)/100).toLocaleString('ru-RU', {minimumFractionDigits:2, maximumFractionDigits:2}); }

// Главный калькулятор
window.getQuote = function(sel, amount){
  if(!sel.from || !sel.to || !amount) return null;

  // Примеры правил:
  // USDT (from crypto) → RUB (to cash)
  if(sel.from==='USDT' && sel.to==='RUB' && sel.toType==='cash'){
    const r = amount<5000 ? window.RATES.USDT_RUB_CASH.sell_upto5k : window.RATES.USDT_RUB_CASH.sell_from5k;
    return {rate:fmt(r), total_fmt:fmt(amount*r), total:amount*r};
  }

  // USD cash → RUB cash (продажа USD)
  if(sel.from==='USD' && sel.fromType==='cash' && sel.to==='RUB' && sel.toType==='cash'){
    const r = amount<5000 ? window.RATES.USD_RUB.sell : window.RATES.USD_RUB.sell5k;
    return {rate:fmt(r), total_fmt:fmt(amount*r), total:amount*r};
  }

  // CNY сервисы → RUB (по среднему для упрощения)
  if(['ALIPAY','WECHAT','CN_CARD'].includes(sel.from) && sel.to==='RUB'){
    const r = window.RATES.CNY_RUB[0];
    return {rate:fmt(r), total_fmt:fmt(amount*r), total:amount*r};
  }

  // по запросу — вернём заглушку
  return {rate:'по запросу', total_fmt:'—', total:0};
};
