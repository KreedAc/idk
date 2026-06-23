"""Ciclo di gioco principale: menu, esplorazione e gestione del personaggio."""

from __future__ import annotations

from .entities import Player, CLASSI
from . import combat, data, save, ui, world


class Game:
    """Coordina lo stato e il ciclo di gioco."""

    def __init__(self) -> None:
        self.mondo = world.crea_mondo()
        self.giocatore: Player | None = None
        self.in_corso = False

    # --- Avvio ---

    def avvia(self) -> None:
        ui.titolo("TERMINAL RPG")
        print("Esplora la cripta, sconfiggi i mostri e abbatti il Drago Antico!")

        opzioni = ["Nuova partita"]
        if save.esiste_salvataggio():
            opzioni.append("Carica partita")
        opzioni.append("Esci")

        scelta = ui.scelta_menu("Menu principale", opzioni)
        opzione = opzioni[scelta]

        if opzione == "Nuova partita":
            self._nuova_partita()
        elif opzione == "Carica partita":
            self.giocatore = save.carica(self.mondo)
            if self.giocatore is None:
                print("Salvataggio non leggibile. Avvio una nuova partita.")
                self._nuova_partita()
            else:
                print(f"Bentornato, {self.giocatore.nome}!")
        else:
            return

        self._ciclo_principale()

    def _nuova_partita(self) -> None:
        nome = ui.chiedi("Come si chiama il tuo eroe?") or "Eroe"

        nomi_classi = list(CLASSI.keys())
        etichette = [
            f"{c}: {CLASSI[c]['descrizione']} "
            f"(PV {CLASSI[c]['pv']}, ATK {CLASSI[c]['attacco']}, DEF {CLASSI[c]['difesa']})"
            for c in nomi_classi
        ]
        scelta = ui.scelta_menu("Scegli la classe", etichette)
        classe = nomi_classi[scelta]

        self.giocatore = Player.crea(nome, classe)
        # Dotazione iniziale.
        self.giocatore.inventario.append(data.POZIONE_PICCOLA)
        ui.sezione(f"{nome} il {classe} inizia l'avventura!")

    # --- Ciclo principale ---

    def _ciclo_principale(self) -> None:
        self.in_corso = True
        while self.in_corso and self.giocatore and self.giocatore.vivo:
            self._gestisci_stanza()
            if not self.giocatore.vivo:
                break
            self._menu_stanza()

        if self.giocatore and not self.giocatore.vivo:
            ui.titolo("SEI MORTO")
            print("La tua avventura finisce qui... Le ossa si aggiungono alla cripta.")

    def _stanza_corrente(self) -> world.Room:
        return self.mondo[self.giocatore.stanza_corrente]

    def _gestisci_stanza(self) -> None:
        """Descrive la stanza e gestisce nemici/bottino se non ripulita."""
        stanza = self._stanza_corrente()
        ui.titolo(stanza.nome)
        print(stanza.descrizione)

        if stanza.ripulita:
            return

        # Combattimento se c'è un nemico.
        if stanza.nemico:
            nemico = data.crea_nemico(stanza.nemico)
            esito = combat.combatti(self.giocatore, nemico)
            if esito == "sconfitta":
                return
            if esito == "fuga":
                # Torna indietro nella prima uscita disponibile.
                if stanza.uscite:
                    self.giocatore.stanza_corrente = next(iter(stanza.uscite.values()))
                return
            # Vittoria.
            stanza.nemico = None
            if stanza.boss:
                self._vittoria_finale()
                return

        # Raccolta del bottino.
        if stanza.bottino:
            ui.sezione("Trovi del bottino")
            for item in stanza.bottino:
                self.giocatore.inventario.append(item)
                print(f"  - {item.descrizione_breve()}")
            stanza.bottino = []

        stanza.ripulita = True

    def _vittoria_finale(self) -> None:
        ui.titolo("VITTORIA!")
        print(f"Hai abbattuto il Drago Antico, {self.giocatore.nome}!")
        print("La cripta è liberata. Sei una leggenda. Fine.")
        self.in_corso = False

    # --- Menu nella stanza ---

    def _menu_stanza(self) -> None:
        if not self.in_corso or not self.giocatore.vivo:
            return
        stanza = self._stanza_corrente()

        azioni = []
        direzioni = list(stanza.uscite.keys())
        for direzione in direzioni:
            destinazione = self.mondo[stanza.uscite[direzione]]
            azioni.append(f"Vai a {direzione} ({destinazione.nome})")
        azioni.extend(["Personaggio", "Inventario", "Salva partita", "Esci dal gioco"])

        scelta = ui.scelta_menu("Cosa vuoi fare?", azioni)

        if scelta < len(direzioni):
            self.giocatore.stanza_corrente = stanza.uscite[direzioni[scelta]]
            return

        indice_extra = scelta - len(direzioni)
        if indice_extra == 0:
            self._mostra_personaggio()
        elif indice_extra == 1:
            self._gestisci_inventario()
        elif indice_extra == 2:
            save.salva(self.giocatore, self.mondo)
            print("Partita salvata.")
            ui.pausa()
        elif indice_extra == 3:
            if ui.conferma("Vuoi davvero uscire?"):
                if ui.conferma("Salvare prima di uscire?"):
                    save.salva(self.giocatore, self.mondo)
                    print("Partita salvata.")
                self.in_corso = False

    def _mostra_personaggio(self) -> None:
        g = self.giocatore
        ui.titolo(f"{g.nome} - {g.classe} Lv.{g.livello}")
        print(f"  PV     {g.pv}/{g.pv_max}   {ui.barra(g.pv, g.pv_max)}")
        print(f"  Mana   {g.mana}/{g.mana_max}   {ui.barra(g.mana, g.mana_max)}")
        print(f"  XP     {g.xp}/{g.xp_prossimo}")
        print(f"  Attacco totale  {g.attacco_totale} (base {g.attacco})")
        print(f"  Difesa totale   {g.difesa_totale} (base {g.difesa})")
        print(f"  Oro    {g.oro}")
        print(f"  Arma:     {g.arma.descrizione_breve() if g.arma else 'nessuna'}")
        print(f"  Armatura: {g.armatura.descrizione_breve() if g.armatura else 'nessuna'}")
        ui.pausa()

    def _gestisci_inventario(self) -> None:
        while True:
            g = self.giocatore
            if not g.inventario:
                print("\nIl tuo inventario è vuoto.")
                ui.pausa()
                return

            ui.titolo("Inventario")
            etichette = [i.descrizione_breve() for i in g.inventario] + ["Indietro"]
            scelta = ui.scelta_menu("Usa o equipaggia quale oggetto?", etichette)
            if scelta == len(g.inventario):
                return

            item = g.inventario[scelta]
            if item.tipo == "pozione":
                print(g.usa_pozione(item))
            elif item.is_equipaggiabile():
                print(g.equipaggia(item))
            ui.pausa()


def main() -> None:
    Game().avvia()
