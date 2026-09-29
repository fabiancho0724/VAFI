import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un valor monetario (en COP brutos) a Millones de Pesos Colombianos ($ M).
 * Ejemplo: 404861065147 -> "$ 404.861,1 M"
 *          537100000    -> "$ 537,1 M"
 *          6700000      -> "$ 6,7 M"
 *          450000       -> "$ 0,45 M"
 *          0            -> "$ 0 M"
 */
export function formatMillions(value: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '$ 0 M';
  const inM = value / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : decimals;
  const formatted = abs.toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: maxDec
  });
  return `${sign}$ ${formatted} M`;
}

/**
 * Formato compacto en millones de pesos colombianos.
 * Si no tiene decimales significativos muestra número entero ($ 404.861 M).
 */
export function formatMillionsShort(value: number): string {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '$ 0 M';
  const inM = value / 1e6;
  const abs = Math.abs(inM);
  const sign = inM < 0 ? '-' : '';
  const maxDec = abs < 1 && abs > 0 ? 2 : 1;
  const formatted = abs.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec
  });
  return `${sign}$ ${formatted} M`;
}
