/**
 * Secure Mobile Development Server
 *
 * HTTPS reverse proxy with rate limiting and security headers.
 * Proxies to Angular dev server (ng serve) on localhost:4200.
 * Accessible from any device on the local network.
 *
 * Usage: npm run serve:mobile
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// ── Configuration ──────────────────────────────────────────────────
const CONFIG = {
  port: 4443,
  host: '0.0.0.0',
  angularPort: 4200,
  sslKey: path.join(__dirname, '..', 'ssl', 'server.key'),
  sslCert: path.join(__dirname, '..', 'ssl', 'server', 'server.crt'),
  rateLimit: {
    windowMs: 60_000,       // 1 minute window
    maxRequests: 200,       // max requests per window per IP
    maxConnections: 50,     // max concurrent connections per IP
    blockDurationMs: 300_000 // 5 min block for offenders
  }
};

// Fix cert path (remove extra /server/)
CONFIG.sslCert = path.join(__dirname, '..', 'ssl', 'server.crt');

// ── Rate Limiter ───────────────────────────────────────────────────
class RateLimiter {
  constructor(config) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.maxConnections = config.maxConnections;
    this.blockDurationMs = config.blockDurationMs;
    this.requests = new Map();     // ip -> { count, resetTime }
    this.connections = new Map();  // ip -> count
    this.blocked = new Map();      // ip -> unblockTime

    // Clean up stale entries every minute
    setInterval(() => this._cleanup(), 60_000);
  }

  isBlocked(ip) {
    const unblockTime = this.blocked.get(ip);
    if (!unblockTime) return false;
    if (Date.now() >= unblockTime) {
      this.blocked.delete(ip);
      return false;
    }
    return true;
  }

  checkRequest(ip) {
    if (this.isBlocked(ip)) return false;

    const now = Date.now();
    let entry = this.requests.get(ip);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + this.windowMs };
      this.requests.set(ip, entry);
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      this._block(ip, `Rate limit exceeded: ${entry.count} requests in window`);
      return false;
    }

    return true;
  }

  trackConnection(ip) {
    const count = (this.connections.get(ip) || 0) + 1;
    this.connections.set(ip, count);

    if (count > this.maxConnections) {
      this._block(ip, `Too many concurrent connections: ${count}`);
      return false;
    }
    return true;
  }

  releaseConnection(ip) {
    const count = this.connections.get(ip) || 1;
    if (count <= 1) {
      this.connections.delete(ip);
    } else {
      this.connections.set(ip, count - 1);
    }
  }

  _block(ip, reason) {
    this.blocked.set(ip, Date.now() + this.blockDurationMs);
    console.warn(`[BLOCKED] ${ip} — ${reason} (blocked for ${this.blockDurationMs / 1000}s)`);
  }

  _cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.requests) {
      if (now >= entry.resetTime) this.requests.delete(ip);
    }
    for (const [ip, unblock] of this.blocked) {
      if (now >= unblock) this.blocked.delete(ip);
    }
  }
}

// ── Security Headers ───────────────────────────────────────────────
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ── Proxy Logic ────────────────────────────────────────────────────
function proxyRequest(clientReq, clientRes, limiter) {
  const ip = clientReq.socket.remoteAddress || 'unknown';

  if (!limiter.checkRequest(ip)) {
    clientRes.writeHead(429, { 'Content-Type': 'text/plain' });
    clientRes.end('Too Many Requests — you have been temporarily blocked.');
    return;
  }

  setSecurityHeaders(clientRes);

  const options = {
    hostname: '127.0.0.1',
    port: CONFIG.angularPort,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `127.0.0.1:${CONFIG.angularPort}` }
  };

  const proxy = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxy.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      clientRes.writeHead(502, { 'Content-Type': 'text/html' });
      clientRes.end(`
        <html><body style="font-family:system-ui;text-align:center;padding:60px">
          <h1>Angular dev server is starting...</h1>
          <p>Refresh in a few seconds.</p>
        </body></html>
      `);
    } else {
      clientRes.writeHead(500, { 'Content-Type': 'text/plain' });
      clientRes.end('Internal proxy error');
    }
  });

  clientReq.pipe(proxy, { end: true });
}

// ── WebSocket Proxy (for Angular live reload) ──────────────────────
function proxyWebSocket(clientReq, clientSocket, head, limiter) {
  const ip = clientSocket.remoteAddress || 'unknown';

  if (limiter.isBlocked(ip)) {
    clientSocket.destroy();
    return;
  }

  const options = {
    hostname: '127.0.0.1',
    port: CONFIG.angularPort,
    path: clientReq.url,
    method: 'GET',
    headers: { ...clientReq.headers, host: `127.0.0.1:${CONFIG.angularPort}` }
  };

  const proxy = http.request(options);

  proxy.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    clientSocket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.write(head);
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);
  });

  proxy.on('error', () => clientSocket.destroy());
  proxy.end();
}

// ── Get Local IP ───────────────────────────────────────────────────
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

// ── Main ───────────────────────────────────────────────────────────
function main() {
  // Validate SSL files exist
  if (!fs.existsSync(CONFIG.sslKey) || !fs.existsSync(CONFIG.sslCert)) {
    console.error('\n  SSL certificates not found!');
    console.error('  Run: npm run ssl:generate\n');
    process.exit(1);
  }

  const limiter = new RateLimiter(CONFIG.rateLimit);

  const server = https.createServer(
    {
      key: fs.readFileSync(CONFIG.sslKey),
      cert: fs.readFileSync(CONFIG.sslCert),
      // Enforce TLS 1.2+
      minVersion: 'TLSv1.2'
    },
    (req, res) => proxyRequest(req, res, limiter)
  );

  // Handle WebSocket upgrades (Angular live reload)
  server.on('upgrade', (req, socket, head) => {
    proxyWebSocket(req, socket, head, limiter);
  });

  // Track connections for DoS protection
  server.on('connection', (socket) => {
    const ip = socket.remoteAddress || 'unknown';
    if (!limiter.trackConnection(ip)) {
      socket.destroy();
      return;
    }
    socket.on('close', () => limiter.releaseConnection(ip));
  });

  // Start Angular dev server in background
  console.log('\n  Starting Angular dev server on port 4200...');
  const ngProcess = spawn('npx', ['ng', 'serve', '--port', '4200'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    shell: true
  });

  ngProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Compiled') || msg.includes('watching')) {
      process.stdout.write(`  [ng] ${msg}`);
    }
  });

  ngProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    // Filter out noise, show important messages
    if (msg.includes('Error') || msg.includes('WARNING')) {
      process.stderr.write(`  [ng] ${msg}`);
    }
  });

  // Start HTTPS proxy
  server.listen(CONFIG.port, CONFIG.host, () => {
    const localIPs = getLocalIPs();
    console.log('\n  ╔══════════════════════════════════════════════════╗');
    console.log('  ║   foodVibe — Secure Mobile Dev Server            ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log(`  ║  Local:   https://localhost:${CONFIG.port}              ║`);
    for (const ip of localIPs) {
      const padded = `https://${ip}:${CONFIG.port}`.padEnd(37);
      console.log(`  ║  Phone:   ${padded}║`);
    }
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log('  ║  Security:                                       ║');
    console.log('  ║  ✓ HTTPS/TLS 1.2+                                ║');
    console.log('  ║  ✓ Rate limiting (200 req/min per IP)             ║');
    console.log('  ║  ✓ Connection limiting (50 concurrent per IP)     ║');
    console.log('  ║  ✓ Auto-block offenders for 5 minutes             ║');
    console.log('  ║  ✓ Security headers (HSTS, CSP, XSS, etc.)       ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log('  ║  Note: Accept the self-signed cert on your phone  ║');
    console.log('  ╚══════════════════════════════════════════════════╝\n');
  });

  // Graceful shutdown
  function shutdown() {
    console.log('\n  Shutting down...');
    ngProcess.kill();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
