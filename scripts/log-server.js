const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 9765
const LOG_DIR = path.join(__dirname, '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function appendLog(payload) {
  ensureLogDir()
  const { level = 'info', event = '', message = '', context, timestamp = new Date().toISOString() } = payload
  const contextStr = context != null ? ' ' + JSON.stringify(context) : ''
  const line = `[${timestamp}] [${level}] ${event}: ${message}${contextStr}\n`
  fs.appendFileSync(LOG_FILE, line)
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...CORS_HEADERS, 'Content-Length': 0 })
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}')
        appendLog(payload)
        res.writeHead(204, { ...CORS_HEADERS })
        res.end()
      } catch (e) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'text/plain' })
        res.end('Bad request')
      }
    })
    return
  }

  res.writeHead(404, { ...CORS_HEADERS })
  res.end()
})

server.listen(PORT, () => {
  console.log(`Log server listening on http://localhost:${PORT} (POST /log, GET /health)`)
  console.log(`Log file: ${LOG_FILE}`)
})
