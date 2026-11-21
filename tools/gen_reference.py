"""Gera tests/reference.json com valores de referência calculados pelo Python (scipy/numpy) que os testes em JavaScript reproduzem.

Uso:  ~/.venvs/unisinos/bin/python tools/gen_reference.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import special, stats

AQUI = Path(__file__).resolve().parent.parent
RAIZ = AQUI.parent
t = np.array(json.loads((AQUI / "data" / "intervalos.json").read_text())["intervalos"], dtype=float)
res = json.loads((RAIZ / "resultados" / "resumo.json").read_text())


def mulberry32(seed, n):
    a, out = seed & 0xFFFFFFFF, []
    for _ in range(n):
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        x = a
        x = ((x ^ (x >> 15)) * (x | 1)) & 0xFFFFFFFF
        x ^= (x + (((x ^ (x >> 7)) * (x | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        out.append(((x ^ (x >> 14)) & 0xFFFFFFFF) / 4294967296)
    return out


mu = t.mean()
xs = [5.0, 60.0, 300.0, 598.0, 1200.0, 1800.0, 3600.0, 5400.0]
ps = [0.01, 0.1, 0.5, 0.9, 0.99, 0.999]
modelos = {"Exponencial": [mu], "Gama": [1.003740646656124, 595.5493987024715], "Weibull": [0.9970017741995376, 597.0060880645331]}
dist = {"Exponencial": stats.expon(scale=mu), "Gama": stats.gamma(1.003740646656124, scale=595.5493987024715),
        "Weibull": stats.weibull_min(0.9970017741995376, scale=597.0060880645331)}
extra = {"Gama3": [3.0, 200.0, stats.gamma(3.0, scale=200.0)], "Weibull2": [2.0, 700.0, stats.weibull_min(2.0, scale=700.0)]}
ref = {"mulberry32": {str(s): mulberry32(s, 12) for s in (1, 42, 20261204)},
       "lgamma": {str(x): float(special.gammaln(x)) for x in (0.1, 0.5, 1, 2.5, 7, 30.5, 143.03)},
       "modelos": {}, "poisson": {}, "dados": {}}
for nome, par in modelos.items():
    d = dist[nome]
    ref["modelos"][nome] = {"par": par, "xs": xs, "cdf": [float(d.cdf(x)) for x in xs], "pdf": [float(d.pdf(x)) for x in xs],
                            "ps": ps, "ppf": [float(d.ppf(p)) for p in ps], "loglik": float(d.logpdf(t).sum()),
                            "aic": float(2 * len(par) - 2 * d.logpdf(t).sum()), "ks": float(stats.kstest(t, d.cdf).statistic)}
for nome, (k, s, d) in extra.items():
    ref["modelos"][nome] = {"par": [k, s], "xs": xs, "cdf": [float(d.cdf(x)) for x in xs], "pdf": [float(d.pdf(x)) for x in xs],
                            "ps": ps, "ppf": [float(d.ppf(p)) for p in ps]}
for m in (0.7, 6.0235, 30.0):
    ref["poisson"][str(m)] = {"pmf": [float(stats.poisson.pmf(k, m)) for k in range(0, 25)], "cdf": [float(stats.poisson.cdf(k, m)) for k in range(0, 25)]}

c = pd.read_csv(RAIZ / "resultados" / "contagem_por_hora.csv").blocos.to_numpy()
ref["dados"]["contagem_por_hora"] = [int(v) for v in c]
ref["dados"]["indice_dispersao"] = float(c.var(ddof=1) / c.mean())
ref["dados"]["media_contagem"] = float(c.mean())
ref["dados"]["variancia_contagem"] = float(c.var(ddof=1))
tempos = np.concatenate([[0], np.cumsum(t)])
janelas = {}
for w in (1800, 3600, 7200):
    nj = int(tempos[-1] // w)
    cont = np.bincount((tempos // w).astype(int), minlength=nj + 1)[:nj]
    janelas[str(w)] = {"n": nj, "media": float(cont.mean()), "var": float(cont.var(ddof=1)), "indice": float(cont.var(ddof=1) / cont.mean())}
ref["dados"]["janelas"] = janelas
q = pd.read_csv(RAIZ / "resultados" / "qq_dados.csv")
ref["dados"]["qq"] = {"p": q.p.round(6).tolist(), "emp_min": q.q_emp_min.tolist(), "mod_min": q.q_exp_min.tolist()}
ref["dados"]["quantis_np"] = {str(p): float(np.quantile(t, p)) for p in (0.05, 0.25, 0.5, 0.75, 0.95)}
ref["dados"]["media_s"] = float(mu)
ref["dados"]["n"] = int(len(t))
ref["dados"]["condicional"] = {f"{s}_{tt}": {"n": int((t > s * 60).sum()), "p": float(((t > (s + tt) * 60).sum()) / (t > s * 60).sum())} for s, tt in ((10, 10), (20, 10), (30, 20))}
ref["dados"]["ks_exp"] = res["ajuste"]["KS_obs"]
(AQUI / "tests" / "reference.json").write_text(json.dumps(ref, separators=(",", ":")))
print("ok", (AQUI / "tests" / "reference.json").stat().st_size // 1024, "KiB")
