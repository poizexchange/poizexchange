// index.js v71 — старый UI, стабильные плитки, WebApp=>sendData, сайт=>API
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
  let fromPayType = 'cash';
  let toPayType   = 'cash';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
  let sending = false;

  // API base:
  // - если открыто с GitHub Pages → шлём на прод API домен
  // - если открыто с твоего домена (и стоит nginx proxy /api → 127.0.0.1:8081) → используем /api
  const API_BASE = (location.hostname.endsWith('github.io')) ? 'https://api.poizexchange.ru' : '/api';

  // Telegram init (и мягкий пинг в бота)
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  // Utils
  const clear = (n)=>{ while(n && n.firstChild) n.removeChild(n.firstChild); };
  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', ()=>{
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
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
    list.forEach(it => container.appendChild(tile(it, side)));
  }
  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // Рендер источников/приёмников
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING?.currencies ? window.PRICING.currencies(fromPayType, cityFrom, 'from') : [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }
  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING?.currencies ? window.PRICING.currencies(toPayType, cityTo, 'to') : [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }

  // Пересчёт
  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      rateVal && (rateVal.textContent='—');
      totalVal && (totalVal.textContent='—');
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    rateVal && (rateVal.textContent = q?.rateText ?? '—');
    totalVal && (totalVal.textContent = q?.totalText ?? '—');
  }

  // Выбор режима
  function wireChips(box, cb){
    if (!box) return;
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb && cb(btn.dataset.type);
      });
    });
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb && cb(first.dataset.type); }
  }
  wireChips(fromPayBox, (t)=>{ fromPayType=t; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (t)=>{ toPayType=t;   refreshTo();  recalc(); });

  cityFromSel && cityFromSel.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel   && cityToSel.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });
  amountInput && amountInput.addEventListener('input', recalc);

  // Безопасная инициализация
  function boot(){
    if (!window.PRICING?.currencies || !window.PRICING?.quote) return setTimeout(boot, 50);
    refreshFrom(); refreshTo(); recalc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // Бизнес-правила CNY
  function validateBusiness(){
    if (fromPayType==='cash' && selFrom==='CNY' && cityFrom!=='guangzhou'){
      alert('Наличные юани можно ОТДАТЬ только в Гуанчжоу.');
      return false;
    }
    if (toPayType==='cash' && selTo==='CNY' && cityTo!=='guangzhou'){
      alert('Наличные юани можно ПОЛУЧИТЬ только в Гуанчжоу.');
      return false;
    }
    return true;
  }

  // Отправка заявки
  async function sendOrder(){
    if (sending) return; sending = true;
    try{
      const amountNum = Number(amountInput?.value || 0);
      if (!selFrom || !selTo){ alert('Выберите валюты «Отдаю» и «Получаю».'); return; }
      if (!(amountNum>0)){ alert('Введите сумму.'); return; }
      if (!currentQuote.rate){ alert('Не удалось рассчитать курс.'); return; }
      if (!validateBusiness()) return;

      const payload = {
        type:'order',
        from_currency: selFrom, to_currency: selTo,
        from_kind: fromPayType, to_kind: toPayType,
        city_from: cityFrom, city_to: cityTo,
        amount: amountNum, rate: currentQuote.rate, total: currentQuote.total,
        contact: (contactInput?.value||'').trim(),
        requisites: (reqsInput?.value||'').trim(),
        note: (noteInput?.value||'').trim(),
        qr_filename: qrFile?.files?.[0]?.name || null
      };

      // 1) Внутри Telegram — отправка в бота (web_app_data)
      if (tg && tg.sendData){
        try {
          tg.sendData(JSON.stringify(payload));
          alert('Заявка отправлена.');
        } catch(e){
          console.warn('sendData error', e);
          alert('Ошибка передачи в Telegram. Попробуйте ещё раз.');
        }
        return;
      }

      // 2) Открыто как сайт — уходим в API
      const r = await fetch(`${API_BASE}/order`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
    } finally { sending = false; }
  }

  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
