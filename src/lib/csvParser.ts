import Papa from 'papaparse';

export async function fetchAndParseCSV(url: string): Promise<any[]> {
  try {
    let targetUrl = url;
    if (url.includes('raw.githubusercontent.com') || url.includes('github.com')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1]; // e.g. "Ingresos.csv" or "Gastos.csv"
      targetUrl = `/api/data/${filename}`;
    }
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
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
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
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

export function groupAndSum(data: any[], groupCol: string, sumCol: string) {
  const result: Record<string, number> = {};
  data.forEach(row => {
    const group = row[groupCol] || 'Otros';
    const val = row[sumCol] || 0;
    if (!result[group]) result[group] = 0;
    // ensure value is a number
    let numVal = typeof val === 'number' ? val : parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
    result[group] += numVal;
  });
  return Object.entries(result).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
