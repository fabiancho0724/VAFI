export const RECURSOS_FINANCIEROS = [
  { codigo: '10', nombre: '10.0 - Aportes Nación - Funcionamiento' },
  { codigo: '10.1', nombre: '10.1 - Aportes Nación - PIC Convencional' },
  { codigo: '10.2', nombre: '10.2 - Aportes Nación - PIC Territorial' },
  { codigo: '10.5', nombre: '10.5 - Aportes Nación - Política de Gratuidad' },
  { codigo: '12', nombre: '12 - Estampillas Otras Universidades' },
  { codigo: '13', nombre: '13 - Cooperativas' },
  { codigo: '14', nombre: '14 - Matrículas FSE' },
  { codigo: '16', nombre: '16.0 - Aportes Inversión' },
  { codigo: '17', nombre: '17 - Devolución Descuento Electoral' },
  { codigo: '18', nombre: '18 - Artículo 87 CESU' },
  { codigo: '20', nombre: '20 - Recursos Propios' },
  { codigo: '21', nombre: '21 - Devolución IVA' },
  { codigo: '31', nombre: '31 - Posgrados' },
  { codigo: '32', nombre: '32 - Extensión' },
  { codigo: '33', nombre: '33 - Convenios con Derechos' },
  { codigo: '34', nombre: '34 - Convenios sin Derechos' },
  { codigo: '35', nombre: '35 - Educación Continuada' },
  { codigo: '40', nombre: '40 - Estampilla UPTC' }
];

export const RECURSOS_FIJOS_RESOLUCION: Record<string, { nombre: string; valorCOP: number; valorM: number; resolucion: string }> = {
  '10': { nombre: '10.0 Aportes Nación - Funcionamiento', valorCOP: 315327817734, valorM: 315327.817734, resolucion: 'Resolución MEN - Ley 30/92' },
  '10.1': { nombre: '10.1 Aportes Nación - PIC Convencional', valorCOP: 9756716832, valorM: 9756.716832, resolucion: 'Resolución MEN - PIC Convencional' },
  '10.2': { nombre: '10.2 Aportes Nación - PIC Territorial', valorCOP: 3996689616, valorM: 3996.689616, resolucion: 'Resolución MEN - PIC Territorial' },
  '10.5': { nombre: '10.5 Aportes Nación - Política de Gratuidad', valorCOP: 20708427143, valorM: 20708.427143, resolucion: 'Resolución MEN - Gratuidad Ley 2307' },
  '12': { nombre: '12 Estampillas Otras Universidades', valorCOP: 17266074177.51, valorM: 17266.07417751, resolucion: 'Ley 1697 / Estampilla Pro-UNAL' },
  '13': { nombre: '13 Cooperativas', valorCOP: 2128172432, valorM: 2128.172432, resolucion: 'Art. 142 Ley 1819 / DIAN' },
  '14': { nombre: '14 Matrículas FSE', valorCOP: 19625510937, valorM: 19625.510937, resolucion: 'Fondo de Solidaridad Educativa' },
  '16': { nombre: '16.0 Aportes Inversión', valorCOP: 12877120952, valorM: 12877.120952, resolucion: 'Presupuesto General de la Nación - Inversión' },
  '17': { nombre: '17 Devolución Descuento Electoral', valorCOP: 5447536009, valorM: 5447.536009, resolucion: 'Ley 403 / MinHacienda' },
  '18': { nombre: '18 Artículo 87 CESU', valorCOP: 1035929640, valorM: 1035.929640, resolucion: 'Artículo 87 Ley 30 / CESU' }
};

export const TIPOS_GASTO = [
  'Gastos de Personal',
  'Gastos de Funcionamiento',
  'Transferencias',
  'Inversión',
  'Servicio de la Deuda',
  'Otros Gastos'
];
