"""Verificação no navegador (Playwright): percorre cada seção, exercita os controles, confere erros de console e salva capturas.

Uso:  ~/.venvs/unisinos/bin/python tools/verificar.py [url_base] [pasta_capturas]
Requer o laboratório servido por HTTP (ex.: python3 -m http.server 8765 dentro de lab/).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/index.html").split("#")[0]
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "_capturas")
OUT.mkdir(parents=True, exist_ok=True)
SECOES = ["inicio", "simulador", "intervalos", "contagem", "memoria", "espera", "dados"]
erros = []


def ir(pg, s):
    pg.goto(f"{BASE}#{s}")
    pg.wait_for_selector('html[data-pronto="1"]')
    pg.wait_for_timeout(300)


def interagir(pg, s):
    if s == "simulador":
        pg.click("#sim-reiniciar"); pg.click("#sim-1000"); pg.wait_for_timeout(1500)
        pg.fill("#sim-semente", "5"); pg.press("#sim-semente", "Enter")
        pg.click("#sim-modo-real"); pg.click("#sim-1000"); pg.check("#sim-real-ctn"); pg.wait_for_timeout(800)
        n = pg.evaluate("window.__modulos.simulador.__estado().n"); assert n >= 1000, n
        pg.click("#sim-modo-sim"); pg.click("#sim-play"); pg.click("#sim-play")
        pg.click("#sim-1000"); pg.hover("#sim-hist", position={"x": 120, "y": 90})
    elif s == "intervalos":
        pg.click('#int-modelo [data-m="Gama"]'); pg.fill("#int-p1", "2"); pg.dispatch_event("#int-p1", "input")
        pg.hover("#int-hist", position={"x": 200, "y": 120}); pg.wait_for_timeout(150)
        pg.click('#int-modelo [data-m="Weibull"]'); pg.click("#int-mv")
        a = pg.evaluate("window.__modulos.intervalos.__estado().aic"); assert abs(a - 295584.556) < 0.05, a
        pg.click('#int-modelo [data-m="Exponencial"]'); pg.hover("#int-qq", position={"x": 300, "y": 150})
    elif s == "contagem":
        pg.fill("#con-w", "30"); pg.dispatch_event("#con-w", "input"); pg.hover("#con-barras", position={"x": 200, "y": 150})
    elif s == "memoria":
        pg.click('#mem-fonte [data-f="gama"]'); pg.fill("#mem-s", "30"); pg.dispatch_event("#mem-s", "input"); pg.wait_for_timeout(200)
    elif s == "espera":
        pg.fill("#esp-x", "60"); pg.dispatch_event("#esp-x", "input"); pg.check("#esp-log"); pg.hover("#esp-calor", position={"x": 200, "y": 80})
    elif s == "dados":
        pg.click('#dad-trat [data-t="descartar"]'); pg.hover("#dad-ciclos", position={"x": 200, "y": 120})


with sync_playwright() as p:
    b = p.chromium.launch()
    for nome, vp, tema in (("desktop", {"width": 1280, "height": 900}, "light"), ("mobile", {"width": 420, "height": 860}, "light"), ("desktop-escuro", {"width": 1280, "height": 900}, "dark")):
        ctx = b.new_context(viewport=vp, color_scheme=tema)
        pg = ctx.new_page()
        pg.on("console", lambda m: erros.append(f"[{nome}] {m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda x: erros.append(f"[{nome}] pageerror: {x}"))
        for s in SECOES:
            print(nome, s, flush=True); ir(pg, s)
            interagir(pg, s)
            pg.wait_for_timeout(300)
            largura = pg.evaluate("document.documentElement.scrollWidth")
            if largura > vp["width"] + 1:
                erros.append(f"[{nome}] #{s}: rolagem horizontal ({largura} > {vp['width']})")
            pg.evaluate("window.scrollTo(0, 0)")
            pg.screenshot(path=str(OUT / f"{nome}-{s}.png"), full_page=True)
        ctx.close()
    b.close()
print("\n".join(erros) if erros else "sem erros de console e sem rolagem horizontal")
sys.exit(1 if erros else 0)
