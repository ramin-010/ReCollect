---
version: 1
slug: "components-learning-learninghome-tsx"
primary_target: "components/learning/LearningHome.tsx"
related_targets: ["app/(app)/page.tsx"]
---

## Scope
Home / Today (`/`, components/learning/home/*), its sheets (learning settings, goal) and the Ctrl+K note finder. Mode: Operate.

## Audience and job
Ramin, a working software engineer, at the start of the workday on a laptop (sometimes a phone). Job: see today's few revisions and focus lines, do them, leave; glance at goal pace and the pinned pocket. Nothing opens by itself.

## Constraints
Inside the existing app shell (sidebar, navbar, themes light / dark / dark-gray). Tokens scoped to `.rc` for now, built to go app-wide. Routine features render only when routineEnabled.

## Direction contract
THESIS: Today is a library date-due slip: the short list due today, each item stamped with its next date the moment it is done. It refuses the dashboard of cards, streak flames and stat tiles.
OWN-WORLD: Slip-white (light) or graphite (dark) ground; flat paper cards with hairline printed rules and no card shadows; one slip blue for everything clickable; stamp violet only for dates the system stamps (next review, deadlines, active days); green and amber states always with words and an icon. Sofia Sans for all UI, Sofia Sans Condensed capitals for stamped dates. Dense rows, tabular figures.
STORY: He opens the first tab, reads "5 revisions, about 23 min", ticks each one and watches its next date land, checks goal pace, copies the pinned ssh command, and leaves.
FIRST VIEWPORT: Date heading top-left (34 px) with settings at top-right; one summary line; left column the slip (budget bar, rows with a fixed right-hand stamp column, a calm waiting line with Fresh start), Focus below it. Right rail: goal card with a deadline stamp and pace track, last-7-days cells, Pocket with pinned commands. Primary action: the row checks.
FORM: library date-due slip, position 6 of 7 on the ordered list; seed:3b7a751befa8f4d1.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Raises kept from the declined challengers
- Developer console: destructive actions (Fresh start, delete goal) stand alone behind space and stay outlined until focused; hairline seams instead of card shadows.
- Botanical folio: every row shows its review stage as the same fixed four-step mark in the same place.
- Pocket timetable: state is a mark in a fixed cell (filled done, hollow pending); rank comes from weight before size.
- Guide map: flat, unmodulated colour; no gradients or grain.
- Vertical feed: the next pending item is always ready; after a tick, focus moves to the next row.
- Type specimen: no ornament; weight and tabular figures carry the hierarchy.

## Memorable moment
The due stamp: ticking a revision presses a violet "Next 28 Nov" stamp into the row's stamp column.

## Unresolved
- Backend: plan should subtract minutes already done today; planned items should carry estMinutes; GET /api/today should carry the settings the banner needs (busyUntil).
- Phone use is assumed (PRODUCT.md).
