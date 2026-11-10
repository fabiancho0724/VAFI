from parse_gasto import rows
from collections import defaultdict

cat_names = {
    '2.1.1': 'Gastos de Personal',
    '2.1.2': 'Adquisición de Bienes y Servicios',
    '2.1.3': 'Transferencias Corrientes',
    '2.1.8': 'Gastos por Tributos, Tasas y Sanciones'
}

subcat_names = {
    '2.1.1.01': 'Planta de Personal Permanente',
    '2.1.1.02': 'Personal Supernumerario, Ocasional y Catedrático',
    '2.1.2.01': 'Adquisición de Bienes',
    '2.1.2.02': 'Adquisición de Servicios',
    '2.1.3.03': 'Membresías Internacionales',
    '2.1.3.04': 'Membresías Nacionales y Cuotas',
    '2.1.3.06': 'Beneficios Educativos y Bienestar',
    '2.1.3.07': 'Auxilios, Indemnizaciones y Fondo de Bienestar',
    '2.1.3.08': 'Apoyo Socioeconómico a Estudiantes',
    '2.1.3.13': 'Sentencias y Conciliaciones',
    '2.1.8.01': 'Impuestos Nacionales y Territoriales',
    '2.1.8.03': 'Tasas y Derechos Administrativos',
    '2.1.8.04': 'Cuotas de Fiscalización y Auditaje (Contraloría)',
    '2.1.8.06': 'Intereses de Mora, Multas y Sanciones'
}

by_major = defaultdict(float)
by_subcat = defaultdict(float)
by_rec_major = defaultdict(lambda: defaultdict(float))

for r in rows:
    cod = r['codigo']
    val = r['valor']
    rec = r['recurso']
    
    # Major cat
    major = cod[:5] # e.g. 2.1.1
    by_major[major] += val
    
    sub = cod[:8] # e.g. 2.1.1.01
    by_subcat[sub] += val
    
    by_rec_major[rec][major] += val

print("=== DISTRIBUCIÓN POR MACRO-OBJETO DEL GASTO ===")
tot_all = sum(by_major.values())
for cat, tot in sorted(by_major.items()):
    name = cat_names.get(cat, 'Otros')
    pct = (tot / tot_all) * 100
    print(f"{cat} - {name:40s}: ${tot:18,.2f} ({pct:5.2f}%)")
print(f"TOTAL GASTOS ADMINISTRATIVA: ${tot_all:18,.2f} (100.00%)\n")

print("=== DISTRIBUCIÓN POR SUBCATEGORÍA ===")
for sub, tot in sorted(by_subcat.items()):
    name = subcat_names.get(sub, 'Otros')
    pct = (tot / tot_all) * 100
    print(f"{sub} - {name:50s}: ${tot:18,.2f} ({pct:5.2f}%)")

print("\n=== DISTRIBUCIÓN POR RECURSO Y MACRO-OBJETO ===")
for rec in sorted(by_rec_major.keys()):
    tot_rec = sum(by_rec_major[rec].values())
    print(f"\nRecurso: {rec} (Total: ${tot_rec:18,.2f})")
    for cat in sorted(by_rec_major[rec].keys()):
        val = by_rec_major[rec][cat]
        pct = (val / tot_rec) * 100
        print(f"   {cat} {cat_names.get(cat,''):35s}: ${val:15,.2f} ({pct:5.2f}%)")

