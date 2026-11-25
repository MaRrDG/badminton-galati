# Copy to confirm with the club

Site text we wrote (for the mockups or while building plan 2a) that ships as quoted here until
the club confirms or corrects it. Content from the Studio or the fixtures (titles, group
descriptions, homepage texts) is not listed; plan 1's homepage copy is in `decisions.md`, "The
club must supply". Items marked **not shipped** stay out until confirmed. "Mockup" = written
for the approved mockups in `mockups/pagini/`; "2a" = written while building.

How to use: read each line with the club, fix the source named in the last column, and delete
the line. Placeholders in braces are filled from data.

## Shared

| Text | Where | Source |
|---|---|---|
| **Voice:** every visitor-facing line addresses the visitor as "tu" (owner's decision, 2026-11-26). The lines marked "tu, 2026-11-26" below were rewritten from "dumneavoastră" on that decision; only the form changed, not the meaning. The "De confirmat de club" lines that speak to the club ("primiți", "vreți", "răspundeți") keep the plural: they address the club, not a visitor | Whole site | Owner, 2026-11-26 |
| "Vino la un antrenament de probă" (heading), "Cere un antrenament de probă" (button to `/contact/#formular`), "sau scrie la {e-mail}" | Closing red section on athletes, programme, parents (`ui/ClosingCta`); homepage trial section (replaces the mockup's "Scrie-ne pentru o probă") | Mockup / 2a; tu, 2026-11-26 |
| "**De confirmat de club:** …" | Every unknown value (`ui/Tbc`); the lines after it speak to the club and are approved as the visible state | Mockup |
| ", oră dată ca exemplu", ", antrenor dat ca exemplu" (screen readers only) | After hatched example hours and coaches (`ui/Sample`) | Mockup |
| Map link to the coordinates 45.4194907, 28.0277769 | "Sala pe hartă", "Deschide harta" (programme, parents, contact) | 2a: confirm the hall's position |
| "Pentru părinți" | Main menu (owner, 2026-11-26) and footer | 2a |
| "Facebook" | Footer | 2a |

## Sportivi (`/sportivi/`)

| Text | Where | Source |
|---|---|---|
| "Copiii și tinerii legitimați la club, de la primii pași până la competițiile naționale. Apasă pe un sportiv ca să vezi unde a ajuns." | Lede and meta description (the second sentence only when an athlete is shown) | Mockup |
| "Sportivii apar aici după ce părinții își dau acordul." | Empty state | 2a |
| "Pe listă apar doar sportivii pentru care părinții și-au dat acordul." | Footnote under the wall | Mockup |
| Age category from the birth year: U-n while the athlete is younger than n in the build year; U23 for 19–22; Seniori from 23; the best place's category wins | Tile line, filter, profile, article tags | 2a: rule to confirm with the coaches (calendar year or FRB season?) |
| "3 sportivi", "1 sportiv la U17" | Count line under the filter | 2a |
| "Lista sportivilor" (heading, screen readers only), "Categoria de vârstă" (filter legend), "{N} în țară" (place on a tile), "Locul în țară: Clasamentul FRB, săptămâna {N}, {interval}." (source line under the wall) | Wall | Mockup / 2a |

## Fișa sportivului (`/sportivi/{slug}/`)

| Text | Where | Source |
|---|---|---|
| "Turneele care contează" / "Apar aici după prima sincronizare cu clasamentul FRB. Până atunci le găsești pe Profilul FRB." (second sentence only with an FRB link) | Quiet block | Mockup |
| "Medalii" | Heading of the medal rows, only when the athlete has a medal (the empty line "Încă nu are medalii trecute în articolele clubului." is **not shipped**: it could read as a claim about a child) | Mockup / 2a |
| Medal rows, one per year: "2026: aur, simplu fete – {titlul articolului}"; several in a year joined with "; "; without a discipline "aur – {titlu}" | Medals (not drawn in the mockup) | 2a |
| "{Nume}, CS Siderurgistul Galați. Locul 2 în țară la U17, simplu băieți, cu 168 de puncte." when ranked, else "{Nume}, CS Siderurgistul Galați." | Meta description | 2a |
| "Apare în articolele clubului", "Toți sportivii", "Profilul FRB" | Profile | Mockup |
| "Categoria", "Proba", "Grupa" (fact labels) and "de confirmat" (a group not yet known) | Profile facts | Mockup |

## Calendar (`/calendar/`)

| Text | Where | Source |
|---|---|---|
| "Sezonul din calendarul Federației Române de Badminton. Cupele României (CR) se joacă primăvara, Campionatele Naționale (CN) toamna; cinci competiții sunt la Galați." (the count from data; without home events the sentence ends after "toamna.") | Lede and meta description | Mockup |
| "Primăvara, Cupele României" / "Toamna, Campionatele Naționale"; the split is by start month (up to July = spring) | List headings | Mockup / 2a rule |
| "Tot în aceste zile:" | Panel, when competitions share days | 2a |
| "Apasă pe o competiție din calendar ca să vezi detaliile.", "roșu: acasă, la Galați", "urmează", "s-a jucat", "Arată următoarea competiție", "Articolul clubului", "Rezultatele pe badminton.ro", "Toate competițiile, pe rând" | Panel, legend, list | Mockup |
| "Nicio competiție programată deocamdată." | Panel without a next competition (also the homepage band) | Plan 1 |
| "Calendar competițional {an}" (page title), "Lunile anului {an}" (heading, screen readers only), "{Lună} fără competiții" (an empty month) | Page | Mockup / 2a |
| "Următoarea competiție" (panel heading), "peste {N} zile" (countdown; also "începe mâine", "începe azi", "în desfășurare", as on the homepage), "loc de confirmat" (an unknown venue) | Panel and list | Mockup / 2a |

## Noutăți (`/noutati/`) and articles (`/noutati/{slug}/`)

| Text | Where | Source |
|---|---|---|
| "Articolele clubului, de la competiții, din viața clubului și despre proiecte." | Lede and meta description | Mockup |
| "Încă nu sunt articole." | Empty state | 2a |
| "Tipul" | Legend of the kind filter (shown only with two kinds or more) | Mockup |
| "Competiție, 30 iunie 2026: {titlu}." | Article meta description when the article has no plain first paragraph | 2a |
| "Distribuie articolul", "Copiază linkul", "Link copiat" | Share row | Mockup / 2a |
| "{N} fotografii. Apasă pe una ca s-o vezi mare." | Gallery | Mockup |
| "Competiția din articol", "În calendar", "Sportivi în articol", "Fotografii", "Mai vechi, {dată}", "Mai nou, {dată}", "Toate articolele" | Article side column and links | Mockup |

## Program (`/program/`)

| Text | Where | Source |
|---|---|---|
| "Când se antrenează fiecare grupă și cine o antrenează. Toate antrenamentele sunt în Sala Siderurgistul, pe Bulevardul Cloșca." | Lede and meta description | Mockup |
| "Copiii încep la Inițiere. Cine vrea competiții merge mai departe spre Performanță și Elite; cine vrea doar să joace are grupele de amatori." | Group guide intro (names the groups) | Mockup |
| "Sub fiecare grupă e numele antrenorului ei." (confirmed coaches) / "Sub fiecare grupă e numele antrenorului ei, tot ca exemplu până confirmă clubul." (example coaches) | Group guide | Mockup / 2a |
| "Orele sunt exemple, clubul le confirmă." "Zilele, orele și antrenorii de pe această pagină arată doar cum va arăta programul; tot ce e hașurat portocaliu nu e încă real." | Page note, shown whenever hours or coaches are examples (a sketch note in the mockup) | Mockup, shipped by ruling |
| "Spune-ne cine vine și un număr de telefon, iar clubul te contactează ca să stabiliți ziua." | Closing section (fits a child or an adult; the mockup asked for the child's age) | 2a; tu, 2026-11-26 |
| "Sala Siderurgistul, Bd. Cloșca, Galați · patru terenuri ·", "Ce grupă i se potrivește", "Întrebări de părinte: vârstă, echipament, cost", "Alege grupa copilului", "Toate grupele", "Pentru cine vrea performanță", "Pentru cine vrea doar să joace", "cum ajungi" | Timetable and guide | Mockup; tu, 2026-11-26 |
| "15 antrenamente pe săptămână", "3 antrenamente pe săptămână la Inițiere" | Count line (screen readers only) | 2a |
| The "De confirmat de club" lines "zilele și orele fiecărei grupe." (no session yet) and "antrenorul fiecărei grupe." (a group without a coach) | Timetable and group guide | 2a |

## Pentru părinți (`/pentru-parinti/`)

| Text | Where | Source |
|---|---|---|
| "Ce e bine să știi înainte de primul antrenament, în ordinea în care îți vin întrebările." | Lede and meta description | Mockup; tu, 2026-11-26 |
| **Presented as the club's own words, so the club must confirm it says this:** „Asigurăm un climat prietenos pentru toate categoriile de vârstă.” Then: "Așa își descrie clubul antrenamentele, din 7 martie 2002 încoace. Mai jos găsești răspunsurile la întrebările pe care și le pune orice părinte înainte să-și aducă copilul în sală." | Opening quote | Mockup; tu, 2026-11-26 |
| The seven questions: "De la ce vârstă poate începe copilul?", "Ce îi trebuie la primul antrenament?", "Cât costă?", "Cum arată primele săptămâni?", "Ce urmează după?", "Cine sunt antrenorii?", "Unde e sala?" | Headings and the question list | Mockup |
| "Copiii încep la grupa de {Inițiere}. Dacă vrea doar să joace, fără competiții, există grupa {Amatori copii}." | Age answer | Mockup |
| "De la club primește asistență calificată, instructaj și echipamentul minim necesar." | Equipment answer | Mockup |
| Steps 1, 2 and 4: "Ne scrii. Completează formularul de probă sau trimite-ne un e-mail, iar clubul te contactează ca să stabiliți ziua." / "Antrenamentul de probă. Copilul încearcă un antrenament în sală, iar tu cunoști antrenorul." / "Alegi drumul. Împreună cu antrenorul vezi dacă merge spre Performanță și competiții sau joacă de plăcere la Amatori copii." | First weeks | Mockup; tu, 2026-11-26 |
| "Legitimarea. Ca să joace în competițiile oficiale, copilul e legitimat la Federația Română de Badminton, prin club." / "Competițiile. Federația organizează campionate naționale pe categorii de vârstă, de la U9 la U19, iar unele se joacă la Galați. Le găsești în calendarul competițiilor, iar pe cei care merg deja la ele, pe pagina sportivilor clubului." | "Ce urmează după?" | Mockup; tu, 2026-11-26 |
| "Clubul e condus de antrenorii săi." (2+ coaches) / "Clubul e condus de antrenorul său." (1 coach); then "Le poți scrie la adresa clubului, {e-mail}." ("Îi poți scrie" for one coach) | Coaches (the mockup said "de cei trei antrenori ai săi") | Mockup / 2a; tu, 2026-11-26 |
| Coach roles "președinte și antrenor", "vicepreședinte și antrenor" | Coaches | **Not shipped** (names only) |
| "Cum ajungi" (link) | "Unde e sala?" | Mockup; tu, 2026-11-26 |
| "Sala Siderurgistul, Bd. Cloșca, Galați." "Are patru terenuri de badminton și aici se antrenează toate grupele. În aceeași sală s-a jucat Balcaniada din 2002 și cea din 2023." | "Unde e sala?" | Mockup |
| "Cel mai simplu răspuns la toate întrebările de mai sus e o oră în sală. Lasă-ne vârsta copilului și un număr de telefon." | Closing section | Mockup; tu, 2026-11-26 |
| The "De confirmat de club" lines: "vârsta minimă de la care primiți copii la Inițiere și dacă un copil mai mare poate începe direct acolo.", "ce înseamnă echipamentul minim (rachetă, fluturași?) și ce aduce copilul de acasă: încălțăminte, haine, apă.", "taxa lunară la fiecare grupă, dacă antrenamentul de probă se plătește, dacă există reducere pentru frați și cum se plătește.", "de câte ori pe săptămână vine copilul și ce învață în prima lună.", "ce acte sunt necesare pentru legitimare, cât costă și când se face.", "câte o fotografie și o frază despre fiecare antrenor: de când antrenează și cu ce grupe lucrează." | Until the club answers | Mockup (approved as the visible state) |

## Contact (`/contact/`)

| Text | Where | Source |
|---|---|---|
| "Pentru un antrenament de probă, completează formularul. Pentru orice altă întrebare, scrie-ne la {e-mail}." | Lede | Mockup; tu, 2026-11-26 |
| "Cere un antrenament de probă, pentru copil sau pentru tine, ori scrie-ne. Sala Siderurgistul, Bd. Cloșca, Galați." | Meta description (fits a child or an adult) | 2a; tu, 2026-11-26 |
| "Toate câmpurile sunt obligatorii, în afară de mesaj." | Form intro | Mockup |
| "Cine vine la antrenament?", "Copilul meu", "Eu", "Numele părintelui", "Numele tău", "Telefon", "Vârsta copilului", "Mesaj (opțional)", "Trimite cererea" | Labels | Mockup / 2a (the "Eu" path); tu, 2026-11-26 |
| "Clubul te contactează la acest număr.", "În ani, între 3 și 18. Ne ajută să alegem grupa potrivită.", "De exemplu, ce zile îți convin sau dacă a mai jucat badminton." | Hints; **the age range 3–18 needs the club's confirmation** | Mockup / 2a; tu, 2026-11-26 |
| "Ești de acord ca CS Siderurgistul Galați să-ți folosească numele și telefonul doar ca să te contacteze despre această cerere." | Consent box | Mockup; tu, 2026-11-26 |
| Messages (summary / under the field): "Lipsește cine vine la antrenament" / "Alege „Copilul meu” sau „Eu”."; "Lipsește numele părintelui" / "Scrie numele tău."; "Lipsește numele" / "Scrie numele tău."; "Numele pare incomplet" / "Scrie numele și prenumele."; "Numele e prea lung" / "Scrie cel mult 100 de caractere."; "Lipsește telefonul" / "Scrie un număr la care te poate suna clubul."; "Telefonul are prea puține cifre" / "Numărul are prea puține cifre. Scrie-l cu 10 cifre, de exemplu 0745 123 456."; "Telefonul nu pare corect" / "Scrie-l cu 10 cifre, de exemplu 0745 123 456."; "Lipsește vârsta copilului" and "Vârsta nu pare corectă" / "Scrie vârsta copilului în ani, între 3 și 18."; "Mesajul e prea lung" / "Scrie cel mult 1000 de caractere."; "Lipsește acordul pentru date" / "Bifează căsuța ca să putem folosi datele pentru a te contacta." | Validation (`lib/trial.ts`) | Plan brief / 2a; tu, 2026-11-26 |
| "Cererea nu a plecat", "Verifică două lucruri:" (un lucru … șase lucruri) | Error summary | 2a; tu, 2026-11-26 |
| "Cererea nu a putut fi trimisă de pe site." + "Trimite-o pe e-mail la {e-mail}."; "Ai trimis deja câteva cereri. Încearcă din nou peste câteva minute." | Endpoint failures (only with `TRIAL_ENDPOINT`) | 2a; tu, 2026-11-26 |
| "Am deschis un e-mail către club" / "Cererea e scrisă în el. Ajunge la club după ce apeși „Trimite” în aplicația de e-mail; până atunci, clubul nu o are." / "Nu s-a deschis nimic? Trimite-o pe e-mail sau scrie-ne la {e-mail}." | E-mail opened state (every build until plan 2b) | 2a; tu, 2026-11-26 |
| "Cererea a ajuns la club", "Mulțumim, {nume}. Clubul te contactează la {telefon} ca să stabiliți ziua probei.", "Te sunăm în cel mult {N} zile." (else a "De confirmat de club" line asking for the reply time), "Până atunci, află ce e bine să știi înainte de primul antrenament.", "Trimite altă cerere" | Sent state (with the endpoint); the name is the full name as typed | Mockup / 2a; tu, 2026-11-26 |
| E-mail subject "Cerere antrenament de probă"; lines "Numele părintelui: …", "Vine la antrenament: chiar eu", "Nume: …", "Vârsta copilului: {N} ani", "Mesaj: …" (cut with "…") | Pre-filled e-mail | 2a |
| "Fără JavaScript, „Trimite cererea” deschide un e-mail către {e-mail} cu datele completate; cererea ajunge la club după ce trimiți e-mailul." | `noscript` line (plan 2b replaces it) | 2a; tu, 2026-11-26 |
| "Patru terenuri de badminton; aici se antrenează toate grupele." | Hall panel | Mockup |
| "Deschide harta" (map link), "Cum ajungi" (heading of the directions; also a link on the parents' page and the programme) | Hall panel | Mockup; tu, 2026-11-26 |
| "cu ce autobuz sau tramvai se ajunge, unde se poate parca și pe ce intrare se intră în sală." / "un număr al clubului, dacă vreți să apară aici. Numerele personale ale antrenorilor nu se publică." | "De confirmat de club" lines in the panel | Mockup |
| "Nu completa acest câmp" | Hidden spam-trap label (never seen) | 2a; tu, 2026-11-26 |
