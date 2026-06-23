# Terminal RPG

Un gioco di ruolo (RPG) testuale a turni, giocabile da terminale. Scritto in Python
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

## Roadmap (idee per estendere il gioco)

- Più classi, abilità e incantesimi.
- Sistema di missioni (quest) e NPC con dialoghi.
- Boss finale e più aree da esplorare.
- Negozio dove comprare e vendere oggetti.
- Effetti di stato (veleno, stordimento, ecc.).
```
