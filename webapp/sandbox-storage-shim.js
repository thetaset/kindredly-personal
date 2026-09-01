// Loaded as a CLASSIC script by sandbox.html, BEFORE all libraries and app code. The sandbox
// iframe runs WITHOUT allow-same-origin, so any native localStorage/sessionStorage access throws
// SecurityError before app-level guards can catch it. This replaces both with Storage-compatible
// in-memory proxies; sandbox.html additionally persists the localStorage shim per app via the
// Kindredly refState host API. Exposes window.__kndStorageShims for that wiring.
(function (window) {
  function blocked(name) {
    try { void window[name].length; return false; } catch (e) { return true; }
  }

  function makeMemoryStorage() {
    var data = Object.create(null);
    var listeners = [];
    function notify() {
      for (var i = 0; i < listeners.length; i++) { try { listeners[i](); } catch (e) {} }
    }
    var api = {
      getItem: function (k) { k = String(k); return k in data ? data[k] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); notify(); },
      removeItem: function (k) { k = String(k); if (k in data) { delete data[k]; notify(); } },
      clear: function () { data = Object.create(null); notify(); },
      key: function (i) { var ks = Object.keys(data); return ks[i] !== undefined ? ks[i] : null; },
    };
    // Proxy so property-style access (localStorage.foo = 'x', delete localStorage.foo,
    // Object.keys(localStorage)) behaves like the real Storage interface, not just the methods.
    var proxy = new Proxy(api, {
      get: function (t, prop) {
        if (prop === 'length') return Object.keys(data).length;
        if (prop in t) return t[prop];
        if (typeof prop === 'symbol') return undefined;
        return prop in data ? data[prop] : undefined;
      },
      set: function (t, prop, v) {
        if (typeof prop !== 'symbol') { data[String(prop)] = String(v); notify(); }
        return true;
      },
      deleteProperty: function (t, prop) {
        if (typeof prop !== 'symbol' && prop in data) { delete data[prop]; notify(); }
        return true;
      },
      has: function (t, prop) { return prop in t || (typeof prop !== 'symbol' && prop in data); },
      ownKeys: function () { return Object.keys(data); },
      getOwnPropertyDescriptor: function (t, prop) {
        if (typeof prop !== 'symbol' && prop in data) {
          return { value: data[prop], writable: true, enumerable: true, configurable: true };
        }
        return Object.getOwnPropertyDescriptor(t, prop);
      },
    });
    return {
      storage: proxy,
      snapshot: function () {
        var out = {};
        for (var k in data) out[k] = data[k];
        return out;
      },
      hydrate: function (obj) {
        if (!obj || typeof obj !== 'object') return;
        for (var k in obj) { if (typeof obj[k] === 'string') data[k] = obj[k]; }
      },
      onWrite: function (cb) { listeners.push(cb); },
    };
  }

  window.__kndStorageShims = {};
  var names = ['localStorage', 'sessionStorage'];
  for (var i = 0; i < names.length; i++) {
    (function (name) {
      if (!blocked(name)) return;
      var mem = makeMemoryStorage();
      try {
        Object.defineProperty(window, name, { configurable: true, get: function () { return mem.storage; } });
        window.__kndStorageShims[name] = mem;
      } catch (e) { /* accessor not replaceable; apps must guard */ }
    })(names[i]);
  }
})(window);
