# periodt.

A cozy, responsive period-tracking frontend built with Vue 3, Vite, Tailwind CSS, and custom CSS. Cream, sage, warm serif typography, and original botanical SVG illustrations keep the experience gentle and clear. No account or sign-up flow.

## Run locally

```sh
npm install
npm run dev
```

```sh
npm run build
npm test
npm run format
```

## Deployment

Navigation uses Vue Router's HTML5 history with `/overview`, `/cycle`, `/insights`, `/journal`, and `/partner`. Vite handles direct page loads during development and preview. Production hosts must serve `index.html` for app routes so refreshing or opening a link directly works. `public/_redirects` supplies this fallback for Netlify and Cloudflare Pages; configure an equivalent fallback on other hosts. Older `#/...` links redirect to their clean URLs, and `/calendar` redirects to `/overview`. Until setup is complete, every page redirects to `/onboarding`, which returns to the originally requested page once setup finishes; `/onboarding` redirects into the app after that.

## Included

- Compact first-visit setup with a required period start, usual lengths, editable review, and animated progress. Every screen fits the viewport; existing users retain their data.
- Dashboard with cycle day, estimated phase, and next-period date.
- Clickable cycle card opening a dedicated `/cycle` view, with browser-back and direct-link support.
- Animated phase ring sized to your cycle settings, keyboard-operable day exploration, and four phase chapters.
- Educational hormone illustrations, phase explanations, comfort prompts, and real check-in summaries. Hormone curves are illustrative, never presented as measured data.
- Daily mood, flow, symptoms, private notes, and period-start logging.
- Editable recorded starts and explicit no-flow check-ins that end a period early. Only recorded bleeding is colored; the next estimated start is a single calendar marker. The usual period-length setting stays unchanged.
- Overview calendar with month navigation, date-specific entries, and estimated period and fertile windows.
- A journal and symptom-frequency insights based on actual local entries.
- Cycle settings and preservation of previously recorded period starts.
- Partner code creation, copying, selectable sharing permissions, code entry, a partner preview, and revocation. Private journal notes are excluded from the partner preview.
- Educational phase and self-care cards with source links.
- Mobile navigation, keyboard focus handling for dialogs, and reduced-motion support.
- Sage and Pink themes, switchable from the top bar with a saved browser preference.

## Frontend scope

The first visit opens a short onboarding flow: welcome, period start, usual lengths, and review. Setup requires a real start date; there are no sample, skip, or uncertain-date paths. Answers stay in memory until the final review is confirmed; going back preserves them, while refreshing starts setup again. Legacy saved profiles retain their data; previously skipped onboarding returns to setup. Entries, preferences, and setup completion persist under `periodt-v1` in browser local storage. No health data is sent to a backend. Google Fonts loads the typography; all illustrations are local SVG components.

Partner codes demonstrate the interaction in the same browser only. Real sharing across devices requires a backend, authentication/authorization, secure code redemption, and server-side revocation. Local storage is not encrypted and is accessible to anyone using that browser profile. This prototype is not a secure medical-record system.

Cycle phases, ovulation, and fertile windows are simplified calendar estimates. They cannot confirm ovulation and must not be used as contraception. Missed predictions do not automatically become recorded periods. Cycle/period lengths are user-entered settings, not inferred clinical averages. Previously recorded starts are retained; only the active cycle and its next predicted period are projected on the calendar.

The next estimated start is the last period start plus the configured cycle length (28 days by default). The [ASRM calendar model](https://www.asrm.org/practice-guidance/practice-committee-documents/optimizing-natural-fertility-a-committee-opinion-2021/) places estimated ovulation on cycle day `cycleLength - 14`, counting the period start as day 1. The fertile window includes that day and the five preceding days: days 9–14 for a 28-day cycle, or days 11–16 for a 30-day cycle. Calendar colors, displayed dates, and phase boundaries share this calculation. Estimates stay anchored to the entered start; the app does not infer a new start when the date passes.

## Research

The feature set focuses on tracking bleeding dates, flow, symptoms, and patterns across the cycle. Educational copy avoids suggesting that everyone has a fixed mood or energy level in each phase.

- [NHS: Periods and fertility in the menstrual cycle](https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/)
- [ACOG: Premenstrual syndrome and symptom diaries](https://www.acog.org/womens-health/faqs/Premenstrual-Syndrome)
- [NHS: Period pain and comfort measures](https://www.nhs.uk/symptoms/period-pain/)
- [NHS: Natural family planning and limits of fertility apps](https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/)
- [Office on Women's Health: Your menstrual cycle](https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle)
- [Office on Women's Health: PMS and daily symptom tracking](https://womenshealth.gov/menstrual-cycle/premenstrual-syndrome)

## Adding a theme

Theme colors live in `src/styles/themes.css` as semantic CSS custom properties. The default Sage palette defines the token contract; `[data-theme="pink"]` overrides it. Components, SVG illustrations, charts, and phase indicators consume these tokens rather than choosing a palette themselves.

To add a theme:

1. Add a `[data-theme="your-id"]` block to `src/styles/themes.css`, overriding the default tokens for your palette. Any omitted tokens inherit the Sage defaults.
2. Add an entry in the `themes` registry in `src/lib/themes.js` with a unique `id`, display `label`, CSS `swatch` color, and `browserColor` for the browser’s toolbar. The top-bar picker discovers it automatically.
3. Check the theme on each page, in dialogs, and on mobile. Keep text and focus indicators legible and cycle phase colors distinct.

`src/composables/useTheme.js` applies the selected theme to the document before Vue mounts and saves its ID under `periodt-theme`, separately from cycle data. Unknown saved IDs fall back to Sage. If browser storage is unavailable, switching still works for the current visit.

## Structure

`src/router/index.js` defines the page routes; `src/main.js` installs the router and mounts `src/AppRoot.vue`, which renders the `RouterView` and the onboarding-to-app handoff. `src/App.vue` is the shared shell (navigation, top bar, page heading, footer, toast) and renders the active page from `src/views/` in its `RouterView`; each route's heading and description live in its route meta. `src/components/dialogs/AppDialog.vue` hosts the one open dialog; each dialog component owns its own form state and actions. `src/composables/useDialog.js` tracks the open dialog, unsaved-change prompts, and toasts so any page can open a dialog by name; `useCheckin.js` holds the date the check-in dialogs show and today’s check-in. `src/components/CycleCalendar.vue` is the Overview calendar. Shared copy lives in `src/lib/content.js`. `src/components/CycleDetail.vue` owns the cycle explorer; `CycleRing.vue` renders the shared animated ring. `src/components/onboarding/` contains the `/onboarding` route page, the setup flow, progress navigation, and day-count field. `src/composables/useOnboarding.js` manages its draft and step transitions; `src/lib/onboarding.js` validates and applies confirmed answers. `src/lib/cyclePhases.js` shares phase boundaries and educational content. `src/composables/useCycle.js` owns reactive cycle state and local persistence, including setup status and compatibility with older saved data. `src/style.css`, `src/styles/onboarding.css`, and `src/styles/cycle-detail.css` complement Tailwind. Tests cover date boundaries, phase segmentation across supported settings, onboarding, persistence, and storage failures.
