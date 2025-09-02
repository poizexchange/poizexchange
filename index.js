// index.js v71 — стабильный UI, мгновенный пересчет, Telegram + fallback REST
(function () {
  const tg = window.Telegram?.WebApp;

  // DOM
  const fromPayBox = document.getElementById('from-pay');
  const toPayBox   = document.getElementById('to-pay');
  const fromCityBox= document.getElementById('from-citybox');
  const toCityBox  = document.getElementById('to-citybox');
  const cityFromSel= document.getElementById('cityFrom');
  const cityToSel  = document.getElementById('cityTo');
  const fromWrap   = document.getElementById('from-currencies');
  const toWrap     = document.getElementById('to-currencies');
  const amountInput= document.getElementById('amount');
  const rateVal    = document.getElementById('rateVal');
  const totalVal   = document.getElementById('totalVal');
  const contactInput = document.getElementById('contact');
  const reqsInput    = document.getElementById('requisites');
  const noteInput    = document.getElementById('note');
  const qrBox      = document.getElementById('qrbox');
  const qrFile     = document.getElementById('qrfile');
  const sendBtn    = document.getElementById('sendBtn');
  const hint       = document.getElementById('hint');

  // state
  let fromPayType='cash', toPayType='cash';
  let cityFrom='moscow', cityTo='moscow';
  let selFrom=null, selTo=null;
  let currentQuote={rate:null,total:null,rateText:'—',totalText:'—'};

  if (tg){ try{ tg.expand(); tg.ready(); }catch(e){} } else if (hint) hint.hidden=false;

  // helpers
  const clear = (n)=>{ while(n.firstChild) n.removeChild(n.firstChild); };
  function tile(item, side){
    const btn=document.createElement('button');
    btn.type='button'; btn.className='tile'; btn.dataset.code=item.code;
    btn.innerHTML=`<div class="ico"><img src="${item.icon}" alt=""></div><div class="cap">${item.nameRu}</div>`;
    btn.onclick=()=>{ 
      if (side==='from'){ selFrom=item.code; markActive(fromWrap,item.code); }
      else { selTo=item.code; markActive(toWrap,item.code); }
      updateQr(); recalc();
    };
    return btn;
  }
  function markActive(container, code){
    container.querySelectorAll('.tile').forEach(t=>t.classList.remove('active'));
    container.querySelector(`[data-code="${code}"]`)?.classList.add('active');
  }
  function renderTiles(container, list, side){ clear(container); list.forEach(i=>container.appendChild(tile(i,side))); }
  function updateQr(){ const CN=['ALIPAY','WECHAT','CN_CARD']; if(qrBox) qrBox.hidden=!(toPayType==='cnpay' && selTo && CN.includes(selTo)); }

  // render lists
  function refreshFrom(){
    if (fromCityBox) fromCityBox.hidden = (fromPayType!=='cash');
    const list = window.PRICING?.currencies(fromPayType, cityFrom, 'from') || [];
    renderTiles(fromWrap, list, 'from');
    selFrom = list[0]?.code || null; if (selFrom) markActive(fromWrap, selFrom);
  }
  function refreshTo(){
    if (toCityBox) toCityBox.hidden = (toPayType!=='cash');
    const list = window.PRICING?.currencies(toPayType, cityTo, 'to') || [];
    renderTiles(toWrap, list, 'to');
    selTo = list[0]?.code || null; if (selTo) markActive(toWrap, selTo);
    updateQr();
  }

  // recalc (курс показываем за получаемую валюту)
  function recalc(){
    const amt = Number(amountInput.value || 0);
    if (!selFrom || !selTo || !(amt>0) || !window.PRICING?.quote){
      rateVal.textContent='—'; totalVal.textContent='—'; currentQuote={rate:null,total:null,rateText:'—',totalText:'—'}; return;
    }
    const q = window.PRICING.quote({
      from: selFrom, to: selTo, amount: amt,
      fromKind: fromPayType, toKind: toPayType,
      cityFrom, cityTo
    });
    currentQuote = q || {rate:null,total:null,rateText:'—',totalText:'—'};
    rateVal.textContent  = q?.rateText  ?? '—';
    totalVal.textContent = q?.totalText ?? '—';
  }

  // chips
  function wireChips(box, cb){
    box.querySelectorAll('.chip').forEach(btn=>{
      btn.onclick=()=>{ box.querySelectorAll('.chip').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); cb(btn.dataset.type); };
    });
    const first=box.querySelector('.chip'); if(first){ first.classList.add('active'); cb(first.dataset.type); }
  }

  // events
  wireChips(fromPayBox, t=>{ fromPayType=t; refreshFrom(); recalc(); });
  wireChips(toPayBox,   t=>{ toPayType=t;   refreshTo();  recalc(); });
  cityFromSel?.addEventListener('change', ()=>{ cityFrom=cityFromSel.value; refreshFrom(); recalc(); });
  cityToSel?.addEventListener('change',   ()=>{ cityTo=cityToSel.value;     refreshTo();  recalc(); });
  amountInput?.addEventListener('input',  recalc);
  amountInput?.addEventListener('change', recalc);
  amountInput?.addEventListener('blur',   recalc);

  // boot (ждем PRICING и подгружаем overrides с бэка)
  async function loadOverrides(){
    try {
      const r = await fetch('/api/rates', {cache:'no-store'});
      if (r.ok){ const j=await r.json(); window.PRICING?.setOverrides?.(j||{}); }
    } catch(e){}
  }
  async function boot(){
    if(!window.PRICING?.currencies){ setTimeout(boot,100); return; }
    await loadOverrides();
    refreshFrom(); refreshTo(); recalc();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // send order
  async function sendOrder(){
    const amt=+amountInput.value||0;
    if(!selFrom||!selTo){ alert('Выберите валюты.'); return; }
    if(!(amt>0))       { alert('Введите сумму.');   return; }
    if(!currentQuote.rate){ alert('Нет курса для этой пары.'); return; }

    const payload={
      type:'order',
      from_currency: selFrom, to_currency: selTo,
      from_kind: fromPayType, to_kind: toPayType,
      city_from: cityFrom, city_to: cityTo,
      amount: amt, rate: currentQuote.rate, total: currentQuote.total,
      contact: (contactInput.value||'').trim(),
      requisites: (reqsInput.value||'').trim(),
      note: (noteInput.value||'').trim(),
      qr_filename: qrFile?.files?.[0]?.name || null
    };

    // Telegram WebApp
    try{
      if (tg?.sendData){
        tg.sendData(JSON.stringify(payload));
        tg.showPopup?.({title:'Заявка отправлена', message:'Мы скоро свяжемся с вами.'});
        return;
      }
    }catch(e){}

    // Fallback REST
    try{
      const r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const j=await r.json().catch(()=>({}));
      if(r.ok && j.ok) alert('Заявка отправлена (через сайт).');
      else alert('Ошибка сети. Попробуйте ещё раз.');
    }catch(e){ alert('Ошибка сети.'); }
  }
  sendBtn?.addEventListener('click', sendOrder);
})();


  sendBtn && sendBtn.addEventListener('click', sendOrder);
})();
