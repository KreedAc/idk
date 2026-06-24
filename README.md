# Terminal RPG

Un gioco di ruolo (RPG) a turni nel mondo della Cripta del Drago. Disponibile in
**due versioni** con le stesse meccaniche:

- 🌐 **Versione browser** (`index.html`) — nessuna installazione, si apre con un
  doppio clic o da un link. **Consigliata e più completa.**
- 💻 **Versione terminale** (Python) — per chi preferisce la riga di comando.

## ✨ Cosa offre la versione browser

- **3 classi** giocabili (Guerriero, Mago, Ladro) con abilità diverse.
- **Combattimento a turni** con attacchi, abilità speciali, pozioni, difesa e fuga.
- **Effetti di stato**: veleno/bruciatura, stordimento, rigenerazione, forza —
  per te e per i nemici. Ogni classe applica effetti diversi con la sua abilità.
- **Mappa a 13 stanze** con bivi e una stanza segreta, e **mini-mappa** che si
  rivela mentre esplori.
- **8 tipi di nemici** più il Drago Antico come boss finale.
- **Mercante** dove comprare e vendere oggetti con l'oro.
- **NPC con dialoghi** e **3 missioni** (una principale e due secondarie con
  ricompense), con un **diario** che ne traccia lo stato.
- **Animazioni** (colpi, schermo che trema), **effetti sonori** generati dal
  browser (attivabili/disattivabili) e **salvataggio** nel browser.

## 🌐 Versione browser (consigliata)

Il modo più semplice per giocare. Non serve installare nulla.

**Opzione A — doppio clic:** scarica il file `index.html` e aprilo con un doppio
clic: si avvia nel tuo browser (Chrome, Firefox, Safari, Edge). Funziona anche da
smartphone.

**Opzione B — link pubblico (GitHub Pages):** se attivi GitHub Pages sul
repository, il gioco diventa raggiungibile da un URL e ci giochi cliccando un link.
Vedi la sezione "Pubblicare online" più in basso.

La partita si salva automaticamente nel browser (localStorage) quando premi *Salva*.

## 💻 Versione terminale (Python)

Un gioco di ruolo testuale a turni, giocabile da terminale. Scritto in Python
puro, senza dipendenze esterne.

## Caratteristiche

- **Creazione personaggio** con tre classi (Guerriero, Mago, Ladro), ognuna con
  statistiche e abilità diverse.
- **Combattimento a turni** con attacchi, abilità speciali, difesa e fuga.
- **Progressione**: punti esperienza, livelli, aumento delle statistiche.
- **Inventario e oggetti**: pozioni, armi e armature da raccogliere ed equipaggiare.
- **Esplorazione** di un piccolo mondo a stanze collegate.
- **Salvataggio e caricamento** della partita su file JSON.

## Requisiti

- Python 3.8 o superiore. Nessuna libreria esterna.

## Come si gioca

```bash
python -m rpg
```

oppure

```bash
python rpg/__main__.py
```

Segui i menu a schermo: ti basta digitare il numero o la lettera dell'azione che
vuoi compiere e premere Invio.

## Struttura del progetto

```
rpg/
  __init__.py      Pacchetto
  __main__.py      Punto di ingresso (avvia il gioco)
  game.py          Ciclo di gioco principale ed esplorazione
  entities.py      Personaggio, nemici e logica di base delle entità
  items.py         Oggetti: pozioni, armi, armature
  combat.py        Sistema di combattimento a turni
  world.py         Mappa del mondo e stanze
  data.py          Dati di gioco: nemici e oggetti predefiniti
  save.py          Salvataggio e caricamento su file
  ui.py            Utilità per l'interfaccia testuale
```

## Pubblicare online (GitHub Pages)

Per ottenere un link giocabile da chiunque:

1. Su GitHub vai su **Settings → Pages**.
2. In *Source* scegli il branch che contiene `index.html` e la cartella `/ (root)`.
3. Salva: dopo qualche minuto GitHub mostra l'URL pubblico del gioco.

Da quel momento basta aprire il link nel browser, anche da telefono.

## Roadmap (idee per estendere il gioco)

- Più classi, abilità e incantesimi.
- Sistema di missioni (quest) e NPC con dialoghi.
- Boss finale e più aree da esplorare.
- Negozio dove comprare e vendere oggetti.
- Effetti di stato (veleno, stordimento, ecc.).
```
