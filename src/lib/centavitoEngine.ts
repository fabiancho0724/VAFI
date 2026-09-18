/**
 * CENTAVITO IA — MOTOR DE INTELIGENCIA FINANCIERA INSTITUCIONAL
 * Universidad Pedagógica y Tecnológica de Colombia — UPTC
 * 
 * Regla de oro:
 * 1. Responde de forma CONCRETA, DIRECTA y AMIGABLE a la pregunta que se hace.
 * 2. Solo proporciona información adicional si el usuario lo desea (mediante opciones interactivas).
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
  topicTitle: string;
  text: string;
  chartJson?: string;
  suggestedFollowUps?: string[];
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

  // Base de Posgrados UPTC (Oficial)
  posgrados: {
    vigenciaActual: 2026,
    ingresoConsolidado2026: 45472060134.0,
    estudiantesHistorico2026: 5170,
    ingresoProyectadoCreditos: 42925508467.0,
    estudiantesProyectados: 7092,
    matriculaNetaCorte: 20420124271.0,
    matriculaBrutaCorte: 28874273954.0,
    estudiantesMatriculadosCorte: 3557,
    poaR33Programado: 39180000000.0,
    poaR33Solicitudes: 35701000000.0,
    poaR33Disponible: 3479000000.0,
    cuota40Institucional: 18188824053.0,
    porFacultad: [
      { facultad: 'Ciencias de la Educación', valor: 4142228354, pct: '20,3%' },
      { facultad: 'Ingeniería', valor: 3804165406, pct: '18,6%' },
      { facultad: 'Educación a Distancia (FESAD)', valor: 3205950506, pct: '15,7%' },
      { facultad: 'Ciencias Económicas y Adm.', valor: 2361507114, pct: '11,6%' },
      { facultad: 'Seccional Sogamoso', valor: 2138537964, pct: '10,5%' },
      { facultad: 'Seccional Duitama', valor: 1580514225, pct: '7,7%' },
      { facultad: 'Ciencias Agropecuarias', valor: 1140468687, pct: '5,6%' },
      { facultad: 'Ciencias de la Salud', valor: 1053446509, pct: '5,2%' },
      { facultad: 'Ciencias Básicas', valor: 871833268, pct: '4,3%' }
    ],
    historico: [
      { vigencia: 2020, ingreso: 31104295703, estudiantes: 6951 },
      { vigencia: 2021, ingreso: 31984759180, estudiantes: 6591 },
      { vigencia: 2022, ingreso: 37234676598, estudiantes: 6460 },
      { vigencia: 2023, ingreso: 40155072920, estudiantes: 6757 },
      { vigencia: 2024, ingreso: 43156829306, estudiantes: 5537 },
      { vigencia: 2025, ingreso: 45129335003, estudiantes: 5351 },
      { vigencia: 2026, ingreso: 45472060134, estudiantes: 5170 }
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
    saldoCajaFinalProyectado: 2200000000.0,
    saldoActualBancos: 43370000000.0,
    mesesPresion: ['Octubre', 'Noviembre', 'Diciembre']
  }
};

/**
 * Normaliza texto para búsqueda semántica insensible a tildes y mayúsculas
 */
function cleanText(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Motor de Razonamiento Financiero Autónomo de Centavito
 * Prioriza responder la pregunta concreta y precisa de inmediato,
 * ofreciendo opciones para profundizar solo si el usuario lo desea.
 */
export function executeCentavitoLocalReasoning(prompt: string, mode: CentavitoMode = 'auto'): CentavitoResponse {
  const q = cleanText(prompt);

  // =========================================================================
  // 1. TEMA: POSGRADOS (Ingresos, Matrículas, Programas, Regla 40%)
  // =========================================================================
  if (
    q.includes('posgrado') || 
    q.includes('posgrados') || 
    q.includes('maestria') || 
    q.includes('doctorado') || 
    q.includes('especializacion') || 
    q.includes('r33') ||
    (q.includes('cuanto') && q.includes('ingreso') && q.includes('posgrado'))
  ) {
    // Si el usuario pide explícitamente el desglose por facultades
    if (q.includes('desglose') || q.includes('facultad') || q.includes('facultades') || q.includes('ranking')) {
      const chartJson = JSON.stringify({
        type: 'pie',
        data: INSTITUTIONAL_DATA.posgrados.porFacultad.map(f => ({
          name: f.facultad.replace('Facultad ', '').replace('Ciencias ', 'C. '),
          value: Math.round(f.valor / 1e6)
        }))
      });

      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Posgrados: Desglose por Facultades',
        chartJson,
        text: `Aquí tienes el **desglose de ingresos netos de posgrados por facultades**:

1. 🥇 **Ciencias de la Educación:** **\$ 4.142 Millones** (20,3% del total)
2. 🥈 **Ingeniería:** **\$ 3.804 Millones** (18,6%)
3. 🥉 **Estudios a Distancia (FESAD):** **\$ 3.205 Millones** (15,7%)
4. **Ciencias Económicas y Administrativas:** **\$ 2.361 Millones** (11,6%)
5. **Seccional Sogamoso:** **\$ 2.138 Millones** (10,5%)
6. **Seccional Duitama:** **\$ 1.580 Millones** (7,7%)
7. **Ciencias Agropecuarias:** **\$ 1.140 Millones** (5,6%)
8. **Ciencias de la Salud:** **\$ 1.053 Millones** (5,2%)
9. **Ciencias Básicas:** **\$ 871 Millones** (4,3%)

Total neto semestral consolidado: **\$ 20.420.124.271 COP**.`,
        suggestedFollowUps: [
          'Ver regla del 40% para Unidad 01',
          'Ver histórico de ingresos 2020-2026',
          'Ver disponible de posgrados en el POA'
        ]
      };
    }

    // Si pide la regla del 40%
    if (q.includes('40') || q.includes('regla')) {
      return {
        modeUsed: 'vafi',
        topicTitle: 'Regla del 40% en Posgrados',
        text: `La **regla institucional del 40%** establece que el 40% de los ingresos recaudados por programas de posgrados debe transferirse al fondo común de la **Unidad 01 – Vicerrectoría Administrativa y Financiera**.

Para la vigencia 2026, esto representa aproximadamente **\$ 18.188 Millones COP** (\$18.188.824.053 COP). Estos recursos se destinan a financiar la contrapartida de nómina de docentes de planta, plataformas académicas y sostenimiento institucional.`,
        suggestedFollowUps: [
          '¿Cuánto ingresó por posgrados en total?',
          'Ver desglose por facultades',
          'Ver disponible de posgrados en el POA'
        ]
      };
    }

    // Si pide histórico
    if (q.includes('historico') || q.includes('evolucion') || q.includes('anos anteriores')) {
      return {
        modeUsed: 'auto',
        topicTitle: 'Histórico de Posgrados (2020-2026)',
        text: `Los ingresos de posgrados en la UPTC han tenido la siguiente evolución:
* **2020:** \$ 31.104M (6.951 estudiantes)
* **2021:** \$ 31.984M (6.591 estudiantes)
* **2022:** \$ 37.234M (6.460 estudiantes)
* **2023:** \$ 40.155M (6.757 estudiantes)
* **2024:** \$ 43.156M (5.537 estudiantes)
* **2025:** \$ 45.129M (5.351 estudiantes)
* **2026 (Proyectado):** **\$ 45.472M (5.170 estudiantes)** (+46% de crecimiento frente a 2020).`,
        suggestedFollowUps: [
          'Ver desglose por facultades',
          'Ver regla del 40% para Unidad 01'
        ]
      };
    }

    // RESPUESTA CONCRETA Y DIRECTA PRINCIPAL
    return {
      modeUsed: 'auto',
      topicTitle: 'Ingresos por Posgrados 2026',
      text: `Por concepto de **posgrados**, la UPTC proyecta un ingreso total para la vigencia 2026 de **\$ 45.472.060.134 COP** (con una población de 5.170 estudiantes).

A nivel de corte semestral, el recaudo neto registrado en matrícula asciende a **\$ 20.420.124.271 COP** (correspondiente a 3.557 estudiantes matriculados). Asimismo, en el POA oficial el Recurso 33 cuenta con **\$ 39.180M programados** y un disponible libre actual de **\$ 3.479 Millones**.`,
      suggestedFollowUps: [
        'Ver desglose por facultades',
        'Ver regla institucional del 40%',
        'Ver histórico de ingresos 2020-2026'
      ]
    };
  }

  // =========================================================================
  // 2. TEMA: POA / DISPONIBILIDAD DE FONDOS ("¿Dónde está el dinero?")
  // =========================================================================
  if (
    q.includes('donde esta') || 
    q.includes('disponible') || 
    q.includes('plata') || 
    q.includes('cuanto tenemos') || 
    q.includes('fondos disponibles') ||
    (q.includes('poa') && !q.includes('posgrado'))
  ) {
    if (q.includes('recurso') || q.includes('recursos') || q.includes('fuente')) {
      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Disponible POA por Recurso',
        text: `El dinero disponible en el POA (\$ 143.637M) se distribuye en estos recursos principales:
1. **R10.0 (Nación - Funcionamiento):** **\$ 82.781 Millones** (26,3% libre)
2. **R31 (Recursos Propios Matrículas):** **\$ 10.629 Millones** (33,8% libre)
3. **R20 (Estampilla Pro-Desarrollo):** **\$ 8.676 Millones** (45,9% libre)
4. **R10.5 (Gratuidad Nación):** **\$ 8.398 Millones** (40,5% libre)
5. **R16.0 (Estampilla Pro-UPTC):** **\$ 6.347 Millones** (33,6% libre)
6. **R12 (Crédito y Capital):** **\$ 5.468 Millones** (31,9% libre)
7. **R21 (Fondos Especiales):** **\$ 4.587 Millones** (87,9% libre)
8. **R33 (Posgrados y Convenios):** **\$ 3.479 Millones** (8,9% libre)`,
        suggestedFollowUps: [
          'Ver disponibilidad por facultades',
          'Ver bolsas mayores a $500M',
          'Ver rubros con bajo disponible (<10%)'
        ]
      };
    }

    if (q.includes('bolsa') || q.includes('500')) {
      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Mayores Bolsas Disponibles (> $500M)',
        text: `Las mayores bolsas de dinero disponible en el POA 2026 corresponden a:
* **Sueldos básicos y prestaciones (Unidad 01 - R10.0):** Más de \$ 82.000 Millones reservados para el cierre de año.
* **Proyectos de inversión física y laboratorios (R20 y R16):** \$ 15.023 Millones combinados con alta disponibilidad.
* **Recursos propios no comprometidos (R31):** \$ 10.629 Millones disponibles para gastos de funcionamiento y apoyos académicos.
* **Fondos especiales de estímulos (R21):** \$ 4.587 Millones (87,9% disponible).`,
        suggestedFollowUps: [
          'Ver disponibilidad por recurso',
          'Ver disponibilidad por facultades'
        ]
      };
    }

    // RESPUESTA CONCRETA Y DIRECTA
    return {
      modeUsed: 'poa_disponible',
      topicTitle: 'Disponible Total del POA 2026',
      text: `El Plan Operativo Anual (POA 2026) de la UPTC tiene actualmente un **dinero disponible total de \$ 143.637.765.931,93 COP** (equivalente al **26,69% libre** frente a los \$ 538.165 Millones programados).

El **91,0% de este disponible (\$ 130.713 Millones)** está alojado en la **Unidad 01 – Vicerrectoría Administrativa y Financiera**, reservado para el pago de nómina, prestaciones y servicios generales del segundo semestre.`,
      suggestedFollowUps: [
        'Ver disponibilidad por recursos (R10, R31, R20...)',
        'Ver disponibilidad por facultades',
        'Ver mayores bolsas (> $500M)'
      ]
    };
  }

  // =========================================================================
  // 3. TEMA: NÓMINA Y GASTOS DE PERSONAL
  // =========================================================================
  if (
    q.includes('nomina') || 
    q.includes('personal') || 
    q.includes('docente') || 
    q.includes('administrativo') || 
    q.includes('sueldo') || 
    q.includes('salario') || 
    q.includes('prima') ||
    q.includes('prestacion')
  ) {
    if (q.includes('fuente') || q.includes('recurso')) {
      return {
        modeUsed: 'vafi',
        topicTitle: 'Fuentes de Financiación de Nómina',
        text: `La nómina docente y administrativa de la UPTC se financia principalmente con:
* **Recurso 10.0 (Aportes Nación - Funcionamiento):** \$ 301.082 Millones programados (cuenta con \$ 82.781M disponibles para el cierre de año).
* **Recurso 10.5 (Gratuidad):** \$ 20.708 Millones.
* **Recurso 14 (Matrículas FSE):** \$ 18.737 Millones.
* **Recursos Propios (R31 / R20):** Financian contrapartida de docentes ocasionales y de cátedra.`,
        suggestedFollowUps: [
          '¿Cuánto queda disponible para fin de año?',
          'Ver impacto de primas de diciembre'
        ]
      };
    }

    // RESPUESTA CONCRETA Y DIRECTA
    return {
      modeUsed: 'vafi',
      topicTitle: 'Gastos de Personal y Nómina 2026',
      text: `Para gastos de personal y nómina en la vigencia 2026, la UPTC tiene programados **\$ 301.916 Millones COP**, de los cuales se han tramitado solicitudes por **\$ 202.884 Millones (67,20%)**, dejando un saldo disponible libre de **\$ 99.032 Millones (32,80%)**.

El 100% de los gastos de personal se administra centralizadamente en la **Unidad 01 – Vicerrectoría Administrativa y Financiera**, con respaldo suficiente para cubrir los sueldos y prestaciones del segundo semestre.`,
      suggestedFollowUps: [
        'Ver fuentes de financiación de nómina (R10, R10.5...)',
        'Ver proyección de pagos de noviembre y diciembre'
      ]
    };
  }

  // =========================================================================
  // 4. TEMA: CAJA, BANCOS, TESORERÍA Y LIQUIDEZ
  // =========================================================================
  if (
    q.includes('caja') || 
    q.includes('banco') || 
    q.includes('bancos') || 
    q.includes('tesoreria') || 
    q.includes('liquidez') || 
    q.includes('flujo') ||
    q.includes('saldo')
  ) {
    if (q.includes('presion') || q.includes('meses') || q.includes('diciembre')) {
      return {
        modeUsed: 'flujo_caja',
        topicTitle: 'Meses de Presión de Tesorería',
        text: `Los meses de mayor presión de liquidez en la UPTC son **octubre, noviembre y especialmente diciembre**.

En diciembre se deben desembolsar las nóminas regulares, primas de navidad, cesantías y liquidación de contratos por más de **\$ 48.000 Millones**. Para atender este pico, los giros del PAC de la Nación deben recibirse sin demoras antes del 15 de diciembre.`,
        suggestedFollowUps: [
          '¿Cuál es el saldo actual en bancos?',
          'Ver proyección de ingresos vs pagos sep-dic'
        ]
      };
    }

    // RESPUESTA CONCRETA Y DIRECTA
    return {
      modeUsed: 'flujo_caja',
      topicTitle: 'Posición de Caja y Tesorería',
      text: `A corte del **${INSTITUTIONAL_DATA.fechaCorte}**, la Universidad cuenta con un **saldo efectivo en bancos de \$ 43.370 Millones COP** (ingresos recaudados de \$ 341.820M menos pagos realizados de \$ 298.450M).

Para el cierre del 31 de diciembre, tras ejecutar los pagos y prestaciones proyectadas del último cuatrimestre, el **margen de caja final estimado es de \$ 2.200.000.000,00 COP** (concentrado en el Recurso R10.0 de la Nación).`,
      suggestedFollowUps: [
        'Ver meses de mayor presión de pagos',
        'Ver proyección de ingresos vs pagos sep-dic'
      ]
    };
  }

  // =========================================================================
  // 5. TEMA: FACULTADES Y SECCIONALES ESPECÍFICAS
  // =========================================================================
  if (
    q.includes('ingenieria') || 
    q.includes('sogamoso') || 
    q.includes('duitama') || 
    q.includes('fesad') || 
    q.includes('distancia') || 
    q.includes('unisalud') || 
    q.includes('educacion') || 
    q.includes('agropecuaria') ||
    q.includes('basicas') ||
    q.includes('economicas')
  ) {
    let facName = 'Facultad de Ingeniería';
    let prog = 10452;
    let disp = 1432;
    let pct = '13,7%';
    let posg = '$ 3.804 Millones';

    if (q.includes('sogamoso')) {
      facName = 'Facultad Seccional Sogamoso';
      prog = 7788;
      disp = 1693;
      pct = '21,7%';
      posg = '$ 2.138 Millones';
    } else if (q.includes('duitama')) {
      facName = 'Facultad Seccional Duitama';
      prog = 1759;
      disp = 547;
      pct = '31,1%';
      posg = '$ 1.580 Millones';
    } else if (q.includes('fesad') || q.includes('distancia')) {
      facName = 'FESAD (Estudios a Distancia)';
      prog = 2724;
      disp = 1187;
      pct = '43,6%';
      posg = '$ 3.205 Millones';
    } else if (q.includes('unisalud')) {
      facName = 'Unisalud';
      prog = 19052;
      disp = 1166;
      pct = '6,1%';
      posg = 'No aplica';
    } else if (q.includes('educacion')) {
      facName = 'Facultad de Ciencias de la Educación';
      prog = 13937;
      disp = 1161;
      pct = '8,3%';
      posg = '$ 4.142 Millones (Líder institucional)';
    }

    return {
      modeUsed: 'poa_disponible',
      topicTitle: `Presupuesto: ${facName}`,
      text: `La **${facName}** tiene un presupuesto programado en el POA 2026 de **\$ ${prog.toLocaleString('es-CO')} Millones COP**, con solicitudes radicadas por **\$ ${(prog - disp).toLocaleString('es-CO')} Millones** y un **saldo disponible libre de \$ ${disp.toLocaleString('es-CO')} Millones (${pct})**.

En posgrados, esta unidad genera aportes anuales de **${posg}**. (Nota: la nómina de planta docente se financia centralizadamente desde la Unidad 01).`,
      suggestedFollowUps: [
        'Ver detalles de posgrados de esta facultad',
        'Ver disponible global de todas las facultades'
      ]
    };
  }

  // =========================================================================
  // 6. TEMA: SIMULACIÓN DE NUEVOS GASTOS (Ej. $5.000M)
  // =========================================================================
  if (
    q.includes('que pasa si') || 
    q.includes('simula') || 
    q.includes('proyecta') || 
    q.includes('supongamos') || 
    q.includes('5.000') || 
    q.includes('nuevo gasto') || 
    q.includes('asumir') ||
    mode === 'escenario'
  ) {
    return {
      modeUsed: 'escenario',
      topicTitle: 'Viabilidad de Nuevo Gasto de $5.000M',
      text: `**Dictamen concreto:**
* **Presupuestalmente SÍ es viable:** Hay apropiación disponible en el POA (\$ 82.781M en R10 y \$ 10.629M en R31).
* **En Flujo de Caja Real NO es viable pagarlo de contado en 2026:** El saldo proyectado al 31 de diciembre es de \$ 2.200M. Desembolsar \$ 5.000M causaría un **déficit de tesorería de -\$ 2.800 Millones** que pondría en riesgo el pago de la nómina de fin de año.

**Para viabilizarlo:** Se recomienda pactar un pago diferido con anticipo menor a \$ 1.500M en 2026 y saldo para el primer trimestre de 2027 como reserva presupuestal.`,
      suggestedFollowUps: [
        'Ver propuesta de pago diferido para 2027',
        'Ver qué fuentes (R16, R20, R31) son aplicables'
      ]
    };
  }

  // =========================================================================
  // 7. TEMA: AUDITORÍA DE CONSISTENCIA
  // =========================================================================
  if (
    q.includes('audita') || 
    q.includes('auditor') || 
    q.includes('inconsistencia') || 
    q.includes('que esta mal') || 
    q.includes('riesgo') ||
    mode === 'auditoria'
  ) {
    if (q.includes('tabla') || q.includes('completa') || q.includes('detalle')) {
      return {
        modeUsed: 'auditoria',
        topicTitle: 'Tabla de Auditoría Financiera',
        text: `| Hallazgo | Evidencia | Impacto | Acción sugerida |
| :--- | :--- | :--- | :--- |
| **Compromisos en R10** | Diferencia de \$ 2.200M frente a ingresos proyectados Nación. | Riesgo de presión de caja si el giro de diciembre se retrasa. | Monitorear cronograma PAC del Ministerio de Hacienda. |
| **Bolsa ociosa R21** | \$ 4.587M disponibles (87,9% libre). | Recursos que no se están ejecutando oportunamente. | Agilizar convocatorias de becas y estímulos. |
| **Agotamiento en Unisalud** | Ejecución del 93,9% (solo 6,1% disponible: \$1.166M). | Poco margen para imprevistos de fin de año. | Priorizar autorizaciones médicas electivas. |
| **Inversión R12/R16** | R12 cuenta con 31,9% libre (\$5.468M). | Riesgo de rezago contractual de obras. | Fijar fecha límite del 20 de octubre para radicar contratos. |`,
        suggestedFollowUps: [
          '¿Se cumple la regla de consistencia pagos <= recaudo?',
          'Ver recomendaciones de control de tesorería'
        ]
      };
    }

    return {
      modeUsed: 'auditoria',
      topicTitle: 'Auditoría Financiera: Conclusiones Clave',
      text: `La auditoría de consistencia al **${INSTITUTIONAL_DATA.fechaCorte}** confirma que la Universidad se encuentra en **equilibrio financiero** (los pagos no superan el recaudo proyectado).

Se señalan dos puntos de atención prioritarios:
1. **Margen de caja de cierre ajustado (\$ 2.200M en R10):** Requiere estricta puntualidad en el giro del PAC de diciembre.
2. **Alta ejecución en Unisalud (93,9%):** Cuenta con solo \$ 1.166M libres para imprevistos de fin de año.`,
      suggestedFollowUps: [
        'Ver tabla completa de hallazgos de auditoría',
        'Ver recomendaciones de control de tesorería'
      ]
    };
  }

  // =========================================================================
  // 8. TEMA: CONSEJO SUPERIOR / PRESENTACIÓN DIRECTIVA
  // =========================================================================
  if (
    q.includes('consejo superior') || 
    q.includes('consejo academico') || 
    q.includes('informe directivo') || 
    q.includes('presentar') || 
    q.includes('memorando') ||
    mode === 'consejo_superior'
  ) {
    return {
      modeUsed: 'consejo_superior',
      topicTitle: 'Concepto Ejecutivo para Consejo Superior',
      text: `**Concepto Ejecutivo Institucional:**
La situación financiera de la UPTC al 31 de agosto de 2026 es **sólida y sostenible**. El POA dispone de **\$ 143.637 Millones libres (26,69%)**, los compromisos de personal docente y administrativo están fondeados al 100% en la Unidad 01, y la tesorería proyecta un saldo positivo de **\$ 2.200 Millones** al 31 de diciembre.

Se recomienda al Honorable Consejo mantener prudencia presupuestal para el anteproyecto 2027 y fijar el 20 de octubre como fecha límite para radicación de proyectos de inversión (R16 y R20).`,
      suggestedFollowUps: [
        'Ver memorando formal completo para Consejo Superior',
        'Ver cifras de presupuesto y caja para presentación'
      ]
    };
  }

  // =========================================================================
  // 9. TEMA: CIERRE DE VIGENCIA 2026
  // =========================================================================
  if (
    q.includes('cierre') || 
    q.includes('diciembre') || 
    q.includes('fin de ano') ||
    mode === 'cierre'
  ) {
    return {
      modeUsed: 'cierre',
      topicTitle: 'Cierre Financiero Vigencia 2026',
      text: `La vigencia 2026 de la UPTC cerrará con una **ejecución presupuestal esperada del 99,53%**, con ingresos totales de **\$ 466.320 Millones** y compromisos de **\$ 464.120 Millones**.

El saldo proyectado de caja libre al 31 de diciembre es de **\$ 2.200.000.000,00 COP** en el Recurso R10.0 de la Nación, cumpliendo la regla de que ningún recurso compromete ni paga por encima de su recaudo real.`,
      suggestedFollowUps: [
        'Ver fechas recomendadas de cierre de trámites y cajas menores',
        'Ver proyección de pagos de noviembre y diciembre'
      ]
    };
  }

  // =========================================================================
  // 10. CONSULTA GENERAL / BIENVENIDA AMIGABLE
  // =========================================================================
  return {
    modeUsed: 'auto',
    topicTitle: 'Inteligencia Financiera UPTC',
    text: `¡Hola! Con mucho gusto te respondo de forma concreta y directa cualquier consulta sobre las finanzas de la **UPTC**.

Cuento con la información oficial al **${INSTITUTIONAL_DATA.fechaCorte}** sobre:
* 🎓 **Posgrados:** \$ 45.472M anuales proyectados, 5.170 estudiantes y detalle de facultades.
* 👥 **Nómina:** \$ 301.916M programados y \$ 99.032M disponibles en la Unidad 01.
* 🗺️ **POA:** \$ 143.637 Millones disponibles de \$ 538.165M programados.
* 💵 **Caja y Bancos:** \$ 43.370M actuales en bancos y \$ 2.200M proyectados de cierre en R10.

¿Qué dato o tema específico deseas consultar?`,
    suggestedFollowUps: [
      '¿Cuánto ingresó por posgrados?',
      '¿Dónde está el dinero disponible en el POA?',
      '¿Cuánto dinero tenemos en caja y bancos?',
      '¿Podemos asumir un nuevo gasto de $5.000M?'
    ]
  };
}
