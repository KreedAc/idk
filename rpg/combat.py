"""Sistema di combattimento a turni."""

from __future__ import annotations

from .entities import Player, Enemy
from . import ui


def _mostra_stato(giocatore: Player, nemico: Enemy) -> None:
    print()
    print(f"  {giocatore.nome:<16} {ui.barra(giocatore.pv, giocatore.pv_max)} "
          f"PV {giocatore.pv}/{giocatore.pv_max}  Mana {giocatore.mana}/{giocatore.mana_max}")
    print(f"  {nemico.nome:<16} {ui.barra(nemico.pv, nemico.pv_max)} "
          f"PV {nemico.pv}/{nemico.pv_max}")


def _turno_nemico(giocatore: Player, nemico: Enemy) -> None:
    danno = nemico.attacca(giocatore)
    print(f"{nemico.nome} ti colpisce per {danno} danni.")


def combatti(giocatore: Player, nemico: Enemy) -> str:
    """Gestisce un combattimento completo.

    Restituisce uno fra: "vittoria", "fuga", "sconfitta".
    """
    ui.titolo(f"Combattimento: {nemico.nome}")

    while giocatore.vivo and nemico.vivo:
        _mostra_stato(giocatore, nemico)
        scelta = ui.scelta_menu(
            "Cosa fai?",
            [
                "Attacca",
                f"Abilità: {giocatore.abilita} (5 mana)",
                "Usa pozione",
                "Difenditi",
                "Fuggi",
            ],
        )

        if scelta == 0:  # Attacco base
            danno, critico = giocatore.attacca(nemico)
            if critico:
                print(f"COLPO CRITICO! Infliggi {danno} danni a {nemico.nome}.")
            else:
                print(f"Attacchi {nemico.nome} per {danno} danni.")

        elif scelta == 1:  # Abilità
            danno, riuscita = giocatore.usa_abilita(nemico)
            if not riuscita:
                print("Mana insufficiente! Perdi il turno esitando.")
            else:
                print(f"Usi {giocatore.abilita} e infliggi {danno} danni!")

        elif scelta == 2:  # Pozione
            pozioni = [i for i in giocatore.inventario if i.tipo == "pozione"]
            if not pozioni:
                print("Non hai pozioni! Perdi il turno.")
            else:
                opzioni = [p.descrizione_breve() for p in pozioni] + ["Annulla"]
                idx = ui.scelta_menu("Quale pozione?", opzioni)
                if idx == len(pozioni):
                    continue  # Annullato: nessun turno consumato.
                print(giocatore.usa_pozione(pozioni[idx]))

        elif scelta == 3:  # Difesa: dimezza il danno in arrivo
            print("Ti metti in guardia, pronto a parare.")
            difesa_orig = giocatore.difesa
            giocatore.difesa += max(3, giocatore.difesa)
            if nemico.vivo:
                _turno_nemico(giocatore, nemico)
            giocatore.difesa = difesa_orig
            continue

        elif scelta == 4:  # Fuga: i boss non permettono la fuga
            if nemico.pv_max >= 60:
                print(f"{nemico.nome} ti blocca la via! Non puoi fuggire.")
            else:
                print("Ti ritiri dal combattimento.")
                return "fuga"

        # Turno del nemico (se ancora vivo).
        if nemico.vivo:
            _turno_nemico(giocatore, nemico)

        # Piccolo recupero di mana per turno.
        if giocatore.mana < giocatore.mana_max:
            giocatore.mana = min(giocatore.mana_max, giocatore.mana + 1)

    if not giocatore.vivo:
        return "sconfitta"

    # Vittoria: XP, oro e bottino.
    ui.sezione(f"Hai sconfitto {nemico.nome}!")
    for messaggio in giocatore.guadagna_xp(nemico.xp):
        print(messaggio)
    oro = max(1, nemico.xp // 2)
    giocatore.oro += oro
    print(f"Raccogli {oro} monete d'oro.")
    if nemico.drop:
        giocatore.inventario.append(nemico.drop)
        print(f"{nemico.nome} lascia cadere: {nemico.drop.descrizione_breve()}!")
    return "vittoria"
