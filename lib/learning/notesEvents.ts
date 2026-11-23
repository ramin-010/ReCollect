// STUDY_FLOW_PLAN §4.3: a note or link was added, changed or deleted in the app (Ctrl K, the edit dialog): the doc's
// notes panel and the subject's notes read again at once (a chat's notes arrive by the panel's own re-reads).
export const NOTES_CHANGED = 'rc:notes-changed';

export function notesChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTES_CHANGED));
}
