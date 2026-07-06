# Openstaande punten Werkgenoten — prioriteitsroadmap

Op basis van een audit van routes, DB-tabellen, mocks en integraties. Gegroepeerd van blokkerend → nice-to-have. Elk item = een aparte vervolgtaak die we los kunnen bouwen.

## P0 — Blokkerend voor lancering

### 1. Mock-data vervangen door echte data
Op meerdere plekken staat nog `src/lib/mock-data.ts`:
- **Homepage** (`routes/index.tsx`) — testimonials, stats, plans, categorieën.
- **Prijzen** (`routes/prijzen.tsx`) — plannen hardcoded i.p.v. Stripe.
- **Dashboard abonnement** (`routes/_authenticated/dashboard.abonnement.tsx`) — toont mock-plan, niet de echte `subscriptions`-rij.

Aanpak: categorieën uit `categories`-tabel (met live job-count), testimonials uit `reviews`-tabel (top-rated), stats uit aggregaties. `mock-data.ts` daarna verwijderen.

### 2. Stripe abonnementen end-to-end
- Prijzen komen uit Stripe products/prices (via `lookup_key`), niet uit code.
- Checkout → succes → `subscriptions`-rij zichtbaar in dashboard.
- Upgrade / downgrade / opzeggen via Stripe Billing Portal (`createPortalSession`).
- `useSubscription` hook consequent gebruiken (incl. `environment` filter) om premium features te gaten.
- Dunning-banner bij `past_due`, grace-period tot `current_period_end` bij `canceled`.

### 3. Kernflow klant ↔ vakman afmaken
De DB-tabellen bestaan (`jobs`, `quotes`, `messages`, `reviews`), maar de UI-flow is incompleet:

- **Offerte uitbrengen** — vakman ziet job, plaatst quote via UI (nu waarschijnlijk alleen data, geen scherm).
- **Offerte accepteren/afwijzen** — klant kiest quote → job krijgt `pro_id`, status → `in_progress`.
- **Berichten** (`dashboard.berichten.tsx`, 56 regels) — realtime thread per job, ongelezen-badge, notificatie.
- **Project afronden** — vakman markeert `completed` → klant krijgt prompt voor review.
- **Reviews plaatsen** — na `completed` job, koppelt aan `validate_review_job` trigger.
- **Leads** (`dashboard.leads.tsx`, 48 regels) — filter jobs op categorie/regio van vakman, "toon interesse".

### 4. Notificaties werkend maken
`notifications`-tabel bestaat maar wordt niet gevuld/getoond:
- Trigger bij nieuwe quote, quote-accept, nieuw bericht, review-goedkeuring, job-completed.
- Bell-icoon in header met ongelezen-teller (realtime subscribe).
- E-mail notificatie voor kritieke events (via Lovable Email).

## P1 — Belangrijk voor kwaliteit

### 5. E-mail configuratie
- Auth-mails (welkom, wachtwoord-reset, e-mail-verificatie) met eigen branding.
- Transactionele mails: nieuwe quote, quote-geaccepteerd, review-verzoek, admin-goedkeuring.
- Custom domain koppelen (werkgenoten.nl of subdomein).

### 6. Google OAuth verificeren
Code gebruikt `lovable.auth.signInWithOAuth("google", ...)` — controleren of provider daadwerkelijk is geconfigureerd via `configure_social_auth`; anders faalt eerste login met "Unsupported provider".

### 7. Admin-flow completeren
- Notificatie/mail naar user bij goedkeuring/afwijzing professional-profiel.
- Reden van afwijzing zichtbaar voor user in dashboard.
- Bulk-acties (meerdere reviews tegelijk goedkeuren).

### 8. SEO polish
- Unieke `og:image` per leaf-route (opdracht-detail, vakman-detail, CMS-pagina) — nu ontbreekt bijna overal.
- JSON-LD: `LocalBusiness` op vakman-pagina, `JobPosting` op opdracht-pagina, `BreadcrumbList` op detail-pagina's.
- Sitemap.xml + robots.txt genereren.

### 9. Deploy-config afronden
`.lovable/plan.md` beschrijft Vercel-fix (Nitro preset `vercel`, `api/index.ts` verwijderen, `.nvmrc`, README). Verifiëren of dat is toegepast of nog moet gebeuren.

## P2 — Nice-to-have

### 10. Favorieten UI
Tabel `favorites` bestaat, geen zichtbare knop op vakman-detail of lijst met favorieten in dashboard.

### 11. Zoekbalk werkend maken
Op `opdrachten.tsx` en `vakmensen.tsx` staat een input maar geen filter-logica erachter.

### 12. Profiel-onboarding voor professionals
Wizard: bedrijfsgegevens → categorieën → tarieven → portfolio-foto's → verzenden voor review. Nu is `admin.paginas.$slug.tsx` de enige plek waar veel form-velden staan; professional zelf heeft geen guided flow.

### 13. Foto-upload voor jobs en portfolio
Geen storage-buckets aanwezig (`storage-buckets: none`). Nodig voor: portfolio-foto's professional, foto's bij opdracht.

### 14. Analytics / dashboard-cijfers
`dashboard.index.tsx` toont waarschijnlijk statische cijfers — koppelen aan echte counts (open leads, actieve projecten, gemiddelde review).

## Volgorde-advies

Start met **P0.1 (mocks weg)** en **P0.3 (kernflow)** — zonder deze werkt het platform functioneel niet. Daarna **P0.2 (Stripe)** zodat er geld binnenkomt, dan **P0.4 (notificaties)** voor engagement. P1 en P2 kunnen daarna incrementeel.

## Wat wil je dat ik doe

Zeg welk P0-blok ik als eerste ga bouwen (bv. "start met P0.1" of "doe P0.3 quote-flow"), dan maak ik daar een concreet implementatieplan van met bestanden, migraties en UI-schermen.
