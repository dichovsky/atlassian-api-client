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
  if (rootExport.types && !fs.existsSync(resolveExportPath(rootExport.types))) {
    errors.push(`Missing types: ${rootExport.types}`);
  }

  if (rootExport.import && !fs.existsSync(resolveExportPath(rootExport.import))) {
    errors.push(`Missing import: ${rootExport.import}`);
  }

  if (rootExport.default && !fs.existsSync(resolveExportPath(rootExport.default))) {
    errors.push(`Missing default: ${rootExport.default}`);
  }
}

if (errors.length > 0) {
  console.error('Export validation failed:');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('Export validation passed.');
