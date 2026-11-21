// Calculadora de risco de espera longa (modelo contra observado, com IC pré-calculado) e padrão por hora do dia / dia da semana.
import { $, css, fmt, fmtInt, pct, slider } from './util.js';
import { quadro, linha, banda, legenda, ligar } from './graf.js';

const rgb = (h) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h.trim()); return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [128, 128, 128]; };
const misturar = (a, b, f) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;

export function iniciarEspera(S) {
  const C = S.D.cauda, H = S.D.hora, n = C.n, L = C.linhas, cg = $('#esp-graf'), ch = $('#esp-hora'), cc = $('#esp-calor');
  const X = slider('esp-x', (v) => `${v} min`, () => atualizar());
  const lin = (i) => ({ x: L[i][0], obs: L[i][1], oi: L[i][2], os: L[i][3], mod: L[i][4], mi: L[i][5], ms: L[i][6] });
  const fmtP = (v) => (v >= 0.1 ? pct(v, 1) : v >= 0.01 ? pct(v, 2) : pct(v, 3));

  function atualizar() {
    const r = lin(X() - 1), cntObs = Math.round(r.obs * n);
    $('#esp-hud').innerHTML = [['Modelo Exponencial', `${fmtP(r.mod)} (IC ${fmtP(r.mi)} a ${fmtP(r.ms)})`], ['Observado', `${fmtP(r.obs)} (IC ${fmtP(r.oi)} a ${fmtP(r.os)})`],
      ['Observado: 1 a cada', r.obs > 0 ? fmtInt(1 / r.obs) + ' intervalos' : 'nunca ocorreu'], ['Casos observados', `${fmtInt(cntObs)} de ${fmtInt(n)}`], ['Casos esperados pelo modelo', fmt(r.mod * n, 1)]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    const dentro = r.obs >= r.mi && r.obs <= r.ms, rel = r.obs > r.mod ? 'acima' : 'abaixo';
    $('#esp-leitura').textContent = (r.obs === 0 ? `Nenhum intervalo passou de ${r.x} min nesta amostra, o que não significa risco zero: o modelo ainda prevê ${fmt(r.mod * n, 1)} casos.`
      : `Cerca de 1 em cada ${fmtInt(1 / r.obs)} intervalos passou de ${r.x} min. `) + (dentro ? 'O observado cabe no IC do modelo.' : `O observado fica ${rel} do IC do modelo: pequeno excesso de esperas longas.`);
    desenhar();
  }
  function desenharGraf() {
    const log = $('#esp-log').checked, f = (v) => (log && v <= 0 ? NaN : v);
    const xs = L.map((r) => r[0]);
    const q = quadro(cg, { xlim: [0, 120], ylim: [log ? 1e-4 : 0, 1], ylog: log, xlabel: 'X: minutos de espera', ylabel: 'P(intervalo > X)', xticks: [0, 20, 40, 60, 80, 100, 120], yfmt: (v) => (v >= 0.01 ? fmt(v * 100, 0) : fmt(v * 100, v >= 0.001 ? 1 : 2)) + '%', L: 56 });
    cg.__q = q;
    if (!log) { banda(q, xs, L.map((r) => r[5]), L.map((r) => r[6]), css('--c-mod') + '44'); banda(q, xs, L.map((r) => r[2]), L.map((r) => r[3]), css('--c-obs') + '44'); }
    else { linha(q, xs, L.map((r) => f(r[5])), { cor: css('--c-mod'), largura: 1, tracejado: [3, 3] }); linha(q, xs, L.map((r) => f(r[6])), { cor: css('--c-mod'), largura: 1, tracejado: [3, 3] }); }
    linha(q, xs, L.map((r) => f(r[4])), { cor: css('--c-mod'), largura: 3 });
    linha(q, xs, L.map((r) => f(r[1])), { cor: css('--c-obs'), largura: 2.5 });
    const x = X(), { ctx } = q;
    ctx.save(); ctx.strokeStyle = css('--texto'); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(q.X(x), q.T); ctx.lineTo(q.X(x), q.h - q.B); ctx.stroke(); ctx.restore();
    const r = lin(x - 1);
    for (const [v, cor] of [[r.mod, css('--c-mod')], [r.obs, css('--c-obs')]]) if (!(log && v <= 0)) { ctx.fillStyle = cor; ctx.strokeStyle = css('--cartao'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.X(x), q.Y(v), 5, 0, 7); ctx.fill(); ctx.stroke(); }
    legenda(q, [{ nome: 'Exponencial (modelo), IC 95%', cor: css('--c-mod') }, { nome: 'observado, IC 95%', cor: css('--c-obs') }]);
  }
  function desenharHora() {
    const P = H.por_hora, q = quadro(ch, { xlim: [-0.5, 23.5], ylim: [0, 8], xlabel: 'hora do dia (UTC)', ylabel: 'blocos por hora', xticks: [0, 3, 6, 9, 12, 15, 18, 21], L: 42 });
    ch.__q = q;
    const faixa = (r) => 1.96 * Math.sqrt(H.media_geral / r.n_horas);
    banda(q, [-0.5, 23.5], [H.media_geral - faixa(P[0]), H.media_geral - faixa(P[0])], [H.media_geral + faixa(P[0]), H.media_geral + faixa(P[0])], css('--c-mod') + '33');
    const { ctx } = q, bw = q.X(1) - q.X(0);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.85;
    P.forEach((r) => ctx.fillRect(q.X(r.hora - 0.5) + 2, q.Y(r.media), bw - 4, q.Y(0) - q.Y(r.media)));
    ctx.globalAlpha = 1;
    linha(q, [-0.5, 23.5], [H.media_geral, H.media_geral], { cor: css('--c-mod'), largura: 2.5 });
    legenda(q, [{ nome: 'média de cada hora do dia', cor: css('--c-obs'), tipo: 'caixa' }, { nome: `média geral ${fmt(H.media_geral, 2)} (faixa de 95%)`, cor: css('--c-mod') }]);
  }
  function desenharCalor() {
    const q = quadro(cc, { xlim: [0, 24], ylim: [0, 7], xlabel: 'hora do dia (UTC)', L: 62, B: 30, T: 4, yticks: [], xticks: [0, 3, 6, 9, 12, 15, 18, 21] });
    cc.__q = q;
    const { ctx } = q, cw = q.X(1) - q.X(0), chh = q.Y(0) - q.Y(1), baixo = rgb(css('--c-obs')), alto = rgb(css('--c-mod')), meio = rgb(css('--claro'));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = css('--g-texto'); ctx.font = '12px Arial, sans-serif';
    H.grade.forEach((linhaD, d) => {
      ctx.fillStyle = css('--g-texto'); ctx.textAlign = 'right'; ctx.fillText(H.dias[d].slice(0, 3), q.L - 6, q.T + (d + 0.5) * chh);
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
    return { x: q.X(r.x), html: `<b>mais de ${r.x} min</b>modelo: <b style="display:inline">${fmtP(r.mod)}</b><br>observado: <b style="display:inline">${fmtP(r.obs)}</b>` };
  });
  ligar(ch, desenharHora, (px, q) => {
    if (!q) return null;
    const h = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0) + 0.5), r = H.por_hora[h]; if (!r) return null;
    return { x: q.X(h), html: `<b>${String(h).padStart(2, '0')}h UTC</b>média <b style="display:inline">${fmt(r.media, 2)}</b> blocos/h<br>${fmtInt(r.n_horas)} horas observadas` };
  });
  ligar(cc, desenharCalor, (px, q, py) => {
    if (!q) return null;
    const hora = Math.floor(q.x0 + ((px - q.L) / (q.w - q.L - q.R)) * (q.x1 - q.x0)), d = Math.floor((py - q.T) / (q.Y(0) - q.Y(1))); if (hora < 0 || hora > 23 || d < 0 || d > 6) return null;
    return { x: q.X(hora + 0.5), y: Math.max(4, py - 50), html: `<b>${H.dias[d]}, ${String(hora).padStart(2, '0')}h UTC</b>média <b style="display:inline">${fmt(H.grade[d][hora], 2)}</b> blocos/h<br>${H.grade_n[d][hora]} horas observadas` };
  });
  $('#esp-log').addEventListener('change', desenhar);
  const t = H.teste_hora;
  $('#esp-hora-txt').textContent = `Teste de homogeneidade entre as 24 horas do dia: χ² = ${fmt(t.estatistica, 1)} com ${t.gl} g.l., p ${t.p < 0.001 ? '< 0,001' : '= ' + fmt(t.p, 3)}. ` + (t.p > 0.05 ? 'Sem evidência de hora do dia melhor ou pior: as barras variam dentro do que o acaso produz.' : 'Há alguma evidência de diferença entre horas do dia; o tamanho do efeito é pequeno.') + ` No mapa de calor cada célula reúne só cerca de ${fmtInt(H.n_horas / 168)} horas, então cores fortes isoladas são, em geral, ruído.`;
  atualizar();
  return { ativar: desenhar, __estado: () => ({ x: X() }) };
}
