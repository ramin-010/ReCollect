import axiosInstance from '@/lib/utils/axios';

/** Ask AI, the manager (MANAGER_AND_DOCS_PLAN §3.4): threads, and a message answered as a stream. */

export type ToolLevel = 1 | 2 | 3;

export interface AssistantTool {
  name: string;
  /** 1 reads · 2 changes at once (Undo) · 3 only asks (Do it / Dismiss). */
  level: ToolLevel;
  input: string;
  /** The first line(s) of what the tool said. */
  result: string;
  ok: boolean;
  /** The edit a change made (its Undo). */
  editId?: string | null;
  /** The title, query or text it was called with. */
  detail?: string | null;
  /** The card a level-3 call left waiting. */
  suggestionId?: string | null;
  undone?: boolean;
  action?: { status: 'pending' | 'accepted' | 'dismissed'; text: string } | null;
}

export interface AssistantMessage {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: AssistantTool[];
  costUsd: number | null;
  createdAt: string;
}

export interface AssistantThread {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantThreadFull extends AssistantThread {
  messages: AssistantMessage[];
}

export type TurnStop = 'done' | 'rounds' | 'cap' | 'error' | 'stopped';

/** What he points at inside a doc: the selected blocks or the cursor's, and the selected words. */
export interface DocAskFocus {
  blockIds: string[];
  text?: string;
}

export interface StreamHandlers {
  onThread?: (thread: { _id: string; title: string; docId?: string | null }) => void;
  onTool?: (tool: AssistantTool) => void;
  /** The model's words as they arrive; a new round (after its tools) starts its words again. */
  onDelta?: (delta: { text: string; round: number }) => void;
  onDone?: (done: { message: AssistantMessage; stopped: TurnStop; rounds: number }) => void;
}

/** A send that failed: what to tell him, and whether his message was kept (the stream had begun). */
export class AskError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8002';
const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

/** Words for an HTTP failure before the stream began. */
function failureWords(status: number, body: { message?: string; code?: string } | null): string {
  if (body?.code === 'AI_PAUSED') return body.message || 'The AI is paused right now. Everything else works.';
  if (body?.code === 'AI_NOT_CONFIGURED' || status === 503) return 'Ask AI needs the Claude key on the server (CLAUDE_API_KEY), and it is not set.';
  if (body?.code === 'AI_CAP_REACHED' || status === 402) return "This month's AI spend has reached your cap. Raise it in Settings → AI.";
  if (status === 401) return 'You were signed out. Sign in again, then send it again.';
  if (status === 404) return 'This conversation is gone (deleted, or unused for 90 days). Start a new chat to ask it.';
  return body?.message || `The server answered ${status}.`;
}

export const assistantApi = {
  async listThreads(): Promise<AssistantThread[]> {
    return data(await axiosInstance.get('/api/assistant/threads'));
  },
  async getThread(id: string): Promise<AssistantThreadFull> {
    return data(await axiosInstance.get(`/api/assistant/threads/${id}`));
  },
  async deleteThread(id: string): Promise<void> {
    await axiosInstance.delete(`/api/assistant/threads/${id}`);
  },
  /** His Stop: the running turn ends; its stream still sends done (stopped: "stopped"). */
  async stop(threadId: string): Promise<boolean> {
    return (data(await axiosInstance.post(`/api/assistant/threads/${threadId}/stop`)) as { stopped: boolean }).stopped;
  },

  /**
   * Sends his message and reads the manager's turn as it streams: `thread` (new or the same),
   * a `tool` per call as it finishes, then `done`. Throws an AskError when it fails. With a
   * `docId` it is asked from inside that doc (DOCS_EDITOR_V2_PLAN phase 5): the doc and his focus
   * go to the model, and the thread stays with the doc.
   */
  async send(body: { threadId?: string; text: string; docId?: string; focus?: DocAskFocus; askId?: string; first?: true }, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/assistant/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      throw new AskError("Couldn't reach the server. Check that it is running, then try again.", 0);
    }
    if (!res.ok || !res.body) {
      const json = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
      throw new AskError(failureWords(res.status, json), res.status, json?.code);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;
    const handle = (frame: string) => {
      let event = 'message';
      let payload = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) payload += line.slice(6);
      }
      if (!payload) return;
      const value = JSON.parse(payload);
      if (event === 'thread') handlers.onThread?.(value);
      else if (event === 'tool') handlers.onTool?.(value);
      else if (event === 'delta') handlers.onDelta?.(value);
      else if (event === 'done') {
        finished = true;
        handlers.onDone?.(value);
      } else if (event === 'error') {
        finished = true;
        throw new AskError(`It stopped part way: ${value?.message ?? 'something went wrong'}.`, 500);
      }
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut = buffer.indexOf('\n\n');
        while (cut !== -1) {
          handle(buffer.slice(0, cut));
          buffer = buffer.slice(cut + 2);
          cut = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      if (err instanceof AskError || (err as Error)?.name === 'AbortError') throw err;
      throw new AskError('The connection dropped before the answer came. It may still finish: open the conversation again in a moment.', 0);
    }
    if (!finished) throw new AskError('The connection dropped before the answer came. It may still finish: open the conversation again in a moment.', 0);
  },
};
