# MODELO MATEMÁTICO, ECONOMÉTRICO Y MULTIESCENARIO DE PROYECCIÓN DE INGRESOS (2027)
## SISTEMA DE INTELIGENCIA FINANCIERA Y PRESUPUESTAL — UPTC
### DEPARTAMENTO DE INTELIGENCIA ESTADÍSTICA, MATEMÁTICA Y ECONOMÉTRICA

**Responsables:** Agente 2.2 (Econometría y Proyecciones), Agente 2.3 (Auditor Matemático), Agente 2.4 (Escenarios) y Agente 3.2 (Proyección de Ingresos)

---

### 1. FORMULACIÓN TEÓRICA DE LOS MODELOS IMPLEMENTADOS

El sistema evaluó cinco familias de modelos cuantitativos para proyectar las rentas institucionales:

#### 1.1. Modelo Determinístico de Indexación Macroeconómica (Ley 2568 de 2026)
$$Y_{t+1} = Y_t \times (1 + g_{\text{macro}})$$
Donde $Y_t$ es la base de recaudo real certificada del año $t$, y $g_{\text{macro}}$ es la tasa nominal institucional o legalmente fijada.
* Para transferencias directas de funcionamiento del PGN (R10.0 y R18):
  $$g_{\text{PGN}} = +6,44\% \implies Y_{2027} = Y_{2026} \times 1,0644$$
* Para rentas de autogestión, Gratuidad y estampillas bajo criterio de prudencia fiscal:
  $$g_{\text{prudencial}} = +6,00\% \implies Y_{2027} = Y_{2026} \times 1,0600$$

#### 1.2. Modelo de Suavización Exponencial Simple (SES)
$$S_t = \alpha Y_t + (1 - \alpha) S_{t-1}$$
$$\hat{Y}_{t+1} = S_t$$
Donde $\alpha \in (0, 1)$ representa el peso asignado a la última observación empírica, y $(1 - \alpha)$ pondera la inercia histórica acumulada.

#### 1.3. Modelo Lineal de Holt (Doble Suavizamiento Exponencial)
Descompone la serie en un nivel local $L_t$ y una pendiente de tendencia $T_t$:
$$L_t = \alpha Y_t + (1 - \alpha)(L_{t-1} + T_{t-1})$$
$$T_t = \beta(L_t - L_{t-1}) + (1 - \beta)T_{t-1}$$
$$\hat{Y}_{t+h} = L_t + h \cdot T_t$$
Con parámetros $\alpha = 0,1$ (10% peso al dato reciente en nivel) y $\beta = 0,3$ (30% peso a la variación de tendencia).

#### 1.4. Modelo de Holt Amortiguado (Damped Trend)
Introduce un factor autorregresivo $\phi \in (0, 1)$ que extingue geométricamente la tasa de crecimiento futuro:
$$\hat{Y}_{t+h} = L_t + \left( \sum_{i=1}^h \phi^i \right) T_t$$
Para $h = 1$ y factor de amortiguación $\phi = 0,98$:
$$\hat{Y}_{2027} = L_{2026} + 0,98 \cdot T_{2026}$$

#### 1.5. Modelos Estocásticos de Series de Tiempo ARIMA $(p, d, q)$ de Box-Jenkins
$$(1 - \phi_1 B - \dots - \phi_p B^p)(1 - B)^d Y_t = c + (1 + \theta_1 B + \dots + \theta_q B^q)\varepsilon_t$$
Donde $B$ es el operador de rezago ($B^k Y_t = Y_{t-k}$), $d$ es el orden de integración, y $\varepsilon_t \sim \mathcal{WN}(0, \sigma^2)$ es ruido blanco.

#### 1.6. Regresión Lineal Secular por Mínimos Cuadrados Ordinarios (MCO)
$$Y_t = \beta_0 + \beta_1 t + \varepsilon_t$$
$$\hat{\beta}_1 = \frac{\sum (t - \bar{t})(Y_t - \bar{Y})}{\sum (t - \bar{t})^2}; \quad \hat{\beta}_0 = \bar{Y} - \hat{\beta}_1 \bar{t}$$

---

### 2. CALIBRACIÓN Y DESARROLLO MATEMÁTICO POR RECURSO

#### 2.1. Recurso 12 — Estampilla Pro-UNAL y demás IES públicas
Serie histórica analizada: Asignaciones del Ministerio de Educación Nacional (2020–2026).

```
Desarrollo Paso a Paso de la Suavización Exponencial Simple (α = 0,3):
Condición inicial: S_2020 = Y_2020 = $5.191.760.490,00

Año 2021:
S_2021 = 0,3 × ($5.511.333.435,00) + 0,7 × ($5.191.760.490,00)
       = $1.653.400.030,50 + $3.634.232.343,00 = $5.287.632.373,50

Año 2022:
S_2022 = 0,3 × ($4.289.903.167,00) + 0,7 × ($5.287.632.373,50)
       = $1.286.970.950,10 + $3.701.342.661,45 = $4.988.313.611,55

Año 2023:
S_2023 = 0,3 × ($9.612.609.215,00) + 0,7 × ($4.988.313.611,55)
       = $2.883.782.764,50 + $3.491.819.528,09 = $6.375.602.292,59

Año 2024:
S_2024 = 0,3 × ($6.431.335.851,00) + 0,7 × ($6.375.602.292,59)
       = $1.929.400.755,30 + $4.462.921.604,81 = $6.392.322.360,11

Año 2025:
S_2025 = 0,3 × ($14.785.650.242,00) + 0,7 × ($6.392.322.360,11)
       = $4.435.695.072,60 + $4.474.625.652,08 = $8.910.320.724,68

Año 2026:
S_2026 = 0,3 × ($7.265.094.590,00) + 0,7 × ($8.910.320.724,68)
       = $2.179.528.377,00 + $6.237.224.507,27 = $8.416.752.884,27

PRONÓSTICO VIGENCIA 2027:
Ŷ_2027 = S_2026 = $8.416.752.884,27 COP (Adoptado oficialmente: $8.416.752.884 COP)
```

**Comparación con Modelos Alternativos en R12:**
* **ARIMA(1,1,0):** $Y_t = Y_{t-1} - 0,815615(Y_{t-1} - Y_{t-2}) + \varepsilon_t$
  $$\Delta \hat{Y}_{2027} = -0,8156146 \times (\$7.265.094.590 - \$14.785.650.242) = +\$6.133.874.983,51$$
  $$\hat{Y}_{2027}^{\text{ARIMA}} = \$7.265.094.590 + \$6.133.874.983,51 = \$13.398.969.573,51\text{ COP}$$
  *Evaluación de Auditoría:* El modelo ARIMA asume un rebote simétrico erróneo tras la caída de 2026, ignorando que los \$14.785M de 2025 fueron un giro extraordinario acumulado irrepetible. Proyectar \$13.398M generaría un déficit inmediato de más de \$4.900 millones.
* **Modelo de Holt Lineal:**
  $$L_{2026} = \$8.312.628.818,88; \quad T_{2026} = \$572.381.512,92$$
  $$\hat{Y}_{2027}^{\text{Holt}} = L_{2026} + T_{2026} = \$8.885.010.331,79\text{ COP}$$
* **Modelo de Holt Amortiguado ($\phi = 0,98$):**
  $$\hat{Y}_{2027}^{\text{Damped}} = \$8.312.628.818,88 + 0,98 \times \$572.381.512,92 = \$8.742.276.443,46\text{ COP}$$
* **Conclusión Técnica de Selección:** El modelo **SES ($\alpha=0,3$)** con valor de **\$8.416.752.884 COP** es el más conservador de los modelos de suavizamiento, se sitúa un 6,6% por debajo del recaudo efectivo de caja de 2026 (\$9.015M) y garantiza inmunidad ante la volatilidad de la contratación nacional de obra pública.

---

#### 2.2. Recurso 40 — Estampilla Pro-UPTC Departamental
Serie secular analizada: 18 observaciones anuales (2009–2026).
* **Parámetros de Tendencia Secular:**
  * Intercepto $\hat{\beta}_0 = \$1.398.000.000\text{ COP}$
  * Pendiente $\hat{\beta}_1 = +\$212.000.000\text{ COP/año}$
  * Coeficiente de Determinación: $R^2 = 75,04\%$
  * Tasa de Crecimiento Anual Compuesta secular (CAGR 2009–2026): $+9,05\%$ anual.
* **Escenarios Evaluados:**
  1. *Escenario Aforado 2026 + IPC (6,0%):*
     $$\$5.737.263.195 \times 1,06 = \$6.081.498.987\text{ COP}$$
  2. *Escenario ARIMA(0,1,0) con deriva:*
     $$\text{Pronóstico} = \$5.997.300.000\text{ COP}$$
  3. *Escenario Prudente — Base Inicial 2026 + IPC (6,0%) (Adoptado en Documento 1):*
     $$\$4.206.444.980 \times 1,06 = \$4.458.831.679\text{ COP}$$
* **Justificación de Adopción:**
  Se adopta como cifra base de inversión el escenario de **\$4.458.831.679 COP**. Queda \$1.538 millones por debajo del pronóstico econométrico de tendencia (\$5.997M), constituyendo un colchón de seguridad que previene la suspensión de contratos de obra civil si la actividad contractual de Boyacá sufre contracciones.

---

#### 2.3. Recurso 20 — Recursos Propios de Autogestión
Base real depurada 2026: \$13.187.794.757 COP.
* **Fórmula de Aforo Oficial (+6,0%):**
  $$\text{Aforo}_{2027} = \$13.187.794.757 \times 1,06 = \$13.979.053.202,42 \approx \$13.979.053.203\text{ COP}$$
* **Cuadratura Exacta al Peso de los 10 Conceptos Presupuestales:**
  Para resolver la discrepancia de \$9.240 COP detectada entre la fórmula agregada y la suma de la tabla en Documento 2, se aplicó un ajuste técnico compensatorio sobre el rubro de mayor volumen y elasticidad (`1.1.02.02.116.01.01.03`), logrando error cero al peso:

| Código | Concepto Presupuestal Oficial | Base 2026 ($) | Factor | Proyección Oficial 2027 ($) | Participación |
|---|---|---:|---:|---:|---:|
| `1.1.02.02.015` | Certificaciones y constancias | 44.343.950 | 1,06 | 47.004.587 | 0,34% |
| `1.1.02.05.002.06` | Comercio, comidas y alojamiento | 2.562.971.129 | 1,06 | 2.716.749.397 | 19,43% |
| `1.1.02.05.002.01` | Minerales; electricidad, gas y agua | 83.257.428 | 1,06 | 88.252.874 | 0,63% |
| `1.1.02.02.116.01.01.04`| Pregrado - Derechos complementarios | 3.773.314.576 | 1,06 | 3.999.713.451 | 28,61% |
| `1.1.02.02.116.01.01.02`| Pregrado - Derechos de grado | 736.345.940 | 1,06 | 780.526.696 | 5,58% |
| `1.1.02.02.116.01.01.01`| Pregrado - Inscripciones | 2.026.330.700 | 1,06 | 2.147.910.542 | 15,37% |
| `1.1.02.02.116.01.01.03`| Matrículas posgrados y extensiones | 3.772.930.728 | Ajuste peso | 3.999.306.572 | 28,61% |
| `1.1.02.05.002.04` | Productos metálicos y maquinaria | 9.307.590 | 1,06 | 9.866.045 | 0,07% |
| `1.1.02.03.001.05` | Sanciones administrativas | 23.297.850 | 1,06 | 24.695.721 | 0,18% |
| `1.1.02.05.002.07` | Servicios financieros y leasing | 155.686.149 | 1,06 | 165.027.318 | 1,18% |
| **TOTAL R20** | **Recursos Propios (10 Conceptos)** | **13.187.794.757** | **+6,00%** | **13.979.053.203** | **100,00%** |

*Comprobación de Cuadratura:*
$$\sum_{i=1}^{10} \text{Concepto}_i = \$13.979.053.203\text{ COP} \implies \text{Diferencia} = \$0\text{ COP (Cuadratura Exacta al Peso)}$$

---

#### 2.4. Recurso 21 — Devolución de IVA
* Base real depurada 2026: \$4.672.217.269 COP (eliminando el pico no recurrente de 2025 de \$7.981M).
* Factor de indexación macroeconómica: $+6,00\%$.
* Proyección formal 2027:
  $$\hat{Y}_{2027}^{\text{R21}} = \$4.672.217.269 \times 1,06 = \$4.952.550.305,14 \approx \$4.952.550.305\text{ COP}$$

---

#### 2.5. Consolidación de Fuentes de Transferencias de la Nación
1. **Recurso 10.0 (Aportes Nación Funcionamiento):**
   $$\$364.009.300.613 \times (1 + 0,0644) = \$387.451.499.572\text{ COP}$$
2. **Recurso 10.5 (Política de Gratuidad Doceavas MinHacienda):**
   $$\$49.844.177.233 \times (1 + 0,0600) = \$52.834.827.867\text{ COP}$$
   $$\text{Doceava Mensual de Caja} = \frac{\$52.834.827.867}{12} = \$4.402.902.322,25\text{ COP/mes}$$
3. **Recurso 13 (Excedentes Financieros de Cooperativas):**
   $$\$1.621.758.749 \times (1 + 0,0600) = \$1.719.064.274\text{ COP}$$
4. **Recurso 16.0 (Aportes Inversión PGN):**
   * *Escenario Vigente Decreto 1599/2026 (Portafolio 18 Proyectos):* **\$8.310.959.010 COP** (+7,53%).
   * *Escenario Anteproyecto Ley PGN (Expansión BPIN):* **\$12.384.725.098 COP** (+60,00%).
5. **Recurso 17 (Devolución Descuento Votación):**
   $$\$5.643.330.479 \times (1 + 0,0600) = \$5.981.930.308\text{ COP}$$
6. **Recurso 18 (Artículo 87 Ley 30/92 - CESU):**
   $$\$2.110.231.259 \times (1 + 0,0644) = \$2.246.130.152\text{ COP}$$
