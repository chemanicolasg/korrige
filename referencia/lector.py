"""Lector OMR: PDF escaneado -> respuestas por hoja (JSON).

Uso: python3 lector.py escaneo.pdf layout.json salida.json [carpeta_debug]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

DPI = 150
PX = DPI / 25.4  # pixeles por mm

# Umbrales sobre "relleno" (0 = blanco, 1 = negro) del interior de la burbuja
MARCADA = 0.40     # por encima: marcada
DUDOSA = 0.22      # entre DUDOSA y MARCADA: marca floja -> revisar


def render(pdf, outdir):
    subprocess.run(["pdftoppm", "-r", str(DPI), "-gray", "-png", pdf, f"{outdir}/p"], check=True)
    return sorted(Path(outdir).glob("p-*.png"), key=lambda p: int(p.stem.split("-")[1]))


def find_markers(gray):
    """Devuelve los centros de los 4 cuadrados negros de esquina (tl, tr, bl, br) o None."""
    h, w = gray.shape
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    cnts, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    side = 8 * PX
    cands = []
    for c in cnts:
        x, y, cw, ch = cv2.boundingRect(c)
        if not (0.6 * side < cw < 1.5 * side and 0.6 * side < ch < 1.5 * side):
            continue
        if not 0.75 < cw / ch < 1.33:
            continue
        if cv2.contourArea(c) / (cw * ch) < 0.85:  # cuadrado macizo (descarta QR, burbujas)
            continue
        cands.append((x + cw / 2, y + ch / 2))
    if len(cands) < 4:
        return None
    corners = {"tl": (0, 0), "tr": (w, 0), "bl": (0, h), "br": (w, h)}
    out = {}
    for k, (cx, cy) in corners.items():
        out[k] = min(cands, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
    if len({tuple(v) for v in out.values()}) < 4:
        return None
    return out


def homography(layout, markers):
    H = layout["page_mm"][1]
    src = np.float32([[layout["markers"][k][0], H - layout["markers"][k][1]] for k in ("tl", "tr", "bl", "br")])
    dst = np.float32([markers[k] for k in ("tl", "tr", "bl", "br")])
    return cv2.getPerspectiveTransform(src, dst)


def warp_points(Hm, layout, pts):
    H = layout["page_mm"][1]
    arr = np.float32([[[x, H - y]] for x, y in pts])
    return cv2.perspectiveTransform(arr, Hm).reshape(-1, 2)


def fill_score(gray, center, r_px):
    x, y = center
    r = int(round(r_px))
    x0, y0 = int(round(x)) - r, int(round(y)) - r
    patch = gray[max(y0, 0):y0 + 2 * r + 1, max(x0, 0):x0 + 2 * r + 1]
    if patch.size == 0:
        return 0.0
    yy, xx = np.mgrid[:patch.shape[0], :patch.shape[1]]
    mask = (xx - (x - max(x0, 0))) ** 2 + (yy - (y - max(y0, 0))) ** 2 <= r_px ** 2
    vals = patch[mask].astype(np.float32)
    return float((vals < 150).mean())  # fraccion de pixeles oscuros


def read_page(img_path, layout, debug_dir=None):
    gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
    res = {"pagina": int(img_path.stem.split("-")[1]), "incidencias": []}

    # Orientacion y QR: se localiza la zona del QR a partir de las marcas de esquina
    def try_orientation(g):
        m = find_markers(g)
        if m is None:
            return None, None, 0.0
        Hm_ = homography(layout, m)
        qx, qy, qw, qh = layout["qr"]
        pts = warp_points(Hm_, layout, [(qx - 3, qy + qh + 3), (qx + qw + 3, qy - 3)])
        (x0, y0), (x1, y1) = pts.astype(int)
        crop = g[max(y0, 0):y1, max(x0, 0):x1]
        dark = float((crop < 128).mean()) if crop.size else 0.0
        return m, crop, dark

    m0, crop0, d0 = try_orientation(gray)
    g180 = cv2.rotate(gray, cv2.ROTATE_180)
    m1, crop1, d1 = try_orientation(g180)
    if d1 > d0:  # el QR (zona muy oscura) esta abajo: hoja al reves
        gray, markers, crop = g180, m1, crop1
        res["incidencias"].append("Hoja escaneada al revés (corregido)")
    else:
        markers, crop = m0, crop0
    if markers is None:
        res["incidencias"].append("No se encuentran las 4 marcas de esquina")
        return res
    qr_txt = ""
    det = cv2.QRCodeDetector()
    for scale in (1, 2, 3):
        big = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        for img in (big, cv2.threshold(big, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]):
            qr_txt = det.detectAndDecode(cv2.copyMakeBorder(img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255))[0]
            if qr_txt:
                break
        if qr_txt:
            break
    res["qr"] = qr_txt or None
    if not qr_txt:
        res["incidencias"].append("QR no leído")

    Hm = homography(layout, markers)
    r_px = layout["radius_mm"] * PX * 0.75  # interior de la burbuja, sin el borde

    def scores(points):
        return [fill_score(gray, p, r_px) for p in warp_points(Hm, layout, points)]

    def decide(labels, sc):
        """Devuelve (valor, estado). estado: ok | blanco | doble | floja"""
        marcadas = [l for l, s in zip(labels, sc) if s >= MARCADA]
        flojas = [l for l, s in zip(labels, sc) if DUDOSA <= s < MARCADA]
        if len(marcadas) == 1 and not flojas:
            return marcadas[0], "ok"
        if len(marcadas) > 1:
            return "".join(marcadas), "doble"
        if len(marcadas) == 1 and flojas:
            return marcadas[0], "floja"  # una clara + otra a medias (¿borrón?)
        if flojas:
            return "".join(flojas), "floja"
        return "", "blanco"

    # NIA
    nia, nia_ok = "", True
    for col in layout["nia"]:
        v, st = decide([str(d) for d in range(10)], scores(col))
        nia += v if st == "ok" else "?"
        nia_ok &= st == "ok"
    res["nia"] = nia
    if not nia_ok:
        res["incidencias"].append(f"NIA incompleto o dudoso: {nia}")

    # Modelo y plantilla
    mods = list(layout["modelo"].keys())
    v, st = decide(mods, scores([layout["modelo"][m] for m in mods]))
    res["modelo"] = v if st == "ok" else None
    if st != "ok":
        res["incidencias"].append(f"Modelo {st}: {v or '-'}")
    res["es_plantilla"] = scores([layout["plantilla"]])[0] >= MARCADA

    # Respuestas
    ops = list(layout["opciones"])
    res["respuestas"], res["revisar"], res["scores"] = {}, {}, {}
    vis = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR) if debug_dir else None
    for q, opts in layout["preguntas"].items():
        sc = scores([opts[o] for o in ops])
        v, st = decide(ops, sc)
        res["respuestas"][q] = v if st == "ok" else ""
        res["scores"][q] = [round(s, 2) for s in sc]
        if st in ("doble", "floja"):
            res["revisar"][q] = f"{st}: {v}"
        if vis is not None:
            for (x, y), s in zip(warp_points(Hm, layout, [opts[o] for o in ops]), sc):
                col = (0, 180, 0) if s >= MARCADA else (0, 140, 255) if s >= DUDOSA else (200, 200, 200)
                cv2.circle(vis, (int(x), int(y)), int(r_px) + 3, col, 2)
    if vis is not None:
        cv2.imwrite(f"{debug_dir}/debug-{res['pagina']}.png", vis)

    res["en_blanco_total"] = all(v == "" for v in res["respuestas"].values()) and nia.strip("?") == ""
    return res


def main():
    pdf, layout_path, out = sys.argv[1:4]
    debug_dir = sys.argv[4] if len(sys.argv) > 4 else None
    layout = json.load(open(layout_path))
    with tempfile.TemporaryDirectory() as td:
        pages = [read_page(p, layout, debug_dir) for p in render(pdf, td)]
    json.dump(pages, open(out, "w"), indent=1, ensure_ascii=False)
    for p in pages:
        n = sum(1 for v in p["respuestas"].values() if v) if "respuestas" in p else 0
        print(p["pagina"], p.get("qr"), "NIA", p.get("nia"), "mod", p.get("modelo"),
              "plantilla" if p.get("es_plantilla") else "", f"{n} resp", "revisar:", p.get("revisar"), p["incidencias"])


if __name__ == "__main__":
    main()
