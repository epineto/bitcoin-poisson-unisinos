// Gráficos em canvas, sem dependências: quadro com eixos/grade, dica ao passar o mouse e navegação por teclado (setas).
import { css, prepararCanvas, aoRedimensionar, fmt } from './util.js';

/** Marcações "agradáveis" entre lo e hi. */
export function ticks(lo, hi, n = 5) {
  if (!(hi > lo)) hi = lo + 1;
  const bruto = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(bruto)), r = bruto / mag;
  const passo = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
  for (let v = Math.ceil(lo / passo - 1e-9) * passo; v <= hi + passo * 1e-9; v += passo) out.push(Math.abs(v) < passo * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}
const fmtTick = (v) => { const a = Math.abs(v); return fmt(v, a >= 100 || Number.isInteger(v) ? 0 : a >= 1 ? 1 : a >= 0.1 ? 2 : 3); };

/** Prepara o quadro: devolve {ctx, w, h, X, Y, L, R, T, B} após desenhar fundo, grade e eixos. */
export function quadro(canvas, o) {
  const { w, h, ctx } = prepararCanvas(canvas);
  const L = o.L ?? 46, R = o.R ?? 12, T = o.T ?? 12, B = o.B ?? 38;
  const [x0, x1] = o.xlim, [y0, y1] = o.ylim;
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (w - L - R);
  const Y = o.ylog ? (v) => { const a = Math.log10(Math.max(v, y0)); return h - B - ((a - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0))) * (h - T - B); }
    : (v) => h - B - ((v - y0) / (y1 - y0)) * (h - T - B);
  ctx.font = '12px Arial, sans-serif'; ctx.lineWidth = 1;
  const xt = o.xticks ?? ticks(x0, x1, w < 420 ? 4 : 6);
  const yt = o.yticks ?? (o.ylog ? [1, 0.1, 0.01, 0.001, 0.0001].filter((v) => v >= y0 && v <= y1) : ticks(y0, y1, 5));
  ctx.strokeStyle = css('--g-grade'); ctx.fillStyle = css('--g-texto');
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of yt) { const y = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke(); ctx.fillText((o.yfmt ?? fmtTick)(v), L - 5, y); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const v of xt) { const x = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, h - B); ctx.strokeStyle = css('--g-grade'); ctx.stroke(); ctx.fillText((o.xfmt ?? fmtTick)(v), x, h - B + 4); }
  ctx.strokeStyle = css('--g-eixo'); ctx.beginPath(); ctx.moveTo(L + 0.5, T); ctx.lineTo(L + 0.5, h - B + 0.5); ctx.lineTo(w - R, h - B + 0.5); ctx.stroke();
  ctx.fillStyle = css('--g-texto');
  if (o.xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xlabel, L + (w - L - R) / 2, h - 2); }
  if (o.ylabel) { ctx.save(); ctx.translate(12, T + (h - T - B) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.ylabel, 0, -10); ctx.restore(); }
  ctx.save(); ctx.beginPath(); ctx.rect(L, T, w - L - R, h - T - B); ctx.clip(); ctx.restore();
  return { ctx, w, h, X, Y, L, R, T, B, x0, x1, y0, y1 };
}

/** Desenha uma linha (x[], y[]) já em coordenadas de dados, recortada na área do gráfico. */
export function linha(q, xs, ys, { cor, largura = 2, tracejado = null } = {}) {
  const { ctx } = q;
  ctx.save(); ctx.beginPath(); ctx.rect(q.L, q.T, q.w - q.L - q.R, q.h - q.T - q.B); ctx.clip();
  ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.setLineDash(tracejado ?? []); ctx.lineJoin = 'round'; ctx.beginPath();
  let ini = true;
  for (let i = 0; i < xs.length; i++) { if (!Number.isFinite(ys[i])) { ini = true; continue; } const px = q.X(xs[i]), py = q.Y(ys[i]); if (ini) { ctx.moveTo(px, py); ini = false; } else ctx.lineTo(px, py); }
  ctx.stroke(); ctx.restore();
}

/** Faixa (banda) entre lo[] e hi[]. */
export function banda(q, xs, lo, hi, cor) {
  const { ctx } = q;
  ctx.save(); ctx.beginPath(); ctx.rect(q.L, q.T, q.w - q.L - q.R, q.h - q.T - q.B); ctx.clip();
  ctx.fillStyle = cor; ctx.beginPath();
  xs.forEach((x, i) => (i ? ctx.lineTo(q.X(x), q.Y(hi[i])) : ctx.moveTo(q.X(x), q.Y(hi[i]))));
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(q.X(xs[i]), q.Y(lo[i]));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/** Legenda embutida no canto superior direito do gráfico. */
export function legenda(q, itens) {
  const { ctx } = q; ctx.font = '12px Arial, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const larg = Math.max(...itens.map((i) => ctx.measureText(i.nome).width)) + 30;
  let x = q.w - q.R - larg - 6, y = q.T + 12;
  ctx.fillStyle = css('--cartao'); ctx.globalAlpha = 0.85; ctx.fillRect(x - 6, y - 10, larg + 8, itens.length * 18 + 2); ctx.globalAlpha = 1;
  for (const it of itens) {
    ctx.fillStyle = it.cor; ctx.strokeStyle = it.cor; ctx.lineWidth = 2;
    if (it.tipo === 'caixa') ctx.fillRect(x, y - 5, 14, 10); else { ctx.setLineDash(it.tracejado ?? []); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = css('--texto'); ctx.fillText(it.nome, x + 20, y); y += 18;
  }
}

/**
 * Faz o canvas redesenhar quando o tamanho ou o tema mudam e liga a dica (mouse, toque e setas do teclado).
 * `desenhar()` redesenha tudo; `dica(px)` recebe o x em pixels e devolve {html, x} (x do guia em pixels) ou null.
 * `guia(ctx, q)` é opcional (a função `desenhar` deve guardar `canvas.__q`).
 */
export function ligar(canvas, desenhar, dica) {
  aoRedimensionar(canvas, desenhar);
  window.addEventListener('lab-tema', desenhar);
  if (!dica) return;
  const pai = canvas.parentElement; if (getComputedStyle(pai).position === 'static') pai.style.position = 'relative';
  const d = document.createElement('div'); d.className = 'dica-g'; d.hidden = true; d.setAttribute('role', 'presentation'); pai.append(d);
  let px = null, py = null;
  const mostrar = () => {
    const r = canvas.getBoundingClientRect(), q = canvas.__q;
    const info = px == null ? null : dica(px, canvas.__q, py ?? (canvas.__q ? canvas.__q.T + 20 : 0));
    desenhar();
    if (!info) { d.hidden = true; return; }
    const ctx = canvas.getContext('2d');
    if (info.x != null && q) { ctx.save(); ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0); ctx.strokeStyle = css('--texto-suave'); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(info.x, q.T); ctx.lineTo(info.x, q.h - q.B); ctx.stroke(); ctx.restore(); }
    d.innerHTML = info.html; d.hidden = false;
    const gx = info.x ?? px;
    d.style.left = `${Math.min(Math.max(4, gx + 12), r.width - d.offsetWidth - 4)}px`;
    d.style.top = `${canvas.offsetTop + (info.y ?? 8)}px`;
  };
  canvas.addEventListener('pointermove', (ev) => { const r = canvas.getBoundingClientRect(); px = ev.clientX - r.left; py = ev.clientY - r.top; mostrar(); });
  canvas.addEventListener('pointerdown', (ev) => { const r = canvas.getBoundingClientRect(); px = ev.clientX - r.left; py = ev.clientY - r.top; mostrar(); });
  canvas.addEventListener('pointerleave', () => { px = null; py = null; mostrar(); });
  canvas.tabIndex = 0;
  canvas.addEventListener('blur', () => { px = null; mostrar(); });
  canvas.addEventListener('keydown', (ev) => {
    const q = canvas.__q; if (!q) return;
    const passo = (q.w - q.L - q.R) / 40;
    if (ev.key === 'ArrowRight') px = Math.min(q.w - q.R, (px ?? q.L) + passo);
    else if (ev.key === 'ArrowLeft') px = Math.max(q.L, (px ?? q.L + passo) - passo);
    else if (ev.key === 'ArrowDown') py = Math.min(q.h - q.B - 2, (py ?? q.T + 20) + 24);
    else if (ev.key === 'ArrowUp') py = Math.max(q.T + 2, (py ?? q.T + 20) - 24);
    else if (ev.key === 'Escape') px = null; else return;
    ev.preventDefault(); mostrar();
  });
}
