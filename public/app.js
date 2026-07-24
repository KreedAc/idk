/* HomeCloud — interfaccia desktop nel browser */

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);

async function api(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    showLogin();
    throw new Error('Non autenticato');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(ms) {
  return new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function formatUptime(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}g ${h}h ${m}m` : `${h}h ${m}m`;
}

const escapeDiv = document.createElement('div');
function esc(text) {
  escapeDiv.textContent = text;
  return escapeDiv.innerHTML;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function showLogin() {
  $('#desktop').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  $('#login-password').focus();
}

function showDesktop(hostname) {
  $('#login-screen').classList.add('hidden');
  $('#desktop').classList.remove('hidden');
  $('#start-hostname').textContent = `· ${hostname}`;
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#login-error');
  errEl.textContent = '';
  try {
    await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('#login-password').value })
    });
    $('#login-password').value = '';
    const me = await api('/api/me');
    showDesktop(me.hostname);
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// ---------------------------------------------------------------------------
// Window manager
// ---------------------------------------------------------------------------
let zCounter = 100;
let winCounter = 0;
const openWindows = new Map(); // id -> { el, taskBtn, title }

function focusWindow(id) {
  const win = openWindows.get(id);
  if (!win) return;
  win.el.style.zIndex = ++zCounter;
  for (const [wid, w] of openWindows) {
    w.el.classList.toggle('focused', wid === id);
    w.taskBtn.classList.toggle('active', wid === id);
  }
}

function closeWindow(id) {
  const win = openWindows.get(id);
  if (!win) return;
  win.el.remove();
  win.taskBtn.remove();
  openWindows.delete(id);
  if (win.onClose) win.onClose();
}

function createWindow({ appId, title, width = 640, height = 440, noPad = false }) {
  // Se l'app è già aperta, portala in primo piano
  for (const [id, w] of openWindows) {
    if (w.appId === appId) {
      w.el.classList.remove('hidden');
      focusWindow(id);
      return null;
    }
  }

  const id = `win-${++winCounter}`;
  const el = document.createElement('div');
  el.className = 'window';
  const offset = (winCounter % 8) * 26;
  el.style.left = `${60 + offset}px`;
  el.style.top = `${40 + offset}px`;
  el.style.width = `${Math.min(width, window.innerWidth - 40)}px`;
  el.style.height = `${Math.min(height, window.innerHeight - 90)}px`;
  el.innerHTML = `
    <div class="window-titlebar">
      <span class="title">${esc(title)}</span>
      <button class="btn-min" title="Riduci a icona">–</button>
      <button class="btn-max" title="Ingrandisci">□</button>
      <button class="btn-close" title="Chiudi">✕</button>
    </div>
    <div class="window-body ${noPad ? 'no-pad' : ''}"></div>`;
  $('#windows-layer').appendChild(el);

  const taskBtn = document.createElement('button');
  taskBtn.className = 'taskbar-win';
  taskBtn.textContent = title;
  taskBtn.addEventListener('click', () => {
    if (el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      focusWindow(id);
    } else if (taskBtn.classList.contains('active')) {
      el.classList.add('hidden');
      taskBtn.classList.remove('active');
    } else {
      focusWindow(id);
    }
  });
  $('#taskbar-windows').appendChild(taskBtn);

  const win = { el, taskBtn, appId, title, onClose: null };
  openWindows.set(id, win);

  el.addEventListener('mousedown', () => focusWindow(id));
  $('.btn-close', el).addEventListener('click', () => closeWindow(id));
  $('.btn-min', el).addEventListener('click', () => {
    el.classList.add('hidden');
    taskBtn.classList.remove('active');
  });
  $('.btn-max', el).addEventListener('click', () => el.classList.toggle('maximized'));

  // Trascinamento dalla barra del titolo
  const titlebar = $('.window-titlebar', el);
  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || el.classList.contains('maximized')) return;
    const startX = e.clientX - el.offsetLeft;
    const startY = e.clientY - el.offsetTop;
    function onMove(ev) {
      el.style.left = `${Math.max(0, ev.clientX - startX)}px`;
      el.style.top = `${Math.max(0, ev.clientY - startY)}px`;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  titlebar.addEventListener('dblclick', (e) => {
    if (e.target.tagName !== 'BUTTON') el.classList.toggle('maximized');
  });

  focusWindow(id);
  return { id, body: $('.window-body', el), win };
}

// ---------------------------------------------------------------------------
// App: File
// ---------------------------------------------------------------------------
function openFilesApp() {
  const created = createWindow({ appId: 'files', title: '📁 File', width: 720, height: 480 });
  if (!created) return;
  const { body } = created;
  let currentPath = '';

  body.innerHTML = `
    <div class="files-toolbar">
      <button data-act="up" title="Cartella superiore">⬆️</button>
      <button data-act="refresh" title="Aggiorna">🔄</button>
      <span class="breadcrumb"></span>
      <button data-act="mkdir">➕ Cartella</button>
      <button data-act="upload">⬆️ Carica file</button>
      <input type="file" multiple class="hidden upload-input">
    </div>
    <div class="files-dropzone"><table class="file-list"><tbody></tbody></table><div class="files-empty hidden"></div></div>`;

  const tbody = $('tbody', body);
  const emptyEl = $('.files-empty', body);
  const dropzone = $('.files-dropzone', body);
  const uploadInput = $('.upload-input', body);

  function renderBreadcrumb() {
    const bc = $('.breadcrumb', body);
    const parts = currentPath.split('/').filter(Boolean);
    let html = `<a data-path="">🏠 Storage</a>`;
    let acc = '';
    for (const p of parts) {
      acc += (acc ? '/' : '') + p;
      html += ` / <a data-path="${esc(acc)}">${esc(p)}</a>`;
    }
    bc.innerHTML = html;
    bc.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => load(a.dataset.path))
    );
  }

  async function load(path = currentPath) {
    currentPath = path;
    renderBreadcrumb();
    try {
      const { items } = await api(`/api/files?path=${encodeURIComponent(currentPath)}`);
      tbody.innerHTML = '';
      emptyEl.classList.toggle('hidden', items.length > 0);
      emptyEl.textContent = 'Cartella vuota — trascina qui i file per caricarli';
      for (const item of items) {
        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        const tr = document.createElement('tr');
        tr.className = 'file-row';
        tr.innerHTML = `
          <td class="file-name">${item.dir ? '📁' : '📄'} ${esc(item.name)}</td>
          <td class="file-meta">${item.dir ? '—' : formatSize(item.size)}</td>
          <td class="file-meta">${formatDate(item.mtime)}</td>
          <td class="file-actions">
            ${item.dir ? '' : `<button data-act="download" title="Scarica">⬇️</button>`}
            <button data-act="rename" title="Rinomina">✏️</button>
            <button data-act="delete" title="Elimina">🗑️</button>
          </td>`;
        tr.addEventListener('dblclick', () => {
          if (item.dir) load(itemPath);
          else if (previewKind(item.name)) openPreview(itemPath, item.name);
          else window.open(`/api/download?path=${encodeURIComponent(itemPath)}`);
        });
        $('[data-act="download"]', tr)?.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`/api/download?path=${encodeURIComponent(itemPath)}`);
        });
        $('[data-act="rename"]', tr).addEventListener('click', async (e) => {
          e.stopPropagation();
          const newName = prompt('Nuovo nome:', item.name);
          if (!newName || newName === item.name) return;
          await api('/api/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: itemPath, newName })
          }).catch((err) => alert(err.message));
          load();
        });
        $('[data-act="delete"]', tr).addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Eliminare "${item.name}"${item.dir ? ' e tutto il contenuto' : ''}?`)) return;
          await api('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: itemPath })
          }).catch((err) => alert(err.message));
          load();
        });
        tbody.appendChild(tr);
      }
    } catch (err) {
      tbody.innerHTML = '';
      emptyEl.classList.remove('hidden');
      emptyEl.textContent = `Errore: ${err.message}`;
    }
  }

  async function uploadFiles(files) {
    if (!files.length) return;
    const form = new FormData();
    for (const f of files) form.append('files', f);
    try {
      await api(`/api/upload?path=${encodeURIComponent(currentPath)}`, { method: 'POST', body: form });
    } catch (err) {
      alert(`Errore caricamento: ${err.message}`);
    }
    load();
  }

  $('[data-act="up"]', body).addEventListener('click', () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    load(parts.join('/'));
  });
  $('[data-act="refresh"]', body).addEventListener('click', () => load());
  $('[data-act="mkdir"]', body).addEventListener('click', async () => {
    const name = prompt('Nome della nuova cartella:');
    if (!name) return;
    await api('/api/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, name })
    }).catch((err) => alert(err.message));
    load();
  });
  $('[data-act="upload"]', body).addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', () => {
    uploadFiles([...uploadInput.files]);
    uploadInput.value = '';
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    uploadFiles([...e.dataTransfer.files]);
  });

  load('');
}

// ---------------------------------------------------------------------------
// Anteprime file (immagini, video, audio, PDF, testo)
// ---------------------------------------------------------------------------
const PREVIEW_TYPES = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
  video: ['mp4', 'webm', 'ogv', 'mov', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  pdf: ['pdf'],
  text: ['txt', 'md', 'log', 'json', 'js', 'css', 'html', 'xml', 'csv', 'ini', 'cfg', 'conf', 'py', 'sh', 'bat', 'yml', 'yaml']
};

function previewKind(name) {
  const ext = name.split('.').pop().toLowerCase();
  for (const [kind, exts] of Object.entries(PREVIEW_TYPES)) {
    if (exts.includes(ext)) return kind;
  }
  return null;
}

async function openPreview(itemPath, name) {
  const kind = previewKind(name);
  const url = `/api/download?path=${encodeURIComponent(itemPath)}&inline=1`;
  const created = createWindow({
    appId: `preview:${itemPath}`,
    title: `👁️ ${name}`,
    width: kind === 'audio' ? 460 : 760,
    height: kind === 'audio' ? 220 : 540,
    noPad: kind !== 'text'
  });
  if (!created) return;
  const { body } = created;

  if (kind === 'image') {
    body.innerHTML = `<img class="preview-media" src="${esc(url)}" alt="${esc(name)}">`;
  } else if (kind === 'video') {
    body.innerHTML = `<video class="preview-media" src="${esc(url)}" controls autoplay></video>`;
  } else if (kind === 'audio') {
    body.innerHTML = `<div class="preview-audio"><audio src="${esc(url)}" controls autoplay></audio></div>`;
  } else if (kind === 'pdf') {
    body.innerHTML = `<iframe class="preview-frame" src="${esc(url)}"></iframe>`;
  } else {
    body.innerHTML = `<div class="preview-text">Caricamento…</div>`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      $('.preview-text', body).textContent = text.slice(0, 500000) || '(file vuoto)';
    } catch (err) {
      $('.preview-text', body).textContent = `Errore: ${err.message}`;
    }
  }
}

// ---------------------------------------------------------------------------
// App: Terminale
// ---------------------------------------------------------------------------
function openTerminalApp() {
  const created = createWindow({ appId: 'terminal', title: '⌨️ Terminale', width: 720, height: 460, noPad: true });
  if (!created) return;
  const { body, win } = created;

  body.innerHTML = `
    <div class="term">
      <div class="term-output"></div>
      <div class="term-input-row">
        <span class="term-prompt">❯</span>
        <input class="term-input" spellcheck="false" autocomplete="off"
               placeholder="Scrivi un comando e premi Invio (es. dir, ls, ipconfig)…">
      </div>
    </div>`;

  const output = $('.term-output', body);
  const input = $('.term-input', body);
  const history = [];
  let histIdx = -1;

  const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07/g, '');

  function append(text, cls) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text;
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/api/term`);

  ws.addEventListener('message', (e) => {
    try {
      const { type, data } = JSON.parse(e.data);
      if (type === 'output') append(stripAnsi(data));
      else if (type === 'info') append(data + '\n\n', 'term-info');
      else if (type === 'exit') append(`\n[shell terminata, codice ${data}]\n`, 'term-info');
    } catch {}
  });
  ws.addEventListener('close', () => append('\n[connessione chiusa — riapri la finestra per una nuova shell]\n', 'term-info'));
  ws.addEventListener('error', () => append('\n[errore di connessione]\n', 'term-info'));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      append(`❯ ${cmd}\n`, 'term-cmd');
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data: cmd + '\n' }));
      if (cmd.trim()) history.push(cmd);
      histIdx = history.length;
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      if (histIdx > 0) input.value = history[--histIdx];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      input.value = histIdx < history.length - 1 ? history[++histIdx] : ((histIdx = history.length), '');
      e.preventDefault();
    }
  });

  body.addEventListener('click', () => input.focus());
  input.focus();
  win.onClose = () => ws.close();
}

// ---------------------------------------------------------------------------
// App: Avvia programmi
// ---------------------------------------------------------------------------
async function openLauncherApp() {
  const created = createWindow({ appId: 'launcher', title: '🚀 Avvia programmi', width: 480, height: 400 });
  if (!created) return;
  const { body } = created;

  let apps = [];
  try {
    apps = (await api('/api/apps')).apps;
  } catch (err) {
    body.innerHTML = `<p>Errore: ${esc(err.message)}</p>`;
    return;
  }

  if (!apps.length) {
    body.innerHTML = `
      <div class="launcher-empty">
        <h2>🚀 Nessun programma configurato</h2>
        <p>Aggiungi i programmi che vuoi poter avviare da remoto in
        <code>config.json</code>, campo <code>launcherApps</code>:</p>
        <pre>"launcherApps": [
  { "name": "Blocco note", "command": "notepad.exe" },
  { "name": "Calcolatrice", "command": "calc.exe" },
  { "name": "Riavvia PC", "command": "shutdown /r /t 60" }
]</pre>
        <p>Poi riavvia HomeCloud. I programmi partono <b>sul PC di casa</b>
        (li vedi tramite la finestra Desktop remoto).</p>
      </div>`;
    return;
  }

  body.innerHTML = `<div class="launcher-list"></div><p class="launcher-msg"></p>`;
  const list = $('.launcher-list', body);
  const msg = $('.launcher-msg', body);
  for (const app of apps) {
    const row = document.createElement('div');
    row.className = 'launcher-item';
    row.innerHTML = `<span class="name">▶️ ${esc(app.name)}</span><button>Avvia</button>`;
    $('button', row).addEventListener('click', async () => {
      msg.textContent = '';
      try {
        await api('/api/apps/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: app.id })
        });
        msg.textContent = `✅ "${app.name}" avviato sul PC`;
      } catch (err) {
        msg.textContent = `❌ ${err.message}`;
      }
    });
    list.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// App: Monitor di sistema
// ---------------------------------------------------------------------------
function openMonitorApp() {
  const created = createWindow({ appId: 'monitor', title: '📊 Monitor di sistema', width: 560, height: 460 });
  if (!created) return;
  const { body, win } = created;

  body.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card wide">
        <div class="stat-title">Sistema</div>
        <div class="stat-value" id="st-host">—</div>
        <div class="stat-sub" id="st-platform">—</div>
        <div class="stat-sub" id="st-uptime">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">CPU</div>
        <div class="stat-value" id="st-cpu">—</div>
        <div class="stat-sub" id="st-cpu-model">—</div>
        <div class="bar"><div class="bar-fill" id="bar-cpu"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Memoria RAM</div>
        <div class="stat-value" id="st-mem">—</div>
        <div class="stat-sub" id="st-mem-detail">—</div>
        <div class="bar"><div class="bar-fill" id="bar-mem"></div></div>
      </div>
      <div class="stat-card wide">
        <div class="stat-title">Disco (storage)</div>
        <div class="stat-value" id="st-disk">—</div>
        <div class="stat-sub" id="st-disk-detail">—</div>
        <div class="bar"><div class="bar-fill" id="bar-disk"></div></div>
      </div>
    </div>`;

  function setBar(el, pct) {
    el.style.width = `${pct}%`;
    el.className = 'bar-fill' + (pct > 90 ? ' crit' : pct > 70 ? ' warn' : '');
  }

  async function refresh() {
    try {
      const s = await api('/api/stats');
      $('#st-host', body).textContent = s.hostname;
      $('#st-platform', body).textContent = s.platform;
      $('#st-uptime', body).textContent = `Acceso da: ${formatUptime(s.uptime)}`;
      $('#st-cpu', body).textContent = `${s.cpuUsage}%`;
      $('#st-cpu-model', body).textContent = `${s.cpuModel} · ${s.cpuCount} core`;
      setBar($('#bar-cpu', body), s.cpuUsage);
      const memUsed = s.memTotal - s.memFree;
      const memPct = Math.round((memUsed / s.memTotal) * 100);
      $('#st-mem', body).textContent = `${memPct}%`;
      $('#st-mem-detail', body).textContent = `${formatSize(memUsed)} usati di ${formatSize(s.memTotal)}`;
      setBar($('#bar-mem', body), memPct);
      if (s.disk) {
        const used = s.disk.total - s.disk.free;
        const pct = Math.round((used / s.disk.total) * 100);
        $('#st-disk', body).textContent = `${pct}%`;
        $('#st-disk-detail', body).textContent = `${formatSize(used)} usati di ${formatSize(s.disk.total)} · liberi ${formatSize(s.disk.free)}`;
        setBar($('#bar-disk', body), pct);
      } else {
        $('#st-disk', body).textContent = 'n/d';
      }
    } catch {}
  }

  refresh();
  const interval = setInterval(refresh, 3000);
  win.onClose = () => clearInterval(interval);
}

// ---------------------------------------------------------------------------
// App: Desktop remoto
// ---------------------------------------------------------------------------
async function openRemoteApp() {
  const created = createWindow({ appId: 'remote', title: '🖥️ Desktop remoto', width: 900, height: 600, noPad: true });
  if (!created) return;
  const { body } = created;

  let url = '';
  try {
    const settings = await api('/api/settings');
    url = settings.remoteDesktopUrl;
  } catch {}

  if (url) {
    body.innerHTML = `<iframe class="remote-frame" src="${esc(url)}" allow="clipboard-read; clipboard-write"></iframe>`;
  } else {
    body.innerHTML = `
      <div class="remote-setup">
        <h2>🖥️ Desktop remoto non ancora configurato</h2>
        <p>Per vedere e usare lo schermo del PC da qui serve un server VNC con client web (noVNC). Configurazione rapida:</p>
        <ol>
          <li>Installa un server VNC sul PC (es. <b>TightVNC</b> su Windows).</li>
          <li>Avvia <b>noVNC + websockify</b> puntando al server VNC (vedi README del progetto).</li>
          <li>Apri <code>config.json</code> e imposta <code>remoteDesktopUrl</code>, ad esempio:<br>
            <code>"remoteDesktopUrl": "http://localhost:6080/vnc.html"</code></li>
          <li>Riavvia HomeCloud e riapri questa finestra.</li>
        </ol>
        <p>In alternativa puoi usare qualunque pagina raggiungibile via URL (es. Apache Guacamole).</p>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// App: Info
// ---------------------------------------------------------------------------
function openInfoApp() {
  const created = createWindow({ appId: 'info', title: 'ℹ️ Informazioni', width: 520, height: 420 });
  if (!created) return;
  created.body.innerHTML = `
    <div class="info-body">
      <h2>☁️ HomeCloud <small>v0.1 — prototipo</small></h2>
      <p>Il tuo PC di casa come cloud personale: storage e desktop remoto accessibili
      dal browser di qualunque dispositivo, con un'interfaccia in stile desktop.</p>
      <ul>
        <li><b>📁 File</b> — carica, scarica e organizza i tuoi file sul PC di casa,
        con anteprima di foto, video, audio, PDF e testo.</li>
        <li><b>📊 Monitor</b> — stato del PC in tempo reale (CPU, RAM, disco).</li>
        <li><b>⌨️ Terminale</b> — una shell vera sul PC di casa, dal browser.</li>
        <li><b>🚀 Avvia</b> — lancia i programmi configurati sul PC.</li>
        <li><b>🖥️ Desktop remoto</b> — lo schermo del PC in una finestra (via VNC/noVNC).</li>
      </ul>
      <p><b>Prossimi passi</b>: sincronizzazione automatica, condivisione file con link,
      supporto "cloud phone".</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Avvio app + menu start + orologio
// ---------------------------------------------------------------------------
const apps = {
  files: openFilesApp,
  monitor: openMonitorApp,
  terminal: openTerminalApp,
  launcher: openLauncherApp,
  remote: openRemoteApp,
  info: openInfoApp
};

document.querySelectorAll('[data-app]').forEach((btn) =>
  btn.addEventListener('click', () => {
    $('#start-menu').classList.add('hidden');
    apps[btn.dataset.app]();
  })
);

$('#start-button').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#start-menu').classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!$('#start-menu').contains(e.target)) $('#start-menu').classList.add('hidden');
});

$('#btn-logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  location.reload();
});

function tickClock() {
  $('#taskbar-clock').textContent = new Date().toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
tickClock();
setInterval(tickClock, 10000);

// All'avvio: se la sessione è valida mostra il desktop, altrimenti il login
(async () => {
  try {
    const me = await api('/api/me');
    showDesktop(me.hostname);
  } catch {
    showLogin();
  }
})();
