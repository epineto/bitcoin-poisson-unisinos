// Seção Dados: ciclos de dificuldade, tratamento dos horários fora de ordem e ficha dos dados.
import { $, $$, css, fmt, fmtInt } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';
import { t, onLang, fmtData as dm, fmtDiaMes } from './i18n.js';


export function iniciarDados(S) {
  const R = S.D.res, cy = $('#dad-ciclos'), C = R.ciclos;
  let trat = 'ordenar';

  function desenharCiclos() {
    const ymin = 8.5, ymax = 11.5;
    const q = quadro(cy, { xlim: [0, C.length], ylim: [ymin, ymax], xlabel: t('dad.ax.x'), ylabel: t('dad.ax.y'), xticks: [], yticks: [9, 9.5, 10, 10.5, 11], yfmt: (v) => fmt(v, 1), L: 48 });
    cy.__q = q;
    const { ctx } = q, bw = q.X(1) - q.X(0);
    C.forEach((c, i) => {
      ctx.fillStyle = c.intervalo_medio_min > 10 ? css('--c-mod') : css('--c-obs'); ctx.globalAlpha = 0.85;
      ctx.fillRect(q.X(i) + 4, q.Y(c.intervalo_medio_min), bw - 8, q.Y(ymin) - q.Y(c.intervalo_medio_min)); ctx.globalAlpha = 1;
      ctx.fillStyle = css('--g-texto'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '11px Arial, sans-serif';
      ctx.fillText(fmtDiaMes(c.data_ini), q.X(i + 0.5), q.h - q.B + 5);
      ctx.fillStyle = css('--texto'); ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Arial, sans-serif'; ctx.fillText(fmt(c.intervalo_medio_min, 1), q.X(i + 0.5), q.Y(c.intervalo_medio_min) - 2);
    });
    linha(q, [0, C.length], [10, 10], { cor: css('--c-aux'), largura: 2.5, tracejado: [7, 4] });
    legenda(q, [{ nome: t('dad.leg.alvo'), cor: css('--c-aux'), tracejado: [7, 4] }]);
  }
  ligar(cy, desenharCiclos, (px, q) => {
    if (!q) return null;
    const i = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)); if (i < 0 || i >= C.length) return null;
    const c = C[i];
    return { x: q.X(i + 0.5), y: 6, html: `<b>${t('dad.dica.t', { c: c.ciclo, d: dm(c.data_ini) })}</b>${t('dad.dica.im')}: <b style="display:inline">${fmt(c.intervalo_medio_min, 2)} min</b><br>${t('dad.dica.bh', { b: fmt(c.blocos_por_hora, 2), d: fmt(c.desvio_vs_10min_pct, 1) })}<br>${t('dad.dica.dif', { v: fmt(c.dificuldade / 1e12, 1) })}` };
  });
  const cr = R.ciclos_resumo, ult = C[C.length - 1];
  const textoCiclos = () => { $('#dad-ciclos-txt').textContent = t('dad.ciclos.txt', { n: cr.n_ciclos, a: fmt(cr.ciclo_min_intervalo, 2), b: fmt(cr.ciclo_max_intervalo, 2), p: fmt(cr.p_permutacao, 3), rp: fmt(cr.reg_p, 2), d: dm(ult.data_ini), pc: fmt(ult.desvio_vs_10min_pct, 0) }); };
  textoCiclos();

  function tratamento() {
    const s = R.sens_limpeza[trat];
    $('#dad-hud').innerHTML = [[t('dad.hud.n'), fmtInt(s.n)], [t('dad.hud.media'), `${fmt(s.media_min, 2)} min`], [t('dad.hud.gama'), fmt(s.forma_gama, 3)], [t('dad.hud.ks'), fmt(s.KS, 4)], [t('dad.hud.p'), fmt(s.KS_p_boot, 3)], [t('dad.hud.p60'), `${fmt(s.P60 * 100, 3)}%`]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#dad-trat-txt').textContent = t('dad.trat.' + trat);
  }
  $$('#dad-trat button').forEach((b) => b.addEventListener('click', () => { trat = b.dataset.t; $$('#dad-trat button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); tratamento(); }));
  const J = R.janela;
  function textosFixos() {
    // #dad-pct fica dentro de um parágrafo traduzido por data-i18n-html: é preenchido de novo a cada troca de idioma
    $('#dad-pct').textContent = t('dad.pct', { p: fmt(R.limpeza.pct_nao_positivos, 1), a: fmtInt(R.limpeza.n_nao_positivos), b: fmtInt(R.limpeza.n_intervalos) });
    $('#dad-proto').innerHTML = [[t('dad.proto.fonte'), t('dad.proto.fonte.v')], [t('dad.proto.blocos'), t('dad.proto.blocos.v', { n: fmtInt(R.limpeza.n_blocos) })], [t('dad.proto.alturas'), t('g.faixa', { a: fmtInt(J.altura_ini), b: fmtInt(J.altura_fim) })], [t('dad.proto.periodo'), t('g.faixa', { a: dm(J.data_ini), b: dm(J.data_fim) })],
      [t('dad.hud.n'), fmtInt(R.limpeza.n_usados)], [t('dad.proto.download'), t('dad.proto.download.v')], [t('dad.proto.sha'), 'cf5f75ce…8ef38']].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  }
  textosFixos();
  onLang(() => { textosFixos(); textoCiclos(); tratamento(); desenharCiclos(); });   // o tratamento escolhido é mantido
  tratamento(); desenharCiclos();
  return { ativar: desenharCiclos };
}
