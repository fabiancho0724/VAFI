#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Documento Oficial en Word (.docx)
Presupuesto General UPTC 2027
Centro Institucional de Inteligencia Presupuestal y Financiera
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

output_dir = '/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027'
docx_path = os.path.join(output_dir, 'Documento_Tecnico_Presupuesto_UPTC_2027.docx')
doc_root_copy = '/Users/fabiancely/Documents/Programacion/VAFI/Documento_Tecnico_Soporte_Presupuesto_UPTC_2027.docx'

doc = docx.Document()

# Configurar márgenes estándar (2.5 cm = 0.984 in)
sections = doc.sections
for s in sections:
    s.top_margin = Inches(1.0)
    s.bottom_margin = Inches(1.0)
    s.left_margin = Inches(1.0)
    s.right_margin = Inches(1.0)

# Colores institucionales
COLOR_NAVY = RGBColor(16, 44, 87)       # Azul UPTC institucional
COLOR_GOLD = RGBColor(184, 134, 11)     # Dorado institucional
COLOR_DARK = RGBColor(33, 37, 41)       # Texto oscuro
COLOR_GRAY = RGBColor(108, 117, 125)    # Gris secundario

# Estilos base
style_normal = doc.styles['Normal']
style_normal.font.name = 'Calibri'
style_normal.font.size = Pt(11)
style_normal.font.color.rgb = COLOR_DARK
style_normal.paragraph_format.line_spacing = 1.15
style_normal.paragraph_format.space_after = Pt(6)

def set_cell_background(cell, fill_hex):
    """Aplica color de fondo a una celda en Word"""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Establece márgenes internos de celda en dxa"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_header_paragraph(text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    if level == 1:
        run.font.size = Pt(16)
        run.font.color.rgb = COLOR_NAVY
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.color.rgb = COLOR_GOLD
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
    elif level == 3:
        run.font.size = Pt(11.5)
        run.font.color.rgb = COLOR_NAVY
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
    return p

def add_callout(text, title="NOTA DE AUDITORÍA Y CONTROL DE CALIDAD:"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8F9FA")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Borde izquierdo grueso azul
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="36" w:space="0" w:color="102C57"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(4)
    r_title = p.add_run(f"■ {title}\n")
    r_title.bold = True
    r_title.font.size = Pt(10.5)
    r_title.font.color.rgb = COLOR_NAVY
    
    r_text = p.add_run(text)
    r_text.font.size = Pt(10)
    r_text.font.color.rgb = COLOR_DARK
    doc.add_paragraph() # Espacio

def format_styled_table(tbl, col_widths, headers, data, align_rights=[]):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Encabezado
    hdr_row = tbl.rows[0]
    for idx, name in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.text = name
        cell.width = col_widths[idx]
        set_cell_background(cell, "102C57") # Navy
        set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)
        if idx in align_rights:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            
    # Datos
    for r_idx, row_data in enumerate(data):
        row = tbl.add_row()
        bg_color = "FFFFFF" if r_idx % 2 == 0 else "F4F6F9"
        is_total_row = (r_idx == len(data) - 1 and ("TOTAL" in str(row_data[0]) or "TOTAL" in str(row_data[1])))
        if is_total_row:
            bg_color = "E9ECEF"
            
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = str(val)
            cell.width = col_widths[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            if len(p.runs) > 0:
                p.runs[0].font.size = Pt(9)
                if is_total_row:
                    p.runs[0].font.bold = True
                    p.runs[0].font.color.rgb = COLOR_NAVY
                else:
                    p.runs[0].font.color.rgb = COLOR_DARK
            if c_idx in align_rights:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    doc.add_paragraph()

# =============================================================
# 1. PORTADA INSTITUCIONAL
# =============================================================
p_pre = doc.add_paragraph()
p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_pre = p_pre.add_run("UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA\nVICERRECTORÍA ADMINISTRATIVA Y FINANCIERA — DIRECCIÓN DE PLANEACIÓN\nCENTRO INSTITUCIONAL DE INTELIGENCIA PRESUPUESTAL Y FINANCIERA\n")
r_pre.font.size = Pt(11)
r_pre.font.bold = True
r_pre.font.color.rgb = COLOR_GOLD

p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_before = Pt(36)
p_title.paragraph_format.space_after = Pt(18)
r_title = p_title.add_run("DOCUMENTO TÉCNICO DE SOPORTE DEL PROYECTO DE ACUERDO DE PRESUPUESTO\n")
r_title.font.size = Pt(20)
r_title.font.bold = True
r_title.font.color.rgb = COLOR_NAVY

r_sub = p_title.add_run("PRESUPUESTO GENERAL DE RENTAS, INGRESOS, RECURSOS DE CAPITAL Y APROPIACIONES DE GASTO\nVIGENCIA FISCAL 2027\n")
r_sub.font.size = Pt(13)
r_sub.font.bold = True
r_sub.font.color.rgb = COLOR_DARK

p_monto = doc.add_paragraph()
p_monto.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_monto.paragraph_format.space_before = Pt(24)
p_monto.paragraph_format.space_after = Pt(40)
r_monto = p_monto.add_run("MONTO CONSOLIDADO:\n$ 490.351.599.254 COP\n")
r_monto.font.size = Pt(18)
r_monto.font.bold = True
r_monto.font.color.rgb = COLOR_GOLD
r_monto_letras = p_monto.add_run("(Cuatrocientos noventa mil trescientos cincuenta y un millones quinientos noventa y nueve mil doscientos cincuenta y cuatro pesos m/cte)")
r_monto_letras.font.size = Pt(10)
r_monto_letras.font.italic = True

p_pie = doc.add_paragraph()
p_pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_pie.paragraph_format.space_before = Pt(80)
r_pie = p_pie.add_run("SISTEMA MULTIAGENTE DE INTELIGENCIA FINANCIERA, PRESUPUESTAL, ESTADÍSTICA Y NORMATIVA\nTUNJA — DUITAMA — SOGAMOSO — CHIQUINQUIRÁ\nNOVIEMBRE DE 2026")
r_pie.font.size = Pt(10)
r_pie.font.color.rgb = COLOR_GRAY

doc.add_page_break()

# =============================================================
# 2. RESUMEN EJECUTIVO PARA EL CONSEJO SUPERIOR UNIVERSITARIO
# =============================================================
add_header_paragraph("RESUMEN EJECUTIVO PARA EL CONSEJO SUPERIOR UNIVERSITARIO", 1)
doc.add_paragraph(
    "El presente Documento Técnico de Soporte constituye el expediente formal de fundamentación, sustentación "
    "y justificación analítica del Proyecto de Acuerdo por el cual se adopta el Presupuesto General de la "
    "Universidad Pedagógica y Tecnológica de Colombia (UPTC) para la vigencia fiscal comprendida entre el 1° de "
    "enero y el 31 de diciembre de 2027. Ha sido estructurado por el Centro Institucional de Inteligencia Presupuestal "
    "y Financiera, bajo un riguroso esquema de auditoría cruzada multidisciplinaria."
)

doc.add_paragraph(
    "El presupuesto para la vigencia 2027 se fija en la suma de $490.351.599.254 COP, distribuidos en un 95,68% "
    "para Gastos de Funcionamiento ($469.165.055.681 COP) y un 4,32% para Gastos de Inversión ($21.186.543.573 COP). "
    "El presupuesto resultante se encuentra rigurosamente equilibrado al peso ($0 COP de diferencia), garantizando que "
    "cada apropiación cuente con su correspondiente fuente de ingreso cierta, legal y exigible."
)

# Tabla Resumen Balance General
headers_bal = ["Componente Presupuestal", "Valor Proyectado 2027 ($)", "Particip. %", "Variación vs. 2026"]
data_bal = [
    ["1. GASTOS DE FUNCIONAMIENTO", "469.165.055.681", "95,68 %", "+7,10 % (Inercial)"],
    ["   - Servicios Personales de Planta (Nómina)", "349.850.000.000", "71,35 %", "Indexación + Puntos"],
    ["   - Gastos Generales (Operación y Bienes)", "111.415.055.681", "22,72 %", "Servicios/Seguros/TIC"],
    ["   - Transferencias, Pensiones y Tasas", "7.900.000.000", "1,61 %", "Obligaciones de ley"],
    ["2. GASTOS DE INVERSIÓN (18 Proyectos PDI)", "21.186.543.573", "4,32 %", "+20,10 % vs inicial"],
    ["   - Eje 1: Articulación Misional Calidad Académica", "14.138.209.000", "2,88 %", "12 Proyectos BPIN"],
    ["   - Eje 2: Componentes Transversales Excelencia", "1.488.697.000", "0,30 %", "2 Proyectos BPIN"],
    ["   - Eje 3: Campus Amigable y Sostenible", "5.559.637.573", "1,14 %", "4 Proyectos BPIN"],
    ["TOTAL PRESUPUESTO INSTITUCIONAL UPTC 2027", "490.351.599.254", "100,00 %", "EQUILIBRIO TOTAL $0"]
]
tbl_bal = doc.add_table(rows=1, cols=4)
format_styled_table(tbl_bal, [Inches(2.8), Inches(1.8), Inches(1.0), Inches(1.4)], headers_bal, data_bal, align_rights=[1, 2])

add_callout(
    "1. Blindaje de la Gratuidad (Subrecurso 10.5): Giro en doceavas regulares por MinHacienda ($4.402,9M/mes, total $52.834M anuales), "
    "garantizando la matrícula cero de más de 28.000 estudiantes de pregrado sin tensiones de liquidez.\n"
    "2. Suavización Exponencial en Estampilla UNAL (R12): Se adoptó SES (α=0,3) por $8.416M amortiguando los picos no recurrentes de 2023 y 2025.\n"
    "3. Cumplimiento de la Ordenanza 051 de 2018 (R40): Distribución exacta de la Estampilla Pro-UPTC ($4.458M) en 60% Bienestar ($2.675M), "
    "20% Regionalización ($891,8M) y 20% Construcción ($891,8M).\n"
    "4. Cuadratura al Peso en Autogestión (R20): $13.979.053.203 COP con diferencia de $0 COP, reclasificando el concepto a 'Posgrados y Extensiones'.\n"
    "5. Calificación Técnica de Auditoría: 98,0 / 100 puntos — APROBADO TÉCNICAMENTE.",
    title="SÍNTESIS DE LAS CINCO DECISIONES TÉCNICAS ESTRATÉGICAS ADOPTADAS:"
)

doc.add_page_break()

# =============================================================
# 3. LOS 20 CAPÍTULOS OBLIGATORIOS COMPLETOS
# =============================================================

# CAPÍTULO 1
add_header_paragraph("CAPÍTULO 1. IDENTIFICACIÓN DEL PROYECTO DE ACUERDO", 1)
doc.add_paragraph(
    "El proyecto corresponde al Acuerdo del Consejo Superior Universitario 'Por el cual se aprueba el Presupuesto General "
    "de Rentas, Ingresos y Recursos de Capital, y de Apropiaciones de Gastos de Funcionamiento e Inversión de la Universidad "
    "Pedagógica y Tecnológica de Colombia (UPTC) para la vigencia fiscal comprendida entre el 1° de enero y el 31 de diciembre "
    "de 2027'. La entidad titular es un Ente Universitario Autónomo del orden nacional, vinculado al Ministerio de Educación "
    "Nacional, con personería jurídica, autonomía académica, administrativa y financiera, y patrimonio independiente (Art. 69 C.P. "
    "y Ley 30 de 1992)."
)
doc.add_paragraph(
    "El aforo y asignación presupuestal definitivo se fija en la suma de CUATROCIENTOS NOVENTA MIL TRESCIENTOS CINCUENTA Y UN "
    "MILLONES QUINIENTOS NOVENTA Y NUEVE MIL DOSCIENTOS CINCUENTA Y CUATRO PESOS MONEDA CORRIENTE ($490.351.599.254 COP), "
    "cuya discusión y aprobación compete exclusivamente al Consejo Superior Universitario conforme al literal d) del artículo 65 de la Ley 30 de 1992."
)

# CAPÍTULO 2
add_header_paragraph("CAPÍTULO 2. INTRODUCCIÓN Y OBJETO DEL DOCUMENTO TÉCNICO", 1)
doc.add_paragraph(
    "El presente documento técnico proporciona la fundamentación conceptual, jurídica, econométrica y financiera autosuficiente "
    "que ampara el proyecto de presupuesto para 2027. La planeación presupuestal en las universidades estatales no constituye un "
    "ejercicio estático de extrapolación aritmética; exige un análisis riguroso de las fuentes de financiación, las restricciones "
    "de destinación legal específica y los compromisos misionales irreductibles consagrados en el Plan de Desarrollo Institucional (PDI)."
)
doc.add_paragraph(
    "El objeto central radica en garantizar solidez normativa inobjetable, consistencia matemática con prueba de error cero al peso, "
    "realizabilidad en los aforos de ingresos corrientes y de capital, y equilibrio presupuestal vinculante entre fuentes y gastos."
)

# CAPÍTULO 3
add_header_paragraph("CAPÍTULO 3. ANTECEDENTES Y JUSTIFICACIÓN INSTITUCIONAL", 1)
doc.add_paragraph(
    "La UPTC, con presencia multicampus en Tunja, Duitama, Sogamoso, Chiquinquirá y extensiones en Boyacá, Cundinamarca y Santander, "
    "alberga una matrícula activa superior a los 28.000 estudiantes. En el último cuatrienio, la universidad transitó hacia el modelo "
    "de Gratuidad Universal de matrícula en pregrado formalizado por la Ley 2307 de 2023. Este cambio transformó la estructura de caja: "
    "los cobros directos de matrícula estudiantil ordinaria en Recursos Propios (R20) fueron sustituidos por aportes públicos de la Nación."
)
doc.add_paragraph(
    "Simultáneamente, la planta de personal docente y administrativo ha experimentado un crecimiento inercial de costos asociado a la "
    "productividad académica (Decreto 1279 de 2002), mientras que la expansión de la infraestructura física demanda recursos crecientes "
    "de mantenimiento, seguros y conectividad. La formulación del presupuesto 2027 responde a la necesidad imperativa de salvaguardar "
    "la alta calidad institucional y garantizar la prestación ininterrumpida del servicio público educativo."
)

# CAPÍTULO 4
add_header_paragraph("CAPÍTULO 4. MARCO JURÍDICO Y NORMATIVO APLICABLE", 1)
doc.add_paragraph(
    "El régimen jurídico y financiero que sustenta la formulación presupuestal está integrado por normas de obligatorio acatamiento:"
)
doc.add_paragraph(
    "1. Constitución Política de Colombia (Arts. 69, 352 y 353): Consagran la autonomía universitaria y determinan que las entidades públicas "
    "descentralizadas se rigen por los principios de legalidad del gasto y equilibrio financiero del Estatuto Orgánico del Presupuesto.\n"
    "2. Decreto 111 de 1996 (Estatuto Orgánico del Presupuesto Nacional): Fija los principios rectores de Planificación, Anualidad, "
    "Universalidad, Unidad de Caja, Especialización e Inembargabilidad.\n"
    "3. Ley 30 de 1992 (Arts. 65, 86 y 87): Marco general de financiamiento de las universidades estatales. El artículo 65 otorga "
    "al Consejo Superior la potestad de aprobar el presupuesto.\n"
    "4. Ley 2568 de 2026: Modifica sustancialmente los artículos 86 y 87 de la Ley 30/92, estableciendo que los aportes del PGN deben "
    "ajustarse anualmente como mínimo con base en la variación del Índice de Costos de la Educación Superior (ICES) calculado por el DANE "
    "o el IPC (el que resulte mayor), más una regla de crecimiento no inferior al 70% del crecimiento real del PIB.\n"
    "5. Ley 2307 de 2023 y Decreto 2271 de 2023: Establecen la gratuidad universal en la matrícula de pregrado financiada por el Estado.\n"
    "6. Ley 1697 de 2013 y Res. MEN 24509 de 2021: Regulan la Estampilla Pro-UNAL y demás IES (Recurso 12), con destinación exclusiva a "
    "infraestructura, laboratorios y TIC, distribuida en un 70% entre las universidades públicas según número de graduados.\n"
    "7. Ordenanza 051 de 2018 (Asamblea de Boyacá): Regula la Estampilla Pro-UPTC (Recurso 40), ordenando su distribución obligatoria: "
    "60% Bienestar Universitario, 20% Regionalización y 20% Construcción.\n"
    "8. Leyes 403 de 1997 y 815 de 2003: Compensación del 10% por descuento de sufragantes (Recurso 17).\n"
    "9. Ley 1819 de 2016 (Art. 142): Asignación tributaria de excedentes financieros del sector cooperativo (Recurso 13).\n"
    "10. Decreto 1279 de 2002: Régimen salarial y prestacional de los docentes universitarios."
)

# CAPÍTULO 5
add_header_paragraph("CAPÍTULO 5. METODOLOGÍA DE ANÁLISIS Y FORMULACIÓN PRESUPUESTAL", 1)
doc.add_paragraph(
    "La formulación del presupuesto se fundamenta en un proceso sistemático de ocho fases auditables: (1) Inventario y diagnóstico documental, "
    "(2) Depuración de series históricas y aislamiento de picos atípicos, (3) Modelación econométrica comparada, (4) Construcción del modelo de ingresos, "
    "(5) Modelación analítica de necesidades de gasto, (6) Balance y equilibrio cruzado, (7) Auditoría técnica independiente, y (8) Producción documental."
)
doc.add_paragraph(
    "Se aplicaron los principios innegociables de no utilizar tasas uniformes para rentas de distinta naturaleza económica, no financiar gastos recurrentes "
    "con ingresos extraordinarios de vigencias anteriores, y verificar la cuadratura exacta al peso en cada componente presupuestal."
)

# CAPÍTULO 6
add_header_paragraph("CAPÍTULO 6. DIAGNÓSTICO DEL COMPORTAMIENTO HISTÓRICO DE LOS INGRESOS", 1)
doc.add_paragraph(
    "El diagnóstico histórico (2008–2026) confirma que el 88,4% de las rentas institucionales proviene de transferencias directas de la Nación "
    "con baja volatilidad estocástica. En el Recurso 10.0 (Aportes de Funcionamiento), la serie creció de $127.302 millones en 2016 a $252.310 millones "
    "en 2024 y $364.009.300.613 COP en la base certificada de 2026, reflejando la incorporación en la base de las nivelaciones salariales docentes."
)
doc.add_paragraph(
    "En contraste, las rentas parafiscales de inversión muestran alta dispersión cíclica: la Estampilla Pro-UNAL (R12) registró picos en 2023 ($9.612M "
    "en asignación y $13.869M en caja) y 2025 ($14.785M), seguidos de contracciones severas en 2024 ($6.431M) y 2026 ($7.265M asignados), causadas por giros "
    "acumulados de la DIAN. En los Recursos Propios (R20), la serie se estabilizó en $13.187.794.757 COP en 2026 tras el traslado de pregrado a la gratuidad."
)

# CAPÍTULO 7
add_header_paragraph("CAPÍTULO 7. ANÁLISIS DE LAS FUENTES DE FINANCIACIÓN", 1)
doc.add_paragraph(
    "Las diez fuentes de ingreso de la UPTC se clasifican en tres categorías operativas y normativas:\n"
    "• Fuentes de Funcionamiento con Respaldo Nacional: R10.0 (Aportes Ordinarios), R10.5 (Gratuidad Doceavas MinHacienda), R13 (Cooperativas), "
    "R17 (Descuento Votación) y R18 (Artículo 87 Ley 30). Proveen $450.233 millones con flujo garantizado de tesorería.\n"
    "• Fondos Especiales de Inversión: R16.0 (Inversión PGN por $8.310M), R12 (Estampilla UNAL por $8.416M) y R40 (Estampilla UPTC por $4.458M). "
    "Totalizan $21.186.543.573 COP con destinación exclusiva a laboratorios, TIC, obras y el 60/20/20 de la Ordenanza 051/18.\n"
    "• Fuentes Propias y Tributarias: R20 (Autogestión de posgrados, extensión y certificados por $13.979M) y R21 (Devolución ordinaria de IVA por $4.952M)."
)

# CAPÍTULO 8
add_header_paragraph("CAPÍTULO 8. METODOLOGÍA DE PROYECCIÓN DE INGRESOS", 1)
doc.add_paragraph(
    "Para cada renta se aplicó el método cuantitativo de mayor idoneidad conceptual y empírica:\n"
    "1. Suavización Exponencial Simple (SES, α=0,3) para el Recurso 12: Ecuación St = 0,3·Yt + 0,7·St-1. Arroja $8.416.752.884 COP. "
    "Amortigua los saltos atípicos de 2023 y 2025 y se ubica un 6,6% por debajo del recaudo de 2026 ($9.015M), protegiendo a la universidad de déficits.\n"
    "2. Indexación Macroeconómica Legal (+6,44%) para R10.0 y R18: Crecimiento nominal decretado por el PGN bajo el piso vinculante de la Ley 2568 de 2026.\n"
    "3. Criterio de Prudencia Fiscal (+6,0%) para R40: Se indexó el presupuesto inicial 2026 ($4.206M) en lugar del valor aforado, obteniendo $4.458.831.679 COP, "
    "lo que deja un margen de seguridad de $1.538 millones frente al modelo ARIMA ($5.997M).\n"
    "4. Indexación Paramétrica (+6,0%) sobre Base Real Certificada para R20, R21, R10.5 y R13."
)

# CAPÍTULO 9
add_header_paragraph("CAPÍTULO 9. RESULTADOS DE LAS PROYECCIONES DE INGRESOS", 1)
doc.add_paragraph(
    "La matriz consolidada de los 19 conceptos presupuestales oficiales de ingreso para la vigencia fiscal 2027 se presenta a continuación:"
)

headers_ing = ["Concepto Presupuestal Oficial", "Rec.", "Base 2026 ($)", "Tasa / Modelo", "Proyección 2027 ($)", "Part. %"]
data_ing = [
    ["Aportes Nacion - Funcionamiento", "10.0", "364.009.300.613", "+6,44% PGN", "387.451.499.572", "79,01 %"],
    ["Politica de Gratuidad (Doceavas MinHacienda)", "10.5", "49.844.177.233", "+6,00% Macro", "52.834.827.867", "10,77 %"],
    ["Estampilla Pro-UNAL y demas IES (SES α=0,3)", "12", "7.265.094.590", "SES α=0,3", "8.416.752.884", "1,72 %"],
    ["Excedentes Financieros de Cooperativas", "13", "1.621.758.749", "+6,00% Macro", "1.719.064.274", "0,35 %"],
    ["Aportes para Inversion PGN (Dec. 1599/2026)", "16.0", "7.728.720.060", "+7,53% MEN", "8.310.959.010", "1,69 %"],
    ["Devolucion Descuento Electoral Votacion", "17", "5.643.330.479", "+6,00% Macro", "5.981.930.308", "1,22 %"],
    ["Articulo 87 CESU (Incremento PIB Nacional)", "18", "2.110.231.259", "+6,44% PGN", "2.246.130.152", "0,46 %"],
    ["SUBTOTAL RECURSOS NACIÓN (7 CONCEPTOS)", "PGN", "438.222.612.983", "+6,78% Prom.", "466.961.164.067", "95,23 %"],
    ["Certificaciones y constancias", "20", "44.343.950", "+6,00%", "47.004.587", "0,01 %"],
    ["Comercio, comidas y alojamiento", "20", "2.562.971.129", "+6,00%", "2.716.749.397", "0,55 %"],
    ["Minerales, electricidad y gas", "20", "83.257.428", "+6,00%", "88.252.874", "0,02 %"],
    ["Pregrado - Derechos complementarios", "20", "3.773.314.576", "+6,00%", "3.999.713.451", "0,82 %"],
    ["Pregrado - Derechos de grado", "20", "736.345.940", "+6,00%", "780.526.696", "0,16 %"],
    ["Pregrado - Inscripciones", "20", "2.026.330.700", "+6,00%", "2.147.910.542", "0,44 %"],
    ["Matriculas posgrados y extensiones", "20", "3.772.930.728", "Ajuste peso", "3.999.306.572", "0,82 %"],
    ["Productos metalicos, maquinaria y equipo", "20", "9.307.590", "+6,00%", "9.866.045", "0,00 %"],
    ["Sanciones administrativas e intereses", "20", "23.297.850", "+6,00%", "24.695.721", "0,01 %"],
    ["Servicios financieros, inmobiliarios y leasing", "20", "155.686.149", "+6,00%", "165.027.318", "0,03 %"],
    ["SUBTOTAL RECURSOS PROPIOS (10 CONCEPTOS)", "20-PROP", "13.187.794.757", "+6,00%", "13.979.053.203", "2,85 %"],
    ["Devolucion de IVA IES (Art. 92 Ley 30)", "21", "4.672.217.269", "+6,00% Base Dep.", "4.952.550.305", "1,01 %"],
    ["Estampilla Pro-UPTC (Ordenanza 051/2018)", "40", "4.206.444.980", "+6,00% Base Inic.", "4.458.831.679", "0,91 %"],
    ["TOTAL GENERAL DE INGRESOS UPTC 2027", "UPTC", "460.289.070.009", "+6,53% Oficial", "490.351.599.254", "100,00 %"]
]
tbl_ing = doc.add_table(rows=1, cols=6)
format_styled_table(tbl_ing, [Inches(2.5), Inches(0.6), Inches(1.3), Inches(1.0), Inches(1.3), Inches(0.7)], headers_ing, data_ing, align_rights=[2, 4, 5])

# CAPÍTULO 10
add_header_paragraph("CAPÍTULO 10. DIAGNÓSTICO Y ANÁLISIS DEL GASTO", 1)
doc.add_paragraph(
    "El análisis financiero del gasto revela un elevado grado de inflexibilidad estructural. La nómina docente y administrativa, "
    "regulada por escalas públicas y el régimen de productividad del Decreto 1279 de 2002, representa compromisos irreductibles que "
    "superan el 71% del presupuesto global. Adicionalmente, la operación física de los campus de Tunja, Duitama, Sogamoso y Chiquinquirá "
    "demanda contratos de tracto sucesivo de seguridad armada, aseo integral y facturación de servicios públicos que no pueden suspenderse. "
    "Por ende, el modelo de gasto prioriza la cobertura plena del funcionamiento operativo y concentra el esfuerzo expansivo en el "
    "portafolio de 18 proyectos BPIN de inversión financiados con rentas de afectación especial."
)

# CAPÍTULO 11
add_header_paragraph("CAPÍTULO 11. METODOLOGÍA DE ESTIMACIÓN DE LAS APROPIACIONES", 1)
doc.add_paragraph(
    "Las apropiaciones de gasto se determinaron mediante modelación analítica diferenciada:\n"
    "• Servicios Personales (2.1.1): Proyectados en $349.850.000.000 COP, incorporando el incremento salarial nacional (+6,44%), "
    "el efecto vegetativo de ascensos y puntos salariales docentes, y las provisiones legales para cesantías y seguridad social.\n"
    "• Adquisición de Bienes y Servicios (2.1.2): Estimados en $111.415.055.681 COP, calculados sobre los costos de los contratos marco "
    "institucionales indexados a la inflación de insumos (+6,0%).\n"
    "• Gastos de Inversión (2.3): Fijados en $21.186.543.573 COP, correspondientes con exactitud a la disponibilidad de las fuentes de "
    "inversión (R16=$8.310M, R12=$8.416M, R40=$4.458M), asignados al banco de 18 proyectos priorizados por el Comité Consultivo de Planeación."
)

# CAPÍTULO 12
add_header_paragraph("CAPÍTULO 12. PROPUESTA DE DISTRIBUCIÓN PRESUPUESTAL", 1)
doc.add_paragraph(
    "Los gastos de inversión se distribuyen en 18 proyectos alineados con el Plan Estratégico de Desarrollo (PDI 2019–2030):"
)

headers_inv = ["Eje PDI / Código", "Nombre del Proyecto de Inversión", "Apropiación ($)", "Fuente Principal", "Aporte R40 ($)"]
data_inv = [
    ["27.1.1.1.1", "Fortalecimiento de la Calidad Académica de la UPTC", "902.283.000", "R16 PGN", "0"],
    ["27.1.1.1.2", "Dotación de Bibliotecas UPTC (Tunja, Duitama, Sogamoso, Chiquinquirá)", "1.789.337.000", "R40 / R16", "624.415.000"],
    ["27.1.1.1.3", "Pares Evaluadores Externos de productividad", "200.000.000", "R16 PGN", "0"],
    ["27.1.1.1.4", "Fomento de la Educación Inclusiva y Diversa", "200.000.000", "R16 PGN", "0"],
    ["27.1.1.1.5", "Ecosistema Institucional de Educación Virtual e Híbrida", "140.000.000", "R16 PGN", "0"],
    ["27.1.1.3.1", "Apoyo a monitorías estudiantiles", "555.150.000", "R40 / R16", "265.142.000"],
    ["27.1.2.1.1", "Implantación del Sistema de Investigación Universitaria", "7.139.905.000", "R12 / R40", "1.696.484.000"],
    ["27.1.2.1.2", "Fortalecimiento de la Unidad Editorial", "609.735.000", "R16 PGN", "0"],
    ["27.1.2.2.1", "Desarrollo Tecnológico, Innovación y Emprendimiento", "1.000.000.000", "R40 / R12", "159.085.000"],
    ["27.1.2.2.2", "Bases de datos para Investigación Universitaria", "1.250.000.000", "R12 UNAL", "0"],
    ["27.1.2.3.1", "Implantación del Sistema de Extensión Universitaria", "331.799.000", "R40 / R16", "108.266.336"],
    ["27.1.2.3.2", "Programa de Bienestar y Protección Animal", "20.000.000", "R16 PGN", "0"],
    ["SUBTOTAL EJE 1", "12 PROYECTOS ARTICULACIÓN MISIONAL CALIDAD", "14.138.209.000", "PDI Eje 1", "2.853.392.336"],
    ["27.2.4.1.1", "Implementación del programa Universidad Saludable", "486.093.000", "R40 Bienestar", "486.093.000"],
    ["27.2.5.1.1", "Modelo de Gestión de Internacionalización", "1.002.604.000", "R40 / R16", "227.580.000"],
    ["SUBTOTAL EJE 2", "2 PROYECTOS TRANSVERSALES EXCELENCIA", "1.488.697.000", "PDI Eje 2", "713.673.000"],
    ["27.3.1.1.1", "Red de Sistematización y Computación de la UPTC", "1.351.725.000", "R12 UNAL", "0"],
    ["27.3.1.1.2", "Licencias Académico-Administrativas", "550.000.000", "R16 PGN", "0"],
    ["27.3.3.1.1", "Plan mejoramiento locativo acreditación multicampus", "500.000.000", "R16 PGN", "0"],
    ["27.3.3.1.2", "Construcción, dotación y adecuación de espacios físicos", "3.157.912.573", "R40 / R16", "891.766.336"],
    ["SUBTOTAL EJE 3", "4 PROYECTOS CAMPUS AMIGABLE Y ENTORNO", "5.559.637.573", "PDI Eje 3", "891.766.336"],
    ["TOTAL INVERSIÓN", "18 PROYECTOS BPIN VIABILIZADOS COMITÉ PLANEACIÓN", "21.186.543.573", "R12+R16+R40", "4.458.831.679"]
]
tbl_inv = doc.add_table(rows=1, cols=5)
format_styled_table(tbl_inv, [Inches(1.2), Inches(2.7), Inches(1.3), Inches(1.0), Inches(1.1)], headers_inv, data_inv, align_rights=[2, 4])

# CAPÍTULO 13
add_header_paragraph("CAPÍTULO 13. ANÁLISIS DEL EQUILIBRIO PRESUPUESTAL", 1)
doc.add_paragraph(
    "En estricto cumplimiento del principio constitucional de equilibrio presupuestal (Art. 352 C.P.) y del Estatuto Orgánico "
    "del Presupuesto (Decreto 111 de 1996), se demuestra que la sumatoria total de ingresos proyectados iguala de forma exacta al "
    "total de apropiaciones autorizadas de gasto, arrojando una diferencia neta de cero pesos ($0 COP):"
)
doc.add_paragraph(
    "• Total Presupuesto de Ingresos: $490.351.599.254,00 COP\n"
    "• Total Presupuesto de Gastos: $490.351.599.254,00 COP\n"
    "• Superávit / Déficit Inicial Programado: $0,00 COP (Cuadratura Exacta al Peso)"
)

headers_eq = ["Recurso", "Nombre de la Fuente de Financiación", "Ingreso ($)", "Funcionamiento ($)", "Inversión ($)", "Total Gasto ($)", "Balance ($)"]
data_eq = [
    ["10.0", "Aportes Nacion Funcionamiento", "387.451.499.572", "387.451.499.572", "0", "387.451.499.572", "$0"],
    ["10.5", "Politica Gratuidad Doceavas MinHacienda", "52.834.827.867", "52.834.827.867", "0", "52.834.827.867", "$0"],
    ["12", "Estampilla Pro-UNAL (SES α=0,3)", "8.416.752.884", "0", "8.416.752.884", "8.416.752.884", "$0"],
    ["13", "Excedentes Financieros Cooperativas", "1.719.064.274", "1.719.064.274", "0", "1.719.064.274", "$0"],
    ["16.0", "Aportes Inversion PGN (Dec. 1599/2026)", "8.310.959.010", "0", "8.310.959.010", "8.310.959.010", "$0"],
    ["17", "Devolucion Descuento Votacion", "5.981.930.308", "5.981.930.308", "0", "5.981.930.308", "$0"],
    ["18", "Articulo 87 CESU (Incremento PIB)", "2.246.130.152", "2.246.130.152", "0", "2.246.130.152", "$0"],
    ["20", "Recursos Propios (10 Conceptos)", "13.979.053.203", "13.979.053.203", "0", "13.979.053.203", "$0"],
    ["21", "Devolucion IVA IES (Art. 92 Ley 30)", "4.952.550.305", "4.952.550.305", "0", "4.952.550.305", "$0"],
    ["40", "Estampilla Pro-UPTC (Ordenanza 051/18)", "4.458.831.679", "0", "4.458.831.679", "4.458.831.679", "$0"],
    ["TOTAL", "PRESUPUESTO GENERAL UPTC 2027", "490.351.599.254", "469.165.055.681", "21.186.543.573", "490.351.599.254", "$0"]
]
tbl_eq = doc.add_table(rows=1, cols=7)
format_styled_table(tbl_eq, [Inches(0.6), Inches(2.2), Inches(1.1), Inches(1.1), Inches(0.9), Inches(1.1), Inches(0.6)], headers_eq, data_eq, align_rights=[2, 3, 4, 5, 6])

# CAPÍTULO 14
add_header_paragraph("CAPÍTULO 14. EVALUACIÓN DE SOSTENIBILIDAD FINANCIERA", 1)
doc.add_paragraph(
    "La evaluación de sostenibilidad financiera concluye que el presupuesto 2027 es altamente solvente y viable. "
    "El 95,2% de los ingresos está sustentado en transferencias directas de la Nación y parafiscalidad formalmente decretada. "
    "El nuevo esquema de giro mensual en doceavas para la gratuidad ($4.402,9M/mes) y los aportes de funcionamiento ($32.287,6M/mes) "
    "elimina el riesgo de cesación de pagos de nómina y garantiza que la universidad no requiera recurrir a endeudamiento bancario "
    "ni a sobregiros para cubrir compromisos de caja en el primer trimestre."
)

# CAPÍTULO 15
add_header_paragraph("CAPÍTULO 15. ANÁLISIS DE ESCENARIOS Y SENSIBILIDAD", 1)
doc.add_paragraph(
    "Se contrastaron cuatro escenarios analíticos para medir la capacidad de respuesta institucional:\n"
    "• Escenario 1: Conservador / Prudente (Adoptado): $490.351.599.254 COP (+5,77% vs 2026). Garantiza ejecución sin interrupciones.\n"
    "• Escenario 2: Base Institucional (Doc 3): $497.188.149.890 COP (+7,25%). Incorpora los $12.384M de R16 del Anteproyecto PGN.\n"
    "• Escenario 3: Optimista ARIMA: $543.841.638.886 COP (+17,31%). Descartado por inducir riesgo de déficit.\n"
    "• Escenario 4: Estrés Financiero: $460.862.000.000 COP (-0,59%). Modela caídas de recaudo y contracción económica, demostrando "
    "que la nómina docente básica permanece cubierta."
)

# CAPÍTULO 16
add_header_paragraph("CAPÍTULO 16. EVALUACIÓN DE RIESGOS FINANCIEROS Y FISCALES", 1)
doc.add_paragraph(
    "Se estructuraron medidas de contingencia para los riesgos prioritarios:\n"
    "• Riesgo de Liquidación del PGN (R16): Se programó el gasto de inversión en $8.310M y se condicionó la adición de los $4.073M restantes a la expedición del decreto definitivo.\n"
    "• Riesgo de Descalce del PAC Central: Creación de un fondo transitorio de maniobra con saldos de tesorería de autogestión para asegurar la nómina de enero y febrero.\n"
    "• Riesgo de Volatilidad en Estampillas (R12 y R40): Aforo bajo modelos conservadores (SES en R12 y base inicial en R40) para prevenir desfinanciación de obras físicas."
)

# CAPÍTULO 17
add_header_paragraph("CAPÍTULO 17. ARTICULACIÓN CON LA PLANEACIÓN INSTITUCIONAL (PDI 2019–2030)", 1)
doc.add_paragraph(
    "El presupuesto articula los recursos de inversión directamente con los tres ejes estratégicos del PDI:\n"
    "• Línea 27.1 Articulación Misional para la Calidad Académica ($14.138.209.000 COP): Financia 12 proyectos que respaldan el Sistema de Investigación ($7.139M), "
    "la dotación de bibliotecas ($1.789M), innovación y emprendimiento ($1.000M), calidad académica ($902M) y monitorías estudiantiles ($555M).\n"
    "• Línea 27.2 Componentes Transversales para la Excelencia ($1.488.697.000 COP): Financia Universidad Saludable ($486M) y movilidad internacional ($1.002M).\n"
    "• Línea 27.3 Campus Amigable y Sostenible ($5.559.637.573 COP): Financia la infraestructura de aulas y laboratorios ($3.157M), conectividad tecnológica ($1.351M), "
    "licenciamiento de software ($550M) y adecuación locativa multicampus ($500M)."
)

# CAPÍTULO 18
add_header_paragraph("CAPÍTULO 18. CONCLUSIONES TÉCNICAS, FINANCIERAS Y PRESUPUESTALES", 1)
doc.add_paragraph(
    "1. El Presupuesto General de la UPTC para 2027 ($490.351.599.254 COP) es jurídicamente inobjetable, estadísticamente sustentado y financieramente realizable.\n"
    "2. Se resolvieron plenamente las contradicciones entre documentos de insumo, asegurando la correspondencia exacta entre fuentes de inversión y proyectos BPIN.\n"
    "3. Se garantiza la matrícula cero para más de 28.000 estudiantes mediante el giro regular de doceavas de MinHacienda ($4.402,9M/mes).\n"
    "4. Se preserva el equilibrio matemático estricto al peso ($0 COP de diferencia), cumpliendo los mandatos del Estatuto Orgánico del Presupuesto."
)

# CAPÍTULO 19
add_header_paragraph("CAPÍTULO 19. RECOMENDACIONES", 1)
doc.add_paragraph(
    "1. Al Honorable Consejo Superior Universitario: Aprobar el Proyecto de Acuerdo de Presupuesto para la vigencia fiscal 2027 por valor de $490.351.599.254 COP.\n"
    "2. A la Dirección de Planeación y Vicerrectoría Administrativa: Monitorear trimestralmente el recaudo reportado por la DIAN en la Estampilla Pro-UNAL y "
    "preparar los proyectos BPIN complementarios por $6.836M para tramitar adición presupuestal si el Decreto de Liquidación del PGN ratifica la partida máxima de R16.\n"
    "3. A la Tesorería General: Mantener el fondo transitorio de maniobra en Recursos Propios para absorber cualquier rezago administrativo inicial del PAC de MinHacienda."
)

# CAPÍTULO 20
add_header_paragraph("CAPÍTULO 20. ANEXOS MATEMÁTICOS, ESTADÍSTICOS, FINANCIEROS Y NORMATIVOS", 1)
doc.add_paragraph(
    "Forman parte integrante de este Documento Técnico los anexos especializados generados por el Centro Institucional:\n"
    "• Anexo 1: Matriz de Validación Normativa y Marco Jurídico Vinculante.\n"
    "• Anexo 2: Base Histórica Depurada y Documentada (2008–2026).\n"
    "• Anexo 3: Modelo Matemático y Econométrico de Proyección de Ingresos.\n"
    "• Anexo 4: Modelo de Estimación de Apropiaciones y Gastos 2027.\n"
    "• Anexo 5: Matriz de Equilibrio y Sostenibilidad Presupuestal Cruzada.\n"
    "• Anexo 6: Comparación de Escenarios Financieros y Pruebas de Sensibilidad.\n"
    "• Anexo 7: Matriz Integral de Riesgos Financieros y Presupuestales.\n"
    "• Anexo 8: Matriz de Observaciones, Auditoría Cruzada y Acciones Correctivas.\n"
    "• Anexo 9: Informe de Auditoría Técnica Independiente y Dictamen Final (Calificación 98,0%).\n"
    "• Anexo 10: Anexos de Cálculos y Fórmulas Matemáticas Reproducibles.\n"
    "• Anexo 11: Resumen Ejecutivo para el Consejo Superior Universitario.\n"
    "• Anexo 12: Modelo Financiero en Hoja de Cálculo Excel (Modelo_Financiero_Presupuesto_UPTC_2027.xlsx) y 7 Archivos CSV Oficiales."
)

# Guardar documento en las ubicaciones requeridas
doc.save(docx_path)
doc.save(doc_root_copy)

print(f"Documento Word oficial generado exitosamente en:\n1. {docx_path}\n2. {doc_root_copy}")
