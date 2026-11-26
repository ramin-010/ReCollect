'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RotateCw, SquarePen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { assistantApi, type AssistantThread } from '@/lib/api/assistantApi';
import { useAskThreads } from '@/lib/store/askThreadsStore';
import { RcConfirm } from '@/components/rc-ui';

const DAY_MS = 86_400_000;
function groupOf(updatedAt: string, now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(updatedAt).getTime();
  if (t >= start) return 'Today';
  if (t >= start - DAY_MS) return 'Yesterday';
  if (t >= start - 7 * DAY_MS) return 'Previous 7 days';
  return 'Older';
}

const rowBase =
  'w-full flex items-center gap-2 h-[30px] px-2 rounded-[6px] text-[14px] leading-none outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-fill)]';

/**
 * Ask Kaaga's conversations in the main sidebar (Notion's way: the chats live in the sidebar, not in a
 * second column on the page): "New chat", then the conversations by day, each opening in Ask Kaaga,
 * with a delete on hover that asks first.
 */
export function SidebarChats({ onNavigate }: { onNavigate: () => void }) {
  const threads = useAskThreads((s) => s.threads);
  const load = useAskThreads((s) => s.load);
  const remove = useAskThreads((s) => s.remove);
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const activeId = pathname === '/ask' ? params.get('t') : null;
  const [toDelete, setToDelete] = useState<AssistantThread | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    const now = new Date();
    const out: Array<{ label: string; items: AssistantThread[] }> = [];
    for (const t of threads) {
      const label = groupOf(t.updatedAt, now);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(t);
      else out.push({ label, items: [t] });
    }
    return out;
  }, [threads]);

  const doDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await assistantApi.deleteThread(toDelete._id);
      remove(toDelete._id);
      if (toDelete._id === activeId) router.push('/ask', { scroll: false });
      setToDelete(null);
      toast.success('Conversation deleted');
    } catch {
      toast.error("That conversation couldn't be deleted. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-px" aria-label="Chats">
      <Link
        href="/ask"
        onClick={(e) => {
          // A new chat even when one is open: the page clears and its box takes the focus.
          if (pathname === '/ask' && !activeId) e.preventDefault();
          document.dispatchEvent(new CustomEvent('recollect:new-chat'));
          onNavigate();
        }}
        className={cn(rowBase, 'font-[500] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]', pathname === '/ask' && !activeId && 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]')}
      >
        <SquarePen className="h-4 w-4 shrink-0 text-[var(--ui-icon)]" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">New chat</span>
      </Link>

      {threads === null && (
        <div className="flex flex-col gap-2 px-2 pt-3" aria-busy aria-label="Loading your conversations">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[14px] rounded-[5px] bg-[var(--ui-hover)]" style={{ width: `${82 - i * 14}%` }} />
          ))}
        </div>
      )}
      {threads === 'failed' && (
        <div className="px-2 pt-2">
          <p className="text-[13px] leading-[1.4] text-[var(--ui-ink-3)]">Couldn’t load your conversations.</p>
          <button type="button" onClick={() => void load(true)} className="mt-1.5 flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 -ml-1.5 text-[13px] font-[500] text-[var(--ui-ink-2)] hover:bg-[var(--ui-hover)]">
            <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Try again
          </button>
        </div>
      )}
      {Array.isArray(threads) && threads.length === 0 && <p className="px-2 pt-2 text-[13px] leading-[1.4] text-[var(--ui-ink-3)]">Your conversations with Ask Kaaga show here.</p>}

      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-px">
          <p className="flex h-[26px] items-end px-2 pb-1 pt-2 text-[12px] font-[500] text-[var(--ui-ink-3)]">{g.label}</p>
          {g.items.map((t) => {
            const active = t._id === activeId;
            return (
              <div
                key={t._id}
                className={cn('group/chat relative flex items-center rounded-[6px] transition-colors', active ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]')}
              >
                <Link href={`/ask?t=${t._id}`} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={t.title} className={cn(rowBase, 'min-w-0 flex-1 pr-1', active ? 'font-[500]' : 'font-[400]')}>
                  <span className="ui-fade-end min-w-0 flex-1 py-1 text-left">{t.title || 'New chat'}</span>
                </Link>
                <button
                  type="button"
                  aria-label={`Delete “${t.title}”`}
                  title="Delete this conversation"
                  onClick={() => setToDelete(t)}
                  className="mr-1 grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[5px] text-[var(--ui-icon)] opacity-0 transition-opacity hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)] focus-visible:opacity-100 group-hover/chat:opacity-100 max-lg:opacity-100"
                >
                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      <RcConfirm
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this conversation?"
        body={<p className="break-words">“{toDelete?.title}” and its messages are deleted for good. What it changed stays; undo those from Home → From your agent.</p>}
        confirmLabel="Delete conversation"
        danger
        busy={deleting}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
