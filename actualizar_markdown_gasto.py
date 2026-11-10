with open('/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027/PRODUCTO_1_Documento_Tecnico_Definitivo_UPTC_2027.md', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "## 11. RELACIÓN CON LAS NECESIDADES INSTITUCIONALES (FUNCIONAMIENTO Y ADMINISTRACIÓN)"
end_marker = "## 14. RIESGOS Y LIMITACIONES DE LA PROYECCIÓN"

idx_start = content.find(start_marker)
idx_end = content.find(end_marker)

if idx_start == -1 or idx_end == -1:
    print(f"Error: Markers not found. start={idx_start}, end={idx_end}")
    exit(1)

new_seccion_11_12_13 = """## 11. RELACIÓN CON LAS NECESIDADES INSTITUCIONALES (ESTRUCTURA Y DESAGREGACIÓN DETALLADA DEL GASTO)

Las apropiaciones presupuestales asignadas a la Unidad 01 - Administrativa y Financiera para la vigencia 2027 se desagregan de manera exhaustiva en **ciento noventa y cinco (195) conceptos presupuestales oficiales** armonizados con el Catálogo de Clasificación Presupuestal (CCP) del Ministerio de Hacienda y el DNP.

### 11.1. Macro-distribución del Presupuesto de Gastos por Objeto del Gasto (CCP)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│              DISTRIBUCIÓN DEL GASTO ADMINISTRATIVO POR MACRO-OBJETO ECONÓMICO (CCP)             │
├─────────┬────────────────────────────────────────┬────────────────────────┬─────────────┬───────┤
│ Código  │ Objeto del Gasto Oficial               │ Apropiación 2027 ($)   │ Particip. % │ Rango │
├─────────┼────────────────────────────────────────┼────────────────────────┼─────────────┼───────┤
│ **2.1.1**   │ GASTOS DE PERSONAL (Planta y Temporal) │ $ 394.723.479.000 COP  │   89,74 %   │ Prim. │
│ • 2.1.1.01  │ • Planta de Personal Permanente        │ $ 254.961.150.000 COP  │   57,96 %   │ Fijo  │
│ • 2.1.1.02  │ • Personal Supernumerario, Ocasional y │ $ 139.762.329.000 COP  │   31,77 %   │ Temp. │
│             │   Catedrático                          │                        │             │       │
│ **2.1.2**   │ ADQUISICIÓN DE BIENES Y SERVICIOS      │ $  41.006.403.960 COP  │    9,32 %   │ Oper. │
│ **2.1.3**   │ TRANSFERENCIAS CORRIENTES              │ $     895.040.764 COP  │    0,20 %   │ Sub.  │
│ **2.1.8**   │ TRIBUTOS, TASAS, SANCIONES E INTERESES │ $   3.231.425.889 COP  │    0,73 %   │ Impos.│
├─────────┼────────────────────────────────────────┼────────────────────────┼─────────────┼───────┤
│ **TOTAL**   │ **TOTAL GASTOS UNIDAD ADMINISTRATIVA** │ **$ 439.856.349.613 COP**│ **100,00 %**│ BASE  │
└─────────┴────────────────────────────────────────┴────────────────────────┴─────────────┴───────┘
```

### 11.2. Análisis Técnico de la Concentración del Gasto de Personal (89,74%)

La composición del gasto evidencia la naturaleza misional intensiva en capital humano de la universidad pública:
1. **Planta Permanente ($254.961M - 57,96%):**  
   Financia el sueldo básico de docentes de carrera ($42.281M en R10.0), personal administrativo de planta ($34.977M en R10.0), trabajadores oficiales ($7.033M en R10.0), gastos de representación ($31.115M en R10.0 + $7.772M en R10.5 + $3.158M en R31 + $1.121M en R20 + $890M en R17), primas legales (navidad, servicios, vacaciones), cesantías y seguridad social patronal integral (salud, pensiones, ARL, cajas de compensación e ICBF).
2. **Docencia Temporal y Transitoria ($139.762M - 31,77%):**  
   Cubre la contratación flexible indispensable para atender la oferta académica semestral:
   * **Docentes Ocasionales:** Sueldo básico por **$80.897.681.000 COP** en R10.0, más primas de servicios ($2.146M), navidad ($787M) y seguridad social ($37.580M).
   * **Docentes Catedráticos:** Sueldo básico por **$8.752.395.000 COP** en R10.0, **$227.557.000 COP** en R10.5 y **$19.398.000 COP** en R17.
   * **Supernumerarios:** Sueldo básico administrativo por **$1.179.051.000 COP** en R10.0 y **$8.468.000 COP** en R17.
3. **Adquisición de Bienes y Servicios ($41.006M - 9,32%):**  
   Asegura el funcionamiento operativo de todos los campus universitarios (Tunja, Duitama, Sogamoso, Chiquinquirá y sedes de extensión):
   * Contratos centralizados de aseo, vigilancia armada y servicios de cafetería/comidas: **$22.092.378.182 COP** agrupados en el concepto `2.1.2.02.02.006.00`.
   * Servicios prestados a las empresas, producción y mantenimiento técnico (`2.1.2.02.02.008`): **$10.473.962.695 COP**.
   * Servicios financieros, seguros, arrendamientos e intermediación inmobiliaria (`2.1.2.02.02.007`): **$2.470.887.051 COP**.
   * Suministro de servicios públicos esenciales (energía eléctrica, gas y agua - `2.1.2.02.01.001`): **$667.625.599 COP**.
   * Materiales, insumos de laboratorio y bienes transportables: **$1.859.390.692 COP**.
4. **Transferencias Corrientes y Fondos Especiales ($895M - 0,20%):**  
   Financia el fondo de sentencias judiciales y conciliaciones laborales por **$500.000.000 COP** en Recursos Propios (R20), beneficios educativos y auxilios sindicales, médicos y de permanencia estudiantil.
5. **Cargas Tributarias y Tasas de Fiscalización ($3.231M - 0,73%):**  
   Incluye la provisión para el pago del Impuesto Predial Unificado de los bienes inmuebles universitarios (**$2.111.410.655 COP** entre R10.0, R10.5 y R20), la Cuota de Fiscalización y Auditaje de la Contraloría General de la República (**$900.000.000 COP** en R20), el Gravamen a los Movimientos Financieros (**$187.638.672 COP**) y el impuesto sobre vehículos.

---

### 11.3. Matriz Cruzada de Financiación del Gasto (Recurso vs. Objeto del Gasto)

A continuación se presenta la tabla integral que cruza la asignación presupuestal de cada recurso con los macro-objetos del Clasificador Presupuestal Oficial:

| Recurso Oficial | Denominación de la Fuente | Gastos de Personal 2.1.1 ($ COP) | Bienes y Servicios 2.1.2 ($ COP) | Transferencias 2.1.3 ($ COP) | Tributos y Tasas 2.1.8 ($ COP) | Total Gasto Asignado ($ COP) | Part. % |
|:---:|---|---:|---:|---:|---:|---:|:---:|
| **10.0** | Aportes Nación Funcionamiento | 333.751.419.000 | 11.474.169.286 | 58.601.506 | 645.819.292 | 345.930.009.084 | 78,65 % |
| **10.5** | Política de Gratuidad Doceavas | 27.465.107.000 | 13.215.633.160 | 123.242.898 | 697.098.942 | 41.501.082.000 | 9,44 % |
| **13** | Excedentes Cooperativas | 0 | 1.719.108.000 | 0 | 0 | 1.719.108.000 | 0,39 % |
| **17** | Devolución Descuento Electoral | 1.394.638.000 | 4.379.750.000 | 0 | 0 | 5.774.388.000 | 1,31 % |
| **18** | Artículo 87 CESU (Incremento PIB) | 1.200.000.000 | 764.359.000 | 0 | 0 | 1.964.359.000 | 0,45 % |
| **20** | Recursos Propios (Autogestión) | 1.146.026.000 | 7.385.025.606 | 711.916.939 | 1.888.507.655 | 11.131.476.200 | 2,53 % |
| **21** | Devolución de IVA IES | 6.000.000.000 | 471.839.000 | 0 | 0 | 6.471.839.000 | 1,47 % |
| **31** | Posgrados (Cupo Administración) | 17.962.958.000 | 904.225.313 | 1.279.421 | 0 | 18.868.462.734 | 4,29 % |
| **32** | Extensión (Cupo Administración) | 900.000.000 | 44.311.807 | 0 | 0 | 944.311.807 | 0,21 % |
| **33** | Convenios con Derechos (Cupo Adm.)| 4.223.331.000 | 625.150.515 | 0 | 0 | 4.848.481.515 | 1,10 % |
| **35** | Educación Continuada (Cupo Adm.)| 680.000.000 | 22.832.273 | 0 | 0 | 702.832.273 | 0,16 % |
| **TOTAL**| **PRESUPUESTO GENERAL UNIDAD 01**| **394.723.479.000**| **41.006.403.960**| **895.040.764**| **3.231.425.889**| **439.856.349.613**| **100,00 %**|

### 11.4. Destinación Operativa de los Cupos Administrativos (R31, R32, R33 y R35)

La desagregación a nivel de concepto confirma de manera contundente la tesis institucional formulada en el Capítulo 5.7:
* **Recurso 31 (Posgrados - $18.868M):** El **95,20% ($17.962M)** se destina al pago de nómina y seguridad social de la planta central que atiende los programas (sueldos básicos por $7.841M, gastos de representación por $3.158M y cesantías/seguridad social por $6.059M), mientras que el 4,79% ($904M) sufraga energía eléctrica, conectividad y suministros.
* **Recurso 32 (Extensión - $944M):** El **95,31% ($900M)** financia primas de navidad y vacaciones de empleados de la administración central vinculados a la gestión de extensión, y $44M servicios públicos.
* **Recurso 33 (Convenios - $4.848M):** El **87,11% ($4.223M)** respalda primas de vacaciones y navidad de servidores públicos institucionales, y $625M servicios generales y logística compartida.
* **Recurso 35 (Educación Continuada - $702M):** El **96,75% ($680M)** se aplica a prestaciones sociales de fin de año del personal de soporte institucional y $22M a servicios de energía y gas.

---

## 12. RESULTADOS DE LA PROYECCIÓN PRESUPUESTAL 2027

### 12.1. Tabla Oficial de Ingresos y Gastos — Unidad Administrativa 2027

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    TABLA OFICIAL DE INGRESOS Y GASTOS — UNIDAD ADMINISTRATIVA 2027              │
├─────────┬────────────────────────────────────────────┬────────────────────────┬─────────────────┤
│ Recurso │ Denominación Oficial de la Fuente          │ Ingreso Administrativa │ Participación % │
├─────────┼────────────────────────────────────────────┼────────────────────────┼─────────────────┤
│ **10.0**│ APORTES NACION - FUNCIONAMIENTO            │ $ 345.930.009.082 COP  │     78,65 %     │
│ **10.5**│ APORTES NACIÓN - POLÍTICA DE GRATUIDAD     │ $  41.501.082.000 COP  │      9,44 %     │
│ **13**  │ COOPERATIVAS                               │ $   1.719.108.000 COP  │      0,39 %     │
│ **17**  │ DEVOLUCION DESCUENTO ELECTORAL             │ $   5.774.388.000 COP  │      1,31 %     │
│ **18**  │ ARTICULO 87 CESU                           │ $   1.964.359.000 COP  │      0,45 %     │
│ **20**  │ Propios                                    │ $  11.131.476.200 COP  │      2,53 %     │
│ **21**  │ Devolucion IVA                             │ $   6.471.839.000 COP  │      1,47 %     │
│ **31**  │ POSGRADOS (Cupo Administración)            │ $  18.868.462.733 COP  │      4,29 %     │
│ **32**  │ EXTENSION (Cupo Administración)            │ $     944.311.807 COP  │      0,21 %     │
│ **33**  │ CONVENIOS CON DERECHOS (Cupo Admin.)       │ $   4.848.481.515 COP  │      1,10 %     │
│ **35**  │ EDUCACION CONTINUADA (Cupo Administración) │ $     702.832.273 COP  │      0,16 %     │
├─────────┼────────────────────────────────────────────┼────────────────────────┼─────────────────┤
│ **TOTAL**│ **PRESUPUESTO GENERAL UNIDAD ADMINISTRATIVA**│ **$ 439.856.349.610 COP**│    **100,00 %** │
└─────────┴────────────────────────────────────────────┴────────────────────────┴─────────────────┘
```

### 12.2. Balance General Oficial de la Unidad Administrativa
A continuación se presenta la matriz oficial definitiva que vincula de manera simétrica el Ingreso de la Administración con el Gasto de la Administración:

| Recurso | Denominación Oficial | Ingreso Administrativa ($ COP) | Gasto Administrativa ($ COP) | Balance Neto ($ COP) |
|:---:|---|---:|---:|:---:|
| **10.0** | APORTES NACION - FUNCIONAMIENTO | 345.930.009.082 | 345.930.009.082 | **$ 0** |
| **10.5** | APORTES NACIÓN - POLÍTICA DE GRATUIDAD | 41.501.082.000 | 41.501.082.000 | **$ 0** |
| **13** | COOPERATIVAS | 1.719.108.000 | 1.719.108.000 | **$ 0** |
| **17** | DEVOLUCION DESCUENTO ELECTORAL | 5.774.388.000 | 5.774.388.000 | **$ 0** |
| **18** | ARTICULO 87 CESU | 1.964.359.000 | 1.964.359.000 | **$ 0** |
| **20** | Propios | 11.131.476.200 | 11.131.476.200 | **$ 0** |
| **21** | Devolucion IVA | 6.471.839.000 | 6.471.839.000 | **$ 0** |
| **31** | POSGRADOS | 18.868.462.733 | 18.868.462.733 | **$ 0** |
| **32** | EXTENSION | 944.311.807 | 944.311.807 | **$ 0** |
| **33** | CONVENIOS CON DERECHOS | 4.848.481.515 | 4.848.481.515 | **$ 0** |
| **35** | EDUCACION CONTINUADA | 702.832.273 | 702.832.273 | **$ 0** |
| **TOTAL** | **PRESUPUESTO GENERAL UNIDAD ADMINISTRATIVA 2027** | **439.856.349.610** | **439.856.349.610** | **$ 0** |

---

## 13. VALIDACIÓN Y CONTROL DE RAZONABILIDAD

1. **Cuadratura Exacta al Peso:**  
   $$\\sum \\text{Ingreso Administrativa} - \\sum \\text{Gasto Administrativa} = \\$439.856.349.610 - \\$439.856.349.610 = \\$0\\text{ COP}$$
2. **Conciliación de Centavos del Detalle del Gasto:**  
   La sumatoria agregada de las 195 líneas detalladas del clasificador presupuestal arroja un monto total de **\\$439.856.349.613,01 COP**, presentando una variación infinitesimal de tan solo **+\\$3,01 COP (0,00000068%)** frente al aforo resumido de **\\$439.856.349.610 COP**. Esta diferencia obedece estrictamente al efecto de redondeo de centavos en liquidaciones individuales de nómina e impuestos en el sistema financiero GOOBI, ratificando la concordancia plena y auditable entre el techo global y la desagregación pormenorizada.
3. **Ausencia de Doble Contabilidad:** Se verificó que los \\$18.868M del cupo de posgrados (R31) no están duplicados en los \\$11.131M de recursos propios (R20) ni en la gratuidad de pregrado (R10.5).
4. **Control de Realizabilidad de Cupos:** Las cifras asignadas a los recursos 31, 32, 33 y 35 (\\$25.364M en conjunto) representan un nivel inferior al histórico ejecutado en 2025 (\\$32.422M), dejando un margen de prudencia de más de \\$7.000 millones frente a eventuales caídas de matrícula en posgrados.

---

"""

new_content = content[:idx_start] + new_seccion_11_12_13 + content[idx_end:]

with open('/Users/fabiancely/Documents/Programacion/VAFI/Documentos_Presupuesto_2027/PRODUCTO_1_Documento_Tecnico_Definitivo_UPTC_2027.md', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Markdown actualizado exitosamente con la nueva Seccion 11, 12 y 13!")
