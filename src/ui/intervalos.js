// Intervalos reais: histograma e QQ-plot com modelo escolhido (Exponencial, Gama, Weibull), parâmetros ajustáveis, AIC e KS.
import { $, $$, css, fmt, fmtInt, slider } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';
import { MODELOS, logVerossimilhanca, aic, bic } from '../core/dist.js';
import { histograma, pontosQQ, estatisticaKS } from '../core/estat.js';

const CFG = {
  Exponencial: { p1: ['Média (min)', 5, 15, 0.05, (par) => par[0] / 60], p2: null },
  Gama: { p1: ['Forma', 0.5, 3, 0.01, (par) => par[0]], p2: ['Escala (min)', 0.5, 20, 0.05, (par) => par[1] / 60] },
  Weibull: { p1: ['Forma', 0.5, 3, 0.01, (par) => par[0]], p2: ['Escala (min)', 1, 20, 0.05, (par) => par[1] / 60] },
};

export function iniciarIntervalos(S) {
  const D = S.D, ord = S.ord, n = ord.length, mod = {};
  for (const m of D.res.modelos) mod[m.modelo] = { par: m.parametros, AIC: m.AIC, BIC: m.BIC };
  const melhorAIC = Math.min(...D.res.modelos.map((m) => m.AIC));
  let nome = 'Exponencial', pars = mod.Exponencial.par.slice(), cache = null;

  slider('int-p1', (v) => fmt(v, 2), (v) => definirPar(0, v));
  slider('int-p2', (v) => fmt(v, 2), (v) => definirPar(1, v));
  const larg = slider('int-bins', (v) => `${fmt(v, 1)} min`, () => desenhar());
  const hist = $('#int-hist'), qq = $('#int-qq');

  function definirPar(i, v) {
    if (nome === 'Exponencial') pars = [v * 60];
    else if (i === 0) pars = [v, pars[1]]; else pars = [pars[0], v * 60];
    atualizar();
  }
  function configurarSliders() {
    const c = CFG[nome];
    const preparar = (id, def) => {
      const e = $('#' + id);
      if (!def) { e.closest('.campo').hidden = true; return; }
      e.closest('.campo').hidden = false; $('#' + id + '-nome').textContent = def[0];
      e.min = def[1]; e.max = def[2]; e.step = def[3]; e.value = def[4](pars);
      $('#' + id + '-v').textContent = fmt(Number(e.value), 2);
    };
    preparar('int-p1', c.p1); preparar('int-p2', c.p2);
  }
  function modeloAtual() {
    const M = MODELOS[nome], chave = nome + pars.join();
    if (!cache || cache.chave !== chave) {
      const ll = logVerossimilhanca(M, pars, ord);
      cache = { chave, ll, aic: aic(ll, M.k), bic: bic(ll, M.k, n), ks: estatisticaKS(ord, (x) => M.cdf(x, pars)) };
    }
    return { M, ...cache };
  }

  function desenharHist() {
    const { M } = modeloAtual(), w = larg(), nb = Math.floor(60 / w), cont = histograma(Array.from(ord, (v) => v / 60), 0, nb * w, nb);
    const dens = cont.cont.map((c) => c / (n * w));
    const xs = Array.from({ length: 241 }, (_, i) => i / 4), ys = xs.map((x) => M.pdf(x * 60, pars) * 60);
    const ymax = Math.max(...dens, ...ys.filter((v) => Number.isFinite(v) && v < 1)) * 1.1;
    const q = quadro(hist, { xlim: [0, nb * w], ylim: [0, ymax], xlabel: 'intervalo entre blocos (min)', ylabel: 'densidade', yfmt: (v) => fmt(v, 2), xticks: [0, 10, 20, 30, 40, 50, 60].filter((v) => v <= nb * w) });
    hist.__q = q; hist.__d = { dens, w, nb, M };
    const { ctx } = q, bw = q.X(w) - q.X(0);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.75;
    dens.forEach((d, i) => ctx.fillRect(q.X(i * w) + 1, q.Y(d), Math.max(1, bw - 2), q.Y(0) - q.Y(d)));
    ctx.globalAlpha = 1;
    linha(q, xs, ys, { cor: css('--c-mod'), largura: 3 });
    legenda(q, [{ nome: 'intervalos reais', cor: css('--c-obs'), tipo: 'caixa' }, { nome: `modelo: ${nome}`, cor: css('--c-mod') }]);
  }
  function desenharQQ() {
    const { M } = modeloAtual(), pts = pontosQQ(ord, (p) => M.ppf(p, pars)).map((p) => ({ p: p.p, emp: p.emp / 60, mod: p.mod / 60 }));
    const lim = Math.ceil(Math.max(...pts.map((p) => p.emp)) / 10) * 10;
    const q = quadro(qq, { xlim: [0, lim], ylim: [0, lim], xlabel: `quantil do modelo ${nome} (min)`, ylabel: 'quantil real (min)', L: 50 });
    qq.__q = q; qq.__pts = pts;
    const { ctx } = q;
    linha(q, [0, lim], [0, lim], { cor: css('--g-eixo'), largura: 2, tracejado: [6, 4] });
    ctx.save(); ctx.beginPath(); ctx.rect(q.L, q.T, q.w - q.L - q.R, q.h - q.T - q.B); ctx.clip();
    ctx.fillStyle = css('--c-obs'); ctx.strokeStyle = css('--cartao'); ctx.lineWidth = 1;
    for (const p of pts) { ctx.beginPath(); ctx.arc(q.X(p.mod), q.Y(p.emp), 3.2, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    legenda(q, [{ nome: 'quantis (0,1% a 99,95%)', cor: css('--c-obs'), tipo: 'caixa' }, { nome: 'diagonal: ajuste perfeito', cor: css('--g-eixo'), tracejado: [6, 4] }]);
  }
  const desenhar = () => { desenharHist(); desenharQQ(); };
  function atualizar() {
    const a = modeloAtual(), d = a.aic - melhorAIC;
    $('#int-hud').innerHTML = [['Modelo', nome], ['Log-verossimilhança', fmt(a.ll, 1)], ['AIC', fmt(a.aic, 1)], ['ΔAIC (contra o melhor)', fmt(d, 1)], ['Distância KS (D)', fmt(a.ks, 4)], ['Média do modelo', `${fmt(a.M.media(pars) / 60, 2)} min`]]
      .map(([x, y]) => `<div><dt>${x}</dt><dd>${y}</dd></div>`).join('');
    $('#int-leitura').textContent = d < 2 ? 'ΔAIC abaixo de 2: este ajuste é, na prática, tão bom quanto o melhor encontrado. Confere com a Exponencial.'
      : d < 10 ? `ΔAIC de ${fmt(d, 1)}: ajuste pior; há alguma evidência contra estes parâmetros.`
        : `ΔAIC de ${fmt(d, 0)}: ajuste claramente pior. Repare nos pontos do QQ-plot se afastando da diagonal e na curva fora das barras.`;
    desenhar();
  }

  function escolher(m) {
    nome = m;
    $$('#int-modelo button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.m === m)));
    pars = mod[m].par.slice();
    configurarSliders(); atualizar();
  }
  $$('#int-modelo button').forEach((b) => b.addEventListener('click', () => escolher(b.dataset.m)));
  $('#int-mv').addEventListener('click', () => escolher(nome));

  ligar(hist, desenharHist, (px, q) => {
    const d = hist.__d; if (!q || !d) return null;
    const i = Math.floor(((px - q.L) / (q.w - q.L - q.R)) * d.nb); if (i < 0 || i >= d.nb) return null;
    const esp = n * (d.M.cdf((i + 1) * d.w * 60, pars) - d.M.cdf(i * d.w * 60, pars)), obs = d.dens[i] * n * d.w;
    return { x: q.X((i + 0.5) * d.w), html: `<b>${fmt(i * d.w, 1)} a ${fmt((i + 1) * d.w, 1)} min</b>reais: <b style="display:inline">${fmtInt(obs)}</b><br>modelo: <b style="display:inline">${fmt(esp, 1)}</b>` };
  });
  ligar(qq, desenharQQ, (px, q) => {
    const pts = qq.__pts; if (!q || !pts) return null;
    let b = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(q.X(pts[i].mod) - px) < Math.abs(q.X(pts[b].mod) - px)) b = i;
    const p = pts[b];
    return { x: q.X(p.mod), html: `<b>quantil ${fmt(p.p * 100, 2)}%</b>real: <b style="display:inline">${fmt(p.emp, 1)} min</b><br>modelo: <b style="display:inline">${fmt(p.mod, 1)} min</b>` };
  });

  $('#int-tab tbody').innerHTML = D.res.modelos.map((m) => {
    const p = m.parametros;
    const txt = m.modelo === 'Exponencial' ? `média ${fmt(p[0] / 60, 2)} min` : m.modelo === 'Log-normal' ? `σ ${fmt(p[0], 3)}; escala ${fmt(p[1] / 60, 2)} min` : `forma ${fmt(p[0], 3)}; escala ${fmt(p[1] / 60, 2)} min`;
    return `<tr class="${m.dAIC === 0 ? 'escolhida' : ''}"><th scope="row">${m.modelo}${m.dAIC === 0 ? '<span class="tag">melhor</span>' : ''}</th><td>${txt}</td><td>${fmt(m.AIC, 1)}</td><td>${fmt(m.dAIC, 1)}</td><td>${fmt(m.BIC, 1)}</td></tr>`;
  }).join('');

  configurarSliders(); atualizar();
  return { ativar: desenhar, __estado: () => ({ nome, pars: pars.slice(), aic: modeloAtual().aic }) };
}
