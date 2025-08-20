// index.js v38 — фильтрация по городу, отправка заявки с фиксацией курса
(function () {
  const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({action:'webapp_open'})); } catch(e){} }

  // DOM
  const elFromPay = document.getElementById('from-pay');
  const elToPay   = document.getElementById('to-pay');
  const boxFrom   = document.getElementById('from-currencies');
  const boxTo     = document.getElementById('to-currencies');

  const cityBoxFrom = document.getElementById('from-citybox');
  const cityBoxTo   = document.getElementById('to-citybox');
  const cityFromSel = document.getElementById('cityFrom');
  const cityToSel   = document.getElementById('cityTo');

  const amountInput = document.getElementById('amount');
  const rateVal     = document.getElementById('rateVal');
  const totalVal    = document.getElementById('totalVal');

  const contactInp   = document.getElementById('contact');
  const requisitesTa = document.getElementById('requisites');
  const noteTa       = document.getElementById('note');

  const sendBtn = document.getElementById('sendBtn');
  const hint    = document.getElementById('hint');

  const state = {
    fromPay:'cash', toPay:'cash',
    fromCity:'moscow', toCity:'moscow',
    from:null, to:null,
    amount:0,
    quote:{ rate:null, total:null, rateText:'—', totalText:'—' }
  };

  const needsCity = (k)=> (k==='cash'||k==='bank');

  function setActiveChip(container, type){
    container.querySelectorAll('.chip').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  }

  function toggleCity(){
    cityBoxFrom.hidden = !needsCity(state.fromPay);
    cityBoxTo.hidden   = !needsCity(state.toPay);
  }

  function renderTiles(container, kind, side, city){
    container.innerHTML = '';
    const list = (window.PRICING && window.PRICING.currencies) ? window.PRICING.currencies(kind, city) : [];
    if(!list.length){
      const div = document.createElement('div');
      div.className='sub'; div.style.textAlign='center'; div.style.gridColumn='1/-1';
      div.textContent='Нет доступных вариантов';
      container.appendChild(div); return;
    }

    list.forEach(item=>{
      const btn = document.createElement('button');
      btn.className='tile'; btn.type='button'; btn.dataset.code=item.code;
      btn.innerHTML=`
        <div class="ico"><img src="${item.icon}" alt="${item.code}"></div>
        <div class="cap">${item.code}</div>
        <div class="sub">${item.name||''}</div>
      `;
      btn.addEventListener('click',()=>{
        container.querySelectorAll('.tile').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
        if(side==='from') state.from=item.code; else state.to=item.code;
        recalc();
      });
      container.appendChild(btn);
    });

    const first = container.querySelector('.tile');
    if(first){
      first.classList.add('active');
      if(side==='from') state.from=first.dataset.code; else state.to=first.dataset.code;
    }
  }

  function recalc(){
    const a = parseFloat(amountInput.value||'0');
    state.amount = (isFinite(a)&&a>0)?a:0;

    if(window.PRICING && window.PRICING.quote && state.from && state.to){
      state.quote = window.PRICING.quote({from:state.from,to:state.to,amount:state.amount});
    } else {
      state.quote = { rate:null,total:null,rateText:'—',totalText:'—' };
    }
    rateVal.textContent = state.quote.rateText||'—';
    totalVal.textContent= state.quote.totalText||'—';
  }

  // listeners
  elFromPay.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    state.fromPay = b.dataset.type; setActiveChip(elFromPay,state.fromPay); toggleCity();
    renderTiles(boxFrom,state.fromPay,'from',state.fromCity); recalc();
  });
  elToPay.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    state.toPay = b.dataset.type; setActiveChip(elToPay,state.toPay); toggleCity();
    renderTiles(boxTo,state.toPay,'to',state.toCity); recalc();
  });

  cityFromSel.addEventListener('change',()=>{ state.fromCity=cityFromSel.value; renderTiles(boxFrom,state.fromPay,'from',state.fromCity); recalc(); });
  cityToSel.addEventListener('change',()=>{ state.toCity=cityToSel.value; renderTiles(boxTo,state.toPay,'to',state.toCity); recalc(); });

  amountInput.addEventListener('input', recalc);

  // init
  setActiveChip(elFromPay,state.fromPay);
  setActiveChip(elToPay,state.toPay);
  toggleCity();
  renderTiles(boxFrom,state.fromPay,'from',state.fromCity);
  renderTiles(boxTo,state.toPay,'to',state.toCity);
  recalc();

  // Отправка заявки + фиксация курса на 30 минут
  sendBtn.addEventListener('click', ()=>{
    const now = Date.now();
    const payload = {
      type:'order',
      from_pay:state.fromPay, to_pay:state.toPay,
      from_city:state.fromCity, to_city:state.toCity,
      from_currency:state.from, to_currency:state.to,
      amount:state.amount,
      rate:state.quote.rate, total:state.quote.total,
      rate_locked:true,
      rate_lock_until: now + 30*60*1000,  // +30 минут
      contact:(contactInp.value||'').trim(),
      requisites:(requisitesTa.value||'').trim(),
      note:(noteTa.value||'').trim()
    };

    if(tg){
      try{ tg.sendData(JSON.stringify(payload)); tg.close(); }
      catch(e){ console.error(e); alert('Не удалось отправить заявку через Telegram.'); }
    }else{
      hint.hidden=false;
      alert('Откройте форму из бота в Telegram, чтобы отправить заявку напрямую.');
    }
  });
})();
