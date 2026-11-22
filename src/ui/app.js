// Ponto de entrada: idioma, tema, roteamento por âncora (#inicio … #dados), carga dos dados e inicialização das seções.
import { iniciarTema } from './tema.js';
import { iniciar as iniciarIdioma, t, onLang } from './i18n.js';
import { $, $$ } from './util.js';
import { carregarDados } from '../core/dados.js';
import { media, ordenar } from '../core/estat.js';
import { iniciarIntro } from './intro.js';
import { iniciarSimulador } from './simulador.js';
import { iniciarIntervalos } from './intervalos.js';
import { iniciarContagem } from './contagem.js';
import { iniciarMemoria } from './memoria.js';
import { iniciarEspera } from './espera.js';
import { iniciarDados } from './secao_dados.js';

const SECOES = ['inicio', 'simulador', 'intervalos', 'contagem', 'memoria', 'espera', 'dados'];
const modulos = {};
let atual = null;
let erroCarga = null;   // mensagem de erro da carga, traduzida de novo se o idioma mudar

function mostrarErro() {
  const er = $('#erro-carga');
  if (!erroCarga) { er.hidden = true; return; }
  er.hidden = false;
  er.textContent = t('erro.carga', { m: erroCarga });
}

function rota(primeira) {
  const h = decodeURIComponent(location.hash.slice(1));
  const id = SECOES.includes(h) ? h : 'inicio';
  SECOES.forEach((s) => document.getElementById(s).classList.toggle('ativa', s === id));
  $$('.nav a').forEach((a) => { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (!primeira) window.scrollTo({ top: 0 });
  if (atual && atual !== id) modulos[atual]?.desativar?.();
  atual = id;
  window.dispatchEvent(new Event('resize'));
  modulos[id]?.ativar?.();
}

async function main() {
  iniciarIdioma();
  onLang(mostrarErro);
  iniciarTema();
  rota(true);
  window.addEventListener('hashchange', () => rota(false));
  try {
    const ler = (nome) => fetch(`data/${nome}`).then((r) => { if (!r.ok) throw new Error(`data/${nome}: HTTP ${r.status}`); return r.text(); });
    const D = await carregarDados(ler);
    const S = { D, ord: ordenar(D.intervalos), mu: media(D.intervalos) };
    window.__lab = S;
    Object.assign(modulos, { inicio: iniciarIntro(S), simulador: iniciarSimulador(S), intervalos: iniciarIntervalos(S), contagem: iniciarContagem(S), memoria: iniciarMemoria(S), espera: iniciarEspera(S), dados: iniciarDados(S) });
    window.__modulos = modulos;
    rota(true);
    document.documentElement.dataset.pronto = '1';
  } catch (e) {
    erroCarga = e.message;
    mostrarErro();
    console.error(e);
  }
}
main();
