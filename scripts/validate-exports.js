import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const rootExport = pkg.exports?.['.'];
const errors = [];

function resolveExportPath(exportPath) {
  return path.normalize(exportPath.replace(/^\.\//, ''));
}

if (rootExport === undefined) {
  errors.push('Missing exports["."] entry in package.json');
} else {
  const validateExportField = (fieldName) => {
    const exportPath = rootExport[fieldName];
    if (typeof exportPath !== 'string') return;
    if (!fs.existsSync(resolveExportPath(exportPath))) {
      errors.push(`Missing ${fieldName}: ${exportPath}`);
    }
  };

  validateExportField('types');
  validateExportField('import');
  validateExportField('default');
}

if (errors.length > 0) {
  console.error('Export validation failed:');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('Export validation passed.');
