#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Modelo Financiero Presupuestal Oficial UPTC 2027 (.xlsx)
Unidad 01 - Administrativa y Financiera: $439.856.349.610 COP
Centro Institucional de Inteligencia Presupuestal y Financiera
"""

import os
import zipfile

output_dir = '/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027'
xlsx_path = os.path.join(output_dir, 'Modelo_Financiero_Presupuesto_UPTC_2027.xlsx')

def make_sheet_xml(rows_data):
    """Genera el XML de una hoja con valores y formulas abiertas"""
    xml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
    xml.append('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
    xml.append('  <sheetData>')
    
    for r_idx, row in enumerate(rows_data, start=1):
        xml.append(f'    <row r="{r_idx}">')
        for c_idx, cell in enumerate(row, start=1):
            col_letter = chr(64 + c_idx) if c_idx <= 26 else f'A{chr(64 + c_idx - 26)}'
            cell_ref = f'{col_letter}{r_idx}'
            
            if isinstance(cell, tuple) and len(cell) == 2 and cell[0] == 'FORMULA':
                formula_str, val = cell[1]
                xml.append(f'      <c r="{cell_ref}"><f>{formula_str}</f><v>{val}</v></c>')
            elif isinstance(cell, (int, float)):
                xml.append(f'      <c r="{cell_ref}"><v>{cell}</v></c>')
            else:
                escaped = str(cell).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
                xml.append(f'      <c r="{cell_ref}" t="inlineStr"><is><t>{escaped}</t></is></c>')
        xml.append('    </row>')
        
    xml.append('  </sheetData>')
    xml.append('</worksheet>')
    return '\n'.join(xml)

# Hoja 1: Presupuesto Unidad Administrativa 2027 (11 Recursos Oficiales)
sheet1_rows = [
    ['Codigo Concepto', 'Recurso', 'Descripcion de la Fuente Presupuestal', 'Ingreso Administrativa (COP)', 'Gasto Administrativa (COP)', 'Participacion (%)', 'Balance Neto (COP)'],
    ['1.1.02.06.006.01.01', '10.0', 'APORTES NACION - FUNCIONAMIENTO', 345930009082, 345930009082, ('FORMULA', ('ROUND(D2/$D$13*100, 2)', 78.65)), ('FORMULA', ('D2-E2', 0))],
    ['1.1.02.06.006.01.02', '10.5', 'APORTES NACION - POLITICA DE GRATUIDAD', 41501082000, 41501082000, ('FORMULA', ('ROUND(D3/$D$13*100, 2)', 9.44)), ('FORMULA', ('D3-E3', 0))],
    ['1.1.02.06.006.03.02', '13', 'COOPERATIVAS', 1719108000, 1719108000, ('FORMULA', ('ROUND(D4/$D$13*100, 2)', 0.39)), ('FORMULA', ('D4-E4', 0))],
    ['1.1.02.06.006.01.03', '17', 'DEVOLUCION DESCUENTO ELECTORAL', 5774388000, 5774388000, ('FORMULA', ('ROUND(D5/$D$13*100, 2)', 1.31)), ('FORMULA', ('D5-E5', 0))],
    ['1.1.02.06.006.01.04', '18', 'ARTICULO 87 CESU', 1964359000, 1964359000, ('FORMULA', ('ROUND(D6/$D$13*100, 2)', 0.45)), ('FORMULA', ('D6-E6', 0))],
    ['1.1.02.02 / 05', '20', 'Propios', 11131476200, 11131476200, ('FORMULA', ('ROUND(D7/$D$13*100, 2)', 2.53)), ('FORMULA', ('D7-E7', 0))],
    ['1.1.02.06.006.02', '21', 'Devolucion IVA', 6471839000, 6471839000, ('FORMULA', ('ROUND(D8/$D$13*100, 2)', 1.47)), ('FORMULA', ('D8-E8', 0))],
    ['1.1.02.02.015', '31', 'POSGRADOS (Cupo Asignado Administracion)', 18868462733, 18868462733, ('FORMULA', ('ROUND(D9/$D$13*100, 2)', 4.29)), ('FORMULA', ('D9-E9', 0))],
    ['1.1.02.05.001', '32', 'EXTENSION (Cupo Asignado Administracion)', 944311807, 944311807, ('FORMULA', ('ROUND(D10/$D$13*100, 2)', 0.21)), ('FORMULA', ('D10-E10', 0))],
    ['1.1.02.05.002', '33', 'CONVENIOS CON DERECHOS (Cupo Admin.)', 4848481515, 4848481515, ('FORMULA', ('ROUND(D11/$D$13*100, 2)', 1.10)), ('FORMULA', ('D11-E11', 0))],
    ['1.1.02.05.003', '35', 'EDUCACION CONTINUADA (Cupo Administracion)', 702832273, 702832273, ('FORMULA', ('ROUND(D12/$D$13*100, 2)', 0.16)), ('FORMULA', ('D12-E12', 0))],
    ['TOTAL', 'UPTC', 'PRESUPUESTO GENERAL UNIDAD ADMINISTRATIVA 2027', ('FORMULA', ('SUM(D2:D12)', 439856349610)), ('FORMULA', ('SUM(E2:E12)', 439856349610)), ('FORMULA', ('SUM(F2:F12)', 100.00)), ('FORMULA', ('D13-E13', 0))]
]

# Hoja 2: Cupos Administrativos (R31, 32, 33, 35)
sheet2_rows = [
    ['Recurso', 'Denominacion del Cupo', 'Ingreso Bruto Estimado (COP)', 'Tasa Retencion Admin (%)', 'Cupo Asignado Administracion (COP)', 'Participacion en Presupuesto (%)', 'Destinacion del Cupo'],
    ['31', 'POSGRADOS (Especializaciones, Maestrias, Doctorados)', 53909893523, 35.00, 18868462733, ('FORMULA', ('E2/439856349610*100', 4.29)), 'Soporte tecnologico, biblioteca, aulas especializadas y gastos de direccion'],
    ['32', 'EXTENSION (Asesorias, consultorias y proyectos)', 4721559035, 20.00, 944311807, ('FORMULA', ('E3/439856349610*100', 0.21)), 'Supervision contractual, soporte juridico y gestion financiera central'],
    ['33', 'CONVENIOS CON DERECHOS (Convenios con terceros)', 19393926060, 25.00, 4848481515, ('FORMULA', ('E4/439856349610*100', 1.10)), 'Costos indirectos institucionales y acompanamiento institucional'],
    ['35', 'EDUCACION CONTINUADA (Diplomados y cursos)', 2811329092, 25.00, 702832273, ('FORMULA', ('E5/439856349610*100', 0.16)), 'Plataforma Moodle, certificaciones digitales y operacion de aulas'],
    ['TOTAL', 'CUPOS ASIGNADOS A LA ADMINISTRACION 2027', 80836707710, 'Ponderado', ('FORMULA', ('SUM(E2:E5)', 25364088328)), ('FORMULA', ('SUM(F2:F5)', 5.77)), 'Financiamiento del 5,77% del presupuesto administrativo central']
]

# Hoja 3: Balance Ingreso vs Gasto Unidad Administrativa
sheet3_rows = [
    ['Recurso', 'Concepto Presupuestal', 'Ingreso Administradora (COP)', 'Gasto Administradora (COP)', 'Diferencia (COP)', 'Estado de Cuadratura'],
    ['10.0', 'Aportes Nacion Funcionamiento', 345930009082, 345930009082, ('FORMULA', ('C2-D2', 0)), 'EQUILIBRIO EXACTO'],
    ['10.5', 'Aportes Nacion Gratuidad (Doceavas)', 41501082000, 41501082000, ('FORMULA', ('C3-D3', 0)), 'EQUILIBRIO EXACTO'],
    ['13', 'Cooperativas (Fomento Permanencia)', 1719108000, 1719108000, ('FORMULA', ('C4-D4', 0)), 'EQUILIBRIO EXACTO'],
    ['17', 'Devolucion Descuento Electoral', 5774388000, 5774388000, ('FORMULA', ('C5-D5', 0)), 'EQUILIBRIO EXACTO'],
    ['18', 'Articulo 87 CESU (PIB Calidad)', 1964359000, 1964359000, ('FORMULA', ('C6-D6', 0)), 'EQUILIBRIO EXACTO'],
    ['20', 'Recursos Propios (Autogestion)', 11131476200, 11131476200, ('FORMULA', ('C7-D7', 0)), 'EQUILIBRIO EXACTO'],
    ['21', 'Devolucion IVA IES (DIAN)', 6471839000, 6471839000, ('FORMULA', ('C8-D8', 0)), 'EQUILIBRIO EXACTO'],
    ['31', 'Posgrados (Cupo Administracion)', 18868462733, 18868462733, ('FORMULA', ('C9-D9', 0)), 'EQUILIBRIO EXACTO'],
    ['32', 'Extension (Cupo Administracion)', 944311807, 944311807, ('FORMULA', ('C10-D10', 0)), 'EQUILIBRIO EXACTO'],
    ['33', 'Convenios con Derechos (Cupo)', 4848481515, 4848481515, ('FORMULA', ('C11-D11', 0)), 'EQUILIBRIO EXACTO'],
    ['35', 'Educacion Continuada (Cupo)', 702832273, 702832273, ('FORMULA', ('C12-D12', 0)), 'EQUILIBRIO EXACTO'],
    ['TOTAL', 'PRESUPUESTO GENERAL UNIDAD ADMINISTRATIVA', ('FORMULA', ('SUM(C2:C12)', 439856349610)), ('FORMULA', ('SUM(D2:D12)', 439856349610)), ('FORMULA', ('C13-D13', 0)), 'CUADRATURA EXACTA AL PESO ($0)']
]

# Hoja 4: Matriz de Conciliacion de Cifras (Prevalencia)
sheet4_rows = [
    ['Recurso', 'Descripcion Fuente', 'Valor Referencia (COP)', 'Valor Final Aprobado (COP)', 'Variacion Absoluta (COP)', 'Variacion Relativa (%)', 'Estatus de Prevalencia'],
    ['10.0', 'Aportes Nacion Funcionamiento', 387451499572, 345930009082, ('FORMULA', ('D2-C2', -41521490490)), ('FORMULA', ('ROUND((D2-C2)/C2*100, 2)', -10.72)), 'Prevalece Tabla Aprobada'],
    ['10.5', 'Politica de Gratuidad', 52834827867, 41501082000, ('FORMULA', ('D3-C3', -11333745867)), ('FORMULA', ('ROUND((D3-C3)/C3*100, 2)', -21.45)), 'Prevalece Doceavas MinHacienda'],
    ['13', 'Cooperativas', 1719064274, 1719108000, ('FORMULA', ('D4-C4', 43726)), ('FORMULA', ('ROUND((D4-C4)/C4*100, 2)', 0.00)), 'Prevalece Liquidacion DIAN'],
    ['17', 'Descuento Electoral Votacion', 5981930308, 5774388000, ('FORMULA', ('D5-C5', -207542308)), ('FORMULA', ('ROUND((D5-C5)/C5*100, 2)', -3.47)), 'Prevalece Censo Electoral'],
    ['18', 'Articulo 87 CESU (PIB)', 2246130152, 1964359000, ('FORMULA', ('D6-C6', -281771152)), ('FORMULA', ('ROUND((D6-C6)/C6*100, 2)', -12.54)), 'Prevalece Asignacion CESU'],
    ['20', 'Recursos Propios (Autogestion)', 13979053203, 11131476200, ('FORMULA', ('D7-C7', -2847577003)), ('FORMULA', ('ROUND((D7-C7)/C7*100, 2)', -20.37)), 'Prevalece Base Depurada'],
    ['21', 'Devolucion de IVA', 4952550305, 6471839000, ('FORMULA', ('D8-C8', 1519288695)), ('FORMULA', ('ROUND((D8-C8)/C8*100, 2)', 30.68)), 'Prevalece Compensacion DIAN'],
    ['31', 'Posgrados (Cupo Administracion)', 0, 18868462733, ('FORMULA', ('D9-C9', 18868462733)), 100.00, 'Nuevo Concepto Incorporado'],
    ['32', 'Extension (Cupo Administracion)', 0, 944311807, ('FORMULA', ('D10-C10', 944311807)), 100.00, 'Nuevo Concepto Incorporado'],
    ['33', 'Convenios con Derechos (Cupo)', 0, 4848481515, ('FORMULA', ('D11-C11', 4848481515)), 100.00, 'Nuevo Concepto Incorporado'],
    ['35', 'Educacion Continuada (Cupo)', 0, 702832273, ('FORMULA', ('D12-C12', 702832273)), 100.00, 'Nuevo Concepto Incorporado'],
    ['12', 'Estampilla UNAL (Inversion)', 8416752884, 0, ('FORMULA', ('D13-C13', -8416752884)), -100.00, 'Excluido de Unidad 01 (Inversion)'],
    ['16.0', 'Inversion PGN (Inversion)', 8310959010, 0, ('FORMULA', ('D14-C14', -8310959010)), -100.00, 'Excluido de Unidad 01 (Inversion)'],
    ['40', 'Estampilla UPTC (Inversion Boyaca)', 4458831679, 0, ('FORMULA', ('D15-C15', -4458831679)), -100.00, 'Excluido de Unidad 01 (Inversion)'],
    ['TOTAL', 'PRESUPUESTO COMPARATIVO', 490351599254, 439856349610, ('FORMULA', ('D16-C16', -50495249644)), ('FORMULA', ('ROUND((D16-C16)/C16*100, 2)', -10.30)), 'CUADRATURA FINAL APROBADA']
]

sheets = [
    ('Presupuesto_Adm_2027', sheet1_rows),
    ('Cupos_Admin_31_35', sheet2_rows),
    ('Balance_Ingreso_Gasto_Adm', sheet3_rows),
    ('Conciliacion_Prevalencia', sheet4_rows)
]

# Construir paquetes XML
content_types = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
                 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
                 '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
                 '  <Default Extension="xml" ContentType="application/xml"/>',
                 '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>']

for i in range(1, len(sheets) + 1):
    content_types.append(f'  <Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
content_types.append('</Types>')

rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
        '</Relationships>']

wb = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      '  <sheets>']
for i, (name, _) in enumerate(sheets, start=1):
    wb.append(f'    <sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>')
wb.append('  </sheets>')
wb.append('</workbook>')

wb_rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
           '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
for i in range(1, len(sheets) + 1):
    wb_rels.append(f'  <Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>')
wb_rels.append('</Relationships>')

with zipfile.ZipFile(xlsx_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', '\n'.join(content_types))
    z.writestr('_rels/.rels', '\n'.join(rels))
    z.writestr('xl/workbook.xml', '\n'.join(wb))
    z.writestr('xl/_rels/workbook.xml.rels', '\n'.join(wb_rels))
    for i, (_, s_data) in enumerate(sheets, start=1):
        z.writestr(f'xl/worksheets/sheet{i}.xml', make_sheet_xml(s_data))

print('Libro Excel actualizado exitosamente en:', xlsx_path)
