'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  Coffee,
  FastForward,
  Lock,
  Minus,
  Plus,
  Play,
  Timer,
  Unlock,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addBlock,
  createCustomBlock,
  dayManagerRows,
  dayManagerSummary,
  deleteSlot,
  editEndTime,
  editStartTime,
  fillGap,
  format12h,
  initDayManager,
  isPastStatus,
  minutesToTime,
  moveSlot,
  newSlotId,
  pushDelay,
  setDayStart,
  setDuration,
  stampActualTimes,
  stepDuration,
  timeToMinutes,
  togglePin,
  toSaveUpdates,
  updateSlot,
  type ActualTimes,
  type DayManagerSlot,
  type DayManagerState,
  type SlotStatus,
} from '@/lib/learning/engine';
import { formatDay, nowMinutes } from '@/lib/learning/dates';
import { useLearningStore } from '@/lib/store/learningStore';
import type { DayString, Slot } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { SortableSlotList } from './dayManager/SortableSlotList';
import { lx } from './styles';

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#14b8a6', '#6366f1', '#6b7280'];
const PRESETS = [
  { label: '15m', min: 15 },
  { label: '30m', min: 30 },
  { label: '45m', min: 45 },
  { label: '1h', min: 60 },
  { label: '1.5h', min: 90 },
  { label: '2h', min: 120 },
  { label: '3h', min: 180 },
];

const statusBtn = (active: boolean, activeCls: string, size = 'p-1') =>
  cn(size, 'rounded-md transition-colors', active ? activeCls : cn(lx.muted, 'hover:text-[hsl(var(--foreground))]', lx.hover));

/**
 * Status toggle. Revise only had Unmarked / Done / Skipped; the spec adds Start (ACTIVE) and
 * Partial so ACTIVE/PARTIAL and the actual times finally get set (stamped by the server).
 */
function StatusToggle({ status, onChange, withStart, compact }: { status: SlotStatus; onChange: (s: SlotStatus) => void; withStart: boolean; compact?: boolean }) {
  const icon = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const size = compact ? 'p-1' : 'p-1.5';
  return (
    <div className={cn('flex rounded-lg p-0.5 border gap-0.5 shrink-0 bg-[hsl(var(--background))]/50', lx.border)}>
      <button onClick={() => onChange('UPCOMING')} className={statusBtn(status === 'UPCOMING', 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]', size)} title="Unmarked">
        <CircleDashed className={icon} />
      </button>
      {withStart && (
        <button onClick={() => onChange('ACTIVE')} className={statusBtn(status === 'ACTIVE', 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]', size)} title="Start (in progress)">
          <Play className={icon} />
        </button>
      )}
      <button onClick={() => onChange('COMPLETED')} className={statusBtn(status === 'COMPLETED', 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]', size)} title="Completed">
        <CheckCircle2 className={icon} />
      </button>
      <button onClick={() => onChange('PARTIAL')} className={statusBtn(status === 'PARTIAL', 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', size)} title="Partially done">
        <CircleDot className={icon} />
      </button>
      <button onClick={() => onChange('SKIPPED')} className={statusBtn(status === 'SKIPPED', 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]', size)} title="Skipped">
        <XCircle className={icon} />
      </button>
    </div>
  );
}

/** The actual start / end the save will record (engine stampActualTimes, as the server does). */
function ActualTimesBadge({ actual }: { actual: ActualTimes | null }) {
  if (!actual?.actualStartTime) return null;
  return (
    <span className="text-[9px] font-medium text-[hsl(var(--primary))]/80 bg-[hsl(var(--primary))]/10 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5" title="Actual times">
      <Play className="w-2.5 h-2.5 inline" />
      {format12h(actual.actualStartTime, false)}
      {actual.actualEndTime ? ` – ${format12h(actual.actualEndTime, false)}` : ' (started)'}
    </span>
  );
}

function PastBlockItem({ slot, actual, onStatus, onRemark }: { slot: DayManagerSlot; actual: ActualTimes | null; onStatus: (s: SlotStatus) => void; onRemark: (r: string) => void }) {
  return (
    <div className={cn('rounded-xl p-3 flex flex-col gap-3 mb-1', lx.inset)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full">
          <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold truncate', lx.fg)}>{slot.title}</h4>
            <div className={cn('flex items-center gap-1.5 text-xs mt-0.5', lx.muted)}>
              <Clock className="w-3 h-3" />
              <span>
                {format12h(slot.startTime)} - {format12h(slot.endTime)}
              </span>
              <ActualTimesBadge actual={actual} />
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0 pl-5 sm:pl-0">
          <StatusToggle status={slot.status} onChange={onStatus} withStart={false} />
        </div>
      </div>
      <div className="pl-5">
        <input
          type="text"
          placeholder="Why did it go this way? (optional)"
          value={slot.remark ?? ''}
          onChange={(e) => onRemark(e.target.value)}
          className={cn(
            'w-full bg-transparent border-b px-1 py-1.5 text-[13px] outline-none transition-colors focus:border-[hsl(var(--primary))]/60 placeholder:text-[hsl(var(--muted-foreground))]/70',
            lx.fg,
            slot.remark ? 'border-[var(--border-subtle)]' : 'border-transparent hover:border-[var(--border-subtle)]',
          )}
        />
      </div>
    </div>
  );
}

function NowDivider({ timezone }: { timezone: string }) {
  const [label, setLabel] = useState(() => format12h(minutesToTime(nowMinutes(timezone)), false));
  useEffect(() => {
    const id = setInterval(() => setLabel(format12h(minutesToTime(nowMinutes(timezone)), false)), 30_000);
    return () => clearInterval(id);
  }, [timezone]);
  return (
    <div className="flex items-center gap-3 py-3 px-2 my-1">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))]/30 to-transparent" />
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/15">
        <Timer className="w-3 h-3 text-[hsl(var(--primary))]/70" />
        <span className="text-[11px] font-semibold text-[hsl(var(--primary))]/70 tracking-wide">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))]/30 to-transparent" />
    </div>
  );
}

function GapRow({ startMin, endMin, onFill }: { startMin: number; endMin: number; onFill: () => void }) {
  const dur = endMin - startMin;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const label = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  return (
    <button
      onClick={onFill}
      className={cn('group w-full flex items-center gap-3 p-2.5 rounded-xl border border-dashed transition-all my-1 outline-none hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--primary))]/5', lx.border)}
    >
      <div className="w-6 flex items-center justify-center">
        <Plus className={cn('w-3.5 h-3.5 group-hover:text-[hsl(var(--primary))] transition-colors', lx.muted)} />
      </div>
      <span className={cn('text-xs font-medium', lx.muted)}>{label} free</span>
      <span className={cn('text-[10px] font-mono', lx.muted)}>
        {format12h(minutesToTime(startMin))} – {format12h(minutesToTime(endMin))}
      </span>
      <span className="ml-auto text-[10px] font-semibold text-transparent group-hover:text-[hsl(var(--primary))] transition-colors">+ Fill</span>
    </button>
  );
}

interface EditableRowProps {
  slot: DayManagerSlot;
  handle: React.ReactNode;
  hasOverlap: boolean;
  actual: ActualTimes | null;
  dispatch: (fn: (s: DayManagerState) => DayManagerState) => void;
}

function EditableRow({ slot, handle, hasOverlap, actual, dispatch }: EditableRowProps) {
  const isActive = slot.status === 'ACTIVE';
  const isBreak = slot.title.toLowerCase().includes('break');
  const timeInput = 'bg-transparent text-[11px] font-mono outline-none rounded px-1 cursor-pointer transition-colors hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)]';

  return (
    <div
      className={cn(
        'group flex flex-col p-2 rounded-xl border mb-1 transition-all',
        isActive ? 'border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5' : 'border-transparent hover:bg-[var(--surface-raised)]',
        hasOverlap && '!border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full">
          {isActive ? (
            <div className="w-6 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            </div>
          ) : (
            <div className="w-6 flex items-center justify-center shrink-0">{handle}</div>
          )}
          <button
            onClick={() => {
              const idx = PRESET_COLORS.indexOf(slot.color);
              dispatch((s) => updateSlot(s, slot.id, { color: PRESET_COLORS[(idx + 1) % PRESET_COLORS.length] }));
            }}
            className="w-2 h-10 rounded-full shrink-0 transition-transform active:scale-90 cursor-pointer"
            style={{ backgroundColor: slot.color }}
            title="Click to change color"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 py-0.5">
            <input
              value={slot.title}
              onChange={(e) => dispatch((s) => updateSlot(s, slot.id, { title: e.target.value }))}
              placeholder="Block Title"
              className={cn('bg-transparent outline-none w-full text-sm font-semibold transition-colors truncate focus:text-[hsl(var(--primary))]', isBreak ? lx.muted : lx.fg90)}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Uncontrolled + keyed: typing stays local, the engine applies it on blur, a recalculation remounts it. */}
              <input
                key={`s-${slot.startTime}`}
                type="time"
                defaultValue={slot.startTime}
                onBlur={(e) => dispatch((s) => editStartTime(s, slot.id, e.target.value))}
                className={cn(timeInput, slot.isPinned ? 'text-[hsl(var(--warning))] font-semibold' : cn(lx.muted, 'hover:text-[hsl(var(--foreground))]'))}
                title="Set start time (pins the block)"
              />
              <span className={cn('text-[11px] font-mono', lx.muted)}>–</span>
              <input
                key={`e-${slot.endTime}`}
                type="time"
                defaultValue={slot.endTime}
                onBlur={(e) => dispatch((s) => editEndTime(s, slot.id, e.target.value))}
                className={cn(timeInput, lx.muted, 'hover:text-[hsl(var(--foreground))]')}
                title="Set end time (adjusts the duration)"
              />
              {slot.isPinned && (
                <span className="text-[9px] font-medium text-[hsl(var(--warning))]/80 bg-[hsl(var(--warning))]/10 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 inline" /> Pinned
                </span>
              )}
              <ActualTimesBadge actual={actual} />
              {hasOverlap && <span className="text-[9px] font-semibold text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 px-1.5 py-0.5 rounded-full leading-none">OVERLAP</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-[2.25rem] sm:pl-0 sm:pr-1 sm:opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          {!isActive && (
            <button
              onClick={() => dispatch((s) => togglePin(s, slot.id))}
              className={cn('p-1.5 rounded-lg transition-colors outline-none shrink-0', slot.isPinned ? 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10' : cn(lx.muted, lx.hover))}
              title={slot.isPinned ? 'Unpin (allow cascading)' : 'Pin at this time'}
            >
              {slot.isPinned ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          )}
          <div className="flex items-center bg-[hsl(var(--background))]/50 rounded-lg px-1 py-0.5 shrink-0">
            <button onClick={() => dispatch((s) => stepDuration(s, slot.id, -1))} className={cn('p-1 transition-colors hover:text-[hsl(var(--primary))]', lx.muted)} aria-label="15 minutes shorter">
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={slot.durationMin || ''}
              onChange={(e) => dispatch((s) => setDuration(s, slot.id, e.target.value))}
              className="lx-hide-arrows w-8 bg-transparent text-xs font-mono text-center outline-none text-[hsl(var(--foreground))]/70"
              aria-label="Duration in minutes"
            />
            <span className={cn('text-[10px] font-mono pr-0.5', lx.muted)}>m</span>
            <button onClick={() => dispatch((s) => stepDuration(s, slot.id, 1))} className={cn('p-1 transition-colors hover:text-[hsl(var(--primary))]', lx.muted)} aria-label="15 minutes longer">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className={cn('hidden sm:block w-px h-4 shrink-0', lx.divider)} />
          <StatusToggle status={slot.status} onChange={(status) => dispatch((s) => updateSlot(s, slot.id, { status }))} withStart compact />
          <button
            onClick={() => dispatch((s) => deleteSlot(s, slot.id))}
            className={cn('p-1 rounded-lg transition-colors outline-none shrink-0 ml-auto sm:ml-1 hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))]', lx.muted)}
            title="Remove block"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="w-full pl-[2.25rem] pr-2 pt-1">
        <input
          type="text"
          placeholder="Add a note…"
          value={slot.remark ?? ''}
          onChange={(e) => dispatch((s) => updateSlot(s, slot.id, { remark: e.target.value }))}
          className={cn(
            'w-full bg-transparent border-b px-1 py-1 text-xs outline-none transition-colors focus:border-[hsl(var(--primary))]/60 placeholder:text-[hsl(var(--muted-foreground))]/60',
            lx.fg,
            slot.remark ? 'border-[var(--border-subtle)]' : 'border-transparent hover:border-[var(--border-subtle)]',
          )}
        />
      </div>
    </div>
  );
}

/**
 * Revise DayManagerModal on the engine's pure handlers (lib/learning/engine/dayManager):
 * past blocks under "Earlier", the now divider, editable future blocks with gaps / overlaps /
 * pins / ± duration, custom block + 15m break, Delay +30m (pushes the rest of the day back) /
 * Insert 30m Break, Apply. Shows the actual start / end times the save will stamp.
 */
interface DayManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slots: Slot[];
  today: DayString;
  timezone: string;
}

export function DayManagerDialog(props: DayManagerDialogProps) {
  // Mounts per open: the local plan starts from today's slots each time (Revise's open effect).
  if (!props.isOpen) return null;
  return <DayManagerBody {...props} />;
}

function DayManagerBody({ isOpen, onClose, slots, today, timezone }: DayManagerDialogProps) {
  const saveSchedule = useLearningStore((s) => s.saveSchedule);
  const [state, setState] = useState<DayManagerState>(() =>
    initDayManager(
      slots.map((s) => ({ id: s._id, title: s.title, color: s.color, startTime: s.startTime, endTime: s.endTime, status: s.status, sortOrder: s.sortOrder, remark: s.remark })),
      nowMinutes(timezone),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newDuration, setNewDuration] = useState(60);

  const dispatch = (fn: (s: DayManagerState) => DayManagerState) => setState((s) => fn(s));

  const pastSlots = useMemo(() => state.slots.filter((s) => isPastStatus(s.status)).sort((a, b) => a.sortOrder - b.sortOrder), [state.slots]);
  const rows = useMemo(() => dayManagerRows(state), [state]);
  const summary = useMemo(() => dayManagerSummary(state), [state]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.slot.id, r])), [rows]);
  const lockedIds = useMemo(() => new Set(rows.filter((r) => r.slot.status === 'ACTIVE').map((r) => r.slot.id)), [rows]);
  const hasPast = pastSlots.length > 0;
  const hasFuture = rows.length > 0;
  const originalById = useMemo(() => new Map(slots.map((s) => [s._id, s])), [slots]);
  /** What the save will stamp for this block (the server runs the same stampActualTimes). New blocks: none. */
  const actualFor = (slot: DayManagerSlot): ActualTimes | null => {
    const original = originalById.get(slot.id);
    return original ? stampActualTimes(original, { status: slot.status }, minutesToTime(nowMinutes(timezone))) : null;
  };
  const fh = Math.floor(summary.futureDurationMin / 60);
  const fm = summary.futureDurationMin % 60;

  const endOfLastFuture = () => {
    const last = rows[rows.length - 1];
    return last ? timeToMinutes(last.slot.endTime) : state.dayStartMin;
  };

  const addCustom = () => {
    dispatch((s) => createCustomBlock(s, { title: newTitle || 'New Block', startTime: newStart || '09:00', durationMin: newDuration }, newSlotId()));
    setIsCreating(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await saveSchedule(
      toSaveUpdates(state.slots, nowMinutes(timezone)).map((u) => ({
        _id: u.id,
        title: u.title,
        color: u.color,
        startTime: u.startTime,
        endTime: u.endTime,
        status: u.status,
        sortOrder: u.sortOrder,
        remark: u.remark?.trim() ? u.remark : null,
        // minutesDone omitted: the server keeps the stored value (the debrief records minutes).
      })),
    );
    setIsSaving(false);
    if (ok) onClose();
  };

  return (
    <LearningDialog isOpen={isOpen} onClose={onClose} busy={isSaving} width="max-w-2xl" bodyClassName="p-0">
      <div className="flex flex-col max-h-[85vh]">
        <div className="px-6 pt-6 pb-2 flex items-start justify-between shrink-0">
          <div>
            <h2 className={cn('text-lg font-semibold leading-tight', lx.fg)}>Day Manager</h2>
            <p className={cn('text-xs mt-0.5', lx.muted)}>{formatDay(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className={cn('p-2 rounded-full transition-colors disabled:opacity-50 hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!summary.hasActiveBlock && hasFuture && (
              <div className="flex items-center gap-2">
                <Clock className={cn('w-3.5 h-3.5', lx.muted)} />
                <span className={cn('text-sm font-medium', lx.muted)}>Resume at</span>
                <input
                  type="time"
                  value={minutesToTime(state.dayStartMin)}
                  onChange={(e) => dispatch((s) => setDayStart(s, e.target.value))}
                  className={cn('bg-transparent rounded-md px-1.5 py-1 text-sm font-mono outline-none transition-colors cursor-pointer hover:bg-[var(--surface-raised)]', lx.primaryText)}
                />
              </div>
            )}
            {summary.hasActiveBlock && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                <span className={cn('text-sm font-medium', lx.muted)}>In progress</span>
              </div>
            )}
          </div>
          <div className={cn('flex items-center gap-2 text-sm font-medium', lx.muted)}>
            <span>{summary.remaining} remaining</span>
            {summary.futureDurationMin > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--muted-foreground))]/50" />
                <span className="font-mono text-[13px]">
                  {fh}h{fm > 0 ? ` ${fm}m` : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-3 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {hasPast && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className={cn('text-[10px] font-semibold uppercase tracking-widest', lx.muted)}>Earlier</span>
                <div className={cn('h-px flex-1', lx.divider)} />
              </div>
              {pastSlots.map((slot) => (
                <PastBlockItem
                  key={slot.id}
                  slot={slot}
                  actual={actualFor(slot)}
                  onStatus={(status) => dispatch((s) => updateSlot(s, slot.id, { status }))}
                  onRemark={(remark) => dispatch((s) => updateSlot(s, slot.id, { remark }))}
                />
              ))}
            </div>
          )}

          {hasPast && hasFuture && <NowDivider timezone={timezone} />}

          {hasFuture && (
            <SortableSlotList
              ids={rows.map((r) => r.slot.id)}
              lockedIds={lockedIds}
              onMove={(activeId, overId) => dispatch((s) => moveSlot(s, activeId, overId))}
              renderRow={(id, handle) => {
                const row = rowById.get(id)!;
                return {
                  before: row.gapBefore ? (
                    <GapRow startMin={row.gapBefore.startMin} endMin={row.gapBefore.endMin} onFill={() => dispatch((s) => fillGap(s, row.index, row.gapBefore!.startMin, row.gapBefore!.endMin, newSlotId()))} />
                  ) : undefined,
                  row: <EditableRow slot={row.slot} handle={handle} hasOverlap={row.overlapsPrevious} actual={actualFor(row.slot)} dispatch={dispatch} />,
                };
              }}
            />
          )}

          {!hasFuture && hasPast && (
            <div className="text-center py-8">
              <p className={cn('text-sm font-medium', lx.muted)}>All blocks completed for today 🎉</p>
              <p className={cn('text-xs mt-1', lx.muted)}>Add new blocks below if needed</p>
            </div>
          )}

          {isCreating ? (
            <div className="mt-4 p-4 rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5">
              <div className="flex items-center justify-between mb-3">
                <span className={cn('text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5', lx.primaryText)}>
                  <Plus className="w-3.5 h-3.5" /> Create Custom Block
                </span>
                <button onClick={() => setIsCreating(false)} className={cn('p-1 rounded-lg transition-colors hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} aria-label="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Block Title (e.g. System Design, Gym, Deep Work...)"
                className={cn(lx.input, 'rounded-lg font-medium mb-3')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustom();
                }}
              />
              <div className="flex items-center gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-medium', lx.muted)}>Start:</span>
                  <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={cn('rounded-lg px-2 py-1 text-xs font-mono outline-none cursor-pointer', lx.inset, lx.primaryText)} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-medium', lx.muted)}>End:</span>
                  <input
                    type="time"
                    value={minutesToTime(timeToMinutes(newStart || '09:00') + newDuration)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const s = timeToMinutes(newStart || '09:00');
                      let en = timeToMinutes(e.target.value);
                      if (en <= s) en += 24 * 60;
                      setNewDuration(Math.max(15, en - s));
                    }}
                    className={cn('rounded-lg px-2 py-1 text-xs font-mono outline-none cursor-pointer', lx.inset, lx.fg)}
                  />
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className={cn('text-xs font-medium', lx.muted)}>Duration:</span>
                  <input
                    type="number"
                    value={newDuration || ''}
                    onChange={(e) => setNewDuration(Math.max(5, parseInt(e.target.value) || 5))}
                    className={cn('lx-hide-arrows w-14 rounded-lg px-2 py-1 text-xs font-mono text-center outline-none', lx.inset, lx.fg)}
                  />
                  <span className={cn('text-xs font-mono', lx.muted)}>m</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <span className={cn('text-[11px] font-medium mr-1', lx.muted)}>Quick Presets:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setNewDuration(p.min)}
                    className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border', newDuration === p.min ? cn(lx.primaryBg, 'border-transparent') : cn('bg-[hsl(var(--background))]', lx.border, lx.muted, lx.hover))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCreating(false)} className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-colors hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}>
                  Cancel
                </button>
                <button onClick={addCustom} className={cn('px-5 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm', lx.primaryBg)}>
                  Add to Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setNewStart(minutesToTime(endOfLastFuture()));
                  setNewTitle('');
                  setNewDuration(60);
                  setIsCreating(true);
                }}
                className={cn('flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed transition-colors hover:border-[hsl(var(--primary))]/40', lx.border, 'text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))]', lx.hover)}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Custom Block</span>
              </button>
              <button
                onClick={() => dispatch((s) => addBlock(s, true, newSlotId()))}
                className={cn('px-5 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed transition-colors hover:text-[hsl(var(--foreground))]/70', lx.border, lx.muted, lx.hover)}
              >
                <Coffee className="w-4 h-4" />
                <span className="text-sm font-medium">15m Break</span>
              </button>
            </div>
          )}
        </div>

        <div className={cn('px-6 py-5 shrink-0 flex items-center justify-between border-t', lx.border)}>
          <div className="flex items-center gap-2">
            {summary.delayAction && (
              <button
                onClick={() => dispatch((s) => pushDelay(s, newSlotId('new-break')))}
                disabled={isSaving}
                title={summary.delayAction === 'insert-break' ? 'Insert a 30-minute break after the block in progress' : 'Push the rest of the day back 30 minutes (durations and gaps kept, pinned blocks stay)'}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}
              >
                <FastForward className="w-3.5 h-3.5" />
                {summary.delayAction === 'insert-break' ? 'Insert 30m Break' : 'Delay +30m'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isSaving} className={cn('px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 text-[hsl(var(--foreground))]/70 hover:text-[hsl(var(--foreground))]', lx.hover)}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className={cn('px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50', lx.primaryBg)}>
              {isSaving ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
      <style>{`.lx-hide-arrows::-webkit-inner-spin-button,.lx-hide-arrows::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.lx-hide-arrows{-moz-appearance:textfield}`}</style>
    </LearningDialog>
  );
}
