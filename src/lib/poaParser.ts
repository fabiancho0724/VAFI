import Papa from 'papaparse';

export interface PoaItem {
  id: string;
  vigencia: string;
  unidad: string;
  gasto: string;
  objeto: string;
  tipoGasto: string;
  codigoConcepto: string;
  codigoRecurso: string;
  recursoNombre: string;
  codigoFuente: string;
  concepto: string;
  valorPoaInicial: number;
  valorModificaciones: number;
  valorProgramadoPoa: number;
  valorSolicitudes: number;
  valorDisponiblePoa: number;
  pctDisponible: number;
  pctEjecutado: number;
  estadoDisponible: 'ALTO' | 'MEDIO' | 'CRITICO' | 'AGOTADO';
}

export interface PoaTotals {
  poaInicial: number;
  modificaciones: number;
  programado: number;
  solicitudes: number;
  disponible: number;
  pctEjecutado: number;
  pctDisponible: number;
  totalRegistros: number;
}

export interface PoaGroupSummary {
  key: string;
  name: string;
  programado: number;
  solicitudes: number;
  disponible: number;
  pctEjecutado: number;
  pctDisponible: number;
  count: number;
}

// Mapeo oficial de códigos de recursos presupuestales UPTC
export const RECURSOS_MAP: Record<string, string> = {
  '10.0': 'Aportes de la Nación (Ley 30)',
  '10.1': 'Aportes Nación - Art. 86 Ley 30',
  '10.2': 'Aportes Nación - Art. 87 Ley 30',
  '10.5': 'Aportes Adicionales Nación (Gratuidad)',
  '12': 'Crédito y Recursos de Capital',
  '13': 'Excedentes Financieros',
  '14': 'Rendimientos Financieros',
  '15': 'Regalías (SGR)',
  '16.0': 'Estampilla Pro-UPTC',
  '16.1': 'Estampilla Pro-UPTC Rendimientos',
  '17': 'Estampilla Pro-Desarrollo Rural',
  '18': 'Estampilla Pro-Cultura',
  '20': 'Estampilla Pro-Desarrollo',
  '21': 'Fondo Especial de Becas / Otros',
  '31': 'Recursos Propios (Matrículas Pregrado)',
  '32': 'Otros Derechos Pecuniarios',
  '33': 'Posgrados y Educación Continuada',
  '34': 'Extensión, Consultorías y Convenios',
  '35': 'Venta de Bienes y Servicios Académicos',
  '40': 'Recursos del Balance / Fondos Especiales',
  '50': 'Unisalud (Fondo de Seguridad Social Salud)'
};

/**
 * Parsea cadenas monetarias en formato colombiano ($ 20.203.424.803,78)
 * o formato internacional ($483,105,639,256.27), soportando signos negativos.
 */
export function parseColombianCurrency(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let s = String(val).trim().replace('$', '').replace(/\s+/g, '');
  if (!s) return 0;

  const isNegative = s.includes('-');
  s = s.replace(/-/g, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Formato colombiano / europeo: 1.234.567,89
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglosajón: 1,234,567.89
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}B`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}MM`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString('es-CO')}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function cleanEncoding(text: string): string {
  if (!text) return '';
  return text
    .replace(/\x97/g, 'ó')
    .replace(/\x87/g, 'á')
    .replace(/\x82/g, 'é')
    .replace(/\x8d/g, 'í')
    .replace(/\xa3/g, 'ú')
    .replace(/ADQUISICIîN/g, 'ADQUISICIÓN')
    .replace(/INVERSIîN/g, 'INVERSIÓN')
    .replace(/EDUCACIîN/g, 'EDUCACIÓN')
    .replace(/PRODUCCIîN/g, 'PRODUCCIÓN')
    .replace(/ALIMENTACIîN/g, 'ALIMENTACIÓN')
    .replace(/BONIFICACIîN/g, 'BONIFICACIÓN')
    .replace(/CONTRIBUCIîN/g, 'CONTRIBUCIÓN')
    .replace(/Inversi\x97n/g, 'Inversión')
    .replace(/Vi\x87ticos/g, 'Viáticos')
    .replace(/b\x87sico/g, 'básico')
    .replace(/cesant\x87as/g, 'cesantías')
    .replace(/recreaci\x97n/g, 'recreación')
    .replace(/compensaci\x97n/g, 'compensación')
    .replace(/cotizaci\x97n/g, 'cotización')
    .replace(/r\x82gimen/g, 'régimen')
    .replace(/t\x82cnica/g, 'técnica')
    .replace(/membres\x87as/g, 'membresías')
    .trim();
}

/**
 * Carga y analiza el archivo POA.csv
 */
export async function fetchAndParsePOA(url: string = '/data/POA.csv'): Promise<PoaItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status} cargando ${url}`);
  }

  // Leer como buffer para decodificar en latin1 / ISO-8859-1
  const arrayBuffer = await response.arrayBuffer();
  let text = '';
  try {
    text = new TextDecoder('latin1').decode(arrayBuffer);
  } catch {
    text = new TextDecoder('utf-8').decode(arrayBuffer);
  }

  const delimiter = text.includes(';') ? ';' : ',';

  return new Promise((resolve, reject) => {
    Papa.parse<any>(text, {
      delimiter,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawRows = results.data;
          if (!rawRows || rawRows.length < 2) {
            resolve([]);
            return;
          }

          const items: PoaItem[] = [];

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length < 10) continue;

            const vigencia = String(row[0] || '').trim();
            const unidad = cleanEncoding(String(row[1] || ''));
            
            // Ignorar fila totalizadora que no tenga unidad y tenga montos al final
            if (!unidad && !vigencia) continue;

            const gasto = cleanEncoding(String(row[2] || ''));
            const objeto = cleanEncoding(String(row[3] || ''));
            const tipoGasto = cleanEncoding(String(row[4] || ''));
            const codigoConcepto = String(row[5] || '').trim();
            const rawRecurso = String(row[6] || '').trim();
            const codigoRecurso = rawRecurso.endsWith('.0') && rawRecurso !== '10.0' && rawRecurso !== '16.0'
              ? rawRecurso.replace('.0', '')
              : rawRecurso;
            const codigoFuente = cleanEncoding(String(row[7] || ''));
            const concepto = cleanEncoding(String(row[8] || ''));

            const valorPoaInicial = parseColombianCurrency(row[9]);
            const valorModificaciones = parseColombianCurrency(row[10]);
            const valorProgramadoPoa = parseColombianCurrency(row[11]);
            const valorSolicitudes = parseColombianCurrency(row[12]);
            const valorDisponiblePoa = parseColombianCurrency(row[13]);

            const pctDisponible = valorProgramadoPoa > 0 
              ? (valorDisponiblePoa / valorProgramadoPoa) * 100 
              : 0;

            const pctEjecutado = valorProgramadoPoa > 0 
              ? (valorSolicitudes / valorProgramadoPoa) * 100 
              : 0;

            let estadoDisponible: 'ALTO' | 'MEDIO' | 'CRITICO' | 'AGOTADO' = 'MEDIO';
            if (valorDisponiblePoa <= 100) {
              estadoDisponible = 'AGOTADO';
            } else if (pctDisponible < 10) {
              estadoDisponible = 'CRITICO';
            } else if (pctDisponible >= 35) {
              estadoDisponible = 'ALTO';
            } else {
              estadoDisponible = 'MEDIO';
            }

            const recursoNombre = RECURSOS_MAP[codigoRecurso] || `Recurso ${codigoRecurso}`;

            items.push({
              id: `poa-${i}-${codigoConcepto}-${codigoRecurso}`,
              vigencia: vigencia || '2026',
              unidad: unidad || '01 - ADMINISTRATIVA Y FINANCIERA',
              gasto: gasto || '1. FUNCIONAMIENTO',
              objeto: objeto || 'OTROS',
              tipoGasto: tipoGasto || '2.1.2 Gastos de Funcionamiento',
              codigoConcepto,
              codigoRecurso,
              recursoNombre,
              codigoFuente: codigoFuente || 'ADM',
              concepto,
              valorPoaInicial,
              valorModificaciones,
              valorProgramadoPoa,
              valorSolicitudes,
              valorDisponiblePoa,
              pctDisponible,
              pctEjecutado,
              estadoDisponible
            });
          }

          resolve(items);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error)
    });
  });
}

/**
 * Calcula los totales consolidados de un arreglo de PoaItems
 */
export function calculatePoaTotals(items: PoaItem[]): PoaTotals {
  let poaInicial = 0;
  let modificaciones = 0;
  let programado = 0;
  let solicitudes = 0;
  let disponible = 0;

  for (const it of items) {
    poaInicial += it.valorPoaInicial;
    modificaciones += it.valorModificaciones;
    programado += it.valorProgramadoPoa;
    solicitudes += it.valorSolicitudes;
    disponible += it.valorDisponiblePoa;
  }

  const pctEjecutado = programado > 0 ? (solicitudes / programado) * 100 : 0;
  const pctDisponible = programado > 0 ? (disponible / programado) * 100 : 0;

  return {
    poaInicial,
    modificaciones,
    programado,
    solicitudes,
    disponible,
    pctEjecutado,
    pctDisponible,
    totalRegistros: items.length
  };
}

/**
 * Agrupa los datos por una clave (unidad, codigoRecurso, tipoGasto, etc.)
 */
export function groupPoaBy(
  items: PoaItem[], 
  keySelector: (item: PoaItem) => string,
  nameSelector?: (item: PoaItem) => string
): PoaGroupSummary[] {
  const map = new Map<string, PoaGroupSummary>();

  for (const it of items) {
    const key = keySelector(it) || 'Sin Clasificar';
    const name = nameSelector ? nameSelector(it) : key;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        name,
        programado: 0,
        solicitudes: 0,
        disponible: 0,
        pctEjecutado: 0,
        pctDisponible: 0,
        count: 0
      };
      map.set(key, group);
    }

    group.programado += it.valorProgramadoPoa;
    group.solicitudes += it.valorSolicitudes;
    group.disponible += it.valorDisponiblePoa;
    group.count += 1;
  }

  const result = Array.from(map.values()).map(g => {
    g.pctEjecutado = g.programado > 0 ? (g.solicitudes / g.programado) * 100 : 0;
    g.pctDisponible = g.programado > 0 ? (g.disponible / g.programado) * 100 : 0;
    return g;
  });

  // Ordenar de mayor a menor disponible por defecto
  return result.sort((a, b) => b.disponible - a.disponible);
}
