# COMPARACIÓN DE ESCENARIOS FINANCIEROS Y ANÁLISIS DE SENSIBILIDAD (2027)
## SISTEMA DE INTELIGENCIA FINANCIERA Y PRESUPUESTAL — UPTC
### DEPARTAMENTO DE INTELIGENCIA ESTADÍSTICA Y MODELACIÓN FINANCIERA

**Responsables:** Agente 2.4 (Especialista en Escenarios y Sensibilidad) y Agente 3.4 (Director de Sostenibilidad)

---

### 1. DEFINICIÓN DE ESCENARIOS INSTITUCIONALES

Para dotar al Consejo Superior Universitario de una herramienta rigurosa de toma de decisiones frente a la incertidumbre macroeconómica y fiscal, se estructuraron cuatro escenarios cuantitativos mutuamente excluyentes:

1. **Escenario 1: Conservador / Prudencia Fiscal (Recomendado por la Dirección General)**
   * Aplica Suavización Exponencial Simple (SES $\alpha=0,3$) en R12, el aforo prudente basado en presupuesto inicial en R40, la asignación vigente del Decreto 1599/2026 en R16 y la tasa macro oficial institucional (+6,0% y +6,44%).
   * Total Ingresos: **\$490.351.599.254 COP**.
2. **Escenario 2: Base Institucional (Documento 3 — Versión 2.0)**
   * Incorpora el Anteproyecto de Ley PGN 2027 en R16 (+60%), la tasa general del +6% plano en R12 y R40 aforado.
   * Total Ingresos: **\$497.188.149.890 COP**.
3. **Escenario 3: Optimista Estocástico (Modelos ARIMA de Box-Jenkins sin Filtro)**
   * Aplica las especificaciones autorregresivas puras: ARIMA(1,1,0) en R12 (\$13.398M), ARIMA en R10 (\$435.635M), ARIMA en Cooperativas (\$2.090M).
   * Total Ingresos: **\$543.841.638.886 COP** (+17,31% vs. 2026).
4. **Escenario 4: Estrés Financiero y Contracción Macroeconómica**
   * Supone un recorte del 3% en transferencias del PGN por contingencia fiscal de la Nación, caída del 15% en inscripciones y matrículas de posgrado en R20, y paralización del 20% en contratos de obra pública nacional y regional.
   * Total Ingresos: **\$462.110.450.000 COP** (-0,32% vs. base 2026).

---

### 2. MATRIZ COMPARATIVA MULTIESCENARIO POR FUENTE DE FINANCIACIÓN
*Cifras en millones de pesos colombianos (COP)*

| Recurso Presupuestal | Base Real 2026 | Escenario 1: Conservador (Recomendado) | Escenario 2: Base Doc 3 | Escenario 3: Optimista (ARIMA) | Escenario 4: Estrés Financiero |
|---|---:|---:|---:|---:|---:|
| **R10.0 Aportes Nación Funcionamiento** | 364.009 | 387.451 | 387.451 | 435.636 | 368.078 |
| **R10.5 Política de Gratuidad (Doceavas)** | 49.844 | 52.835 | 52.835 | 52.792 | 50.193 |
| **R12 Estampilla Pro-UNAL** | 9.016 | 8.417 | 9.557 | 13.399 | 6.538 |
| **R13 Excedentes Cooperativas** | 1.622 | 1.719 | 1.719 | 2.090 | 1.297 |
| **R16.0 Aportes Inversión PGN** | 7.740 | 8.311 | 12.385 | 12.385 | 7.508 |
| **R17 Devolución Descuento Votación** | 5.643 | 5.982 | 5.982 | 6.286 | 5.361 |
| **R18 Artículo 87 Ley 30 (CESU)** | 2.110 | 2.246 | 2.246 | 1.613 | 1.900 |
| **R20 Recursos Propios (Autogestión)** | 13.188 | 13.979 | 13.979 | 10.894 | 11.882 |
| **R21 Devolución de IVA** | 4.672 | 4.953 | 4.953 | 5.222 | 4.205 |
| **R40 Estampilla Pro-UPTC** | 5.737 | 4.459 | 6.081 | 5.997 | 3.900 |
| **TOTAL GENERAL CONSOLIDADO** | **463.582** | **490.352** | **497.188** | **543.842** | **460.862** |
| *Variación nominal vs. Base 2026* | — | *+$26.770M* | *+$33.606M* | *+$80.260M* | *-$2.720M* |
| *Variación porcentual vs. Base 2026* | — | *+5,77%* | *+7,25%* | *+17,31%* | *-0,59%* |

---

### 3. ANÁLISIS DE SENSIBILIDAD ELASTICIDAD-PRESUPUESTO

Se evaluó el comportamiento del presupuesto institucional frente a variaciones en cuatro variables exógenas clave:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRUEBAS DE SENSIBILIDAD PARAMÉTRICA                             │
├──────────────────────────────┬───────────────┬──────────────────┬───────────────────────────────┤
│ Variable Macroeconómica /    │ Choque        │ Impacto en       │ Vulnerabilidad Institucional  │
│ Operativa Evaluada           │ Aplicado      │ Presupuesto ($)  │                               │
├──────────────────────────────┼───────────────┼──────────────────┼───────────────────────────────┤
│ Inflación (IPC / ICES)       │ +100 bps      │ +$3.874 millones │ Favorable en ingresos PGN;    │
│                              │ (de 6% a 7%)  │ en R10           │ presiona costos de nómina.    │
├──────────────────────────────┼───────────────┼──────────────────┼───────────────────────────────┤
│ Desaceleración del PIB       │ -150 bps      │ -$225 millones   │ Muy baja exposición general   │
│ Nacional                     │ (del 2% a 0,5%)│ en R18 (CESU)   │ (R18 representa solo 0,45%).  │
├──────────────────────────────┼───────────────┼──────────────────┼───────────────────────────────┤
│ Contracción de Matrícula     │ -10% en       │ -$400 millones   │ Media; mitigable mediante     │
│ en Posgrados                 │ demanda       │ en R20           │ diversificación virtual.      │
├──────────────────────────────┼───────────────┼──────────────────┼───────────────────────────────┤
│ Caída de Contratación de     │ -20% en valor │ -$891 millones   │ Alta en obras físicas de sedes│
│ Obras en Boyacá              │ gravado       │ en R40           │ (requiere frenar licitaciones)│
└──────────────────────────────┴───────────────┴──────────────────┴───────────────────────────────┘
```

**Conclusión del Análisis de Sensibilidad:**  
El presupuesto de la UPTC posee un alto grado de resiliencia frente a perturbaciones del mercado privado debido a que el **86,5%** de sus ingresos proviene de transferencias directas de la Nación (R10, R10.5, R16, R17, R18). Sin embargo, su principal flanco de vulnerabilidad radica en la rigidez de su estructura de gastos: el 74,6% del funcionamiento está atado a la masa salarial y prestacional de la planta, la cual es jurídicamente irreductible.
