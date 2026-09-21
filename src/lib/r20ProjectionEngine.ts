import Papa from 'papaparse';

export interface R20Record {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
}

export interface R20YearAggregate {
  year: number;
  totalRecaudo: number;
}

export interface R20ForecastModelResult {
  modelId: string;
  modelName: string;
  shortName: string;
  formula: string;
  projected2027: number;
  variationPct: number; // vs 2026
  r2: number;          // 0 to 100%
  mape: number;        // % error
  rmse: number;
  lowerBound95: number;
  upperBound95: number;
  fitted: { year: number; actual: number; fitted: number }[];
  tag: 'Recomendado' | 'Conservador' | 'Moderado' | 'Optimista';
  interpretation: string;
  color: string;
}

export interface R20ConceptForecast {
  concepto: string;
  recaudo2024: number;
  recaudo2025: number;
  recaudo2026: number;
  recaudo2027Proyectado: number;
  variacionPct: number;
  participacionPct: number;
  tendencia: 'up' | 'down' | 'flat';
  modeloUsado: string;
}

export interface R20UnitForecast {
  unidad: string;
  total2026: number;
  proyectado2027: number;
  variacionPct: number;
  participacionPct: number;
}

// Formateador de moneda colombiana completo
export function formatCurrencyCOP(val: number): string {
  if (isNaN(val)) return '$0';
  return '$ ' + Math.round(val).toLocaleString('es-CO');
}

// Formateador de moneda abreviado en Millones / Billones
export function formatCurrencyShortCOP(val: number): string {
  if (isNaN(val)) return '$0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}B`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}M`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString('es-CO')}`;
}

// Carga asíncrona del CSV con fallback de datos estáticos
export async function fetchAndParseR20(): Promise<R20Record[]> {
  try {
    const res = await fetch('/data/Historico_Ingresos_10y.csv');
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const text = await res.text();

    return new Promise((resolve) => {
      Papa.parse<any>(text, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: (results) => {
          const records: R20Record[] = [];
          for (const row of results.data) {
            const rawVigencia = row['Vigencia'] || row['vigencia'];
            const rawRecaudo = row['Total recaudo'] || row['total_recaudo'] || row['Total Recaudo'];
            if (!rawVigencia || !rawRecaudo) continue;

            const cleanStr = String(rawRecaudo)
              .replace(/\$/g, '')
              .replace(/\./g, '')
              .replace(/,/g, '.')
              .trim();
            const val = parseFloat(cleanStr);
            if (isNaN(val)) continue;

            records.push({
              vigencia: parseInt(String(rawVigencia).trim(), 10),
              unidad: String(row['Unidad'] || '').trim(),
              concepto: String(row['Concepto'] || '').trim(),
              recurso: String(row['Recurso'] || '').trim(),
              totalRecaudo: val
            });
          }
          if (records.length > 0) {
            resolve(records);
          } else {
            resolve(loadFallbackRecords());
          }
        },
        error: () => resolve(loadFallbackRecords())
      });
    });
  } catch (err) {
    console.warn('Error fetching R20 CSV, loading embedded records:', err);
    return loadFallbackRecords();
  }
}

// Carga de registros embebidos para disponibilidad inmediata y offline
export function loadFallbackRecords(): R20Record[] {
  return [
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 37048760233.16 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros R 20 inversion', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 10862646903.33 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros Funcionamiento RP', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 8157977287.09 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2508166914.92 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1985686995.75 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1898046035.00 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1343726253.73 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Ingresos de Vigencias Anteriores', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 721534733.24 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Indemnizaciones Compañias Seguros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 260766280.96 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 241955643.10 },
    { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros Fondo Patrimonial', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 51923110.03 },

    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 40999601501.97 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros R 20 inversion', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 9525359530.02 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros Funcionamiento', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 6178583807.11 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3017923887.84 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2094709305.00 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1762643092.70 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1302091519.18 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Ingresos de Vigencias Anteriores', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 961825550.33 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 207059726.61 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Indemnizaciones Compañias Seguros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 119272686.69 },
    { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros Fondo Patrimonial', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 59201714.00 },

    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 40995163158.46 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros R 20 inversion', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 8816599187.32 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3230485934.33 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1820011341.48 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1819665487.65 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1297746162.77 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Ingresos de Vigencias Anteriores', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1222851458.74 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros Funcionamiento RP', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2073995874.88 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 218726469.12 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Indemnizaciones Compañias Seguros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 260341774.16 },
    { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros Fondo Patrimonial', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 73829130.00 },

    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 40997184284.14 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros Funcionamiento RP', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3609804860.91 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3108600747.88 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1391517726.00 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1809075775.00 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1210214871.30 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 251640161.71 },
    { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Excedentes Financieros R 20 inversion', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 269915020.00 },

    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 27998634839.26 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2196657800.00 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1968841022.05 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1475772370.00 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Ingresos de Vigencias Anteriores', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1222998600.00 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1391517726.00 },
    { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 228464082.00 },

    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 23624898144.92 },
    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2073995874.88 },
    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1989718428.10 },
    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1391517726.00 },
    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1534795340.00 },
    { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 200000000.00 },

    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 17339184284.14 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Matrículas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3624898144.92 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Inscripciones pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2073995874.88 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1989718428.10 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 1819665487.65 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 494217995.82 },
    { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Arrendamientos', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 200000000.00 },

    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Matrículas Pregrado', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 17339184284.14 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Certificaciones, constancias académicas y derechos complementarios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3624898144.92 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3230485934.33 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Inscripciones', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2362489814.49 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2073995874.88 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros - Propios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2030012905.32 },
    { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Restaurante y cafeterias', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 400000000.00 },

    { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Matrículas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 13714286139.22 },
    { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3609804860.91 },
    { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Certificaciones, constancias académicas y derechos complementarios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3514925513.90 },
    { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Inscripciones', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2436756014.64 },
    { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 800000000.00 },

    { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Certificaciones, constancias académicas y derechos complementarios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 7136014286.14 },
    { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3698048609.10 },
    { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Inscripciones', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2436756014.64 },
    { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros - Propios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 4230101939.92 },
    { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3940000000.00 },

    { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3230485934.33 },
    { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Certificaciones, constancias académicas y derechos complementarios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3514925513.90 },
    { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Pregrado - Inscripciones', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 2436756014.64 },
    { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Uptc', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3947293808.49 },
    { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Rendimientos Financieros - Propios', recurso: '20-RECURSOS PROPIOS', totalRecaudo: 3500000000.00 }
  ];
}

// Filtra registros y devuelve series anuales ordenadas
export function filterR20Data(
  records: R20Record[],
  options: {
    unidad?: string;
    concepto?: string;
    window?: 'all' | 'post-gratuidad' | 'ultimos-5';
  } = {}
): {
  years: number[];
  values: number[];
  filteredRecords: R20Record[];
  allUnidades: string[];
  allConceptos: string[];
} {
  const allUnidades = Array.from(new Set(records.map(r => r.unidad))).filter(Boolean).sort();
  const allConceptos = Array.from(new Set(records.map(r => r.concepto))).filter(Boolean).sort();

  let filtered = [...records];
  if (options.unidad && options.unidad !== 'Todas') {
    filtered = filtered.filter(r => r.unidad === options.unidad);
  }
  if (options.concepto && options.concepto !== 'Todos') {
    filtered = filtered.filter(r => r.concepto === options.concepto);
  }

  // Agrupar por año
  const yearlyMap = new Map<number, number>();
  for (const r of filtered) {
    yearlyMap.set(r.vigencia, (yearlyMap.get(r.vigencia) || 0) + r.totalRecaudo);
  }

  let years = Array.from(yearlyMap.keys()).sort((a, b) => a - b);

  // Aplicar ventana temporal de calibración
  if (options.window === 'post-gratuidad') {
    years = years.filter(y => y >= 2021);
  } else if (options.window === 'ultimos-5') {
    years = years.filter(y => y >= 2022);
  }

  const values = years.map(y => yearlyMap.get(y) || 0);

  return {
    years,
    values,
    filteredRecords: filtered,
    allUnidades,
    allConceptos
  };
}

// Métricas de precisión
function calcMetrics(actual: number[], fitted: number[]) {
  const n = actual.length;
  if (n === 0) return { mape: 0, rmse: 0, r2: 0 };

  let sumErrSq = 0;
  let sumAbsPctErr = 0;
  let countMape = 0;
  const meanActual = actual.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const err = actual[i] - fitted[i];
    sumErrSq += err * err;
    if (actual[i] > 0) {
      sumAbsPctErr += Math.abs(err / actual[i]);
      countMape++;
    }
    ssTot += Math.pow(actual[i] - meanActual, 2);
  }

  const rmse = Math.sqrt(sumErrSq / n);
  const mape = countMape > 0 ? (sumAbsPctErr / countMape) * 100 : 0;
  const r2 = ssTot === 0 ? 100 : Math.max(0, (1 - sumErrSq / ssTot) * 100);

  return { mape, rmse, r2 };
}

// 1. Regresión Lineal Ordinaria (OLS)
export function runOLS(years: number[], values: number[]): R20ForecastModelResult {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const denom = n * sumXX - sumX * sumX;
  const m = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;

  const fittedSeries = x.map((xi, i) => ({
    year: years[i],
    actual: values[i],
    fitted: Math.max(0, b + m * xi)
  }));

  const rawPred = b + m * (n + 1);
  const projected2027 = Math.max(0, rawPred);
  const lastVal = values[n - 1] || 1;
  const variationPct = ((projected2027 - lastVal) / lastVal) * 100;

  const { mape, rmse, r2 } = calcMetrics(values, fittedSeries.map(f => f.fitted));

  // Intervalo de Confianza 95%
  const se = rmse * 1.96;
  const lowerBound95 = Math.max(0, projected2027 - se);
  const upperBound95 = projected2027 + se;

  return {
    modelId: 'ols',
    modelName: 'Regresión Lineal Simple (OLS)',
    shortName: 'Lineal OLS',
    formula: `y = ${m >= 0 ? '+' : ''}${formatCurrencyShortCOP(m)}·t + ${formatCurrencyShortCOP(b)}`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95,
    upperBound95,
    fitted: fittedSeries,
    tag: variationPct < -10 ? 'Conservador' : 'Moderado',
    interpretation: 'Ajusta la pendiente de largo plazo por mínimos cuadrados ordinarios.',
    color: '#38bdf8'
  };
}

// 2. Suavizamiento Exponencial Doble (Holt)
export function runHolt(years: number[], values: number[], alpha = 0.5, beta = 0.3): R20ForecastModelResult {
  const n = values.length;
  if (n < 2) return runOLS(years, values);

  let level = values[0];
  let trend = values[1] - values[0];
  const fitted: number[] = [values[0]];

  for (let i = 1; i < n; i++) {
    const lastLevel = level;
    level = alpha * values[i] + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    fitted.push(Math.max(0, level + trend));
  }

  const projected2027 = Math.max(0, level + trend);
  const lastVal = values[n - 1] || 1;
  const variationPct = ((projected2027 - lastVal) / lastVal) * 100;

  const fittedSeries = values.map((v, i) => ({
    year: years[i],
    actual: v,
    fitted: fitted[i]
  }));

  const { mape, rmse, r2 } = calcMetrics(values, fitted);
  const se = rmse * 1.96;

  return {
    modelId: 'holt',
    modelName: `Suavizamiento Holt (α=${alpha}, β=${beta})`,
    shortName: 'Holt Suavizado',
    formula: `ℓₜ = ${alpha}·yₜ + ${Number((1 - alpha).toFixed(2))}·(ℓₜ₋₁ + bₜ₋₁); bₜ = ${beta}·Δℓ`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: 'Recomendado',
    interpretation: 'Pondera adaptativamente la velocidad de cambio reciente reduciendo el rezago histórico.',
    color: '#4ade80'
  };
}

// 3. Promedio Móvil Ponderado (WMA)
export function runWMA(years: number[], values: number[], k = 3): R20ForecastModelResult {
  const n = values.length;
  const weights = k === 5 ? [0.1, 0.15, 0.2, 0.25, 0.3] : [0.2, 0.3, 0.5];
  const windowWeights = weights.slice(-Math.min(n, weights.length));
  const sumW = windowWeights.reduce((a, b) => a + b, 0);
  const normWeights = windowWeights.map(w => w / sumW);

  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 2) {
      fitted.push(values[i]);
    } else {
      const sub = values.slice(Math.max(0, i - normWeights.length), i);
      const wSub = normWeights.slice(-sub.length);
      const sw = wSub.reduce((a, b) => a + b, 0);
      const val = sub.reduce((acc, v, idx) => acc + v * (wSub[idx] / sw), 0);
      fitted.push(val);
    }
  }

  const recent = values.slice(-normWeights.length);
  const projected2027 = Math.max(0, recent.reduce((acc, v, idx) => acc + v * normWeights[idx], 0));
  const lastVal = values[n - 1] || 1;
  const variationPct = ((projected2027 - lastVal) / lastVal) * 100;

  const fittedSeries = values.map((v, i) => ({
    year: years[i],
    actual: v,
    fitted: fitted[i]
  }));

  const { mape, rmse, r2 } = calcMetrics(values, fitted);
  const se = rmse * 1.96;

  return {
    modelId: 'wma',
    modelName: `Promedio Móvil Ponderado (WMA-${k})`,
    shortName: `WMA (${k} años)`,
    formula: `ŷ₂₀₂₇ = Σ(wᵢ · y₂₀₂₆₋ᵢ) / Σ(wᵢ) con mayor peso al recaudo reciente`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: variationPct > 10 ? 'Optimista' : 'Moderado',
    interpretation: 'Filtra la volatilidad anual aislando la inercia del último trienio.',
    color: '#fbbf24'
  };
}

// 4. Tasa de Crecimiento Anual Compuesta (CAGR)
export function runCAGR(years: number[], values: number[]): R20ForecastModelResult {
  const n = values.length;
  const first = values[0] || 1;
  const last = values[n - 1] || 1;
  const periods = Math.max(1, n - 1);

  let cagrRate = 0;
  if (first > 0 && last > 0) {
    cagrRate = Math.pow(last / first, 1 / periods) - 1;
  }

  const boundedRate = Math.max(-0.35, Math.min(0.35, cagrRate));
  const projected2027 = Math.max(0, last * (1 + boundedRate));
  const variationPct = boundedRate * 100;

  const fitted = values.map((_, i) => {
    return first * Math.pow(1 + boundedRate, i);
  });

  const fittedSeries = values.map((v, i) => ({
    year: years[i],
    actual: v,
    fitted: fitted[i]
  }));

  const { mape, rmse, r2 } = calcMetrics(values, fitted);
  const se = rmse * 1.96;

  return {
    modelId: 'cagr',
    modelName: `Tasa Compuesta CAGR (${(boundedRate * 100).toFixed(1)}%)`,
    shortName: 'CAGR Geométrico',
    formula: `CAGR = (V₂₀₂₆ / V_inicial)^(1/${periods}) - 1 = ${(boundedRate * 100).toFixed(2)}%`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: boundedRate < 0 ? 'Conservador' : 'Moderado',
    interpretation: 'Mide el ritmo geométrico de contracción o expansión sostenida a lo largo de los periodos.',
    color: '#f472b6'
  };
}

// 5. Regresión Polinomial de Segundo Grado (Cuadrática)
export function runPoly2(years: number[], values: number[]): R20ForecastModelResult {
  const n = values.length;
  if (n < 3) return runOLS(years, values);

  const x = Array.from({ length: n }, (_, i) => i + 1);
  const s0 = n;
  const s1 = x.reduce((a, b) => a + b, 0);
  const s2 = x.reduce((a, b) => a + b * b, 0);
  const s3 = x.reduce((a, b) => a + Math.pow(b, 3), 0);
  const s4 = x.reduce((a, b) => a + Math.pow(b, 4), 0);

  const sy = values.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, b, i) => a + b * values[i], 0);
  const sx2y = x.reduce((a, b, i) => a + b * b * values[i], 0);

  // Determinante 3x3
  const det3 = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const M = [
    [s4, s3, s2],
    [s3, s2, s1],
    [s2, s1, s0]
  ];
  const D = det3(M);

  let a = 0, b = 0, c = values[0];
  if (Math.abs(D) > 1e-9) {
    const Da = det3([[sx2y, s3, s2], [sxy, s2, s1], [sy, s1, s0]]);
    const Db = det3([[s4, sx2y, s2], [s3, sxy, s1], [s2, sy, s0]]);
    const Dc = det3([[s4, s3, sx2y], [s3, s2, sxy], [s2, s1, sy]]);
    a = Da / D;
    b = Db / D;
    c = Dc / D;
  } else {
    return runOLS(years, values);
  }

  const fittedSeries = x.map((xi, i) => ({
    year: years[i],
    actual: values[i],
    fitted: Math.max(0, a * xi * xi + b * xi + c)
  }));

  const nextX = n + 1;
  const rawPred = a * nextX * nextX + b * nextX + c;
  const projected2027 = Math.max(0, rawPred);
  const lastVal = values[n - 1] || 1;
  const variationPct = ((projected2027 - lastVal) / lastVal) * 100;

  const { mape, rmse, r2 } = calcMetrics(values, fittedSeries.map(f => f.fitted));
  const se = rmse * 1.96;

  return {
    modelId: 'poly2',
    modelName: 'Polinomial Cuadrática (Grado 2)',
    shortName: 'Curva Cuadrática',
    formula: `y = ${formatCurrencyShortCOP(a)}·t² ${b >= 0 ? '+' : ''}${formatCurrencyShortCOP(b)}·t + ${formatCurrencyShortCOP(c)}`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: 'Moderado',
    interpretation: 'Modela la curvatura de desaceleración y estabilización del recaudo tras el choque inicial de gratuidad.',
    color: '#c084fc'
  };
}

// 6. Regresión Logarítmica
export function runLogarithmic(years: number[], values: number[]): R20ForecastModelResult {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => Math.log(i + 1));
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const denom = n * sumXX - sumX * sumX;
  const m = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;

  const fittedSeries = values.map((v, i) => ({
    year: years[i],
    actual: v,
    fitted: Math.max(0, b + m * Math.log(i + 1))
  }));

  const nextLog = Math.log(n + 1);
  const rawPred = b + m * nextLog;
  const projected2027 = Math.max(0, rawPred);
  const lastVal = values[n - 1] || 1;
  const variationPct = ((projected2027 - lastVal) / lastVal) * 100;

  const { mape, rmse, r2 } = calcMetrics(values, fittedSeries.map(f => f.fitted));
  const se = rmse * 1.96;

  return {
    modelId: 'log',
    modelName: 'Regresión Logarítmica',
    shortName: 'Logarítmica',
    formula: `y = ${formatCurrencyShortCOP(m)}·ln(t) + ${formatCurrencyShortCOP(b)}`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: variationPct > 5 ? 'Optimista' : 'Moderado',
    interpretation: 'Ajusta una curva con rendimientos decrecientes que asume que el recaudo tiende a una cota natural.',
    color: '#34d399'
  };
}

// 7. Econométrico / Indexación Macroeconómica (MFMP)
export function runMacroeconomicModel(
  years: number[],
  values: number[],
  ipcTarget = 7.0,
  effortRate = 1.0
): R20ForecastModelResult {
  const n = values.length;
  const totalGrowthPct = ipcTarget + effortRate; // ej: 7.0% IPC + 1.0% de esfuerzo propio = 8.0%
  const growthFactor = 1 + totalGrowthPct / 100;

  const fittedSeries = values.map((v, i) => {
    if (i === 0) return { year: years[i], actual: v, fitted: v };
    const prev = values[i - 1];
    return {
      year: years[i],
      actual: v,
      fitted: prev * 1.05
    };
  });

  const lastVal = values[n - 1] || 1;
  const projected2027 = Math.max(0, lastVal * growthFactor);
  const variationPct = totalGrowthPct;

  const { mape, rmse, r2 } = calcMetrics(values, fittedSeries.map(f => f.fitted));
  const se = rmse * 1.96;

  return {
    modelId: 'macro',
    modelName: `Indexación Macroeconómica (IPC ${ipcTarget.toFixed(1)}% + Esfuerzo ${effortRate.toFixed(1)}%)`,
    shortName: `Macro MFMP (${totalGrowthPct.toFixed(1)}%)`,
    formula: `V₂₀₂₇ = V₂₀₂₆ × (1 + IPC₂₀₂₇ ${ipcTarget.toFixed(1)}% + Esfuerzo ${effortRate.toFixed(1)}%)`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: 'Recomendado',
    interpretation: 'Sustentado en el Marco Fiscal de Mediano Plazo del MinHacienda, indexando el recaudo con la inflación esperada y la meta de gestión de la Vicerrectoría.',
    color: '#f59e0b'
  };
}

// Ejecuta todos los modelos simultáneamente
export function runAllR20Models(
  years: number[],
  values: number[],
  params?: { alpha?: number; beta?: number; ipcTarget?: number; effortRate?: number }
): R20ForecastModelResult[] {
  if (values.length < 2) return [];

  const alpha = params?.alpha ?? 0.5;
  const beta = params?.beta ?? 0.3;
  const ipcTarget = params?.ipcTarget ?? 7.0;
  const effortRate = params?.effortRate ?? 1.0;

  return [
    runMacroeconomicModel(years, values, ipcTarget, effortRate),
    runHolt(years, values, alpha, beta),
    runLogarithmic(years, values),
    runPoly2(years, values),
    runWMA(years, values, 3),
    runOLS(years, values),
    runCAGR(years, values)
  ];
}

// Desglose de Proyección Bottom-Up por Concepto
export function computeBottomUpConceptForecast(
  records: R20Record[],
  window: 'all' | 'post-gratuidad' | 'ultimos-5' = 'post-gratuidad'
): {
  concepts: R20ConceptForecast[];
  totalBottomUp2027: number;
  total2026: number;
  growthPct: number;
} {
  const conceptMap = new Map<string, { [year: number]: number }>();

  for (const r of records) {
    if (!conceptMap.has(r.concepto)) {
      conceptMap.set(r.concepto, {});
    }
    const yearObj = conceptMap.get(r.concepto)!;
    yearObj[r.vigencia] = (yearObj[r.vigencia] || 0) + r.totalRecaudo;
  }

  let total2026 = 0;
  let totalBottomUp2027 = 0;
  const resultList: R20ConceptForecast[] = [];

  for (const [concepto, yearData] of conceptMap.entries()) {
    const rec24 = yearData[2024] || 0;
    const rec25 = yearData[2025] || 0;
    const rec26 = yearData[2026] || 0;
    total2026 += rec26;

    const availableYears = Object.keys(yearData)
      .map(Number)
      .filter(y => (window === 'post-gratuidad' ? y >= 2021 : window === 'ultimos-5' ? y >= 2022 : true))
      .sort((a, b) => a - b);

    const values = availableYears.map(y => yearData[y] || 0);

    let projected = 0;
    let modelo = 'Inercial (IPC 7%)';

    if (values.length >= 3) {
      const wmaRes = runWMA(availableYears, values, 3);
      projected = wmaRes.projected2027;
      modelo = 'WMA-3';
    } else if (rec26 > 0) {
      projected = rec26 * 1.07;
    } else if (rec25 > 0) {
      projected = rec25 * 1.07;
    }

    const varPct = rec26 > 0 ? ((projected - rec26) / rec26) * 100 : 0;
    totalBottomUp2027 += projected;

    resultList.push({
      concepto,
      recaudo2024: rec24,
      recaudo2025: rec25,
      recaudo2026: rec26,
      recaudo2027Proyectado: projected,
      variacionPct: varPct,
      participacionPct: 0,
      tendencia: varPct > 2 ? 'up' : varPct < -2 ? 'down' : 'flat',
      modeloUsado: modelo
    });
  }

  resultList.sort((a, b) => b.recaudo2027Proyectado - a.recaudo2027Proyectado);

  const totalProj = totalBottomUp2027 > 0 ? totalBottomUp2027 : 1;
  for (const item of resultList) {
    item.participacionPct = (item.recaudo2027Proyectado / totalProj) * 100;
  }

  const growthPct = total2026 > 0 ? ((totalBottomUp2027 - total2026) / total2026) * 100 : 0;

  return {
    concepts: resultList,
    totalBottomUp2027,
    total2026,
    growthPct
  };
}

// Exportación a formato CSV de las proyecciones
export function exportProjectionCSV(
  models: R20ForecastModelResult[],
  concepts: R20ConceptForecast[],
  windowLabel: string
): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION DE INGRESOS RECURSOS PROPIOS (R20) - VIGENCIA 2027\n`;
  csvContent += `Ventana Temporal de Calibracion:;${windowLabel}\n\n`;

  csvContent += `MODELOS MATEMATICOS COMPARADOS\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion 2027 (Millones);Variacion vs 2026 (%);R2 (%);MAPE (%);RMSE;Limite Inferior 95%;Limite Superior 95%;Criterio\n`;
  for (const m of models) {
    csvContent += `"${m.modelName}";"${m.formula}";"${Math.round(m.projected2027)}";"${(m.projected2027 / 1e6).toFixed(2)}";"${m.variationPct.toFixed(2)}%";"${m.r2.toFixed(1)}%";"${m.mape.toFixed(2)}%";"${Math.round(m.rmse)}";"${Math.round(m.lowerBound95)}";"${Math.round(m.upperBound95)}";"${m.tag}"\n`;
  }

  csvContent += `\nDESGLOSE BOTTOM-UP POR CONCEPTO DE INGRESO\n`;
  csvContent += `Concepto;Recaudo 2024;Recaudo 2025;Recaudo 2026;Proyectado 2027 (COP);Proyectado 2027 (Millones);Variacion (%);Participacion (%);Modelo Utilizado\n`;
  for (const c of concepts) {
    csvContent += `"${c.concepto}";"${Math.round(c.recaudo2024)}";"${Math.round(c.recaudo2025)}";"${Math.round(c.recaudo2026)}";"${Math.round(c.recaudo2027Proyectado)}";"${(c.recaudo2027Proyectado / 1e6).toFixed(2)}";"${c.variacionPct.toFixed(2)}%";"${c.participacionPct.toFixed(1)}%";"${c.modeloUsado}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recursos_2027_R20_${windowLabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
