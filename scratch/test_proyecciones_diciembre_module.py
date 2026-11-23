import csv

def load_csv(path):
    rows = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader: rows.append(r)
    return rows

gastos = load_csv('public/data/caja_hoy/gastos_hoy.csv')
ingresos = load_csv('public/data/caja_hoy/ingresos_hoy.csv')
bancos = load_csv('public/data/caja_hoy/bancos_hoy.csv')

def p(val):
    if not val: return 0.0
    val = val.replace('$', '').replace(' ', '').replace('.', '').replace(',', '.')
    try: return float(val)
    except: return 0.0

# 1. Total appropriation and commitments a 23 nov
aprop_tot = sum(p(g['Valor apropiacion']) for g in gastos)
comp_tot = sum(p(g['Acumulado compromiso']) for g in gastos)
pagos_tot = sum(p(g['Acumulado pago']) for g in gastos)
bancos_tot = sum(p(b['Valor final']) for b in bancos if 'TOTAL' not in b.get('Nombre de entidad', '').upper())
aforo_tot = sum(p(i['Valor aforo']) for i in ingresos)
recaudo_tot = sum(p(i['Total recaudo']) for i in ingresos)
pend_recaudo_pos = sum(max(0.0, p(i['Valor aforo']) - p(i['Total recaudo'])) for i in ingresos)
saldo_x_pagar = comp_tot - pagos_tot

# 2. Rubro 2.1.1
g_211 = [g for g in gastos if '2.1.1' in g.get('Código concepto', '') or 'PERSONAL' in g.get('Concepto', '').upper()]
aprop_211 = sum(p(g['Valor apropiacion']) for g in g_211)
comp_211 = sum(p(g['Acumulado compromiso']) for g in g_211)
pagos_211 = sum(p(g['Acumulado pago']) for g in g_211)

# Assertions on historical baseline
assert round(aprop_tot, 2) == 576147982827.97
assert round(comp_tot, 2) == 447861937823.16
assert round(bancos_tot, 2) == 144563470673.35
assert round(aprop_211, 2) == 339436378010.41
assert round(comp_211, 2) == 270373739656.86
print("✓ Historical baseline loaded with 100% precision.")

# Simulation tests
nomina_dic = 28500000000.0
ingresos_adicionales = [
    {'id': '1', 'valor': 9500000000.0, 'tipo': 'Inversión'},
    {'id': '2', 'valor': 2500000000.0, 'tipo': 'Administración'}
]
tot_adic = sum(x['valor'] for x in ingresos_adicionales)
rate_ing = 0.65
rate_gas = 0.75

# Recaudo projections
recaudo_base_dic = pend_recaudo_pos * rate_ing
recaudo_cierre_tot = recaudo_tot + recaudo_base_dic + tot_adic

# Compromisos projections with Nomina 2.1.1
comp_cierre_tot = comp_tot + nomina_dic
saldo_presup_cierre = aprop_tot - comp_cierre_tot

# Rubro 2.1.1 with Nomina 2.1.1
comp_211_cierre = comp_211 + nomina_dic
disp_211_cierre = aprop_211 - comp_211_cierre
pct_comp_211_cierre = comp_211_cierre / aprop_211

# Cashflow & Banks
pagos_dic = (saldo_x_pagar * rate_gas) + nomina_dic
bancos_cierre = bancos_tot + (recaudo_base_dic + tot_adic) - pagos_dic

assert round(comp_211_cierre, 2) == 298873739656.86
assert round(disp_211_cierre, 2) == 40562638353.55
assert disp_211_cierre > 0 # Suficiencia garantizada
print(f"✓ Rubro 2.1.1: Compromisos proyectados = $ {comp_211_cierre:,.2f} ({pct_comp_211_cierre*100:.2f}%)")
print(f"✓ Rubro 2.1.1: Holgura de apropiación garantizada = +$ {disp_211_cierre:,.2f}")

assert round(comp_cierre_tot, 2) == 476361937823.16
assert round(saldo_presup_cierre, 2) == 99786045004.81
print(f"✓ Compromisos Totales Proyectados Cierre: $ {comp_cierre_tot:,.2f}")
print(f"✓ Saldo Presupuestal Libre Cierre: $ {saldo_presup_cierre:,.2f}")

assert round(tot_adic, 2) == 12000000000.0
print(f"✓ Ingresos Adicionales Proyectados Integrados: +$ {tot_adic:,.2f}")
print(f"✓ Saldo Bancos al 31 Dic: $ {bancos_cierre:,.2f}")

print("\n=======================================================")
print("ALL DECEMBER PROJECTIONS TESTS PASSED SUCCESSFULLY!")
print("=======================================================")
