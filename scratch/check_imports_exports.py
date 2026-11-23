import re

with open('src/screens/CajaHoyScreen.tsx') as f:
    screen_code = f.read()

with open('src/lib/cajaHoyEngine.ts') as f:
    engine_code = f.read()

# Extract imported items from '../lib/cajaHoyEngine'
import_match = re.search(r'from [\"\']\.\./lib/cajaHoyEngine[\"\'];', screen_code)
if not import_match:
    print("ERROR: Could not find import from ../lib/cajaHoyEngine in CajaHoyScreen.tsx")
    exit(1)

# Find the start of the import block
import_start = screen_code.rfind('import {', 0, import_match.start())
import_block = screen_code[import_start:import_match.start()]
imported_items = re.findall(r'([A-Za-z0-9_]+)', import_block)
imported_items = [i for i in imported_items if i not in ['import']]

print("Imported from cajaHoyEngine in CajaHoyScreen.tsx:")
print(imported_items)

# Check each against engine_code
missing = []
for item in imported_items:
    pattern = rf'export\s+(?:type|interface|const|function|class)\s+{item}\b'
    if not re.search(pattern, engine_code):
        # Also check if it's exported in export { ... }
        if not re.search(rf'export\s*\{{[^}}]*\b{item}\b[^}}]*\}}', engine_code):
            missing.append(item)

if missing:
    print("CRITICAL ERROR: Missing exports in cajaHoyEngine.ts:", missing)
else:
    print("✓ All symbols imported from cajaHoyEngine are properly exported!")

