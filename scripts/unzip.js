const AdmZip = require('adm-zip');

// Путь к архиву
const zipPath = 'proto.zip';

const zip = new AdmZip(zipPath);
zip.extractAllTo('.', true); // true = перезаписывать существующие файлы
console.log(`Архив распакован`);
