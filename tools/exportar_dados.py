"""Exporta de ../resultados e ../dados os JSON usados pelo laboratório (lab/data/).

Uso:  ~/.venvs/unisinos/bin/python tools/exportar_dados.py

Saídas
  data/intervalos.json   intervalos reais em segundos (horários ordenados, intervalos nulos descartados), na ordem de chegada
  data/resultados.json   números-chave, modelos, ausência de memória, caudas, ciclos, contagens, Monte Carlo
  data/hora_do_dia.json  blocos por hora (UTC) por dia da semana e hora do dia, com teste de homogeneidade
  data/caudas_grade.json P(T > x) observado e do modelo, com IC por bootstrap (B = 1000, semente fixa), x de 1 a 120 min

Somente números gerados em ../resultados (analise.py) e em ../dados/blocos.csv. Nenhuma credencial é lida.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

AQUI = Path(__file__).resolve().parent.parent
RAIZ = AQUI.parent
RES, DAD, OUT = RAIZ / "resultados", RAIZ / "dados", AQUI / "data"
OUT.mkdir(exist_ok=True)
SEMENTE = 20261204


def salvar(nome, obj):
    caminho = OUT / nome
    caminho.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{nome}: {caminho.stat().st_size / 1024:.1f} KiB")


def arred(x, n=6):
    if isinstance(x, (list, tuple, np.ndarray)):
        return [arred(v, n) for v in x]
    return None if x is None or (isinstance(x, float) and not np.isfinite(x)) else round(float(x), n)


def tabela(nome, ndig=6):
    df = pd.read_csv(RES / nome)
    return json.loads(df.round(ndig).to_json(orient="records", force_ascii=False))


def main():
    blocos = pd.read_csv(DAD / "blocos.csv")
    ts = np.sort(blocos.timestamp.to_numpy())
    d = np.diff(ts).astype(float)
    t = d[d > 0]                      # mesmo tratamento principal de analise.limpeza()
    resumo = json.loads((RES / "resumo.json").read_text())
    assert len(t) == resumo["limpeza"]["n_usados"], (len(t), resumo["limpeza"]["n_usados"])
    assert abs(t.mean() / 60 - resumo["descritiva"]["media_min"]) < 1e-9

    salvar("intervalos.json", {"unidade": "s", "n": int(len(t)), "primeiro_horario_utc": int(ts[0]),
                                "descricao": "Diferenças entre horários de bloco ordenados, sem os intervalos nulos (tratamento principal).",
                                "intervalos": [int(v) for v in t]})

    modelos = tabela("modelos_aic_bic.csv", 4)
    for m in modelos:
        m["parametros"] = json.loads(m["parametros"]) if isinstance(m["parametros"], str) else m["parametros"]

    mc = pd.read_csv(RES / "mc_dispersao_nula.csv").indice_dispersao.to_numpy()
    cont, bins = np.histogram(mc, bins=np.linspace(0.9, 1.1, 41))
    ciclos = tabela("ciclos.csv", 5)
    res = {
        "janela": resumo["janela"], "limpeza": resumo["limpeza"], "sens_limpeza": resumo["sens_limpeza"],
        "descritiva": resumo["descritiva"], "exp": resumo["exp"], "gama": resumo["gama"], "weibull_forma": resumo["weibull_forma"],
        "ajuste": resumo["ajuste"], "contagem": resumo["contagem"], "ciclos_resumo": resumo["ciclos"], "mediantime": resumo["mediantime"],
        "mc": resumo["mc"], "cobertura": resumo["cobertura"],
        "modelos": modelos, "ausencia_memoria": tabela("ausencia_memoria.csv"), "caudas": tabela("caudas.csv"),
        "ciclos": ciclos, "contagem_vs_poisson": tabela("contagem_vs_poisson.csv"),
        "mc_dispersao_hist": {"limites": arred(bins, 4), "contagens": [int(c) for c in cont], "n": int(len(mc))},
    }
    salvar("resultados.json", res)

    # --- hora do dia (UTC) e dia da semana, por horas cheias completas (mesma regra de analise.contagem_por_hora)
    h = (blocos.timestamp // 3600).astype(int)
    c = h.value_counts().sort_index()
    c = c.reindex(range(c.index.min() + 1, c.index.max()), fill_value=0)
    quando = pd.to_datetime(c.index.to_numpy() * 3600, unit="s", utc=True)
    df = pd.DataFrame({"n": c.to_numpy(), "dow": quando.dayofweek, "hora": quando.hour})
    media = df.n.mean()
    grade = df.groupby(["dow", "hora"]).n.agg(["mean", "count"]).reset_index()
    por_hora = df.groupby("hora").n.agg(["mean", "count"]).reset_index()
    soma = df.groupby("hora").n.sum().to_numpy()
    horas = df.groupby("hora").n.count().to_numpy()
    esp = horas * media
    chi = float(((soma - esp) ** 2 / esp).sum())
    gl = len(soma) - 1
    salvar("hora_do_dia.json", {
        "fuso": "UTC", "media_geral": arred(media), "n_horas": int(len(df)),
        "grade": [[arred(r["mean"], 3) for r in grade[grade.dow == d_].to_dict("records")] for d_ in range(7)],
        "grade_n": [[int(r["count"]) for r in grade[grade.dow == d_].to_dict("records")] for d_ in range(7)],
        "por_hora": [{"hora": int(r["hora"]), "media": arred(r["mean"], 4), "n_horas": int(r["count"])} for r in por_hora.to_dict("records")],
        "teste_hora": {"estatistica": arred(chi, 3), "gl": gl, "p": arred(stats.chi2.sf(chi, gl), 4)},
        "dias": ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"],
    })

    # --- cauda P(T > x) com IC por bootstrap (a proporção observada reamostrada equivale a Binomial(n, p)/n)
    rng = np.random.default_rng(SEMENTE)
    n, B = len(t), 1000
    idx = rng.integers(0, n, size=(B, n))
    medias_b = t[idx].mean(axis=1) / 60
    del idx
    xs = list(range(1, 121))
    linhas = []
    for x in xs:
        p = float((t > x * 60).mean())
        pb = rng.binomial(n, p, size=B) / n
        mod = np.exp(-x / (t.mean() / 60))
        mb = np.exp(-x / medias_b)
        linhas.append([x, arred(p, 7), arred(np.quantile(pb, .025), 7), arred(np.quantile(pb, .975), 7),
                       arred(mod, 7), arred(np.quantile(mb, .025), 7), arred(np.quantile(mb, .975), 7)])
    salvar("caudas_grade.json", {"colunas": ["x_min", "observado", "obs_inf", "obs_sup", "modelo", "mod_inf", "mod_sup"],
                                  "B": B, "semente": SEMENTE, "n": n, "linhas": linhas})
    for lim in (30, 60):   # conferência com caudas.csv (outro B e outra semente: diferenças só na 3ª casa dos IC)
        ref = pd.read_csv(RES / "caudas.csv").set_index("limite_min").loc[lim]
        mine = linhas[lim - 1]
        assert abs(mine[1] - ref.empirica) < 1e-6 and abs(mine[4] - ref.modelo_exp) < 1e-6
        print(f"x={lim}: IC modelo grade [{mine[5]:.5f}, {mine[6]:.5f}] vs caudas.csv [{ref.mod_ic_inf:.5f}, {ref.mod_ic_sup:.5f}]")


if __name__ == "__main__":
    main()
