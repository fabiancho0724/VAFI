import { RECURSOS_FINANCIEROS } from './constants';

export const RESOURCES_LIST = RECURSOS_FINANCIEROS.map(r => r.codigo);

export function getRecursoEquivalence(recursoStr: string): string {
  const clean = String(recursoStr || '').trim();
  
  // Extract number from start (e.g. "10.0 - Aportes..." -> "10.0", "10.1-Aportes..." -> "10.1")
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  if (match) {
    const code = match[1];
    if (code === "10.0" || code === "10") return "10";
    if (code === "16.0" || code === "16") return "16";
    return code; // e.g. "10.1", "10.2", "10.5", "12", "13", "14", "17", "20", "21", "31", "32", "33", "34", "35", "40"
  }
  
  // Try checking keywords if there is no leading number
  const lower = clean.toLowerCase();
  if (lower.includes("gratuidad")) return "10.5";
  if (lower.includes("cooperativa")) return "13";
  if (lower.includes("fse") || lower.includes("fondo de solidaridad") || lower.includes("solidaridad")) return "14";
  if (lower.includes("descuento electoral") || lower.includes("electoral")) return "17";
  if (lower.includes("iva")) return "21";
  if (lower.includes("posgrado")) return "31";
  if (lower.includes("extension") || lower.includes("extensión")) return "32";
  if (lower.includes("estampilla uptc") || lower.includes("estampilla u.p.t.c.")) return "40";
  if (lower.includes("aportes nacion") || lower.includes("aportes nación")) return "10";
  if (lower.includes("propios")) return "20";
  if (lower.includes("estampillas otras")) return "12";
  if (lower.includes("inversion") || lower.includes("inversión")) return "16";
  
  return clean; // Fallback
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

export function getResourceFullName(code: string): string {
  const found = RECURSOS_FINANCIEROS.find(r => r.codigo === code);
  return found ? found.nombre : code;
}

export const MONTHS_STR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
