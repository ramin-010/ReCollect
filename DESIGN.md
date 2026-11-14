---
name: Recollect
description: Where a working software engineer keeps what he is learning alive. Theme v2: Notion-grade calm, light and dark.
colors:
  page: "#FFFFFF"
  page-dark: "#191919"
  sidebar: "#F9F8F7"
  sidebar-dark: "#202020"
  surface: "#FFFFFF"
  surface-dark: "#202020"
  surface-2: "#F4F3F2"
  surface-2-dark: "#262626"
  float: "#FFFFFF"
  float-dark: "#252525"
  button-hover-dark: "#2F2F2F"
  field: "#F7F7F5"
  line: "#EFEEEC"
  line-dark: "#2C2C2B"
  line-strong: "#E3E2DF"
  line-strong-dark: "#383836"
  ink-1: "#2C2C2B"
  ink-1-dark: "#F0EFED"
  ink-2: "#5F5E59"
  ink-2-dark: "#ADA9A3"
  ink-3: "#73706B"
  ink-3-dark: "#8E8B86"
  sidebar-ink-dark: "#BCBAB6"
  icon: "#8E8B86"
  control-dark: "#7D7A75"
  switch-off: "#D4D3CF"
  avatar: "#E3E2DF"
  avatar-dark: "#4A4947"
  accent: "#1F6FD1"
  accent-hover: "#1A5FB5"
  accent-dark: "#5B9BEA"
  accent-hover-dark: "#7DB0F0"
  accent-fill: "#2383E2"
  accent-fill-hover: "#0077D4"
  accent-tint: "#E5F2FC"
  accent-tint-dark: "#233850"
  stamp: "#553B69"
  stamp-dark: "#F3EBF9"
  stamp-tint: "#F3EBF9"
  stamp-tint-dark: "#3C2D47"
  good: "#2A6B47"
  good-dark: "#6FB38C"
  good-mark: "#50946E"
  good-tint: "#E8F1EC"
  good-tint-dark: "#263D30"
  attention: "#8A4F1C"
  attention-dark: "#E09A52"
  attention-mark: "#CB9434"
  attention-tint: "#FBEBDE"
  attention-tint-dark: "#53361F"
  danger: "#B5443B"
  danger-dark: "#E5786F"
  danger-tint: "#FCE9E7"
  danger-tint-dark: "#502C29"
  main: "#2C2C2B"
  main-hover: "#3F3E3C"
  main-dark: "#E6E5E3"
  main-hover-dark: "#F0EFED"
  shadow-black: "#000000"
  knob-shadow: "rgba(0, 0, 0, 0.25)"
typography:
  page-heading:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI Variable Display, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  page-heading-phone:
    fontSize: "28px"
  page-heading-wide:
    fontSize: "34px"
  sheet-title:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  section-label:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  row-title:
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1
  ui-small:
    fontSize: "13.5px"
    fontWeight: 500
  meta:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  tag:
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1
  small:
    fontSize: "12px"
    fontWeight: 500
  code:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.55
  doc-title:
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  doc-h1:
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.3
  doc-h2:
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  doc-h3:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  doc-body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  doc-code:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13.5px"
    lineHeight: 1.6
rounded:
  hairline: "1px"
  micro: "2px"
  xs: "4px"
  avatar: "5px"
  sm: "6px"
  md: "8px"
  pill-group: "9px"
  menu: "10px"
  lg: "12px"
  xl: "14px"
  full: "999px"
spacing:
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-laptop: "40px"
  section: "36px"
  column-gap: "40px"
  sidebar-row: "30px"
  list-row-y: "9px"
components:
  button-main:
    backgroundColor: "{colors.main}"
    textColor: "{colors.page}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-1}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-quiet:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    height: "28px"
    padding: "0 8px"
  check:
    rounded: "{rounded.xs}"
    size: "18px"
  check-done:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.page}"
    rounded: "{rounded.xs}"
    size: "18px"
  date-tag:
    backgroundColor: "{colors.stamp-tint}"
    textColor: "{colors.stamp}"
    rounded: "{rounded.xs}"
    height: "22px"
    padding: "0 7px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink-1}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  segmented:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.md}"
    height: "32px"
  segmented-chosen:
    backgroundColor: "{colors.main}"
    textColor: "{colors.page}"
    rounded: "{rounded.sm}"
---

# DESIGN.md: Recollect (theme v2)

_Rebuilt 2026-11-14 after the owner judged the first skin "not premium" and set the bar at Notion. Tokens: `components/rc-ui/rc-ui.css` (Home, `.rc`) and `app/theme-v2.css` (app-wide, `--ui-*` and the legacy `hsl(var(--x))` tokens). Product truth: PRODUCT.md. The standing brief: DESIGN_RULES.md. Frontmatter keys are the light steps, and `-dark` keys are the dark steps._

## Overview

**The world, in one line: a quiet desk you open at the start of the workday. One warm-grey family, things in their place, and colour only where it means something.** The library date-due slip survives as the one signature: a ticked revision takes its next date as a soft purple tag.

**Source of the system: Notion's live design tokens.** They were reverse-engineered on 2026-11-14 from the stylesheet every visitor of a public notion.site page downloads: 741 custom properties, light and dark. See `context/research/design-v2/notion-tokens.md` and its resolved JSON. Recollect keeps Notion's structure:
- page, sidebar and floating layers
- text in primary, secondary and tertiary levels
- hairline rings instead of borders
- one blue for focus and the main fill
- colour families as tinted tags

Recollect's own choices sit on top:
- every text pair meets WCAG AA, so meta ink is a step darker than Notion's `#7D7A75` on white
- its own accent steps
- the purple date tag
- its layout

**Why Notion's palette and not an invented one:** the owner named Notion's typography, sidebar, colours and backgrounds as the bar, in both themes. Those effects come from specific, measurable choices: warm greys, a 7-step gap between page and sidebar, text at about 81% ink, and 30 px rows. Copying the principles while guessing the numbers is what made the first skin read as "template".

**Scene → both themes are first-class.** Light: white page and a warm off-white sidebar for daylight. Dark: `#191919` / `#202020` for late evenings. The theme menu (sidebar foot) offers Light, Dark and System; the legacy "dark-gray" class is an alias of Dark.

## Colors

Contrast is WCAG 2.x, measured on the surface each colour sits on.

| Role | Light | Dark | Notes |
|---|---|---|---|
| Page / sidebar / card / float | #FFFFFF / #F9F8F7 / #FFFFFF / #FFFFFF | #191919 / #202020 / #202020 / #252525 | Notion bacPri / bacSec / bacEle / popBac |
| Ink 1 (titles, body) | #2C2C2B | #F0EFED | 14.4 · 15.2 |
| Ink 2 (secondary, section labels) | #5F5E59 | #ADA9A3 | 6.5 · 7.4 |
| Ink 3 (meta, placeholders) | #73706B | #8E8B86 | 4.9 (4.6 on the sidebar) · 5.2 (4.8 on a card). Notion's own #7D7A75 is 4.27 on white, so it was not used for text |
| Sidebar text | #5F5E59 | #BCBAB6 | Notion texAccPri |
| Icons | #8E8B86 | #8E8B86 | non-text ≥ 3:1 |
| Hairline / strong line | #EFEEEC / #E3E2DF | #2C2C2B / #383836 | |
| Hover / selected fill | ink at 5.5% / 8.5% | white at 5.5% / 8.5% | alpha, so they work on any layer |
| Accent (links, text) | #1F6FD1 | #5B9BEA | 4.9 · 5.7 |
| Accent fill (checked box, switch, focus) | #2383E2 | #2383E2 | Notion blue; never carries text |
| Date tag | #553B69 on #F3EBF9 | #F3EBF9 on #3C2D47 | the only purple: dates the system stamps |
| Good / attention / danger text | #2A6B47 / #8A4F1C / #B5443B | #6FB38C / #E09A52 / #E5786F | each with a mark and tint step |
| Main button | #2C2C2B, white text | #E6E5E3, #191919 text | the one main action per screen |

**Rules:**
- *Grey first:* chrome is grey. Quiet buttons are grey and fill on hover. Colour never announces a button.
- *One accent:* blue is only on what can be clicked: links, the checked box, switches, focus.
- *Purple is a date.*
- *States speak twice:* green and amber always come with words and an icon.
- *Subjects:* a subject's own colour appears only as its 8 px swatch.

## Typography

**The OS face, as Notion does:** `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif`. On the owner's Windows laptop that is Segoe UI Variable Display, the exact type in his Notion screenshots; on a Mac it is SF Pro. Nothing is downloaded.
- The owner chose this over Inter on 2026-11-14.
- Sofia Sans (the first skin) is retired.

| Role | Size / line | Weight |
|---|---|---|
| Page heading | 28 phone · 32 laptop · 34 ≥ 1600 / 1.2 | 700, −0.01em |
| Section label (Focus, Goals, Pocket) | 15 / 1.35 | 600, ink 2 |
| Row title | 15 / 1.4 | 500 |
| Body | 15 / 1.5 | 400 |
| UI (sidebar rows, buttons, menus) | 14 | 500 (rows), 400 (menus) |
| Meta | 13 / 1.4 | 400, ink 3, tabular figures in columns |
| Tag | 12.5 | 500 |
| Small (kbd, sidebar section labels) | 12 | 500 |

Nothing is under 12 px, and there are no all-caps labels. Rank comes from weight and ink before size.

## Layout

- **Shell (Notion's pattern):**
  - Sidebar: 248 px (60 when collapsed). Workspace row (avatar, name), Search · Ctrl K, 30 px rows with 18 px grey icons, a "Recent" section (up to 6, fading at the edge instead of "…"), and Settings plus the theme menu at the foot.
  - Top bar: 44 px in the page colour with no border; a breadcrumb of page icon and title.
- **Home (unchanged since the owner-approved layout):**
  - Header: the date, then one summary line with the 7 rhythm cells, then Capture (Ctrl K) and settings.
  - Main column: the slip card (budget line, rows, Done today, the waiting footer), then Focus, then Due today.
  - Rail (340 / 360 px): the goal card, then Pocket as a plain list.
  - Frame: max 1160 (1200 ≥ 1600), 40 px between columns, 36 px between sections.
- **Rows:** list rows are inset hover pills (6 px radius, 9 px vertical padding), with no dividers inside a list. Hairlines separate sections only.
- **Desktop first:** phone (390) is deferred until the owner approves desktop.

## Elevation & Depth

Layers rise by fill (page, then card, then float), never by heavy shadow. A card is a fill plus one hairline ring and a breath of shadow, Notion's shaOutSm:
- light: `0 0 0 1px rgba(42,28,0,.07), 0 2px 4px rgba(0,0,0,.04)`
- dark: `0 0 0 1px #2C2C2B, 0 2px 4px rgba(0,0,0,.12)`

Floating layers (menus, popovers, sheets) use a ring and a soft drop. The side sheet floats 8 px from the edges. Overlays dim the page; no blur. Outlined buttons use Notion's raised style: their own fill, an inset 1 px ring and a 1 px shadow.

**Motion: the one authored moment is the date tag.**
- On tick, the box fills blue (120 ms) and the title strikes through.
- The "Next 16 Nov" tag rises into the row's fixed date column: 4 px up, from 94% scale to full, 240 ms, `cubic-bezier(.2,.9,.25,1)`.
- Everything else is 100–120 ms colour and opacity.
- The sidebar resizes in 200 ms; nothing springs or bounces.
- `prefers-reduced-motion` makes everything instant.

## Shapes

Radius scale:
- 4: tags, check boxes, kbd
- 5: avatar
- 6: rows, small buttons, segments
- 8: buttons, inputs
- 9: floating pill groups
- 10: menus
- 12: cards
- 14: sheets and dialogs

Icons are lucide with a 1.75 stroke at 16 / 18 px, in the icon grey, turning to ink on hover.

## Components

- **Buttons** (`rc-btn`), 32 px (28 sm):
  - main: ink fill, one per screen
  - outline: raised with a ring
  - quiet: grey, fills on hover
  - danger: raised, red text
  - danger-solid: only inside a delete confirm
- **Check** (`rc-check`): an 18 px box with a 1.5 px grey edge and a 44 px hit area. Done is blue with a white tick.
- **Date tag** (`rc-stamp`): the purple tag. **Neutral tag** (`rc-tag`): surface 2 with ink 2.
- **Inputs:** a soft field with a 1 px inset ring. Focus is a blue inset ring plus a 3 px blue halo.
- **Segmented:** the chosen segment is dark, with its count.
- **Meters:** neutral by default. The budget bar is 4 px, with done segments in ink 2. The goal meter shows status colour on its tint with a steady-pace tick.
- **Capture palette (Ctrl K):** controls sit in floating pills above the input (Task / Note / Link / Find · Revise this · Anytime / This week / This month), with the shortcut hints in a pill below. Theme tokens throughout, so it works in light.

## Do's and Don'ts

### Do:
- Keep chrome grey and let content carry colour.
- Say the day in plain words ("3 to revise · about 24 min · 15 waiting").
- Let text wrap. In the sidebar a long title fades at the edge; never use "…".
- Name buttons by what happens, and keep that name through confirm and toast.

### Don't:
- Add blue links everywhere, violet everywhere, bordered cards, a white-on-black main button in light mode, or colour-tinted inks.
- Add gradients, glows, blur overlays, all-caps labels, text under 12 px, or bouncy spring motion.
- Show red for lateness, a streak flame, or percentages of blocks.
- Add a second authored motion to Home.

## Design log

- 2026-11-14 · World: library date-due slip (Impeccable roll, unattended: the owner's rule is "build it, then I judge"). Pick not built: railway reservation chart and waitlist.
- 2026-11-14 · Raises from declined challengers:
  - destructive actions isolated and outlined (developer console)
  - a fixed four-step review mark in every row (botanical folio; removed in v2)
  - state as filled or hollow cells, rank by weight first (pocket timetable)
  - flat colour, no gradients or grain (guide map)
  - after a tick, focus moves to the next row (vertical feed)
  - no ornament; figures carry hierarchy (type specimen)
- 2026-11-14 · Considered and set aside before building: a mechanical-keyboard world (keycap press as the signature). Impeccable's Operate rule: a tool the audience operates comes back as a costume.
- 2026-11-14 · Dropped from Home (kept in code, shown only while routine is on, via `home/RoutinePanel`):
  - the timeline, Day Manager and Wrap up day
  - the triage / catch-up / debrief dialogs (now behind a "Review" link, never automatic)
  - adherence %

  Weekly review became a "Plan your week" link on Mondays. The Progress card (mastered counts) and the old Revise header are no longer on Home.
- 2026-11-14 · **Owner-driven** (via the supervisor, after seeing the old Home: "ugly and cluttered; think better and premium"):
  - header = date + one summary line with the 7 rhythm cells inline + one dark Capture (Ctrl K) + settings
  - the slip is the hero with no heading; done rows fold at the bottom; the waiting line + "Spread them out" is its footer
  - Focus sits light under it; Tasks show only when something is due today
  - rail = goal card first, then Pocket as pinned notes only, copy first, with search, "All notes" and an inline "Add"
- 2026-11-14 · **Owner-driven final pass:**
  - the budget is a quiet button that opens settings focused on the stepper
  - the summary line uses " · " separators with no full stops
  - the goal forecast is one calm sentence built from the forecast's numbers
  - the next milestone is a plain row under a hairline
- 2026-11-14 · Real backend (G1) shapes adopted: plan items carry `minutes`; goals carry `subjects`; carry-over returns `{ items, carried }`; milestone writes return the goal with its new forecast; fresh start has a dry run. The steady-pace tick needs the goal's start day (`createdDay`), which `/api/today` doesn't send yet.
- 2026-11-14 · Owner: desktop first; phone layout deferred until the desktop design is approved.
- 2026-11-14 · **Owner verdict on the built Home: "not premium". The bar is Notion:** sleek type, a calm sidebar, restrained colours and backgrounds, in light and dark.
  - He authorised reverse-engineering open-source apps for colour and theming, asked for the plan before the refactor, then said go: system font; scope = theme + sidebar + Home.
  - Measured from his dark screenshots (1920×1080 @125%), Notion uses one warm-grey family: sidebar #202020, page #191919, callout #383836, text #F0EFED, sidebar text #BCBAB6, labels #7D7A75.
  - Ours had: a #242424 top band, page #171717, purple-tinted cards #1F1F21 and text #EDECF1, sidebar text #8B8B8B, 41 px sidebar rows against 30, and Sofia Sans.
- 2026-11-14 · **Theme v2 built** (supervisor, by hand). Notion's tokens were pulled from its live CSS (no research doc, as the owner asked).
  - `app/theme-v2.css` re-steps the whole app (unlayered over the legacy blocks; legacy dark-gray = Dark).
  - `rc-ui.css` rewritten.
  - Sidebar and top bar rebuilt in Notion's pattern.
  - Home kept its layout:
    - rows became inset hover pills with no dividers
    - the four-cell review mark became words
    - the stamp became a purple date tag
    - budget, rhythm and progress are neutral
    - quiet buttons are grey
    - Focus and Pocket are plain lists
  - Capture palette rethemed: sentence case, floating pills, no blur. Its plan options now read "Anytime / This week / This month"; "Task" had been used twice.
  - TaskInput, CaptureComposer, NoteFinder and SubjectPicker were moved off hard-coded white so light mode works.
  - Detector: no anti-patterns; the advisory drift was cleared by this file.
- Turned down by the owner: the old Revise-style Home (cluttered). Never re-propose it.
- Turned down by the owner: the first due-slip skin as a whole ("not premium"). That means blue links everywhere, violet everywhere, bordered cards, the loud main button, colour-tinted inks, Sofia Sans, the rotated condensed stamp. Its layout and features stay.
- 2026-11-14 · **Docs round (B), built unattended; the owner judges next.** Library `/docs`: Notion's list rhythm (40 px inset hover rows, no dividers), a 200 px subject rail a size smaller than the list, views as the segmented row (All · Due · Pinned, chosen one dark with its count), search and sort on one 32 px row, the one main action "New doc". Status column in plain words ("Revise today" with an icon, "Next 16 Nov", "Mastered" in green with an icon); the purple date tag stays Home's signature and the doc page's single "Next" tag, not a column of tags. Titles wrap, never cut.
- 2026-11-14 · Doc page `/docs/[id]`: Notion's measured editor (720 column, title 40/700, H1 30, H2 24, H3 20 at 600/1.3, body 16/24, blocks 3 px padding + 1 px margin), properties as Notion rows (Subject, Revision, Goal, Edited) under the title with a hairline before the body. The block handle ("+" and the grip) lives in the left gutter; the grip opens Turn into / Duplicate / Delete. Slash menu = Notion's compact rows with the Markdown shortcut as a hint. Selection bar = Turn into, marks, link, 3 highlight tints (the status tints). Callouts use GitHub's five kinds (tints from the status colours); toggles hide answers ("Recall check"). Quotes use a 2 px ink-3 rule (typographic, not a card edge). Code: GitHub's light/dark syntax palettes on surface 2.
- 2026-11-14 · New doc dialog: template list left, a paper preview of the outline right (fades at the bottom), subject + "Revise this" in the footer, "Create doc" as the main action.
- 2026-11-14 · Recall mode: a centred panel on the float layer; the question is the largest text (18/500); grades speak twice ("You've got it" green + check, "Almost" amber + dashed circle, "Not yet" ink-2 + slash; never red); the doc's own passage sits in a surface-2 quote; the summary's "Next 16 Nov" is the purple tag (Home's signature moment, reused on purpose). Falls back to "Mark as revised" when the AI can't run.
- 2026-11-14 · Agents and AI in Settings: the token is shown once in a surface-2 panel with the exact `claude mcp add` command; the AI tab is a neutral meter against the monthly cap. "From your agent" on Home uses Focus's row rhythm with quiet Open / Keep / Undo; the doc page gets an "Agent" property row.
- 2026-11-14 · **Canvas block (Phase E, built unattended; the owner judges next).** A board of boxes and arrows inside a doc, on React Flow 12.12.0 (MIT; base CSS only, attribution hidden). The board sits on surface 2 like a code block, 8 radius, no dot grid (the craft floor bans decorative grids; snapping to 8 px is invisible). Boxes are paper with a 1 px ring and no shadow; sticky notes get the card shadow; colours are Notion's colour-family tints (default, gray, blue, green, yellow, red; no purple, which is the date) and text stays ink on every tint. Arrows are ink 3, 1.5 px, and attach to the shapes' real outlines. Selection, dots and connecting use the one blue (accent fill). Chrome appears on hover or focus only: shapes top left, zoom/fit/full screen bottom right; the selection bar floats over the selection and is clamped inside the board. Full screen is the float layer over the dimmed page (14 radius). Wheel scrolls the page until you click into a board.
- 2026-11-14 · **Editor feel, after the owner's "can't drag the handle"** (checked with person-speed mouse moves): the handle row reaches into the gutter, so the handle never vanishes on the way; dragged blocks land above or below by the target's half with Notion's blue line (3 px, accent fill at 80 %); list handles sit left of the marker; the divider has a 25 px row; the to-do box sits on the line's middle; the format bar never shows during a drag.
- 2026-11-14 · **Diagrams for agents, the board's side (AGENT_DIAGRAMS_PLAN step 1, 3, 4).** Zones are frames drawn behind their boxes: the gray tint one step darker than the board (colours as tints at 70 %), a hairline ring, 12 radius, the name at the top left in 13/600 ink 2; you move a zone by its name, its inside lets the pointer through (pan, select, double-click to add a box in it), and a box dropped into a zone joins it. Kinds (database, cache, queue, service…) put a 16 px lucide icon in ink 2 left of the text; "What it is" is a searchable picker in the selection bar. New shapes: a rounded box (14 radius) and a queue drawn as a pipe lying on its side. Arrows follow the layout engine's right-angle route with 8 px rounded corners until a box they touch moves; labels sit above every arrow. Tidy up (a wand, end of the tool bar) and Save as SVG / PNG (view bar) use the server's engine and drawing. A Mermaid diagram gets "Full screen": the canvas's float layer, wheel zooms at the pointer, drag pans, fit at most 150 %, Save as SVG / PNG with the page colour behind it.
