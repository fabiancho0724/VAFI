async function run() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/aec239964d816a1f8333586cd41d48aa311e7194/Ingresos.csv');
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
run();
