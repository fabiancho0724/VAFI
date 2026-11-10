import os
from PIL import Image, ImageDraw, ImageFont

output_dir = '/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027'
os.makedirs(output_dir, exist_ok=True)

# Colors UPTC
NAVY = (16, 44, 87)       # #102C57
GOLD = (184, 134, 11)     # #B8860B
DARK = (33, 37, 41)       # #212529
GRAY = (108, 117, 125)    # #6C757D
LIGHT_BG = (248, 249, 250)# #F8F9FA
WHITE = (255, 255, 255)
BLUE_ACCENT = (41, 128, 185)
GREEN_ACCENT = (39, 174, 96)
ORANGE_ACCENT = (230, 126, 34)
PURPLE_ACCENT = (142, 68, 173)

def get_font(size):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        try:
            return ImageFont.truetype("/System/Library/Fonts/SFNSText.ttf", size)
        except:
            return ImageFont.load_default()

font_title = get_font(24)
font_subtitle = get_font(15)
font_axis = get_font(13)
font_val = get_font(12)
font_bold = get_font(14)
font_small = get_font(11)

# ==============================================================================
# GRÁFICA 1: HISTÓRICO DE APORTES NACIÓN - FUNCIONAMIENTO (2016 - 2027)
# ==============================================================================
w, h = 1200, 650
im1 = Image.new('RGB', (w, h), color=WHITE)
d1 = ImageDraw.Draw(im1)

# Header
d1.rectangle([(0, 0), (w, 80)], fill=NAVY)
d1.text((30, 15), "UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)", fill=GOLD, font=font_subtitle)
d1.text((30, 40), "EVOLUCIÓN HISTÓRICA Y PROYECCIÓN: APORTES NACIÓN - FUNCIONAMIENTO (RECURSO 10.0)", fill=WHITE, font=font_title)

# Historical data (en miles de millones COP)
years = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027*']
vals = [127.3, 139.1, 151.4, 165.2, 177.1, 188.8, 204.5, 228.6, 252.3, 274.2, 364.0, 345.9]

gx0, gy0, gx1, gy1 = 100, 130, 1130, 560
d1.rectangle([(gx0, gy0), (gx1, gy1)], fill=LIGHT_BG, outline=GRAY, width=1)

# Grid lines (0 to 400 M)
max_val = 400.0
for grid_val in [100, 200, 300, 400]:
    y = gy1 - (grid_val / max_val) * (gy1 - gy0)
    d1.line([(gx0, y), (gx1, y)], fill=(220, 224, 230), width=1)
    d1.text((gx0 - 75, y - 8), f"${grid_val}B", fill=GRAY, font=font_val)

# Bars and line
n = len(years)
bar_w = 48
step = (gx1 - gx0) / n
points = []

for i, (yr, v) in enumerate(zip(years, vals)):
    cx = gx0 + i * step + step / 2
    bh = (v / max_val) * (gy1 - gy0)
    by = gy1 - bh
    
    # Bar
    b_color = GOLD if yr == '2027*' else BLUE_ACCENT
    d1.rectangle([(cx - bar_w/2, by), (cx + bar_w/2, gy1)], fill=b_color, outline=NAVY, width=1)
    
    # Text value above bar
    d1.text((cx - 20, by - 22), f"${v:.1f}", fill=NAVY, font=font_val)
    
    # Year label
    d1.text((cx - 18, gy1 + 10), yr, fill=DARK, font=font_axis)
    points.append((cx, by))

# Connect with line
for i in range(len(points) - 1):
    d1.line([points[i], points[i+1]], fill=NAVY, width=3)
    d1.ellipse([(points[i][0]-4, points[i][1]-4), (points[i][0]+4, points[i][1]+4)], fill=WHITE, outline=NAVY, width=2)
d1.ellipse([(points[-1][0]-5, points[-1][1]-5), (points[-1][0]+5, points[-1][1]+5)], fill=GOLD, outline=NAVY, width=2)

# Footnote
d1.text((100, 600), "* 2027: Asignación aprobada Unidad Administrativa ($345.930.009.082 COP). Fuente: SIIF Nación / MinHacienda.", fill=GRAY, font=font_small)

g1_path = os.path.join(output_dir, 'grafica_1_historico_aportes_nacion.png')
im1.save(g1_path)
print("Gráfica 1 guardada:", g1_path)

# ==============================================================================
# GRÁFICA 2: COMPOSICIÓN DE INGRESOS UNIDAD ADMINISTRATIVA 2027
# ==============================================================================
im2 = Image.new('RGB', (w, h), color=WHITE)
d2 = ImageDraw.Draw(im2)

d2.rectangle([(0, 0), (w, 80)], fill=NAVY)
d2.text((30, 15), "UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)", fill=GOLD, font=font_subtitle)
d2.text((30, 40), "ESTRUCTURA Y PARTICIPACIÓN DE LOS 11 RECURSOS DE INGRESO — VIGENCIA 2027", fill=WHITE, font=font_title)

# Resources data
rec_labels = [
    "R10.0 Aportes Nación Funcionamiento",
    "R10.5 Política de Gratuidad Doceavas",
    "R31 Posgrados (Cupo Administración)",
    "R20 Recursos Propios (Autogestión)",
    "R21 Devolución de IVA IES (DIAN)",
    "R17 Devolución Descuento Electoral",
    "R33 Convenios con Derechos (Cupo Adm.)",
    "R18 Artículo 87 CESU (Incremento PIB)",
    "R13 Excedentes Cooperativas",
    "R32 Extensión (Cupo Administración)",
    "R35 Educación Continuada (Cupo Adm.)"
]
rec_vals = [345930.0, 41501.1, 18868.5, 11131.5, 6471.8, 5774.4, 4848.5, 1964.4, 1719.1, 944.3, 702.8]
rec_pcts = [78.65, 9.44, 4.29, 2.53, 1.47, 1.31, 1.10, 0.45, 0.39, 0.21, 0.16]

bx0, by0, bx1 = 380, 110, 1120
row_h = 42

for idx, (label, val, pct) in enumerate(zip(rec_labels, rec_vals, rec_pcts)):
    y = by0 + idx * row_h
    # Label
    d2.text((30, y + 8), label, fill=DARK, font=font_val)
    
    # Bar background
    d2.rectangle([(bx0, y + 4), (bx1, y + 28)], fill=LIGHT_BG, outline=GRAY, width=1)
    
    # Bar fill
    max_pct = 80.0
    bar_len = (pct / max_pct) * (bx1 - bx0)
    color = NAVY if idx == 0 else (GOLD if "Cupo" in label else BLUE_ACCENT)
    d2.rectangle([(bx0, y + 4), (bx0 + bar_len, y + 28)], fill=color)
    
    # Value text
    val_str = f"${val:,.1f}M ({pct:.2f}%)"
    d2.text((bx0 + bar_len + 12, y + 8), val_str, fill=DARK, font=font_val)

d2.text((30, 595), "Total Aprobado: $439.856.349.610 COP (100.00%) | Azul Marino: Transferencia Nación | Dorado: Cupos Administrativos", fill=GRAY, font=font_small)

g2_path = os.path.join(output_dir, 'grafica_2_distribucion_ingresos_2027.png')
im2.save(g2_path)
print("Gráfica 2 guardada:", g2_path)

# ==============================================================================
# GRÁFICA 3: DESAGREGACIÓN DEL GASTO POR MACRO-OBJETO (CCP) 2027
# ==============================================================================
im3 = Image.new('RGB', (w, h), color=WHITE)
d3 = ImageDraw.Draw(im3)

d3.rectangle([(0, 0), (w, 80)], fill=NAVY)
d3.text((30, 15), "UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)", fill=GOLD, font=font_subtitle)
d3.text((30, 40), "DISTRIBUCIÓN DEL PRESUPUESTO DE GASTOS POR OBJETO ECONÓMICO (CCP) 2027", fill=WHITE, font=font_title)

# Categories
cats = [
    ("2.1.1.01 Planta Permanente (Docente, Admin, Oficiales)", 254961.2, 57.96, NAVY),
    ("2.1.1.02 Personal Ocasional, Catedrático y Supernumerario", 139762.3, 31.77, BLUE_ACCENT),
    ("2.1.2 Adquisición de Bienes y Servicios (Operación Campus)", 41006.4, 9.32, GOLD),
    ("2.1.8 Impuestos, Tasas y Cuota Contraloría", 3231.4, 0.73, ORANGE_ACCENT),
    ("2.1.3 Transferencias Corrientes (Sentencias y Bienestar)", 895.0, 0.20, PURPLE_ACCENT)
]

# Pie / Donut representation on left, bar breakdown on right
cx, cy, r_out, r_in = 280, 360, 180, 90
total_val = sum(c[1] for c in cats)

start_ang = -90
for name, val, pct, col in cats:
    sweep = (val / total_val) * 360
    end_ang = start_ang + sweep
    d3.pieslice([(cx - r_out, cy - r_out), (cx + r_out, cy + r_out)], start=start_ang, end=end_ang, fill=col, outline=WHITE, width=2)
    start_ang = end_ang

# Inner circle for donut
d3.ellipse([(cx - r_in, cy - r_in), (cx + r_in, cy + r_in)], fill=WHITE, outline=GRAY, width=1)
d3.text((cx - 65, cy - 18), "$439.856M", fill=NAVY, font=font_bold)
d3.text((cx - 45, cy + 5), "Total Gasto", fill=GRAY, font=font_small)

# Legend on the right
lx0, ly0 = 540, 140
for idx, (name, val, pct, col) in enumerate(cats):
    ly = ly0 + idx * 85
    # Color box
    d3.rectangle([(lx0, ly), (lx0 + 30, ly + 30)], fill=col, outline=NAVY, width=1)
    # Title
    d3.text((lx0 + 45, ly), name, fill=DARK, font=font_bold)
    # Amount and percent
    d3.text((lx0 + 45, ly + 25), f"${val:,.1f} Millones COP  —  {pct:.2f}% del presupuesto total", fill=GRAY, font=font_axis)

# Bottom note
d3.text((100, 600), "Gastos de Personal totales (2.1.1) absorben el 89,74% ($394.723M). Bienes y Servicios (2.1.2) cubren el 9,32% ($41.006M).", fill=GRAY, font=font_small)

g3_path = os.path.join(output_dir, 'grafica_3_estructura_gasto_ccp_2027.png')
im3.save(g3_path)
print("Gráfica 3 guardada:", g3_path)

# ==============================================================================
# GRÁFICA 4: EQUILIBRIO PRESUPUESTAL EXACTO (INGRESO VS GASTO) 2027
# ==============================================================================
im4 = Image.new('RGB', (w, h), color=WHITE)
d4 = ImageDraw.Draw(im4)

d4.rectangle([(0, 0), (w, 80)], fill=NAVY)
d4.text((30, 15), "UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)", fill=GOLD, font=font_subtitle)
d4.text((30, 40), "MATRIZ DE EQUILIBRIO FINANCIERO: INGRESOS VS. GASTOS (DIFERENCIA = $0 COP)", fill=WHITE, font=font_title)

# Two large pillars
px_ing = 320
px_gas = 880
py_base = 520
bar_h = 360

# Ingreso bar
d4.rectangle([(px_ing - 140, py_base - bar_h), (px_ing + 140, py_base)], fill=NAVY, outline=GOLD, width=3)
d4.text((px_ing - 110, py_base - bar_h - 45), "INGRESO TOTAL", fill=NAVY, font=font_title)
d4.text((px_ing - 125, py_base - bar_h + 30), "$ 439.856.349.610", fill=WHITE, font=font_title)
d4.text((px_ing - 70, py_base - bar_h + 75), "100.00 %", fill=GOLD, font=font_bold)

# Subcomponents of ingreso
d4.text((px_ing - 120, py_base - bar_h + 140), "• Nación: $396.888M (90.2%)", fill=WHITE, font=font_val)
d4.text((px_ing - 120, py_base - bar_h + 175), "• Cupos Adm.: $25.364M (5.8%)", fill=WHITE, font=font_val)
d4.text((px_ing - 120, py_base - bar_h + 210), "• Propios/IVA: $17.603M (4.0%)", fill=WHITE, font=font_val)

# Gasto bar
d4.rectangle([(px_gas - 140, py_base - bar_h), (px_gas + 140, py_base)], fill=(34, 112, 94), outline=GOLD, width=3)
d4.text((px_gas - 100, py_base - bar_h - 45), "GASTO TOTAL", fill=NAVY, font=font_title)
d4.text((px_gas - 125, py_base - bar_h + 30), "$ 439.856.349.610", fill=WHITE, font=font_title)
d4.text((px_gas - 70, py_base - bar_h + 75), "100.00 %", fill=GOLD, font=font_bold)

# Subcomponents of gasto
d4.text((px_gas - 120, py_base - bar_h + 140), "• Personal: $394.723M (89.7%)", fill=WHITE, font=font_val)
d4.text((px_gas - 120, py_base - bar_h + 175), "• Bienes/Serv.: $41.006M (9.3%)", fill=WHITE, font=font_val)
d4.text((px_gas - 120, py_base - bar_h + 210), "• Tributos/Transf.: $4.126M (0.9%)", fill=WHITE, font=font_val)

# Center Equal Badge
d4.rectangle([(530, 260), (670, 360)], fill=GOLD, outline=NAVY, width=2)
d4.text((585, 270), "=", fill=NAVY, font=get_font(48))
d4.text((545, 330), "BALANCE: $0", fill=NAVY, font=font_bold)

# Footnote
d4.text((150, 580), "PRINCIPIO DE EQUILIBRIO PRESUPUESTAL: Ingresos y Gastos cuadran exactamente al peso ($0 COP de diferencia).", fill=DARK, font=font_bold)

g4_path = os.path.join(output_dir, 'grafica_4_equilibrio_ingreso_vs_gasto.png')
im4.save(g4_path)
print("Gráfica 4 guardada:", g4_path)

# ==============================================================================
# GRÁFICA 5: ESTRUCTURA DE CUPOS ASIGNADOS A LA ADMINISTRACIÓN (R31, 32, 33, 35)
# ==============================================================================
im5 = Image.new('RGB', (w, h), color=WHITE)
d5 = ImageDraw.Draw(im5)

d5.rectangle([(0, 0), (w, 80)], fill=NAVY)
d5.text((30, 15), "UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)", fill=GOLD, font=font_subtitle)
d5.text((30, 40), "RECURSOS DE CUPOS ASIGNADOS A LA ADMINISTRACIÓN CENTRAL: $25.364.088.328 COP", fill=WHITE, font=font_title)

cupos_info = [
    ("R31 - POSGRADOS", 18868.5, 74.39, NAVY, "Matrículas Posgrado -> Nómina central y plataformas virtuales"),
    ("R33 - CONVENIOS CON DERECHOS", 4848.5, 19.12, BLUE_ACCENT, "Retención institucional -> Primas, vacaciones y logística"),
    ("R32 - EXTENSIÓN", 944.3, 3.72, GOLD, "Asesorías y consultoría -> Prestaciones y servicios públicos"),
    ("R35 - EDUCACIÓN CONTINUADA", 702.8, 2.77, GREEN_ACCENT, "Diplomados y cursos -> Prestaciones y energía/campus")
]

cy0 = 120
for idx, (name, val, pct, col, dest) in enumerate(cupos_info):
    y = cy0 + idx * 105
    # Box card
    d5.rectangle([(50, y), (1150, y + 85)], fill=LIGHT_BG, outline=GRAY, width=1)
    d5.rectangle([(50, y), (60, y + 85)], fill=col)
    
    # Titles
    d5.text((80, y + 12), name, fill=NAVY, font=font_title)
    d5.text((80, y + 48), dest, fill=GRAY, font=font_axis)
    
    # Values
    d5.text((880, y + 12), f"$ {val:,.1f}M COP", fill=col, font=font_title)
    d5.text((950, y + 48), f"{pct:.2f}% de cupos", fill=DARK, font=font_bold)

d5.text((50, 580), "Total Cupos Administrativos: $25.364.088.328 COP (5,77% del presupuesto general administrativo de la UPTC).", fill=DARK, font=font_bold)

g5_path = os.path.join(output_dir, 'grafica_5_cupos_administrativos.png')
im5.save(g5_path)
print("Gráfica 5 guardada:", g5_path)

print("Todas las 5 gráficas institucionales fueron generadas exitosamente en:", output_dir)
