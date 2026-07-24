/*
 * HomeCloud — il tuo PC di casa come cloud personale.
 * Server: autenticazione, API file (storage), statistiche di sistema,
 * e serve l'interfaccia web in stile desktop.
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
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
    remoteDesktopUrl: ''
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

function validSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)hc_session=([a-f0-9]{64})/);
  if (!match) return false;
  const expiry = sessions.get(match[1]);
  if (!expiry || expiry < Date.now()) {
    sessions.delete(match[1]);
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
  const match = (req.headers.cookie || '').match(/hc_session=([a-f0-9]{64})/);
  if (match) sessions.delete(match[1]);
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
    res.download(file);
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

app.listen(config.port, () => {
  console.log(`HomeCloud in ascolto su http://localhost:${config.port}`);
  console.log(`Storage: ${STORAGE_ROOT}`);
});
