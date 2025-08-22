// index.js — «бело-голубой» UI + отправка заявки в бота (WebApp)
// index.js v42 — селектор города только для наличных; плитки с рус. названиями; отправка заявки
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

@@ -22,43 +22,41 @@
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
  let fromPayType = 'cash';     // cash | bank | crypto
  let toPayType   = 'cash';     // cash | bank | crypto | cnpay
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let selFrom     = null;       // code
  let selTo       = null;       // code
  let currentQuote = { rate:null,total:null };

  // Telegram init
  if (tg) {
    try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){}
  } else if (hint) { hint.hidden = false; }
  // ping webapp (бот увидит пользователя)
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){} }
  else if (hint) { hint.hidden = false; }

  const clear = (node)=>{ while(node.firstChild) node.removeChild(node.firstChild); };
  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function tile(item, side){
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `
      <div class="ico"><img src="${item.icon}" width="36" height="36" alt=""></div>
      <div class="ico"><img src="${item.icon}" alt=""></div>
      <div class="cap">${item.nameRu}</div>
    `;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      recalc();
      // QR только если ПОЛУЧАЮ китайские сервисы
      const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
      qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
      qrBox.hidden = !(toPayType==='cnpay' && side==='to' && selTo && cnpay.includes(selTo));
    });
    return btn;
  }
@@ -74,6 +72,7 @@
  }

  function refreshFrom(){
    // селектор города показываем ТОЛЬКО для наличных
    fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING.currencies(fromPayType, cityFrom, 'from');
    renderTiles(fromWrap, list, 'from');
@@ -82,11 +81,13 @@
  }

  function refreshTo(){
    // селектор города показываем ТОЛЬКО для наличных
    toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING.currencies(toPayType, cityTo, 'to');
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    // QR блок — показывать, если выбраны китайские сервисы
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    qrBox.hidden = !(toPayType==='cnpay' && selTo && cnpay.includes(selTo));
  }
@@ -105,6 +106,7 @@
    totalVal.textContent = q.totalText;
  }

  // chips handlers
  function wireChips(box, cb){
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
@@ -113,13 +115,15 @@
        cb(btn.dataset.type);
      });
    });
    // activate first
    const first = box.querySelector('.chip');
    if (first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  wireChips(fromPayBox, (type)=>{ fromPayType = type; refreshFrom(); recalc(); });
  wireChips(toPayBox,   (type)=>{ toPayType   = type; refreshTo();  recalc(); });

  // init selects (будут видимы только при cash)
  cityFromSel?.addEventListener('change', ()=>{ cityFrom = cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo   = cityToSel.value;   refreshTo();  recalc(); });

@@ -128,7 +132,7 @@
  refreshTo();
  recalc();

  // ОТПРАВКА ЗАЯВКИ
  // ОТПРАВКА ЗАЯВКИ (WebApp)
  sendBtn?.addEventListener('click', async ()=>{
    const payload = {
      type: 'order',
@@ -146,24 +150,18 @@
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
        tg.sendData(JSON.stringify(payload)); // бот ловит web_app_data
        tg.close();
      } catch (e) {
        alert('Ошибка отправки в Telegram. Попробуйте ещё раз.');
      }
    } else {
      alert('Чтобы отправить заявку, откройте этот калькулятор через Telegram (WebApp).');
      alert('Откройте форму через Telegram WebApp, чтобы отправить заявку.');
    }
  });
})();
