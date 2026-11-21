import { readFileSync } from 'node:fs';
export const url = (p) => new URL('../' + p, import.meta.url);
export const lerTexto = (p) => readFileSync(url(p), 'utf8');
export const lerJson = (p) => JSON.parse(lerTexto(p));
export const lerDados = async (nome) => lerTexto('data/' + nome);
export const perto = (a, b, tol, msg) => {
  if (!(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)))) throw new Error(`${msg ?? ''} esperado ${b}, obtido ${a} (tol ${tol})`);
};
