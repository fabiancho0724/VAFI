export const MACRO_INDICATORS: Record<number, { ipc: number; salarioMinimo: number; decreto1279: number; ices?: number }> = {
  2016: { ipc: 5.75, salarioMinimo: 7.0, decreto1279: 2.5, ices: 3.5 },
  2017: { ipc: 4.09, salarioMinimo: 7.0, decreto1279: 2.5, ices: 3.5 },
  2018: { ipc: 3.18, salarioMinimo: 5.9, decreto1279: 2.5, ices: 3.5 },
  2019: { ipc: 3.80, salarioMinimo: 6.0, decreto1279: 2.5, ices: 3.5 },
  2020: { ipc: 1.61, salarioMinimo: 6.0, decreto1279: 2.5, ices: 4.50 }, // (3.43 I sem, 1.04 II sem)
  2021: { ipc: 5.62, salarioMinimo: 3.5, decreto1279: 2.61, ices: 2.44 }, // (1.18 I sem, 1.25 II sem)
  2022: { ipc: 13.12, salarioMinimo: 10.07, decreto1279: 7.26, ices: 8.90 }, // (6.41 I sem, 2.34 II sem)
  2023: { ipc: 9.28, salarioMinimo: 16.0, decreto1279: 14.62, ices: 11.66 }, // (5.98 I sem, 5.36 II sem)
  2024: { ipc: 5.2, salarioMinimo: 12.0, decreto1279: 10.88, ices: 8.44 }, // (6.55 I sem, 1.77 II sem)
  2025: { ipc: 5.1, salarioMinimo: 9.5, decreto1279: 8.6, ices: 6.14 }, // (3.28 I sem, 2.77 II sem)
  2026: { ipc: 4.0, salarioMinimo: 23.0, decreto1279: 7.0, ices: 6.66 }, // (6.66 I sem)
};

export const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
