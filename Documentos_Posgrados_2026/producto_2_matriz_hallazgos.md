# PRODUCTO 2: MATRIZ DE HALLAZGOS Y AUDITORÍA COMPARATIVA (VERSIÓN 2)
## SISTEMA MULTIAGENTE DE INTELIGENCIA TÉCNICA Y FINANCIERA (VAFI - UPTC)

Esta matriz consolida la auditoría técnica sobre la **Versión 2 (43 páginas)** del Documento Técnico, clasificando los hallazgos en función de las mejoras implementadas por la mesa institucional, las debilidades metodológicas persistentes y los nuevos errores formales detectados.

---

## 1. RESUMEN EJECUTIVO DE CONTROL DE CALIDAD (VERSIÓN 2)

```
+-------------------------------------------------------------------------------+
| TOTAL PUNTOS AUDITADOS EN VERSIÓN 2: 26                                       |
|                                                                               |
| [CORREGIDOS POR MESA UPTC] :  7 hallazgos subsanados exitosamente             |
| [CRÍTICOS PERSISTENTES]    :  4 hallazgos metodológicos/financieros de fondo  |
| [ALTOS PERSISTENTES]       :  6 hallazgos de modelación y terminología        |
| [NUEVOS FALLOS EDICIÓN V2] :  3 errores de maquetación y ortografía           |
| [MEDIOS/BAJOS EN REVISIÓN] :  6 aspectos de gobernanza y seguimiento          |
+-------------------------------------------------------------------------------+
```

---

## 2. MATRIZ DETALLADA DE AUDITORÍA COMPARATIVA (v1 vs. v2)

| ID | Severidad | Elemento Auditado | Ubicación en v2 | Estado en Versión 2 | Hallazgo Técnico Identificado | Impacto Institucional | Acción Correctiva Aplicada en la Reconstrucción |
|---|---|---|---|:---:|---|---|---|
| **H-V2-01** | **NUEVO / ALTO** | Ruptura tipográfica vertical de texto | Pág. 7 (pie de página) | **Nuevo Error** | El rótulo de la Figura 4 aparece fragmentado verticalmente letra por letra: *"F-i-g-u-r-a 4 . M-a"*, y la imagen de Maestrías en Boyacá se desalineó. | Afecta gravemente la presentación formal y seriedad institucional del documento ante el Consejo Superior. | Re-diagramación de la sección, ajuste de anclaje de imagen y restauración de la leyenda formal en una sola línea horizontal. |
| **H-V2-02** | **NUEVO / MEDIO** | Enlaces rotos en la Tabla de Contenido | Pág. 3 | **Nuevo Error** | La Tabla de Contenido conserva tres entradas con el error de campo de Microsoft Word: *"¡Error! Marcador no definido"* (Sección 8 Proyecciones, Sección 9 Conclusiones y Figura 4). | Evidencia descuido en la actualización de campos de Word antes de exportar a PDF oficial. | Reconstrucción completa de la Tabla de Contenido con numeración de páginas y títulos sincronizados. |
| **H-V2-03** | **NUEVO / MEDIO** | Erratas ortográficas y de concordancia | Pág. 20 | **Nuevo Error** | El párrafo incorporado contiene: *"en situaciones académicas especias... de la Uptc no se aplica a esta regla..."*. | Errores de redacción ("especias" por "especiales", "Uptc" en minúscula y discordancia sintáctica). | Corrección de estilo: *"situaciones académicas especiales previstas en los artículos 9 y 10... de la UPTC, no se aplicará esta restricción..."*. |
| **H-V2-04** | **CRÍTICO PERSISTENTE** | Error metodológico de costeo en Escenario Pesimista | Pág. 34 (Tabla 1) | **Persiste** | Sigue aplicando incremento ciego de +10% a todos los egresos en el escenario pesimista, mostrando déficit artificial de -$6.397M y VAN de -$5.283M. | Viola el costeo ABC: la deducción central (45,5%) cae con el ingreso y los costos variables bajan con menos matrícula. Presenta falsamente el modelo como inviable. | Re-estimación científica ABC: el flujo neto real en estrés es superavitario en +$18.262M y el VAN es positivo en +$15.080M. |
| **H-V2-05** | **CRÍTICO PERSISTENTE** | Desbalance de recaudo en Especializaciones (-20,46%) | Pág. 29 (Fig. 17) | **Persiste** | La simulación mantiene la pérdida directa de -$5.109M en especializaciones (62,4% del fondo), compensada con alzas de +21% en maestrías y +23% en doctorados con demanda elástica (ε = -1,19). | Riesgo severo de iliquidez en las facultades si la subida en maestrías contrae la demanda y no compensa el hueco de especializaciones. | Incorporación de la Cláusula de Gradualidad Bienal (VBC transitorio con multiplicadores 1,12 en 2027 y 1,06 en 2028). |
| **H-V2-06** | **ALTO PERSISTENTE** | Discrepancia matemática residual en el VAN | Pág. 35 (Tabla 2) | **Parcialmente Ajustado** | La mesa técnica ajustó los flujos descontados anuales ($7.391M, $7.036M, $6.758M) sumando $29.019.531.303, pero subsiste una diferencia de $52.279 frente al VAN del texto ($29.019.583.582). | Desfase por usar flujos nominales redondeados ($8.459.300.000) y factores de descuento truncados a 6 decimales. | Cuadre matemático al peso: flujos continuos exactos que consolidan el valor auditado de $29.019.583.582 COP. |
| **H-V2-07** | **ALTO PERSISTENTE** | Uso impropio de terminología bancaria ("Ratio DSCR") | Pág. 39 (Fig. 22) | **Persiste** | La Figura 22 sigue rotulando una columna como *"Ratio DSCR: 1,43x"*, indicador de servicio de deuda financiera inexistente en el Fondo R31. | Confunde a evaluadores y órganos de control sobre pasivos financieros inexistentes en los posgrados. | Sustitución formal por la **Razón de Cobertura de Costos Operacionales y Deducciones Centrales (RCCO)**. |
| **H-V2-08** | **ALTO PERSISTENTE** | Vacío de baremo cuantitativo objetivo para VCAP | Pág. 17 | **Persiste** | La fórmula de VCAP define pesos (30%-30%-20%-20%) pero no entrega la escala métrica de calificación de variables CP, C, E, P. | Mantiene el riesgo de asignación discrecional de tarifas entre facultades. | Inclusión formal de la **Matriz Paramétrica de Calibración (1 a 5)** con función de mapeo lineal a [0,80 a 2,50]. |
| **H-V2-09** | **CORREGIDO POR UPTC** | Nomenclatura del IAEP | Pág. 19 | **Subsanado** | Antes decía `w_EDU × EDU_ponderado`. Ahora expresa `w_ICES × ICES`, consistente con el índice de costos de educación superior del DANE. | Unificación técnica lograda por la mesa institucional. | Validación e incorporación en el articulado definitivo. |
| **H-V2-10** | **CORREGIDO POR UPTC** | Límite de 15 créditos aclarado | Págs. 24 y 26 | **Subsanado** | Se aclaró que los 15 créditos son un supuesto metodológico de simulación prudencial y no un tope académico restrictivo para el estudiante. | Elimina la ambigüedad sobre restricciones al avance curricular. | Se ratifica la redacción explicativa en el documento final. |
| **H-V2-11** | **CORREGIDO POR UPTC** | Justificación del 15% en culminación académica | Pág. 27 | **Subsanado** | Se sustentó por qué se imputan 4 créditos a los estudiantes sin asignaturas inscritas pero con pago (procesos de grado). | Otorga base empírica a la regla de liquidación de tesistas. | Se mantiene y respalda en la memoria de cálculo. |
| **H-V2-12** | **CORREGIDO POR UPTC** | Excepción en estancias doctorales | Pág. 23 | **Subsanado** | Se incluyó explícitamente la tarifa del 50% para pasantías y estancias académicas doctorales con director. | Estimula la movilidad internacional y pasantías de investigación. | Incorporado en el régimen de excepciones académicas. |
| **H-V2-13** | **CORREGIDO POR UPTC** | Profundización de Monte Carlo (20.000 iteraciones) | Págs. 30–31 | **Subsanado** | Se amplió la simulación a 20.000 iteraciones con desglose semestral 2027-1 y 2027-2 y mediana anual de $42.644M. | Refuerza significativamente la evidencia estocástica ante el CSU. | Integración completa de las métricas en el informe financiero y documento técnico. |
| **H-V2-14** | **CORREGIDO POR UPTC** | Portada y autoridades actualizadas | Pág. 1 | **Subsanado** | Se incorporó a Jorge Enrique Romero (Director Planeación 2026-2) y Patricia Barreto (Vicerrectora VAFI 2026-2). | Refleja la estructura de gobierno institucional vigente. | Adoptada oficialmente en la portada del Documento Técnico. |
