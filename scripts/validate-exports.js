/* eslint-disable */
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const exports = pkg.exports['.'];
const errors = [];

// Check types
if (exports.types && !fs.existsSync(path.join('dist', path.basename(exports.types)))) {
  errors.push(`Missing types: ${exports.types}`);
}

// Check import
if (exports.import && !fs.existsSync(path.join('dist', path.basename(exports.import)))) {
  errors.push(`Missing import: ${exports.import}`);
}

// Check require
if (exports.require && !fs.existsSync(path.join('dist', path.basename(exports.require)))) {
  errors.push(`Missing require: ${exports.require}`);
}

if (errors.length > 0) {
  console.error('Export validation failed:');
  errors.forEach(err => console.error(` - ${err}`));
  process.exit(1);
} else {
  console.log('Export validation passed.');
  process.exit(0);
}
