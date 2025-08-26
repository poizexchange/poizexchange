// index.js v43.0 — стабильный UI + курс "за получаемую валюту" + отправка заявки
(function () {
  const tg = window.Telegram?.WebApp || null;

  // элементы
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

  // state
  let fromPayType = 'cash';
  let toPayType   = 'cash';
  let cityFrom    = 'moscow';
  let cityTo      = 'moscow';
  let selFrom     = null;
  let selTo       = null;
  let currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };

  // init Telegram WebApp
  if (tg) { try { tg.expand(); tg.ready(); } catch (e) {} }
  else if (hint) { hint.hidden = false; }

  // утилиты
  function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
  function tile(item, side){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.setAttribute('data-code', item.code);
    btn.innerHTML = `<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    btn.addEventListener('click', () => {
      if (side === 'from') { selFrom = item.code; markActive(fromWrap, item.code); }
      else { selTo = item.code; markActive(toWrap, item.code); }
      updateQrVisibility(); recalc();
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
  function updateQrVisibility(){
    const cnpay = ['ALIPAY','WECHAT','CN_CARD'];
    if (qrBox) qrBox.hidden = !(toPayType === 'cnpay' && selTo && cnpay.includes(selTo));
  }

  // рендер списков
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType !== 'cash');
    const list = window.PRICING?.currencies(fromPayType, cityFrom, 'from') || [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null;
    if (selFrom) markActive(fromWrap, selFrom);
  }
  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType !== 'cash');
    const list = window.PRICING?.currencies(toPayType, cityTo, 'to') || [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null;
    if (selTo) markActive(toWrap, selTo);
    updateQrVisibility();
  }
  function recalc(){
    const amount = Number(amountInput?.value || 0);
    if (!selFrom || !selTo || !amount || amount <= 0 || !window.PRICING?.quote){
      rateVal.textContent = '—'; totalVal.textContent = '—';
      currentQuote = { rate:null, total:null, rateText:'—', totalText:'—' };
      return;
    }
    const q = window.PRICING.quote({ from: selFrom, to: selTo, amount });
    currentQuote = q || {};
    // курс показываем "сколько FROM за 1 TO"
    if (rateVal) {
      const inv = q?.rate ? (1/q.rate) : null;
      rateVal.textContent = inv
        ? `${inv.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ${selFrom} за 1 ${selTo}`
        : '—';
    }
    if (totalVal) totalVal.textContent = q?.totalText ?? '—';
  }

  // кнопки-«чипы»
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
  cityFromSel?.addEventListener('change', ()=>{ cityFrom=cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change', ()=>{ cityTo=cityToSel.value; refreshTo(); recalc(); });

  // init
  function boot(){ if(!window.PRICING?.currencies){ setTimeout(boot,100); return; } refreshFrom(); refreshTo(); recalc();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // правила
  function validateBusinessRules(){
    if (fromPayType==='cash' && selFrom==='CNY') { alert('Отдать наличные юани нельзя.'); return false; }
    if (toPayType==='cash' && selTo==='CNY' && cityTo!=='guangzhou') { alert('Получить наличные юани можно только в Гуанчжоу.'); return false; }
    return true;
  }

  // отправка заявки
  async function sendOrder(){
    const amountNum = Number(amountInput?.value || 0);
    if (!selFrom || !selTo) { alert('Выберите валюты.'); return; }
    if (!(amountNum>0)) { alert('Введите сумму.'); return; }
    if (!currentQuote.rate) { alert('Не удалось рассчитать курс.'); return; }
    if (!validateBusinessRules()) return;

    const payload = {
      type:'order',
      from_currency:selFrom, to_currency:selTo,
      from_kind:fromPayType, to_kind:toPayType,
      city_from:cityFrom, city_to:cityTo,
      amount:amountNum, rate:currentQuote.rate, total:currentQuote.total,
      contact:(contactInput?.value||'').trim(),
      requisites:(reqsInput?.value||'').trim(),
      note:(noteInput?.value||'').trim(),
      fix_minutes:30
    };
    if (qrFile?.files?.[0]) payload.qr_filename = qrFile.files[0].name;

    let viaTelegram=false;
    try{
      if(window.Telegram?.WebApp?.sendData){
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
        viaTelegram=true;
        if(window.Telegram.WebApp.showPopup){
          window.Telegram.WebApp.showPopup({title:'Заявка отправлена',message:'Мы скоро свяжемся с вами.'});
        }else alert('Заявка отправлена.');
      }
    }catch(e){console.error(e);}
    if(!viaTelegram){
      try{
        const r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const j=await r.json().catch(()=>({}));
        if(r.ok&&j.ok) alert('Заявка отправлена (через сайт).');
        else alert('Ошибка сети.');
      }catch(e){alert('Ошибка сети.');}
    }
  }
  sendBtn?.addEventListener('click', sendOrder);
})();
