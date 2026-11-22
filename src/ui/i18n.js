// Internacionalização mínima: os dicionários são módulos JS (sem fetch). / Minimal i18n: dictionaries are JS modules.
import pt from '../i18n/pt.js';
import en from '../i18n/en.js';

const DICT = { pt, en };
const CHAVE = 'bitcoin-poisson-lang';
let lang = 'pt';
const ouvintes = [];

export const getLang = () => lang;
export const onLang = (fn) => ouvintes.push(fn);

export function detectar() {
  try { const s = localStorage.getItem(CHAVE); if (s === 'pt' || s === 'en') return s; } catch (_) { /* sem storage */ }
  return 'pt';
}

/** Tradução com substituição `{var}`. Cai no português e, por fim, na própria chave. */
export function t(chave, vars = {}) {
  const s = DICT[lang][chave] ?? DICT.pt[chave] ?? chave;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

/** Data ISO (aaaa-mm-dd) no formato do idioma: dd/mm/aaaa em português, aaaa-mm-dd em inglês. */
export const fmtData = (iso) => (lang === 'pt' ? iso.split('-').reverse().join('/') : iso);
/** Dia e mês de uma data ISO: dd/mm em português, mm/dd em inglês. */
export const fmtDiaMes = (iso) => (lang === 'pt' ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : `${iso.slice(5, 7)}/${iso.slice(8, 10)}`);

export function aplicar() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.title = t('doc.titulo');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('doc.descricao'));
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-attr]').forEach((e) => {
    e.dataset.i18nAttr.split(';').forEach((par) => { const [attr, k] = par.split(':'); e.setAttribute(attr, t(k)); });
  });
  document.querySelectorAll('[data-lang-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang)));
}

export function definir(l) {
  if (l !== 'pt' && l !== 'en') return;
  lang = l;
  try { localStorage.setItem(CHAVE, l); } catch (_) { /* sem storage */ }
  aplicar();
  ouvintes.forEach((fn) => fn(l));
}

export function iniciar() {
  lang = detectar();
  aplicar();
  document.querySelectorAll('[data-lang-btn]').forEach((b) => b.addEventListener('click', () => definir(b.dataset.langBtn)));
}
