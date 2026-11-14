'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronRight, ExternalLink, Inbox, MoreHorizontal, Pencil, Target, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-base/Tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui-base/DropdownMenu';
import { AlertDialog } from '@/components/ui-base/Dialog';
import { useLearningStore } from '@/lib/store/learningStore';
import type { TaskGroups } from '@/lib/learning/taskGroups';
import type { Capture, TodayStats } from '@/lib/learning/types';
import { AttachmentThumbnails } from './AttachmentThumbnails';
import { AllTasksDialog } from './AllTasksDialog';
import { ProgressCard } from './ProgressCard';
import { TaskRow } from './TaskRow';
import { lx } from './styles';

type MainTab = 'today' | 'weekly' | 'inbox';

function CountBadge({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-sm normal-case tracking-normal font-bold border',
        active ? cn('bg-[hsl(var(--foreground))]/10', lx.fg, lx.border) : cn('bg-transparent border-transparent', lx.muted),
      )}
    >
      {value}
    </span>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl', lx.border, lx.muted)}>
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

function InboxRow({ item }: { item: Capture }) {
  const { openEditCapture, deleteCapture } = useLearningStore.getState();
  const [confirm, setConfirm] = useState(false);
  const title = item.title || item.content?.slice(0, 80) || item.url || 'Capture';
  return (
    <div className={cn('group px-4 py-3 transition-colors', lx.card, lx.hover)}>
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <p className={cn('text-[13px] font-medium leading-snug flex items-center gap-1.5', lx.fg90)}>
            <span className="truncate">{title}</span>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cn('shrink-0 hover:text-[hsl(var(--primary))]', lx.muted)} title={item.url}>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
          <AttachmentThumbnails attachments={item.attachments} fallbackTitle={title} />
          {item.category && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className={cn('text-[10px] font-medium mr-1.5', lx.muted)}>{item.category.replace('#', '')}</span>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn('opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md transition-all hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} aria-label="Inbox item actions">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px] rounded-xl">
            <DropdownMenuItem className="gap-3 px-3 py-2 text-[13px]" onClick={() => openEditCapture({ captureId: item._id, title: item.title ?? '', content: item.content ?? '' })}>
              <Pencil className="w-[15px] h-[15px]" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2 text-[13px]" destructive onClick={() => setConfirm(true)}>
              <Trash2 className="w-[15px] h-[15px]" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this capture?"
        description="This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirm(false);
          void deleteCapture(item._id);
        }}
      />
    </div>
  );
}

/**
 * Revise TasksSidebar: [Due Today | Upcoming] [Weekly] [Inbox] tabs + "All" → All Tasks dialog,
 * then the Progress card (desktop only; mobile shows it under Quick Notes).
 */
export function TasksPanel({ groups, inbox, stats }: { groups: TaskGroups; inbox: { count: number; items: Capture[] }; stats: TodayStats }) {
  const [tab, setTab] = useState<MainTab>('today');
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const first = groups.firstTab;

  return (
    <div className="flex flex-col space-y-8">
      <section className="mb-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
          <div className="flex justify-between items-center h-8 mb-4">
            <TabsList className="gap-4 md:gap-6 transform scale-[0.85] origin-left overflow-x-auto custom-scrollbar pr-4">
              <TabsTrigger value="today">
                {first.title}
                <CountBadge value={first.tasks.length} active={tab === 'today'} />
              </TabsTrigger>
              <TabsTrigger value="weekly">
                Weekly
                <CountBadge value={groups.weekly.length} active={tab === 'weekly'} />
              </TabsTrigger>
              <TabsTrigger value="inbox">
                Inbox
                <CountBadge value={inbox.count} active={tab === 'inbox'} />
              </TabsTrigger>
            </TabsList>
            {tab === 'today' && (
              <button
                onClick={() => setIsAllOpen(true)}
                className={cn('flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors transform scale-[0.85] origin-right hover:text-[hsl(var(--foreground))]', lx.muted)}
              >
                All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <TabsContent value="today" className="flex flex-col gap-2">
            {first.tasks.length > 0 ? (
              first.tasks.map((task) => <TaskRow key={task._id} task={task} expanded={expanded.has(task._id)} onToggleExpand={() => toggle(task._id)} />)
            ) : (
              <EmptyCard icon={<CheckCircle2 className="w-8 h-8 mb-3 opacity-20" />} text="All caught up!" />
            )}
          </TabsContent>

          <TabsContent value="weekly" className="flex flex-col gap-2">
            {groups.weekly.length > 0 ? (
              groups.weekly.map((task) => <TaskRow key={task._id} task={task} expanded={expanded.has(task._id)} onToggleExpand={() => toggle(task._id)} />)
            ) : (
              <EmptyCard icon={<Target className="w-8 h-8 mb-3 opacity-20" />} text="No weekly goals set." />
            )}
          </TabsContent>

          <TabsContent value="inbox" className="flex flex-col gap-2">
            {inbox.items.length > 0 ? (
              inbox.items.slice(0, 5).map((item) => <InboxRow key={item._id} item={item} />)
            ) : (
              <EmptyCard icon={<Inbox className="w-8 h-8 mb-3 opacity-20" />} text="Inbox is empty." />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <ProgressCard stats={stats} inboxCount={inbox.count} className="hidden lg:block" />

      <AllTasksDialog isOpen={isAllOpen} onClose={() => setIsAllOpen(false)} groups={groups} />
    </div>
  );
}
