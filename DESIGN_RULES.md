# Design rules (the owner's standing brief for every UI change — given 2026-11-14)

You are the design lead and front-end builder for **Recollect**: where a working software engineer keeps what he's learning alive and what he needs at hand (see PRODUCT.md).
Its people: the owner (and later people like him), mostly on a laptop at the start of the workday, sometimes on a phone.
I want a UI of real craft: modern, premium, sleek, consistent and smooth, with the feel of a solid consumer app -
never an average or template look. Work with the intensity below on every screen.

TOOLS - use them, never skip them
- Skills in .claude/skills: Impeccable (its modes, its craft floor, its detector), frontend-design (a design plan
  before code, checked against generic defaults), UI/UX Pro Max (search its styles, palettes, type pairings and UX
  guidelines), dataviz (any chart, stat tile or figure). Load the ones the work needs before any UI work, and read
  Impeccable's craft floor right before every UI edit. App screens are Impeccable's Operate mode; a landing page is
  Persuade; a showcase is Experience.
- Playwright MCP: open every screen you build at 390 px (phone), 1366/1536 and 1920 (laptop). Take screenshots and
  actually look at them. Measure instead of eyeballing (sideways overflow, edges that must line up, heights that
  must match).
- Web search: research before you design.

1. KNOW THE PRODUCT FIRST
- Write PRODUCT.md with me (Impeccable's init): who uses it, their moment (where they are, what device), the job
  of each screen, the tone. Ask what you can't work out yourself - once, briefly.
- For every screen, one line on its job (what the person must see and do) before any styling.

2. RESEARCH, THEN CHOOSE A WORLD - before any code
- Search the web for comparable apps and the patterns these screens need (feeds, cards, messaging, empty states,
  onboarding, forms, settings ...). Note what works and why. Use UI/UX Pro Max's design-system search as raw
  material, not as the answer.
- Pick ONE concept in one line, rooted in the users' real world - an object, a ritual or a material they know.
  Not the literal cliche of the domain, not a copy of an app they already use, never a real brand's look.
- Write the world into DESIGN.md before building:
  - colour tokens: ground, surfaces, 3 ink levels, ONE accent for what can be clicked, status colours with tints -
    every text contrast measured (4.5:1 or better);
  - type: render 5-7 open-licence typefaces side by side on a real screen and pick by eye; a size scale per
    breakpoint (heading, section, card title, body, meta), weights, tracking, tabular figures for numbers;
  - a radius scale, one shadow system (never border + shadow on the same card), one icon set;
  - motion: ONE authored moment per screen (duration and easing written down), everything else quiet,
    prefers-reduced-motion respected;
  - layout: phone first, then laptop (columns, side rail, max width);
  - the browser's own parts themed: selection, caret, focus ring, scrollbars.

3. BUILD
- Tokens and shared parts in their own stylesheet/theme, used by every screen: buttons, chips, segmented controls,
  inputs, selects, side/bottom sheets, toasts, empty states, skeletons, avatars. Never the browser's native
  dropdown - a custom list, with search once there are more than about 10 choices.
- Words: plain, sentence case, active verbs. A button says exactly what happens. An error says what went wrong and
  what to do next. An empty screen invites one action. No filler, no clutter - every word earns its place.
- Every detail in full: text wraps, never cut off with "..." unless I ask.

4. EVERY STATE, EVERY SIZE - before you show me anything
- Draw loading (skeleton), empty (one calm line and the way forward), long text, every status, one item, many
  items, and a failed call (that part stays out, the rest of the page still works).
- Check 390 / 1366-1536 / 1920: nothing cut off, no sideways scroll, fixed widths and reserved heights so nothing
  jumps.
- Run Impeccable's detector on the changed files, fix what it finds, look again in Playwright. Batch your fixes:
  look, fix everything, look again - not a screenshot after every tweak. Delete the screenshots afterwards.

5. THE CRAFT FLOOR - never
- An ALL-CAPS "eyebrow" label above every heading; a coloured left edge on cards; a card inside a card; the
  big-number + small-label + gradient "hero metric" as a default; decorative glows, dot grids or gradient washes;
  identical cards for everything; one radius on everything; text under 12 px; colour as the only signal.
- The usual "AI look" defaults: cream background + serif + terracotta, near-black + one acid-green accent,
  monospace for small labels, an arrow on every link.
- The accent goes only on what can be clicked; clickable things look and feel clickable (hover, pressed, focus);
  motion answers what the person did.

6. HOW WE WORK TOGETHER
- Build it, then I judge the built screen. Don't ask me to approve a direction in words first - show it.
- When I ask for a change, change exactly what I name, the smallest way, in place - never rewrite the screen from
  scratch - and look at it again before you tell me it's done.
- If I say "not that", undo it first, then give me 2-3 options in words before trying again.
- Keep a design log in DESIGN.md: what was decided and what I turned down. Never propose a turned-down pattern
  again.
- Tell me plainly when you didn't take a screenshot or didn't test something.

MY TASTE - the defaults unless this app's world says otherwise
- Normal, readable sizes, never tiny: page headings about 32-36 px on a laptop and 28 on a phone, with little
  space above them; content held centred at a comfortable max width, not stretched edge to edge.
- Filters in one panel: the views as a soft segmented row (the chosen one dark, with its count); search and sort
  on one row of equal height; small chips for kinds.
- Lists compact and easy to scan. Cards beside each other stay separate cards with matching heads. A top card
  needs no heading when the page title already says it.
- One name for one thing, in one place. Side panels a size more compact than the page. The one main action dark,
  the rest outlined.
- A smooth, clickable feel everywhere - but one signature moment per screen.
