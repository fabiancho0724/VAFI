import re

with open('src/screens/CajaHoyScreen.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
old_import = "import {\n  loadCajaHoyDatasets,"
new_import = """import {
  loadCajaHoyDatasets,
  calculateConciliacionPresupuestoTesoral,
  ConciliacionPresupuestoTesoralResult,
  ConciliacionRecursoItem,
  ConciliacionUnidadItem,
  ConciliacionCentralRow,
  ConciliacionIntegralRow,
  EscenarioConciliacion,"""

content = content.replace(old_import, new_import)

# 2. Update activeTab type
old_active_tab = "  const [activeTab, setActiveTab] = useState<\n    'ejecutivo' | 'mensual' | 'gastos' | 'bancos' | 'diciembre' | 'equilibrio' | 'auditoria' | 'reportes'\n  >('ejecutivo');"
new_active_tab = """  const [activeTab, setActiveTab] = useState<
    'ejecutivo' | 'conciliacion' | 'mensual' | 'gastos' | 'bancos' | 'diciembre' | 'equilibrio' | 'auditoria' | 'reportes'
  >('ejecutivo');

  // Conciliación filters state
  const [searchConcilRecurso, setSearchConcilRecurso] = useState('');
  const [searchConcilUnidad, setSearchConcilUnidad] = useState('');
  const [filterConcilEscenario, setFilterConcilEscenario] = useState<'TODOS' | 'A' | 'B' | 'C' | 'D'>('TODOS');
  const [filterConcilTipo, setFilterConcilTipo] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');
  const [activeConcilChart, setActiveConcilChart] = useState<'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7'>('g1');"""

content = content.replace(old_active_tab, new_active_tab)

# 3. Add conciliacionData useMemo
# Find after `const diagnosis = useMemo`
diag_pos = content.find("const diagnosis = useMemo(() => {")
diag_end = content.find("}, [incomes, expenses, banks, filters.useStrictRule3A]);", diag_pos)
insert_pos = diag_end + len("}, [incomes, expenses, banks, filters.useStrictRule3A]);")

concil_memo = """

  // Conciliación Presupuesto vs Tesorería Engine Data
  const conciliacionData: ConciliacionPresupuestoTesoralResult = useMemo(() => {
    return calculateConciliacionPresupuestoTesoral(incomes, expenses, banks, filters.useStrictRule3A);
  }, [incomes, expenses, banks, filters.useStrictRule3A]);"""

content = content[:insert_pos] + concil_memo + content[insert_pos:]

# 4. Update the subtabs array (insert conciliacion as tab 2)
old_subtabs = """        {[
          { id: 'ejecutivo', label: '1. Control Ejecutivo', icon: Award },
          { id: 'mensual', label: '2. Ingresos Mensuales', icon: TrendingUp },
          { id: 'gastos', label: '3. Gastos & Compromisos', icon: TrendingDown },
          { id: 'bancos', label: '4. Estado de Bancos', icon: Landmark },
          { id: 'diciembre', label: '5. Diciembre – Simulador', icon: Sliders },
          { id: 'equilibrio', label: '6. Equilibrio Presupuestal', icon: Scale },
          { id: 'auditoria', label: '7. Validación de Cifras', icon: ShieldCheck },
          { id: 'reportes', label: '8. Reporte y Exportación', icon: FileText },
        ].map((tab) => {"""

new_subtabs = """        {[
          { id: 'ejecutivo', label: '1. Control Ejecutivo', icon: Award },
          { id: 'conciliacion', label: '2. Conciliación Presupuesto vs Tesorería', icon: Scale },
          { id: 'mensual', label: '3. Ingresos Mensuales', icon: TrendingUp },
          { id: 'gastos', label: '4. Gastos & Compromisos', icon: TrendingDown },
          { id: 'bancos', label: '5. Estado de Bancos', icon: Landmark },
          { id: 'diciembre', label: '6. Diciembre – Simulador', icon: Sliders },
          { id: 'equilibrio', label: '7. Equilibrio Presupuestal', icon: DollarSign },
          { id: 'auditoria', label: '8. Validación de Cifras', icon: ShieldCheck },
          { id: 'reportes', label: '9. Reporte y Exportación', icon: FileText },
        ].map((tab) => {"""

content = content.replace(old_subtabs, new_subtabs)

print("Imports, activeTab, and subtabs updated successfully.")

with open('src/screens/CajaHoyScreen.tsx', 'w') as f:
    f.write(content)

