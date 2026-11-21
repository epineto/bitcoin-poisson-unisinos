// Utilidades de DOM, formatação em pt-BR e cores lidas das variáveis CSS (acompanham o tema claro/escuro).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Número com vírgula decimal e `d` casas. */
export const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
export const fmtInt = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('pt-BR') : '–');
export const pct = (v, d = 1) => fmt(v * 100, d) + '%';

let _estilo = null, _chave = '';
export function css(nome) {
  const chave = document.documentElement.dataset.theme + '|' + (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'd' : 'l');
  if (!_estilo || chave !== _chave) { _estilo = getComputedStyle(document.documentElement); _chave = chave; }
  return _estilo.getPropertyValue(nome).trim();
}

/** Dimensiona o canvas ao tamanho CSS com a densidade de pixels da tela. */
export function prepararCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { w, h, ctx };
}

/** Executa `fn` quando o elemento muda de tamanho (inclusive quando a seção passa a ser exibida). */
export function aoRedimensionar(elemento, fn) {
  if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fn); return; }
  let q = 0;
  new ResizeObserver(() => { cancelAnimationFrame(q); q = requestAnimationFrame(fn); }).observe(elemento);
}
export const reduzMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Liga um slider a um texto de saída; devolve função que lê o valor numérico. */
export function slider(id, formatar, aoMudar) {
  const e = document.getElementById(id), saida = document.getElementById(id + '-v');
  const atual = () => Number(e.value);
  const atualizar = () => { if (saida) saida.textContent = formatar(atual()); };
  e.addEventListener('input', () => { atualizar(); aoMudar?.(atual()); });
  atualizar();
  return atual;
}
