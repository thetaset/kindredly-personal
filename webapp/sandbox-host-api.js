// Loaded as a CLASSIC script (not an ES module) by sandbox.html. The sandbox iframe runs
// with an opaque `null` origin (no allow-same-origin), so ES-module imports would be CORS-blocked
// against capacitor://localhost on mobile. Classic scripts are not CORS-gated, so we expose the
// factory on window instead of `export`ing it.
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

    normalized = normalized.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
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
   * The sandbox CSP is `connect-src 'none'`, so the native fetch cannot reach anything — without
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

    // `url` is read-only on Response and the constructor has no option for it, so the real
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
