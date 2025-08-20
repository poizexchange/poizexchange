// index.js v41 — рендер плиток (одна строка текста), логика городов, отправка заявки
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
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.name}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      // Показываем QR-блок только если получаем китайские сервисы
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.hidden = !(side==='to' && cnpay.includes(item.code));
    });
    return btn;
  }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>{
      const is = t.querySelector('.cap')?.textContent?.trim();
      // сравниваем по тексту? Лучше по data-code:
    });
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    // назначим active по совпадению кода — добавим data-code при создании
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    list.forEach(item=>{
      const btn = tile(item, side);
      btn.setAttribute('data-code', item.code);
      container.appendChild(btn);
    });
  }

  function refreshFrom(){
    // показываем выбор города только для кэша (логично для наличных)
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    // авто-выбор первого элемента
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    // показываем город для кэша и китайских сервисов (на всякий)
    toCityBox.hidden = !(toPayType === 'cash' || toPayType === 'cnpay');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
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

  // chips handlers
  function wireChips(box, cb){
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // activate first
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // init selects
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

    // файл QR — прикрепим название, содержимое отдельно загрузишь после
    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name;

    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload)); // бот ловит web_app_data и шлёт админу
        tg.close();                           // можно закрыть сразу (как раньше)
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      alert('Откройте форму через Telegram WebApp, чтобы отправить заявку.');
    }
  });
})();
