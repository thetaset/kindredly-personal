import fs from 'fs';
import path from 'path';
import express, {Application, NextFunction, Request, Response} from 'express';
import {config} from '@/config';
import {logger} from '@/utils/logger';

/**
 * Serving the webapp from the server process, so a box is reachable from a browser.
 *
 * **Why this exists.** A box run by `start_box.sh` is one Node process with no
 * nginx, and the API alone is not a product: the extension and the mobile apps
 * carry their own UI, but a browser got a bare 404 — including the browser
 * someone needs in order to create the first account on a new box.
 *
 * **This is the local-testing shape, not the shipping one.** The published
 * personal server serves the bundle through the nginx in
 * `docker-compose-personal.yml` (`./webapp:/usr/share/nginx/html`), and will
 * eventually do it from `kindredly_personal.sh`. This module exists so that path
 * can be exercised from this repo without Docker. It is deliberately
 * self-contained — one file, no imports from the route layer — so moving it
 * later is a copy rather than an untangling.
 *
 * **Off unless asked for.** Cloud serves its bundle from CDN and must never
 * start answering for it here, so this needs either `KND_WEBAPP_DIR` or the
 * `lite` profile with a bundle actually present.
 */

/** Where a built webapp might be when nobody said. Order is the search order. */
function candidates(): string[] {
  return [
    // The published personal-server layout: a `webapp/` folder beside the server.
    path.join(process.cwd(), 'webapp'),
    // This repo, where the client builds in place. `__dirname` is dist/base or
    // src/base, so three levels up is the repo root either way.
    path.join(__dirname, '..', '..', '..', 'tset-client', 'dist', 'webapp'),
  ];
}

/** A directory holds a usable build if it has the entry point, not merely if it exists. */
const hasBundle = (dir: string): boolean => fs.existsSync(path.join(dir, 'index.html'));

/**
 * The first candidate that holds a real build, or null.
 *
 * `index.html` is the test rather than the directory existing: `dist/webapp` is
 * created by the client's `public/` assets (robots.txt, sitemap.xml) long before
 * anything is built into it, so a directory check alone reports a bundle that
 * would serve nothing but 404s.
 */
export function resolveWebappDir(): string | null {
  // An explicit setting wins outright, including when it turns out to be empty.
  // Falling through to a different directory would quietly serve a bundle the
  // operator did not choose - and on this laptop that is a real one, since the
  // client builds into tset-client/dist/webapp whether or not you meant it.
  if (config.webappDir) {
    const dir = path.resolve(config.webappDir);
    return hasBundle(dir) ? dir : null;
  }

  if (config.profile !== 'lite') return null;
  for (const dir of candidates()) {
    if (hasBundle(dir)) return path.resolve(dir);
  }
  return null;
}

/**
 * Mount the webapp. Call AFTER the API routes — the fallback below answers
 * anything left over, and mounting it earlier would swallow them.
 */
export function serveWebapp(app: Application): void {
  const dir = resolveWebappDir();
  if (!dir) {
    if (config.webappDir) logger.warn(`[webapp] no index.html under ${config.webappDir} — not serving`);
    return;
  }

  logger.info(`[webapp] serving from: ${dir}`);
  app.use(express.static(dir, {index: 'index.html'}));

  // Client-side routing: the app owns paths the server has never heard of
  // (/library, /settings/device, ...), so a miss returns index.html and lets the
  // router sort it out. Everything the SERVER owns has to be excluded, or a
  // genuine 404 from the API turns into a page of HTML — which is exactly how a
  // broken endpoint starts looking like a broken client.
  const serverOwned = [`/${config.apiVersion}/`, '/modeldata/', '/downloads/', '/healthcheckping'];

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (serverOwned.some((prefix) => req.path.startsWith(prefix))) return next();
    // A request that wants JSON is an API caller, not someone loading a page.
    if (req.accepts(['html', 'json']) !== 'html') return next();
    res.sendFile(path.join(dir, 'index.html'));
  });
}
