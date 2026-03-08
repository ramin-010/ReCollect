import React from 'react';
import {
  Plus,
  Briefcase,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  LogOut,
  CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityLogEntry } from '@/lib/api/workspaceApi';
import { parseISO, isToday, isPast, format } from 'date-fns';

export function activityLabel(entry: ActivityLogEntry): string {
  const actor = entry.actor?.name || 'Someone';
  const target = entry.targetUser?.name || '';
  switch (entry.action) {
    case 'workspace_created': return `${actor} created this workspace`;
    case 'member_joined': return `${actor} added ${target}`;
    case 'member_removed': return `${actor} removed ${target}`;
    case 'task_created': return `${actor} created "${entry.metadata}"`;
    case 'task_completed': return `${actor} completed "${entry.metadata}"`;
    case 'task_assigned': return `${actor} assigned "${entry.metadata}" to ${target}`;
    case 'task_status_changed': return `${actor} changed status: ${entry.metadata}`;
    default: return `${actor} performed an action`;
  }
}

export function activityIcon(action: ActivityLogEntry['action']) {
  const base = "w-3.5 h-3.5";
  switch (action) {
    case 'task_created': return <Plus className={cn(base, "text-emerald-400")} />;
    case 'task_completed': return <CheckCircle2 className={cn(base, "text-emerald-400")} />;
    case 'task_assigned': return <UserPlus className={cn(base, "text-sky-400")} />;
    case 'task_status_changed': return <ArrowRight className={cn(base, "text-amber-400")} />;
    case 'member_joined': return <UserPlus className={cn(base, "text-indigo-400")} />;
    case 'member_removed': return <LogOut className={cn(base, "text-rose-400")} />;
    case 'workspace_created': return <Briefcase className={cn(base, "text-indigo-400")} />;
    default: return <CircleDot className={cn(base, "text-white/40")} />;
  }
}

export function formatDueDate(dateStr: string | undefined) {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    return format(d, 'MMM d');
  } catch { return null; }
}

export function isOverdue(task: any): boolean {
  if (!task.dueDate || task.status === 'complete') return false;
  try {
    const d = parseISO(task.dueDate);
    return isPast(d) && !isToday(d);
  } catch { return false; }
}

export function isDueToday(task: any): boolean {
  if (!task.dueDate || task.status === 'complete') return false;
  try { return isToday(parseISO(task.dueDate)); } catch { return false; }
}

export function getPriorityTextConfig(priority: string | undefined | null) {
  if (!priority) return 'text-white/10';
  switch (priority) {
    case 'urgent': 
    case 'high': return 'text-rose-400/80';
    case 'medium': return 'text-amber-400/70';
    case 'low': return 'text-blue-400/70';
    default: return 'text-white/10';
  }
}
