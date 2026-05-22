import { fetchAndParseCSV } from './src/lib/csvParser';
async function test() {
   const data = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/aec239964d816a1f8333586cd41d48aa311e7194/Gastos.csv');
   console.log("KEYS:", Object.keys(data[0]));
   
   const nomina = await fetchAndParseCSV('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/aec239964d816a1f8333586cd41d48aa311e7194/Nomina.csv');
   console.log("NOMINA KEYS:", Object.keys(nomina[0]));
}
test();
