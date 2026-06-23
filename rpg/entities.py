"""Entità di gioco: personaggio del giocatore e nemici."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from .items import Item


@dataclass
class Entity:
    """Entità base con statistiche di combattimento."""

    nome: str
    pv_max: int
    pv: int
    attacco: int
    difesa: int

    @property
    def vivo(self) -> bool:
        return self.pv > 0

    def subisci_danno(self, danno: int) -> int:
        """Applica il danno (minimo 1) e restituisce il danno effettivo."""
        danno = max(1, danno)
        self.pv = max(0, self.pv - danno)
        return danno

    def cura(self, punti: int) -> int:
        """Ripristina punti vita senza superare il massimo. Restituisce i PV curati."""
        prima = self.pv
        self.pv = min(self.pv_max, self.pv + punti)
        return self.pv - prima


@dataclass
class Enemy(Entity):
    """Nemico controllato dal computer."""

    xp: int = 0
    # Probabilità (0-1) di lasciare cadere un oggetto alla sconfitta.
    drop: Item | None = None

    def attacca(self, bersaglio: Entity) -> int:
        """Calcola e infligge il danno al bersaglio."""
        base = self.attacco + random.randint(-1, 2)
        danno = max(1, base - bersaglio.difesa)
        return bersaglio.subisci_danno(danno)

    def clone(self) -> "Enemy":
        """Crea una copia indipendente (i nemici nei dati sono modelli)."""
        return Enemy(
            nome=self.nome,
            pv_max=self.pv_max,
            pv=self.pv_max,
            attacco=self.attacco,
            difesa=self.difesa,
            xp=self.xp,
            drop=self.drop,
        )


# Definizione delle classi giocabili: (pv, attacco, difesa, abilità).
CLASSI = {
    "Guerriero": {
        "pv": 30,
        "attacco": 8,
        "difesa": 5,
        "abilita": "Colpo Poderoso",
        "descrizione": "Robusto e potente in mischia.",
    },
    "Mago": {
        "pv": 20,
        "attacco": 11,
        "difesa": 2,
        "abilita": "Palla di Fuoco",
        "descrizione": "Fragile ma con attacchi devastanti.",
    },
    "Ladro": {
        "pv": 24,
        "attacco": 9,
        "difesa": 3,
        "abilita": "Colpo Furtivo",
        "descrizione": "Agile, con buone probabilità di colpo critico.",
    },
}


@dataclass
class Player(Entity):
    """Personaggio del giocatore."""

    classe: str = "Guerriero"
    livello: int = 1
    xp: int = 0
    xp_prossimo: int = 20
    mana: int = 10
    mana_max: int = 10
    oro: int = 0
    inventario: list[Item] = field(default_factory=list)
    arma: Item | None = None
    armatura: Item | None = None
    stanza_corrente: str = "ingresso"

    @classmethod
    def crea(cls, nome: str, classe: str) -> "Player":
        base = CLASSI[classe]
        return cls(
            nome=nome,
            pv_max=base["pv"],
            pv=base["pv"],
            attacco=base["attacco"],
            difesa=base["difesa"],
            classe=classe,
        )

    @property
    def attacco_totale(self) -> int:
        bonus = self.arma.bonus if self.arma else 0
        return self.attacco + bonus

    @property
    def difesa_totale(self) -> int:
        bonus = self.armatura.bonus if self.armatura else 0
        return self.difesa + bonus

    @property
    def abilita(self) -> str:
        return CLASSI[self.classe]["abilita"]

    def attacca(self, bersaglio: Entity) -> tuple[int, bool]:
        """Attacco base. Restituisce (danno, è_critico)."""
        critico = self.classe == "Ladro" and random.random() < 0.25
        base = self.attacco_totale + random.randint(0, 3)
        if critico:
            base = int(base * 1.8)
        danno = max(1, base - bersaglio.difesa)
        return bersaglio.subisci_danno(danno), critico

    def usa_abilita(self, bersaglio: Entity) -> tuple[int, bool]:
        """Abilità speciale di classe. Restituisce (danno, riuscita).

        Consuma 5 mana. Se non c'è abbastanza mana, riuscita = False.
        """
        if self.mana < 5:
            return 0, False
        self.mana -= 5
        moltiplicatore = {"Guerriero": 1.8, "Mago": 2.2, "Ladro": 2.0}[self.classe]
        base = int(self.attacco_totale * moltiplicatore) + random.randint(0, 4)
        danno = max(1, base - bersaglio.difesa)
        return bersaglio.subisci_danno(danno), True

    def guadagna_xp(self, quantita: int) -> list[str]:
        """Aggiunge XP e gestisce gli avanzamenti di livello.

        Restituisce i messaggi da mostrare al giocatore.
        """
        messaggi = [f"Guadagni {quantita} punti esperienza."]
        self.xp += quantita
        while self.xp >= self.xp_prossimo:
            self.xp -= self.xp_prossimo
            messaggi.extend(self._sali_di_livello())
        return messaggi

    def _sali_di_livello(self) -> list[str]:
        self.livello += 1
        self.xp_prossimo = int(self.xp_prossimo * 1.5)
        self.pv_max += 6
        self.mana_max += 3
        self.attacco += 2
        self.difesa += 1
        # Recupero completo all'avanzamento.
        self.pv = self.pv_max
        self.mana = self.mana_max
        return [
            f"*** LIVELLO {self.livello}! ***",
            f"PV max +6 ({self.pv_max}), Mana max +3 ({self.mana_max}), "
            f"Attacco +2 ({self.attacco}), Difesa +1 ({self.difesa}).",
        ]

    def equipaggia(self, item: Item) -> str:
        """Equipaggia un'arma o un'armatura dall'inventario."""
        if item.tipo == "arma":
            precedente = self.arma
            self.arma = item
            self.inventario.remove(item)
            if precedente:
                self.inventario.append(precedente)
            return f"Impugni {item.nome}."
        if item.tipo == "armatura":
            precedente = self.armatura
            self.armatura = item
            self.inventario.remove(item)
            if precedente:
                self.inventario.append(precedente)
            return f"Indossi {item.nome}."
        return "Questo oggetto non può essere equipaggiato."

    def usa_pozione(self, item: Item) -> str:
        """Usa una pozione di cura dall'inventario."""
        if item.tipo != "pozione":
            return "Non è una pozione."
        curati = self.cura(item.cura)
        self.inventario.remove(item)
        return f"Bevi {item.nome} e recuperi {curati} PV."

    # --- Serializzazione per il salvataggio ---

    def to_dict(self) -> dict:
        return {
            "nome": self.nome,
            "pv_max": self.pv_max,
            "pv": self.pv,
            "attacco": self.attacco,
            "difesa": self.difesa,
            "classe": self.classe,
            "livello": self.livello,
            "xp": self.xp,
            "xp_prossimo": self.xp_prossimo,
            "mana": self.mana,
            "mana_max": self.mana_max,
            "oro": self.oro,
            "inventario": [i.to_dict() for i in self.inventario],
            "arma": self.arma.to_dict() if self.arma else None,
            "armatura": self.armatura.to_dict() if self.armatura else None,
            "stanza_corrente": self.stanza_corrente,
        }

    @classmethod
    def from_dict(cls, dati: dict) -> "Player":
        giocatore = cls(
            nome=dati["nome"],
            pv_max=dati["pv_max"],
            pv=dati["pv"],
            attacco=dati["attacco"],
            difesa=dati["difesa"],
            classe=dati["classe"],
            livello=dati["livello"],
            xp=dati["xp"],
            xp_prossimo=dati["xp_prossimo"],
            mana=dati["mana"],
            mana_max=dati["mana_max"],
            oro=dati["oro"],
            stanza_corrente=dati["stanza_corrente"],
        )
        giocatore.inventario = [Item.from_dict(i) for i in dati.get("inventario", [])]
        giocatore.arma = Item.from_dict(dati["arma"]) if dati.get("arma") else None
        giocatore.armatura = (
            Item.from_dict(dati["armatura"]) if dati.get("armatura") else None
        )
        return giocatore
