// Carga dos arquivos de data/ (a função `ler` é injetada: fetch no navegador, fs nos testes).
export async function carregarDados(ler) {
  const [iv, res, hora, cauda] = await Promise.all(['intervalos.json', 'resultados.json', 'hora_do_dia.json', 'caudas_grade.json'].map(async (n) => JSON.parse(await ler(n))));
  return { intervalos: Float64Array.from(iv.intervalos), meta: iv, res, hora, cauda };
}
