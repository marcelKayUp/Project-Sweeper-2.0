# 0038 · Etagen, Treppen und Aufzüge

Datum: 23.10.2026

## Entscheidung

Eine Mission kann mehrere taktische Ebenen tragen. Fehlt `levels` oder ist die Liste leer, gilt genau die bestehende Geschossplatte auf z = 0. Ghost Floor bleibt diese eine Ebene. Regelversion 3 und Protokoll 2 bleiben, weil eine Nachricht ohne `z` und ohne Etagenliste die alte Nachricht ist.

Jede Ebene benutzt dieselben Zell-, Wand-, Deckungs- und Sichtregeln. Sicht endet an der Decke: ungleiches z ist kein Sichtkontakt. Es gibt keine Kletterregel und keinen Höhenbonus.

Ein Übergang ist eine Treppe (`stair`, 2 AP), ein Personenaufzug (`passenger`, 2 AP) oder ein Lastenaufzug (`freight`, 4 AP). Er verbindet eine Zelle der Ebene n mit einer Zelle der Ebene m. Der bestehende Bewegungsbefehl trägt ein optionales `z`. Steht die Figur auf dem Übergang und nennt das andere Ende, wechselt sie die Ebene. Der Lastenaufzug ist benutzbar, teurer und ein eigener Typ. Es gibt kein Frachtinventar.

Der Generator legt Format 6 an. Ebene 1 übernimmt die akzeptierte Geschossplatte, ohne zweite Grundrisssuche. Mindestens eine Treppe liegt auf dem Flur. Büro und Labor erhalten einen Personenaufzug, die Fabrik einen Lastenaufzug. Fassaden bleiben ohne Deckung und ohne Sicht. Die Stufenseeds der Grundrisssuche bleiben unverändert; der Paket-Hash ändert sich, weil die Mission die Ebenen nennt.

Die Taktikansicht hält eine lokale Ebene. Eine einzelne Ebene zeigt „eine Ebene“. Der Wechsel zeigt nur den bestätigten Stand dieser Ebene. Ein Klick auf Treppe oder Aufzug sendet denselben Bewegungswunsch, wenn die Figur dort steht.

## Nicht in dieser Scheibe

Zweite Grundrisssuche, Straßengraph, Industriepark, Klettern, Höhenbonus, Gegnerpfade über Etagen, Fracht, Zerstörung, Waffenklassifikation, Stadtkarte, Hologramm, Accounts und Kampagnenstände.
