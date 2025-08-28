// /opt/poizexchange1/www/index.js  (или в твоём репо)
(function () {
  const tg = window.Telegram?.WebApp || null;

  const sendBtn = document.getElementById('sendBtn');
  const amountInput = document.getElementById('amount');

  // Этот пинг нужен, чтобы в боте появились WEBAPP_RAW логи и чтобы Telegram "проснулся"
  if (tg) { try { tg.expand(); tg.ready(); tg.sendData(JSON.stringify({ action:'webapp_open' })); } catch(e){} }

  // ====== ваш существующий код работы с плитками/расчётом оставить как есть ======
  // Важно: ниже только надёжная отправка (без закрытия webview), + сайт fallback

  async function sendOrder() {
    // Соберите payload так же, как было у вас (здесь только пример полей)
    const payload = window.__buildOrderPayload ? window.__buildOrderPayload() : null;
    if (!payload) { alert('Заполните заявку.'); return; }

    // 1) Если открыто внутри Telegram — отправляем через sendData
    let viaTelegram = false;
    try {
      if (tg?.sendData) {
        tg.sendData(JSON.stringify({ type:'order', ...payload }));
        viaTelegram = true;
        if (tg.showPopup) tg.showPopup({ title: 'Заявка отправлена', message: 'Мы скоро свяжемся с вами.' });
        else alert('Заявка отправлена. Мы скоро свяжемся с вами.');
      }
    } catch (e) {
      console.error('sendData failed', e);
    }

    // 2) Если НЕ в Telegram — шлём в REST API
    if (!viaTelegram) {
      try {
        const r = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(()=>({}));
        if (r.ok && j.ok) alert('Заявка отправлена (через сайт). Мы скоро свяжемся с вами.');
        else alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      } catch (e) {
        console.error(e);
        alert('Ошибка сети при отправке заявки. Попробуйте ещё раз.');
      }
    }
  }

  // надёжная подписка на кнопку
  if (sendBtn) {
    sendBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      sendOrder();
    });
  }

  if (amountInput) {
    ['input','change','keyup'].forEach(ev => amountInput.addEventListener(ev, ()=>{
      if (window.__recalc) window.__recalc();
    }));
  }
})();
