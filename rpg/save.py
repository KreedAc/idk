"""Salvataggio e caricamento della partita su file JSON."""

from __future__ import annotations

import json
import os

from .entities import Player

PERCORSO_SALVATAGGIO = "salvataggio.json"


def salva(giocatore: Player, mondo: dict, percorso: str = PERCORSO_SALVATAGGIO) -> None:
    """Salva lo stato della partita su file."""
    stato = {
        "giocatore": giocatore.to_dict(),
        # Salviamo quali stanze sono già state ripulite.
        "stanze_ripulite": [chiave for chiave, stanza in mondo.items() if stanza.ripulita],
    }
    with open(percorso, "w", encoding="utf-8") as f:
        json.dump(stato, f, ensure_ascii=False, indent=2)


def carica(mondo: dict, percorso: str = PERCORSO_SALVATAGGIO) -> Player | None:
    """Carica la partita da file. Restituisce il Player o None se assente/corrotto."""
    if not os.path.exists(percorso):
        return None
    try:
        with open(percorso, "r", encoding="utf-8") as f:
            stato = json.load(f)
        giocatore = Player.from_dict(stato["giocatore"])
        for chiave in stato.get("stanze_ripulite", []):
            if chiave in mondo:
                mondo[chiave].ripulita = True
        return giocatore
    except (json.JSONDecodeError, KeyError, OSError):
        return None


def esiste_salvataggio(percorso: str = PERCORSO_SALVATAGGIO) -> bool:
    return os.path.exists(percorso)
