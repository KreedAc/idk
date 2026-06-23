"""Dati di gioco: modelli di nemici e oggetti predefiniti."""

from __future__ import annotations

from .entities import Enemy
from .items import Item

# --- Oggetti ---

POZIONE_PICCOLA = Item("Pozione Minore", "pozione", "Cura 12 PV.", cura=12, valore=10)
POZIONE_GRANDE = Item("Pozione Maggiore", "pozione", "Cura 30 PV.", cura=30, valore=25)

SPADA_ARRUGGINITA = Item("Spada Arrugginita", "arma", "Una lama logora.", bonus=2, valore=15)
ASCIA_GUERRA = Item("Ascia da Guerra", "arma", "Pesante e affilata.", bonus=5, valore=40)
PUGNALE_OMBRA = Item("Pugnale d'Ombra", "arma", "Leggero e letale.", bonus=4, valore=35)

CORAZZA_CUOIO = Item("Corazza di Cuoio", "armatura", "Protezione leggera.", bonus=2, valore=15)
COTTA_MAGLIA = Item("Cotta di Maglia", "armatura", "Buona protezione.", bonus=4, valore=40)


def crea_nemico(modello: str) -> Enemy:
    """Crea una nuova istanza di un nemico a partire dal nome del modello."""
    return MODELLI_NEMICI[modello].clone()


# --- Nemici (modelli da clonare) ---

MODELLI_NEMICI: dict[str, Enemy] = {
    "ratto": Enemy("Ratto Gigante", pv_max=12, pv=12, attacco=4, difesa=1, xp=8),
    "goblin": Enemy(
        "Goblin", pv_max=18, pv=18, attacco=6, difesa=2, xp=14, drop=POZIONE_PICCOLA
    ),
    "scheletro": Enemy(
        "Scheletro", pv_max=22, pv=22, attacco=7, difesa=3, xp=20, drop=SPADA_ARRUGGINITA
    ),
    "orco": Enemy(
        "Orco Brutale", pv_max=34, pv=34, attacco=10, difesa=4, xp=35, drop=COTTA_MAGLIA
    ),
    "drago": Enemy(
        "Drago Antico", pv_max=70, pv=70, attacco=15, difesa=8, xp=120, drop=POZIONE_GRANDE
    ),
}
