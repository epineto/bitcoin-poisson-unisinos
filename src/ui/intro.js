// Seção Início: números-chave calculados a partir dos dados reais.
import { $, fmt, fmtInt } from './util.js';

export function iniciarIntro(S) {
  const R = S.D.res, d = R.descritiva, fd = (x) => x.split('-').reverse().join('/');
  const itens = [[fmtInt(R.limpeza.n_blocos), 'blocos reais consecutivos'], [`${fmt(d.media_min, 2)} min`, 'intervalo médio (alvo: 10 min)'], [fmt(d.desvio_min / d.media_min, 2), 'desvio ÷ média (Exponencial: 1)'],
    [fmt(R.contagem.indice_dispersao, 2), 'índice de dispersão por hora (Poisson: 1)'], [fmt(R.ajuste.KS_p_boot, 3), 'p do KS com bootstrap: desvio pequeno, mas detectável']];
  $('#hero-nums').innerHTML = itens.map(([a, b]) => `<div><strong>${a}</strong><span>${b}</span></div>`).join('');
  $('#ini-periodo').textContent = `um período de ${fd(R.janela.data_ini)} a ${fd(R.janela.data_fim)}`;
  return {};
}
