// pricing.js v61 — курсы и наценки Poiz Exchange
window.PRICING = (function(){

  // --- утилиты ---
  function round2(x){ return Math.round(x*100)/100; }
  function roundInt(x){ return Math.round(x); }

  // --- базовые курсы ---
  const BASE = {
    "USD_RUB": 81.40,
    "RUB_USD": 79.50,
    "USDT_RUB": 79.50,
    "RUB_USDT": 81.40,
    "BTC_RUB": 9300000,
    "BTC_USD": 113000,
    "ETH_RUB": 399000,
    "ETH_USD": 4900
  };

  // --- наценки ---
  function marginUsd(amount){
    if (amount < 700) return 1.025;
    if (amount < 1500) return 1.02;
    if (amount < 3000) return 1.017;
    if (amount < 6000) return 1.0125;
    if (amount < 10000) return 1.0095;
    return 1.007;
  }

  function marginUsdt(amount){ return marginUsd(amount); }

  function cnyRate(amount){
    if (amount < 500) return null;
    if (amount <= 1000) return 12.9;
    if (amount < 3000) return 11.95;
    if (amount < 15000) return 11.9;
    if (amount < 30000) return 11.85;
    if (amount < 70000) return 11.8;
    return 11.75;
  }

  function usdtCnyRate(amount){
    if (amount <= 1000) return 6.9;
    if (amount <= 3000) return 6.95;
    if (amount <= 6000) return 7.0;
    if (amount <= 10000) return 7.03;
    return 7.07;
  }

  // --- список валют для UI ---
  const CURRENCIES = {
    cash: [
      { code:"RUB", nameRu:"Рубли", icon:"./icons/rub.svg" },
      { code:"USD", nameRu:"Доллары", icon:"./icons/usd.svg" },
      { code:"USDT", nameRu:"USDT", icon:"./icons/usdt.svg" },
      { code:"BTC", nameRu:"Bitcoin", icon:"./icons/btc.svg" },
      { code:"ETH", nameRu:"Ethereum", icon:"./icons/eth.svg" },
      { code:"CNY", nameRu:"Юани", icon:"./icons/cny.svg" },
    ],
    bank: [
      { code:"RUB", nameRu:"Рубли (банк)", icon:"./icons/rub.svg" },
      { code:"USD", nameRu:"Доллары (банк)", icon:"./icons/usd.svg" },
      { code:"USDT", nameRu:"USDT (банк)", icon:"./icons/usdt.svg" },
    ],
    crypto: [
      { code:"USDT", nameRu:"USDT", icon:"./icons/usdt.svg" },
      { code:"BTC", nameRu:"Bitcoin", icon:"./icons/btc.svg" },
      { code:"ETH", nameRu:"Ethereum", icon:"./icons/eth.svg" },
    ],
    cnpay: [
      { code:"ALIPAY", nameRu:"Alipay", icon:"./icons/alipay.svg" },
      { code:"WECHAT", nameRu:"WeChat", icon:"./icons/wechat.svg" },
      { code:"CN_CARD", nameRu:"Карта Китая", icon:"./icons/cncard.svg" },
    ]
  };

  // --- логика получения валют ---
  function currencies(kind, city, side){
    return CURRENCIES[kind] || [];
  }

  // --- расчет котировок ---
  function quote({from,to,amount}){
    let rate=null, total=null;

    // наличные рубли -> доллар
    if (from==="RUB" && to==="USD"){
      rate = round2(BASE.USD_RUB*marginUsd(amount));
      total = roundInt(amount / rate);
    }
    // наличные рубли -> USDT
    else if (from==="RUB" && to==="USDT"){
      rate = round2(BASE.USD_RUB*marginUsdt(amount));
      total = roundInt(amount / rate);
    }
    // наличные рубли -> CNY (китайские сервисы)
    else if (from==="RUB" && (to==="ALIPAY"||to==="WECHAT"||to==="CN_CARD")){
      rate = cnyRate(amount);
      total = rate ? roundInt(amount / rate) : null;
    }
    // наличные доллары -> рубли
    else if (from==="USD" && to==="RUB"){
      rate = BASE.RUB_USD;
      total = roundInt(amount * rate);
    }
    // USDT -> рубли
    else if (from==="USDT" && to==="RUB"){
      rate = BASE.USDT_RUB;
      total = roundInt(amount * rate);
    }
    // USDT -> китайские сервисы
    else if (from==="USDT" && (to==="ALIPAY"||to==="WECHAT"||to==="CN_CARD")){
      rate = usdtCnyRate(amount);
      total = rate ? roundInt(amount * rate) : null;
    }
    // рубль -> BTC
    else if (from==="RUB" && to==="BTC"){
      rate = BASE.BTC_RUB;
      total = round6(amount / rate);
    }
    // рубль -> ETH
    else if (from==="RUB" && to==="ETH"){
      rate = BASE.ETH_RUB;
      total = round4(amount / rate);
    }
    // USD -> BTC
    else if (from==="USD" && to==="BTC"){
      rate = BASE.BTC_USD;
      total = round6(amount / rate);
    }
    // USD -> ETH
    else if (from==="USD" && to==="ETH"){
      rate = BASE.ETH_USD;
      total = round4(amount / rate);
    }

    return {
      rate,
      total,
      rateText: rate ? rate.toString() : "—",
      totalText: total ? total.toString() : "—"
    };
  }

  // доп. округления для крипты
  function round6(x){ return Math.round(x*1e6)/1e6; }
  function round4(x){ return Math.round(x*1e4)/1e4; }

  return { currencies, quote };
})();
