// Calculadora de risco de espera longa (modelo contra observado, com IC pré-calculado) e padrão por hora do dia / dia da semana.
import { $, css, fmt, fmtInt, pct, slider } from './util.js';
import { quadro, linha, banda, legenda, ligar } from './graf.js';
import { t as tr, onLang } from './i18n.js';

const rgb = (h) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h.trim()); return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [128, 128, 128]; };
const misturar = (a, b, f) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;

export function iniciarEspera(S) {
  const C = S.D.cauda, H = S.D.hora, n = C.n, L = C.linhas, cg = $('#esp-graf'), ch = $('#esp-hora'), cc = $('#esp-calor');
  const X = slider('esp-x', (v) => `${v} min`, () => atualizar());
  const lin = (i) => ({ x: L[i][0], obs: L[i][1], oi: L[i][2], os: L[i][3], mod: L[i][4], mi: L[i][5], ms: L[i][6] });
  const fmtP = (v) => (v >= 0.1 ? pct(v, 1) : v >= 0.01 ? pct(v, 2) : pct(v, 3));

  function atualizar() {
    const r = lin(X() - 1), cntObs = Math.round(r.obs * n);
    $('#esp-hud').innerHTML = [[tr('esp.hud.mod'), tr('esp.ic', { v: fmtP(r.mod), a: fmtP(r.mi), b: fmtP(r.ms) })], [tr('esp.hud.obs'), tr('esp.ic', { v: fmtP(r.obs), a: fmtP(r.oi), b: fmtP(r.os) })],
      [tr('esp.hud.um'), r.obs > 0 ? tr('esp.hud.um.v', { n: fmtInt(1 / r.obs) }) : tr('esp.hud.nunca')], [tr('esp.hud.casos'), tr('esp.hud.casos.v', { a: fmtInt(cntObs), b: fmtInt(n) })], [tr('esp.hud.esp'), fmt(r.mod * n, 1)]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    const dentro = r.obs >= r.mi && r.obs <= r.ms, rel = r.obs > r.mod ? 'esp.l.acima' : 'esp.l.abaixo';
    $('#esp-leitura').textContent = (r.obs === 0 ? tr('esp.l.zero', { x: r.x, m: fmt(r.mod * n, 1) })
      : tr('esp.l.um', { n: fmtInt(1 / r.obs), x: r.x })) + (dentro ? tr('esp.l.dentro') : tr(rel));
    desenhar();
  }
  function desenharGraf() {
    const log = $('#esp-log').checked, f = (v) => (log && v <= 0 ? NaN : v);
    const xs = L.map((r) => r[0]);
    const q = quadro(cg, { xlim: [0, 120], ylim: [log ? 1e-4 : 0, 1], ylog: log, xlabel: tr('esp.ax.x'), ylabel: tr('esp.ax.y'), xticks: [0, 20, 40, 60, 80, 100, 120], yfmt: (v) => (v >= 0.01 ? fmt(v * 100, 0) : fmt(v * 100, v >= 0.001 ? 1 : 2)) + '%', L: 56 });
    cg.__q = q;
    if (!log) { banda(q, xs, L.map((r) => r[5]), L.map((r) => r[6]), css('--c-mod') + '44'); banda(q, xs, L.map((r) => r[2]), L.map((r) => r[3]), css('--c-obs') + '44'); }
    else { linha(q, xs, L.map((r) => f(r[5])), { cor: css('--c-mod'), largura: 1, tracejado: [3, 3] }); linha(q, xs, L.map((r) => f(r[6])), { cor: css('--c-mod'), largura: 1, tracejado: [3, 3] }); }
    linha(q, xs, L.map((r) => f(r[4])), { cor: css('--c-mod'), largura: 3 });
    linha(q, xs, L.map((r) => f(r[1])), { cor: css('--c-obs'), largura: 2.5 });
    const x = X(), { ctx } = q;
    ctx.save(); ctx.strokeStyle = css('--texto'); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(q.X(x), q.T); ctx.lineTo(q.X(x), q.h - q.B); ctx.stroke(); ctx.restore();
    const r = lin(x - 1);
    for (const [v, cor] of [[r.mod, css('--c-mod')], [r.obs, css('--c-obs')]]) if (!(log && v <= 0)) { ctx.fillStyle = cor; ctx.strokeStyle = css('--cartao'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.X(x), q.Y(v), 5, 0, 7); ctx.fill(); ctx.stroke(); }
    legenda(q, [{ nome: tr('esp.leg.mod'), cor: css('--c-mod') }, { nome: tr('esp.leg.obs'), cor: css('--c-obs') }]);
  }
  function desenharHora() {
    const P = H.por_hora, q = quadro(ch, { xlim: [-0.5, 23.5], ylim: [0, 8], xlabel: tr('esp.ax.hora'), ylabel: tr('esp.ax.hy'), xticks: [0, 3, 6, 9, 12, 15, 18, 21], L: 42 });
    ch.__q = q;
    const faixa = (r) => 1.96 * Math.sqrt(H.media_geral / r.n_horas);
    banda(q, [-0.5, 23.5], [H.media_geral - faixa(P[0]), H.media_geral - faixa(P[0])], [H.media_geral + faixa(P[0]), H.media_geral + faixa(P[0])], css('--c-mod') + '33');
    const { ctx } = q, bw = q.X(1) - q.X(0);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.85;
    P.forEach((r) => ctx.fillRect(q.X(r.hora - 0.5) + 2, q.Y(r.media), bw - 4, q.Y(0) - q.Y(r.media)));
    ctx.globalAlpha = 1;
    linha(q, [-0.5, 23.5], [H.media_geral, H.media_geral], { cor: css('--c-mod'), largura: 2.5 });
    legenda(q, [{ nome: tr('esp.leg.media'), cor: css('--c-obs'), tipo: 'caixa' }, { nome: tr('esp.leg.geral', { v: fmt(H.media_geral, 2) }), cor: css('--c-mod') }]);
  }
  function desenharCalor() {
    const q = quadro(cc, { xlim: [0, 24], ylim: [0, 7], xlabel: tr('esp.ax.hora'), L: 62, B: 30, T: 4, yticks: [], xticks: [0, 3, 6, 9, 12, 15, 18, 21] });
    cc.__q = q;
    const { ctx } = q, cw = q.X(1) - q.X(0), chh = q.Y(0) - q.Y(1), baixo = rgb(css('--c-obs')), alto = rgb(css('--c-mod')), meio = rgb(css('--claro'));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = css('--g-texto'); ctx.font = '12px Arial, sans-serif';
    H.grade.forEach((linhaD, d) => {
      ctx.fillStyle = css('--g-texto'); ctx.textAlign = 'right'; ctx.fillText(tr('dia.abv.' + H.dias[d]), q.L - 6, q.T + (d + 0.5) * chh);
      linhaD.forEach((v, hora) => {
        const f = Math.max(-1, Math.min(1, (v - H.media_geral) / 2));
        ctx.fillStyle = f < 0 ? misturar(meio, baixo, -f) : misturar(meio, alto, f);
        ctx.fillRect(q.X(hora) + 1, q.T + d * chh + 1, cw - 2, chh - 2);
      });
    });
  }
  const desenhar = () => { desenharGraf(); desenharHora(); desenharCalor(); };

  ligar(cg, desenharGraf, (px, q) => {
    if (!q) return null;
    const i = Math.max(0, Math.min(119, Math.round(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)) - 1)), r = lin(i);
    return { x: q.X(r.x), html: `<b>${tr('esp.dica.mais', { x: r.x })}</b>${tr('esp.dica.mod')}: <b style="display:inline">${fmtP(r.mod)}</b><br>${tr('esp.dica.obs')}: <b style="display:inline">${fmtP(r.obs)}</b>` };
  });
  ligar(ch, desenharHora, (px, q) => {
    if (!q) return null;
    const h = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0) + 0.5), r = H.por_hora[h]; if (!r) return null;
    return { x: q.X(h), html: `<b>${tr('esp.dica.hora', { h: String(h).padStart(2, '0') })}</b>${tr('esp.dica.media')} <b style="display:inline">${tr('esp.dica.mhora', { v: fmt(r.media, 2) })}</b><br>${tr('esp.dica.nh', { n: fmtInt(r.n_horas) })}` };
  });
  ligar(cc, desenharCalor, (px, q, py) => {
    if (!q) return null;
    const hora = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)), d = Math.floor((py - q.T) / (q.Y(0) - q.Y(1))); if (hora < 0 || hora > 23 || d < 0 || d > 6) return null;
    return { x: q.X(hora + 0.5), y: Math.max(4, py - 50), html: `<b>${tr('esp.dica.dia', { d: tr('dia.' + H.dias[d]), h: String(hora).padStart(2, '0') })}</b>${tr('esp.dica.media')} <b style="display:inline">${tr('esp.dica.mhora', { v: fmt(H.grade[d][hora], 2) })}</b><br>${tr('esp.dica.nh', { n: fmtInt(H.grade_n[d][hora]) })}` };
  });
  $('#esp-log').addEventListener('change', desenhar);
  const teste = H.teste_hora;
  const textoHora = () => {
    $('#esp-hora-txt').textContent = tr('esp.t.pre', { chi: fmt(teste.estatistica, 1), gl: teste.gl, p: teste.p < 0.001 ? tr('esp.t.menor') : tr('esp.t.igual', { v: fmt(teste.p, 3) }) })
      + (teste.p > 0.05 ? tr('esp.t.sem') : tr('esp.t.com')) + tr('esp.t.calor', { n: fmtInt(H.n_horas / 168) });
  };
  textoHora();
  onLang(() => { textoHora(); atualizar(); });   // o valor de X e a escala logarítmica escolhidos são mantidos
  atualizar();
  return { ativar: desenhar, __estado: () => ({ x: X() }) };
}
