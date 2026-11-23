// The Ctrl K palette opened from a button in a given mode (STUDY_FLOW_PLAN §4.3: the doc's notes panel's + opens it
// on Note or Link, attached to the open lesson). The palette takes the mode once, when it opens.
export type PaletteMode = 'note' | 'link';

let next: PaletteMode | null = null;

export function requestPaletteMode(mode: PaletteMode | null): void {
  next = mode;
}

export function takePaletteMode(): PaletteMode | null {
  const mode = next;
  next = null;
  return mode;
}
