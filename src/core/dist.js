// Distribuições usadas no laboratório: Exponencial, Gama, Weibull e Poisson (sem dependências). Verificadas contra o scipy em tests/.
const EPS = 1e-14;

/** log da função Gama (aproximação de Lanczos, g = 7). */
const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LG[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Função Gama incompleta regularizada inferior P(a, x). */
export function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let soma = 1 / a, termo = soma;
    for (let n = 1; n < 1000; n++) { termo *= x / (a + n); soma += termo; if (Math.abs(termo) < Math.abs(soma) * EPS) break; }
    return soma * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/** Inversão numérica de uma CDF crescente em [0, ∞) por bisecção. */
function inverter(cdf, p, escala) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  let lo = 0, hi = escala;
  while (cdf(hi) < p) { lo = hi; hi *= 2; if (hi > 1e12) return Infinity; }
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; if (hi - lo < 1e-13 * hi) break; }
  return (lo + hi) / 2;
}

/** Exponencial com média `m` (taxa 1/m). */
export const Exponencial = {
  nome: 'Exponencial', k: 1,
  logpdf: (x, [m]) => -Math.log(m) - x / m,
  pdf: (x, [m]) => (x < 0 ? 0 : Math.exp(-x / m) / m),
  cdf: (x, [m]) => (x <= 0 ? 0 : -Math.expm1(-x / m)),
  sf: (x, [m]) => (x <= 0 ? 1 : Math.exp(-x / m)),
  ppf: (p, [m]) => -Math.log1p(-p) * m,
  media: ([m]) => m,
};

/** Gama com forma `k` e escala `s` (média k·s). */
export const Gama = {
  nome: 'Gama', k: 2,
  logpdf: (x, [k, s]) => (k - 1) * Math.log(x) - x / s - k * Math.log(s) - lgamma(k),
  pdf: (x, [k, s]) => (x <= 0 ? (k === 1 ? 1 / s : 0) : Math.exp((k - 1) * Math.log(x) - x / s - k * Math.log(s) - lgamma(k))),
  cdf: (x, [k, s]) => gammaP(k, x / s),
  sf: (x, [k, s]) => 1 - gammaP(k, x / s),
  ppf: (p, [k, s]) => inverter((x) => gammaP(k, x / s), p, k * s),
  media: ([k, s]) => k * s,
};

/** Weibull com forma `k` e escala `l`. */
export const Weibull = {
  nome: 'Weibull', k: 2,
  logpdf: (x, [k, l]) => Math.log(k / l) + (k - 1) * Math.log(x / l) - (x / l) ** k,
  pdf: (x, [k, l]) => (x <= 0 ? (k === 1 ? 1 / l : 0) : (k / l) * (x / l) ** (k - 1) * Math.exp(-((x / l) ** k))),
  cdf: (x, [k, l]) => (x <= 0 ? 0 : -Math.expm1(-((x / l) ** k))),
  sf: (x, [k, l]) => (x <= 0 ? 1 : Math.exp(-((x / l) ** k))),
  ppf: (p, [k, l]) => l * (-Math.log1p(-p)) ** (1 / k),
  media: ([k, l]) => l * Math.exp(lgamma(1 + 1 / k)),
};

export const MODELOS = { Exponencial, Gama, Weibull };

/** Log-verossimilhança de `dados` sob o modelo `M` com parâmetros `par`. */
export function logVerossimilhanca(M, par, dados) {
  let s = 0;
  for (let i = 0; i < dados.length; i++) s += M.logpdf(dados[i], par);
  return s;
}
export const aic = (ll, k) => 2 * k - 2 * ll;
export const bic = (ll, k, n) => k * Math.log(n) - 2 * ll;

/** Poisson: P(X = k) com média `mu`. */
export const poissonPmf = (k, mu) => (k < 0 || !Number.isInteger(k) ? 0 : Math.exp(k * Math.log(mu) - mu - lgamma(k + 1)));
export function poissonCdf(k, mu) {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poissonPmf(i, mu);
  return Math.min(1, s);
}
