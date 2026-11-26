(function () {
  var validThemes = ['light', 'dark', 'neon', 'pastel', 'primary'];

  function normalizeThemeName(value) {
    if (value === 'true') return 'dark';
    if (value === 'false') return 'light';
    if (validThemes.indexOf(String(value)) >= 0) return String(value);
    return null;
  }

  function resolveThemeName() {
    var storedMode = null;

    try {
      storedMode = window.localStorage.getItem('knd:ui:ui:mode');
    } catch (error) {
      storedMode = null;
    }

    // 'system' (Match device) and nothing stored both follow the device.
    var normalizedTheme = normalizeThemeName(storedMode);
    if (normalizedTheme) return normalizedTheme;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  function isDarkTheme(themeName) {
    return themeName === 'dark' || themeName === 'neon';
  }

  function resolveThemeBackgroundColor(themeName) {
    if (themeName === 'dark') return '#121212';
    if (themeName === 'neon') return '#0a0a15';
    if (themeName === 'pastel') return '#fff5f0';
    if (themeName === 'primary') return '#ffffff';
    return '#f9f9f9';
  }

  function applyDocumentTheme(themeName) {
    var root = document.documentElement;
    var darkTheme = isDarkTheme(themeName);
    var backgroundColor = resolveThemeBackgroundColor(themeName);

    root.setAttribute('data-bs-theme', darkTheme ? 'dark' : 'light');
    root.style.colorScheme = darkTheme ? 'dark' : 'light';
    root.style.backgroundColor = backgroundColor;
    root.classList.remove('knd-pretheme-dark', 'knd-pretheme-light');
    root.classList.add(darkTheme ? 'knd-pretheme-dark' : 'knd-pretheme-light');
  }

  function applyBodyTheme(themeName) {
    var body = document.body;
    if (!body) return false;

    body.classList.remove('light', 'dark', 'theme-dark', 'theme-neon', 'theme-pastel', 'theme-primary');

    if (themeName === 'dark') {
      body.classList.add('dark', 'theme-dark');
    } else if (themeName === 'neon') {
      body.classList.add('dark', 'theme-neon');
    } else if (themeName === 'pastel') {
      body.classList.add('light', 'theme-pastel');
    } else if (themeName === 'primary') {
      body.classList.add('light', 'theme-primary');
    } else {
      body.classList.add('light');
    }

    body.style.backgroundColor = resolveThemeBackgroundColor(themeName);
    return true;
  }

  /**
   * "Big and Simple" appearance scale — an axis orthogonal to the colour theme,
   * mirrored from the synced userPref so it can be stamped before first paint.
   * Without this, every cold boot renders the unscaled layout until Vue resolves
   * prefs. Kept in step with src/app/store/appearanceScale.store.ts.
   */
  function resolveBigSimple() {
    try {
      return window.localStorage.getItem('knd:ui:appearance:bigSimple') === 'true';
    } catch (error) {
      return false;
    }
  }

  function applyBigSimple(enabled) {
    // <html> carries the rem base; <body> is stamped separately because
    // teleported content (modals, dropdowns) renders outside the app root.
    document.documentElement.classList.toggle('knd-big-simple', enabled);
    if (!document.body) return false;
    document.body.classList.toggle('knd-big-simple', enabled);
    return true;
  }

  /**
   * The first frame of the extension new tab, the iPhone app and the website: the wallpaper Home
   * last showed, painted on the start-up logo's layer (#knd-boot) instead of a plain colour while
   * the app loads (HAT-642, HAT-685). `data-knd-boot` on <html> opts a page in:
   * index_extension.html and kindredapp/index.html carry it, and the build adds it to the iPhone
   * app's page. Recorded by src/app/bootWallpaper.ts; keep the two
   * shapes in step. Only on Home, whose reveal waits for its own wallpaper (Search lets the layer
   * go before its picture has decoded, so the wallpaper would blink out and back), and only under
   * the theme it was recorded in. css/loadingapp.css lays the layer out.
   */
  var BOOT_TARGETS = ['extension', 'ios', 'web'];
  var BOOT_WALLPAPER_KEY = 'knd:ui:appearance:bootWallpaper';
  var WALLPAPER_PATHS = ['/', '/index.html'];
  var BOOT_IMAGE_PATTERN = /^url\("(\/bgs\/[A-Za-z0-9_.-]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+)"\)$/;
  // grad2 and grad3 unset the body colour, which reads back as rgba(0, 0, 0, 0): a layer that hides nothing.
  var SEE_THROUGH_COLOR = /^rgba\((?:[^,]+,){3}\s*0(?:\.0*)?\s*\)$/;

  function resolveBootWallpaper(themeName) {
    if (BOOT_TARGETS.indexOf(document.documentElement.getAttribute('data-knd-boot')) < 0) return null;
    var path = (window.location.hash || '').replace(/^#/, '').split('?')[0] || '/';
    if (WALLPAPER_PATHS.indexOf(path) < 0) return null;

    var record = null;
    try {
      record = JSON.parse(window.localStorage.getItem(BOOT_WALLPAPER_KEY) || 'null');
    } catch (error) {
      return null;
    }

    if (!record || record.v !== 1 || record.theme !== themeName) return null;
    if (typeof record.color !== 'string' || !/^(#|rgb)/.test(record.color) || SEE_THROUGH_COLOR.test(record.color)) return null;
    if (record.image != null && (typeof record.image !== 'string' || !BOOT_IMAGE_PATTERN.test(record.image))) return null;
    return record;
  }

  function applyBootWallpaper(record) {
    var root = document.documentElement;
    root.style.setProperty('--knd-boot-wallpaper-color', record.color);
    root.style.setProperty('--knd-boot-wallpaper-image', record.image || 'none');
    root.classList.add('knd-boot-wallpaper');
  }

  var themeName = window.__KND_BOOT_THEME__ || resolveThemeName();
  window.__KND_BOOT_THEME__ = themeName;

  var bigSimple = resolveBigSimple();
  window.__KND_BOOT_BIG_SIMPLE__ = bigSimple;

  applyDocumentTheme(themeName);

  var bootWallpaper = resolveBootWallpaper(themeName);
  if (bootWallpaper) applyBootWallpaper(bootWallpaper);

  /**
   * The block page's first frame (HAT-799): its shield, drawn on the start-up layer (#knd-boot) by
   * css/loadingapp.css in the spot the page puts it, instead of a blank screen and, on a slow phone,
   * the spinning logo. Only where the page shows that shield: Family Downtime and the "what now?"
   * stage (`intervention=1`) have screens of their own. The icon is recorded on <html>, and
   * views/access_request/Blocked.vue takes the drawing over only when it shows the same one.
   */
  function resolveBlockedBadge() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash.split('?')[0] !== '/blocked') return null;
    var params;
    try {
      params = new URLSearchParams(hash.split('?')[1] || '');
    } catch (error) {
      return null;
    }
    if (params.get('blockType') === 'downtime' || params.get('intervention') === '1') return null;
    // While the block page shows inspiration in the shield's spot (HAT-1216), a picture or a line on
    // its own, the first frame is the theme colour alone: drawing a shield that then turns into a
    // painting or a quote is the flash to avoid. Recorded by
    // src/app/inspiration/inspirationLibrary.ts (rememberInspirationShown). A check-in block keeps
    // its shield, but its reason is not on the address (a child could change it), so its first frame
    // is the colour alone too, and the page fades in over it.
    if (resolveInspirationShown()) return 'none';
    return params.get('blockType') === 'time' ? 'clock-history' : 'shield-fill';
  }

  // Nothing recorded yet (a new device, cleared data) counts as shown: it is on by default, and
  // the first block on a device is the one that fetches a picture (HAT-1261, HAT-1267).
  function resolveInspirationShown() {
    try {
      return window.localStorage.getItem('knd:ui:blockedPage:inspiration') !== '0';
    } catch (error) {
      return true;
    }
  }

  var blockedBadge = resolveBlockedBadge();
  if (blockedBadge) {
    document.documentElement.classList.add('knd-boot-blocked');
    document.documentElement.setAttribute('data-knd-boot-badge', blockedBadge);
  }

  var bodyThemeApplied = applyBodyTheme(themeName);
  var bodyScaleApplied = applyBigSimple(bigSimple);

  if (!bodyThemeApplied || !bodyScaleApplied) {
    document.addEventListener('DOMContentLoaded', function () {
      applyBodyTheme(window.__KND_BOOT_THEME__ || themeName);
      applyBigSimple(window.__KND_BOOT_BIG_SIMPLE__ === true);
    }, { once: true });
  }

  /**
   * An extension page starts opening its local database here, while the app's code loads
   * (HAT-1208). The app's first read (who is signed in) otherwise opened it only once all of that
   * code had run, and the first open of a page is the slow one. This connection reads nothing: it
   * never creates the database (a first start leaves that to the app's own schema), closes for an
   * upgrade, and closes once the app has had time to open its own. The name is DB_NAME in
   * src/core/storage/AppDatabase.ts.
   */
  function startOpeningAppDatabase() {
    if (!/^(chrome|moz)-extension:$/.test(window.location.protocol)) return;
    if (!window.indexedDB) return;
    try {
      var request = window.indexedDB.open('kindredly_app');
      request.onupgradeneeded = function () {
        try {
          request.transaction.abort();
        } catch (error) {
          // Already ending.
        }
      };
      request.onsuccess = function () {
        var db = request.result;
        db.onversionchange = function () {
          db.close();
        };
        window.setTimeout(function () {
          db.close();
        }, 5000);
      };
      request.onerror = function (event) {
        // No database yet, or storage refused: the app's own open reports what matters.
        if (event && event.preventDefault) event.preventDefault();
      };
    } catch (error) {
      // Storage unavailable here: the app opens it as before.
    }
  }

  startOpeningAppDatabase();
})();