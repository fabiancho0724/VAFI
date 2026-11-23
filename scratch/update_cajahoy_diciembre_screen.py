with open('src/screens/CajaHoyScreen.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
old_imp = """  loadCajaHoyDatasets,
  calculateConciliacionPresupuestoTesoral,"""

new_imp = """  loadCajaHoyDatasets,
  calculateConciliacionPresupuestoTesoral,
  calculateProyeccionesDiciembreAvanzadas,
  IngresoAdicionalProyectado,
  Rubro211Proyeccion,
  ProyeccionDiciembreAvanzadaResult,"""

content = content.replace(old_imp, new_imp)

# 2. Add Lucide icons: Plus, Trash2, Edit3, Check, X, FileCheck
old_lucide = """  FileSpreadsheet,
  Download,"""

new_lucide = """  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileCheck,"""

content = content.replace(old_lucide, new_lucide)

# 3. Add states for Nómina 2.1.1 and Ingresos Adicionales
old_state = """  // December Simulation editable parameters
  const [simIncomeComplianceRate, setSimIncomeComplianceRate] = useState<number>(0.65);
  const [simExtraIncome, setSimExtraIncome] = useState<number>(0);
  const [simExpensePaymentRate, setSimExpensePaymentRate] = useState<number>(0.75);
  const [simExtraExpense, setSimExtraExpense] = useState<number>(0);
  const [simCustomBankBalance, setSimCustomBankBalance] = useState<number>(144563470673.35);
  const [simResourceScope, setSimResourceScope] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');"""

new_state = """  // December Simulation editable parameters
  const [simIncomeComplianceRate, setSimIncomeComplianceRate] = useState<number>(0.65);
  const [simExpensePaymentRate, setSimExpensePaymentRate] = useState<number>(0.75);
  const [simResourceScope, setSimResourceScope] = useState<'Todos' | 'Administración' | 'Inversión'>('Todos');

  // Requerimiento 1: Nómina de Diciembre en Rubro 2.1.1 (Gastos de Personal)
  const [simNominaDiciembre211, setSimNominaDiciembre211] = useState<number>(28500000000);

  // Requerimiento 2: Apartado Independiente de Ingresos Adicionales Proyectados
  const [simIngresosAdicionales, setSimIngresosAdicionales] = useState<IngresoAdicionalProyectado[]>([
    {
      id: 'ing-1',
      concepto: 'Giro MEN – Saldo Pendiente Política de Gratuidad (Recurso 10.5)',
      valor: 9500000000,
      recurso: '10.5',
      tipo: 'Inversión',
      naturaleza: 'Destinación Específica',
      observaciones: 'Transferencia programada cierre de vigencia Ministerio de Educación',
    },
    {
      id: 'ing-2',
      concepto: 'Recaudo Extraordinario Matrículas Posgrados y Extensión',
      valor: 2500000000,
      recurso: '20',
      tipo: 'Administración',
      naturaleza: 'Libre Destinación',
      observaciones: 'Cierre de ciclo académico y legalizaciones de matrícula extemporánea',
    },
  ]);

  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<{
    concepto: string;
    valor: number;
    recurso: string;
    tipo: 'Administración' | 'Inversión';
    naturaleza: 'Libre Destinación' | 'Destinación Específica';
    observaciones: string;
  }>({
    concepto: '',
    valor: 0,
    recurso: '20',
    tipo: 'Administración',
    naturaleza: 'Libre Destinación',
    observaciones: '',
  });"""

content = content.replace(old_state, new_state)

# 4. Add proyeccionDiciembre useMemo inside component body
memo_target = """  // Conciliación Presupuesto vs Tesorería Engine Data
  const conciliacionData: ConciliacionPresupuestoTesoralResult = useMemo(() => {
    return calculateConciliacionPresupuestoTesoral(incomes, expenses, banks, filters.useStrictRule3A);
  }, [incomes, expenses, banks, filters.useStrictRule3A]);"""

new_memo = """  // Conciliación Presupuesto vs Tesorería Engine Data
  const conciliacionData: ConciliacionPresupuestoTesoralResult = useMemo(() => {
    return calculateConciliacionPresupuestoTesoral(incomes, expenses, banks, filters.useStrictRule3A);
  }, [incomes, expenses, banks, filters.useStrictRule3A]);

  // Proyecciones Avanzadas de Diciembre (Nómina 2.1.1 + Ingresos Adicionales)
  const proyeccionDiciembre = useMemo(() => {
    return calculateProyeccionesDiciembreAvanzadas(
      incomes,
      expenses,
      banks,
      simNominaDiciembre211,
      simIngresosAdicionales,
      simIncomeComplianceRate,
      simExpensePaymentRate,
      simResourceScope,
      filters.useStrictRule3A
    );
  }, [
    incomes,
    expenses,
    banks,
    simNominaDiciembre211,
    simIngresosAdicionales,
    simIncomeComplianceRate,
    simExpensePaymentRate,
    simResourceScope,
    filters.useStrictRule3A,
  ]);

  // Handlers para el CRUD de Ingresos Adicionales Proyectados
  const handleSaveIncome = () => {
    if (!incomeForm.concepto.trim() || incomeForm.valor <= 0) return;

    if (editingIncomeId) {
      setSimIngresosAdicionales((prev) =>
        prev.map((item) =>
          item.id === editingIncomeId
            ? { ...item, ...incomeForm }
            : item
        )
      );
      setEditingIncomeId(null);
    } else {
      const newItem: IngresoAdicionalProyectado = {
        id: `ing-${Date.now()}`,
        ...incomeForm,
      };
      setSimIngresosAdicionales((prev) => [...prev, newItem]);
    }

    setIncomeForm({
      concepto: '',
      valor: 0,
      recurso: '20',
      tipo: 'Administración',
      naturaleza: 'Libre Destinación',
      observaciones: '',
    });
    setShowAddIncomeForm(false);
  };

  const handleEditIncome = (item: IngresoAdicionalProyectado) => {
    setEditingIncomeId(item.id);
    setIncomeForm({
      concepto: item.concepto,
      valor: item.valor,
      recurso: item.recurso,
      tipo: item.tipo,
      naturaleza: item.naturaleza,
      observaciones: item.observaciones || '',
    });
    setShowAddIncomeForm(true);
  };

  const handleDeleteIncome = (id: string) => {
    setSimIngresosAdicionales((prev) => prev.filter((item) => item.id !== id));
  };"""

content = content.replace(memo_target, new_memo)

# 5. Update resetSimulation to also reset simNominaDiciembre211 and default simIngresosAdicionales
old_reset = """  const resetSimulation = () => {
    setSimIncomeComplianceRate(0.65);
    setSimExtraIncome(0);
    setSimExpensePaymentRate(0.75);
    setSimExtraExpense(0);
    setSimCustomBankBalance(144563470673.35);
    setSimResourceScope('Todos');
  };"""

new_reset = """  const resetSimulation = () => {
    setSimIncomeComplianceRate(0.65);
    setSimExpensePaymentRate(0.75);
    setSimResourceScope('Todos');
    setSimNominaDiciembre211(28500000000);
    setSimIngresosAdicionales([
      {
        id: 'ing-1',
        concepto: 'Giro MEN – Saldo Pendiente Política de Gratuidad (Recurso 10.5)',
        valor: 9500000000,
        recurso: '10.5',
        tipo: 'Inversión',
        naturaleza: 'Destinación Específica',
        observaciones: 'Transferencia programada cierre de vigencia Ministerio de Educación',
      },
      {
        id: 'ing-2',
        concepto: 'Recaudo Extraordinario Matrículas Posgrados y Extensión',
        valor: 2500000000,
        recurso: '20',
        tipo: 'Administración',
        naturaleza: 'Libre Destinación',
        observaciones: 'Cierre de ciclo académico y legalizaciones de matrícula extemporánea',
      },
    ]);
  };"""

content = content.replace(old_reset, new_reset)

with open('src/screens/CajaHoyScreen.tsx', 'w') as f:
    f.write(content)

print("Imports, state, and handlers updated in CajaHoyScreen.tsx")

