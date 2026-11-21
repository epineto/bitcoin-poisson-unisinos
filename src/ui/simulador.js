// Simulador: linha do tempo animada com blocos chegando (Poisson simulado ou série real), contador e histograma crescente.
import { $, css, fmt, fmtInt, prepararCanvas, aoRedimensionar, reduzMovimento, slider } from './util.js';
import { quadro, linha, legenda, ligar } from './graf.js';
import { mulberry32, sortearExp, semente } from '../core/rng.js';
import { Exponencial } from '../core/dist.js';
import { histograma } from '../core/estat.js';

const LARG_BIN = 2, NBINS = 30;     // classes de 2 min até 60 min
const JANELA = 180 * 60;            // a linha do tempo mostra as últimas 3 horas

export function iniciarSimulador(S) {
  const D = S.D, n = D.intervalos.length, mediaReal = S.mu;
  const cv = $('#sim-linha'), ch = $('#sim-hist');
  let modo = 'sim', rnd, t, proximo, ultimo, ints, chegs, idxReal, tocando = !reduzMovimento(), anterior = 0, raf = 0, ativa = false, acumHud = 0;
  const real = histograma(Array.from(D.intervalos, (v) => v / 60), 0, NBINS * LARG_BIN, NBINS);

  const taxa = slider('sim-taxa', (v) => `${fmt(v, 1)} blocos/h (média ${fmt(60 / v, 1)} min)`, () => reiniciar());
  const vel = slider('sim-vel', (v) => `${fmt(v, 0)} min por segundo`);
  const media = () => (modo === 'real' ? mediaReal : 3600 / taxa());
  const sorteio = () => (modo === 'real' ? D.intervalos[idxReal++ % n] : sortearExp(rnd(), 3600 / taxa()));

  function reiniciar() {
    const s = semente($('#sim-semente').value);
    rnd = mulberry32(s); t = 0; ultimo = 0; ints = []; chegs = []; idxReal = s % n;
    proximo = sorteio();
    $('#sim-taxa').disabled = modo === 'real';
    $('#sim-modo-txt').textContent = modo === 'real'
      ? `Reproduz, na ordem, os intervalos reais do CSV a partir da posição ${fmtInt(idxReal + 1)} (definida pela semente). A taxa fica fixa em ${fmt(3600 / mediaReal, 2)} blocos/h, a média real.`
      : 'Cada intervalo é sorteado de uma Exponencial com a taxa escolhida: o resultado de um processo de Poisson.';
    atualizarTextos(); desenhar();
  }
  function bloco(quando) { ints.push(quando - ultimo); chegs.push(quando); ultimo = quando; if (chegs.length > 400) chegs.shift(); }
  function avancar(dt) {
    t += dt; let guarda = 0;
    while (proximo <= t && guarda++ < 3000) { bloco(proximo); proximo += sorteio(); }
  }
  function lote(k) { for (let i = 0; i < k; i++) { t = proximo; bloco(proximo); proximo += sorteio(); } atualizarTextos(); desenhar(); }

  // ---- desenho
  function desenharLinha() {
    const { w, h, ctx } = prepararCanvas(cv);
    const L = 14, R = 14, eixo = h - 52, x = (tempo) => L + ((tempo - (t - JANELA)) / JANELA) * (w - L - R);
    ctx.font = '12px Arial, sans-serif'; ctx.textBaseline = 'top';
    ctx.strokeStyle = css('--g-grade'); ctx.fillStyle = css('--g-texto'); ctx.textAlign = 'center'; ctx.lineWidth = 1;
    for (let m = 0; m <= 180; m += 30) {
      const rotulo = w >= 560 || m % 60 === 0;
      const px = x(t - m * 60); ctx.beginPath(); ctx.moveTo(px + 0.5, 8); ctx.lineTo(px + 0.5, eixo + 8); ctx.stroke();
      if (rotulo) ctx.fillText(m === 0 ? 'agora' : `−${m} min`, Math.min(w - 22, Math.max(32, px)), eixo + 14);
    }
    ctx.strokeStyle = css('--g-eixo'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L, eixo); ctx.lineTo(w - R, eixo); ctx.stroke();
    // segmentos entre blocos
    for (let i = 1; i < chegs.length; i++) {
      const a = chegs[i - 1], b = chegs[i]; if (b < t - JANELA) continue;
      const longo = b - a >= 1800;
      ctx.strokeStyle = longo ? css('--c-mod') : css('--c-obs'); ctx.lineWidth = longo ? 5 : 3; ctx.globalAlpha = longo ? 0.9 : 0.55;
      ctx.beginPath(); ctx.moveTo(Math.max(L, x(a)), eixo); ctx.lineTo(x(b), eixo); ctx.stroke(); ctx.globalAlpha = 1;
      const xm = (Math.max(L, x(a)) + x(b)) / 2;
      if (x(b) - Math.max(L, x(a)) > 34) { ctx.fillStyle = longo ? css('--c-mod') : css('--texto-suave'); ctx.font = (longo ? 'bold ' : '') + '12px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt((b - a) / 60, 1) + ' min', xm, eixo - 24); }
    }
    // espera atual
    if (chegs.length) {
      const a = chegs[chegs.length - 1], esp = t - a, longo = esp >= 1800;
      ctx.setLineDash([5, 4]); ctx.strokeStyle = longo ? css('--c-mod') : css('--texto-suave'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x(a), eixo); ctx.lineTo(x(t), eixo); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = longo ? css('--c-mod') : css('--texto-suave'); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(`esperando há ${fmt(esp / 60, 1)} min`, w - R - 8, 8);
    }
    // blocos
    for (const b of chegs) {
      const px = x(b); if (px < L - 10) continue;
      ctx.fillStyle = css('--c-obs'); ctx.strokeStyle = css('--cartao'); ctx.lineWidth = 2;
      const tam = 20, r = 4, bx = px - tam / 2, by = eixo - tam - 2;
      ctx.beginPath(); ctx.roundRect(bx, by, tam, tam, r); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = css('--texto'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x(t), 6); ctx.lineTo(x(t), eixo + 8); ctx.stroke();
  }

  function desenharHist() {
    const nn = ints.length, m = media(), cont = histograma(ints.map((v) => v / 60), 0, NBINS * LARG_BIN, NBINS).cont;
    const esperado = cont.map((_, i) => nn * (Exponencial.cdf((i + 1) * LARG_BIN * 60, [m]) - Exponencial.cdf(i * LARG_BIN * 60, [m])));
    const contorno = real.cont.map((c) => c * (nn / n));
    const ymax = Math.max(5, ...cont, ...esperado, ...($('#sim-real-ctn').checked ? contorno : [0])) * 1.12;
    const q = quadro(ch, { xlim: [0, NBINS * LARG_BIN], ylim: [0, ymax], xlabel: 'intervalo entre blocos (min)', ylabel: 'quantidade de intervalos', xticks: [0, 10, 20, 30, 40, 50, 60] });
    ch.__q = q; ch.__dados = { cont, esperado };
    const { ctx } = q, bw = q.X(LARG_BIN) - q.X(0);
    ctx.fillStyle = css('--c-obs'); ctx.globalAlpha = 0.8;
    cont.forEach((c, i) => ctx.fillRect(q.X(i * LARG_BIN) + 1, q.Y(c), bw - 2, q.Y(0) - q.Y(c)));
    ctx.globalAlpha = 1;
    const xs = cont.map((_, i) => (i + 0.5) * LARG_BIN);
    if ($('#sim-real-ctn').checked) linha(q, xs, contorno, { cor: css('--c-aux'), largura: 2, tracejado: [4, 3] });
    if ($('#sim-dens').checked) linha(q, xs, esperado, { cor: css('--c-mod'), largura: 3 });
    legenda(q, [{ nome: 'simulados', cor: css('--c-obs'), tipo: 'caixa' }, ...($('#sim-dens').checked ? [{ nome: 'Exponencial esperada', cor: css('--c-mod') }] : []), ...($('#sim-real-ctn').checked ? [{ nome: 'série real (escalada)', cor: css('--c-aux'), tracejado: [4, 3] }] : [])]);
  }
  const desenhar = () => { desenharLinha(); desenharHist(); };

  function atualizarTextos() {
    const nn = ints.length, soma = ints.reduce((a, b) => a + b, 0), m = nn ? soma / nn : NaN;
    let mx = 0, longos = 0, sq = 0; for (const v of ints) { if (v > mx) mx = v; if (v > 1800) longos++; sq += (v - m) ** 2; }
    const dp = nn > 1 ? Math.sqrt(sq / (nn - 1)) : NaN, horas = t / 3600;
    $('#sim-hud').innerHTML = [['Blocos', fmtInt(nn)], ['Tempo simulado', `${fmt(horas, 1)} h`], ['Média dos intervalos', nn ? `${fmt(m / 60, 2)} min` : '–'],
      ['Maior espera', nn ? `${fmt(mx / 60, 1)} min` : '–'], ['Esperas > 30 min', nn ? `${fmtInt(longos)} (${fmt(100 * longos / nn, 1)}%)` : '–'], ['Esperado > 30 min', `${fmt(100 * Math.exp(-1800 / media()), 1)}%`]]
      .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#sim-ultimos').innerHTML = ints.slice(-8).reverse().map((v) => `<li><span>${fmt(v / 60, 1)} min</span><i class="${v >= 1800 ? 'longo' : ''}" style="width:${Math.min(100, (v / 60 / 60) * 100)}%"></i></li>`).join('');
    $('#sim-leitura').textContent = nn < 30 ? 'Com poucos blocos o histograma é irregular: o acaso domina. Deixar a simulação rodar (ou usar “+1.000 blocos”) revela o formato.'
      : `Média ${fmt(m / 60, 2)} min contra ${fmt(media() / 60, 2)} esperados; desvio-padrão ${fmt(dp / 60, 2)} min. Na Exponencial, desvio e média são iguais (razão aqui: ${fmt(dp / m, 2)}).`;
    $('#sim-sr').textContent = `${nn} blocos, média ${fmt(m / 60, 1)} minutos.`;
  }

  function quadroAnim(agora) {
    raf = 0; if (!ativa) return;
    const dt = Math.min(0.1, (agora - anterior) / 1000); anterior = agora;
    if (tocando) { avancar(dt * vel() * 60); acumHud += dt; if (acumHud > 0.2) { acumHud = 0; atualizarTextos(); } }
    desenhar();
    raf = requestAnimationFrame(quadroAnim);
  }
  function iniciarLoop() { if (!raf && ativa) { anterior = performance.now(); raf = requestAnimationFrame(quadroAnim); } }

  const definirModo = (m) => { modo = m; $('#sim-modo-sim').setAttribute('aria-pressed', String(m === 'sim')); $('#sim-modo-real').setAttribute('aria-pressed', String(m === 'real')); reiniciar(); };
  $('#sim-modo-sim').addEventListener('click', () => definirModo('sim'));
  $('#sim-modo-real').addEventListener('click', () => definirModo('real'));
  const atualizarBotao = () => { $('#sim-play').textContent = tocando ? 'Pausar' : 'Continuar'; $('#sim-play').classList.toggle('primario', tocando); };
  $('#sim-play').addEventListener('click', () => { tocando = !tocando; atualizarBotao(); if (!tocando) { atualizarTextos(); desenhar(); } });
  $('#sim-100').addEventListener('click', () => lote(100));
  $('#sim-1000').addEventListener('click', () => lote(1000));
  $('#sim-reiniciar').addEventListener('click', reiniciar);
  $('#sim-semente').addEventListener('change', reiniciar);
  $('#sim-dens').addEventListener('change', desenhar);
  $('#sim-real-ctn').addEventListener('change', desenhar);
  aoRedimensionar(cv, desenhar);
  ligar(ch, desenhar, (px, q) => {
    if (!q || !ch.__dados) return null;
    const i = Math.floor(((px - q.L) / (q.w - q.L - q.R)) * NBINS); if (i < 0 || i >= NBINS) return null;
    const { cont, esperado } = ch.__dados;
    return { x: q.X((i + 0.5) * LARG_BIN), html: `<b>${i * LARG_BIN} a ${(i + 1) * LARG_BIN} min</b>observados: <b style="display:inline">${fmtInt(cont[i])}</b><br>esperados: <b style="display:inline">${fmt(esperado[i], 1)}</b>` };
  });
  atualizarBotao(); reiniciar();
  return {
    ativar() { ativa = true; iniciarLoop(); },
    desativar() { ativa = false; },
    // gancho para testes de navegador
    __estado: () => ({ n: ints.length, t, modo }),
  };
}
