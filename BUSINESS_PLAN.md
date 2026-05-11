# screenshat — Business Plan

> Generated: 2026-05-08 · Mode: --full · Verdict: **validate-or-kill** (portfolio piece today; 30-day wedge test decides)

## Verdict

screenshat is a portfolio-grade screenshot service with one differentiator that may not survive contact with the real world. The wedge — "alt text that travels with the PNG via tEXt chunk" — is technically true but operationally fragile: every major CMS the target audience uses (WordPress, Squarespace, Webflow, Shopify, Cloudflare Images, Vercel/Netlify image optimization) strips ancillary PNG chunks on upload. Independently, the target audience itself (accessibility auditors) has a documented methodological objection to alt text generated from rasterized pages. Either of those, alone, kills the niche thesis. Both are testable in 30 days for less than $200 of effort. **Decision: run the validation gate before committing to product work. If both checks fail, this stays a portfolio piece. If one fails, narrow further. If both pass, then the 3-4 weeks of productization work is justified.**

## What This Is (facts)

- TypeScript full-stack: Express + React 19 + tRPC 11 + Drizzle/MySQL + Playwright Chromium singleton. ~9.5k server LOC. Live at `dr.eamer.dev/screenshat/` and `screenshat.pics`.
- 18 capture presets (7 social, 3 mobile, 4 landscape highres, 4 portrait highres) with DPR-based scaling up to 16K.
- Alt text generated via multi-provider LLM (gateway/openai/anthropic/google), embedded as PNG `tEXt` `Description` chunk at download, exported in ZIPs alongside `alt-text.txt` manifest.
- Public API via api-gateway (`POST /v1/screenshot/capture`, X-API-Key); internal direct API (`POST /api/capture`, X-Internal-Key).
- Zero monetization wiring. No Stripe, no plans, no metering. OAuth route is a 6-line stub. `package.json` name is `screenshotter`; npm name `screenshat` is owned by another author (Adam Wolf).

## Audience & Beachhead

Three audiences considered:
- **A. Marketing/social teams** generating OG cards. Owned by Urlbox, Bannerbear, ScreenshotAPI, Placid. No moat for screenshat here.
- **B. Devs needing visual regression / preview infra**. Owned by Browserless, Playwright Cloud. screenshat lacks diffing, CI integrations, headed mode.
- **C. Accessibility auditors and a11y-minded content teams** producing VPATs and audit reports. Smaller TAM, no incumbent for the alt-text-bearing-screenshot use case.

**Beachhead: C, with a 30-day validation gate.** Persona: freelance accessibility auditor or in-house a11y lead at a mid-market SaaS, producing VPATs and audit deliverables, $20-100/mo personal-card budget. **The validation gate exists because two committee seats raised independent objections that, if true, eliminate this audience.**

## Positioning (Dunford)

> For accessibility auditors and a11y-minded content teams who need screenshots whose alt text survives the deliverable, **screenshat** is a **screenshot service** that **generates draft alt text and embeds it as a PNG `tEXt` Description chunk plus a sidecar `alt-text.txt` manifest in the ZIP export**.
> Unlike Urlbox, ScreenshotAPI, or Bannerbear (raw image generators with no metadata story), screenshat ships alt text *with* the image as a defensible artifact. This matters because alt text written in one tool and pasted into another loses the association the moment the file moves; a VPAT or audit report with mismatched alt text is a procurement liability.

## Job to Be Done

"When I capture a screenshot to include in a deliverable (audit report, VPAT, slide, social post), I want the alt text I write to travel with the image and be defensible to the client who asked for it."

**Misalignment flag.** The README leads with "18 presets." That serves audience A (marketing). The wedge job is buried under feature #5. Re-lead the README with the alt-text differentiator before any GTM test.

## Pricing

Comparable set: Urlbox $19-$249/mo, ScreenshotAPI $9-$129/mo, ScreenshotOne $17-$229/mo, Bannerbear $49-$199/mo. All meter on screenshots/month.

Recommended tiers (sit below Urlbox deliberately — niche play, not throughput play):

| Tier | Price | Captures/mo | LLM | Other |
|---|---|---|---|---|
| Free | $0 | 50 | BYO key | Watermark over 2K resolution |
| Solo | $12 | 1000 | Included | No watermark, ZIP + VPAT-ready manifest |
| Team | $39 | 5000 | Included | 3 seats, audit-report templates, scheduled re-captures |

**Pricing risk (manager + breaker):** the gateway default model was moved off `claude-opus-4-7` onto Sonnet, which improves margin materially, but the core risk remains: premium vision defaults can still erode unit economics quickly. **Sonnet is the current default; Haiku remains the next lever if pricing pressure shows up in real usage. Opus should stay opt-in.**

## GTM (Bullseye — 3 channels)

1. **Targeted community posts.** r/accessibility, WebAIM mailing list, A11y Slack (~5K members), Deque blog comments. Lead with a VPAT-batch demo, not a feature list. Frame outputs as "drafts," never "compliant."
2. **Long-tail SEO.** Search terms: "screenshot with alt text", "PNG embedded alt text", "VPAT screenshot tool", "WCAG screenshot capture." Submit to a11y.toolkit, A11yProject resources, Smashing Magazine roundups. High-intent, low-volume.
3. **Conference adjacency.** axe-con, CSUN, a11yTO. Free seeded accounts plus a workshop tool contribution. Practitioner channel.

**Skip:** Product Hunt (wrong audience), Hacker News (will pattern-match as "yet another screenshot API"), generic developer Twitter.

## Legal Posture

| Posture | Status |
|---|---|
| Open-source as-is | **GREEN** — MIT + permissive deps clean |
| Sell as-is | **RED** — captured-content + WCAG-claim + GDPR gaps |
| Sell with ToS + AUP + Privacy + DMCA agent + alt-text disclaimer | **YELLOW-GREEN** |
| Enterprise/edu/gov under "screenshat" brand | **YELLOW** — procurement filters, profanity-adjacent |

Required mitigations before commercial launch:
1. ToS with user-warrants-rights clause and indemnification.
2. AUP banning capture of PII, paywalled content, login-required pages.
3. Privacy policy listing OpenAI/Anthropic/Google as sub-processors (GDPR Art. 28).
4. DMCA designated agent registered with Copyright Office ($6 filing).
5. UI disclaimer adjacent to alt-text field: "Review before publishing — generated drafts are not WCAG-verified."
6. Brand split: keep `screenshat` for OSS/dev, sell commercially under a neutral name (Capture.pics or similar).

## Maintenance Cost

**Hobby scale (current, ~30-50 hr/year):** Playwright/Chromium drift (~3 days), three LLM SDKs each breaking ~2x/year against a flat `_core/llm.ts` with no adapter (~6 hr), Radix/Tailwind/Drizzle minors batchable.

**What breaks first after 6 weeks untouched** (in order):
1. Playwright minor bump in CI/install.
2. One of three LLM SDKs changes its vision payload shape against `_core/llm.ts` (no adapter interface — every SDK rev costs 3x).
3. MySQL connection idling out under `mysql2` defaults (no pool config in `server/db.ts`).
4. `data/screenshots/` filesystem if cleanup ever errors silently.

**Debt items that block the paid-product story** (must fix before launch):
1. **No capture queue.** One slow page × 18 presets = 18-min worst case blocking everyone. Add BullMQ or pg-boss.
2. **In-memory rate limiter** loses state on restart; doesn't work behind multiple replicas.
3. **Opus default** in gateway path (`server/_core/llm.ts:65`).
4. **Zero capture-pipeline tests.** Coverage is the security perimeter only.
5. **Duplicate `/src/server/` and `/src/client/` legacy trees** confusing future contributors.
6. **Lazy DB init silently degrades** — handy in dev, dangerous in prod.

**Runway ceiling:** ~500-1000 captures/day before something queues badly. Bottlenecks in order: Playwright singleton (~5-10 concurrent), `mysql2` default ~10 connection ceiling, Anthropic vision tier-1 ~50 RPM.

## Kill Criteria

Specific, falsifiable. Two or more firing → kill the productization. One firing → narrow.

1. **Wedge validation: PNG tEXt survival.** In the first 30 days, fewer than 60% of the top 6 CMSs in the audit-tooling stack (WordPress, Squarespace, Webflow, Shopify, Notion, GitHub Pages) preserve `tEXt` `Description` chunks through a default upload. Test with a fixture image and document the matrix publicly. If most strip it, the wedge is illusory.
2. **Wedge validation: audience trust.** Of the first 100 free-tier signups, fewer than 25% run 5+ captures in their first 7 days, OR more than 70% of generated alt text gets edited before download. Either signal means auditors don't trust the output enough to use it as drafted.
3. **Channel signal.** Fewer than 3 inbound mentions or recommendations from named a11y practitioners (not Luke, not bots) in 60 days from the GTM test.
4. **Paid conversion.** Fewer than 25 paying customers within 90 days of launching the $12 tier.
5. **Unit economics.** LLM cost per paying user exceeds $4/month for two consecutive months on the $12 tier.
6. **Methodological rejection.** 3 or more support tickets, public posts, or refund requests citing "alt text from screenshot is methodologically wrong" or equivalent. The objection is well-known in the a11y community; if it shows up at signal volume, the positioning is dead.
7. **Time cost.** More than 8 hours/week of Luke's time for two consecutive months without crossing $1K MRR.

## 30/60/90 Day Plan

### 0-30 days: validation gate (no paid tier yet)

The whole month is about answering "is the wedge real?" Don't build pricing infrastructure until this clears.

1. **Validate whether Sonnet is cheap enough at real usage.** If margin is still weak, move the gateway path down to Haiku and keep Opus opt-in only.
2. **Build the CMS compatibility matrix.** Capture a fixture screenshot with embedded alt text. Upload to WordPress, Squarespace, Webflow, Shopify, Notion, GitHub Pages, Medium, Ghost, Substack. Document which preserve `tEXt`. Publish the matrix on the README.
3. **Re-lead the README around the wedge** (not the preset count). Add the alt-text disclaimer adjacent to the alt-text UI field.
4. **Run channel test #1 in r/accessibility and the WebAIM list.** Demo a VPAT batch with embedded alt text. Frame outputs as drafts. Track signups, capture frequency, and alt-text edit rate as the leading indicators.
5. **Add capture-pipeline integration test.** One real Playwright run against a fixture page, asserting the PNG comes out non-empty and contains the embedded `tEXt` chunk.
6. **Delete `/src/server/` and `/src/client/` legacy trees** so contributors don't get misled.

### 30-60 days: decide

Read the leading indicators against the kill criteria. If kill criteria fired (item 1, 2, or 6 in particular), stop. Don't build a queue, don't add Stripe, don't pick a B2B brand. Document the result and move on.

If the wedge survived: pick a commercial brand (keep `screenshat` for OSS), draft ToS/AUP/Privacy, register the DMCA agent, add BullMQ-backed capture queue, switch rate limiter to Redis-backed. This is the productization sprint — ~10-15 days of focused work.

### 60-90 days: scale or close

Wedge survived and productization shipped: ship Stripe, Solo and Team tiers, run channel tests #2 and #3 (long-tail SEO, conference adjacency). Read against the 90-day paid-conversion kill criterion.

Wedge failed: archive the README pitch, mark the project "portfolio" status in `.nextup.json`, leave the live deployment up as a free demo, redirect time to a project where Luke's distribution maps to a real buyer (AAC/clinical workflow tooling has the credibility map screenshot tooling lacks).

## Risks Not Yet Assessed

- **Adversarial pre-mortem covered cynic angle, not the breaker's full attack surface.** Specifically, the breaker raised an SSRF/amplification concern: even with `urlSafety.ts` blocking internal IPs, screenshat can be used by an attacker to hammer external sites from `dr.eamer.dev`. If a target's WAF blocks the host, every other service on the box loses traffic. Worth a separate `/team:safety` pass before opening the public API to anonymous traffic.
- **No `team:tester` seat ran.** Verification strategy for the validation gate above is sketched but not formalized. Run `/craft:reconsider --validate` before the channel test if the kill criteria need tighter measurement.
- **No `team:greybeard` seat ran.** Operational failure modes at scale (Playwright OOM under burst, MySQL connection exhaustion, LLM rate-limit cascade) are flagged in the manager report but haven't been pressure-tested against SRE/USE-method analysis.
- **No competitor monitoring plan.** axe DevTools, Siteimprove, or Level Access bundling "alt-text on screenshot evidence" as a feature in their next release would erase the wedge. Set a quarterly check.

## Plan Provenance

Generated by the `/extract` skill running the full council:
- `team:recon` (codebase facts)
- `team:marketing` (audience, positioning, GTM, pricing)
- `team:legal` (IP, ToS, retention, brand)
- `team:manager` (debt, ops cost, runway)
- `team:breaker` (12 concrete failure scenarios)
- `team:cynic` (pre-mortem, kill criteria, leading indicators)

Refresh with `/extract --update` after the 30-day validation gate completes.
