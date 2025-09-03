// index.js v71 — твой дизайн; стабильный рендер; WebApp/sendData и API; бизнес-правила CNY
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

  // State
  let fromPayType = 'bank';   // старт: Банк
  let toPayType   = 'cnpay';  // старт: Китайские сервисы
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;     // код валюты/сервиса
  let selTo       = null;     // код валюты/сервиса
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  const API_BASE = 'https://api.poizexchange.ru';

  // Telegram init (без агрессивных попапов)
  if (tg) { try { tg.expand(); tg.ready(); } catch (e) {} }
  else if (hint) { hint.hidden = false; }

  // ---------- helpers ----------
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') {
        selFrom = item.code;
        markActive(fromWrap, item.code);
      } else {
        selTo = item.code;
        markActive(toWrap, item.code);
      }
      updateQrVisibility();
      recalc();
    });
    return btn;
  }

  function markActive(container, code){
    if (!container) return;
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item => container.appendChild(tile(item, side)));
  }

  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // ---------- lists ----------
  function filteredList(kind, city, side){
    // базовый список из pricing.js
    const raw = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(kind, city, side)
      : [];

    // бизнес-правила по CNY — скрыть невозможные варианты
    if (kind === 'cash') {
      return raw.filter(it => {
        // Отдавать наличные CNY нельзя нигде
        if (side === 'from' && it.code === 'CNY') return false;
        // Получать наличные CNY только в Гуанчжоу
        if (side === 'to' && it.code === 'CNY' && city !== 'guangzhou') return false;
        return true;
      });
    }
    return raw;
  }

  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');

    const list = filteredList(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');

    const list = filteredList(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    // Внутри pricing.quote уже учтено «курс за получаемую валюту»
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');
  }

  // ---------- chips ----------
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    // активируем тот, что соответствует текущему state
    const current = box.querySelector(`.chip[data-type="${box===fromPayBox?fromPayType:toPayType}"]`) || box.querySelector('.chip');
    if (current){ current.classList.add('active'); cb && cb(current.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc();  });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc();  });

  amountInput && amountInput.addEventListener('input', recalc);

  // безопасная инициализация (ждём pricing.js)
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot, 50);
    refreshFrom();
    refreshTo();
    recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // ---------- business checks ----------
  function validateBusiness(){
    if (fromPayType === 'cash' && selFrom === 'CNY') {
      alert('Наличные юани отдать нельзя.');
      return false;
    }
    if (toPayType === 'cash' && selTo === 'CNY' && cityTo !== 'guangzhou') {
      alert('Наличные юани получить можно только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // ---------- send order ----------
  async function sendOrder(){
    if (sending) return;
    sending = true;
    try{
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo){ alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum>0)){ alert('Введите сумму.'); return; }
      if (!currentQuote.rate){ alert('Не удалось рассчитать курс.'); return; }
      if (!validateBusiness()) return;

      const payload = {
        type: 'order',
        from_currency: selFrom,
        to_currency: selTo,
        from_kind: fromPayType,
        to_kind: toPayType,
        city_from: cityFrom,
        city_to: cityTo,
        amount: amountNum,
        rate: currentQuote.rate,
        total: currentQuote.total,
        contact: (contactInput?.value || '').trim(),
        requisites: (reqsInput?.value || '').trim(),
        note: (noteInput?.value || '').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // 1) Telegram WebApp
      if (tg && tg.sendData) {
        try { tg.sendData(JSON.stringify(payload)); } catch(e){ console.warn('sendData error', e); }
        if (tg.showPopup) tg.showPopup({title:'Заявка отправлена', message:'Мы скоро свяжемся с вами.'});
        else alert('Заявка отправлена.');
        return;
      }

      // 2) Сайт -> API
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } finally {
      sending = false;
    }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
