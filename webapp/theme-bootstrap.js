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

  var themeName = window.__KND_BOOT_THEME__ || resolveThemeName();
  window.__KND_BOOT_THEME__ = themeName;

  var bigSimple = resolveBigSimple();
  window.__KND_BOOT_BIG_SIMPLE__ = bigSimple;

  applyDocumentTheme(themeName);

  var bodyThemeApplied = applyBodyTheme(themeName);
  var bodyScaleApplied = applyBigSimple(bigSimple);

  if (!bodyThemeApplied || !bodyScaleApplied) {
    document.addEventListener('DOMContentLoaded', function () {
      applyBodyTheme(window.__KND_BOOT_THEME__ || themeName);
      applyBigSimple(window.__KND_BOOT_BIG_SIMPLE__ === true);
    }, { once: true });
  }
})();