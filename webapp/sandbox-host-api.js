export function createKindredlyHostApi(params) {
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

  function hostRequest(api, action, payloadParams) {
    if (!hostToken) {
      return Promise.reject(new Error('Host API not initialized yet'))
    }

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
      }, 12000)

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

  function install() {
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
