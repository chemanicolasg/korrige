"""Genera la hoja de respuestas OMR (A4) y su layout en JSON.

Toda la geometria se define aqui en mm, con origen en la esquina inferior
izquierda de la pagina. El lector usara el mismo JSON: las 4 marcas de
esquina permiten enderezar el escaneo y mapear cada burbuja.
"""
import json
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

EXAM_ID = sys.argv[1] if len(sys.argv) > 1 else "PRUEBA-01"
OUT = sys.argv[2] if len(sys.argv) > 2 else "hoja_respuestas_prueba.pdf"

W, H = 210, 297  # mm
N_PREG = 100
OPCIONES = "ABCDE"
MODELOS = "ABCD"
NIA_DIGITOS = 8

MARK = 8          # lado marca de esquina (mm)
MARGIN = 10       # distancia del borde a la marca
R = 2.1           # radio burbuja (mm)

GRIS = (0.35, 0.35, 0.35)
ROSA = (0.80, 0.20, 0.35)

layout = {"exam_id": EXAM_ID, "page_mm": [W, H], "markers": {}, "nia": [],
          "modelo": {}, "plantilla": None, "preguntas": {}, "radius_mm": R,
          "opciones": OPCIONES, "qr": None}

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle(f"Hoja de respuestas {EXAM_ID}")


def bubble(x, y, label):
    c.setStrokeColorRGB(*ROSA)
    c.setLineWidth(0.6)
    c.circle(x * mm, y * mm, R * mm, stroke=1, fill=0)
    c.setFillColorRGB(*ROSA)
    c.setFont("Helvetica", 5.5)
    c.drawCentredString(x * mm, (y - 0.9) * mm, label)


# --- Marcas de esquina (centro guardado en el layout) ---
c.setFillColorRGB(0, 0, 0)
for name, (x, y) in {
    "tl": (MARGIN, H - MARGIN - MARK), "tr": (W - MARGIN - MARK, H - MARGIN - MARK),
    "bl": (MARGIN, MARGIN), "br": (W - MARGIN - MARK, MARGIN),
}.items():
    c.rect(x * mm, y * mm, MARK * mm, MARK * mm, stroke=0, fill=1)
    layout["markers"][name] = [x + MARK / 2, y + MARK / 2]

# --- Cabecera ---
c.setFillColorRGB(0, 0, 0)
c.setFont("Helvetica-Bold", 12)
c.drawString(24 * mm, (H - 16) * mm, "UNIVERSITAT INTERNACIONAL DE CATALUNYA")
c.setFont("Helvetica", 10)
c.drawString(24 * mm, (H - 21.5) * mm, "Hoja de respuestas  ·  Examen tipo test")
c.setFont("Helvetica", 7.5)
c.setFillColorRGB(*GRIS)
c.drawString(24 * mm, (H - 26) * mm, f"Examen: {EXAM_ID}   (no escribir en las marcas negras ni en el código QR)")

# QR con el id del examen
qr_size = 24
qx, qy = W - 20 - qr_size - 6, H - 12 - qr_size
w = QrCodeWidget(f"UICOMR|{EXAM_ID}|v1")
b = w.getBounds()
d = Drawing(qr_size * mm, qr_size * mm,
            transform=[qr_size * mm / (b[2] - b[0]), 0, 0, qr_size * mm / (b[3] - b[1]), 0, 0])
d.add(w)
renderPDF.draw(d, c, qx * mm, qy * mm)
layout["qr"] = [qx, qy, qr_size, qr_size]

# Campos manuscritos
c.setFillColorRGB(0, 0, 0)
c.setStrokeColorRGB(0, 0, 0)
c.setLineWidth(0.4)
c.setFont("Helvetica", 8.5)
for i, campo in enumerate(["Apellidos y nombre", "Asignatura", "Fecha"]):
    y = H - 35 - i * 7
    c.drawString(24 * mm, y * mm, campo + ":")
    c.line(56 * mm, (y - 0.8) * mm, (W - 58) * mm, (y - 0.8) * mm)

# --- Bloque NIA ---
top = H - 62
c.setFont("Helvetica-Bold", 8)
c.drawString(24 * mm, top * mm, "NÚMERO DE IDENTIFICACIÓN (NIA)")
c.setFont("Helvetica", 6.5)
c.setFillColorRGB(*GRIS)
c.drawString(24 * mm, (top - 3.5) * mm, "Escribe un dígito por casilla y marca su burbuja debajo")
x0, dx, dy = 27, 6.2, 5.0
box_y = top - 11
c.setStrokeColorRGB(*GRIS)
for col in range(NIA_DIGITOS):
    x = x0 + col * dx
    c.rect((x - 2.6) * mm, box_y * mm, 5.2 * mm, 5.5 * mm, stroke=1, fill=0)
    col_b = []
    for dig in range(10):
        y = box_y - 4 - dig * dy
        bubble(x, y, str(dig))
        col_b.append([x, y])
    layout["nia"].append(col_b)

# --- Modelo y plantilla ---
mx = 90
c.setFillColorRGB(0, 0, 0)
c.setFont("Helvetica-Bold", 8)
c.drawString(mx * mm, top * mm, "MODELO DE EXAMEN")
for i, m in enumerate(MODELOS):
    x, y = mx + 3 + i * 7, top - 8
    bubble(x, y, m)
    layout["modelo"][m] = [x, y]

c.setFillColorRGB(0, 0, 0)
c.setFont("Helvetica-Bold", 8)
c.drawString(mx * mm, (top - 20) * mm, "SOLO PROFESORADO")
px, py = mx + 3, top - 27
bubble(px, py, "P")
layout["plantilla"] = [px, py]
c.setFont("Helvetica", 6.5)
c.setFillColorRGB(*GRIS)
c.drawString((px + 4) * mm, (py - 1) * mm, "Marcar si esta hoja es la PLANTILLA")
c.drawString((px + 4) * mm, (py - 4) * mm, "de respuestas correctas")

# Instrucciones
ix, iy = 145, top
c.setFillColorRGB(0, 0, 0)
c.setFont("Helvetica-Bold", 8)
c.drawString(ix * mm, iy * mm, "INSTRUCCIONES")
c.setFont("Helvetica", 6.8)
for k, t in enumerate([
    "Usa bolígrafo azul o negro.",
    "Rellena la burbuja por completo:",
    "", "",
    "Una sola respuesta por pregunta.",
    "Para corregir, usa corrector y",
    "vuelve a marcar.",
    "No dobles ni grapes la hoja.",
]):
    c.drawString(ix * mm, (iy - 4.5 - k * 3.6) * mm, t)
# ejemplo correcto / incorrecto
ey = iy - 4.5 - 2.6 * 3.6
c.setFillColorRGB(0, 0, 0)
c.circle((ix + 3) * mm, ey * mm, R * mm, stroke=0, fill=1)
c.setFont("Helvetica", 6.5)
c.drawString((ix + 6.5) * mm, (ey - 0.9) * mm, "Correcto")
c.setStrokeColorRGB(*ROSA)
c.circle((ix + 25) * mm, ey * mm, R * mm, stroke=1, fill=0)
c.setStrokeColorRGB(0, 0, 0)
c.setLineWidth(0.8)
c.line((ix + 23.6) * mm, (ey - 1.4) * mm, (ix + 26.4) * mm, (ey + 1.4) * mm)
c.line((ix + 23.6) * mm, (ey + 1.4) * mm, (ix + 26.4) * mm, (ey - 1.4) * mm)
c.drawString((ix + 28.5) * mm, (ey - 0.9) * mm, "Incorrecto")

# --- Respuestas: 4 columnas x 25 ---
sep_y = H - 132
c.setStrokeColorRGB(0, 0, 0)
c.setLineWidth(0.5)
c.line(22 * mm, sep_y * mm, (W - 22) * mm, sep_y * mm)
c.setFillColorRGB(0, 0, 0)
c.setFont("Helvetica-Bold", 8)
c.drawString(24 * mm, (sep_y - 4.5) * mm, "RESPUESTAS")

col_x = [30, 72, 114, 156]
ystart, rdy, odx = sep_y - 12, 5.6, 5.6
for q in range(N_PREG):
    col, row = divmod(q, 25)
    y = ystart - row * rdy
    if row % 5 == 0 and row:
        y -= 0  # ritmo uniforme; separacion visual por sombreado
    if (row // 5) % 2 == 1:
        c.setFillColorRGB(0.94, 0.94, 0.94)
        c.rect((col_x[col] - 8) * mm, (y - 2.8) * mm, 38 * mm, rdy * mm, stroke=0, fill=1)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString((col_x[col] - 3.5) * mm, (y - 1) * mm, str(q + 1))
    opts = {}
    for j, o in enumerate(OPCIONES):
        x = col_x[col] + j * odx
        bubble(x, y, o)
        opts[o] = [x, y]
    layout["preguntas"][str(q + 1)] = opts

c.setFillColorRGB(*GRIS)
c.setFont("Helvetica", 6)
c.drawCentredString(W / 2 * mm, 13 * mm, f"{EXAM_ID} · Hoja de respuestas · v1")
c.showPage()
c.save()

with open(OUT.replace(".pdf", "_layout.json"), "w") as f:
    json.dump(layout, f, indent=1)
print("ok", OUT)
