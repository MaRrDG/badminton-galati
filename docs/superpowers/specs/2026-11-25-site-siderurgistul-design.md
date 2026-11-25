# Site nou pentru CS Siderurgistul Galați: design

Data: 25 noiembrie 2026
Stare: aprobat de Mario pe 25 noiembrie 2026

## De ce

Mario face cadou clubului CS Siderurgistul Galați un site nou, gratuit, care să înlocuiască
https://www.badmintongalati.ro/ (făcut în SitePad 5.1.6). Site-ul actual e vechi și pe
jumătate abandonat: contoare care arată „1”, © 2023, știri din 2024 pe prima pagină, fără
program, prețuri sau galerie, adrese de tip `/page-2/`, înscriere prin PDF de printat.

Site-ul nou trebuie:

1. să arate viu și să inspire: sportul și talentul copiilor în față, cu animații la scroll;
2. să nu pară făcut de AI (cerință explicită, repetată);
3. să poată fi întreținut de antrenori fără ajutor tehnic: text, poze, articole, calendar;
4. să arate clubului că își poate face marketing cu el: înscrieri noi și sponsori.

## Cine îl folosește

- **Părinți din Galați** care caută un sport pentru copil. Vin de pe telefon. Vor să afle
  repede: de la ce vârstă, când, cât costă, cum încearcă.
- **Sportivii și părinții lor.** Vor să-și vadă rezultatele și pozele și să le distribuie.
- **Antrenorii** (Dorel Badiu, Iulian Călin, Adrian Panfil). Ei publică, de obicei de pe
  telefon, după o competiție, cu poze din WhatsApp. Azi postează rar: 15 articole în 3 ani.
- **Mario.** Administrator, cu acces complet.
- **Posibili sponsori și federația.** Vor cifre și seriozitate.

## Scopuri

- Toate paginile utile din site-ul vechi, curățate, plus cele noi de mai jos.
- Publicarea unui articol cu poze, de pe telefon, în câteva minute.
- Statistici reale despre sportivi, actualizate automat din clasamentul FRB.
- Încărcare rapidă pe telefoane ieftine și conexiune mobilă.
- Cost lunar zero pentru club.

## Ce nu facem

- Magazin, plăți online, conturi pentru părinți sau sportivi.
- Versiune în engleză (doar română, cu diacritice corecte).
- Scoruri pe meciuri sau tablouri: FRB nu le publică, iar antrenorii nu le vor introduce.
- Integrare cu tournamentsoftware.com: FRB nu e acolo, iar platforma blochează accesul.
- Preluarea automată a postărilor de pe Facebook.

## Ce ar însemna eșec, chiar dacă funcționează

- Arată a șablon generat: fundal crem, carduri rotunjite cu umbră, etichete cu majuscule
  deasupra fiecărui titlu, fade la fiecare secțiune, cifre inventate, poze de stoc.
- Antrenorii nu-l folosesc pentru că editarea e greoaie, și peste un an e iar abandonat.
- Apar date despre minori fără acordul părinților.
- Animațiile îl fac lent sau obositor pe telefon.
- Conținut inventat prezentat ca fapt (ore de program, prețuri, rezultate).

## Constrângeri

- **Gratuit**, deci doar planuri gratuite la servicii externe. Limitele lor se verifică la
  implementare; dacă un serviciu nu mai e gratuit pentru acest volum, se alege altul.
- **Domeniul** `badmintongalati.ro` e al clubului. Lansarea are nevoie de acces la DNS de la
  ei. Până atunci site-ul stă pe o adresă de test.
- **Minori.** O fișă de sportiv apare public doar dacă are bifat „acord părinte”.
- **FRB.** Datele din clasament se iau de pe badminton.ro, care nu are API. Sincronizarea
  automată pornește după ce clubul are acordul federației (contact@badminton.ro). Fără
  acord, site-ul merge doar cu linkuri spre profilurile FRB.
- **Date lipsă de la club:** programul cu zile și ore, prețurile, legendele pozelor,
  descrierile grupelor. Până vin, paginile arată „de confirmat”, nu text inventat.
- **Material foto:** doar pozele clubului. Cele de pe site-ul vechi sunt punctul de plecare.

## Variante luate în calcul

### Cum editează clubul

| Variantă | Plus | Minus |
|---|---|---|
| **Astro + Sanity** (aleasă) | panou simplu, merge de pe telefon, pozele se optimizează singure, antrenorii completează câmpuri și nu pot strica designul | depinde de un serviciu extern |
| WordPress pe hostingul lor | cunoscut | actualizări, risc de spargere, se degradează în doi ani; animațiile din design ar cere temă scrisă de la zero |
| Astro + CMS pe git | fără serviciu extern | încărcare de poze greoaie, panou rudimentar |

Mario a ales prima variantă. E alegerea mea de tehnologie, acceptată de el, nu o cerință.

### De unde vin statisticile

| Variantă | Plus | Minus |
|---|---|---|
| **Sincronizare din badminton.ro + linkuri** (aleasă) | zero efort pentru antrenori, date reale săptămânal | se oprește dacă FRB își schimbă site-ul; cere acordul FRB |
| Doar linkuri spre FRB | zero risc | nicio statistică pe site-ul clubului |
| Introducere manuală | orice date | nu se va face |

Mario a ales sincronizarea, cu linkurile ca plasă de siguranță.

### Direcția vizuală

S-au făcut patru schițe animate de homepage (în `.superpowers/brainstorm/…/content/`):

- A „Terenul”: sala văzută de sus, luminoasă. Nealeasă.
- B „Afiș”: poster cu albastrul emblemei. I-a plăcut stilul și animațiile, dar e prea mare,
  prea full-screen.
- C „Tabela”: rezultatele ca erou. I-a plăcut structura, dar arăta a AI.
- **D „Afiș + Tabela”** (aleasă): stilul și animațiile din B la scară cuminte, structura din C
  fără elementele de șablon. Fișierul `varianta-d-afis-tabela.html` e referința vizuală, în
  forma de după corecturile lui Mario (hero cu motto-ul clubului, fără tabelă cu cartonașe; grupe ca două liste).

## Designul

### Identitate vizuală

Vine din ce are clubul deja, nu din ceva inventat:

- **Albastrul emblemei** (~`#1549A8`) și **roșul echipamentului** (~`#E23A45`), ca suprafețe
  pline. Alb. **Portocaliul terenului** din sala lor doar ca atingere mică. Un albastru foarte
  deschis pentru secțiunile de odihnă. Culoarea textului: bleumarin închis.
- **Litere:** Big Shoulders Display pentru titluri (condensat, industrial, trimite la numele
  „Siderurgistul”), Instrument Sans pentru text. Ambele cu ș, ț, ă, î, â.
- **Muchii drepte.** Pozele reale tratate ca afiș, cu o placă roșie decalată în spate.
- **Scară:** conținut într-o coloană de ~1180px, titluri plafonate la ~6rem, hero cel mult
  ~85% din înălțimea ecranului. Secțiunile alternează albastru, roșu, alb.
- **Hero-ul poartă motto-ul clubului**, cel de pe site-ul actual: „Ai reușit? Continuă!
  N-ai reușit? Continuă!”, ca titlu de afiș, cu o propoziție despre club dedesubt. Textul se
  editează din panou. Mario a respins varianta cu locurile din clasament în titlu; clasamentul
  apare mai jos, în lista de sportivi.
- **Grupele** apar ca două liste simple, una lângă alta: „Pentru cine vrea performanță”
  (Inițiere, Performanță, Elite) și „Pentru cine vrea doar să joace” (Amatori copii, Amatori
  adulți). Fiecare rând: numele grupei mare, pentru cine e, iar când există, zilele și orele.
  Mario a respins tabelul cu chenare și varianta în trepte („nu prea se înțelege”).
- **Emblema** clubului (cerc albastru, disc roșu, fluturaș alb) rămâne neschimbată. Trebuie
  cerută de la club în format vectorial; cea de pe site are 270px.

Interzise: fundal crem, carduri rotunjite cu umbră, etichete cu contur punctat, bare gri de
umplutură, etichete cu majuscule deasupra titlurilor, numerotări 01/02/03, săgeți la butoane,
un singur cuvânt colorat în titlu, grafice sau cifre fără date reale în spate, widgeturi de
decor (Mario a respins tabela cu cartonașe care se întorc: „AI slop masiv”) și tabele cu
celule goale sau cu același text repetat pe fiecare rând.

### Mișcare

Mario vrea site-ul „viu” și i-au plăcut animațiile din B. Regula: puține, legate de sport,
restul paginii stă liniștit.

- **Hero:** secvență la încărcare (afișul se așază, rândurile titlului intră din părți
  opuse), apoi la scroll rândurile alunecă în sensuri opuse și poza crește. Fixare scurtă.
- **Lista de sportivi:** cifrele locurilor se rotesc când ajungi la ele.
- **Titlurile de secțiune:** alunecă ușor lateral la scroll.
- **Banda de poze:** curge lateral cât derulezi, până la ultima poză.

Fără fade la fiecare secțiune. Cu „reduce motion” activ se arată starea finală. Tot
conținutul e vizibil și fără JavaScript. Pe mobil, fixările la scroll sunt mai scurte sau
lipsesc. Pozele au dimensiuni declarate, ca distanțele animațiilor să se calculeze corect
(bug găsit în schiță).

### Pagini

**Păstrate din site-ul vechi**

- **Acasă.** Structura din schița D: motto, calendar, sportivi, grupe, sală, noutăți,
  antrenament de probă.
- **Despre club.** Istoric, înființare 7 martie 2002, sala cu 4 terenuri de pe Bd. Cloșca,
  Balcaniadele din 2002 și 2023. O singură pagină în locul celor două duplicate.
- **Antrenori și consiliu director.** Cu poze. Contact prin adresa clubului, nu prin cele
  personale.
- **Noutăți (blog).** Cele 15 articole vechi mutate. Trei tipuri: Competiție, Viața clubului,
  Proiecte. Un articol de competiție e legat de etapa din calendar și de sportivii care au
  jucat, și are galerie.
- **Calendar competițional.** Tot sezonul, filtru pe categorie de vârstă, etapele de la
  Galați marcate „acasă”. O etapă jucată duce la articolul ei și la rezultatele FRB.
- **Documente.** Statut, regulament de ordine interioară, cerere de înscriere.
- **Proiecte.** Talents with Rackets (Erasmus+), cu cele două manuale.
- **Contact.** Adresă, hartă, telefon, formular.

Scoase ca pagini, lăsate ca linkuri în subsol: istoricul general al badmintonului și
adresele FRB, Badminton Europe, BWF.

**Noi**

- **Sportivi.** Listă și fișă pe fiecare: locul și punctele din clasamentul FRB pe probe,
  turneele punctate, medalii, poze, articolele în care apare, link spre profilul FRB.
  Evoluția în timp apare abia când există istoric real adunat de sincronizare.
- **Program și grupe.** Inițiere, Performanță, Elite, Amatori copii, Amatori adulți: zile,
  ore, antrenor, pentru cine e.
- **Antrenament de probă.** Formular online: nume părinte, telefon, vârsta copilului, mesaj.
  Ajunge pe emailul clubului.
- **Galerie.** Pe competiții și evenimente, legată de articole.
- **Rezultate.** Palmares pe sezoane, construit din articole și din datele FRB.
- **Pentru părinți.** De la ce vârstă, ce îi trebuie copilului, cât costă, ce urmează după
  primul antrenament.
- **Pentru sponsori.** Cifre reale ale clubului și cum apare un sponsor pe site.

### Ce editează clubul

Totul din lista de mai jos se editează din panou, fără cod:

- articole (titlu, tip, dată, text, poze, competiția, sportivii bifați);
- competiții din calendar (dată, loc, categorii, gazdă);
- sportivi (nume, an, grupă, poză, link profil FRB, **acord părinte**);
- grupe și program; antrenori; documente; sponsori; galerii;
- textele paginilor fixe (despre, pentru părinți, pentru sponsori, contact).

Formularul „articol nou” e gândit pentru telefon: puține câmpuri obligatorii, poze multe
dintr-o singură selecție. Legăturile dintre articol, competiție și sportivi se fac prin
bifare, o singură dată, și apar apoi peste tot.

### Sincronizarea cu FRB

- Rulează automat o dată pe săptămână, după ce FRB publică clasamentul.
- Pentru fiecare sportiv care are link de profil FRB, citește locul, punctele și turneele
  punctate și le salvează, păstrând și fotografia săptămânii, ca să se adune istoric.
- Cifrele de pe homepage (câți sportivi în top 10 național etc.) se calculează din aceste
  date. Nu există cifre scrise de mână.
- Dacă citirea eșuează, site-ul rămâne cu ultimele date bune și arată „actualizat la data X”.
  Mario primește un email. Site-ul nu arată niciodată o eroare vizitatorului.
- Citire politicoasă: puține cereri, cu pauze, identificată ca fiind a clubului.
- E oprită implicit și pornește când clubul are acordul FRB.

### Marketing

- Previzualizare corectă la distribuire pe Facebook și WhatsApp (poză, titlu, descriere).
- Titluri și descrieri pentru căutări ca „badminton Galați” și „badminton copii Galați”;
  date structurate de club sportiv local; hartă de site.
- Redirecționări de la toate adresele vechi (`/page-2/`, `/blog/post1/` etc.) la cele noi.
- Statistici de vizitare fără cookie-uri, deci fără banner de consimțământ.

## Reguli stabilite după verificarea documentului

Deciziile de mai jos sunt ale mele, de confirmat de Mario:

- **Lansarea nu așteaptă acordul FRB.** Fără date sincronizate, lista de sportivi arată
  nume, grupă, poză și link spre profilul FRB, iar cifrele calculate și pagina de rezultate
  pe bază de clasament lipsesc. Hero-ul nu depinde de date. Sincronizarea se adaugă după,
  fără schimbări de design.
- **Ce ascunde lipsa acordului părintelui:** sportivul nu are fișă, nu apare în lista de
  sportivi, pe homepage sau în cifre, iar numele lui nu e link și nu e bifabil ca etichetă în
  articole. Datele lui din clasamentul FRB nu se afișează pe site-ul clubului, chiar dacă
  sunt publice la federație. Pozele de grup și textul articolelor rămân în răspunderea
  clubului, ca până acum. Cele 15 articole vechi se mută neschimbate, fiind deja publice.
- **Medaliile vin din articole.** La un articol de competiție, fiecare sportiv bifat poate
  primi opțional un rezultat (aur, argint, bronz sau locul) și proba. Câmpul e opțional, ca
  formularul să rămână scurt. Palmaresul se construiește din aceste câmpuri.
- **Antrenorii publică direct**, fără aprobare. Mario poate retrage orice.

## Conturi și termen (hotărât de Mario)

- **Deocamdată un singur cont de administrator**, al lui Mario, cu email și parolă. Conturile
  antrenorilor și mutarea proprietății pe un email al clubului vin mai târziu, la predare.
- Parola nu se scrie în cod și nu intră în depozitul git. Mario o alege la crearea contului.
- **Nu există termen.** Se construiește tot înainte de lansare.

## Domeniu și email (verificat pe 25 noiembrie 2026)

- Domeniul are serverele de nume la ROMARG (`ns1–ns4.romarg.com`), iar site-ul vechi stă pe
  `89.42.218.134`.
- Emailul clubului trece tot prin ROMARG (`mx01–03.whmpanels.com`, SPF `relay.romarg.net`).
- **Serverele de nume nu se mută.** La lansare se schimbă doar înregistrările pentru site
  (`www` și domeniul gol). Înregistrările de email rămân neatinse, ca adresa
  `siderurgistul@badmintongalati.ro` să meargă în continuare.
- Găzduirea se alege astfel încât să meargă cu DNS-ul rămas la ROMARG, inclusiv pentru
  domeniul fără `www`.
- Pachetul de găzduire de la ROMARG trebuie păstrat cât timp emailul stă acolo, chiar dacă
  site-ul pleacă. De verificat cu clubul ce plătesc și ce include.

## Decizii luate de mine, de verificat

Mario a vorbit despre rezultat, nu despre unelte, așa că acestea sunt alegerile mele:

- Astro pentru site, Sanity pentru conținut, găzduire statică gratuită (Cloudflare Pages,
  Netlify sau similar, după ce merge cu DNS-ul de la ROMARG).
- GSAP cu ScrollTrigger pentru animații, ca în schiță.
- Sincronizarea FRB ca sarcină programată săptămânal (GitHub Actions), care scrie în Sanity
  și declanșează republicarea.
- Formularele trimit email printr-o funcție mică de server, cu protecție anti-spam fără
  captcha vizibil.
- Statistici de vizitare fără cookie-uri, printr-un serviciu gratuit.
- Scos paginile cu istoricul general al badmintonului și adresele federațiilor.
- Trei tipuri de articol: Competiție, Viața clubului, Proiecte.
- Emailurile personale ale antrenorilor nu mai apar pe site.

## Lăsat la latitudinea celui care construiește

- Structura exactă a câmpurilor din panou și a adreselor paginilor.
- Aspectul paginilor interioare, în limbajul vizual al schiței D.
- Cum se citește pagina FRB și cum se testează fără să fie lovit site-ul federației.
- Serviciul de email pentru formulare și alerte.
- Ordinea de construcție și împărțirea pe etape.

## Depinde de club

- Acordul pentru proiect și accesul la DNS pentru lansare.
- Acordul FRB pentru sincronizare.
- Programul cu ore, prețurile, lista sportivilor cu acordul părinților.
- Emblema în format vectorial, poze noi și, ideal, o filmare scurtă pentru hero.
- Confirmarea textelor scrise de mine în schiță (descrierile grupelor, legendele pozelor).
