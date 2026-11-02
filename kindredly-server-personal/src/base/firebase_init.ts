import {config} from '@/config';

/**
 * Starts firebase-admin, which sends pushes, in each process that sends them: the web server
 * (`app.ts`) and the task runner, whose recurring jobs push too (the tamper watch's alerts, the
 * Family Downtime notice). Only the web server used to start it, so every push sent from a job
 * failed with "The default Firebase app does not exist" (found for HAT-380).
 */
export function initFirebaseIfConfigured() {
  if (!config.firebaseConfig || process.env.NODE_ENV === 'test') return;
  // Lazy: firebase-admin is push notification delivery, which a self-hosted
  // server has no account for. Requiring it here keeps it out of the
  // published package.json instead of out of the published app.ts.
  // personal-optional: guarded
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {cert, getApps, initializeApp} = require('firebase-admin/app');
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert(JSON.parse(config.firebaseConfig)),
  });
}
