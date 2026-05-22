import https from 'https';
https.get('https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/25bab426e66c86cc3e877f13a848afe2fc93b019/Ingresos.csv', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data.split('\n').slice(0, 5).join('\n')); });
});
