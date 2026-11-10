#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Modelo Financiero Presupuestal UPTC Vigencia 2027
Centro Institucional de Inteligencia Presupuestal y Financiera
Genera el libro de Excel con fórmulas abiertas (.xlsx) y los archivos CSV oficiales.
"""

import os
import csv
import zipfile

output_dir = '/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027'
os.makedirs(output_dir, exist_ok=True)

# -------------------------------------------------------------
# 1. EXPORTACIÓN DE ARCHIVOS CSV OFICIALES
# -------------------------------------------------------------

# CSV 1: Ingresos Oficial 2027
csv1_data = [
    ['Codigo_Concepto', 'Recurso', 'Descripcion_Fuente', 'Base_2026_COP', 'Tasa_Modelo', 'Proyeccion_2027_COP', 'Participacion_Pct'],
    ['1.1.02.06.006.01.01', '10.0', 'Aportes Nacion - Funcionamiento (Art. 86 Ley 30)', 364009300613, '+6.44%', 387451499572, 79.01],
    ['1.1.02.06.006.01.02', '10.5', 'Politica de Gratuidad en Matricula (Doceavas MinHacienda)', 49844177233, '+6.00%', 52834827867, 10.77],
    ['1.1.02.06.006.03.01', '12', 'Estampilla Pro-UNAL y demas IES (Modelo SES a=0.3)', 7265094590, 'SES a=0.3', 8416752884, 1.72],
    ['1.1.02.06.006.03.02', '13', 'Excedentes Financieros del Sector Cooperativo (Ley 1819)', 1621758749, '+6.00%', 1719064274, 0.35],
    ['1.1.02.06.006.03.03', '16.0', 'Aportes para Inversion PGN (Decreto 1599/2026 - MEN)', 7728720060, '+7.53%', 8310959010, 1.69],
    ['1.1.02.06.006.01.03', '17', 'Devolucion Descuento Electoral Votacion (Ley 403/815)', 5643330479, '+6.00%', 5981930308, 1.22],
    ['1.1.02.06.006.01.04', '18', 'Articulo 87 CESU (Incremento PIB Nacional - Ley 30)', 2110231259, '+6.44%', 2246130152, 0.46],
    ['1.1.02.02 / 05', '20', 'Recursos Propios (10 Conceptos Autogestion Neta)', 13187794757, '+6.00%', 13979053203, 2.85],
    ['1.1.02.06.006.02', '21', 'Devolucion de IVA IES (Art. 92 Ley 30 de 1992)', 4672217269, '+6.00%', 4952550305, 1.01],
    ['1.1.01.02.300.32', '40', 'Estampilla Pro-UPTC (Ordenanza 051/2018 Boyaca)', 4206444980, '+6.00%', 4458831679, 0.91],
    ['TOTAL', 'UPTC', 'PRESUPUESTO GENERAL DE INGRESOS INSTITUCIONAL 2027', 460289070009, '+6.53%', 490351599254, 100.00]
]
with open(os.path.join(output_dir, '01_Presupuesto_Ingresos_Oficial_2027.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv1_data)

# CSV 2: Gastos de Inversión 18 Proyectos
csv2_data = [
    ['Eje_PDI', 'Codigo_Proyecto', 'Nombre_Proyecto_Inversion', 'Apropiacion_2027_COP', 'Fuente_Principal', 'Aporte_R40_COP', 'Aporte_R12_COP', 'Aporte_R16_COP'],
    ['27.1 Articulacion Misional', '27.1.1.1.1', 'Fortalecimiento de la Calidad Academica de la UPTC', 902283000, 'R16 PGN', 0, 0, 902283000],
    ['27.1 Articulacion Misional', '27.1.1.1.2', 'Dotacion de las Bibliotecas de la UPTC (Sedes)', 1789337000, 'R40 / R16', 624415000, 0, 1164922000],
    ['27.1 Articulacion Misional', '27.1.1.1.3', 'Pares Evaluadores Externos de trabajos de ascenso', 200000000, 'R16 PGN', 0, 0, 200000000],
    ['27.1 Articulacion Misional', '27.1.1.1.4', 'Fomento de la Educacion Superior Inclusiva y Diversa', 200000000, 'R16 PGN', 0, 0, 200000000],
    ['27.1 Articulacion Misional', '27.1.1.1.5', 'Consolidacion Ecosistema Educacion Virtual e Hibrida', 140000000, 'R16 PGN', 0, 0, 140000000],
    ['27.1 Articulacion Misional', '27.1.1.3.1', 'Apoyo monitorias estudiantiles', 555150000, 'R40 / R16', 265142000, 0, 290008000],
    ['27.1 Articulacion Misional', '27.1.2.1.1', 'Implantacion del Sistema de Investigacion Universitaria', 7139905000, 'R12 / R40', 1696484000, 5443421000, 0],
    ['27.1 Articulacion Misional', '27.1.2.1.2', 'Fortalecimiento de los procesos de la Unidad Editorial', 609735000, 'R16 PGN', 0, 0, 609735000],
    ['27.1 Articulacion Misional', '27.1.2.2.1', 'Sistema de Desarrollo Tecnologico, Innovacion y Creacion', 1000000000, 'R40 / R12', 159085000, 840915000, 0],
    ['27.1 Articulacion Misional', '27.1.2.2.2', 'Bases de datos para el Sistema de Investigacion', 1250000000, 'R12 UNAL', 0, 1250000000, 0],
    ['27.1 Articulacion Misional', '27.1.2.3.1', 'Implantacion del Sistema de Extension Universitaria', 331799000, 'R40 / R16', 108266336, 0, 223532664],
    ['27.1 Articulacion Misional', '27.1.2.3.2', 'Programa de Bienestar y Proteccion Animal de la UPTC', 20000000, 'R16 PGN', 0, 0, 20000000],
    ['27.2 Transversales', '27.2.4.1.1', 'Implementacion del programa Universidad Saludable', 486093000, 'R40 Bienestar', 486093000, 0, 0],
    ['27.2 Transversales', '27.2.5.1.1', 'Modelo integral de internacionalizacion de la UPTC', 1002604000, 'R40 / R16', 227580000, 0, 775024000],
    ['27.3 Campus Amigable', '27.3.1.1.1', 'Red de Sistematizacion y Computacion de la UPTC', 1351725000, 'R12 UNAL', 0, 1351725000, 0],
    ['27.3 Campus Amigable', '27.3.1.1.2', 'Licencias Academico-Administrativas', 550000000, 'R16 PGN', 0, 0, 550000000],
    ['27.3 Campus Amigable', '27.3.3.1.1', 'Plan mejoramiento locativo acreditacion multicampus', 500000000, 'R16 PGN', 0, 0, 500000000],
    ['27.3 Campus Amigable', '27.3.3.1.2', 'Construccion, dotacion y adecuacion de espacios fisicos', 3157912573, 'R40 / R16', 891766336, 0, 2266146237],
    ['TOTAL INVERSION', '18 PROYECTOS', 'PRESUPUESTO GENERAL DE GASTOS DE INVERSION 2027', 21186543573, 'R12+R16+R40', 4458831679, 8416752884, 8310959010]
]
with open(os.path.join(output_dir, '02_Presupuesto_Gastos_Inversion_18_Proyectos_2027.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv2_data)

# CSV 3: Gastos de Funcionamiento 2027
csv3_data = [
    ['Rubro_Presupuestal', 'Descripcion_Gasto', 'Apropiacion_2027_COP', 'Participacion_Pct', 'Fuentes_Financiacion'],
    ['2.1.1', 'Servicios Personales de Planta (Docentes, Administrativos, Prestaciones y Aportes)', 349850000000, 74.57, 'R10.0 Nacion + R10.5 Gratuidad'],
    ['2.1.2', 'Adquisicion de Bienes y Servicios (Vigilancia, Aseo, Servicios Publicos, Seguros, Mantenimiento)', 111415055681, 23.75, 'R20 Propios + R21 IVA + R13 Coop + R10.0'],
    ['2.1.3 / 2.1.8', 'Transferencias Corrientes, Pensiones, Tasas, Multas e Impuestos', 7900000000, 1.68, 'R17 Votacion + R20 Propios'],
    ['TOTAL', 'PRESUPUESTO GENERAL DE GASTOS DE FUNCIONAMIENTO 2027', 469165055681, 100.00, 'R10.0 + R10.5 + R13 + R17 + R18 + R20 + R21']
]
with open(os.path.join(output_dir, '03_Presupuesto_Gastos_Funcionamiento_2027.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv3_data)

# CSV 4: Matriz de Equilibrio Presupuestal Cruzada
csv4_data = [
    ['Recurso', 'Nombre_Fuente', 'Ingreso_Proyectado_COP', 'Gasto_Funcionamiento_COP', 'Gasto_Inversion_COP', 'Total_Gasto_Financiado_COP', 'Balance_Neto_COP'],
    ['10.0', 'Aportes Nacion Funcionamiento', 387451499572, 387451499572, 0, 387451499572, 0],
    ['10.5', 'Politica de Gratuidad Doceavas MinHacienda', 52834827867, 52834827867, 0, 52834827867, 0],
    ['12', 'Estampilla Pro-UNAL y demas IES', 8416752884, 0, 8416752884, 8416752884, 0],
    ['13', 'Excedentes Financieros Cooperativas', 1719064274, 1719064274, 0, 1719064274, 0],
    ['16.0', 'Aportes Inversion PGN (Dec. 1599/2026)', 8310959010, 0, 8310959010, 8310959010, 0],
    ['17', 'Devolucion Descuento Votacion', 5981930308, 5981930308, 0, 5981930308, 0],
    ['18', 'Articulo 87 CESU (Incremento PIB)', 2246130152, 2246130152, 0, 2246130152, 0],
    ['20', 'Recursos Propios (10 Conceptos)', 13979053203, 13979053203, 0, 13979053203, 0],
    ['21', 'Devolucion IVA IES (Art. 92 Ley 30)', 4952550305, 4952550305, 0, 4952550305, 0],
    ['40', 'Estampilla Pro-UPTC (Ordenanza 051/18)', 4458831679, 0, 4458831679, 4458831679, 0],
    ['TOTAL', 'PRESUPUESTO GENERAL INSTITUCIONAL 2027', 490351599254, 469165055681, 21186543573, 490351599254, 0]
]
with open(os.path.join(output_dir, '04_Matriz_Equilibrio_Fuentes_Gastos_2027.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv4_data)

# CSV 5: Comparativo de Escenarios
csv5_data = [
    ['Recurso', 'Descripcion', 'Base_2026_COP', 'Escenario_1_Conservador_COP', 'Escenario_2_Base_Doc3_COP', 'Escenario_3_ARIMA_COP', 'Escenario_4_Estres_COP'],
    ['10.0', 'Aportes Nacion Funcionamiento', 364009300613, 387451499572, 387451499572, 435635597234, 368078000000],
    ['10.5', 'Politica de Gratuidad', 49844177233, 52834827867, 52834827867, 52792185210, 50193000000],
    ['12', 'Estampilla Pro-UNAL', 9015915211, 8416752884, 9556870124, 13398969574, 6538000000],
    ['13', 'Excedentes Cooperativas', 1621758749, 1719064274, 1719064274, 2090124619, 1297000000],
    ['16.0', 'Aportes Inversion PGN', 7740453186, 8310959010, 12384725098, 12384725098, 7508000000],
    ['17', 'Devolucion Descuento Votacion', 5643330479, 5981930308, 5981930308, 6286105820, 5361000000],
    ['18', 'Articulo 87 CESU', 2110231259, 2246130152, 2246130152, 1613437108, 1900000000],
    ['20', 'Recursos Propios (Autogestion)', 13187794757, 13979053203, 13979053203, 10894042810, 11882000000],
    ['21', 'Devolucion de IVA', 4672217269, 4952550305, 4952550305, 5221689104, 4205000000],
    ['40', 'Estampilla Pro-UPTC', 5737263195, 4458831679, 6081498987, 5997321508, 3900000000],
    ['TOTAL', 'PRESUPUESTO GENERAL INSTITUCIONAL', 463582441951, 490351599254, 497188149890, 543841638886, 460862000000]
]
with open(os.path.join(output_dir, '05_Comparativo_Escenarios_2027.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv5_data)

# CSV 6: Desglose R20 10 Conceptos
csv6_data = [
    ['Codigo_Concepto', 'Denominacion_Concepto_Oficial', 'Base_Real_2026_COP', 'Factor_Aumento', 'Proyeccion_Oficial_2027_COP', 'Participacion_Pct'],
    ['1.1.02.02.015', 'Certificaciones y constancias', 44343950, 1.06, 47004587, 0.34],
    ['1.1.02.05.002.06', 'Comercio y distribucion; alojamiento; servicios de comida', 2562971129, 1.06, 2716749397, 19.43],
    ['1.1.02.05.002.01', 'Minerales; electricidad, gas y agua', 83257428, 1.06, 88252874, 0.63],
    ['1.1.02.02.116.01.01.04', 'Pregrado - Certificaciones y derechos complementarios', 3773314576, 1.06, 3999713451, 28.61],
    ['1.1.02.02.116.01.01.02', 'Pregrado - Derechos de grado', 736345940, 1.06, 780526696, 5.58],
    ['1.1.02.02.116.01.01.01', 'Pregrado - Inscripciones', 2026330700, 1.06, 2147910542, 15.37],
    ['1.1.02.02.116.01.01.03', 'Matriculas posgrados y extensiones remuneradas', 3772930728, 'Ajuste cuadratura', 3999306572, 28.61],
    ['1.1.02.05.002.04', 'Productos metalicos, maquinaria y equipo', 9307590, 1.06, 9866045, 0.07],
    ['1.1.02.03.001.05', 'Sanciones administrativas', 23297850, 1.06, 24695721, 0.18],
    ['1.1.02.05.002.07', 'Servicios financieros, inmobiliarios y leasing', 155686149, 1.06, 165027318, 1.18],
    ['TOTAL', 'RECURSO 20: RECURSOS PROPIOS (10 CONCEPTOS)', 13187794757, '+6.00%', 13979053203, 100.00]
]
with open(os.path.join(output_dir, '06_Desglose_R20_10_Conceptos.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv6_data)

# CSV 7: Distribución R40 Ordenanza 051
csv7_data = [
    ['Componente_Ordenanza_051', 'Porcentaje_Legal', 'Valor_Asignado_COP', 'Proyectos_Financiados'],
    ['Bienestar Universitario', '60.00%', 2675299000, 'Monitorias ($265.1M), Investigacion ($1.696M), Univ. Saludable ($486.1M), Internacionalizacion ($227.6M)'],
    ['Regionalizacion', '20.00%', 891766336, 'Bibliotecas Sedes ($624.4M), Desarrollo Tecnologico ($159.1M), Extension Sedes ($108.3M)'],
    ['Construccion y Adecuacion', '20.00%', 891766336, 'Construccion, dotacion y adecuacion de espacios fisicos UPTC ($891.8M)'],
    ['TOTAL ESTAMPILLA UPTC (R40)', '100.00%', 4458831679, 'Cumplimiento estricto al peso de la Ordenanza 051 de 2018']
]
with open(os.path.join(output_dir, '07_Distribucion_R40_Ordenanza_051.csv'), 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(csv7_data)

print('Todos los archivos CSV fueron generados con exito en:', output_dir)

# -------------------------------------------------------------
# 2. GENERADOR DE LIBRO EXCEL (.XLSX) CON FÓRMULAS ABIERTAS
# -------------------------------------------------------------

xlsx_path = os.path.join(output_dir, 'Modelo_Financiero_Presupuesto_UPTC_2027.xlsx')

def make_sheet_xml(rows_data):
    """Genera el XML de una hoja con valores y formulas"""
    xml = ['<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>']
    xml.append('<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">')
    xml.append('  <sheetData>')
    
    for r_idx, row in enumerate(rows_data, start=1):
        xml.append(f'    <row r=\"{r_idx}\">')
        for c_idx, cell in enumerate(row, start=1):
            col_letter = chr(64 + c_idx) if c_idx <= 26 else f'A{chr(64 + c_idx - 26)}'
            cell_ref = f'{col_letter}{r_idx}'
            
            if isinstance(cell, tuple) and len(cell) == 2 and cell[0] == 'FORMULA':
                # Tupla ('FORMULA', ('SUM(D2:D11)', valor_estimado))
                formula_str, val = cell[1]
                xml.append(f'      <c r=\"{cell_ref}\"><f>{formula_str}</f><v>{val}</v></c>')
            elif isinstance(cell, (int, float)):
                xml.append(f'      <c r=\"{cell_ref}\"><v>{cell}</v></c>')
            else:
                # String
                escaped = str(cell).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\"', '&quot;')
                xml.append(f'      <c r=\"{cell_ref}\" t=\"inlineStr\"><is><t>{escaped}</t></is></c>')
        xml.append('    </row>')
        
    xml.append('  </sheetData>')
    xml.append('</worksheet>')
    return '\n'.join(xml)

# Hojas para el libro Excel:
# Hoja 1: Ingresos
sheet1_rows = [
    ['Codigo Concepto', 'Recurso', 'Descripcion Fuente', 'Base 2026 (COP)', 'Tasa / Modelo', 'Proyeccion 2027 (COP)', 'Participacion (%)'],
    ['1.1.02.06.006.01.01', '10.0', 'Aportes Nacion - Funcionamiento', 364009300613, '+6.44%', ('FORMULA', ('ROUND(D2*1.0644, 0)', 387451499572)), ('FORMULA', ('F2/$F$12*100', 79.01))],
    ['1.1.02.06.006.01.02', '10.5', 'Politica de Gratuidad Doceavas MinHacienda', 49844177233, '+6.00%', ('FORMULA', ('ROUND(D3*1.06, 0)', 52834827867)), ('FORMULA', ('F3/$F$12*100', 10.77))],
    ['1.1.02.06.006.03.01', '12', 'Estampilla Pro-UNAL (Modelo SES a=0.3)', 7265094590, 'SES a=0.3', 8416752884, ('FORMULA', ('F4/$F$12*100', 1.72))],
    ['1.1.02.06.006.03.02', '13', 'Excedentes Financieros Cooperativas', 1621758749, '+6.00%', ('FORMULA', ('ROUND(D5*1.06, 0)', 1719064274)), ('FORMULA', ('F5/$F$12*100', 0.35))],
    ['1.1.02.06.006.03.03', '16.0', 'Aportes Inversion PGN (Decreto 1599/2026)', 7728720060, '+7.53%', 8310959010, ('FORMULA', ('F6/$F$12*100', 1.69))],
    ['1.1.02.06.006.01.03', '17', 'Devolucion Descuento Votacion', 5643330479, '+6.00%', ('FORMULA', ('ROUND(D7*1.06, 0)', 5981930308)), ('FORMULA', ('F7/$F$12*100', 1.22))],
    ['1.1.02.06.006.01.04', '18', 'Articulo 87 CESU (Incremento PIB)', 2110231259, '+6.44%', ('FORMULA', ('ROUND(D8*1.0644, 0)', 2246130152)), ('FORMULA', ('F8/$F$12*100', 0.46))],
    ['1.1.02.02 / 05', '20', 'Recursos Propios (10 Conceptos)', 13187794757, '+6.00%', 13979053203, ('FORMULA', ('F9/$F$12*100', 2.85))],
    ['1.1.02.06.006.02', '21', 'Devolucion IVA IES (Art. 92 Ley 30)', 4672217269, '+6.00%', ('FORMULA', ('ROUND(D10*1.06, 0)', 4952550305)), ('FORMULA', ('F10/$F$12*100', 1.01))],
    ['1.1.01.02.300.32', '40', 'Estampilla Pro-UPTC (Ordenanza 051/18)', 4206444980, '+6.00%', ('FORMULA', ('ROUND(D11*1.06, 0)', 4458831679)), ('FORMULA', ('F11/$F$12*100', 0.91))],
    ['TOTAL', 'UPTC', 'TOTAL PRESUPUESTO GENERAL INGRESOS 2027', ('FORMULA', ('SUM(D2:D11)', 460289070009)), 'Modelo Oficial', ('FORMULA', ('SUM(F2:F11)', 490351599254)), ('FORMULA', ('SUM(G2:G11)', 100.00))]
]

# Hoja 2: R20
sheet2_rows = [
    ['Codigo Concepto', 'Concepto Presupuestal Oficial', 'Base Real 2026 (COP)', 'Tasa', 'Proyeccion 2027 (COP)', 'Participacion (%)'],
    ['1.1.02.02.015', 'Certificaciones y constancias', 44343950, 1.06, ('FORMULA', ('ROUND(C2*1.06, 0)', 47004587)), ('FORMULA', ('E2/$E$12*100', 0.34))],
    ['1.1.02.05.002.06', 'Comercio, comidas y alojamiento', 2562971129, 1.06, ('FORMULA', ('ROUND(C3*1.06, 0)', 2716749397)), ('FORMULA', ('E3/$E$12*100', 19.43))],
    ['1.1.02.05.002.01', 'Minerales; electricidad, gas y agua', 83257428, 1.06, ('FORMULA', ('ROUND(C4*1.06, 0)', 88252874)), ('FORMULA', ('E4/$E$12*100', 0.63))],
    ['1.1.02.02.116.01.01.04', 'Pregrado - Derechos complementarios', 3773314576, 1.06, ('FORMULA', ('ROUND(C5*1.06, 0)', 3999713451)), ('FORMULA', ('E5/$E$12*100', 28.61))],
    ['1.1.02.02.116.01.01.02', 'Pregrado - Derechos de grado', 736345940, 1.06, ('FORMULA', ('ROUND(C6*1.06, 0)', 780526696)), ('FORMULA', ('E6/$E$12*100', 5.58))],
    ['1.1.02.02.116.01.01.01', 'Pregrado - Inscripciones', 2026330700, 1.06, ('FORMULA', ('ROUND(C7*1.06, 0)', 2147910542)), ('FORMULA', ('E7/$E$12*100', 15.37))],
    ['1.1.02.02.116.01.01.03', 'Matriculas posgrados y extensiones', 3772930728, 'Ajuste peso', 3999306572, ('FORMULA', ('E8/$E$12*100', 28.61))],
    ['1.1.02.05.002.04', 'Productos metalicos y maquinaria', 9307590, 1.06, ('FORMULA', ('ROUND(C9*1.06, 0)', 9866045)), ('FORMULA', ('E9/$E$12*100', 0.07))],
    ['1.1.02.03.001.05', 'Sanciones administrativas', 23297850, 1.06, ('FORMULA', ('ROUND(C10*1.06, 0)', 24695721)), ('FORMULA', ('E10/$E$12*100', 0.18))],
    ['1.1.02.05.002.07', 'Servicios financieros e inmobiliarios', 155686149, 1.06, ('FORMULA', ('ROUND(C11*1.06, 0)', 165027318)), ('FORMULA', ('E11/$E$12*100', 1.18))],
    ['TOTAL', 'RECURSOS PROPIOS (10 CONCEPTOS)', ('FORMULA', ('SUM(C2:C11)', 13187794757)), '+6.00%', ('FORMULA', ('SUM(E2:E11)', 13979053203)), ('FORMULA', ('SUM(F2:F11)', 100.00))]
]

# Hoja 3: Gastos Inversión 18 Proyectos
sheet3_rows = [
    ['Eje PDI', 'Codigo', 'Nombre Proyecto de Inversion', 'Apropiacion 2027 (COP)', 'Fuente Principal', 'Aporte R40', 'Aporte R12', 'Aporte R16'],
    ['Articulacion Misional', '27.1.1.1.1', 'Fortalecimiento de la Calidad Academica', 902283000, 'R16 PGN', 0, 0, 902283000],
    ['Articulacion Misional', '27.1.1.1.2', 'Dotacion de Bibliotecas UPTC (Sedes)', 1789337000, 'R40 / R16', 624415000, 0, 1164922000],
    ['Articulacion Misional', '27.1.1.1.3', 'Pares Evaluadores Externos', 200000000, 'R16 PGN', 0, 0, 200000000],
    ['Articulacion Misional', '27.1.1.1.4', 'Educacion Inclusiva y Diversa', 200000000, 'R16 PGN', 0, 0, 200000000],
    ['Articulacion Misional', '27.1.1.1.5', 'Ecosistema Educacion Virtual e Hibrida', 140000000, 'R16 PGN', 0, 0, 140000000],
    ['Articulacion Misional', '27.1.1.3.1', 'Apoyo monitorias estudiantiles', 555150000, 'R40 / R16', 265142000, 0, 290008000],
    ['Articulacion Misional', '27.1.2.1.1', 'Sistema de Investigacion Universitaria', 7139905000, 'R12 / R40', 1696484000, 5443421000, 0],
    ['Articulacion Misional', '27.1.2.1.2', 'Fortalecimiento Unidad Editorial', 609735000, 'R16 PGN', 0, 0, 609735000],
    ['Articulacion Misional', '27.1.2.2.1', 'Desarrollo Tecnologico e Innovacion', 1000000000, 'R40 / R12', 159085000, 840915000, 0],
    ['Articulacion Misional', '27.1.2.2.2', 'Bases de datos para Investigacion', 1250000000, 'R12 UNAL', 0, 1250000000, 0],
    ['Articulacion Misional', '27.1.2.3.1', 'Sistema de Extension Universitaria', 331799000, 'R40 / R16', 108266336, 0, 223532664],
    ['Articulacion Misional', '27.1.2.3.2', 'Bienestar y Proteccion Animal', 20000000, 'R16 PGN', 0, 0, 20000000],
    ['Transversales', '27.2.4.1.1', 'Programa Universidad Saludable', 486093000, 'R40 Bienestar', 486093000, 0, 0],
    ['Transversales', '27.2.5.1.1', 'Internacionalizacion de la UPTC', 1002604000, 'R40 / R16', 227580000, 0, 775024000],
    ['Campus Amigable', '27.3.1.1.1', 'Red de Sistematizacion y Computacion', 1351725000, 'R12 UNAL', 0, 1351725000, 0],
    ['Campus Amigable', '27.3.1.1.2', 'Licencias Academico-Administrativas', 550000000, 'R16 PGN', 0, 0, 550000000],
    ['Campus Amigable', '27.3.3.1.1', 'Mejoramiento locativo multicampus', 500000000, 'R16 PGN', 0, 0, 500000000],
    ['Campus Amigable', '27.3.3.1.2', 'Construccion espacios fisicos UPTC', 3157912573, 'R40 / R16', 891766336, 0, 2266146237],
    ['TOTAL', '18 PROYECTOS', 'PRESUPUESTO GENERAL DE INVERSION 2027', ('FORMULA', ('SUM(D2:D19)', 21186543573)), 'R12+R16+R40', ('FORMULA', ('SUM(F2:F19)', 4458831679)), ('FORMULA', ('SUM(G2:G19)', 8416752884)), ('FORMULA', ('SUM(H2:H19)', 8310959010))]
]

# Hoja 4: Matriz Equilibrio
sheet4_rows = [
    ['Recurso', 'Nombre de la Fuente', 'Ingreso Proyectado (COP)', 'Apropiacion Funcionamiento (COP)', 'Apropiacion Inversion (COP)', 'Total Gasto (COP)', 'Balance Neto (COP)'],
    ['10.0', 'Aportes Nacion Funcionamiento', 387451499572, 387451499572, 0, ('FORMULA', ('D2+E2', 387451499572)), ('FORMULA', ('C2-F2', 0))],
    ['10.5', 'Gratuidad Doceavas MinHacienda', 52834827867, 52834827867, 0, ('FORMULA', ('D3+E3', 52834827867)), ('FORMULA', ('C3-F3', 0))],
    ['12', 'Estampilla Pro-UNAL', 8416752884, 0, 8416752884, ('FORMULA', ('D4+E4', 8416752884)), ('FORMULA', ('C4-F4', 0))],
    ['13', 'Excedentes Cooperativas', 1719064274, 1719064274, 0, ('FORMULA', ('D5+E5', 1719064274)), ('FORMULA', ('C5-F5', 0))],
    ['16.0', 'Aportes Inversion PGN (Dec. 1599)', 8310959010, 0, 8310959010, ('FORMULA', ('D6+E6', 8310959010)), ('FORMULA', ('C6-F6', 0))],
    ['17', 'Devolucion Descuento Votacion', 5981930308, 5981930308, 0, ('FORMULA', ('D7+E7', 5981930308)), ('FORMULA', ('C7-F7', 0))],
    ['18', 'Articulo 87 CESU (PIB)', 2246130152, 2246130152, 0, ('FORMULA', ('D8+E8', 2246130152)), ('FORMULA', ('C8-F8', 0))],
    ['20', 'Recursos Propios (Autogestion)', 13979053203, 13979053203, 0, ('FORMULA', ('D9+E9', 13979053203)), ('FORMULA', ('C9-F9', 0))],
    ['21', 'Devolucion IVA IES', 4952550305, 4952550305, 0, ('FORMULA', ('D10+E10', 4952550305)), ('FORMULA', ('C10-F10', 0))],
    ['40', 'Estampilla Pro-UPTC (Boyaca)', 4458831679, 0, 4458831679, ('FORMULA', ('D11+E11', 4458831679)), ('FORMULA', ('C11-F11', 0))],
    ['TOTAL', 'PRESUPUESTO GENERAL INSTITUCIONAL 2027', ('FORMULA', ('SUM(C2:C11)', 490351599254)), ('FORMULA', ('SUM(D2:D11)', 469165055681)), ('FORMULA', ('SUM(E2:E11)', 21186543573)), ('FORMULA', ('SUM(F2:F11)', 490351599254)), ('FORMULA', ('C12-F12', 0))]
]

sheets = [
    ('Presupuesto_Ingresos_2027', sheet1_rows),
    ('Desglose_R20_Autogestion', sheet2_rows),
    ('Gastos_Inversion_18_Proy', sheet3_rows),
    ('Matriz_Equilibrio_Global', sheet4_rows)
]

# Construir paquetes XML
content_types = ['<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>',
                 '<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">',
                 '  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>',
                 '  <Default Extension=\"xml\" ContentType=\"application/xml\"/>',
                 '  <Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>']

for i in range(1, len(sheets) + 1):
    content_types.append(f'  <Override PartName=\"/xl/worksheets/sheet{i}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>')
content_types.append('</Types>')

rels = ['<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>',
        '<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">',
        '  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>',
        '</Relationships>']

wb = ['<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>',
      '<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">',
      '  <sheets>']
for i, (name, _) in enumerate(sheets, start=1):
    wb.append(f'    <sheet name=\"{name}\" sheetId=\"{i}\" r:id=\"rId{i}\"/>')
wb.append('  </sheets>')
wb.append('</workbook>')

wb_rels = ['<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>',
           '<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">']
for i in range(1, len(sheets) + 1):
    wb_rels.append(f'  <Relationship Id=\"rId{i}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{i}.xml\"/>')
wb_rels.append('</Relationships>')

# Escribir el archivo ZIP .xlsx
with zipfile.ZipFile(xlsx_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', '\n'.join(content_types))
    z.writestr('_rels/.rels', '\n'.join(rels))
    z.writestr('xl/workbook.xml', '\n'.join(wb))
    z.writestr('xl/_rels/workbook.xml.rels', '\n'.join(wb_rels))
    for i, (_, s_data) in enumerate(sheets, start=1):
        z.writestr(f'xl/worksheets/sheet{i}.xml', make_sheet_xml(s_data))

print('Libro Excel generado exitosamente en:', xlsx_path)
