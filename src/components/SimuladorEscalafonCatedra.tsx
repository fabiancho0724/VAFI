import React, { useState, useMemo } from 'react';
import {
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  Building2,
  UserCheck,
  ChevronRight,
  Layers,
  Sparkles,
  FileSpreadsheet,
  ArrowUpRight,
  PieChart as PieChartIcon,
  HelpCircle,
  FileText,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DEFAULT_DOCENTES_CATEDRA, DocenteCatedraRaw } from '../data/docentesCatedraDefault';

// -----------------------------------------------------------------------------
// CONSTANTES Y CONFIGURACIÓN DEL ACUERDO 015 DE 2009 (ARTÍCULO 1)
// -----------------------------------------------------------------------------
const DEFAULT_HORAS_PROMEDIO = 64; // 4 horas/semana × 16 semanas

export const ESCALA_ARTICULO_1 = [
  {
    categoria: 'Profesor Auxiliar',
    puntos: 2.50,
    equivalencia: 'Profesional universitario sin posgrado o con especialización en trámite',
    tarifa2024: 52238,
    tarifa2025: 55895,
    tarifa2026: 59810,
  },
  {
    categoria: 'Profesor Asistente',
    puntos: 2.75,
    equivalencia: 'Especialista graduado o Magíster con experiencia docente calificada',
    tarifa2024: 57461,
    tarifa2025: 61485,
    tarifa2026: 65791,
  },
  {
    categoria: 'Profesor Asociado',
    puntos: 3.00,
    equivalencia: 'Magíster con amplia trayectoria o Doctor (PhD) en consolidación',
    tarifa2024: 62685,
    tarifa2025: 67074,
    tarifa2026: 71772,
  },
  {
    categoria: 'Profesor Titular',
    puntos: 3.50,
    equivalencia: 'Doctor (PhD) con alta producción académica y reconocimiento en escalafón',
    tarifa2024: 73133,
    tarifa2025: 78253,
    tarifa2026: 83734,
  },
];

const TARIFAS_POR_VIGENCIA: Record<string, Record<string, number>> = {
  '2026': {
    'Profesor Auxiliar': 59810,
    'Profesor Asistente': 65791,
    'Profesor Asociado': 71772,
    'Profesor Titular': 83734,
    'Pendiente de Clasificación': 0,
  },
  '2025': {
    'Profesor Auxiliar': 55895,
    'Profesor Asistente': 61485,
    'Profesor Asociado': 67074,
    'Profesor Titular': 78253,
    'Pendiente de Clasificación': 0,
  },
  '2024': {
    'Profesor Auxiliar': 52238,
    'Profesor Asistente': 57461,
    'Profesor Asociado': 62685,
    'Profesor Titular': 73133,
    'Pendiente de Clasificación': 0,
  },
};

const DEFAULT_FACTORES_PUNTOS: Record<string, number> = {
  'Profesor Auxiliar': 2.50,
  'Profesor Asistente': 2.75,
  'Profesor Asociado': 3.00,
  'Profesor Titular': 3.50,
  'Pendiente de Clasificación': 0.0,
};

const ESCENARIO_1_RULES: Record<string, string> = {
  'PROFESIONAL': 'Profesor Auxiliar',
  'LICENCIATURA': 'Profesor Auxiliar',
  'ESPECIALIZACION': 'Profesor Auxiliar',
  'MAESTRIA': 'Profesor Asistente',
  'DOCTORADO': 'Profesor Asistente',
  'PENDIENTE': 'Pendiente de Clasificación',
};

const ESCENARIO_2_RULES: Record<string, string> = {
  'PROFESIONAL': 'Profesor Auxiliar',
  'LICENCIATURA': 'Profesor Auxiliar',
  'ESPECIALIZACION': 'Profesor Asistente',
  'MAESTRIA': 'Profesor Asociado',
  'DOCTORADO': 'Profesor Titular',
  'PENDIENTE': 'Pendiente de Clasificación',
};

const PALETTE = {
  primary: '#ffcc29',
  primaryDark: '#d4a106',
  blue: '#38bdf8',
  emerald: '#4ade80',
  rose: '#fb7185',
  purple: '#c084fc',
  slate: '#94a3b8',
};

// -----------------------------------------------------------------------------
// UTILIDADES DE FORMATO Y LIMPIEZA
// -----------------------------------------------------------------------------
function formatCOP(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '$ 0';
  return `$ ${Math.round(val).toLocaleString('es-CO')}`;
}

function formatMillones(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '$ 0 M';
  const enM = val / 1e6;
  return `$ ${enM.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// -----------------------------------------------------------------------------
// NORMALIZADOR ACADÉMICO EN CLIENTE
// -----------------------------------------------------------------------------
function classifyDegree(estudioRaw: any): { nivel: string; estado: 'CONFIRMADO' | 'DUDOSO/PENDIENTE'; obs: string } {
  if (!estudioRaw) {
    return { nivel: 'PENDIENTE', estado: 'DUDOSO/PENDIENTE', obs: 'Sin información de estudio registrada' };
  }
  const clean = stripAccents(String(estudioRaw).trim().toUpperCase());
  if (!clean || ['NAN', 'NONE', 'NULL', 'NO APLICA', 'N/A', 'SIN DATO'].includes(clean)) {
    return { nivel: 'PENDIENTE', estado: 'DUDOSO/PENDIENTE', obs: 'Registro vacío o no reportado' };
  }

  // Detección de incompletos
  if (/(CANDIDAT[OA]|ESTUDIANTE|EN CURSO|CURSANDO|INCOMPLET[OA]|PENDIENTE|APLAZAD[OA]|PROCESO)/.test(clean)) {
    return { nivel: 'PENDIENTE', estado: 'DUDOSO/PENDIENTE', obs: 'Estudio no culminado o en proceso' };
  }

  if (/(DOCTORAD[OA]|DOCTOR|PH\.?D|D\.?SC|POSTDOCTOR)/.test(clean)) {
    return { nivel: 'DOCTORADO', estado: 'CONFIRMADO', obs: 'Doctorado confirmado' };
  }
  if (/(MAGISTER|MAESTRI[A]?|MASTER|M\.?SC|MAG)/.test(clean)) {
    return { nivel: 'MAESTRIA', estado: 'CONFIRMADO', obs: 'Maestría confirmada' };
  }
  if (/(ESPECIALIST[A]?|ESPECIALIZACI[O]?N|ESPECIALIDAD|ESP\.)/.test(clean)) {
    return { nivel: 'ESPECIALIZACION', estado: 'CONFIRMADO', obs: 'Especialización confirmada' };
  }
  if (/(LICENCIAD[OA]|LICENCIATURA|LIC\.)/.test(clean)) {
    return { nivel: 'LICENCIATURA', estado: 'CONFIRMADO', obs: 'Licenciatura confirmada' };
  }
  if (/(PROFESIONAL|PREGRADO|INGENIER[OA]|ABOGAD[OA]|ECONOMIST|ADMINISTRAD|MEDIC[OA]|BIOLOG[OA]|QUIMIC[OA]|PSICOLOG[OA]|ARQUITECT|CONTAD|FILOSOF|SOCIOLOG)/.test(clean)) {
    return { nivel: 'PROFESIONAL', estado: 'CONFIRMADO', obs: 'Título profesional universitario confirmado' };
  }

  return { nivel: 'PENDIENTE', estado: 'DUDOSO/PENDIENTE', obs: `Título no reconocido ('${clean}')` };
}

function parseSalary(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/[^\d.,\-]/g, '').trim();
  if (!s) return 0;
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(s.replace(',', '.')) || 0;
    }
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  return parseFloat(s) || 0;
}

// -----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------------------------
export function SimuladorEscalafonCatedra() {
  // Estados de datos
  const [dataRaw, setDataRaw] = useState<DocenteCatedraRaw[]>(DEFAULT_DOCENTES_CATEDRA);
  const [nombreArchivo, setNombreArchivo] = useState<string>('Base Institucional UPTC (Corte 30 de Noviembre)');

  // Parámetros de simulación
  const [horasPromedio, setHorasPromedio] = useState<number>(DEFAULT_HORAS_PROMEDIO);
  const [vigencia, setVigencia] = useState<'2026' | '2025' | '2024'>('2026');
  const [tarifasCustom, setTarifasCustom] = useState<Record<string, number>>(TARIFAS_POR_VIGENCIA['2026']);
  const [modoAnalisis, setModoAnalisis] = useState<'A' | 'B' | 'C'>('A');

  // Tarifas activas de referencia
  const tarifasActivas = useMemo(() => {
    return TARIFAS_POR_VIGENCIA[vigencia] || TARIFAS_POR_VIGENCIA['2026'];
  }, [vigencia]);

  // Reglas del escenario personalizado (Escenario 3)
  const [customRules, setCustomRules] = useState<Record<string, string>>({
    DOCTORADO: 'Profesor Titular',
    MAESTRIA: 'Profesor Asociado',
    ESPECIALIZACION: 'Profesor Asistente',
    LICENCIATURA: 'Profesor Auxiliar',
    PROFESIONAL: 'Profesor Auxiliar',
    PENDIENTE: 'Pendiente de Clasificación',
  });

  // Pestañas internas
  const [subTab, setSubTab] = useState<'comparativo' | 'facultades' | 'programas' | 'docentes' | 'parametros' | 'inconsistencias'>('comparativo');

  // Filtros del buscador
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterFacultad, setFilterFacultad] = useState<string>('TODAS');
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');
  const [paginaDocentes, setPaginaDocentes] = useState<number>(1);
  const itemsPerPage = 12;

  // ---------------------------------------------------------------------------
  // MOTOR DE CÁLCULO EN TIEMPO REAL (TARIFA_HORARIA × HORAS_PROMEDIO)
  // ---------------------------------------------------------------------------
  const processedData = useMemo(() => {
    return dataRaw.map((row, idx) => {
      const sueldo = parseSalary(row.SUELDO);
      const { nivel, estado, obs } = classifyDegree(row.ESTUDIO);

      // Nombre completo si no viene unificado
      let nombreCompleto = '';
      if (row.APELLIDO_PROFESOR || row.NOMBRE_PROFESOR) {
        nombreCompleto = `${row.APELLIDO_PROFESOR || ''} ${row.NOMBRE_PROFESOR || ''}`.trim();
      }

      // Escenario 1 (Conservador)
      const catEsc1 = ESCENARIO_1_RULES[nivel] || 'Pendiente de Clasificación';
      const factorEsc1 = DEFAULT_FACTORES_PUNTOS[catEsc1] || 0.0;
      const tarifaEsc1 = tarifasActivas[catEsc1] || 0;
      const costoEsc1 = (catEsc1 !== 'Pendiente de Clasificación')
        ? tarifaEsc1 * horasPromedio
        : 0;

      // Escenario 2 (Progresivo - Asimilación Parágrafo 1 Acuerdo 015)
      const catEsc2 = ESCENARIO_2_RULES[nivel] || 'Pendiente de Clasificación';
      const factorEsc2 = DEFAULT_FACTORES_PUNTOS[catEsc2] || 0.0;
      const tarifaEsc2 = tarifasActivas[catEsc2] || 0;
      const costoEsc2 = (catEsc2 !== 'Pendiente de Clasificación')
        ? tarifaEsc2 * horasPromedio
        : 0;

      // Escenario 3 (Personalizado)
      const catEscCustom = customRules[nivel] || 'Pendiente de Clasificación';
      const factorEscCustom = DEFAULT_FACTORES_PUNTOS[catEscCustom] || 0.0;
      const tarifaEscCustom = tarifasCustom[catEscCustom] ?? tarifasActivas[catEscCustom] ?? 0;
      const costoEscCustom = (catEscCustom !== 'Pendiente de Clasificación')
        ? tarifaEscCustom * horasPromedio
        : 0;

      // Diferencias
      const difAbs2_1 = costoEsc2 - costoEsc1;
      const difPct2_1 = costoEsc1 > 0 ? (difAbs2_1 / costoEsc1) * 100 : 0;

      const difAbsCust_1 = costoEscCustom - costoEsc1;
      const difPctCust_1 = costoEsc1 > 0 ? (difAbsCust_1 / costoEsc1) * 100 : 0;

      const esComputable = nivel !== 'PENDIENTE';

      return {
        idFila: idx + 1,
        nroIden: String(row.NRO_IDEN_PROF || '').trim(),
        nombreCompleto: nombreCompleto || 'SIN NOMBRE REPORTADO',
        facultad: String(row.NOMBRE_FACULTAD || 'SIN FACULTAD').trim(),
        escuelaCod: String(row.NRO_PROGRAMA || '').trim(),
        programa: String(row.NOMBRE_PROGRAMA || 'SIN PROGRAMA').trim(),
        sede: String(row.NOMBRE_SEDE || 'TUNJA').trim(),
        jornada: String(row.JORNADA || 'Diurna').trim(),
        tipoPrograma: String(row.TIPO_PROGRAMA || 'PREGRADO').trim(),
        estudioOriginal: String(row.ESTUDIO || 'NO REGISTRA').trim(),
        nivelNormalizado: nivel,
        estadoClasificacion: estado,
        observacionClasificacion: obs,
        sueldo,
        catEsc1,
        factorEsc1,
        tarifaEsc1,
        costoEsc1,
        catEsc2,
        factorEsc2,
        tarifaEsc2,
        costoEsc2,
        catEscCustom,
        factorEscCustom,
        tarifaEscCustom,
        costoEscCustom,
        difAbs2_1,
        difPct2_1,
        difAbsCust_1,
        difPctCust_1,
        esComputable,
      };
    });
  }, [dataRaw, horasPromedio, tarifasActivas, tarifasCustom, customRules]);

  // ---------------------------------------------------------------------------
  // CONSOLIDACIONES SEGÚN UNIDAD DE ANÁLISIS (Modos A, B, C)
  // ---------------------------------------------------------------------------
  const consolidatedData = useMemo(() => {
    if (modoAnalisis === 'A') {
      return processedData;
    }

    if (modoAnalisis === 'B') {
      // Agrupado por docente único (Cédula)
      const groups: Record<string, typeof processedData[0]> = {};
      processedData.forEach((row) => {
        const key = row.nroIden || row.nombreCompleto;
        if (!groups[key]) {
          groups[key] = { ...row, programasAsignados: [row.programa] } as any;
        } else {
          groups[key].sueldo += row.sueldo;
          groups[key].costoEsc1 += row.costoEsc1;
          groups[key].costoEsc2 += row.costoEsc2;
          groups[key].costoEscCustom += row.costoEscCustom;
          groups[key].difAbs2_1 += row.difAbs2_1;
          if (row.programa && !(groups[key] as any).programasAsignados.includes(row.programa)) {
            (groups[key] as any).programasAsignados.push(row.programa);
          }
        }
      });

      return Object.values(groups).map((g) => ({
        ...g,
        difPct2_1: g.costoEsc1 > 0 ? (g.difAbs2_1 / g.costoEsc1) * 100 : 0,
        programa: (g as any).programasAsignados.join(', '),
      }));
    }

    if (modoAnalisis === 'C') {
      // Agrupado por docente y programa
      const groups: Record<string, typeof processedData[0]> = {};
      processedData.forEach((row) => {
        const key = `${row.nroIden || row.nombreCompleto}__${row.programa}`;
        if (!groups[key]) {
          groups[key] = { ...row };
        } else {
          groups[key].sueldo += row.sueldo;
          groups[key].costoEsc1 += row.costoEsc1;
          groups[key].costoEsc2 += row.costoEsc2;
          groups[key].costoEscCustom += row.costoEscCustom;
          groups[key].difAbs2_1 += row.difAbs2_1;
        }
      });
      return Object.values(groups).map((g) => ({
        ...g,
        difPct2_1: g.costoEsc1 > 0 ? (g.difAbs2_1 / g.costoEsc1) * 100 : 0,
      }));
    }

    return processedData;
  }, [processedData, modoAnalisis]);

  // ---------------------------------------------------------------------------
  // INDICADORES EJECUTIVOS (KPIS)
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    let totalCosto1 = 0;
    let totalCosto2 = 0;
    let totalCostoCustom = 0;
    let totalSueldo = 0;
    let computables = 0;
    const docentesSet = new Set<string>();

    processedData.forEach((d) => {
      totalCosto1 += d.costoEsc1;
      totalCosto2 += d.costoEsc2;
      totalCostoCustom += d.costoEscCustom;
      totalSueldo += d.sueldo;
      if (d.esComputable) computables++;
      if (d.nroIden && d.nroIden !== '0') docentesSet.add(d.nroIden);
    });

    const difAbs2_1 = totalCosto2 - totalCosto1;
    const difPct2_1 = totalCosto1 > 0 ? (difAbs2_1 / totalCosto1) * 100 : 0;

    const difAbsCust_1 = totalCostoCustom - totalCosto1;
    const difPctCust_1 = totalCosto1 > 0 ? (difAbsCust_1 / totalCosto1) * 100 : 0;

    const totalDocentes = docentesSet.size > 0 ? docentesSet.size : processedData.length;
    const promedioDocente1 = totalDocentes > 0 ? totalCosto1 / totalDocentes : 0;
    const promedioDocente2 = totalDocentes > 0 ? totalCosto2 / totalDocentes : 0;

    return {
      totalCosto1,
      totalCosto2,
      totalCostoCustom,
      totalSueldo,
      difAbs2_1,
      difPct2_1,
      difAbsCust_1,
      difPctCust_1,
      totalRegistros: processedData.length,
      totalDocentes,
      computables,
      excluidos: processedData.length - computables,
      promedioDocente1,
      promedioDocente2,
    };
  }, [processedData]);

  // ---------------------------------------------------------------------------
  // DESAGREGACIÓN POR FACULTAD
  // ---------------------------------------------------------------------------
  const porFacultad = useMemo(() => {
    const map: Record<string, { facultad: string; registros: number; docentesSet: Set<string>; sueldo: number; costo1: number; costo2: number; costoCustom: number }> = {};
    processedData.forEach((d) => {
      const f = d.facultad || 'SIN FACULTAD';
      if (!map[f]) {
        map[f] = { facultad: f, registros: 0, docentesSet: new Set(), sueldo: 0, costo1: 0, costo2: 0, costoCustom: 0 };
      }
      map[f].registros++;
      if (d.nroIden) map[f].docentesSet.add(d.nroIden);
      map[f].sueldo += d.sueldo;
      map[f].costo1 += d.costoEsc1;
      map[f].costo2 += d.costoEsc2;
      map[f].costoCustom += d.costoEscCustom;
    });

    return Object.values(map).map((item) => {
      const difAbs = item.costo2 - item.costo1;
      const difPct = item.costo1 > 0 ? (difAbs / item.costo1) * 100 : 0;
      const partPct = kpis.totalCosto2 > 0 ? (item.costo2 / kpis.totalCosto2) * 100 : 0;
      return {
        facultad: item.facultad,
        registros: item.registros,
        docentesUnicos: item.docentesSet.size || item.registros,
        sueldoBase: item.sueldo,
        costo1: item.costo1,
        costo2: item.costo2,
        costoCustom: item.costoCustom,
        difAbs,
        difPct,
        partPct,
      };
    }).sort((a, b) => b.difAbs - a.difAbs);
  }, [processedData, kpis.totalCosto2]);

  // ---------------------------------------------------------------------------
  // DESAGREGACIÓN POR PROGRAMA (TOP 10)
  // ---------------------------------------------------------------------------
  const porPrograma = useMemo(() => {
    const map: Record<string, { programa: string; facultad: string; registros: number; costo1: number; costo2: number; costoCustom: number }> = {};
    processedData.forEach((d) => {
      const p = d.programa || 'SIN PROGRAMA';
      if (!map[p]) {
        map[p] = { programa: p, facultad: d.facultad, registros: 0, costo1: 0, costo2: 0, costoCustom: 0 };
      }
      map[p].registros++;
      map[p].costo1 += d.costoEsc1;
      map[p].costo2 += d.costoEsc2;
      map[p].costoCustom += d.costoEscCustom;
    });

    return Object.values(map).map((item) => {
      const difAbs = item.costo2 - item.costo1;
      const difPct = item.costo1 > 0 ? (difAbs / item.costo1) * 100 : 0;
      return {
        programa: item.programa,
        facultad: item.facultad,
        registros: item.registros,
        costo1: item.costo1,
        costo2: item.costo2,
        costoCustom: item.costoCustom,
        difAbs,
        difPct,
      };
    }).sort((a, b) => b.difAbs - a.difAbs);
  }, [processedData]);

  // ---------------------------------------------------------------------------
  // DISTRIBUCIÓN POR FORMACIÓN ACADÉMICA
  // ---------------------------------------------------------------------------
  const distribucionFormacion = useMemo(() => {
    const counts: Record<string, number> = {
      DOCTORADO: 0,
      MAESTRIA: 0,
      ESPECIALIZACION: 0,
      LICENCIATURA: 0,
      PROFESIONAL: 0,
      PENDIENTE: 0,
    };
    processedData.forEach((d) => {
      counts[d.nivelNormalizado] = (counts[d.nivelNormalizado] || 0) + 1;
    });

    const colors: Record<string, string> = {
      DOCTORADO: '#0284c7',
      MAESTRIA: '#38bdf8',
      ESPECIALIZACION: '#fbbf24',
      LICENCIATURA: '#34d399',
      PROFESIONAL: '#a3e635',
      PENDIENTE: '#ef4444',
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#94a3b8',
      pct: processedData.length > 0 ? (value / processedData.length) * 100 : 0,
    }));
  }, [processedData]);

  // ---------------------------------------------------------------------------
  // MATRIZ DE INCONSISTENCIAS / AUDITORÍA
  // ---------------------------------------------------------------------------
  const inconsistencias = useMemo(() => {
    const list: Array<{ fila: number; docente: string; campo: string; valor: string; observacion: string; gravedad: 'ALTA' | 'MEDIA' }> = [];
    processedData.forEach((d) => {
      if (d.sueldo <= 0) {
        list.push({
          fila: d.idFila,
          docente: `${d.nombreCompleto} (${d.nroIden})`,
          campo: 'SUELDO',
          valor: `$ ${d.sueldo}`,
          observacion: 'Sueldo registrado en cero o nulo. Excluido del costo simulado.',
          gravedad: 'ALTA',
        });
      }
      if (d.nivelNormalizado === 'PENDIENTE') {
        list.push({
          fila: d.idFila,
          docente: `${d.nombreCompleto} (${d.nroIden})`,
          campo: 'ESTUDIO',
          valor: d.estudioOriginal,
          observacion: d.observacionClasificacion,
          gravedad: 'MEDIA',
        });
      }
      if (!d.nroIden || d.nroIden === '0') {
        list.push({
          fila: d.idFila,
          docente: d.nombreCompleto,
          campo: 'NRO_IDEN_PROF',
          valor: 'VACÍO',
          observacion: 'Falta número de documento para agregación unívoca.',
          gravedad: 'MEDIA',
        });
      }
    });
    return list;
  }, [processedData]);

  // ---------------------------------------------------------------------------
  // FILTRADO DE DOCENTES PARA LA TABLA
  // ---------------------------------------------------------------------------
  const facultadesList = useMemo(() => {
    return ['TODAS', ...Array.from(new Set(processedData.map((d) => d.facultad).filter(Boolean))).sort()];
  }, [processedData]);

  const filteredDocentes = useMemo(() => {
    return consolidatedData.filter((d) => {
      const matchesSearch =
        searchTerm === '' ||
        d.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.nroIden.includes(searchTerm) ||
        d.programa.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFac = filterFacultad === 'TODAS' || d.facultad === filterFacultad;
      const matchesNivel = filterNivel === 'TODOS' || d.nivelNormalizado === filterNivel;

      return matchesSearch && matchesFac && matchesNivel;
    });
  }, [consolidatedData, searchTerm, filterFacultad, filterNivel]);

  const totalPaginas = Math.ceil(filteredDocentes.length / itemsPerPage) || 1;
  const paginatedDocentes = useMemo(() => {
    const start = (paginaDocentes - 1) * itemsPerPage;
    return filteredDocentes.slice(start, start + itemsPerPage);
  }, [filteredDocentes, paginaDocentes]);

  // ---------------------------------------------------------------------------
  // EXPORTACIÓN A CSV
  // ---------------------------------------------------------------------------
  const handleExportCSVCompleto = () => {
    const headers = [
      'ID_FILA', 'CEDULA', 'NOMBRE_COMPLETO', 'FACULTAD', 'PROGRAMA', 'SEDE', 'JORNADA',
      'ESTUDIO_ORIGINAL', 'NIVEL_NORMALIZADO', 'SUELDO_MENSUAL',
      'CAT_ESCENARIO_1', 'FACTOR_ESC_1', 'COSTO_ESCENARIO_1',
      'CAT_ESCENARIO_2', 'FACTOR_ESC_2', 'COSTO_ESCENARIO_2',
      'CAT_ESCENARIO_CUSTOM', 'FACTOR_ESC_CUSTOM', 'COSTO_ESCENARIO_CUSTOM',
      'DIFERENCIA_ABS_2_1', 'VARIACION_PCT_2_1'
    ];

    const rows = processedData.map((d) => [
      d.idFila,
      `"${d.nroIden}"`,
      `"${d.nombreCompleto}"`,
      `"${d.facultad}"`,
      `"${d.programa}"`,
      `"${d.sede}"`,
      `"${d.jornada}"`,
      `"${d.estudioOriginal}"`,
      `"${d.nivelNormalizado}"`,
      d.sueldo,
      `"${d.catEsc1}"`,
      d.factorEsc1,
      Math.round(d.costoEsc1),
      `"${d.catEsc2}"`,
      d.factorEsc2,
      Math.round(d.costoEsc2),
      `"${d.catEscCustom}"`,
      d.factorEscCustom,
      Math.round(d.costoEscCustom),
      Math.round(d.difAbs2_1),
      d.difPct2_1.toFixed(2),
    ]);

    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `UPTC_Simulacion_Docentes_Catedra_Acuerdo015_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner de Título */}
      <div className="rounded-3xl bg-gradient-to-r from-surface-container via-surface-container-high to-black/90 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-container/20 text-primary-container border border-primary-container/30">
                ⚖️ Acuerdo No. 015 de 2009 (CSU)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                🏛️ Vicerrectoría Administrativa y Financiera (VAFI)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                📊 Modelo Macroeconómico de Escalafón
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Simulador de Asimilación y Categorización Docente de Cátedra
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Cuantificación y comparación del impacto presupuestal de reclasificar la planta docente de cátedra en las categorías del
              escalafón docente (<strong>Auxiliar, Asistente, Asociado y Titular</strong>), conforme al sistema de puntos de la UPTC.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSVCompleto}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-black font-bold text-xs hover:bg-yellow-400 transition-all shadow-lg cursor-pointer"
            >
              <Download size={15} />
              <span>Exportar Simulación (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Control de Parámetros Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-surface-container/80 border border-white/10 backdrop-blur-md">
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
            Horas Promedio Semestre
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={150}
              value={horasPromedio}
              onChange={(e) => setHorasPromedio(parseFloat(e.target.value) || 1)}
              className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-primary-container"
            />
            <span className="text-xs text-primary-container font-bold">h/semestre</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">4 h/sem × 16 semanas = 64 horas</span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
            Vigencia de Tarifas
          </label>
          <select
            value={vigencia}
            onChange={(e) => {
              const v = e.target.value as '2026' | '2025' | '2024';
              setVigencia(v);
              setTarifasCustom(TARIFAS_POR_VIGENCIA[v]);
            }}
            className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-primary-container"
          >
            <option value="2026">Vigencia 2026 (Activa: $59.810 - $83.734)</option>
            <option value="2025">Vigencia 2025 ($55.895 - $78.253)</option>
            <option value="2024">Vigencia 2024 ($52.238 - $73.133)</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Punto D1279: $23.924 COP (2026)</span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
            Unidad de Análisis
          </label>
          <select
            value={modoAnalisis}
            onChange={(e) => setModoAnalisis(e.target.value as any)}
            className="w-full bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
          >
            <option value="A">Modo A: Por Vinculación / Carga (552)</option>
            <option value="B">Modo B: Por Docente Único (Cédula)</option>
            <option value="C">Modo C: Por Docente y Programa</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-0.5 block">542 registros computables</span>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setHorasPromedio(DEFAULT_HORAS_PROMEDIO);
              setVigencia('2026');
              setTarifasCustom(TARIFAS_POR_VIGENCIA['2026']);
              setModoAnalisis('A');
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw size={13} />
            <span>Restablecer (64h - 2026)</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Superiores de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Escenario 1 */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 border-l-4 border-l-slate-400 shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Escenario 1 (Conservador)</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{formatCOP(kpis.totalCosto1)}</div>
          <div className="text-xs text-slate-400 mt-1">Auxiliar (2.50) & Asistente (2.75)</div>
        </div>

        {/* KPI 2: Escenario 2 */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 border-l-4 border-l-blue-400 shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Escenario 2 (Progresivo)</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{formatCOP(kpis.totalCosto2)}</div>
          <div className="text-xs text-rose-400 font-bold mt-1">
            +{formatCOP(kpis.difAbs2_1)} (+{kpis.difPct2_1.toFixed(2)}%)
          </div>
        </div>

        {/* KPI 3: Escenario Custom */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 border-l-4 border-l-emerald-400 shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Escenario 3 (Personalizado)</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{formatCOP(kpis.totalCostoCustom)}</div>
          <div className="text-xs text-emerald-400 font-bold mt-1">
            {kpis.difAbsCust_1 >= 0 ? '+' : ''}{formatCOP(kpis.difAbsCust_1)} ({kpis.difPctCust_1 >= 0 ? '+' : ''}{kpis.difPctCust_1.toFixed(2)}%)
          </div>
        </div>

        {/* KPI 4: Demografía */}
        <div className="p-5 rounded-2xl bg-surface-container/60 border border-white/10 border-l-4 border-l-primary-container shadow-xl backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-container">Planta Docente Evaluada</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{kpis.totalDocentes.toLocaleString('es-CO')} docentes</div>
          <div className="text-xs text-slate-400 mt-1">
            {kpis.totalRegistros.toLocaleString('es-CO')} vinculaciones / {kpis.computables} computables
          </div>
        </div>
      </div>

      {/* Barra de Sub-Pestañas del Simulador */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
        {[
          { id: 'comparativo', label: '1. Comparativo & Gráficos', icon: BarChart3 },
          { id: 'facultades', label: '2. Por Facultad', icon: Building2 },
          { id: 'programas', label: '3. Ranking Programas', icon: Layers },
          { id: 'docentes', label: '4. Detalle Docentes', icon: UserCheck },
          { id: 'parametros', label: '5. Matriz de Equivalencias', icon: Sliders },
          { id: 'inconsistencias', label: `6. Auditoría (${inconsistencias.length})`, icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-primary-container border-b-2 border-primary-container'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================================= */}
      {/* SUBTAB 1: COMPARATIVO Y GRÁFICOS INTERACTIVOS */}
      {/* ======================================================================= */}
      {subTab === 'comparativo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico 1: Comparativo de Costo Total */}
            <div className="lg:col-span-7 rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <BarChart3 className="text-primary-container" size={16} />
                Comparativo del Costo Total Presupuestal por Escenario
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Escenario 1 (Conservador)', costo: kpis.totalCosto1 / 1e6, fill: '#94a3b8' },
                      { name: 'Escenario 2 (Progresivo)', costo: kpis.totalCosto2 / 1e6, fill: '#38bdf8' },
                      { name: 'Escenario 3 (Personalizado)', costo: kpis.totalCostoCustom / 1e6, fill: '#ffcc29' },
                    ]}
                    margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} tickFormatter={(v) => `$ ${v.toLocaleString('es-CO')} M`} />
                    <RechartsTooltip
                      formatter={(val: any) => [`$ ${Number(val).toLocaleString('es-CO')} Millones`, 'Costo Total']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Bar dataKey="costo" radius={[8, 8, 0, 0]}>
                      {[{ fill: '#94a3b8' }, { fill: '#38bdf8' }, { fill: '#ffcc29' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Donut de Formación Académica */}
            <div className="lg:col-span-5 rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <PieChartIcon className="text-primary-container" size={16} />
                Distribución por Nivel de Formación Académica
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribucionFormacion}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {distribucionFormacion.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${val} registros`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val: string) => <span className="text-xs text-slate-300 font-medium">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla Comparativa de Criterios */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-bold text-white mb-4">Matriz Resumen de Escenarios y Parámetros</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">Escenario</th>
                    <th className="p-3">Criterio de Asimilación</th>
                    <th className="p-3 text-right">Costo Total</th>
                    <th className="p-3 text-right">Variación vs Base</th>
                    <th className="p-3 text-right">Costo Promedio / Docente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-3 font-bold text-white">Escenario 1 (Conservador)</td>
                    <td className="p-3 text-slate-300">
                      Profesional, Licenciado, Especialista → Auxiliar (2.50); Magíster, Doctor → Asistente (2.75)
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-white">{formatCOP(kpis.totalCosto1)}</td>
                    <td className="p-3 text-right text-slate-400">Base ($ 0)</td>
                    <td className="p-3 font-mono text-right text-slate-300">{formatCOP(kpis.promedioDocente1)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-400">Escenario 2 (Progresivo)</td>
                    <td className="p-3 text-slate-300">
                      Profesional/Licenciado → Auxiliar (2.50); Especialista → Asistente (2.75); Magíster → Asociado (3.00); Doctor → Titular (3.50)
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-blue-300">{formatCOP(kpis.totalCosto2)}</td>
                    <td className="p-3 font-mono font-bold text-right text-rose-400">
                      +{formatCOP(kpis.difAbs2_1)} (+{kpis.difPct2_1.toFixed(2)}%)
                    </td>
                    <td className="p-3 font-mono text-right text-slate-300">{formatCOP(kpis.promedioDocente2)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-primary-container">Escenario 3 (Personalizado)</td>
                    <td className="p-3 text-slate-300">
                      Ajustado dinámicamente en la pestaña de matriz de equivalencias
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-primary-container">{formatCOP(kpis.totalCostoCustom)}</td>
                    <td className="p-3 font-mono font-bold text-right text-emerald-400">
                      {kpis.difAbsCust_1 >= 0 ? '+' : ''}{formatCOP(kpis.difAbsCust_1)} ({kpis.difPctCust_1 >= 0 ? '+' : ''}{kpis.difPctCust_1.toFixed(2)}%)
                    </td>
                    <td className="p-3 font-mono text-right text-slate-300">
                      {formatCOP(kpis.totalDocentes > 0 ? kpis.totalCostoCustom / kpis.totalDocentes : 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUBTAB 2: DESGLOSE POR FACULTAD */}
      {/* ======================================================================= */}
      {subTab === 'facultades' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-bold text-white flex items-center justify-between mb-4">
              <span>Impacto Presupuestal Desagregado por Facultad</span>
              <span className="text-xs text-slate-400 font-normal">Ordenado por mayor incremento presupuestal (Δ 2 - 1)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">Facultad</th>
                    <th className="p-3 text-center">Registros</th>
                    <th className="p-3 text-center">Docentes Únicos</th>
                    <th className="p-3 text-right">Sueldo Base</th>
                    <th className="p-3 text-right">Escenario 1</th>
                    <th className="p-3 text-right">Escenario 2</th>
                    <th className="p-3 text-right">Variación (Δ 2-1)</th>
                    <th className="p-3 text-right">Var %</th>
                    <th className="p-3 text-right">Part %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {porFacultad.map((f, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-white">{f.facultad}</td>
                      <td className="p-3 text-center text-slate-300 font-mono">{f.registros}</td>
                      <td className="p-3 text-center text-slate-300 font-mono">{f.docentesUnicos}</td>
                      <td className="p-3 text-right font-mono text-slate-300">{formatCOP(f.sueldoBase)}</td>
                      <td className="p-3 text-right font-mono text-slate-300">{formatCOP(f.costo1)}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-300">{formatCOP(f.costo2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">+{formatCOP(f.difAbs)}</td>
                      <td className="p-3 text-right font-mono text-rose-400">+{f.difPct.toFixed(2)}%</td>
                      <td className="p-3 text-right font-mono text-primary-container">{f.partPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white/10 font-bold border-t border-white/20 text-white">
                  <tr>
                    <td className="p-3">TOTAL INSTITUCIONAL</td>
                    <td className="p-3 text-center font-mono">{kpis.totalRegistros}</td>
                    <td className="p-3 text-center font-mono">{kpis.totalDocentes}</td>
                    <td className="p-3 text-right font-mono">{formatCOP(kpis.totalSueldo)}</td>
                    <td className="p-3 text-right font-mono">{formatCOP(kpis.totalCosto1)}</td>
                    <td className="p-3 text-right font-mono text-blue-300">{formatCOP(kpis.totalCosto2)}</td>
                    <td className="p-3 text-right font-mono text-rose-400">+{formatCOP(kpis.difAbs2_1)}</td>
                    <td className="p-3 text-right font-mono text-rose-400">+{kpis.difPct2_1.toFixed(2)}%</td>
                    <td className="p-3 text-right font-mono">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Conciliación Matemática: El total sumado por facultad coincide exactamente al centavo con el costo institucional.</span>
              </span>
              <span className="font-mono font-bold">{formatCOP(kpis.totalCosto2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUBTAB 3: RANKING DE PROGRAMAS ACADÉMICOS */}
      {/* ======================================================================= */}
      {subTab === 'programas' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-bold text-white flex items-center justify-between mb-4">
              <span>Top 15 Programas Académicos con Mayor Incremento Presupuestal</span>
              <span className="text-xs text-slate-400 font-normal">Escenario 2 vs Escenario 1</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Programa Académico</th>
                    <th className="p-3">Facultad</th>
                    <th className="p-3 text-center">Registros</th>
                    <th className="p-3 text-right">Escenario 1</th>
                    <th className="p-3 text-right">Escenario 2</th>
                    <th className="p-3 text-right">Incremento Presupuestal</th>
                    <th className="p-3 text-right">Variación %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {porPrograma.slice(0, 15).map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-white">{p.programa}</td>
                      <td className="p-3 text-slate-300">{p.facultad}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{p.registros}</td>
                      <td className="p-3 text-right font-mono text-slate-300">{formatCOP(p.costo1)}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-300">{formatCOP(p.costo2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">+{formatCOP(p.difAbs)}</td>
                      <td className="p-3 text-right font-mono text-rose-400">+{p.difPct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUBTAB 4: DETALLE INDIVIDUAL Y BUSCADOR */}
      {/* ======================================================================= */}
      {subTab === 'docentes' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cédula, nombre o programa..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPaginaDocentes(1);
                  }}
                  className="w-full bg-surface-container-high border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select
                  value={filterFacultad}
                  onChange={(e) => {
                    setFilterFacultad(e.target.value);
                    setPaginaDocentes(1);
                  }}
                  className="bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
                >
                  {facultadesList.map((f) => (
                    <option key={f} value={f}>
                      Facultad: {f}
                    </option>
                  ))}
                </select>

                <select
                  value={filterNivel}
                  onChange={(e) => {
                    setFilterNivel(e.target.value);
                    setPaginaDocentes(1);
                  }}
                  className="bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-container"
                >
                  <option value="TODOS">Formación: TODOS</option>
                  <option value="DOCTORADO">DOCTORADO</option>
                  <option value="MAESTRIA">MAESTRIA</option>
                  <option value="ESPECIALIZACION">ESPECIALIZACION</option>
                  <option value="LICENCIATURA">LICENCIATURA</option>
                  <option value="PROFESIONAL">PROFESIONAL</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Registros coincidentes: <strong>{filteredDocentes.length}</strong> (Página {paginaDocentes} de {totalPaginas})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Cédula</th>
                    <th className="p-3">Docente</th>
                    <th className="p-3">Programa</th>
                    <th className="p-3">Formación</th>
                    <th className="p-3 text-right">Sueldo Base</th>
                    <th className="p-3">Cat. Esc 1</th>
                    <th className="p-3 text-right">Costo Esc 1</th>
                    <th className="p-3">Cat. Esc 2</th>
                    <th className="p-3 text-right">Costo Esc 2</th>
                    <th className="p-3 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedDocentes.map((d) => (
                    <tr key={d.idFila} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{d.idFila}</td>
                      <td className="p-3 font-mono text-slate-300">{d.nroIden || 'N/A'}</td>
                      <td className="p-3 font-bold text-white">{d.nombreCompleto}</td>
                      <td className="p-3 text-slate-300 truncate max-w-[150px]" title={d.programa}>{d.programa}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.nivelNormalizado === 'DOCTORADO' ? 'bg-sky-500/20 text-sky-300' :
                          d.nivelNormalizado === 'MAESTRIA' ? 'bg-cyan-500/20 text-cyan-300' :
                          d.nivelNormalizado === 'ESPECIALIZACION' ? 'bg-amber-500/20 text-amber-300' :
                          d.nivelNormalizado === 'PENDIENTE' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {d.nivelNormalizado}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">{formatCOP(d.sueldo)}</td>
                      <td className="p-3 text-slate-300">{d.catEsc1.replace('Profesor ', '')}</td>
                      <td className="p-3 text-right font-mono text-slate-300">{formatCOP(d.costoEsc1)}</td>
                      <td className="p-3 font-bold text-blue-300">{d.catEsc2.replace('Profesor ', '')}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-300">{formatCOP(d.costoEsc2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">
                        {d.difAbs2_1 > 0 ? `+${formatCOP(d.difAbs2_1)}` : '$ 0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={paginaDocentes <= 1}
                  onClick={() => setPaginaDocentes((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-400">
                  Página {paginaDocentes} de {totalPaginas}
                </span>
                <button
                  disabled={paginaDocentes >= totalPaginas}
                  onClick={() => setPaginaDocentes((p) => Math.min(totalPaginas, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUBTAB 5: MATRIZ DE EQUIVALENCIAS Y PARÁMETROS */}
      {/* ======================================================================= */}
      {subTab === 'parametros' && (
        <div className="space-y-6">
          {/* Tabla Oficial Artículo 1 Acuerdo 015 de 2009 (Imagen de Referencia Institucional) */}
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-primary-container text-lg">🎗️</span>
                  Artículo 1: Asignación de Puntos por Hora de Clase en Pregrado
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Estatuto oficial de liquidación de cátedra. Estos valores por categoría se multiplican por <strong>{horasPromedio} horas promedio</strong> dictadas en el semestre.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-container/20 text-primary-container border border-primary-container/30">
                Punto D1279: $ 23.924 COP
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">Categoría en Escalafón</th>
                    <th className="p-3 text-center">Puntos por Hora</th>
                    <th className="p-3">Equivalencia para Docentes Externos (Parágrafo 1)</th>
                    <th className="p-3 text-right">Tarifa Horaria 2024</th>
                    <th className="p-3 text-right">Tarifa Horaria 2025</th>
                    <th className="p-3 text-right text-primary-container">Tarifa Horaria 2026</th>
                    <th className="p-3 text-right font-bold text-white">Costo Total Semestre ({horasPromedio}h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ESCALA_ARTICULO_1.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-primary-container flex-shrink-0" />
                        <span>{item.categoria}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-primary-container">{item.puntos.toFixed(2)} pts</td>
                      <td className="p-3 text-slate-300">{item.equivalencia}</td>
                      <td className="p-3 text-right font-mono text-slate-400">{formatCOP(item.tarifa2024)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">{formatCOP(item.tarifa2025)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatCOP(item.tarifa2026)}</td>
                      <td className="p-3 text-right font-mono font-black text-white bg-white/5">
                        {formatCOP(item.tarifa2026 * horasPromedio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Factores de Puntos */}
            <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="text-primary-container" size={16} />
                Factores de Puntos por Categoría (Acuerdo 015/2009)
              </h3>
              <p className="text-xs text-slate-300">
                Puntos fijados en el Estatuto de Hora Cátedra de la UPTC. Al modificarlos se actualizan todos los cálculos en vivo.
              </p>

              <div className="space-y-3">
                {['Profesor Auxiliar', 'Profesor Asistente', 'Profesor Asociado', 'Profesor Titular'].map((cat) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs font-bold text-white">{cat}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="10.0"
                        value={factores[cat] || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFactores((prev) => ({ ...prev, [cat]: val }));
                        }}
                        className="w-24 bg-surface-container-high border border-white/10 rounded-lg px-2 py-1 text-xs text-right font-mono font-bold text-primary-container focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matriz del Escenario Personalizado */}
            <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="text-primary-container" size={16} />
                Reglas del Escenario Personalizado (Escenario 3)
              </h3>
              <p className="text-xs text-slate-300">
                Asigne la categoría deseada a cada título para evaluar propuestas alternativas ante el CSU.
              </p>

              <div className="space-y-3">
                {['DOCTORADO', 'MAESTRIA', 'ESPECIALIZACION', 'LICENCIATURA', 'PROFESIONAL'].map((lvl) => (
                  <div key={lvl} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs font-bold text-white">{lvl}</span>
                    <select
                      value={customRules[lvl] || 'Profesor Auxiliar'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomRules((prev) => ({ ...prev, [lvl]: val }));
                      }}
                      className="bg-surface-container-high border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-primary-container"
                    >
                      <option value="Profesor Auxiliar">Profesor Auxiliar ({factores['Profesor Auxiliar']} pts)</option>
                      <option value="Profesor Asistente">Profesor Asistente ({factores['Profesor Asistente']} pts)</option>
                      <option value="Profesor Asociado">Profesor Asociado ({factores['Profesor Asociado']} pts)</option>
                      <option value="Profesor Titular">Profesor Titular ({factores['Profesor Titular']} pts)</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUBTAB 6: AUDITORÍA E INCONSISTENCIAS */}
      {/* ======================================================================= */}
      {subTab === 'inconsistencias' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-container/60 border border-white/10 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-amber-400" size={16} />
                  Matriz de Hallazgos y Control de Calidad de Nómina
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Registros que requieren depuración o soporte documental para evitar contingencias presupuestales.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {inconsistencias.length} Hallazgos
              </span>
            </div>

            {inconsistencias.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/5 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="p-3">Fila</th>
                      <th className="p-3">Docente</th>
                      <th className="p-3">Campo Afectado</th>
                      <th className="p-3">Valor Reportado</th>
                      <th className="p-3">Observación de Auditoría</th>
                      <th className="p-3 text-center">Gravedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inconsistencias.map((inc, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{inc.fila}</td>
                        <td className="p-3 font-bold text-white">{inc.docente}</td>
                        <td className="p-3 font-mono text-amber-300">{inc.campo}</td>
                        <td className="p-3 text-slate-300 truncate max-w-[150px]">{inc.valor}</td>
                        <td className="p-3 text-slate-300">{inc.observacion}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inc.gravedad === 'ALTA' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {inc.gravedad}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-emerald-300 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                ✅ No se registraron inconsistencias de nómina en la base actual.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
