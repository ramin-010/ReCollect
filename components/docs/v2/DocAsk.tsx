'use client';

/**
 * Ask AI inside a doc (DOCS_EDITOR_V2_PLAN phase 5): a box under the block he is in, or under the
 * blocks he selected. He says what he wants or picks a starter; the manager's engine runs with the doc
 * in hand and changes the doc live through the block tools (agent edits labelled "Ask AI", listed in
 * Home → From your agent). What it wrote is tinted once; the box then says what changed, with
 * Keep · Undo · Try again and a line for a follow-up. A question gets its answer in the box, with
 * Insert below and Copy; the doc stays as it was.
 */
import './doc-ask.css';
import '@/components/assistant/ask.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';
import { toast } from 'sonner';
import {
  ArrowUp,
  BookOpenCheck,
  Check,
  CircleAlert,
  CircleHelp,
  Copy,
  Eye,
  Feather,
  ListTree,
  LoaderCircle,
  PenLine,
  RotateCw,
  ScanSearch,
  Shrink,
  Sparkles,
  Square,
  SpellCheck,
  TextQuote,
  Undo2,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';
import { AskMarkdown } from '@/components/assistant/AskMarkdown';
import { ActionCard, cleanResult } from '@/components/assistant/AskTools';
import { costWords } from '@/components/assistant/askFormat';
import { assistantApi, AskError, type AssistantMessage, type AssistantTool, type TurnStop } from '@/lib/api/assistantApi';
import { agentApi } from '@/lib/api/agentApi';
import { learningApi } from '@/lib/api/learningApi';
import { sanitizeBoard, writeBoard } from '@/lib/editor/canvasBoard';

/** What he points at when the box opens. */
export interface AskFocus {
  /** The blocks he selected, or the one his cursor is in (reading order). */
  blockIds: string[];
  /** The words he selected inside one block. */
  text?: string;
  /** He selected something: those blocks stay tinted while the box is open. */
  selection: boolean;
  /** His cursor is on an empty line: the starters write, and new text lands there. */
  emptyLine: boolean;
}

type Block = { id: string; type: string; content?: unknown; children?: Block[] };
type Change = { type: string; block: { id: string }; source: { type: string } };

/** The part of the BlockNote editor the box uses. */
export interface DocAskEditor {
  document: Block[];
  getBlock(id: string): Block | undefined;
  onChange(callback: (editor: unknown, context: { getChanges(): Change[] }) => void, includeRemote?: boolean): () => void;
  insertBlocks(blocks: never, reference: string, placement: 'before' | 'after'): Block[];
  replaceBlocks(remove: string[], insert: never): { insertedBlocks: Block[] };
}

interface Starter {
  key: string;
  group: 'Edit' | 'Write' | 'Ask';
  label: string;
  Icon: LucideIcon;
  prompt: string;
  /** Puts the words in the box for him to finish, instead of sending. */
  fill?: boolean;
}

const S: Record<string, Starter> = {
  improve: { key: 'improve', group: 'Edit', label: 'Improve writing', Icon: WandSparkles, prompt: 'Improve the writing of this: clearer and tighter, with the same meaning.' },
  fix: { key: 'fix', group: 'Edit', label: 'Fix spelling and grammar', Icon: SpellCheck, prompt: 'Fix the spelling and grammar of this. Change nothing else.' },
  shorter: { key: 'shorter', group: 'Edit', label: 'Make shorter', Icon: Shrink, prompt: 'Make this shorter. Keep the key points.' },
  simpler: { key: 'simpler', group: 'Edit', label: 'Simplify', Icon: Feather, prompt: 'Say this more simply, in plain words.' },
  explain: { key: 'explain', group: 'Ask', label: 'Explain this', Icon: CircleHelp, prompt: 'Explain this in plain words. Answer here and leave the doc as it is.' },
  continue: { key: 'continue', group: 'Write', label: 'Continue writing', Icon: PenLine, prompt: 'Continue writing from here, in the style of the doc: a few lines.' },
  section: { key: 'section', group: 'Write', label: 'Write a section on…', Icon: TextQuote, prompt: 'Write a section on ', fill: true },
  diagram: { key: 'diagram', group: 'Write', label: 'Add a diagram of…', Icon: Workflow, prompt: 'Add a diagram of ', fill: true },
  recall: { key: 'recall', group: 'Write', label: 'Add recall questions', Icon: BookOpenCheck, prompt: 'Add three recall questions on the main points of this doc, each as a toggle: the question as its title, the answer inside.' },
  summary: { key: 'summary', group: 'Ask', label: 'Summarise this doc', Icon: ListTree, prompt: 'Summarise this doc in three to five bullet points, written in here.' },
  gaps: { key: 'gaps', group: 'Ask', label: 'What is missing here?', Icon: ScanSearch, prompt: 'What important points does this note miss? Answer here and leave the doc as it is.' },
};

/** The starters for where he is: a selection gets edits, an empty line gets writing, a line with text both. */
function startersFor(focus: AskFocus): Starter[] {
  if (focus.selection) return [S.improve!, S.fix!, S.shorter!, S.simpler!, S.explain!];
  if (focus.emptyLine) return [S.continue!, S.section!, S.diagram!, S.recall!, S.summary!, S.gaps!];
  return [S.continue!, S.improve!, S.shorter!, S.diagram!, S.explain!];
}

interface Turn {
  /** What the box shows he asked (a starter's name, or his words). */
  prompt: string;
  /** What was sent (a starter's full words). */
  text: string;
  tools: AssistantTool[];
  message: AssistantMessage | null;
  stopped?: TurnStop;
  error: string | null;
  /** The model's words of its current step, as they arrive (a new step starts them again). */
  streamed?: string;
  round?: number;
  /** He pressed Stop and the turn is ending. */
  stopping?: boolean;
}

const flatIds = (blocks: readonly Block[]): string[] => blocks.flatMap((b) => [b.id, ...flatIds(b.children ?? [])]);
const isEmptyLine = (b: Block | undefined) => !!b && b.type === 'paragraph' && Array.isArray(b.content) && b.content.length === 0 && !(b.children ?? []).length;
const blocksWord = (n: number) => `${n} ${n === 1 ? 'block' : 'blocks'}`;

/** One step in the box's words (block ids and doc ids never shown). */
function stepWords(tool: AssistantTool): string {
  if (!tool.ok) return `A step didn't work: ${cleanResult(tool.result) || 'no reason given'}`;
  const count = (re: RegExp) => Number(re.exec(tool.result)?.[1] ?? 1);
  switch (tool.name) {
    case 'insert_blocks':
      return `Wrote ${blocksWord(count(/Inserted (\d+)/))}`;
    case 'update_block':
      return 'Changed a block';
    case 'delete_blocks':
      return `Removed ${blocksWord(count(/Deleted (\d+)/))}`;
    case 'move_blocks':
      return `Moved ${blocksWord(count(/Moved (\d+)/))}`;
    case 'update_canvas':
      return 'Changed a board';
    case 'read_doc':
    case 'get_outline':
      return 'Read the doc';
    case 'search_docs':
      return tool.detail ? `Searched your docs · “${tool.detail}”` : 'Searched your docs';
    default:
      return tool.level === 1 ? `Looked at ${tool.name.replace(/_/g, ' ')}` : cleanResult(tool.result) || tool.name.replace(/_/g, ' ');
  }
}

function StepRow({ tool }: { tool: AssistantTool }) {
  const failed = !tool.ok;
  const read = tool.level === 1 && !failed;
  const Icon = failed ? CircleAlert : read ? Eye : tool.undone ? Undo2 : Check;
  return (
    <div className={cn('ask-tool', read && 'ask-tool--read', failed && 'ask-tool--failed', tool.undone && 'ask-tool--undone')} data-arrive>
      <Icon className="ask-tool-icon" strokeWidth={1.75} aria-hidden />
      <span className="ask-tool-text">{stepWords(tool)}</span>
      {tool.undone && <span className="ask-tool-state">Undone</span>}
    </div>
  );
}

/** A style rule per block (made once, so a tint never restarts when another block arrives). */
function useBlockTints() {
  const rules = useRef(new Map<string, HTMLStyleElement>());
  const add = useCallback((kind: 'focus' | 'new', id: string) => {
    const key = `${kind}:${id}`;
    if (rules.current.has(key)) return;
    const el = document.createElement('style');
    const target = `.lab-editor [data-node-type="blockContainer"][data-id="${id.replace(/["\\]/g, '')}"] > .bn-block-content`;
    el.textContent =
      kind === 'focus'
        ? `${target}{background:var(--doc-ask-focus);border-radius:4px}`
        : `@media (prefers-reduced-motion:no-preference){${target}{animation:doc-ask-arrive 1600ms ease-out;border-radius:4px}}`;
    document.head.appendChild(el);
    rules.current.set(key, el);
  }, []);
  const clear = useCallback((kind?: 'focus' | 'new') => {
    for (const [key, el] of rules.current) {
      if (kind && !key.startsWith(`${kind}:`)) continue;
      el.remove();
      rules.current.delete(key);
    }
  }, []);
  useEffect(() => () => clear(), [clear]);
  return { add, clear };
}

export function DocAsk({
  editor,
  ydoc,
  docId,
  focus,
  onClose,
}: {
  editor: DocAskEditor;
  ydoc: Y.Doc;
  docId: string;
  focus: AskFocus;
  /** Closes the box; the caret goes to the end of `caretAt` (null: leave it where he clicked). */
  onClose: (caretAt: string | null) => void;
}) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [turn, setTurn] = useState<Turn | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  // The running turn's thread, for Stop (set by the stream before any words arrive).
  const threadRef = useRef<string | null>(null);
  // Blocks the AI added, and blocks it changed in place, while this box is open.
  const [made, setMade] = useState<string[]>([]);
  const [touched, setTouched] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<'undo' | 'insert' | 'card' | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Remote changes count as the AI's only while it runs (and a moment after, as its last writes arrive).
  const listening = useRef(false);
  const quietTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tints = useBlockTints();

  // The field takes the keys once the box is up (the editor may take focus back as its menu or bar closes).
  useEffect(() => {
    const take = () => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    };
    const frame = requestAnimationFrame(take);
    const timer = setTimeout(take, 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  // The blocks he selected stay tinted while the box is open (the text selection itself is gone).
  useEffect(() => {
    if (focus.selection) for (const id of focus.blockIds) tints.add('focus', id);
  }, [focus, tints]);

  // What the AI writes arrives through the live doc while it runs. BlockNote marks these changes
  // "local" here (its remote mark doesn't reach this setup), so his own typing is told apart by focus:
  // while the box has the keys, the doc's changes are the AI's.
  useEffect(
    () =>
      editor.onChange((_e, context) => {
        if (!listening.current || document.activeElement?.closest('.bn-editor')) return;
        const add: string[] = [];
        const gone: string[] = [];
        const upd: string[] = [];
        for (const c of context.getChanges()) {
          if (['undo', 'redo', 'undo-redo', 'paste', 'drop'].includes(c.source.type)) continue;
          if (c.type === 'insert') add.push(c.block.id);
          else if (c.type === 'delete') gone.push(c.block.id);
          else if (c.type === 'update') upd.push(c.block.id);
        }
        if (add.length || gone.length) setMade((prev) => [...prev.filter((id) => !gone.includes(id)), ...add.filter((id) => !prev.includes(id))]);
        if (upd.length) setTouched((prev) => [...prev, ...upd.filter((id) => !prev.includes(id))]);
      }, true),
    [editor],
  );
  useEffect(() => {
    for (const id of [...made, ...touched]) tints.add('new', id);
  }, [made, touched, tints]);
  useEffect(() => () => {
    if (quietTimer.current) clearTimeout(quietTimer.current);
  }, []);

  /** The last block (reading order) of what the AI wrote, else of what he pointed at: the box sits under it. */
  const anchorId = useCallback((): string | null => {
    const ids = flatIds(editor.document);
    const wrote = [...made, ...touched].filter((id) => ids.includes(id));
    const wanted = new Set(wrote.length ? wrote : focus.blockIds);
    for (let i = ids.length - 1; i >= 0; i -= 1) if (wanted.has(ids[i]!)) return ids[i]!;
    return ids[ids.length - 1] ?? null;
  }, [editor, focus.blockIds, made, touched]);

  const place = useCallback(() => {
    const layer = layerRef.current;
    const root = layer?.closest('.lab-editor');
    const id = anchorId();
    if (!layer || !root || !id) return;
    const el = root.querySelector(`[data-node-type="blockContainer"][data-id="${id.replace(/["\\]/g, '')}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    // On an empty line, until something is written, the box takes the line itself (as Notion's does).
    const onLine = focus.emptyLine && !made.length && !touched.length && id === focus.blockIds[0];
    setTop(Math.round((onLine ? r.top + 2 : r.bottom + 6) - layer.getBoundingClientRect().top));
  }, [anchorId, focus, made.length, touched.length]);

  useLayoutEffect(() => {
    place();
  }, [place, phase, turn]);
  useEffect(() => {
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const off = editor.onChange(later, true);
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame);
      off();
      window.removeEventListener('resize', later);
    };
  }, [editor, place]);

  // Keep the box (and its starters, while they show) in view when it opens and when an answer comes.
  useEffect(() => {
    if (top === null) return;
    const box = boxRef.current;
    (box?.querySelector('.doc-ask-menu') ?? box)?.scrollIntoView({ block: 'nearest' });
    if (box?.querySelector('.doc-ask-menu')) box.scrollIntoView({ block: 'nearest' });
  }, [top === null, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(
    (toDoc: boolean) => {
      if (phase === 'working') return;
      onClose(toDoc ? anchorId() : null);
    },
    [phase, onClose, anchorId],
  );

  /** His Stop: the turn ends where it is; what it already did stays, each change with its Undo. */
  const stop = useCallback(() => {
    const id = threadRef.current;
    if (!id) return;
    setTurn((t) => (t && !t.stopping ? { ...t, stopping: true } : t));
    void assistantApi.stop(id).catch(() => {
      setTurn((t) => (t ? { ...t, stopping: false } : t));
      toast.error("It couldn't be stopped. It will finish on its own.");
    });
  }, []);

  // While it writes the line is gone, so Esc is heard on the whole page (before the editor's own Esc).
  useEffect(() => {
    if (phase !== 'working') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      stop();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [phase, stop]);

  // A click outside keeps what was written and closes the box (never while it writes).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || boxRef.current?.contains(target) || target.closest('[data-sonner-toaster]')) return;
      close(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [close]);

  const send = async (raw: string, options: { shown?: string; again?: string } = {}) => {
    const text = raw.trim();
    if (!text || phase === 'working') return;
    // A follow-up points at what the AI wrote; the first ask at what he pointed at.
    const ids = flatIds(editor.document);
    const wrote = ids.filter((id) => made.includes(id) || touched.includes(id));
    const pointed = focus.blockIds.filter((id) => ids.includes(id));
    const first = !threadId;
    setPhase('working');
    setInput('');
    setTurn({ prompt: options.shown ?? text, text: options.again ?? text, tools: [], message: null, error: null });
    listening.current = true;
    if (quietTimer.current) clearTimeout(quietTimer.current);
    try {
      await assistantApi.send(
        {
          text,
          docId,
          focus: { blockIds: wrote.length ? wrote : pointed, ...(first && focus.text ? { text: focus.text } : {}) },
          ...(threadId ? { threadId } : {}),
        },
        {
          onThread: (t) => {
            threadRef.current = t._id;
            setThreadId(t._id);
          },
          onTool: (tool) => setTurn((t) => (t ? { ...t, tools: [...t.tools, tool] } : t)),
          onDelta: ({ text: piece, round }) => setTurn((t) => (t ? { ...t, streamed: t.round === round ? `${t.streamed ?? ''}${piece}` : piece, round } : t)),
          onDone: ({ message, stopped }) => setTurn((t) => (t ? { ...t, message, stopped, stopping: false } : t)),
        },
      );
    } catch (err) {
      setTurn((t) => (t ? { ...t, error: err instanceof AskError ? err.message : 'Something went wrong. Try again.' } : t));
    } finally {
      setPhase('done');
      quietTimer.current = setTimeout(() => {
        listening.current = false;
      }, 2500);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const edits = (turn?.tools ?? []).filter((t) => t.ok && t.level === 2 && t.editId);
  const live = edits.filter((t) => !t.undone);
  const answer = turn?.message?.text?.trim() ?? '';

  /** Takes back every change of the last ask, newest first. */
  const undoAll = async (): Promise<boolean> => {
    if (!live.length) return true;
    listening.current = false;
    setBusy('undo');
    try {
      for (const t of [...live].reverse()) await agentApi.undoEdit(t.editId!);
      setTurn((prev) => (prev ? { ...prev, tools: prev.tools.map((t) => (live.includes(t) ? { ...t, undone: true } : t)) } : prev));
      tints.clear('new');
      setMade([]);
      setTouched([]);
      return true;
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "That couldn't be undone. Try again from Home → From your agent.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const undo = async () => {
    const prompt = turn?.prompt ?? '';
    if (!(await undoAll())) return;
    toast.success('Undone');
    setPhase('idle');
    setTurn(null);
    setInput(prompt);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(prompt.length, prompt.length);
    });
  };

  const tryAgain = async () => {
    if (!turn || !(await undoAll())) return;
    void send(`Try again, differently (the last try was undone): ${turn.text}`, { shown: turn.prompt, again: turn.text });
  };

  const insertAnswer = async () => {
    if (!answer) return;
    setBusy('insert');
    try {
      const { blocks, boards } = await agentApi.markdownToEditorBlocks(answer);
      if (!blocks.length) return;
      for (const [canvasId, board] of Object.entries(boards)) writeBoard(ydoc, canvasId, sanitizeBoard(board));
      const at = anchorId();
      if (!at) return;
      const written = isEmptyLine(editor.getBlock(at)) ? editor.replaceBlocks([at], blocks as never).insertedBlocks : editor.insertBlocks(blocks as never, at, 'after');
      onClose(written[written.length - 1]?.id ?? at);
    } catch {
      toast.error("The answer couldn't be added. Copy it instead.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      toast.success('Copied');
    } catch {
      toast.error("Couldn't copy. Select the text and copy it.");
    }
  };

  const decide = async (tool: AssistantTool, accept: boolean) => {
    if (!tool.suggestionId) return;
    setBusy('card');
    try {
      const card = accept ? await learningApi.acceptSuggestion(tool.suggestionId) : await learningApi.dismissSuggestion(tool.suggestionId);
      setTurn((prev) => (prev ? { ...prev, tools: prev.tools.map((t) => (t === tool ? { ...t, action: { status: accept ? 'accepted' : 'dismissed', text: tool.action?.text ?? card.text } } : t)) } : prev));
      if (accept) toast.success(card.result || 'Done');
    } catch {
      toast.error("That didn't go through. It is still under Suggested on Home.");
    } finally {
      setBusy(null);
    }
  };

  const changed = live.length > 0;
  // He stopped it: what it said so far shows; with no change made, Close or Try again (never "Insert below" a half answer).
  const halted = turn?.stopped === 'stopped';
  // A failed call, or a turn the engine stopped (the cap, a model error): said in the box, never inserted.
  const failed = turn?.error ?? (turn?.stopped === 'error' || turn?.stopped === 'cap' ? answer || 'It stopped before it finished.' : null);
  const starters = startersFor(focus);
  const showMenu = phase === 'idle' && !input.trim();
  const at = Math.min(active, starters.length - 1);

  const runStarter = (s: Starter) => {
    if (s.fill) {
      setInput(s.prompt);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        el?.focus();
        el?.setSelectionRange(s.prompt.length, s.prompt.length);
      });
    } else void send(s.prompt, { shown: s.label });
  };

  /** The dark button's job, also Enter on an empty line once there is a result. */
  const main = () => {
    if (failed && turn) void send(turn.text, { shown: turn.prompt });
    else if (changed) close(true);
    else if (halted) close(true);
    else if (answer) void insertAnswer();
    else close(true);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setActive((i) => (Math.min(i, starters.length - 1) + (e.key === 'ArrowDown' ? 1 : starters.length - 1)) % starters.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (input.trim()) void send(input);
      else if (showMenu) runStarter(starters[at]!);
      else if (phase === 'done') main();
    }
  };

  const steps = turn?.tools ?? [];
  // Once it has answered in words, the steps fold into one meta line ("2 changes · 1.4¢"), unless one
  // failed or waits for his tap; while it works they show one by one.
  const foldSteps = phase === 'done' && !failed && !!answer && steps.every((t) => t.ok && t.level !== 3 && !t.suggestionId);
  const meta = [live.length ? `${live.length} ${live.length === 1 ? 'change' : 'changes'}` : '', turn?.message?.costUsd != null ? costWords(turn.message.costUsd) : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <div ref={layerRef} className="doc-ask-layer">
      <div
        ref={boxRef}
        className="doc-ask"
        role="dialog"
        aria-label="Ask AI"
        data-phase={phase}
        style={{ top: top ?? 0, visibility: top === null ? 'hidden' : undefined }}
        onKeyDown={(e) => {
          // Esc closes from anywhere in the box (the line, a button), back to the doc; while it works, Esc stops it.
          if (e.key === 'Escape' && phase !== 'working') {
            e.preventDefault();
            close(true);
          }
        }}
      >
        {turn && phase !== 'idle' && (
          <div className="doc-ask-result" aria-live="polite">
            <p className="doc-ask-asked">{turn.prompt}</p>
            {steps.length > 0 && !foldSteps && (
              <div className="ask-tools doc-ask-steps">
                {steps.map((t, i) =>
                  t.ok && (t.level === 3 || t.suggestionId) ? (
                    <ActionCard key={i} tool={t} arriving busy={busy === 'card'} onDecide={(accept) => void decide(t, accept)} />
                  ) : (
                    <StepRow key={i} tool={t} />
                  ),
                )}
              </div>
            )}
            {/* The working line (and its Stop) stays put above the words as they arrive. */}
            {phase === 'working' && (
              <div className="doc-ask-working">
                <LoaderCircle className="doc-ask-spin" strokeWidth={1.75} aria-hidden />
                <span className="doc-ask-working-words">{turn.stopping ? 'Stopping…' : steps.some((t) => t.level === 2 && t.ok) ? 'Still writing…' : 'Writing…'}</span>
                <RcButton variant="quiet" size="sm" className="doc-ask-stop" icon={<Square aria-hidden fill="currentColor" />} disabled={!!turn.stopping} onClick={stop} aria-keyshortcuts="Escape">
                  Stop
                </RcButton>
              </div>
            )}
            {phase === 'working' && turn.streamed?.trim() && (
              <div className="doc-ask-answer doc-ask-answer--streaming">
                <AskMarkdown text={turn.streamed} />
              </div>
            )}
            {phase === 'done' && failed && (
              <p className="doc-ask-failed">
                <CircleAlert className="doc-ask-failed-icon" strokeWidth={1.75} aria-hidden />
                <span>{failed}</span>
              </p>
            )}
            {phase === 'done' && !failed && answer && (
              <div className={cn('doc-ask-answer', !changed && 'doc-ask-answer--long')}>
                <AskMarkdown text={answer} />
              </div>
            )}
            {phase === 'done' && (
              <div className="doc-ask-foot">
                <span className="doc-ask-cost">{meta}</span>
                <div className="doc-ask-actions">
                  {failed ? (
                    <>
                      {changed && (
                        <RcButton variant="quiet" size="sm" icon={<Undo2 aria-hidden />} busy={busy === 'undo'} disabled={!!busy} onClick={() => void undo()}>
                          Undo
                        </RcButton>
                      )}
                      <RcButton variant="quiet" size="sm" disabled={!!busy} onClick={() => close(true)}>
                        Close
                      </RcButton>
                      <RcButton variant="outline" size="sm" icon={<RotateCw aria-hidden />} disabled={!!busy} onClick={main}>
                        Try again
                      </RcButton>
                    </>
                  ) : halted && !changed ? (
                    <>
                      <RcButton variant="quiet" size="sm" disabled={!!busy} onClick={() => close(true)}>
                        Close
                      </RcButton>
                      <RcButton variant="outline" size="sm" icon={<RotateCw aria-hidden />} disabled={!!busy} onClick={() => turn && void send(turn.text, { shown: turn.prompt })}>
                        Try again
                      </RcButton>
                    </>
                  ) : changed ? (
                    <>
                      <RcButton variant="quiet" size="sm" icon={<Undo2 aria-hidden />} busy={busy === 'undo'} disabled={!!busy} onClick={() => void undo()}>
                        Undo
                      </RcButton>
                      <RcButton variant="quiet" size="sm" icon={<RotateCw aria-hidden />} disabled={!!busy} onClick={() => void tryAgain()}>
                        Try again
                      </RcButton>
                      <RcButton variant="main" size="sm" disabled={!!busy} onClick={main}>
                        Keep
                      </RcButton>
                    </>
                  ) : answer ? (
                    <>
                      <RcButton variant="quiet" size="sm" icon={<Copy aria-hidden />} onClick={() => void copy()}>
                        Copy
                      </RcButton>
                      <RcButton variant="main" size="sm" busy={busy === 'insert'} onClick={main}>
                        Insert below
                      </RcButton>
                    </>
                  ) : (
                    <RcButton variant="main" size="sm" onClick={main}>
                      Done
                    </RcButton>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {phase !== 'working' && (
          <div className="doc-ask-bar">
            <Sparkles className="doc-ask-mark" strokeWidth={1.75} aria-hidden />
            <textarea
              ref={inputRef}
              rows={1}
              autoFocus
              className="doc-ask-input"
              aria-label="Ask AI"
              placeholder={phase === 'done' ? 'Tell AI what to change, or ask more…' : focus.selection ? 'Ask AI to edit or explain this…' : 'Ask AI to write, edit or explain…'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setActive(0);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
              }}
              onKeyDown={onKey}
            />
            <button type="button" className="doc-ask-send" aria-label="Send" disabled={!input.trim()} onMouseDown={(e) => e.preventDefault()} onClick={() => void send(input)}>
              <ArrowUp aria-hidden />
            </button>
          </div>
        )}
        {showMenu && (
          <div className="lab-menu doc-ask-menu" role="listbox" aria-label="Suggestions">
            {starters.map((s, i) => (
              <div key={s.key}>
                {s.group !== starters[i - 1]?.group && <p className="lab-menu-label">{s.group}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === at}
                  className="lab-menu-item"
                  data-selected={i === at || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runStarter(s)}
                >
                  <s.Icon aria-hidden />
                  <span>{s.label}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
