// Simple pricing (placeholder). Replace with live API when ready.
const RUB_PER = { USD:82.5, USDT:81.9, CNY:11.7, BTC:6800000, ETH:350000, XMR:13000, RUB:1 };
function quotePair(from,to,amount){
  if(!RUB_PER[from]||!RUB_PER[to]) return null;
  const rate = (to==='RUB') ? RUB_PER[from] : RUB_PER[from]/RUB_PER[to];
  return {rate, total:(amount||0)*rate};
}
