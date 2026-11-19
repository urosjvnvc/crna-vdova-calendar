# Črna vdova v Google Koledarju

Pri ustvarjanju sestanka dodaj **#sejna** v naslov. Skripta poskusi rezervirati sobo za čas sestanka in ti pošlje potrditev ali obvestilo o zasedenosti. V ločenem koledarju **Črna vdova – zasedenost** vidiš tudi rezervacije drugih sodelavcev.

## Namestitev v brskalniku

Potrebuješ svoj Google račun z omogočenim Apps Scriptom in naslov MCP iz razdelka **Navodila za AI agente → Naslov strežnika** na urniku svoje sobe. Vsak sodelavec opravi namestitev enkrat v svojem računu.

1. Odpri [Code.gs](Code.gs) in klikni **Copy raw file** (ikona za kopiranje zgoraj desno nad kodo).
2. Odpri [nov Google Apps Script](https://script.google.com/create) v računu, kjer vodiš sestanke. V datoteki **Code.gs** označi začetno kodo in jo zamenjaj s kopirano.
3. V prvi vrstici zamenjaj **VSTAVI_NASLOV_MCP** s povezavo HTTPS iz urnika. Narekovaja pusti. Shrani projekt.
4. Zgoraj izberi **namesti** in klikni **▶ Run / Zaženi**. Preglej zahtevana dovoljenja in jih potrdi za svoj račun. Skripta potrebuje koledar za branje sestankov in prikaz zasedenosti, zunanjo povezavo za rezervacije, e-pošto za obvestila ter sprožilce za izvajanje v ozadju.
5. Ko v **Execution log** vidiš **Execution completed**, osveži Google Koledar. Pod **Moji koledarji** vklopi **Črna vdova – zasedenost**. V Apps Scriptu lahko pod **Triggers** preveriš oba sprožilca za funkcijo **uskladi**.

Če službeni račun blokira Apps Script ali dovoljenja, se obrni na skrbnika Google Workspace.

## Uporaba

Sestanek z začetno in končno uro dodaj v **primarni koledar**. Uporabi oznako **#sejna** v naslovu ali opisu ali vnesi **Dunajska cesta 5, 1000 Ljubljana** kot lokacijo. Počakaj na e-poštno potrditev. Če je termin zaseden, izberi drugega. Ko termin spremeniš, skripta sprosti prejšnjega in poskusi rezervirati novega. Izbris dogodka ali odstranitev vseh oznak sprosti rezervacijo, ki jo je ustvarila ta namestitev.

Prvi zagon obdela tudi obstoječe ustrezne dogodke v naslednjih 180 dneh. Celodnevne in zavrnjene dogodke preskoči. Sinhronizacija teče ob spremembi primarnega koledarja in vsakih 15 minut. Za isti Google račun uporabljaj isti projekt, da ohraniš registrirani ključ.

## Besedilo za AI agenta

> Pomagaj mi namestiti https://github.com/urosjvnvc/crna-vdova-calendar v moj Google Koledar. Preberi README in uporabi Code.gs iz repozitorija. Vprašaj me za naslov MCP moje sobe, če ga še nimaš. Če imaš dostop do mojega brskalnika, nastavi projekt v izbranem računu, zaženi namesti in preveri dnevnik, oba sprožilca in koledar zasedenosti. Prijavo in potrditev Googlovih dovoljenj prepusti meni. Če nimaš dostopa do brskalnika, me vodi po enem koraku naenkrat. Registracijski ključ naj ostane v projektu.

## Podatki in izklop

Na strežnik sobe se pošljejo čas, trajanje, splošen naziv rezervacije in zgoščen identifikator dogodka. Rezervacijski ključ nastane v tvojem projektu in se shrani v uporabniške lastnosti Apps Scripta. Skrbnik strežnika mora ključe varovati tudi v odgovorih javnega urnika.

Za izklop izbriši oba sprožilca **uskladi** v razdelku **Triggers**. Že potrjene rezervacije veljajo do izteka. Če jih želiš prej sprostiti, pred izklopom odstrani oznake in lokacijo z dogodkov ter zaženi **uskladi**. Koledar zasedenosti lahko nato skriješ.
