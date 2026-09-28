// Copia las librerías de node_modules a /vendor para que el simulador funcione sin conexión.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const copias = [
  ['node_modules/react/umd/react.production.min.js', 'vendor/react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/react-dom.production.min.js'],
  ['node_modules/htm/dist/htm.umd.js', 'vendor/htm.umd.js'],
];
for (const peso of [400, 500, 700, 800, 900]) {
  copias.push([
    `node_modules/@fontsource/work-sans/files/work-sans-latin-${peso}-normal.woff2`,
    `vendor/fonts/work-sans-latin-${peso}-normal.woff2`,
  ]);
}

fs.mkdirSync(path.join(root, 'vendor/fonts'), { recursive: true });
for (const [origen, destino] of copias) {
  fs.copyFileSync(path.join(root, origen), path.join(root, destino));
  console.log('ok', destino);
}
