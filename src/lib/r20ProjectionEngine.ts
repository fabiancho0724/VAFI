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
    subRecurso: 'R10',
    denominacion: 'Aporte Ordinario Nación - Funcionamiento',
    recaudoEfectivo: 238714266246,
    ingresoFaltante: 88355901123,
    totalRecaudo: 327070167369,
    participacionPct: (327070167369 / 351357927407) * 100 // 93.09%
  },
  {
    subRecurso: 'R10.5',
    denominacion: 'Aportes Fomento / Base Presupuestal',
    recaudoEfectivo: 11208316954,
    ingresoFaltante: 0,
    totalRecaudo: 11208316954,
    participacionPct: (11208316954 / 351357927407) * 100 // 3.19%
  },
  {
    subRecurso: 'R10.1',
    denominacion: 'Aportes Nación - PIC Convencional',
    recaudoEfectivo: 5623807220,
    ingresoFaltante: 2165253520,
    totalRecaudo: 7789060740,
    participacionPct: (7789060740 / 351357927407) * 100 // 2.22%
  },
  {
    subRecurso: 'R10.2',
    denominacion: 'Aportes Nación - PIC Territorial',
    recaudoEfectivo: 3060211833,
    ingresoFaltante: 0,
    totalRecaudo: 3060211833,
    participacionPct: (3060211833 / 351357927407) * 100 // 0.87%
  },
  {
    subRecurso: 'R10.3',
    denominacion: 'Aportes Adicionales a la Base',
    recaudoEfectivo: 0,
    ingresoFaltante: 2229170511,
    totalRecaudo: 2229170511,
    participacionPct: (2229170511 / 351357927407) * 100 // 0.63%
  }
];

export const R10_BASE_TOTAL_2026 = 351357927407; // 351.357.927.407 COP

export const PGN_2027_DATA = {
  vigencia: 2027,
  institucion: 'UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)',
  normaLegal: 'Proyecto / Ley de Presupuesto General de la Nación (PGN 2027)',
  funcionamientoR10: 395704592082, // A. PRESUPUESTO DE FUNCIONAMIENTO
  inversion: 8310959010,           // C. PRESUPUESTO DE INVERSIÓN (2202 Calidad y Fomento / 0700 Intersubsectorial)
  totalPresupuestoEjecutora: 404015551092, // TOTAL PRESUPUESTO UNIDAD EJECUTORA
  basePresupuestal2026: 351357927407,
  variacionNominal: 395704592082 - 351357927407, // +44.346.664.675 COP
  variacionPct: ((395704592082 - 351357927407) / 351357927407) * 100, // +12.62%
  variacionVsR10Ordinario: 395704592082 - 327070167369, // +68.634.424.713 COP
  variacionVsR10OrdinarioPct: ((395704592082 - 327070167369) / 327070167369) * 100 // +20.98%
};

export interface R10HistoricalRecord {
  vigencia: number;
  unidad: string;
  concepto: string;
  recurso: string;
  totalRecaudo: number;
  variacionAnualCOP: number;
  variacionAnualPct: number;
  tipo: 'historico' | 'base2026' | 'pgn2027';
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
    concepto: 'Base Presupuestal Unificada (R10 + R10.1 + R10.2 + R10.3 + R10.5)',
    recurso: '10.0 Base Consolidada de Referencia',
    totalRecaudo: 351357927407,
    variacionAnualCOP: 64201310599,
    variacionAnualPct: 22.36,
    tipo: 'base2026',
    notaNormativa: 'Base Presupuestal Certificada (Efectivo $258.606M + Faltante $92.750M)'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'A. PRESUPUESTO DE FUNCIONAMIENTO (PGN 2027)',
    recurso: '10.0-Aportes Nación Funcionamiento',
    totalRecaudo: 395704592082,
    variacionAnualCOP: 44346664675,
    variacionAnualPct: 12.62,
    tipo: 'pgn2027',
    notaNormativa: 'Asignación FIJA por Ley — Presupuesto General de la Nación 2027'
  }
];

export function exportR10CSV(): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `RECURSO 10.0 - APORTES NACION (FUNCIONAMIENTO) - PRESUPUESTO GENERAL DE LA NACION 2027\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Asignacion Fija PGN 2027 Funcionamiento (COP):;${PGN_2027_DATA.funcionamientoR10}\n`;
  csvContent += `Asignacion PGN 2027 Inversion (COP):;${PGN_2027_DATA.inversion}\n`;
  csvContent += `Total Presupuesto PGN Unidad Ejecutora (COP):;${PGN_2027_DATA.totalPresupuestoEjecutora}\n`;
  csvContent += `Base Presupuestal 2026 (COP):;${PGN_2027_DATA.basePresupuestal2026}\n`;
  csvContent += `Variacion Nominal vs Base 2026 (COP):;+${PGN_2027_DATA.variacionNominal}\n`;
  csvContent += `Variacion Porcentual vs Base 2026:;+${PGN_2027_DATA.variacionPct.toFixed(2)}%\n\n`;

  csvContent += `DESGLOSE BASE PRESUPUESTAL 2026 (COMPONENTES R10)\n`;
  csvContent += `Sub-Recurso;Denominacion;Recaudo Efectivo 2026;Ingreso Faltante 2026;Total Recaudo 2026 (Base);Participacion (%)\n`;
  for (const c of R10_BASE_COMPONENTS_2026) {
    csvContent += `"${c.subRecurso}";"${c.denominacion}";"${c.recaudoEfectivo}";"${c.ingresoFaltante}";"${c.totalRecaudo}";"${c.participacionPct.toFixed(2)}%"\n`;
  }
  csvContent += `"TOTAL BASE 2026";"Base Presupuestal Unificada R10";"258606602253";"92750325154";"${R10_BASE_TOTAL_2026}";"100.00%"\n\n`;

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
    totalRecaudo: 1573078344,
    variacionAnualCOP: 1116012710,
    variacionAnualPct: 244.17,
    tipo: 'historico',
    notaNormativa: 'Recaudo de referencia aprobado para proyección institucional'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Aportes Art. 87 Ley 30 - CESU (Proyectado +6.6%)',
    recurso: '18-Articulo 87 CESU',
    totalRecaudo: 1676901515,
    variacionAnualCOP: 103823171,
    variacionAnualPct: 6.60,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección técnica con parámetro macroeconómico aprobado (+6,6%)'
  }
];

export const R18_PROJECTION_DATA = {
  vigencia: 2027,
  recurso: '18-Articulo 87 CESU',
  denominacion: 'Recurso 18 — Aportes Artículo 87 de la Ley 30 de 1992 (CESU)',
  base2026: 1573078344,
  tasaAumentoPct: 6.6, // Parámetro macroeconómico aprobado
  factorAumento: 1.066,
  proyeccion2027: 1676901515, // 1.573.078.344 * 1.066
  incrementoNominal: 103823171,
  recaudo2024: 1067037785,
  recaudo2025: 457065634,
  justificacion: 'Dado que no existe una serie histórica extendida con suficiente número de observaciones para ajustar modelos estocásticos (ARIMA / Holt / Regresiones), se aplica la metodología de indexación sobre el recaudo base 2026 ajustado por el parámetro macroeconómico oficial aprobado del 6,6%.'
};

export function exportR18CSV(): void {
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 18 - ARTICULO 87 CESU - VIGENCIA 2027\n`;
  csvContent += `Entidad:;UNIVERSIDAD PEDAGOGICA Y TECNOLOGICA DE COLOMBIA (UPTC)\n`;
  csvContent += `Base Recaudo 2026 (COP):;${R18_PROJECTION_DATA.base2026}\n`;
  csvContent += `Parametro Macroeconomico Aprobado:;+${R18_PROJECTION_DATA.tasaAumentoPct.toFixed(1)}%\n`;
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
    totalRecaudo: 53133892930,
    variacionAnualCOP: 3289715697,
    variacionAnualPct: 6.60,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección institucional con parámetro macroeconómico oficial aprobado (+6,6%)'
  }
];

export const R14_FORECAST_MODELS: R14ForecastModel[] = [
  {
    id: 'macro',
    name: 'Parámetro Macroeconómico Aprobado (+6,6%)',
    shortName: 'Macro +6,6%',
    tag: 'Oficial Aprobado',
    formula: 'Recaudo 2026 × 1,066',
    projected2027: 53133892930,
    incrementoNominal: 3289715697,
    variacionPct: 6.60,
    color: '#06b6d4',
    interpretation: 'Alineado con el criterio macroeconómico institucional de prudencia presupuestal (+6,6%). Proporciona un piso de ingresos garantizado y defendible ante el Consejo Superior.',
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

export const R13_BASE_2026 = 1530000000;

export const R13_HISTORICAL_SERIES: R13HistoricalRecord[] = [
  {
    vigencia: 2019,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 900973803,
    variacionAnualCOP: 0,
    variacionAnualPct: 0,
    tipo: 'historico',
    notaNormativa: 'Primeras transferencias bajo el Art. 142 de la Ley 1819 de 2016 (Reforma Tributaria)'
  },
  {
    vigencia: 2020,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 2208758036,
    variacionAnualCOP: 1307784233,
    variacionAnualPct: 145.15,
    tipo: 'historico',
    notaNormativa: 'Liquidación acumulada de declaraciones tributarias del sector solidario'
  },
  {
    vigencia: 2021,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 1315131132,
    variacionAnualCOP: -893626904,
    variacionAnualPct: -40.46,
    tipo: 'historico',
    notaNormativa: 'Contracción económica derivada de la pandemia en las utilidades de cooperativas'
  },
  {
    vigencia: 2022,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 4431510384,
    variacionAnualCOP: 3116379252,
    variacionAnualPct: 236.96,
    tipo: 'historico',
    notaNormativa: 'Pico atípico extraordinario por resoluciones represadas de la DIAN y sector financiero solidario'
  },
  {
    vigencia: 2023,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 1867826108,
    variacionAnualCOP: -2563684276,
    variacionAnualPct: -57.85,
    tipo: 'historico',
    notaNormativa: 'Normalización post-pico de las transferencias tributarias cooperativas'
  },
  {
    vigencia: 2024,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 2078952994,
    variacionAnualCOP: 211126886,
    variacionAnualPct: 11.30,
    tipo: 'historico',
    notaNormativa: 'Consolidación del recaudo regular del 20% del gravamen cooperativo'
  },
  {
    vigencia: 2025,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 2080840690,
    variacionAnualCOP: 1887696,
    variacionAnualPct: 0.09,
    tipo: 'historico',
    notaNormativa: 'Vigencia de estabilidad máxima del recaudo ordinario (~$2.081M)'
  },
  {
    vigencia: 2026,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas (Base Referencia)',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 1530000000,
    variacionAnualCOP: -550840690,
    variacionAnualPct: -26.47,
    tipo: 'base2026',
    notaNormativa: 'Caída significativa (-26,5%): recaudo efectivo por debajo de la meta presupuestada institucional'
  },
  {
    vigencia: 2027,
    unidad: '01 - ADMINISTRATIVA Y FINANCIERA',
    concepto: 'Excedentes Financieros de Cooperativas (Proyectado)',
    recurso: '13-Excedentes Financieros Cooperativas',
    totalRecaudo: 1630980000,
    variacionAnualCOP: 100980000,
    variacionAnualPct: 6.60,
    tipo: 'proyeccion',
    notaNormativa: 'Proyección prudente con parámetro macroeconómico oficial (+6,6%) sobre la base real de 2026'
  }
];

export const R13_FORECAST_MODELS: R13ForecastModel[] = [
  {
    id: 'macro',
    name: 'Base Prudente Macroeconómica (+6,6%)',
    shortName: 'Macro +6,6% (Base Real)',
    tag: 'Prudente Oficial',
    formula: 'Recaudo 2026 × 1,066',
    projected2027: 1630980000,
    incrementoNominal: 100980000,
    variacionPct: 6.60,
    color: '#f97316',
    interpretation: 'Toma como ancla la realidad deprimida de 2026 ($1.530M) y aplica únicamente la indexación macroeconómica (+6,6%). Protege el flujo de caja contra el déficit de compromisos.',
    alertaRiesgo: 'Bajo Riesgo. La opción más prudente para formular el anteproyecto de presupuesto.',
    riskLevel: 'bajo',
    isOfficial: true
  },
  {
    id: 'inercial',
    name: 'Piso Inercial Estricto (0,0% / Base 2026)',
    shortName: 'Piso Inercial ($1.530M)',
    tag: 'Piso Conservador',
    formula: 'Recaudo 2026 (Crecimiento Cero)',
    projected2027: 1530000000,
    incrementoNominal: 0,
    variacionPct: 0.00,
    color: '#ef4444',
    interpretation: 'Mantiene plano el valor de 2026 sin asumir recuperación alguna en los excedentes de las cooperativas. Máxima cautela ante incertidumbre macroeconómica del sector solidario.',
    alertaRiesgo: 'Riesgo Nulo de Déficit. Presupuesto ultra-defensivo.',
    riskLevel: 'bajo',
    isOfficial: false
  },
  {
    id: 'wma',
    name: 'Promedio Ponderado Trienal (WMA-3 Ponderación 3:2:1)',
    shortName: 'WMA-3 Ponderado',
    tag: 'Ponderado WMA-3',
    formula: '(1.530M·3 + 2.081M·2 + 2.079M·1) / 6',
    projected2027: 1805105729,
    incrementoNominal: 275105729,
    variacionPct: 17.98,
    color: '#eab308',
    interpretation: 'Asigna el 50% de peso a la caída de 2026 y el 50% restante a la estabilidad de 2024-2025, modelando una recuperación gradual hacia la media.',
    alertaRiesgo: 'Riesgo Moderado. Requiere que el sector cooperativo recupere utilidades operativas.',
    riskLevel: 'medio',
    isOfficial: false
  },
  {
    id: 'media',
    name: 'Media de Estabilidad Cuatrienal (2023–2026)',
    shortName: 'Media Cuatrienal ($1.889M)',
    tag: 'Media Cuatrienal',
    formula: 'Promedio(2023, 2024, 2025, 2026)',
    projected2027: 1889404948,
    incrementoNominal: 359404948,
    variacionPct: 23.49,
    color: '#a855f7',
    interpretation: 'Promedia las cuatro vigencias posteriores al shock atípico de 2022. Supone que la caída de 2026 fue transitoria y se normalizará el giro.',
    alertaRiesgo: 'Riesgo Alto. Puede revivir la brecha presupuestal de 2026 si el sector no repunta.',
    riskLevel: 'alto',
    isOfficial: false
  }
];

export function exportR13CSV(selectedModelId: 'macro' | 'inercial' | 'wma' | 'media' = 'macro'): void {
  const model = R13_FORECAST_MODELS.find(m => m.id === selectedModelId) || R13_FORECAST_MODELS[0];
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += `PROYECCION RECURSO 13 - EXCEDENTES FINANCIEROS DE COOPERATIVAS (LEY 1819/2016) - VIGENCIA 2027\n`;
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
  link.setAttribute('download', `Proyeccion_Recurso_13_Excedentes_Cooperativas_2027.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}




