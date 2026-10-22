// extension.js - Stream Code: broadcasts the active editor to the OBS overlay.
//
// Listens to editor/selection/scroll/edit events, builds a small JSON "state"
// (file name, language, ~100 lines around the cursor, cursor, selection, plus the
// "look" chosen in settings) and hands it to the Hub (server.js), which streams it
// to the overlay page.
'use strict';

const vscode = require('vscode');
const path = require('path');
const { Hub } = require('./server');

const debug = false;
const log = (...a) => { if (debug) console.log('[stream-code]', ...a); };

const THROTTLE_MS = 50;

// Must match THEMES in stream_code.html and the enum in package.json.
const THEMES = [
  ['mocha', 'Mocha', 'Catppuccin Mocha, same as the editor'],
  ['kick', 'Kick', 'Black panel and Kick green, matches the song-request overlay'],
  ['twitch', 'Twitch', 'Twitch dark with purple accents'],
  ['terminal', 'Terminal', 'Green phosphor CRT: scanlines, glow, block cursor'],
  ['paper', 'Paper', 'Light card, GitHub-style colours'],
  ['glass', 'Glass', 'Frosted translucent panel, pastel colours'],
  ['neon', 'Neon', 'Synthwave: pink and cyan with glow'],
  ['mac', 'Mac', 'macOS-style window with One Dark colours'],
  ['nord', 'Nord', 'Cool blue-grey with an editor-tab header'],
  ['dracula', 'Dracula', 'The Dracula palette'],
  ['gruvbox', 'Gruvbox', 'Warm retro, boxy corners, editor-tab header'],
  ['minimal', 'Minimal', 'No panel, no header, no numbers: just the code'],
];
const THEME_NAMES = THEMES.map((t) => t[0]);
const ZOOM_MODES = ['off', 'camera', 'lens'];
const ZOOM_FOLLOW = ['both', 'mouse', 'cursor'];
const MOUSE_MARGIN = 20; // lines sent around the mouse so the overlay can centre on it

// Look keys as the overlay and the gallery use them -> setting name + validator.
const isBool = (v) => typeof v === 'boolean';
const LOOK = {
  theme: ['theme', (v) => typeof v === 'string' && THEME_NAMES.includes(v)],
  header: ['showHeader', isBool],
  bg: ['showBackground', isBool],
  nums: ['showLineNumbers', isBool],
  wrap: ['wordWrap', isBool],
  size: ['fontSize', (v) => typeof v === 'number' && v >= 8 && v <= 80],
  lh: ['lineHeight', (v) => typeof v === 'number' && v >= 1 && v <= 3],
  fade: ['edgeFade', (v) => typeof v === 'number' && v >= 0 && v <= 45],
  // 3D look
  tiltx: ['tiltX', (v) => typeof v === 'number' && v >= -60 && v <= 60],
  tilty: ['tiltY', (v) => typeof v === 'number' && v >= -60 && v <= 60],
  rot: ['rotate', (v) => typeof v === 'number' && v >= -45 && v <= 45],
  persp: ['perspective', (v) => typeof v === 'number' && v >= 200 && v <= 5000],
  scale: ['scale', (v) => typeof v === 'number' && v >= 0.25 && v <= 2],
  depth: ['depth', (v) => typeof v === 'number' && v >= 0 && v <= 40],
  float: ['float', isBool],
  opacity: ['opacity', (v) => typeof v === 'number' && v >= 0.1 && v <= 1],
  // zoom
  zoom: ['zoom', (v) => ZOOM_MODES.includes(v)],
  zoomFollow: ['zoomFollow', (v) => ZOOM_FOLLOW.includes(v)],
  zoomAmt: ['zoomAmount', (v) => typeof v === 'number' && v >= 1.1 && v <= 4],
  zoomIdle: ['zoomOutAfter', (v) => typeof v === 'number' && v >= 0 && v <= 60],
};

let ctx = null;
let hub = null;
let status = null;
let throttle = null;
let pending = false;
let pendingForce = false;
let stateSource = 'self'; // 'self' = our own editor, 'remote' = another window pushed the last state
let lastSig = '';         // signature of the last state we published, to skip no-op sends
let lastMouse = null;     // { uri, line, ch, t }: where the mouse last rested over code or clicked

// VS Code doesn't tell extensions where the mouse is. It does ask hover providers for a tooltip
// whenever the mouse rests over code, with the document position under it, and it reports
// mouse clicks as selection changes. Those two are the zoom's "mouse".
function noteMouse(doc, position, broadcast) {
  lastMouse = { uri: doc.uri.toString(), line: position.line, ch: position.character, t: Date.now() };
  if (broadcast) send('mouse');
}

// ---- settings ----
function settings() {
  const c = vscode.workspace.getConfiguration('streamCode');
  return {
    port: Number(c.get('port', 7331)) || 7331,
    buffer: Math.max(10, Number(c.get('bufferLines', 50)) || 50),
    maxLineLength: Math.max(40, Number(c.get('maxLineLength', 400)) || 400),
    hideFiles: Array.isArray(c.get('hideFiles')) ? c.get('hideFiles') : [],
    overlayPath: String(c.get('overlayPath', '') || ''),
  };
}

// The look the overlay should use. header/bg/nums are only sent when the user actually set
// them, so a theme that hides the header by design (Minimal) keeps doing so until overridden.
function look() {
  const c = vscode.workspace.getConfiguration('streamCode');
  const explicit = (key) => {
    const i = c.inspect(key);
    if (!i) return undefined;
    if (i.workspaceFolderValue !== undefined) return i.workspaceFolderValue;
    if (i.workspaceValue !== undefined) return i.workspaceValue;
    return i.globalValue;
  };
  const theme = String(c.get('theme', 'mocha'));
  const o = {
    theme: THEME_NAMES.includes(theme) ? theme : 'mocha',
    wrap: !!c.get('wordWrap', true),
    size: Number(c.get('fontSize', 22)) || 22,
    lh: Number(c.get('lineHeight', 1.6)) || 1.6,
    fade: Math.min(45, Math.max(0, Number(c.get('edgeFade', 4)) || 0)),
    tiltx: Number(c.get('tiltX', 0)) || 0,
    tilty: Number(c.get('tiltY', 0)) || 0,
    rot: Number(c.get('rotate', 0)) || 0,
    persp: Number(c.get('perspective', 1200)) || 1200,
    scale: Number(c.get('scale', 1)) || 1,
    depth: Math.max(0, Number(c.get('depth', 0)) || 0),
    float: !!c.get('float', false),
    opacity: Number(c.get('opacity', 1)) || 1,
    zoom: ZOOM_MODES.includes(c.get('zoom')) ? c.get('zoom') : 'off',
    zoomFollow: ZOOM_FOLLOW.includes(c.get('zoomFollow')) ? c.get('zoomFollow') : 'both',
    zoomAmt: Math.min(4, Math.max(1.1, Number(c.get('zoomAmount', 1.8)) || 1.8)),
    zoomIdle: Math.max(0, Number(c.get('zoomOutAfter', 0)) || 0),
  };
  for (const k of ['header', 'bg', 'nums']) {
    const v = explicit(LOOK[k][0]);
    if (v !== undefined) o[k] = !!v;
  }
  return o;
}

// POST /look from the gallery page: {theme, header, bg, nums, wrap, size, lh}; null unsets a setting.
async function applyLookPatch(patch) {
  if (!patch || typeof patch !== 'object') throw new Error('bad patch');
  const c = vscode.workspace.getConfiguration('streamCode');
  for (const [k, [key, ok]] of Object.entries(LOOK)) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (v === null) await c.update(key, undefined, vscode.ConfigurationTarget.Global);
    else if (ok(v)) await c.update(key, v, vscode.ConfigurationTarget.Global);
    else log('rejected look value', k, v);
  }
}

// Pause lives in globalState so every window of this VS Code instance shares it.
function isPaused() { return !!(ctx && ctx.globalState.get('paused', false)); }
async function setPaused(v) {
  await ctx.globalState.update('paused', !!v);
  refreshStatus();
  send('toggle', true);
  vscode.window.setStatusBarMessage(v ? 'Stream Code: broadcasting paused' : 'Stream Code: broadcasting resumed', 2500);
}

// ---- privacy guard ----
function isHidden(doc) {
  if (doc.uri.scheme !== 'file') return false;
  for (const glob of settings().hideFiles) {
    try {
      if (vscode.languages.match({ pattern: glob }, doc) > 0) return true;
    } catch (e) { log('bad hideFiles glob', glob, e); }
  }
  return false;
}

// ---- state ----
function pos(p) { return { line: p.line, ch: p.character }; }

function fileLabel(doc) {
  if (doc.uri.scheme === 'untitled') return { file: path.basename(doc.fileName || 'Untitled'), dir: '' };
  let rel = vscode.workspace.asRelativePath(doc.uri, false);
  if (path.isAbsolute(rel) || /^[a-zA-Z]:[\\/]/.test(rel)) {
    // outside the workspace: show parent folder + name only
    rel = path.join(path.basename(path.dirname(doc.fileName)), path.basename(doc.fileName));
  }
  rel = rel.replace(/\\/g, '/');
  const i = rel.lastIndexOf('/');
  return { file: i >= 0 ? rel.slice(i + 1) : rel, dir: i >= 0 ? rel.slice(0, i) : '' };
}

// Returns the state to broadcast, or null to leave the last state alone.
function buildState() {
  const base = { v: 1, ts: Date.now(), look: look() };
  if (isPaused()) return Object.assign(base, { paused: true });

  const ed = vscode.window.activeTextEditor;
  if (!ed) {
    // Focus moved to a non-text view (settings, terminal...). Keep the last state unless
    // every editor has been closed.
    return vscode.window.visibleTextEditors.length ? null : Object.assign(base, { empty: true });
  }
  const doc = ed.document;
  if (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'untitled') return null; // output panes, diffs, settings json...

  const label = fileLabel(doc);
  if (isHidden(doc)) return Object.assign(base, { hidden: true, language: doc.languageId });

  const s = settings();
  const cur = ed.selection.active;
  const ranges = ed.visibleRanges;

  // Follow the cursor; if the streamer scrolled away from it, follow the scroll instead.
  let focus = cur.line;
  if (ranges.length && !ranges.some((r) => cur.line >= r.start.line && cur.line <= r.end.line)) {
    focus = Math.floor((ranges[0].start.line + ranges[ranges.length - 1].end.line) / 2);
  }

  // the mouse counts only while the spot it pointed at is still on screen
  let mouse = null;
  if (lastMouse && lastMouse.uri === doc.uri.toString() && lastMouse.line < doc.lineCount &&
      ranges.some((r) => lastMouse.line >= r.start.line && lastMouse.line <= r.end.line)) {
    mouse = { line: lastMouse.line, ch: lastMouse.ch, t: lastMouse.t };
  }

  let start = Math.max(0, focus - s.buffer);
  let end = Math.min(doc.lineCount - 1, focus + s.buffer);
  if (mouse) { // the overlay may centre on the mouse instead of the cursor: send its lines too
    start = Math.min(start, Math.max(0, mouse.line - MOUSE_MARGIN));
    end = Math.max(end, Math.min(doc.lineCount - 1, mouse.line + MOUSE_MARGIN));
  }
  const lines = new Array(end - start + 1);
  for (let i = start; i <= end; i++) {
    let t = doc.lineAt(i).text;
    if (t.length > s.maxLineLength) t = t.slice(0, s.maxLineLength) + '…';
    lines[i - start] = t;
  }

  const sel = ed.selection;
  return Object.assign(base, {
    file: label.file,
    dir: label.dir,
    language: doc.languageId,
    lineCount: doc.lineCount,
    tabSize: Number(ed.options.tabSize) || 4,
    dirty: doc.isDirty,
    cursor: pos(cur),
    selection: sel.isEmpty ? null : { start: pos(sel.start), end: pos(sel.end) },
    visible: ranges.length ? { start: ranges[0].start.line, end: ranges[ranges.length - 1].end.line } : null,
    mouse,
    focus,
    start,
    lines,
  });
}

// Everything the overlay draws. Editor events that change nothing here (layout churn,
// visible-range flicker, decorations) are not worth a broadcast.
function signature(s) {
  return JSON.stringify([s.file, s.dir, s.language, s.lineCount, s.tabSize, s.dirty, s.cursor, s.selection,
    s.focus, s.start, s.hidden, s.paused, s.empty, s.lines, s.look, s.mouse]);
}

// Leading + trailing throttle so a burst of keystrokes costs one broadcast per 50ms.
// `force` publishes even if nothing changed (focus came back, we became leader...).
function send(reason, force) {
  if (!hub) return;
  if (throttle) { pending = true; pendingForce = pendingForce || !!force; return; }
  doSend(reason, force);
  throttle = setTimeout(() => {
    throttle = null;
    if (pending) { const f = pendingForce; pending = false; pendingForce = false; send('trailing', f); }
  }, THROTTLE_MS);
}

function doSend(reason, force) {
  const focused = vscode.window.state.focused;
  if (hub.role === 'leader') {
    // Another window is the one being used: don't overwrite its state with ours.
    if (!focused && stateSource === 'remote') return;
  } else if (hub.role === 'follower') {
    if (!focused) return;
  } else {
    return; // 'idle': still binding; onRoleChange re-sends once settled.
  }
  const s = buildState();
  if (!s) return;
  const sig = signature(s);
  if (!force && sig === lastSig) return;
  lastSig = sig;
  s.reason = reason;
  if (hub.role === 'leader') stateSource = 'self';
  hub.publish(s);
  log('send', reason, hub.role);
}

// Settings changed: the overlay needs the new look even if no window is focused.
function pushLook() {
  if (!hub) return;
  if (hub.role === 'leader') {
    hub.state = Object.assign({}, hub.state, { look: look(), ts: Date.now(), reason: 'settings' });
    hub.publish(hub.state);
  } else {
    send('settings', true);
  }
}

// ---- commands ----
async function pickTheme() {
  const c = vscode.workspace.getConfiguration('streamCode');
  const cur = c.get('theme', 'mocha');
  const items = THEMES.map(([name, label, about]) => ({
    label: (name === cur ? '$(check) ' : '$(circle-large-outline) ') + label, description: name, detail: about, name,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Stream Code: overlay theme', matchOnDescription: true, matchOnDetail: true });
  if (picked) await c.update('theme', picked.name, vscode.ConfigurationTarget.Global);
}

function overlayUrl(q) { return `http://127.0.0.1:${settings().port}/${q || ''}`; }

// ---- status bar ----
function refreshStatus() {
  if (!status || !hub) return;
  const paused = isPaused();
  status.text = paused ? '$(debug-pause) Code paused' : '$(broadcast) Code';
  status.tooltip = `Stream Code — ${paused ? 'PAUSED' : 'broadcasting'} (${hub.role}, ${overlayUrl()})\n` +
    `Click to ${paused ? 'resume' : 'pause'}. Theme and options: "Stream Code: Pick a theme" / "Stream Code: Settings" in the command palette.`;
  status.backgroundColor = paused ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
}

// ---- hub lifecycle ----
function startHub() {
  const s = settings();
  hub = new Hub({
    port: s.port,
    overlayFile: path.join(ctx.extensionPath, 'overlay.html'),
    overlayOverride: s.overlayPath,
    log,
    onRemoteState: () => { stateSource = 'remote'; lastSig = ''; },
    onRoleChange: (role) => {
      refreshStatus();
      if (role === 'leader') send('became leader', true);
    },
    onLook: (patch) => applyLookPatch(patch),
  });
  hub.start();
}

function restartHub() {
  if (hub) hub.stop();
  hub = null;
  stateSource = 'self';
  lastSig = '';
  startHub();
}

function activate(context) {
  ctx = context;
  startHub();

  status = vscode.window.createStatusBarItem('streamCode.status', vscode.StatusBarAlignment.Right, 50);
  status.name = 'Stream Code';
  status.command = 'streamCode.toggle';
  status.show();
  refreshStatus();

  const sub = context.subscriptions;
  sub.push(status);
  sub.push(vscode.commands.registerCommand('streamCode.toggle', () => setPaused(!isPaused())));
  sub.push(vscode.commands.registerCommand('streamCode.pickTheme', pickTheme));
  sub.push(vscode.commands.registerCommand('streamCode.openSettings', () =>
    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:heyjeay.stream-code')));
  sub.push(vscode.commands.registerCommand('streamCode.openGallery', () => vscode.env.openExternal(vscode.Uri.parse(overlayUrl('?gallery')))));
  sub.push(vscode.commands.registerCommand('streamCode.openOverlay', () => vscode.env.openExternal(vscode.Uri.parse(overlayUrl()))));

  const active = (editor) => editor && editor === vscode.window.activeTextEditor;
  sub.push(vscode.window.onDidChangeActiveTextEditor(() => send('editor')));
  sub.push(vscode.window.onDidChangeTextEditorSelection((e) => {
    if (!active(e.textEditor)) return;
    if (e.kind === vscode.TextEditorSelectionChangeKind.Mouse) noteMouse(e.textEditor.document, e.selections[0].active, false);
    send('selection');
  }));
  // mouse resting over code: never returns a tooltip of its own, it only notes the position
  sub.push(vscode.languages.registerHoverProvider([{ scheme: 'file' }, { scheme: 'untitled' }], {
    provideHover(doc, position) {
      const ed = vscode.window.activeTextEditor;
      if (ed && ed.document === doc) noteMouse(doc, position, true);
      return undefined;
    },
  }));
  sub.push(vscode.window.onDidChangeTextEditorVisibleRanges((e) => { if (active(e.textEditor)) send('scroll'); }));
  sub.push(vscode.window.onDidChangeTextEditorOptions((e) => { if (active(e.textEditor)) send('options'); }));
  sub.push(vscode.workspace.onDidChangeTextDocument((e) => {
    const ed = vscode.window.activeTextEditor;
    if (ed && e.document === ed.document) send('edit');
  }));
  sub.push(vscode.workspace.onDidSaveTextDocument((d) => {
    const ed = vscode.window.activeTextEditor;
    if (ed && d === ed.document) send('save');
  }));
  sub.push(vscode.window.onDidChangeWindowState((ws) => { if (ws.focused) { refreshStatus(); send('focus', true); } }));
  sub.push(vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration('streamCode')) return;
    if (e.affectsConfiguration('streamCode.port') || e.affectsConfiguration('streamCode.overlayPath')) { restartHub(); refreshStatus(); return; }
    refreshStatus();
    pushLook();
  }));
  sub.push({ dispose: deactivate });

  send('activate', true);
  log('activated');
}

function deactivate() {
  if (throttle) { clearTimeout(throttle); throttle = null; }
  pending = false;
  pendingForce = false;
  if (hub) { hub.stop(); hub = null; }
}

module.exports = { activate, deactivate };
