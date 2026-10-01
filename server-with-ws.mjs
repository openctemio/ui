/**
 * Production entry point: Next's standalone server plus same-origin WebSocket.
 *
 * Browsers open the WebSocket on the UI's own origin (ws(s)://<ui-host>/api/v1/ws)
 * so the API port never has to be reachable from them. Next.js route handlers
 * cannot proxy an upgrade, and next.config rewrites are frozen at build time,
 * so this entry forwards that one upgrade itself to BACKEND_API_URL, read when
 * the container starts. Every other request and upgrade goes to Next unchanged.
 *
 * Authentication is the single-use ticket in the query string, checked by the
 * API; this hop adds no trust of its own.
 */
import http from 'node:http'
import net from 'node:net'
import tls from 'node:tls'
import { pathToFileURL } from 'node:url'

const WS_PATH = '/api/v1/ws'

function backendURL() {
  return new URL(process.env.BACKEND_API_URL || 'http://localhost:8080')
}

/** True for the API WebSocket path, with or without a query string. */
export function isApiWebSocket(url) {
  if (typeof url !== 'string') return false
  const q = url.indexOf('?')
  return (q === -1 ? url : url.slice(0, q)) === WS_PATH
}

/**
 * Builds the upgrade request sent to the API: same path and query, the
 * client's headers minus hop-by-hop ones we set ourselves, Host rewritten to
 * the backend, and the client address as X-Forwarded-For (overwritten, never
 * appended, so a client cannot inject one).
 */
export function buildUpgradeRequest(req, backend) {
  const skip = new Set([
    'host',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-real-ip',
  ])
  const lines = [`GET ${req.url} HTTP/1.1`, `Host: ${backend.host}`]
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i]
    if (skip.has(name.toLowerCase())) continue
    lines.push(`${name}: ${req.rawHeaders[i + 1]}`)
  }
  const clientIP = req.socket.remoteAddress || ''
  if (clientIP) {
    lines.push(`X-Forwarded-For: ${clientIP}`)
    lines.push(`X-Real-IP: ${clientIP}`)
  }
  lines.push(`X-Forwarded-Proto: ${req.socket.encrypted ? 'https' : 'http'}`)
  if (req.headers.host) lines.push(`X-Forwarded-Host: ${req.headers.host}`)
  return lines.join('\r\n') + '\r\n\r\n'
}

function proxyUpgrade(req, socket, head) {
  const backend = backendURL()
  const secure = backend.protocol === 'https:' || backend.protocol === 'wss:'
  const port = Number(backend.port) || (secure ? 443 : 80)
  const upstream = secure
    ? tls.connect({ host: backend.hostname, port, servername: backend.hostname })
    : net.connect({ host: backend.hostname, port })

  const fail = () => {
    if (socket.writable) socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n')
    upstream.destroy()
  }
  upstream.once('error', fail)
  socket.once('error', () => upstream.destroy())

  upstream.once(secure ? 'secureConnect' : 'connect', () => {
    upstream.removeListener('error', fail)
    upstream.on('error', () => socket.destroy())
    upstream.write(buildUpgradeRequest(req, backend))
    if (head && head.length) upstream.write(head)
    upstream.pipe(socket)
    socket.pipe(upstream)
  })
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntryPoint) {
  // Next's standalone server creates its HTTP server with http.createServer;
  // intercept the upgrade event for the API WebSocket path only.
  const createServer = http.createServer
  http.createServer = function patchedCreateServer(...args) {
    const server = createServer.apply(this, args)
    const emit = server.emit
    server.emit = function (event, req, socket, head) {
      if (event === 'upgrade' && isApiWebSocket(req.url)) {
        proxyUpgrade(req, socket, head)
        return true
      }
      return emit.apply(this, arguments)
    }
    return server
  }
  // server.js is Next's standalone output, generated next to this file in the image.
  const nextServer = new URL('./server.js', import.meta.url).href
  await import(/* @vite-ignore */ nextServer)
}
