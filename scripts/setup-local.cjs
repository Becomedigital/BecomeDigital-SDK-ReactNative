const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'config/credentials.local.json');
if (!fs.existsSync(target)) {
  fs.copyFileSync(path.join(root, 'config/credentials.example.json'), target);
}
console.log('Configuración local preparada. No se muestran ni reemplazan sus valores.');
