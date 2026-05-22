import { fetchAndParseCSV } from './src/lib/csvParser';
async function run() {
  try {
     const data = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/88279801d7531f90d856e74290ada11bc2be90ee/Resumen%20PIC.csv');
     console.log(data);
  } catch (e) {
     console.error(e);
  }
}
run();
