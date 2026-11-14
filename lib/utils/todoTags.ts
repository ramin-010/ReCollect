/**
 * Todo tags ↔ the UI's "labels".
 *
 * Backend contract (/api/todos and /api/workspace-todos, create + PATCH):
 *   - send `tags` as an array of tag NAMES (strings). Unknown names are created; names are
 *     trimmed and de-duplicated server side, matching is case-sensitive. In multipart bodies
 *     (description with images) the array is sent as a JSON string.
 *   - responses return `tags: [{ _id, name }]` (no colour).
 *   - PATCH: a non-empty list replaces the task's tags; an empty list is currently ignored
 *     by the backend (tags cannot be cleared yet).
 * `labels` is not part of the contract: the backend ignores it.
 */

export interface TodoTag {
  _id: string;
  name: string;
}

/** The shape the label pickers (LabelsModal / InlineLabelDropdown) use. */
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_LABEL_COLOR = 'blue';

/**
 * Labels for a task as it comes from the API (`tags: [{ _id, name }]`). Also accepts tag names
 * (what an optimistic local update holds after a save) and the legacy `labels` field.
 */
export function labelsFromTask(task: { tags?: unknown; labels?: unknown } | null | undefined): TaskLabel[] {
  const source = Array.isArray(task?.tags) ? task.tags : Array.isArray(task?.labels) ? task.labels : [];
  const labels: TaskLabel[] = [];
  for (const item of source as unknown[]) {
    if (typeof item === 'string') {
      if (item.trim()) labels.push({ id: `tag-${item}`, name: item, color: DEFAULT_LABEL_COLOR });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.name !== 'string' || !raw.name.trim()) continue;
    const id = typeof raw._id === 'string' ? raw._id : typeof raw.id === 'string' ? raw.id : `tag-${raw.name}`;
    labels.push({ id, name: raw.name, color: typeof raw.color === 'string' ? raw.color : DEFAULT_LABEL_COLOR });
  }
  return labels;
}

/** The `tags` value to send: trimmed, non-empty, unique names in selection order. */
export function tagNamesForPayload(labels: ReadonlyArray<{ name: string }>): string[] {
  const names: string[] = [];
  for (const label of labels) {
    const name = label.name.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** True when two tag-name lists differ (order matters: the backend keeps it). */
export function tagNamesChanged(a: readonly string[], b: readonly string[]): boolean {
  return a.length !== b.length || a.some((name, i) => name !== b[i]);
}
