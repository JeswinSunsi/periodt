# Frontend UX audit

Reviewed all six routes, shared navigation, check-ins, cycle settings, educational dialogs, and the local partner preview. The original cream/sage palette, serif typography, botanical illustrations, and cycle animation remain.

| Issue                                                                                                       | Fix                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supporting text and controls frequently used 8–11px type and pale colors.                                   | Activated and completed the existing UX stylesheet: 14–15px body/action text, 12px supporting labels, darker text, and a restrained heading scale.                                                   |
| Small arrows, menu buttons, close buttons, calendar dates, and slider were difficult to target.             | 44px control heights, larger icon buttons, full-width calendar cells within their columns, and a 44px slider hit area with a delicate visual rail. Narrow calendar cells retain at least 24px width. |
| Fixed layouts crowded content at intermediate widths.                                                       | Cards stack when needed; grids shrink safely; dialog inputs use 16px text; long journal content wraps.                                                                                               |
| Sample estimates could look like personal data.                                                             | Visible setup prompt on pages that display cycle estimates, removed after personalization.                                                                                                           |
| Selecting a dashboard mood looked saved but wasn’t; existing mood could override a newly selected one.      | Mood selection opens the editor with the chosen mood. Save state is explicit; cancel restores the saved selection.                                                                                   |
| Empty check-ins could clutter the journal and inflate counts.                                               | New entries require a mood, flow, symptom, note, or period start.                                                                                                                                    |
| Escape, backdrop clicks, closing, or switching to settings could silently lose edits.                       | Unsaved-edit confirmation with keep-editing/discard actions for check-ins and settings.                                                                                                              |
| Mobile navigation did not manage focus or Escape; resizing could leave scroll locked.                       | Focus trapping, background isolation, a close button, Escape, return focus, and breakpoint cleanup. Added a skip link.                                                                               |
| Dialog focus could return to a removed or hidden control.                                                   | Restore to the original visible trigger, mobile menu, or page heading.                                                                                                                               |
| Calendar weekday initials were ambiguous; dots had no legend; partner promotion competed with the calendar. | Three-letter weekdays, today/check-in legend, interaction instructions, announced month changes, and a dedicated full-width calendar page.                                                           |
| Future notes looked like completed check-ins and affected insights counts.                                  | Explicit planned-note labels/actions; future entries excluded from check-in totals and symptom-frequency denominators.                                                                               |
| Journal dates omitted the year and mistaken entries couldn’t be removed.                                    | Year labels, bounded previews, and confirmed deletion that also updates recorded period-start history.                                                                                               |
| Cycle exploration relied on vague instructions and an unlabeled phase section.                              | Clear slider label, phase section heading, selected states, and future-day note action.                                                                                                              |
| Settings didn’t explain cycle versus bleeding length.                                                       | Field descriptions and supported input ranges connected to inputs.                                                                                                                                   |
| Partner flow implied cross-device sharing; disabled creation and stale errors lacked useful feedback.       | Up-front local-demo explanation, demo-code action, permission-selection hint, and error clearing on correction.                                                                                      |
| A static profile chevron implied an unavailable menu.                                                       | Removed the misleading chevron.                                                                                                                                                                      |
| Vague self-care link obscured its destination.                                                              | “Browse self-care guides” label.                                                                                                                                                                     |

## Follow-up adjustments

The sample-cycle setup banner was removed at the user's request. Existing sample labels and Cycle settings remain. The period-start checkbox is always available on a recorded start date so it can be unchecked. It is hidden on other dates within seven days of a recorded start and available again on day 7. Sample dates do not block it.

Recorded bleeding is shown in red; expected days use a lighter red. From day 4 of an ongoing recorded period, “My period ended” appears in the start checkbox's position. Checking it selects None and records an end; unchecking it clears that end and its no-flow selection. A saved end date remains editable. Recorded start dates retain their start checkbox. Explicitly choosing and saving None also ends that period's remaining expected days and labels the journal entry “Period ended.” Default None values in older or mood-only entries do not imply an end. Editing or deleting the end entry recalculates the calendar and current cycle display, while the usual period-length setting and next-cycle prediction remain unchanged.

## Verification

- `npm run build` and `npm test`.
- `scripts/verify-ux.mjs` checks all six routes at 320, 390, 768, 1024, and 1440px; saves screenshots in ignored `ux.local/`.
- Browser checks cover keyboard focus, mood save/reload/discard, settings, phase selection and slider, future notes, insights counts, confirmed deletion, partner preview/errors/revocation, education dialogs, and mobile-to-desktop resizing. A fresh browser context uses synthetic entries, leaving the user's browser data untouched.
- Screenshots were visually reviewed for desktop and phone layouts. These checks do not constitute a complete screen-reader or cross-browser accessibility certification.

Run the browser checks with a local dev server and Playwright available:

```sh
node scripts/verify-ux.mjs
```

Optional first argument: path to a bundled Playwright `index.mjs`. `UX_URL` overrides the default local URL (`http://127.0.0.1:5174/`); `UX_BROWSER` overrides the installed Edge channel (`msedge`).
