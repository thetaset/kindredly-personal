#!/usr/bin/env node
/**
 * Copy generated JSON assets from `src/` into `dist/`.
 *
 * `tsc` only emits a `.json` file if some TypeScript file in this package imports it. The request
 * schemas are consumed by the server, not by anything in sharedlib, so tsc leaves them behind —
 * and the production build resolves `tset-sharedlib/*` to `dist/`, not `src/`. Without this the
 * server would build fine and then fail to start.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = [path.join('api', 'request-schemas.generated.json')];

let copied = 0;
for (const relative of ASSETS) {
  const from = path.join(ROOT, 'src', relative);
  const to = path.join(ROOT, 'dist', relative);

  if (!fs.existsSync(from)) {
    console.error(`Missing generated asset: src/${relative} — run npm run generate-request-schemas`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
  copied++;
}

console.log(`Copied ${copied} generated asset(s) into dist/.`);
