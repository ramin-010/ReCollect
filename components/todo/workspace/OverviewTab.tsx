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
                ? cn("bg-white/[0.03]", s.activeBorder)
                : "bg-white/[0.02] border-white/[0.04] opacity-60"
            )}
          >
            {s.hasValue ? (
              <>
                <p className={cn("text-2xl font-bold tracking-tight", s.activeColor)}>{s.value}</p>
                <p className="text-[11px] text-white/30 font-medium mt-0.5">{s.label}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-white/25">–</p>
                <p className="text-[11px] text-white/20 font-medium mt-0.5">{s.emptyMsg}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Two-column: Needs Attention + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Needs Attention */}
        <div>
          <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-amber-400/50" />
            Needs Attention
          </h3>
          {isDataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-white/15" />
            </div>
          ) : needsAttentionTasks.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-10 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400/30 mx-auto mb-2" />
              <p className="text-xs text-white/20">All clear — nothing needs attention</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.03] overflow-hidden">
              {needsAttentionTasks.map(task => (
                <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isOverdue(task) ? "bg-rose-400" : "bg-amber-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60 truncate">{task.title}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">
                      {isOverdue(task) ? (
                        <span className="text-rose-400/60">Overdue · {formatDueDate(task.dueDate)}</span>
                      ) : (
                        <span className="text-amber-400/50">Unassigned</span>
                      )}
                    </p>
                  </div>
                  {task.priority === 'high' && (
                    <span className="text-[8px] font-bold text-rose-400/50 bg-rose-500/8 px-1.5 py-0.5 rounded uppercase">High</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Recent Activity (more breathing room) */}
        <div>
          <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3">Recent Activity</h3>
          {isDataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-white/15" />
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] h-32 py-14 text-center flex item-center justify-center">
              <p className="text-xs text-white/20">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activity.slice(0, 8).map((entry) => (
                <div key={entry._id} className="flex items-start gap-3 px-3 py-3.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    {activityIcon(entry.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/50 leading-relaxed">{activityLabel(entry)}</p>
                    <p className="text-[11px] text-white/15 mt-1">
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
          <h3 className="text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3">Recently Updated</h3>
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] divide-y divide-white/[0.03] overflow-hidden">
            {recentlyUpdatedTasks.map(task => (
              <div key={task._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  task.status === 'complete' ? "bg-emerald-400" :
                  task.status === 'in_progress' ? "bg-sky-400" :
                  "bg-white/15"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm truncate", task.status === 'complete' ? "text-white/25 line-through" : "text-white/60")}>
                    {task.title}
                  </p>
                </div>
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-1.5 shrink-0">
                    {task.assignees.slice(0, 3).map((assignee: any) => (
                      <div key={assignee._id || assignee.email} className="w-5 h-5 rounded-full ring-2 ring-[#0a0a0a] bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden" title={assignee.name}>
                        {assignee.avatar ? (
                          <img src={assignee.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-white/30">{getInitials(assignee.name)}</span>
                        )}
                      </div>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="w-5 h-5 rounded-full ring-2 ring-[#0a0a0a] bg-white/5 border border-white/10 flex items-center justify-center text-[7px] font-bold text-white/40">
                        +{task.assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-white/15 whitespace-nowrap">
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
