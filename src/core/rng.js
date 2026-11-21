// Gerador pseudoaleatório mulberry32 (semente de 32 bits) e sorteios simples. Mesma sequência do Python em tests/reference.json.
export function mulberry32(semente) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return proximo;
}

/** Sorteio Exponencial com média `media` (método da inversa); u em [0, 1). */
export const sortearExp = (u, media) => -Math.log(1 - u) * media;

/** Sorteio Gama com forma inteira `k` e média `media` (soma de k Exponenciais). */
export function sortearGamaInt(rnd, k, media) {
  let s = 0;
  for (let i = 0; i < k; i++) s += sortearExp(rnd(), media / k);
  return s;
}

/** Transforma texto livre em semente inteira positiva. */
export function semente(txt) {
  const n = Math.abs(Math.trunc(Number(txt)));
  return Number.isFinite(n) && n > 0 ? n % 4294967295 : 1;
}
