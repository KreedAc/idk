# 📖 Guida passo passo — HomeCloud sul tuo PC di casa

Questa guida ti porta da zero a "uso il mio PC di casa da qualunque posto".
Ogni passo spiega **cosa** fai e **perché**, così capisci come funziona il
sistema, non solo quali tasti premere. È scritta per **Windows** (con note per
Linux/Mac dove serve).

---

## Capitolo 0 — Cosa stiamo costruendo (2 minuti di teoria)

Un **server** non è un computer speciale: è solo un programma che resta acceso
e **ascolta** le richieste che arrivano dalla rete. Quando nel browser apri un
sito, il tuo browser fa una richiesta a un server da qualche parte nel mondo;
noi facciamo la stessa identica cosa, ma il "sito" è il tuo PC di casa.

HomeCloud è quel programma: lo avvii sul PC di casa e lui resta in ascolto
sulla **porta 8080**. Una porta è come un citofono con tanti pulsanti: il PC ha
un solo indirizzo, ma migliaia di porte numerate; noi diciamo "HomeCloud
risponde al pulsante 8080". Chi apre `http://indirizzo-del-pc:8080` dal browser
"suona quel citofono" e riceve l'interfaccia con le finestre che hai visto.

I pezzi che installeremo:

1. **Node.js** → il motore che esegue HomeCloud (è il "lettore" del codice).
2. **HomeCloud** → il progetto vero e proprio (questo repository).
3. **Tailscale** → la rete privata che ti fa raggiungere il PC da fuori casa
   in modo sicuro.
4. *(Opzionale)* **VNC + noVNC** → per vedere lo schermo del PC in una
   finestra del browser.

---

## Capitolo 1 — Installare Node.js

**Cosa fa:** Node.js permette al PC di eseguire programmi scritti in
JavaScript fuori dal browser. HomeCloud è scritto così.

1. Vai su [nodejs.org](https://nodejs.org) e scarica la versione **LTS**
   ("Long Term Support" = la versione stabile e consigliata).
2. Avvia l'installer e fai sempre "Avanti" (le impostazioni predefinite vanno
   bene).
3. Verifica: apri il **Prompt dei comandi** (`Win + R`, scrivi `cmd`, Invio) e
   digita:
   ```
   node --version
   ```
   Se risponde con un numero tipo `v22.x.x`, è tutto ok. Se dice "comando non
   riconosciuto", riavvia il PC e riprova (l'installer deve registrarsi nel
   sistema).

---

## Capitolo 2 — Scaricare HomeCloud

**Cosa fa:** porti il codice del progetto sul PC.

**Strada semplice (ZIP):**
1. Vai sul repository GitHub del progetto (`KreedAc/idk`).
2. Seleziona il branch `claude/slot-machine-project-a63egq` dal menu dei
   branch.
3. Pulsante verde **Code → Download ZIP**.
4. Estrai lo ZIP in una cartella comoda, es. `C:\homecloud`.

**Strada da smanettone (Git):** se hai [Git](https://git-scm.com) installato:
```
git clone -b claude/slot-machine-project-a63egq https://github.com/KreedAc/idk.git C:\homecloud
```
Il vantaggio di Git: in futuro aggiorni con un solo comando (`git pull`)
invece di riscaricare lo ZIP.

---

## Capitolo 3 — Primo avvio

**Cosa fa:** installi le librerie e accendi il server per la prima volta.

1. Apri il Prompt dei comandi **nella cartella del progetto**:
   ```
   cd C:\homecloud
   ```
2. Installa le dipendenze (le librerie che HomeCloud usa — vengono lette da
   `package.json` e scaricate nella cartella `node_modules`):
   ```
   npm install
   ```
   `npm` è il "negozio" delle librerie di Node.js, installato insieme a Node.
3. Avvia il server:
   ```
   npm start
   ```
4. **IMPORTANTISSIMO:** al primo avvio la console stampa una password
   generata a caso, tipo:
   ```
   ==============================================
     Creato config.json con password generata:
     PASSWORD: aBc123XyZ456
   ==============================================
   ```
   **Segnatela.** È la chiave di casa tua digitale. (Puoi cambiarla quando
   vuoi nel file `config.json` con il Blocco note.)
5. Windows probabilmente mostrerà un avviso del **firewall** ("Vuoi
   consentire a Node.js di comunicare sulla rete?"): metti la spunta su
   **reti private** e consenti. Il firewall è il buttafuori del PC: gli stai
   dicendo che Node.js è un ospite gradito sulla tua rete di casa.

6. Prova: apri il browser **sullo stesso PC** e vai su
   [http://localhost:8080](http://localhost:8080).
   `localhost` significa "questo stesso computer" — è il modo per provare il
   server senza uscire dalla macchina. Inserisci la password: devi vedere il
   desktop di HomeCloud. 🎉

> Il server resta acceso finché la finestra del prompt è aperta. La chiudi =
> spegni HomeCloud. Al Capitolo 6 lo rendiamo automatico.

---

## Capitolo 4 — Prova dalla rete di casa

**Cosa fa:** verifichi che un ALTRO dispositivo (il telefono) raggiunga il PC.

1. Trova l'indirizzo del PC nella rete di casa: nel prompt scrivi
   ```
   ipconfig
   ```
   e cerca "Indirizzo IPv4", tipo `192.168.1.42`. Gli indirizzi che iniziano
   con `192.168.` sono indirizzi **privati**: valgono solo dentro casa tua,
   il router li assegna a ogni dispositivo collegato.
2. Dal telefono (collegato al **WiFi di casa**) apri:
   ```
   http://192.168.1.42:8080
   ```
   (con il TUO indirizzo). Devi vedere il login di HomeCloud.

Se funziona, hai già un mini-cloud domestico. Il problema è che da fuori casa
`192.168.x.x` non esiste: serve il Capitolo 5.

---

## Capitolo 5 — Accesso da fuori casa con Tailscale

**Cosa fa:** è il passo che trasforma tutto in un vero cloud personale.

**Il problema:** il tuo PC non ha un indirizzo pubblico raggiungibile da
internet (e aprirlo al mondo intero sarebbe pericolosissimo: i bot scansionano
in continuazione le porte aperte di tutti).

**La soluzione:** Tailscale crea una **VPN personale** — una rete privata
cifrata che esiste solo tra i TUOI dispositivi, ovunque si trovino nel mondo.
È come se il tuo telefono fosse sempre "collegato al WiFi di casa", anche in
spiaggia. Nessun altro può entrarci, non si aprono porte sul router, e tutto
il traffico è cifrato.

1. Sul **PC di casa**: scarica [Tailscale](https://tailscale.com/download),
   installa, e accedi (puoi usare l'account Google). L'icona appare vicino
   all'orologio.
2. Sul **telefono** (e su qualunque altro dispositivo da cui vuoi accedere):
   installa l'app Tailscale e accedi **con lo stesso account**.
3. Nell'app o su [login.tailscale.com](https://login.tailscale.com) vedi
   l'elenco dei tuoi dispositivi, ognuno con un indirizzo che inizia con
   `100.` e un nome, tipo `desktop-abc123`.
4. Da fuori casa (anche in 4G/5G, con Tailscale attivo sul telefono) apri:
   ```
   http://NOME-DEL-PC:8080     oppure     http://100.x.y.z:8080
   ```
   Ed eccoti nel tuo PC di casa. Da ovunque.

> **Perché è sicuro:** la porta 8080 del PC non è visibile da internet.
> Solo i dispositivi loggati col tuo account Tailscale la raggiungono, e la
> connessione è cifrata da capo a capo. HomeCloud aggiunge la sua password
> come secondo livello.

---

## Capitolo 6 — Renderlo permanente

**Cosa fa:** il server deve sopravvivere a riavvii e distrazioni.

### 6a. Avvio automatico di HomeCloud

1. Apri Blocco note e scrivi:
   ```bat
   cd /d C:\homecloud
   npm start
   ```
2. Salva come `avvia-homecloud.bat` (tipo file: "Tutti i file").
3. `Win + R` → scrivi `shell:startup` → Invio: si apre la cartella Esecuzione
   automatica. Trascina lì il file `.bat`.
   D'ora in poi HomeCloud parte da solo a ogni accensione del PC.

### 6b. Impedire che il PC si addormenti

Un PC in **sospensione è spento** per la rete: HomeCloud non risponderebbe.

- Impostazioni → Sistema → Alimentazione → "Sospensione: **Mai**"
  (quando collegato alla corrente).
- Lo **schermo** invece può spegnersi liberamente: non consuma il server.

### 6c. Accensione dei PC da remoto

HomeCloud ha un'app apposta ("🔌 Dispositivi") per accendere gli altri PC da
remoto: la configuriamo al Capitolo 9.

---

## Capitolo 7 — (Opzionale) Il desktop remoto visivo

**Cosa fa:** finora hai file, terminale e launcher. Questo passo aggiunge lo
**schermo vero** del PC dentro una finestra del browser.

Serve un server **VNC** (il programma che "trasmette" lo schermo) e **noVNC**
(il client che lo mostra in una pagina web):

1. Installa [TightVNC](https://www.tightvnc.com/download.php) sul PC —
   in modalità **servizio**, e mettigli una **sua password** quando la chiede.
   Da questo momento il PC trasmette lo schermo sulla porta 5900 (solo in
   locale, tranquillo).
2. noVNC è il "traduttore" da VNC al browser. Il modo più semplice su Windows
   è avere [Python](https://www.python.org/downloads) installato, poi:
   ```
   git clone https://github.com/novnc/noVNC.git C:\novnc
   cd C:\novnc
   python -m pip install websockify
   python -m websockify --web . 6080 localhost:5900
   ```
3. Apri `config.json` di HomeCloud e imposta:
   ```json
   "remoteDesktopUrl": "http://NOME-DEL-PC-TAILSCALE:6080/vnc.html"
   ```
   (usa il nome Tailscale, così funziona anche da fuori casa), riavvia
   HomeCloud e apri l'app "🖥️ Desktop remoto".

> **Scorciatoia furba nel frattempo:** se hai Windows **Pro**, puoi già usare
> il desktop remoto senza VNC: attiva "Desktop remoto" nelle impostazioni di
> Windows e connettiti col client **RD** (app "Microsoft Remote Desktop" sul
> telefono) all'indirizzo Tailscale del PC. Non è dentro la finestra di
> HomeCloud, ma è fluido ed è a costo zero.

---

## Capitolo 8 — Personalizzazioni utili

Tutte nel file `config.json` (aprilo col Blocco note, riavvia HomeCloud dopo
ogni modifica):

- **Spazio di archiviazione su un altro disco:**
  ```json
  "storageDir": "D:/HomeCloudStorage"
  ```
- **Programmi avviabili dall'app 🚀 Avvia:**
  ```json
  "launcherApps": [
    { "name": "Blocco note", "command": "notepad.exe" },
    { "name": "Spegni il PC tra 1 minuto", "command": "shutdown /s /t 60" },
    { "name": "Annulla spegnimento", "command": "shutdown /a" }
  ]
  ```
- **Porta diversa** (se la 8080 fosse occupata): `"port": 8090`.

---

## Capitolo 9 — L'architettura "centralina": Raspberry sempre acceso, PC al bisogno

**Cosa fa:** è il piano definitivo. Il Raspberry (che consuma ~5 watt, pochi
euro di corrente **all'anno**) resta sempre acceso e fa da centralina: storage,
file, terminale, e soprattutto **l'interruttore per accendere i PC grossi da
remoto**. I PC potenti stanno spenti finché non ti servono davvero.

### 9a. HomeCloud sul Raspberry

Sul Raspberry (con Raspberry Pi OS) apri il terminale e installa Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
```

Poi identico al Capitolo 2–3:

```bash
git clone -b claude/slot-machine-project-a63egq https://github.com/KreedAc/idk.git ~/homecloud
cd ~/homecloud && npm install && npm start
```

**Consigli da centralina:**
- Attacca un **SSD/hard disk USB** e punta lì lo storage in `config.json`
  (`"storageDir": "/mnt/disco/storage"`): le schede SD sono lente e si
  consumano.
- Per l'avvio automatico sul Raspberry: `crontab -e` e aggiungi la riga
  `@reboot cd /home/pi/homecloud && npm start`.
- Installa Tailscale anche sul Raspberry:
  `curl -fsSL https://tailscale.com/install.sh | sh` poi `sudo tailscale up`.

### 9b. Preparare i PC all'accensione remota (Wake-on-LAN)

Il **Wake-on-LAN** funziona così: la scheda di rete di un PC spento (ma
collegato alla corrente e al **cavo ethernet**) resta in ascolto con un filo
di energia. Se riceve un pacchetto speciale — il "magic packet", che contiene
il suo MAC address ripetuto 16 volte — accende il PC. È come un campanello
che suona solo con la tua impronta digitale.

Su ogni PC che vuoi accendere da remoto (una volta sola):

1. **Nel BIOS/UEFI** (premi Canc o F2 all'accensione): cerca *Wake on LAN*,
   *Power On by PCI-E* o simili, e **abilitalo**.
2. **In Windows**: Gestione dispositivi → la tua scheda di rete → Proprietà →
   Risparmio energia → spunta "Consenti al dispositivo di riattivare il
   computer" e "Solo Magic Packet". Poi in Pannello di controllo →
   Alimentazione → disattiva l'**Avvio rapido** (tiene la scheda di rete in
   uno stato che ignora il WoL).
3. **Trova il MAC address**: prompt dei comandi → `ipconfig /all` → voce
   "Indirizzo fisico" della scheda ethernet, tipo `A1-B2-C3-D4-E5-F6`.
4. **Trova l'IP** e rendilo fisso: sempre in `ipconfig` vedi l'IPv4
   (es. `192.168.1.42`). Nelle impostazioni del router assegna a quel PC un
   IP **riservato/statico**, così non cambia mai.

> ⚠️ Il WoL funziona **via cavo ethernet**, quasi mai in WiFi. E il magic
> packet viaggia solo **dentro la rete di casa** — ma è proprio per questo che
> serve la centralina: da fuori tu (via Tailscale) parli col Raspberry, e il
> Raspberry, che è in casa, "suona il campanello" al PC.

### 9c. Configurare i dispositivi in HomeCloud

Nel `config.json` **del Raspberry**:

```json
"devices": [
  { "name": "PC Studio", "mac": "A1:B2:C3:D4:E5:F6", "host": "192.168.1.42" },
  { "name": "PC Salotto", "mac": "11:22:33:44:55:66", "host": "192.168.1.43" }
]
```

- `host` serve a mostrare il pallino verde/rosso (acceso/spento);
- `mac` serve per il pulsante "🔌 Accendi".

Riavvia HomeCloud e apri l'app **🔌 Dispositivi**: vedi lo stato di ogni PC e
li accendi con un clic. Il flusso completo da fuori casa diventa:

```
telefono (ovunque) ──Tailscale──▶ Raspberry (sempre acceso)
                                      │  magic packet
                                      ▼
                              PC potente si accende
                                      │  1-2 minuti dopo
                                      ▼
                     desktop remoto / programmi pesanti
```

---

## Risoluzione problemi

| Problema | Causa probabile e soluzione |
|---|---|
| `node non riconosciuto` | Node.js non installato o serve riavvio del PC. |
| La pagina non carica da un altro dispositivo | Firewall: consenti Node.js sulle reti private. Verifica che PC e telefono siano sulla stessa rete (o entrambi su Tailscale). |
| `EADDRINUSE` all'avvio | La porta 8080 è già occupata da un altro programma: cambia porta in `config.json`. |
| Password dimenticata | Aprila/cambiala in `config.json` (riga `"password"`), riavvia. |
| Funziona a casa ma non fuori | Tailscale non attivo sul telefono, o account diverso sui due dispositivi. |
| Da fuori casa è lento | Dipende dalla velocità di **upload** della connessione di casa (vedi sotto). |

---

## Le cose oneste da sapere

1. **La velocità da fuori casa = l'upload di casa tua.** Quando scarichi un
   file dal telefono, il PC di casa lo sta *caricando*. Con la fibra (upload
   20–300 Mbit) va benissimo; con ADSL vecchia (upload ~1 Mbit) i file grossi
   e il desktop remoto saranno lenti. Puoi verificare con un test su
   [speedtest.net](https://speedtest.net) dal PC di casa (guarda "Upload").
2. **Il PC deve restare acceso.** Un PC fisso consuma indicativamente
   30–100 W: tienine conto in bolletta. Un mini-PC o un portatile consumano
   molto meno.
3. **Chi ha la password ha il PC.** Terminale e launcher eseguono comandi
   veri. Password lunga, e accesso solo via Tailscale (mai aprire porte sul
   router).
4. **È un prototipo.** Per i dati davvero importanti tieni sempre una copia
   anche altrove (la regola dei backup vale pure per i cloud "veri").
