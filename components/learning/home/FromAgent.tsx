'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bot, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import { agentApi, type AgentEdit } from '@/lib/api/agentApi';
import { formatRelative } from '@/components/docs/page/format';
import { LabelLine } from './parts';

const FOLD_AFTER = 3;

/**
 * "From your agent" (PLAN §2): what a coding agent changed since you last looked, so agent work
 * is never silent. Each line: Open, Keep (mark seen) or Undo. A change its app took back itself (undo_edit,
 * TOOL_ACCESS_PLAN §12.3) stays until seen, saying who took it back, with Dismiss only. Hidden when there is nothing
 * new or the agent API is not there.
 */
export function FromAgent() {
  const router = useRouter();
  const [edits, setEdits] = useState<AgentEdit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      setEdits((await agentApi.listEdits({ unseen: true })).filter((e) => !e.seenAt && (!e.undoneAt || !!e.undoneBy)));
    } catch {
      setEdits([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (!edits.length) return null;

  const keep = async (ids: string[]) => {
    setEdits((cur) => cur.filter((e) => !ids.includes(e.id)));
    try {
      await agentApi.markSeen(ids);
    } catch {
      void load();
    }
  };

  const undo = async (e: AgentEdit) => {
    setBusy(e.id);
    try {
      await agentApi.undoEdit(e.id);
      toast.success('Undone');
      setEdits((cur) => cur.filter((x) => x.id !== e.id));
    } catch {
      toast.error('That could not be undone. Open it and fix it by hand.');
    } finally {
      setBusy(null);
    }
  };

  // More than three: one line until opened, so the day's work stays on the first screen (1.6).
  const folded = edits.length > FOLD_AFTER && !expanded;

  return (
    <section aria-labelledby="agent-h">
      <LabelLine id="agent-h" title="From your agent">
        {edits.length > 1 && (
          <RcButton size="sm" variant="quiet" onClick={() => void keep(edits.map((e) => e.id))}>
            Keep all
          </RcButton>
        )}
      </LabelLine>
      {folded && (
        <button type="button" onClick={() => setExpanded(true)} className="rc-row rc-hoverable -mx-2 flex w-[calc(100%+16px)] items-center gap-3 px-2 py-[7px] text-left" aria-expanded={false}>
          <Bot className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
          <span className="text-[var(--rc-fs-body)] text-[var(--rc-ink-1)]">
            {edits.length} changes from your agents
          </span>
          <span className="rc-meta">{[...new Set(edits.map((e) => e.agentName))].slice(0, 3).join(', ')}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
        </button>
      )}
      <ul className={folded ? 'hidden' : 'flex flex-col'}>
        {edits.map((e) => {
          // Taken back by its own app: said so, struck through, and only dismissed (it is undone already).
          const takenBack = !!e.undoneAt;
          return (
            <li key={e.id} className="rc-row rc-hoverable group -mx-2 flex items-start gap-3 px-2 py-[7px]">
              <Bot className="mt-[3px] h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={`text-[var(--rc-fs-body)] leading-[1.4] ${takenBack ? 'text-[var(--rc-ink-3)] line-through' : 'text-[var(--rc-ink-1)]'}`}>{e.summary}</p>
                <p className="rc-meta mt-0.5">
                  {e.agentName} · {formatRelative(e.createdAt)}
                  {takenBack && ` · taken back by ${e.undoneBy}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {takenBack ? (
                  <RcButton size="sm" variant="quiet" onClick={() => void keep([e.id])}>
                    Dismiss
                  </RcButton>
                ) : (
                  <>
                    {e.docId && (
                      <RcButton size="sm" variant="quiet" onClick={() => router.push(`/docs/${encodeURIComponent(e.docId!)}`)}>
                        Open
                      </RcButton>
                    )}
                    <RcButton size="sm" variant="quiet" onClick={() => void keep([e.id])}>
                      Keep
                    </RcButton>
                    {e.canUndo && (
                      <RcButton size="sm" variant="quiet" busy={busy === e.id} onClick={() => void undo(e)}>
                        Undo
                      </RcButton>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
