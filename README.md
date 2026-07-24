# ☁️ HomeCloud — prototipo v0.1

Trasforma il tuo PC di casa in un **cloud personale**: storage di file e desktop
remoto, accessibili dal browser di qualunque dispositivo (PC del lavoro,
telefono, tablet) con un'interfaccia in stile desktop Windows.

> **La visione**: un unico ambiente remoto dove vivono i tuoi file e le tue
> macchine, e ogni dispositivo fisico è solo una "finestra" per entrarci.
> Questo prototipo è il primo passo: il PC di casa fa da server.

## Cosa fa oggi

- **📁 File** — file manager nel browser: carica (anche col drag & drop),
  scarica, rinomina, elimina, crea cartelle. I file vivono sul disco del PC di
  casa, nella cartella `storage/`. **Doppio clic per l'anteprima** di foto,
  video, musica, PDF e file di testo, direttamente in una finestra.
- **📊 Monitor di sistema** — CPU, RAM, disco e uptime del PC in tempo reale.
- **⌨️ Terminale** — una shell **vera** sul PC di casa (PowerShell su Windows,
  bash su Linux/Mac) dentro il browser: esegui comandi, avvia script, spegni o
  riavvia il PC da remoto.
- **🚀 Avvia programmi** — pulsanti per lanciare sul PC i programmi che
  configuri tu (es. Blocco note, un gioco, un backup).
- **🔌 Dispositivi** — vedi quali PC di casa sono accesi e **accendili da
  remoto** col Wake-on-LAN: ideale con un Raspberry sempre acceso come
  centralina e i PC potenti spenti finché non servono (vedi GUIDA, cap. 9).
- **🖥️ Desktop remoto** — lo schermo del PC in una finestra del browser
  (tramite VNC + noVNC, configurazione opzionale, vedi sotto).
- **🔐 Accesso protetto** — login con password, sessioni con cookie, blocco dei
  tentativi ripetuti.
- **UI desktop** — finestre trascinabili e ridimensionabili, barra delle
  applicazioni, menu Start.

## Requisiti

- [Node.js](https://nodejs.org) 18 o superiore (su Windows: scarica
  l'installer LTS e fai avanti-avanti).

## Avvio rapido (sul PC di casa)

```bash
git clone https://github.com/KreedAc/idk.git homecloud
cd homecloud
npm install
npm start
```

Al **primo avvio** viene creato `config.json` con una **password generata
casualmente, stampata in console**: segnatela (o cambiala nel file). Poi apri
[http://localhost:8080](http://localhost:8080) nel browser.

### config.json

```json
{
  "port": 8080,
  "password": "la-tua-password",
  "storageDir": "./storage",
  "remoteDesktopUrl": "",
  "launcherApps": [
    { "name": "Blocco note", "command": "notepad.exe" },
    { "name": "Riavvia PC", "command": "shutdown /r /t 60" }
  ],
  "devices": [
    { "name": "PC Studio", "mac": "A1:B2:C3:D4:E5:F6", "host": "192.168.1.42" }
  ]
}
```

- `storageDir` può puntare a qualsiasi disco/cartella (es. un hard disk grande
  dedicato allo storage).
- `launcherApps` è l'elenco dei programmi avviabili dall'app "🚀 Avvia".
- `devices` è l'elenco dei PC visibili nell'app "🔌 Dispositivi" (stato +
  accensione Wake-on-LAN).
- Dopo ogni modifica riavvia il server (`Ctrl+C` e di nuovo `npm start`).

## Accesso da fuori casa (consigliato: Tailscale)

**Non aprire porte sul router**: è il modo più facile per farsi bucare il PC.
Usa invece [Tailscale](https://tailscale.com) (gratis per uso personale), che
crea una rete privata cifrata tra i tuoi dispositivi:

1. Installa Tailscale sul PC di casa e accedi con lo stesso account su
   telefono/PC del lavoro.
2. Il PC di casa riceve un indirizzo tipo `100.x.y.z` (o un nome tipo
   `pc-casa.tailnet.ts.net`).
3. Da qualunque tuo dispositivo apri `http://pc-casa:8080` — funziona ovunque,
   come se fossi a casa.

Bonus: con Tailscale il PC è raggiungibile **solo dai tuoi dispositivi**, non
da internet.

## Desktop remoto (opzionale)

L'app "🖥️ Desktop remoto" mostra lo schermo del PC dentro una finestra del
browser. Serve un server VNC + noVNC:

1. **Server VNC** — su Windows installa [TightVNC](https://www.tightvnc.com)
   (in modalità servizio, con una sua password); su Linux `x11vnc`.
2. **noVNC** — il client web:
   ```bash
   git clone https://github.com/novnc/noVNC.git
   cd noVNC
   ./utils/novnc_proxy --vnc localhost:5900
   ```
   (su Windows: serve Python; oppure usa il container Docker di noVNC)
3. In `config.json` imposta:
   ```json
   "remoteDesktopUrl": "http://localhost:6080/vnc.html"
   ```
   e riavvia HomeCloud. *(Se accedi via Tailscale, usa l'indirizzo Tailscale
   del PC al posto di `localhost`.)*

In alternativa funziona qualunque client web raggiungibile via URL, ad esempio
[Apache Guacamole](https://guacamole.apache.org) (supporta anche RDP, più
fluido di VNC su Windows).

## Avvio automatico all'accensione del PC (Windows)

Crea un file `avvia-homecloud.bat` con:

```bat
cd /d C:\percorso\di\homecloud
npm start
```

e mettilo nella cartella Esecuzione automatica (`Win+R` → `shell:startup`).

## Architettura

```
   telefono / PC lavoro / tablet
              │  browser
              ▼
   ┌─────────────────────────────┐
   │   PC di casa (il "cloud")   │
   │  ┌───────────────────────┐  │
   │  │  HomeCloud (Node.js)  │  │
   │  │  · UI desktop (web)   │  │
   │  │  · API file           │  │
   │  │  · API statistiche    │  │
   │  └─────┬──────────┬──────┘  │
   │        ▼          ▼         │
   │    storage/    VNC/noVNC    │
   │   (i tuoi     (lo schermo   │
   │     file)       del PC)     │
   └─────────────────────────────┘
        rete privata Tailscale
```

## Roadmap (verso la visione completa)

- [x] Anteprime di immagini, video, audio, PDF e testo nel file manager
- [x] Terminale remoto nel browser
- [x] Launcher di programmi configurabile
- [x] Stato dei dispositivi e accensione da remoto (Wake-on-LAN)
- [ ] Cartella sincronizzata automaticamente tra dispositivi (stile Dropbox)
- [ ] Condivisione file con link temporanei
- [ ] Più utenti con spazi separati
- [ ] HTTPS integrato
- [ ] Integrazione "cloud phone" (Android in una finestra)
- [ ] App mobile dedicata

## Note di sicurezza (prototipo!)

- La password in `config.json` è in chiaro: proteggi quel file.
- Senza HTTPS il traffico non è cifrato: usa sempre Tailscale (che cifra
  tutto) per l'accesso da fuori casa.
- Il terminale e il launcher eseguono comandi **veri** sul PC: chiunque abbia
  la password ha il controllo completo della macchina. Usa una password lunga.
- Questo è un prototipo per uso personale, non esporlo direttamente a internet.
