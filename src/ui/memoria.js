// Ausência de memória: compara P(T > x) com P(T - s > x | T > s) em dados reais, simulados (Exponencial) e um contraexemplo (Gama).
import { $, $$, css, fmt, fmtInt, pct, slider } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';
import { mulberry32, semente, sortearExp, sortearGamaInt } from '../core/rng.js';
import { wilson, ordenar } from '../core/estat.js';
import { t as tr, onLang } from './i18n.js';

// contagem de valores > v em vetor ordenado (busca binária)
function acima(ord, v) { let lo = 0, hi = ord.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ord[m] <= v) lo = m + 1; else hi = m; } return ord.length - lo; }

export function iniciarMemoria(S) {
  const D = S.D, N = 20000, cv = $('#mem-graf');
  let fonte = 'real', cache = {};
  const s = slider('mem-s', (v) => `${v} min`, () => atualizar());
  const t = slider('mem-t', (v) => `${v} min`, () => atualizar());

  function dados() {
    if (fonte === 'real') return S.ord;
    const sem = semente($('#mem-semente').value), chave = fonte + sem;
    if (!cache[chave]) {
      const r = mulberry32(sem), a = new Float64Array(N);
      for (let i = 0; i < N; i++) a[i] = fonte === 'exp' ? sortearExp(r(), S.mu) : sortearGamaInt(r, 3, S.mu);
      cache = { [chave]: ordenar(a) };
    }
    return cache[chave];
  }
  function atualizar() {
    const ord = dados(), n = ord.length, ss = s() * 60, tt = t() * 60, ns = acima(ord, ss);
    const k = acima(ord, ss + tt), pc = ns ? k / ns : NaN, pu = acima(ord, tt) / n, [lo, hi] = wilson(k, ns);
    const xs = Array.from({ length: 91 }, (_, i) => i);
    const inc = xs.map((x) => acima(ord, x * 60) / n), con = xs.map((x) => (ns ? acima(ord, ss + x * 60) / ns : NaN));
    cv.__d = { xs, inc, con, ns };
    $('#mem-hud').innerHTML = [[tr('mem.hud.ns'), tr('mem.hud.ns.v', { n: fmtInt(ns) })], [tr('mem.hud.pu'), pct(pu, 1)], [tr('mem.hud.pc'), ns ? pct(pc, 1) : '–'], [tr('mem.hud.ic'), ns ? tr('g.faixa', { a: pct(lo, 1), b: pct(hi, 1) }) : '–'], [tr('mem.hud.dif'), ns ? `${fmt((pc - pu) * 100, 1)} ${tr('u.pp')}` : '–']]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    const dentro = pu >= lo && pu <= hi;
    $('#mem-leitura').textContent = ns < 30 ? tr('mem.l.poucos')
      : fonte === 'gama' ? (dentro ? tr('mem.l.gama.dentro') : tr(pc < pu ? 'mem.l.gama.menor' : 'mem.l.gama.maior', { s: s(), pc: pct(pc, 1), pu: pct(pu, 1) }))
        : dentro ? tr('mem.l.sem', { pc: pct(pc, 1), pu: pct(pu, 1), s: s(), t: t() })
          : tr('mem.l.peq', { pc: pct(pc, 1), pu: pct(pu, 1), d: fmt(Math.abs(pc - pu) * 100, 1) });
    desenhar();
  }
  function desenhar() {
    const d = cv.__d; if (!d) return;
    const q = quadro(cv, { xlim: [0, 90], ylim: [0, 1], xlabel: tr('mem.ax.x'), ylabel: tr('mem.ax.y'), xticks: [0, 15, 30, 45, 60, 75, 90], yfmt: (v) => fmt(v * 100, 0) + '%', L: 52 });
    cv.__q = q;
    linha(q, d.xs, d.inc, { cor: css('--c-obs'), largura: 4 });
    linha(q, d.xs, d.con, { cor: css('--c-mod'), largura: 2.5, tracejado: [7, 4] });
    const { ctx } = q;
    ctx.save(); ctx.strokeStyle = css('--texto-suave'); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(q.X(t()), q.T); ctx.lineTo(q.X(t()), q.h - q.B); ctx.stroke(); ctx.restore();
    legenda(q, [{ nome: tr('mem.leg.nova'), cor: css('--c-obs') }, { nome: tr('mem.leg.cond', { s: s() }), cor: css('--c-mod'), tracejado: [7, 4] }]);
  }
  ligar(cv, desenhar, (px, q) => {
    const d = cv.__d; if (!q || !d) return null;
    const i = Math.round(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)); if (i < 0 || i > 90) return null;
    return { x: q.X(i), html: `<b>x = ${i} min</b>${tr('mem.dica.nova')}: <b style="display:inline">${pct(d.inc[i], 1)}</b><br>${tr('mem.dica.cond', { s: s() })}: <b style="display:inline">${pct(d.con[i], 1)}</b>` };
  });

  $$('#mem-fonte button').forEach((b) => b.addEventListener('click', () => {
    fonte = b.dataset.f; $$('#mem-fonte button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); atualizar();
  }));
  $('#mem-semente').addEventListener('change', atualizar);

  function tabela() {
    $('#mem-tab tbody').innerHTML = D.res.ausencia_memoria.map((r) => {
      const exclui = r.ic_inf > 0 || r.ic_sup < 0;
      return `<tr><th scope="row">${r.s_min}</th><td>${r.t_min}</td><td>${fmtInt(r.n_sobreviventes)}</td><td>${pct(r.P_condicional, 1)}</td><td>${pct(r.P_incondicional, 1)}</td><td class="${exclui ? 'piora' : ''}">${fmt(r.diferenca * 100, 1)} ${tr('u.pp')} (${tr('g.faixa', { a: fmt(r.ic_inf * 100, 1), b: fmt(r.ic_sup * 100, 1) })})</td></tr>`;
    }).join('');
  }
  tabela();
  onLang(() => { tabela(); atualizar(); });   // a fonte de dados, s, t e a semente escolhidos são mantidos
  atualizar();
  return { ativar: desenhar, __estado: () => ({ fonte }) };
}
