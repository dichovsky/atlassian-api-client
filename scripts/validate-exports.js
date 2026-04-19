import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const rootExport = pkg.exports['.'];
const errors = [];

function resolveExportPath(exportPath) {
  return path.normalize(exportPath.replace(/^\.\//, ''));
}

// Check types
if (rootExport.types && !fs.existsSync(resolveExportPath(rootExport.types))) {
  errors.push(`Missing types: ${rootExport.types}`);
}

// Check import
if (rootExport.import && !fs.existsSync(resolveExportPath(rootExport.import))) {
  errors.push(`Missing import: ${rootExport.import}`);
}

// Check require
if (rootExport.require && !fs.existsSync(resolveExportPath(rootExport.require))) {
  errors.push(`Missing require: ${rootExport.require}`);
}

if (errors.length > 0) {
  console.error('Export validation failed:');
  errors.forEach(err => console.error(` - ${err}`));
  process.exit(1);
} else {
  console.log('Export validation passed.');
  process.exit(0);
}
