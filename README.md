<p align="center"><img src="assets/logo_unisinos.png" alt="Unisinos" width="200"></p>

# Laboratório Bitcoin e Poisson: os blocos chegam ao acaso?

**Demonstração: <https://epineto.github.io/bitcoin-poisson-unisinos/>**

Laboratório interativo do trabalho final de **Probabilidade e Inferência Estatística** (PPGCA/Unisinos, 2026/2). A pergunta: os blocos do Bitcoin chegam como um processo de Poisson? Os dados são 20.000 blocos consecutivos (05/07/2026 a 21/11/2026) de `mempool.space`.

## Seções
- `#inicio`: pergunta, números-chave e a ideia em três passos.
- `#simulador`: linha do tempo animada (taxa, velocidade, pausa, semente), histograma crescente com a Exponencial teórica e botão para reproduzir a série real.
- `#intervalos`: histograma e QQ-plot dos intervalos reais com Exponencial, Gama ou Weibull, parâmetros ajustáveis, AIC e distância KS.
- `#contagem`: blocos por janela contra a Poisson, índice de dispersão e Monte Carlo.
- `#memoria`: ausência de memória com dados reais, simulados e um contraexemplo (Gama).
- `#espera`: risco de esperar mais de X minutos (modelo contra observado, IC por bootstrap) e padrão por hora do dia.
- `#dados`: ciclos de dificuldade, tratamento dos horários fora de ordem e limitações.

## Como executar
Aplicação estática (HTML, CSS e JavaScript puro, módulos ES, sem build e sem dependências). Precisa de servidor HTTP:

```
python3 -m http.server 8000      # depois abrir http://localhost:8000/
```

## Testes e reprodução
```
node --test tests/                                   # funções numéricas contra valores do scipy/numpy
python tools/exportar_dados.py                       # regenera data/*.json a partir de ../resultados e ../dados
python tools/gen_reference.py                        # regenera tests/reference.json
python tools/verificar.py http://127.0.0.1:8000/index.html   # Playwright: seções, interações, console, capturas
```

## Limitações
Um único período; horário do bloco declarado pelo minerador (a ordenação é uma correção); taxa variável entre ciclos; amostra grande detecta desvios pequenos; sem inferência causal e sem afirmações sobre preço ou mercado.

## Licença
MIT (ver `LICENSE`). Autor: Epitácio Vicente do Nascimento Neto.
