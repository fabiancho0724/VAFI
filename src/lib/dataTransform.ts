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
  // URLs pointing directly to local public/data databases
  const urls = {
    ingresos: '/data/Ingresos.csv',
    gastos: '/data/Gastos.csv',
    ingresoMensual2026: '/data/Ingreso%20Mensual%202026.csv',
    nomina: '/data/Nomina.csv'
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
    const aforoCol = keys.find(k => k.toLowerCase().includes('aforo')) || keys[5] || 'Valor aforo';
    const recaudoCol = keys.find(k => k.toLowerCase().includes('recaudo')) || keys[6] || 'Total recaudo';
    const recursoCol = keys.find(k => k.toLowerCase().includes('recurso')) || keys[3] || 'Recurso';

    ingresosRaw.forEach(row => {
      const recaudo = parseFloat(String(row[recaudoCol] || 0).replace(/[^0-9.-]+/g, '')) || 0;
      ingresosTotales += recaudo;

      let recursoId = String(row[recursoCol] || '').split('-')[0].trim();
      if (!ingresosPorRecurso[recursoId]) ingresosPorRecurso[recursoId] = 0;
      ingresosPorRecurso[recursoId] += recaudo;
    });
  }

  // Normalize Gastos
  if (gastosRaw && gastosRaw.length > 0) {
    const keys = Object.keys(gastosRaw[0]);
    const compCol = keys.find(k => k.toLowerCase().includes('compromiso')) || keys[8] || 'Acumulado compromiso';
    const pagoCol = keys.find(k => k.toLowerCase().includes('pago')) || keys[9] || 'Acumulado pago';
    const recCol = keys.find(k => k.toLowerCase().includes('recurso')) || keys[5] || 'Recurso';
    const tipoCol = keys.find(k => k.toLowerCase().includes('tipo de gasto')) || keys[1] || 'Tipo de Gasto';
    const codigoCol = keys.find(k => k.toLowerCase().includes('código') || k.toLowerCase().includes('codigo')) || keys[3] || 'Código concepto';
    
    gastosRaw.forEach(row => {
      const pago = parseFloat(String(row[pagoCol] || 0).replace(/[^0-9.-]+/g, '')) || 0;
      gastosTotales += pago;

      let recursoText = String(row[recCol] || '');
      let recursoId = recursoText.split('-')[0].trim();
      
      let tipoText = String(row[tipoCol] || row[codigoCol] || '');
      let tipoNormalizado = 'Otros Gastos';
      if (tipoText.includes('2.1.1')) tipoNormalizado = 'Gastos de Personal';
      else if (tipoText.includes('2.1.2')) tipoNormalizado = 'Gastos de Funcionamiento';
      else if (tipoText.includes('2.1.3')) tipoNormalizado = 'Transferencias Corrientes';
      else if (tipoText.includes('2.1.8')) tipoNormalizado = 'Tasas y Multas';
      else if (tipoText.includes('2.2.2')) tipoNormalizado = 'Servicios de la Deuda';
      else if (tipoText.includes('2.3')) tipoNormalizado = 'Gastos de Inversión';
      
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
  const totalGastoMensualProp = gastosTotales / 7; // As of Jul (7 months)
  flujoMensual.forEach((mes, idx) => {
     if (idx < 7) {
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
