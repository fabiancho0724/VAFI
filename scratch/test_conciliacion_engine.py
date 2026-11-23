import csv
from collections import defaultdict

def load_csv(path):
    rows = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            rows.append(r)
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

# 1. Total Gastos and breakdown
aprop_tot = 0.0
comp_tot = 0.0
pagos_tot = 0.0
aprop_adm = 0.0
comp_adm = 0.0
pagos_adm = 0.0
aprop_inv = 0.0
comp_inv = 0.0
pagos_inv = 0.0

rec_gastos = defaultdict(lambda: {'aprop': 0.0, 'comp': 0.0, 'pago': 0.0, 'nombre': '', 'tipo': 'Inversión'})
unidad_gastos = defaultdict(lambda: {'aprop': 0.0, 'comp': 0.0, 'pago': 0.0, 'nombre': ''})

for g in gastos:
    raw_rec = (g.get('Recurso') or '').strip()
    if not raw_rec: continue
    code = raw_rec.split(' - ')[0].strip() if ' - ' in raw_rec else raw_rec
    nombre = raw_rec.split(' - ')[1].strip() if ' - ' in raw_rec else raw_rec
    
    ap = p(g.get('Valor apropiacion', 0))
    cp = p(g.get('Acumulado compromiso', 0))
    pg = p(g.get('Acumulado pago', 0))
    
    is_admin = code in admin_recursos
    tipo = 'Administración' if is_admin else 'Inversión'
    
    aprop_tot += ap
    comp_tot += cp
    pagos_tot += pg
    
    if is_admin:
        aprop_adm += ap
        comp_adm += cp
        pagos_adm += pg
    else:
        aprop_inv += ap
        comp_inv += cp
        pagos_inv += pg
        
    rec_gastos[code]['aprop'] += ap
    rec_gastos[code]['comp'] += cp
    rec_gastos[code]['pago'] += pg
    rec_gastos[code]['nombre'] = nombre
    rec_gastos[code]['tipo'] = tipo
    
    u = (g.get('Unidad') or '').strip()
    if u:
        unidad_gastos[u]['aprop'] += ap
        unidad_gastos[u]['comp'] += cp
        unidad_gastos[u]['pago'] += pg
        unidad_gastos[u]['nombre'] = u

# 2. Bancos
bancos_tot = 0.0
bancos_adm = 0.0
bancos_inv = 0.0
bancos_unclass = 0.0

rec_bancos = defaultdict(float)

for b in bancos:
    ent = (b.get('Nombre de entidad') or '').strip()
    if 'TOTAL' in ent.upper(): continue
    vf = p(b.get('Valor final', 0))
    bancos_tot += vf
    
    dest = (b.get('Destino') or '').lower()
    rec_name = (b.get('Recurso') or '').strip().upper()
    acc_name = (b.get('Nombre de cuenta') or '').strip().upper()
    
    # Destination classification
    if 'funcionamiento' in dest or 'administración' in dest or 'administracion' in dest:
        bancos_adm += vf
    elif 'inversión' in dest or 'inversion' in dest:
        bancos_inv += vf
    else:
        bancos_unclass += vf
        
    # Map to resource code
    if 'APORTE' in rec_name or 'TRANSFERENCIAS DE LA NACION' in acc_name:
        rec_bancos['10.0'] += vf
    elif 'APORTES INVERSION' in rec_name or ('RECURSOS ADICION' in acc_name and 'INVERSION' in dest.upper()):
        rec_bancos['16.0'] += vf
    elif 'CONVENIOS CON DERECHOS' in rec_name:
        rec_bancos['33'] += vf
    elif 'CONVENIOS SIN DERECHOS' in rec_name:
        rec_bancos['34'] += vf
    elif 'COOPERATIVAS' in rec_name:
        rec_bancos['13'] += vf
    elif 'ESTAMPILLA' in rec_name or 'PROESTAMPILL' in acc_name:
        rec_bancos['40'] += vf
    elif 'RECURSOS PROPIOS' in rec_name or 'PROPIOS' in rec_name:
        rec_bancos['20'] += vf
    elif 'RECURSOS DEL PROGRAMA' in rec_name:
        if 'ESTAMPILL' in acc_name:
            rec_bancos['40'] += vf
        elif 'CONVENIO' in acc_name or 'CONV' in acc_name:
            rec_bancos['33'] += vf
        else:
            rec_bancos['31'] += vf
    else:
        rec_bancos['UNASSIGNED'] += vf

# Output verification
print("=== MATRIZ INTEGRAL 11 x 3 ===")
disp_presup_tot = aprop_tot - comp_tot
disp_presup_adm = aprop_adm - comp_adm
disp_presup_inv = aprop_inv - comp_inv

pend_pago_tot = comp_tot - pagos_tot
pend_pago_adm = comp_adm - pagos_adm
pend_pago_inv = comp_inv - pagos_inv

# Bancos con la no clasificada asignada a institucional adm o mostrada separada:
print(f"Apropiación Definitiva:   Admin={aprop_adm:16,.2f} | Invers={aprop_inv:16,.2f} | Total={aprop_tot:16,.2f}")
print(f"Compromisos Acumulados:   Admin={comp_adm:16,.2f} | Invers={comp_inv:16,.2f} | Total={comp_tot:16,.2f}")
print(f"Pagos Acumulados:         Admin={pagos_adm:16,.2f} | Invers={pagos_inv:16,.2f} | Total={pagos_tot:16,.2f}")
print(f"Disponible Presupuestal:  Admin={disp_presup_adm:16,.2f} | Invers={disp_presup_inv:16,.2f} | Total={disp_presup_tot:16,.2f}")
print(f"Saldo Bancario:           Admin={bancos_adm:16,.2f} | Invers={bancos_inv:16,.2f} | NoClass={bancos_unclass:12,.2f} | Total={bancos_tot:16,.2f}")
print(f"Obligaciones Pendientes:  Admin={pend_pago_adm:16,.2f} | Invers={pend_pago_inv:16,.2f} | Total={pend_pago_tot:16,.2f}")

disp_tesoral_tot = bancos_tot - pend_pago_tot
disp_tesoral_adm = bancos_adm - pend_pago_adm
disp_tesoral_inv = bancos_inv - pend_pago_inv

brecha_tot = disp_presup_tot - disp_tesoral_tot
brecha_adm = disp_presup_adm - disp_tesoral_adm
brecha_inv = disp_presup_inv - disp_tesoral_inv

cob_tot = (bancos_tot / pend_pago_tot) if pend_pago_tot > 0 else 0
cob_adm = (bancos_adm / pend_pago_adm) if pend_pago_adm > 0 else 0
cob_inv = (bancos_inv / pend_pago_inv) if pend_pago_inv > 0 else 0

print(f"Disponible Tesoral Est.:  Admin={disp_tesoral_adm:16,.2f} | Invers={disp_tesoral_inv:16,.2f} | Total={disp_tesoral_tot:16,.2f}")
print(f"Brecha Presup - Tesoral:  Admin={brecha_adm:16,.2f} | Invers={brecha_inv:16,.2f} | Total={brecha_tot:16,.2f}")
print(f"Cobertura Inmediata:      Admin={cob_adm:15.2f}x | Invers={cob_inv:15.2f}x | Total={cob_tot:15.2f}x")

print("\n=== RECURSOS Y ESCENARIOS ===")
for code, gv in sorted(rec_gastos.items()):
    disp_p = gv['aprop'] - gv['comp']
    por_pag = gv['comp'] - gv['pago']
    banco_val = rec_bancos.get(code, 0.0)
    disp_t = banco_val - por_pag
    diff = disp_p - disp_t
    cob = (banco_val / por_pag) if por_pag > 0 else 999.0
    
    # Classification into scenarios A, B, C, D
    if por_pag > 0 and banco_val < por_pag:
        escenario = 'Escenario D (Presión de Liquidez)'
    elif disp_p > disp_t + 1000000:
        escenario = 'Escenario A (Presupuestal > Tesoral)'
    elif disp_t > disp_p + 1000000:
        escenario = 'Escenario B (Tesoral > Presupuestal)'
    else:
        escenario = 'Escenario C (Equilibrado)'
        
    print(f"Rec {code:5s} ({gv['tipo'][:3]}): DispP={disp_p:14,.2f} | Banco={banco_val:14,.2f} | PorPag={por_pag:12,.2f} | Cob={cob:5.1f}x | {escenario}")

