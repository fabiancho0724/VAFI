import csv

raw_data = """Unidad;Código concepto;Concepto;Recurso; Total 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.01;Sueldo básico administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 34.977.243.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.02;Sueldo básico docentes;10.0 - Aportes Nacion - Funcionamiento; $ 42.281.687.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.03;Sueldo básico trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 7.033.437.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.02;Horas extras, dominicales, festivos y recargos;10.0 - Aportes Nacion - Funcionamiento; $ 1.913.535.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.03;Gastos de representación;10.0 - Aportes Nacion - Funcionamiento; $ 31.115.255.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.04.01;Subsidio de alimentación administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 431.504.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.04.02;Subsidio de alimentación trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 340.179.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.05.01;Auxilio de transporte administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 1.441.615.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.05.02;Auxilio de transporte trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 383.630.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.06.01;Prima de servicio administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 3.923.419.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.06.02;Prima de servicio docentes;10.0 - Aportes Nacion - Funcionamiento; $ 8.898.576.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.06.03;Prima de servicio trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 783.282.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.07.01;Bonificación por servicios prestados administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 1.555.787.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.07.02;Bonificación por servicios prestados docentes;10.0 - Aportes Nacion - Funcionamiento; $ 2.799.190.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.07.03;Bonificación por servicios prestados trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 506.103.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 1.478.908.761 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;10.0 - Aportes Nacion - Funcionamiento; $ 2.241.569.965 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 716.745.204 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.01;Prima de vacaciones administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 1.021.926.690 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.02;Prima de vacaciones docentes;10.0 - Aportes Nacion - Funcionamiento; $ 1.377.827.894 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.03;Prima de vacaciones trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 858.871.486 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.09;Prima técnica salarial;10.0 - Aportes Nacion - Funcionamiento; $ 708.442.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.10;Viáticos de los funcionarios en comisión;10.0 - Aportes Nacion - Funcionamiento; $ 131.352.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.002.12.02.02;Beneficios a los empleados a largo plazo trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 1.296.487.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.001;Aportes a la seguridad social en pensiones;10.0 - Aportes Nacion - Funcionamiento; $ 15.611.393.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.002;Aportes a la seguridad social en salud;10.0 - Aportes Nacion - Funcionamiento; $ 11.066.518.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.003;Aportes de cesantías ;10.0 - Aportes Nacion - Funcionamiento; $ 12.524.083.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.004;Aportes a cajas de compensación familiar;10.0 - Aportes Nacion - Funcionamiento; $ 5.780.860.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.005;Aportes generales al sistema de riesgos laborales;10.0 - Aportes Nacion - Funcionamiento; $ 1.090.512.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.006;Aportes al ICBF;10.0 - Aportes Nacion - Funcionamiento; $ 4.382.215.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.001.01.01;Vacaciones administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 135.725.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.001.01.02;Vacaciones docentes;10.0 - Aportes Nacion - Funcionamiento; $ 251.270.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.001.01.03;Vacaciones trabajadores oficiales;10.0 - Aportes Nacion - Funcionamiento; $ 139.319.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.001.03.01;Bonificación especial de recreación administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 25.772.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.009;Prima técnica no salarial;10.0 - Aportes Nacion - Funcionamiento; $ 479.375.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.03.090;Bonificación por productividad académica;10.0 - Aportes Nacion - Funcionamiento; $ 145.978.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.01;Sueldo básico supernumerarios;10.0 - Aportes Nacion - Funcionamiento; $ 1.179.051.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.02;Sueldo básico docentes ocasionales;10.0 - Aportes Nacion - Funcionamiento; $ 80.897.681.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.03;Sueldo básico docentes catédraticos;10.0 - Aportes Nacion - Funcionamiento; $ 8.752.395.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.04;Subsidio de alimentación;10.0 - Aportes Nacion - Funcionamiento; $ 35.491.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.05;Auxilio de transporte;10.0 - Aportes Nacion - Funcionamiento; $ 75.881.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.06.01;Prima de servicio supernumerarios;10.0 - Aportes Nacion - Funcionamiento; $ 112.452.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.06.02;Prima de servicio docentes ocasionales;10.0 - Aportes Nacion - Funcionamiento; $ 2.146.524.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.07;Bonificación por servicios prestados;10.0 - Aportes Nacion - Funcionamiento; $ 36.569.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.01.01;Prima de navidad supernumerarios;10.0 - Aportes Nacion - Funcionamiento; $ 27.831.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.01.02;Prima de navidad docentes ocasionales;10.0 - Aportes Nacion - Funcionamiento; $ 787.249.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.01.03;Prima de navidad docentes catedráticos;10.0 - Aportes Nacion - Funcionamiento; $ 263.071.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.02.01;Prima de vacaciones supernumerarios;10.0 - Aportes Nacion - Funcionamiento; $ 22.300.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.02.02;Prima de vacaciones docentes ocasionales;10.0 - Aportes Nacion - Funcionamiento; $ 1.014.908.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.001;Aportes a la seguridad social en pensiones;10.0 - Aportes Nacion - Funcionamiento; $ 11.397.599.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.002;Aportes a la seguridad social en salud;10.0 - Aportes Nacion - Funcionamiento; $ 9.107.387.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.003;Aportes de cesantías ;10.0 - Aportes Nacion - Funcionamiento; $ 8.554.166.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.004;Aportes a cajas de compensación familiar;10.0 - Aportes Nacion - Funcionamiento; $ 4.134.413.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.005;Aportes generales al sistema de riesgos laborales;10.0 - Aportes Nacion - Funcionamiento; $ 1.185.446.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.006;Aportes al ICBF;10.0 - Aportes Nacion - Funcionamiento; $ 3.101.208.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.001.01.01;Vacaciones supernumerarios;10.0 - Aportes Nacion - Funcionamiento; $ 16.731.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.001.01.02;Vacaciones docentes ocasionales;10.0 - Aportes Nacion - Funcionamiento; $ 638.672.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.001.03;Bonificación especial de recreación;10.0 - Aportes Nacion - Funcionamiento; $ 16.743.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.090;Bonificación por productividad académica;10.0 - Aportes Nacion - Funcionamiento; $ 398.058.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.001;"Minerales; electricidad, gas y agua";10.0 - Aportes Nacion - Funcionamiento; $ 94.068.717 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.002;"Productos alimenticios, bebidas y tabaco; textiles, prendas de vestir y productos de cuero";10.0 - Aportes Nacion - Funcionamiento; $ 81.774.009 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.003;Otros bienes transportables (excepto productos metálicos, maquinaria y equipo);10.0 - Aportes Nacion - Funcionamiento; $ 109.208.739 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.004;Productos metálicos, maquinaria y equipo;10.0 - Aportes Nacion - Funcionamiento; $ 772.487.209 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";10.0 - Aportes Nacion - Funcionamiento; $ 2.378.231.307 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.007;"Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing";10.0 - Aportes Nacion - Funcionamiento; $ 378.767.309 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.008;Servicios prestados a las empresas y servicios de producción ;10.0 - Aportes Nacion - Funcionamiento; $ 6.845.716.988 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.009.00;Servicios para la comunidad, sociales y personales;10.0 - Aportes Nacion - Funcionamiento; $ 760.415.496 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.010;Viáticos de los funcionarios en comisión;10.0 - Aportes Nacion - Funcionamiento; $ 53.499.512 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.03.03.001;Membresías internacionales;10.0 - Aportes Nacion - Funcionamiento; $ 1.909.242 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.04.05.001;Membresías nacionales;10.0 - Aportes Nacion - Funcionamiento; $ 24.194.862 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.011;Devolución de Dotación;10.0 - Aportes Nacion - Funcionamiento; $ 238.578 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.012.02;Auxilios funerarios a cargo de la entidad;10.0 - Aportes Nacion - Funcionamiento; $ 510.733 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.030;Auxilio sindical (no de pensiones);10.0 - Aportes Nacion - Funcionamiento; $ 22.503.673 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.097;Auxilios Médicos;10.0 - Aportes Nacion - Funcionamiento; $ 1.039.883 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.03.013;Afiliación Riesgos Laborales contratistas Grado IV y V;10.0 - Aportes Nacion - Funcionamiento; $ 8.204.535 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.51;Impuesto sobre vehículos automotores;10.0 - Aportes Nacion - Funcionamiento; $ 897.344 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.52;Impuesto predial unificado;10.0 - Aportes Nacion - Funcionamiento; $ 617.058.287 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.03;Tasas y derechos administrativos;10.0 - Aportes Nacion - Funcionamiento; $ 27.863.661 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.01;Sueldo básico administrativos;10.5 - Aportes Nación - Política de gratuidad; $ 5.249.062.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.02;Horas extras, dominicales, festivos y recargos;10.5 - Aportes Nación - Política de gratuidad; $ 243.070.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.03;Gastos de representación;10.5 - Aportes Nación - Política de gratuidad; $ 7.772.426.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.06.03;Prima de servicio trabajadores oficiales;10.5 - Aportes Nación - Política de gratuidad; $ 26.635.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.07.03;Bonificación por servicios prestados trabajadores oficiales;10.5 - Aportes Nación - Política de gratuidad; $ 353.469.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.001;Aportes a la seguridad social en pensiones;10.5 - Aportes Nación - Política de gratuidad; $ 2.829.253.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.002;Aportes a la seguridad social en salud;10.5 - Aportes Nación - Política de gratuidad; $ 2.422.616.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.003;Aportes de cesantías ;10.5 - Aportes Nación - Política de gratuidad; $ 2.676.347.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.004;Aportes a cajas de compensación familiar;10.5 - Aportes Nación - Política de gratuidad; $ 1.264.028.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.005;Aportes generales al sistema de riesgos laborales;10.5 - Aportes Nación - Política de gratuidad; $ 230.084.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.006;Aportes al ICBF;10.5 - Aportes Nación - Política de gratuidad; $ 847.253.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.03;Sueldo básico docentes catédraticos;10.5 - Aportes Nación - Política de gratuidad; $ 227.557.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.001;Aportes a la seguridad social en pensiones;10.5 - Aportes Nación - Política de gratuidad; $ 809.713.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.002;Aportes a la seguridad social en salud;10.5 - Aportes Nación - Política de gratuidad; $ 203.331.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.003;Aportes de cesantías ;10.5 - Aportes Nación - Política de gratuidad; $ 1.253.402.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.004;Aportes a cajas de compensación familiar;10.5 - Aportes Nación - Política de gratuidad; $ 603.895.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.006;Aportes al ICBF;10.5 - Aportes Nación - Política de gratuidad; $ 452.966.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.002;"Productos alimenticios, bebidas y tabaco; textiles, prendas de vestir y productos de cuero";10.5 - Aportes Nación - Política de gratuidad; $ 933.435.929 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.003;Otros bienes transportables (excepto productos metálicos, maquinaria y equipo);10.5 - Aportes Nación - Política de gratuidad; $ 55.126.597 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";10.5 - Aportes Nación - Política de gratuidad; $ 7.710.390.510 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.007;"Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing";10.5 - Aportes Nación - Política de gratuidad; $ 1.891.444.797 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.008;Servicios prestados a las empresas y servicios de producción ;10.5 - Aportes Nación - Política de gratuidad; $ 2.625.235.327 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.04.05.002;Distintas a membresías;10.5 - Aportes Nación - Política de gratuidad; $ 22.245.052 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.06.03;Beneficios educativos a la comunidad universitaria;10.5 - Aportes Nación - Política de gratuidad; $ 53.115.827 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.011;Devolución de Dotación;10.5 - Aportes Nación - Política de gratuidad; $ 47.731.913 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.094;Auxilios Salud Visual;10.5 - Aportes Nación - Política de gratuidad; $ 150.106 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.14;Gravamen a los movimientos financieros;10.5 - Aportes Nación - Política de gratuidad; $ 129.676.147 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.52;Impuesto predial unificado;10.5 - Aportes Nación - Política de gratuidad; $ 567.422.795 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";13 - Cooperativas; $ 1.518.842.118 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.007;"Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing";13 - Cooperativas; $ 173.019.263 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.008;Servicios prestados a las empresas y servicios de producción ;13 - Cooperativas; $ 27.246.619 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.01;Sueldo básico administrativos;17 - Devolucion descuento electoral; $ 141.784.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.03;Gastos de representación;17 - Devolucion descuento electoral; $ 890.901.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.04.01;Subsidio de alimentación administrativos;17 - Devolucion descuento electoral; $ 17.014.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.04.02;Subsidio de alimentación trabajadores oficiales;17 - Devolucion descuento electoral; $ 17.014.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.05.01;Auxilio de transporte administrativos;17 - Devolucion descuento electoral; $ 45.371.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.05.02;Auxilio de transporte trabajadores oficiales;17 - Devolucion descuento electoral; $ 9.358.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.07.03;Bonificación por servicios prestados trabajadores oficiales;17 - Devolucion descuento electoral; $ 5.671.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.10;Viáticos de los funcionarios en comisión;17 - Devolucion descuento electoral; $ 48.894.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.01;Sueldo básico supernumerarios;17 - Devolucion descuento electoral; $ 8.468.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.01.03;Sueldo básico docentes catédraticos;17 - Devolucion descuento electoral; $ 19.398.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.05;Auxilio de transporte;17 - Devolucion descuento electoral; $ 3.386.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.01.001.08.02.02;Prima de vacaciones docentes ocasionales;17 - Devolucion descuento electoral; $ 2.743.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.001;Aportes a la seguridad social en pensiones;17 - Devolucion descuento electoral; $ 172.967.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.090;Bonificación por productividad académica;17 - Devolucion descuento electoral; $ 11.669.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";17 - Devolucion descuento electoral; $ 4.379.750.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";18-Articulo 87 CESU; $ 764.359.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;18-Articulo 87 CESU; $ 400.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;18-Articulo 87 CESU; $ 600.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;18-Articulo 87 CESU; $ 200.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.03;Gastos de representación;20 - Propios;$ 1.121.371.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.05.01;Auxilio de transporte administrativos;20 - Propios;$ 10.554.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.002.12.02.01;Beneficios a los empleados a largo plazo administrativos;20 - Propios;$ 4.293.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.03.090;Bonificación por productividad académica;20 - Propios;$ 9.808.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.001;"Minerales; electricidad, gas y agua";20 - Propios;$ 202.264.627,81
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.002;"Productos alimenticios, bebidas y tabaco; textiles, prendas de vestir y productos de cuero";20 - Propios;$ 50.182.304,11
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.003;Otros bienes transportables (excepto productos metálicos, maquinaria y equipo);20 - Propios;$ 195.717.313,11
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.004;Productos metálicos, maquinaria y equipo;20 - Propios;$ 169.663.193,59
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";20 - Propios;$ 5.619.646.367,46
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.007;"Servicios financieros y servicios conexos; servicios inmobiliarios; y servicios de arrendamiento y leasing";20 - Propios;$ 27.655.682,76
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.008;Servicios prestados a las empresas y servicios de producción ;20 - Propios;$ 975.783.687,33
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.009.00;Servicios para la comunidad, sociales y personales;20 - Propios;$ 25.202.336,69
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.010;Viáticos de los funcionarios en comisión;20 - Propios;$ 118.910.093,26
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.04.05.002;Distintas a membresías;20 - Propios;$ 5.626.003,84
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.06.03;Beneficios educativos a la comunidad universitaria;20 - Propios;$ 71.763.673,96
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.010.01;Incapacidades (no de pensiones);20 - Propios;$ 54.211.417,91
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.011;Devolución de Dotación;20 - Propios;$ 2.826.631,06
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.07.02.030;Auxilio sindical (no de pensiones);20 - Propios;$ 54.227.520,98
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.08.02;Apoyo socieconómico a estudiantes;20 - Propios;$ 23.261.691,22
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.13.01.001;Sentencias;20 - Propios;$ 500.000.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.14;Gravamen a los movimientos financieros;20 - Propios;$ 57.962.525,19
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.52;Impuesto predial unificado;20 - Propios;$ 926.929.572,73
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.01.53;Impuesto de registro;20 - Propios;$ 415.794,06
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.03;Tasas y derechos administrativos;20 - Propios;$ 2.629.359,54
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.04.01;Cuota de fiscalización y auditaje;20 - Propios;$ 900.000.000,00
01 - ADMINISTRATIVA Y FINANCIERA;2.1.8.06;Gastos por tributos, tasas, contribuciones, multas, sanciones e intereses de mora;20 - Propios;$ 570.403,40
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;21 - Devolucion IVA; $ 2.000.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;21 - Devolucion IVA; $ 3.000.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;21 - Devolucion IVA; $ 1.000.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";21 - Devolucion IVA; $ 471.839.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.01;Sueldo básico administrativos;31 - Posgrados; $ 3.550.094.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.01.02;Sueldo básico docentes;31 - Posgrados; $ 4.291.475.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.03;Gastos de representación;31 - Posgrados; $ 3.158.113.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.06.02;Prima de servicio docentes;31 - Posgrados; $ 903.181.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.001;Aportes a la seguridad social en pensiones;31 - Posgrados; $ 1.584.514.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.002;Aportes a la seguridad social en salud;31 - Posgrados; $ 1.123.221.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.02.003;Aportes de cesantías ;31 - Posgrados; $ 1.271.160.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.001;Aportes a la seguridad social en pensiones;31 - Posgrados; $ 1.156.825.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.02.02.002;Aportes a la seguridad social en salud;31 - Posgrados; $ 924.375.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.001;"Minerales; electricidad, gas y agua";31 - Posgrados; $ 306.950.449 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.002;"Productos alimenticios, bebidas y tabaco; textiles, prendas de vestir y productos de cuero";31 - Posgrados; $ 266.087.419 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.003;Otros bienes transportables (excepto productos metálicos, maquinaria y equipo);31 - Posgrados; $ 28.024.698 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.004;Productos metálicos, maquinaria y equipo;31 - Posgrados; $ 166.778.214 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.008;Servicios prestados a las empresas y servicios de producción ;31 - Posgrados; $ 125.226.761 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.009.00;Servicios para la comunidad, sociales y personales;31 - Posgrados; $ 11.157.772 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.3.06.03;Beneficios educativos a la comunidad universitaria;31 - Posgrados; $ 1.279.421 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;32 - Extension; $ 60.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;32 - Extension; $ 90.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;32 - Extension; $ 30.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.01;Prima de vacaciones administrativos;32 - Extension; $ 240.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.02;Prima de vacaciones docentes;32 - Extension; $ 270.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.03;Prima de vacaciones trabajadores oficiales;32 - Extension; $ 210.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.001;"Minerales; electricidad, gas y agua";32 - Extension; $ 44.311.807 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;33 - Convenios con derechos; $ 281.555.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;33 - Convenios con derechos; $ 422.333.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;33 - Convenios con derechos; $ 140.778.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.01;Prima de vacaciones administrativos;33 - Convenios con derechos; $ 1.126.222.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.02;Prima de vacaciones docentes;33 - Convenios con derechos; $ 1.266.999.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.03;Prima de vacaciones trabajadores oficiales;33 - Convenios con derechos; $ 985.444.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.02.006.00;"Comercio y distribución; alojamiento; servicios de suministro de comidas y bebidas; servicios de transporte; y servicios de distribución de electricidad, gas y agua";33 - Convenios con derechos; $ 625.150.515 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.01;Prima de navidad administrativos;35 - Educacion continuada; $ 45.333.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.02;Prima de navidad docentes;35 - Educacion continuada; $ 68.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.01.03;Prima de navidad trabajadores oficiales;35 - Educacion continuada; $ 22.667.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.01;Prima de vacaciones administrativos;35 - Educacion continuada; $ 181.333.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.02;Prima de vacaciones docentes;35 - Educacion continuada; $ 204.000.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.1.01.01.001.08.02.03;Prima de vacaciones trabajadores oficiales;35 - Educacion continuada; $ 158.667.000 
01 - ADMINISTRATIVA Y FINANCIERA;2.1.2.02.01.001;"Minerales; electricidad, gas y agua";35 - Educacion continuada; $ 22.832.273 
"""

import io
reader = csv.reader(io.StringIO(raw_data.strip()), delimiter=';')
header = next(reader)

rows = []
totals_by_recurso = {}
grand_total = 0.0

def clean_val(v):
    v = v.replace('$', '').strip()
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    else:
        v = v.replace('.', '')
    return float(v)

for r in reader:
    if not r or len(r) < 5:
        continue
    unidad, cod, concepto, recurso, val_str = [x.strip() for x in r[:5]]
    val = clean_val(val_str)
    rows.append({
        'unidad': unidad,
        'codigo': cod,
        'concepto': concepto,
        'recurso': recurso,
        'valor': val
    })
    totals_by_recurso[recurso] = totals_by_recurso.get(recurso, 0.0) + val
    grand_total += val

print(f"Total rows parsed: {len(rows)}")
print(f"Grand Total: {grand_total:,.2f}")
print("\nTotals by Recurso in CSV:")
for rec, tot in sorted(totals_by_recurso.items()):
    print(f"  {rec:50s}: {tot:20,.2f}")

