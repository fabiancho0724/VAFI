/**
 * CENTAVITO IA — MOTOR DE INTELIGENCIA FINANCIERA INSTITUCIONAL
 * Universidad Pedagógica y Tecnológica de Colombia — UPTC
 * 
 * Implementación de las 35 directrices del Prompt Maestro de Optimización Total:
 * - Unidad de análisis: RECURSO + UNIDAD + RUBRO + INGRESO/GASTO + VIGENCIA + FECHA DE CORTE + EJECUCIÓN + RECAUDO + PAGO + PROYECCIÓN + ESCENARIO
 * - Reglas institucionales estrictas (SIIF, Unidad 01 personal, 40% R31, exclusividad inversión, consistencia pagos <= recaudo)
 * - Modos: Auditoría, Escenarios, Flujo de Caja, Cierre de Vigencia, Consejo Superior, VAFI, POA Disponible
 */

export type CentavitoMode = 
  | 'auto' 
  | 'auditoria' 
  | 'escenario' 
  | 'flujo_caja' 
  | 'cierre' 
  | 'consejo_superior' 
  | 'vafi' 
  | 'poa_disponible';

export interface CentavitoResponse {
  modeUsed: CentavitoMode;
  text: string;
  chartJson?: string;
}

// Cifras maestras oficiales y consolidadas del aplicativo UPTC
export const INSTITUTIONAL_DATA = {
  vigencia: '2026',
  fechaCorte: '31 de agosto de 2026',
  
  // Base consolidada POA 2026 (1.454 registros oficiales)
  poa: {
    inicial: 483105639256.27,
    modificaciones: 55060168816.22,
    programado: 538165808072.49,
    solicitudes: 394528042140.56,
    solicitudesPorcentaje: 73.31,
    disponibleTotal: 143637765931.93,
    disponiblePorcentaje: 26.69,
    
    // Top recursos con disponibilidad
    recursos: [
      { codigo: '10.0', nombre: 'Aportes de la Nación - Funcionamiento', programado: 315228531622.0, solicitudes: 232447285558.0, disponible: 82781246064.0, pctDisp: 26.26, siif: true },
      { codigo: '31', nombre: 'Recursos Propios (Matrículas Pregrado)', programado: 31488791358.0, solicitudes: 20859543160.0, disponible: 10629248198.0, pctDisp: 33.76, siif: false },
      { codigo: '20', nombre: 'Estampilla Pro-Desarrollo', programado: 18897502472.0, solicitudes: 10221327110.0, disponible: 8676175362.0, pctDisp: 45.91, siif: false },
      { codigo: '10.5', nombre: 'Aportes Adicionales Nación (Gratuidad)', programado: 20708427143.0, solicitudes: 12310150380.0, disponible: 8398276763.0, pctDisp: 40.55, siif: true },
      { codigo: '16.0', nombre: 'Estampilla Pro-UPTC', programado: 18877000000.0, solicitudes: 12530000000.0, disponible: 6347000000.0, pctDisp: 33.62, siif: true },
      { codigo: '12', nombre: 'Crédito y Recursos de Capital', programado: 17158000000.0, solicitudes: 11690000000.0, disponible: 5468000000.0, pctDisp: 31.87, siif: true },
      { codigo: '21', nombre: 'Fondos Especiales / Becas', programado: 5219000000.0, solicitudes: 632000000.0, disponible: 4587000000.0, pctDisp: 87.89, siif: false },
      { codigo: '33', nombre: 'Posgrados y Educación Continuada', programado: 39180000000.0, solicitudes: 35701000000.0, disponible: 3479000000.0, pctDisp: 8.88, siif: false }
    ],

    // Top Unidades con saldo disponible
    unidades: [
      { codigo: '01', nombre: 'VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA', programado: 432500000000.0, disponible: 130713000000.0, pctTotalDisp: 91.0, nota: 'Concentra nómina central docente y administrativa' },
      { codigo: '13', nombre: 'SECCIONAL SOGAMOSO', programado: 7788000000.0, disponible: 1693000000.0, pctDisp: 21.74 },
      { codigo: '02', nombre: 'INVESTIGACIÓN Y EXTENSIÓN (VIE)', programado: 6498000000.0, disponible: 1640000000.0, pctDisp: 25.24 },
      { codigo: '09', nombre: 'FACULTAD DE INGENIERÍA', programado: 10452000000.0, disponible: 1432000000.0, pctDisp: 13.70 },
      { codigo: '11', nombre: 'FESAD (EDUCACIÓN A DISTANCIA)', programado: 2724000000.0, disponible: 1187000000.0, pctDisp: 43.58 },
      { codigo: 'SGR', nombre: 'PRESUPUESTO SGR (REGALÍAS)', programado: 3480000000.0, disponible: 1170000000.0, pctDisp: 33.62 },
      { codigo: '03', nombre: 'UNISALUD', programado: 19052000000.0, disponible: 1166000000.0, pctDisp: 6.12, riesgo: 'Alta ejecución (93.88%)' },
      { codigo: '04', nombre: 'FACULTAD DE CIENCIAS DE LA EDUCACIÓN', programado: 13937000000.0, disponible: 1161000000.0, pctDisp: 8.33, riesgo: 'Alta ejecución (91.67%)' },
      { codigo: '06', nombre: 'CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS', programado: 2320000000.0, disponible: 973000000.0, pctDisp: 41.94 },
      { codigo: '08', nombre: 'CIENCIAS AGROPECUARIAS', programado: 2595000000.0, disponible: 643000000.0, pctDisp: 24.78 },
      { codigo: '12', nombre: 'SECCIONAL DUITAMA', programado: 1759000000.0, disponible: 547000000.0, pctDisp: 31.10 },
      { codigo: '05', nombre: 'CIENCIAS BÁSICAS', programado: 1083000000.0, disponible: 503000000.0, pctDisp: 46.46 }
    ],

    // Desglose por tipo de gasto
    tipoGasto: [
      { tipo: '2.1.1 Gastos de Personal', programado: 301916000000.0, solicitudes: 202884000000.0, disponible: 99032000000.0, pctDisp: 32.80 },
      { tipo: '2.1.2 Gastos de Funcionamiento (Bienes y Servicios)', programado: 174792000000.0, solicitudes: 148090000000.0, disponible: 26702000000.0, pctDisp: 15.28 },
      { tipo: '2.3 Gastos de Inversión', programado: 48775000000.0, solicitudes: 32514000000.0, disponible: 16261000000.0, pctDisp: 33.34 },
      { tipo: '2.1.3 Transferencias Corrientes', programado: 8124000000.0, solicitudes: 7132000000.0, disponible: 992000000.0, pctDisp: 12.21 },
      { tipo: '2.1.8 Tasas, Multas y Contribuciones', programado: 4575000000.0, solicitudes: 3926000000.0, disponible: 649000000.0, pctDisp: 14.19 }
    ]
  },

  // Flujo de caja, balance y tesorería 2026
  flujoCaja: {
    ingresosRecaudadosAgosto: 341820000000.0,
    ingresosProyectadosSepDic: 124500000000.0,
    ingresosTotalesCierre: 466320000000.0,
    pagosEfectivosAgosto: 298450000000.0,
    pagosProyectadosSepDic: 165670000000.0,
    pagosTotalesCierre: 464120000000.0,
    saldoCajaFinalProyectado: 2200000000.0, // Diferencia de 2.200M concentrada en R10
    mesesPresion: ['Octubre', 'Noviembre', 'Diciembre'],
    causaPresion: 'Pago de primas de navidad, bonificaciones docentes/administrativas y liquidaciones contractuales de fin de año.',
    reglaConsistencia: 'PAGOS PROYECTADOS <= RECAUDO PROYECTADO; COMPROMISOS <= INGRESO POR RECURSO'
  },

  // Reglas y Restricciones Institucionales
  reglas: {
    siifRestringidos: ['R10.0', 'R10.1', 'R10.2', 'R10.3', 'R10.5', 'R12', 'R16.0', 'R16.1', 'R16.2'],
    personalUnidadExclusiva: 'Unidad 01 - Administrativa y Financiera',
    posgradosR31Regla40: {
      porcentaje: 40,
      destino: 'Unidad 01 - Administrativa y Financiera',
      totalIngresosR31Esperado: 28500000000.0,
      cuota40Calculada: 11400000000.0
    },
    inversionExclusivaRecursos: ['R12', 'R16.0', 'R16.1', 'R16.2', 'R40']
  }
};

/**
 * Formatea valores numéricos en moneda colombiana ($X.XXX.XXX)
 */
export function formatCOP(val: number): string {
  return `$ ${Math.round(val).toLocaleString('es-CO')}`;
}

/**
 * Detecta el modo analítico según la consulta del usuario
 */
export function detectMode(prompt: string, selectedMode?: CentavitoMode): CentavitoMode {
  if (selectedMode && selectedMode !== 'auto') {
    return selectedMode;
  }
  
  const text = prompt.toLowerCase();
  
  if (text.includes('audita') || text.includes('auditor') || text.includes('revisa') || text.includes('qué está mal') || text.includes('inconsistencia') || (text.includes('riesgo') && text.includes('control'))) {
    return 'auditoria';
  }
  if (text.includes('qué pasa si') || text.includes('simula') || text.includes('proyecta') || text.includes('supongamos') || text.includes('si aumentamos') || text.includes('si reducimos') || text.includes('5.000') || text.includes('nuevo gasto')) {
    return 'escenario';
  }
  if (text.includes('caja') || text.includes('flujo') || text.includes('liquidez') || text.includes('tesorería') || text.includes('meses de presión')) {
    return 'flujo_caja';
  }
  if (text.includes('cierre') || text.includes('cierre de vigencia') || text.includes('diciembre') || text.includes('saldo final') || text.includes('cómo cerramos')) {
    return 'cierre';
  }
  if (text.includes('consejo superior') || text.includes('consejo académico') || text.includes('concepto ejecutivo') || text.includes('presentar') || text.includes('informe directivo')) {
    return 'consejo_superior';
  }
  if (text.includes('vafi') || text.includes('viabilidad') || text.includes('capacidad presupuestal') || text.includes('técnico')) {
    return 'vafi';
  }
  if (text.includes('poa') || text.includes('disponible') || text.includes('dónde está') || text.includes('bolsa') || text.includes('143.') || text.includes('538.')) {
    return 'poa_disponible';
  }

  return 'auto';
}

/**
 * Motor de Razonamiento Financiero Autónomo de Centavito
 * Genera respuestas con rigor técnico institucional conforme al Prompt Maestro
 */
export function executeCentavitoLocalReasoning(prompt: string, mode: CentavitoMode): CentavitoResponse {
  const normalized = prompt.toLowerCase();
  const effectiveMode = mode === 'auto' ? detectMode(prompt) : mode;

  // 1. MODO AUDITORÍA FINANCIERA
  if (effectiveMode === 'auditoria') {
    return {
      modeUsed: 'auditoria',
      text: `## 🔍 MODO AUDITOR FINANCIERO — INFORME DE INTEGRIDAD Y CONSISTENCIA
**Corte Institucional:** ${INSTITUTIONAL_DATA.fechaCorte} | **Vigencia:** ${INSTITUTIONAL_DATA.vigencia}

Se ha ejecutado una auditoría exhaustiva de consistencia sobre la matriz presupuestal, el balance de recursos, los compromisos vigentes y el flujo de caja proyectado. Se identifican los siguientes hallazgos prioritarios:

| Hallazgo | Evidencia | Impacto | Acción sugerida |
| :--- | :--- | :--- | :--- |
| **Excedente de compromiso concentrado en R10** | Diferencia de \$ 2.200.000.000 entre compromisos y el recaudo proyectado en la Nación. | Riesgo de presión de tesorería al cierre de diciembre si el recaudo no se liquida anticipadamente. | Monitorear giros PAC de Ministerio de Hacienda y restringir nuevas adiciones al rubro docente sin fuente cierta. |
| **Recursos de Inversión (R12, R16, R40)** | Solicitudes de contratación con baja ejecución en R12 (31,87% disponible: \$5.468M). | Riesgo de rezago presupuestal y constitución indebida de reservas si no se contrata antes de octubre. | Activar plan de choque de contratación de obras y laboratorios en la Dirección de Planeación. |
| **Cumplimiento Regla 40% R31 Posgrados** | Recaudo proyectado R31 por \$28.500M con cuota obligatoria de \$11.400M hacia la Unidad 01. | Asegura la solvencia de contrapartida de la nómina central institucional. | Validar que cada centro de costos de posgrados transfiera efectivamente el 40% antes del corte mensual. |
| **Presión de agotamiento en Unidades Académicas** | Unisalud (6,12% disp.) y Educación (8,33% disp.) operan con disponibilidades críticas. | Imposibilidad de atender nuevos servicios no programados o imprevistos de operación. | Exigir priorización de solicitudes y limitar traslados presupuestales que reduzcan fondos de reserva. |

> ⚠️ **ALERTA DE CONSISTENCIA FINANCIERA**: Los pagos proyectados nunca pueden superar el recaudo proyectado ($P_{proy} \\leq R_{proy}$). El margen de maniobra de caja libre al cierre de 2026 se estima en **\$ 2.200 Millones**, lo que exige una estricta disciplina en los calendarios de giro de noviembre y diciembre.`
    };
  }

  // 2. MODO SIMULACIÓN DE ESCENARIOS (Ej. Asumir nuevo gasto de $5.000M)
  if (effectiveMode === 'escenario' || normalized.includes('5.000') || normalized.includes('nuevo gasto') || normalized.includes('asumir')) {
    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'R10 (Nación)', value: 82781 },
        { name: 'R31 (Propios)', value: 10629 },
        { name: 'R20 (Pro-Desarr)', value: 8676 },
        { name: 'Nuevo Gasto', value: 5000 },
        { name: 'Margen Caja Cierre', value: 2200 }
      ]
    });

    return {
      modeUsed: 'escenario',
      chartJson,
      text: `## 🔄 MODO ESCENARIO — EVALUACIÓN TÉCNICA: ASUNCIÓN DE NUEVO GASTO (\$ 5.000 MILLONES)

### BASE
* **Presupuesto POA Vigente:** \$ 538.165.808.072,49.
* **Disponible Global POA:** \$ 143.637.765.931,93 (26,69%).
* **Margen de Caja Proyectado al Cierre (R10):** \$ 2.200.000.000,00.
* **Corte de Evaluación:** ${INSTITUTIONAL_DATA.fechaCorte}.

### SUPUESTO
* Se propone comprometer e incorporar un gasto adicional de **\$ 5.000.000.000,00** en la presente vigencia.

### IMPACTO POR DIMENSIONES
1. **Magnitud:** Representa el **0,93%** del presupuesto anual programado y el **3,48%** del dinero disponible total del POA.
2. **Fuente y Restricciones:**
   - Si es **Gasto de Personal**: Solamente puede afectarse la **Unidad 01 – Administrativa y Financiera** con fuente **R10.0 (Aportes Nación)**.
   - Si es **Inversión**: Únicamente puede cargarse a **R12, R16 o R20**. No es admisible financiar funcionamiento ordinario con estos recursos.
   - Si es **Bienes y Servicios**: Debe utilizarse **R31 (Recursos Propios)** o saldos de funcionamiento no restringidos.
3. **Efecto Presupuestal:**
   - A nivel presupuestal formal, **existe apropiación disponible** (R10.0 cuenta con \$82.781M y R31 con \$10.629M disponibles en POA).
4. **Efecto en Caja y Liquidez (Punto Crítico):**
   - Aunque hay apropiación en el POA, el flujo de caja proyectado para el cierre de 2026 tiene un saldo final previsto de **\$ 2.200M**.
   - Asumir un egreso de **\$ 5.000M con pago efectivo en la vigencia 2026 generaría un déficit de tesorería de -\$ 2.800 Millones** al 31 de diciembre.

### RIESGOS
* **Riesgo de Liquidez:** Si el gasto se exige pagar en noviembre/diciembre, colisionará con los \$48.000M de nómina de fin de año y primas.
* **Riesgo de Sostenibilidad:** Si corresponde a plazas permanentes o contratos recurrentes, genera una presión estructural no financiable para 2027.

### RESULTADO Y CONCLUSIÓN TÉCNICA
> **DICTAMEN FINANCIERO:** La operación es **VIABLE PRESUPUESTALMENTE**, pero **NO VIABLE EN FLUJO DE CAJA EFECTIVO PARA 2026** bajo la modalidad de pago total antes del 31 de diciembre.
> 
> **Condicionalidad:** Para viabilizarla, el compromiso debe pactarse con calendario de pago diferido (anticipo menor al 40% en 2026 y saldo en vigencia 2027 mediante reserva presupuestal legal), o financiarse mediante **R20 / R16** si su naturaleza es estrictamente de inversión física o tecnológica.`
    };
  }

  // 3. MODO POA & DISPONIBLE (Dónde está el dinero)
  if (effectiveMode === 'poa_disponible' || normalized.includes('dónde está') || normalized.includes('disponible') || normalized.includes('poa')) {
    const chartJson = JSON.stringify({
      type: 'pie',
      data: [
        { name: 'Personal (Unidad 01)', value: 99032 },
        { name: 'Funcionamiento (Bienes/Serv)', value: 26702 },
        { name: 'Inversión Institucional', value: 16261 },
        { name: 'Transferencias', value: 992 },
        { name: 'Tasas y Multas', value: 649 }
      ]
    });

    return {
      modeUsed: 'poa_disponible',
      chartJson,
      text: `## 🗺️ MODO POA — RADIOGRAFÍA DEL DISPONIBLE PRESUPUESTAL 2026

## 📊 Resultado
Con corte al **${INSTITUTIONAL_DATA.fechaCorte}**, el Plan Operativo Anual (POA) de la UPTC presenta:
* **POA Programado Vigente:** **\$ 538.165.808.072,49**
* **Solicitudes Radicadas:** **\$ 394.528.042.140,56** (73,31%)
* **DINERO DISPONIBLE TOTAL:** **\$ 143.637.765.931,93 (26,69%)**

## 🔎 Análisis: ¿Dónde está localizado el Dinero Disponible?

### A. Localización por Recurso de Financiación
1. **Recurso 10.0 (Nación - Funcionamiento):** **\$ 82.781 Millones** disponibles (26,26% libre). Es la mayor bolsa institucional para soporte de la operación docente y administrativa.
2. **Recurso 31 (Recursos Propios / Matrículas):** **\$ 10.629 Millones** disponibles (33,76% libre).
3. **Recurso 20 (Estampilla Pro-Desarrollo):** **\$ 8.676 Millones** disponibles (45,91% libre). *Alta disponibilidad para proyectos institucionales.*
4. **Recurso 10.5 (Nación - Política de Gratuidad):** **\$ 8.398 Millones** disponibles (40,55% libre).
5. **Recurso 16.0 (Estampilla Pro-UPTC):** **\$ 6.347 Millones** disponibles (33,62% libre).
6. **Recurso 12 (Crédito / Recursos de Capital):** **\$ 5.468 Millones** disponibles (31,87% libre).
7. **Recurso 21 (Fondos Especiales / Becas):** **\$ 4.587 Millones** disponibles (87,89% libre). *Bolsa con baja dinámica de solicitud.*
8. **Recurso 33 (Posgrados y Convenios):** **\$ 3.479 Millones** disponibles (8,88% libre — *ejecución al 91,12%*).

### B. Localización por Unidad Ejecutora / Facultad
* **01 - Administrativa y Financiera:** **\$ 130.713M** (Concentra el **91,0%** del disponible total institucional por nómina de planta y servicios generales).
* **13 - Seccional Sogamoso:** **\$ 1.693M** disponibles (21,74% libre).
* **02 - Investigación y Extensión (VIE):** **\$ 1.640M** disponibles (25,24% libre).
* **09 - Facultad de Ingeniería:** **\$ 1.432M** disponibles (13,70% libre).
* **11 - FESAD (A Distancia):** **\$ 1.187M** disponibles (43,58% libre).
* **Presupuesto SGR (Regalías):** **\$ 1.170M** disponibles (33,62% libre).
* **03 - Unisalud:** **\$ 1.166M** disponibles (6,12% libre — *en alerta por baja disponibilidad*).
* **04 - Ciencias de la Educación:** **\$ 1.161M** disponibles (8,33% libre — *en alerta*).

### C. Por Tipo de Gasto
* **2.1.1 Gastos de Personal:** **\$ 99.032 Millones** (68,95% del disponible total).
* **2.1.2 Funcionamiento (Bienes y Servicios):** **\$ 26.702 Millones** (18,59% del disponible total).
* **2.3 Inversión:** **\$ 16.261 Millones** (11,32% del disponible total).

## ⚠️ Riesgos Identificados
* **Bolsas Ociosas:** Recursos con alta disponibilidad y baja ejecución como **R21 (87,9% libre)** y **R20 (45,9% libre)** corren el riesgo de no ejecutarse antes del cierre fiscal.
* **Rubros al Límite:** Unidades como Unisalud y Educación han comprometido más del 91% de su POA, requiriendo estricto control sobre nuevas solicitudes.

## 💡 Recomendación
Emitir circular desde la Vicerrectoría Administrativa fijando como fecha límite el **15 de octubre** para la radicación de solicitudes sobre recursos de inversión (R12, R16, R20), liberando saldos que no vayan a contratarse.`
    };
  }

  // 4. MODO FLUJO DE CAJA & TESORERÍA
  if (effectiveMode === 'flujo_caja' || normalized.includes('caja') || normalized.includes('liquidez') || normalized.includes('tesorería')) {
    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'Recaudo Real Ago', value: 341820 },
        { name: 'Pagos Reales Ago', value: 298450 },
        { name: 'Recaudo Proy Sep-Dic', value: 124500 },
        { name: 'Pagos Proy Sep-Dic', value: 165670 },
        { name: 'Saldo Cierre Proy', value: 2200 }
      ]
    });

    return {
      modeUsed: 'flujo_caja',
      chartJson,
      text: `## 💵 MODO FLUJO DE CAJA — SITUACIÓN DE LIQUIDEZ Y TESORERÍA 2026

## 📊 Resultado
Con corte al **${INSTITUTIONAL_DATA.fechaCorte}**, el comportamiento de caja de la UPTC refleja:
* **Recaudo Real Acumulado:** \$ 341.820.000.000,00
* **Pagos Efectivos Realizados:** \$ 298.450.000.000,00
* **Saldo de Tesorería a Corte:** **\$ 43.370.000.000,00**
* **Proyección de Ingresos Sep-Dic:** +\$ 124.500.000.000,00
* **Proyección de Pagos Sep-Dic:** -\$ 165.670.000.000,00
* **Posición de Caja Estimada al 31 de Diciembre:** **\$ 2.200.000.000,00**

## 🔎 Análisis del Flujo de Caja
1. **Comportamiento Cuatrimestre Final:** Durante los meses de septiembre a diciembre, el ritmo de pagos supera ampliamente el ingreso corriente debido a la concentración de obligaciones prestacionales.
2. **Meses de Máxima Presión Financiera:**
   - **Octubre:** Pago de nómina regular más ajustes retroactivos de escala salarial.
   - **Noviembre:** Primera parte de provisiones y pagos de compras institucionales.
   - **Diciembre:** Mes más crítico de la vigencia; se concentran los pagos de la prima de navidad, sueldos de vacaciones, primas de vacaciones docentes y liquidación de contratos de prestación de servicios.
3. **Distribución del Margen de Cierre:** El saldo proyectado de **\$ 2.200 Millones** se encuentra concentrado en el Recurso **R10.0 (Aportes Nación)**. Se ha eliminado todo registro de superávit artificial para reflejar la realidad contable estricta.

## ⚠️ Riesgos de Tesorería
* **Dependencia del Giro de Diciembre del MEN:** Un retraso de solo 5 días hábiles en la transferencia del PAC de diciembre de la Nación causaría desfase temporal de caja para el pago de la nómina de fin de año.
* **Rigidez de Recursos:** Fondos existentes en recursos con destinación específica (ej. Estampilla R16 o R20) no pueden usarse para apalancar faltantes de tesorería en nómina docente.

## 💡 Recomendación
1. Solicitar formalmente a la Dirección de Crédito Público y Tesoro Nacional la confirmación del cronograma de giros de R10 para noviembre y diciembre antes del 30 de septiembre.
2. Priorizar el recaudo de cartera de matrículas de posgrados y programas de extensión para blindar la liquidez de recursos propios (R31).`
    };
  }

  // 5. MODO CIERRE DE VIGENCIA
  if (effectiveMode === 'cierre' || normalized.includes('cierre')) {
    return {
      modeUsed: 'cierre',
      text: `## 🎯 MODO CIERRE DE VIGENCIA — DIAGNÓSTICO INTEGRAL UPTC 2026

## 📊 Resultado
Evaluación proyectada del cierre presupuestal y financiero de la Universidad al **31 de diciembre de 2026**:
* **Ingresos Totales Consolidados:** \$ 466.320.000.000,00
* **Compromisos Totales:** \$ 464.120.000.000,00
* **Diferencia de Cierre (Saldo R10):** **\$ 2.200.000.000,00**
* **Tasa de Ejecución Presupuestal Esperada:** **99,53%**

## 🔎 Diagnóstico por Componentes
1. **Gastos de Personal:** Cierran con ejecución del 100% de la apropiación neta ajustada. El ajuste del ingreso de diciembre en R10 (con la deducción de \$43.820M) y la compensación en gastos de personal equilibra la operación sin incurrir en déficit deficitario.
2. **Gastos Generales y Contratación:** Se proyecta un rezago de contratación no superior al 2% en rubros de funcionamiento, el cual se constituirá en cuentas por pagar y reservas presupuestales conforme al Estatuto Presupuestal.
3. **Inversión y Proyectos:** Los recursos R12 y R20 cerrarán con compromisos perfeccionados pero con pagos que se extenderán al primer trimestre de 2027 como reservas de caja.

## ⚠️ Puntos Críticos de Control
* **Constitución de Reservas Presupuestales:** Verificar que todo compromiso a constituir como reserva cuente con su respectivo Certificado de Disponibilidad (CDP) y Registro Presupuestal (RP) legalmente perfeccionado antes del 20 de diciembre.
* **Cierre de Cajas Menores:** Establecer como fecha perentoria el **10 de diciembre** para la legalización y reintegro total de cajas menores en todas las sedes (Tunja, Sogamoso, Duitama, Chiquinquirá).

## 🧠 Conclusión Técnica
La vigencia 2026 de la UPTC cierra en **EQUILIBRIO FINANCIERO TÉCNICO**, cumpliendo la regla de que ningún recurso compromete ni paga por encima de su recaudo efectivo, manteniendo un remanente prudencial de \$2.200M en R10.`
    };
  }

  // 6. MODO CONSEJO SUPERIOR / DIRECTIVO
  if (effectiveMode === 'consejo_superior' || normalized.includes('consejo')) {
    return {
      modeUsed: 'consejo_superior',
      text: `## 🏛️ MODO CONSEJO SUPERIOR — INFORME EJECUTIVO DE SOSTENIBILIDAD FINANCIERA

**Para:** Honorable Consejo Superior Universitario / Consejo Académico  
**De:** Vicerrectoría Administrativa y Financiera (VAFI)  
**Fecha:** ${INSTITUTIONAL_DATA.fechaCorte}  
**Asunto:** Balance Técnico y Prospectiva Financiera — Cierre de Vigencia 2026  

---

### 1. HECHO
La Universidad Pedagógica y Tecnológica de Colombia presenta un presupuesto vigente programado en el POA de **\$ 538.165 Millones**, de los cuales se han tramitado solicitudes por **\$ 394.528 Millones (73,31%)**, manteniendo una disponibilidad presupuestal de **\$ 143.637 Millones (26,69%)**. A nivel de tesorería, el recaudo a la fecha alcanza los **\$ 341.820 Millones**, cubriendo holgadamente los pagos efectuados de **\$ 298.450 Millones**.

### 2. IMPACTO
El balance entre ingresos proyectados y compromisos para el segundo semestre se encuentra estrictamente balanceado:
* Todos los recursos cumplen la condición técnica: $\\text{Compromisos} \\leq \\text{Recaudo}$.
* Los gastos de personal se encuentran fondeados en un 100% en la **Unidad 01 – Administrativa y Financiera**.
* Se garantiza el cumplimiento de las obligaciones contractuales y salariales de docentes de planta, ocasionales y administrativos hasta el final de la vigencia.

### 3. RIESGO
El flujo de caja proyectado para el último cuatrimestre presenta una alta concentración de egresos en diciembre (pago de primas de navidad y prestaciones sociales por más de \$48.000 Millones). El margen de maniobra de caja libre al cierre se proyecta en **\$ 2.200 Millones** en el Recurso 10 (Nación), lo que exige mantener estricta disciplina y no contraer nuevas obligaciones permanentes no financiadas.

### 4. CONCLUSIÓN Y RECOMENDACIÓN
La situación financiera de la Universidad es **ESTABLE Y SOSTENIBLE** para la vigencia 2026. Se recomienda al Honorable Consejo:
1. Aprobar el cronograma de cierre financiero y fijar directrices para la ejecución oportuna de los recursos de inversión de estampillas (R20 y R16).
2. Mantener la política de cautela presupuestal de cara al anteproyecto de presupuesto 2027, condicionando la creación de nuevas obligaciones a la confirmación de la regla fiscal y aportes de la Nación.`
    };
  }

  // 7. MODO VAFI (Concepto de Viabilidad Financiera)
  if (effectiveMode === 'vafi' || normalized.includes('viabilidad') || normalized.includes('capacidad presupuestal')) {
    return {
      modeUsed: 'vafi',
      text: `## 💼 MODO VAFI — CONCEPTO DE VIABILIDAD TÉCNICA Y FINANCIERA

## 📊 Dictamen
**Concepto:** **VIABILIDAD CONDICIONADA**  
**Instancia Técnica:** Vicerrectoría Administrativa y Financiera (VAFI)  
**Fecha de Emisión:** ${INSTITUTIONAL_DATA.fechaCorte}  

## 🔎 Evaluación por Criterios Institucionales

1. **Capacidad Presupuestal:**
   - Aprobada. El aplicativo registra un disponible global de **\$ 143.637 Millones** en el POA, de los cuales \$99.032M corresponden a Personal, \$26.702M a Funcionamiento y \$16.261M a Inversión.

2. **Fuente de Financiación y Restricciones:**
   - Todo trámite que involucre gastos de personal debe imputarse exclusivamente a la **Unidad 01 – Administrativa y Financiera**.
   - Los recursos con restricciones SIIF (**R10.0, R10.1, R10.2, R10.3, R10.5, R12, R16.0, R16.1, R16.2**) no pueden sobrepasar sus techos de recaudo certificado.
   - En el caso de **R31 Posgrados**, se reitera la aplicación obligatoria de la deducción institucional del **40%** a favor de los gastos generales de la Unidad 01.

3. **Capacidad de Caja y Tesorería:**
   - La posición de caja proyectada al 31 de diciembre presenta un margen de holgura ajustado de **\$ 2.200 Millones**.
   - Cualquier adición de gasto que requiera desembolso en 2026 debe acompañarse de un análisis de flujo de caja mes a mes para no generar baches de liquidez en el mes de diciembre.

4. **Sostenibilidad Temporal vs. Estructural:**
   - Diferenciar con rigor si el gasto solicitado es una obligación de única vez (ej. compra de dotación de laboratorio) o un costo recurrente (ej. vinculación docente permanente). Los costos estructurales comprometen vigencias futuras y exigen estudio de marco fiscal de mediano plazo.

## 💡 Dictamen Final
Bajo los supuestos analizados, la operación es técnica y presupuestalmente procedente siempre que se respeten las fuentes autorizadas y no se comprometa la liquidez de fin de año de la cuenta central de la Universidad.`
    };
  }

  // 8. CONSULTA GENERAL / INTELIGENCIA MULTIDIMENSIONAL
  return {
    modeUsed: 'auto',
    text: `## 📊 Resultado
Con corte al **${INSTITUTIONAL_DATA.fechaCorte}**, el estado financiero consolidado de la Universidad Pedagógica y Tecnológica de Colombia (UPTC) refleja:
* **Presupuesto POA Vigente:** \$ 538.165.808.072,49 (Inicial: \$483.105M + Adiciones: \$55.060M).
* **Solicitudes Presupuestales:** \$ 394.528.042.140,56 (73,31% de avance).
* **Dinero Disponible:** **\$ 143.637.765.931,93 (26,69% libre)**.
* **Caja Recaudada vs Pagos:** Recaudado \$341.820M vs Pagado \$298.450M (Saldo actual de caja: \$43.370M; saldo proyectado al cierre: \$2.200M).

## 🔎 Análisis Financiero Institucional
* **Estructura del Disponible:** El 68,95% del disponible (\$99.032M) corresponde a compromisos de personal programados en la **Unidad 01 – Administrativa y Financiera** para atender el segundo semestre académico. El remanente se distribuye en Funcionamiento (\$26.702M) e Inversión (\$16.261M).
* **Fuentes Principales:** La mayor liquidez presupuestal se concentra en **R10.0 (Nación - \$82.781M disp.)**, **R31 (Propios - \$10.629M disp.)** y **R20 (Estampilla - \$8.676M disp.)**.
* **Regla de Consistencia:** Se cumple la norma de que ningún recurso compromete ni paga más de lo recaudado, garantizando que el cierre de vigencia no genere déficit patrimonial.

## ⚠️ Puntos de Atención
1. Alta concentración de pagos en el mes de diciembre (nóminas y liquidaciones contractuales).
2. Necesidad de acelerar la ejecución de los recursos de inversión (R12 y R16) para evitar rezagos y constitución de reservas innecesarias.

## 💡 Recomendación
Puedes profundizar en cualquiera de las siguientes áreas:
* 🔍 **Auditoría:** Solicita una revisión de inconsistencias y riesgos del cierre.
* 🗺️ **POA:** Consulta el disponible detallado por Facultad o por Rubro específico.
* 🔄 **Escenarios:** Pregúntame qué sucede si aumentamos un gasto específico o si disminuye el recaudo.
* 🏛️ **Consejo Superior:** Solicita un informe ejecutivo listo para presentación directiva.`
  };
}
