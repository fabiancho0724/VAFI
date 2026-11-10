import csv

with open('parse_gasto.py') as f:
    text = f.read()

# Let's inspect R10.0 lines that have decimals or non-zeros in last digits
from parse_gasto import rows

for r in rows:
    if '10.0' in r['recurso']:
        if r['valor'] % 1 != 0 or r['valor'] % 1000 != 0:
            print(f"R10.0: {r['codigo']:30s} {r['concepto'][:40]:40s} {r['valor']:15,.2f}")

print("\n--- R31 ---")
for r in rows:
    if '31' in r['recurso']:
        if r['valor'] % 1 != 0 or r['valor'] % 1000 != 0:
            print(f"R31:   {r['codigo']:30s} {r['concepto'][:40]:40s} {r['valor']:15,.2f}")

print("\n--- R20 decimals ---")
for r in rows:
    if '20' in r['recurso']:
        if r['valor'] % 1 != 0:
            print(f"R20:   {r['codigo']:30s} {r['concepto'][:40]:40s} {r['valor']:15,.2f}")
