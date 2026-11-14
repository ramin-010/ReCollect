'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-base/Tabs';
import type { GroupedTask, TaskGroups } from '@/lib/learning/taskGroups';
import { LearningDialog } from './LearningDialog';
import { TaskRow } from './TaskRow';
import { lx } from './styles';

type TabKey = 'overdue' | 'today' | 'upcoming';

const TABS: { key: TabKey; label: string; active: string; dot: string }[] = [
  { key: 'overdue', label: 'Overdue', active: 'data-[state=active]:bg-[hsl(var(--destructive))]/15 data-[state=active]:text-[hsl(var(--destructive))]', dot: 'bg-[hsl(var(--destructive))]' },
  { key: 'today', label: 'Today', active: 'data-[state=active]:bg-[hsl(var(--primary))]/15 data-[state=active]:text-[hsl(var(--primary))]', dot: 'bg-[hsl(var(--primary))]' },
  { key: 'upcoming', label: 'Upcoming', active: 'data-[state=active]:bg-[hsl(var(--foreground))]/10 data-[state=active]:text-[hsl(var(--foreground))]', dot: 'bg-[hsl(var(--foreground))]/40' },
];

function Empty({ icon, iconBg, title, subtitle }: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', iconBg)}>{icon}</div>
      <p className={cn('text-[15px] font-semibold', lx.muted)}>{title}</p>
      <p className={cn('text-[12px] mt-1', lx.muted)}>{subtitle}</p>
    </div>
  );
}

/** Revise's "View All Tasks" modal: Overdue / Today / Upcoming tabs. */
export function AllTasksDialog({ isOpen, onClose, groups }: { isOpen: boolean; onClose: () => void; groups: TaskGroups }) {
  const [tab, setTab] = useState<TabKey>('today');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const lists: Record<TabKey, GroupedTask[]> = { overdue: groups.overdue, today: groups.today, upcoming: groups.upcoming };

  return (
    <LearningDialog isOpen={isOpen} onClose={onClose} width="max-w-[720px]" bodyClassName="p-0">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <div className="flex justify-between items-start px-6 pt-6 pb-4">
          <div>
            <p className={cn('text-[11px] font-semibold uppercase tracking-widest mb-1', lx.muted)}>Task Manager</p>
            <h2 className={cn('text-[22px] font-bold leading-tight', lx.fg)}>All Tasks</h2>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className={cn('flex items-center gap-4 text-[11px] font-semibold', lx.muted)}>
              {groups.overdue.length > 0 && <span className={lx.danger}>{groups.overdue.length} overdue</span>}
              <span>{groups.undoneCount} total</span>
            </div>
            <button onClick={onClose} className={cn('p-1.5 rounded-lg transition-all hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6">
          <TabsList className="gap-1 p-1 bg-[hsl(var(--background))] rounded-xl">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className={cn(
                  'flex-1 justify-center py-2 px-3 rounded-lg text-[12px] normal-case tracking-normal data-[state=active]:shadow-sm hover:bg-[var(--surface-raised)]',
                  t.active,
                )}
              >
                {tab === t.key && <span className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />}
                {t.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-[hsl(var(--foreground))]/[0.08]">{lists[t.key].length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-6 pt-2">
          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="flex flex-col gap-2 pb-8">
              {lists[t.key].length > 0 ? (
                lists[t.key].map((task) => (
                  <TaskRow key={task._id} task={task} variant={t.key} expanded={expanded.has(task._id)} onToggleExpand={() => toggle(task._id)} />
                ))
              ) : t.key === 'overdue' ? (
                <Empty icon={<CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]/60" />} iconBg="bg-[hsl(var(--success))]/10" title="All caught up!" subtitle="No overdue tasks. Great work." />
              ) : t.key === 'today' ? (
                <Empty icon={<CheckCircle2 className="w-6 h-6 text-[hsl(var(--primary))]/50" />} iconBg="bg-[hsl(var(--primary))]/10" title="Nothing due today" subtitle="Take a breath or plan ahead." />
              ) : (
                <Empty icon={<Calendar className={cn('w-6 h-6', lx.muted)} />} iconBg="bg-[hsl(var(--foreground))]/5" title="Schedule is clear" subtitle="No tasks planned ahead." />
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </LearningDialog>
  );
}
