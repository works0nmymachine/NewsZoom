# NewsZoom — implementation plan: intelligent news and personal reading

Date: 2026-11-28. Status: agreed product direction and proposed engineering plan; not implemented.
Baseline: main (documented v0.3.0), including changes since last deployment. Keep the existing Next.js app, PostgreSQL/Supabase, Docker worker, PWA and Capacitor shell. Do not deploy automatically. Reconcile with current migrations and code before implementation.

## Product goals
- Collect news broadly from approved publishers; NewsZoom, not the publisher's front-page ordering, decides relevance and display order.
- AI helps classify, summarize, match and contextualize sourced news, not invent news. Preserve original publisher, URL, publication date, evidence and uncertainty.
- Personalize without creating a filter bubble; preserve important developments and discovery outside established interests.
- Mobile-first, text-first, minimal visible controls; progressively disclose complexity.

## Phase 1 — Foundation and reliability
- Inventory existing tables, migrations, worker, routes and tests. Extend existing structures rather than duplicate them; preserve data and account isolation.
- Separate account preferences and admin-only shared configuration, including credentials, global budget and source administration. Validate authorization server-side.
- Generalize the existing background research queue to durable, idempotent AI jobs with task type, inputs, versions, retries/backoff, concurrency, job state and cost reservation/reconciliation. Keep ingestion independent of AI failure.
- Add CI checks (lint/typecheck/build/tests and migration integration tests) without auto-deploy. Never silently substitute demo news for failed live queries.
- Add worker/source/job monitoring; protect fetches against SSRF, untrusted article prompt injection and excessive payloads. API keys stay server-side.
- Acceptance: migrations preserve existing data; retries do not create duplicate jobs or charges where avoidable; unauthorized global changes fail; application still ingests and displays approved news when AI is unavailable.

## Phase 2 — Sources and ingestion
- Retain and validate the 30 configured RSS/Atom feeds (not a claim they all work); preserve the 20-minute worker cadence initially.
- Pilot GDELT as a broad monitored-article discovery stream, with cursor/checkpoint, bounded batches, quotas, source/language filters and retention. It is not a complete wire feed or full-text license. Trial World News API only after checking current terms, coverage, limits, cost and text storage/processing rights. AP/Reuters licensed feeds are optional later, not dependencies.
- Use a common adapter contract and normalize article IDs, canonical URLs, publisher identity, titles, excerpts, timestamps, language, provenance and permitted text. Avoid ingesting duplicates and identify syndicated copies so they do not count as independent confirmation. Distinguish raw article metadata from derived classifications and personal ranking.
- Discover new publishers automatically, initially quarantine their content: no unapproved content in Today, Following, search, dossiers, breaking news or other user-facing news, except clearly separated approval previews. Same rule applies to Scan with AI. Assess new publishers using verifiable evidence; never approve automatically. Treat existing configured publishers as a migration decision to review, not silently approve unknown sources.
- In-app notifications with unread count and batched pending-source alerts; source review shows name, domain, country, language, evidence/assessment and sample articles. Approve, reject, postpone and bulk approve; keep notification state and decisions persistent. Rejected sources stay excluded.
- Approved sources start at equal trust; manual adjustment increases/decreases corroboration requirements, not exposure directly. Check genuinely independent sources for important claims; discreetly mark unconfirmed claims in the article without a push alert. Do not imply trust equals truth.
- Acceptance: source approval gates all feeds and generated dossiers; trust changes corroboration policy; duplicated wire reporting is not independent evidence; adapter restart resumes correctly; monitor actual throughput and cost before expanding coverage.

## Phase 3 — AI Control Center
One shared framework, not ten separate integrations. Show each function's name, purpose and enabled/mode status; expand for provider/model, recommended default, editable instructions, schedule/trigger, token and spend limits, test preview, version history and restore defaults. Advanced controls collapsed by default. Explicit Save for edits, unsaved-change warning on exit. Each section can add task-specific instructions via the same underlying settings (contextual settings slide over the current page). Protected security, evidence, output schema, source approval and budget rules cannot be overridden by custom prompts.

| Function | Suggested model tier | Trigger |
|---|---|---|
| Article classification / topic detection | Economy | New/changed articles |
| Personal relevance assessment | Economy | New articles or changed profile |
| Duplicate / semantic story matching | Economy | During ingestion |
| Breaking news assessment | Balanced | Significant candidates |
| Preference learning | Economy | Periodic |
| Summarization | Economy | As needed; cached |
| Historical timeline and dossier maintenance | Balanced | Automatically for qualifying stories / material developments |
| Deep background research / Refine | Advanced | Explicit request |
| Interest discovery | Balanced | Periodic, from approved corpus |
| Scan with AI | Balanced | On demand only |

- Retain existing OpenAI/Anthropic adapters and budget system. Candidate mapping: repository's configured GPT-6 Luna / GPT-6.2 Sol / GPT-6.2 Astra and Claude Haiku / Sonnet / Opus tiers. Exact API identifiers, availability, quality and prices must be verified against providers and real keys; do not hardwire unverified assumptions. Expose alternatives and recommended choices per task.
- Preserve initial global $10/month budget; add per-function budgets, preflight estimates, logging by task/model/prompt version, token and web-search accounting, spending limits and graceful pause for nonessential work. Use rules, deduplication, embeddings where appropriate, batched low-cost classification and caching before model escalation.
- Scan with AI: accessible from each Today section; user explicitly triggers external web research for missed developments. Show progress, results with citations and cost; enforce approval gate for unknown publishers. No scheduled external scanning for now. Automatic dossiers use stored approved source evidence; additional web research via explicit Refine/Scan. Do not fabricate missing historical evidence.
- Acceptance: independently configurable tasks, persisted instructions with preview and explicit save, traceable output/cost, hard budget enforcement, no autonomous broad web scan.

## Phase 4 — Personalization
- Store explicit follow/like/dislike/hide signals and weaker implicit opens/searches. Separate story, topic and publisher scope. Explicit signals outweigh passive behavior.
- Not interested cumulatively lowers relevance, gradually reaching negligible relevance after repeated feedback; allow decay/recovery and undo. Separate explicit permanent hide. Do not infer a general dislike from a story-specific rejection.
- Start broad; increase selectivity over time, retain a protected general-importance component and unfamiliar-topic discovery. Breaking news can surface outside preferences (except explicit exclusions and unapproved sources).
- Default eligible articles sorted newest first; alternative most relevant first via filter. Distinguish publication time from ingestion time. Avoid letting publisher ordering determine rank.
- Hidden “Why am I seeing this?” in article overflow menu: meaningful actual score factors and matching interests, not speculative AI reasoning. Learned preferences inspectable/editable.
- Acceptance: repeated dislikes lower the correct scoped score; opening articles alone cannot dominate; new major unrelated developments remain eligible; explanations reflect real factors.

## Phase 5 — Following Stories and living dossiers
- Support both specific ongoing stories and broad continuing interests via free-text description (e.g. war in Ukraine or AI model releases). Generate editable AI draft scope with inclusion/exclusion criteria and examples of included/excluded articles (default five examples, adjustable; clarify allocation in UI). Edit inline alongside examples.
- Follow begins immediately when explicitly tapped, using a provisional scope; show “draft scope” until the user explicitly saves the reviewed definition. No autosave of manual edits; warn before leaving unsaved changes. Keep scope versions.
- Match new articles semantically against saved scope and confidence; prefer no link when uncertain. “Not part of this story” removes that association and teaches only that dossier, without lowering general feed relevance; preserve article and undo feedback. Allow explicit additions/corrections.
- Automatically generate and persist a coarse, source-backed overview and timeline for qualifying ongoing stories; reuse on article open. Store start date, main events, evidence, timestamps and provenance. Link articles and distinguish genuinely new developments from repeated reporting; update incrementally, especially followed stories. Avoid creating an expensive dossier for every unrelated headline.
- Default presentation: concise overview then major chronological events; deeper history expandable. Refine button lets user specify detail/questions, research on demand and append sourced findings to the existing dossier. Preserve concise overview and prior evidence; reconcile corrections and uncertainty; do not claim unsupported completeness.
- Acceptance: follow starts immediately; examples and scope are editable inline; feedback stays local; historical dossier loads from DB without per-open AI call; incremental updates and refinement persist and retain citations.

## Phase 6 — Today and adaptive interface
- Today defaults to newest first with relevance eligibility; filter button switches to most relevant. Breaking news block at top by default, compact and collapsible. Add separate collapsible Following block near top (proposed ordering after Breaking); section order editable.
- User-defined sections, reorder/hide, adjustable article counts, Load more in place (default five, adjustable) instead of redirecting to Discover. Text-only by default with optional small images and configurable font size. Highlight genuinely new items then fade; preserve scroll/reading position; cold launch Today, back restores prior state. No mandatory mark-as-read; optional history.
- Keep navigation/search near bottom, keyboard-safe search, preferred external browser, back/swipe behavior consistent with app history. Each item links to at least one original source.
- Fixed essential controls; optional shortcuts adapt gradually per screen to recency/frequency, with stable positions, threshold/hysteresis and limited slots. Rare actions remain accessible in three-dot/hamburger menus; optional pin and reset. No extra visible AI buttons merely because AI is running; Scan with AI and Load more available in section context. “Why am I seeing this?”, uncommon research/source actions tucked away unless deliberately promoted.
- Contextual settings overlay for current section backed by the same central settings, not duplicate configuration; edit mode with checkboxes as appropriate. Explicit Save everywhere for manual configuration, unsaved-change warning; intentional actions such as follow, feedback, button usage tracking and automatic background processing persist normally (not draft autosave).
- Acceptance: test mobile screen layouts, keyboard, back gestures, section loading, fixed nav, adaptive shortcuts, save/discard behavior and no hidden essential controls.

## Phase 7 — Validation and release
- Add unit, integration and end-to-end tests covering all acceptance criteria. Exercise real provider keys in a bounded test, validate cost and source rights; inspect actual feed health and GDELT volume. Measure classification/matching precision, breaking-news coverage, false associations, latency, costs and source diversity with representative fixtures; document chosen thresholds and model defaults.
- Test migration and rollback on a non-production copy, authorization, cross-account isolation, source gates, budget exhaustion, retries and failure UI. Test web/PWA and Android/Capacitor (keyboard, navigation, external links, connectivity; consider offline reading separately); build APK.
- Run npm test, typecheck/build and browser tests as supported by repo; validate live deployment only after explicit release decision. No automatic deployment; do not publish APK/deploy without owner approval.
- Keep Finance/Agenda functioning; further feature development there is not in this scope.

## Proposed data model (reconcile with existing schema)
Extend existing nz_feeditems/nz_feedbronnen/nz_interesses/nz_filterregels/nz_achtergronden/nz_llm_gebruik/nz_app_instellingen before introducing parallel tables. Logical entities: normalized articles; publishers and account approval/trust; source adapter checkpoints; AI task configs and versioned prompts; jobs and usage; story scopes/versions, article associations, events, evidence and feedback; preference signals; sections; action usage; notifications. Use foreign keys, unique canonical IDs, account scoping, provenance and retention. Current raw feed retention is 60 days; retain dossier evidence/metadata separately as permitted, and determine scalable raw retention before broad ingestion.

## Open implementation decisions / risks
- Pilot source coverage, terms and allowed data storage; GDELT can overwhelm worker and budget. Begin bounded; do not promise comprehensive global coverage.
- Confirm which roles can change shared source policies and global AI spending versus personal overrides.
- Calibrate importance, discovery allocation, dislike decay, trust corroboration thresholds and adaptive shortcut promotion with usage/tests. These are tuning decisions, not fixed user choices.
- Following section placement and default number of included/excluded examples are proposed refinements. Exact model IDs and provider costs are not independently verified in this plan.
- Existing main documentation states v0.3.0 is not deployed and actual live behavior has not been tested in this review.

## Existing code references
- [Project setup](SETUP.md)
- [Design decisions](BESLUITEN.md)
- [RSS config](../data/feeds.json)
- [Worker](../scripts/ingest-worker.mjs)
- [Ranking](../src/lib/rangorde.ts)
- [Recognition](../src/lib/herkenning.ts)
- [Background jobs](../scripts/achtergrond.mjs)
- [AI pricing](../scripts/llm/prijzen.mjs)

Definition of done: approved-source ingestion works independently of publisher ranking; AI functions are individually configurable and budgeted; personalization is explainable and avoids excessive narrowing; followed stories have persistent sourced dossiers and scoped corrections; the reading interface is minimal, adaptive and explicitly saved; tests and release checks pass before any deployment.
