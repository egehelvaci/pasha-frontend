const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  throw new Error('Standalone server missing; run next build first.');
}
// Next's minimal server needs its public files and compiled browser assets.
fs.cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
fs.cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
