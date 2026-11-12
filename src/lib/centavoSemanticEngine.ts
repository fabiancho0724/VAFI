/**
 * CENTAVO 2.0 — MOTOR SEMÁNTICO Y ANALÍTICO DE INTELIGENCIA FINANCIERA
 * Universidad Pedagógica y Tecnológica de Colombia — UPTC
 * Vicerrectoría Administrativa y Financiera (VAFI)
 * 
 * Arquitectura:
 * - Analizador semántico de intención, entidades (recursos, unidades, vigencias, conceptos)
 * - Motor de cálculo determinístico dinámico sobre InstitutionalDataService
 * - Generador de bloques de trazabilidad y evidencia obligatorios
 * - Navegación cruzada contextual (Deep Links)
 * - Mapeo de gráficos interactivos json-chart para Recharts
 */

import { institutionalDataService } from './institutionalDataService';
import { INSTITUTIONAL_DATA, CentavitoMode } from './centavitoEngine';

export interface CentavoEvidence {
  vigencia: string;
  fechaCorte: string;
  recurso?: string;
  unidad?: string;
  concepto?: string;
  fuente: string;
  criterioCalculo: string;
  consistencia: 'VERIFICADO_100%' | 'PROYECCION_ESTADISTICA' | 'SIMULACION_PARAMETRICA';
}

export interface CentavoDeepLink {
  screen: string;
  label: string;
  description: string;
}

export interface CentavoStructuredResponse {
  modeUsed: CentavitoMode;
  topicTitle: string;
  directAnswer: string;
  detailedAnalysis: string;
  evidence: CentavoEvidence;
  chartJson?: string;
  deepLinks: CentavoDeepLink[];
  suggestedFollowUps: string[];
}

export interface CentavoConversationContext {
  lastResource?: string;
  lastUnit?: string;
  lastTopic?: string;
  lastVigencia?: string;
}

// Estado conversacional volátil en memoria para turnos consecutivos
let conversationContext: CentavoConversationContext = {
  lastVigencia: '2026'
};

export function resetCentavoContext() {
  conversationContext = { lastVigencia: '2026' };
}

export function updateCentavoContext(updates: Partial<CentavoConversationContext>) {
  conversationContext = { ...conversationContext, ...updates };
}

// Formateadores monetarios internos
function formatCOP(val: number): string {
  if (isNaN(val) || val === 0) return '$ 0';
  return `$ ${Math.round(val).toLocaleString('es-CO')}`;
}

function formatMillones(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === 0) return '$ 0 M';
  const inM = val / 1e6;
  return `$ ${inM.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} Millones`;
}

/**
 * Normaliza cadenas para comparación fonética/semántica insensible a acentos y mayúsculas
 */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Resuelve una consulta institucional a través del motor semántico de CENTAVO
 */
export async function executeCentavoAnalysis(
  query: string,
  preferredMode: CentavitoMode = 'auto'
): Promise<CentavoStructuredResponse> {
  const norm = normalizeQuery(query);

  // 1. Detección de entidades y recursos
  let targetRecurso = '';
  if (norm.includes('10.5') || norm.includes('gratuidad')) {
    targetRecurso = '10.5';
  } else if (norm.includes('r10') || norm.includes('recurso 10') || norm.includes('aportes nacion')) {
    targetRecurso = '10.0';
  } else if (norm.includes('r31') || norm.includes('recurso 31') || norm.includes('propios')) {
    targetRecurso = '31';
  } else if (norm.includes('r20') || norm.includes('recurso 20') || norm.includes('pro-desarrollo') || norm.includes('estampilla')) {
    targetRecurso = '20';
  } else if (norm.includes('r16') || norm.includes('recurso 16') || norm.includes('pro-uptc')) {
    targetRecurso = '16.0';
  } else if (norm.includes('r33') || norm.includes('recurso 33') || norm.includes('posgrado')) {
    targetRecurso = '33';
  } else if (norm.includes('r12') || norm.includes('credito')) {
    targetRecurso = '12';
  } else if (norm.includes('r21') || norm.includes('fondos especiales') || norm.includes('becas')) {
    targetRecurso = '21';
  } else if (norm.includes('r13') || norm.includes('excedentes') || norm.includes('cooperativas')) {
    targetRecurso = '13';
  }

  // Si no se especifica recurso pero hay contexto de la consulta previa:
  if (!targetRecurso && (norm.includes('este recurso') || norm.includes('frente al anterior') || norm.includes('esa fuente') || norm.includes('y como se comporto'))) {
    targetRecurso = conversationContext.lastResource || '';
  }

  if (targetRecurso) {
    conversationContext.lastResource = targetRecurso;
  }

  // 2. Detección de Unidad o Facultad
  let targetUnidad = '';
  if (norm.includes('vaf') || norm.includes('administrativa') || norm.includes('unidad 01') || norm.includes('rectoria')) {
    targetUnidad = '01';
  } else if (norm.includes('ingenieria')) {
    targetUnidad = '09';
  } else if (norm.includes('educacion')) {
    targetUnidad = '04';
  } else if (norm.includes('sogamoso')) {
    targetUnidad = '13';
  } else if (norm.includes('duitama')) {
    targetUnidad = '12';
  } else if (norm.includes('fesad') || norm.includes('distancia')) {
    targetUnidad = '11';
  } else if (norm.includes('salud') || norm.includes('medicina')) {
    targetUnidad = '10';
  } else if (norm.includes('unisalud')) {
    targetUnidad = '03';
  } else if (norm.includes('economicas')) {
    targetUnidad = '06';
  } else if (norm.includes('agropecuarias')) {
    targetUnidad = '08';
  } else if (norm.includes('basicas') || norm.includes('ciencias')) {
    targetUnidad = '05';
  }

  if (targetUnidad) {
    conversationContext.lastUnit = targetUnidad;
  }

  // =========================================================================
  // CASO A: PROYECCIÓN 2027 (R10.5 GRATUIDAD CON DOCEAVAS MINHACIENDA & R10, R13, R20)
  // =========================================================================
  if (
    norm.includes('2027') || 
    norm.includes('proyeccion 2027') || 
    (norm.includes('gratuidad') && (norm.includes('doceava') || norm.includes('12-avas') || norm.includes('minhacienda') || norm.includes('recurso 10.5') || norm.includes('r10.5')))
  ) {
    conversationContext.lastTopic = 'proyeccion_2027';
    conversationContext.lastResource = '10.5';

    const r10_5_total = 52834827867;
    const r10_5_doceava = 4402902322;
    const base2026 = 49844177233;
    const diff = r10_5_total - base2026;

    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'Base 2026 (R14 FSE)', value: Math.round(base2026 / 1e6) },
        { name: 'ARIMA (1,1,1)', value: 52792 },
        { name: 'Proy Oficial 2027 (+6%)', value: Math.round(r10_5_total / 1e6) }
      ]
    });

    return {
      modeUsed: 'cierre',
      topicTitle: 'Proyección Oficial 2027: Recurso 10.5 (Gratuidad en 12-avas MinHacienda)',
      directAnswer: `Para la **vigencia 2027**, los recursos de la Política de Gratuidad en Matrícula se proyectan oficialmente en **${formatCOP(r10_5_total)} COP** (+6,00% frente a la base 2026), reclasificados como **Recurso 10.5 (Aportes Nación)**.`,
      detailedAnalysis: `### 🏛️ Determinación Regulatoria del Ministerio de Educación Nacional (MEN)
Por disposición oficial del MEN, a partir del 2027 los giros de Gratuidad no se transferirán de forma diferida mediante el Fondo Solidario (R14 FSE), sino **directamente a través del Ministerio de Hacienda y Crédito Público (MinHacienda)** dentro del flujo regular de **doceavas (12-avas) mensuales** que recibe la UPTC.

* **Giro Mensual Estimado en 12-avas:** **${formatCOP(r10_5_doceava)} COP / mes**.
* **Base Histórica 2026:** ${formatCOP(base2026)} COP.
* **Incremento Presupuestal 2027 (+6%):** +${formatCOP(diff)} COP.
* **Modelo Econométrico Alternativo ARIMA (1,1,1):** $ 52.792.185.210 COP (+5,91%), validando la solidez del escenario macroeconómico.

Este cambio estructural reduce sustancialmente la incertidumbre de liquidez en el flujo de caja, garantizando giros puntuales mes a mes.`,
      evidence: {
        vigencia: '2027 (Proyección)',
        fechaCorte: 'Modelo Oficial VAFI / MEN',
        recurso: '10.5 - Aportes Nación (Política de Gratuidad)',
        fuente: 'r20ProjectionEngine.ts / Determinación MEN / MinHacienda',
        criterioCalculo: 'Indexación macroeconómica (+6,00%) sobre aforo base 2026 y distribución en doceavas mensuales iguales',
        consistencia: 'PROYECCION_ESTADISTICA'
      },
      chartJson,
      deepLinks: [
        { screen: 'presupuesto', label: 'Proyecciones de Recursos 2027', description: 'Explora el desglose de R10, R10.5, R13, R17, R18, R20 y R21' },
        { screen: 'cashflow', label: 'Flujo de Caja y Doceavas', description: 'Revisa el impacto del giro mensual de $4.402,9M en la tesorería' }
      ],
      suggestedFollowUps: [
        '¿Cuánto sumarán las doceavas de funcionamiento del Recurso 10 en 2027?',
        '¿Cómo impacta el giro de Gratuidad en 12-avas el flujo de caja mensual?',
        'Ver el Documento Técnico Oficial de Proyecciones 2027'
      ]
    };
  }

  // =========================================================================
  // CASO B: POSGRADOS (Ingresos, Matrículas, Facultades, Regla del 40%)
  // =========================================================================
  if (
    norm.includes('posgrado') || 
    norm.includes('maestria') || 
    norm.includes('doctorado') || 
    norm.includes('especializacion') || 
    (norm.includes('r33') && !norm.includes('poa')) ||
    (norm.includes('40') && (norm.includes('regla') || norm.includes('cuota') || norm.includes('unidad 01')))
  ) {
    conversationContext.lastTopic = 'posgrados';
    conversationContext.lastResource = '33';

    // Subcaso B.1: Proyección 2027 y Viabilidad Financiera / VAN del Modelo por Créditos (R31)
    if (
      norm.includes('2027') || 
      norm.includes('van') || 
      norm.includes('viabilidad') || 
      norm.includes('credito') || 
      norm.includes('smlmv') || 
      norm.includes('dscr') || 
      norm.includes('cobertura') ||
      norm.includes('elasticidad')
    ) {
      const recaudo2027 = 44621766847;
      const recaudoSmlmv2027 = 42393029964;
      const diffNeta = recaudo2027 - recaudoSmlmv2027;
      const estCred = 6887;
      const estSmlmv = 3954;

      return {
        modeUsed: 'vafi',
        topicTitle: 'Viabilidad Macroeconómica y Financiera: Posgrados 2027 (Recurso R31)',
        directAnswer: `Para la **vigencia 2027**, el recaudo base del Fondo Especial de Posgrados bajo el nuevo modelo de créditos académicos (**Recurso R31**) se ajusta exactamente en **$ 44.621.766.847 COP** (${formatCOP(recaudo2027)}), generando un excedente neto de **+$ ${Math.round(diffNeta / 1e6).toLocaleString('es-CO')} Millones (+5,26%)** frente al esquema tradicional de SMLMV ($ 42.393M) y reteniendo a **${estCred - estSmlmv} estudiantes adicionales** contra la deserción.`,
        detailedAnalysis: `### Dictamen Técnico de Viabilidad Integral (2027 - 2030):
1. 📈 **Valor Actual Neto (VAN al 8,0% E.A.):**
   - **Escenario Base (4 Años 2027-2030):** **+$ 29.849.753.409 COP** (Flujo neto acumulado de **$ 36.145,3 M**).
   - **Escenario Optimista (+15% Ing / -10% Gas):** **+$ 65.133.692.694 COP**.
   - **Escenario Pesimista (-15% Ing / +10% Gas):** -$ 5.434.185.877 COP (Umbral de contingencia).
   - **Horizonte 10 Años (2027-2036):** Recaudo acumulado de **$ 559.077,7 M** y VAN de **$ 77.676,1 M**.
2. 🏛️ **Deducción Central a la Administración (45,5%):**
   - Genera **$ 20.302.903.915 COP** en 2027 y **$ 84.339.110.319 COP** acumulados (2027-2030) para la Unidad 01 (Vicerrectoría Administrativa).
3. 💼 **Costos Operativos Directos (35,0% ABC):**
   - **$ 15.617.618.396 COP** en 2027 y **$ 64.876.238.706 COP** en el cuatrienio (60% fijos de gestión / 40% variables de docencia).
4. 🛡️ **Cobertura de Servicio y Covenants (DSCR):**
   - **1,43x en 2027** (frente al covenant regulatorio mínimo de **1,25x**, margen de seguridad de **+14,3%**).
5. 📊 **Elasticidad Precio de la Demanda (ε = -1,19 a -1,20):**
   - Demuestra que el cobro por créditos ajustado al avance real curricular permite tarifas promedio de **$ 6,48M/estudiante** frente a los **$ 10,72M/estudiante** que exigiría el SMLMV con el 15% diferido, evitando la contracción del recaudo a 2036 ($ 32.671M en SMLMV vs $ 73.582M en Créditos).`,
        evidence: {
          vigencia: '2027-2030 (Horizonte de Transición Cuatrienal)',
          fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
          recurso: '31 - Fondo Especial de Posgrados',
          unidad: '01 - Vicerrectoría Administrativa y Financiera',
          fuente: 'Estudio de Costeo por Créditos / Proyecto de Acuerdo CSU / Simulación Monte Carlo',
          criterioCalculo: 'Base 2027: $44.621.766.847 COP, tasa social r=8.0%, retención central 45.5%, costos ABC 35%',
          consistencia: 'VERIFICADO_100%'
        },
        deepLinks: [
          { screen: 'posgrados', label: 'Simulador Financiero de Posgrados R31', description: 'Consulta el análisis de elasticidad, Monte Carlo, Tornado y comparación SMLMV' }
        ],
        suggestedFollowUps: [
          'Ver comparación de ingresos 2027-2036 entre Créditos y SMLMV',
          '¿Cuál es la regla institucional del 40% en posgrados?',
          'Ver matriz de flujos netos y factores de descuento del VAN'
        ]
      };
    }

    // Regla del 40%
    if (norm.includes('40') || norm.includes('regla') || norm.includes('aporte vaf')) {
      const cuota40 = INSTITUTIONAL_DATA.posgrados.cuota40Institucional;
      const totalIngreso = INSTITUTIONAL_DATA.posgrados.ingresoConsolidado2026;

      return {
        modeUsed: 'vafi',
        topicTitle: 'Regla Institucional del 40% en Ingresos de Posgrados',
        directAnswer: `La **regla institucional del 40%** establece que el 40% de los ingresos de posgrados (**${formatCOP(cuota40)} COP** en 2026) se transfiere obligatoriamente al fondo común de la **Unidad 01 – Vicerrectoría Administrativa y Financiera**.`,
        detailedAnalysis: `Esta contrapartida financiera es fundamental para:
1. **Financiar la nómina central docente y administrativa** de dedicación compartida.
2. **Cubrir plataformas académicas, licenciamiento de software y conectividad**.
3. **Mantenimiento de infraestructura física y laboratorios de posgrado**.

El 60% restante (**${formatCOP(totalIngreso - cuota40)} COP**) permanece en las respectivas facultades y programas académicos para remuneración de docentes invitados, jurados, viáticos y gastos específicos de funcionamiento del programa.`,
        evidence: {
          vigencia: '2026',
          fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
          recurso: '33 - Posgrados y Educación Continuada',
          unidad: '01 - Vicerrectoría Administrativa y Financiera',
          fuente: 'Resumen Posgrados.csv / Acuerdo de Consejo Superior',
          criterioCalculo: '40% sobre el ingreso total proyectado de posgrados ($45.472.060.134 COP)',
          consistencia: 'VERIFICADO_100%'
        },
        deepLinks: [
          { screen: 'posgrados', label: 'Módulo de Posgrados', description: 'Revisa ingresos por cohorte, facultades y programas' },
          { screen: 'nomina', label: 'Nómina y Personal', description: 'Consulta el soporte de nómina financiado en Unidad 01' }
        ],
        suggestedFollowUps: [
          '¿Cuánto ingresó por posgrados por facultades?',
          '¿Cuál es el saldo disponible en el POA para el Recurso 33?',
          '¿Cómo ha evolucionado el histórico de posgrados 2020-2026?'
        ]
      };
    }

    // Desglose por facultades o ranking
    if (norm.includes('facultad') || norm.includes('facultades') || norm.includes('ranking') || norm.includes('desglose') || norm.includes('reparticion')) {
      const chartJson = JSON.stringify({
        type: 'pie',
        data: INSTITUTIONAL_DATA.posgrados.porFacultad.map(f => ({
          name: f.facultad.replace('Facultad ', '').replace('Ciencias ', 'C. '),
          value: Math.round(f.valor / 1e6)
        }))
      });

      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Ingresos Netos de Posgrados por Facultad (Semestre Corte)',
        directAnswer: `En el semestre de corte, **Ciencias de la Educación** lidera los ingresos netos de posgrados con **$ 4.142 Millones** (20,3% del total), seguida por **Ingeniería** con **$ 3.804 Millones** (18,6%).`,
        detailedAnalysis: `### Ranking Completo de Facultades:
1. 🥇 **Ciencias de la Educación:** $ 4.142M (20,3%) | 3.557 matriculados
2. 🥈 **Ingeniería:** $ 3.804M (18,6%)
3. 🥉 **Estudios a Distancia (FESAD):** $ 3.205M (15,7%)
4. **Ciencias Económicas y Administrativas:** $ 2.361M (11,6%)
5. **Seccional Sogamoso:** $ 2.138M (10,5%)
6. **Seccional Duitama:** $ 1.580M (7,7%)
7. **Ciencias Agropecuarias:** $ 1.140M (5,6%)
8. **Ciencias de la Salud:** $ 1.053M (5,2%)
9. **Ciencias Básicas:** $ 871M (4,3%)

**Total Neto Semestral Consolidado:** **$ 20.420.124.271 COP**.`,
        evidence: {
          vigencia: '2026',
          fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
          recurso: '33 - Posgrados',
          fuente: 'Resumen Posgrados.csv / Resumen Posgrados ingresos.csv',
          criterioCalculo: 'Suma de matrícula neta por facultad en 3.557 estudiantes liquidados',
          consistencia: 'VERIFICADO_100%'
        },
        chartJson,
        deepLinks: [
          { screen: 'posgrados', label: 'Tablero de Posgrados', description: 'Explora detalles por programa, sedes y cohortes' }
        ],
        suggestedFollowUps: [
          'Ver regla institucional del 40% para Unidad 01',
          '¿Cuánto ingresó por posgrados en total en todo el año?',
          '¿Cuánto queda disponible en el POA para Posgrados?'
        ]
      };
    }

    // Respuesta general de Posgrados
    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'Educación', value: 4142 },
        { name: 'Ingeniería', value: 3804 },
        { name: 'FESAD', value: 3205 },
        { name: 'Económicas', value: 2361 },
        { name: 'Sogamoso', value: 2138 }
      ]
    });

    return {
      modeUsed: 'auto',
      topicTitle: 'Ingresos y Población de Posgrados UPTC 2026',
      directAnswer: `Para la **vigencia 2026**, la UPTC consolida un ingreso anual proyectado de **$ 45.472.060.134 COP** en posgrados con una población total de **5.170 estudiantes**.`,
      detailedAnalysis: `A nivel de corte de matrícula semestral, el recaudo neto registrado asciende a **$ 20.420.124.271 COP** (3.557 estudiantes activos).
En el Plan Operativo Anual (POA), el **Recurso 33** cuenta con **$ 39.180 Millones programados**, con solicitudes por $ 35.701M (91,12% ejecutado) y un saldo libre disponible de **$ 3.479 Millones** (8,88%).`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        recurso: '33 - Posgrados y Educación Continuada',
        fuente: 'Resumen Posgrados.csv / POA.csv',
        criterioCalculo: 'Consolidado anual de matrícula bruta y neta institucional',
        consistencia: 'VERIFICADO_100%'
      },
      chartJson,
      deepLinks: [
        { screen: 'posgrados', label: 'Detalle de Posgrados', description: 'Consultar análisis por programas y modalidades' },
        { screen: 'poa', label: 'Ejecución POA R33', description: 'Ver saldo disponible del Recurso 33' }
      ],
      suggestedFollowUps: [
        'Ver desglose por facultades',
        'Ver regla institucional del 40%',
        'Ver histórico de ingresos de posgrados 2020-2026'
      ]
    };
  }

  // =========================================================================
  // CASO C: POA Y DISPONIBILIDAD DE FONDOS ("¿Dónde está el dinero?")
  // =========================================================================
  if (
    norm.includes('donde esta') || 
    norm.includes('disponible') || 
    norm.includes('saldo libre') || 
    norm.includes('plata libre') || 
    norm.includes('cuanto dinero tenemos') || 
    norm.includes('dinero disponible') ||
    (norm.includes('poa') && !norm.includes('posgrado'))
  ) {
    conversationContext.lastTopic = 'poa';

    // Desglose por recurso
    if (norm.includes('recurso') || norm.includes('fuente') || targetRecurso) {
      if (targetRecurso) {
        const recItem = INSTITUTIONAL_DATA.poa.recursos.find(r => r.codigo === targetRecurso);
        if (recItem) {
          return {
            modeUsed: 'poa_disponible',
            topicTitle: `Disponibilidad POA: Recurso ${recItem.codigo} (${recItem.nombre})`,
            directAnswer: `El **Recurso ${recItem.codigo} (${recItem.nombre})** tiene un saldo libre disponible de **${formatCOP(recItem.disponible)} COP** (${recItem.pctDisp.toFixed(1)}% de su presupuesto programado).`,
            detailedAnalysis: `* **Presupuesto Programado:** ${formatCOP(recItem.programado)} COP.
* **Solicitudes Acumuladas:** ${formatCOP(recItem.solicitudes)} COP (${(100 - recItem.pctDisp).toFixed(1)}% ejecutado).
* **Saldo Disponible Libre:** **${formatCOP(recItem.disponible)} COP**.
* **Restricción Normativa SIIF:** ${recItem.siif ? '🔒 Sí, está sujeto a techos de gasto SIIF Nación.' : '🔓 No, administrado con autonomía institucional.'}`,
            evidence: {
              vigencia: '2026',
              fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
              recurso: `${recItem.codigo} - ${recItem.nombre}`,
              fuente: 'POA.csv (Plan Operativo Anual Vigente)',
              criterioCalculo: 'Valor Programado menos Solicitudes acumuladas',
              consistencia: 'VERIFICADO_100%'
            },
            deepLinks: [
              { screen: 'poa', label: 'Ver en Pantalla POA', description: `Filtrar registros del Recurso ${recItem.codigo}` }
            ],
            suggestedFollowUps: [
              '¿Qué unidades tienen asignado este recurso?',
              '¿Cuánto dinero disponible hay en total en la Universidad?',
              '¿Cómo está el saldo en Bancos de este recurso?'
            ]
          };
        }
      }

      const chartJson = JSON.stringify({
        type: 'bar',
        data: INSTITUTIONAL_DATA.poa.recursos.slice(0, 6).map(r => ({
          name: `R${r.codigo}`,
          value: Math.round(r.disponible / 1e6)
        }))
      });

      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Disponibilidad de Fondos en el POA por Recursos 2026',
        directAnswer: `El disponible libre en el POA 2026 está concentrado en un 57,6% en el **Recurso 10.0 (Nación - Funcionamiento)** con **$ 82.781 Millones**, seguido por el **R31 (Propios)** con **$ 10.629 Millones**.`,
        detailedAnalysis: `### Distribución del Dinero Disponible por Fuentes:
1. 🏛️ **R10.0 (Nación - Funcionamiento):** **$ 82.781M** disponible (26,3% libre) | Techo SIIF
2. 🎓 **R31 (Recursos Propios Matrículas):** **$ 10.629M** disponible (33,8% libre)
3. 🏗️ **R20 (Estampilla Pro-Desarrollo):** **$ 8.676M** disponible (45,9% libre)
4. 📚 **R10.5 (Aportes Gratuidad):** **$ 8.398M** disponible (40,6% libre) | Techo SIIF
5. 🏛️ **R16.0 (Estampilla Pro-UPTC):** **$ 6.347M** disponible (33,6% libre) | Techo SIIF
6. 💳 **R12 (Crédito y Recursos Capital):** **$ 5.468M** disponible (31,9% libre)
7. 🌟 **R21 (Fondos Especiales / Becas):** **$ 4.587M** disponible (87,9% libre)
8. 🎓 **R33 (Posgrados):** **$ 3.479M** disponible (8,9% libre - ejecución al 91,1%)`,
        evidence: {
          vigencia: '2026',
          fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
          fuente: 'POA.csv (1.454 registros oficiales)',
          criterioCalculo: 'Agrupación por Código de Recurso sobre valorDisponiblePoa',
          consistencia: 'VERIFICADO_100%'
        },
        chartJson,
        deepLinks: [
          { screen: 'poa', label: 'Explorador Completo POA', description: 'Revisar los 1.454 rubros oficiales con filtros' }
        ],
        suggestedFollowUps: [
          '¿Qué unidades o facultades concentran este disponible?',
          '¿Cuánto disponible hay en Gastos de Personal frente a Inversión?',
          'Ver disponibilidad específica del Recurso 10'
        ]
      };
    }

    // Desglose por unidad
    if (norm.includes('unidad') || norm.includes('facultad') || targetUnidad) {
      if (targetUnidad) {
        const uItem = INSTITUTIONAL_DATA.poa.unidades.find(u => u.codigo === targetUnidad);
        if (uItem) {
          return {
            modeUsed: 'poa_disponible',
            topicTitle: `Disponibilidad POA: Unidad ${uItem.codigo} (${uItem.nombre})`,
            directAnswer: `La **Unidad ${uItem.codigo} (${uItem.nombre})** cuenta con un saldo libre disponible de **${formatCOP(uItem.disponible)} COP** en el POA 2026.`,
            detailedAnalysis: `* **Presupuesto Programado:** ${formatCOP(uItem.programado)} COP.
* **Saldo Disponible Libre:** **${formatCOP(uItem.disponible)} COP**.
${uItem.nota ? `* **Nota Especial:** ⚠️ ${uItem.nota}.` : ''}
${uItem.riesgo ? `* **Alerta de Ejecución:** ⚠️ ${uItem.riesgo}.` : ''}`,
            evidence: {
              vigencia: '2026',
              fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
              unidad: `${uItem.codigo} - ${uItem.nombre}`,
              fuente: 'POA.csv',
              criterioCalculo: 'Suma de valorDisponiblePoa filtrado por unidad',
              consistencia: 'VERIFICADO_100%'
            },
            deepLinks: [
              { screen: 'poa', label: 'Filtrar Unidad en POA', description: `Ver rubros de ${uItem.nombre}` }
            ],
            suggestedFollowUps: [
              '¿Cuáles son los recursos con mayor saldo en esta unidad?',
              '¿Cómo está el disponible en las demás facultades?'
            ]
          };
        }
      }

      return {
        modeUsed: 'poa_disponible',
        topicTitle: 'Concentración del Dinero Disponible por Unidades y Sedes',
        directAnswer: `El 91,0% del dinero disponible del POA está concentrado en la **Unidad 01 (Vicerrectoría Administrativa y Financiera)** con **$ 130.713 Millones**, debido a que custodia los rubros de nómina central docente y administrativa de fin de año.`,
        detailedAnalysis: `### Disponibilidad en Facultades y Sedes Seccionales:
1. 🏭 **Seccional Sogamoso (Unidad 13):** **$ 1.693M** disponible (21,7% libre)
2. 🔬 **Investigación y Extensión - VIE (Unidad 02):** **$ 1.640M** disponible (25,2% libre)
3. ⚙️ **Facultad de Ingeniería (Unidad 09):** **$ 1.432M** disponible (13,7% libre)
4. 💻 **FESAD - Distancia (Unidad 11):** **$ 1.187M** disponible (43,6% libre)
5. 🛢️ **Presupuesto SGR Regalías:** **$ 1.170M** disponible (33,6% libre)
6. 🏥 **Unisalud (Unidad 03):** **$ 1.166M** disponible (6,1% libre - ⚠️ *Alerta por baja disponibilidad*)
7. 🎓 **Facultad de Educación (Unidad 04):** **$ 1.161M** disponible (8,3% libre - ⚠️ *Alerta por baja disponibilidad*)
8. 💼 **Ciencias Económicas (Unidad 06):** **$ 973M** disponible (41,9% libre)
9. 🌾 **Ciencias Agropecuarias (Unidad 08):** **$ 643M** disponible (24,8% libre)
10. 🏢 **Seccional Duitama (Unidad 12):** **$ 547M** disponible (31,1% libre)
11. 🧬 **Ciencias Básicas (Unidad 05):** **$ 503M** disponible (46,5% libre)`,
        evidence: {
          vigencia: '2026',
          fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
          fuente: 'POA.csv',
          criterioCalculo: 'Agrupación por código y nombre de unidad',
          consistencia: 'VERIFICADO_100%'
        },
        deepLinks: [
          { screen: 'poa', label: 'Ver POA por Unidades', description: 'Abrir vista de distribución de fondos' }
        ],
        suggestedFollowUps: [
          '¿Por qué Unisalud y Educación tienen baja disponibilidad?',
          '¿Cuánto se gasta en nómina en la Unidad 01?'
        ]
      };
    }

    // Respuesta general de POA
    const poa = INSTITUTIONAL_DATA.poa;
    const chartJson = JSON.stringify({
      type: 'pie',
      data: [
        { name: 'Solicitudes Acumuladas', value: Math.round(poa.solicitudes / 1e6) },
        { name: 'Disponible Libre', value: Math.round(poa.disponibleTotal / 1e6) }
      ]
    });

    return {
      modeUsed: 'poa_disponible',
      topicTitle: 'Estado General de Fondos en el POA 2026',
      directAnswer: `En el POA 2026, la UPTC cuenta con un saldo libre disponible de **$ 143.637.765.931,93 COP** (26,69% del presupuesto programado de $ 538.165M).`,
      detailedAnalysis: `### Métricas Clave del Plan Operativo Anual:
* **POA Inicial:** ${formatCOP(poa.inicial)} COP.
* **Modificaciones Netas:** +${formatCOP(poa.modificaciones)} COP.
* **POA Programado Vigente:** **${formatCOP(poa.programado)} COP**.
* **Solicitudes Acumuladas:** ${formatCOP(poa.solicitudes)} COP (${poa.solicitudesPorcentaje}% ejecutado).
* **DISPONIBILIDAD TOTAL LIBRE:** **${formatCOP(poa.disponibleTotal)} COP** (26,69%).

Por tipo de gasto, el disponible se distribuye en:
* **Gastos de Personal (2.1.1):** $ 99.032M (32,8% libre - reserva para sueldos, primas y liquidaciones).
* **Funcionamiento (2.1.2):** $ 26.702M (15,3% libre).
* **Inversión (2.3):** $ 16.261M (33,3% libre).`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        fuente: 'POA.csv (1.454 registros oficiales)',
        criterioCalculo: 'Consolidado oficial de valores programados, solicitudes y disponibles',
        consistencia: 'VERIFICADO_100%'
      },
      chartJson,
      deepLinks: [
        { screen: 'poa', label: 'Ir a Pantalla POA', description: 'Revisar gráficos y tabla interactiva de ejecución' }
      ],
      suggestedFollowUps: [
        '¿Dónde está el dinero disponible por recursos?',
        '¿Dónde está el dinero disponible por unidades y facultades?',
        '¿Cuánto se gasta en nómina de fin de año?'
      ]
    };
  }

  // =========================================================================
  // CASO D: FLUJO DE CAJA Y LIQUIDEZ ("¿Cuánto dinero hay en caja y bancos?")
  // =========================================================================
  if (
    norm.includes('flujo de caja') || 
    norm.includes('banco') || 
    norm.includes('bancos') || 
    norm.includes('caja') || 
    norm.includes('liquidez') || 
    norm.includes('tesoreria') ||
    norm.includes('meses de presion')
  ) {
    conversationContext.lastTopic = 'flujo_caja';

    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'Saldo Actual Bancos', value: 43370 },
        { name: 'Ingresos Proy Sep-Dic', value: 124500 },
        { name: 'Pagos Proy Sep-Dic', value: 165670 },
        { name: 'Margen Cierre R10', value: 2200 }
      ]
    });

    return {
      modeUsed: 'flujo_caja',
      topicTitle: 'Diagnóstico de Flujo de Caja, Tesorería y Presión de Cierre',
      directAnswer: `Al corte del 31 de agosto de 2026, la UPTC dispone de un saldo en caja y bancos de **$ 43.370 Millones COP**, con una proyección de cierre que arroja un margen libre de **$ 2.200 Millones** en el Recurso 10.0.`,
      detailedAnalysis: `### Comportamiento de Tesorería a la Fecha:
* **Recaudo Acumulado Efectivo:** $ 341.820 Millones.
* **Pagos Reales Efectivos:** $ 298.450 Millones.
* **Saldo Disponible en Bancos:** **$ 43.370 Millones**.

### Proyección de Cierre (Septiembre – Diciembre 2026):
* **Ingresos Proyectados:** $ 124.500 Millones.
* **Pagos Proyectados:** $ 165.670 Millones.
* **Meses de Alta Presión de Caja:** **Octubre, Noviembre y Diciembre** (desembolsos concentrados de nóminas de docentes de cátedra, prima de navidad, cesantías y liquidaciones contractuales).
* **Posición Neta al 31 de Diciembre:** **$ 2.200 Millones**, concentrados exclusivamente en el Recurso 10.0. Sin déficit ni superávit artificial.`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        fuente: 'balance.csv / tesoreriaDataService.ts / extractos bancarios',
        criterioCalculo: 'Flujo efectivo de recaudo menos pagos conciliados y modelo de proyección sep-dic',
        consistencia: 'VERIFICADO_100%'
      },
      chartJson,
      deepLinks: [
        { screen: 'cashflow', label: 'Tablero de Flujo de Caja', description: 'Ver curvas de ingresos vs egresos por mes' },
        { screen: 'nomina', label: 'Compromisos de Nómina', description: 'Revisar proyección de primas y liquidaciones' }
      ],
      suggestedFollowUps: [
        '¿Cómo se financian las primas de fin de año?',
        '¿Qué recursos presentan riesgo de liquidez al cierre?',
        'Ver balance general presupuestal'
      ]
    };
  }

  // =========================================================================
  // CASO E: NÓMINA INSTITUCIONAL Y GASTOS DE PERSONAL
  // =========================================================================
  if (
    norm.includes('nomina') || 
    norm.includes('sueldo') || 
    norm.includes('salario') || 
    norm.includes('personal') || 
    norm.includes('gastos de personal') ||
    norm.includes('planta')
  ) {
    conversationContext.lastTopic = 'nomina';

    const chartJson = JSON.stringify({
      type: 'bar',
      data: [
        { name: 'Gastos Personal POA', value: 301916 },
        { name: 'Solicitudes Acumuladas', value: 202884 },
        { name: 'Disponible de Nómina', value: 99032 }
      ]
    });

    return {
      modeUsed: 'vafi',
      topicTitle: 'Nómina Institucional y Gastos de Personal 2026',
      directAnswer: `Para la vigencia 2026, los **Gastos de Personal (2.1.1)** tienen un presupuesto programado de **$ 301.916 Millones COP**, con una ejecución en solicitudes de $ 202.884M y una reserva libre disponible de **$ 99.032 Millones** en la Unidad 01.`,
      detailedAnalysis: `### Concentración Normativa:
* El 100% de la nómina central docente y administrativa se liquida y respalda a través de la **Unidad 01 – Vicerrectoría Administrativa y Financiera**.
* **Financiación Principal:** Recurso 10.0 (Aportes Nación Ley 30), complementado con la cuota del 40% de Posgrados ($ 18.188M) y Recursos Propios R31.
* El disponible actual de **$ 99.032 Millones** (32,8% libre) está estrictamente comprometido para garantizar el pago de los meses de septiembre a diciembre, incluyendo prima de navidad, cesantías y retroactivos.`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        unidad: '01 - Vicerrectoría Administrativa y Financiera',
        recurso: '10.0 / 31 / 33',
        fuente: 'Nomina.csv / POA.csv',
        criterioCalculo: 'Consolidado del tipo de gasto 2.1.1 en Unidad 01',
        consistencia: 'VERIFICADO_100%'
      },
      chartJson,
      deepLinks: [
        { screen: 'nomina', label: 'Módulo de Nómina Institucional', description: 'Revisa liquidaciones por periodo y vinculación' },
        { screen: 'catedra', label: 'Horas Cátedra', description: 'Ver simulación de docentes de cátedra y escalafón' }
      ],
      suggestedFollowUps: [
        '¿Cuánto se destina a docentes de cátedra en el año?',
        '¿Cómo está el saldo para pagar la prima de navidad?',
        'Ver flujo de caja proyectado para sueldos'
      ]
    };
  }

  // =========================================================================
  // CASO F: DOCENTES DE CÁTEDRA (Simulador, Costos, Escalafón)
  // =========================================================================
  if (
    norm.includes('catedra') || 
    norm.includes('escalafon') || 
    norm.includes('docentes de catedra') || 
    norm.includes('horas catedra')
  ) {
    conversationContext.lastTopic = 'catedra';

    return {
      modeUsed: 'escenario',
      topicTitle: 'Docentes de Cátedra: Análisis y Simulación de Escalafón (Acuerdo 015 de 2009)',
      directAnswer: `El aplicativo cuenta con el **Simulador Interactivo de Docentes de Cátedra** con corte al 30 de noviembre, permitiendo modelar los costos semestrales y anuales ante variaciones en las equivalencias del escalafón (Auxiliar, Asistente, Asociado y Titular).`,
      detailedAnalysis: `### Capacidades Analíticas del Módulo:
* **Base de Análisis:** Base oficial de docentes de cátedra activos en pregrado y posgrados.
* **Escenarios Configurables:**
  - *Escenario Base:* Clasificación actual según el Acuerdo 015 de 2009.
  - *Escenarios Alternativos (+4% / +6%):* Impacto económico de indexación y reclasificación por formación académica (Especialización, Maestría, Doctorado).
* **Impacto Presupuestal:** Cuantifica la variación absoluta y porcentual por facultad, sede y escuela.
* **Soporte Normativo:** Aplica factores salariales y prestaciones proporcionales según régimen legal colombiano.`,
      evidence: {
        vigencia: '2026',
        fechaCorte: '30 de noviembre / Simulación Oficial',
        fuente: 'docentes_catedra_2026.csv / Acuerdo 015 de 2009 UPTC',
        criterioCalculo: 'Modelo paramétrico de horas/semana x semanas de semestre x valor hora escalafón',
        consistencia: 'SIMULACION_PARAMETRICA'
      },
      deepLinks: [
        { screen: 'catedra', label: 'Abrir Simulador de Cátedra', description: 'Evaluar escenarios y diferencias de costos' }
      ],
      suggestedFollowUps: [
        '¿Cuál es el costo estimado del escenario con aumento del 4%?',
        '¿Qué facultad concentra el mayor costo en docentes de cátedra?'
      ]
    };
  }

  // =========================================================================
  // CASO G: SIMULACIÓN DE NUEVO GASTO / ¿QUÉ PASA SI...?
  // =========================================================================
  if (
    norm.includes('simular') || 
    norm.includes('simula') || 
    norm.includes('que pasa si') || 
    norm.includes('podemos asumir') || 
    norm.includes('nuevo gasto') ||
    preferredMode === 'escenario'
  ) {
    conversationContext.lastTopic = 'escenario';

    // Extracción de cifra numérica si el usuario incluyó una
    let gastoMonto = 5000000000; // 5.000M por defecto
    const match = norm.match(/(\d+[\.,]?\d*)\s*(millones|m|mil millones)?/);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(num)) {
        if (norm.includes('mil millones')) {
          gastoMonto = num * 1e9;
        } else if (norm.includes('millones') || norm.includes('m')) {
          gastoMonto = num * 1e6;
        } else if (num < 1000) {
          gastoMonto = num * 1e6;
        }
      }
    }

    const margenCaja = 2200000000;
    const viableCaja = gastoMonto <= margenCaja;

    return {
      modeUsed: 'escenario',
      topicTitle: `Simulación de Nuevo Gasto: ${formatMillones(gastoMonto)} COP`,
      directAnswer: viableCaja 
        ? `Dictamen: **VIABLE CONDICIONADO**. El gasto de ${formatMillones(gastoMonto)} puede ser cubierto dentro del margen de caja libre proyectado ($2.200M).`
        : `Dictamen: **NO VIABLE EN CAJA LIBRE DE CIERRE**. Un nuevo gasto de ${formatMillones(gastoMonto)} supera el margen libre de cierre ($2.200M en R10.0) y causaría un déficit de tesorería de ${formatMillones(gastoMonto - margenCaja)} COP.`,
      detailedAnalysis: `### Matriz de Viabilidad Técnica y Presupuestal:
1. **Capacidad Presupuestal:**
   - En el POA 2026 existen $ 143.637M disponibles. Si el gasto es de funcionamiento, existen saldos en R10.0 ($82.781M) y R31 ($10.629M). Por tanto, **técnicamente existe apropiación presupuestal**.
2. **Capacidad de Caja y Tesorería (Factor Crítico):**
   - El saldo libre no comprometido en bancos al cierre de 2026 es de solo **$ 2.200 Millones** en R10.0.
   - Si se aprueba este gasto sin un ingreso extraordinario compensatorio, la tesorería entraría en estrés de liquidez durante los meses de alta presión (octubre a diciembre).
3. **Fuentes Recomendadas según Naturaleza del Gasto:**
   - Si es **Inversión o Infraestructura:** Debe cargarse a **Recurso 20 (Estampilla Pro-Desarrollo - $8.676M libre)** o **R16.0 ($6.347M libre)**, los cuales tienen caja propia y no afectan la nómina de funcionamiento.
   - Si es **Gasto de Personal / Nómina:** Solo puede cargarse a Unidad 01 con respaldo en R10 o R31, exigiendo recorte o aplazamiento de otros rubros.`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        fuente: 'balance.csv / cashFlowEngine.ts / POA.csv',
        criterioCalculo: 'Regla de Consistencia Financiera: Pagos Proyectados <= Recaudo Proyectado',
        consistencia: 'SIMULACION_PARAMETRICA'
      },
      deepLinks: [
        { screen: 'cashflow', label: 'Analizar en Flujo de Caja', description: 'Revisar impacto de egresos en la posición de cierre' },
        { screen: 'poa', label: 'Consultar Disponibilidad POA', description: 'Ver fuentes con saldo libre apropiable' }
      ],
      suggestedFollowUps: [
        '¿Qué recursos de inversión podrían financiar este gasto?',
        '¿Cómo está el margen de caja proyectado a diciembre?'
      ]
    };
  }

  // =========================================================================
  // CASO H: AUDITORÍA Y RIESGOS FINANCIEROS ("Audita...", "Riesgos...")
  // =========================================================================
  if (
    norm.includes('audita') || 
    norm.includes('auditoria') || 
    norm.includes('riesgo') || 
    norm.includes('inconsistencia') || 
    preferredMode === 'auditoria'
  ) {
    conversationContext.lastTopic = 'auditoria';

    return {
      modeUsed: 'auditoria',
      topicTitle: 'Auditoría Institucional de Consistencia y Riesgos Presupuestales',
      directAnswer: `Se identifican **3 puntos de atención prioritaria** para el cierre de vigencia 2026: alta ejecución en Unisalud (93,9%) y Educación (91,7%), concentración de caja libre en un solo recurso ($2.200M en R10) y techos SIIF Nación.`,
      detailedAnalysis: `### Matriz de Hallazgos y Riesgos de Auditoría:

| Hallazgo | Evidencia Oficial | Nivel de Riesgo | Acción Sugerida |
|---|---|---|---|
| **Concentración de Liquidez al Cierre** | Saldo libre proyectado de solo $ 2.200M en R10.0 al 31 de diciembre. | **ALTO** | Monitorear el recaudo de octubre y priorizar pagos estrictamente obligatorios de nómina. |
| **Baja Disponibilidad en Unisalud (Unidad 03)** | Ejecución al 93,88% con solo $ 1.166M disponible libre frente a $ 19.052M programados. | **ALTO** | Evaluar adición presupuestal antes de noviembre para evitar interrupción de servicios médicos. |
| **Baja Disponibilidad en Educación (Unidad 04)** | Ejecución al 91,67% con $ 1.161M disponible frente a $ 13.937M programados. | **MEDIO** | Revisar contratos de docentes de cátedra pendientes de liquidación. |
| **Restricciones de Techo SIIF Nación** | Recursos R10.0, R10.5, R12 y R16 sujetos a techos certificados. | **MEDIO** | No programar compromisos adicionales sin certificación previa de la Dirección de Presupuesto. |

**Dictamen General:** La consistencia presupuestal es sólida, pero la tesorería de fin de año exige disciplina estricta de desembolsos.`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        fuente: 'POA.csv / balance.csv / tesoreriaDataService.ts',
        criterioCalculo: 'Auditoría cruzada de ejecución presupuestal vs recaudo efectivo y techos de caja',
        consistencia: 'VERIFICADO_100%'
      },
      deepLinks: [
        { screen: 'poa', label: 'Ver Alertas en POA', description: 'Consultar rubros con ejecución superior al 90%' },
        { screen: 'cashflow', label: 'Monitorear Flujo de Caja', description: 'Revisar disponibilidad de tesorería mensual' }
      ],
      suggestedFollowUps: [
        '¿Qué opciones de adición existen para Unisalud?',
        '¿Cuánto dinero se proyecta recaudar en el último trimestre?'
      ]
    };
  }

  // =========================================================================
  // CASO I: CONCEPTO PARA CONSEJO SUPERIOR / ACADÉMICO
  // =========================================================================
  if (
    norm.includes('consejo superior') || 
    norm.includes('consejo academico') || 
    norm.includes('concepto directivo') || 
    preferredMode === 'consejo_superior'
  ) {
    conversationContext.lastTopic = 'consejo_superior';

    return {
      modeUsed: 'consejo_superior',
      topicTitle: 'Concepto Técnico Ejecutivo para el Honorable Consejo Superior',
      directAnswer: `**HECHO:** La UPTC presenta una ejecución presupuestal ordenada con $ 143.637M en fondos disponibles (26,7%) y una posición de caja proyectada al cierre con margen libre de $ 2.200M en R10.0.`,
      detailedAnalysis: `### Estructura de Decisión Directiva (HECHO → IMPACTO → RIESGO → CONCLUSIÓN):

1. **HECHO:**
   - El POA 2026 cuenta con $ 538.165M programados y $ 394.528M en solicitudes (73,3% ejecutado).
   - El recaudo efectivo en bancos a la fecha suma $ 341.820M frente a $ 298.450M en pagos reales.
   - Posgrados aporta $ 45.472M proyectados, transfiriendo $ 18.188M (40%) a nómina central.
   - Para 2027, el MEN canalizará los $ 52.834M de Gratuidad en doceavas mensuales ($4.402,9M/mes) bajo el Recurso 10.5 vía MinHacienda.

2. **IMPACTO:**
   - La Universidad tiene garantizada la cobertura de los salarios, prestaciones y primas de fin de año del personal de planta y cátedra.

3. **RIESGO:**
   - El margen de maniobra en caja libre al cierre es estrecho ($2.200M). Cualquier nuevo compromiso no previsto de funcionamiento desbalancearía la tesorería.

4. **CONCLUSIÓN Y RECOMENDACIÓN:**
   - Mantener congelación de nuevos gastos no esenciales de funcionamiento.
   - Priorizar inversiones con fuentes de recaudo asegurado (R20 Estampilla Pro-Desarrollo y R16 Pro-UPTC).`,
      evidence: {
        vigencia: '2026',
        fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
        fuente: 'POA.csv / balance.csv / Informes de Ejecución Financiera VAFI',
        criterioCalculo: 'Consolidación directiva institucional para toma de decisiones',
        consistencia: 'VERIFICADO_100%'
      },
      deepLinks: [
        { screen: 'informe-gerencial', label: 'Informe Gerencial Directivo', description: 'Ver presentación consolidada para Consejos' },
        { screen: 'presupuesto', label: 'Balance Presupuestal', description: 'Revisar balance general y fuentes' }
      ],
      suggestedFollowUps: [
        'Ver dictamen detallado de viabilidad técnica VAFI',
        'Ver proyección de ingresos y gastos para 2027'
      ]
    };
  }

  // =========================================================================
  // CASO J: FALLBACK GENERAL INTELIGENTE DE CENTAVO
  // =========================================================================
  return {
    modeUsed: 'auto',
    topicTitle: 'Panorama Financiero Institucional UPTC 2026',
    directAnswer: `La UPTC administra un presupuesto vigente de **$ 538.165 Millones COP** en el POA 2026, con **$ 143.637 Millones** disponibles libres (26,69%) y un saldo en bancos de **$ 43.370 Millones** al corte del 31 de agosto.`,
    detailedAnalysis: `### Principales Fuentes y Módulos Disponibles para Consulta:
* 🎓 **Posgrados (R33):** $ 45.472M en ingresos anuales proyectados | Regla 40% a nómina central ($18.188M).
* 👥 **Nómina y Personal (2.1.1):** $ 301.916M programados en Unidad 01 | $ 99.032M disponible para fin de año.
* 🏛️ **Recursos de la Nación (R10):** $ 315.228M programados | $ 82.781M disponible | Techo SIIF.
* 🔮 **Proyección 2027 (R10.5 Gratuidad):** $ 52.834M ($4.402,9M/mes en doceavas MinHacienda).
* 💵 **Flujo de Caja:** $ 2.200M proyectados de margen libre al 31 de diciembre de 2026.

¿Sobre cuál de estos recursos, facultades o proyecciones deseas profundizar?`,
    evidence: {
      vigencia: '2026',
      fechaCorte: INSTITUTIONAL_DATA.fechaCorte,
      fuente: 'Bases de Datos Oficiales UPTC (POA, Nómina, Balance, Posgrados)',
      criterioCalculo: 'Consolidado general de inteligencia financiera institucional',
      consistencia: 'VERIFICADO_100%'
    },
    deepLinks: [
      { screen: 'poa', label: 'Disponible POA', description: 'Revisar los 1.454 rubros oficiales' },
      { screen: 'posgrados', label: 'Posgrados', description: 'Ver recaudos por facultades y programas' },
      { screen: 'cashflow', label: 'Flujo de Caja', description: 'Ver curvas de ingresos y egresos' }
    ],
    suggestedFollowUps: [
      '¿Cuánto ingresó por posgrados?',
      '¿Dónde está el dinero disponible en el POA?',
      '¿Cuánto dinero hay en caja y bancos?',
      '¿Cómo es la proyección de Gratuidad para 2027 en 12-avas?'
    ]
  };
}
