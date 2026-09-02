import { MACRO_INDICATORS } from './macroData';

export type ModelType = 'Regresión Lineal' | 'Holt Smoothing' | 'ARIMA (1,1,0)' | 'Estructural (Marco Fiscal)';

export interface ForecastResult {
  modelName: ModelType;
  projectedValue: number;
  projectedIncreasePercent: number; // vs last expense
  mape: number;
  rmse: number;
  r2: number;
  history: number[];
  fitted: number[];
}

export interface ScenarioProjections {
  base: number;
  conservative: number;
  pressure: number;
}

export function calculateMAPE(actual: number[], forecast: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - forecast[i]) / actual[i]);
      count++;
    }
  }
  return count === 0 ? 0 : (sum / count) * 100;
}

export function calculateRMSE(actual: number[], forecast: number[]): number {
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += Math.pow(actual[i] - forecast[i], 2);
  }
  return Math.sqrt(sum / actual.length);
}

export function calculateR2(actual: number[], forecast: number[]): number {
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < actual.length; i++) {
    ssTot += Math.pow(actual[i] - mean, 2);
    ssRes += Math.pow(actual[i] - forecast[i], 2);
  }
  if (ssTot === 0) return 1;
  const r2 = 1 - (ssRes / ssTot);
  return Math.max(0, r2) * 100;
}

export function runLinearRegression(y: number[]): ForecastResult {
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const fitted = x.map(val => intercept + slope * val);
  const nextVal = intercept + slope * (n + 1);

  return {
    modelName: 'Regresión Lineal',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted),
    rmse: calculateRMSE(y, fitted),
    r2: calculateR2(y, fitted),
    history: y,
    fitted
  };
}

export function runHoltSmoothing(y: number[], alpha = 0.6, beta = 0.4): ForecastResult {
  const n = y.length;
  let level = y[0];
  let trend = y[1] - y[0];
  const fitted = [y[0]];

  for (let i = 1; i < n; i++) {
    const lastLevel = level;
    level = alpha * y[i] + (1 - alpha) * (lastLevel + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    fitted.push(level + trend);
  }
  const nextVal = level + trend;

  return {
    modelName: 'Holt Smoothing',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted.slice(0, n)),
    rmse: calculateRMSE(y, fitted.slice(0, n)),
    r2: calculateR2(y, fitted.slice(0, n)),
    history: y,
    fitted: fitted.slice(0, n)
  };
}

export function runARIMA(y: number[]): ForecastResult {
  const n = y.length;
  if (n < 3) return runLinearRegression(y);
  
  const diff1 = [];
  for (let i = 1; i < n; i++) {
    diff1.push(y[i] - y[i-1]);
  }
  
  let sumY = 0, sumY_prev = 0, sumYY_prev = 0, sumY_prevSq = 0;
  for (let i = 1; i < diff1.length; i++) {
    sumY += diff1[i];
    sumY_prev += diff1[i-1];
    sumYY_prev += diff1[i] * diff1[i-1];
    sumY_prevSq += diff1[i-1] * diff1[i-1];
  }
  
  const m = diff1.length - 1;
  const phi = m === 0 ? 0 : (m * sumYY_prev - sumY_prev * sumY) / (m * sumY_prevSq - sumY_prev * sumY_prev);
  const c = m === 0 ? 0 : (sumY - phi * sumY_prev) / m;
  
  const fitted = [y[0]];
  for (let i = 1; i < n; i++) {
    if (i === 1) {
      fitted.push(y[i]);
    } else {
      const prevDiff = y[i-1] - y[i-2];
      const estDiff = c + phi * prevDiff;
      fitted.push(y[i-1] + estDiff);
    }
  }
  
  const lastDiff = y[n-1] - y[n-2];
  const nextDiff = c + phi * lastDiff;
  const nextVal = y[n-1] + nextDiff;

  return {
    modelName: 'ARIMA (1,1,0)',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted),
    rmse: calculateRMSE(y, fitted),
    r2: calculateR2(y, fitted),
    history: y,
    fitted
  };
}

export function runStructuralModel(y: number[], years: number[]): ForecastResult {
  const n = y.length;
  const fitted = [y[0]];
  
  for (let i = 1; i < n; i++) {
    const macro = MACRO_INDICATORS[years[i]] || { ipc: 5, ices: 6 };
    // Assuming 60% of expenses grow with ICES/IPC + premium, 40% with IPC
    // Simplified elasticity factor
    const elasticity = 1 + ((macro.ices || macro.ipc) / 100) * 1.1; 
    fitted.push(y[i-1] * elasticity);
  }

  // Project 2027 based on MFMP 2026 projection (IPC 4.4%, implies ICES ~ 5.5%)
  const projectedElasticity = 1 + (5.5 / 100) * 1.1;
  const nextVal = y[n-1] * projectedElasticity;

  return {
    modelName: 'Estructural (Marco Fiscal)',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted),
    rmse: calculateRMSE(y, fitted),
    r2: calculateR2(y, fitted),
    history: y,
    fitted
  };
}

export function getAllModels(budgets: number[], years: number[]): ForecastResult[] {
    return [
        runLinearRegression(budgets),
        runHoltSmoothing(budgets),
        runARIMA(budgets),
        runStructuralModel(budgets, years)
    ];
}

export function selectBestModel(budgets: number[], years: number[]): ForecastResult {
  const models = getAllModels(budgets, years);
  return models.reduce((prev, curr) => (prev.mape < curr.mape ? prev : curr));
}

export function getScenarios(basePercentage: number): ScenarioProjections {
  return {
    conservative: Math.max(0, basePercentage - 2.5),
    base: basePercentage,
    pressure: basePercentage + 3.2
  };
}
