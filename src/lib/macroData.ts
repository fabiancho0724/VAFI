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
  // 2026: Basado en Supuestos Macroeconómicos MFMP Ministerio de Hacienda (IPC 6.0%, SMMLV IPC+2.2%=8.2%, Trabajadores IPC+1.9%=7.9%)
  2026: { ipc: 6.0, salarioMinimo: 8.2, decreto1279: 7.9, ices: 6.66 },
  // 2027: Proyectado con IPC 7.0% (según directriz UPTC), SMMLV IPC+2.2% = 9.2%, Trabajadores IPC+1.9% = 8.9%
  2027: { ipc: 7.0, salarioMinimo: 9.2, decreto1279: 8.9, ices: 7.0 },
};

export const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export interface MacroeconomicAssumptionItem {
  indicador: string;
  valor2026: string;
  valor2027: string;
  formula: string;
  impacto: string;
}

export const SUPUESTOS_MACROECONOMICOS_MFMP: MacroeconomicAssumptionItem[] = [
  {
    indicador: 'Inflación doméstica fin de periodo, IPC (%)',
    valor2026: '6,0%',
    valor2027: '7,0%',
    formula: 'Meta proyectada de inflación',
    impacto: 'Indexación de ingresos Art. 86 y ajuste general de costos universitarios.'
  },
  {
    indicador: 'PIB real (variación %)',
    valor2026: '2,6%',
    valor2027: '2,4%',
    formula: 'Tasa de crecimiento en volumen',
    impacto: 'Comportamiento de la actividad económica y dinámica de matrículas.'
  },
  {
    indicador: 'PIB nominal (variación %)',
    valor2026: '9,0%',
    valor2027: '9,5%',
    formula: 'PIB real + deflactor implícito',
    impacto: 'Base de ingresos fiscales y transferencias tributarias del Estado.'
  },
  {
    indicador: 'Salario mínimo legal mensual vigente SMMLV (%)',
    valor2026: '8,2%',
    valor2027: '9,2%',
    formula: 'IPC + 2,2%',
    impacto: 'Presión directa en prestaciones sociales, auxilio de transporte y servicios.'
  },
  {
    indicador: 'Incremento salario trabajadores (%)',
    valor2026: '7,9%',
    valor2027: '8,9%',
    formula: 'IPC + 1,9%',
    impacto: 'Ajuste contractual de nómina administrativa y acuerdos convencionales.'
  },
  {
    indicador: 'Techos presupuestales facultades y unidades administrativas',
    valor2026: '6,0%',
    valor2027: '7,0%',
    formula: 'IPC',
    impacto: 'Fundamento vinculante para fijar la Proyección del Incremento Presupuestal al 7,0%.'
  }
];
