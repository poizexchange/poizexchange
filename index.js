// index.js v46 — селектор города только для наличных; плитки с рус. названиями; отправка заявки
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
  let fromPayType = 'cash';     // cash | bank | crypto
  let toPayType   = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;       // code
  let selTo       = null;       // code
  let currentQuote = { rate:null,total:null };

  // ping webapp (бот увидит пользователя)
  try {
    if (tg) { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); }
    else if (hint) { hint.hidden = false; }
  } catch(e){}

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function renderEmpty(container){
    const div = document.createElement('div');
    div.className = 'sub';
    div.style.padding = '8px';
    div.textContent = 'Варианты недоступны';
    container.appendChild(div);
  }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.type = 'button';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      // QR только если ПОЛУЧАЮ китайские сервисы
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.hidden = !(toPayType==='cnpay' && side==='to' && selTo && cnpay.includes(selTo));
    });
    return btn;
  }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    if (!Array.isArray(list) || list.length === 0) {
      renderEmpty(container);
      return;
    }
    list.forEach(item=> container.appendChild(tile(item, side)));
  }

  function refreshFrom(){
    // селектор города показываем ТОЛЬКО для наличных
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(fromPayType, cityFrom, 'from') : [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list && list[0] ? list[0].code : null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // селектор города показываем ТОЛЬКО для наличных
    toCityBox.hidden = (toPayType !== 'cash');
    const list = (window.PRICING && window.PRICING.currencies)
      ? window.PRICING.currencies(toPayType, cityTo, 'to') : [];
    renderTiles(toWrap, list, 'to');
    selTo = list && list[0] ? list[0].code : null;
    if (selTo) markActive(toWrap, selTo);
    // QR блок — показывать, если выбраны китайские сервисы
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
  }

  function recalc(){
    const amount = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING){
      rateVal.textContent = '—';
      totalVal.textContent = '—';
      currentQuote = {rate:null,total:null};
      return;
    }
    try{
      const q = window.PRICING.quote({ from:selFrom, to:selTo, amount });
      currentQuote = q;
      rateVal.textContent  = q.rateText;
      totalVal.textContent = q.totalText;
    }catch(e){
      console.error('recalc error', e);
      rateVal.textContent = '—';
      totalVal.textContent = '—';
      currentQuote = {rate:null,total:null};
    }
  }

  // chips handlers
  function wireChips(box, cb){
    const chips = box.querySelectorAll('.chip');
    chips.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        chips.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // активируем первую
    const first = chips[0];
    if (first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // init selects (видимы только при cash)
  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  // первичный рендер (страхуемся, если хэндлеры не отработали)
  refreshFrom();
  refreshTo();
  recalc();

  // ОТПРАВКА ЗАЯВКИ (WebApp)
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
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name;

    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload)); // бот ловит web_app_data
        try { tg.showAlert('Заявка отправлена'); } catch(e){}
        setTimeout(() => { try { tg.close(); } catch(e) {} }, 150);
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      alert('Откройте форму через Telegram WebApp, чтобы отправить заявку.');
    }
  });
})();
