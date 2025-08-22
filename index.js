// index.js — фикс рендера плиток и гарантированная отправка
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // элементы (как у тебя)
  const fromPayBox = document.getElementById('from-pay');
  const toPayBox   = document.getElementById('to-pay');

  const fromCityBox = document.getElementById('from-citybox');
  const toCityBox   = document.getElementById('to-citybox');

  const cityFromSel = document.getElementById('cityFrom');
  const cityToSel   = document.getElementById('cityTo');

  const fromWrap = document.getElementById('from-currencies');
  const toWrap   = document.getElementById('to-currencies');

  const amountInput = document.getElementById('amount');
  const rateVal  = document.getElementById('rateVal');
  const totalVal = document.getElementById('totalVal');

  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');
  const qrBox  = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');
  const sendBtn= document.getElementById('sendBtn');

  // стейт
  let fromPayType = 'cash';
  let toPayType   = 'cash';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null };

  // Telegram WebApp init
  if (tg) {
    try {
      tg.expand();
      tg.ready();
      tg.sendData(JSON.stringify({ action:'webapp_open' }));
    } catch (e) {}
  }

  // Утилиты
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function tile(item, side){
    // ТВОЙ ДИЗАЙН: кнопка-плитка (тут только логика — разметка и классы остаются твоими)
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      // QR показываем только когда ПОЛУЧАЮ через китайские сервисы
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.hidden = !(toPayType==='cnpay' && side==='to' && selTo && cnpay.includes(selTo));
    });
    return btn;
  }

  function renderTiles(container, list, side){
    clear(container);
    if (!list || !list.length){
      const p = document.createElement('div');
      p.className = 'tiles-empty';
      p.textContent = 'Нет доступных вариантов для текущих настроек.';
      container.appendChild(p);
      return;
    }
    list.forEach(item=> container.appendChild(tile(item, side)));
  }

  function refreshFrom(){
    // город только для наличных
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    selFrom = list?.[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list?.[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
  }

  function recalc(){
    const amount = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal.textContent  = '—';
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
    const btns = [...box.querySelectorAll('.chip')];
    btns.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        btns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    if (btns[0]) { btns[0].classList.add('active'); cb(btns[0].dataset.type); }
  }

  // Подключение чипов
  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // Селекты города
  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

  // Первичный рендер
  refreshFrom();
  refreshTo();
  recalc();

  // Отправка заявки
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

    // Пробуем через Telegram WebApp (внутри Telegram)
    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload));
        // не закрываем моментально — даём Телеге доставить
        setTimeout(() => { try { tg.close(); } catch(e){} }, 600);
        return;
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
        return;
      }
    }

    // Если НЕ внутри Telegram — даём понятный алерт
    alert('Откройте форму через Telegram WebApp из меню бота @PoizExchangeBot, чтобы отправить заявку.');
    // здесь альтернативный канал — см. раздел 3 (backend)
  });
})();

    }
  });
})();
