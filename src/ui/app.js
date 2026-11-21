// Ponto de entrada: tema, roteamento por âncora (#inicio … #dados), carga dos dados e inicialização das seções.
import { iniciarTema } from './tema.js';
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
    const er = $('#erro-carga');
    er.hidden = false;
    er.textContent = `Não foi possível carregar os dados (${e.message}). Servir a pasta por HTTP (ver README).`;
    console.error(e);
  }
}
main();
