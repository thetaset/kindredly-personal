/**
 * knd — the sandbox app kit.
 *
 * `kindredly.*` is the bridge to the host: async, permissioned, one round trip per call.
 * `knd.*` is local sugar on top of it, and exists for one reason: every app was rebuilding the
 * same plumbing, and the rules for getting that plumbing right were spread across a doc the model
 * had to know to go and read.
 *
 * The rule for adding to this file: **a kit function must retire a rule from the app-editor
 * prompt or the manual.** If it does not, it is a library nobody asked for, and it costs every
 * future app author a thing to learn. `knd.store` retires four — render-defaults-first,
 * hydrate-in-the-background, save-after-every-change, and try/catch-every-call.
 *
 * Loaded by sandbox.html AFTER sandbox-host-api.js. `window.kindredly` is still installed later
 * than this script runs, so every reference to it here is resolved at CALL time, never at load.
 */
;(function () {
  'use strict'

  var SAVE_DEBOUNCE_MS = 250

  function hostRefState(shared) {
    var api = typeof window !== 'undefined' ? window.kindredly : null
    var target = shared ? (api && api.sharedRefState) : (api && api.refState)
    return target && typeof target.get === 'function' ? target : null
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }

  /** Defaults win for any key the stored value does not have, so a new field never lands undefined. */
  function mergeDefaults(stored, defaults) {
    if (!isPlainObject(stored)) return JSON.parse(JSON.stringify(defaults))
    var out = JSON.parse(JSON.stringify(defaults))
    for (var key in stored) {
      if (Object.prototype.hasOwnProperty.call(stored, key)) out[key] = stored[key]
    }
    return out
  }

  /**
   * A persisted state object.
   *
   *   var store = knd.store('chores', { items: [] })
   *   render(store.data)                 // defaults are there immediately — never a blank pane
   *   store.onChange(render)             // fires once the saved data arrives, and after every set
   *   store.set({ items: next })         // merges into store.data and saves
   *
   * Never throws and never rejects. A storage failure leaves the app working, unsaved, with the
   * reason on `store.error` — which is what the app should show if it shows anything.
   */
  function createStore(namespace, defaults, options) {
    var opts = options || {}
    var ns = String(namespace || 'app')
    var key = String(opts.key || 'state')
    var shared = opts.shared === true
    var base = isPlainObject(defaults) ? defaults : {}

    var listeners = []
    var saveTimer = null
    var pendingSave = null

    var store = {
      data: JSON.parse(JSON.stringify(base)),
      loaded: false,
      error: null,
      ready: null,
      set: setPatch,
      save: saveNow,
      onChange: onChange,
      reset: reset,
    }

    function emit() {
      for (var i = 0; i < listeners.length; i++) {
        try {
          listeners[i](store.data, store)
        } catch (e) {
          // A throwing listener must not take down the save path or the other listeners.
          console.warn('[knd.store] onChange listener threw:', e)
        }
      }
    }

    function onChange(fn) {
      if (typeof fn !== 'function') return function () {}
      listeners.push(fn)
      return function () {
        var at = listeners.indexOf(fn)
        if (at >= 0) listeners.splice(at, 1)
      }
    }

    function setPatch(patch) {
      if (isPlainObject(patch)) {
        for (var k in patch) {
          if (Object.prototype.hasOwnProperty.call(patch, k)) store.data[k] = patch[k]
        }
      }
      emit()
      scheduleSave()
      return store.data
    }

    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(function () {
        saveTimer = null
        saveNow()
      }, SAVE_DEBOUNCE_MS)
    }

    function saveNow() {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      var target = hostRefState(shared)
      if (!target) {
        store.error = 'Storage is unavailable in this environment.'
        return Promise.resolve(false)
      }
      // Serialize saves: two overlapping writes of the same key can land out of order, and the
      // loser silently wins.
      var snapshot = JSON.parse(JSON.stringify(store.data))
      pendingSave = Promise.resolve(pendingSave)
        .catch(function () {})
        .then(function () {
          return target.set(key, snapshot, { namespace: ns })
        })
        .then(function () {
          store.error = null
          return true
        })
        .catch(function (e) {
          store.error = (e && e.message) || 'Could not save.'
          console.warn('[knd.store] save failed:', e)
          return false
        })
      return pendingSave
    }

    function reset() {
      store.data = JSON.parse(JSON.stringify(base))
      emit()
      return saveNow()
    }

    store.ready = (function hydrate() {
      var target = hostRefState(shared)
      if (!target) {
        store.error = 'Storage is unavailable in this environment.'
        store.loaded = true
        return Promise.resolve(store.data)
      }
      return Promise.resolve()
        .then(function () {
          return target.get(key, { namespace: ns })
        })
        .then(function (stored) {
          // The host returns the value directly, or wrapped — accept both rather than guessing.
          var value = stored && typeof stored === 'object' && 'value' in stored ? stored.value : stored
          if (value !== undefined && value !== null) store.data = mergeDefaults(value, base)
          store.loaded = true
          emit()
          return store.data
        })
        .catch(function (e) {
          store.error = (e && e.message) || 'Could not load saved data.'
          store.loaded = true
          console.warn('[knd.store] load failed:', e)
          return store.data
        })
    })()

    return store
  }

  /**
   * Kaboom, sized to the pane instead of to a number.
   *
   * `kaboom({ width: 640, height: 400 })` builds a canvas that is literally 640 CSS pixels wide
   * and never changes. On a 320px phone that is 340px of horizontal scroll, which is exactly what
   * the App Builder shipped. Kaboom already has the responsive path -- `letterbox: true` makes it
   * take its pixel size from the PARENT element and letterbox the width x height virtual
   * resolution inside it, so game coordinates stay stable -- but it only works if the parent has
   * a real width AND height, which a bare `<div id="app">` does not.
   *
   * So this builds the parent: a centred, aspect-ratio box that is 100% wide on a phone and capped
   * at the design width on a desktop. It retires three manual rules -- size the buffer from the
   * measured element, cap the width on desktop, and `touch-action: none` on a dragged surface.
   *
   * Returns the Kaboom context with one addition: `k.overlay`, an element stacked over the canvas
   * for on-screen controls. DOM buttons over a canvas need a positioned ancestor, and an app that
   * appends them to `#app` gets them at the bottom of the page instead of on the game.
   */
  function createGame(options) {
    var opts = options || {}
    var width = opts.width || 640
    var height = opts.height || 400
    var root = opts.root || (typeof document !== 'undefined' ? document.getElementById('app') : null)
    if (!root) throw new Error('knd.game: no #app element to mount into.')
    if (typeof window === 'undefined' || typeof window.kaboom !== 'function') {
      throw new Error('knd.game: kaboom is not available in this sandbox.')
    }

    var frame = document.createElement('div')
    frame.className = 'knd-game'
    frame.style.position = 'relative'
    frame.style.width = '100%'
    frame.style.maxWidth = width + 'px'
    frame.style.margin = '0 auto'
    frame.style.aspectRatio = width + ' / ' + height
    frame.style.overflow = 'hidden'
    frame.style.borderRadius = '12px'
    frame.style.touchAction = 'none'
    root.appendChild(frame)

    var kaboomOpts = {}
    for (var key in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, key) && key !== 'root') kaboomOpts[key] = opts[key]
    }
    kaboomOpts.root = frame
    kaboomOpts.width = width
    kaboomOpts.height = height
    // Both flags off means Kaboom hard-codes the canvas to width x height. letterbox keeps the
    // virtual resolution (so k.width() is still `width`) while the canvas fills the frame.
    kaboomOpts.letterbox = true

    var k = window.kaboom(kaboomOpts)

    var canvas = frame.querySelector('canvas')
    if (canvas) {
      canvas.style.display = 'block'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.touchAction = 'none'
    }

    var overlay = document.createElement('div')
    overlay.className = 'knd-game-overlay'
    overlay.style.position = 'absolute'
    overlay.style.inset = '0'
    // The layer itself must not eat taps meant for the canvas; each control turns them back on.
    overlay.style.pointerEvents = 'none'
    frame.appendChild(overlay)

    k.overlay = overlay
    k.frame = frame
    return k
  }

  /**
   * Replace an element's HTML without throwing away what the user is doing.
   *
   * Every app the App Builder writes renders the same way: build one HTML string, assign it to
   * `app.innerHTML`. That destroys and rebuilds every node, so the field being typed into is gone
   * and focus lands on the body. The user types one letter and the caret leaves.
   *
   * It bites two ways, and only one of them is the model's fault:
   *
   *  - The app mirrors the input into `knd.store` on each keystroke, so `set()` fires `onChange`,
   *    which re-renders. A notes app did exactly this and lost focus after every character.
   *  - Nothing the app did: `store.ready` resolves and hydration calls `onChange` while the user
   *    is mid-word. A perfectly written app still drops the caret.
   *
   * So this is not a workaround for sloppy generated code — a full-innerHTML render is the pattern
   * the manual teaches, and it needs the caret put back. Restores focus by id, then by name, then
   * by position among the focusable elements, because generated markup does not always have ids.
   */
  function paint(target, html) {
    var el = typeof target === 'string' ? document.getElementById(target) : target
    if (!el) return null

    var active = document.activeElement
    var inside = !!active && active !== document.body && el.contains(active)
    var mark = null
    if (inside) {
      var focusables = Array.prototype.slice.call(el.querySelectorAll('input, textarea, select, button, [tabindex]'))
      mark = {
        id: active.id || '',
        name: active.getAttribute ? active.getAttribute('name') || '' : '',
        tag: active.tagName,
        index: focusables.indexOf(active),
        start: null,
        end: null,
      }
      // Only text-ish fields expose a selection; reading it on a checkbox or button throws.
      try {
        if (typeof active.selectionStart === 'number') {
          mark.start = active.selectionStart
          mark.end = active.selectionEnd
        }
      } catch (e) { /* not a text field */ }
    }

    el.innerHTML = html
    if (!mark) return el

    // Scanned rather than matched with a built selector: an id or name straight out of user data
    // ("Mum's list") is not a valid selector, and CSS.escape is not everywhere.
    var after = Array.prototype.slice.call(el.querySelectorAll('input, textarea, select, button, [tabindex]'))
    var next = null
    if (mark.id) {
      for (var i = 0; i < after.length && !next; i++) if (after[i].id === mark.id) next = after[i]
    }
    if (!next && mark.name) {
      for (var j = 0; j < after.length && !next; j++) {
        if (after[j].getAttribute && after[j].getAttribute('name') === mark.name) next = after[j]
      }
    }
    if (!next && mark.index >= 0) {
      var candidate = after[mark.index]
      // Position is the weakest match, so it only counts when the element is the same kind.
      if (candidate && candidate.tagName === mark.tag) next = candidate
    }
    if (!next || typeof next.focus !== 'function') return el

    try {
      // preventScroll: re-focusing must not yank a long page back to the field.
      next.focus({ preventScroll: true })
      if (mark.start !== null && typeof next.setSelectionRange === 'function') {
        next.setSelectionRange(mark.start, mark.end)
      }
    } catch (e) { /* element cannot take focus after all */ }
    return el
  }

  var knd = {
    game: createGame,
    paint: paint,
    store: function (namespace, defaults, options) {
      return createStore(namespace, defaults, options)
    },
    /** Same store, server-backed: syncs across devices, prompts the user on first use. */
    sharedStore: function (namespace, defaults, options) {
      var opts = options || {}
      opts.shared = true
      return createStore(namespace, defaults, opts)
    },
  }

  if (typeof window !== 'undefined') window.knd = knd
  if (typeof module !== 'undefined' && module.exports) module.exports = knd
})()
