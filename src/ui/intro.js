// Seção Início: números-chave calculados a partir dos dados reais.
import { $, fmt, fmtInt } from './util.js';
import { t, onLang, fmtData } from './i18n.js';

export function iniciarIntro(S) {
  const R = S.D.res, d = R.descritiva;
  function desenhar() {
    const itens = [[fmtInt(R.limpeza.n_blocos), t('ini.n.blocos')], [`${fmt(d.media_min, 2)} min`, t('ini.n.media')], [fmt(d.desvio_min / d.media_min, 2), t('ini.n.cv')],
      [fmt(R.contagem.indice_dispersao, 2), t('ini.n.disp')], [fmt(R.ajuste.KS_p_boot, 3), t('ini.n.ks')]];
    $('#hero-nums').innerHTML = itens.map(([a, b]) => `<div><strong>${a}</strong><span>${b}</span></div>`).join('');
    $('#ini-periodo').textContent = t('ini.periodo', { a: fmtData(R.janela.data_ini), b: fmtData(R.janela.data_fim) });   // o texto fixo em volta é recriado a cada troca de idioma
  }
  desenhar();
  onLang(desenhar);
  return {};
}
