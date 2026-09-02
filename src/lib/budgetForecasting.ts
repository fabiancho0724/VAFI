import { MACRO_INDICATORS } from './macroData';

export type ModelType = 'Regresión Lineal' | 'Holt Smoothing' | 'ARIMA (1,1,0)';

export interface ForecastResult {
  modelName: ModelType;
  projectedValue: number;
  projectedIncreasePercent: number;
  mape: number; // Error
  rmse: number;
  r2: number;   // Grado de veracidad
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
  return Math.max(0, r2) * 100; // Return as percentage for "Veracidad"
}

// 1. Regresión Lineal
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

// 2. Holt Smoothing
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

// 3. ARIMA (1,1,0) - Simplified AutoRegressive Integrated Moving Average
export function runARIMA(y: number[]): ForecastResult {
  const n = y.length;
  if (n < 3) return runLinearRegression(y);
  
  // Diff 1
  const diff1 = [];
  for (let i = 1; i < n; i++) {
    diff1.push(y[i] - y[i-1]);
  }
  
  // AR(1) on diff1
  let sumY = 0, sumY_prev = 0, sumYY_prev = 0, sumY_prevSq = 0;
  for (let i = 1; i < diff1.length; i++) {
    sumY += diff1[i];
    sumY_prev += diff1[i-1];
    sumYY_prev += diff1[i] * diff1[i-1];
    sumY_prevSq += diff1[i-1] * diff1[i-1];
  }
  
  const m = diff1.length - 1;
  const phi = (m * sumYY_prev - sumY_prev * sumY) / (m * sumY_prevSq - sumY_prev * sumY_prev);
  const c = (sumY - phi * sumY_prev) / m;
  
  const fitted = [y[0]];
  for (let i = 1; i < n; i++) {
    if (i === 1) {
      fitted.push(y[i]); // Seed
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

export function selectBestModel(budgets: number[], years: number[]): ForecastResult {
  if (budgets.length < 3) return runLinearRegression(budgets);

  const models = [
    runLinearRegression(budgets),
    runHoltSmoothing(budgets),
    runARIMA(budgets)
  ];

  return models.reduce((prev, curr) => (prev.mape < curr.mape ? prev : curr));
}

export function getAllModels(budgets: number[]): ForecastResult[] {
    return [
        runLinearRegression(budgets),
        runHoltSmoothing(budgets),
        runARIMA(budgets)
    ];
}

export function getScenarios(bestModel: ForecastResult): ScenarioProjections {
  const base = bestModel.projectedIncreasePercent;
  return {
    conservative: Math.max(0, base - 2.5),
    base: base,
    pressure: base + 3.2
  };
}
