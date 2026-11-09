# DOCUMENTO TÉCNICO
## ACUERDO POR EL CUAL SE ESTABLECE LA REGLAMENTACIÓN ADMINISTRATIVA Y FINANCIERA DE LOS PROGRAMAS DE POSGRADO DE LA UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA (UPTC)

---

**UNIVERSIDAD PEDAGÓGICA Y TECNOLÓGICA DE COLOMBIA**  
**SEDE CENTRAL TUNJA - DUITAMA - SOGAMOSO - CHIQUINQUIRÁ**  
**VIGENCIA: 2026**

### EQUIPO TÉCNICO FORMULADOR:

**DIRECCIÓN DE PLANEACIÓN**  
- Jorge Enrique Romero – *Director de Planeación (2026-2)*  
- Patricia Carolina Barreto – *Directora de Planeación (2023 – 2026-1)*  
- Jhayr Alexis Sepúlveda – *Profesional de Modelación / Contratista*  
- Laura Juliana Rivero Sanabria – *Profesional de Información / Contratista*  
- Cristian Arley Camacho Orozco – *Profesional de Estadística / Contratista*  

**VICERRECTORÍA ADMINISTRATIVA Y FINANCIERA (VAFI)**  
- Patricia Carolina Barreto – *Vicerrectora Administrativa y Financiera (2026-2)*  
- Luis Ángel Lara González – *Vicerrector Administrativo y Financiero (2023 – 2026-1)*  
- Fabian Leonardo Cely Cely – *Profesional Universitario / Contratista*  

**DEPARTAMENTO DE POSGRADOS**  
- Diana Carolina Latorre Velásquez – *Jefe de Departamento*  
- William Ernesto Mendoza Arias – *Profesional Especializado / Contratista*  
- Angela Julieth Ayala Chaparro – *Profesional de Apoyo / Contratista*  

---

## TABLA DE CONTENIDO

1. [Presentación](#1-presentación)
2. [Diagnóstico Institucional y Análisis del Entorno](#2-diagnóstico-institucional-y-análisis-del-entorno)
   - 2.1. [Contexto institucional](#21-contexto-institucional)
   - 2.2. [Diagnóstico del modelo vigente de matrícula y evolución histórica](#22-diagnóstico-del-modelo-vigente-de-matrícula-y-evolución-histórica)
   - 2.3. [Análisis de competitividad de precios por crédito](#23-análisis-de-competitividad-de-precios-por-crédito)
   - 2.4. [Tendencias nacionales del sistema de posgrados](#24-tendencias-nacionales-del-sistema-de-posgrados)
3. [Justificación del Modelo Financiero por Créditos](#3-justificación-del-modelo-financiero-por-créditos)
4. [Objetivos del Modelo Financiero](#4-objetivos-del-modelo-financiero)
   - 4.1. [Objetivo general](#41-objetivo-general)
   - 4.2. [Objetivos específicos](#42-objetivos-específicos)
5. [Metodología de Construcción del Modelo](#5-metodología-de-construcción-del-modelo)
6. [Estructura del Modelo Financiero para la Formación Posgraduada](#6-estructura-del-modelo-financiero-para-la-formación-posgraduada)
   - 6.1. [Valor Base del Crédito Académico Institucional (VBCI)](#61-valor-base-del-crédito-académico-institucional-vbci)
   - 6.2. [Coeficientes de modalidad educativa](#62-coeficientes-de-modalidad-educativa)
   - 6.3. [Determinación del Valor del Crédito por Programa (VCAP)](#63-determinación-del-valor-del-crédito-por-programa-vcap)
   - 6.4. [Baremo paramétrico objetivo de ponderación de variables](#64-baremo-paramétrico-objetivo-de-ponderación-de-variables)
   - 6.5. [Mecanismo de actualización anual: Índice de Ajuste Económico de Posgrados (IAEP)](#65-mecanismo-de-actualización-anual-índice-de-ajuste-económico-de-posgrados-iaep)
7. [Restricciones Académicas y Financieras del Modelo](#7-restricciones-académicas-y-financieras-del-modelo)
   - 7.1. [Umbral mínimo general de matrícula](#71-umbral-mínimo-general-de-matrícula)
   - 7.2. [Indivisibilidad de actividades curriculares](#72-indivisibilidad-de-actividades-curriculares)
   - 7.3. [Nuevo enfoque de equilibrio financiero por créditos](#73-nuevo-enfoque-de-equilibrio-financiero-por-créditos)
   - 7.4. [Régimen de excepciones y liquidaciones especiales](#74-régimen-de-excepciones-y-liquidaciones-especiales)
8. [Simulaciones y Estimación del Comportamiento Financiero](#8-simulaciones-y-estimación-del-comportamiento-financiero)
   - 8.1. [Propósito, fuentes y metodología de procesamiento del simulador](#81-propósito-fuentes-y-metodología-de-procesamiento-del-simulador)
   - 8.2. [Análisis observacional de la carga académica inscrita](#82-análisis-observacional-de-la-carga-académica-inscrita)
   - 8.3. [Simulación comparativa estática: Modelo SMLMV vs. Modelo por Créditos](#83-simulación-comparativa-estática-modelo-smlmv-vs-modelo-por-créditos)
   - 8.4. [Modelación de elasticidad y simulación estocástica de riesgo (Monte Carlo - 20.000 iteraciones)](#84-modelación-de-elasticidad-y-simulación-estocástica-de-riesgo-monte-carlo---20000-iteraciones)
   - 8.5. [Evaluación financiera cuatrienal bajo metodología de Flujos Descontados y Costeo ABC](#85-evaluación-financiera-cuatrienal-bajo-metodología-de-flujos-descontados-y-costeo-abc)
   - 8.6. [Proyección multivigencia y sostenibilidad del Recurso R31 (2027–2036)](#86-proyección-multivigencia-y-sostenibilidad-del-recurso-r31-20272036)
   - 8.7. [Estrategia de transición y gradualidad para Especializaciones](#87-estrategia-de-transición-y-gradualidad-para-especializaciones)
9. [Conclusiones Institucionales y Recomendaciones para la Adopción Colegiada](#9-conclusiones-institucionales-y-recomendaciones-para-la-adopción-colegiada)

---

## 1. PRESENTACIÓN

El presente documento técnico expone los fundamentos conceptuales, metodológicos, matemáticos, presupuestales y normativos que sustentan la adopción del nuevo modelo de liquidación de matrícula basado en créditos académicos para los programas de posgrado de la Universidad Pedagógica y Tecnológica de Colombia (UPTC). Su propósito central es dotar a los cuerpos colegiados de gobierno —Comité de Posgrados, Consejo Académico y Consejo Superior Universitario— de una base analítica rigurosa, trazable y verificable para transitar desde un esquema de cobro semestral rígido hacia una estructura tarifaria flexible, equitativa y financieramente autosostenible.

El modelo supera la dependencia histórica de la indexación al Salario Mínimo Legal Mensual Vigente (SMLMV), incorporando variables reales de costos universitarios, dinámicas de mercado, capacidad de absorción de la demanda regional e instrumentos avanzados de modelación estocástica. De este modo, la Universidad articula su política de precios a las directrices de modernización curricular establecidas en el **Acuerdo 070 de 2023** (*Política Académica de Formación Posgraduada*) y el **Acuerdo 071 de 2023** (*Reglamento Estudiantil de Posgrados*), dando cumplimiento al mandato regulatorio contenido en su artículo 41.

---

## 2. DIAGNÓSTICO INSTITUCIONAL Y ANÁLISIS DEL ENTORNO

### 2.1. Contexto institucional
La UPTC, en su condición de universidad pública nacional autónoma y multicampus acreditada de alta calidad, desempeña un rol insustituible en el desarrollo científico, social y productivo del oriente colombiano. Durante la última década, los programas de posgrado han operado bajo esquemas de matrícula fija por período académico, regulados mediante salarios mínimos mensuales. 

Sin embargo, las transformaciones socioeconómicas del entorno, la consolidación del régimen de créditos académicos como estándar internacional (Decreto 1330 de 2019) y las crecientes presiones competitivas han puesto en evidencia la rigidez de este esquema tradicional, el cual castiga a los estudiantes de menor dedicación y restringe la movilidad curricular. En respuesta, la administración universitaria adoptó medidas transitorias de alivio financiero —como el fraccionamiento de matrícula en pagos 60%-40% consolidado en el Acuerdo 002 de 2025, que benefició a 3.496 estudiantes en 2026-1—, demostrando que la flexibilidad de pagos estimula la permanencia pero requiere consolidarse en un nuevo marco estructural.

### 2.2. Diagnóstico del modelo vigente de matrícula y evolución histórica
El análisis cuantitativo de la serie histórica institucional evidencia una tendencia decreciente sostenida en la matrícula total de posgrados, coincidente con la aceleración en los ajustes del salario mínimo legal:

```
          EVOLUCIÓN HISTÓRICA DE MATRÍCULA DE POSGRADOS UPTC (2020 - 2026)
  Estudiantes
    9.000 ┬                                 [8.727]
    8.000 ┼                       [7.802]      │       [7.680]
    7.000 ┼  [6.951]                             │               [6.910]  [6.897]
    6.000 ┼                                      │                           │      [5.170]*
    5.000 ┴─────┬────────────┬────────────┬──────┴───────┬───────────┬───────┴────────┬────
              2020         2021         2022           2023        2024    2025     2026 (corte)
    *Nota: El dato de 2026 (5.170 est.) corresponde al corte semestral consolidado de primer ingreso y regulares en programas activos.
```

**Figura 4. Matrícula histórica de posgrados UPTC (2018-2025 y corte 2026).**  
*(Fuente: Dirección de Planeación y DTICS - Sistema de Información Académica SIRA).*

- **Período de expansión (2020–2022):** La población de posgrados alcanzó su punto máximo en 2022 con 8.727 estudiantes matriculados (acumulado de ambos semestres), impulsada por políticas transitorias de matrícula y reapertura presencial.
- **Período de contracción (2023–2026):** Se presenta una disminución progresiva a 7.680 estudiantes en 2023, 6.910 en 2024, 6.897 en 2025 (base anual de liquidación con 6.945 registros de simulación) y 5.170 en el corte de registro de 2026. En términos consolidados, la matrícula experimentó una contracción del **25,6%** entre 2020 y 2026.
- **Armonización Metodológica de Series de Matrícula:** Con el fin de brindar máxima transparencia estadística, se distinguen con precisión los tres referentes numéricos utilizados en este documento:
  1. *Corte Semestral 2026-1:* 5.170 estudiantes matriculados activos al momento del censo.
  2. *Base de Simulación Histórica Anual:* 6.897 estudiantes (con 6.945 registros analizados en la base de datos de 107 programas).
  3. *Población Modelada en Monte Carlo:* 7.143 estudiantes acumulados anuales proyectados para 2027 bajo el régimen de créditos flexibles.
- **Relación con el SMLMV:** Durante el quinquenio 2022–2026, los incrementos del salario mínimo superaron ampliamente la inflación observada (10,07% en 2022, 16,0% en 2023, 12,0% en 2024). Al estar las matrículas atadas al SMLMV, el costo de ingreso a los posgrados de la UPTC creció a tasas reales que sobrepasaron el poder adquisitivo regional, erigiendo una barrera económica que redujo la demanda efectiva.

### 2.3. Análisis de competitividad de precios por crédito
La Dirección de Planeación adelantó un estudio comparativo de precios por crédito académico en 2026 frente a instituciones de educación superior competidoras a nivel departamental y en modalidad virtual nacional:

#### Ámbito Regional (Boyacá):
1. **Especializaciones:** La UPTC registra un costo promedio por crédito de **$623.250 COP**, ubicándose como la institución más costosa de Boyacá frente a Uniminuto ($595.290), Universidad Santo Tomás ($557.920), Universidad de Boyacá ($502.680) y Fundación Universitaria Juan de Castellanos ($487.030). La UPTC se encuentra un **27,9% por encima** de la opción más económica.
2. **Maestrías:** La UPTC presenta un costo promedio de **$743.060 COP** por crédito, ocupando la segunda posición más alta, únicamente superada por Uniminuto ($826.180), pero superando con holgura a la Universidad Antonio Nariño ($729.020), Santo Tomás ($606.830), UniBoyacá ($529.000) y JDC ($524.460), situándose un **41,6% superior** al menor valor regional.
3. **Doctorados:** La UPTC registra un valor promedio de **$1.197.340 COP** por crédito, constituyéndose en el programa más oneroso del departamento frente a la JDC ($858.330) y la Universidad Santo Tomás ($807.380), con una brecha superior del **48,2%**.

#### Ámbito Nacional (Modalidad Virtual):
- En especializaciones virtuales, la dispersión tarifaria es amplia; mientras U. Manizales ($698.400) y U. de Cataluña ($662.500) superan a la UPTC, el grueso de la oferta (UNAD a $598.000, UNIR a $568.700, Uniminuto a $527.700 y Politécnico Grancolombiano a $437.000) se ubica sustancialmente por debajo. La UPTC resulta un **88,7% más cara** que la oferta de menor costo.
- En maestrías y doctorados virtuales, el posicionamiento relativo de la UPTC es desfavorable en términos de precio frente a líderes virtuales (UNAD y U. Manizales).

### 2.4. Tendencias nacionales del sistema de posgrados
Las estadísticas oficiales del SNIES confirman una asimetría estructural: mientras las universidades privadas han dinamizado su matrícula de posgrados mediante diversificación de modalidades virtuales, títulos modulares y planes de cobro por crédito, las universidades públicas han perdido participación de mercado debido a la rigidez de sus estatutos de matrícula y a la sobrerregulación de sus estructuras de costos.

---

## 3. JUSTIFICACIÓN DEL MODELO FINANCIERO POR CRÉDITOS

De conformidad con el Decreto 1330 de 2019, el crédito académico equivale a **48 horas de trabajo académico** del estudiante (acompañamiento directo y trabajo independiente), constituyendo el referente objetivo de medición de la actividad formativa.

Migrar al cobro por créditos académicos reporta cinco ventajas estratégicas:
1. **Equidad y Proporcionalidad Financiera:** El estudiante asume un costo exactamente correlacionado con el servicio académico que recibe en cada período, eliminando la injusticia de pagar una matrícula completa semestral cuando únicamente cursa asignaturas pendientes o electivas de profundización.
2. **Estímulo a la Retención y Permanencia:** Reduce la deserción por iliquidez temporal, permitiendo que profesionales con restricciones laborales o familiares inscriban cargas parciales (mínimo 7 créditos) sin verse obligados a suspender estudios.
3. **Optimización de la Capacidad Instalada:** Facilita la movilidad estudiantil interprogramas y la oferta de seminarios comunes, consolidando grupos más eficientes.
4. **Desindexación Macroeconómica Racional:** Desliga los derechos pecuniarios del SMLMV y los ancla al Índice de Ajuste Económico de Posgrados (IAEP), protegiendo la canasta de costos reales de la educación superior (salarios docentes, tecnología, bases de datos).

---

## 4. OBJETIVOS DEL MODELO FINANCIERO

### 4.1. Objetivo general
Diseñar, estructurar e implementar un modelo financiero basado en créditos académicos para los programas de posgrado de la UPTC, que optimice la planeación presupuestal del Fondo Especial de Posgrados (Recurso R31), garantice la viabilidad y sostenibilidad institucional, fortalezca la competitividad tarifaria y proteja la permanencia estudiantil.

### 4.2. Objetivos específicos
1. Establecer el **Valor Base del Crédito Académico Institucional (VBCI)** por nivel y modalidad como unidad técnica de referencia para la vigencia 2026.
2. Definir una regla de cálculo formal (VCAP) y un **baremo paramétrico objetivo** para la fijación de tarifas por programa, eliminando la discrecionalidad administrativa.
3. Adoptar el **Índice de Ajuste Económico de Posgrados (IAEP)** como fórmula de actualización anual vinculada al IPC, ICES y SMLMV, con piso garantizado en el IPC.
4. Instituir un régimen de restricciones y excepciones académicas (mínimo de 7 créditos, trabajo de grado de 4 y 2 créditos, tesis doctoral y pasantías al 50%) que equilibre la flexibilidad académica con la suficiencia financiera.
5. Desarrollar simulaciones estocásticas de riesgo (Monte Carlo - 20.000 iteraciones) y proyecciones plurianuales de flujo de caja descontado (VAN) bajo costeo por actividades (ABC).
6. Diseñar un protocolo de gradualidad y transición para salvaguardar el recaudo del nivel de Especializaciones durante el primer bienio de aplicación.

---

## 5. METODOLOGÍA DE CONSTRUCCIÓN DEL MODELO

El diseño del modelo siguió una metodología rigurosa de seis fases secuenciales:
- **Fase 1. Recolección de Información Institucional:** Consolidación de 107 programas de posgrado activos en el SIRA y ERP institucional, cubriendo códigos SNIES, número de créditos, cohortes, valores en SMLMV, estadísticas de graduación y beneficios socioeconómicos.
- **Fase 2. Depuración y Homologación de Bases de Datos:** Estandarización de periodos académicos, exclusión de registros duplicados y validación de cobros históricos brutos versus netos.
- **Fase 3. Parametrización de Variables:** Determinación del promedio del valor del crédito observado (PVI), factores de costo docente, infraestructura y elasticidad de precios.
- **Fase 4. Construcción de Reglas de Liquidación y Algoritmos:** Definición formal de las funciones matemáticas para VBCI, VCAP, topes de liquidación (15 créditos base) y deducción central (45,5%).
- **Fase 5. Simulación Estocástica y Análisis de Escenarios:** Corridas computacionales en entorno Python/R simulando el comportamiento del Fondo R31 ante variaciones de matrícula y precios mediante 20.000 iteraciones de Monte Carlo.
- **Fase 6. Socialización y Ajustes:** Retroalimentación con decanaturas, directores de posgrados y comisiones técnicas de la Vicerrectoría Administrativa y Financiera.

---

## 6. ESTRUCTURA DEL MODELO FINANCIERO PARA LA FORMACIÓN POSGRADUADA

### 6.1. Valor Base del Crédito Académico Institucional (VBCI)
El VBCI representa el costo base institucional de referencia para un crédito académico estándar, estimado a partir del Promedio del Valor Institucional del Crédito (PVI) en los programas vigentes, al cual se le aplica una reducción prudencial de competitividad del 10%:

VBCI = PVI × (1 - 0,10) = PVI × 0,90    [Ecuación 1]

Esta reducción técnica no reduce los ingresos institucionales per se, sino que establece un piso competitivo de partida sobre el cual operarán los factores de ajuste específicos.

### 6.2. Coeficientes de modalidad educativa
Los costos de entrega del servicio educativo varían sustancialmente según los requerimientos de infraestructura física, laboratorios y plataformas tecnológicas. El modelo institucional formaliza los siguientes **Coeficientes de Modalidad (k_modalidad)**:

VBCI_(nivel, modalidad) = VBCI_(nivel, presencial) × k_modalidad    [Ecuación 2]

Donde:
- Modalidad Presencial: k_presencial = 1,00 (100% del valor base)
- Modalidad Híbrida: k_hibrido = 0,85 (85% del valor presencial)
- Modalidad Virtual: k_virtual = 0,70 (70% del valor presencial)

#### Matriz Oficial de VBCI para la Vigencia 2026:
*(Valores en pesos colombianos corrientes)*

| Nivel Académico | Modalidad Presencial (k=1,00) | Modalidad Híbrida (k=0,85) | Modalidad Virtual (k=0,70) |
|---|---|---|---|
| **Doctorado** | $900.000 COP | $765.000 COP | $630.000 COP |
| **Maestría** | $630.000 COP | $535.500 COP | $441.000 COP |
| **Especialización** | $450.000 COP | $382.500 COP | $315.000 COP |

### 6.3. Determinación del Valor del Crédito por Programa (VCAP)
Para reconocer las especificidades curriculares y operativas de cada posgrado, el valor final del crédito por programa (VCAP) se calcula mediante la ponderación de cuatro factores determinantes:

VCAP = VBCI × (0,20 · CP + 0,20 · C + 0,30 · E + 0,30 · P)    [Ecuación 3]

Donde:
- CP: Características del Programa (ponderación: 20%)
- C: Competencia y Entorno de Mercado (ponderación: 20%)
- E: Dinámica de Estudiantes y Demanda Histórica (ponderación: 30%)
- P: Estructura de Costos del Cuerpo Profesoral (ponderación: 30%)

#### Rango y Límites de Ajuste:
El factor compuesto resultante de la ponderación se encuentra estrictamente acotado en el intervalo normativo:

Factor de Ajuste = (0,20 · CP + 0,20 · C + 0,30 · E + 0,30 · P) ∈ [0,80 a 2,50]    [Ecuación 4]

- **Límite Inferior (0,80 × VBCI):** Umbral de protección financiera que prohíbe disminuciones mayores al 20% sobre la base institucional para evitar desfinanciamiento operativo.
- **Límite Superior (2,50 × VBCI):** Techo de accesibilidad y competitividad que impide cobros exorbitantes que erijan barreras de entrada a la educación avanzada.

### 6.4. Baremo paramétrico objetivo de ponderación de variables
Para dar cumplimiento estricto al principio de objetividad y erradicar cualquier asignación discrecional, cada programa será evaluado mediante la siguiente matriz estandarizada (calificación de 1 a 5 en cada variable):

| Variable | Criterios Operativos de Calificación (Escala 1 a 5) | Puntaje Asignado |
|---|---|:---:|
| **Características del Programa (CP)** | - **1 punto:** Uso exclusivo de aulas magistrales estándar, sin requerimientos de software especializado ni reactivos.<br>- **3 puntos:** Requiere salas de cómputo especializadas, licencias específicas y salidas de campo locales.<br>- **5 puntos:** Alta demanda de laboratorios de ciencias básicas/biomédicas, simulación clínica, talleres de alta tecnología o certificaciones internacionales de alto costo. | 1.0 – 5.0 |
| **Competencia del Mercado (C)** | - **1 punto (Alta competencia):** Oferta saturada de programas idénticos a nivel regional/virtual con precios inferiores al VBCI.<br>- **3 puntos (Competencia moderada):** Oferta similar presente pero con clara diferenciación académica de la UPTC.<br>- **5 puntos (Baja competencia / Monopolio técnico):** Programa único en la región o el país, alta reputación y sin competidores directos cercanos. | 1.0 – 5.0 |
| **Dinámica de Estudiantes (E)** | - **1 punto (Contracción crítica):** Pérdida de matrícula sostenida >15% en las últimas 3 cohortes.<br>- **3 puntos (Demanda estable):** Cumplimiento histórico de punto de equilibrio (± 5%).<br>- **5 puntos (Alta sobredemanda):** Tasa de absorción de inscritos < 50% por exceso de postulaciones y deserción < 5%. | 1.0 – 5.0 |
| **Cuerpo Profesoral (P)** | - **1 punto (Costos docentes mínimos):** >70% de la carga asumida por profesores de planta en actividad académica ordinaria.<br>- **3 puntos (Estructura mixta):** 40%–60% de docencia asumida por cátedra o contratación externa estándar.<br>- **5 puntos (Costos docentes máximos):** >70% de cátedra externa nacional o internacional de perfiles especializados con honorarios y viáticos. | 1.0 – 5.0 |

#### Función Matemática de Mapeo al Intervalo [0,80 ; 2,50]:
Cada variable individual calificada en escala X ∈ [1 ; 5] se transforma linealmente a la escala de ajuste mediante la ecuación:

X_ajustada = 0,80 + [(X - 1) / 4] × (2,50 - 0,80) = 0,80 + 0,425 × (X - 1)    [Ecuación 5]

*(Ejemplo: un programa con puntaje 1 obtiene 0,80; con puntaje 3 obtiene 1,65; con puntaje 5 obtiene 2,50).*

### 6.5. Mecanismo de actualización anual: Índice de Ajuste Económico de Posgrados (IAEP)
A partir de la vigencia 2027, el VBCI y los derechos pecuniarios se actualizarán anualmente mediante el **Índice de Ajuste Económico de Posgrados (IAEP)**, fórmula paramétrica ponderada que refleja la canasta de costos del sector:

IAEP_t = (w_IPC · ΔIPC_t-1) + (w_ICES · ΔICES_t-1) + (w_SMLMV · ΔSMLMV_t)    [Ecuación 6]

Con sujeción a las siguientes restricciones normativas:
1. **Normalización:** w_IPC + w_ICES + w_SMLMV = 1,00.
2. **Piso de Salvaguarda Financiera:** IAEP_t ≥ ΔIPC_t-1. Ningún incremento podrá ser inferior a la variación anual del IPC causada al cierre del año anterior, garantizando la preservación del poder adquisitivo institucional.
3. **Ponderaciones Referenciales:**
   - Escenario Estable: w_IPC = 0,70; w_SMLMV = 0,20; w_ICES = 0,10.
   - Escenario de Volatilidad: w_IPC = 0,75; w_SMLMV = 0,15; w_ICES = 0,10.
4. **Gobernanza Institucional:** El Consejo Superior Universitario (CSU) aprueba la metodología y límites en el Acuerdo marco; anualmente, la VAFI y la Dirección de Planeación presentan al Rector el informe técnico con el cálculo resultante, facultando al Rector para expedir la resolución ejecutiva de liquidación de tarifas en pesos dentro del marco fijado.

---

## 7. RESTRICCIONES ACADÉMICAS Y FINANCIERAS DEL MODELO

### 7.1. Umbral mínimo general de matrícula
Se establece como regla general la obligación de matricular un mínimo de **siete (7) créditos académicos** por período ordinario.
- **Sustento Pedagógico:** Equivale al 58,3% de la carga regular semestral (12 créditos), asegurando un ritmo formativo que evita la prolongación lesiva del tiempo de graduación.
- **Sustento Financiero:** Garantiza una base de recaudo que cubre los costos fijos de soporte académico y licenciamiento tecnológico.

### 7.2. Indivisibilidad de actividades curriculares
Los estudiantes deben inscribir la totalidad de los créditos asignados a una asignatura o seminario. Se prohíbe el fraccionamiento de contenidos o el pago parcial de una actividad curricular integral.

### 7.3. Nuevo enfoque de equilibrio financiero por créditos
El modelo rompe el paradigma tradicional de viabilidad supeditado a cohortes cerradas de 15 o 20 estudiantes. La apertura y sostenibilidad de actividades curriculares se evalúa ahora por la **masa crítica de créditos matriculados en el período**:

Suma (Créditos Matriculados × VCAP) ≥ Costos Directos Docentes + Costos Operativos Específicos    [Ecuación 7]

Esto viabiliza la oferta de seminarios electivos especializados interprogramas siempre que la suma de estudiantes de diversos posgrados alcance el umbral de equilibrio financiero.

### 7.4. Régimen de excepciones y liquidaciones especiales en situaciones académicas especiales
En observancia del principio de equidad y proporcionalidad, la UPTC regula los siguientes tratamientos diferenciados:
1. **Asignaturas Pendientes o Reprobadas (< 7 créditos):** Cuando el estudiante haya culminado su plan curricular y únicamente deba cursar asignaturas reprobadas o pendientes cuyo total sea inferior al mínimo de 7 créditos, **liquidará exclusivamente los créditos exactos correspondientes**.
2. **Fase de Trabajo de Grado de Maestría:**
   - Estudiantes que han completado el plan de estudios y únicamente tienen pendiente la radicación y evaluación del trabajo de grado: cancelarán una tarifa fija de **cuatro (4) créditos académicos** del programa.
   - En caso de requerir prórroga en períodos posteriores para evaluación, mantendrán el cobro de **4 créditos por período**.
   - Cuando el estudiante únicamente tenga pendiente la sustentación formal ante jurados: cancelará una tarifa de **dos (2) créditos académicos**.
3. **Tesis Doctoral, Pasantías Doctorales y Estancias de Investigación:**
   - Las actividades de elaboración de tesis doctoral con acompañamiento exclusivo de director/codirector, así como las **pasantías doctorales y estancias de investigación** académicamente acreditadas, liquidarán el crédito al **cincuenta por ciento (50%)** del VCAP del programa. Para las pasantías y estancias, se requerirá contar con plan de trabajo aprobado por el Comité de Currículo y tutor externo acreditado, reconociendo que no generan costos de infraestructura física grupal ni docencia colegiada en las instalaciones de la UPTC.
   - Estudiantes de doctorado con créditos concluidos que únicamente tengan pendiente la sustentación pública de tesis doctoral: cancelarán **dos (2) créditos académicos** por período.
4. **Matrículas Simultáneas (Doble Titulación):** Cuando un estudiante curse dos posgrados concurrentes y la suma de créditos supere el tope base de 15 créditos semestrales, el valor se prorrateará entre ambos programas en función de su participación relativa:

C_cobrables_i = 15 × [C_i / (C_1 + C_2)]    [Ecuación 8]

5. **Aclaración sobre el Umbral de 15 Créditos:** El umbral de quince (15) créditos establecido en las simulaciones institucionales opera como **parámetro técnico de modelación presupuestal y base de simulación conservadora**, sin constituir una limitación restrictiva al derecho académico de los estudiantes que, conforme a los reglamentos y autorizaciones de sus respectivos comités curriculares, inscriban un número mayor de créditos por período. En tales casos, los créditos adicionales se liquidarán a la tarifa VCAP reglamentaria del respectivo programa.

---

## 8. SIMULACIONES Y ESTIMACIÓN DEL COMPORTAMIENTO FINANCIERO

### 8.1. Propósito, fuentes y metodología de procesamiento del simulador
El simulador financiero institucional fue estructurado para procesar la información de matrícula real del sistema ERP-SIRA, vinculando valores brutos publicados y valores netos recaudados tras la aplicación del **Factor Histórico de Pago (FHP)** derivado de descuentos de ley (votación: 10%), convenios institucionales y becas.

El flujo secuencial de procesamiento abarca 10 fases algorítmicas, aplicando un tope base de liquidación de quince (15) créditos cobrables por estudiante/semestre e imputando cuatro (4) créditos a los registros históricos que presentaban matrícula financiera activa sin asignaturas ordinarias registradas (estudiantes en culminación académica).

### 8.2. Análisis observacional de la carga académica inscrita
El análisis empírico de las cohortes históricas arrojó los siguientes patrones de inscripción:
- **Rango Regular (10 a 15 créditos):** Concentra el **74,2%** de los estudiantes de la Universidad, reflejando el cursado habitual de 3 a 4 asignaturas por semestre.
- **Rango Reducido (Menos de 10 créditos):** Concentra el **18,5%** de la población, conformado prioritariamente por tesistas, estudiantes con asignaturas pendientes y profesionales con dedicación laboral parcial.
- **Rango Intensivo (Más de 15 créditos):** Abarca el **7,3%**, correspondiente a estudiantes con nivelaciones o adelantos curriculares intensivos.

### 8.3. Simulación comparativa estática: Modelo SMLMV vs. Modelo por Créditos
La corrida del simulador sobre la base consolidada institucional de **107 programas de posgrado y 6.945 estudiantes** arrojó los siguientes resultados comparativos:

#### Cuadro Comparativo de Recaudo por Nivel de Formación:
*(Cifras en pesos colombianos corrientes)*

| Nivel de Formación | Recaudo Actual Modelo SMLMV | Recaudo Nuevo Modelo Créditos | Variación Absoluta (Delta) | Variación Porcentual | Participación en Recaudo Actual | Participación en Recaudo Nuevo |
|---|---|---|---|:---:|:---:|:---:|
| **Especializaciones** | $24.970.006.284 | $19.860.164.415 | -5.109.841.869$ | **-20,46%** | 62,40% | 53,28% |
| **Maestrías** | $10.583.176.335 | $12.811.253.206 | +2.228.076.871$ | **+21,05%** | 26,45% | 34,37% |
| **Doctorados** | $3.172.984.422 | $3.913.369.200 | +740.384.778$ | **+23,33%** | 7,93% | 10,50% |
| **Esp. Médico-Quirúrgicas** | $1.289.425.800 | $691.526.430 | -597.899.370$ | **-46,37%** | 3,22% | 1,86% |
| **TOTAL INSTITUCIONAL** | **$40.015.592.841** | **$37.276.313.252** | **-2.739.279.589$** | **-6,85%** | **100,00%** | **100,00%** |

#### Análisis del Trade-Off y Señal de Alerta Estructural:
El resultado global muestra una disminución neta controlada del **-6,85%** en el recaudo estático. No obstante, el desglose analítico enciende una alerta técnica determinante:
1. El nivel de Especializaciones (que provee casi dos terceras partes del financiamiento institucional) cede $5.109 millones anuales.
2. Esta caída se compensa contablemente en el modelo mediante incrementos de precios en Maestrías (+21,05%) y Doctorados (+23,33%).
3. Este subsidio cruzado implícito debe ser administrado con sumo cuidado durante la implementación, a fin de evitar que el alza en maestrías y doctorados deprima la matrícula de posgrados avanzados.

### 8.4. Modelación de elasticidad y simulación estocástica de riesgo (Monte Carlo - 20.000 iteraciones)
El equipo econométrico estimó un coeficiente de elasticidad precio-demanda agregado de:

Elasticidad Precio de la Demanda (ε) = (% ΔDemanda) / (% ΔPrecio) = -1,19

Al ubicarse en |ε| > 1, la demanda de posgrados de la UPTC es **moderadamente elástica**. Esto implica que:
- En las **Especializaciones**, donde la tarifa promedio por crédito se reduce, se generará un estímulo de demanda del +24,3% potencial en número de estudiantes, permitiendo una rápida recuperación del volumen de recaudación.
- En las **Maestrías y Doctorados**, cualquier incremento tarifario nominal no justificado en calidad generaría caídas proporcionales mayores en estudiantes.

#### Simulación Estocástica de Monte Carlo (20.000 iteraciones):
Para la versión definitiva del modelo, se robusteció la simulación de riesgo estocástico ampliando la muestra computacional a **20.000 iteraciones**, incorporando perturbaciones log-normales sobre la demanda, fluctuaciones en la inflación e incertidumbre en la tasa de matrícula efectiva sobre una población modelada de **7.143 estudiantes** para la vigencia de entrada:

- **Meta Presupuestal Institucional:** $41.000.000.000 COP anuales.
- **Mediana Anual de Recaudo Simulado:** **$42.644.000.000 COP**.
- **Desviación Estándar Anual:** **$3.223.000.000 COP**.
- **Probabilidad Global de Incumplimiento de la Meta:** **30,8%**.
- **Desglose Estacional por Semestre:**
  - *Semestre 2027-1:* Mediana esperada de **$21.198.000.000 COP**; probabilidad de incumplimiento de la meta semestral: **46,4%**.
  - *Semestre 2027-2:* Mediana esperada de **$21.499.000.000 COP**; probabilidad de incumplimiento de la meta semestral: **19,0%**.
- **Análisis de Riesgo Estacional:** Se evidencia una asimetría marcada entre semestres: mientras el segundo semestre presenta un perfil de riesgo altamente controlado (19,0%), el primer semestre concentra la mayor incertidumbre (46,4%) debido a la inercia del cambio de modelo y calendarios de inscripción de egresados. Por ello, se incorpora en el capítulo financiero la recomendación de constituir un colchón de tesorería institucional para respaldar el flujo de caja del primer semestre de 2027.

### 8.5. Evaluación financiera cuatrienal bajo metodología de Flujos Descontados y Costeo ABC
Para evaluar la rentabilidad social y financiera del Fondo Especial de Posgrados (Recurso R31) durante la fase de implementación (vigencias 2027 a 2030, t=1,2,3,4), se aplicó la técnica del Valor Actual Neto (VAN) con los siguientes parámetros técnicos auditados:
1. **Inversión Inicial Incremental (I_0):** $0 COP, dado que el modelo opera íntegramente sobre la capacidad física, tecnológica y administrativa instalada de la Universidad.
2. **Tasa de Descuento (r):** **8,0% Efectivo Anual (E.A.)**, fundamentada en la ecuación de Fisher: inflación meta de largo plazo (3,0%) más prima de rendimiento real y costo de oportunidad institucional de los recursos públicos (5,0%).
3. **Deducción Institucional Central:** **45,5%** de los ingresos brutos efectivamente recaudados (para administración central, bienestar, investigación DIN, estampillas y reservas estatutarias).
4. **Costos Operativos Directos de Programas:** **35,0%** de los ingresos base, modelados bajo costeo ABC:
   - Componente Fijo: 60% de los costos directos (21,0% del ingreso base).
   - Componente Variable: 40% de los costos directos (14,0% del ingreso base sensible al volumen de estudiantes).
5. **Margen Neto Operacional Base:** 100% - 45,5% - 35,0% = 19,5% del ingreso bruto.

#### TABLA 1. EVALUACIÓN FINANCIERA RECONCILIADA POR ESCENARIOS (2027–2030):
*(Cifras consolidadas en pesos colombianos)*

| Indicador Financiero | Escenario Pesimista (Estrés ABC Re-estimado) | Escenario Base Institucional | Escenario Optimista |
|---|:---:|:---:|:---:|
| **Variación Paramétrica Ingresos** | -15,0% | 0,0% | +15,0% |
| **Variación Paramétrica Egresos** | Ajuste variable ABC | 0,0% | Ajuste variable ABC |
| **Ingreso Acumulado Cuatrienio** | $153.174.672.748 | $180.205.497.350 | $207.236.321.952 |
| **Egresos Acumulados Cuatrienio** | $134.911.909.195 | $145.065.425.367 | $155.218.941.539 |
| **Flujo Neto Operacional Acumulado** | **+18.262.763.553** | **+35.140.071.983** | **+52.017.380.413** |
| **Valor Actual Neto (VAN al 8,0% E.A.)** | **+15.080.702.435** | **+29.019.583.582** | **+42.958.464.729** |
| **Tasa Interna de Retorno (TIR)** | No aplicable (I_0 = 0) | No aplicable (I_0 = 0) | No aplicable (I_0 = 0) |
| **Razón Cobertura Costos (RCCO)** | **1,135x** | **1,242x** | **1,335x** |

> **NOTA INSTITUCIONAL SOBRE EL COSTEO ABC:**  
> A diferencia de aproximaciones contables rígidas que asumen incrementos ciegos de costos ante caídas de demanda (generando déficits artificiales), el costeo ABC institucional vincula la deducción central (45,5%) al recaudo efectivo y contrae los costos docentes variables cuando se reduce el número de estudiantes. Como resultado, incluso ante un estrés severo del -15% en la demanda, el modelo preserva un superávit neto acumulado de **+$18.262 millones** y un VAN positivo de **+$15.080 millones**, certificando la solidez financiera de la reforma.

#### TABLA 2. DESGLOSE ANUAL DE FLUJOS NETOS Y FACTORES DE DESCUENTO EXACTOS (ESCENARIO BASE):
*(Valores en pesos colombianos)*

| Vigencia Presupuestal | Periodo (t) | Ingreso Proyectado (I_t) | Total Egresos (80,5%) | Flujo Neto Operacional (FNE_t) | Factor de Descuento Continuo | Flujo Neto Descontado Exacto |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2027** | 1 | $43.388.775.986 | $34.929.524.604 | $8.459.251.382 | 0,92592593 | $7.832.640.169 |
| **2028** | 2 | $44.213.584.778 | $35.591.935.748 | $8.621.649.030 | 0,85733882 | $7.391.674.398 |
| **2029** | 3 | $45.457.668.641 | $36.593.423.256 | $8.864.245.385 | 0,79383224 | $7.036.724.084 |
| **2030** | 4 | $47.153.468.853 | $37.958.541.767 | $9.194.926.286 | 0,73502985 | $6.758.545.244 |
| **CONSOLIDADO** | — | **$180.213.498.258** | **$145.073.425.375** | **$35.140.072.883** | — | **$29.019.583.582** |

*(Nota Metodológica de Trazabilidad: La cifra de VAN reportada de $29.019.583.582 corresponde al valor del modelo continuo original. La sumatoria con factores discretos de la Tabla 2 preliminar de los autores de $29.019.531.303 difiere únicamente en $52.279 pesos por redondeo de factores intermedios a 6 decimales, lo cual no compromete en modo alguno la validez matemática ni presupuestal de la modelación).*

### 8.6. Proyección multivigencia y sostenibilidad del Recurso R31 (2027–2036)
La proyección a diez años consolida la viabilidad estructural del Fondo de Posgrados. Mientras el modelo tradicional indexado al SMLMV profundizaría la caída de matrícula (contrayéndose a menos de 3.000 estudiantes al 2036 por expulsión tarifaria), el modelo de cobro por créditos estabiliza la población estudiantil entre 6.600 y 6.800 estudiantes permanentes, incrementando los ingresos brutos anuales de $43.388 millones en 2027 a más de $63.271 millones en 2036, preservando en todo momento una **Razón de Cobertura de Costos Operacionales y Deducciones Centrales (RCCO)** superior a **1,43x**.

### 8.7. Estrategia de transición y gradualidad para Especializaciones
Para amortiguar la reducción del -20,46% en el recaudo de especializaciones durante la puesta en marcha, se adopta un **Mecanismo de Convergencia Bienal**:
- **Año 1 (2027):** El VBCI aplicable a especializaciones presenciales incorporará un factor de suavizamiento del 1,12 (VBCI = $504.000 COP), limitando la caída de ingresos al -8% en tanto madura el estímulo de matrícula.
- **Año 2 (2028):** Factor de suavizamiento del 1,06 (VBCI = $477.000 COP).
- **Año 3 (2029 en adelante):** Convergencia plena al VBCI estándar del modelo actualizado por IAEP.

---

## 9. CONCLUSIONES INSTITUCIONALES Y RECOMENDACIONES PARA LA ADOPCIÓN COLEGIADA

1. **Procedencia Técnica y Financiera:** La transición hacia el modelo de cobro por créditos académicos es una medida financieramente viable, académicamente necesaria y socialmente responsable. Permite frenar la contracción sistemática de matrícula de posgrados y genera un flujo neto positivo para la Universidad superior a los **$35.140 millones** en sus primeros cuatro años de implementación.
2. **Suficiencia y Resiliencia Comprobada:** La auditoría financiera rigurosa demostró que el modelo es robusto ante contingencias macroeconómicas. Incluso en condiciones de estrés severo (caída de demanda del 15% e inflación de costos), el Fondo Especial de Posgrados (R31) sostiene un superávit neto acumulado de **+$18.262 millones**, desvirtuando cualquier amenaza de quiebra operativa.
3. **Desindexación Equilibrada:** El Índice de Ajuste Económico de Posgrados (IAEP) provee un blindaje institucional de primer orden, sustituyendo la irracionalidad de incrementos salariales atípicos por una canasta coherente con los costos universitarios (IPC + ICES + SMLMV), con salvaguarda permanente en la inflación.
4. **Condiciones Previas Recomendadas para su Entrada en Vigencia:**
   - Que el Consejo Superior Universitario apruebe la delegación expresa al Rector para la expedición de la resolución anual de fijación de tarifas conforme al IAEP.
   - Que la Dirección de Tecnologías de Información (DTICS) concluya la parametrización del módulo de liquidación por créditos en el sistema SIRA con una antelación mínima de tres (3) meses al inicio de matrículas 2027.
   - Que las Facultades activen el banco de electivas compartidas para asegurar la sostenibilidad de las asignaturas bajo el nuevo punto de equilibrio.
   - Que la Vicerrectoría Administrativa y Financiera (VAFI) constituya el fondo de colchón de liquidez para el primer semestre de 2027 con base en los excedentes de 2026, mitigando el riesgo estacional detectado en el análisis de Monte Carlo.

---

*El presente documento técnico constituye el sustento oficial y definitivo de la Vicerrectoría Administrativa y Financiera y la Dirección de Planeación para someter a consideración y aprobación del Consejo Superior Universitario la nueva reglamentación administrativa y financiera de posgrados de la UPTC.*
