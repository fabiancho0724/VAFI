import { MACRO_INDICATORS } from './macroData';

export type ModelType = 'Linear Regression' | 'Multivariate (IPC + SM)' | 'Holt Smoothing';

export interface ForecastResult {
  modelName: ModelType;
  projectedValue: number;
  projectedIncreasePercent: number;
  mape: number;
  rmse: number;
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

// 1. Simple Linear Regression
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
    modelName: 'Linear Regression',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted),
    rmse: calculateRMSE(y, fitted),
    history: y,
    fitted
  };
}

// 2. Holt's Linear Trend (Simplified)
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
    history: y,
    fitted: fitted.slice(0, n)
  };
}

// 3. Simple Multivariate (incorporating IPC)
export function runMultivariate(y: number[], years: number[]): ForecastResult {
  // Using IPC to adjust the base trend
  const n = y.length;
  const fitted = [];
  
  // Baseline growth from inflation
  let projectedVal = y[n - 1];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      fitted.push(y[0]);
    } else {
      const ipc = MACRO_INDICATORS[years[i]]?.ipc || 5;
      const factor = 1 + (ipc / 100);
      // Average historical real growth + inflation
      fitted.push(y[i - 1] * factor * 1.02); // assuming 2% real growth historically
    }
  }

  const nextIpc = MACRO_INDICATORS[years[n - 1]]?.ipc || 4; // Using last known IPC for next year proxy
  const nextVal = y[n - 1] * (1 + (nextIpc / 100)) * 1.02;

  return {
    modelName: 'Multivariate (IPC + SM)',
    projectedValue: nextVal,
    projectedIncreasePercent: ((nextVal - y[n - 1]) / y[n - 1]) * 100,
    mape: calculateMAPE(y, fitted),
    rmse: calculateRMSE(y, fitted),
    history: y,
    fitted
  };
}

export function selectBestModel(budgets: number[], years: number[]): ForecastResult {
  if (budgets.length < 3) return runLinearRegression(budgets); // Fallback

  const models = [
    runLinearRegression(budgets),
    runHoltSmoothing(budgets),
    runMultivariate(budgets, years)
  ];

  // Select the model with the lowest MAPE
  return models.reduce((prev, curr) => (prev.mape < curr.mape ? prev : curr));
}

export function getScenarios(bestModel: ForecastResult): ScenarioProjections {
  const base = bestModel.projectedIncreasePercent;
  return {
    conservative: Math.max(0, base - 2.5),
    base: base,
    pressure: base + 3.2
  };
}
