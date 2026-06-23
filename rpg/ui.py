"""Utilità per l'interfaccia testuale del gioco."""

from __future__ import annotations


def titolo(testo: str) -> None:
    """Stampa un titolo incorniciato."""
    linea = "=" * (len(testo) + 4)
    print(f"\n{linea}")
    print(f"| {testo} |")
    print(linea)


def sezione(testo: str) -> None:
    """Stampa un'intestazione di sezione."""
    print(f"\n--- {testo} ---")


def chiedi(messaggio: str) -> str:
    """Chiede un input all'utente, restituendo la stringa ripulita."""
    try:
        return input(f"{messaggio} ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return ""


def scelta_menu(messaggio: str, opzioni: list[str]) -> int:
    """Mostra un menu numerato e restituisce l'indice (0-based) scelto.

    Continua a chiedere finché non viene inserito un numero valido.
    """
    print()
    for indice, opzione in enumerate(opzioni, start=1):
        print(f"  {indice}. {opzione}")
    while True:
        risposta = chiedi(f"{messaggio} [1-{len(opzioni)}]:")
        if risposta.isdigit():
            numero = int(risposta)
            if 1 <= numero <= len(opzioni):
                return numero - 1
        print("Scelta non valida, riprova.")


def conferma(messaggio: str) -> bool:
    """Chiede una conferma sì/no."""
    while True:
        risposta = chiedi(f"{messaggio} (s/n):").lower()
        if risposta in ("s", "si", "sì", "y", "yes"):
            return True
        if risposta in ("n", "no"):
            return False
        print("Rispondi con 's' o 'n'.")


def pausa() -> None:
    """Attende che l'utente prema Invio per continuare."""
    chiedi("\nPremi Invio per continuare...")


def barra(valore: int, massimo: int, larghezza: int = 20) -> str:
    """Restituisce una barra di avanzamento testuale, es. [#####-----]."""
    massimo = max(massimo, 1)
    pieni = int(larghezza * max(valore, 0) / massimo)
    return "[" + "#" * pieni + "-" * (larghezza - pieni) + "]"
