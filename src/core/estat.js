// Estatística descritiva e ferramentas numéricas do laboratório (média, dispersão, KS, QQ, histograma, contagem por janela).
export const soma = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
export const media = (a) => soma(a) / a.length;
/** Variância amostral (divisor n-1), igual ao ddof=1 do numpy. */
export function variancia(a) {
  const m = media(a); let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return s / (a.length - 1);
}
/** Índice de dispersão (variância / média): 1 para a Poisson. */
export const indiceDispersao = (contagens) => variancia(contagens) / media(contagens);
/** IC aproximado de 95% do índice sob Poisson (aproximação normal: 1 ± 1,96·√(2/(n-1))). */
export const faixaDispersaoNula = (n) => { const d = 1.96 * Math.sqrt(2 / (n - 1)); return [1 - d, 1 + d]; };

export const ordenar = (a) => Float64Array.from(a).sort();

/** Quantil com interpolação linear (igual ao padrão do numpy). `ord` já ordenado. */
export function quantil(ord, p) {
  const h = (ord.length - 1) * p, i = Math.floor(h), f = h - i;
  return i + 1 < ord.length ? ord[i] + f * (ord[i + 1] - ord[i]) : ord[i];
}

/** Estatística de Kolmogorov-Smirnov: maior distância entre a ECDF e a CDF do modelo. `ord` ordenado. */
export function estatisticaKS(ord, cdf) {
  const n = ord.length; let d = 0;
  for (let i = 0; i < n; i++) {
    const F = cdf(ord[i]);
    d = Math.max(d, (i + 1) / n - F, F - i / n);
  }
  return d;
}

/** Probabilidades do QQ-plot: (i + 0,5)/m mais três pontos extras na cauda (como em analise.py). */
export function probsQQ(m = 400) {
  const ps = [];
  for (let i = 0; i < m; i++) ps.push((i + 0.5) / m);
  for (const e of [0.995, 0.999, 0.9995]) if (!ps.some((q) => Math.abs(q - e) < 1e-12)) ps.push(e);
  return ps.sort((a, b) => a - b);
}
/** Pontos do gráfico quantil-quantil nas probabilidades `ps`; devolve {p, emp, mod}. */
export function pontosQQ(ord, ppf, ps = probsQQ()) {
  return ps.map((p) => ({ p, emp: quantil(ord, p), mod: ppf(p) }));
}

/** Histograma com `nb` classes iguais em [lo, hi]; valores acima de hi vão para `acima`. */
export function histograma(dados, lo, hi, nb) {
  const cont = new Array(nb).fill(0), larg = (hi - lo) / nb; let acima = 0;
  for (let i = 0; i < dados.length; i++) {
    const v = dados[i];
    if (v >= hi) acima++; else if (v >= lo) cont[Math.floor((v - lo) / larg)]++;
  }
  return { cont, larg, lo, hi, acima };
}

/** Instantes de chegada (soma acumulada dos intervalos), começando em 0. */
export function chegadas(intervalos) {
  const t = new Float64Array(intervalos.length + 1);
  for (let i = 0; i < intervalos.length; i++) t[i + 1] = t[i] + intervalos[i];
  return t;
}

/** Contagem de chegadas em janelas consecutivas de largura `w` (mesma unidade dos instantes); descarta a última janela incompleta. */
export function contarPorJanela(tempos, w) {
  const total = tempos[tempos.length - 1], nj = Math.floor(total / w), c = new Array(nj).fill(0);
  for (let i = 0; i < tempos.length; i++) { const j = Math.floor(tempos[i] / w); if (j < nj) c[j]++; }
  return c;
}

/** Frequências de 0..kmax (última classe agrupa k >= kmax). */
export function frequencias(c, kmax) {
  const f = new Array(kmax + 1).fill(0);
  for (const v of c) f[Math.min(v, kmax)]++;
  return f;
}

/** Sobrevivência condicional: entre os valores > s, fração que também excede s + t. Devolve {n, p}. */
export function condicional(dados, s, t) {
  let n = 0, k = 0;
  for (let i = 0; i < dados.length; i++) if (dados[i] > s) { n++; if (dados[i] > s + t) k++; }
  return { n, k, p: n ? k / n : NaN };
}
export const incondicional = (dados, t) => { let k = 0; for (let i = 0; i < dados.length; i++) if (dados[i] > t) k++; return k / dados.length; };

/** IC de 95% de Wilson para uma proporção k/n. */
export function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - a) / d, (c + a) / d];
}
