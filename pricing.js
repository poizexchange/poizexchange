// Simple cross-rate engine (RUB per unit)
const RUB_PER = {
  USD: 82.50,
  USDT: 81.90,
  CNY: 11.70,
  BTC: 6800000,
  ETH: 350000,
  XMR: 13000,
  RUB: 1,
};
function quotePair(from, to, amount){
  if (!RUB_PER[from] || !RUB_PER[to]) return null;
  const rate = (to === 'RUB') ? RUB_PER[from] : (RUB_PER[from] / RUB_PER[to]);
  const total = (amount||0) * rate;
  return { rate, total };
}
