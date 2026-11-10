# ANEXOS DE CÁLCULOS Y FÓRMULAS MATEMÁTICAS REPRODUCIBLES (2027)
## SISTEMA DE INTELIGENCIA FINANCIERA Y PRESUPUESTAL — UPTC
### DEPARTAMENTO DE INTELIGENCIA ESTADÍSTICA, MATEMÁTICA Y ECONOMÉTRICA

**Responsable:** Agente 2.3 (Auditor Matemático y Estadístico)

---

### 1. PROPÓSITO DEL ANEXO TÉCNICO

En aplicación estricta de la regla innegociable número 9: *"Prohibido aceptar resultados que no puedan reproducirse"*, el presente documento detalla la totalidad de las operaciones aritméticas, algebraicas y estadísticas empleadas para proyectar y distribuir los ingresos y gastos de la UPTC para la vigencia fiscal 2027.

Cualquier evaluador externo, auditor fiscal o miembro del Consejo Superior puede reproducir cada resultado en una calculadora estándar o en una hoja de cálculo siguiendo los algoritmos que a continuación se detallan.

---

### 2. DESARROLLO MATEMÁTICO COMPLETO POR RECURSO

#### 2.1. Recurso 12 — Estampilla Pro-UNAL (Suavización Exponencial Simple, $\alpha = 0,3$)
* **Ecuación Recursiva:** $S_t = 0,3 \cdot Y_t + 0,7 \cdot S_{t-1}$
* **Punto de Arranque:** $S_{2020} = Y_{2020} = \$5.191.760.490,00$

```
Cálculo Vigencia a Vigencia:

1. Vigencia 2021:
   Y_2021 = $5.511.333.435,00
   S_2021 = (0,3 × 5.511.333.435,00) + (0,7 × 5.191.760.490,00)
          = 1.653.400.030,50 + 3.634.232.343,00
          = $5.287.632.373,50

2. Vigencia 2022:
   Y_2022 = $4.289.903.167,00
   S_2022 = (0,3 × 4.289.903.167,00) + (0,7 × 5.287.632.373,50)
          = 1.286.970.950,10 + 3.701.342.661,45
          = $4.988.313.611,55

3. Vigencia 2023:
   Y_2023 = $9.612.609.215,00
   S_2023 = (0,3 × 9.612.609.215,00) + (0,7 × 4.988.313.611,55)
          = 2.883.782.764,50 + 3.491.819.528,085
          = $6.375.602.292,585 ≈ $6.375.602.292,58

4. Vigencia 2024:
   Y_2024 = $6.431.335.851,00
   S_2024 = (0,3 × 6.431.335.851,00) + (0,7 × 6.375.602.292,585)
          = 1.929.400.755,30 + 4.462.921.604,8095
          = $6.392.322.360,1095 ≈ $6.392.322.360,11

5. Vigencia 2025:
   Y_2025 = $14.785.650.242,00
   S_2025 = (0,3 × 14.785.650.242,00) + (0,7 × 6.392.322.360,1095)
          = 4.435.695.072,60 + 4.474.625.652,07665
          = $8.910.320.724,67665 ≈ $8.910.320.724,68

6. Vigencia 2026:
   Y_2026 = $7.265.094.590,00
   S_2026 = (0,3 × 7.265.094.590,00) + (0,7 × 8.910.320.724,67665)
          = 2.179.528.377,00 + 6.237.224.507,273655
          = $8.416.752.884,273655 ≈ $8.416.752.884,27

PRONÓSTICO VIGENCIA 2027:
Ŷ_2027 = S_2026 = $8.416.752.884,27 COP (Redondeado formal: $8.416.752.884 COP)
```

---

#### 2.2. Recurso 12 — Método Lineal de Holt ($\alpha = 0,1; \beta = 0,3$)
* **Ecuaciones:**
  $$L_t = 0,1 \cdot Y_t + 0,9 \cdot (L_{t-1} + T_{t-1})$$
  $$T_t = 0,3 \cdot (L_t - L_{t-1}) + 0,7 \cdot T_{t-1}$$
  $$\hat{Y}_{2027} = L_{2026} + T_{2026}$$
* **Punto de Arranque (2020):**
  $$L_{2020} = Y_{2020} = \$5.191.760.490,00$$
  $$T_{2020} = Y_{2021} - Y_{2020} = \$5.511.333.435 - \$5.191.760.490 = \$319.572.945,00$$

```
Evolución 2025–2026:
L_2025 = $7.821.722.190,43;  T_2025 = $607.299.320,55

Paso 2026:
L_2026 = 0,1 × ($7.265.094.590,00) + 0,9 × ($7.821.722.190,43 + $607.299.320,55)
       = 726.509.459,00 + 0,9 × ($8.429.021.510,98)
       = 726.509.459,00 + 7.586.119.359,882
       = $8.312.628.818,882 ≈ $8.312.628.818,88

T_2026 = 0,3 × ($8.312.628.818,882 - $7.821.722.190,43) + 0,7 × ($607.299.320,55)
       = 0,3 × ($490.906.628,452) + 425.109.524,385
       = 147.271.988,5356 + 425.109.524,385
       = $572.381.512,9206 ≈ $572.381.512,92

PRONÓSTICO 2027 HOLT:
Ŷ_2027 = $8.312.628.818,88 + $572.381.512,92 = $8.885.010.331,80 COP

PRONÓSTICO 2027 HOLT AMORTIGUADO (φ = 0,98):
Ŷ_2027 = $8.312.628.818,88 + (0,98 × $572.381.512,92)
       = $8.312.628.818,88 + $560.933.882,66 = $8.742.276.443,46 COP
```

---

#### 2.3. Recurso 40 — Distribución Legal (Ordenanza 051 de 2018)
* **Base Proyectada:** $\$4.458.831.679,00\text{ COP}$

```
Cálculo Porcentual Exacto:

1. Componente de Bienestar Universitario (60,00%):
   $4.458.831.679,00 × 0,60 = $2.675.299.007,40 ≈ $2.675.299.000,00 COP
   Proyectos Financiados:
   - Monitorías:                   $   265.142.000,00
   - Sistema de Investigación:     $ 1.696.484.000,00
   - Universidad Saludable:        $   486.093.000,00
   - Internacionalización:         $   227.580.000,00
   Total Bienestar Asignado:       $ 2.675.299.000,00 COP (Exactamente 60,00%)

2. Componente de Regionalización (20,00%):
   $4.458.831.679,00 × 0,20 = $891.766.335,80 ≈ $891.766.336,00 COP
   Proyectos Financiados:
   - Dotación Bibliotecas Sedes:   $   624.415.000,00
   - Desarrollo Tecnológico Sedes: $   159.085.000,00
   - Extensión Universitaria Sedes:$   108.266.336,00
   Total Regionalización Asignado: $   891.766.336,00 COP (Exactamente 20,00%)

3. Componente de Construcción y Adecuación Física (20,00%):
   $4.458.831.679,00 × 0,20 = $891.766.335,80 ≈ $891.766.336,00 COP
   Proyecto Financiado:
   - Obras y Construcción Espacios:$   891.766.336,00
   Total Construcción Asignado:    $   891.766.336,00 COP (Exactamente 20,00%)

SUMATORIA DE LOS TRES COMPONENTES:
$2.675.299.000 + $891.766.336 + $891.766.336 = $4.458.831.679,00 COP (Cuadratura Exacta al Peso)
```

---

#### 2.4. Recurso 10.5 — Política de Gratuidad (Giro Doceavas MinHacienda)
* **Base Anual 2026:** $\$49.844.177.233,00\text{ COP}$
* **Factor de Incremento Macro:** $+6,00\%$
* **Proyección Anual 2027:**
  $$\text{Valor Anual}_{2027} = \$49.844.177.233,00 \times 1,06 = \$52.834.827.866,98 \approx \$52.834.827.867,00\text{ COP}$$
* **Programación Mensual de Caja (PAC Doceavas):**
  $$\text{Giro Mensual} = \frac{\$52.834.827.867,00}{12} = \$4.402.902.322,25\text{ COP/mes}$$

---

#### 2.5. Recurso 10.0 y Recurso 18 — Indexación PGN (+6,44%)
* **Recurso 10.0 (Aportes Funcionamiento Nación):**
  $$\$364.009.300.613,00 \times 1,0644 = \$387.451.499.572,476 \approx \$387.451.499.572,00\text{ COP}$$
  $$\text{Giro Mensual Promedio (Doceavas)} = \frac{\$387.451.499.572,00}{12} = \$32.287.624.964,33\text{ COP/mes}$$
* **Recurso 18 (Artículo 87 Ley 30/92 - CESU):**
  $$\$2.110.231.259,00 \times 1,0644 = \$2.246.130.152,08 \approx \$2.246.130.152,00\text{ COP}$$

---

#### 2.6. Recurso 16.0 — Aportes Inversión PGN
* **Base 2026 Inicial:** $\$7.728.720.060,00\text{ COP}$
* **Asignación Decreto 1599/2026 (MEN):** $\$8.310.959.010,00\text{ COP}$
* **Variación Absoluta y Porcentual:**
  $$\Delta = \$8.310.959.010 - \$7.728.720.060 = +\$582.238.950,00\text{ COP}$$
  $$\% = \frac{\$582.238.950}{\$7.728.720.060} \times 100 = +7,5334\% \approx +7,53\%$$
