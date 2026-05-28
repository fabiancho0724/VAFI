const fs = require('fs');
fetch('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Ingreso%20Mensual%202026.csv').then(r=>r.text()).then(t=>console.log(t.split('\n')[0]))
