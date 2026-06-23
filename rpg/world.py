"""Mappa del mondo: stanze collegate ed eventi associati."""

from __future__ import annotations

from dataclasses import dataclass, field

from .items import Item
from . import data


@dataclass
class Room:
    """Una stanza esplorabile del mondo di gioco."""

    chiave: str
    nome: str
    descrizione: str
    # Mappa direzione -> chiave della stanza adiacente.
    uscite: dict[str, str] = field(default_factory=dict)
    # Modello di nemico presente (nome) o None.
    nemico: str | None = None
    # Oggetti raccoglibili nella stanza.
    bottino: list[Item] = field(default_factory=list)
    # Se True, è la stanza del boss finale.
    boss: bool = False
    # Stato runtime: nemico/bottino già gestiti?
    ripulita: bool = False


def crea_mondo() -> dict[str, Room]:
    """Costruisce e restituisce la mappa del mondo."""
    stanze = {
        "ingresso": Room(
            "ingresso",
            "Ingresso della Cripta",
            "Una soglia di pietra umida. Il buio ti chiama verso nord.",
            uscite={"nord": "corridoio"},
            bottino=[data.POZIONE_PICCOLA],
        ),
        "corridoio": Room(
            "corridoio",
            "Corridoio Stretto",
            "Un corridoio illuminato da torce tremolanti. Senti squittii.",
            uscite={"sud": "ingresso", "nord": "sala", "est": "cella"},
            nemico="ratto",
        ),
        "cella": Room(
            "cella",
            "Vecchia Cella",
            "Una cella abbandonata. Tra la paglia luccica qualcosa.",
            uscite={"ovest": "corridoio"},
            bottino=[data.SPADA_ARRUGGINITA, data.CORAZZA_CUOIO],
        ),
        "sala": Room(
            "sala",
            "Sala delle Colonne",
            "Un'ampia sala con colonne spezzate. Un goblin ti ringhia contro.",
            uscite={"sud": "corridoio", "nord": "cripta", "ovest": "armeria"},
            nemico="goblin",
        ),
        "armeria": Room(
            "armeria",
            "Armeria Diroccata",
            "Rastrelliere arrugginite. Uno scheletro monta ancora la guardia.",
            uscite={"est": "sala"},
            nemico="scheletro",
            bottino=[data.ASCIA_GUERRA],
        ),
        "cripta": Room(
            "cripta",
            "Cripta Profonda",
            "Sarcofagi infranti. Un orco brutale emerge dall'ombra.",
            uscite={"sud": "sala", "nord": "antro"},
            nemico="orco",
            bottino=[data.POZIONE_GRANDE],
        ),
        "antro": Room(
            "antro",
            "Antro del Drago",
            "Una caverna rovente. Sopra un cumulo d'oro si erge un Drago Antico.",
            uscite={"sud": "cripta"},
            nemico="drago",
            boss=True,
        ),
    }
    return stanze
