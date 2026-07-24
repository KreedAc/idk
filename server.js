/*
 * HomeCloud — il tuo PC di casa come cloud personale.
 * Server: autenticazione, API file (storage), statistiche di sistema,
 * e serve l'interfaccia web in stile desktop.
 */
const express = require('express');
const multer = require('multer');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const crypto = require('crypto');
const dgram = require('dgram');
const net = require('net');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Configurazione: al primo avvio viene creato config.json con una password
// generata casualmente, stampata in console.
// ---------------------------------------------------------------------------
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config;
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} else {
  config = {
    port: 8080,
    password: crypto.randomBytes(9).toString('base64url'),
    storageDir: path.join(__dirname, 'storage'),
    // URL del client noVNC per il desktop remoto, es. "http://localhost:6080/vnc.html"
    remoteDesktopUrl: '',
    // Programmi avviabili dalla UI, es. { "name": "Blocco note", "command": "notepad.exe" }
    launcherApps: [],
    // Altri dispositivi della rete, accendibili via Wake-on-LAN,
    // es. { "name": "PC Studio", "mac": "AA:BB:CC:DD:EE:FF", "host": "192.168.1.42" }
    devices: []
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('==============================================');
  console.log('  Creato config.json con password generata:');
  console.log(`  PASSWORD: ${config.password}`);
  console.log('  (puoi cambiarla in config.json)');
  console.log('==============================================');
}

const STORAGE_ROOT = path.resolve(config.storageDir);
fs.mkdirSync(STORAGE_ROOT, { recursive: true });

// ---------------------------------------------------------------------------
// Sessioni in memoria (token -> scadenza)
// ---------------------------------------------------------------------------
const sessions = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 giorni

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function sessionToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)hc_session=([a-f0-9]{64})/);
  return match ? match[1] : null;
}

function validSession(req) {
  const token = sessionToken(req);
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry || expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function checkPassword(given) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(config.password);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Anti brute-force: max 10 tentativi al minuto per IP
const loginAttempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (loginAttempts.get(ip) || []).filter((t) => now - t < 60000);
  loginAttempts.set(ip, list);
  return list.length >= 10;
}

// ---------------------------------------------------------------------------
// Percorsi sicuri dentro lo storage (blocco path traversal)
// ---------------------------------------------------------------------------
function safePath(relPath) {
  const resolved = path.resolve(STORAGE_ROOT, '.' + path.posix.sep + String(relPath || ''));
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    const err = new Error('Percorso non valido');
    err.status = 400;
    throw err;
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const dest = safePath(req.query.path);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      } catch (e) {
        cb(e);
      }
    },
    filename: (req, file, cb) => {
      // Mantiene il nome originale, ripulito da eventuali percorsi
      cb(null, path.basename(file.originalname));
    }
  })
});

app.post('/api/login', (req, res) => {
  const ip = req.socket.remoteAddress;
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'Troppi tentativi, riprova tra un minuto' });
  }
  if (!checkPassword(req.body.password)) {
    loginAttempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Password errata' });
  }
  const token = createSession();
  res.setHeader(
    'Set-Cookie',
    `hc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}`
  );
  res.json({ ok: true });
});

// Da qui in poi tutte le API richiedono la sessione
app.use('/api', (req, res, next) => {
  if (req.path === '/login') return next();
  if (!validSession(req)) return res.status(401).json({ error: 'Non autenticato' });
  next();
});

app.post('/api/logout', (req, res) => {
  const token = sessionToken(req);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'hc_session=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ ok: true, hostname: os.hostname() });
});

app.get('/api/settings', (req, res) => {
  res.json({ remoteDesktopUrl: config.remoteDesktopUrl || '' });
});

// --- File API -------------------------------------------------------------
app.get('/api/files', async (req, res, next) => {
  try {
    const dir = safePath(req.query.path);
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(
      entries.map(async (e) => {
        let size = 0;
        let mtime = 0;
        try {
          const st = await fsp.stat(path.join(dir, e.name));
          size = st.size;
          mtime = st.mtimeMs;
        } catch {}
        return { name: e.name, dir: e.isDirectory(), size, mtime };
      })
    );
    items.sort((a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name)));
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

app.get('/api/download', (req, res, next) => {
  try {
    const file = safePath(req.query.path);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return res.status(404).json({ error: 'File non trovato' });
    }
    // inline=1: il file viene mostrato nel browser (anteprime) invece di scaricato
    if (req.query.inline === '1') res.sendFile(file);
    else res.download(file);
  } catch (e) {
    next(e);
  }
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({ ok: true, count: (req.files || []).length });
});

app.post('/api/mkdir', async (req, res, next) => {
  try {
    const name = path.basename(String(req.body.name || '').trim());
    if (!name) return res.status(400).json({ error: 'Nome mancante' });
    await fsp.mkdir(path.join(safePath(req.body.path), name), { recursive: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/rename', async (req, res, next) => {
  try {
    const from = safePath(req.body.path);
    const newName = path.basename(String(req.body.newName || '').trim());
    if (!newName) return res.status(400).json({ error: 'Nome mancante' });
    await fsp.rename(from, path.join(path.dirname(from), newName));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/delete', async (req, res, next) => {
  try {
    const target = safePath(req.body.path);
    if (target === STORAGE_ROOT) return res.status(400).json({ error: 'Non puoi eliminare la radice' });
    await fsp.rm(target, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// --- Launcher di programmi ---------------------------------------------------
// I programmi avviabili sono SOLO quelli dichiarati in config.json
app.get('/api/apps', (req, res) => {
  const apps = (config.launcherApps || []).map((a, i) => ({ id: i, name: a.name }));
  res.json({ apps });
});

app.post('/api/apps/run', (req, res) => {
  const entry = (config.launcherApps || [])[Number(req.body.id)];
  if (!entry) return res.status(404).json({ error: 'Programma non trovato' });
  try {
    const child = spawn(entry.command, {
      shell: true,
      detached: true,
      stdio: 'ignore',
      cwd: os.homedir()
    });
    child.unref();
    res.json({ ok: true, name: entry.name });
  } catch (e) {
    res.status(500).json({ error: `Avvio fallito: ${e.message}` });
  }
});

// --- Dispositivi: stato e accensione via Wake-on-LAN -------------------------
// Il "magic packet" WoL è un pacchetto UDP con 6 byte 0xFF seguiti dal MAC
// address del PC ripetuto 16 volte: la scheda di rete lo riconosce anche a
// PC spento e avvia l'accensione.
function sendWakeOnLan(mac, broadcast = '255.255.255.255') {
  const clean = String(mac).replace(/[^0-9a-fA-F]/g, '');
  if (clean.length !== 12) return Promise.reject(new Error('MAC address non valido'));
  const macBuf = Buffer.from(clean, 'hex');
  const packet = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(macBuf)]);
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.on('error', (e) => {
      socket.close();
      reject(e);
    });
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 9, broadcast, (err) => {
        socket.close();
        err ? reject(err) : resolve();
      });
    });
  });
}

// Un host è "acceso" se risponde al ping, oppure — se ping non è disponibile —
// se risponde a una sonda TCP (anche un rifiuto di connessione è una risposta).
function tcpProbe(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: 1200 });
    const done = (up) => {
      sock.destroy();
      resolve(up);
    };
    sock.on('connect', () => done(true));
    sock.on('error', (e) => done(e.code === 'ECONNREFUSED'));
    sock.on('timeout', () => done(false));
  });
}

function pingHost(host) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const p = spawn('ping', isWin ? ['-n', '1', '-w', '1200', host] : ['-c', '1', '-W', '1', host]);
    p.on('exit', (code) => resolve(code === 0 ? true : null));
    p.on('error', () => resolve(null)); // ping non disponibile
  });
}

async function hostOnline(host) {
  if (!host) return null;
  const ping = await pingHost(host);
  if (ping !== null) return ping;
  const probes = await Promise.all([3389, 445, 22, 80, 8080].map((p) => tcpProbe(host, p)));
  return probes.some(Boolean);
}

app.get('/api/devices', async (req, res) => {
  const devices = await Promise.all(
    (config.devices || []).map(async (d, i) => ({
      id: i,
      name: d.name,
      host: d.host || '',
      canWake: Boolean(d.mac),
      online: await hostOnline(d.host)
    }))
  );
  res.json({ devices });
});

app.post('/api/devices/wake', async (req, res) => {
  const entry = (config.devices || [])[Number(req.body.id)];
  if (!entry) return res.status(404).json({ error: 'Dispositivo non trovato' });
  if (!entry.mac) return res.status(400).json({ error: 'MAC address non configurato' });
  try {
    await sendWakeOnLan(entry.mac, entry.broadcast);
    res.json({ ok: true, name: entry.name });
  } catch (e) {
    res.status(500).json({ error: `Invio fallito: ${e.message}` });
  }
});

// --- Statistiche di sistema -------------------------------------------------
// L'uso CPU è calcolato come delta tra due letture di os.cpus()
let prevCpu = os.cpus().map((c) => ({ ...c.times }));
function cpuUsage() {
  const now = os.cpus().map((c) => ({ ...c.times }));
  let idle = 0;
  let total = 0;
  for (let i = 0; i < now.length; i++) {
    const p = prevCpu[i] || now[i];
    for (const k of Object.keys(now[i])) total += now[i][k] - p[k];
    idle += now[i].idle - p.idle;
  }
  prevCpu = now;
  return total > 0 ? Math.round((1 - idle / total) * 100) : 0;
}

app.get('/api/stats', async (req, res) => {
  let disk = null;
  try {
    const st = await fsp.statfs(STORAGE_ROOT);
    disk = { total: st.blocks * st.bsize, free: st.bavail * st.bsize };
  } catch {}
  res.json({
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptime: os.uptime(),
    cpuModel: os.cpus()[0]?.model || 'sconosciuta',
    cpuCount: os.cpus().length,
    cpuUsage: cpuUsage(),
    memTotal: os.totalmem(),
    memFree: os.freemem(),
    disk
  });
});

// --- Gestione errori --------------------------------------------------------
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Errore interno' });
});

// --- Terminale via WebSocket -------------------------------------------------
// Ogni connessione apre una shell reale sul PC (bash/PowerShell), protetta
// dalla stessa sessione di login delle API.
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/api/term' || !validSession(req)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  const isWin = process.platform === 'win32';
  const shell = spawn(isWin ? 'powershell.exe' : process.env.SHELL || 'bash', isWin ? ['-NoLogo'] : [], {
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'dumb' }
  });

  const send = (type, data) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data }));
  };
  send('info', `Shell: ${isWin ? 'PowerShell' : shell.spawnfile} · cartella: ${os.homedir()}`);

  shell.stdout.on('data', (d) => send('output', d.toString()));
  shell.stderr.on('data', (d) => send('output', d.toString()));
  shell.on('exit', (code) => {
    send('exit', code);
    ws.close();
  });
  shell.on('error', (e) => {
    send('output', `Errore shell: ${e.message}\n`);
    ws.close();
  });

  ws.on('message', (msg) => {
    try {
      const { type, data } = JSON.parse(msg);
      if (type === 'input') shell.stdin.write(data);
    } catch {}
  });
  ws.on('close', () => {
    try {
      shell.kill();
    } catch {}
  });
});

server.listen(config.port, () => {
  console.log(`HomeCloud in ascolto su http://localhost:${config.port}`);
  console.log(`Storage: ${STORAGE_ROOT}`);
});
