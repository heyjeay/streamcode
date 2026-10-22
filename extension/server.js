// server.js - the local hub that feeds the Stream Code overlay.
//
// Pure Node, no VS Code API, so it can be run and tested outside VS Code:
//   node server.js --demo            (serves the overlay with canned data on :7331)
//   node server.js --demo --port 7332
//
// One VS Code window owns the port (the "leader") and serves:
//   GET  /         the overlay page
//   GET  /events   Server-Sent Events stream of editor state (what the overlay listens to)
//   GET  /state    the latest state as JSON (handy for curl)
//   POST /state    other VS Code windows ("followers") push their state here
// Any other window that fails to bind the port becomes a follower and POSTs to the
// leader. If the leader goes away the next follower that tries to publish takes over.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const debug = false;

// No CORS on purpose: the overlay is served from this same origin, and any other web page you have
// open must not be able to read your code (GET /state, /events) or write to your stream (POST).
const HEADERS = { 'X-Content-Type-Options': 'nosniff' };
const MAX_BODY = 2 * 1024 * 1024;
const PING_MS = 20000;

class Hub {
  constructor(opts) {
    this.port = opts.port || 7331;
    this.host = '127.0.0.1';
    this.overlayFile = opts.overlayFile;               // bundled overlay.html
    this.overlayOverride = opts.overlayOverride || ''; // optional user-supplied file
    this.log = opts.log || ((...a) => { if (debug) console.log('[stream-code hub]', ...a); });
    this.onRemoteState = opts.onRemoteState || (() => {});
    this.onRoleChange = opts.onRoleChange || (() => {});
    this.onLook = opts.onLook || null;                 // POST /look handler (the extension writes settings)
    this.role = 'idle';          // 'idle' | 'leader' | 'follower'
    this.server = null;
    this.clients = new Set();    // open SSE responses
    this.state = { v: 1, empty: true, ts: Date.now() };
    this.pingTimer = null;
    this.binding = false;
  }

  start() { this._tryBind(); }

  // Replace the current state. Broadcast it if we own the port, otherwise hand it to the leader.
  publish(state) {
    this.state = state;
    if (this.role === 'leader') this._broadcast();
    else this._post(state);
  }

  stop() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    for (const c of this.clients) { try { c.end(); } catch (e) { /* already gone */ } }
    this.clients.clear();
    if (this.server) {
      const s = this.server;
      this.server = null;
      try { if (typeof s.closeAllConnections === 'function') s.closeAllConnections(); } catch (e) { /* ignore */ }
      try { s.close(); } catch (e) { /* ignore */ }
    }
    this._setRole('idle');
  }

  // ---- leader election by port ----
  _tryBind() {
    if (this.binding || this.role === 'leader') return;
    this.binding = true;
    const server = http.createServer((req, res) => this._handle(req, res));
    server.on('error', (err) => {
      this.binding = false;
      if (this.server === server) return; // runtime error on a live server; nothing to do
      if (err && err.code === 'EADDRINUSE') this.log('port', this.port, 'taken, following');
      else this.log('bind failed', err && err.code);
      this._setRole('follower');
    });
    server.listen(this.port, this.host, () => {
      this.binding = false;
      this.server = server;
      this.pingTimer = setInterval(() => this._ping(), PING_MS);
      this._setRole('leader');
      this._broadcast();
    });
  }

  _setRole(role) {
    if (this.role === role) return;
    this.role = role;
    this.log('role ->', role);
    try { this.onRoleChange(role); } catch (e) { this.log('onRoleChange threw', e); }
  }

  _post(state) {
    const body = JSON.stringify(state);
    const req = http.request({
      host: this.host, port: this.port, path: '/state', method: 'POST', timeout: 1500,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => { res.resume(); });
    req.on('error', (err) => {
      this.log('post failed', err && err.code);
      // Leader is gone: try to take the port. The listen callback re-broadcasts this.state.
      if (err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) { this.role = 'idle'; this._tryBind(); }
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end(body);
  }

  // ---- http ----
  // Only this PC's overlay, gallery and VS Code windows may talk to the hub:
  // - Host must be 127.0.0.1 / localhost / [::1] on our port (blocks DNS rebinding),
  // - a browser Origin, when sent, must be that same address (blocks other web pages),
  // - writes must be JSON, which a web page can't send cross-site without a CORS preflight.
  _refuse(req) {
    const hosts = [`127.0.0.1:${this.port}`, `localhost:${this.port}`, `[::1]:${this.port}`];
    if (!hosts.includes(String(req.headers.host || '').toLowerCase())) return 'host';
    const origin = req.headers.origin;
    if (origin !== undefined && !hosts.some((h) => origin.toLowerCase() === 'http://' + h)) return 'origin';
    if (req.method === 'POST' && !/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return 'content-type';
    return null;
  }

  _handle(req, res) {
    let p = '/';
    try { p = new URL(req.url, 'http://localhost').pathname; } catch (e) { /* keep '/' */ }
    const refused = req.method === 'OPTIONS' ? 'preflight' : this._refuse(req);
    if (refused) {
      this.log('refused', req.method, p, refused, req.headers.origin || '', req.headers.host || '');
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Stream Code: only the overlay on this PC may connect');
    }
    if (req.method === 'GET' && (p === '/' || p === '/index.html' || p === '/overlay' || p === '/overlay.html')) return this._serveOverlay(res);
    if (req.method === 'GET' && p === '/events') return this._sse(req, res);
    if (req.method === 'GET' && p === '/state') {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, HEADERS));
      return res.end(JSON.stringify(this.state));
    }
    if (req.method === 'POST' && p === '/state') return this._receive(req, res);
    if (req.method === 'POST' && p === '/look') return this._receiveLook(req, res);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Stream Code: not found');
  }

  _serveOverlay(res) {
    const candidates = [this.overlayOverride, this.overlayFile].filter(Boolean);
    const next = (i) => {
      if (i >= candidates.length) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Stream Code: overlay.html is missing from the extension');
      }
      fs.readFile(candidates[i], (err, data) => {
        if (err) { this.log('overlay read failed', candidates[i], err.code); return next(i + 1); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    };
    next(0);
  }

  _sse(req, res) {
    res.writeHead(200, Object.assign({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }, HEADERS));
    res.write('retry: 1000\n\n');
    res.write('data: ' + JSON.stringify(this.state) + '\n\n');
    this.clients.add(res);
    const drop = () => this.clients.delete(res);
    req.on('close', drop);
    res.on('close', drop);
    res.on('error', drop);
    this.log('overlay connected, clients:', this.clients.size);
  }

  _readJson(req, res, cb) {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      let obj;
      try {
        obj = JSON.parse(body);
        if (!obj || typeof obj !== 'object') throw new Error('not an object');
      } catch (e) {
        res.writeHead(400, Object.assign({ 'Content-Type': 'text/plain' }, HEADERS));
        return res.end('bad json');
      }
      cb(obj);
    });
    req.on('error', () => { /* client vanished mid-body */ });
  }

  // another VS Code window pushes its editor state
  _receive(req, res) {
    this._readJson(req, res, (s) => {
      this.state = s;
      this._broadcast();
      try { this.onRemoteState(s); } catch (e) { this.log('onRemoteState threw', e); }
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, HEADERS));
      res.end('{"ok":true}');
    });
  }

  // the gallery page asks for a look change: {theme, header, bg, nums, wrap, size, lh}
  _receiveLook(req, res) {
    this._readJson(req, res, (patch) => {
      if (!this.onLook) {
        res.writeHead(501, Object.assign({ 'Content-Type': 'text/plain' }, HEADERS));
        return res.end('this hub has no settings to change (standalone)');
      }
      Promise.resolve().then(() => this.onLook(patch)).then(() => {
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, HEADERS));
        res.end('{"ok":true}');
      }, (e) => {
        this.log('onLook failed', e);
        res.writeHead(500, Object.assign({ 'Content-Type': 'text/plain' }, HEADERS));
        res.end(String((e && e.message) || e));
      });
    });
  }

  _broadcast() {
    if (!this.clients.size) return;
    const payload = 'data: ' + JSON.stringify(this.state) + '\n\n';
    for (const c of this.clients) {
      try { c.write(payload); } catch (e) { this.clients.delete(c); }
    }
  }

  _ping() {
    for (const c of this.clients) {
      try { c.write(': ping\n\n'); } catch (e) { this.clients.delete(c); }
    }
  }
}

module.exports = { Hub };

// ---- standalone test runner: node server.js --demo [--port N] ----
if (require.main === module) {
  const args = process.argv.slice(2);
  const portArg = args.indexOf('--port');
  const port = portArg >= 0 ? Number(args[portArg + 1]) : 7331;
  const bundled = path.join(__dirname, 'overlay.html');
  const overlayFile = fs.existsSync(bundled) ? bundled : path.join(__dirname, '..', 'stream_code.html');
  const hub = new Hub({
    port, overlayFile,
    log: (...a) => console.log('[hub]', ...a),
    onRoleChange: (r) => console.log(`[hub] role: ${r} -> http://127.0.0.1:${port}/`),
    onRemoteState: (s) => console.log('[hub] state pushed by another process:', s.file || s),
    onLook: (patch) => console.log('[hub] look patch received (standalone: nothing to change):', patch),
  });
  hub.start();

  if (args.includes('--demo')) {
    const lines = [
      'Config.Pumpkins = {',
      '    -- where the pumpkin props are planted around the farm',
      '    Spots = {',
      '        { coords = vector3(-357.91, -137.17, 38.49), item = "pumpkin", prop = "prop_veg_crop_03_pump" },',
      '        { coords = vector3(-581.94, -1070.52, 21.33), item = "pumpkin", prop = "prop_veg_crop_03_pump" },',
      '        { coords = vector3(-690.67, 315.36, 82.11), item = "pumpkin", prop = "prop_veg_crop_03_pump" },',
      '        { coords = vector3(419.43, -983.58, 28.42), item = "pumpkin", prop = "prop_veg_crop_03_pump" },',
      '    },',
      '',
      '    -- animation played while picking',
      '    PickAnimation = {',
      "        dict = 'amb@world_human_gardener_plant@male@base',",
      "        anim = 'base',",
      '        flag = 1,',
      '        duration = 4500,',
      '    },',
      '',
      '    -- skill checks in order; failing any one fails the pick',
      "    SkillCheck = { 'easy', 'medium' },",
      '',
      "    SuccessMessage = 'You picked a pumpkin!',",
      "    FailureMessage = 'You failed to pick the pumpkin!',",
      '}',
      '',
      'local function canPick(src)',
      '    local player = exports.qbx_core:GetPlayer(src)',
      '    if not player then return false end',
      '    return player.Functions.GetItemByName("basket") ~= nil',
      'end',
    ];
    let line = 0;
    const tick = () => {
      line = (line + 1) % lines.length;
      hub.publish({
        v: 1, ts: Date.now(), file: 'pumpkins.lua', dir: 'resources/[qbx]/qbx_farming/config',
        language: 'lua', lineCount: lines.length, tabSize: 4, dirty: line % 3 === 0,
        cursor: { line, ch: Math.min(lines[line].length, 12) }, selection: null,
        visible: { start: 0, end: lines.length - 1 }, focus: line, start: 0, lines,
      });
    };
    tick();
    setInterval(tick, 900);
    console.log('[hub] demo state cycling every 900ms');
  }
}
