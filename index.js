// index.js v71 — надёжный рендер плиток + fallback без pricing.js + корректная отправка заявки
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // DOM
  const fromPayBox   = document.getElementById('from-pay');
  const toPayBox     = document.getElementById('to-pay');
  const fromCityBox  = document.getElementById('from-citybox');
  const toCityBox    = document.getElementById('to-citybox');
  const cityFromSel  = document.getElementById('cityFrom');
  const cityToSel    = document.getElementById('cityTo');
  const fromWrap     = document.getElementById('from-currencies');
  const toWrap       = document.getElementById('to-currencies');
  const amountInput  = document.getElementById('amount');
  const rateVal      = document.getElementById('rateVal');
  const totalVal     = document.getElementById('totalVal');
  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');
  const qrBox        = document.getElementById('qrbox');
  const qrFile       = document.getElementById('qrfile');
  const sendBtn      = document.getElementById('sendBtn');
  const hint         = document.getElementById('hint');

  // Состояние
  let fromPayType = 'bank';     // старт как просили: отдаю — банки
  let toPayType   = 'cnpay';    // получаю — китайские сервисы
  let cityFrom    = 'moscow';
  let cityTo      = 'guangzhou';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  // API
  const API_BASE = 'https://api.poizexchange.ru';

  // Telegram init
  if (tg) { try { tg.expand(); tg.ready(); } catch(e){} } else if (hint) { hint.hidden = false; }

  // ---------- fallback каталога валют на случай пустого pricing.js ----------
  const FALLBACK = {
    // откуда
    from: {
      cash: [
        { code:'RUB',  nameRu:'Рубль',  icon:'./icons/rub.svg' },
        { code:'USD',  nameRu:'Доллар', icon:'./icons/usd.svg' },
        { code:'CNY',  nameRu:'Юань',   icon:'./icons/cny.svg' }, // блокируем бизнес-правилом при отправке
      ],
      bank: [
        { code:'SBP',  nameRu:'СБП',    icon:'./icons/sbp.svg' },
        { code:'SBER', nameRu:'Сбер',   icon:'./icons/sber.svg' },
        { code:'ALFA', nameRu:'Альфа',  icon:'./icons/alfa.svg' },
        { code:'TINK', nameRu:'Т-Банк', icon:'./icons/tink.svg' },
        { code:'VTB',  nameRu:'ВТБ',    icon:'./icons/vtb.svg' },
        { code:'RAIF', nameRu:'Райф',   icon:'./icons/raif.svg' },
        { code:'OZON', nameRu:'Ozon',   icon:'./icons/ozon.svg' },
        { code:'OTP',  nameRu:'OTP',    icon:'./icons/otp.svg' },
      ],
      crypto: [
        { code:'USDT', nameRu:'USDT', icon:'./icons/usdt.svg' },
        { code:'BTC',  nameRu:'BTC',  icon:'./icons/btc.svg'  },
        { code:'ETH',  nameRu:'ETH',  icon:'./icons/eth.svg'  },
        { code:'LTC',  nameRu:'LTC',  icon:'./icons/ltc.svg'  },
        { code:'XMR',  nameRu:'XMR',  icon:'./icons/xmr.svg'  },
        { code:'SOL',  nameRu:'SOL',  icon:'./icons/sol.svg'  },
        { code:'TON',  nameRu:'TON',  icon:'./icons/ton.svg'  },
        { code:'XRP',  nameRu:'XRP',  icon:'./icons/xrp.svg'  },
      ],
    },
    // куда
    to: {
      cash: [
        { code:'RUB', nameRu:'Рубль',  icon:'./icons/rub.svg' },
        { code:'USD', nameRu:'Доллар', icon:'./icons/usd.svg' },
        { code:'CNY', nameRu:'Юань',   icon:'./icons/cny.svg' }, // показываем, но проверим город
      ],
      bank: [
        { code:'SBP',  nameRu:'СБП',    icon:'./icons/sbp.svg' },
        { code:'SBER', nameRu:'Сбер',   icon:'./icons/sber.svg' },
        { code:'ALFA', nameRu:'Альфа',  icon:'./icons/alfa.svg' },
        { code:'TINK', nameRu:'Т-Банк', icon:'./icons/tink.svg' },
        { code:'VTB',  nameRu:'ВТБ',    icon:'./icons/vtb.svg' },
        { code:'RAIF', nameRu:'Райф',   icon:'./icons/raif.svg' },
        { code:'OZON', nameRu:'Ozon',   icon:'./icons/ozon.svg' },
        { code:'OTP',  nameRu:'OTP',    icon:'./icons/otp.svg' },
      ],
      crypto: [
        { code:'USDT', nameRu:'USDT', icon:'./icons/usdt.svg' },
        { code:'BTC',  nameRu:'BTC',  icon:'./icons/btc.svg'  },
        { code:'ETH',  nameRu:'ETH',  icon:'./icons/eth.svg'  },
        { code:'LTC',  nameRu:'LTC',  icon:'./icons/ltc.svg'  },
        { code:'XMR',  nameRu:'XMR',  icon:'./icons/xmr.svg'  },
        { code:'SOL',  nameRu:'SOL',  icon:'./icons/sol.svg'  },
        { code:'TON',  nameRu:'TON',  icon:'./icons/ton.svg'  },
        { code:'XRP',  nameRu:'XRP',  icon:'./icons/xrp.svg'  },
      ],
      cnpay: [
        { code:'ALIPAY',  nameRu:'Alipay',      icon:'./icons/alipay.svg' },
        { code:'WECHAT',  nameRu:'WeChat Pay',  icon:'./icons/wechat.svg' },
        { code:'CN_CARD', nameRu:'Карта Китая', icon:'./icons/cncard.svg' },
        { code:'CNY',     nameRu:'Нал. юани',   icon:'./icons/cny.svg' }, // получение наличных CNY
      ],
    }
  };

  // ---------- утилиты ----------
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

  function makeTile(item){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    return btn;
  }

  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list){
    clear(container);
    if (!list || list.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'tiles-empty';
      msg.textContent = 'Нет доступных вариантов';
      container.appendChild(msg);
      return;
    }
    list.forEach(item => container.appendChild(makeTile(item)));
  }

  function listFromPricing(kind, city, side){
    try {
      if (window.PRICING?.currencies) {
        const arr = window.PRICING.currencies(kind, city, side);
        if (Array.isArray(arr) && arr.length) return arr;
        console.warn(`[pricing] Пусто для ${side}/${kind}/${city}. Использую fallback.`);
      } else {
        console.warn('[pricing] window.PRICING.currencies отсутствует, использую fallback.');
      }
    } catch (e) {
      console.warn('[pricing] ошибка currencies()', e);
    }
    // fallback
    return (side === 'from') ? (FALLBACK.from[kind] || []) : (FALLBACK.to[kind] || []);
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD','CNY'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // ---------- рендер списков ----------
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    const list = listFromPricing(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list);
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');
    const list = listFromPricing(toPayType, cityTo, 'to');
    renderTiles(toWrap, list);
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—'); totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    try{
      const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
      currentQuote = q || {};
      rateVal && (rateVal.textContent = q?.rateText ?? '—');
      totalVal && (totalVal.textContent = q?.totalText ?? '—');
    } catch(e){
      console.warn('[pricing] ошибка quote()', e);
      rateVal && (rateVal.textContent='—'); totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
    }
  }

  // Делегирование кликов по плиткам (надёжно при динамическом рендере)
  function bindTilesClick(container, side){
    if (!container) return;
    container.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('.tile');
      if (!btn) return;
      const code = btn.dataset.code;
      if (!code) return;
      if (side === 'from') {
        selFrom = code; markActive(fromWrap, code);
      } else {
        selTo   = code; markActive(toWrap, code);
      }
      updateQrVisibility();
      recalc();
    });
  }
  bindTilesClick(fromWrap, 'from');
  bindTilesClick(toWrap, 'to');

  // ---------- чипы ----------
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); cb && cb(btn.dataset.type);
      });
    });
    const first = box.querySelector(`.chip[data-type="${box.id==='to-pay'?'cnpay':'bank'}"]`) || box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb && cb(first.dataset.type); }
  }
  wireChips(fromPayBox, (t)=>{ fromPayType=t; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (t)=>{ toPayType=t;   refreshTo();  recalc(); });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });
  amountInput && amountInput.addEventListener('input', recalc);

  // ---------- инициализация ----------
  function boot(){
    // ждём pricing.js, но не блокируем UI (есть fallback)
    if (!window.PRICING?.currencies || !window.PRICING?.quote) {
      console.warn('[boot] pricing.js ещё не готов. UI поднимется на fallback и повторит попытку.');
    }
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // ---------- бизнес-правила ----------
  function validateBusiness(){
    // отдать наличные CNY — нельзя
    if (fromPayType==='cash' && selFrom==='CNY'){
      alert('Наличные юани ОТДАТЬ нельзя.');
      return false;
    }
    // получить наличные CNY можно только в Гуанчжоу
    if (toPayType==='cash' && selTo==='CNY' && cityTo!=='guangzhou'){
      alert('Наличные юани ПОЛУЧИТЬ можно только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ---------- отправка заявки ----------
  async function sendOrder(){
    if (sending) return; sending = true;
    try{
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo){ alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum>0)){ alert('Введите сумму.'); return; }

      // пересчёт может быть недоступен, но заявку всё равно можно отправить — просто без rate/total
      if (!validateBusiness()) return;

      const payload = {
        type:'order',
        from_currency: selFrom, to_currency: selTo,
        from_kind: fromPayType, to_kind: toPayType,
        city_from: cityFrom, city_to: cityTo,
        amount: amountNum,
        rate: currentQuote.rate ?? null,
        total: currentQuote.total ?? null,
        contact: (contactInput?.value||'').trim(),
        requisites: (reqsInput?.value||'').trim(),
        note: (noteInput?.value||'').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // В Telegram WebApp шлём через sendData (бот ловит через handlers_webapp.py)
      if (tg && tg.sendData){
        try { tg.sendData(JSON.stringify(payload)); } catch(e){ console.warn('sendData error', e); }
        alert('Заявка отправлена (через Telegram).');
        return;
      }

      // На сайте — шлём в FastAPI
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети при отправке заявки.');
    } finally { sending = false; }
  }
  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
