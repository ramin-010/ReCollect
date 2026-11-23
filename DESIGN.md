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

- 2026-11-23 · **A lesson's notes and its revision card** (STUDY_FLOW_PLAN, his asks; screens 562-566): the doc page gets a **right panel** for the lesson's notes and links, his ChatGPT right panel as the model and Home's right sidebar as ours: a toggle at the top bar's right end (the panel glyph, the lesson's count beside it, filled while open; it never moves), 320 px beside the doc, the page's own ground, no line, no scrollbar, 160 ms slide; inside, two quiet label lines **Notes** and **Links** (13 px ink 2, a + each that opens Ctrl K on Note or Link for this lesson), rows of title + one meta line ("23 Nov · from Claude Code", a link's site with its arrow), a note's title unfolds its text in place, the row's ··· (Edit, Delete) only on hover; then **From the subject · N**, folded. Below 1,080 px of page the same content is the kit's sheet. A subject's page gets one quiet line under its summary, **Notes · N**, opening a sheet (the subject's own, then each lesson's under its title). **The revision card** opens in a new kit piece, `RcDialog` (`.rc-read`: centred, 720 px at most, 85% high, its body scrolling, a footer that stays; full screen on a phone): the lesson's title, "Review 1 of 4" quiet at the right, the card drawn by the editor read-only (its own heading hidden: the dialog's title says it), Quiz me and Mark as revised quiet at the left, **Done** (main) at the right. Home's review row of a lesson with a card opens it; the doc's Revision row gets **Card**.

- 2026-11-23 · **Easy setup and the chat decides** (EASY_SETUP_PLAN, his "build it"; screens 550-561): a computer's sign-in has its own page, **`/connect-pc`**, on the consent page's quiet column: "Connect this computer to Recollect?", who is signed in, the computer as one card on surface 2 (a laptop icon, the name it gave, "Code BCDF-GHJK" in tabular figures), one line under it ("Approve only if your terminal shows this same code…"), the same abilities list and undo note as an app's sign-in, Deny outlined and Approve the one dark button (stacked full width below 520 px); after the answer only a title and one line ("Connected" / "Denied"). Without a code: "Connect a computer", one code field and Continue. Settings › Tracking: each folder row gets **what is logged** as a quiet text button with a chevron (Everything · Time only · Nothing, a check icon on the current one) to the left of its kind; on a phone the name sits over both controls, all from the left; "not set yet: its next chat asks" leads the meta of a folder nobody decided; a **New folders** section (Ask · Personal · Study · Work · Ignore). Home › Today so far › Sessions: each row's actions gain a tag button (before Edit and Remove) whose menu sets Personal · Study · Work; an agent's call shows in the row's meta ("study, Claude Code’s call"). Settings › Agents starts with **Use it in your coding tools**: one help line and the command in the copy row.

- 2026-11-23 night · **Personal and work** (PERSONAL_OFFICE_PLAN, his "build it"; screens `tracking-1-dark`, `tracking-2-light`, `stand-lens-1…8`): Settings gets a **Tracking** tab (between Agents and AI): "What counts as progress" as a two-way segmented control (Personal only / Personal and work) with one help line that says what each means, then **Folders**: one row per folder (name; "last worked yesterday · 2 h 20 min in 4 weeks") with a Personal · Study · Work segmented control at its right (stacked under the name below `sm`). Where you stand puts a second segmented control (Personal · Work · All) beside Week · Month · Year, only for an account with work. Work time is drawn in a quiet slate (`--rc-wave-work`: #8fa3c4 dark, #5b6b8c light, #5d6880 Paper light, #9aa7bf Paper dark) so it never reads as the year's green; All draws personal green and work slate as two lines with a two-item legend and no span-before line. The Work view's **What you did** is a label line and day rows (day name and its time, then each folder's time in ink 2 and its work-log lines as "Done: …", "Decided: …" with the word in ink 3). A day's tooltip on Home's year card may name where its time went and wraps at 300 px. Home's buddy card shows only the buddy's line for now: no older note or stand-in line in its place (his word, 11-23).
- 2026-11-22 · **Where you stand rebuilt** (WHERE_YOU_STAND_PLAN, Fable's calls): no cards; a strip with a Week/Month/Year segmented switch and the spans ("16–22 Nov · against 9–15 Nov", or "· the record starts 7 Oct"); the verdict in 16 px ink 1; label lines Consistency (the day grid + a ledger), Hours, Paying off, Goals, By subject; the ledger's Now/Before columns with a small green up or amber down arrow beside the figure that moved; Hours puts the span before as a grey column beside each slot. Screens 428, 430.
- 2026-11-22 · **Activity colour is green** (his ask: "GitHub-like, not black and white"): `--rc-heat-0..4` in both themes (lighter is more on dark, darker is more on light), used by the day grids; the accent stays for what can be clicked.
- 2026-11-22 · **Home's header, his final** (many rounds; screens 427, 429): a faded, centred day line ("Sun 22 Nov · 33 active days since 23 Aug", 12.5 px ink 3 at 75%); the year as a card (`YearCard`): the last 12 months as calendar blocks spread to fill the card, the weekend set 4 px apart instead of weekday letters, month names under the blocks (this month bold, ink 1), active days in the greens, inactive days a clear grey (ink 10%), days before the record between faded and grey, days to come faint; tint 3.5% ink on the ground, 14 px corners, **no border, no shadow**; the card 16 px wider than the content a side, its top in line with Goals; the buddy's line in a quieter block (1.2%, 8 px wider than the content) with thumbs and Reply at its end (under the words on a phone); 36 px before Today's focus. No Capture button (Ctrl K, the phone's +); settings beside the sidebar toggle; the top bar hidden from 1280. The Goals card takes the same tint (no edge, no shadow); its heading and New goal in ink 3, 4 px above the card, 3 px in.
- 2026-11-22 · **Turned down for Home's header (never propose again):** moving the old strip and grid to the top edge (a, b, c: "forced and ugly"); a full-width banner of the year; mock-ups of a buddy lede with a week ribbon, a week strip with the year one click away, the year down the left margin; header bands (one column, wider than the column, buddy speaking from today's cell: "the worst"); a Notion-style cover with a big date title or a calendar page icon ("takes the focus from the lists"); a header panel holding the day line; buddy pairings panel, speak, thread, quote, inline; card finishes glass, soft, inset, raised; a "Less ▪ More" legend and the date line with Capture over the card; outlined squares for days before the record.
- 2026-11-22 · **With the left sidebar collapsed**, Home's column and the right sidebar move in as one group centred in the window, keeping their 74 px gap (open: the column on the screen's middle, as on 11-21).
- 2026-11-22 · **Revise's session can pause**: a small pause icon while it runs; paused, the label says "paused · 2 s of 25 min", the dashed line stands still, Resume (outlined) and End; paused time isn't counted. Screen 431.
- 2026-11-22 · **Your week reads in points** (his ask): each part with a toned mark (Going well: up trend, green; Slipping: down trend, amber; The one fix: target, in a soft 4% block; Your deadline: flag), its sentences as bullets; the focus lines numbered. Screen 432.
- 2026-11-22 · **Home's buddy block is never empty**: with no line (the buddy off, paused, loading or failed) it shows the Tell row a new account sees. Screen 434.
- 2026-11-22 · **Home's right sidebar reads a step quieter**: its ink 1 becomes `--rc-ink-rail` (#d6d4d0 dark, #454441 light) so the centre keeps the eye. Screen 435.
- 2026-11-22 · **About you in parts, his pick "side"**: What it knows · On my mind · Your work · Settings, one at a time, listed at the left (sticky; Settings opens its five groups under it: Learning, Work log, Your phone, Usage, Your data, each a jump); below 1024 px the same parts as tabs under the title; `?tab=` keeps the part. The other options (the old long page, top tabs at every width) removed on his word. Screens 436-439.
- 2026-11-22 · **Where you stand, his pick "moments"** (the default `/mirror`): the code's summary with "Ask Buddy for an honest take" (the take leads in the buddy's serif once asked, "Buddy's take for today · The plain summary"); the wave in Home's card tint (no border, no shadow, 16 px wider than the content): one figure, the comparison in one line (green up, amber down), a smooth green line with a soft fill, the span before dashed, a ring on the line where a topic or milestone was finished (hovered, it is named under the wave, never over the line); a month's day is the 7-day average, a year starts at the record; then Finished (dated rows, a ring for a topic, a flag for a milestone), Habits (now and before), Goals, By subject in short. The day grid left this page (it is Home's). The other options (wave with one ledger, a little wave per row, the old page with the grid and hours bars) removed on his word, with the old charts (`StandCharts.tsx`) and Home's unused `DayHeader.tsx`. Screens 442-451.
- 2026-11-22 · **Tracking outside Recollect:** Learning settings has a LeetCode row (a username field; Connect, then Import now and Stop; one meta line says when it last ran and how many it logged). A link shared to the app offers "Log it as study/practice time?" with four pills (15 min, 30 min, 45 min, 1 h): on the phone as a plain card above the buddy's box (screen 452), on the web's share page under the card (screen 453). The phone's buddy box takes "log 40m …" like Ctrl K.
- 2026-11-22 night · **Paper on the web** (his ask, colours only): `data-look="paper"` on `<html>` (`app/theme-paper.css` maps the phone's Paper tokens onto `--ui-*` and `--rc-*`); Slate stays the default; chosen in the sidebar's theme menu and /you › Settings › Appearance. **The sidebar final = his pick `day`:** Recollect's mark on top, "Search or capture", the open page in the plain grey selection, This week's seven dots under the menu (no count), you and Settings at the foot. Screens 466-505.
- 2026-11-22 night · **The phone's Look:** a style or colour is tried in the preview and set with Apply (one refresh, not one per tap); each screen has a layout: **Classic** (the words on the picture), **Glass** (one frosted panel: the backdrop blurred in the card, a light tint, a hairline) or **Stack** (a frosted card each). The lock's group sits under the clock and above 74 % of the height (the phone's own footer below); no "Buddy" label on the line (his word); the home picture always shows everything (the widget is optional). His verdict: home Classic "the level of an iPhone"; the lock still under his review. Screens 531-546.
- 2026-11-21 · Home re-ordered by time (the owner: "to see what's due today I have to scroll past the whole weekly plan"; screens 393-394). The centre is the open page, 720 wide, centred in the space left of the rail; cards live only in the rail, which is pinned right and stays in view. Order: the date and the day's line (with "N due today" as a jump link), the buddy's line (its note and Tell open under it), reminders, focus, To revise (an open list, one line a review, no card), Next up, Due today; then under a rule the week: targets, the record line, proposals (two shown, "Show all N"), Look again, From your agent. An empty Focus or This week is one quiet row with no helper line. Turned down by me: Today / This week tabs (a hidden tab gets forgotten).
- 2026-11-21 · Home's rail became a right sidebar (the owner: "more on the right, like ChatGPT's"; screens 395-396): on the window's edge, 380 wide, the full height under the top bar, scrolling on its own with no scrollbar and no dividing line (he turned the line down); a close button at its top right, the same corner opens it again (kept per browser); closed, the day centres in the whole width.
- 2026-11-21 · The sidebar's toggle is ChatGPT's (his ask): one button at the top bar's right end, filled while open; the sidebar slides 380 → 0 in 300 ms (ease-out) and the day glides to its new centre; reduced motion jumps. Screens 397-398.
- 2026-11-21 · The day's column is centred on the screen, not between the two sidebars (his ask): nudged toward the window's middle as far as the space beside it allows (at 1536 with the sidebar open it sits 12 px short of the middle, 40 px from the sidebar); closed or at 1920 it is exactly on the middle, while the sidebar is open; closed, it is centred in the page (the space right of the app's sidebar), easing between the two as the sidebar slides (his follow-up). Screens 399-400.
- 2026-11-21 · The sidebar sits nearer the edge (his ask): 364 wide with 16 px each side (was 380 with 28 px on the right); its cards end in line with the toggle above, and at 1536 the day's column is now exactly on the screen's middle with the sidebar open. Screen 401.
- 2026-11-21 · The day's column narrowed from 720 to 660 (his ask: "slightly more" narrow); still on the screen's middle with the sidebar open and the page's middle with it closed. Screen 402.
- 2026-11-21 · The top of Home settled (his ask: "make the top part better"): the head in two rows, words left and controls right (the date with Capture and settings, centred on the title; the day's line with the week's rhythm under the buttons); "22 waiting" said once, at the foot of To revise; the buddy's line in body type (16 px regular) so the date leads, its thumbs and "more" shown on hover or focus (always on touch); the empty Focus and week rows without their bracketed rules. Screens 403-404.
- 2026-11-21 · Home's top re-ranked (Fable's call on his "use your own judgment: the content should lead"): three distinct voices. The date is a one-line strip in 14 px ("Sat 21 Nov" in medium, the day's line, the rhythm, then a small Capture and settings); the buddy speaks in Literata (the phone world's rule carried to the web: the serif is always the buddy; `components/buddy/voice.ts`, 18 px medium, the note 16 px); "To revise" takes the page's h1 (28-34 px) with the budget on its right and the meter under it, so the list is the first big thing on the screen. Section order unchanged. Screens 405-406.
- 2026-11-21 · **Turned down by him:** the big "To revise" headline (405-406: "why the need of that bulky heading when it's obvious it's a revision list"), and the four shaped mock-ups (hero block, grouped ledger, session panel, numbered set list; `mockups/home/index.html` opts 1-4) plus the tile deck (opt 5): "all flashy". **Built instead (opt 6, "Quiet"):** no headline, no cards in the centre; every block has one 13 px label line (`LabelLine` in home/parts.tsx: the name in medium, its figures, what acts on the right, over a hairline); the budget meter is a 140 px line inside Revise's label; the buddy is a message with a small round initial and a by-line (name, thumbs, Reply); review rows read "subject · late · 8 min" (the review number in the title's tooltip); Next up is one row; Due today's "+N in Tasks" sits in the label; Focus moved to the end of today. Screens 410-411.
- 2026-11-21 · His verdict on the quiet build: "it's good". Three follow-ups built (screens 412-413): Due today sits right under the buddy, before Revise (at most three rows; under seven reviews it was ignored); the buddy's line is a chat message (a filled round initial at the bubble's foot, a soft bubble with its corner toward it, the by-line under); the strip is only the date, the rhythm, Capture and settings (the counts live in the two label lines right below; an empty or finished day still gets its line).
- 2026-11-21 · Rows of Revise and Due today have no ⋯: a click anywhere on the row opens its menu (review: Quiz me on it, Open doc, Move to another day; task: Open details, Move to another day); the checkbox only ticks. Ticking: a line is drawn through the title from the centre out (240 ms); a task then fades and folds away (the tick saved when it has left, a second click keeps it, Undo in the toast); a review moves to the end of the list (framer-motion layout, 420 ms) and rests there at 55 % with its Next stamp. Reduced motion: no movement. Screens 415-416.
- 2026-11-21 · Revise's budget is a session, not a share per review (his ask: "you can't give equal time to each item"): no minutes on the rows; the label says "0 of 7 · 60-min budget" with a small outlined Start; Start sets the clock for the whole list and the same dashed line fills with the time (no timer digits; the label reads "20 min of 60 min", "5 min over" in amber, "done in 42 min" after End or the last tick, which ends it by itself). Kept per day in this browser. Screen 417.
- 2026-11-21 · A note in Revise has no menu and no edit window (his ask): a click opens or closes it; a double-click (on the row or the open text) edits title and text in place (Enter in the title goes to the text, Ctrl Enter saves, Esc leaves it); a calendar icon right after "Note" moves it to another day. A doc's row keeps its click menu (Quiz me on it, Open doc, Move to another day). A finished session offers "Again". Screen 418.
- 2026-11-21 · Docs in Revise follow (his ask): a click on the row opens the doc; the calendar sits in every open row's meta (after the subject; after "Note" for a note); the check of an open doc asks first, Complete or Quiz me on it (a note's check ticks at once; a done row unticks at once). `RcCheck` now passes other props through so it can open a menu. Screen 419.
- 2026-11-21 · Due today matches: a click on a task opens its details, the calendar before its date moves it, the check ticks at once with the strike-and-fold (no menu: a task has no quiz, so a menu would hold only "Complete"). Screen 419.
- 2026-11-21 · Revise rows: no subject dot (his ask), just the subject's name; lateness reads "41d late" in amber, the number in weight, after a short amber fuse that grows with the wait (log scale: a day a stub, a month and more full length); the full "N days late · waiting since" in its tooltip. Screen 420.
- 2026-11-21 · Subject after the title ("Title · DSA", meta ink), the review's place as "1/4" when it has one (screen 421).
- 2026-11-21 · **The task window rethought** (his ask: "from the old app, make it to our standards"): a 600 px side sheet (`rc-sheet rc-task-sheet`) instead of the 860 px centred modal; the head holds only the status (mark + words) and "Created"; the title 22 px; one column of properties (Due, Reminder, Repeat, Priority, Tags, Linked docs), the label quiet and the value the thing to click, "Add a date" / "Remind me" / "Doesn't repeat" when empty, a clear × on hover; Repeat is a property ("Every 2 weeks"); Subtasks and Notes as label lines, the editor straight on the sheet (no box), "Add image" in the Notes label; **closing saves what changed** (no lost edits), a foot appears only while something is unsaved (Save, Ctrl S). Old indigo/emerald/uppercase styling gone. The status and priority pickers moved above the sheet (z 130). Screens 422-423.
- 2026-11-21 · **Today's focus** (his ask): Due today and Focus are one block under the buddy: the tasks due (at most three, "+N in Tasks"); on a day with none, what comes next on each path in their place (plain rows: path mark, "Topic · Subject", "next up · 7 of 9", a click opens the path; no Copy prompt); then the day's focus lines and "Add a focus" last, which makes a focus line for today, never a task. The separate Next up and Focus sections are gone from Home. A focus row's remove × is centred on the row. Screens 424-425.
- 2026-11-21 · **This week and Plan this week merged** (his ask): one "This week" block: the targets, "Add a target", then the proposals (from the weekly review, the coach, the buddy, agents) as rows of the same list with a bulb where a target has its check, text in the second ink, their Add/Do button and × on the right; "Show all N", "Add all"/"Skip this week" and "Last week: …" under them. No separate Suggested section on Home. Screen 426.
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
- 2026-11-14 · **Paths and Next up (SYNC_SPINE_SPEC 1.1, built unattended; the owner judges next).** A subject's path lives in the Docs library, not on a new page: choosing a subject in the rail opens a "Path" view (first in the segmented row, no count; `/docs?subject=<id>` links straight to it; search and sort hide there, because a path has its own order). Rows are the library's 40 px inset pills in course order: a grip on hover (drag with Notion's 3 px blue drop line, the editor's), the place in tabular ink 3 (here the number is information, so it earns its place), a status mark, the title (a link when it has a note; planned in ink 2, skipped in ink 3), the next step in meta under it, and the state in words at the right (done topics show their revision status instead). Marks share one stroke: a dashed circle (planned), a half-filled circle drawn for us (in progress, the only mark in ink), a check (done), a slashed circle (skipped). The row menu changes status, copies the study prompt, writes or opens the note, and moves the row (the keyboard way to reorder). "Add a topic" is an inline row that stays open for the next title. Home gains "Next up" under Focus, in Focus's row rhythm: the mark, the topic, "System Design · topic 7 of 9 · next: …" with the subject's swatch, and a quiet "Copy prompt" (named for what it does; the toast says to paste it into a study chat). Hidden when no path has a next topic. Desktop only so far: under 700 px the state column hides; the phone pass waits, as for the rest of Docs.
- 2026-11-14 · **The record on Home (SYNC_SPINE_SPEC 1.2).** One quiet row under the slip, the way "Your week" sits under the goal card: a timer icon, "Today so far: 45 min study · 2 h build" (else "Last session: Thu · 40 min study"), and "last 14 days" in meta; hidden when nothing was logged. It opens a Sessions sheet: days as small headings with their total, rows in Focus's rhythm (a kind icon: book study, puzzle practice, hammer build, rotate review; the title; "45 min · study · Caching · quiz 7/10 · by study-chat"), edit and remove on hover, editing inline (title and minutes). Nothing ever asks to log. A topic's open weak spots show on its path row as a quiet surface-2 chip ("2 weak spots", a target icon) that opens a float list; not amber: they are information, not an alarm.
- 2026-11-14 · **The week and Suggested on Home (LOOP_COMPLETE_SPEC 1.6, built unattended; the owner judges next).** Home's order is now the day first: the slip, "Today so far", then **Suggested**, Focus, **This week**, Next up, Due today, and "From your agent" last (it folds to one line, "N changes from your agents", over three entries, so the day's work stays on the first screen). *Suggested* is the one place for every proposal: when the weekly review is due it is a card under the slip ("Plan this week", or "Plan next week" on Sunday; last week in one quiet line when there is anything to say), each row with one outlined accept button named for what it does ("Add to week", "Add to today", "Update profile") and an X, and the footer's one dark button "Add all" beside a quiet "Skip this week"; otherwise one quiet row ("2 suggestions · from study-chat") that opens the same list. *This week* copies Focus's rows (check, text you click to edit, row actions on hover: add to today's focus, drop), a meta line for a count ("3 of 10 practice · DSA") or a link (only the kind when the text already names it), "1 of 2 done" in the head, and an "Add a target" line until five. A target done because its topic or milestone is done shows ticked and can't be unticked by hand. Screens: `screens/13`–`17`.
- 2026-11-14 · **Where you stand (LOOP_COMPLETE_SPEC 1.7, built unattended; the owner judges next).** A page (`/mirror`, "Where you stand" in the top bar), opened from the rail under "Your week". One card per goal: the title, "62 days left · due 15 Jan 2027", milestones done, then each linked path: its swatch and name, the status word and the numbers in one meta line ("Ahead · 0.3 a week · needs 0.2 a week · lands Thu 31 Dec"), a 6 px neutral progress bar (ink, not the accent: it is not clickable), "5 of 7 topics" and, when behind, "Smallest fix: 1 more topic a week, or it lands 1 Jun". Hours per week: stacked columns, six weeks, one colour per session kind (dataviz reference slots 1–4, validated on Notion's surfaces in both modes; tokens `--rc-kind-*`), ≤ 24 px columns with a 2 px surface gap between segments and a 4 px rounded top, hairline grid, a legend with totals, a card tooltip beside the hovered column (never over it), and "Show the numbers" (the table the light palette's low-contrast aqua and yellow require). By subject: one row each, the numbers in words and a small quiz-score dot strip. Screens: `screens/18`–`21`.
- 2026-11-14 · **Look again (LOOP_COMPLETE_SPEC 4.2).** A decision whose day has come sits right after the slip, one row each (at most three): the title, then the why in a meta line ("Decided 14 Nov in second_brain because … · you expected: …"), then "Was this right?" with Right · Mixed · Wrong as small outlined buttons and a quiet "Look again in 30 days". A verdict swaps the buttons for one optional line (Enter saves, Skip). No count, no colour for a wrong call: it is a question, not a debt. Screens `screens/23`–`24`. Also: Settings → Agents lists "Add and change your tasks" (screen 22).
- 2026-11-14 · **Search finds the text (LOOP_COMPLETE_SPEC "Search on Postgres full-text").** The library's search box keeps its place and look. Titles and subjects still filter at once; from three characters the text search answers a moment later, and the list turns into best match first. A doc found by its text gets a second line under its title: the block that matched (with the blocks after it while they fit, joined by " · "), in 13/1.45 ink 2, the matched words in ink 1 at 600 (no tint: colour stays for meaning), wrapping, "…" only where the excerpt is cut. On such two-line rows the icon, the meta columns and the row menu line up with the title's line. A title-only match shows no second line. Screens `screens/25`–`26`.
- 2026-11-14 · **The trash and "Do it" (MANAGER_AND_DOCS_PLAN stage 4).** Deleting a doc now moves it to the trash: the row menu says "Move to trash" (no question: a toast with Undo), and only the final steps ask first ("Delete for good", "Empty trash"). The library gets a Trash view at the end of the segmented row (shown only when something is in it): a meta line ("deleted for good 30 days after…"), rows with "Moved 2 h ago · goes 14 Dec", a quiet Restore and a trash icon, and "Empty trash" as an outlined danger button where search and sort usually sit. A doc in the trash opens with one quiet bar across the top (surface 2, ink, a trash icon; Restore outlined, "Delete for good" in danger text): no red band, nothing alarming, as the rest of the app. An action an agent or the manager can only ask for (level 3) shows under Suggested as its own row with "Do it" and X, the words saying exactly what will happen; it is never part of "Add all". Screens `screens/27`–`29`.
- 2026-11-14 · **Ask AI, the page (MANAGER_AND_DOCS_PLAN §3.4, built unattended on a fake model; the owner judges next).** `/ask`, "Ask AI" in the sidebar under Docs (lucide sparkles), and an "Ask" tab in Ctrl K (Enter opens the page and sends; its line says a message costs a few cents). Conversations sit in a 248 px column on the page colour with a hairline, a size smaller than the page: "New chat", then Today / Yesterday / Previous 7 days / Older in 12 px ink 3, 30 px rows that fade at the edge, delete on hover (asks first; what it changed stays). The conversation is a 720 column: his words in a surface-2 bubble on the right (14 radius), the answer as plain text (15/1.6, Markdown drawn by our own renderer: no raw HTML), then a meta line with what it cost ("4.1¢ · 3 steps"). What the manager did comes before its words, one row per tool: a read is a quiet 13 px ink-3 line with an eye ("Looked at your week"); a change is a 14 px ink-2 sentence in the tool's own words with a quiet Undo (after it: "Undone", the row goes ink 3); a failed step says so with an amber mark and words; an action that needs his tap is a card (the card fill, ring and breath of shadow) with a hand, "Waiting for your tap", the exact words of what it will do, and Do it (outlined) / Dismiss (quiet), then "Done" in green with a check. **The one authored moment: a tool row settles in as the manager finishes it** (4 px rise and fade, 220 ms, the date tag's ease); while it works, one quiet "Working…" line with a turning circle. A new chat shows the page heading, one line on what it can do (every change undoable, anything final waits for a tap), the box, the month's spend under it ("$3.20 of $50 this month") and four starters that fill the box (never send). The box is the card with a 14 radius; it grows to about eight lines; Enter sends, Shift+Enter a new line; Send is the one dark button. Under 1100 px the conversations become a panel over the page ("Conversations" button). Screens `screens/30`–`37`.
- 2026-11-15 · **Moving a review, and its timeline (the owner showed the Revise screens: "if you want, something similar").** "Move to another day" (a slip row's menu, and the doc page's timeline) opens one dialog on the float layer (14 radius): the month on the left (Monday first, past days faded and closed, today with a hairline ring, the chosen day in the main fill, the day it is on now marked with a small purple dot: a date the system set), each day carrying a 3 px bar for its reviews' minutes against his daily budget (ink 3; the attention mark past the budget), and a one-line key under the month. On the right, the chosen day in words (20/700) and how far it is ("In 3 days"), one load line ("3 other reviews · about 26 min of your 25 · 1 over", amber with an icon when over), the review being moved on top in the date tag's tint ("moves here"), then what is already there (subject swatch, "review 2 · 5 min", tasks with a check icon), and Cancel / "Move here" (the one dark button). It replaces the old wheel picker for reviews; tasks keep theirs. The doc page's Revision property gains a quiet "Timeline": a popover with reviews 1-4 on a thin rail (done: a green tick on its tint with the day; next: a ringed dot, "Next · Tue 17 Nov" or "N days late" in amber; planned: a dashed circle), "+3 days" gaps in meta, and "Move review N…". Screens `screens/38`-`40`.
- 2026-11-15 · **Sharing, rebuilt (MANAGER_AND_DOCS_PLAN §2; built unattended, the owner judges next).** One **Share popover** under the top bar's Share button (420 px, the float layer, 12 radius, sections split by hairlines, a size more compact than the page): the invite field holds the address and its role picker ("Can edit ▾") with the one dark button "Invite" beside it and one meta line under it (the reason in danger text when an address has no account); "Asking to edit" on top when someone asks (avatar, name over "email · 2 h ago", quiet Decline, outlined Allow); "People with access" (the owner's row says Owner in ink 3; each person's role is a quiet picker whose menu shows the two roles with a one-line hint, a check on the current one, and Remove in danger text; someone on the doc sees the list and can leave from their own row); then "Publish to the web" (a globe, the words, the switch; when on, the link in a read-only field, "Copy link" outlined and an open icon). Avatars are the sidebar's 24 px rounded squares. The owner's Share button carries a **neutral** count while someone asks (the accent fill never carries text). The library's view is now "Shared", with a quiet globe or people icon after a title (a tooltip says it in words). **The public page** (`/p/<slug>`): the app's 44 px bar in the page colour (the mark and "Recollect" on the left; "Ask to edit" outlined, "Asked to edit" with a green check, or "Open in Recollect" as the one dark button on the right), then the doc column exactly as the doc page draws it (title 40/700, "By … · updated …" in meta over a hairline), read-only. Screens 63-88, 92.
- 2026-11-15 · **Table handles** on the new editor: a small raised grip (the float fill, a hairline ring) on the hovered row's left edge and column's top edge, a menu like the block menu (Insert above/below or left/right, Header row/column on the first, Delete in danger text), and a quiet "+" strip under and beside the table that fills on hover. Tables draw hairline cells with a surface-2 header. **Code blocks** take the old editor's look (surface 2, ink, mono). Screens 93-94.
- 2026-11-15 · **The bell's list on theme v2** (it carries sharing requests now): the float layer (380 px, 12 radius), "Notifications" in 15/600 with quiet refresh and mark-all icons, the views as the segmented row (All · Unread · To answer), rows like the app's lists (a 24 px rounded-square avatar or the type's icon in the icon grey, the title in ink 1 while unread, the message and the time in meta, a small blue dot for unread), a row that opens something fills on hover; answered ones say "Accepted" (green, with a check) or "Declined" in words, no all-caps badges; Accept outlined, Decline quiet. Screens 95-96.
- 2026-11-15 · **Ask AI inside a doc (DOCS_EDITOR_V2_PLAN phase 5; built unattended on the fake model, the owner judges next).** Three ways in: **Ctrl+J**, **"Ask AI" first in the selection bar** (the sparkles mark and the words, a hairline before the marks), and **/ai** (first in the slash menu, its own "AI" group, "Ctrl+J" as the hint). One **box** on the float layer (12 radius, the float shadow), as wide as the text column, under the block he is in or the blocks he selected (on an empty line it takes the line itself, as Notion's does); it floats over what follows, like a menu. Inside: the sparkles mark in the icon grey, one line that grows to about seven ("Ask AI to write, edit or explain…"; with a selection "…to edit or explain this…"), and a 28 px send button in the main fill (grey and still while empty). Under it, while the line is empty, **starters** in the slash menu's rows and labels, chosen by where he is: a selection gets *Edit* (Improve writing, Fix spelling and grammar, Make shorter, Simplify) and *Ask* (Explain this); an empty line gets *Write* (Continue writing, Write a section on…, Add a diagram of…, Add recall questions) and *Ask* (Summarise this doc, What is missing here?); a line with words gets a mix; "…" starters fill the line for him to finish instead of sending. While it works the line gives way to one quiet "Writing…" with the turning circle, and each change shows as a row as it lands. When it is done the box says what he asked (13 px ink 3), the AI's own line, and a meta line ("1 change · 1.2¢"), then **Undo · Try again** (quiet) and **Keep** (the one dark button); an answer to a question shows in full (scrolls past about 320 px) with **Copy** (quiet) and **Insert below** (dark), and nothing in the doc changes. Enter on the empty follow-up line does what the dark button says; Esc closes and puts the cursor back; a click outside closes (never while it writes). Undo takes every change of that ask back and puts his words back in the line to try again. The selected blocks keep the selection tint (12 %) while the box is open; the block handle stays away. **The one authored moment: what the AI wrote takes the selection tint (24 %) and lets it go over 1.6 s**, as it lands (not with reduced motion). On a phone the box and its starters scroll clear of the bottom tab bar. Screens 103-117 (light, dark, 390).
- 2026-11-15 · **An app's sign-in (ALWAYS_ON_SPEC 6.5; built unattended, the owner judges next).** `/oauth/consent` is one quiet column on the page colour (460 px, 14 vh from the top), Notion's consent pattern in our tokens: the app's mark (32 px), "Allow **Claude** to use Recollect?" at 26/700 (24 on a phone), "Signed in as … · email" in meta, "It will be able to" (13/600 ink 2) over a plain list with grey checks in **the same words as Settings → Agents** (one name for one thing), one surface-2 note (10 radius, an undo icon: every change shows under Home → From your agent and can be undone; end it in Settings → Agents), "Allow sends you back to **claude.ai**" (the redirect's host, as the MCP spec asks), then Deny (outlined) and Allow (the one dark button), stacked full width on a phone with Allow first. An expired or broken request says so in plain words with an attention mark and "Go to Recollect". In Settings → Agents a connection reads "Signed in from the app" instead of its token's start. Screens 120-122.
- 2026-11-15 · **Colour in the format bar** (the new editor): a Color button at the bar's end (lucide "baseline", lit while the words carry a colour) opens a 220 px menu in the slash menu's rows: "Text color" (Default, Gray, Brown, Orange, Yellow, Green, Blue, Pink, Red, each with an "A" in its colour on a hairline swatch) and "Background" (the same, as tinted swatches), a check on the current one, scrolling past 360 px. **Notion's colour families** replace BlockNote's old light-only palette: coloured text is the family's saturated step in both themes, a background its tag step in light and its dark tag step in dark (text on it stays ink). **No purple to pick:** purple is the date the system sets (as on the canvas); a purple already in a doc still shows. A background prints as `==…==` for agents; text colour is not carried by Markdown. Screens 123-125.
- 2026-11-15 · **Ask AI's words as they come, and Stop** (the box in a doc and /ask): while it works, one line stays put under what he asked: the turning circle, "Writing…" (or "Working…" on /ask; "Stopping…" once pressed) and a quiet **Stop** with a filled square at the line's end; the answer's words appear under that line as they arrive, in the answer's own type, so nothing jumps under his pointer. Esc stops it too. A stopped answer ends with one plain line ("Stopped. What was done before you stopped stays, and each change can be undone.") and, with nothing changed, offers Close (quiet) and Try again (outlined). Screens 137-139.
- 2026-11-15 · **The block handle on a phone** (no hover, no gutter): while he edits on a touch screen, one bar sits on the keyboard (48 px, the float surface, a hairline above; the bottom tab bar steps aside): the block's kind in words with a chevron ("Text ▾", 14/500 ink 1), a hairline, then Move up, Move down, Indent, Outdent (20 px icons in ink 2, 44 px targets, Indent/Outdent faded when they can't act) and "⋯" at the far right. The kind and "⋯" open a sheet that rises from the bar (14 radius, the float shadow, 44 px rows in the slash menu's words and icons; the current kind tinted; Delete in danger text). Nothing takes the focus, so the keyboard never drops. Screens 132-136 (emulated and his real phone).
- 2026-11-15 · **Headings 4 and toggle headings**: Heading 4 (18/600) joins the slash menu and Turn into (Notion's menu has 1–4); H5 (16/600) and H6 (15/600, ink 2) come only from agents' Markdown. Toggle headings 1–3 fold what follows; their triangle sits on the heading's line, and a new toggle starts open, as in Notion. Screen 131.
- 2026-11-15 · **The code block's bar and colours on the new editor**: the old editor's look again (surface 2, radius 8, mono 13.5/1.6) with its quiet bar: the language in words with a small chevron (12.5 px ink 3, a hover fill) opening the app's searchable picker (220 px, "Search languages"), and Copy at the right, shown on hover ("Copied" with a check for 1.4 s). Code takes GitHub's light or dark palette by the theme, not BlockNote's black box; the light comment grey is one step darker (#59636e) so it reads at 5.5:1. On the public page the language is plain text (no picker). Screens 128-130.
- 2026-11-15 · **"Turn into" in the selection bar** (Notion's first control): after Ask AI and a hairline, the selected block's kind in words with a small chevron ("Text ▾", 14 px ink 2); it opens the grip menu's Turn into list (Text, Heading 1-3, Bulleted, Numbered, To-do, Toggle, Quote) under it with a check on the current kind; it turns every selected block. Screens 126-127.
- 2026-11-15 · **Settings → Phone app** (the web side of the Android app): the addresses as a radio list (the public one, this computer on the same Wi-Fi or hotspot, USB), "Make the connect code" (the main button), then the QR (plain SVG on the surface) beside the steps and a quiet "Copy the link". The QR holds a web link to the server's own small connect page (any camera opens a web link), which hands off to the app with one tap or offers the app's file; that page uses the theme's tokens, light and dark by the phone.
- 2026-11-15 · **The Android app "Your day"** (one native screen, the platform's Material theme on theme v2's tokens, light and dark by the phone): the page heading 28/700, a card with the picture as it is now (84 × 182 dp, radius 8, a hairline ring) beside the date, the headline (17/500) and its lines, "Updated 6:35 pm" and an outlined Refresh now; rows are inset pills with the web app's switch (34 × 20, blue when on, a 14 dp white knob); Theme as a soft segmented row (the chosen one dark); quiet hours as two time chips; problems in words with an amber icon on its tint, never red. Dialog buttons in sentence case. Its launcher icon is the mark in white on ink, so it reads apart from the web app's (ink on white) and its name matches the widget, "Your day". The widget: the theme's surface with a hairline ring, radius 14, the date (13, ink 3), the headline (17/500), up to three lines (14, ink 2) fading at the edge instead of "…", centred in its height; 4 × 1 shows the date and headline.
- 2026-11-15 · **The wallpaper, "the sky of your day"** (the owner: the plain white/black picture was boring; "make something of good quality"): the light follows the day's state: dawn (plum to apricot, the sun rising behind the hills), daylight (teal and a warm sun), dusk (indigo to ember, the sun setting), done (a starry night with a crescent moon: the reward, nothing to do on it), a light day (sage mist). Soft colour fields, three hills with depth, fine film grain (it also stops banding). The words sit in a calm band (34–74 % of the height, clear of the clock above and the fingerprint and shortcuts below): a tag with the state ("Evening") and the date, the headline in Inter 600 as large as fits in three balanced lines, up to three lines in 400, then the last seven days as dots with their weekday letters (filled: studied; today ringed). Light and dark are two sets of palettes, not an inverted image. A deliberate exception to the craft floor's "no glows or gradient washes": that rule is for the app's chrome; a wallpaper is a picture. Considered: a life-calendar dot grid (popular "life in weeks" wallpapers) kept only as the 7-day row; contour lines; a serif headline (the "AI look" risk).
- 2026-11-15 · **Small backlog fixes, evening:** a doc's Subject list ends with "Remove from subject" (an × icon) and a study path topic's menu ends with "Remove from path" (red, after a hairline); both ask first in the standard confirm when something goes with it ("Its revisions end with it… The doc itself stays."). Ask AI: under an answer whose change was undone or action dismissed, one ink-2 meta line, "Since then, you undid the change." (its words may still say "tap Do it"). Ctrl K's mode pills behave as tabs (Left/Right, Home/End; the focus stays on them) and the plan pills as a radio group. The phone's subject chips fade at both ends where they run on. The goal meter's steady-pace tick now shows (the server sends the goal's start day). The task windows' dead "…" buttons are gone.
- 2026-11-15 · **Ctrl K → Find finds saved notes and links too**: after the quick notes, a quiet group "Saved notes and links" (12/500 ink 3) lists the captures that hold every word (the inbox and the ones being revised, searched on the server from two characters, five at most): a link or note icon, the title, the address or the note's next line in meta. Enter copies (a link's address); a link also has a quiet **Open** button (Ctrl+Enter). All notes › Inbox now lists the whole inbox, not only the newest ten. Screens 184-187.
- 2026-11-15 · **Where you stand: the hovered week reads out in the card**, not in a floating card: the header's meta becomes "**Week of 9 Nov** · 5 h 31 min logged · 2 of 3 week targets" and the legend's numbers become that week's (in ink 1, "–" for none). The floating card was taller than the plot, so beside the last columns it hid a whole week's column. Every variant sits in one grid cell, so the chart never moves as the words change length. Screens 188-190.
- 2026-11-15 · **Settings → Profile on theme v2**: the photo as a 64 px rounded square (surface 2, initials in ink 2) with a quiet "Add a photo"; the name typed straight into its field (saved on Enter or leaving it; Esc puts it back); the account in the Agents tab's rows: Email, Password ("Change password" opens a dialog that emails a 4-digit code, four boxes that verify by themselves, then the new password twice), Morning email (where the morning email goes; a code to the new address first). Log out asks in the app's confirm, in ink 2, not red. The header lost its 11 px "Account" eyebrow; the dialog fades in (no spring). On a phone the tabs become a row (they had no way to switch before) and Log out sits under Profile. Screens 191-193.
- 2026-11-15 · **The Tasks page on theme v2**: the heading "Tasks" (rc-h1) and one line in words ("5 open · 2 late"), in place of the serif greeting, the big clock and the "17% efficiency" band. The views as the segmented row with counts (Inbox · Today · From docs · Done), sort as a quiet button, list/table as icon toggles. Rows are inset pills without dividers: a status mark drawn for us (an empty ring; half-filled in ink for in progress; the attention mark with a dot for in review; a slashed danger ring for blocked; the accent fill with a white tick for done), the title wrapping, and at the end the date in words ("Today, 5 pm", "Tue 17 Nov"; late in the attention ink with a clock: "2 hr late", never red), a neutral tag only for a status other than To do, and the priority as signal bars with its word (urgent in the attention ink). On a phone the date, status and priority become the meta line under the title (titles were invisible there before). The status picker and the table use the same marks and words (sentence case, no all caps). Screens 194-196.
- 2026-11-15 · **A doc's tasks**: a "Tasks" property row ("1 open · 1 done", or "Add a task") opens a popover in the timeline's rhythm: the doc's own tasks with a tick each (done ones struck through), the due date in words, one line to add a task linked to this doc, and "All tasks". **The library's "From agents" view**: the docs an agent wrote or changed (changes still standing, not undone), shown only when there are some. Screens 197-199.
- 2026-11-15 · **The phone's two pictures** (the owner: "make it useful; the lock screen very different from the home screen, centred"). **Lock: the dial of the day**: one centred composition in the calm band between the clock and the fingerprint, on the open sky (no horizon): a ring made of today's things (each review, focus line and task due a segment, done ones lit and first, so the light grows clockwise from the top), what is left inside it (a big number, "left today", "about 21 min"; a tick and "Done for today"; "A free day"), the counts as tiny icons (a book for reviews, a target for focus, a checked box for tasks: "1 of 3"), the next step ("Next · DP: 0/1 knapsack · 8 min"), and the goal with a flag, whole in up to two lines, "182 days left · 1 of 6 milestones" and a thin bar. **Home: the sky of the day and its list**: the landscape stays; the words become the day's line ("3 left today · about 8 min") and up to five rows with an icon per kind (a tick once done, the title struck through), the meta at the right ("8 min", "6:30 pm"), "+ 2 more", then the week's dots. Hide titles turns every title into plain words. The app asks for each screen's picture on its own.
- 2026-11-15 · **Ask AI's conversations live in the main sidebar** (the owner: "like Notion does"): the sidebar's lower section has two quiet tabs, **Recent · Chats** (12/500; the chosen one on the selected fill), Chats while in Ask AI and Recent elsewhere, the other one a click away (it holds until he navigates). Chats: "New chat" (a square-pen icon; filled while the new chat is open), then the conversations by day (Today, Yesterday, Previous 7 days, Older) in the sidebar's 30 px rows, fading at the edge, the open one on the selected fill, a trash icon on hover (always shown on a phone) that asks first in the app's confirm. The Ask AI page lost its own 248 px column and its narrow "Conversations" bar: the conversation's column is centred in the whole page. On a phone the chats are in the menu's drawer. Screens 200-202.
- 2026-11-16 · **About you** (`/you`, the buddy's memory, BUDDY_MEMORY_PLAN B1; job: see everything Recollect knows about him and fix any of it in one place): the page heading and one line ("What your buddy knows, from your chats and your own words. Only you see this, and you can change any of it."), "Add a memory" as the one main button; the portrait (three short paragraphs: who you are, where you're heading, right now) in a card once the nightly step writes it; the views as the segmented row with counts (**Lasting** · **Right now** · **Older**) and search on the same row (full width under it on a phone); groups by kind in words (Who you are, What you like, Where you're heading, Ideas · On your mind, Open threads, Patterns, Wins); rows are inset pills without dividers: the text (15, ink 1), then meta in words (Pinned · Private with a small lock · the kind · where it came from, "from study-chat", "you wrote it" · seen N times · last 16 Nov); on hover a pin and a ⋯ menu (Edit in place: Enter saves, Esc puts it back; Make it private / open; Keep for good / Only for now; No longer true; This is wrong; Forget for good, red, after a hairline, with the standard confirm that names what goes). Older says why (Faded, No longer true: <reason>, Marked wrong) and offers Put it back. The Add sheet: a text field, the kinds as small chips (the chosen one dark, like the segmented row), a Private switch with what it means. At the foot, under a hairline, "How your buddy learns": the Learn from my chats switch (off = paused, with a calm notice at the top and "Turn learning on") and Export everything (a JSON file). Reached from Home's rail ("About you · what your buddy knows", under Where you stand) and named in the top bar. Screens 203–211.
- 2026-11-16 · **The buddy on Home and on the phone** (BUDDY_MEMORY_PLAN B3–B4): Home's "From your buddy" section after Suggested: a card with the line for now (17/500, ink 1) and small thumb buttons ("More like this" / "Not this", the chosen one on the selected fill), the night's note under a hairline (15, ink 2) with its own thumbs, and one line "Tell your buddy something…" with a quiet Tell; "What it knows" at the section's right goes to /you; hidden while the buddy is off or paused. /you gains "Think about my day each night" (a switch, about 4 cents a night) with a quiet "Think now", and "This month" (spend of its cap, messages read and kept, notes waiting for tonight); the Lasting groups are "Facts and values", "What you like", "Aims and decisions", "Ideas" (the portrait card owns "Who you are" and "Where you're heading"). **The phone's pictures, after his verdict (no list on a phone):** the lock picture's main words are the buddy's line, centred and as large as fits in three balanced lines, a thin arc of the day above it (or no mark: his pick), the day in numbers with tiny icons and the goal's days under it, small; without a line, the day in plain words; the home picture keeps its sky and hills with the day in numbers and the week's dots. Screens 212–216.
- 2026-11-16 · **The phone app 0.3.0** ("Your day"): the screen leads with **From your buddy**, a card in the web card's shape: the line for now (17/500, ink 1) with two 40 dp thumb buttons (Lucide's thumbs; outline, the given one filled on the selected fill), the night's note under a hairline (15, ink 2) with its own thumbs, then "Tell your buddy something…" in the app's field (a 1 dp ring, the accent ring while typing) beside the main button **Tell** (the keyboard closes once sent); **Lately**: the lines said before, each a meta ("Yesterday evening") over the line in body type. The day card says the day in numbers, no list. **Style**: the server's styles as 72×156 dp pictures of the lock screen (a hairline ring, the accent ring once chosen, the name under each), then the chosen style's colours as 30 dp round swatches (the chosen one ringed) and one meta line. **Notes from your buddy**: one switch and its meta line. The widget (4×2): the date, the buddy's line (or the day's own line), the day in numbers with two 36 dp thumbs at its right; 4×1: the date and the line. Screens 220–226.
- 2026-11-16 · **The lock picture: the full ring** (the owner: "a whole circle like at first; a half might look broken"): the ring of the day over the buddy's line, what is left inside it; without a line, the first dial. **The styles, dark only** (the owner: most of a first set of nine were poor; "take references; I prefer the darker ones"): **Glow** (one grainy light rising from below the screen), **Peaks** (a night landscape: five ridges, stars, a crescent), **Orb** (a glass sphere in an upper corner), **Dots** (a dot-matrix screen on black, a dotted ring, one accent), **Flow** (a silk ribbon of 42 thin lines), with **Aurora** and **Mono** kept; **Sky** stays the default. A style draws only its backdrop, its inks and its ring; the words keep one layout in the calm band. Screens 227–230.
- 2026-11-16 · **About you › How well it knows you** gains two meta lines under its 30-day line: the memories by age ("By age: 3 from this month, 0 from the two before, 0 older") and one line per recent month with anything in it ("November 2026: 2 more like this, 1 not this, 4 thrown out, $0.24"). Screens 231–233.
- 2026-11-16 · **The phone pictures' type system (B8)**: three sizes of words (quiet 0.031 of the width, secondary 0.039, the buddy's line 0.06 down to 0.05) and the numerals (0.105 in the lock ring, 0.15 in the dial, 0.165 on home); Medium for the line on plain grounds, SemiBold on busy backdrops and for numerals, Regular for quiet words; tracking −3.5 % on numerals, −1.5 % on the line, +10 % on the one-word capitals ("LEFT") and the home picture's date; gaps of 3, 5 and 8 units of 1 % of the width. The lock picture: the ring, the line, one row of the day in words (the icons gone), the goal's days. The home picture: the date, the day's numeral with "left today" and the time beside it, the week's dots; drawn for the phone's 1.1 zoom. Screens 234–239.
- 2026-11-16 · **About you › Your work** (B9): under "Your months", while the work log is on: a heading with its own search, one line of what it is, then the last 7 days ("Today", "Yesterday", "Sat 14 Nov"), each project with its time ("erp · 1 h 35 min · work folder") and its lines as rows ("Decided:", "Stuck on:", "Next:" in the second ink before the words), each with a quiet × to remove it (a toast says it won't be written again). Empty: one calm line on where it comes from. The switch "Keep a log of what I work on" sits under "How your buddy learns". Checked in light, dark and at 390, a line removed at person speed (screens 240–242).
- 2026-11-16 · **The phone app 0.4.0's look** (the owner: "it should always feel like a product"): Inter as on the pictures; its own tokens (near-black page #0E0E10 and cards #17171A in dark, paper #F5F4F1 and white cards in light, one indigo accent #7B85FF / #5866EE for what is on or chosen); type 30 / 21 / 19 / 16 / 15 / 13; cards of 22 dp with a hairline; settings as grouped rows inside cards; pill buttons; round thumbs; a pill input with a round send button. The live lock screen draws the notifications' small icons in a band under the picture's words, in the picture's own ink.
- 2026-11-16 · **The home picture's reminders** (the owner: "show my reminders on the home screen; none, and it stays clean"): today's reminders still to come, under the day's number: a bell, the time in SemiBold, the words in Regular, one row each in the secondary size, the words in one column after the widest time, three at most, cut with an ellipsis; with titles hidden, "A reminder". None: the picture is exactly as before.
- 2026-11-16 · **The home picture's thought** (the owner: "the home screen should only list important things: reminders, or a suggestion or an insight from the buddy; the lock screen holds the line, so don't repeat it"): under the reminders (5 units after them, or the reminders' own 7 after the day's number when there are none), the buddy's one thought for the day: a message mark (lucide's message-circle, the bell's size and ink) in the reminders' icon column, then the words in Regular at the secondary size in the head ink, wrapped in up to three balanced lines (line height 1.42; the quiet size only when three won't hold them). None: the picture is exactly as before. A silent hour on the lock picture is the dial of the day. Screen 243.
- 2026-11-16 · **About you › Your work: the time a line took** (B10: office chats log their day with `/log-work`): a line an agent logged with its time shows the span before its words ("10:15–11:40", the second ink, tabular figures, half an em after it); lines written from his captured words have none.
- 2026-11-18 · **The phone world** (PHONE_APP_REDESIGN_PLAN §7 step 2; the owner's picks 11-18: Paper, type A, Library, "Buds"): the routes `/m/today`, `/m/buddy`, `/m/library`, `/m/you`, `/m/settings`, `/m/look` are a world of their own, apart from theme v2. Its CSS is the mock-up's (`mockups/phone-app/tokens.css` + `app.css`) ported as `app/(phone)/m/phone.css`, every selector under `.pw`; the mock-up stays the source: change it there, then port again (`port-phone-css.py`). The look (Paper or Slate; light, dark or the system's) is kept per device and set on `<html>` (`data-pw-theme`, `data-pw-mode`) by a script before the first paint, so no frame shows the wrong one. Type: Literata for whatever the buddy says, Figtree for the person and the app, self-hosted with next/font (SIL OFL 1.1, the licences in `app/(phone)/_fonts`). The bottom bar (Today, Buds, Library, You) stays across screens; Settings and Look are reached from Today and You. Screens 278-281 (Look and Today in Paper light and dark, Settings in Slate dark, Look in Slate light). Today, You, the chat and Library fill in steps 3 and 4.
- 2026-11-18 · **The phone world: Today and You on real data** (step 3, the owner's word after step 2). Today: the dial over the day's list, the buddy's card (its question with the quick answers, or its line with thumbs), Tell, ticks that move the dial, today's reminders, the threads it keeps an eye on. You: three panes (On its mind, Memories, Hears) and a thread's sheet (history newest first, then its controls). With no name of its own the buddy is "Your buddy" heading a card and "your buddy" inside a sentence, its mark a "B". Screens 282-291.
- 2026-11-18 · **The phone world: Settings, Library, Buds, and Compare with design (QA only)** (step 4). Settings carries the buddy: its name, its voice, "May ask me questions", and "Use AI" with the month's spend. Library: search by title, what is due today with its review words, and recent docs; a doc opens in the web's doc page. Buds: the latest chat goes on, and the pen starts a new one. The buddy's words are in the serif and the person's in a tinted bubble. Each answer streams, and what it did shows as a receipt with Undo. Send and Stop keep the field focused, so the tab bar never jumps under the tap. QA only: a "Design" tab on the left edge lays the approved mock-up of the same screen over the app, at the same size and in the same look; on a desktop, `/qa/compare` puts them side by side. Screens 292-299.
- 2026-11-18 · **The phone world inside the phone app** (step 5, the shell).
  - **Settings:** This phone shows Connected, when it last read the day, and Refresh, or else Connect. More on this phone opens the old screen (the widget, notification icons, the pictures' theme). Quiet hours and Notifications are sheets, with Android's own clock for the times. Disconnect sits behind a question. The app's version is at the end.
  - **Look:** the lock screen shows today's real picture in the chosen style, with the phone's clock over it. The styles are chips and the style's colours are dots (a 22 px dot in a 34 px target; drawn in the mock-up first). On your screens has the app's real switches: the day on the lock screen, the day on the home screen, and hide personal details.
  - **Sheets** cover the tab bar too, as in the mock-up.
  - **The chat:** the mic (Android's recognizer) sits in the field. The field fits words that arrive without typing, and a real answer keeps its line breaks.
  - **The frame:** the system bars take the look's ground. Back closes a sheet first; a tab goes to Today; Today leaves the app; anywhere else, Back goes one page back.
  - Screens 300-309.
- 2026-11-18 · **Moving around the phone world** (the owner's ask: "a short, subtle transition when I switch tabs, open a page or go back; the bottom bar steady; quick taps responsive"; drawn in the mock-up first).
  - **Enter only:** the new screen is there at once and settles in; nothing waits for the old one to leave.
  - **The three ways in:** a tab fades in from 40 % with a 4 px rise (160 ms); a deeper page (Settings, Look) comes in from 24 px to the right (220 ms); going back comes in from the left (200 ms). All use the design's ease, `cubic-bezier(.2,.9,.25,1)`.
  - **The tab bar never moves.** The tapped tab lights on the next frame, before the route arrives. Quick taps end on the last tab with one screen.
  - **Nothing flashes:** a screen you come back to opens with what it showed last (kept in memory for the visit, per account) while it reads the fresh data, so a switch never shows a skeleton or jumps when the data lands.
  - **Reduced motion:** every move is instant.
