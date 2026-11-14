'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PersonalTaskDetailModal } from '@/components/todo/PersonalTaskDetailModal';
import { isLearningMock } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { groupTasks } from '@/lib/learning/taskGroups';
import type { TodayPayload } from '@/lib/learning/types';
import { RcSkel, rcScope } from '@/components/rc-ui';
import { AiExportDialog } from '../AiExportDialog';
import { AttachmentPreviewDialog } from '../AttachmentPreviewDialog';
import { CreateSubjectDialog } from '../CreateSubjectDialog';
import { EditCaptureDialog } from '../EditCaptureDialog';
import { RescheduleDialog } from '../RescheduleDialog';
import { WeeklyReviewDialog } from '../WeeklyReviewDialog';
import { DayHeader } from './DayHeader';
import { FocusLines } from './FocusLines';
import { FromAgent } from './FromAgent';
import { CoachSheet } from './CoachSheet';
import { MessageSquareText } from 'lucide-react';
import { GoalSheet } from './GoalSheet';
import { GoalsRail } from './GoalsRail';
import { AllNotesSheet, PocketRail } from './Pocket';
import { RoutinePanel } from './RoutinePanel';
import { SettingsSheet } from './SettingsSheet';
import { TasksToday } from './TasksToday';
import { TodaySlip } from './TodaySlip';
import { openCapturePalette } from './parts';

/** The page frame: centred, never edge to edge (max 1160, 1200 on wide screens). */
export const pageFrame = 'mx-auto w-full max-w-[1160px] min-[1600px]:max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';
const columns = 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] min-[1600px]:grid-cols-[minmax(0,1fr)_360px] gap-x-10 gap-y-9 items-start';

/**
 * Home / Today (PRODUCT.md): see today's few revisions and focus lines, do them, leave; glance at
 * goal pace and the pinned pocket. One hero (the slip), a light Focus under it, Tasks only when
 * something is due, and a compact rail. Nothing opens by itself.
 */
export function TodayHome({ data }: { data: TodayPayload }) {
  const settings = useLearningStore((s) => s.settings);
  const taskDetail = useLearningStore((s) => s.taskDetail);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocusBudget, setSettingsFocusBudget] = useState(false);
  const openSettings = (budget = false) => {
    setSettingsFocusBudget(budget);
    setSettingsOpen(true);
  };
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; goalId: string | null }>({ open: false, goalId: null });
  const [notesOpen, setNotesOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const groups = useMemo(() => groupTasks(data.tasks, data.today, data.timezone), [data.tasks, data.today, data.timezone]);
  const retry = () => void useLearningStore.getState().refresh();
  const reviewCount = data.weeklyReview.isReviewDay ? data.weeklyReview.goals.length : 0;

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={pageFrame}>
        <DayHeader
          today={data.today}
          plan={data.plan}
          settings={settings}
          rhythm={data.stats.rhythm ?? null}
          onOpenSettings={() => openSettings()}
          onEndBusy={() => void useLearningStore.getState().updateSettings({ busyUntil: null })}
          onCapture={openCapturePalette}
        />

        {data.schedule && (
          <div className="mt-9">
            <RoutinePanel data={data} today={data.today} />
          </div>
        )}

        <div className={cn(columns, 'mt-7 lg:mt-8')}>
          <div className="flex min-w-0 flex-col gap-9">
            <TodaySlip
              plan={data.plan}
              today={data.today}
              firstRun={data.stats.totalTopics === 0 && data.revisions.doneToday.length === 0 && (data.plan?.doneToday.length ?? 0) === 0}
              onRetry={retry}
              onOpenSettings={() => openSettings(true)}
            />
            <FromAgent />
            <FocusLines focus={data.focus} onRetry={retry} />
            <TasksToday groups={groups} today={data.today} timezone={data.timezone} reviewCount={reviewCount} onPlanWeek={() => setReviewOpen(true)} />
          </div>
          <aside className="flex min-w-0 flex-col gap-9" aria-label="Goals and pocket">
            <div>
              <GoalsRail
                goals={data.goals}
                today={data.today}
                onRetry={retry}
                onCreate={() => setGoalSheet({ open: true, goalId: null })}
                onEdit={(goalId) => setGoalSheet({ open: true, goalId })}
              />
              <button
                type="button"
                onClick={() => setCoachOpen(true)}
                className="rc-row rc-hoverable mt-2 flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left"
              >
                <MessageSquareText className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
                <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">Your week</span>
                <span className="rc-meta">a look back from the coach</span>
              </button>
            </div>
            <PocketRail notes={data.quickNotes} onOpenAll={() => setNotesOpen(true)} />
          </aside>
        </div>
        {isLearningMock && <p className="mt-12 text-center text-[12px] font-[600] text-[var(--rc-ink-3)]">Mock data (NEXT_PUBLIC_LEARNING_MOCK=1)</p>}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        today={data.today}
        focusBudget={settingsFocusBudget}
        onNewSubject={() => {
          setSettingsOpen(false);
          setSubjectOpen(true);
        }}
        onExport={() => {
          setSettingsOpen(false);
          setExportOpen(true);
        }}
      />
      <CoachSheet open={coachOpen} onOpenChange={setCoachOpen} />
      <GoalSheet open={goalSheet.open} goalId={goalSheet.goalId} today={data.today} onOpenChange={(open) => setGoalSheet((g) => ({ ...g, open }))} />
      <AllNotesSheet open={notesOpen} onOpenChange={setNotesOpen} notes={data.quickNotes} inbox={data.inbox} today={data.today} timezone={data.timezone} />
      <WeeklyReviewDialog review={data.weeklyReview} isOpen={reviewOpen} onClose={() => setReviewOpen(false)} />
      <CreateSubjectDialog isOpen={subjectOpen} onClose={() => setSubjectOpen(false)} />
      <AiExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} today={data.today} />
      <RescheduleDialog today={data.today} timezone={data.timezone} />
      <EditCaptureDialog />
      <AttachmentPreviewDialog />
      <PersonalTaskDetailModal
        task={taskDetail}
        isOpen={!!taskDetail}
        onClose={() => useLearningStore.getState().openTaskDetail(null)}
        onUpdateTask={async (id, updates) => useLearningStore.getState().syncTask(id, updates)}
      />


    </div>
  );
}

/** Loading: the same frame and blocks as the page, so nothing jumps when data lands. */
export function HomeSkeleton() {
  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')} aria-busy aria-label="Loading your day">
      <div className={pageFrame}>
        <RcSkel className="h-[34px] w-[min(320px,80%)] rounded-[8px]" />
        <RcSkel className="mt-3 h-[18px] w-[min(380px,90%)]" />
        <div className={cn(columns, 'mt-7 lg:mt-8')}>
          <div className="flex min-w-0 flex-col gap-9">
            <div className="rc-card overflow-hidden">
              <div className="px-4 pt-3 pb-3">
                <RcSkel className="h-4 w-32" />
                <RcSkel className="mt-2.5 h-[6px] w-full rounded-full" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 border-t border-[var(--rc-line)] px-4 py-3">
                  <RcSkel className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <RcSkel className="h-4" style={{ width: `${70 - i * 9}%` }} />
                    <RcSkel className="mt-2 h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <RcSkel className="h-5 w-20" />
              <RcSkel className="mt-4 h-4 w-3/5" />
              <RcSkel className="mt-4 h-4 w-2/5" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-9">
            <div>
              <RcSkel className="h-5 w-16" />
              <RcSkel className="mt-3 h-[196px] w-full rounded-[12px]" />
            </div>
            <div>
              <RcSkel className="h-5 w-20" />
              <RcSkel className="mt-3 h-[34px] w-full rounded-[8px]" />
              <RcSkel className="mt-2.5 h-[120px] w-full rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
