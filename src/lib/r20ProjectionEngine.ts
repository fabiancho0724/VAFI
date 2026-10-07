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

export interface R20ConceptMatrixRow {
  concepto: string;
  valoresPorAno: Record<number, number>;
  recaudo2024: number;
  recaudo2025: number;
  recaudo2026: number;
  proyeccion2027: number;
  variacionPct: number;
  participacionPct: number;
  modeloUtilizado: string;
}

export interface R20ConceptMatrixSummary {
  rows: R20ConceptMatrixRow[];
  totalesPorAno: Record<number, number>;
  total2026: number;
  totalProyeccion2027: number;
  variacionTotalPct: number;
  years: number[];
}

export interface R20UnitForecast {
  unidad: string;
  total2026: number;
  proyectado2027: number;
  variacionPct: number;
  participacionPct: number;
}

// Formateador de moneda en Millones de Pesos Colombianos ($ M)
export function formatCurrencyCOP(val: number): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '$ 0 M';
  const inM = val / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: maxDec })} M`;
}

// Formateador de moneda abreviado en Millones ($ M)
export function formatCurrencyShortCOP(val: number): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '$ 0 M';
  const inM = val / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  return `${sign}$ ${abs.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: maxDec })} M`;
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
          const parsedRecords: R20Record[] = [];
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

            parsedRecords.push({
              vigencia: parseInt(String(rawVigencia).trim(), 10),
              unidad: String(row['Unidad'] || '').trim(),
              concepto: String(row['Concepto'] || '').trim(),
              recurso: String(row['Recurso'] || '').trim(),
              totalRecaudo: val
            });
          }
          if (parsedRecords.length > 0) {
            resolve(parsedRecords);
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

// Carga de registros embebidos actualizados (124 registros consolidados)
export function loadFallbackRecords(): R20Record[] {
  return [{"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1343726253.73}, {"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1898046035.0}, {"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 260766280.96}, {"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1985686995.75}, {"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 37048760233.16}, {"vigencia": 2016, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 241955643.1}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1302091519.18}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2094709305.0}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 119272686.69}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1762643092.7}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 40999601501.97}, {"vigencia": 2017, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 207059726.61}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1530025280.13}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1820011341.48}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1282000.0}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2128226166.0}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 41198195063.81}, {"vigencia": 2018, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 218726469.12}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2462423225.54}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2857832220.0}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 12698010.0}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1865886048.0}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 40939631215.16}, {"vigencia": 2019, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 238926248.33}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 5916282478.43}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 431687489.0}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 14893651.0}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 629594566.0}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 27002706462.07}, {"vigencia": 2020, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 283173645.0}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2600687285.52}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 13292640.0}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 41634587.0}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2175710070.28}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 23768103097.52}, {"vigencia": 2021, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 187581217.0}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1132073001.83}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3277705450.0}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 284175567.0}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 680780694.0}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2722974181.9}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 16337771799.0}, {"vigencia": 2022, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 268231711.1}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2257961255.71}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3704413434.0}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 29896447.0}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2594558300.0}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 18344881215.0}, {"vigencia": 2023, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 304147066.89}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3928052683.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Indemnizaciones relacionadas con seguros no de vida", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 56265499.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Minerales; electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 166121321.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "No condicionadas a la adquisición de un activo", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 120000000.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3393625320.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Derechos de grado", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 961979248.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3021726000.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 7707403599.0}, {"vigencia": 2024, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 14983800.0}, {"vigencia": 2024, "unidad": "05 - CIENCIAS BASICAS", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 27144000.0}, {"vigencia": 2024, "unidad": "06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 24804000.0}, {"vigencia": 2024, "unidad": "07 - CIENCIAS DE LA SALUD", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 4914000.0}, {"vigencia": 2024, "unidad": "08 - CIENCIAS AGROPECUARIAS", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 7254000.0}, {"vigencia": 2024, "unidad": "09 - INGENIERIA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 159432000.0}, {"vigencia": 2024, "unidad": "10 - DERECHO Y CIENCIAS SOCIALES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 45396000.0}, {"vigencia": 2024, "unidad": "12 - SECCIONAL DUITAMA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 28548000.0}, {"vigencia": 2024, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 6435000.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Productos metálicos, maquinaria y equipo", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 6017390.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Sanciones administrativas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 29849852.0}, {"vigencia": 2024, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 227673982.19}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 54987450.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 4040183778.36}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Minerales; electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 152190175.0}, {"vigencia": 2025, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Minerales; electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 5130068.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "No condicionadas a la adquisición de un activo", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 66000000.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3476679736.0}, {"vigencia": 2025, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1482000.0}, {"vigencia": 2025, "unidad": "14 - SECCIONAL CHIQUINQUIRA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 142350.0}, {"vigencia": 2025, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 333900.0}, {"vigencia": 2025, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 524000.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Derechos de grado", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1012888550.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2564543800.0}, {"vigencia": 2025, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 14518000.0}, {"vigencia": 2025, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 427000.0}, {"vigencia": 2025, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 9394000.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 5009774442.0}, {"vigencia": 2025, "unidad": "05 - CIENCIAS BASICAS", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 38273600.0}, {"vigencia": 2025, "unidad": "06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 16912500.0}, {"vigencia": 2025, "unidad": "09 - INGENIERIA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 306263903.8}, {"vigencia": 2025, "unidad": "10 - DERECHO Y CIENCIAS SOCIALES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 42025000.0}, {"vigencia": 2025, "unidad": "12 - SECCIONAL DUITAMA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 49712500.0}, {"vigencia": 2025, "unidad": "13 - SECCIONAL SOGAMOSO", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 72262500.0}, {"vigencia": 2025, "unidad": "14 - SECCIONAL CHIQUINQUIRA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 256250.0}, {"vigencia": 2025, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 5129190.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Productos metálicos, maquinaria y equipo", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 9526385.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Sanciones administrativas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 46136691.0}, {"vigencia": 2025, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Sanciones administrativas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1087900.0}, {"vigencia": 2025, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 318870325.4}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Certificaciones y constancias", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 44343950.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2562971129.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Minerales; electricidad, gas y agua", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 83257428.34}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3761921076.0}, {"vigencia": 2026, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3624500.0}, {"vigencia": 2026, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1049000.0}, {"vigencia": 2026, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Pregrado - Certificaciones, constancias académicas y derechos complementarios", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 6720000.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Derechos de grado", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 736345940.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 1999282900.0}, {"vigencia": 2026, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 13655200.0}, {"vigencia": 2026, "unidad": "11 - ESTUDIOS TECNOLOGICOS Y A DISTANCIA", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 8403200.0}, {"vigencia": 2026, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Pregrado - Inscripciones", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 4989400.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3427328331.0}, {"vigencia": 2026, "unidad": "04 - CIENCIAS DE LA EDUCACION", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 2525510.0}, {"vigencia": 2026, "unidad": "05 - CIENCIAS BASICAS", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 25044900.0}, {"vigencia": 2026, "unidad": "06 - CIENCIAS ECONOMICAS, ADMINISTRATIVAS Y CONTABLES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 17773800.0}, {"vigencia": 2026, "unidad": "08 - CIENCIAS AGROPECUARIAS", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 4473300.0}, {"vigencia": 2026, "unidad": "09 - INGENIERIA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 152068530.0}, {"vigencia": 2026, "unidad": "10 - DERECHO Y CIENCIAS SOCIALES", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 43895900.0}, {"vigencia": 2026, "unidad": "12 - SECCIONAL DUITAMA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 53081900.0}, {"vigencia": 2026, "unidad": "13 - SECCIONAL SOGAMOSO", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 43043000.0}, {"vigencia": 2026, "unidad": "14 - SECCIONAL CHIQUINQUIRA", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 390000.0}, {"vigencia": 2026, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Pregrado - Matrículas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 3321030.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Productos metálicos, maquinaria y equipo", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 9307590.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Sanciones administrativas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 22520150.0}, {"vigencia": 2026, "unidad": "15 - SEDE REGIONAL AGUAZUL", "concepto": "Sanciones administrativas", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 777700.0}, {"vigencia": 2026, "unidad": "01 - ADMINISTRATIVA Y FINANCIERA", "concepto": "Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing", "recurso": "20-RECURSOS PROPIOS", "totalRecaudo": 155686148.94}];
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
  const se = rmse * 1.96;

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
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
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

// 3. Modelo ARIMA (1,1,0) Autorregresivo Integrado
export function runARIMA(years: number[], values: number[]): R20ForecastModelResult {
  const n = values.length;
  if (n < 3) return runOLS(years, values);

  // 1ra Diferenciación d=1: Δy_t = y_t - y_{t-1}
  const diff: number[] = [];
  for (let i = 1; i < n; i++) {
    diff.push(values[i] - values[i - 1]);
  }

  const m = diff.length - 1;
  let sumY = 0;
  let sumY_prev = 0;
  let sumYY_prev = 0;
  let sumY_prevSq = 0;

  for (let i = 1; i < diff.length; i++) {
    sumY += diff[i];
    sumY_prev += diff[i - 1];
    sumYY_prev += diff[i] * diff[i - 1];
    sumY_prevSq += diff[i - 1] * diff[i - 1];
  }

  const denom = m * sumY_prevSq - sumY_prev * sumY_prev;
  let phi = denom !== 0 ? (m * sumYY_prev - sumY_prev * sumY) / denom : 0;
  phi = Math.max(-0.95, Math.min(0.95, phi)); // Condición de estacionariedad
  const c = m > 0 ? (sumY - phi * sumY_prev) / m : 0;

  // Ajuste histórico (fitted)
  const fitted: number[] = [values[0]];
  for (let i = 1; i < n; i++) {
    if (i === 1) {
      fitted.push(values[1]);
    } else {
      const prevDiff = values[i - 1] - values[i - 2];
      const estDiff = c + phi * prevDiff;
      fitted.push(Math.max(0, values[i - 1] + estDiff));
    }
  }

  // Pronóstico 2027
  const lastDiff = diff[diff.length - 1];
  const nextDiff = c + phi * lastDiff;
  const projected2027 = Math.max(0, values[n - 1] + nextDiff);
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
    modelId: 'arima',
    modelName: 'ARIMA (1,1,0) Autorregresivo Integrado',
    shortName: 'ARIMA (1,1,0)',
    formula: `Δyₜ = ${formatCurrencyShortCOP(c)} + ${phi.toFixed(2)}·Δyₜ₋₁; ŷ₂₀₂₇ = y₂₀₂₆ + Δ̂y₂₀₂₇`,
    projected2027,
    variationPct,
    r2,
    mape,
    rmse,
    lowerBound95: Math.max(0, projected2027 - se),
    upperBound95: projected2027 + se,
    fitted: fittedSeries,
    tag: variationPct < -5 ? 'Conservador' : 'Moderado',
    interpretation: 'Aísla el componente de tendencia mediante diferenciación estocástica de primer orden y modela la inercia autorregresiva de la velocidad de cambio.',
    color: '#818cf8'
  };
}

// 4. Promedio Móvil Ponderado (WMA)
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

// 5. Tasa de Crecimiento Anual Compuesta (CAGR)
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

// 6. Regresión Polinomial de Segundo Grado (Cuadrática)
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

// 7. Regresión Logarítmica
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

// 8. Econométrico / Indexación Macroeconómica (MFMP)
export function runMacroeconomicModel(
  years: number[],
  values: number[],
  ipcTarget = 7.0,
  effortRate = 1.0
): R20ForecastModelResult {
  const n = values.length;
  const totalGrowthPct = ipcTarget + effortRate;
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

// Ejecuta todos los 8 modelos simultáneamente (incluyendo ARIMA)
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
    runARIMA(years, values),
    runLogarithmic(years, values),
    runPoly2(years, values),
    runWMA(years, values, 3),
    runOLS(years, values),
    runCAGR(years, values)
  ];
}

// Generación de Matriz Detallada Concepto a Concepto y Total R20
export function computeConceptMatrix(
  records: R20Record[],
  selectedWindow: 'all' | 'post-gratuidad' | 'ultimos-5' = 'post-gratuidad',
  inflationRate = 7.0
): R20ConceptMatrixSummary {
  const yearlySet = new Set<number>();
  for (const r of records) {
    yearlySet.add(r.vigencia);
  }

  let allYears = Array.from(yearlySet).sort((a, b) => a - b);
  if (selectedWindow === 'post-gratuidad') {
    allYears = allYears.filter(y => y >= 2021);
  } else if (selectedWindow === 'ultimos-5') {
    allYears = allYears.filter(y => y >= 2022);
  }

  const conceptMap = new Map<string, Record<number, number>>();
  const totalesPorAno: Record<number, number> = {};
  for (const y of allYears) {
    totalesPorAno[y] = 0;
  }

  for (const r of records) {
    if (!conceptMap.has(r.concepto)) {
      conceptMap.set(r.concepto, {});
    }
    const rowObj = conceptMap.get(r.concepto)!;
    rowObj[r.vigencia] = (rowObj[r.vigencia] || 0) + r.totalRecaudo;

    if (allYears.includes(r.vigencia)) {
      totalesPorAno[r.vigencia] = (totalesPorAno[r.vigencia] || 0) + r.totalRecaudo;
    }
  }

  let total2026 = totalesPorAno[2026] || 0;
  let totalProyeccion2027 = 0;
  const rows: R20ConceptMatrixRow[] = [];

  const factor = 1 + (inflationRate / 100);

  for (const [concepto, valMap] of conceptMap.entries()) {
    const rec24 = valMap[2024] || 0;
    const rec25 = valMap[2025] || 0;
    const rec26 = valMap[2026] || 0;

    let proj27 = 0;
    let modelo = `Indexado IPC (${inflationRate.toFixed(1)}%)`;

    if (rec26 > 0) {
      proj27 = rec26 * factor;
    } else if (rec25 > 0) {
      proj27 = rec25 * factor;
      modelo = `Referencia 2025 + IPC`;
    } else if (rec24 > 0) {
      proj27 = rec24 * factor;
      modelo = `Referencia 2024`;
    } else {
      proj27 = 0;
      modelo = `Sin Recaudo Reciente`;
    }

    const varPct = rec26 > 0 ? ((proj27 - rec26) / rec26) * 100 : (proj27 > 0 ? 100 : 0);
    totalProyeccion2027 += proj27;

    rows.push({
      concepto,
      valoresPorAno: valMap,
      recaudo2024: rec24,
      recaudo2025: rec25,
      recaudo2026: rec26,
      proyeccion2027: proj27,
      variacionPct: varPct,
      participacionPct: 0,
      modeloUtilizado: modelo
    });
  }

  // Ordenar de mayor a menor según proyección 2027
  rows.sort((a, b) => b.proyeccion2027 - a.proyeccion2027);

  // Calcular participación % de cada concepto
  const totP = totalProyeccion2027 > 0 ? totalProyeccion2027 : 1;
  for (const row of rows) {
    row.participacionPct = (row.proyeccion2027 / totP) * 100;
  }

  const variacionTotalPct = total2026 > 0
    ? ((totalProyeccion2027 - total2026) / total2026) * 100
    : 0;

  return {
    rows,
    totalesPorAno,
    total2026,
    totalProyeccion2027,
    variacionTotalPct,
    years: allYears
  };
}

// Desglose de Proyección Bottom-Up por Concepto (simplificado)
export function computeBottomUpConceptForecast(
  records: R20Record[],
  window: 'all' | 'post-gratuidad' | 'ultimos-5' = 'post-gratuidad'
): {
  concepts: R20ConceptForecast[];
  totalBottomUp2027: number;
  total2026: number;
  growthPct: number;
} {
  const matrix = computeConceptMatrix(records, window);
  const concepts: R20ConceptForecast[] = matrix.rows.map(r => ({
    concepto: r.concepto,
    recaudo2024: r.recaudo2024,
    recaudo2025: r.recaudo2025,
    recaudo2026: r.recaudo2026,
    recaudo2027Proyectado: r.proyeccion2027,
    variacionPct: r.variacionPct,
    participacionPct: r.participacionPct,
    tendencia: r.variacionPct > 1 ? 'up' : r.variacionPct < -1 ? 'down' : 'flat',
    modeloUsado: r.modeloUtilizado
  }));

  return {
    concepts,
    totalBottomUp2027: matrix.totalProyeccion2027,
    total2026: matrix.total2026,
    growthPct: matrix.variacionTotalPct
  };
}

// Exportación a formato CSV de las proyecciones y matriz
export function exportProjectionCSV(
  models: R20ForecastModelResult[],
  concepts: R20ConceptForecast[],
  windowLabel: string
): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION DE INGRESOS RECURSOS PROPIOS (R20) - VIGENCIA 2027\n`;
  csvContent += `Ventana Temporal de Calibracion:;${windowLabel}\n\n`;

  csvContent += `MODELOS MATEMATICOS COMPARADOS (INCLUYE ARIMA)\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion 2027 (Millones);Variacion vs 2026 (%);R2 (%);MAPE (%);RMSE;Limite Inferior 95%;Limite Superior 95%;Criterio\n`;
  for (const m of models) {
    csvContent += `"${m.modelName}";"${m.formula}";"${Math.round(m.projected2027)}";"${(m.projected2027 / 1e6).toFixed(2)}";"${m.variationPct.toFixed(2)}%";"${m.r2.toFixed(1)}%";"${m.mape.toFixed(2)}%";"${Math.round(m.rmse)}";"${Math.round(m.lowerBound95)}";"${Math.round(m.upperBound95)}";"${m.tag}"\n`;
  }

  csvContent += `\nDESGLOSE DETALLADO UNO A UNO POR CONCEPTO DE INGRESO Y TOTAL R20\n`;
  csvContent += `Concepto;Recaudo 2024;Recaudo 2025;Recaudo 2026;Proyectado 2027 (COP);Proyectado 2027 (Millones);Variacion (%);Participacion (%);Modelo Utilizado\n`;
  let sum24 = 0, sum25 = 0, sum26 = 0, sum27 = 0;
  for (const c of concepts) {
    sum24 += c.recaudo2024;
    sum25 += c.recaudo2025;
    sum26 += c.recaudo2026;
    sum27 += c.recaudo2027Proyectado;
    csvContent += `"${c.concepto}";"${Math.round(c.recaudo2024)}";"${Math.round(c.recaudo2025)}";"${Math.round(c.recaudo2026)}";"${Math.round(c.recaudo2027Proyectado)}";"${(c.recaudo2027Proyectado / 1e6).toFixed(2)}";"${c.variacionPct.toFixed(2)}%";"${c.participacionPct.toFixed(1)}%";"${c.modeloUsado}"\n`;
  }
  const totVar = sum26 > 0 ? ((sum27 - sum26) / sum26) * 100 : 0;
  csvContent += `"TOTAL GENERAL RECURSOS PROPIOS (R20)";"${Math.round(sum24)}";"${Math.round(sum25)}";"${Math.round(sum26)}";"${Math.round(sum27)}";"${(sum27 / 1e6).toFixed(2)}";"${totVar.toFixed(2)}%";"100.0%";"Consolidado Total"\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recursos_2027_R20_${windowLabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// RECURSO 21 - DEVOLUCIÓN IVA (INSTITUCIONES DE EDUCACIÓN SUPERIOR)
// ============================================================================

export const R21_HISTORICAL_RECORDS: R20Record[] = [
  { vigencia: 2016, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4390197920 },
  { vigencia: 2017, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 3562839475 },
  { vigencia: 2018, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 3754016152 },
  { vigencia: 2019, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 5219433295 },
  { vigencia: 2020, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 3972192702 },
  { vigencia: 2021, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4825577630 },
  { vigencia: 2022, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4727709282 },
  { vigencia: 2023, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4887893421 },
  { vigencia: 2024, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4000000000 },
  { vigencia: 2025, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 7981747901 },
  { vigencia: 2026, unidad: '01 - ADMINISTRATIVA Y FINANCIERA', concepto: 'Devolución IVA - Instituciones de Educación Superior', recurso: '21-Devolucion IVA', totalRecaudo: 4672202857 }
];

export async function fetchAndParseR21(): Promise<R20Record[]> {
  try {
    const res = await fetch('/data/Historico_R21_Devolucion_IVA.csv');
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const text = await res.text();

    return new Promise((resolve) => {
      Papa.parse<any>(text, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: (results) => {
          const parsedRecords: R20Record[] = [];
          for (const row of results.data) {
            const rawVigencia = row['Vigencia'] || row['vigencia'];
            const rawRecaudo = row['Total recaudo'] || row['total_recaudo'];
            if (!rawVigencia || !rawRecaudo) continue;

            const cleanStr = String(rawRecaudo)
              .replace(/\$/g, '')
              .replace(/\./g, '')
              .replace(/,/g, '.')
              .trim();
            const val = parseFloat(cleanStr);
            if (isNaN(val)) continue;

            parsedRecords.push({
              vigencia: parseInt(String(rawVigencia).trim(), 10),
              unidad: String(row['Unidad'] || '01 - ADMINISTRATIVA Y FINANCIERA').trim(),
              concepto: String(row['Concepto'] || 'Devolución IVA - Instituciones de Educación Superior').trim(),
              recurso: '21-Devolucion IVA',
              totalRecaudo: val
            });
          }
          if (parsedRecords.length > 0) {
            resolve(parsedRecords);
          } else {
            resolve(R21_HISTORICAL_RECORDS);
          }
        },
        error: () => resolve(R21_HISTORICAL_RECORDS)
      });
    });
  } catch (err) {
    return R21_HISTORICAL_RECORDS;
  }
}

// Exportación a CSV para R21
export function exportR21CSV(models: R20ForecastModelResult[], records: R20Record[]): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 21 - DEVOLUCION IVA (IES) - VIGENCIA 2027\n`;
  csvContent += `Concepto:;Devolución IVA - Instituciones de Educación Superior\n`;
  csvContent += `Marco Normativo:;Art. 92 Ley 30 de 1992 / Art. 481 Estatuto Tributario\n\n`;

  csvContent += `HISTORICO ANUAL 2016-2026\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M)\n`;
  for (const r of records) {
    csvContent += `"${r.vigencia}";"${r.unidad}";"${r.concepto}";"${r.recurso}";"${Math.round(r.totalRecaudo)}";"${(r.totalRecaudo / 1e6).toFixed(2)}"\n`;
  }

  csvContent += `\nMODELOS MATEMATICOS PROYECTADOS 2027\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion 2027 ($M);Variacion vs 2026 (%);R2 (%);MAPE (%);RMSE;Limite Inf 95%;Limite Sup 95%;Criterio\n`;
  for (const m of models) {
    csvContent += `"${m.modelName}";"${m.formula}";"${Math.round(m.projected2027)}";"${(m.projected2027 / 1e6).toFixed(2)}";"${m.variationPct.toFixed(2)}%";"${m.r2.toFixed(1)}%";"${m.mape.toFixed(2)}%";"${Math.round(m.rmse)}";"${Math.round(m.lowerBound95)}";"${Math.round(m.upperBound95)}";"${m.tag}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recurso_21_Devolucion_IVA_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 10.0 - APORTES DE LA NACIÓN (FUNCIONAMIENTO) - PGN 2027
// =========================================================================

export interface R10BaseComponent2026 {
  subRecurso: string;
  denominacion: string;
  recaudoEfectivo: number;
  ingresoFaltante: number;
  totalRecaudo: number;
  participacionPct: number;
}

export const R10_BASE_COMPONENTS_2026: R10BaseComponent2026[] = [
  {
    subRecurso: 'R10.0',
    denominacion: 'Aportes Nación – Funcionamiento (Base Certificada)',
    recaudoEfectivo: 238714266246,
    ingresoFaltante: 125295034367,
    totalRecaudo: 364009300613,
    participacionPct: 100.0
  }
];

export const BASE_FUNCIONAMIENTO_NACION_2026 = 371763051562; // 371.763.051.562 COP (Suma Base R10 + R17 + R18)
export const ASIGNADO_FUNCIONAMIENTO_PGN_2027 = 395704592082; // 395.704.592.082 COP
export const INCREMENTO_FUNCIONAMIENTO_NOMINAL_2027 = 23941540520; // +23.941.540.520 COP
export const TASA_AUMENTO_FUNCIONAMIENTO_PCT = 6.44; // +6.44%
export const FACTOR_AUMENTO_FUNCIONAMIENTO = 395704592082 / 371763051562; // 1.0643999999984055 (~1.06440000)

export const R10_BASE_TOTAL_2026 = 364009300613; // 364.009.300.613 COP (Base Certificada R10.0 Funcionamiento)
export const R10_SUBCUATRO_TOTAL_2026 = 336461905623;

export const R10_PROJECTION_6PCT_DATA = {
  vigencia: 2027,
  recurso: '10.0-Aportes Nacion - Funcionamiento',
  denominacion: 'Recurso 10.0 — Aportes de la Nación para Funcionamiento (+6,44% Calculado PGN)',
  basePresupuestal2026: 364009300613,
  baseR10Puro2026: 364009300613,
  baseCuatroComponentes2026: 364009300613,
  tasaAumentoPct: 6.44,
  factorAumento: 1.0643999999984055,
  proyeccion2027: 387451499572, // 364.009.300.613 * 1.06440000
  incrementoNominal: 23442198959, // +23.442.198.959 COP
  variacionPct: 6.44,
  notaAclaratoriaPolitica: 'La proyección de la vigencia 2027 para los sub-recursos 10.1, 10.2, 10.3 y 10.5 es $ 0 en todos los casos debido a que obedecen a políticas gubernamentales transitorias, existiendo incertidumbre sobre si para el 2027 estos planes del anterior Gobierno Nacional continuarán en vigencia. Por tal motivo sus valores no se proyectan de forma independiente ($ 0 COP). No obstante, los recursos que fueron entregados en el 2026 quedan indexados a la base presupuestal de funcionamiento ($ 364.009.300.613 COP) y constituirán el giro por Artículo 86 de la Ley 30 de 1992 para el funcionamiento (R10.0), el cual concentra el valor proyectado ($ 387.451.499.572 COP con el +6,44%).',
  desgloseComponentes: [
    {
      subRecurso: 'R10.0',
      denominacion: 'Aportes Nación – Funcionamiento (Art. 86 Ley 30)',
      base2026: 364009300613,
      proyeccion2027: 387451499572,
      incremento: 23442198959,
      pct: 6.44,
      indexado: false,
      nota: 'Concentra la totalidad del giro de funcionamiento Art. 86 con la tasa oficial calculada del +6,44%'
    },
    {
      subRecurso: 'R10.5',
      denominacion: 'Aportes Nación – Política de Gratuidad (Base)',
      base2026: 11208316954,
      proyeccion2027: 0,
      incremento: 0,
      pct: 0.0,
      indexado: true,
      nota: 'Proyección 2027: $ 0. Política gubernamental indexada a la base permanente Art. 86 (R10.0).'
    },
    {
      subRecurso: 'R10.1',
      denominacion: 'Aportes Nación – PIC Convencional',
      base2026: 7789060740,
      proyeccion2027: 0,
      incremento: 0,
      pct: 0.0,
      indexado: true,
      nota: 'Proyección 2027: $ 0. Política gubernamental transitoria sin proyección independiente; indexado a base Art. 86.'
    },
    {
      subRecurso: 'R10.2',
      denominacion: 'Aportes Nación – PIC Territorial',
      base2026: 3060211833,
      proyeccion2027: 0,
      incremento: 0,
      pct: 0.0,
      indexado: true,
      nota: 'Proyección 2027: $ 0. Política territorial transitoria sin proyección independiente; indexado a base Art. 86.'
    },
    {
      subRecurso: 'R10.3',
      denominacion: 'Aportes Nación – Procesos de fortalecimiento a la gestión',
      base2026: 2229170511,
      proyeccion2027: 0,
      incremento: 0,
      pct: 0.0,
      indexado: true,
      nota: 'Proyección 2027: $ 0. Recursos 2026 indexados al giro central Art. 86 (R10.0).'
    },
  ],
  pgn2027Referencia: 395704592082,
  diferenciaVsPGN: 395704592082 - 387451499572 // 8.253.092.510 COP (R17 + R18)
};

export interface RecursoNacionProyeccionRow {
  codigo: string;
  subRecurso: string;
  nombre: string;
  destinacion: string;
  marcoLegal: string;
  entidad: string;
  categoria: 'Base Presupuestal' | 'Fomento y Calidad' | 'Gratuidad' | 'Transferencia Especial';
  historico2024: number;
  historico2025: number;
  base2026: number;
  recaudoEfectivo2026: number;
  ingresoFaltante2026: number;
  tasaAumentoPct: number;
  proyeccion2027: number;
  incrementoNominal: number;
  participacion2027Pct: number;
  indexado?: boolean;
  notaAclaratoria?: string;
}

export const RECURSOS_NACION_FUNCIONAMIENTO_PROYECCIONES: RecursoNacionProyeccionRow[] = [
  {
    codigo: '10',
    subRecurso: 'R10.0',
    nombre: 'Aportes Nación – Funcionamiento',
    destinacion: 'Nómina docente, administrativa y gastos de operación central (Giro Unificado Art. 86 Ley 30)',
    marcoLegal: 'Ley 30/1992 Art. 86 / Res. MEN Anual',
    entidad: 'Ministerio de Educación Nacional (MEN)',
    categoria: 'Base Presupuestal',
    historico2024: 252310024180,
    historico2025: 274240602293,
    base2026: 364009300613,
    recaudoEfectivo2026: 364009300613,
    ingresoFaltante2026: 0,
    tasaAumentoPct: 6.44,
    proyeccion2027: 387451499572,
    incrementoNominal: 23442198959,
    participacion2027Pct: (387451499572 / 395704592082) * 100,
    indexado: false,
    notaAclaratoria: 'Componente 1 de Funcionamiento Nación: concentra el giro de funcionamiento Art. 86 con el +6,44%.'
  },
  {
    codigo: '17',
    subRecurso: 'R17',
    nombre: 'Devolución Descuento Electoral (Votación)',
    destinacion: 'Compensación a la Universidad por el 10% descuento por sufragio electoral',
    marcoLegal: 'Ley 403 de 1997 Arts. 1 y 2 / MinHacienda',
    entidad: 'Ministerio de Hacienda y Crédito Público',
    categoria: 'Transferencia Especial',
    historico2024: 4531561319,
    historico2025: 5183761916,
    base2026: 5643523903,
    recaudoEfectivo2026: 5643523903,
    ingresoFaltante2026: 0,
    tasaAumentoPct: 6.44,
    proyeccion2027: 6006966842,
    incrementoNominal: 363442939,
    participacion2027Pct: (6006966842 / 395704592082) * 100,
    notaAclaratoria: 'Componente 2 de Funcionamiento Nación: proyectado con la tasa oficial calculada del +6,44%.'
  },
  {
    codigo: '18',
    subRecurso: 'R18',
    nombre: 'Artículo 87 Ley 30/1992 (CESU)',
    destinacion: 'Fondo de Desarrollo Universitario / Acreditación Institucional',
    marcoLegal: 'Artículo 87 Ley 30 de 1992 / Consejo Nacional CESU',
    entidad: 'CESU / Ministerio de Educación Nacional',
    categoria: 'Transferencia Especial',
    historico2024: 1067037785,
    historico2025: 457065634,
    base2026: 2110227046,
    recaudoEfectivo2026: 2110227046,
    ingresoFaltante2026: 0,
    tasaAumentoPct: 6.44,
    proyeccion2027: 2246125668,
    incrementoNominal: 135898622,
    participacion2027Pct: (2246125668 / 395704592082) * 100,
    notaAclaratoria: 'Componente 3 de Funcionamiento Nación: proyectado con la tasa oficial calculada del +6,44%.'
  }
];

export const TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES = {
  historico2024: 257908623284,
  historico2025: 279881429843,
  base2026: 371763051562,
  tasaAumentoPct: 6.44,
  proyeccion2027: 395704592082,
  incrementoNominal: 23941540520,
  subtotalR10: {
    historico2024: 252310024180,
    historico2025: 274240602293,
    base2026: 364009300613,
    tasaAumentoPct: 6.44,
    proyeccion2027: 387451499572,
    incrementoNominal: 23442198959
  },
  subtotalR17: {
    historico2024: 4531561319,
    historico2025: 5183761916,
    base2026: 5643523903,
    tasaAumentoPct: 6.44,
    proyeccion2027: 6006966842,
    incrementoNominal: 363442939
  },
  subtotalR18: {
    historico2024: 1067037785,
    historico2025: 457065634,
    base2026: 2110227046,
    tasaAumentoPct: 6.44,
    proyeccion2027: 2246125668,
    incrementoNominal: 135898622
  },
  otrosRecursosNacion: {
    historico2024: 5598599104,
    historico2025: 5640827550,
    base2026: 7753750949,
    tasaAumentoPct: 6.44,
    proyeccion2027: 8253092510,
    incrementoNominal: 499341561
  }
};

export const PGN_2027_DATA = {
  vigencia: 2027,
  institucion: 'UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)',
  normaLegal: 'Proyecto / Ley de Presupuesto General de la Nación (PGN 2027)',
  funcionamientoR10: 395704592082, // A. PRESUPUESTO DE FUNCIONAMIENTO (R10 + R17 + R18)
  inversion: 8310959010,           // C. PRESUPUESTO DE INVERSIÓN (2202 Calidad y Fomento / 0700 Intersubsectorial)
  totalPresupuestoEjecutora: 404015551092, // TOTAL PRESUPUESTO UNIDAD EJECUTORA
  basePresupuestal2026: 371763051562, // Base Consolidada Funcionamiento Nación ($371.763M)
  variacionNominal: 395704592082 - 371763051562, // +23.941.540.520 COP
  variacionPct: ((395704592082 - 371763051562) / 371763051562) * 100, // +6.44%
  variacionVsR10Ordinario: 395704592082 - 364009300613, // +31.695.291.469 COP
  variacionVsR10OrdinarioPct: ((395704592082 - 364009300613) / 364009300613) * 100 // +8.71%
};

export interface R10HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'pgn2027' | 'proyeccion';
  notaNormativa: string;
}

export const R10_HISTORICAL_SERIES: R10HistoricalRecord[] = [
  {
    vigencia: 2016,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 118124822897,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Transferencia Legal Ley 30/1992 Art. 86'
  },
  {
    vigencia: 2017,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 131992813286,
    variacionAnualCOP: 13867990389,
    variacionAnualPct: 11.74,
    tipo: 'historico',
    notaNormativa: 'Ajuste IPC + Puntos Adicionales Nación'
  },
  {
    vigencia: 2018,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 139561046999,
    variacionAnualCOP: 7568233713,
    variacionAnualPct: 5.73,
    tipo: 'historico',
    notaNormativa: 'Transferencia Base Presupuestal'
  },
  {
    vigencia: 2019,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 149868926819,
    variacionAnualCOP: 10307879820,
    variacionAnualPct: 7.39,
    tipo: 'historico',
    notaNormativa: 'Acuerdos de Financiación Educación Superior'
  },
  {
    vigencia: 2020,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 166028418675,
    variacionAnualCOP: 16159491856,
    variacionAnualPct: 10.78,
    tipo: 'historico',
    notaNormativa: 'Aportes Funcionamiento + Medidas Emergencia'
  },
  {
    vigencia: 2021,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 171313529978,
    variacionAnualCOP: 5285111303,
    variacionAnualPct: 3.18,
    tipo: 'historico',
    notaNormativa: 'Aporte Ordinario Ley 30'
  },
  {
    vigencia: 2022,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 193437536665,
    variacionAnualCOP: 22124006687,
    variacionAnualPct: 12.91,
    tipo: 'historico',
    notaNormativa: 'Ajuste Salarial Docente y Administrativo'
  },
  {
    vigencia: 2023,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10-APORTE NACION',
    totalRecaudo: 228401208107,
    variacionAnualCOP: 34963671442,
    variacionAnualPct: 18.07,
    tipo: 'historico',
    notaNormativa: 'Ajuste Decreto Salarial + Adición Presupuestal'
  },
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    recurso: '10.0-Aportes Nacion - Funcionamiento',
    totalRecaudo: 252310024180,
    variacionAnualCOP: 23908816073,
    variacionAnualPct: 10.47,
    tipo: 'historico',
    notaNormativa: 'Aportes Ordinarios Funcionamiento'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Funcionamiento ($274.240M) + PIC Convencional ($10.081M) + PIC Territorial ($2.835M)',
    recurso: '10.0 + 10.1 + 10.2 Aportes Nación',
    totalRecaudo: 287156616808,
    variacionAnualCOP: 34846592628,
    variacionAnualPct: 13.81,
    tipo: 'historico',
    notaNormativa: 'Integración Funcionamiento Ordinario y Planes de Fomento (PIC)'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Base Presupuestal Funcionamiento Nación (R10.0)',
    recurso: '10.0-Aportes Nacion - Funcionamiento',
    totalRecaudo: 364009300613,
    variacionAnualCOP: 76852683805,
    variacionAnualPct: 26.76,
    tipo: 'base2026',
    notaNormativa: 'Base Presupuestal Certificada 2026 ($364.009.300.613 COP)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Nación Funcionamiento (Giro Art. 86 Ley 30)',
    recurso: '10.0-Aportes Nacion - Funcionamiento',
    totalRecaudo: 387451499572,
    variacionAnualCOP: 23442198959,
    variacionAnualPct: 6.44,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección Oficial Funcionamiento (+6,44% calculado sobre Base 2026 dentro del techo PGN 2027)'
  }
];

export function exportRecursosNacionProyeccionCSV(): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `BASE DE APORTES PARA FUNCIONAMIENTO NACION (R10, R17 Y R18) - PROYECCION 2027 (+6.44% PGN)\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Vigencia Proyectada:;2027\n`;
  csvContent += `Politica de Incremento:;+6.44% anual sobre Base 2026 ($371.763M -> $395.705M Asignado PGN 2027)\n`;
  csvContent += `Base Presupuestal 2026 Total (COP):;${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026}\n`;
  csvContent += `Proyeccion Total 2027 (+6.44%) (COP):;${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027}\n`;
  csvContent += `Incremento Nominal Total (COP):;+${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.incrementoNominal}\n\n`;
  csvContent += `NOTA ACLARATORIA OFICIAL:;"${R10_PROJECTION_6PCT_DATA.notaAclaratoriaPolitica}"\n\n`;

  csvContent += `DESGLOSE POR RECURSO DE FUNCIONAMIENTO NACION\n`;
  csvContent += `Codigo;Sub-Recurso;Nombre;Destinacion;Marco Legal;Entidad;Historico 2024 (COP);Historico 2025 (COP);Base 2026 (COP);Tasa Aumento (%);Incremento Nominal (COP);Proyeccion 2027 (COP);Participacion (%);Estado / Nota\n`;
  for (const r of RECURSOS_NACION_FUNCIONAMIENTO_PROYECCIONES) {
    const tasaStr = r.indexado ? '0.00% (Indexado a Base)' : `+${r.tasaAumentoPct.toFixed(2)}%`;
    csvContent += `"${r.codigo}";"${r.subRecurso}";"${r.nombre}";"${r.destinacion}";"${r.marcoLegal}";"${r.entidad}";"${r.historico2024}";"${r.historico2025}";"${r.base2026}";"${tasaStr}";"+${r.incrementoNominal}";"${r.proyeccion2027}";"${r.participacion2027Pct.toFixed(2)}%";"${r.notaAclaratoria || ''}"\n`;
  }
  csvContent += `"TOTAL FUNCIONAMIENTO NACION";"—";"TOTAL RECURSOS NACION FUNCIONAMIENTO (R10+R17+R18)";"Funcionamiento Global PGN";"—";"—";"${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2024}";"${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.historico2025}";"${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.base2026}";"+6.44%";"+${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.incrementoNominal}";"${TOTALES_NACION_FUNCIONAMIENTO_PROYECCIONES.proyeccion2027}";"100.00%";"Techo Legal Proyecto PGN 2027 Cumplido al 100%"\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Base_Aportes_Funcionamiento_Nacion_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportR10CSV(): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `RECURSO 10.0 - APORTES NACION (FUNCIONAMIENTO) - PROYECCION OFICIAL 2027 (+6.44%)\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Base Presupuestal 2026 (COP):;${R10_PROJECTION_6PCT_DATA.basePresupuestal2026}\n`;
  csvContent += `Tasa de Incremento Calculada PGN:;+${R10_PROJECTION_6PCT_DATA.tasaAumentoPct.toFixed(2)}%\n`;
  csvContent += `Incremento Nominal Calculado (+6.44%) (COP):;+${R10_PROJECTION_6PCT_DATA.incrementoNominal}\n`;
  csvContent += `Valor Proyectado R10.0 Vigencia 2027 (COP):;${R10_PROJECTION_6PCT_DATA.proyeccion2027}\n`;
  csvContent += `Referencia Techo Asignado PGN 2027 (COP):;${R10_PROJECTION_6PCT_DATA.pgn2027Referencia}\n`;
  csvContent += `Diferencia vs Techo PGN 2027 (R17+R18) (COP):;${R10_PROJECTION_6PCT_DATA.diferenciaVsPGN}\n\n`;
  csvContent += `NOTA ACLARATORIA OFICIAL:;"${R10_PROJECTION_6PCT_DATA.notaAclaratoriaPolitica}"\n\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Asignacion Fija PGN 2027 Funcionamiento (COP):;${PGN_2027_DATA.funcionamientoR10}\n`;
  csvContent += `Asignacion PGN 2027 Inversion (COP):;${PGN_2027_DATA.inversion}\n`;
  csvContent += `Total Presupuesto PGN Unidad Ejecutora (COP):;${PGN_2027_DATA.totalPresupuestoEjecutora}\n`;
  csvContent += `Base Presupuestal 2026 (COP):;${PGN_2027_DATA.basePresupuestal2026}\n`;
  csvContent += `Variacion Nominal vs Base 2026 (COP):;+${PGN_2027_DATA.variacionNominal}\n`;
  csvContent += `Variacion Porcentual vs Base 2026:;+${PGN_2027_DATA.variacionPct.toFixed(2)}%\n\n`;

  csvContent += `DESGLOSE BASE PRESUPUESTAL 2026 (COMPONENTES R10) Y PROYECCION 2027\n`;
  csvContent += `Sub-Recurso;Denominacion;Base 2026 (COP);Tasa Aumento;Incremento (COP);Proyeccion 2027 (COP);Estado / Nota\n`;
  for (const c of R10_PROJECTION_6PCT_DATA.desgloseComponentes) {
    const tasaStr = c.indexado ? '0.0% (Indexado a Base)' : `+${c.pct.toFixed(2)}% (Absorbe Base)`;
    csvContent += `"${c.subRecurso}";"${c.denominacion}";"${c.base2026}";"${tasaStr}";"+${c.incremento}";"${c.proyeccion2027}";"${c.nota || ''}"\n`;
  }
  csvContent += `"TOTAL R10.0";"Base Unificada R10";"${R10_PROJECTION_6PCT_DATA.basePresupuestal2026}";"+6.00%";"+${R10_PROJECTION_6PCT_DATA.incrementoNominal}";"${R10_PROJECTION_6PCT_DATA.proyeccion2027}";"Subtotal R10 Unificado"\n\n`;

  csvContent += `SERIE HISTORICA DE APORTES DE LA NACION (2016-2027)\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M);Variacion Anual (COP);Variacion Anual (%);Tipo;Marco Legal / Nota\n`;
  for (const h of R10_HISTORICAL_SERIES) {
    csvContent += `"${h.vigencia}";"${h.unidad}";"${h.concepto}";"${h.recurso}";"${h.totalRecaudo}";"${(h.totalRecaudo / 1e6).toFixed(2)}";"${h.variacionAnualCOP >= 0 ? '+' : ''}${h.variacionAnualCOP}";"${h.variacionAnualPct >= 0 ? '+' : ''}${h.variacionAnualPct.toFixed(2)}%";"${h.tipo}";"${h.notaNormativa}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Recurso_10_Aportes_Nacion_PGN_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 18 - ARTÍCULO 87 CESU
// =========================================================================

export interface R18HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'proyeccion';
  notaNormativa: string;
}

export const R18_HISTORICAL_SERIES: R18HistoricalRecord[] = [
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Art. 87 Ley 30 - CESU',
    recurso: '18-Articulo 87 CESU',
    totalRecaudo: 1067037785,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Transferencia Fondo Art. 87 Ley 30 / Acuerdo CESU'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Art. 87 Ley 30 - CESU',
    recurso: '18-Articulo 87 CESU',
    totalRecaudo: 457065634,
    variacionAnualCOP: -609972151,
    variacionAnualPct: -57.17,
    tipo: 'historico',
    notaNormativa: 'Giro Efectivo según distribución y puntaje de acreditación CESU'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Art. 87 Ley 30 - CESU',
    recurso: '18-Articulo 87 CESU',
    totalRecaudo: 2110227046,
    variacionAnualCOP: 1653161412,
    variacionAnualPct: 361.69,
    tipo: 'historico',
    notaNormativa: 'Recaudo de referencia base 2026 ($2.110.227.046 COP)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Art. 87 Ley 30 - CESU (Proyectado +6.44%)',
    recurso: '18-Articulo 87 CESU',
    totalRecaudo: 2246125668,
    variacionAnualCOP: 135898622,
    variacionAnualPct: 6.44,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección técnica con tasa calculada (+6,44%) sobre la base 2026'
  }
];

export const R18_BASE_2026 = 2110227046;

export const R18_PROJECTION_DATA = {
  vigencia: 2027,
  recurso: '18-Articulo 87 CESU',
  denominacion: 'Recurso 18 — Aportes Artículo 87 de la Ley 30 de 1992 (CESU)',
  base2026: 2110227046,
  tasaAumentoPct: 6.44,
  factorAumento: 1.0643999999984055,
  proyeccion2027: 2246125668, // 2.110.227.046 * 1.0644
  incrementoNominal: 135898622,
  recaudo2024: 1067037785,
  recaudo2025: 457065634,
  justificacion: 'Aplica el porcentaje de aumento calculado (+6,44%) sobre la base certificada de 2026 ($2.110.227.046 COP), garantizando el cumplimiento riguroso del techo global del PGN 2027 ($395.704.592.082 COP).'
};

export function exportR18CSV(): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 18 - ARTICULO 87 CESU - VIGENCIA 2027 (+6.44%)\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Base Recaudo 2026 (COP):;${R18_PROJECTION_DATA.base2026}\n`;
  csvContent += `Parametro Calculado PGN:;+${R18_PROJECTION_DATA.tasaAumentoPct.toFixed(2)}%\n`;
  csvContent += `Proyeccion 2027 (COP):;${R18_PROJECTION_DATA.proyeccion2027}\n`;
  csvContent += `Incremento Nominal (COP):;+${R18_PROJECTION_DATA.incrementoNominal}\n\n`;

  csvContent += `HISTORICO Y PROYECCION (2024-2027)\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M);Variacion Anual (COP);Variacion Anual (%);Tipo;Marco Legal / Criterio\n`;
  for (const h of R18_HISTORICAL_SERIES) {
    csvContent += `"${h.vigencia}";"${h.unidad}";"${h.concepto}";"${h.recurso}";"${h.totalRecaudo}";"${(h.totalRecaudo / 1e6).toFixed(2)}";"${h.variacionAnualCOP >= 0 ? '+' : ''}${h.variacionAnualCOP}";"${h.variacionAnualPct >= 0 ? '+' : ''}${h.variacionAnualPct.toFixed(2)}%";"${h.tipo}";"${h.notaNormativa}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recurso_18_Articulo_87_CESU_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 14 - POLÍTICA DE GRATUIDAD (LEY 2307 DE 2023 / FSE)
// =========================================================================

export interface R14HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'proyeccion';
  notaNormativa: string;
}

export interface R14ForecastModel {
  id: 'macro' | 'linear' | 'holt' | 'optimista';
  name: string;
  shortName: string;
  tag: 'Oficial Aprobado' | 'Tendencia Histórica' | 'Suavizado' | 'Expansión';
  formula: string;
  projected2027: number;
  incrementoNominal: number;
  variacionPct: number;
  r2?: number; // 0 a 100
  color: string;
  interpretation: string;
  isOfficial?: boolean;
}

export const R14_BASE_2026 = 49844177233;

export const R14_HISTORICAL_SERIES: R14HistoricalRecord[] = [
  {
    vigencia: 2021,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad en Matrícula',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 13614386270,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Inicio de política de gratuidad (Decreto 1667 de 2021 y Fondo Solidario para la Educación)'
  },
  {
    vigencia: 2022,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad en Matrícula',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 19265095526,
    variacionAnualCOP: 5650709256,
    variacionAnualPct: 41.51,
    tipo: 'historico',
    notaNormativa: 'Ampliación de cobertura a estudiantes de estratos 1, 2 y 3 de pregrado'
  },
  {
    vigencia: 2023,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad en Matrícula',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 23206355604,
    variacionAnualCOP: 3941260078,
    variacionAnualPct: 20.46,
    tipo: 'historico',
    notaNormativa: 'Consolidación de asignaciones previas a la expedición de ley permanente'
  },
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad "Puedo Estudiar"',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 37090700264,
    variacionAnualCOP: 13884344660,
    variacionAnualPct: 59.83,
    tipo: 'historico',
    notaNormativa: 'Entrada en vigor Ley 2307 de 2023 (eliminación de barrera de edad y gratuidad universal)'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad "Puedo Estudiar"',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 36210311946,
    variacionAnualCOP: -880388318,
    variacionAnualPct: -2.37,
    tipo: 'historico',
    notaNormativa: 'Liquidación de giros efectivos del MEN tras auditoría de derechos pecuniarios'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad "Puedo Estudiar" (Base Referencia)',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 49844177233,
    variacionAnualCOP: 13633865287,
    variacionAnualPct: 37.65,
    tipo: 'base2026',
    notaNormativa: 'Recaudo base certificado para proyecciones institucionales'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Política de Gratuidad "Puedo Estudiar" (Proyectado)',
    recurso: '14-Fondo Solidario de Educación - Gratuidad',
    totalRecaudo: 52834827867,
    variacionAnualCOP: 2990650634,
    variacionAnualPct: 6.00,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección institucional con parámetro macroeconómico oficial aprobado (+6,0%)'
  }
];

export const R14_FORECAST_MODELS: R14ForecastModel[] = [
  {
    id: 'macro',
    name: 'Parámetro Macroeconómico Aprobado (+6,0%)',
    shortName: 'Macro +6,0%',
    tag: 'Oficial Aprobado',
    formula: 'Recaudo 2026 × 1,060',
    projected2027: 52834827867,
    incrementoNominal: 2990650634,
    variacionPct: 6.00,
    color: '#06b6d4',
    interpretation: 'Alineado con el criterio macroeconómico institucional de prudencia presupuestal (+6,0%). Proporciona un piso de ingresos garantizado y defendible ante el Consejo Superior.',
    isOfficial: true
  },
  {
    id: 'linear',
    name: 'Regresión Lineal de Tendencia OLS',
    shortName: 'Lineal OLS (R²=94,7%)',
    tag: 'Tendencia Histórica',
    formula: 'y = 7.024.827.107 · t + 12.309.770.040',
    projected2027: 54458732681,
    incrementoNominal: 4614555448,
    variacionPct: 9.26,
    r2: 94.65,
    color: '#10b981',
    interpretation: 'Excelente ajuste estadístico (R² = 94,65%). Modela la trayectoria estructural de crecimiento continuo que la Ley 2307 ha impulsado en las universidades públicas.',
    isOfficial: false
  },
  {
    id: 'holt',
    name: 'Suavizamiento Exponencial Holt',
    shortName: 'Holt Suavizado',
    tag: 'Suavizado',
    formula: 'L_t = α·Y_t + (1-α)(L_{t-1} + T_{t-1}), α=0.5, β=0.3',
    projected2027: 53801708707,
    incrementoNominal: 3957531474,
    variacionPct: 7.94,
    color: '#8b5cf6',
    interpretation: 'Pondera dinámicamente la tendencia histórica amortiguando la corrección de 2025 y dando fuerte peso a la recuperación consolidada de 2026.',
    isOfficial: false
  },
  {
    id: 'optimista',
    name: 'Escenario de Expansión de Cobertura (+15,0%)',
    shortName: 'Expansión +15,0%',
    tag: 'Expansión',
    formula: 'Recaudo 2026 × 1,15',
    projected2027: 57320803818,
    incrementoNominal: 7476626585,
    variacionPct: 15.00,
    color: '#f59e0b',
    interpretation: 'Escenario contingente en caso de asignaciones extraordinarias del Ministerio de Educación Nacional por incremento neto en la matrícula pregradual elegible.',
    isOfficial: false
  }
];

export function exportR14CSV(selectedModelId: 'macro' | 'linear' | 'holt' | 'optimista' = 'macro'): void {
  const model = R14_FORECAST_MODELS.find(m => m.id === selectedModelId) || R14_FORECAST_MODELS[0];
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 14 - POLITICA DE GRATUIDAD (LEY 2307 DE 2023) - VIGENCIA 2027\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Modelo Seleccionado:;${model.name}\n`;
  csvContent += `Base Recaudo 2026 (COP):;${R14_BASE_2026}\n`;
  csvContent += `Tasa de Crecimiento Proyectada:;+${model.variacionPct.toFixed(2)}%\n`;
  csvContent += `Proyeccion 2027 (COP):;${model.projected2027}\n`;
  csvContent += `Incremento Nominal (COP):;+${model.incrementoNominal}\n\n`;

  csvContent += `MODELOS DE PROYECCION EVALUADOS 2027\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion ($M);Incremento (COP);Variacion (%);Ajuste R2;Criterio\n`;
  for (const m of R14_FORECAST_MODELS) {
    csvContent += `"${m.name}";"${m.formula}";"${m.projected2027}";"${(m.projected2027 / 1e6).toFixed(2)}";"+${m.incrementoNominal}";"+${m.variacionPct.toFixed(2)}%";"${m.r2 ? m.r2.toFixed(2) + '%' : 'N/A'}";"${m.interpretation}"\n`;
  }
  csvContent += `\n`;

  csvContent += `SERIE HISTORICA Y PROYECCION (2021-2027)\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M);Variacion Anual (COP);Variacion Anual (%);Tipo;Marco Legal / Nota\n`;
  for (const h of R14_HISTORICAL_SERIES) {
    const is2027 = h.vigencia === 2027;
    const recaudo = is2027 ? model.projected2027 : h.totalRecaudo;
    const varCOP = is2027 ? model.incrementoNominal : h.variacionAnualCOP;
    const varPct = is2027 ? model.variacionPct : h.variacionAnualPct;
    csvContent += `"${h.vigencia}";"${h.unidad}";"${h.concepto}";"${h.recurso}";"${recaudo}";"${(recaudo / 1e6).toFixed(2)}";"${varCOP >= 0 ? '+' : ''}${varCOP}";"${varPct >= 0 ? '+' : ''}${varPct.toFixed(2)}%";"${h.tipo}";"${h.notaNormativa}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recurso_14_Politica_Gratuidad_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 12 - ESTAMPILLA PRO-UNIVERSIDAD NACIONAL Y DEMÁS UNIVERSIDADES ESTATALES (LEY 1697/2013)
// =========================================================================

export interface R12HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'proyeccion';
  notaNormativa: string;
}

export interface R12ForecastModel {
  id: 'macro' | 'inercial' | 'wma' | 'media3' | 'media4' | 'linear';
  name: string;
  shortName: string;
  tag: 'Prudente Oficial' | 'Piso Conservador' | 'Ponderado WMA-3' | 'Media Trienal' | 'Media Cuatrienal' | 'Regresión OLS';
  formula: string;
  projected2027: number;
  incrementoNominal: number;
  variacionPct: number;
  color: string;
  interpretation: string;
  alertaRiesgo: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  isOfficial?: boolean;
}

export const R12_BASE_2026 = 9015915211;

export const R12_HISTORICAL_SERIES: R12HistoricalRecord[] = [
  {
    vigencia: 2015,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 1114259124,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Primeras recaudaciones tras reglamentación del Decreto 1050 de 2014 (Ley 1697 de 2013)'
  },
  {
    vigencia: 2016,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 637876220,
    variacionAnualCOP: -476382904,
    variacionAnualPct: -42.75,
    tipo: 'historico',
    notaNormativa: 'Mínimo histórico por demoras en giros centrales del Tesoro Nacional'
  },
  {
    vigencia: 2017,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 1187832041,
    variacionAnualCOP: 549955821,
    variacionAnualPct: 86.22,
    tipo: 'historico',
    notaNormativa: 'Recuperación de giros y consolidación de contratos de obra pública nacional'
  },
  {
    vigencia: 2018,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 1239505218,
    variacionAnualCOP: 51673177,
    variacionAnualPct: 4.35,
    tipo: 'historico',
    notaNormativa: 'Estabilidad de transferencias MEN según fórmula de distribución'
  },
  {
    vigencia: 2019,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 2482644000,
    variacionAnualCOP: 1243138782,
    variacionAnualPct: 100.29,
    tipo: 'historico',
    notaNormativa: 'Duplicación del recaudo por expansión en proyectos de infraestructura estatal'
  },
  {
    vigencia: 2020,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 5191760490,
    variacionAnualCOP: 2709116490,
    variacionAnualPct: 109.12,
    tipo: 'historico',
    notaNormativa: 'Incremento sostenido en la bolsa nacional de recaudo tributario'
  },
  {
    vigencia: 2021,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 5511333435,
    variacionAnualCOP: 319572945,
    variacionAnualPct: 6.16,
    tipo: 'historico',
    notaNormativa: 'Consolidación de indicadores de investigación y cobertura UPTC'
  },
  {
    vigencia: 2022,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 4289903167,
    variacionAnualCOP: -1221430268,
    variacionAnualPct: -22.16,
    tipo: 'historico',
    notaNormativa: 'Ajuste cíclico por menor liquidación de contratos en cierre de gobierno'
  },
  {
    vigencia: 2023,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 13869174796,
    variacionAnualCOP: 9579271629,
    variacionAnualPct: 223.30,
    tipo: 'historico',
    notaNormativa: 'Pico atípico por liquidación y giro acumulado de megaobras nacionales'
  },
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 6431335851,
    variacionAnualCOP: -7437838945,
    variacionAnualPct: -53.63,
    tipo: 'historico',
    notaNormativa: 'Corrección post-pico del ciclo de ejecución contractual'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 14785650242,
    variacionAnualCOP: 8354314391,
    variacionAnualPct: 129.90,
    tipo: 'historico',
    notaNormativa: 'Máximo histórico por recaudo extraordinario de contratos de infraestructura 4G/5G'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia (Base Referencia)',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 9015915211,
    variacionAnualCOP: -5769735031,
    variacionAnualPct: -39.02,
    tipo: 'base2026',
    notaNormativa: 'Base real certificada 2026 ($9.015.915.211 COP)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia (Proyectado)',
    recurso: '12-Estampillas Otras Universidades',
    totalRecaudo: 9556870124,
    variacionAnualCOP: 540954913,
    variacionAnualPct: 6.00,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección prudente con parámetro macroeconómico oficial (+6,0%) sobre la base real de 2026 ($9.015.915.211 COP)'
  }
];

export const R12_FORECAST_MODELS: R12ForecastModel[] = [
  {
    id: 'macro',
    name: 'Base Prudente Macroeconómica (+6,0%)',
    shortName: 'Macro +6,0% (Base Real)',
    tag: 'Prudente Oficial',
    formula: 'Recaudo 2026 × 1,060',
    projected2027: 9556870124,
    incrementoNominal: 540954913,
    variacionPct: 6.00,
    color: '#06b6d4',
    interpretation: 'Aplica el parámetro macroeconómico oficial (+6,0%) sobre la base real de 2026 ($9.015.915.211 COP). Proporciona un piso de recaudo seguro para el anteproyecto presupuestal sin sobreestimar la contratación nacional.',
    alertaRiesgo: 'Bajo Riesgo. La opción más prudente y técnicamente recomendada para el anteproyecto presupuestal.',
    riskLevel: 'bajo',
    isOfficial: true
  },
  {
    id: 'inercial',
    name: 'Piso Inercial Estricto (0,0% / Base 2026)',
    shortName: 'Piso Inercial ($9.016M)',
    tag: 'Piso Conservador',
    formula: 'Recaudo 2026 (Crecimiento Cero)',
    projected2027: 9015915211,
    incrementoNominal: 0,
    variacionPct: 0.00,
    color: '#64748b',
    interpretation: 'Mantiene plano el valor de 2026 ($9.015.915.211 COP) como suelo defensivo ante posibles retrasos en la liquidación de contratos por parte de entidades estatales.',
    alertaRiesgo: 'Riesgo Nulo de Déficit. Presupuesto ultra-defensivo.',
    riskLevel: 'bajo',
    isOfficial: false
  },
  {
    id: 'wma',
    name: 'Promedio Ponderado Trienal (WMA-3 Ponderación 3:2:1)',
    shortName: 'WMA-3 Ponderado',
    tag: 'Ponderado WMA-3',
    formula: '(9.016M·3 + 14.786M·2 + 6.431M·1) / 6',
    projected2027: 10508396995,
    incrementoNominal: 1492481784,
    variacionPct: 16.55,
    color: '#eab308',
    interpretation: 'Pondera con 50% la base 2026 ($9.016M), 33,3% el pico de 2025 ($14.786M) y 16,7% el año 2024 ($6.431M), equilibrando la volatilidad reciente.',
    alertaRiesgo: 'Riesgo Moderado. Depende de que el recaudo nacional de obra pública mantenga dinamismo superior a $10.000M.',
    riskLevel: 'medio',
    isOfficial: false
  },
  {
    id: 'media3',
    name: 'Media de Estabilidad Trienal (2024–2026)',
    shortName: 'Media Trienal',
    tag: 'Media Trienal',
    formula: '(6.431M + 14.786M + 9.016M) / 3',
    projected2027: 10077633768,
    incrementoNominal: 1061718557,
    variacionPct: 11.78,
    color: '#3b82f6',
    interpretation: 'Promedio simple de los tres últimos años fiscales ($10.077,6M), suavizando las fluctuaciones abruptas observadas entre 2024 y 2025.',
    alertaRiesgo: 'Riesgo Moderado. Recomendable si se esperan niveles normales de contratación estatal.',
    riskLevel: 'medio',
    isOfficial: false
  },
  {
    id: 'media4',
    name: 'Media Cuatrienal (2023–2026)',
    shortName: 'Media Cuatrienal',
    tag: 'Media Cuatrienal',
    formula: '(13.869M + 6.431M + 14.786M + 9.016M) / 4',
    projected2027: 11025519025,
    incrementoNominal: 2009603814,
    variacionPct: 22.29,
    color: '#a855f7',
    interpretation: 'Media aritmética que absorbe el bienio expansivo 2023 y 2025 junto con los años moderados 2024 y 2026.',
    alertaRiesgo: 'Riesgo Medio-Alto. Podría generar desbalance si el recaudo nacional se sitúa por debajo de $11.000M.',
    riskLevel: 'medio',
    isOfficial: false
  },
  {
    id: 'linear',
    name: 'Regresión Lineal de Tendencia OLS (2015–2026)',
    shortName: 'Regresión OLS (R²=68,8%)',
    tag: 'Regresión OLS',
    formula: 'Pendiente +$1.118M/año (OLS 12 vigencias)',
    projected2027: 12748911456,
    incrementoNominal: 3732996245,
    variacionPct: 41.40,
    color: '#ec4899',
    interpretation: 'Modela la tendencia alcista de largo plazo de la estampilla (+41,40% vs 2026). Requiere ejecución de megaproyectos viales e hidroeléctricos del orden nacional.',
    alertaRiesgo: 'Alto Riesgo de Déficit. Proyección altamente optimista no aconsejable para gastos recurrentes.',
    riskLevel: 'alto',
    isOfficial: false
  }
];

export const R12_DESCRIPTIVE_STATS = {
  n: 12,
  media: 5479765816,
  mediana: 4740831828,
  desvEstandar: 4859629718,
  coeficienteVariacionPct: 88.68,
  minimo: 637876220,
  minimoAnio: 2016,
  maximo: 14785650242,
  maximoAnio: 2025,
  cagrPct: 20.93,
  tendenciaAnualCOP: 1118330098,
  r2Pct: 68.8
};

export function exportR12CSV(selectedModelId: string): void {
  const model = R12_FORECAST_MODELS.find(m => m.id === selectedModelId) || R12_FORECAST_MODELS[0];
  let csv = '\uFEFF';
  csv += 'UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n';
  csv += 'VICERRECTORIA ADMINISTRATIVA Y FINANCIERA (VAFI)\n';
  csv += 'CERTIFICADO DE PROYECCION PRESUPUESTAL RECURSO 12 - VIGENCIA 2027\n';
  csv += 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia (Ley 1697 de 2013)\n';
  csv += `Fecha de Generación:;${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}\n`;
  csv += `Modelo Seleccionado:;${model.name}\n`;
  csv += `Base Real 2026:;$ ${R12_BASE_2026.toLocaleString('es-CO')}\n`;
  csv += `Proyección 2027:;$ ${model.projected2027.toLocaleString('es-CO')}\n`;
  csv += `Incremento Nominal:;$ ${model.incrementoNominal.toLocaleString('es-CO')};Variación:;+${model.variacionPct.toFixed(2)}%\n\n`;
  csv += 'Vigencia;Unidad;Concepto Presupuestal;Recurso;Total Recaudo (COP);Cifra en Millones ($M);Variación Anual (COP);Variación Anual (%);Tipo de Registro;Nota Normativa\n';

  for (const r of R12_HISTORICAL_SERIES) {
    const isProy = r.tipo === 'proyeccion';
    const recaudo = isProy ? model.projected2027 : r.totalRecaudo;
    const varCop = isProy ? model.incrementoNominal : r.variacionAnualCOP;
    const varPct = isProy ? model.variacionPct : r.variacionAnualPct;
    const millones = (recaudo / 1e6).toFixed(2);

    csv += `${r.vigencia};"${r.unidad}";"${r.concepto}";"${r.recurso}";` +
      `$ ${recaudo.toLocaleString('es-CO')};$ ${millones}M;` +
      `$ ${varCop.toLocaleString('es-CO')};${varPct >= 0 ? '+' : ''}${varPct.toFixed(2)}%;` +
      `"${r.tipo.toUpperCase()}";"${r.notaNormativa}"\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Certificado_Proyeccion_R12_Estampilla_UNAL_2027_${model.id}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 13 - EXCEDENTES FINANCIEROS DE COOPERATIVAS (ART. 142 LEY 1819/2016)
// =========================================================================

export interface R13HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'proyeccion';
  notaNormativa: string;
}

export interface R13ForecastModel {
  id: 'macro' | 'inercial' | 'wma' | 'media';
  name: string;
  shortName: string;
  tag: 'Prudente Oficial' | 'Piso Conservador' | 'Ponderado WMA-3' | 'Media Cuatrienal';
  formula: string;
  projected2027: number;
  incrementoNominal: number;
  variacionPct: number;
  color: string;
  interpretation: string;
  alertaRiesgo: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  isOfficial?: boolean;
}

export const R13_BASE_2026 = 1621800000;

export const R13_HISTORICAL_SERIES: R13HistoricalRecord[] = [
  {
    vigencia: 2019,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 900973803,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Primeras transferencias bajo el Art. 142 de la Ley 1819 de 2016 (Reforma Tributaria)'
  },
  {
    vigencia: 2020,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 2208758036,
    variacionAnualCOP: 1307784233,
    variacionAnualPct: 145.15,
    tipo: 'historico',
    notaNormativa: 'Liquidación acumulada de declaraciones tributarias del sector solidario'
  },
  {
    vigencia: 2021,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 1315131132,
    variacionAnualCOP: -893626904,
    variacionAnualPct: -40.46,
    tipo: 'historico',
    notaNormativa: 'Contracción económica derivada de la pandemia en las utilidades de cooperativas'
  },
  {
    vigencia: 2022,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 4431510384,
    variacionAnualCOP: 3116379252,
    variacionAnualPct: 236.96,
    tipo: 'historico',
    notaNormativa: 'Pico atípico extraordinario por resoluciones represadas de la DIAN y sector financiero solidario'
  },
  {
    vigencia: 2023,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 1867826108,
    variacionAnualCOP: -2563684276,
    variacionAnualPct: -57.85,
    tipo: 'historico',
    notaNormativa: 'Normalización post-pico de las transferencias tributarias cooperativas'
  },
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 2078952994,
    variacionAnualCOP: 211126886,
    variacionAnualPct: 11.30,
    tipo: 'historico',
    notaNormativa: 'Consolidación del recaudo regular del 20% del gravamen cooperativo'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 2080840690,
    variacionAnualCOP: 1887696,
    variacionAnualPct: 0.09,
    tipo: 'historico',
    notaNormativa: 'Vigencia de estabilidad máxima del recaudo ordinario (~$2.081M)'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016 (Base Referencia)',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 1621800000,
    variacionAnualCOP: -459040690,
    variacionAnualPct: -22.06,
    tipo: 'base2026',
    notaNormativa: 'Base real certificada 2026 ($1.621.800.000 COP)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016 (Proyectado)',
    recurso: '13-Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    totalRecaudo: 1719108000,
    variacionAnualCOP: 97308000,
    variacionAnualPct: 6.00,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección prudente con parámetro macroeconómico oficial (+6,0%) sobre la base real de 2026 ($1.621.800.000 COP)'
  }
];

export const R13_FORECAST_MODELS: R13ForecastModel[] = [
  {
    id: 'macro',
    name: 'Base Prudente Macroeconómica (+6,0%)',
    shortName: 'Macro +6,0% (Base Real)',
    tag: 'Prudente Oficial',
    formula: 'Recaudo 2026 × 1,060',
    projected2027: 1719108000,
    incrementoNominal: 97308000,
    variacionPct: 6.00,
    color: '#f97316',
    interpretation: 'Aplica la indexación macroeconómica (+6,0%) sobre la base real certificada de 2026 ($1.621.800.000 COP). Proporciona un piso de recaudo seguro para el anteproyecto presupuestal.',
    alertaRiesgo: 'Bajo Riesgo. La opción más prudente para formular el anteproyecto de presupuesto.',
    riskLevel: 'bajo',
    isOfficial: true
  },
  {
    id: 'inercial',
    name: 'Piso Inercial Estricto (0,0% / Base 2026)',
    shortName: 'Piso Inercial ($1.622M)',
    tag: 'Piso Conservador',
    formula: 'Recaudo 2026 (Crecimiento Cero)',
    projected2027: 1621800000,
    incrementoNominal: 0,
    variacionPct: 0.00,
    color: '#ef4444',
    interpretation: 'Mantiene plano el valor de 2026 ($1.621.800.000 COP) sin asumir recuperación en los excedentes de las cooperativas.',
    alertaRiesgo: 'Riesgo Nulo de Déficit. Presupuesto ultra-defensivo.',
    riskLevel: 'bajo',
    isOfficial: false
  },
  {
    id: 'wma',
    name: 'Promedio Ponderado Trienal (WMA-3 Ponderación 3:2:1)',
    shortName: 'WMA-3 Ponderado',
    tag: 'Ponderado WMA-3',
    formula: '(1.622M·3 + 2.081M·2 + 2.079M·1) / 6',
    projected2027: 1851005729,
    incrementoNominal: 229205729,
    variacionPct: 14.13,
    color: '#eab308',
    interpretation: 'Asigna el 50% de peso a la vigencia de 2026 y el 50% restante a la estabilidad de 2024-2025.',
    alertaRiesgo: 'Riesgo Moderado. Requiere repunte del sector solidario.',
    riskLevel: 'medio',
    isOfficial: false
  },
  {
    id: 'media',
    name: 'Media de Estabilidad Cuatrienal (2023–2026)',
    shortName: 'Media Cuatrienal',
    tag: 'Media Cuatrienal',
    formula: 'Promedio(2023, 2024, 2025, 2026)',
    projected2027: 1912354948,
    incrementoNominal: 290554948,
    variacionPct: 17.92,
    color: '#a855f7',
    interpretation: 'Promedia las cuatro vigencias posteriores al shock atípico de 2022.',
    alertaRiesgo: 'Riesgo Alto. Puede revivir la brecha presupuestal si el sector no repunta.',
    riskLevel: 'alto',
    isOfficial: false
  }
];

export function exportR13CSV(selectedModelId: 'macro' | 'inercial' | 'wma' | 'media' = 'macro'): void {
  const model = R13_FORECAST_MODELS.find(m => m.id === selectedModelId) || R13_FORECAST_MODELS[0];
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 13 - EXCEDENTES COOPERATIVAS ART.142, LEY 1819 DEL 2016 - VIGENCIA 2027\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Modelo Seleccionado:;${model.name}\n`;
  csvContent += `Base Recaudo 2026 (COP):;${R13_BASE_2026}\n`;
  csvContent += `Variacion vs Recaudo 2026:;+${model.variacionPct.toFixed(2)}%\n`;
  csvContent += `Proyeccion 2027 (COP):;${model.projected2027}\n`;
  csvContent += `Incremento Nominal (COP):;+${model.incrementoNominal}\n`;
  csvContent += `Evaluacion de Riesgo de Caja:;${model.alertaRiesgo}\n\n`;

  csvContent += `MODELOS DE PROYECCION EVALUADOS 2027\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion ($M);Incremento (COP);Variacion (%);Evaluacion de Riesgo;Criterio\n`;
  for (const m of R13_FORECAST_MODELS) {
    csvContent += `"${m.name}";"${m.formula}";"${m.projected2027}";"${(m.projected2027 / 1e6).toFixed(2)}";"+${m.incrementoNominal}";"+${m.variacionPct.toFixed(2)}%";"${m.alertaRiesgo}";"${m.interpretation}"\n`;
  }
  csvContent += `\n`;

  csvContent += `SERIE HISTORICA Y PROYECCION (2019-2027)\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M);Variacion Anual (COP);Variacion Anual (%);Tipo;Marco Legal / Nota\n`;
  for (const h of R13_HISTORICAL_SERIES) {
    const is2027 = h.vigencia === 2027;
    const recaudo = is2027 ? model.projected2027 : h.totalRecaudo;
    const varCOP = is2027 ? model.incrementoNominal : h.variacionAnualCOP;
    const varPct = is2027 ? model.variacionPct : h.variacionAnualPct;
    csvContent += `"${h.vigencia}";"${h.unidad}";"${h.concepto}";"${h.recurso}";"${recaudo}";"${(recaudo / 1e6).toFixed(2)}";"${varCOP >= 0 ? '+' : ''}${varCOP}";"${varPct >= 0 ? '+' : ''}${varPct.toFixed(2)}%";"${h.tipo}";"${h.notaNormativa}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recurso_13_Excedentes_Cooperativas_Art142_Ley1819_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// RECURSO 17 - DEVOLUCIÓN DE DESCUENTO POR VOTACIÓN (LEY 403/1997 Y LEY 815/2003)
// =========================================================================

export interface R17HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'proyeccion';
  notaNormativa: string;
}

export interface R17ForecastModel {
  id: 'macro' | 'inercial' | 'wma' | 'media';
  name: string;
  shortName: string;
  tag: 'Oficial Aprobado' | 'Piso Inercial' | 'Ponderado WMA-3' | 'Media Trienal';
  formula: string;
  projected2027: number;
  incrementoNominal: number;
  variacionPct: number;
  color: string;
  interpretation: string;
  alertaRiesgo: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  isOfficial?: boolean;
}

export const R17_BASE_2026 = 5643523903;

export const R17_HISTORICAL_SERIES: R17HistoricalRecord[] = [
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolución Descuento por Votación',
    recurso: '17-Devolución Descuento por Votación',
    totalRecaudo: 4531561319,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Reembolso liquidado por el MHCP por sufragantes comicios territoriales e institucionales (Arts. 1 y 2 Ley 403 de 1997)'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolución Descuento por Votación',
    recurso: '17-Devolución Descuento por Votación',
    totalRecaudo: 5183761916,
    variacionAnualCOP: 652200597,
    variacionAnualPct: 14.39,
    tipo: 'historico',
    notaNormativa: 'Pico de recaudo por alta afluencia de certificados de votación vigentes y ajuste de liquidación (+14,39%)'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolución Descuento por Votación (Base Referencia)',
    recurso: '17-Devolución Descuento por Votación',
    totalRecaudo: 5643523903,
    variacionAnualCOP: 459761987,
    variacionAnualPct: 8.87,
    tipo: 'base2026',
    notaNormativa: 'Recaudo base certificado para proyecciones institucionales 2026 ($5.643.523.903 COP)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolución Descuento por Votación (Proyectado)',
    recurso: '17-Devolución Descuento por Votación',
    totalRecaudo: 6006966842,
    variacionAnualCOP: 363442939,
    variacionAnualPct: 6.44,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección oficial calculada (+6,44%) sobre la base real de 2026 dentro del techo PGN 2027'
  }
];

export const R17_FORECAST_MODELS: R17ForecastModel[] = [
  {
    id: 'macro',
    name: 'Aumento Calculado Funcionamiento PGN (+6,44%)',
    shortName: 'Calculado +6,44% (Base Real)',
    tag: 'Oficial Aprobado',
    formula: 'Recaudo 2026 × 1,0644',
    projected2027: 6006966842,
    incrementoNominal: 363442939,
    variacionPct: 6.44,
    color: '#0284c7',
    interpretation: 'Aplica el porcentaje de aumento calculado (+6,44%) sobre la base de 2026 ($5.643.523.903 COP), asegurando el cierre exacto dentro del techo global del PGN 2027 ($395.704.592.082 COP).',
    alertaRiesgo: 'Bajo Riesgo. Modelo oficial armónico con el techo de funcionamiento.',
    riskLevel: 'bajo',
    isOfficial: true
  },
  {
    id: 'inercial',
    name: 'Piso Inercial Estricto (0,0% / Base 2026)',
    shortName: 'Piso Inercial ($5.644M)',
    tag: 'Piso Inercial',
    formula: 'Recaudo 2026 (Crecimiento Cero)',
    projected2027: 5643523903,
    incrementoNominal: 0,
    variacionPct: 0.00,
    color: '#64748b',
    interpretation: 'Escenario de estrés sin ajuste nominal. Mantiene el valor exacto reconocido en 2026 ante una eventual restricción fiscal del orden nacional.',
    alertaRiesgo: 'Riesgo Nulo de Desfase. Presupuesto ultra-defensivo de caja.',
    riskLevel: 'bajo',
    isOfficial: false
  },
  {
    id: 'wma',
    name: 'Promedio Móvil Ponderado Trienal (WMA-3 Ponderación 3:2:1)',
    shortName: 'WMA-3 Ponderado',
    tag: 'Ponderado WMA-3',
    formula: '(5.644M·3 + 5.184M·2 + 4.532M·1) / 6',
    projected2027: 5305436666,
    incrementoNominal: -338087237,
    variacionPct: -5.99,
    color: '#f59e0b',
    interpretation: 'Pondera con 50% de peso la base 2026, 33,3% a 2025 y 16,7% a 2024, mitigando la oscilación entre comicios electorales.',
    alertaRiesgo: 'Bajo Riesgo. Modelo estadístico ponderado de suavizamiento.',
    riskLevel: 'bajo',
    isOfficial: false
  },
  {
    id: 'media',
    name: 'Media Trienal Histórica (2024–2026)',
    shortName: 'Media Trienal ($5.120M)',
    tag: 'Media Trienal',
    formula: 'Promedio(2024, 2025, 2026)',
    projected2027: 5119612379,
    incrementoNominal: -523911524,
    variacionPct: -9.28,
    color: '#a855f7',
    interpretation: 'Promedio aritmético simple de los tres años de datos oficiales disponibles en la UPTC.',
    alertaRiesgo: 'Bajo Riesgo. Proyección conservadora.',
    riskLevel: 'bajo',
    isOfficial: false
  }
];

export function exportR17CSV(selectedModelId: 'macro' | 'inercial' | 'wma' | 'media' = 'macro'): void {
  const model = R17_FORECAST_MODELS.find(m => m.id === selectedModelId) || R17_FORECAST_MODELS[0];
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 17 - DEVOLUCION DESCUENTO POR VOTACION (LEY 403/1997 Y 815/2003) - VIGENCIA 2027\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Modelo Seleccionado:;${model.name}\n`;
  csvContent += `Base Recaudo 2026 (COP):;${R17_BASE_2026}\n`;
  csvContent += `Variacion vs Recaudo 2026:;+${model.variacionPct.toFixed(2)}%\n`;
  csvContent += `Proyeccion 2027 (COP):;${model.projected2027}\n`;
  csvContent += `Incremento Nominal (COP):;+${model.incrementoNominal}\n`;
  csvContent += `Evaluacion de Riesgo de Caja:;${model.alertaRiesgo}\n\n`;

  csvContent += `MODELOS DE PROYECCION EVALUADOS 2027\n`;
  csvContent += `Modelo;Formula;Proyeccion 2027 (COP);Proyeccion ($M);Incremento (COP);Variacion (%);Evaluacion de Riesgo;Criterio\n`;
  for (const m of R17_FORECAST_MODELS) {
    csvContent += `"${m.name}";"${m.formula}";"${m.projected2027}";"${(m.projected2027 / 1e6).toFixed(2)}";"+${m.incrementoNominal}";"+${m.variacionPct.toFixed(2)}%";"${m.alertaRiesgo}";"${m.interpretation}"\n`;
  }
  csvContent += `\n`;

  csvContent += `SERIE HISTORICA Y PROYECCION (2024-2027)\n`;
  csvContent += `Vigencia;Unidad;Concepto;Recurso;Total Recaudo (COP);Total Recaudo ($M);Variacion Anual (COP);Variacion Anual (%);Tipo;Marco Legal / Nota\n`;
  for (const h of R17_HISTORICAL_SERIES) {
    const is2027 = h.vigencia === 2027;
    const recaudo = is2027 ? model.projected2027 : h.totalRecaudo;
    const varCOP = is2027 ? model.incrementoNominal : h.variacionAnualCOP;
    const varPct = is2027 ? model.variacionPct : h.variacionAnualPct;
    csvContent += `"${h.vigencia}";"${h.unidad}";"${h.concepto}";"${h.recurso}";"${recaudo}";"${(recaudo / 1e6).toFixed(2)}";"${varCOP >= 0 ? '+' : ''}${varCOP}";"${varPct >= 0 ? '+' : ''}${varPct.toFixed(2)}%";"${h.tipo}";"${h.notaNormativa}"\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Proyeccion_Recurso_17_Descuento_Votacion_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// =========================================================================
// CATÁLOGO OFICIAL DE 19 CONCEPTOS PRESUPUESTALES INSTITUCIONALES (2027)
// BALANCE GENERAL CONSOLIDADO - VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA
// =========================================================================

export interface OfficialConceptModelOption {
  id: string;
  name: string;
  value: number;
  variationPct: number;
  description?: string;
}

export interface OfficialConceptDefinition {
  id: string;
  order: number;
  unidad: string;
  concepto: string;
  codigoConcepto: string;
  recurso: string;
  grupo: 'nacion' | 'propios' | 'iva' | 'estampillas';
  recaudo2024: number;
  recaudo2025: number;
  base2026: number;
  defaultModelId: string;
  models: OfficialConceptModelOption[];
}

export interface OfficialConceptComputedRow {
  id: string;
  order: number;
  unidad: string;
  concepto: string;
  nombre: string;
  codigoConcepto: string;
  codigo: string;
  recurso: string;
  grupo: 'nacion' | 'propios' | 'iva' | 'estampillas';
  recaudo2024: number;
  y24: number;
  recaudo2025: number;
  y25: number;
  base2026: number;
  y26: number;
  projected2027: number;
  y27: number;
  projected2027Millions: number;
  variationPct: number;
  varPct: number;
  variationCOP: number;
  participationPct: number;
  part: number;
  selectedModelId: string;
  selectedModelName: string;
  isCustom: boolean;
}

export interface OfficialSubtotalItem {
  y24: number;
  y25: number;
  y26: number;
  y27: number;
  variationPct: number;
  varPct: number;
  participationPct: number;
  part: number;
}

export interface OfficialConsolidatedSummary {
  rows: OfficialConceptComputedRow[];
  subtotalNacion: OfficialSubtotalItem;
  subtotalPropios: OfficialSubtotalItem;
  subtotalIVA: OfficialSubtotalItem;
  subtotalIva: OfficialSubtotalItem;
  subtotalEstampillas: OfficialSubtotalItem;
  subtotalAutogestion: OfficialSubtotalItem;
  totalConsolidado: OfficialSubtotalItem;
}

// Aliases para retrocompatibilidad
export type Official17ConceptModelOption = OfficialConceptModelOption;
export type Official17ConceptDefinition = OfficialConceptDefinition;
export type Official17ConceptComputedRow = OfficialConceptComputedRow;
export type Official17SubtotalItem = OfficialSubtotalItem;
export type Official17ConsolidatedSummary = OfficialConsolidatedSummary;

export const OFFICIAL_BALANCE_GENERAL_CATALOG: OfficialConceptDefinition[] = [
  {
    id: 'c1_r10_funcionamiento',
    order: 1,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Funcionamiento',
    codigoConcepto: '1.1.02.06.006.01.01',
    recurso: '10.0-Aportes Nacion - Funcionamiento',
    grupo: 'nacion',
    recaudo2024: 252310024180,
    recaudo2025: 274240602293,
    base2026: 364009300613,
    defaultModelId: 'calculado644',
    models: [
      { id: 'calculado644', name: 'Aumento Calculado PGN (+6,44%)', value: 387451499572, variationPct: 6.44 },
      { id: 'pgn', name: 'Techo Global PGN 2027 (R10+R17+R18)', value: 395704592082, variationPct: 8.71 },
      { id: 'inercial', name: 'Base 2026 Inercial (0,0%)', value: 364009300613, variationPct: 0.00 }
    ]
  },
  {
    id: 'c2_r12_estampilla_unal',
    order: 2,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla Pro- Universidad Nacional y Demás Entidades Estatales de Colombia',
    codigoConcepto: '1.1.02.06.006.07.01',
    recurso: '12-Estampillas Otras Universidades',
    grupo: 'nacion',
    recaudo2024: 6431335851,
    recaudo2025: 14785650242,
    base2026: 9015915211,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0% (Parámetro Aprobado)', value: 9556870124, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 9647029276, variationPct: 7.00 },
      { id: 'wma', name: 'Promedio Ponderado WMA-3', value: 10508396995, variationPct: 16.55 },
      { id: 'media3', name: 'Media Trienal (2024–2026)', value: 10077633768, variationPct: 11.78 },
      { id: 'media4', name: 'Media Cuatrienal (2023–2026)', value: 11025519025, variationPct: 22.29 },
      { id: 'linear', name: 'Regresión Lineal OLS', value: 12748911456, variationPct: 41.40 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 9015915211, variationPct: 0.00 }
    ]
  },
  {
    id: 'c3_r13_cooperativas',
    order: 3,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Cooperativas Art.142, Ley 1819 del 2016',
    codigoConcepto: '1.1.02.06.006.06.00',
    recurso: '13-Cooperativas',
    grupo: 'nacion',
    recaudo2024: 2078952994,
    recaudo2025: 2080840690,
    base2026: 1621800000,
    defaultModelId: 'macro',
    models: [
      { id: 'macro', name: 'Macro +6,0% (Base Real Aprobada)', value: 1719108000, variationPct: 6.00 },
      { id: 'inercial', name: 'Piso Inercial 2026 ($1.622M)', value: 1621800000, variationPct: 0.00 },
      { id: 'wma', name: 'Promedio Ponderado WMA-3', value: 1851005729, variationPct: 14.13 },
      { id: 'media', name: 'Media Cuatrienal ($1.912M)', value: 1912354948, variationPct: 17.92 }
    ]
  },
  {
    id: 'c4_r14_gratuidad',
    order: 4,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Politica Gratuidad',
    codigoConcepto: '1.1.02.06.006.06.02',
    recurso: '14-Matriculas FSE',
    grupo: 'nacion',
    recaudo2024: 37090700264,
    recaudo2025: 36210311946,
    base2026: 49844177233,
    defaultModelId: 'macro',
    models: [
      { id: 'macro', name: 'Macro +6,0% (Piso Oficial Aprobado)', value: 52834827867, variationPct: 6.00 },
      { id: 'linear', name: 'Regresión Lineal OLS (R²=94,7%)', value: 54459255459, variationPct: 9.26 },
      { id: 'holt', name: 'Suavizamiento Holt', value: 53801597430, variationPct: 7.94 },
      { id: 'optimista', name: 'Escenario Expansión (+13%)', value: 56323920274, variationPct: 13.00 },
      { id: 'inercial', name: 'Base Inercial 2026 (0,0%)', value: 49844177233, variationPct: 0.00 }
    ]
  },
  {
    id: 'c5_r16_inversion',
    order: 5,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes para Inversion',
    codigoConcepto: '1.1.02.06.006.01.02',
    recurso: '16.0-Aportes inversion',
    grupo: 'nacion',
    recaudo2024: 7285059912,
    recaudo2025: 14362012132,
    base2026: 7740281271,
    defaultModelId: 'pgn',
    models: [
      { id: 'pgn', name: 'Asignado PGN Inversión (+7,37%)', value: 8310959010, variationPct: 7.37 },
      { id: 'macro6', name: 'Macro +6,0%', value: 8204698147, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 8282100960, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial 2026 (0,0%)', value: 7740281271, variationPct: 0.00 }
    ]
  },
  {
    id: 'c6_r17_votacion',
    order: 6,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolucion de descuento por votacion',
    codigoConcepto: '1.1.02.06.006.01.04',
    recurso: '17-Devolucion descuento electoral',
    grupo: 'nacion',
    recaudo2024: 4531561319,
    recaudo2025: 5183761916,
    base2026: 5643523903,
    defaultModelId: 'calculado644',
    models: [
      { id: 'calculado644', name: 'Aumento Calculado PGN (+6,44%)', value: 6006966842, variationPct: 6.44 },
      { id: 'macro', name: 'Macro +6,0% Estándar', value: 5982135337, variationPct: 6.00 },
      { id: 'inercial', name: 'Piso Inercial 2026 ($5.644M)', value: 5643523903, variationPct: 0.00 },
      { id: 'wma', name: 'Promedio Móvil WMA-3', value: 5305436666, variationPct: -5.99 }
    ]
  },
  {
    id: 'c7_r18_cesu',
    order: 7,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Articulo 87 CESU',
    codigoConcepto: '1.1.02.06.006.01.05',
    recurso: '18-Articulo 87 CESU',
    grupo: 'nacion',
    recaudo2024: 1067037785,
    recaudo2025: 457065634,
    base2026: 2110227046,
    defaultModelId: 'calculado644',
    models: [
      { id: 'calculado644', name: 'Aumento Calculado PGN (+6,44%)', value: 2246125668, variationPct: 6.44 },
      { id: 'macro', name: 'Macro +6,0% Estándar', value: 2236840669, variationPct: 6.00 },
      { id: 'inercial', name: 'Base 2026 Inercial (0,0%)', value: 2110227046, variationPct: 0.00 }
    ]
  },
  {
    id: 'c8_r20_certificaciones',
    order: 8,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Certificaciones y constancias',
    codigoConcepto: '1.1.02.02.015',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 0,
    recaudo2025: 54987450,
    base2026: 44343950,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 47004587, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 47448027, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 44343950, variationPct: 0.00 }
    ]
  },
  {
    id: 'c9_r20_comercio',
    order: 9,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua',
    codigoConcepto: '1.1.02.05.002.06',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 3928052683,
    recaudo2025: 4040183778,
    base2026: 2562971129,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 2716749397, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 2742379108, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 2562971129, variationPct: 0.00 }
    ]
  },
  {
    id: 'c10_r20_minerales',
    order: 10,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Minerales; electricidad, gas y agua',
    codigoConcepto: '1.1.02.05.002.01',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 166121321,
    recaudo2025: 157320243,
    base2026: 83257428,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 88252874, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 89085448, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 83257428, variationPct: 0.00 }
    ]
  },
  {
    id: 'c11_r20_derechos_comp',
    order: 11,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Pregrado - Certificaciones, constancias académicas y derechos complementarios',
    codigoConcepto: '1.1.02.02.116.01.01.04',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 3393625320,
    recaudo2025: 3479161986,
    base2026: 3773314576,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 3999713451, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 4037446596, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 3773314576, variationPct: 0.00 }
    ]
  },
  {
    id: 'c12_r20_grado',
    order: 12,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Pregrado - Derechos de grado',
    codigoConcepto: '1.1.02.02.116.01.01.02',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 961979248,
    recaudo2025: 1012888550,
    base2026: 736345940,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 780526696, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 787890156, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 736345940, variationPct: 0.00 }
    ]
  },
  {
    id: 'c13_r20_inscripciones',
    order: 13,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Pregrado - Inscripciones ',
    codigoConcepto: '1.1.02.02.116.01.01.01',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 3021726000,
    recaudo2025: 2588882800,
    base2026: 2026330700,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 2147910542, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 2168173849, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 2026330700, variationPct: 0.00 }
    ]
  },
  {
    id: 'c14_r20_matriculas',
    order: 14,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Pregrado - Matrículas',
    codigoConcepto: '1.1.02.02.116.01.01.03',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 8026314399,
    recaudo2025: 5540609886,
    base2026: 3772946201,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 3999322973, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 4037052435, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 3772946201, variationPct: 0.00 }
    ]
  },
  {
    id: 'c15_r20_productos_metalicos',
    order: 15,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Productos metálicos, maquinaria y equipo',
    codigoConcepto: '1.1.02.05.002.04',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 6017390,
    recaudo2025: 9526385,
    base2026: 9307590,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 9866045, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 9959121, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 9307590, variationPct: 0.00 }
    ]
  },
  {
    id: 'c16_r20_sanciones',
    order: 16,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Sanciones administrativas',
    codigoConcepto: '1.1.02.03.001.05',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 29849852,
    recaudo2025: 47224591,
    base2026: 23297850,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 24695721, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 24928700, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 23297850, variationPct: 0.00 }
    ]
  },
  {
    id: 'c17_r20_financieros',
    order: 17,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing',
    codigoConcepto: '1.1.02.05.002.07',
    recurso: '20-Propios',
    grupo: 'propios',
    recaudo2024: 227673982,
    recaudo2025: 318870325,
    base2026: 155686149,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0%', value: 165027318, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 166584179, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 155686149, variationPct: 0.00 }
    ]
  },
  {
    id: 'c18_r21_iva',
    order: 18,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Devolución IVA - Instituciones de Educación Superior',
    codigoConcepto: '1.1.02.06.006.02',
    recurso: '21-Devolucion IVA',
    grupo: 'iva',
    recaudo2024: 4000000000,
    recaudo2025: 7981747901,
    base2026: 4672217269,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0% (Parámetro Aprobado)', value: 4952550305, variationPct: 6.00 },
      { id: 'meta7', name: 'Modelo Referencia (+7,0%)', value: 4999272477, variationPct: 7.00 },
      { id: 'holt', name: 'Suavizamiento Holt (+4,66%)', value: 4890000000, variationPct: 4.66 },
      { id: 'inercial', name: 'Base Inercial 2026 (0,0%)', value: 4672217269, variationPct: 0.00 }
    ]
  },
  {
    id: 'c19_r40_estampilla_uptc',
    order: 19,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Estampilla pro Universidad Pedagógica y Tecnológica de Colombia',
    codigoConcepto: '1.1.01.02.300.32',
    recurso: '40-Estampilla UPTC',
    grupo: 'estampillas',
    recaudo2024: 4793044583,
    recaudo2025: 5566844388,
    base2026: 5191244662,
    defaultModelId: 'macro6',
    models: [
      { id: 'macro6', name: 'Macro +6,0% (Parámetro Aprobado)', value: 5502719342, variationPct: 6.00 },
      { id: 'ipc7', name: 'Indexación IPC (+7,0%)', value: 5554631788, variationPct: 7.00 },
      { id: 'inercial', name: 'Base Inercial (0,0%)', value: 5191244662, variationPct: 0.00 }
    ]
  }
];

export const OFFICIAL_17_CONCEPTS_CATALOG = OFFICIAL_BALANCE_GENERAL_CATALOG;

export function computeOfficialBalanceGeneral(
  userSelections?: Record<string, { modelId: string; customValue?: number }>
): OfficialConsolidatedSummary {
  const selections = userSelections || {};
  
  // Calcular proyecciones por fila
  const computedRows: OfficialConceptComputedRow[] = OFFICIAL_BALANCE_GENERAL_CATALOG.map(def => {
    const userSel = selections[def.id];
    let selectedModelId = userSel ? userSel.modelId : def.defaultModelId;
    let projVal = 0;
    let selectedModelName = '';
    let isCustom = false;

    if (selectedModelId === 'custom' && userSel && typeof userSel.customValue === 'number' && !isNaN(userSel.customValue)) {
      projVal = userSel.customValue;
      selectedModelName = 'Personalizado';
      isCustom = true;
    } else {
      const foundModel = def.models.find(m => m.id === selectedModelId) || def.models[0];
      selectedModelId = foundModel.id;
      projVal = foundModel.value;
      selectedModelName = foundModel.name;
    }

    const varCOP = projVal - def.base2026;
    const varPct = def.base2026 > 0 ? (varCOP / def.base2026) * 100 : (projVal > 0 ? 100 : 0);

    return {
      id: def.id,
      order: def.order,
      unidad: def.unidad,
      concepto: def.concepto,
      nombre: def.concepto,
      codigoConcepto: def.codigoConcepto,
      codigo: def.codigoConcepto,
      recurso: def.recurso,
      grupo: def.grupo,
      recaudo2024: def.recaudo2024,
      y24: def.recaudo2024,
      recaudo2025: def.recaudo2025,
      y25: def.recaudo2025,
      base2026: def.base2026,
      y26: def.base2026,
      projected2027: projVal,
      y27: projVal,
      projected2027Millions: Number((projVal / 1e6).toFixed(2)),
      variationPct: varPct,
      varPct: varPct,
      variationCOP: varCOP,
      participationPct: 0,
      part: 0,
      selectedModelId,
      selectedModelName,
      isCustom
    };
  });

  // Totales y subtotales
  let nacionY24 = 0, nacionY25 = 0, nacionY26 = 0, nacionY27 = 0;
  let propiosY24 = 0, propiosY25 = 0, propiosY26 = 0, propiosY27 = 0;
  let ivaY24 = 0, ivaY25 = 0, ivaY26 = 0, ivaY27 = 0;
  let estampillasY24 = 0, estampillasY25 = 0, estampillasY26 = 0, estampillasY27 = 0;

  for (const r of computedRows) {
    if (r.grupo === 'nacion') {
      nacionY24 += r.recaudo2024;
      nacionY25 += r.recaudo2025;
      nacionY26 += r.base2026;
      nacionY27 += r.projected2027;
    } else if (r.grupo === 'propios') {
      propiosY24 += r.recaudo2024;
      propiosY25 += r.recaudo2025;
      propiosY26 += r.base2026;
      propiosY27 += r.projected2027;
    } else if (r.grupo === 'iva') {
      ivaY24 += r.recaudo2024;
      ivaY25 += r.recaudo2025;
      ivaY26 += r.base2026;
      ivaY27 += r.projected2027;
    } else if (r.grupo === 'estampillas') {
      estampillasY24 += r.recaudo2024;
      estampillasY25 += r.recaudo2025;
      estampillasY26 += r.base2026;
      estampillasY27 += r.projected2027;
    }
  }

  const autogestionY24 = propiosY24 + ivaY24 + estampillasY24;
  const autogestionY25 = propiosY25 + ivaY25 + estampillasY25;
  const autogestionY26 = propiosY26 + ivaY26 + estampillasY26;
  const autogestionY27 = propiosY27 + ivaY27 + estampillasY27;

  const totalY24 = nacionY24 + autogestionY24;
  const totalY25 = nacionY25 + autogestionY25;
  const totalY26 = nacionY26 + autogestionY26;
  const totalY27 = nacionY27 + autogestionY27;

  // Participación porcentual de cada concepto sobre el gran total
  const denom = totalY27 > 0 ? totalY27 : 1;
  for (const r of computedRows) {
    const partVal = Number(((r.projected2027 / denom) * 100).toFixed(2));
    r.participationPct = partVal;
    r.part = partVal;
  }

  const calcVar = (y27: number, y26: number) => y26 > 0 ? Number((((y27 - y26) / y26) * 100).toFixed(2)) : 0;
  const calcPart = (y27: number) => denom > 0 ? Number(((y27 / denom) * 100).toFixed(2)) : 0;

  const makeSubtotal = (y24: number, y25: number, y26: number, y27: number, isTotal = false): OfficialSubtotalItem => {
    const vPct = calcVar(y27, y26);
    const pPct = isTotal ? 100.00 : calcPart(y27);
    return {
      y24,
      y25,
      y26,
      y27,
      variationPct: vPct,
      varPct: vPct,
      participationPct: pPct,
      part: pPct
    };
  };

  const nacSub = makeSubtotal(nacionY24, nacionY25, nacionY26, nacionY27);
  const propSub = makeSubtotal(propiosY24, propiosY25, propiosY26, propiosY27);
  const ivaSub = makeSubtotal(ivaY24, ivaY25, ivaY26, ivaY27);
  const estampSub = makeSubtotal(estampillasY24, estampillasY25, estampillasY26, estampillasY27);
  const autoSub = makeSubtotal(autogestionY24, autogestionY25, autogestionY26, autogestionY27);
  const totSub = makeSubtotal(totalY24, totalY25, totalY26, totalY27, true);

  return {
    rows: computedRows,
    subtotalNacion: nacSub,
    subtotalPropios: propSub,
    subtotalIVA: ivaSub,
    subtotalIva: ivaSub,
    subtotalEstampillas: estampSub,
    subtotalAutogestion: autoSub,
    totalConsolidado: totSub
  };
}

export const computeOfficial17Consolidated = computeOfficialBalanceGeneral;

export function exportBalanceGeneralCSV(summary: OfficialConsolidatedSummary): void {
  let csv = '\uFEFF'; // Byte Order Mark for Excel UTF-8 compatibility
  csv += 'UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n';
  csv += 'VICERRECTORIA ADMINISTRATIVA Y FINANCIERA (VAFI)\n';
  csv += 'BALANCE GENERAL Y MATRIZ DE PROYECCION INSTITUCIONAL DE INGRESOS - VIGENCIA 2027\n';
  csv += `Fecha de Generación:;${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}\n`;
  csv += `Total Consolidado 2027:;$ ${summary.totalConsolidado.y27.toLocaleString('es-CO')};Variación Global:;+${summary.totalConsolidado.variationPct.toFixed(2)}%\n\n`;

  // Encabezado exacto solicitado: Unidad;Código concepto;Concepto;Recurso...
  csv += 'Unidad;Código concepto;Concepto;Recurso;Recaudo 2024;Recaudo 2025;Recaudo Base 2026;Proyección 2027 (COP);Proyección 2027 ($M);Variación vs 2026 (%);Participación Presupuestal (%);Método o Criterio Seleccionado\n';

  // Filas individuales con Unidad, Código concepto, Concepto, Recurso
  for (const r of summary.rows) {
    const cUnidad = `"${r.unidad}"`;
    const cCode = `"${r.codigoConcepto}"`;
    const cName = `"${r.concepto.replace(/"/g, '""')}"`;
    const cRec = `"${r.recurso}"`;
    const y24 = `$ ${Math.round(r.recaudo2024).toLocaleString('es-CO')}`;
    const y25 = `$ ${Math.round(r.recaudo2025).toLocaleString('es-CO')}`;
    const y26 = `$ ${Math.round(r.base2026).toLocaleString('es-CO')}`;
    const y27 = `$ ${Math.round(r.projected2027).toLocaleString('es-CO')}`;
    const y27M = `$ ${r.projected2027Millions.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    const varPct = `${r.variationPct >= 0 ? '+' : ''}${r.variationPct.toFixed(2)}%`;
    const partPct = `${r.participationPct.toFixed(2)}%`;
    const model = `"${r.selectedModelName.replace(/"/g, '""')}"`;

    csv += `${cUnidad};${cCode};${cName};${cRec};${y24};${y25};${y26};${y27};${y27M};${varPct};${partPct};${model}\n`;
  }

  // Subtotal Nacion
  csv += `\n"01 - ADMINISTRATIVA Y FINANCIERA";"";"SUBTOTAL GIROS Y FONDOS DE LA NACION (7 CONCEPTOS)";"NACION";"$ ${Math.round(summary.subtotalNacion.y24).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalNacion.y25).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalNacion.y26).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalNacion.y27).toLocaleString('es-CO')}";"$ ${(summary.subtotalNacion.y27 / 1e6).toFixed(2)}M";"+${summary.subtotalNacion.variationPct.toFixed(2)}%";"${summary.subtotalNacion.participationPct.toFixed(2)}%";"Transferencias y Fondos Nacionales"\n`;

  // Subtotal Propios
  csv += `"01 - ADMINISTRATIVA Y FINANCIERA";"";"SUBTOTAL RECURSOS PROPIOS - R20 (10 CONCEPTOS)";"20-PROPIOS";"$ ${Math.round(summary.subtotalPropios.y24).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalPropios.y25).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalPropios.y26).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalPropios.y27).toLocaleString('es-CO')}";"$ ${(summary.subtotalPropios.y27 / 1e6).toFixed(2)}M";"+${summary.subtotalPropios.variationPct.toFixed(2)}%";"${summary.subtotalPropios.participationPct.toFixed(2)}%";"Autogestión Académica y Administrativa"\n`;

  // Subtotal IVA
  csv += `"01 - ADMINISTRATIVA Y FINANCIERA";"1.1.02.06.006.02";"SUBTOTAL DEVOLUCION IVA - R21 (1 CONCEPTO)";"21-DEVOLUCION IVA";"$ ${Math.round(summary.subtotalIVA.y24).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalIVA.y25).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalIVA.y26).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalIVA.y27).toLocaleString('es-CO')}";"$ ${(summary.subtotalIVA.y27 / 1e6).toFixed(2)}M";"+${summary.subtotalIVA.variationPct.toFixed(2)}%";"${summary.subtotalIVA.participationPct.toFixed(2)}%";"Beneficio Tributario Art. 92 Ley 30"\n`;

  // Subtotal Estampilla UPTC
  csv += `"01 - ADMINISTRATIVA Y FINANCIERA";"1.1.01.02.300.32";"SUBTOTAL ESTAMPILLA UPTC - R40 (1 CONCEPTO)";"40-ESTAMPILLA UPTC";"$ ${Math.round(summary.subtotalEstampillas.y24).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalEstampillas.y25).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalEstampillas.y26).toLocaleString('es-CO')}";"$ ${Math.round(summary.subtotalEstampillas.y27).toLocaleString('es-CO')}";"$ ${(summary.subtotalEstampillas.y27 / 1e6).toFixed(2)}M";"+${summary.subtotalEstampillas.variationPct.toFixed(2)}%";"${summary.subtotalEstampillas.participationPct.toFixed(2)}%";"Estampilla Pro-UPTC Departamental"\n`;

  // Total Consolidado
  csv += `\n"01 - ADMINISTRATIVA Y FINANCIERA";"";"TOTAL CONSOLIDADO UPTC 2027 (19 CONCEPTOS)";"UPTC CONSOLIDADO";"$ ${Math.round(summary.totalConsolidado.y24).toLocaleString('es-CO')}";"$ ${Math.round(summary.totalConsolidado.y25).toLocaleString('es-CO')}";"$ ${Math.round(summary.totalConsolidado.y26).toLocaleString('es-CO')}";"$ ${Math.round(summary.totalConsolidado.y27).toLocaleString('es-CO')}";"$ ${(summary.totalConsolidado.y27 / 1e6).toFixed(2)}M";"+${summary.totalConsolidado.variationPct.toFixed(2)}%";"100.00%";"Consolidado Total Institucional"\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Balance_General_UPTC_2027_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportConsolidated17ConceptsCSV = exportBalanceGeneralCSV;


