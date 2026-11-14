/**
 * Recollect UI faces (DESIGN.md "Type"). Since 2026-11-14 the UI uses the operating system's own face,
 * as Notion does: Segoe UI Variable Display on Windows and SF Pro on a Mac. The stack is set in
 * `rc-ui.css` (`--rc-font`) and app-wide in `app/theme-v2.css` (`--font-ui`), so no web font is
 * downloaded. Sofia Sans, the previous face, was retired with the first skin.
 *
 * Kept as an empty class list so every `.rc` root (`rcScope`) stays unchanged.
 */
export const rcFontVars = '';
