/**
 * The extension new tab's first frame: the page Home last drew, back on screen before any app code
 * runs (HAT-1208). src/app/homeSnapshot.ts saves it once Home has appeared; the app loads under it,
 * and src/app/homeSnapshotLayer.ts takes it away in the frame the app's own Home appears, carrying
 * out a click made on it in the meantime. Keep the record's shape in step with homeSnapshot.ts.
 *
 * Runs after theme-bootstrap.js (the theme and Big and Simple it decided) and after #app, before the
 * app's module script. It shows nothing unless every check passes: the extension's own new tab, on
 * Home, a record from this version of the extension, under the same theme, scale and width tier.
 */
(function () {
  var KEY = 'knd:ui:homeSnapshot';
  var LAYER_ID = 'knd-home-snapshot';
  var ON_CLASS = 'knd-home-snapshot-on';
  // Widths where Home's layout changes: Bootstrap's tiers, and the phone layout at 768 and below.
  var WIDTH_STEPS = [576, 768, 769, 992, 1200, 1400];

  function widthTier(width) {
    var tier = 0;
    while (tier < WIDTH_STEPS.length && width >= WIDTH_STEPS[tier]) tier += 1;
    return tier;
  }
  window.__KND_HOME_SNAPSHOT_WIDTH_TIER__ = widthTier;

  function extensionVersion() {
    try {
      var runtime = (window.chrome && window.chrome.runtime) || (window.browser && window.browser.runtime);
      return runtime && runtime.getManifest ? runtime.getManifest().version : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Family Downtime's last answer for this person (src/app/store/familyDowntime.store.ts). The copy
   * shows only on a current answer, for this same person, that says they are not locked out: with
   * none, someone else's, or one past its next start or end, a child may be in downtime, and the app
   * starts as before so its router can send them to the downtime screen. Every person has an answer
   * from their first new tab on.
   */
  function mayBeInDowntime(userId) {
    var saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem('knd:ui:familyDowntime') || 'null');
    } catch (error) {
      return true;
    }
    if (!saved || saved.v !== 1 || saved.userId !== userId || !saved.view) return true;
    if (saved.view.lockedForUser === true) return true;
    var next = saved.view.nextChangeMs;
    return typeof next === 'number' && Date.now() >= next;
  }

  function mark(name) {
    var marks = (window.__KND_BOOT_MARKS__ = window.__KND_BOOT_MARKS__ || []);
    marks.push({ name: name, t: Math.round(performance.now() * 10) / 10 });
  }

  var root = document.documentElement;
  if (root.getAttribute('data-knd-boot') !== 'extension') return;

  // The stylesheets the page starts with: a copy saved later carries only the ones added after them.
  var startLinks = document.querySelectorAll('link[rel="stylesheet"]');
  for (var l = 0; l < startLinks.length; l++) startLinks[l].setAttribute('data-knd-start', '');
  var path = (window.location.hash || '').replace(/^#/, '').split('?')[0] || '/';
  if (path !== '/' && path !== '/index.html') return;

  var record = null;
  try {
    record = JSON.parse(window.localStorage.getItem(KEY) || 'null');
  } catch (error) {
    return;
  }
  if (!record || record.v !== 1 || typeof record.html !== 'string' || !record.html) return;
  if (!record.version || record.version !== extensionVersion()) return;
  if (record.theme !== window.__KND_BOOT_THEME__) return;
  if (record.bigSimple !== (window.__KND_BOOT_BIG_SIMPLE__ === true)) return;
  if (record.widthTier !== widthTier(window.innerWidth)) return;
  if (mayBeInDowntime(record.userId)) return;

  var app = document.getElementById('app');
  if (!app || !app.parentNode) return;

  var layer = document.createElement('div');
  layer.id = LAYER_ID;
  layer.className = 'knd-home-snapshot';
  // A copy to look at: screen readers wait for the live page, and Tab never lands in it.
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = record.html;
  var focusable = layer.querySelectorAll('a[href], button, input, select, textarea, [tabindex], [contenteditable]');
  for (var f = 0; f < focusable.length; f++) focusable[f].setAttribute('tabindex', '-1');

  // Classes Home's own styles read on <html> and <body>. The app sets each of them again before its
  // Home appears (the wallpaper, the scroll bar, the phone layout), so none outlives the copy. One the
  // app has taken off since (the wallpaper's, which it takes off and puts back as it starts) is the
  // app's from then on, and stays when the copy goes.
  var added = { html: [], body: [] };
  function addClasses(element, names, list) {
    if (!element || !Array.isArray(names)) return;
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (typeof name === 'string' && /^[A-Za-z0-9_-]+$/.test(name) && !element.classList.contains(name)) {
        element.classList.add(name);
        list.push(name);
      }
    }
  }
  addClasses(root, record.htmlClasses, added.html);
  addClasses(document.body, record.bodyClasses, added.body);

  // The CSS of Home's parts that load with their code (a component's stylesheet), saved as text so the
  // copy waits for nothing. The app loads the same files itself; this goes with the copy.
  var style = document.createElement('style');
  style.id = LAYER_ID + '-style';
  var styles = Array.isArray(record.styles) ? record.styles : [];
  var css = [];
  for (var s = 0; s < styles.length; s++) {
    if (styles[s] && typeof styles[s].css === 'string') css.push(styles[s].css);
  }
  style.textContent = css.join('\n');

  function classesIn(value) {
    return ' ' + String(value || '').replace(/\s+/g, ' ') + ' ';
  }
  function takeOver(records) {
    for (var r = 0; r < records.length; r++) {
      var target = records[r].target;
      var list = target === root ? added.html : added.body;
      var before = classesIn(records[r].oldValue);
      for (var i = list.length - 1; i >= 0; i--) {
        // Missing before this change (taken off and maybe put back since), or missing now.
        if (before.indexOf(' ' + list[i] + ' ') === -1 || !target.classList.contains(list[i])) list.splice(i, 1);
      }
    }
  }
  var classWatch = typeof MutationObserver === 'function' ? new MutationObserver(takeOver) : null;

  var dropped = false;
  var fading = false;
  function removeCopy() {
    if (classWatch) classWatch.disconnect();
    if (layer.parentNode) layer.parentNode.removeChild(layer);
    if (style.parentNode) style.parentNode.removeChild(style);
    root.classList.remove(ON_CLASS);
    window.__KND_HOME_SNAPSHOT__ = null;
  }
  function drop() {
    if (dropped) return;
    dropped = true;
    if (classWatch) takeOver(classWatch.takeRecords());
    removeCopy();
    // knd-phone follows the window's width, which the copy was saved at; the app sets it by itself.
    // Home, once drawn under the copy, has set the scroll bar's class itself.
    var homeDrawn = !!app.querySelector('.home-reveal');
    for (var h = 0; h < added.html.length; h++) {
      var name = added.html[h];
      if (name !== 'knd-phone' && !(homeDrawn && name === 'knd-no-page-scrollbar')) root.classList.remove(name);
    }
    for (var b = 0; b < added.body.length; b++) if (added.body[b] !== 'knd-phone') document.body.classList.remove(added.body[b]);
  }
  // The live Home is up and differs from the copy: the copy fades off it (loadingapp.css), so the
  // change eases in. Clicks pass through to the live page while it fades.
  function fade() {
    if (dropped || fading) return;
    fading = true;
    root.classList.remove(ON_CLASS);
    window.__KND_HOME_SNAPSHOT__ = null;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      removeCopy();
      return;
    }
    layer.classList.add('knd-home-snapshot--leaving');
    layer.addEventListener('animationend', removeCopy, { once: true });
    window.setTimeout(removeCopy, 400);
  }
  function show() {
    layer.classList.add('knd-home-snapshot--shown');
    // The frame it is drawn in.
    window.requestAnimationFrame(function () { if (!dropped) mark('home_snapshot_drawn'); });
  }

  // A click is held for the live page: the control clicked (a picture or icon inside a card counts
  // as the card), by what identifies it and which of the copy's controls reading the same it is (the
  // sidebar's counts can change, so not its place among all elements), with the keys held. Keep the
  // matching in step with liveElementFor in src/app/homeSnapshotLayer.ts.
  function identity(element) {
    var item = element.closest('[data-home-item-id]');
    return {
      tag: element.tagName,
      text: (element.textContent || '').trim().slice(0, 80),
      label: element.getAttribute('aria-label') || '',
      itemId: item ? item.getAttribute('data-home-item-id') : null,
    };
  }
  function sameControl(element, id) {
    if (element.tagName !== id.tag || (element.getAttribute('aria-label') || '') !== id.label) return false;
    var other = identity(element);
    return other.text === id.text && other.itemId === id.itemId;
  }
  var held = null;
  layer.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var target = event.target && event.target.closest
      ? event.target.closest('a, button, [role="button"], [tabindex], label, input')
      : null;
    if (!target || target === layer || !layer.contains(target)) return;
    var id = identity(target);
    var all = layer.getElementsByTagName('*');
    var occurrence = 0;
    for (var i = 0; i < all.length && all[i] !== target; i++) if (sameControl(all[i], id)) occurrence += 1;
    id.index = occurrence;
    id.keys = { metaKey: !!event.metaKey, ctrlKey: !!event.ctrlKey, shiftKey: !!event.shiftKey, altKey: !!event.altKey };
    held = id;
    // It is carried out when the live page appears; until then the pointer says it is on its way.
    layer.classList.add('knd-home-snapshot--busy');
  }, true);
  // Nothing on the copy takes focus or typing, and the wheel does not scroll the page held under it.
  function refuse(event) { event.preventDefault(); }
  layer.addEventListener('mousedown', refuse, true);
  layer.addEventListener('submit', refuse, true);
  layer.addEventListener('wheel', refuse, { capture: true, passive: false });

  if (css.length) document.head.appendChild(style);
  app.parentNode.insertBefore(layer, app.nextSibling);
  root.classList.add(ON_CLASS);
  if (classWatch) {
    classWatch.observe(root, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    if (document.body) classWatch.observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }
  window.__KND_HOME_SNAPSHOT__ = {
    userId: typeof record.userId === 'string' ? record.userId : null,
    contentKey: typeof record.contentKey === 'string' ? record.contentKey : null,
    layer: layer,
    // Before the app has drawn anything: the copy and the classes it added go.
    drop: drop,
    // The app's own Home is up and has set those classes itself: only the copy goes.
    end: removeCopy,
    // The app's own Home is up but differs from the copy: the copy fades off it.
    fade: fade,
    heldClick: function () { return held; },
  };
  show();

  // A start this slow is not one the copy should cover: it goes, and the start-up logo can show. The
  // classes the app has taken over stay (drop).
  window.setTimeout(function () {
    if (window.__KND_HOME_SNAPSHOT__ && window.__KND_HOME_SNAPSHOT__.layer === layer) {
      drop();
      mark('home_snapshot_timed_out');
    }
  }, 2500);
})();
