// index.js — «бело-голубой» UI + отправка заявки в бота (WebApp)
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // элементы
  const fromPayBox = document.getElementById('from-pay');
  const toPayBox   = document.getElementById('to-pay');

  const fromCityBox = document.getElementById('from-citybox');
  const toCityBox   = document.getElementById('to-citybox');

  const cityFromSel = document.getElementById('cityFrom');
  const cityToSel   = document.getElementById('cityTo');

  const fromWrap = document.getElementById('from-currencies');
  const toWrap   = document.getElementById('to-currencies');

  const amountInput = document.getElementById('amount');
  const rateVal = document.getElementById('rateVal');
  const totalVal = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput = document.getElementById('requisites');
  const noteInput = document.getElementById('note');

  const qrBox = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');

  const sendBtn = document.getElementById('sendBtn');
  const hint = document.getElementById('hint');

  // state
  let fromPayType = 'cash';
  let toPayType   = 'cash';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null,total:null };

  // Telegram init
  if (tg) {
    try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){}
  } else if (hint) { hint.hidden = false; }

  const clear = (node)=>{ while(node.firstChild) node.removeChild(node.firstChild); };

  function tile(item, side){
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" width="36" height="36" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
    });
    return btn;
  }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item=> container.appendChild(tile(item, side)));
  }

  function refreshFrom(){
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
  }

  function recalc(){
    const amount = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal.textContent = '—';
      totalVal.textContent = '—';
      currentQuote = {rate:null,total:null};
      return;
    }
    const q = window.PRICING.quote({ from:selFrom, to:selTo, amount });
    currentQuote = q;
    rateVal.textContent  = q.rateText;
    totalVal.textContent = q.totalText;
  }

  function wireChips(box, cb){
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  // первичный рендер
  refreshFrom();
  refreshTo();
  recalc();

  // ОТПРАВКА ЗАЯВКИ
  sendBtn?.addEventListener('click', async ()=>{
    const payload = {
      type: 'order',
      from_currency: selFrom,
      to_currency: selTo,
      from_kind: fromPayType,
      to_kind: toPayType,
      city_from: cityFrom,
      city_to: cityTo,
      amount: Number(amountInput.value || 0),
      rate: currentQuote.rate,
      total: currentQuote.total,
      contact: (contactInput.value || '').trim(),
      requisites: (reqsInput.value || '').trim(),
      note: (noteInput.value || '').trim(),
      fix_minutes: 30
    };

    if (!payload.from_currency || !payload.to_currency || !payload.amount || !payload.rate){
      alert('Выберите валюты и введите сумму.');
      return;
    }

    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name;

    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload));
        tg.close();
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      alert('Чтобы отправить заявку, откройте этот калькулятор через Telegram (WebApp).');
    }
  });
})();
