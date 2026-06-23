"""Oggetti di gioco: pozioni, armi e armature."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Item:
    """Oggetto base. ``tipo`` distingue il comportamento dell'oggetto."""

    nome: str
    tipo: str  # "pozione", "arma", "armatura"
    descrizione: str = ""
    # Per le pozioni: punti vita ripristinati.
    cura: int = 0
    # Per le armi: bonus all'attacco. Per le armature: bonus alla difesa.
    bonus: int = 0
    # Valore in monete (per usi futuri come negozi).
    valore: int = 0

    def is_equipaggiabile(self) -> bool:
        return self.tipo in ("arma", "armatura")

    def descrizione_breve(self) -> str:
        if self.tipo == "pozione":
            return f"{self.nome} (cura {self.cura} PV)"
        if self.tipo == "arma":
            return f"{self.nome} (+{self.bonus} attacco)"
        if self.tipo == "armatura":
            return f"{self.nome} (+{self.bonus} difesa)"
        return self.nome

    # --- Serializzazione per il salvataggio ---

    def to_dict(self) -> dict:
        return {
            "nome": self.nome,
            "tipo": self.tipo,
            "descrizione": self.descrizione,
            "cura": self.cura,
            "bonus": self.bonus,
            "valore": self.valore,
        }

    @classmethod
    def from_dict(cls, dati: dict) -> "Item":
        return cls(
            nome=dati["nome"],
            tipo=dati["tipo"],
            descrizione=dati.get("descrizione", ""),
            cura=dati.get("cura", 0),
            bonus=dati.get("bonus", 0),
            valore=dati.get("valore", 0),
        )
