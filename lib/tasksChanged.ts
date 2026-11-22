/**
 * One signal for "a task changed somewhere in this window" (the owner, 11-22: a tick on Home showed on the Tasks
 * page only after a reload). Whoever writes a task calls tasksChanged(); every list of tasks on screen listens and
 * fetches again. Pages also fetch on every visit and when the window comes back, so a change from a chat, the phone
 * or another tab lands too.
 */
export const TASKS_CHANGED = 'rc:tasks-changed';

export function tasksChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TASKS_CHANGED));
}
