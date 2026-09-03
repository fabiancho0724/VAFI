import Papa from 'papaparse';

export async function fetchAndParseCSV(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    const delimiter = text.includes(';') ? ';' : ',';
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        delimiter: delimiter,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  } catch (error) {
    console.error(`Failed to fetch CSV from ${url}:`, error);
    throw error;
  }
}

export function parseLocalCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const delimiter = text.includes(';') ? ';' : ',';
      Papa.parse(text, {
        header: true,
        delimiter: delimiter,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Helper to find a likely numeric column for totals
export function getNumericColumn(data: any[]): string | null {
  if (!data || data.length === 0) return null;
  const sample = data[0];
  const possibleNames = ['valor', 'monto', 'total', 'precio', 'cantidad', 'asignacion_inicial', 'recaudo', 'ejecucion', 'presupuesto'];
  for (const name of possibleNames) {
    const found = Object.keys(sample).find(k => k.toLowerCase().includes(name));
    if (found) return found;
  }
  // fallback to first number
  for (const key of Object.keys(sample)) {
    if (typeof sample[key] === 'number') return key;
  }
  return null;
}

// Helper to find a category column
export function getCategoryColumn(data: any[], preferredNames: string[] = ['concepto', 'rubro', 'tipo_vinculacion', 'vinculacion', 'categoria', 'nombre']): string | null {
  if (!data || data.length === 0) return null;
  const sample = data[0];
  for (const name of preferredNames) {
    const found = Object.keys(sample).find(k => k.toLowerCase().includes(name));
    if (found) return found;
  }
  // fallback to first string
  for (const key of Object.keys(sample)) {
    if (typeof sample[key] === 'string' && key.toLowerCase() !== 'id') return key;
  }
  return null;
}

export function parseNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim();
  if (!s) return 0;
  s = s.replace(/[\$ ]/g, '');
  
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount > 1) {
      s = s.replace(/,/g, '');
    } else {
      const parts = s.split(',');
      if (parts[1] && parts[1].length === 3 && parts[0].length >= 1) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
    }
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

export function groupAndSum(data: any[], groupCol: string, sumCol: string) {
  const result: Record<string, number> = {};
  data.forEach(row => {
    const group = row[groupCol] || 'Otros';
    const val = row[sumCol];
    if (!result[group]) result[group] = 0;
    result[group] += parseNumber(val);
  });
  return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function formatFechaCorte(rawDate: string): string {
  if (!rawDate) return '31 de Agosto de 2026';
  const clean = String(rawDate).trim();
  const parts = clean.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${day} de ${months[monthIdx]} de ${year}`;
    }
  }
  return clean;
}
