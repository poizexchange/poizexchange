// index.js — UI + отправка заявки; работает в Telegram WebApp.
// При открытии не из Telegram показывает кнопку "Открыть в Telegram".
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  // если не в Telegram — показать кнопку "Открыть в Telegram"
  const notInTg = document.getElementById('notInTg');
  const openLink = document.getElementById('openInTgLink');
  if (!tg) {
    if (notInTg) notInTg.classList.remove('hidden');
    if (openLink) {
      const payload = encodeURIComponent(JSON.stringify({action:'open'}));
      // deep link в bot, веб-апп откроется как menu button (нужно настроить в @BotFather) или через startapp
      openLink.href = `https://t.me/${window.BOT_USERNAME}?startapp=${payload}`;
      openLink.target = "_blank";
    }
  } else {
    try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){}
  }

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
  const fixMinutesInput = document.getElementById('fixMinutes');
  const qrBox = document.getElementById('qrbox');
  const qrFile = document.getElementById('qrfile');
  const sendBtn = document.getElementById('sendBtn');

  // state
  let fromPayType = 'cash';
  let toPayType   = 'cash';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null,total:null };

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

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
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.classList.toggle('hidden', !(toPayType==='cnpay' && side==='to' && selTo && cnpay.includes(selTo)));
    });
    return btn;
  }

  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelectorAll(`[data-code="${code}"]`).forEach(t=>t.classList.add('active'));
  }

  function renderTiles(container, list, side){
    clear(container);
    if (!list || !list.length){
      const p = document.createElement('div');
      p.textContent = 'Нет доступных вариантов для текущих настроек.';
      container.appendChild(p);
      return;
    }
    list.forEach(item=> container.appendChild(tile(item, side)));
  }

  function refreshFrom(){
    fromCityBox.classList.toggle('hidden', fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
    selFrom = list?.[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }

  function refreshTo(){
    toCityBox.classList.toggle('hidden', toPayType !== 'cash');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list?.[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox.classList.toggle('hidden', !(toPayType==='cnpay' && selTo && cnpay.includes(selTo)));
  }

  function recalc(){
    const amount = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0){
      rateVal.value = '—';
      totalVal.value = '—';
      currentQuote = {rate:null,total:null};
      return;
    }
    const q = window.PRICING.quote({ from:selFrom, to:selTo, amount });
    currentQuote = q;
    rateVal.value  = q.rateText;
    totalVal.value = q.totalText;
  }

  function wireChips(box, cb){
    const buttons = Array.from(box.querySelectorAll('.chip'));
    buttons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        buttons.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        cb(btn.dataset.type);
      });
    });
    // активируем первую
    if (buttons[0]) { buttons[0].classList.add('active'); cb(buttons[0].dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc();  });

  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });
  amountInput?.addEventListener('input', recalc);

  // первичная инициализация
  refreshFrom();
  refreshTo();
  recalc();

  // отправка заявки
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
      fix_minutes: Math.max(5, Math.min(120, Number(fixMinutesInput.value||30))),
    };

    const file = qrFile?.files?.[0];
    if (file) payload.qr_filename = file.name; // только имя (сам файл фронт не шлёт в бот)

    // безопасность: отправлять напрямую в Bot API из браузера нельзя (токен утечёт),
    // поэтому либо Telegram WebApp (sendData), либо ваш серверный API.
    if (tg) {
      try {
        tg.sendData(JSON.stringify(payload));
        tg.close();
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      // не в Telegram: даём ссылку открыть форму в Telegram
      alert('Чтобы отправить заявку, откройте эту форму внутри Telegram.');
      if (openLink) openLink.click();
    }
  });
})();
