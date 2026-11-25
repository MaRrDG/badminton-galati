# Studio (Sanity)

Editorul de conținut al site-ului CS Siderurgistul Galați: sportivi, grupe,
calendar competițional, articole și textele paginii principale.

## Pornire

1. Copiază `.env.example` în `.env` și completează `SANITY_STUDIO_PROJECT_ID`
   (id-ul proiectului din sanity.io/manage). `SANITY_STUDIO_DATASET` rămâne gol
   pentru `production`.
2. `pnpm install` în rădăcina depozitului.
3. `pnpm --filter studio dev` pornește Studio pe http://localhost:3333.

## Comenzi

| Comandă | Ce face |
|---|---|
| `pnpm --filter studio test` | Testele modelului de conținut și ale datelor inițiale |
| `pnpm --filter studio validate` | Validarea schemei cu CLI-ul Sanity (merge fără proiect) |
| `pnpm --filter studio typecheck` | Verificarea tipurilor TypeScript |
| `pnpm --filter studio build` | Construiește Studio în `dist/` |

## Date inițiale

`seed/seed.ndjson` conține datele reale cunoscute: cei 3 sportivi din
clasament, cele 5 grupe, cele 12 competiții din calendarul 2026, cele 3
articole recente și textele paginii principale (din macheta `varianta-d`).
Se importă o singură dată, după crearea proiectului:

```sh
pnpm --filter studio exec sanity dataset import seed/seed.ndjson --dataset production --missing
```

`--missing` sare peste documentele care există deja, deci nu suprascrie ce au
schimbat antrenorii.

> **Acordul părinților:** cei trei sportivi din seed sunt minori și intră cu
> „Acord părinte” nebifat (`consent: false`), pentru că acordul scris al
> părinților nu a fost încă primit. Până la bifă nu apar nicăieri pe site și nu
> pot fi aleși la rezultatele unui articol. Bifează „Acord părinte” la fiecare
> sportiv abia după ce clubul are acordul scris al părintelui lui.

Seed-ul nu conține poze: pozele se încarcă din Studio (câmpurile de poză sunt
goale după import). Tot din Studio se leagă sportivii de grupe și articolele de
competiții, pentru că aceste legături nu sunt cunoscute încă.
