/**
 * The App Builder's hands: how it tries an app the way a person would (HAT-101).
 *
 * Loaded by sandbox.html and sandbox-nonet.html, and inert until the host sends a `test-step`
 * message — an ordinary app run never calls it. The host only sends one to the App Builder's
 * hidden test frame, whose storage writes are thrown away (AppIFrame `testRun`), so a test that
 * presses Delete deletes nothing.
 *
 * `window.__kndTest.run(step)` performs one step and says what happened:
 *
 *   click      a button, link, checkbox or any text on screen, found by its words
 *   type       text into a field found by its label, placeholder or name (replaces what it held)
 *   press      a key — Enter, Escape, an arrow, a letter — on a field, a button or the game canvas
 *   select     an option of a <select>, by its text
 *   expect     wait up to 2 s for text to be on screen
 *   expectnot  wait up to 2 s for text to be gone
 *   wait       let time pass
 *   probe      the generic check `checkapp` runs: fill every field, press the main button, type
 *              one character. Also what `evals/harness/renderApp.ts` runs, so there is one probe.
 *
 * Everything is found the way a person finds it — a button by its words, a field by its label —
 * because that is what the model sees in the DOM summary, and because a test that clicks
 * `#btn-3` passes on an app whose button nobody could find. A CSS selector is the fallback.
 */
;(function () {
  'use strict'

  // Long enough for knd.store's 250ms save and the render that follows it.
  var SETTLE_MS = 300
  var EXPECT_WAIT_MS = 2000
  var TYPE_CHAR_MS = 12
  var MAX_TYPED = 200
  var PROBE_TEXT = '<b>Probe</b>'

  function norm(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  }
  function low(s) {
    return norm(s).toLowerCase()
  }
  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms) })
  }
  function quote(s, max) {
    var t = norm(s)
    var cap = max || 60
    return '“' + (t.length > cap ? t.slice(0, cap) + '…' : t) + '”'
  }
  function all(selector, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector))
    } catch (e) {
      return []
    }
  }

  // jsdom (the unit tests) has no layout. A real browser always does, even in the 1px hidden frame.
  function hasLayout() {
    var body = document.body
    return !!body && body.getBoundingClientRect().width > 0
  }

  function isShown(el, layout) {
    if (!el || el.nodeType !== 1 || !el.isConnected) return false
    if (el.closest('[hidden]')) return false
    var own = window.getComputedStyle(el)
    if (own.visibility === 'hidden') return false
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (window.getComputedStyle(n).display === 'none') return false
    }
    if (layout) {
      var r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
    }
    return true
  }

  function textOf(el) {
    // innerText follows CSS (hidden text is not read); jsdom does not implement it.
    return norm(typeof el.innerText === 'string' && hasLayout() ? el.innerText : el.textContent)
  }

  /** A label's words without the words of the controls inside it (a <select>'s options). */
  function labelText(label) {
    var clone = label.cloneNode(true)
    all('input, select, textarea, button', clone).forEach(function (c) { c.remove() })
    return norm(clone.textContent)
  }

  /** What a person would call this control. */
  function nameOf(el) {
    var aria = norm(el.getAttribute('aria-label'))
    if (aria) return aria
    var by = el.getAttribute('aria-labelledby')
    if (by) {
      var joined = norm(by.split(/\s+/).map(function (id) {
        var n = document.getElementById(id)
        return n ? textOf(n) : ''
      }).join(' '))
      if (joined) return joined
    }
    if (el.tagName === 'INPUT') {
      var type = (el.getAttribute('type') || 'text').toLowerCase()
      if (type === 'submit' || type === 'reset' || type === 'button') {
        return norm(el.value) || (type === 'submit' ? 'Submit' : type === 'reset' ? 'Reset' : '')
      }
    }
    var text = textOf(el)
    if (text) return text
    var titled = norm(el.getAttribute('title') || el.getAttribute('alt'))
    if (titled) return titled
    // An icon-only button: the icon's own name is the best there is.
    var icon = el.querySelector && el.querySelector('knd-icon[name], img[alt]')
    if (icon) return norm(icon.getAttribute('name') || icon.getAttribute('alt'))
    return ''
  }

  function fieldNames(el) {
    var names = []
    if (el.labels) {
      for (var i = 0; i < el.labels.length; i++) names.push(labelText(el.labels[i]))
    }
    names.push(el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.getAttribute('name'), el.id, el.getAttribute('title'))
    return names.map(norm).filter(Boolean)
  }

  function inputType(el) {
    if (el.tagName === 'INPUT') return (el.getAttribute('type') || 'text').toLowerCase()
    return el.tagName.toLowerCase()
  }

  var NOT_TYPEABLE = ['hidden', 'button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file']
  var TEXTISH = ['text', 'search', 'url', 'tel', 'email', 'password', 'textarea']

  function fields() {
    var layout = hasLayout()
    return all('input, textarea, select, [contenteditable=""], [contenteditable="true"]').filter(function (el) {
      return NOT_TYPEABLE.indexOf(inputType(el)) < 0 && isShown(el, layout)
    })
  }

  function bySelector(query) {
    try {
      var el = document.querySelector(query)
      return el && isShown(el, hasLayout()) ? el : null
    } catch (e) {
      return null
    }
  }

  function findField(query) {
    var list = fields()
    if (!norm(query)) return list[0] || null
    var q = low(query)
    var exact = list.filter(function (el) { return fieldNames(el).some(function (n) { return low(n) === q }) })
    if (exact.length) return exact[0]
    var partial = list.filter(function (el) { return fieldNames(el).some(function (n) { return low(n).indexOf(q) >= 0 }) })
    if (partial.length) return partial[0]
    var picked = bySelector(query)
    return picked && /^(INPUT|TEXTAREA|SELECT)$/.test(picked.tagName) ? picked : null
  }

  var CLICKABLE = [
    'button', 'a', 'summary', 'label', 'select',
    'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]', 'input[type="checkbox"]', 'input[type="radio"]',
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]', '[role="option"]', '[role="switch"]',
    '[role="checkbox"]', '[tabindex]', '[onclick]',
  ].join(', ')

  function namesFor(el) {
    var names = [nameOf(el)]
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') names = names.concat(fieldNames(el))
    return names.filter(Boolean)
  }

  function findClickable(query) {
    var q = low(query)
    if (!q) return null
    var layout = hasLayout()
    var cands = all(CLICKABLE).filter(function (el) { return isShown(el, layout) })
    var exact = cands.filter(function (el) { return namesFor(el).some(function (n) { return low(n) === q }) })
    if (exact.length) return exact[0]
    var partial = cands.filter(function (el) { return namesFor(el).some(function (n) { return low(n).indexOf(q) >= 0 }) })
    if (partial.length) {
      // "Add" should find "Add" before "Add a reminder": the shortest name is the closest match.
      partial.sort(function (a, b) { return nameOf(a).length - nameOf(b).length })
      return partial[0]
    }
    // Anything showing those words: a flashcard, a list row, a tile. The innermost element wins,
    // because the whole page also "contains" the text.
    var shown = all('body *').filter(function (el) {
      return !/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName) && isShown(el, layout)
    })
    var best = null
    var bestLen = Infinity
    shown.forEach(function (el) {
      var t = low(textOf(el))
      if (t.indexOf(q) < 0) return
      if (t.length <= bestLen) {
        best = el
        bestLen = t.length
      }
    })
    return best || bySelector(query)
  }

  function describeButtons() {
    var layout = hasLayout()
    var names = all('button, [role="button"], a, input[type="submit"], input[type="button"]')
      .filter(function (el) { return isShown(el, layout) })
      .map(nameOf)
      .filter(Boolean)
      .slice(0, 8)
    return names.length ? 'Buttons on screen: ' + names.map(function (n) { return quote(n, 30) }).join(', ') + '.' : 'There are no buttons on screen.'
  }

  function describeFields() {
    var list = fields().slice(0, 8).map(function (el) {
      var name = fieldNames(el)[0] || '(no label)'
      return quote(name, 30) + ' (' + inputType(el) + ')'
    })
    return list.length ? 'Fields on screen: ' + list.join(', ') + '.' : 'There are no fields on screen.'
  }

  /** Everything a person can read: the page's text plus what the fields hold. */
  function screenText() {
    var body = document.body
    if (!body) return ''
    var parts = [textOf(body)]
    fields().forEach(function (el) {
      if (el.tagName === 'SELECT') {
        var opt = el.options[el.selectedIndex]
        if (opt) parts.push(opt.text)
      } else if (typeof el.value === 'string' && el.value) {
        parts.push(el.value)
      }
    })
    return norm(parts.join(' '))
  }

  function snapshot() {
    return { text: screenText(), count: document.body ? document.body.querySelectorAll('*').length : 0 }
  }
  function changedSince(before) {
    var now = snapshot()
    return now.text !== before.text || now.count !== before.count
  }

  function fire(el, type, init) {
    var opts = Object.assign({ bubbles: true, cancelable: true, composed: true }, init || {})
    var ev
    try {
      if (/^pointer/.test(type) && typeof PointerEvent === 'function') ev = new PointerEvent(type, opts)
      else if (/^(mouse|click)/.test(type)) ev = new MouseEvent(type, opts)
      else ev = new Event(type, opts)
    } catch (e) {
      ev = new Event(type, opts)
    }
    el.dispatchEvent(ev)
    return ev
  }

  function clickEl(el) {
    var r = el.getBoundingClientRect()
    var at = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 }
    // Some apps listen for pointerdown, some for mousedown, most for click. A finger sends all three.
    fire(el, 'pointerdown', at)
    fire(el, 'mousedown', at)
    fire(el, 'pointerup', at)
    fire(el, 'mouseup', at)
    el.click()
  }

  var KEY_NAMES = {
    enter: 'Enter', return: 'Enter', space: ' ', spacebar: ' ', esc: 'Escape', escape: 'Escape',
    tab: 'Tab', backspace: 'Backspace', delete: 'Delete', del: 'Delete',
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
  }
  var KEY_CODES = { Enter: 13, ' ': 32, Escape: 27, Tab: 9, Backspace: 8, Delete: 46, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }

  function normalizeKey(raw) {
    var s = String(raw == null ? '' : raw)
    if (s === ' ') return ' '
    s = s.trim()
    if (!s) return ''
    if (s.length === 1) return s
    return KEY_NAMES[s.toLowerCase()] || s
  }

  function keyEvent(type, key) {
    var code = key === ' ' ? 'Space' : /^[a-z]$/i.test(key) ? 'Key' + key.toUpperCase() : /^[0-9]$/.test(key) ? 'Digit' + key : key
    var keyCode = KEY_CODES[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0)
    var ev
    try {
      ev = new KeyboardEvent(type, { key: key, code: code, bubbles: true, cancelable: true, composed: true })
    } catch (e) {
      ev = new Event(type, { bubbles: true, cancelable: true })
      try { Object.defineProperty(ev, 'key', { get: function () { return key } }) } catch (e2) { /* ignore */ }
    }
    // Older code still reads keyCode, which the constructor cannot set.
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return keyCode } }) } catch (e) { /* ignore */ }
    try { Object.defineProperty(ev, 'which', { get: function () { return keyCode } }) } catch (e) { /* ignore */ }
    return ev
  }

  /**
   * Enter in a field submits its form only when the browser would: the form has a submit button,
   * or this is its only text field. A synthetic key press gets none of this for free, and pressing
   * Enter in a form a person could not submit must not pass.
   */
  function implicitSubmit(field) {
    var form = field.form
    if (!form) return false
    var submitter = form.querySelector('button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]')
    var textFields = all('input', form).filter(function (el) { return NOT_TYPEABLE.indexOf(inputType(el)) < 0 })
    if (!submitter && textFields.length !== 1) return false
    if (submitter && submitter.disabled) return false
    if (typeof form.requestSubmit === 'function') form.requestSubmit(submitter || undefined)
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    return true
  }

  // --- The field being typed into, by identity rather than by node -------------------------------
  // A re-render legitimately replaces the node (knd.paint does, and puts the caret back), so
  // comparing element references would fail every correct app. What a person notices is whether
  // THE FIELD still has the caret.
  var lastField = null

  function identify(el) {
    return { tag: el.tagName, id: el.id || '', name: el.getAttribute('name') || '', label: fieldNames(el)[0] || '', index: fields().indexOf(el) }
  }
  function isSameField(el, ident) {
    if (!el || !ident || el.tagName !== ident.tag) return false
    if (ident.id) return el.id === ident.id
    if (ident.name) return el.getAttribute('name') === ident.name
    return (fieldNames(el)[0] || '') === ident.label
  }
  function refind(ident) {
    if (!ident) return null
    var list = fields()
    for (var i = 0; i < list.length; i++) if (isSameField(list[i], ident)) return list[i]
    return ident.index >= 0 && list[ident.index] && list[ident.index].tagName === ident.tag ? list[ident.index] : null
  }
  function tryFocus(el) {
    try { el.focus({ preventScroll: true }) } catch (e) { /* ignore */ }
    return document.activeElement === el
  }

  function ok(note, extra) {
    return Object.assign({ ok: true }, note ? { note: note } : {}, extra || {})
  }
  function fail(note, extra) {
    return Object.assign({ ok: false, note: note }, extra || {})
  }

  // --- Steps -------------------------------------------------------------------------------------

  async function doClick(step) {
    var target = step.target != null ? step.target : step.text
    var el = findClickable(target)
    if (!el) return fail('Nothing on screen matches ' + quote(target) + '. ' + describeButtons())
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return fail(quote(nameOf(el) || target) + ' is disabled.')
    var before = snapshot()
    clickEl(el)
    await sleep(SETTLE_MS)
    return changedSince(before) ? ok('') : ok('Nothing on screen changed.')
  }

  async function setWholeValue(el, text) {
    el.value = text
    fire(el, 'input')
    fire(el, 'change')
    await sleep(SETTLE_MS)
  }

  async function doType(step) {
    var el = findField(step.target)
    if (!el) return fail((norm(step.target) ? 'No field matches ' + quote(step.target) + '. ' : 'There is no field to type into. ') + describeFields())
    if (el.disabled) return fail(quote(fieldNames(el)[0] || step.target) + ' is disabled.')
    if (el.readOnly) return fail(quote(fieldNames(el)[0] || step.target) + ' is read-only.')
    var text = String(step.text == null ? '' : step.text).slice(0, MAX_TYPED)
    if (el.tagName === 'SELECT') return selectOption(el, text)
    lastField = identify(el)
    var type = inputType(el)

    if (el.isContentEditable) {
      el.textContent = text
      fire(el, 'input')
      await sleep(SETTLE_MS)
      return ok('')
    }

    // A number, a date, a colour: the browser takes the whole value or nothing, so give it whole.
    if (TEXTISH.indexOf(type) < 0) {
      await setWholeValue(el, text)
      var after = refind(lastField)
      if (after && text && after.value !== text) return fail(quote(fieldNames(el)[0] || type) + ' did not take ' + quote(text) + ' — a ' + type + ' field.')
      return ok('')
    }

    // Text arrives one character at a time, the way a keyboard delivers it. An app that re-renders
    // the field on every keystroke is caught here the way a person catches it: mid-word.
    var tracksFocus = tryFocus(el)
    el.value = ''
    fire(el, 'input')
    var lost = ''
    var current = el
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i)
      if (tracksFocus) {
        var active = document.activeElement
        if (isSameField(active, lastField)) {
          current = active
        } else {
          if (!lost) {
            lost = i === 0
              ? 'Clearing ' + quote(lastField.label || type) + ' took the caret out of it — a re-render replaced the field.'
              : 'After typing ' + quote(text.slice(0, i)) + ', the field lost the caret — a re-render replaced it, so a person\'s next letters would go nowhere.'
          }
          current = refind(lastField)
          if (current) tryFocus(current)
        }
      } else {
        current = refind(lastField) || current
      }
      if (!current || !current.isConnected) return fail('The field disappeared after typing ' + quote(text.slice(0, i)) + '.')
      var down = keyEvent('keydown', ch)
      current.dispatchEvent(down)
      if (!down.defaultPrevented) {
        current.dispatchEvent(keyEvent('keypress', ch))
        current.value = (current.value || '') + ch
        var input
        try {
          input = new InputEvent('input', { bubbles: true, cancelable: false, data: ch, inputType: 'insertText' })
        } catch (e) {
          input = new Event('input', { bubbles: true })
        }
        current.dispatchEvent(input)
      }
      current.dispatchEvent(keyEvent('keyup', ch))
      await sleep(TYPE_CHAR_MS)
    }
    var final = refind(lastField) || current
    if (final) fire(final, 'change')
    await sleep(SETTLE_MS)
    if (lost) return fail(lost)
    final = refind(lastField)
    if (final && text && low(final.value).indexOf(low(text)) < 0) {
      return fail('After typing ' + quote(text) + ', the field holds ' + quote(final.value) + ' — a re-render overwrote it.')
    }
    return ok('')
  }

  async function selectOption(el, wanted) {
    var q = low(wanted)
    var opts = Array.prototype.slice.call(el.options || [])
    var match = opts.find(function (o) { return low(o.text) === q || low(o.value) === q }) ||
      opts.find(function (o) { return low(o.text).indexOf(q) >= 0 })
    if (!match) {
      return fail('No option ' + quote(wanted) + '. Options: ' + opts.slice(0, 10).map(function (o) { return quote(o.text, 30) }).join(', ') + '.')
    }
    lastField = identify(el)
    var before = snapshot()
    el.value = match.value
    fire(el, 'input')
    fire(el, 'change')
    await sleep(SETTLE_MS)
    return changedSince(before) ? ok('') : ok('Nothing on screen changed.')
  }

  async function doSelect(step) {
    var el = findField(step.target)
    if (el && el.tagName === 'SELECT') return selectOption(el, step.text)
    // A radio group reads as a choice too: pick the radio whose label is the option.
    var radio = findClickable(step.text)
    if (radio && radio.tagName === 'INPUT' && inputType(radio) === 'radio') return doClick({ target: step.text })
    return fail('No list matches ' + quote(step.target) + '. ' + describeFields())
  }

  function pressTarget() {
    var field = refind(lastField)
    if (field) return field
    var active = document.activeElement
    if (active && active !== document.body && active !== document.documentElement) return active
    return document.querySelector('canvas') || document.body
  }

  async function doPress(step) {
    var key = normalizeKey(step.key != null ? step.key : step.text)
    if (!key) return fail('press needs a key, for example { "action": "press", "key": "Enter" }.')
    var el = pressTarget()
    if (norm(step.target)) {
      el = findField(step.target) || findClickable(step.target)
      if (!el) return fail('Nothing on screen matches ' + quote(step.target) + '. ' + describeButtons())
    }
    var before = snapshot()
    var down = keyEvent('keydown', key)
    el.dispatchEvent(down)
    if (key.length === 1 || key === 'Enter') el.dispatchEvent(keyEvent('keypress', key))
    // Holding a key is how a game moves a sprite more than a pixel.
    var hold = Math.max(0, Math.min(3000, Number(step.ms) || 0))
    if (hold) await sleep(hold)
    el.dispatchEvent(keyEvent('keyup', key))
    if (!down.defaultPrevented) {
      var tag = el.tagName
      if (key === 'Enter' && tag === 'INPUT') implicitSubmit(el)
      else if ((key === 'Enter' || key === ' ') && (tag === 'BUTTON' || el.getAttribute('role') === 'button')) el.click()
    }
    await sleep(SETTLE_MS)
    return changedSince(before) ? ok('') : ok('Nothing on screen changed.')
  }

  async function doExpect(step, present) {
    var raw = step.text != null ? step.text : step.target
    var want = low(raw)
    if (!want) return fail((present ? 'expect' : 'expectnot') + ' needs text, for example { "action": "expect", "text": "Milk" }.')
    var deadline = Date.now() + EXPECT_WAIT_MS
    for (;;) {
      var has = low(screenText()).indexOf(want) >= 0
      if (has === present) return ok('')
      if (Date.now() >= deadline) break
      await sleep(100)
    }
    return present
      ? fail(quote(raw) + ' is not on screen. The screen shows: ' + quote(screenText(), 300))
      : fail(quote(raw) + ' is still on screen.')
  }

  async function doWait(step) {
    await sleep(Math.max(0, Math.min(5000, Number(step.ms) || 500)))
    return ok('')
  }

  /**
   * The generic check (APPQ-17, moved here from the eval harness so the product and the eval run
   * the same one). It knows nothing about what any app means. It fills whatever fields it finds,
   * presses the one button that looks like the primary action, and reports three things that are
   * unambiguous whatever the app is: it threw (the host collects that), nothing happened, or the
   * text it typed came back as live HTML.
   *
   * The probe text is deliberately markup. An app that concatenates user input into `innerHTML`
   * turns it into a real <b> element; one that escapes, or uses textContent, shows the characters.
   */
  async function probe() {
    var doc = document
    var app = doc.getElementById('app')
    if (!app) return { attempted: false, reason: 'no #app' }

    // A game or a drawing pad is driven entirely through pixels. Pressing its left-arrow pad moves
    // a sprite and changes no text at all, so "nothing happened" would be a lie about a working
    // app. Nothing here can tell a moved sprite from a dead button, so it declines to guess.
    if (doc.querySelector('canvas')) return { attempted: false, reason: 'canvas app — no form to drive' }

    var layout = hasLayout()
    var before = {
      text: textOf(app),
      children: app.querySelectorAll('*').length,
      bolds: app.querySelectorAll('b').length,
    }

    // Fill every field the user could type in. A number field gets a number: an app that parses
    // "<b>Probe</b>" as pages-read and renders NaN is a different bug, and not this one's.
    //
    // One field at a time, found again each time: an app that redraws on every keystroke replaces
    // the fields, and filling the node that was there a moment ago fills nothing. After each one,
    // check the fields already filled still hold what was typed. A recipe box redrew its whole
    // screen when the search box changed, which wiped the half-typed recipe, and the probe used to
    // report that as "Add recipe does nothing" — true, and blaming the wrong thing.
    var filled = 0
    var done = []
    var cleared = null
    var targets = all('input, textarea, select', app)
      .filter(function (el) {
        var type = inputType(el)
        return !(type === 'checkbox' || type === 'radio' || type === 'hidden' || type === 'button' || type === 'submit')
      })
      .map(identify)
    targets.forEach(function (ident) {
      var el = refind(ident)
      if (!el) return
      var type = inputType(el)
      if (el.tagName === 'SELECT') {
        if (el.options.length > 0) el.selectedIndex = 0
      } else if (type === 'number' || el.getAttribute('inputmode') === 'numeric') {
        el.value = '7'
      } else if (type === 'date') {
        el.value = '2026-01-02'
      } else {
        el.value = PROBE_TEXT
      }
      fire(el, 'input')
      fire(el, 'change')
      filled++
      // What the field holds once the app has reacted — an app that formats "7" as "7.00" has
      // not wiped anything.
      var settled = refind(ident)
      var value = settled ? settled.value : el.value
      if (!cleared) {
        // Only a field that went EMPTY: that is the redraw wiping it, not the app reformatting.
        var lost = done.filter(function (d) {
          var now = refind(d.ident)
          return now && d.value !== '' && now.value === ''
        })
        if (lost.length) cleared = { by: ident.label || type, lost: lost.map(function (d) { return d.ident.label || 'a field' }) }
      }
      done.push({ ident: ident, value: value })
    })

    // The primary action, as a person would read it: a submit button, else the first button that
    // is not obviously a setting, a reset or a navigation control. The avoid-list gates
    // EVERYTHING, including the submit preference: a chore chart put "Reset all chores" and
    // "Add chore" in two separate forms, both type=submit, and preferring submit first pressed
    // Reset, saw the empty list stay empty, and reported a working app as broken.
    // Searching is not the main action either: pressing "Search" over an empty list rightly
    // changes nothing, and reported a working recipe box as a dead button.
    var AVOID = /setting|reset|clear|delete|remove|close|cancel|menu|option|undo|back|next|prev|shuffle|search|find|filter/i
    var visible = all('button, [role="button"]', app).filter(function (b) { return isShown(b, layout) && !b.disabled })
    var safe = visible.filter(function (b) { return !AVOID.test(nameOf(b)) })
    var primary = safe.find(function (b) { return (b.getAttribute('type') || '') === 'submit' }) || safe[0]
    // Only destructive or navigational controls on screen means there is no primary action to test.
    if (!primary) return { attempted: false, reason: 'no primary action to press', filled: filled }

    var label = (nameOf(primary) || 'button').slice(0, 30)
    var threw = null
    try {
      primary.click()
    } catch (e) {
      threw = String((e && e.message) || e).slice(0, 300)
    }
    await sleep(450)

    // Does typing survive? A parent hit this in the real app: the notes app mirrored the title
    // field into knd.store on every keystroke, the store fired onChange, render() replaced
    // app.innerHTML, and the caret left the field after a single letter.
    //
    // Allowlisted, not denylisted. A number or date input REJECTS the letter this types, which
    // would read as "wiped by a re-render" and fail a perfectly good app.
    var keepsFocus = true
    var focusDetail = ''
    var typeable = all('input, textarea', app).filter(function (el) {
      if (!isShown(el, layout)) return false
      if (el.tagName === 'TEXTAREA') return true
      return ['text', 'search', 'url', 'tel', 'email', 'password'].indexOf(inputType(el)) >= 0
    })
    if (typeable.length) {
      var field = typeable[0]
      var mark = { id: field.id || '', name: field.getAttribute('name') || '', tag: field.tagName }
      // Focus from a hidden frame may be refused (Chromium asks for a user gesture). Then there is
      // no caret to lose and nothing to report — never a failure.
      if (tryFocus(field)) {
        field.value = (field.value || '') + 'a'
        fire(field, 'input')
        await sleep(350)
        var now = document.activeElement
        var same =
          !!now &&
          now.tagName === mark.tag &&
          (mark.id ? now.id === mark.id : true) &&
          (mark.name ? (now.getAttribute && now.getAttribute('name')) === mark.name : true)
        if (!same) {
          keepsFocus = false
          focusDetail =
            now && (now.tagName === 'INPUT' || now.tagName === 'TEXTAREA')
              ? 'the caret jumped to a different field'
              : 'the field lost the caret — a re-render replaced it and nothing put focus back'
        } else if (String(now.value || '').indexOf('a') < 0) {
          keepsFocus = false
          focusDetail = 'the typed character was wiped by a re-render'
        }
      }
    }

    var after = {
      text: textOf(app),
      children: app.querySelectorAll('*').length,
      bolds: app.querySelectorAll('b').length,
    }
    return {
      attempted: true,
      filled: filled,
      clearedFields: cleared
        ? 'Typing into ' + quote(cleared.by) + ' cleared ' + cleared.lost.map(function (l) { return quote(l) }).join(', ')
        : '',
      clicked: label,
      threw: threw,
      // A real <b> that was not there before means the probe was parsed as markup, not shown as text.
      injectedHtml: after.bolds > before.bolds,
      keepsFocus: keepsFocus,
      focusDetail: focusDetail,
      // Either the page redrew, or it said something. Both count as "the button did something".
      changed: after.text !== before.text || after.children !== before.children,
      textAfter: after.text.slice(0, 200),
    }
  }

  async function run(step) {
    var s = step && typeof step === 'object' ? step : {}
    switch (String(s.action || '').toLowerCase()) {
      case 'click': return doClick(s)
      case 'type': return doType(s)
      case 'press': return doPress(s)
      case 'select': return doSelect(s)
      case 'expect': return doExpect(s, true)
      case 'expectnot': return doExpect(s, false)
      case 'wait': return doWait(s)
      case 'probe': return ok('', { probe: await probe() })
      default: return fail('Unknown step ' + quote(s.action) + '.')
    }
  }

  window.__kndTest = { run: run, probe: probe }
})()
