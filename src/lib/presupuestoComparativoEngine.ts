import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import raw2025 from '../data/presupuestoInicial2025.json';
import raw2026 from '../data/presupuestoInicial2026.json';

export interface PresupuestoItem {
  unidad: string;
  codigo: string;
  concepto: string;
  recurso: string;
  codigoRecurso: string;
  valorInicial: number;
  tipoGasto: 'Funcionamiento' | 'Inversión';
  grupoRecurso: 'Aportes Directos Nación' | 'Fondo FSE / Gratuidad' | 'Recursos Propios' | 'Posgrados y Extensión' | 'Estampillas y Contribuciones';
  subprefijo: string;
  year: number;
}

export interface ComparisonRow {
  id: string;
  unidad: string;
  codigo: string;
  concepto: string;
  recurso: string;
  codigoRecurso: string;
  valor2025: number;
  valor2026: number;
  difAbsoluta: number;
  difPorcentual: number;
  part2025: number;
  part2026: number;
  cambioPuntosPct: number;
  tipoGasto: 'Funcionamiento' | 'Inversión';
  grupoRecurso: string;
  estado: 'NUEVO' | 'EXTINTO' | 'INCREMENTO' | 'REDUCCION' | 'ESTABLE';
}

export interface RecursoComparison {
  recurso: string;
  codigoRecurso: string;
  grupoRecurso: string;
  valor2025: number;
  valor2026: number;
  difAbsoluta: number;
  difPorcentual: number;
  part2025: number;
  part2026: number;
  cambioPuntosPct: number;
  tipoGastoPredominante: 'Funcionamiento' | 'Inversión';
  volatilidad: 'Baja' | 'Media' | 'Alta';
  destinacionEstrategica: string;
}

export interface RubroAggregatedComparison {
  codigo: string;
  concepto: string;
  valor2025: number;
  valor2026: number;
  difAbsoluta: number;
  difPorcentual: number;
  part2025: number;
  part2026: number;
  cambioPuntosPct: number;
  recursosPrincipales: string[];
  tipoGasto: 'Funcionamiento' | 'Inversión';
  estado: 'NUEVO' | 'EXTINTO' | 'INCREMENTO' | 'REDUCCION' | 'ESTABLE';
}

export interface UnidadComparison {
  unidad: string;
  valor2025: number;
  valor2026: number;
  difAbsoluta: number;
  difPorcentual: number;
  part2025: number;
  part2026: number;
  cambioPuntosPct: number;
}

export interface ComponenteGastoComparison {
  componente: string;
  codigo: string;
  valor2025: number;
  valor2026: number;
  difAbsoluta: number;
  difPorcentual: number;
  part2025: number;
  part2026: number;
  cambioPuntosPct: number;
  recursosFinanciadores: string;
  analisis: string;
}

export interface IndicadorPresupuestal {
  id: string;
  numero: number;
  nombre: string;
  metodologia: string;
  valor2025: string;
  valor2026: string;
  variacion: string;
  interpretacion: string;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'azul';
}

export interface AlertaPresupuestal {
  id: string;
  categoria: 'POSITIVO' | 'ALERTA' | 'SEGUIMIENTO';
  titulo: string;
  descripcion: string;
  cifraSoporte: string;
  variacion: string;
  participacion: string;
  impactoSostenibilidad: string;
  recomendacionVAFI: string;
}

export interface PresupuestoComparativoResult {
  total2025: number;
  total2026: number;
  difAbsolutaTotal: number;
  crecimientoNominal: number;
  crecimientoReal: number;
  ipcReferencia: number;
  totalRows2025: number;
  totalRows2026: number;

  componentesGenerales: {
    nombre: string;
    valor2025: number;
    valor2026: number;
    difAbsoluta: number;
    difPorcentual: number;
    part2025: number;
    part2026: number;
  }[];

  funcionamientoVsInversion: {
    funcionamiento2025: number;
    funcionamiento2026: number;
    difFuncionamiento: number;
    varFuncionamientoPct: number;
    partFuncionamiento2025: number;
    partFuncionamiento2026: number;
    ppFuncionamiento: number;

    inversion2025: number;
    inversion2026: number;
    difInversion: number;
    varInversionPct: number;
    partInversion2025: number;
    partInversion2026: number;
    ppInversion: number;
  };

  gruposRecursos: {
    grupo: string;
    valor2025: number;
    valor2026: number;
    difAbsoluta: number;
    difPorcentual: number;
    part2025: number;
    part2026: number;
    cambioPuntosPct: number;
  }[];

  recursosComparacion: RecursoComparison[];
  rubrosAgrupados: RubroAggregatedComparison[];
  detalleLineas: ComparisonRow[];
  unidadesComparacion: UnidadComparison[];
  componentesGasto: ComponenteGastoComparison[];

  top20MayorIncrementoAbsoluto: RubroAggregatedComparison[];
  top20MayorCrecimientoPct: RubroAggregatedComparison[];
  top20MayorReduccionAbsoluta: RubroAggregatedComparison[];
  top20MayorReduccionPct: RubroAggregatedComparison[];
  rubrosNuevos: RubroAggregatedComparison[];
  rubrosExtintos: RubroAggregatedComparison[];
  rubrosEstables: RubroAggregatedComparison[];

  indicadores: IndicadorPresupuestal[];
  alertas: AlertaPresupuestal[];
  hhi2025: number;
  hhi2026: number;
  top10Concentracion2025: number;
  top10Concentracion2026: number;
}

export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/[$ ]/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  } else if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

export function formatCOP(value: number): string {
  if (isNaN(value)) return '$ 0';
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNeg ? '-' : ''}$ ${formatted}`;
}

export function formatCOPM(value: number): string {
  if (isNaN(value)) return '$ 0 M';
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const inM = abs / 1e6;
  const decimals = inM < 10 ? 2 : 1;
  const formatted = inM.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
  return `${isNeg ? '-' : ''}$ ${formatted} M`;
}

export function formatPercent(value: number): string {
  if (isNaN(value)) return '0.00%';
  const isNeg = value < 0;
  const abs = Math.abs(value);
  return `${isNeg ? '-' : '+'}${abs.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

export function formatPP(value: number): string {
  if (isNaN(value)) return '0.00 pp';
  const isNeg = value < 0;
  const abs = Math.abs(value);
  return `${isNeg ? '-' : '+'}${abs.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} pp`;
}

function getCodigoRecurso(recurso: string): string {
  if (!recurso) return 'OTRO';
  const parts = recurso.split('-');
  return parts[0].trim();
}

function classifyGrupoRecurso(recurso: string): 'Aportes Directos Nación' | 'Fondo FSE / Gratuidad' | 'Recursos Propios' | 'Posgrados y Extensión' | 'Estampillas y Contribuciones' {
  const cod = getCodigoRecurso(recurso);
  if (cod.startsWith('10.') || cod.startsWith('16.') || cod === '17' || cod === '18') {
    return 'Aportes Directos Nación';
  }
  if (cod === '14') {
    return 'Fondo FSE / Gratuidad';
  }
  if (cod === '20' || cod === '21') {
    return 'Recursos Propios';
  }
  if (['31', '32', '33', '34', '35'].includes(cod)) {
    return 'Posgrados y Extensión';
  }
  return 'Estampillas y Contribuciones';
}

function classifyTipoGasto(recurso: string): 'Funcionamiento' | 'Inversión' {
  const cod = getCodigoRecurso(recurso);
  if (cod.startsWith('16.') || cod === '40' || cod === '12' || cod === '15') {
    return 'Inversión';
  }
  return 'Funcionamiento';
}

export function parsePresupuestoCSV(content: string, year: number): PresupuestoItem[] {
  const parsed = Papa.parse(content, {
    delimiter: ';',
    skipEmptyLines: true,
    header: false
  });

  const rows = parsed.data as string[][];
  if (!rows || rows.length < 2) return [];

  const items: PresupuestoItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5) continue;
    const unidad = (r[0] || '').trim();
    const codigo = (r[1] || '').trim();
    const concepto = (r[2] || '').trim();
    const recurso = (r[3] || '').trim();
    const valStr = (r[4] || '').trim();

    if (!codigo && !concepto) {
      continue;
    }

    const valor = parseNumber(valStr);
    const codRecurso = getCodigoRecurso(recurso);
    const grupo = classifyGrupoRecurso(recurso);
    const tipo = classifyTipoGasto(recurso);
    const sub = codigo.startsWith('1.2') ? '1.2 Recursos de Capital' : '1.1 Ingresos Corrientes';

    items.push({
      unidad,
      codigo,
      concepto,
      recurso,
      codigoRecurso: codRecurso,
      valorInicial: valor,
      tipoGasto: tipo,
      grupoRecurso: grupo,
      subprefijo: sub,
      year
    });
  }

  return items;
}

export function loadDefaultData(): { data2025: PresupuestoItem[]; data2026: PresupuestoItem[] } {
  const convertRaw = (rawList: any[], yr: number): PresupuestoItem[] => {
    return rawList.map(r => {
      const unidad = r.u || '';
      const codigo = r.c || '';
      const concepto = r.n || '';
      const recurso = r.r || '';
      const valor = typeof r.v === 'number' ? r.v : parseNumber(r.v);
      const codRecurso = getCodigoRecurso(recurso);
      const grupo = classifyGrupoRecurso(recurso);
      const tipo = classifyTipoGasto(recurso);
      const sub = codigo.startsWith('1.2') ? '1.2 Recursos de Capital' : '1.1 Ingresos Corrientes';

      return {
        unidad,
        codigo,
        concepto,
        recurso,
        codigoRecurso: codRecurso,
        valorInicial: valor,
        tipoGasto: tipo,
        grupoRecurso: grupo,
        subprefijo: sub,
        year: yr
      };
    });
  };

  return {
    data2025: convertRaw(raw2025 as any[], 2025),
    data2026: convertRaw(raw2026 as any[], 2026)
  };
}

export async function fetchPresupuestoCSVs(): Promise<{ data2025: PresupuestoItem[]; data2026: PresupuestoItem[] }> {
  try {
    const [res25, res26] = await Promise.all([
      fetch('/data/presupuesto/presupuesto_inicial_2025.csv'),
      fetch('/data/presupuesto/presupuesto_inicial_2026.csv')
    ]);

    if (res25.ok && res26.ok) {
      const text25 = await res25.text();
      const text26 = await res26.text();
      const p25 = parsePresupuestoCSV(text25, 2025);
      const p26 = parsePresupuestoCSV(text26, 2026);
      if (p25.length > 0 && p26.length > 0) {
        return { data2025: p25, data2026: p26 };
      }
    }
  } catch (err) {
    console.warn('Using bundled JSON fallback for Presupuestos Iniciales 2025-2026:', err);
  }
  return loadDefaultData();
}

export function buildPresupuestoComparativo(
  data2025: PresupuestoItem[],
  data2026: PresupuestoItem[],
  ipcReferencia = 0.052
): PresupuestoComparativoResult {
  const total2025 = data2025.reduce((acc, it) => acc + it.valorInicial, 0);
  const total2026 = data2026.reduce((acc, it) => acc + it.valorInicial, 0);
  const difAbsolutaTotal = total2026 - total2025;
  const crecimientoNominal = total2025 > 0 ? (difAbsolutaTotal / total2025) * 100 : 0;
  const crecimientoReal = (((1 + crecimientoNominal / 100) / (1 + ipcReferencia)) - 1) * 100;

  let func2025 = 0;
  let func2026 = 0;
  let inv2025 = 0;
  let inv2026 = 0;

  let corr2025 = 0;
  let corr2026 = 0;
  let cap2025 = 0;
  let cap2026 = 0;

  data2025.forEach(it => {
    if (it.tipoGasto === 'Inversión') inv2025 += it.valorInicial;
    else func2025 += it.valorInicial;

    if (it.subprefijo.startsWith('1.2')) cap2025 += it.valorInicial;
    else corr2025 += it.valorInicial;
  });

  data2026.forEach(it => {
    if (it.tipoGasto === 'Inversión') inv2026 += it.valorInicial;
    else func2026 += it.valorInicial;

    if (it.subprefijo.startsWith('1.2')) cap2026 += it.valorInicial;
    else corr2026 += it.valorInicial;
  });

  const difFunc = func2026 - func2025;
  const varFuncPct = func2025 > 0 ? (difFunc / func2025) * 100 : 0;
  const partFunc25 = total2025 > 0 ? (func2025 / total2025) * 100 : 0;
  const partFunc26 = total2026 > 0 ? (func2026 / total2026) * 100 : 0;
  const ppFunc = partFunc26 - partFunc25;

  const difInv = inv2026 - inv2025;
  const varInvPct = inv2025 > 0 ? (difInv / inv2025) * 100 : 0;
  const partInv25 = total2025 > 0 ? (inv2025 / total2025) * 100 : 0;
  const partInv26 = total2026 > 0 ? (inv2026 / total2026) * 100 : 0;
  const ppInv = partInv26 - partInv25;

  const componentesGenerales = [
    {
      nombre: 'Presupuesto Inicial Total',
      valor2025: total2025,
      valor2026: total2026,
      difAbsoluta: difAbsolutaTotal,
      difPorcentual: crecimientoNominal,
      part2025: 100,
      part2026: 100
    },
    {
      nombre: '1.1 Ingresos Corrientes (Rentas e Ingresos)',
      valor2025: corr2025,
      valor2026: corr2026,
      difAbsoluta: corr2026 - corr2025,
      difPorcentual: corr2025 > 0 ? ((corr2026 - corr2025) / corr2025) * 100 : 0,
      part2025: total2025 > 0 ? (corr2025 / total2025) * 100 : 0,
      part2026: total2026 > 0 ? (corr2026 / total2026) * 100 : 0
    },
    {
      nombre: '1.2 Recursos de Capital (Balance y Financieros)',
      valor2025: cap2025,
      valor2026: cap2026,
      difAbsoluta: cap2026 - cap2025,
      difPorcentual: cap2025 > 0 ? ((cap2026 - cap2025) / cap2025) * 100 : 0,
      part2025: total2025 > 0 ? (cap2025 / total2025) * 100 : 0,
      part2026: total2026 > 0 ? (cap2026 / total2026) * 100 : 0
    },
    {
      nombre: 'Apropiaciones para Funcionamiento',
      valor2025: func2025,
      valor2026: func2026,
      difAbsoluta: difFunc,
      difPorcentual: varFuncPct,
      part2025: partFunc25,
      part2026: partFunc26
    },
    {
      nombre: 'Apropiaciones para Inversión',
      valor2025: inv2025,
      valor2026: inv2026,
      difAbsoluta: difInv,
      difPorcentual: varInvPct,
      part2025: partInv25,
      part2026: partInv26
    }
  ];

  const gruposDef: { [g: string]: { 25: number; 26: number } } = {
    'Aportes Directos Nación': { 25: 0, 26: 0 },
    'Fondo FSE / Gratuidad': { 25: 0, 26: 0 },
    'Recursos Propios': { 25: 0, 26: 0 },
    'Posgrados y Extensión': { 25: 0, 26: 0 },
    'Estampillas y Contribuciones': { 25: 0, 26: 0 }
  };

  data2025.forEach(it => {
    if (gruposDef[it.grupoRecurso]) {
      gruposDef[it.grupoRecurso][25] += it.valorInicial;
    }
  });
  data2026.forEach(it => {
    if (gruposDef[it.grupoRecurso]) {
      gruposDef[it.grupoRecurso][26] += it.valorInicial;
    }
  });

  const gruposRecursos = Object.keys(gruposDef).map(g => {
    const v25 = gruposDef[g][25];
    const v26 = gruposDef[g][26];
    const dif = v26 - v25;
    const pct = v25 > 0 ? (dif / v25) * 100 : (v26 > 0 ? 100 : 0);
    const p25 = total2025 > 0 ? (v25 / total2025) * 100 : 0;
    const p26 = total2026 > 0 ? (v26 / total2026) * 100 : 0;
    return {
      grupo: g,
      valor2025: v25,
      valor2026: v26,
      difAbsoluta: dif,
      difPorcentual: pct,
      part2025: p25,
      part2026: p26,
      cambioPuntosPct: p26 - p25
    };
  });

  const recursosMap: { [r: string]: { 25: number; 26: number; cod: string; grupo: string; tipo: 'Funcionamiento' | 'Inversión' } } = {};

  data2025.forEach(it => {
    if (!recursosMap[it.recurso]) {
      recursosMap[it.recurso] = { 25: 0, 26: 0, cod: it.codigoRecurso, grupo: it.grupoRecurso, tipo: it.tipoGasto };
    }
    recursosMap[it.recurso][25] += it.valorInicial;
  });

  data2026.forEach(it => {
    if (!recursosMap[it.recurso]) {
      recursosMap[it.recurso] = { 25: 0, 26: 0, cod: it.codigoRecurso, grupo: it.grupoRecurso, tipo: it.tipoGasto };
    }
    recursosMap[it.recurso][26] += it.valorInicial;
  });

  const recursosComparacion: RecursoComparison[] = Object.keys(recursosMap).map(rec => {
    const info = recursosMap[rec];
    const v25 = info[25];
    const v26 = info[26];
    const dif = v26 - v25;
    const pct = v25 > 0 ? (dif / v25) * 100 : (v26 > 0 ? 100 : 0);
    const p25 = total2025 > 0 ? (v25 / total2025) * 100 : 0;
    const p26 = total2026 > 0 ? (v26 / total2026) * 100 : 0;

    let volatilidad: 'Baja' | 'Media' | 'Alta' = 'Baja';
    if (info.cod === '10.0' || info.cod === '16.0') volatilidad = 'Baja';
    else if (info.cod.startsWith('3') || info.cod === '14' || info.cod === '10.5') volatilidad = 'Media';
    else if (info.cod === '18' || info.cod === '20' || info.cod === '33') volatilidad = 'Alta';

    let destinacionEstrategica = 'Financiación de gastos operativos institucionales.';
    if (info.cod === '10.0') destinacionEstrategica = 'Aportes directos Nación Ley 30 Art. 86. Base nómina docente y administrativa.';
    else if (info.cod === '10.5') destinacionEstrategica = 'Aportes Nacionales Política de Gratuidad (MEN). Cobertura matrícula pregrado.';
    else if (info.cod === '14') destinacionEstrategica = 'Fondo de Solidaridad Educativa (FSE). Reasignación estructural en 2026.';
    else if (info.cod === '16.0') destinacionEstrategica = 'Inversión Nación Art. 87 Ley 30. Proyectos de infraestructura y dotación.';
    else if (info.cod === '20') destinacionEstrategica = 'Recursos Propios institucionales. Servicios académicos, matrículas y derechos.';
    else if (info.cod === '31') destinacionEstrategica = 'Matrículas de programas de posgrado (Especializaciones, Maestrías, Doctorados).';
    else if (info.cod === '33') destinacionEstrategica = 'Convenios con derechos económicos e interinstitucionales.';
    else if (info.cod === '40') destinacionEstrategica = 'Estampilla Pro-UPTC Ley 64/1988. Inversión física, tecnológica y laboratorios.';
    else if (info.cod === '12') destinacionEstrategica = 'Estampilla Pro-Universidad Nacional y otras universidades estatales.';

    return {
      recurso: rec,
      codigoRecurso: info.cod,
      grupoRecurso: info.grupo,
      valor2025: v25,
      valor2026: v26,
      difAbsoluta: dif,
      difPorcentual: pct,
      part2025: p25,
      part2026: p26,
      cambioPuntosPct: p26 - p25,
      tipoGastoPredominante: info.tipo,
      volatilidad,
      destinacionEstrategica
    };
  }).sort((a, b) => Math.max(b.valor2026, b.valor2025) - Math.max(a.valor2026, a.valor2025));

  let hhi2025 = 0;
  let hhi2026 = 0;
  recursosComparacion.forEach(r => {
    hhi2025 += (r.part2025 * r.part2025);
    hhi2026 += (r.part2026 * r.part2026);
  });

  const rubrosMap: { [c: string]: { concepto: string; 25: number; 26: number; recursos: Set<string>; tipo: 'Funcionamiento' | 'Inversión' } } = {};

  data2025.forEach(it => {
    if (!rubrosMap[it.codigo]) {
      rubrosMap[it.codigo] = { concepto: it.concepto, 25: 0, 26: 0, recursos: new Set(), tipo: it.tipoGasto };
    }
    rubrosMap[it.codigo][25] += it.valorInicial;
    rubrosMap[it.codigo].recursos.add(it.codigoRecurso);
    if (!rubrosMap[it.codigo].concepto && it.concepto) rubrosMap[it.codigo].concepto = it.concepto;
  });

  data2026.forEach(it => {
    if (!rubrosMap[it.codigo]) {
      rubrosMap[it.codigo] = { concepto: it.concepto, 25: 0, 26: 0, recursos: new Set(), tipo: it.tipoGasto };
    }
    rubrosMap[it.codigo][26] += it.valorInicial;
    rubrosMap[it.codigo].recursos.add(it.codigoRecurso);
    if (!rubrosMap[it.codigo].concepto && it.concepto) rubrosMap[it.codigo].concepto = it.concepto;
  });

  const rubrosAgrupados: RubroAggregatedComparison[] = Object.keys(rubrosMap).map(cod => {
    const item = rubrosMap[cod];
    const v25 = item[25];
    const v26 = item[26];
    const dif = v26 - v25;
    const pct = v25 > 0 ? (dif / v25) * 100 : (v26 > 0 ? 100 : 0);
    const p25 = total2025 > 0 ? (v25 / total2025) * 100 : 0;
    const p26 = total2026 > 0 ? (v26 / total2026) * 100 : 0;

    let estado: 'NUEVO' | 'EXTINTO' | 'INCREMENTO' | 'REDUCCION' | 'ESTABLE' = 'ESTABLE';
    if (v25 === 0 && v26 > 0) estado = 'NUEVO';
    else if (v25 > 0 && v26 === 0) estado = 'EXTINTO';
    else if (dif > 0 && pct > 5) estado = 'INCREMENTO';
    else if (dif < 0 && pct < -5) estado = 'REDUCCION';
    else estado = 'ESTABLE';

    return {
      codigo: cod,
      concepto: item.concepto,
      valor2025: v25,
      valor2026: v26,
      difAbsoluta: dif,
      difPorcentual: pct,
      part2025: p25,
      part2026: p26,
      cambioPuntosPct: p26 - p25,
      recursosPrincipales: Array.from(item.recursos),
      tipoGasto: item.tipo,
      estado
    };
  });

  const sortedBy25 = [...rubrosAgrupados].sort((a, b) => b.valor2025 - a.valor2025);
  const sortedBy26 = [...rubrosAgrupados].sort((a, b) => b.valor2026 - a.valor2026);
  const top10Concentracion2025 = total2025 > 0
    ? (sortedBy25.slice(0, 10).reduce((acc, r) => acc + r.valor2025, 0) / total2025) * 100
    : 0;
  const top10Concentracion2026 = total2026 > 0
    ? (sortedBy26.slice(0, 10).reduce((acc, r) => acc + r.valor2026, 0) / total2026) * 100
    : 0;

  const top20MayorIncrementoAbsoluto = [...rubrosAgrupados]
    .filter(r => r.difAbsoluta > 0)
    .sort((a, b) => b.difAbsoluta - a.difAbsoluta)
    .slice(0, 20);

  const top20MayorCrecimientoPct = [...rubrosAgrupados]
    .filter(r => r.valor2025 >= 10000000 && r.difAbsoluta > 0)
    .sort((a, b) => b.difPorcentual - a.difPorcentual)
    .slice(0, 20);

  const top20MayorReduccionAbsoluta = [...rubrosAgrupados]
    .filter(r => r.difAbsoluta < 0)
    .sort((a, b) => a.difAbsoluta - b.difAbsoluta)
    .slice(0, 20);

  const top20MayorReduccionPct = [...rubrosAgrupados]
    .filter(r => r.valor2025 >= 10000000 && r.difAbsoluta < 0)
    .sort((a, b) => a.difPorcentual - b.difPorcentual)
    .slice(0, 20);

  const rubrosNuevos = rubrosAgrupados
    .filter(r => r.estado === 'NUEVO')
    .sort((a, b) => b.valor2026 - a.valor2026);

  const rubrosExtintos = rubrosAgrupados
    .filter(r => r.estado === 'EXTINTO')
    .sort((a, b) => b.valor2025 - a.valor2025);

  const rubrosEstables = rubrosAgrupados
    .filter(r => r.estado === 'ESTABLE' && (r.valor2025 > 0 || r.valor2026 > 0))
    .sort((a, b) => Math.max(b.valor2026, b.valor2025) - Math.max(a.valor2026, a.valor2025));

  const lineMap: { [k: string]: { u: string; c: string; n: string; r: string; cr: string; 25: number; 26: number; tipo: 'Funcionamiento' | 'Inversión'; grp: string } } = {};

  data2025.forEach(it => {
    const key = `${it.unidad}::${it.codigo}::${it.recurso}`;
    if (!lineMap[key]) {
      lineMap[key] = {
        u: it.unidad,
        c: it.codigo,
        n: it.concepto,
        r: it.recurso,
        cr: it.codigoRecurso,
        25: 0,
        26: 0,
        tipo: it.tipoGasto,
        grp: it.grupoRecurso
      };
    }
    lineMap[key][25] += it.valorInicial;
  });

  data2026.forEach(it => {
    const key = `${it.unidad}::${it.codigo}::${it.recurso}`;
    if (!lineMap[key]) {
      lineMap[key] = {
        u: it.unidad,
        c: it.codigo,
        n: it.concepto,
        r: it.recurso,
        cr: it.codigoRecurso,
        25: 0,
        26: 0,
        tipo: it.tipoGasto,
        grp: it.grupoRecurso
      };
    }
    lineMap[key][26] += it.valorInicial;
    if (!lineMap[key].n && it.concepto) lineMap[key].n = it.concepto;
  });

  const detalleLineas: ComparisonRow[] = Object.keys(lineMap).map((k, idx) => {
    const item = lineMap[k];
    const v25 = item[25];
    const v26 = item[26];
    const dif = v26 - v25;
    const pct = v25 > 0 ? (dif / v25) * 100 : (v26 > 0 ? 100 : 0);
    const p25 = total2025 > 0 ? (v25 / total2025) * 100 : 0;
    const p26 = total2026 > 0 ? (v26 / total2026) * 100 : 0;

    let estado: 'NUEVO' | 'EXTINTO' | 'INCREMENTO' | 'REDUCCION' | 'ESTABLE' = 'ESTABLE';
    if (v25 === 0 && v26 > 0) estado = 'NUEVO';
    else if (v25 > 0 && v26 === 0) estado = 'EXTINTO';
    else if (dif > 0 && pct > 5) estado = 'INCREMENTO';
    else if (dif < 0 && pct < -5) estado = 'REDUCCION';
    else estado = 'ESTABLE';

    return {
      id: `row-${idx}`,
      unidad: item.u,
      codigo: item.c,
      concepto: item.n,
      recurso: item.r,
      codigoRecurso: item.cr,
      valor2025: v25,
      valor2026: v26,
      difAbsoluta: dif,
      difPorcentual: pct,
      part2025: p25,
      part2026: p26,
      cambioPuntosPct: p26 - p25,
      tipoGasto: item.tipo,
      grupoRecurso: item.grp,
      estado
    };
  }).sort((a, b) => Math.max(b.valor2026, b.valor2025) - Math.max(a.valor2026, a.valor2025));

  const unidadesMap: { [u: string]: { 25: number; 26: number } } = {};
  data2025.forEach(it => {
    if (!unidadesMap[it.unidad]) unidadesMap[it.unidad] = { 25: 0, 26: 0 };
    unidadesMap[it.unidad][25] += it.valorInicial;
  });
  data2026.forEach(it => {
    if (!unidadesMap[it.unidad]) unidadesMap[it.unidad] = { 25: 0, 26: 0 };
    unidadesMap[it.unidad][26] += it.valorInicial;
  });

  const unidadesComparacion: UnidadComparison[] = Object.keys(unidadesMap).map(u => {
    const v25 = unidadesMap[u][25];
    const v26 = unidadesMap[u][26];
    const dif = v26 - v25;
    const pct = v25 > 0 ? (dif / v25) * 100 : (v26 > 0 ? 100 : 0);
    const p25 = total2025 > 0 ? (v25 / total2025) * 100 : 0;
    const p26 = total2026 > 0 ? (v26 / total2026) * 100 : 0;
    return {
      unidad: u,
      valor2025: v25,
      valor2026: v26,
      difAbsoluta: dif,
      difPorcentual: pct,
      part2025: p25,
      part2026: p26,
      cambioPuntosPct: p26 - p25
    };
  }).sort((a, b) => Math.max(b.valor2026, b.valor2025) - Math.max(a.valor2026, a.valor2025));

  const componentesGasto: ComponenteGastoComparison[] = [
    {
      componente: 'Gastos de Personal (Nómina y Prestaciones)',
      codigo: '2.1.1 (Financiado por R10)',
      valor2025: 263539315581,
      valor2026: 314781873726,
      difAbsoluta: 51242558145,
      difPorcentual: 19.44,
      part2025: (263539315581 / total2025) * 100,
      part2026: (314781873726 / total2026) * 100,
      cambioPuntosPct: ((314781873726 / total2026) * 100) - ((263539315581 / total2025) * 100),
      recursosFinanciadores: '10.0-Aportes Nación - Funcionamiento',
      analisis: 'Principal rigidez institucional. El crecimiento nominal del 19.44% absorbe la mayor parte del incremento presupuestal para garantizar cobertura de nómina docente y administrativa de planta y transitorios.'
    },
    {
      componente: 'Matrículas de Pregrado y Política de Gratuidad',
      codigo: '1.1.02.06 / R14 + R10.5',
      valor2025: 36210311946,
      valor2026: 39445754626,
      difAbsoluta: 3235442680,
      difPorcentual: 8.94,
      part2025: (36210311946 / total2025) * 100,
      part2026: (39445754626 / total2026) * 100,
      cambioPuntosPct: ((39445754626 / total2026) * 100) - ((36210311946 / total2025) * 100),
      recursosFinanciadores: '14-Matrículas FSE ($18.737 M) y 10.5-Gratuidad Nación ($20.708 M)',
      analisis: 'Transformación estructural clave: se desdobla el financiamiento de gratuidad entre el fondo FSE y la nueva asignación directa del Ministerio de Educación (R10.5), con un incremento neto consolidado de $3.235 M (+8.94%).'
    },
    {
      componente: 'Posgrados, Educación Continuada y Extensión',
      codigo: '1.1.02.05 / R31 a R35',
      valor2025: 91683057385,
      valor2026: 87508560516,
      difAbsoluta: -4174496869,
      difPorcentual: -4.55,
      part2025: (91683057385 / total2025) * 100,
      part2026: (87508560516 / total2026) * 100,
      cambioPuntosPct: ((87508560516 / total2026) * 100) - ((91683057385 / total2025) * 100),
      recursosFinanciadores: '31-Posgrados, 32-Extensión, 33-Convenios con derechos, 34-Sin derechos, 35-Educación Continuada',
      analisis: 'Contracción del 4.55% impulsada principalmente por la reducción en Convenios con derechos económicos (-$4.143 M). Posgrados se mantiene estable ($45.472 M, +0.08%). Requiere monitoreo comercial.'
    },
    {
      componente: 'Recursos Propios y Gestión Institucional',
      codigo: '1.1.02.02 / R20 + R21',
      valor2025: 15759664907,
      valor2026: 21887517577,
      difAbsoluta: 6127852670,
      difPorcentual: 38.88,
      part2025: (15759664907 / total2025) * 100,
      part2026: (21887517577 / total2026) * 100,
      cambioPuntosPct: ((21887517577 / total2026) * 100) - ((15759664907 / total2025) * 100),
      recursosFinanciadores: '20-Propios ($17.299 M) y 21-Devolución IVA ($4.587 M)',
      analisis: 'Excelente desempeño expansivo (+38.88%). Fortalece la autonomía institucional y la disponibilidad de caja no condicionada para atender imprevistos y funcionamiento académico-administrativo.'
    },
    {
      componente: 'Inversión Institucional e Infraestructura',
      codigo: '1.1.02.06.006.01.02 / R16 + R40 + R12',
      valor2025: 16221467876,
      valor2026: 17641620462,
      difAbsoluta: 1420152586,
      difPorcentual: 8.75,
      part2025: (16221467876 / total2025) * 100,
      part2026: (17641620462 / total2026) * 100,
      cambioPuntosPct: ((17641620462 / total2026) * 100) - ((16221467876 / total2025) * 100),
      recursosFinanciadores: '16.0-Aportes Inversión Nación, 40-Estampilla UPTC, 12-Estampillas Otras Universidades',
      analisis: 'Crecimiento nominal de $1.420 M (+8.75%). Sin embargo, su participación cae 0.14 pp (pasa de 3.75% a 3.61%), reflejando la alta rigidez del presupuesto orientada casi en su totalidad al funcionamiento.'
    }
  ];

  const depNac2025 = total2025 > 0 ? (gruposDef['Aportes Directos Nación'][25] / total2025) * 100 : 0;
  const depNac2026 = total2026 > 0 ? (gruposDef['Aportes Directos Nación'][26] / total2026) * 100 : 0;
  const depNacTotal2025 = total2025 > 0 ? ((gruposDef['Aportes Directos Nación'][25] + gruposDef['Fondo FSE / Gratuidad'][25]) / total2025) * 100 : 0;
  const depNacTotal2026 = total2026 > 0 ? ((gruposDef['Aportes Directos Nación'][26] + gruposDef['Fondo FSE / Gratuidad'][26]) / total2026) * 100 : 0;

  const partPropios2025 = total2025 > 0 ? (gruposDef['Recursos Propios'][25] / total2025) * 100 : 0;
  const partPropios2026 = total2026 > 0 ? (gruposDef['Recursos Propios'][26] / total2026) * 100 : 0;

  const partPosgrados2025 = total2025 > 0 ? (gruposDef['Posgrados y Extensión'][25] / total2025) * 100 : 0;
  const partPosgrados2026 = total2026 > 0 ? (gruposDef['Posgrados y Extensión'][26] / total2026) * 100 : 0;

  const indicadores: IndicadorPresupuestal[] = [
    {
      id: 'ind-1',
      numero: 1,
      nombre: 'Crecimiento Presupuestal Nominal',
      metodologia: '(Presupuesto Inicial 2026 / Presupuesto Inicial 2025) - 1',
      valor2025: 'Línea Base',
      valor2026: formatPercent(crecimientoNominal),
      variacion: formatPercent(crecimientoNominal),
      interpretacion: `El presupuesto inicial de la UPTC aumentó en ${formatCOPM(difAbsolutaTotal)} COP (+13.09%), superando significativamente la meta de expansión operativa.`,
      semaforo: 'verde'
    },
    {
      id: 'ind-2',
      numero: 2,
      nombre: 'Crecimiento Presupuestal Real (Deflactado IPC)',
      metodologia: '((1 + Crecimiento Nominal) / (1 + IPC Referencia)) - 1',
      valor2025: 'Línea Base',
      valor2026: formatPercent(crecimientoReal),
      variacion: formatPercent(crecimientoReal),
      interpretacion: `Descontando una inflación estimada de referencia de ${(ipcReferencia * 100).toFixed(2)}%, el presupuesto experimenta una ganancia neta de poder adquisitivo del ${crecimientoReal.toFixed(2)}%.`,
      semaforo: 'verde'
    },
    {
      id: 'ind-3',
      numero: 3,
      nombre: 'Variación Absoluta Total',
      metodologia: 'Presupuesto Inicial 2026 - Presupuesto Inicial 2025',
      valor2025: formatCOP(total2025),
      valor2026: formatCOP(total2026),
      variacion: `+${formatCOPM(difAbsolutaTotal)}`,
      interpretacion: 'Monto total de nuevas apropiaciones presupuestales asignadas para el ejercicio fiscal 2026.',
      semaforo: 'azul'
    },
    {
      id: 'ind-4',
      numero: 4,
      nombre: 'Concentración de los 10 Principales Rubros',
      metodologia: '(Suma de los 10 mayores rubros / Presupuesto Total) * 100',
      valor2025: `${top10Concentracion2025.toFixed(2)}%`,
      valor2026: `${top10Concentracion2026.toFixed(2)}%`,
      variacion: formatPP(top10Concentracion2026 - top10Concentracion2025),
      interpretacion: 'Muy alta rigidez y concentración estructural. Tan solo 10 conceptos presupuestales absorben más del 93.6% de todos los recursos institucionales.',
      semaforo: 'amarillo'
    },
    {
      id: 'ind-5',
      numero: 5,
      nombre: 'Peso de Funcionamiento',
      metodologia: '(Apropiaciones de Funcionamiento / Presupuesto Total) * 100',
      valor2025: `${partFunc25.toFixed(2)}%`,
      valor2026: `${partFunc26.toFixed(2)}%`,
      variacion: formatPP(ppFunc),
      interpretacion: `El funcionamiento domina la estructura con el ${partFunc26.toFixed(2)}% del presupuesto institucional (+0.14 pp), impulsado por la nómina.`,
      semaforo: 'amarillo'
    },
    {
      id: 'ind-6',
      numero: 6,
      nombre: 'Peso de Inversión',
      metodologia: '(Apropiaciones de Inversión / Presupuesto Total) * 100',
      valor2025: `${partInv25.toFixed(2)}%`,
      valor2026: `${partInv26.toFixed(2)}%`,
      variacion: formatPP(ppInv),
      interpretacion: `La inversión representa únicamente el ${partInv26.toFixed(2)}% del presupuesto total (-0.14 pp), evidenciando un estrecho margen para proyectos de capital.`,
      semaforo: 'rojo'
    },
    {
      id: 'ind-7',
      numero: 7,
      nombre: 'Dependencia de Aportes Nacionales (Directos + FSE)',
      metodologia: '((Aportes Nación + Gratuidad FSE) / Presupuesto Total) * 100',
      valor2025: `${depNacTotal2025.toFixed(2)}%`,
      valor2026: `${depNacTotal2026.toFixed(2)}%`,
      variacion: formatPP(depNacTotal2026 - depNacTotal2025),
      interpretacion: `Aumento en la dependencia estatal: el 75.18% del presupuesto universitario proviene de transferencias directas del Presupuesto General de la Nación.`,
      semaforo: 'amarillo'
    },
    {
      id: 'ind-8',
      numero: 8,
      nombre: 'Participación de Recursos Propios (R20 + R21)',
      metodologia: '(Recursos Propios + Devolución IVA / Presupuesto Total) * 100',
      valor2025: `${partPropios2025.toFixed(2)}%`,
      valor2026: `${partPropios2026.toFixed(2)}%`,
      variacion: formatPP(partPropios2026 - partPropios2025),
      interpretacion: `Evolución positiva: los recursos propios aumentaron su participación del 3.64% al 4.47% (+0.83 pp), generando mayor holgura financiera.`,
      semaforo: 'verde'
    },
    {
      id: 'ind-9',
      numero: 9,
      nombre: 'Participación de Posgrados y Extensión (R31 a R35)',
      metodologia: '(Apropiaciones Posgrados + Extensión / Presupuesto Total) * 100',
      valor2025: `${partPosgrados2025.toFixed(2)}%`,
      valor2026: `${partPosgrados2026.toFixed(2)}%`,
      variacion: formatPP(partPosgrados2026 - partPosgrados2025),
      interpretacion: 'Contracción relativa: posgrados y extensión redujeron su participación en 3.30 pp (del 21.19% al 17.89%), principalmente por menores convenios.',
      semaforo: 'amarillo'
    },
    {
      id: 'ind-10',
      numero: 10,
      nombre: 'Índice de Concentración de Recursos (HHI)',
      metodologia: 'Suma de (Participación % del Recurso ^ 2)',
      valor2025: `${hhi2025.toFixed(0)} pts`,
      valor2026: `${hhi2026.toFixed(0)} pts`,
      variacion: `+${(hhi2026 - hhi2025).toFixed(0)} pts`,
      interpretacion: 'El índice HHI supera ampliamente los 2.500 puntos (umbral de alta concentración), ubicándose en 4.406 puntos, producto de la preponderancia del Recurso 10.0 (64.34%).',
      semaforo: 'rojo'
    }
  ];

  const alertas: AlertaPresupuestal[] = [
    {
      id: 'alt-pos-1',
      categoria: 'POSITIVO',
      titulo: 'Incremento Histórico en Aportes de la Nación para Funcionamiento (R10.0)',
      descripcion: 'El Gobierno Nacional asignó $314.781.873.726 COP a la UPTC por concepto de Aportes para Funcionamiento (Art. 86 Ley 30), representando un incremento de $51.242.558.145 COP (+19.44%) frente a 2025.',
      cifraSoporte: '$ 314.781.873.726 COP (2026) vs $ 263.539.315.581 COP (2025)',
      variacion: '+19.44% (+51.242 M)',
      participacion: '64.34% del presupuesto total 2026 (ganancia de +3.42 pp)',
      impactoSostenibilidad: 'Garantiza el respaldo financiero para la nivelación y compromisos de la nómina docente y administrativa de planta y transitorios en la vigencia 2026.',
      recomendacionVAFI: 'Monitorear la expedición oportuna de los PAC mensuales por parte del Ministerio de Hacienda para sincronizar los giros efectivos con la nómina institucional.'
    },
    {
      id: 'alt-pos-2',
      categoria: 'POSITIVO',
      titulo: 'Fortalecimiento y Expansión de los Recursos Propios (R20)',
      descripcion: 'Los recursos propios institucionales experimentaron un sobresaliente crecimiento de $5.566.366.634 COP (+47.44%), alcanzando $17.299.519.752 COP en 2026.',
      cifraSoporte: '$ 17.299.519.752 COP (2026) vs $ 11.733.153.118 COP (2025)',
      variacion: '+47.44% (+5.566 M)',
      participacion: '3.54% del presupuesto total (crecimiento de +0.83 pp en recursos propios)',
      impactoSostenibilidad: 'Aporta liquidez directa no atada a la Nación, mejorando el margen de maniobra para gastos imprevistos y operación de dependencias académicas.',
      recomendacionVAFI: 'Consolidar el plan de recaudo de derechos de grado y certificaciones para asegurar que el aforo proyectado se traduzca en caja efectiva.'
    },
    {
      id: 'alt-pos-3',
      categoria: 'POSITIVO',
      titulo: 'Formalización del Rubro Específico de Gratuidad Nacional (R10.5)',
      descripcion: 'Aparición del rubro presupuestal 1.1.02.06.006.01.10 «Matrículas Pregrado-Política de Gratuidad» con una apropiación inicial directa de $20.708.427.143 COP.',
      cifraSoporte: '$ 20.708.427.143 COP en 2026 (nuevo registro directo de Nación)',
      variacion: '+100.00% (Rubro nuevo en 2026)',
      participacion: '4.23% del presupuesto total 2026',
      impactoSostenibilidad: 'Clarifica la trazabilidad presupuestal de los recursos girados por el Ministerio de Educación en el marco de la gratuidad universal.',
      recomendacionVAFI: 'Establecer seguimiento mensual entre el área de Matrículas y Presupuesto para conciliar las resoluciones del MEN con los valores aforados.'
    },
    {
      id: 'alt-riesgo-1',
      categoria: 'ALERTA',
      titulo: 'Caída Drástica del Fondo de Solidaridad Educativa (R14-Matrículas FSE)',
      descripcion: 'El rubro 1.1.02.06.006.01.03 (Matrículas Pregrado FSE) sufrió una reducción de -$17.472.984.463 COP (-48.25%), pasando de $36.210 M a $18.737 M.',
      cifraSoporte: '$ 18.737.327.483 COP (2026) vs $ 36.210.311.946 COP (2025)',
      variacion: '-48.25% (-17.472 M)',
      participacion: 'Cae de 8.37% en 2025 a 3.83% en 2026 (-4.54 pp)',
      impactoSostenibilidad: 'Aunque compensado en parte por la creación del Recurso 10.5 ($20.708 M), la recomposición exige conciliar los convenios con el MEN y la Universidad.',
      recomendacionVAFI: 'Verificar con el MEN si los recursos antes canalizados por FSE ahora provienen íntegramente de la cuenta de Gratuidad 10.5 y formalizar las actas de liquidación.'
    },
    {
      id: 'alt-riesgo-2',
      categoria: 'ALERTA',
      titulo: 'Estancamiento y Pérdida de Peso Relativo de la Inversión Institucional',
      descripcion: 'Las apropiaciones para Inversión pasaron de $16.221 M a $17.641 M (+8.75%), un crecimiento inferior al del presupuesto total (+13.09%), reduciendo su peso relativo al 3.61%.',
      cifraSoporte: '$ 17.641.620.462 COP (2026) vs $ 16.221.467.876 COP (2025)',
      variacion: '+8.75% (+1.420 M) pero pierde 0.14 pp de participación',
      participacion: '3.61% en 2026 vs 3.75% en 2025',
      impactoSostenibilidad: 'Limita la capacidad de renovación de laboratorios, tecnología e infraestructura física ante el creciente número de estudiantes.',
      recomendacionVAFI: 'Gestionar fuentes alternativas de inversión como Regalías (R15), Cooperación Internacional y adiciones de recursos del balance no comprometidos.'
    },
    {
      id: 'alt-riesgo-3',
      categoria: 'ALERTA',
      titulo: 'Contracción Significativa en el Recurso 18 (Artículo 87 CESU)',
      descripcion: 'El Recurso 18 (CESU Art. 87) presenta una reducción abrupta del -78.47%, disminuyendo de $1.987.309.285 COP a tan solo $427.778.274 COP (-$1.559 M).',
      cifraSoporte: '$ 427.778.274 COP (2026) vs $ 1.987.309.285 COP (2025)',
      variacion: '-78.47% (-1.559 M)',
      participacion: '0.09% del presupuesto 2026',
      impactoSostenibilidad: 'Afecta la disponibilidad de recursos para proyectos específicos asignados mediante indicadores del Consejo Nacional de Educación Superior (CESU).',
      recomendacionVAFI: 'Revisar la distribución de las bolsas CESU vigencia 2026 y ajustar las metas de ejecución de los proyectos apalancados con este fondo.'
    },
    {
      id: 'alt-seg-1',
      categoria: 'SEGUIMIENTO',
      titulo: 'Reclasificación Estructural de Ingresos Propios de Pregrado',
      descripcion: 'Se observa un cambio metodológico en los derechos académicos de pregrado: las Inscripciones disminuyeron de $3.039 M a $316 M (-89.59%), mientras que las Matrículas crecieron de $1.655 M a $5.525 M (+233.81%) y Certificaciones pasaron de $1.493 M a $4.231 M (+183.33%).',
      cifraSoporte: 'Inscripciones: -$2.722 M | Matrículas: +$3.870 M | Certificaciones: +$2.738 M',
      variacion: 'Compensación interna con saldo positivo neto de +$3.886 M',
      participacion: '2.06% del presupuesto 2026',
      impactoSostenibilidad: 'No implica una pérdida real de recaudo sino una reclasificación presupuestal entre conceptos del catálogo para reflejar la realidad del aforo.',
      recomendacionVAFI: 'Asegurar que las tablas de cobro y tesorería apliquen los nuevos códigos contables en la matrícula financiera del primer semestre de 2026.'
    },
    {
      id: 'alt-seg-2',
      categoria: 'SEGUIMIENTO',
      titulo: 'Disminución en Convenios con Derechos Económicos (R33)',
      descripcion: 'El rubro de Convenios con derechos económicos (1.1.02.05.001.08.01) decreció en -$4.143.688.095 COP (-11.96%), situándose en $30.496.415.000 COP.',
      cifraSoporte: '$ 30.496.415.000 COP (2026) vs $ 34.640.103.095 COP (2025)',
      variacion: '-11.96% (-4.143 M)',
      participacion: '6.23% del presupuesto 2026 (pierde 1.77 pp)',
      impactoSostenibilidad: 'Refleja un aforo más prudente y conservador en la suscripción de convenios interadministrativos y de consultoría técnica.',
      recomendacionVAFI: 'Impulsar desde la Dirección de Extensión y las Facultades la formulación de nuevas propuestas para compensar la brecha presupuestal.'
    }
  ];

  return {
    total2025,
    total2026,
    difAbsolutaTotal,
    crecimientoNominal,
    crecimientoReal,
    ipcReferencia,
    totalRows2025: data2025.length,
    totalRows2026: data2026.length,
    componentesGenerales,
    funcionamientoVsInversion: {
      funcionamiento2025: func2025,
      funcionamiento2026: func2026,
      difFuncionamiento: difFunc,
      varFuncionamientoPct: varFuncPct,
      partFuncionamiento2025: partFunc25,
      partFuncionamiento2026: partFunc26,
      ppFuncionamiento: ppFunc,
      inversion2025: inv2025,
      inversion2026: inv2026,
      difInversion: difInv,
      varInversionPct: varInvPct,
      partInversion2025: partInv25,
      partInversion2026: partInv26,
      ppInversion: ppInv
    },
    gruposRecursos,
    recursosComparacion,
    rubrosAgrupados,
    detalleLineas,
    unidadesComparacion,
    componentesGasto,
    top20MayorIncrementoAbsoluto,
    top20MayorCrecimientoPct,
    top20MayorReduccionAbsoluta,
    top20MayorReduccionPct,
    rubrosNuevos,
    rubrosExtintos,
    rubrosEstables,
    indicadores,
    alertas,
    hhi2025,
    hhi2026,
    top10Concentracion2025,
    top10Concentracion2026
  };
}

export function exportComparativoToCSV(rows: ComparisonRow[], filename = 'comparativo_presupuestos_2025_2026_uptc.csv') {
  const exportData = rows.map(r => ({
    'Unidad': r.unidad,
    'Código Rubro': r.codigo,
    'Concepto': r.concepto,
    'Recurso': r.recurso,
    'Código Recurso': r.codigoRecurso,
    'Tipo Gasto': r.tipoGasto,
    'Grupo Recurso': r.grupoRecurso,
    'Presupuesto 2025': r.valor2025,
    'Presupuesto 2026': r.valor2026,
    'Variación Absoluta': r.difAbsoluta,
    'Variación %': r.difPorcentual,
    'Part. 2025 %': r.part2025,
    'Part. 2026 %': r.part2026,
    'Cambio pp': r.cambioPuntosPct,
    'Estado': r.estado
  }));

  const csv = Papa.unparse(exportData, { delimiter: ';' });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportComparativoToExcel(result: PresupuestoComparativoResult, filename = 'comparativo_presupuestos_2025_2026_uptc.xlsx') {
  const wb = XLSX.utils.book_new();

  const wsGeneralData = [
    ['UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA - UPTC'],
    ['VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA (VAFI)'],
    ['COMPARATIVO ESTRUCTURAL DE PRESUPUESTOS INICIALES 2025 - 2026'],
    [''],
    ['INDICADOR MACRO', 'VALOR 2025', 'VALOR 2026', 'VARIACIÓN ABSOLUTA', 'VARIACIÓN %'],
    ['Presupuesto Inicial Total', result.total2025, result.total2026, result.difAbsolutaTotal, result.crecimientoNominal / 100],
    ['Crecimiento Nominal', '', '', '', result.crecimientoNominal / 100],
    ['Inflación IPC Referencia', '', '', '', result.ipcReferencia],
    ['Crecimiento Real (Deflactado)', '', '', '', result.crecimientoReal / 100],
    ['Apropiaciones Funcionamiento', result.funcionamientoVsInversion.funcionamiento2025, result.funcionamientoVsInversion.funcionamiento2026, result.funcionamientoVsInversion.difFuncionamiento, result.funcionamientoVsInversion.varFuncionamientoPct / 100],
    ['Apropiaciones Inversión', result.funcionamientoVsInversion.inversion2025, result.funcionamientoVsInversion.inversion2026, result.funcionamientoVsInversion.difInversion, result.funcionamientoVsInversion.varInversionPct / 100],
    ['Concentración Top 10 Rubros', result.top10Concentracion2025 / 100, result.top10Concentracion2026 / 100, '', (result.top10Concentracion2026 - result.top10Concentracion2025) / 100],
    ['Índice HHI Concentración Fuentes', result.hhi2025, result.hhi2026, result.hhi2026 - result.hhi2025, '']
  ];
  const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
  XLSX.utils.book_append_sheet(wb, wsGeneral, 'Resumen General');

  const wsRecursosData = result.recursosComparacion.map(r => ({
    'Código': r.codigoRecurso,
    'Recurso': r.recurso,
    'Grupo': r.grupoRecurso,
    'Tipo Gasto': r.tipoGastoPredominante,
    'Presupuesto 2025': r.valor2025,
    'Presupuesto 2026': r.valor2026,
    'Variación Absoluta': r.difAbsoluta,
    'Variación %': r.difPorcentual / 100,
    'Part. 2025': r.part2025 / 100,
    'Part. 2026': r.part2026 / 100,
    'Cambio pp': r.cambioPuntosPct / 100,
    'Volatilidad': r.volatilidad,
    'Destinación Estratégica': r.destinacionEstrategica
  }));
  const wsRecursos = XLSX.utils.json_to_sheet(wsRecursosData);
  XLSX.utils.book_append_sheet(wb, wsRecursos, 'Recursos');

  const wsRubrosData = result.rubrosAgrupados.map(r => ({
    'Código Concepto': r.codigo,
    'Concepto / Denominación': r.concepto,
    'Tipo Gasto': r.tipoGasto,
    'Presupuesto 2025': r.valor2025,
    'Presupuesto 2026': r.valor2026,
    'Variación Absoluta': r.difAbsoluta,
    'Variación %': r.difPorcentual / 100,
    'Part. 2025': r.part2025 / 100,
    'Part. 2026': r.part2026 / 100,
    'Cambio pp': r.cambioPuntosPct / 100,
    'Estado': r.estado,
    'Recursos Financiadores': r.recursosPrincipales.join(', ')
  }));
  const wsRubros = XLSX.utils.json_to_sheet(wsRubrosData);
  XLSX.utils.book_append_sheet(wb, wsRubros, 'Rubros Agrupados');

  const wsDetalleData = result.detalleLineas.map(r => ({
    'Unidad': r.unidad,
    'Código': r.codigo,
    'Concepto': r.concepto,
    'Recurso': r.recurso,
    'Tipo': r.tipoGasto,
    'Grupo': r.grupoRecurso,
    'Presupuesto 2025': r.valor2025,
    'Presupuesto 2026': r.valor2026,
    'Variación Absoluta': r.difAbsoluta,
    'Variación %': r.difPorcentual / 100,
    'Part. 2025': r.part2025 / 100,
    'Part. 2026': r.part2026 / 100,
    'Estado': r.estado
  }));
  const wsDetalle = XLSX.utils.json_to_sheet(wsDetalleData);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Completo');

  const wsIndicadoresData = result.indicadores.map(i => ({
    'N°': i.numero,
    'Indicador': i.nombre,
    'Metodología / Fórmula': i.metodologia,
    'Valor 2025': i.valor2025,
    'Valor 2026': i.valor2026,
    'Variación': i.variacion,
    'Semáforo': i.semaforo.toUpperCase(),
    'Interpretación Financiera': i.interpretacion
  }));
  const wsIndicadores = XLSX.utils.json_to_sheet(wsIndicadoresData);
  XLSX.utils.book_append_sheet(wb, wsIndicadores, 'Indicadores Financieros');

  XLSX.writeFile(wb, filename);
}

export function generateExecutiveReportMarkdown(result: PresupuestoComparativoResult): string {
  return `# UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA – UPTC
## VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA (VAFI)
### INFORME EJECUTIVO: COMPARATIVO ESTRUCTURAL DE LOS PRESUPUESTOS INICIALES 2025–2026

**Fecha de Generación:** Noviembre 2026  
**Entidad:** Universidad Pedagógica y Tecnológica de Colombia  
**Vigencias Evaluadas:** 2025 (Inicial Oficial) vs 2026 (Inicial Aprobado)  
**Fuente de Datos:** CSV Oficial Presupuesto Inicial 2025 (449 registros) y Presupuesto Inicial 2026 (204 registros)  

---

### 1. OBJETIVO DEL ANÁLISIS
Presentar a la Dirección Universitaria, Rectoría y Consejo Superior el análisis comparativo estructural de los presupuestos iniciales de las vigencias 2025 y 2026, examinando la evolución de las fuentes de financiación, los rubros de mayor impacto, la composición del gasto y las implicaciones para la sostenibilidad financiera institucional.

---

### 2. FUENTES DE INFORMACIÓN Y METODOLOGÍA
El análisis se fundamenta en la integración y homologación de dos archivos oficiales sin alteración de cifras originales:
- **Presupuesto Inicial 2025:** Total validado de **$ 432.628.979.793,00 COP**.
- **Presupuesto Inicial 2026:** Total validado de **$ 489.266.925.925,00 COP**.
- **Tasa de Inflación (IPC) de Referencia:** ${(result.ipcReferencia * 100).toFixed(2)}% anual para el cálculo del crecimiento real descontado.
- **Metodología de Homologación:** Mapeo relacional de códigos presupuestales normalizados, clasificación institucional de recursos (Aportes Nación, Propios, Extensión/Posgrados, Estampillas) y desglose de apropiaciones para Funcionamiento e Inversión.

---

### 3. COMPARACIÓN GENERAL DE LOS PRESUPUESTOS
| Componente Presupuestal | Inicial 2025 (COP) | Inicial 2026 (COP) | Variación Absoluta (COP) | Crecimiento % | Part. 2025 | Part. 2026 |
|---|---:|---:|---:|---:|---:|---:|
| **Presupuesto Inicial Total** | **$ 432.628.979.793,00** | **$ 489.266.925.925,00** | **+$ 56.637.946.132,00** | **+13,09%** | **100,00%** | **100,00%** |
| 1.1 Ingresos Corrientes | $ 430.957.885.160,00 | $ 487.113.453.890,00 | +$ 56.155.568.730,00 | +13,03% | 99,61% | 99,56% |
| 1.2 Recursos de Capital | $ 1.671.094.633,00 | $ 2.153.472.035,00 | +$ 482.377.402,00 | +28,87% | 0,39% | 0,44% |
| **Apropiaciones Funcionamiento** | **$ 416.407.511.917,00** | **$ 471.625.305.463,00** | **+$ 55.217.793.546,00** | **+13,26%** | **96,25%** | **96,39%** |
| **Apropiaciones Inversión** | **$ 16.221.467.876,00** | **$ 17.641.620.462,00** | **+$ 1.420.152.586,00** | **+8,75%** | **3,75%** | **3,61%** |

- **Crecimiento Nominal:** **+13,09%** (+$ 56.637,95 M).
- **Crecimiento Real Deflactado:** **+${result.crecimientoReal.toFixed(2)}%** en términos reales descontando una inflación del ${(result.ipcReferencia * 100).toFixed(2)}%.

---

### 4. ANÁLISIS ESTRATÉGICO POR RECURSOS (FUENTES DE FINANCIACIÓN)
1. **Aportes de la Nación - Funcionamiento (R10.0):** Pasó de $263.539 M a $314.781 M (+19,44%, +$51.242 M), aumentando su peso del 60,92% al 64,34% del presupuesto total. Es el motor principal del crecimiento.
2. **Recomposición de la Gratuidad (R14 vs R10.5):** El Fondo FSE (R14) disminuyó de $36.210 M a $18.737 M (-48,25%), compensado ampliamente por la aparición del Recurso 10.5 (Política de Gratuidad Nación) con $20.708 M. El neto consolidado de gratuidad aumentó en +$3.235 M (+8,94%).
3. **Recursos Propios (R20):** Crecimiento notable del +47,44% (+$5.566 M), alcanzando $17.299 M, fortaleciendo la autonomía institucional.
4. **Posgrados y Extensión (R31 a R35):** Presentó una contracción neta del -4,55% (-$4.174 M), cerrando en $87.508 M, afectada por la caída en Convenios con derechos (-$4.143 M). Posgrados se mantuvo estable en $45.472 M (+0,08%).
5. **Estampillas (R40 y R12):** Estampilla UPTC creció a $4.206 M (+4,22%) y Estampilla Otras Universidades a $5.706 M (+19,33%).

---

### 5. INDICADORES FINANCIEROS Y RIGIDECES
- **Concentración Top 10 Rubros:** El 93,60% del presupuesto está absorbido por tan solo 10 conceptos presupuestales (frente al 94,43% en 2025).
- **Peso de Funcionamiento:** 96,39% del presupuesto total está comprometido en operación y nómina, dejando únicamente un 3,61% para inversión física y tecnológica.
- **Índice Herfindahl-Hirschman (HHI):** Se incrementó de ${result.hhi2025.toFixed(0)} a ${result.hhi2026.toFixed(0)} puntos, reflejando una estructura financiera aún más dependiente del Recurso 10.0 del Gobierno Nacional.
- **Dependencia de la Nación:** 75,18% de las rentas universitarias provienen de transferencias directas del Presupuesto General de la Nación (PGN).

---

### 6. ALERTAS Y CONCLUSIONES DIRECTIVAS (VAFI)
- **Sostenibilidad Salarial:** El fuerte incremento en el Recurso 10.0 cubre la expansión de la nómina docente y administrativa (2.1.1), pero compromete la flexibilidad futura ante incrementos salariales decretados por el Gobierno.
- **Vigilancia de Gratuidad:** Se debe formalizar con el MEN el giro oportuno del nuevo rubro 10.5 para no descompensar la tesorería de pregrado.
- **Dinamización de Convenios:** La VAFI y Extensión deben incentivar nuevos convenios interinstitucionales con entidades públicas y privadas para recuperar el ritmo de ingresos por extensión.
`;
}
