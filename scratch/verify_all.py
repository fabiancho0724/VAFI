import csv, json

def clean_val(s):
    if not s: return 0.0
    s = str(s).replace('$', '').replace(' ', '').replace('.', '').replace(',', '.')
    try: return float(s)
    except: return 0.0

print('=== 1. VERIFICACION GASTOS.CSV ===')
with open('public/data/Gastos.csv', 'r', encoding='latin1') as f:
    r = csv.reader(f, delimiter=';')
    h = next(r)
    tot_aprop = tot_comp = tot_pago = 0.0
    rows = 0
    for row in r:
        if len(row) >= 11:
            rows += 1
            tot_aprop += clean_val(row[8])
            tot_comp += clean_val(row[9])
            tot_pago += clean_val(row[10])
    print(f'Filas: {rows}')
    print(f'Apropiacion: ${tot_aprop:,.2f}')
    print(f'Compromiso:  ${tot_comp:,.2f} ({tot_comp/tot_aprop*100:.2f}%)')
    print(f'Pago:        ${tot_pago:,.2f} ({tot_pago/tot_aprop*100:.2f}%)')
    print(f'Por pagar:   ${tot_comp - tot_pago:,.2f}')

print('\n=== 2. VERIFICACION INGRESOS.CSV ===')
with open('public/data/Ingresos.csv', 'r', encoding='latin1') as f:
    r = csv.reader(f, delimiter=';')
    h = next(r)
    tot_ini = tot_aforo = tot_rec = 0.0
    rows = 0
    for row in r:
        if len(row) >= 7:
            rows += 1
            tot_ini += clean_val(row[4])
            tot_aforo += clean_val(row[5])
            tot_rec += clean_val(row[6])
    print(f'Filas: {rows}')
    print(f'Inicial: ${tot_ini:,.2f}')
    print(f'Aforo:   ${tot_aforo:,.2f}')
    print(f'Recaudo: ${tot_rec:,.2f} ({tot_rec/tot_ini*100:.2f}%)')

print('\n=== 3. VERIFICACION GASTOS_2026.CSV ===')
with open('public/data/gastos_2026.csv', 'r', encoding='latin1') as f:
    r = csv.reader(f, delimiter=';')
    h = next(r)
    tot_comp_g26 = tot_pago_g26 = 0.0
    rows = 0
    for row in r:
        if len(row) >= 7:
            rows += 1
            tot_comp_g26 += clean_val(row[5])
            tot_pago_g26 += clean_val(row[6])
    print(f'Grupos: {rows}')
    print(f'Compromiso: ${tot_comp_g26:,.2f}')
    print(f'Pago:       ${tot_pago_g26:,.2f}')

print('\n=== 4. VERIFICACION BALANCE.CSV ===')
with open('public/data/balance.csv', 'r') as f:
    r = csv.reader(f)
    h = next(r)
    for row in r:
        if row and row[0].strip() == 'Total general':
            print(f'Total general -> Aforo: ${float(row[2]):,.2f} | Recaudo Corte: ${float(row[3]):,.2f} | SIIF Pendiente: ${float(row[5]):,.2f} | Total Cierre: ${float(row[6]):,.2f}')

print('\n=== 5. CAJA Y LIQUIDEZ DISPONIBLE AL CORTE ===')
caja_corte = tot_rec - tot_pago
print(f'Superavit / Caja Disponible al Corte (Ene-Oct): ${caja_corte:,.2f}')
