import csv
import json

def load_csv(path):
    rows = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader: rows.append(r)
    return rows

bancos = load_csv('public/data/caja_hoy/bancos_hoy.csv')
gastos = load_csv('public/data/caja_hoy/gastos_hoy.csv')
ingresos = load_csv('public/data/caja_hoy/ingresos_hoy.csv')
mensuales = load_csv('public/data/caja_hoy/ingresos_mensuales_hoy.csv')

def p(val):
    if not val: return 0.0
    val = val.replace('$', '').replace(' ', '').replace('.', '').replace(',', '.')
    try: return float(val)
    except: return 0.0

print(f"Loaded: {len(bancos)} banco rows, {len(gastos)} gasto rows, {len(ingresos)} ingreso rows, {len(mensuales)} mensual rows.")

# 1. Bank Reconciliation
bank_rows_clean = [b for b in bancos if 'TOTAL' not in (b.get('Nombre de entidad') or '').upper()]
total_bancos = sum(p(b.get('Valor final')) for b in bank_rows_clean)
assert len(bank_rows_clean) == 85, f"Expected 85 bank accounts, got {len(bank_rows_clean)}"
assert abs(total_bancos - 144563470673.35) < 0.01, f"Bank sum mismatch: {total_bancos}"
print(f"✓ Bancos: 85 cuentas suman exactamente $ {total_bancos:,.2f} COP (Ref: $ 144.563.470.673)")

# 2. Expenses Reconciliation
total_aprop = sum(p(g.get('Valor apropiacion')) for g in gastos)
total_comp = sum(p(g.get('Acumulado compromiso')) for g in gastos)
total_pagos = sum(p(g.get('Acumulado pago')) for g in gastos)
assert round(total_aprop, 2) == 576147982827.97, f"Aprop error: {total_aprop}"
assert round(total_comp, 2) == 447861937823.16, f"Comp error: {total_comp}"
assert round(total_pagos, 2) == 386460076042.71, f"Pagos error: {total_pagos}"
print(f"✓ Gastos: Apropiación $ {total_aprop:,.2f} | Compromisos $ {total_comp:,.2f} | Pagos $ {total_pagos:,.2f}")

# 3. Budget Availability vs Cash Availability
disp_presup = total_aprop - total_comp
saldo_x_pagar = total_comp - total_pagos
disp_tesoral = total_bancos - saldo_x_pagar
brecha = disp_presup - disp_tesoral
cob = total_bancos / saldo_x_pagar

assert round(disp_presup, 2) == 128286045004.81
assert round(saldo_x_pagar, 2) == 61401861780.45
assert round(disp_tesoral, 2) == 83161608892.90
assert round(brecha, 2) == 45124436111.91
assert round(cob, 4) == 2.3544

print(f"✓ Disponible Presupuestal: $ {disp_presup:,.2f}")
print(f"✓ Saldo por Pagar (Brecha de Giro): $ {saldo_x_pagar:,.2f}")
print(f"✓ Disponible Tesoral Libre: $ {disp_tesoral:,.2f}")
print(f"✓ Brecha Presupuesto vs Tesorería: $ {brecha:,.2f}")
print(f"✓ Cobertura Inmediata: {cob:.4f}x ({cob*100:.2f}%)")

# 4. Units Reconciliation
unidades = set(g.get('Unidad', '').strip() for g in gastos if g.get('Unidad', '').strip())
assert len(unidades) == 14, f"Expected 14 units, got {len(unidades)}: {unidades}"
print(f"✓ Unidades Ejecutoras: 14 unidades identificadas y conciliadas.")

# 5. Resources Reconciliation
recursos = set(g.get('Recurso', '').split(' - ')[0].strip() for g in gastos if g.get('Recurso', '').strip())
assert len(recursos) == 21, f"Expected 21 resources, got {len(recursos)}: {recursos}"
print(f"✓ Recursos Presupuestales: 21 códigos de recurso clasificados.")

print("\n=======================================================")
print("TODAS LAS PRUEBAS DE INTEGRACIÓN Y AUDITORÍA SUPERADAS!")
print("=======================================================")
