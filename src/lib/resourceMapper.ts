import { RECURSOS_FINANCIEROS } from './constants';

export const RESOURCES_LIST = RECURSOS_FINANCIEROS.map(r => r.codigo);

export function getRecursoEquivalence(recursoStr: string): string {
  const clean = String(recursoStr || '').trim();

  // Handle exact composite strings from Excel (e.g. "10.0-Aportes Nacion - Funcionamiento")
  if (clean.startsWith('10.0-') || clean === '10.0' || clean === '10') return '10';
  if (clean.startsWith('10.1-') || clean === '10.1') return '10.1';
  if (clean.startsWith('10.2-') || clean === '10.2') return '10.2';
  if (clean.startsWith('10.5-') || clean === '10.5') return '10.5';
  if (clean.startsWith('12-') || clean === '12') return '12';
  if (clean.startsWith('13-') || clean === '13') return '13';
  if (clean.startsWith('14-') || clean === '14') return '14';
  if (clean.startsWith('16.0-') || clean === '16.0' || clean === '16') return '16';
  if (clean.startsWith('17-') || clean === '17') return '17';
  if (clean.startsWith('18-') || clean === '18') return '18';
  if (clean.startsWith('20-') || clean === '20') return '20';
  if (clean.startsWith('21-') || clean === '21') return '21';
  if (clean.startsWith('31-') || clean === '31') return '31';
  if (clean.startsWith('32-') || clean === '32') return '32';
  if (clean.startsWith('33-') || clean === '33') return '33';
  if (clean.startsWith('34-') || clean === '34') return '34';
  if (clean.startsWith('35-') || clean === '35') return '35';
  if (clean.startsWith('40-') || clean === '40') return '40';
  
  // Extract leading number from start
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  if (match) {
    const code = match[1];
    if (code === "10.0" || code === "10") return "10";
    if (code === "16.0" || code === "16") return "16";
    return code;
  }
  
  // Keyword fallbacks
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
  
  return clean;
}

export function getMacroCategoriaRecurso(recursoStr: string): 'Aportes de la Nación' | 'Recursos Propios' | 'Extensión y Posgrados' | 'Estampilla Pro UPTC' {
  const clean = String(recursoStr || '').trim();

  // Excel Formula Logic: SI(O(D2="10.0..."; D2="10.1..."; ...); "Aportes de la Nación")
  if (
    clean.includes("10.0-Aportes Nacion") || clean.startsWith("10.0") || clean === "10" ||
    clean.includes("10.1-Aportes") || clean.startsWith("10.1") ||
    clean.includes("10.2-Aportes") || clean.startsWith("10.2") ||
    clean.includes("10.5-Aportes") || clean.startsWith("10.5") || clean.toLowerCase().includes("gratuidad") ||
    clean.includes("12-Estampillas") || clean.startsWith("12-") || clean === "12" ||
    clean.includes("13-Cooperativas") || clean.startsWith("13-") || clean === "13" ||
    clean.includes("14-Matriculas FSE") || clean.startsWith("14-") || clean === "14" ||
    clean.includes("16.0-Aportes") || clean.startsWith("16.0") || clean === "16" ||
    clean.includes("17-Devolucion") || clean.startsWith("17-") || clean === "17" ||
    clean.includes("18-Articulo 87") || clean.startsWith("18-") || clean === "18"
  ) {
    return "Aportes de la Nación";
  }

  if (
    clean.includes("20-Propios") || clean.startsWith("20-") || clean === "20" || clean.toLowerCase().includes("propios") ||
    clean.includes("21-Devolucion IVA") || clean.startsWith("21-") || clean === "21" || clean.toLowerCase().includes("iva")
  ) {
    return "Recursos Propios";
  }

  if (
    clean.includes("31-Posgrados") || clean.startsWith("31-") || clean === "31" || clean.toLowerCase().includes("posgrado") ||
    clean.includes("32-Extension") || clean.startsWith("32-") || clean === "32" || clean.toLowerCase().includes("extension") ||
    clean.includes("33-Convenios con derechos") || clean.startsWith("33-") || clean === "33" ||
    clean.includes("34-Convenios sin derechos") || clean.startsWith("34-") || clean === "34" ||
    clean.includes("35-Educacion continuada") || clean.startsWith("35-") || clean === "35"
  ) {
    return "Extensión y Posgrados";
  }

  if (clean.includes("40-Estampilla UPTC") || clean.startsWith("40-") || clean === "40" || clean.toLowerCase().includes("estampilla uptc")) {
    return "Estampilla Pro UPTC";
  }

  return "Aportes de la Nación";
}

export function getCategoriaGastoFromCodigo(codigoConcepto: string): string {
  // Excel Formula Logic:
  // =SI(IZQUIERDA(B2;5)="2.1.1";"2.1.1 Gastos de Personal";SI(IZQUIERDA(B2;5)="2.1.2";"2.1.2 Gastos de Funcionamiento";SI(IZQUIERDA(B2;5)="2.1.3";"2.1.3 Transferencias Corrientes";SI(IZQUIERDA(B2;5)="2.1.8";"2.1.8 Tasas y Multas";SI(IZQUIERDA(B2;5)="2.2.2";"2.2.2 Servicios de la Deuda";"2.3 Gastos de Inversión")))))
  const clean = String(codigoConcepto || '').trim();
  const left5 = clean.substring(0, 5);

  if (left5 === "2.1.1") return "2.1.1 Gastos de Personal";
  if (left5 === "2.1.2") return "2.1.2 Gastos de Funcionamiento";
  if (left5 === "2.1.3") return "2.1.3 Transferencias Corrientes";
  if (left5 === "2.1.8") return "2.1.8 Tasas y Multas";
  if (left5 === "2.2.2") return "2.2.2 Servicios de la Deuda";
  return "2.3 Gastos de Inversión";
}

export function getRowResourceCode(row: any, year: number): string {
  if (year === 2026) {
    const vigStr = String(row['Vigencia'] || row['Unidad'] || '');
    if (vigStr.toLowerCase().includes('administra') || vigStr.toLowerCase().includes('01') || vigStr.toLowerCase().includes('unidad')) {
      return String(row['Codigo'] || row['Código concepto'] || '').trim();
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
