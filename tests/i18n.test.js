import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import pt from '../src/i18n/pt.js';
import en from '../src/i18n/en.js';
import { lerTexto, lerJson, url } from './util.js';

test('dicionários PT e EN têm exatamente as mesmas chaves e nenhum valor vazio', () => {
  const a = Object.keys(pt).sort(), b = Object.keys(en).sort();
  assert.deepEqual(a.filter((k) => !(k in en)), [], 'faltam em EN');
  assert.deepEqual(b.filter((k) => !(k in pt)), [], 'faltam em PT');
  for (const k of a) { assert.ok(String(pt[k]).trim() !== '', 'PT vazio: ' + k); assert.ok(String(en[k]).trim() !== '', 'EN vazio: ' + k); }
});

test('os marcadores {var} de cada chave são os mesmos em PT e EN', () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of Object.keys(pt)) assert.equal(vars(pt[k]), vars(en[k]), `marcadores de ${k}`);
});

const html = lerTexto('index.html');

test('todas as chaves data-i18n do HTML existem nos dicionários', () => {
  const chaves = new Set();
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) chaves.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(';').forEach((p) => chaves.add(p.split(':')[1]));
  assert.ok(chaves.size > 100);
  assert.deepEqual([...chaves].filter((k) => !(k in pt) || !(k in en)), []);
});

test('o texto padrão do HTML é igual ao dicionário PT (sem JavaScript a página mostra o mesmo texto)', () => {
  const re = /<(\w+)\b[^>]*\bdata-i18n(-html)?="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
  let n = 0;
  for (const m of html.matchAll(re)) {
    const esperado = m[2] ? pt[m[3]] : pt[m[3]].replace(/&/g, '&amp;').replace(/</g, '&lt;');
    assert.equal(m[4], esperado, `HTML diverge do dicionário em ${m[3]}`);
    n++;
  }
  assert.ok(n > 80);
});

test('o seletor de idioma tem grupo, botões PT/EN, aria-pressed e lang', () => {
  assert.match(html, /<div class="idioma" role="group"[^>]*data-i18n-attr="aria-label:lang\.grupo"/);
  assert.match(html, /<button[^>]*data-lang-btn="pt"[^>]*lang="pt-BR"[^>]*aria-pressed="true"[^>]*>PT<\/button>/);
  assert.match(html, /<button[^>]*data-lang-btn="en"[^>]*lang="en"[^>]*aria-pressed="false"[^>]*>EN<\/button>/);
});

test('o HTML tem as âncoras de seção exigidas e a navegação aponta para elas', () => {
  for (const id of ['inicio', 'simulador', 'intervalos', 'contagem', 'memoria', 'espera', 'dados']) {
    assert.match(html, new RegExp(`<section id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test('toda chave literal usada na interface (src/ui) existe nos dois dicionários', () => {
  const usadas = new Set();
  const prefixos = 'ini|sim|int|con|mem|esp|dad|erro|g|u|modelo|dia|doc|nav|cab|lang|tema|rodape|og';
  for (const f of readdirSync(url('src/ui/'))) {
    if (!f.endsWith('.js')) continue;
    const src = lerTexto('src/ui/' + f);
    for (const m of src.matchAll(new RegExp(`'((?:${prefixos})\\.[A-Za-zÀ-ú0-9_.-]*[A-Za-z0-9_])'`, 'g'))) usadas.add(m[1]);
  }
  assert.ok(usadas.size > 100, `só ${usadas.size} chaves literais encontradas`);
  assert.deepEqual([...usadas].filter((k) => !(k in pt) || !(k in en)), []);
});

test('chaves construídas dinamicamente (prefixo + sufixo) existem nos dois dicionários', () => {
  const dados = lerJson('data/hora_do_dia.json'), res = lerJson('data/resultados.json');
  const dinamicas = {
    'dia.': dados.dias,
    'dia.abv.': dados.dias,
    'modelo.': res.modelos.map((m) => m.modelo),
    'dad.trat.': ['ordenar', 'descartar', 'trocar_por_1s'],
  };
  for (const [p, ss] of Object.entries(dinamicas)) for (const s of ss) { assert.ok(p + s in pt, 'PT: ' + p + s); assert.ok(p + s in en, 'EN: ' + p + s); }
});

test('nenhuma chave do dicionário fica sem uso (HTML ou JavaScript)', () => {
  const js = readdirSync(url('src/ui/')).filter((f) => f.endsWith('.js')).map((f) => lerTexto('src/ui/' + f)).join('\n');
  const noHtml = new Set();
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) noHtml.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(';').forEach((p) => noHtml.add(p.split(':')[1]));
  const dinamicos = /^(dia\.|modelo\.|dad\.trat\.)/;   // montadas com prefixo + sufixo (teste anterior)
  const orfas = Object.keys(pt).filter((k) => !noHtml.has(k) && !js.includes(`'${k}'`) && !dinamicos.test(k) && !/^doc\./.test(k));
  assert.deepEqual(orfas, []);
});

test('formatação numérica: vírgula decimal e milhar com ponto em PT; ponto decimal e milhar com vírgula em EN', () => {
  assert.equal((1234.5).toLocaleString('pt-BR', { minimumFractionDigits: 1 }), '1.234,5');
  assert.equal((1234.5).toLocaleString('en-US', { minimumFractionDigits: 1 }), '1,234.5');
});

test('voz impessoal: nenhum texto em PT usa primeira pessoa (eu, nós, meu, nosso, fiz, fizemos...)', () => {
  const proibido = /\b(eu|nós|meu|minha|meus|minhas|nosso|nossa|nossos|nossas|fiz|fizemos|escolhi|escolhemos|implementei|implementamos|criei|criamos|testei|testamos|usei|usamos|vimos|veremos|vamos|esperei)\b/i;
  for (const [k, v] of Object.entries(pt)) {
    const texto = String(v).replace(/<[^>]+>/g, ' ');
    assert.ok(!proibido.test(texto), `PT ${k}: primeira pessoa em "${texto}"`);
  }
  const proibidoEn = /\b(we|our|ours|my|mine|myself|ourselves|I)\b/;
  for (const [k, v] of Object.entries(en)) {
    const texto = String(v).replace(/<[^>]+>/g, ' ');
    assert.ok(!proibidoEn.test(texto), `EN ${k}: first person in "${texto}"`);
  }
});

test('o inglês não deixa palavras típicas do português nos textos', () => {
  const pt_tipico = /(\b(não|para|com|uma|dos|das|blocos|intervalos)\b|[ãçõ])/i;
  const permitidos = new Set(['modelo.Log-normal']);
  for (const [k, v] of Object.entries(en)) {
    if (permitidos.has(k)) continue;
    const texto = String(v).replace(/<[^>]+>/g, ' ').replace(/Epitácio|Unisinos|Capella/g, '');
    assert.ok(!pt_tipico.test(texto), `EN ${k}: parece português em "${texto}"`);
  }
});
