
## P0.3 — Volgorde: eerst subscription end-to-end, daarna kernflow klant↔vakman

Elk blok is één beurt met migratie + code. Ik wacht je "ok" tussen A en B.

---

## Blok A — Subscription end-to-end audit

**Doel:** vanaf klik op "Kies plan" tot en met feature-gating in de app werkt de volledige lus, met correcte polling na return, gates op pro-only features, en nette upgrade/downgrade.

### A1. `checkout/return` – polling op subscription
- Vervang statische "Bedankt" door polling: `useSubscription` refetchen tot `isActive` of 10 s time-out.
- States: Bezig met verwerken → Bedankt (met plan-naam) → Fallback ("nog niet zichtbaar, check dashboard").
- Toont plan-naam via `usePlans()` gejoined op `price_id`.

### A2. Reusable `<RequireSubscription />` gate
- Nieuw component `src/components/RequireSubscription.tsx`.
- Rendert children als `isActive`, anders een upgrade-card met CTA naar `/dashboard/abonnement`.
- Optionele `allowedPriceIds` voor tier-gating.

### A3. Pro-only gates
- `dashboard/leads`: alleen professionals mét actief abonnement zien de volledige lijst. Anders upgrade-card. Client-side gate (server-side RLS blijft in blok B als quotes worden gebouwd).
- `word-professional`: geen gate, blijft marketing.
- Server-side helper: gebruik bestaande `has_active_subscription()` SQL function (bestaat al volgens knowledge-file, checken; anders migratie toevoegen).

### A4. Voorkom duplicate checkout
- In `prijzen` en `dashboard/abonnement`: als `isActive` én zelfde `price_id` → knop = "Huidig plan" (disabled) — al deels aanwezig, aanvullen voor `prijzen`.

### A5. Verificatie
- Manuele smoke test via Playwright: click "Kies plan" (ingelogd), test-card `4242…`, return-page ziet abonnement worden.
- Tsgo check.

**Bestanden A:**
- edit `src/routes/checkout.return.tsx`
- new `src/components/RequireSubscription.tsx`
- edit `src/routes/_authenticated/dashboard.leads.tsx`
- edit `src/routes/prijzen.tsx` (huidig-plan disable + login-redirect met next-param)
- (evt.) migratie voor `has_active_subscription` als die ontbreekt

---

## Blok B — Kernflow klant ↔ vakman

**Doel:** de daadwerkelijke transactie op de marktplaats werkt end-to-end. Alles gate't op auth + waar relevant op subscription.

### B1. Offerte uitbrengen (pro → job)
- Op `/opdrachten/$slug`: knop "Offerte versturen" opent dialog met `amount` + `message`.
- Server function `submitQuote` (createServerFn + requireSupabaseAuth): insert in `quotes` met `pro_id = auth.uid()`, `status='pending'`.
- Gate: pro-role + actief abonnement (via `has_active_subscription`) — anders 403 / upgrade-card.
- Zichtbaarheid: eigenaar (client van job) én pro zelf zien hun quote(s).

### B2. Offerte accepteren/afwijzen (client)
- Nieuwe route `_authenticated/dashboard/projecten.$jobId` — client ziet lijst quotes met accept/decline knoppen.
- Server function `respondQuote`: update `quotes.status`. On accept: job status → `in_progress`, quote → `accepted`, overige quotes → `rejected`. In één transactie via RPC.

### B3. Berichten (realtime)
- Nieuwe route `_authenticated/dashboard/berichten.$jobId` (of gebruik bestaande `berichten` als lijst).
- Insert/select op `messages` met `job_id`.
- Supabase realtime channel per `job_id`, filter op deelnemers (RLS bestaat al).
- Autoscroll, nieuw-bericht badge in nav.

### B4. Project afronden + review
- Op accepted job: client kan "Afronden" klikken → `jobs.status='completed'`, `completed_at=now()`.
- Vervolgens review-form (rating 1-5 + body) → insert `reviews`.
- Trigger `validate_review_job` bestaat al — mooi.
- Update `profiles.rating_avg` en `review_count` via SQL trigger (nieuw).

### B5. Berichten-lijst + notificatie-badge
- `dashboard/berichten` toont laatste conversatie per job.
- Ongelezen-count via `messages.read_at IS NULL AND recipient = auth.uid()`.

### B6. Verificatie
- E2E via Playwright: pro logt in → offerte op job → client accepteert → berichten heen-en-weer → client rond af → review geplaatst → rating zichtbaar op vakmensen-profiel.
- Tsgo check.

**Bestanden B (indicatief):**
- new `src/lib/marketplace.functions.ts` (submitQuote, respondQuote, sendMessage, completeJob, submitReview)
- new/edit `src/routes/opdrachten.$slug.tsx` (offerte-dialog + auth-gate)
- new `src/routes/_authenticated/dashboard/projecten.$jobId.tsx`
- new/edit `src/routes/_authenticated/dashboard/berichten.$jobId.tsx`
- edit `src/routes/_authenticated/dashboard.berichten.tsx` (lijst)
- edit `src/components/site-header.tsx` (unread badge)
- migratie: `accept_quote(quote_id)` RPC (transactionele accept+reject+in_progress), trigger `refresh_pro_rating` na reviews-insert
- (indien nodig) grants/policies aanvullen

---

## Aannames
- Bestaande tabellen (`jobs`, `quotes`, `messages`, `reviews`, `subscriptions`) en RLS worden hergebruikt zoals ze zijn. Alleen aanvullingen waar hierboven expliciet genoemd.
- Alleen professionals met actief abonnement mogen offertes uitbrengen — bevestig als dit anders moet zijn.
- Reviews: elke completed job levert exact één review per (client,pro) op, in de dagen na afronding — bestaande trigger enforced dit.
- UI-taal blijft NL, dezelfde design-tokens en shadcn-componenten.

## Vragen voor je "go"
1. **Gating leads/offerte:** alleen actieve abonnees, of ook trial/free tier? *(default: actieve abonnees)*
2. **Berichten:** ook toegestaan vóór accepted offerte (vraag stellen), of pas na accept? *(default: altijd, zoals nu op job-detail met "Stel een vraag")*
3. **Project afronden:** alleen client kan afronden, of ook pro (met bevestiging door client)? *(default: alleen client)*

Zeg "start A" om blok A te bouwen (met bovenstaande defaults tenzij je aanpast), of geef feedback.
