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

## Included

- Dashboard with cycle day, estimated phase, and next-period date.
- Clickable cycle card opening a dedicated `#/cycle` view, with browser-back and direct-link support.
- Animated phase ring sized to your cycle settings, keyboard-operable day exploration, and four phase chapters.
- Educational hormone illustrations, phase explanations, comfort prompts, and real check-in summaries. Hormone curves are illustrative, never presented as measured data.
- Daily mood, flow, symptoms, private notes, and period-start logging.
- Editable recorded starts and explicit no-flow check-ins that end a period early; expected bleeding days use a lighter calendar color. The usual period-length setting stays unchanged.
- Calendar navigation, date-specific entries, and estimated period and fertile windows.
- A journal and symptom-frequency insights based on actual local entries.
- Cycle settings and preservation of previously recorded period starts.
- Partner code creation, copying, selectable sharing permissions, code entry, a partner preview, and revocation. Private journal notes are excluded from the partner preview.
- Educational phase and self-care cards with source links.
- Mobile navigation, keyboard focus handling for dialogs, and reduced-motion support.

## Frontend scope

The first visit uses a clearly labeled sample cycle. Add a period start date in Cycle settings or a daily check-in to personalize it. Entries and preferences persist under `periodt-v1` in browser local storage. No health data is sent to a backend. Google Fonts loads the typography; all illustrations are local SVG components.

Partner codes demonstrate the interaction in the same browser only. Real sharing across devices requires a backend, authentication/authorization, secure code redemption, and server-side revocation. Local storage is not encrypted and is accessible to anyone using that browser profile. This prototype is not a secure medical-record system.

Cycle phases, ovulation, and fertile windows are simplified calendar estimates. They cannot confirm ovulation and must not be used as contraception. Missed predictions do not automatically become recorded periods. Cycle/period lengths are user-entered settings, not inferred clinical averages. Previously recorded starts are retained; only the active cycle and its next predicted period are projected on the calendar.

## Research

The feature set focuses on tracking bleeding dates, flow, symptoms, and patterns across the cycle. Educational copy avoids suggesting that everyone has a fixed mood or energy level in each phase.

- [NHS: Periods and fertility in the menstrual cycle](https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/)
- [ACOG: Premenstrual syndrome and symptom diaries](https://www.acog.org/womens-health/faqs/Premenstrual-Syndrome)
- [NHS: Period pain and comfort measures](https://www.nhs.uk/symptoms/period-pain/)
- [NHS: Natural family planning and limits of fertility apps](https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/)
- [Office on Women's Health: Your menstrual cycle](https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle)
- [Office on Women's Health: PMS and daily symptom tracking](https://womenshealth.gov/menstrual-cycle/premenstrual-syndrome)

## Structure

`src/App.vue` contains the app shell, hash navigation, and interaction flows. `src/components/CycleDetail.vue` owns the cycle explorer; `CycleRing.vue` renders the shared animated ring. `src/lib/cyclePhases.js` shares phase boundaries and educational content. `src/composables/useCycle.js` owns reactive cycle state and local persistence. `src/style.css` and `src/styles/cycle-detail.css` complement Tailwind. Tests cover date boundaries, phase segmentation across supported settings, persistence, and storage failures.
