#!/usr/bin/env node
/**
 * Generate runtime request validators from `ApiRouteMap`.
 *
 * `ApiRouteMap` already describes the request shape of every endpoint, but TypeScript types are
 * erased at runtime, so ~469 handlers read `req.body.*` with nothing checking it. This emits a
 * single JSON Schema document mapping each route path to a `$ref` for its request type, so the
 * server can validate a body by path without loading anything TypeScript.
 *
 * Types are generated one at a time on purpose. Generating the whole `ApiRouteMap` in one pass
 * fails outright on the first construct the generator does not understand, which would mean no
 * validators at all; per-type generation loses only the type that failed, and the failures are
 * recorded in the output so the gap is visible rather than silent.
 *
 * The output is committed. Nothing at build or deploy time needs this generator — only a person
 * changing the route map does, via `npm run generate-request-schemas`.
 *
 * Usage:
 *   node scripts/generate-request-schemas.js            # write the schema
 *   node scripts/generate-request-schemas.js --check    # fail if the committed file is stale
 */

const fs = require('fs');
const path = require('path');

const {createGenerator} = require('ts-json-schema-generator');

const ROOT = path.resolve(__dirname, '..');
const ROUTE_MAP_FILE = path.join(ROOT, 'src', 'api', 'api-route-map.ts');
const OUT_FILE = path.join(ROOT, 'src', 'api', 'request-schemas.generated.json');
const ENTRYPOINT_FILE = path.join(ROOT, 'src', 'api', '__request-schema-entrypoint.tmp.ts');

/**
 * Every route path declared in `ApiRouteMap`.
 *
 * Most entries declare their request inline (`request: {itemId: string}`) rather than naming a
 * type, so reading type names out of the source would cover only a quarter of the map. Paths are
 * all that is read here; the shapes come from the compiler via indexed access.
 */
function readRoutePaths() {
  const source = fs.readFileSync(ROUTE_MAP_FILE, 'utf-8');
  const entry = /['"]([^'"]+)['"]\s*:\s*\{(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*request\s*:/g;

  const paths = [];
  let match;
  while ((match = entry.exec(source)) !== null) {
    if (match[1].startsWith('/')) paths.push(match[1]);
  }
  return [...new Set(paths)];
}

/**
 * Declare `type R<n> = ApiRouteMap['<path>']['request']` for every route, so the generator resolves
 * inline and named request types through the same code path.
 */
function writeEntrypoint(routePaths) {
  const aliases = routePaths.map((p, i) => `export type R${i} = ApiRouteMap[${JSON.stringify(p)}]['request'];`);
  const contents =
    '// AUTO-GENERATED, TEMPORARY. Written and deleted by scripts/generate-request-schemas.js.\n' +
    "import type {ApiRouteMap} from './api-route-map';\n\n" +
    aliases.join('\n') +
    '\n';
  fs.writeFileSync(ENTRYPOINT_FILE, contents);
}

function main() {
  const check = process.argv.includes('--check');

  const routePaths = readRoutePaths();
  if (routePaths.length === 0) {
    console.error('No routes parsed out of the route map — refusing to write anything.');
    process.exit(1);
  }

  writeEntrypoint(routePaths);

  const definitions = {};
  const routeRefs = {};
  const failures = {};

  try {
    const generator = createGenerator({
      path: ENTRYPOINT_FILE,
      tsconfig: path.join(ROOT, 'tsconfig.json'),
      type: '*',
      expose: 'all',
      topRef: true,
      jsDoc: 'none',
      skipTypeCheck: true,
      additionalProperties: true,
    });

    routePaths.forEach((routePath, i) => {
      const alias = `R${i}`;
      try {
        const schema = generator.createSchema(alias);
        const {[alias]: aliasDef, ...rest} = schema.definitions || {};
        Object.assign(definitions, rest);
        if (aliasDef) {
          // Inline request types have no name to reference, so the resolved shape is stored under
          // the route path itself; named ones collapse to a $ref and stay deduplicated.
          const ref = aliasDef.$ref;
          if (ref) {
            routeRefs[routePath] = ref;
          } else {
            // Inline request types have no name to reference, so the resolved shape is stored under
            // a generated one. It must contain no '/' or '~' — those are JSON Pointer syntax, and a
            // definition named after the route path would silently fail to resolve at runtime.
            const name = `InlineRequest_${routePath.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
            definitions[name] = aliasDef;
            routeRefs[routePath] = `#/definitions/${name}`;
          }
        }
      } catch (e) {
        failures[routePath] = String(e?.message || e).slice(0, 200);
      }
    });
  } finally {
    fs.rmSync(ENTRYPOINT_FILE, {force: true});
  }

  const output = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    // Not a schema field — provenance for whoever reads the file.
    generatedFrom: 'src/api/api-route-map.ts',
    routeCount: routePaths.length,
    validatedRouteCount: Object.keys(routeRefs).length,
    // Types the generator could not represent. These routes are simply not observed; listing them
    // keeps the gap honest instead of looking like full coverage.
    unrepresentableTypes: failures,
    routes: routeRefs,
    definitions,
  };

  const serialized = JSON.stringify(output, null, 2) + '\n';

  if (check) {
    const existing = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf-8') : '';
    if (existing !== serialized) {
      console.error(`${path.relative(ROOT, OUT_FILE)} is stale. Run: npm run generate-request-schemas`);
      process.exit(1);
    }
    console.log(`Request schemas up to date (${output.validatedRouteCount}/${output.routeCount} routes).`);
    return;
  }

  fs.writeFileSync(OUT_FILE, serialized);
  console.log(
    `Wrote ${path.relative(ROOT, OUT_FILE)} — ${output.validatedRouteCount}/${output.routeCount} routes covered, ` +
      `${Object.keys(failures).length} types unrepresentable, ${Math.round(serialized.length / 1024)} KB.`,
  );
}

main();
