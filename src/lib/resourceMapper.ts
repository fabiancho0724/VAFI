export const RESOURCES_LIST = [
  "10.0-Aportes Nacion - Funcionamiento",
  "10.1-Aportes Nación - PIC Convencional",
  "10.2-Aportes Nación - PIC Territorial",
  "10.5-Aportes Nación - Política de gratuidad",
  "12-Estampillas Otras Universidades",
  "13-Cooperativas",
  "14-Matriculas FSE",
  "16.0-Aportes inversion",
  "17-Devolucion descuento electoral",
  "20-Propios",
  "21-Devolucion IVA",
  "31-Posgrados",
  "32-Extension",
  "33-Convenios con derechos",
  "34-Convenios sin derechos",
  "35-Educacion continuada",
  "40-Estampilla UPTC"
];

export function getRecursoEquivalence(recursoStr: string): string {
  const clean = String(recursoStr || '').trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  const code = match ? match[1] : clean;
  
  if (code === "10" || code === "10.0") return "10.0-Aportes Nacion - Funcionamiento";
  if (code === "10.1") return "10.1-Aportes Nación - PIC Convencional";
  if (code === "10.2") return "10.2-Aportes Nación - PIC Territorial";
  if (code === "10.5") return "10.5-Aportes Nación - Política de gratuidad";
  if (code === "12") return "12-Estampillas Otras Universidades";
  if (code === "13") return "13-Cooperativas";
  if (code === "14") return "14-Matriculas FSE";
  if (code === "16" || code === "16.0") return "16.0-Aportes inversion";
  if (code === "17") return "17-Devolucion descuento electoral";
  if (code === "20") return "20-Propios";
  if (code === "21") return "21-Devolucion IVA";
  if (code === "31") return "31-Posgrados";
  if (code === "32") return "32-Extension";
  if (code === "33") return "33-Convenios con derechos";
  if (code === "34") return "34-Convenios sin derechos";
  if (code === "35") return "35-Educacion continuada";
  if (code === "40") return "40-Estampilla UPTC";
  
  const lower = clean.toLowerCase();
  if (lower.includes("gratuidad")) return "10.5-Aportes Nación - Política de gratuidad";
  if (lower.includes("cooperativa")) return "13-Cooperativas";
  if (lower.includes("fse") || lower.includes("fondo de solidaridad")) return "14-Matriculas FSE";
  if (lower.includes("descuento electoral")) return "17-Devolucion descuento electoral";
  if (lower.includes("iva")) return "21-Devolucion IVA";
  if (lower.includes("posgrado")) return "31-Posgrados";
  if (lower.includes("extension") || lower.includes("extensión")) return "32-Extension";
  if (lower.includes("estampilla uptc") || lower.includes("estampilla u.p.t.c.")) return "40-Estampilla UPTC";
  if (lower.includes("aportes nacion") || lower.includes("aportes nación")) return "10.0-Aportes Nacion - Funcionamiento";
  if (lower.includes("propios")) return "20-Propios";
  
  return clean;
}

export function getRowResourceCode(row: any, year: number): string {
  if (year === 2026) {
    const vigStr = String(row['Vigencia'] || '');
    if (vigStr.toLowerCase().includes('administra') || vigStr.toLowerCase().includes('01') || vigStr.toLowerCase().includes('unidad')) {
      return String(row['Codigo'] || '').trim();
    }
  }
  
  const possibleKeys = ['Recurso', 'Codigo', 'Código recurso', 'Codigo recurso', 'recurso'];
  for (const key of possibleKeys) {
    const val = String(row[key] || '').trim();
    const match = val.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      const code = match[1];
      if (code.length <= 5) {
        return val;
      }
    }
  }
  return String(row['Recurso'] || '').trim();
}

export const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
