// Contagem de blocos por janela contra a Poisson, índice de dispersão e Monte Carlo do índice sob Poisson.
import { $, css, fmt, fmtInt, slider } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';
import { poissonPmf } from '../core/dist.js';
import { t, onLang } from './i18n.js';
import { chegadas, contarPorJanela, media, variancia, faixaDispersaoNula } from '../core/estat.js';

export function iniciarContagem(S) {
  const D = S.D, tempos = chegadas(D.intervalos), R = D.res;
  const cb = $('#con-barras'), cs = $('#con-serie'), cm = $('#con-mc');
  const wmin = slider('con-w', (v) => (v >= 60 ? `${fmt(v / 60, v % 60 ? 2 : 0)} h` : `${v} min`) + (v >= 60 ? ` (${v} min)` : ''), () => atualizar());
  let c = [], info = {};

  function calcular() {
    c = contarPorJanela(tempos, wmin() * 60);
    const n = c.length, m = media(c), v = variancia(c), idx = v / m, [lo, hi] = faixaDispersaoNula(n);
    let kmin = Math.min(...c), kmax = Math.max(...c);
    for (let k = 0; k < 200; k++) if (poissonPmf(k, m) * n >= 0.5) { kmin = Math.min(kmin, k); kmax = Math.max(kmax, k); }
    const freq = new Array(kmax - kmin + 1).fill(0); for (const x of c) freq[x - kmin]++;
    const esp = freq.map((_, i) => n * poissonPmf(i + kmin, m));
    info = { n, m, v, idx, lo, hi, kmin, kmax, freq, esp };
  }

  function desenharBarras() {
    const { n, kmin, kmax, freq, esp } = info, ymax = Math.max(...freq, ...esp) * 1.12;
    const q = quadro(cb, { xlim: [kmin - 0.5, kmax + 0.5], ylim: [0, ymax], xlabel: t('con.ax.k'), ylabel: t('con.ax.y'), L: 60, xticks: Array.from({ length: kmax - kmin + 1 }, (_, i) => kmin + i).filter((_, i, a) => a.length <= 16 || i % Math.ceil(a.length / 12) === 0) });
    cb.__q = q;
    const { ctx } = q, bw = q.X(1) - q.X(0);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.8;
    freq.forEach((f, i) => ctx.fillRect(q.X(kmin + i - 0.5) + 1, q.Y(f), Math.max(1, bw - 2), q.Y(0) - q.Y(f)));
    ctx.globalAlpha = 1;
    const ks = freq.map((_, i) => kmin + i);
    linha(q, ks, esp, { cor: css('--c-mod'), largura: 3 });
    ctx.fillStyle = css('--c-mod'); ks.forEach((k, i) => { ctx.beginPath(); ctx.arc(q.X(k), q.Y(esp[i]), 3.5, 0, 7); ctx.fill(); });
    legenda(q, [{ nome: t('con.leg.reais'), cor: css('--c-obs'), tipo: 'caixa' }, { nome: t('con.leg.poisson'), cor: css('--c-mod') }]);
    void n;
  }
  function desenharSerie() {
    const k = Math.min(150, c.length), ys = c.slice(0, k), xs = ys.map((_, i) => i + 1), ymax = Math.max(...ys, info.m + 3) * 1.1;
    const q = quadro(cs, { xlim: [0.5, k + 0.5], ylim: [0, ymax], xlabel: t('con.ax.serie'), ylabel: t('con.ax.blocos') });
    cs.__q = q; cs.__ys = ys;
    const { ctx } = q, bw = Math.max(1, q.X(1) - q.X(0));
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.8;
    ys.forEach((y, i) => ctx.fillRect(q.X(i + 0.5) + (bw > 3 ? 0.5 : 0), q.Y(y), Math.max(1, bw - (bw > 3 ? 1 : 0)), q.Y(0) - q.Y(y)));
    ctx.globalAlpha = 1;
    linha(q, [0.5, k + 0.5], [info.m, info.m], { cor: css('--c-mod'), largura: 2, tracejado: [6, 4] });
    void xs;
  }
  function desenharMC() {
    const H = R.mc_dispersao_hist, lim = H.limites, cont = H.contagens, obs = R.contagem.indice_dispersao;
    const q = quadro(cm, { xlim: [0.9, 1.1], ylim: [0, Math.max(...cont) * 1.15], xlabel: t('con.ax.mc'), ylabel: t('con.ax.mcy'), xticks: [0.9, 0.95, 1, 1.05, 1.1], xfmt: (v) => fmt(v, 2) });
    cm.__q = q; cm.__H = H;
    const { ctx } = q, bw = q.X(lim[1]) - q.X(lim[0]);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.8;
    cont.forEach((v, i) => ctx.fillRect(q.X(lim[i]) + 0.5, q.Y(v), bw - 1, q.Y(0) - q.Y(v)));
    ctx.globalAlpha = 1;
    const marca = (x, cor, nome, tr) => { linha(q, [x, x], [0, q.y1], { cor, largura: 3, tracejado: tr }); return { nome, cor, tracejado: tr }; };
    legenda(q, [marca(obs, css('--c-mod'), t('con.leg.obs', { v: fmt(obs, 2) })), marca(R.mc.disp_nulo_q025, css('--c-aux'), t('con.leg.faixa'), [5, 4]), marca(R.mc.disp_nulo_q975, css('--c-aux'), '', [5, 4])].filter((i) => i.nome));
  }
  const desenhar = () => { desenharBarras(); desenharSerie(); desenharMC(); };

  function atualizar() {
    calcular();
    const { n, m, v, idx, lo, hi } = info, dentro = idx >= lo && idx <= hi;
    $('#con-hud').innerHTML = [[t('con.hud.janelas'), fmtInt(n)], [t('con.hud.media'), fmt(m, 2)], [t('con.hud.var'), fmt(v, 2)], [t('con.hud.idx'), fmt(idx, 3)], [t('con.hud.faixa'), t('g.faixa', { a: fmt(lo, 2), b: fmt(hi, 2) })]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#con-leitura').textContent = t('con.l.pre', { w: wmin(), m: fmt(m, 2) }) + (dentro ? t('con.l.dentro')
      : idx > hi ? t('con.l.acima', { i: fmt(idx, 2) })
        : t('con.l.abaixo'));
    desenhar();
  }
  const textoMC = () => { $('#con-mc-txt').textContent = t('con.mc.txt', { n: fmtInt(R.mc_dispersao_hist.n), a: fmt(R.mc.disp_nulo_q025, 3), b: fmt(R.mc.disp_nulo_q975, 3), o: fmt(R.contagem.indice_dispersao, 3), p: fmt(R.mc.disp_p_unilateral, 3) }); };
  textoMC();

  ligar(cb, desenharBarras, (px, q) => {
    if (!q) return null;
    const k = Math.round(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)), i = k - info.kmin; if (i < 0 || i >= info.freq.length) return null;
    return { x: q.X(k), html: `<b>${t('con.dica.k', { k })}</b>${t('con.leg.reais')}: <b style="display:inline">${fmtInt(info.freq[i])}</b><br>${t('con.dica.poisson')}: <b style="display:inline">${fmt(info.esp[i], 1)}</b>` };
  });
  ligar(cs, desenharSerie, (px, q) => {
    if (!q || !cs.__ys) return null;
    const i = Math.round(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)) - 1; if (i < 0 || i >= cs.__ys.length) return null;
    return { x: q.X(i + 1), html: `<b>${t('con.dica.janela', { i: i + 1 })}</b>${t('con.dica.blocos', { n: fmtInt(cs.__ys[i]) })}` };
  });
  ligar(cm, desenharMC, (px, q) => {
    const H = cm.__H; if (!q || !H) return null;
    const v = q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0), i = Math.floor((v - H.limites[0]) / (H.limites[1] - H.limites[0])); if (i < 0 || i >= H.contagens.length) return null;
    return { x: q.X((H.limites[i] + H.limites[i + 1]) / 2), html: `<b>${t('g.faixa', { a: fmt(H.limites[i], 3), b: fmt(H.limites[i + 1], 3) })}</b>${t('con.dica.series', { n: fmtInt(H.contagens[i]) })}` };
  });
  onLang(() => { textoMC(); atualizar(); });   // só textos e gráficos; a janela escolhida no slider é mantida
  atualizar();
  return { ativar: desenhar, __estado: () => ({ ...info, freq: undefined, esp: undefined }) };
}
