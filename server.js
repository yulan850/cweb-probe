// cWeb probe server.
// GET /      -> JSON: start time, uptime, hostname, exit IP + geo (from ip-api.com)
// GET /ray   -> WebSocket echo endpoint, server pings every 30s
// GET /health -> 200 ok
const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const STARTED_AT = new Date().toISOString();

let exitInfo = { status: 'pending' };

function fetchExitIp() {
  https.get('https://ip-api.com/json/?fields=status,message,country,regionName,city,isp,org,as,query', (res) => {
    let body = '';
    res.on('data', (c) => { body += c; });
    res.on('end', () => {
      try {
        const j = JSON.parse(body);
        exitInfo = j.status === 'success'
          ? { status: 'ok', ip: j.query, country: j.country, region: j.regionName, city: j.city, isp: j.isp, org: j.org, as: j.as, fetchedAt: new Date().toISOString() }
          : { status: 'error', message: j.message || 'ip-api failed' };
      } catch (e) {
        exitInfo = { status: 'error', message: 'parse error: ' + e.message };
      }
      console.log('[probe] exit info:', JSON.stringify(exitInfo));
    });
  }).on('error', (e) => {
    exitInfo = { status: 'error', message: e.message };
    console.log('[probe] exit fetch error:', e.message);
  });
}

fetchExitIp();
setInterval(fetchExitIp, 10 * 60 * 1000); // refresh every 10 min

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
    return;
  }
  if (url.pathname === '/') {
    const payload = {
      service: 'cweb-probe',
      startedAt: STARTED_AT,
      uptimeSeconds: Math.round(process.uptime()),
      hostname: require('os').hostname(),
      node: process.version,
      exit: exitInfo,
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2) + '\n');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found\n');
});

const wss = new WebSocketServer({ server, path: '/ray' });
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log('[probe] WS connected from', ip);
  ws.send(JSON.stringify({ hello: 'cweb-probe', startedAt: STARTED_AT }));
  const pingTimer = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 30000);
  ws.on('message', (data) => {
    console.log('[probe] WS message:', data.toString().slice(0, 200));
    ws.send(data); // echo
  });
  ws.on('close', () => {
    clearInterval(pingTimer);
    console.log('[probe] WS closed from', ip);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[probe] listening on ${HOST}:${PORT}, started ${STARTED_AT}`);
});
