'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { rcScope } from '@/components/rc-ui';
import { TaskStatusMark } from '@/components/todo/TaskMarks';
import { dueWords } from '@/components/todo/taskWords';
import './doc-tasks.css';

interface LinkedTask {
  _id: string;
  title: string;
  status: string;
  dueDate?: string | null;
}

/**
 * The doc's tasks as a property row (the tasks you linked to this doc: from Ctrl K, the task box's
 * @ mention, or here). The row says how many are open; its popover lists them with a tick each and
 * a line to add one, linked to this doc.
 */
export function DocTasks({ docId, docTitle, editable }: { docId: string; docTitle: string; editable: boolean }) {
  const [tasks, setTasks] = useState<LinkedTask[] | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/todos', { params: { refType: 'doc', refId: docId } });
      setTasks((res.data?.data ?? []) as LinkedTask[]);
    } catch {
      setTasks([]); // the row stays quiet; the doc still works
    }
  }, [docId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (t: LinkedTask) => {
    const next = t.status === 'complete' ? 'pending' : 'complete';
    setTasks((prev) => prev?.map((x) => (x._id === t._id ? { ...x, status: next } : x)) ?? prev);
    try {
      await axiosInstance.patch(`/api/todos/${t._id}`, { status: next });
    } catch {
      setTasks((prev) => prev?.map((x) => (x._id === t._id ? { ...x, status: t.status } : x)) ?? prev);
      toast.error('The task did not change. Try again.');
    }
  };

  const add = async () => {
    const title = draft.trim();
    if (!title || adding) return; // the line stays live (a disabled field drops the focus)
    setAdding(true);
    try {
      const res = await axiosInstance.post('/api/todos', { title, status: 'pending', priority: 'low', references: [{ type: 'doc', refId: docId, title: docTitle || 'Untitled' }] });
      const created = res.data?.data as LinkedTask | undefined;
      if (created?._id) setTasks((prev) => [...(prev ?? []), created]);
      setDraft('');
      inputRef.current?.focus();
    } catch {
      toast.error('The task was not added. Try again.');
    } finally {
      setAdding(false);
    }
  };

  if (tasks === null) {
    // Loading: the row holds its place, so nothing under it jumps.
    return (
      <div className="doc-prop" aria-busy>
        <span className="doc-prop-label">
          <ListChecks aria-hidden strokeWidth={1.75} />
          Tasks
        </span>
        <span className="doc-prop-value" />
      </div>
    );
  }
  const open = tasks.filter((t) => t.status !== 'complete');
  const done = tasks.length - open.length;
  if (!editable && tasks.length === 0) return null;
  const sorted = [...open, ...tasks.filter((t) => t.status === 'complete')];

  return (
    <div className="doc-prop">
      <span className="doc-prop-label">
        <ListChecks aria-hidden strokeWidth={1.75} />
        Tasks
      </span>
      <span className="doc-prop-value">
        <PopoverPrimitive.Root onOpenChange={(o) => o && void load()}>
          <PopoverPrimitive.Trigger asChild>
            <button type="button" className="doc-prop-btn">
              {tasks.length === 0 ? (
                <span className="doc-prop-empty">Add a task</span>
              ) : (
                <span className="tabular-nums">
                  {open.length ? `${open.length} open` : 'All done'}
                  {done > 0 && open.length > 0 ? <span className="doc-prop-hint"> · {done} done</span> : null}
                </span>
              )}
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className={cn(rcScope, 'rc-float dt-pop')}
              onOpenAutoFocus={(e) => {
                if (tasks.length) return; // a list opens on the list; an empty one on the line
                e.preventDefault();
                inputRef.current?.focus();
              }}
            >
              <p className="dt-title">Tasks for this doc</p>
              {sorted.length > 0 && (
                <ul className="dt-list">
                  {sorted.map((t) => {
                    const due = t.dueDate && t.status !== 'complete' ? dueWords(t.dueDate) : null;
                    return (
                      <li key={t._id} className={cn('dt-item', t.status === 'complete' && 'dt-item--done')}>
                        <button
                          type="button"
                          className="dt-mark group/mark"
                          aria-label={t.status === 'complete' ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`}
                          onClick={() => void toggle(t)}
                        >
                          <TaskStatusMark status={t.status === 'complete' ? 'complete' : t.status} />
                        </button>
                        <span className="dt-text">
                          <span className="dt-name">{t.title}</span>
                          {due && <span className={cn('dt-due', due.late && 'dt-due--late')}>{due.text}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {editable && (
                <form
                  className="dt-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void add();
                  }}
                >
                  <input
                    ref={inputRef}
                    className="rc-input"
                    placeholder="Add a task for this doc"
                    aria-label="Add a task for this doc"
                    value={draft}
                    aria-busy={adding || undefined}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </form>
              )}
              <p className="dt-foot">
                <Link href="/todo" className="dt-link">
                  All tasks
                </Link>
              </p>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </span>
    </div>
  );
}
