/**
 * The sandbox's run loop, shared by every sandbox page (sandbox.html, sandbox-nonet.html,
 * sandbox-v2.html, sandbox-v2-nonet.html). Loaded LAST in <body>, after #app exists and after
 * sandbox-host-api.js has defined window.createKindredlyHostApi.
 *
 * Classic (non-module) script. The iframe runs with an opaque `null` origin, so ES-module
 * imports and wasm fetches would be CORS-blocked against capacitor://localhost on mobile.
 * Instead, the host (AppIFrame) builds the app in the real origin and sends already-compiled
 * JS here; this script only EXECUTES it. Inlined into each page at build time, like every other
 * sandbox file (src/core/sandboxDocument.ts).
 */
let currentRunId = null;
let hostToken = null;
let parentOrigin = null;

function createRequestId() {
  try {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '_' + String(Math.random()).slice(2)
  } catch {
    return String(Date.now()) + '_' + String(Math.random()).slice(2)
  }
}

const hostApi = window.createKindredlyHostApi({ createRequestId })
hostApi.install()

// install() REPLACES window.kindredly, so the icon API is attached after it rather than by
// sandbox-icons.js itself. window.kndIcon / window.kndIcons keep working either way.
if (window.kndIcons) window.kindredly.icons = window.kndIcons

// What a run leaves running is taken down before the next run in this document: a React root's
// effects and timers, the kit's stores. The @kindredly/ui kit registers each one (runtime 2).
// A runtime 1 app registers nothing, so for it this is a no-op.
const runCleanups = [];
window.__kndRuntime = {
  onCleanup: function (fn) {
    if (typeof fn === 'function') runCleanups.push(fn);
  },
};
// Counts run-code messages, so one that waited can tell a newer one has arrived.
let runCodeSeq = 0;

function cleanupPreviousRun() {
  while (runCleanups.length) {
    const fn = runCleanups.pop();
    try {
      fn();
    } catch (e) {
      // A broken cleanup must not stop the next run.
    }
  }
}

// Runtime 2: the libraries an app imports (React, the kit, …) arrive WITH the run, as text — a
// `<script src>` cannot load in this frame on WebKit (src/core/sandboxDocument.ts). Each runs once
// per document; a later run reuses it.
const loadedLibs = new Set();
function loadRunLibs(libs) {
  if (!Array.isArray(libs)) return;
  for (const lib of libs) {
    if (!lib || typeof lib.id !== 'string' || typeof lib.code !== 'string' || loadedLibs.has(lib.id)) continue;
    const el = document.createElement('script');
    el.textContent = lib.code + '\n//# sourceURL=knd-lib/' + lib.id + '.js';
    document.head.appendChild(el);
    loadedLibs.add(lib.id);
  }
}

// Runtime 2: the app's own CSS (Tailwind, built by the host), replaced on every run.
function applyRunCss(css) {
  if (typeof css !== 'string') return;
  let el = document.getElementById('knd-app-css');
  if (!el) {
    el = document.createElement('style');
    el.id = 'knd-app-css';
    document.head.appendChild(el);
  }
  el.textContent = css;
}

// localStorage persistence: the head shim keeps writes in memory; back it with the per-app
// refState host API so data survives reloads. Hydrated once before the first run; writes are
// flushed debounced. Fail-soft: with no host itemId (e.g. attachment previews) the hydrate
// times out and storage stays in-memory for this load.
const LOCAL_STORAGE_STATE_KEY = '__knd_localstorage';
const LOCAL_STORAGE_MAX_CHARS = 800 * 1024;
let storageHydration = null;
function setupPersistentStorage() {
  const shim = window.__kndStorageShims && window.__kndStorageShims.localStorage;
  if (!shim) return Promise.resolve();
  if (storageHydration) return storageHydration;
  storageHydration = (async () => {
    try {
      const stored = await Promise.race([
        window.kindredly.refState.get(LOCAL_STORAGE_STATE_KEY),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      if (stored && typeof stored === 'object') shim.hydrate(stored);
    } catch { /* in-memory only */ }

    let flushTimer = null;
    let warnedTooBig = false;
    const flush = () => {
      flushTimer = null;
      try {
        const snapshot = shim.snapshot();
        if (JSON.stringify(snapshot).length > LOCAL_STORAGE_MAX_CHARS) {
          if (!warnedTooBig) {
            warnedTooBig = true;
            console.warn('localStorage exceeds the ~800KB persistence limit; data is kept in memory only. Store less here, or use kindredly.refState for larger data.');
          }
          return;
        }
        warnedTooBig = false;
        window.kindredly.refState.set(LOCAL_STORAGE_STATE_KEY, snapshot).catch(() => {});
      } catch { /* ignore */ }
    };
    shim.onWrite(() => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 400);
    });
    window.addEventListener('pagehide', () => {
      if (flushTimer) { clearTimeout(flushTimer); flush(); }
    });
  })();
  return storageHydration;
}

// Runtime error positions: app code executes via new Function(code), so reported line
// numbers are offset by the function wrapper and refer to COMPILED js. Measure the wrapper
// offset once with a probe error; the host (AppIFrame) maps the compiled position back to
// the user's source via the esbuild source map.
let fnLineOffset = 0;
function parseEvaluatedPosition(stack) {
  if (!stack || typeof stack !== 'string') return null;
  const m = /<anonymous>:(\d+):(\d+)/.exec(stack)
    || /> (?:eval|Function):(\d+):(\d+)/.exec(stack)
    || /\banonymous@.*:(\d+):(\d+)/.exec(stack);
  return m ? { line: parseInt(m[1], 10), column: parseInt(m[2], 10) } : null;
}
try {
  new Function('throw new Error("__probe__")')();
} catch (probeErr) {
  const probePos = parseEvaluatedPosition(probeErr && probeErr.stack);
  if (probePos && probePos.line >= 1) fnLineOffset = probePos.line - 1;
}
function compiledPositionFromStack(stack) {
  const pos = parseEvaluatedPosition(stack);
  if (!pos || pos.line <= fnLineOffset) return null;
  return { line: pos.line - fnLineOffset, column: pos.column };
}

// Snapshot of what actually rendered, sent with run-complete so the editor agent can
// verify the UI instead of trusting a clean console (catches "runs fine, shows nothing").
function buildDomSummary() {
  try {
    const app = document.getElementById('app');
    const texts = function (nodes, cap) {
      const out = [];
      for (let i = 0; i < nodes.length && out.length < cap; i++) {
        const t = (nodes[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (t) out.push(t);
      }
      return out;
    };
    // A button by what a person — or a screen reader — calls it. An icon-only button (a trash
    // can labelled "Remove entry") has no text at all, and listing buttons by text alone hid
    // it from the model, which then reported that the app had no way to remove anything.
    const buttonNames = function (nodes, cap) {
      const out = [];
      for (let i = 0; i < nodes.length && out.length < cap; i++) {
        const n = nodes[i];
        const t = (n.getAttribute('aria-label') || n.textContent || n.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (t) out.push(t);
      }
      return out;
    };
    const childCount = app ? app.children.length : 0;
    const textPreview = app ? (app.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
    const hasCanvas = !!document.querySelector('canvas'); // Kaboom appends its canvas to <body>
    return {
      appChildCount: childCount,
      textPreview: textPreview,
      headings: app ? texts(app.querySelectorAll('h1,h2,h3'), 5) : [],
      buttons: app ? buttonNames(app.querySelectorAll('button,[role="button"]'), 8) : [],
      inputCount: app ? app.querySelectorAll('input,select,textarea').length : 0,
      hasCanvas: hasCanvas,
      renderedNothing: childCount === 0 && !textPreview && !hasCanvas,
    };
  } catch (e) {
    return null;
  }
}

function safeToString(value) {
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message || String(value);
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[unserializable]';
    }
  }
}

function postToParent(payload) {
  try {
    if (window.parent && window.parent !== window) {
      const targetOrigin = parentOrigin || '*'
      // Payloads may pin their own runId (delayed run-complete must not adopt a newer run's id).
      const runId = payload && payload.runId !== undefined ? payload.runId : currentRunId;
      window.parent.postMessage({ ...payload, runId, token: hostToken }, targetOrigin);
    }
  } catch {
    // ignore
  }
}

// Host API is installed via sandbox-host-api.js

// Mirror console output to parent for agent verification.
(function wrapConsole() {
  const levels = ['log', 'warn', 'error', 'info', 'debug'];
  for (const level of levels) {
    const original = console[level];
    console[level] = function(...args) {
      try {
        postToParent({
          type: 'sandbox-console',
          level,
          args: args.map(a => safeToString(a)).slice(0, 20),
          ts: Date.now(),
        });
      } catch {
        // ignore
      }
      return original.apply(console, args);
    };
  }
})();

window.onerror = function(msg, url, line, col, error) {
  const div = document.createElement('div');
  div.className = 'error';
  div.textContent = 'Error: ' + msg;
  document.body.appendChild(div);
  postToParent({
    type: 'sandbox-error',
    kind: 'runtime',
    message: String(msg || 'Unknown error'),
    stack: error && error.stack ? String(error.stack) : undefined,
    position: compiledPositionFromStack(error && error.stack),
    ts: Date.now(),
  });
  return false;
};

window.onunhandledrejection = function(event) {
  const reason = event && event.reason ? event.reason : 'Unhandled rejection';
  const div = document.createElement('div');
  div.className = 'error';
  div.textContent = 'Unhandled Promise Rejection: ' + safeToString(reason);
  document.body.appendChild(div);
  postToParent({
    type: 'sandbox-error',
    kind: 'unhandledrejection',
    message: safeToString(reason),
    position: compiledPositionFromStack(reason && reason.stack),
    ts: Date.now(),
  });
  return false;
};

// Listen for code from parent window
window.addEventListener('message', async function(event) {
  // Only accept commands from our parent, on the same origin.
  if (window.parent === window) {
    return;
  }
  if (event.source !== window.parent) {
    return;
  }

  // If we're running without allow-same-origin, our origin will be opaque ("null").
  // Capture the parent origin on first message and use a shared token for validation.
  if (!parentOrigin && typeof event.origin === 'string' && event.origin) {
    parentOrigin = event.origin
    hostApi.setParentOrigin(parentOrigin)
  }

  if (event.data && event.data.type === 'test-step') {
    // The App Builder trying the app (sandbox-test.js). Only the host that started the
    // current run may drive it. Errors the step raises reach the host through window.onerror
    // as usual, before this result does.
    if (!hostToken || event.data.token !== hostToken) return;
    let result;
    try {
      const runner = window.__kndTest;
      result = runner ? await runner.run(event.data.step || {}) : { ok: false, note: 'The test runner did not load.' };
    } catch (err) {
      result = { ok: false, note: 'The step could not run: ' + safeToString(err) };
    }
    postToParent({
      type: 'sandbox-test-step-result',
      stepId: event.data.stepId,
      result: result,
      dom: buildDomSummary(),
      ts: Date.now(),
    });
    return;
  }

  if (event.data && event.data.type === 'run-code') {
    const runSeq = ++runCodeSeq;
    hostToken = event.data.token || hostToken
    hostApi.setHostToken(hostToken)
    const runStartedAt = Date.now();
    // Hydrate persisted localStorage before app code runs (no-op after the first run).
    await setupPersistentStorage();
    // A newer run arrived while this one waited for storage: it replaces this one. Without this,
    // both would run, the first never torn down, and its result reported under the second's id.
    if (runSeq !== runCodeSeq) return;

    // Take down what the previous run left mounted, then clear what it drew.
    cleanupPreviousRun();
    const app = document.getElementById('app');
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }

    // Remove previous error messages
    const errors = document.querySelectorAll('.error');
    errors.forEach(err => err.remove());

    currentRunId = event.data.runId || null;
    try {
      // Runtime 2 sends its libraries and CSS with the code; runtime 1 sends neither.
      loadRunLibs(event.data.libs);
      applyRunCss(event.data.css);
      // event.data.code is already compiled to JS by the host (AppIFrame). Just execute it.
      const fn = new Function(event.data.code);
      fn();

      // Give async rendering (Alpine init, rAF paints) a beat before snapshotting the DOM,
      // so the run report reflects what the user actually sees. runId is pinned in case a
      // newer run starts during the delay.
      const durationMs = Date.now() - runStartedAt;
      const completedRunId = currentRunId;
      setTimeout(function () {
        postToParent({
          type: 'sandbox-run-complete',
          success: true,
          durationMs: durationMs,
          dom: buildDomSummary(),
          runId: completedRunId,
          ts: Date.now(),
        });
      }, 250);
    } catch (err) {
      const div = document.createElement('div');
      div.className = 'error';
      div.textContent = 'Error: ' + safeToString(err);
      document.body.appendChild(div);
      console.error(err);

      postToParent({
        type: 'sandbox-error',
        kind: 'runtime',
        message: err && err.message ? String(err.message) : safeToString(err),
        stack: err && err.stack ? String(err.stack) : undefined,
        position: compiledPositionFromStack(err && err.stack),
        ts: Date.now(),
      });
      postToParent({
        type: 'sandbox-run-complete',
        success: false,
        durationMs: Date.now() - runStartedAt,
        dom: buildDomSummary(),
        ts: Date.now(),
      });
    }
  }
});

// Signal ready
if (window.parent !== window) {
  // We don't know the parent origin yet; it will be captured on first message.
  window.parent.postMessage({ type: 'sandbox-ready' }, '*');
}
