r"""PHONE_APP_REDESIGN_PLAN §7 step 2: the mock-up's tokens.css + app.css ported into the web app as phone.css,
scoped under .pw (the phone world's root): every selector prefixed, :root → .pw, the review page and the device
chrome dropped, the type pairings other than A dropped, keyframes renamed, the fonts through next/font variables."""
#   python scripts/port-phone-css.py        (from recollect/; reads ../mockups/phone-app, writes app/(phone)/m/phone.css)
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MOCK = os.path.join(HERE, '..', '..', 'mockups', 'phone-app') + os.sep
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'app', '(phone)', 'm', 'phone.css')

tokens = io.open(MOCK + 'tokens.css', encoding='utf-8').read()
app = io.open(MOCK + 'app.css', encoding='utf-8').read()

# ── tokens ──
tokens = re.sub(r'/\* ---------- The pairings to compare.*', '', tokens, flags=re.S).rstrip() + '\n'
# The look sits on <html> (data-pw-theme, data-pw-mode), set by a script before the first paint: no frame shows the wrong one.
tokens = tokens.replace(':root, :root[data-theme="paper"][data-mode="light"] {', '.pw, html[data-pw-theme="paper"][data-pw-mode="light"] .pw {')
tokens = re.sub(r':root\[data-theme="(\w+)"\]\[data-mode="(\w+)"\] \{', r'html[data-pw-theme="\1"][data-pw-mode="\2"] .pw {', tokens)
tokens = tokens.replace(':root {', '.pw {', 1)
tokens = tokens.replace('--serif: "Literata", Georgia, serif;', '--serif: var(--pw-serif), "Literata", Georgia, serif;')
tokens = tokens.replace('--sans: "Figtree", system-ui, sans-serif;', '--sans: var(--pw-sans), "Figtree", system-ui, sans-serif;')
tokens = tokens.replace('The pairing is chosen by data-type on <html>; A is the recommended one.', 'Type A (his pick, 11-18): Literata for the buddy, Figtree for him and the app, self-hosted (next/font).')
assert ':root' not in tokens, 'a :root left in tokens'

# ── the parts: drop what belongs to the review page and the device around the mock-up ──
app = re.sub(r'/\* ---------- the review page around the phone.*?(?=/\* ---------- the phone ---------- \*/)', '', app, flags=re.S)
app = re.sub(r'/\* ---------- on a real phone: the app fills the screen.*?\n\}\n', '', app, flags=re.S)
app = re.sub(r'^\.(statusbar|gesture)\b[^\n]*\n', '', app, flags=re.M)
m = re.search(r'\.phone \{.*?\n\}\n', app, flags=re.S)
assert m, 'the .phone rule'
app = app[: m.start()] + (
    '.pw {\n'
    '  position: fixed; inset: 0; height: 100dvh; overflow: hidden; display: flex; flex-direction: column;\n'
    '  background: var(--ground); color: var(--ink-1);\n'
    '  font-family: var(--sans); font-size: var(--t-body); line-height: 1.5;\n'
    '  -webkit-font-smoothing: antialiased; font-optical-sizing: auto;\n'
    '  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);\n'
    '}\n'
) + app[m.end():]
app = app.replace('.phone ::selection', '.pw ::selection').replace('.phone.is-typing', '.pw.is-typing')
# Every keyframe gets the pw- prefix (and its uses), so none can meet a name of the web app's.
for frame in sorted(set(re.findall(r'@keyframes\s+([\w-]+)', app)), key=len, reverse=True):
    app = re.sub(r'@keyframes\s+' + re.escape(frame) + r'(?![\w-])', '@keyframes pw-' + frame, app)
    app = re.sub(r'(\banimation(?:-name)?:\s*)' + re.escape(frame) + r'(?![\w-])', r'\1pw-' + frame, app)


def prefix_selectors(css: str) -> str:
    """Prefixes each rule's selectors with .pw (inside @media too); leaves @keyframes' steps and .pw itself alone."""
    out, i, depth, frames = [], 0, 0, []
    while i < len(css):
        if css.startswith('/*', i):
            j = css.index('*/', i) + 2
            out.append(css[i:j]); i = j; continue
        ch = css[i]
        if ch == '}':
            depth -= 1
            if frames and frames[-1] == depth:
                frames.pop()
            out.append(ch); i += 1; continue
        if ch.isspace():
            out.append(ch); i += 1; continue
        # A prelude: up to the next { (a rule or an at-rule) or ; (a declaration).
        j = i
        while j < len(css) and css[j] not in '{;}':
            j += 1
        prelude = css[i:j]
        if j < len(css) and css[j] == '{':
            p = prelude.strip()
            in_frames = bool(frames)
            if p.startswith('@'):
                if p.startswith('@keyframes'):
                    frames.append(depth)
                out.append(prelude)
            elif in_frames:
                out.append(prelude)
            else:
                parts = [s.strip() for s in re.split(r',(?![^(]*\))', p)]
                done = []
                for s in parts:
                    if s == '.pw' or s.startswith('.pw.') or s.startswith('.pw[') or s.startswith('.pw ') or s.startswith('.pw:'):
                        done.append(s)
                    else:
                        done.append('.pw ' + s)
                out.append(', '.join(done) + ' ')
            out.append('{'); depth += 1; i = j + 1; continue
        out.append(css[i: j + 1] if j < len(css) else css[i:])
        i = j + 1
    return ''.join(out)


app = prefix_selectors(app)
# What the web app adds to the mock-up's parts (links are anchors here, where the mock-up had buttons).
app += "\n/* ---------- the web app's additions ---------- */\n.pw a { color: inherit; text-decoration: none; }\n.pw .tab { -webkit-user-select: none; user-select: none; }\n"
# A text field (Settings' buddy name), drawn like the mock-up's search field.
app += (".pw .field-input { display: block; width: 100%; margin-top: 8px; height: 46px; border-radius: var(--r-field); background: var(--tint); border: 0; outline: 0; padding: 0 14px; font: inherit; font-size: 16px; color: var(--ink-1); }\n"
        ".pw .field-input::placeholder { color: var(--ink-3); }\n"
        ".pw .field-input:focus-visible { box-shadow: 0 0 0 2px var(--accent-fill); }\n"
        ".pw .search-input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: var(--ink-1); }\n"
        ".pw .search-input::placeholder { color: var(--ink-3); }\n")
# QA only: "Compare with design" (the switch, and the approved mock-up laid over the whole screen at the same size).
app += (".pw .pw-design { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; z-index: 20; background: var(--ground); }\n"
        # A small tab on the left edge, mid-height: it never covers a control (the screens keep a 20 px gutter there).
        ".pw .pw-compare { position: absolute; z-index: 21; left: 0; top: 46%; writing-mode: vertical-rl; transform: rotate(180deg); padding: 12px 5px; border-radius: 10px 0 0 10px; font-size: 11.5px; font-weight: 600; letter-spacing: .02em; background: var(--main); color: var(--main-ink); box-shadow: 0 4px 14px rgba(0, 0, 0, .16); opacity: .88; }\n"
        ".pw .pw-compare.is-on { background: var(--accent-fill); color: #FFFFFF; }\n"
        ".pw.is-typing .pw-compare { display: none; }\n"
        "/* The dev server's own badge would sit on the tab bar in the phone's WebView (the QA build loads the dev server). */\n"
        "nextjs-portal { display: none !important; }\n")
# Step 5: Look shows the real lock picture of today (the server draws it), with the phone's clock over it.
app += (".pw .lock-shot.is-real img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }\n"
        ".pw .lock-shot.is-real .clock, .pw .lock-shot.is-real .date { position: relative; text-shadow: 0 1px 6px rgba(0, 0, 0, .35); }\n"
        # A sheet covers the whole phone, the tab bar too, as in the mock-up (there its layer sits after the tabs).
        ".pw .screen .sheet-layer { position: fixed; }\n"
        # A real answer keeps its line breaks (a numbered list, steps); the mock-up's words had none.
        ".pw .say p { white-space: pre-line; }\n")
# Stage 11: Settings › Send feedback's field (added to phone.css by hand then; kept here so a new port keeps it).
app += ("\n/* Stage 11: a quiet field for a few words (Settings › Send feedback). */\n"
        ".pw .note-field { display: block; width: 100%; min-height: 96px; padding: 12px 14px; border: 0; border-radius: 14px; background: var(--tint); color: var(--ink-1); font: inherit; font-size: 16px; line-height: 1.45; resize: none; }\n"
        ".pw .note-field::placeholder { color: var(--ink-3); }\n"
        ".pw .note-field:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }\n")
# App 0.9.0 (PHONE_UPDATE_PLAN §4): a newer app is out. Today's slim row has the Tell row's shape, filled with the quiet
# tint instead of its ring, so it reads as news and not as a second field; Settings' row has a download's line and notes.
app += ("\n/* 0.9.0: the app's own update (Today's slim row, a download's line, what's new). */\n"
        ".pw .update-pill { width: 100%; min-height: 50px; margin-top: 16px; padding: 3px 3px 3px 16px; border-radius: var(--r-pill); display: flex; align-items: center; gap: 10px; background: var(--tint); }\n"
        ".pw .update-pill > .i { color: var(--ink-2); }\n"
        ".pw .update-pill .words { flex: 1; min-width: 0; font-size: var(--t-body); line-height: 1.35; color: var(--ink-1); }\n"
        ".pw .update-pill .words:last-child { padding-right: 14px; }\n"
        ".pw .update-pill .link { padding: 10px 6px; }\n"
        ".pw .update-line { display: block; height: 3px; margin-top: 9px; border-radius: 2px; background: var(--line); overflow: hidden; }\n"
        ".pw .update-line > i { display: block; height: 100%; border-radius: 2px; background: var(--ink-2); transition: width var(--quick) linear; }\n"
        ".pw .update-notes { display: grid; gap: 2px; margin-top: 4px; }\n"
        "@media (prefers-reduced-motion: reduce) { .pw .update-line > i { transition: none; } }\n")
head = ('/* The phone world (PHONE_APP_REDESIGN_PLAN §7 step 2): mockups/phone-app/tokens.css + app.css, scoped under .pw\n'
        '   (the phone routes /m/…), made by scripts/port-phone-css.py. The mock-up stays the source of truth: change it there first,\n'
        '   then port again. Paper is the default look (his pick, 11-18); Slate is the web app\'s theme v2. */\n\n')
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + tokens + '\n' + app)
print('ok', len(head + tokens + app))
