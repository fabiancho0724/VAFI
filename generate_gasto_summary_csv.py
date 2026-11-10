import csv
from parse_gasto import rows
from collections import defaultdict

rec_map = {
    '10.0 - Aportes Nacion - Funcionamiento': '10.0 - Aportes Nación Funcionamiento',
    '10.5 - Aportes Nación - Política de gratuidad': '10.5 - Política de Gratuidad',
    '13 - Cooperativas': '13 - Cooperativas',
    '17 - Devolucion descuento electoral': '17 - Devolución Descuento Electoral',
    '18-Articulo 87 CESU': '18 - Artículo 87 CESU',
    '20 - Propios': '20 - Recursos Propios',
    '21 - Devolucion IVA': '21 - Devolución de IVA',
    '31 - Posgrados': '31 - Posgrados (Cupo Adm.)',
    '32 - Extension': '32 - Extensión (Cupo Adm.)',
    '33 - Convenios con derechos': '33 - Convenios con Derechos (Cupo)',
    '35 - Educacion continuada': '35 - Educación Continuada (Cupo)'
}

grid = defaultdict(lambda: {'2.1.1': 0.0, '2.1.2': 0.0, '2.1.3': 0.0, '2.1.8': 0.0})

for r in rows:
    rec = r['recurso']
    major = r['codigo'][:5]
    val = r['valor']
    grid[rec][major] += val

out_rows = [
    ['Recurso', 'Gastos_Personal_2_1_1_COP', 'Bienes_Servicios_2_1_2_COP', 'Transferencias_2_1_3_COP', 'Tributos_Tasas_2_1_8_COP', 'Total_Gasto_COP', 'Participacion_Pct']
]

grand_tot = 439856349613.01
tot_211 = sum(grid[r]['2.1.1'] for r in grid)
tot_212 = sum(grid[r]['2.1.2'] for r in grid)
tot_213 = sum(grid[r]['2.1.3'] for r in grid)
tot_218 = sum(grid[r]['2.1.8'] for r in grid)

for rec in sorted(grid.keys()):
    c211 = grid[rec]['2.1.1']
    c212 = grid[rec]['2.1.2']
    c213 = grid[rec]['2.1.3']
    c218 = grid[rec]['2.1.8']
    tot = c211 + c212 + c213 + c218
    pct = (tot / grand_tot) * 100
    out_rows.append([
        rec_map.get(rec, rec),
        round(c211, 2),
        round(c212, 2),
        round(c213, 2),
        round(c218, 2),
        round(tot, 2),
        round(pct, 2)
    ])

out_rows.append([
    'TOTAL UNIDAD ADMINISTRATIVA',
    round(tot_211, 2),
    round(tot_212, 2),
    round(tot_213, 2),
    round(tot_218, 2),
    round(grand_tot, 2),
    100.00
])

with open('/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027/03_Resumen_Gastos_Por_Objeto_2027.csv', 'w', newline='', encoding='utf-8') as f:
    csv.writer(f).writerows(out_rows)

print("Resumen de gastos por objeto generado exitosamente.")
