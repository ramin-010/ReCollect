import React from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { TaskInput } from '../task_Input';
import { activityLabel, activityIcon, formatDueDate, isOverdue } from './utils';
import { ActivityLogEntry } from './types';

interface OverviewTabProps {
  selectedWorkspace: any;
  workspaceMembers: any[];
  overdueTasks: any[];
  dueTodayTasks: any[];
  unassignedTasks: any[];
  needsAttentionTasks: any[];
  recentlyUpdatedTasks: any[];
  activity: ActivityLogEntry[];
  isDataLoading: boolean;
  overviewInputExpanded: boolean;
  setOverviewInputExpanded: (val: boolean) => void;
  handleTaskSaved: (task: any) => void;
  activeSpaceId: string | null;
  isViewer?: boolean;
}

export function OverviewTab({
  selectedWorkspace,
  workspaceMembers,
  overdueTasks,
  dueTodayTasks,
  unassignedTasks,
  needsAttentionTasks,
  recentlyUpdatedTasks,
  activity,
  isDataLoading,
  overviewInputExpanded,
  setOverviewInputExpanded,
  handleTaskSaved,
  activeSpaceId,
  isViewer
}: OverviewTabProps) {
  return (
    <div className="space-y-7">
      {/* Quick-add bar — always visible on Overview */}
      <div className='max-w-[800px] mx-auto'>
        {selectedWorkspace && !isViewer && (
          <TaskInput
            isExpanded={overviewInputExpanded}
            onExpandChange={setOverviewInputExpanded}
            workspaceId={selectedWorkspace._id}
            visibility="workspace"
            onSave={handleTaskSaved}
            workspaceMembers={workspaceMembers}
          />
        )}
      </div>

      {/* Actionable Stats: Overdue / Due Today / Unassigned */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Overdue',
            value: overdueTasks.length,
            hasValue: overdueTasks.length > 0,
            activeColor: 'text-rose-400',
            activeBorder: 'border-rose-500/15',
            emptyMsg: 'All caught up',
          },
          {
            label: 'Due Today',
            value: dueTodayTasks.length,
            hasValue: dueTodayTasks.length > 0,
            activeColor: 'text-amber-400',
            activeBorder: 'border-amber-500/15',
            emptyMsg: 'Nothing due',
          },
          {
            label: 'Unassigned',
            value: unassignedTasks.length,
            hasValue: unassignedTasks.length > 0,
            activeColor: 'text-sky-400',
            activeBorder: 'border-sky-500/15',
            emptyMsg: 'All assigned',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border px-4 py-3.5 transition-colors",
              s.hasValue
                ? cn("bg-[hsl(var(--muted))]/10", s.activeBorder)
                : "bg-[hsl(var(--muted))]/5 border-[hsl(var(--border))] opacity-60"
            )}
          >
            {s.hasValue ? (
              <>
                <p className={cn("text-2xl font-bold tracking-tight", s.activeColor)}>{s.value}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]/60 font-medium mt-0.5">{s.label}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-[hsl(var(--muted-foreground))]/40">–</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]/40 font-medium mt-0.5">{s.emptyMsg}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Two-column: Needs Attention + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Needs Attention */}
        <div>
          <h3 className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-amber-500/80" />
            Needs Attention
          </h3>
          {isDataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]/30" />
            </div>
          ) : needsAttentionTasks.length === 0 ? (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/5 py-10 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-xs text-[hsl(var(--muted-foreground))]/60">All clear — nothing needs attention</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/5 divide-y divide-[hsl(var(--border))] overflow-hidden">
              {needsAttentionTasks.map(task => (
                <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--muted))]/10 transition-colors">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isOverdue(task) ? "bg-rose-400" : "bg-amber-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[hsl(var(--foreground))]/80 truncate">{task.title}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60 mt-0.5">
                      {isOverdue(task) ? (
                        <span className="text-rose-500/80">Overdue · {formatDueDate(task.dueDate)}</span>
                      ) : (
                        <span className="text-amber-500/80">Unassigned</span>
                      )}
                    </p>
                  </div>
                  {task.priority === 'high' && (
                    <span className="text-[8px] font-bold text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">High</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Recent Activity (more breathing room) */}
        <div>
          <h3 className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Recent Activity</h3>
          {isDataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]/30" />
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/5 h-32 py-14 text-center flex item-center justify-center">
              <p className="text-xs text-[hsl(var(--muted-foreground))]/60">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activity.slice(0, 8).map((entry) => (
                <div key={entry._id} className="flex items-start gap-3 px-3 py-3.5 rounded-lg hover:bg-[hsl(var(--muted))]/10 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--muted))]/20 border border-[hsl(var(--border))] flex items-center justify-center shrink-0 mt-0.5">
                    {activityIcon(entry.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed">{activityLabel(entry)}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]/40 mt-1">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently Updated */}
      {recentlyUpdatedTasks.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Recently Updated</h3>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/5 divide-y divide-[hsl(var(--border))] overflow-hidden">
            {recentlyUpdatedTasks.map(task => (
              <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--muted))]/10 transition-colors">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  task.status === 'complete' ? "bg-emerald-500" :
                  task.status === 'in_progress' ? "bg-sky-500" :
                  "bg-[hsl(var(--border))]"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", task.status === 'complete' ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]/90")}>
                    {task.title}
                  </p>
                </div>
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-1.5 shrink-0">
                    {task.assignees.slice(0, 3).map((assignee: any) => (
                      <div key={assignee._id || assignee.email} className="w-5 h-5 rounded-full ring-2 ring-[hsl(var(--background))] bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))] flex items-center justify-center overflow-hidden" title={assignee.name}>
                        {assignee.avatar ? (
                          <img src={assignee.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-[hsl(var(--muted-foreground))]">{getInitials(assignee.name)}</span>
                        )}
                      </div>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="w-5 h-5 rounded-full ring-2 ring-[hsl(var(--background))] bg-[hsl(var(--muted))]/20 border border-[hsl(var(--border))] flex items-center justify-center text-[7px] font-bold text-[hsl(var(--muted-foreground))]">
                        +{task.assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]/40 whitespace-nowrap">
                  {formatDistanceToNow(new Date(task.updatedAt || task.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
