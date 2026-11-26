import{c as Ee,a as ae,_ as Oe}from"./appTestRunStorageDZXOfe8T.js";import{d as qe,s as Ce,M as ie,c as _e,h as Re,H as L}from"./htmlFilePageDGN-dP2S.js";import{bk as Pe,bl as Le,d as Me}from"./kindredappquFbdsuK.js";import{getFile as Ne}from"./attachment.utilsBY0bgcar.js";import{db as Ie,h as je,u as Fe,bY as Be}from"./appHandoffGuestD3H_h1r5.js";import{r as $e,p as He}from"./shared.routerDVPRZaHe.js";import{d as Ue}from"./appBuild.storeBqDn2nSF.js";import{h as De}from"./openHtmlFileViewerBXPAkqzN.js";import{d as ze,r as N,w as We,o as Xe,M as Ke,v as I,k as D,m as oe,l as Je,p as z,a3 as Ye,q as Y,e as j}from"./vue-runtimeCY_KIElv.js";const _={step:"knd-app-check-step",stepResult:"knd-app-check-step-result",summary:"knd-app-check-summary",summaryResult:"knd-app-check-summary-result"};function Ve(e,t){return`${`(function () {
  var token = ${JSON.stringify(e)};
  var errors = [];
  var logs = [];
  var MAX = 30;
  function fmt(a) {
    try {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      return JSON.stringify(a);
    } catch (e) { return String(a); }
  }
  function keep(list, text) { if (list.length < MAX) list.push(String(text).slice(0, 300)); }
  addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && e.target.tagName) {
      keep(errors, 'Could not load ' + (e.target.src || e.target.href || e.target.tagName.toLowerCase()));
      return;
    }
    // Safari hides the message of an error in this sealed page: say so rather than "Script error.".
    if (e && e.message === 'Script error.' && !e.lineno) {
      keep(errors, 'A script on the page threw an error. Safari does not say which; check on a computer to see it.');
      return;
    }
    keep(errors, (e && e.message ? e.message : 'Error') + (e && e.lineno ? ' (line ' + e.lineno + ')' : ''));
  }, true);
  addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    keep(errors, 'Unhandled promise rejection: ' + fmt(r && r.message ? r.message : r));
  });
  ['error', 'warn', 'log', 'info'].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      try {
        var text = Array.prototype.map.call(arguments, fmt).join(' ');
        if (level === 'error') keep(errors, text); else keep(logs, level + ': ' + text);
      } catch (e) {}
      return original && original.apply(console, arguments);
    };
  });
  function names(nodes, cap) {
    var out = [];
    for (var i = 0; i < nodes.length && out.length < cap; i++) {
      var n = nodes[i];
      var t = (n.getAttribute('aria-label') || n.textContent || (n.tagName === 'INPUT' ? n.value : '') || n.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
      if (t) out.push(t);
    }
    return out;
  }
  // A field by what a person reads beside it, never by what was typed into it.
  function fieldNames(nodes, cap) {
    var out = [];
    for (var i = 0; i < nodes.length && out.length < cap; i++) {
      var n = nodes[i];
      var label = n.labels && n.labels[0] ? n.labels[0].textContent : '';
      var t = (n.getAttribute('aria-label') || label || n.getAttribute('placeholder') || n.getAttribute('name') || n.id || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
      if (t) out.push(t);
    }
    return out;
  }
  function screen() {
    var b = document.body;
    return {
      title: (document.title || '').slice(0, 120),
      text: b ? (b.innerText || b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 1500) : '',
      headings: b ? names(b.querySelectorAll('h1,h2,h3'), 8) : [],
      buttons: b ? names(b.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]'), 15) : [],
      fields: b ? fieldNames(b.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="hidden"]),select,textarea'), 15) : [],
      hasCanvas: !!document.querySelector('canvas')
    };
  }
  addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var d = event.data;
    if (!d || d.token !== token) return;
    if (d.type === ${JSON.stringify(_.step)}) {
      Promise.resolve().then(function () {
        var runner = window.__kndTest;
        return runner ? runner.run(d.step || {}) : { ok: false, note: 'The test runner did not load.' };
      }).catch(function (err) {
        return { ok: false, note: 'The step could not run: ' + fmt(err) };
      }).then(function (result) {
        window.parent.postMessage({ type: ${JSON.stringify(_.stepResult)}, token: token, stepId: d.stepId, result: result }, '*');
      });
    } else if (d.type === ${JSON.stringify(_.summary)}) {
      window.parent.postMessage({ type: ${JSON.stringify(_.summaryResult)}, token: token, stepId: d.stepId, errors: errors.slice(), logs: logs.slice(), screen: screen() }, '*');
    }
  });
})();`}
;
${String(t).replace(/<\/(script)/gi,"<\\/$1")}`}const W={maxFiles:1e3,maxBytes:60*1024*1024},Ge={html:"text/html",htm:"text/html",js:"text/javascript",mjs:"text/javascript",css:"text/css",json:"application/json",txt:"text/plain",csv:"text/csv",xml:"application/xml",md:"text/markdown",svg:"image/svg+xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",avif:"image/avif",bmp:"image/bmp",ico:"image/x-icon",mp3:"audio/mpeg",ogg:"audio/ogg",oga:"audio/ogg",wav:"audio/wav",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",mp4:"video/mp4",webm:"video/webm",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf",wasm:"application/wasm",glb:"model/gltf-binary",gltf:"model/gltf+json"};function Ze(e){const t=(e.split(".").pop()||"").toLowerCase();return e.includes(".")&&Ge[t]||"application/octet-stream"}const Qe=/^(text\/|application\/(json|xml)|image\/svg\+xml|model\/gltf\+json)/;function et(e,t=""){let n=String(e||"").trim();if(!n||n.startsWith("#")||n.startsWith("//")||/^[a-z][a-z0-9+.-]*:/i.test(n))return null;n=n.split("#")[0].split("?")[0];try{n=decodeURIComponent(n)}catch{}const r=n.startsWith("/")?[]:t.split("/").slice(0,-1);for(const p of n.split("/"))if(!(!p||p===".")){if(p===".."){if(!r.length)return null;r.pop();continue}r.push(p)}return r.length?r.join("/"):null}function tt(e){const t=atob(e),n=new Uint8Array(t.length);for(let r=0;r<t.length;r++)n[r]=t.charCodeAt(r);return n}function H(e){return new TextDecoder().decode(tt(e.base64))}function X(e){return`data:${e.type};base64,${e.base64}`}function nt(e){try{return atob(e.base64.slice(0,48))}catch{return""}}function pe(e,t){return(e.charCodeAt(t)|e.charCodeAt(t+1)<<8|e.charCodeAt(t+2)<<16|e.charCodeAt(t+3)<<24)>>>0}function rt(e){const t=(p,s)=>e.startsWith(s,p),n=p=>pe(e,p),r=t(4,"ftyp")?e.slice(8,12):"";return t(0,"PNG")?"image/png":t(0,"ÿØÿ")?"image/jpeg":t(0,"GIF8")?"image/gif":t(0,"RIFF")&&t(8,"WEBP")?"image/webp":t(0,"BM")&&n(6)===0&&[12,40,52,56,64,108,124].includes(n(14))?"image/bmp":(t(0,"\0\0\0")||t(0,"\0\0\0"))&&n(18)===6+16*(e.charCodeAt(4)|e.charCodeAt(5)<<8)?"image/x-icon":/^avi[fs]$/.test(r)?"image/avif":/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(r)?"image/heic":t(0,"II*\0")||t(0,"MM\0*")?"image/tiff":t(0,`ÿ
`)||t(0,"\0\0\0\fJXL ")?"image/jxl":null}function at(e,t){if(e.type.startsWith("video/"))return!0;if(t.startsWith("Eß£"))return!e.type.startsWith("audio/");const n=t.startsWith("ftyp",4);if(!n&&!t.startsWith("OggS"))return!1;try{return atob(e.base64).includes(n?"vmhd":"theora")}catch{return!0}}function it(e,t){const n=t.startsWith("glTF");if(!n&&!e.type.startsWith("model/gltf"))return!1;try{let r="";if(n){const s=pe(t,12),b=atob(e.base64.slice(0,Math.ceil((20+s)/3)*4));r=new TextDecoder().decode(Uint8Array.from(b.slice(20,20+s),w=>w.charCodeAt(0)))}else r=H(e);const p=JSON.parse(r).images;return Array.isArray(p)&&p.some(s=>(s==null?void 0:s.bufferView)!==void 0)}catch{return!0}}function ot(e){return e.replace(/<\/(script)/gi,"<\\/$1")}function K(e,t){const n=e.match(new RegExp(`\\s${t}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,"i"));return n?n[1]??n[2]??n[3]??"":null}function $(e,t){return e.replace(new RegExp(`\\s${t}(?![\\w-])(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'>]+))?`,"gi"),"")}const st=/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](?:\.{1,2}\/|\/)[^"']*["']/;function se(e,t=[]){const{entryPath:n}=e,r=new Set(t),p=r.size?new Map([...e.files].filter(([a])=>!r.has(a))):e.files,s=p.get(n);if(!s)throw new Error("This app's page is missing.");const b=new Set([n]);let w=!1;const v=(a,d)=>{if(a===null)return null;const c=et(a,d);return c&&p.get(c)||null},k=(a,d)=>a.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi,(c,g,x)=>{const h=v(x,d);return h?`url(${X(h)})`:c});let l=H(s);const y=[];if(l=l.replace(/<script\b([^>]*)>\s*<\/script\s*>/gi,(a,d)=>{const c=v(K(` ${d}`,"src"),n);if(!c||/\.html?$/i.test(c.path))return a;b.add(c.path);const g=H(c),x=/^\s*module\s*$/i.test(K(` ${d}`,"type")||"");x&&st.test(g)&&(w=!0);let h=$(` ${d}`,"src");h=$(h,"integrity"),h=$(h,"crossorigin");const E=!x&&/\sdefer(?![\w-])/i.test(h);h=$(h,"defer"),h=$(h,"async");const m=`<script${h.trim()?` ${h.trim()}`:""}>${ot(g)}<\/script>`;return E?(y.push(m),""):m}),l=l.replace(/<link\b[^>]*>/gi,a=>{const d=(K(a,"rel")||"").toLowerCase(),c=v(K(a,"href"),n);return c?d.split(/\s+/).includes("stylesheet")?(b.add(c.path),`<style>${k(H(c),c.path)}</style>`):a.replace(/(\shref\s*=\s*)(["']?)[^"'\s>]+\2/i,`$1"${X(c)}"`):a}),l=l.replace(/<(img|audio|video|source|track|image|input|embed)\b[^>]*>/gi,a=>a.replace(/(\s(?:src|poster|href|xlink:href)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi,(d,c,g,x,h)=>{const E=v(g??x??h??"",n);return E&&!/\.html?$/i.test(E.path)?`${c}"${X(E)}"`:d})),l=l.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,(a,d,c,g)=>`${d}${k(c,n)}${g}`),l=l.replace(/(\sstyle\s*=\s*)"([^"]*)"/gi,(a,d,c)=>`${d}"${k(c,n)}"`),l=l.replace(/(\sstyle\s*=\s*)'([^']*)'/gi,(a,d,c)=>`${d}'${k(c,n)}'`),y.length){const a=l.search(/<\/body\s*>/i);l=a>=0?l.slice(0,a)+y.join("")+l.slice(a):l+y.join("")}const R={},F=[],P=[],B=[],M=[];for(const a of p.values()){if(a.path===n)continue;const d=X(a);R[a.path]=d;const c=nt(a),g=rt(c);if(g||a.type.startsWith("image/")){if(F.push(g&&g!==a.type?`data:${g};base64,${a.base64}`:d),P.push(a.path),g||a.type!=="image/svg+xml")continue}else if(at(a,c)||it(a,c)){B.push(a.path);continue}if(b.has(a.path)||!Qe.test(a.type))continue;const x=H(a);F.push(...qe(x)),/javascript|css/.test(a.type)||M.push(x)}return{html:l,assets:R,pictures:Array.from(new Set(F)),pictureFiles:P,unchecked:B,texts:M,moduleImports:w}}function lt(e,t){return t?e.unchecked:[...e.unchecked,...e.pictureFiles]}function le(e){return JSON.stringify(e).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function ut(e,t=""){return`(function () {
  var files = ${le(e)};
  var folder = ${le(t.split("/").slice(0,-1))};
  var has = Object.prototype.hasOwnProperty;
  var dir = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  function resolve(u, parts) {
    var segs = u.split('/');
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (!s || s === '.') continue;
      if (s === '..') { if (!parts.length) return null; parts.pop(); continue; }
      parts.push(s);
    }
    var k = parts.join('/');
    return k && has.call(files, k) ? k : null;
  }
  function key(u) {
    if (u == null) return null;
    u = typeof u === 'string' ? u : (u && typeof u.url === 'string' ? u.url : String(u));
    var full = u.indexOf(dir) === 0;
    if (full) u = u.slice(dir.length);
    else if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.slice(0, 2) === '//') return null;
    u = u.split('#')[0].split('?')[0];
    try { u = decodeURIComponent(u); } catch (e) { /* as written */ }
    if (u.charAt(0) === '/') return resolve(u, []);
    // An address the browser already resolved against the page's own (a Request, a URL built from
    // location) no longer says whether it was written from the page's folder or from the top.
    return resolve(u, folder.slice()) || (full ? resolve(u, []) : null);
  }
  function address(u) { var k = key(u); return k ? files[k] : null; }
  function typeOf(d) { return d.slice(5, d.indexOf(';')); }
  function bytesOf(d) {
    var bin = atob(d.slice(d.indexOf(',') + 1)), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  window.__kndAppFile = address;

  var net = window.fetch;
  window.fetch = function (input, init) {
    var d = address(input);
    if (!d) return net.apply(this, arguments);
    return Promise.resolve(new Response(new Blob([bytesOf(d)], { type: typeOf(d) }), { status: 200, headers: { 'Content-Type': typeOf(d) } }));
  };

  function patchSrc(proto, prop) {
    var desc = proto && Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.set) return;
    Object.defineProperty(proto, prop, {
      configurable: true, enumerable: desc.enumerable, get: desc.get,
      set: function (v) { desc.set.call(this, address(v) || v); }
    });
  }
  patchSrc(window.HTMLImageElement && HTMLImageElement.prototype, 'src');
  patchSrc(window.HTMLMediaElement && HTMLMediaElement.prototype, 'src');
  patchSrc(window.HTMLSourceElement && HTMLSourceElement.prototype, 'src');
  patchSrc(window.HTMLVideoElement && HTMLVideoElement.prototype, 'poster');
  var setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var n = String(name).toLowerCase();
    if ((n === 'src' || n === 'poster' || (n === 'href' && !(this instanceof HTMLAnchorElement))) && address(value)) value = address(value);
    return setAttr.call(this, name, value);
  };
  var NativeAudio = window.Audio;
  if (NativeAudio) {
    var Audio = function (src) { return arguments.length ? new NativeAudio(address(src) || src) : new NativeAudio(); };
    Audio.prototype = NativeAudio.prototype;
    window.Audio = Audio;
  }

  // Pictures and sounds a script writes as HTML (innerHTML) set their src without a setter.
  function fix(el) {
    if (!el || el.nodeType !== 1) return;
    var list = el.matches && el.matches('img,audio,video,source') ? [el] : [];
    if (el.querySelectorAll) list = list.concat(Array.prototype.slice.call(el.querySelectorAll('img[src],audio[src],video[src],source[src]')));
    for (var i = 0; i < list.length; i++) {
      var raw = list[i].getAttribute('src'), d = raw && address(raw);
      if (d) setAttr.call(list[i], 'src', d);
    }
  }
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) for (var j = 0; j < records[i].addedNodes.length; j++) fix(records[i].addedNodes[j]);
  }).observe(document, { childList: true, subtree: true });

  var X = window.XMLHttpRequest;
  if (X) {
    var open = X.prototype.open, send = X.prototype.send, header = X.prototype.setRequestHeader;
    var mine = ['readyState', 'status', 'statusText', 'response', 'responseText', 'responseURL'];
    X.prototype.open = function (method, url) {
      for (var i = 0; i < mine.length; i++) if (has.call(this, mine[i])) delete this[mine[i]];
      this.__kndFile = address(url);
      this.__kndUrl = String(url);
      if (!this.__kndFile) return open.apply(this, arguments);
    };
    X.prototype.setRequestHeader = function () { if (!this.__kndFile) return header.apply(this, arguments); };
    X.prototype.send = function () {
      if (!this.__kndFile) return send.apply(this, arguments);
      var xhr = this, d = this.__kndFile;
      setTimeout(function () {
        var bytes = bytesOf(d), type = typeOf(d), rt = xhr.responseType, text = null, body;
        if (rt === 'arraybuffer') body = bytes.buffer;
        else if (rt === 'blob') body = new Blob([bytes], { type: type });
        else {
          text = new TextDecoder().decode(bytes);
          if (rt === 'json') { try { body = JSON.parse(text); } catch (e) { body = null; } } else body = text;
        }
        function def(name, value) { Object.defineProperty(xhr, name, { value: value, configurable: true }); }
        def('readyState', 4); def('status', 200); def('statusText', 'OK'); def('response', body); def('responseURL', xhr.__kndUrl);
        if (rt === '' || rt === 'text') def('responseText', text);
        var size = bytes.length;
        xhr.dispatchEvent(new Event('readystatechange'));
        xhr.dispatchEvent(new ProgressEvent('progress', { lengthComputable: true, loaded: size, total: size }));
        xhr.dispatchEvent(new ProgressEvent('load', { lengthComputable: true, loaded: size, total: size }));
        xhr.dispatchEvent(new ProgressEvent('loadend', { lengthComputable: true, loaded: size, total: size }));
      }, 0);
    };
  }
})();`}function ct(e){const t=e.filter(r=>/\.html?$/i.test(r));if(!t.length)return null;const n=t.find(r=>/^index\.html?$/i.test(r));return n||t.sort((r,p)=>r.split("/").length-p.split("/").length||r.localeCompare(p))[0]}function dt(e){if(e.some(n=>!n.includes("/")))return"";const t=new Set(e.map(n=>n.split("/")[0]));return t.size===1?`${[...t][0]}/`:""}function ue(e){if(!e)return!1;const t=String(e.fileType||"").toLowerCase();return t==="application/zip"||t==="application/x-zip-compressed"||/\.zip$/i.test(String(e.filename||""))}const ce="This app has too many files, or files too large, to open.",de="This app's .zip file could not be opened.";class O extends Error{}async function V(e){const t=await Ne(e,!1,void 0,!0);if(!t)throw new O("Couldn't read this app's files.");return t.startsWith("data:")?t.slice(t.indexOf(",")+1):t}async function pt(e,t){const n=new Map;let r=0;const p=(s,b,w=Math.floor(b.length*3/4))=>{if(r+=w,n.size>=W.maxFiles||r>W.maxBytes)throw new O(ce);n.set(s,{path:s,type:Ze(s),base64:b})};if(ue(e)){const s=await Pe().catch(()=>{throw new O("Kindredly was updated while this page was open. Reload it, then open the app again.")});let b;try{b=await s.loadAsync(await V(e.fileId),{base64:!0})}catch(l){throw l instanceof O?l:new O(de)}const w=Object.values(b.files).filter(l=>!l.dir&&!/(^|\/)(__MACOSX\/|\.DS_Store$)/.test(l.name));if(w.length>W.maxFiles)throw new O("This app has too many files to open.");const v=dt(w.map(l=>l.name));for(const l of w){if(!l.name.startsWith(v))continue;let y;try{y=await Le(l,W.maxBytes-r)}catch(R){throw new O(R instanceof Me&&R.code==="too_large"?ce:de)}p(l.name.slice(v.length),Ie(y),y.byteLength)}const k=ct([...n.keys()]);if(!k)throw new O("This app's .zip has no HTML page. Put index.html at its top.");return{entryPath:k,files:n}}p(e.filename,await V(e.fileId));for(const s of t)s.fileId===e.fileId||ue(s)||/\.html?$/i.test(s.filename)||s.fileType==="obj/js"||p(s.filename,await V(s.fileId));return{entryPath:e.filename,files:n}}const fe="__knd_localstorage",ft=800*1024;function ht(e){return e.replace(/<\/(script)/gi,"<\\/$1")}function mt(e){const t={};if(e&&typeof e=="object"&&!Array.isArray(e))for(const[n,r]of Object.entries(e))typeof r=="string"&&(t[n]=r);return JSON.stringify(t).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function yt(e){const t=JSON.stringify(fe),n=`(function () {
  var me = document.currentScript;
  if (me && me.parentNode) me.parentNode.removeChild(me);
  var api = window.createKindredlyHostApi({});
  api.install();
  api.setHostToken(${JSON.stringify(e.token)});
  var shim = window.__kndStorageShims && window.__kndStorageShims.localStorage;
  if (!shim) return;
  shim.hydrate(${mt(e.saved)});
  var timer = null;
  var warned = false;
  function flush() {
    timer = null;
    try {
      var snapshot = shim.snapshot();
      if (JSON.stringify(snapshot).length > ${ft}) {
        if (!warned) { warned = true; console.warn('localStorage exceeds the ~800KB persistence limit; data is kept in memory only.'); }
        return;
      }
      warned = false;
      window.kindredly.refState.set(${t}, snapshot).catch(function () {});
    } catch (e) { /* kept in memory for this visit */ }
  }
  shim.onWrite(function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 400);
  });
  addEventListener('pagehide', function () {
    if (timer) { clearTimeout(timer); flush(); }
  });
})();`;return ht(`${e.scripts.storageShim}
;
${e.scripts.hostApiClient}
;
${n}`)}const gt=`// Loaded as a CLASSIC script by sandbox.html, BEFORE all libraries and app code. The sandbox
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
`,bt=`// Loaded as a CLASSIC script (not an ES module) by sandbox.html. The sandbox iframe runs
// with an opaque \`null\` origin (no allow-same-origin), so ES-module imports would be CORS-blocked
// against capacitor://localhost on mobile. Classic scripts are not CORS-gated, so we expose the
// factory on window instead of \`export\`ing it.
function createKindredlyHostApi(params) {
  const createRequestId = params && typeof params.createRequestId === 'function'
    ? params.createRequestId
    : () => String(Date.now()) + '_' + String(Math.random()).slice(2)

  const pending = new Map()
  let hostToken = null
  let parentOrigin = null

  function setHostToken(token) {
    hostToken = token || null
  }

  function setParentOrigin(origin) {
    parentOrigin = origin || null
  }

  // opts.timeoutMs widens the bridge timeout for requests that legitimately take long —
  // a cold GPS fix, a human framing a camera shot. Clamped so an app can neither make the
  // bridge hang forever nor starve itself with a sub-second budget.
  function hostRequest(api, action, payloadParams, opts) {
    if (!hostToken) {
      return Promise.reject(new Error('Host API not initialized yet'))
    }

    const requestedTimeout = opts && typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 12000
    const timeoutMs = Math.max(1000, Math.min(600000, requestedTimeout))

    const requestId = createRequestId()
    const payload = {
      type: 'app-host-api-request',
      token: hostToken,
      requestId,
      api,
      action,
      params: payloadParams || {},
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId)
        reject(new Error('Host API request timed out'))
      }, timeoutMs)

      pending.set(requestId, {
        resolve: (v) => {
          clearTimeout(timeout)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timeout)
          reject(e)
        },
      })

      try {
        window.parent.postMessage(payload, parentOrigin || '*')
      } catch (err) {
        clearTimeout(timeout)
        pending.delete(requestId)
        reject(err)
      }
    })
  }

  function base64ToUint8Array(base64) {
    const trimmed = String(base64 ?? '').trim()
    if (!trimmed) return new Uint8Array(0)

    let normalized = trimmed
    if (normalized.startsWith('data:')) {
      const parts = normalized.split(',')
      normalized = parts.length > 1 ? parts[1] : ''
    }

    normalized = normalized.replace(/\\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
    const padLen = normalized.length % 4
    if (padLen === 2) normalized += '=='
    else if (padLen === 3) normalized += '='
    else if (padLen === 1) throw new Error('Invalid base64')

    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  function uint8ArrayToBase64(bytes) {
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
    }
    return btoa(binary)
  }

  // Serialize whatever the caller passed as a body into the two shapes the bridge can carry.
  // FormData and ReadableStream cannot be structured-cloned into something the host can rebuild
  // faithfully, so they are refused loudly rather than silently sent as "[object FormData]".
  async function encodeRequestBody(body) {
    if (body === undefined || body === null) return {}
    if (typeof body === 'string') return { body: body, bodyEncoding: 'text' }
    if (body instanceof URLSearchParams) return { body: body.toString(), bodyEncoding: 'text' }
    if (body instanceof Blob) {
      return { body: uint8ArrayToBase64(new Uint8Array(await body.arrayBuffer())), bodyEncoding: 'base64' }
    }
    if (body instanceof ArrayBuffer) {
      return { body: uint8ArrayToBase64(new Uint8Array(body)), bodyEncoding: 'base64' }
    }
    if (ArrayBuffer.isView(body)) {
      return {
        body: uint8ArrayToBase64(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)),
        bodyEncoding: 'base64',
      }
    }
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      throw new TypeError('FormData request bodies are not supported in the Kindredly sandbox; send a string, URLSearchParams, or bytes')
    }
    throw new TypeError('Unsupported request body type')
  }

  /**
   * window.fetch over the host bridge.
   *
   * The sandbox CSP is \`connect-src 'none'\`, so the native fetch cannot reach anything — without
   * this shim every npm package that fetches is dead on arrival and every app has to be rewritten
   * against kindredly.net. The shim does NOT widen the boundary: the host still performs the
   * request, still prompts per hostname, still separates reads from writes, still omits
   * credentials, and still refuses outright for location-declared apps.
   *
   * It returns a real Response (the constructor needs no network and works fine at an opaque
   * origin), so .json()/.text()/.blob()/.arrayBuffer()/.headers all behave normally.
   */
  async function bridgeFetch(input, init) {
    const opts = init || {}
    const isRequest = typeof Request !== 'undefined' && input instanceof Request

    const url = isRequest ? input.url : String(input)
    const method = String(opts.method || (isRequest ? input.method : 'GET') || 'GET').toUpperCase()

    const headers = {}
    const headerSource = opts.headers || (isRequest ? input.headers : null)
    if (headerSource) {
      if (typeof Headers !== 'undefined' && headerSource instanceof Headers) {
        headerSource.forEach((value, key) => { headers[key] = value })
      } else if (Array.isArray(headerSource)) {
        headerSource.forEach((pair) => { if (pair && pair.length >= 2) headers[String(pair[0])] = String(pair[1]) })
      } else {
        Object.keys(headerSource).forEach((key) => { headers[key] = String(headerSource[key]) })
      }
    }

    const rawBody = opts.body !== undefined ? opts.body : (isRequest ? await input.clone().text() : undefined)
    const encoded = await encodeRequestBody(rawBody)

    const signal = opts.signal || (isRequest ? input.signal : null)
    if (signal && signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }

    const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 12000
    // Keep the bridge budget above the host's own request timeout so a slow endpoint surfaces
    // the host's "Request timed out", not a less useful bridge timeout.
    const call = hostRequest(
      'net',
      'fetch',
      { url: url, method: method, headers: headers, timeoutMs: timeoutMs, ...encoded },
      { timeoutMs: timeoutMs + 5000 },
    )

    const result = await (signal
      ? Promise.race([
          call,
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true })
          }),
        ])
      : call)

    const body = result.bodyEncoding === 'base64' ? base64ToUint8Array(result.body) : (result.body || '')
    // 204/205/304 must carry a null body or the Response constructor throws.
    const nullBodyStatus = result.status === 204 || result.status === 205 || result.status === 304
    const response = new Response(nullBodyStatus ? null : body, {
      status: result.status,
      statusText: result.statusText || '',
      headers: result.headers || {},
    })

    // \`url\` is read-only on Response and the constructor has no option for it, so the real
    // (post-redirect) URL is redefined on the instance — apps and libraries read res.url.
    try {
      Object.defineProperty(response, 'url', { value: result.url || url, configurable: true })
    } catch (_) {
      // Non-fatal: the response still carries status, headers and body.
    }
    return response
  }

  function install() {
    // Replace the CSP-blocked native fetch for every sandbox app, not just imported ones — one
    // implementation, one test surface, and App Builder apps get standard fetch too.
    try {
      window.fetch = bridgeFetch
    } catch (_) {
      // If the environment refuses the assignment, kindredly.net.fetchJson still works.
    }

    window.kindredly = {
      refState: {
        get: async (key, options) => {
          return await hostRequest('refState', 'get', { key, ...(options || {}) })
        },
        set: async (key, value, options) => {
          return await hostRequest('refState', 'set', { key, value, ...(options || {}) })
        },
        list: async (options) => {
          return await hostRequest('refState', 'list', { ...(options || {}) })
        },
        delete: async (key, options) => {
          return await hostRequest('refState', 'delete', { key, ...(options || {}) })
        },
      },
      sharedRefState: {
        get: async (key, options) => {
          return await hostRequest('sharedRefState', 'get', { key, ...(options || {}) })
        },
        set: async (key, value, options) => {
          return await hostRequest('sharedRefState', 'set', { key, value, ...(options || {}) })
        },
        list: async (options) => {
          return await hostRequest('sharedRefState', 'list', { ...(options || {}) })
        },
        delete: async (key, options) => {
          return await hostRequest('sharedRefState', 'delete', { key, ...(options || {}) })
        },
      },
      // Who is using the app (HAT-1169): { id, name, isChild }. The id is this person's in this
      // app only, so two apps cannot match up the same person.
      user: {
        current: async () => {
          return await hostRequest('user', 'current', {})
        },
      },
      net: {
        fetchJson: async (url, options) => {
          return await hostRequest('net', 'fetchJson', { url, ...(options || {}) })
        },
        // Same bridge the window.fetch shim uses. Prefer plain fetch() in new app code; this
        // stays exposed so an app can reach the raw result shape without a Response wrapper.
        fetch: async (url, options) => {
          return await bridgeFetch(url, options || {})
        },
      },
      // Device capabilities. Both are capability-gated: the app item must DECLARE them
      // (kindredly.appCapabilities.v1) and the user (or a guardian, for kids) must grant them,
      // or the host refuses. See getdocs: location / capture.
      location: {
        // -> { lat, lon, accuracyM, altitude?, heading?, speedMps?, timestamp }
        get: async (options) => {
          // Bridge budget stays above the host's own geolocation timeout (default 20s,
          // capped host-side) so the caller gets the host's real error, not a bridge timeout.
          return await hostRequest('location', 'get', { ...(options || {}) }, { timeoutMs: 120000 })
        },
      },
      capture: {
        // -> { dataUrl, mimeType, width, height } — the host opens its camera screen; the
        // long budget covers a human lining up the shot.
        photo: async (options) => {
          return await hostRequest('capture', 'photo', { ...(options || {}) }, { timeoutMs: 300000 })
        },
      },
      files: {
        list: async (options) => {
          return await hostRequest('files', 'list', { ...(options || {}) })
        },
        readText: async (filenameOrOptions, options) => {
          if (typeof filenameOrOptions === 'string') {
            return await hostRequest('files', 'readText', { filename: filenameOrOptions, ...(options || {}) })
          }
          return await hostRequest('files', 'readText', { ...(filenameOrOptions || {}) })
        },
        readJson: async (filenameOrOptions, options) => {
          if (typeof filenameOrOptions === 'string') {
            return await hostRequest('files', 'readJson', { filename: filenameOrOptions, ...(options || {}) })
          }
          return await hostRequest('files', 'readJson', { ...(filenameOrOptions || {}) })
        },
        readDataUrl: async (filenameOrOptions, options) => {
          if (typeof filenameOrOptions === 'string') {
            return await hostRequest('files', 'readDataUrl', { filename: filenameOrOptions, ...(options || {}) })
          }
          return await hostRequest('files', 'readDataUrl', { ...(filenameOrOptions || {}) })
        },
        readBytes: async (filenameOrOptions, options) => {
          const resp = (typeof filenameOrOptions === 'string')
            ? await hostRequest('files', 'readBase64', { filename: filenameOrOptions, ...(options || {}) })
            : await hostRequest('files', 'readBase64', { ...(filenameOrOptions || {}) })
          return {
            bytes: base64ToUint8Array(resp && resp.base64 ? resp.base64 : ''),
            fileType: resp ? resp.fileType : 'application/octet-stream',
          }
        },
        zipList: async (filenameOrOptions, options) => {
          if (typeof filenameOrOptions === 'string') {
            return await hostRequest('files', 'zipList', { filename: filenameOrOptions, ...(options || {}) })
          }
          return await hostRequest('files', 'zipList', { ...(filenameOrOptions || {}) })
        },
        zipReadText: async (filename, entryPath, options) => {
          return await hostRequest('files', 'zipReadText', { filename, entryPath, ...(options || {}) })
        },
        zipReadBytes: async (filename, entryPath, options) => {
          const resp = await hostRequest('files', 'zipReadBase64', { filename, entryPath, ...(options || {}) })
          return {
            bytes: base64ToUint8Array(resp && resp.base64 ? resp.base64 : ''),
            fileType: resp ? resp.fileType : 'application/octet-stream',
          }
        },
      },
    }

    window.addEventListener('message', function(event) {
      const data = event && event.data ? event.data : null
      if (!data || data.type !== 'app-host-api-response') return
      if (event && event.source && event.source !== window.parent) return
      if (parentOrigin && typeof event.origin === 'string' && event.origin && event.origin !== parentOrigin) return
      if (!hostToken || data.token !== hostToken) return

      const requestId = String(data.requestId || '')
      if (!requestId) return

      const entry = pending.get(requestId)
      if (!entry) return

      pending.delete(requestId)

      if (data.success) {
        entry.resolve(data.result)
      } else {
        entry.reject(new Error(String(data.error || 'Host API error')))
      }
    })
  }

  return {
    install,
    setHostToken,
    setParentOrigin,
  }
}

window.createKindredlyHostApi = createKindredlyHostApi
`,wt=`/**
 * The App Builder's hands: how it tries an app the way a person would (HAT-101).
 *
 * Loaded by sandbox.html and sandbox-nonet.html, and inert until the host sends a \`test-step\`
 * message — an ordinary app run never calls it. The host only sends one to the App Builder's
 * hidden test frame, whose storage writes are thrown away (AppIFrame \`testRun\`), so a test that
 * presses Delete deletes nothing.
 *
 * \`window.__kndTest.run(step)\` performs one step and says what happened:
 *
 *   click      a button, link, checkbox or any text on screen, found by its words
 *   type       text into a field found by its label, placeholder or name (replaces what it held)
 *   press      a key — Enter, Escape, an arrow, a letter — on a field, a button or the game canvas
 *   select     an option of a <select>, by its text
 *   expect     wait up to 2 s for text to be on screen
 *   expectnot  wait up to 2 s for text to be gone
 *   wait       let time pass
 *   probe      the generic check \`checkapp\` runs: fill every field, press the main button, type
 *              one character. Also what \`evals/harness/renderApp.ts\` runs, so there is one probe.
 *
 * Everything is found the way a person finds it — a button by its words, a field by its label —
 * because that is what the model sees in the DOM summary, and because a test that clicks
 * \`#btn-3\` passes on an app whose button nobody could find. A CSS selector is the fallback.
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
    return String(s == null ? '' : s).replace(/\\s+/g, ' ').trim()
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
      var joined = norm(by.split(/\\s+/).map(function (id) {
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
              : 'After typing ' + quote(text.slice(0, i)) + ', the field lost the caret — a re-render replaced it, so a person\\'s next letters would go nowhere.'
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
   * The probe text is deliberately markup. An app that concatenates user input into \`innerHTML\`
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
`,vt={storageShim:gt,hostApiClient:bt},kt=wt,xt={class:"htmlAppFrame","data-test-id":"htmlAppFrame"},St=["src","title"],Tt={key:1,class:"htmlAppFrame__overlay",role:"status"},At={key:2,class:"htmlAppFrame__overlay"},Et={class:"d-flex flex-column align-items-center flex-gap-2 text-center p-3"},Ot={class:"fw-semibold"},qt={key:0,class:"text-muted small"},Ct=15e3,_t=1500,Rt=1e3,Pt=8e3,Lt=ze({__name:"HtmlAppFrame",props:{fileId:{},filename:{},fileType:{},files:{},itemId:{},storageRef:{},declaredCapabilities:{},itemName:{},testRun:{type:Boolean}},emits:["ready","failed"],setup(e,{expose:t,emit:n}){const r=e,p=n,s=N("loading"),b=N(""),w=N(""),v=N(""),k=N(null),{confirmModal:l}=$e(),y=je(),R=r.testRun?Ee():null;let F=0;const P=new Map;let B="",M="",a=!1,d=0,c=0,g,x,h=[];const E=N(!1);let m=null;function he(){return m&&m(null),E.value=!0,new Promise(i=>{m=i})}function me(i){m==null||m(i[0]||null),m=null}function ye(i){E.value=i,!i&&m&&(m(null),m=null)}function G(){return{itemId:r.itemId,storageRef:r.storageRef,declaredCapabilities:h,itemName:r.itemName,confirmModal:l,capturePhoto:he,...r.testRun?{testRun:!0,testStorage:R}:{}}}function Z(i,u={}){var A;const o=(A=k.value)==null?void 0:A.contentWindow;if(!r.testRun||!o||s.value!=="ready")return Promise.resolve(null);const f=`s${++F}`;return new Promise(S=>{const T=setTimeout(()=>{P.delete(f),S(null)},Pt);P.set(f,C=>{clearTimeout(T),P.delete(f),S(C)}),o.postMessage({type:i,token:y,stepId:f,...u},"*")})}async function ge(i){const u=await Z(_.step,{step:i});return u?u.result:null}async function be(){const i=await Z(_.summary);return i?{errors:i.errors||[],logs:i.logs||[],screen:i.screen||null}:null}t({runStep:ge,summary:be,restart:()=>J()}),We(s,i=>{i==="ready"?p("ready"):i!=="loading"&&p("failed",[b.value,w.value].filter(Boolean).join(" "))});function U(){clearTimeout(g),clearTimeout(x)}function q(i,u,o=""){U(),v.value="",s.value=i,b.value=u,w.value=o}function we(){const i=crypto.getRandomValues(new Uint8Array(16));return Array.from(i,u=>u.toString(16).padStart(2,"0")).join("")}async function J(){const i=++d;U(),a=!1,v.value="",s.value="loading";try{const u=await pt({fileId:r.fileId,filename:r.filename||"index.html",fileType:r.fileType},r.files||[]);if(i!==d)return;let o=se(u);if(o.moduleImports)return q("error","This app's scripts load each other as modules.","Bundle them into one script, then add the app again.");const f=Ce(o.html),A=Array.from(new Set([...f.dataPictures,...o.pictures]));f.dataPictures=A.slice(0,ie),f.tooManyDataPictures=f.tooManyDataPictures||A.length>ie,o.texts.length&&(f.text=[f.text,...o.texts].join(" "));const S=await Fe("/content/htmlFileCheck",f);if(i!==d)return;if(!(S!=null&&S.success)||!S.result)return q("error","Couldn't check this app.");const T=S.result;if(T.filtered===!0&&T.blocked==="words")return q("blocked","This app is blocked","The content filter blocks its words.");if(T.filtered===!0&&T.blocked==="unchecked")return q("error","Couldn't check this app.");const C=T.filtered===!0?T:null,ee=C?lt(o,C.dataPictures===!0):[];ee.length&&(o=se(u,ee));const te=o.html;h=Array.from(new Set([...r.declaredCapabilities||[],...Ue(te)]));const ne=C?C.dataPictures===!0:!0,xe=h.includes("location")?{any:!1,pictureUrls:[],dataPictures:ne}:C?{any:!1,pictureUrls:C.pictureUrls||[],dataPictures:ne}:{any:!0};let re=null;try{re=await ae(G(),"refState","get",{key:fe})}catch{}if(i!==d)return;M=we();const Se=Object.keys(o.assets).length?`
;
${ut(o.assets,u.entryPath)}`:"",Te=(r.testRun?`${Ve(y,kt)}
;
`:"")+yt({token:y,saved:re,scripts:vt})+Se;B=_e(te,Re(xe),M,Te);const Ae=await De();if(i!==d)return;v.value=Ae,g=setTimeout(()=>{i===d&&!a&&q("error","This app didn't open.")},Ct)}catch(u){if(console.error("[htmlApp] could not open",u),i!==d)return;u instanceof O?q("error",u.message):q("error","Couldn't open this app.")}}function ve(i,u){const o=String(u.requestId||"");(async()=>{try{const f=await ae(G(),String(u.api||""),String(u.action||""),u.params);i.postMessage({type:"app-host-api-response",token:y,requestId:o,success:!0,result:f},"*")}catch(f){const A=f instanceof Error?f.message:String(f);i.postMessage({type:"app-host-api-response",token:y,requestId:o,success:!1,error:A},"*")}})()}function Q(i){var f,A,S;const u=(f=k.value)==null?void 0:f.contentWindow;if(!u||i.source!==u)return;const o=i.data;if(!(!o||typeof o.type!="string")){if(o.type===L.viewerReady){a||u.postMessage({type:L.show,html:B},"*");return}if(o.type==="app-host-api-request"){o.token===y&&ve(u,o);return}if(o.type===_.stepResult||o.type===_.summaryResult){o.token===y&&((A=P.get(String(o.stepId||"")))==null||A(o));return}if(o.nonce===M){if(o.type===L.shown||o.type===L.pong)!a&&o.type===L.shown&&((S=k.value)==null||S.focus()),a=!0,U(),s.value="ready";else if(o.type===L.link&&typeof o.href=="string"&&/^https?:\/\//i.test(o.href)){const T=Date.now();if(T-c<Rt)return;c=T,r.testRun||He(o.href,"_blank")}}}}function ke(){var u;if(!a)return;const i=(u=k.value)==null?void 0:u.contentWindow;s.value="loading",clearTimeout(x),i==null||i.postMessage({type:L.ping},"*"),x=setTimeout(()=>q("left","This app tried to go to another site."),_t)}return Xe(()=>{window.addEventListener("message",Q),J()}),Ke(()=>{d++,U(),window.removeEventListener("message",Q),m==null||m(null),m=null}),(i,u)=>{const o=Ye("b-icon");return j(),I("div",xt,[v.value?(j(),I("iframe",{key:0,ref_key:"frameRef",ref:k,src:v.value,sandbox:"allow-scripts allow-pointer-lock",allow:"fullscreen; gamepad; autoplay",referrerpolicy:"no-referrer",class:Je(["htmlAppFrame__frame",{"is-shown":s.value==="ready"}]),title:e.itemName||e.filename||"App",onLoad:ke},null,42,St)):D("",!0),s.value==="loading"?(j(),I("div",Tt,[...u[0]||(u[0]=[z("span",{class:"spinner-border spinner-border-sm me-2","aria-hidden":"true"},null,-1),z("span",null,"Opening…",-1)])])):s.value!=="ready"?(j(),I("div",At,[z("div",Et,[oe(o,{icon:s.value==="blocked"?"shield-lock":"exclamation-triangle",class:"fs-3 text-muted","aria-hidden":"true"},null,8,["icon"]),z("div",Ot,Y(b.value),1),w.value?(j(),I("div",qt,Y(w.value),1)):D("",!0),s.value!=="blocked"?(j(),I("button",{key:1,type:"button",class:"btn btn-outline-secondary btn-sm",onClick:J},Y(s.value==="left"?"Show it again":"Try again"),1)):D("",!0)])])):D("",!0),oe(Oe,{"model-value":E.value,title:"Take a photo","onUpdate:modelValue":ye,onCaptured:me},null,8,["model-value"])])}}}),zt=Be(Lt,[["__scopeId","data-v-a68aec11"]]);export{zt as H,ue as i};
