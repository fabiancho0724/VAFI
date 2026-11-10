import os
import sys
import zipfile
from collections import defaultdict

sys.path.append('Documentos_Presupuesto_2027')
from parse_gasto import rows
import generar_modelo_excel_actualizado as base_excel

output_dir = '/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027'
xlsx_path = os.path.join(output_dir, 'Modelo_Financiero_Presupuesto_UPTC_2027.xlsx')

def make_sheet_xml(rows_data):
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

sheet1_rows = base_excel.sheet1_rows
sheet2_rows = base_excel.sheet2_rows
sheet3_rows = base_excel.sheet3_rows
sheet4_rows = base_excel.sheet4_rows

# Hoja 5: Detalle Gastos 195 Conceptos
sheet5_rows = [
    ['Unidad', 'Codigo Concepto', 'Concepto del Gasto', 'Recurso Oficial', 'Apropiacion Total (COP)', 'Objeto del Gasto (CCP)']
]

cat_map = {
    '2.1.1': '2.1.1 Gastos de Personal',
    '2.1.2': '2.1.2 Adquisición de Bienes y Servicios',
    '2.1.3': '2.1.3 Transferencias Corrientes',
    '2.1.8': '2.1.8 Gastos por Tributos, Tasas y Sanciones'
}

for r in rows:
    major = r['codigo'][:5]
    obj_name = cat_map.get(major, 'Otros Gastos')
    sheet5_rows.append([
        r['unidad'],
        r['codigo'],
        r['concepto'],
        r['recurso'],
        r['valor'],
        obj_name
    ])

total_gasto_sum = sum(r['valor'] for r in rows)
sheet5_rows.append([
    'TOTAL', 'UPTC', 'TOTAL DETALLE GASTOS UNIDAD ADMINISTRATIVA 2027', 'TODOS LOS RECURSOS',
    ('FORMULA', (f'SUM(E2:E{len(rows)+1})', total_gasto_sum)),
    'CUADRATURA EXACTA AL PESO'
])

# Hoja 6: Resumen Gastos por Objeto CCP
sheet6_rows = [
    ['Recurso', '2.1.1 Gastos de Personal (COP)', '2.1.2 Bienes y Servicios (COP)', '2.1.3 Transferencias Corrientes (COP)', '2.1.8 Tributos y Tasas (COP)', 'Total Gasto Administradora (COP)', 'Participacion (%)']
]

grid = defaultdict(lambda: {'2.1.1': 0.0, '2.1.2': 0.0, '2.1.3': 0.0, '2.1.8': 0.0})
for r in rows:
    grid[r['recurso']][r['codigo'][:5]] += r['valor']

for idx, rec in enumerate(sorted(grid.keys()), start=2):
    c211 = grid[rec]['2.1.1']
    c212 = grid[rec]['2.1.2']
    c213 = grid[rec]['2.1.3']
    c218 = grid[rec]['2.1.8']
    tot = c211 + c212 + c213 + c218
    pct = round((tot / total_gasto_sum) * 100, 2)
    sheet6_rows.append([
        rec,
        c211,
        c212,
        c213,
        c218,
        ('FORMULA', (f'SUM(B{idx}:E{idx})', tot)),
        ('FORMULA', (f'ROUND(F{idx}/$F$13*100, 2)', pct))
    ])

tot_211 = sum(grid[r]['2.1.1'] for r in grid)
tot_212 = sum(grid[r]['2.1.2'] for r in grid)
tot_213 = sum(grid[r]['2.1.3'] for r in grid)
tot_218 = sum(grid[r]['2.1.8'] for r in grid)

sheet6_rows.append([
    'TOTAL UNIDAD ADMINISTRATIVA',
    ('FORMULA', ('SUM(B2:B12)', tot_211)),
    ('FORMULA', ('SUM(C2:C12)', tot_212)),
    ('FORMULA', ('SUM(D2:D12)', tot_213)),
    ('FORMULA', ('SUM(E2:E12)', tot_218)),
    ('FORMULA', ('SUM(F2:F12)', total_gasto_sum)),
    ('FORMULA', ('SUM(G2:G12)', 100.00))
])

sheets = [
    ('Presupuesto_Adm_2027', sheet1_rows),
    ('Cupos_Admin_31_35', sheet2_rows),
    ('Balance_Ingreso_Gasto_Adm', sheet3_rows),
    ('Conciliacion_Prevalencia', sheet4_rows),
    ('Detalle_Gastos_195_Conceptos', sheet5_rows),
    ('Resumen_Gastos_Objeto_CCP', sheet6_rows)
]

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

print('Libro Excel actualizado con las 6 hojas exitosamente en:', xlsx_path)
