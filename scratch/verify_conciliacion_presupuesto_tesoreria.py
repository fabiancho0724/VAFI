import csv
from collections import defaultdict

def load_csv(path):
    rows = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader: rows.append(r)
    return rows

bancos = load_csv('public/data/caja_hoy/bancos_hoy.csv')
gastos = load_csv('public/data/caja_hoy/gastos_hoy.csv')
ingresos = load_csv('public/data/caja_hoy/ingresos_hoy.csv')

def p(val):
    if not val: return 0.0
    val = val.replace('$', '').replace(' ', '').replace('.', '').replace(',', '.')
    try: return float(val)
    except: return 0.0

admin_recursos = {'10.0', '10.1', '10.2', '10.3', '13', '14', '15', '17', '18', '20', '21', '31', '32', '33', '34', '35'}

aprop_tot = sum(p(g['Valor apropiacion']) for g in gastos)
comp_tot = sum(p(g['Acumulado compromiso']) for g in gastos)
pagos_tot = sum(p(g['Acumulado pago']) for g in gastos)
bancos_tot = sum(p(b['Valor final']) for b in bancos if 'TOTAL' not in b.get('Nombre de entidad', '').upper())

disp_presup_tot = aprop_tot - comp_tot
saldo_x_pagar_tot = comp_tot - pagos_tot
disp_tesoral_tot = bancos_tot - saldo_x_pagar_tot
brecha_tot = disp_presup_tot - disp_tesoral_tot
cob_tot = bancos_tot / saldo_x_pagar_tot

print("=== ASSERTIONS CHECK ===")
# 1. Total Apropiación
assert round(aprop_tot, 2) == 576147982827.97, f"Error aprop: {aprop_tot}"
print(f"✓ Apropiación Definitiva: $ {aprop_tot:,.2f}")

# 2. Total Compromisos
assert round(comp_tot, 2) == 447861937823.16, f"Error comp: {comp_tot}"
print(f"✓ Compromisos Acumulados: $ {comp_tot:,.2f}")

# 3. Total Pagos
assert round(pagos_tot, 2) == 386460076042.71, f"Error pagos: {pagos_tot}"
print(f"✓ Pagos Acumulados: $ {pagos_tot:,.2f}")

# 4. Disponible Presupuestal
assert round(disp_presup_tot, 2) == 128286045004.81, f"Error disp presup: {disp_presup_tot}"
print(f"✓ Disponible Presupuestal: $ {disp_presup_tot:,.2f}")

# 5. Saldo Bancos Conciliado
assert round(bancos_tot, 2) == 144563470673.35, f"Error bancos: {bancos_tot}"
print(f"✓ Saldo Bancos Conciliado: $ {bancos_tot:,.2f}")

# 6. Saldo Pendiente de Pago
assert round(saldo_x_pagar_tot, 2) == 61401861780.45, f"Error por pagar: {saldo_x_pagar_tot}"
print(f"✓ Saldo por Pagar: $ {saldo_x_pagar_tot:,.2f}")

# 7. Disponible Tesoral Estimado
assert round(disp_tesoral_tot, 2) == 83161608892.90, f"Error disp tesoral: {disp_tesoral_tot}"
print(f"✓ Disponible Tesoral Estimado: $ {disp_tesoral_tot:,.2f}")

# 8. Brecha Presupuesto vs Tesorería
assert round(brecha_tot, 2) == 45124436111.91, f"Error brecha: {brecha_tot}"
print(f"✓ Brecha Presupuesto - Tesorería: $ {brecha_tot:,.2f}")

# 9. Cobertura de Obligaciones
assert round(cob_tot, 4) == 2.3544, f"Error cobertura: {cob_tot}"
print(f"✓ Cobertura Inmediata: {cob_tot:.4f}x ({cob_tot*100:.2f}%)")

print("ALL 9 CORE AUDIT ASSERTIONS PASSED WITH 100% PRECISION!")
