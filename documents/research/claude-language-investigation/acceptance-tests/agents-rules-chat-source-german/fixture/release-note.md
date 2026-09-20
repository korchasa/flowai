# Release-Hinweis zur Zustellwarteschlange

## Betroffener Bereich
Nur Hintergrundaufträge zur Zustellung; interaktive Anfragen behalten ihr bisheriges Verhalten.

## Wiederholungsregel
Ein fehlgeschlagener Auftrag wird nach 30 Sekunden erneut versucht. Nach drei fehlgeschlagenen Versuchen wird er in die Prüfwarteschlange verschoben. Es gibt keine automatische Löschung.

## Erforderliche Konfiguration
Der Betreiber muss die Benachrichtigungsadresse festlegen, bevor die Funktion aktiviert wird. Die Stapelgröße ist optional; ohne Angabe gelten 20 Aufträge.

## Freigabebedingung
Aktivieren Sie die Funktion erst, nachdem ein Testfehler eine Benachrichtigung erzeugt hat. Der neue Modus verringert verlorene Aufträge, erhöht aber durch wiederholte Versuche die Zustellzeit.
