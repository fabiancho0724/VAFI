import Papa from 'papaparse';
import { PoaItem, fetchAndParsePOA, calculatePoaTotals, PoaTotals } from './poaParser';

export interface GastoItem {
  unidad: string;
  tipoGasto: string;
  referencia: string;
  operacion: string;
  codigoRecurso: string;
  compromiso: number;
  valorPago: number;
}

export interface IngresoItem {
  unidad: string;
  codigo: string;
  recurso: string;
  concepto: string;
  mensual: number[]; // ene - dic (12 meses)
  totalAnual: number;
}

export interface NominaItem {
  periodo: string;
  numero: string;
  concepto: string;
  valorLiquidacion: number;
  objeto: string;
  asignacion: string;
  dedicacion: string;
  vinculacion: string;
}

export interface BalanceItem {
  recurso: string;
  codigoRecurso: string;
  nombreRecurso: string;
  valorInicial: number;
  aforo: number;
  recaudoCorte: number;
  acuerdo: number;
  siif: number;
  totalRecaudo: number;
  pctEjecucionRecaudo: number;
}

export interface PosgradoItem {
  facultad: string;
  programa: string;
  sede: string;
  modalidad: string;
  tipoInscripcion: string;
  cuotas: number;
  sexo: string;
  estudiantes: number;
  matriculaBruta: number;
  matriculaNeta: number;
}

export interface CatedraItem {
  facultad: string;
  escuela: string;
  programa: string;
  docente: string;
  escalafon: string;
  horasSemana: number;
  semanasSemestre: number;
  costoSemestre: number;
}

function parseMonto(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim().replace('$', '').replace(/\s+/g, '');
  if (!s) return 0;

  const isNegative = s.includes('-');
  s = s.replace(/-/g, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

class InstitutionalDataServiceImpl {
  private poaData: PoaItem[] | null = null;
  private gastosData: GastoItem[] | null = null;
  private ingresosData: IngresoItem[] | null = null;
  private nominaData: NominaItem[] | null = null;
  private balanceData: BalanceItem[] | null = null;
  private posgradosData: PosgradoItem[] | null = null;
  private catedraData: CatedraItem[] | null = null;

  private poaPromise: Promise<PoaItem[]> | null = null;
  private gastosPromise: Promise<GastoItem[]> | null = null;
  private ingresosPromise: Promise<IngresoItem[]> | null = null;
  private nominaPromise: Promise<NominaItem[]> | null = null;
  private balancePromise: Promise<BalanceItem[]> | null = null;
  private posgradosPromise: Promise<PosgradoItem[]> | null = null;
  private catedraPromise: Promise<CatedraItem[]> | null = null;

  /**
   * Obtiene y almacena en caché los registros del Plan Operativo Anual (POA 2026)
   */
  async getPoa(): Promise<PoaItem[]> {
    if (this.poaData) return this.poaData;
    if (!this.poaPromise) {
      this.poaPromise = fetchAndParsePOA('/data/POA.csv')
        .then((items) => {
          this.poaData = items;
          return items;
        })
        .catch((err) => {
          this.poaPromise = null;
          throw err;
        });
    }
    return this.poaPromise;
  }

  /**
   * Obtiene y almacena en caché los Gastos Ejecutados 2026
   */
  async getGastos(): Promise<GastoItem[]> {
    if (this.gastosData) return this.gastosData;
    if (!this.gastosPromise) {
      this.gastosPromise = fetch('/data/gastos_2026.csv')
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar gastos_2026.csv');
          return res.text();
        })
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true
          });
          const items: GastoItem[] = [];
          for (const row of parsed.data as any[]) {
            const unidad = row['Unidad'] || row['unidad'] || '';
            const tipoGasto = row['Tipo de Gasto'] || row['tipoGasto'] || '';
            const referencia = row['Referencia'] || '';
            const operacion = row['Operacion'] || '';
            const codigoRecurso = String(row['Cdigo recurso'] || row['codigoRecurso'] || '').trim();
            const compromiso = parseMonto(row[' Compromiso '] || row['Compromiso'] || 0);
            const valorPago = parseMonto(row[' Valor pago '] || row['Valor pago'] || 0);

            if (unidad || compromiso > 0 || valorPago > 0) {
              items.push({
                unidad,
                tipoGasto,
                referencia,
                operacion,
                codigoRecurso,
                compromiso,
                valorPago
              });
            }
          }
          this.gastosData = items;
          return items;
        })
        .catch((err) => {
          this.gastosPromise = null;
          throw err;
        });
    }
    return this.gastosPromise;
  }

  /**
   * Obtiene y almacena en caché el Balance Presupuestal y Flujo de Caja
   */
  async getBalance(): Promise<BalanceItem[]> {
    if (this.balanceData) return this.balanceData;
    if (!this.balancePromise) {
      this.balancePromise = fetch('/data/balance.csv')
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar balance.csv');
          return res.text();
        })
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
          });
          const items: BalanceItem[] = [];
          for (const row of parsed.data as any[]) {
            const rawRecurso = String(row['Recurso'] || '').trim();
            if (!rawRecurso) continue;

            const splitIdx = rawRecurso.indexOf('-');
            const codigoRecurso = splitIdx !== -1 ? rawRecurso.substring(0, splitIdx).trim() : rawRecurso;
            const nombreRecurso = splitIdx !== -1 ? rawRecurso.substring(splitIdx + 1).trim() : rawRecurso;

            const valorInicial = parseMonto(row['Valor inicial']);
            const aforo = parseMonto(row['Aforo']);
            const recaudoCorte = parseMonto(row['Recaudo 31/08'] || row['Recaudo']);
            const acuerdo = parseMonto(row['Acuerdo']);
            const siif = parseMonto(row['SIIF']);
            const totalRecaudo = parseMonto(row['Total Recaudo']) || (recaudoCorte > 0 ? recaudoCorte : (acuerdo + siif));
            const pctEjecucionRecaudo = aforo > 0 ? (totalRecaudo / aforo) * 100 : 0;

            items.push({
              recurso: rawRecurso,
              codigoRecurso,
              nombreRecurso,
              valorInicial,
              aforo,
              recaudoCorte,
              acuerdo,
              siif,
              totalRecaudo,
              pctEjecucionRecaudo
            });
          }
          this.balanceData = items;
          return items;
        })
        .catch((err) => {
          this.balancePromise = null;
          throw err;
        });
    }
    return this.balancePromise;
  }

  /**
   * Obtiene y almacena en caché la Nómina Institucional 2026
   */
  async getNomina(): Promise<NominaItem[]> {
    if (this.nominaData) return this.nominaData;
    if (!this.nominaPromise) {
      this.nominaPromise = fetch('/data/Nomina.csv')
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar Nomina.csv');
          return res.text();
        })
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true
          });
          const items: NominaItem[] = [];
          for (const row of parsed.data as any[]) {
            const periodo = row['Periodo'] || '';
            const numero = row['Numero'] || '';
            const concepto = row['Concepto'] || '';
            const valorLiquidacion = parseMonto(row['Valor liquidacion'] || 0);
            const objeto = row['Objeto'] || '';
            const asignacion = row['Asignacion'] || '';
            const dedicacion = row['Dedicacion'] || '';
            const vinculacion = row['Vinculacion'] || '';

            if (valorLiquidacion > 0 || concepto) {
              items.push({
                periodo,
                numero,
                concepto,
                valorLiquidacion,
                objeto,
                asignacion,
                dedicacion,
                vinculacion
              });
            }
          }
          this.nominaData = items;
          return items;
        })
        .catch((err) => {
          this.nominaPromise = null;
          throw err;
        });
    }
    return this.nominaPromise;
  }

  /**
   * Obtiene y almacena en caché la base de Posgrados UPTC
   */
  async getPosgrados(): Promise<PosgradoItem[]> {
    if (this.posgradosData) return this.posgradosData;
    if (!this.posgradosPromise) {
      this.posgradosPromise = fetch('/data/Resumen Posgrados.csv')
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar Resumen Posgrados.csv');
          return res.text();
        })
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true
          });
          const items: PosgradoItem[] = [];
          for (const row of parsed.data as any[]) {
            const facultad = row['FACULTAD'] || '';
            const programa = row['PROGRAMA'] || '';
            const sede = row['SEDE'] || '';
            const modalidad = row['MODALIDAD'] || '';
            const tipoInscripcion = row['TIPO INSCRIPCION'] || '';
            const cuotas = parseMonto(row['Número de CUOTAS'] || 1);
            const sexo = row['SEXO'] || '';
            const estudiantes = parseMonto(row['Número de Estudiantes'] || 0);
            const matriculaBruta = parseMonto(row['VALOR MATRICULA BRUTA'] || 0);
            const matriculaNeta = parseMonto(row['VALOR MATRICULA NETA'] || 0);

            if (facultad || programa || matriculaNeta > 0) {
              items.push({
                facultad,
                programa,
                sede,
                modalidad,
                tipoInscripcion,
                cuotas,
                sexo,
                estudiantes,
                matriculaBruta,
                matriculaNeta
              });
            }
          }
          this.posgradosData = items;
          return items;
        })
        .catch((err) => {
          this.posgradosPromise = null;
          throw err;
        });
    }
    return this.posgradosPromise;
  }

  /**
   * Obtiene y almacena en caché los Ingresos Mensuales
   */
  async getIngresos(): Promise<IngresoItem[]> {
    if (this.ingresosData) return this.ingresosData;
    if (!this.ingresosPromise) {
      this.ingresosPromise = fetch('/data/ingresos_mensuales.csv')
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo cargar ingresos_mensuales.csv');
          return res.text();
        })
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true
          });
          const items: IngresoItem[] = [];
          const monthKeys = [
            'Valor ene', 'Valor feb', 'Valor mar', 'Valor abr',
            'Valor may', 'Valor jun', 'Valor jul', 'Valor ago',
            'Valor sep', 'Valor oct', 'Valor nov', 'Valor dic'
          ];

          for (const row of parsed.data as any[]) {
            const unidad = row['Unidad'] || '';
            const codigo = row['Codigo'] || '';
            const recurso = String(row['Recurso'] || '').trim();
            const concepto = row['Concepto'] || '';
            const mensual = monthKeys.map(k => parseMonto(row[k] || 0));
            const totalAnual = mensual.reduce((sum, v) => sum + v, 0);

            if (unidad || recurso || totalAnual > 0) {
              items.push({
                unidad,
                codigo,
                recurso,
                concepto,
                mensual,
                totalAnual
              });
            }
          }
          this.ingresosData = items;
          return items;
        })
        .catch((err) => {
          this.ingresosPromise = null;
          throw err;
        });
    }
    return this.ingresosPromise;
  }

  /**
   * Precarga todas las bases en memoria en paralelo
   */
  async preloadAll(): Promise<void> {
    await Promise.allSettled([
      this.getPoa(),
      this.getBalance(),
      this.getGastos(),
      this.getNomina(),
      this.getPosgrados(),
      this.getIngresos()
    ]);
  }

  /**
   * Indica si los conjuntos de datos principales están disponibles en memoria
   */
  isLoaded(): boolean {
    return this.poaData !== null && this.balanceData !== null;
  }

  // --- MÉTODOS DE CÁLCULO Y AGREGACIÓN ANALÍTICA ---

  getPoaTotals(): PoaTotals | null {
    if (!this.poaData) return null;
    return calculatePoaTotals(this.poaData);
  }

  getPoaByRecurso(): Record<string, { programado: number; solicitudes: number; disponible: number; count: number; name: string }> {
    if (!this.poaData) return {};
    const map: Record<string, { programado: number; solicitudes: number; disponible: number; count: number; name: string }> = {};

    for (const item of this.poaData) {
      const rec = item.codigoRecurso || 'Sin Recurso';
      if (!map[rec]) {
        map[rec] = {
          programado: 0,
          solicitudes: 0,
          disponible: 0,
          count: 0,
          name: item.recursoNombre || rec
        };
      }
      map[rec].programado += item.valorProgramadoPoa;
      map[rec].solicitudes += item.valorSolicitudes;
      map[rec].disponible += item.valorDisponiblePoa;
      map[rec].count += 1;
    }
    return map;
  }

  getPoaByUnidad(): Record<string, { programado: number; disponible: number; count: number }> {
    if (!this.poaData) return {};
    const map: Record<string, { programado: number; disponible: number; count: number }> = {};

    for (const item of this.poaData) {
      const u = item.unidad || 'Sin Unidad';
      if (!map[u]) {
        map[u] = { programado: 0, disponible: 0, count: 0 };
      }
      map[u].programado += item.valorProgramadoPoa;
      map[u].disponible += item.valorDisponiblePoa;
      map[u].count += 1;
    }
    return map;
  }

  getPosgradosSummary(): { totalNeto: number; totalBruto: number; totalEstudiantes: number; porFacultad: Record<string, { neto: number; bruto: number; estudiantes: number }> } {
    if (!this.posgradosData) {
      return { totalNeto: 0, totalBruto: 0, totalEstudiantes: 0, porFacultad: {} };
    }

    let totalNeto = 0;
    let totalBruto = 0;
    let totalEstudiantes = 0;
    const porFacultad: Record<string, { neto: number; bruto: number; estudiantes: number }> = {};

    for (const item of this.posgradosData) {
      totalNeto += item.matriculaNeta;
      totalBruto += item.matriculaBruta;
      totalEstudiantes += item.estudiantes;

      const f = item.facultad || 'Otras';
      if (!porFacultad[f]) {
        porFacultad[f] = { neto: 0, bruto: 0, estudiantes: 0 };
      }
      porFacultad[f].neto += item.matriculaNeta;
      porFacultad[f].bruto += item.matriculaBruta;
      porFacultad[f].estudiantes += item.estudiantes;
    }

    return { totalNeto, totalBruto, totalEstudiantes, porFacultad };
  }
}

export const institutionalDataService = new InstitutionalDataServiceImpl();
