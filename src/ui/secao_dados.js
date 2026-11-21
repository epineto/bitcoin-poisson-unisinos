// Seção Dados: ciclos de dificuldade, tratamento dos horários fora de ordem e ficha dos dados.
import { $, $$, css, fmt, fmtInt } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';

const TRAT = {
  ordenar: 'Ordenar os horários preserva o tempo total da janela; é o tratamento principal e dá o melhor ajuste.',
  descartar: 'Descartar os intervalos ruins joga fora tempo real (intervalos longos que “absorvem” o atraso do horário). A média sobe e o KS rejeita a Exponencial com força.',
  trocar_por_1s: 'Trocar por 1 segundo cria muitos intervalos minúsculos artificiais: a forma da Gama cai abaixo de 1 e o KS também rejeita.',
};
const dm = (d) => d.split('-').reverse().join('/');

export function iniciarDados(S) {
  const R = S.D.res, cy = $('#dad-ciclos'), C = R.ciclos;
  let trat = 'ordenar';

  function desenharCiclos() {
    const ymin = 8.5, ymax = 11.5;
    const q = quadro(cy, { xlim: [0, C.length], ylim: [ymin, ymax], xlabel: 'ciclo (data de início)', ylabel: 'intervalo médio (min)', xticks: [], yticks: [9, 9.5, 10, 10.5, 11], yfmt: (v) => fmt(v, 1), L: 48 });
    cy.__q = q;
    const { ctx } = q, bw = q.X(1) - q.X(0);
    C.forEach((c, i) => {
      ctx.fillStyle = c.intervalo_medio_min > 10 ? css('--c-mod') : css('--c-obs'); ctx.globalAlpha = 0.85;
      ctx.fillRect(q.X(i) + 4, q.Y(c.intervalo_medio_min), bw - 8, q.Y(ymin) - q.Y(c.intervalo_medio_min)); ctx.globalAlpha = 1;
      ctx.fillStyle = css('--g-texto'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText(c.data_ini.slice(8, 10) + '/' + c.data_ini.slice(5, 7), q.X(i + 0.5), q.h - q.B + 5);
      ctx.fillStyle = css('--texto'); ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Arial, sans-serif'; ctx.fillText(fmt(c.intervalo_medio_min, 1), q.X(i + 0.5), q.Y(c.intervalo_medio_min) - 2);
    });
    linha(q, [0, C.length], [10, 10], { cor: css('--c-aux'), largura: 2.5, tracejado: [7, 4] });
    legenda(q, [{ nome: 'alvo do protocolo: 10 min', cor: css('--c-aux'), tracejado: [7, 4] }]);
  }
  ligar(cy, desenharCiclos, (px, q) => {
    if (!q) return null;
    const i = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)); if (i < 0 || i >= C.length) return null;
    const c = C[i];
    return { x: q.X(i + 0.5), y: 6, html: `<b>Ciclo ${c.ciclo} (desde ${dm(c.data_ini)})</b>intervalo médio: <b style="display:inline">${fmt(c.intervalo_medio_min, 2)} min</b><br>${fmt(c.blocos_por_hora, 2)} blocos/h; desvio ${fmt(c.desvio_vs_10min_pct, 1)}%<br>dificuldade ${fmt(c.dificuldade / 1e12, 1)} T` };
  });
  const cr = R.ciclos_resumo, ult = C[C.length - 1];
  $('#dad-ciclos-txt').textContent = `Os ${cr.n_ciclos} ciclos variam de ${fmt(cr.ciclo_min_intervalo, 2)} a ${fmt(cr.ciclo_max_intervalo, 2)} min: diferenças maiores que o acaso (permutação, p = ${fmt(cr.p_permutacao, 3)}), mas sem tendência linear (p = ${fmt(cr.reg_p, 2)}). O último ciclo (desde ${dm(ult.data_ini)}) ficou ${fmt(ult.desvio_vs_10min_pct, 0)}% mais lento que o alvo; a causa (variação de hashrate) não é verificada aqui.`;

  function tratamento() {
    const s = R.sens_limpeza[trat];
    $('#dad-hud').innerHTML = [['Intervalos usados', fmtInt(s.n)], ['Média', `${fmt(s.media_min, 2)} min`], ['Forma da Gama (1 = Exponencial)', fmt(s.forma_gama, 3)], ['Distância KS', fmt(s.KS, 4)], ['p do KS (bootstrap)', fmt(s.KS_p_boot, 3)], ['P(espera > 60 min)', `${fmt(s.P60 * 100, 3)}%`]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#dad-trat-txt').textContent = TRAT[trat];
  }
  $$('#dad-trat button').forEach((b) => b.addEventListener('click', () => { trat = b.dataset.t; $$('#dad-trat button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); tratamento(); }));
  $('#dad-pct').textContent = `${fmt(R.limpeza.pct_nao_positivos, 1)}% (${fmtInt(R.limpeza.n_nao_positivos)} de ${fmtInt(R.limpeza.n_intervalos)})`;
  const J = R.janela;
  $('#dad-proto').innerHTML = [['Fonte', 'mempool.space (API pública)'], ['Blocos', `${fmtInt(R.limpeza.n_blocos)} consecutivos`], ['Alturas', `${fmtInt(J.altura_ini)} a ${fmtInt(J.altura_fim)}`], ['Período', `${dm(J.data_ini)} a ${dm(J.data_fim)}`],
    ['Intervalos usados', fmtInt(R.limpeza.n_usados)], ['Download', '21/11/2026 (UTC)'], ['SHA-256 do CSV', 'cf5f75ce…8ef38']].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  tratamento(); desenharCiclos();
  return { ativar: desenharCiclos };
}
