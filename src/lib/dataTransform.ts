import { fetchAndParseCSV } from './csvParser';
import { RECURSOS_FINANCIEROS, TIPOS_GASTO } from './constants';

export interface FinancialData {
  ingresosTotales: number;
  gastosTotales: number;
  ingresosPorRecurso: Record<string, number>;
  gastosPorRecurso: Record<string, number>;
  gastosPorTipo: Record<string, number>;
  flujoMensual: { mes: string, ingreso: number, gasto: number, saldo: number }[];
}

export const loadFinancialData = async () => {
  // URLs updated with the exact paths specified by the user
  const urls = {
    ingresos: 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv',
    gastos: 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv',
    ingresoMensual2026: 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingreso%20Mensual%202026.csv',
    nomina: 'https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Nomina.csv'
  };

  const [ingresosRaw, gastosRaw, ingresoMensualRaw] = await Promise.all([
    fetchAndParseCSV(urls.ingresos),
    fetchAndParseCSV(urls.gastos),
    fetchAndParseCSV(urls.ingresoMensual2026)
  ]);

  return normalizeData(ingresosRaw, gastosRaw, ingresoMensualRaw);
};

export const normalizeData = (ingresosRaw: any[], gastosRaw: any[], ingresoMensualRaw: any[]) => {
  let ingresosTotales = 0;
  let gastosTotales = 0;
  
  const ingresosPorRecurso: Record<string, number> = {};
  const gastosPorRecurso: Record<string, number> = {};
  const gastosPorTipo: Record<string, number> = {};
  
  // Normalize Ingresos
  if (ingresosRaw && ingresosRaw.length > 0) {
    const keys = Object.keys(ingresosRaw[0]);
    const aforoCol = keys[5] || 'Valor aforo';
    const recaudoCol = keys[6] || 'Total recaudo';
    const recursoCol = keys[2] || 'Recurso'; // "10.0-Aportes Nacion..."

    ingresosRaw.forEach(row => {
      const recaudo = parseFloat(String(row[recaudoCol]).replace(/[^0-9.-]+/g, '')) || 0;
      ingresosTotales += recaudo;

      let recursoId = String(row[recursoCol]).split('-')[0].trim();
      if (!ingresosPorRecurso[recursoId]) ingresosPorRecurso[recursoId] = 0;
      ingresosPorRecurso[recursoId] += recaudo;
    });
  }

  // Normalize Gastos
  if (gastosRaw && gastosRaw.length > 0) {
    const keys = Object.keys(gastosRaw[0]);
    // As seen in Gastos, "Tipo de gasto" contains the Recurso, "Código recurso" contains the type
    // We will just search by content to be safe.
    
    gastosRaw.forEach(row => {
      const pago = parseFloat(String(row[keys[keys.length - 1]] || row['Valor pago']).replace(/[^0-9.-]+/g, '')) || 0;
      gastosTotales += pago;

      let recursoText = String(row['Tipo de gasto'] || row[keys[7]] || '');
      let recursoId = recursoText.split('-')[0].trim();
      
      let tipoText = String(row['Código recurso'] || row[keys[8]] || '');
      let tipoNormalizado = 'Otros Gastos';
      if (tipoText.includes('2.1.1')) tipoNormalizado = 'Gastos de Personal';
      else if (tipoText.includes('2.1.2')) tipoNormalizado = 'Gastos de Funcionamiento';
      else if (tipoText.includes('2.3')) tipoNormalizado = 'Inversión';
      else if (tipoText.includes('Transferencias')) tipoNormalizado = 'Transferencias';
      
      if (!gastosPorRecurso[recursoId]) gastosPorRecurso[recursoId] = 0;
      gastosPorRecurso[recursoId] += pago;
      
      if (!gastosPorTipo[tipoNormalizado]) gastosPorTipo[tipoNormalizado] = 0;
      gastosPorTipo[tipoNormalizado] += pago;
    });
  }

  // Normalize Ingresos Mensuales
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const flujoMensual = mesesNombres.map(mes => ({ mes, ingreso: 0, gasto: 0, saldo: 0 }));

  if (ingresoMensualRaw && ingresoMensualRaw.length > 0) {
    const keys = Object.keys(ingresoMensualRaw[0]);
    
    ingresoMensualRaw.forEach(row => {
      meses.forEach((mesAbr, idx) => {
        // Find column that contains "Valor " + mesAbr
        const colName = keys.find(k => k.toLowerCase().includes('valor ' + mesAbr));
        if (colName) {
          const val = parseFloat(String(row[colName]).replace(/[^0-9.-]+/g, '')) || 0;
          flujoMensual[idx].ingreso += val;
        }
      });
    });
  }

  // Simulated Gastos Mensuales (distributing total proportionally for now until we have real monthly expenses)
  const totalGastoMensualProp = gastosTotales / 6; // As of Jun (6 months)
  flujoMensual.forEach((mes, idx) => {
     if (idx < 6) {
       mes.gasto = totalGastoMensualProp;
     }
  });

  // Calculate saldos
  let saldoAcumulado = 0;
  flujoMensual.forEach(mes => {
    saldoAcumulado += (mes.ingreso - mes.gasto);
    mes.saldo = saldoAcumulado;
  });

  return {
    ingresosTotales,
    gastosTotales,
    ingresosPorRecurso,
    gastosPorRecurso,
    gastosPorTipo,
    flujoMensual
  };
};
