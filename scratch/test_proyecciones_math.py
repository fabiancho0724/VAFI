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

# 1. Totales generales a 23 nov
aprop_tot = sum(p(g['Valor apropiacion']) for g in gastos)
comp_tot = sum(p(g['Acumulado compromiso']) for g in gastos)
pagos_tot = sum(p(g['Acumulado pago']) for g in gastos)
bancos_tot = sum(p(b['Valor final']) for b in bancos if 'TOTAL' not in b.get('Nombre de entidad', '').upper())
aforo_tot = sum(p(i['Valor aforo']) for i in ingresos)
recaudo_tot = sum(p(i['Total recaudo']) for i in ingresos)
pendiente_recaudo = sum(max(0.0, p(i['Valor aforo']) - p(i['Total recaudo'])) for i in ingresos)
saldo_x_pagar = comp_tot - pagos_tot
disp_presup_actual = aprop_tot - comp_tot

# 2. Rubro 2.1.1
g_211 = [g for g in gastos if '2.1.1' in g.get('Código concepto', '') or 'PERSONAL' in g.get('Concepto', '').upper()]
aprop_211 = sum(p(g['Valor apropiacion']) for g in g_211)
comp_211 = sum(p(g['Acumulado compromiso']) for g in g_211)
pagos_211 = sum(p(g['Acumulado pago']) for g in g_211)
disp_211_actual = aprop_211 - comp_211

# 3. Simulación con Nómina Dic = 28.500M e Ingresos Adicionales = 12.000M
nomina_dic = 28500000000.0
rate_recaudo = 0.65
rate_pagos = 0.75
ingresos_adicionales_tot = 12000000000.0 # 9.500M + 2.500M

recaudo_base_dic = pendiente_recaudo * rate_recaudo
recaudo_tot_proyectado = recaudo_tot + recaudo_base_dic + ingresos_adicionales_tot

pagos_compromisos_dic = saldo_x_pagar * rate_pagos
pagos_tot_proyectados = pagos_tot + pagos_compromisos_dic + nomina_dic

comp_tot_proyectados = comp_tot + nomina_dic
disp_presup_proyectado = aprop_tot - comp_tot_proyectados

# Rubro 2.1.1 proyectado
comp_211_proyectado = comp_211 + nomina_dic
disp_211_proyectado = aprop_211 - comp_211_proyectado
suficiencia_211 = disp_211_proyectado >= 0

# Flujo de caja de diciembre y saldo final en bancos
flujo_dic = (recaudo_base_dic + ingresos_adicionales_tot) - (pagos_compromisos_dic + nomina_dic)
saldo_bancos_31_dic = bancos_tot + flujo_dic

# Balance presupuestal de cierre
balance_cierre = recaudo_tot_proyectado - comp_tot_proyectados

print("=== CALCULOS PROYECCIONES DICIEMBRE ===")
print(f"Recaudo Ene-Nov:              $ {recaudo_tot:,.2f}")
print(f"(+) Recaudo Base Dic (65%):   $ {recaudo_base_dic:,.2f}")
print(f"(+) Ingresos Adicionales:     $ {ingresos_adicionales_tot:,.2f}")
print(f"(=) Recaudo Total Cierre:     $ {recaudo_tot_proyectado:,.2f} ({(recaudo_tot_proyectado/aforo_tot*100):.2f}% de aforo)")
print("---")
print(f"Compromisos Ene-Nov:          $ {comp_tot:,.2f}")
print(f"(+) Nómina Dic (Rubro 2.1.1): $ {nomina_dic:,.2f}")
print(f"(=) Compromisos Proyectados:  $ {comp_tot_proyectados:,.2f} ({(comp_tot_proyectados/aprop_tot*100):.2f}% de apropiación)")
print(f"Saldo Presupuestal Libre:     $ {disp_presup_proyectado:,.2f}")
print("---")
print(f"Rubro 2.1.1 Gastos Personal:")
print(f"  Apropiación:                $ {aprop_211:,.2f}")
print(f"  Compromisos Ene-Nov:        $ {comp_211:,.2f}")
print(f"  (+) Nómina Dic:             $ {nomina_dic:,.2f}")
print(f"  (=) Compromisos Proy 2.1.1: $ {comp_211_proyectado:,.2f} ({(comp_211_proyectado/aprop_211*100):.2f}%)")
print(f"  Disponible Proy 2.1.1:      $ {disp_211_proyectado:,.2f} (Suficiencia: {suficiencia_211})")
print("---")
print(f"Saldo Bancos Actual (23 nov): $ {bancos_tot:,.2f}")
print(f"(+) Ingresos en Dic:          $ {(recaudo_base_dic + ingresos_adicionales_tot):,.2f}")
print(f"(-) Pagos en Dic:             $ {(pagos_compromisos_dic + nomina_dic):,.2f}")
print(f"(=) Flujo Neto Dic:           $ {flujo_dic:,.2f}")
print(f"(=) Saldo Bancos 31 Dic:      $ {saldo_bancos_31_dic:,.2f}")
print(f"Balance Cierre Presupuestal:  $ {balance_cierre:,.2f}")
