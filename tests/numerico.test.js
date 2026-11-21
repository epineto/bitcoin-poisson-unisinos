import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, sortearExp } from '../src/core/rng.js';
import { MODELOS, lgamma, poissonPmf, poissonCdf, logVerossimilhanca, aic } from '../src/core/dist.js';
import { media, indiceDispersao, estatisticaKS, pontosQQ, ordenar, quantil, chegadas, contarPorJanela, condicional, wilson, faixaDispersaoNula } from '../src/core/estat.js';
import { carregarDados } from '../src/core/dados.js';
import { lerJson, lerDados, perto } from './util.js';

const R = lerJson('tests/reference.json');
const D = await carregarDados(lerDados);

test('mulberry32 reproduz a sequência do Python', () => {
  for (const [s, ref] of Object.entries(R.mulberry32)) {
    const r = mulberry32(Number(s));
    ref.forEach((v, i) => assert.equal(r(), v, `semente ${s}, posição ${i}`));
  }
});

test('sorteio exponencial tem média próxima da pedida', () => {
  const r = mulberry32(7); let s = 0; const n = 200000;
  for (let i = 0; i < n; i++) s += sortearExp(r(), 10);
  perto(s / n, 10, 0.02);
});

test('lgamma confere com scipy.special.gammaln', () => {
  for (const [x, v] of Object.entries(R.lgamma)) perto(lgamma(Number(x)), v, 1e-10, `lgamma(${x})`);
});

for (const [nome, ref] of Object.entries(R.modelos)) {
  const M = MODELOS[nome] ?? (nome === 'Gama3' ? MODELOS.Gama : MODELOS.Weibull);
  test(`${nome}: pdf, cdf e quantil conferem com scipy`, () => {
    ref.xs.forEach((x, i) => { perto(M.cdf(x, ref.par), ref.cdf[i], 1e-9, `cdf(${x})`); perto(M.pdf(x, ref.par), ref.pdf[i], 1e-9, `pdf(${x})`); });
    ref.ps.forEach((p, i) => perto(M.ppf(p, ref.par), ref.ppf[i], 1e-8, `ppf(${p})`));
  });
  if (ref.aic !== undefined) {
    test(`${nome}: log-verossimilhança, AIC e estatística KS dos dados reais conferem com o Python`, () => {
      const ll = logVerossimilhanca(M, ref.par, D.intervalos);
      perto(ll, ref.loglik, 1e-9, 'loglik');
      perto(aic(ll, M.k), ref.aic, 1e-9, 'AIC');
      perto(estatisticaKS(ordenar(D.intervalos), (x) => M.cdf(x, ref.par)), ref.ks, 1e-9, 'KS');
    });
  }
}

test('Poisson: pmf e cdf conferem com scipy', () => {
  for (const [mu, ref] of Object.entries(R.poisson)) ref.pmf.forEach((v, k) => { perto(poissonPmf(k, Number(mu)), v, 1e-10, `pmf(${k};${mu})`); perto(poissonCdf(k, Number(mu)), ref.cdf[k], 1e-10, `cdf(${k};${mu})`); });
});

test('índice de dispersão das contagens por hora (1,0416) e média/variância', () => {
  const c = R.dados.contagem_por_hora;
  perto(indiceDispersao(c), R.dados.indice_dispersao, 1e-12);
  perto(media(c), R.dados.media_contagem, 1e-12);
  perto(indiceDispersao(c), 1.041551093603931, 1e-12);
});

test('contagem por janela a partir dos intervalos confere com o Python', () => {
  const t = chegadas(D.intervalos);
  for (const [w, ref] of Object.entries(R.dados.janelas)) {
    const c = contarPorJanela(t, Number(w));
    assert.equal(c.length, ref.n);
    perto(media(c), ref.media, 1e-12); perto(indiceDispersao(c), ref.indice, 1e-12);
  }
});

test('KS dos dados contra a Exponencial confere com resumo.json (0,00793)', () => {
  perto(estatisticaKS(ordenar(D.intervalos), (x) => MODELOS.Exponencial.cdf(x, [media(D.intervalos)])), R.dados.ks_exp, 1e-9);
});

test('QQ: quantis empíricos e do modelo conferem com resultados/qq_dados.csv', () => {
  const ord = ordenar(D.intervalos), mu = media(ord);
  const pts = pontosQQ(ord, (p) => MODELOS.Exponencial.ppf(p, [mu]));
  assert.equal(pts.length, R.dados.qq.p.length);
  pts.forEach((q, i) => { perto(q.emp / 60, R.dados.qq.emp_min[i], 1e-9, `emp ${i}`); perto(q.mod / 60, R.dados.qq.mod_min[i], 1e-9, `mod ${i}`); });
});

test('quantis lineares conferem com numpy', () => {
  const ord = ordenar(D.intervalos);
  for (const [p, v] of Object.entries(R.dados.quantis_np)) perto(quantil(ord, Number(p)), v, 1e-12);
});

test('probabilidade condicional confere com o Python', () => {
  for (const [k, ref] of Object.entries(R.dados.condicional)) {
    const [s, t] = k.split('_').map(Number), r = condicional(D.intervalos, s * 60, t * 60);
    assert.equal(r.n, ref.n); perto(r.p, ref.p, 1e-12);
  }
});

test('Wilson e faixa nula do índice de dispersão', () => {
  const [a, b] = wilson(50, 100); assert.ok(a < 0.5 && b > 0.5 && a > 0.39 && b < 0.61);
  const [lo, hi] = faixaDispersaoNula(3318); assert.ok(lo < 1 && hi > 1 && hi - lo < 0.1);
});

test('dados exportados coerentes com resumo (n, média)', () => {
  assert.equal(D.intervalos.length, 19990);
  perto(media(D.intervalos) / 60, D.res.descritiva.media_min, 1e-9);
  assert.equal(D.cauda.linhas.length, 120);
});
