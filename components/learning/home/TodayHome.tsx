'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BuddyCard } from '@/components/buddy/BuddyCard';
import { FirstRun } from './FirstRun';
import { cn } from '@/lib/utils';
import { PersonalTaskDetailModal } from '@/components/todo/PersonalTaskDetailModal';
import { isLearningMock } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { groupTasks } from '@/lib/learning/taskGroups';
import type { TodayPayload } from '@/lib/learning/types';
import { RcIconButton, RcSkel, rcScope } from '@/components/rc-ui';
import { AiExportDialog } from '../AiExportDialog';
import { AttachmentPreviewDialog } from '../AttachmentPreviewDialog';
import { CreateSubjectDialog } from '../CreateSubjectDialog';
import { EditCaptureDialog } from '../EditCaptureDialog';
import { RescheduleDialog } from '../RescheduleDialog';
import { WeeklyReviewDialog } from '../WeeklyReviewDialog';
import { FromAgent } from './FromAgent';
import { ThisWeek } from './ThisWeek';
import { LookAgain } from './LookAgain';
import { RemindersToday } from './RemindersToday';
import { TodaySoFar } from './TodaySoFar';
import { CoachSheet } from './CoachSheet';
import Link from 'next/link';
import { ChartNoAxesColumn, MessageSquareText, PanelRight, Settings2, UserRound } from 'lucide-react';
import { GoalSheet } from './GoalSheet';
import { GoalsRail } from './GoalsRail';
import { AllNotesSheet, PocketRail } from './Pocket';
import { RoutinePanel } from './RoutinePanel';
import { SettingsSheet } from './SettingsSheet';
import { TasksToday } from './TasksToday';
import { TodaySlip } from './TodaySlip';
import { GraphFilter, useYearStand, yearWords } from './YearGrid';
import { lensOfParts, type RecordParts } from '@/lib/learning/stand';
import { YearCard } from './YearCard';
import { longDay, weekdayDay } from './format';
import { AiPausedNotice } from '@/components/ai/AiPausedNotice';
import { useTopBar } from '@/lib/store/topBarStore';

/** A centred page frame (the error state uses it). */
export const pageFrame = 'mx-auto w-full max-w-[1160px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';

/**
 * Home's frame (the owner, 11-21, ChatGPT's side panel as the reference): from 1280 up the rail
 * (goals, pocket) is a right sidebar on the window's edge, the full height under the top bar (44 px),
 * scrolling on its own with no scrollbar shown and no dividing line; the day is one reading column
 * centred in the space left of it. One toggle at the top bar's right end (ChatGPT's place and look:
 * filled while the sidebar is open) slides it shut and open, the day gliding to its new centre; the
 * choice is kept in this browser. Below 1280 the rail drops under the day and is always shown.
 */
const shell = 'xl:flex xl:items-start';
// The header sits near the top bar (the owner, 11-22: the date and the year's grid are the page's header, so the lists below stay high).
const dayPane = 'min-w-0 flex-1 px-4 sm:px-6 lg:px-10 pt-4 pb-14 xl:pb-24';
const centre = 'relative mx-auto flex w-full min-w-0 max-w-[660px] flex-col';
/** The sidebar's box: it slides between 364 and 0 wide (16 px of room each side: the owner, 11-21, wanted it nearer the edge); what is inside keeps its width, so nothing reflows. */
const railBox =
  'rc-rail mx-auto w-full min-w-0 max-w-[708px] xl:sticky xl:top-0 xl:mx-0 xl:h-[calc(100dvh-44px)] xl:max-w-none xl:shrink-0 ' +
  'xl:overflow-y-auto xl:overflow-x-hidden xl:transition-[width,opacity,visibility] xl:duration-300 xl:ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';
const rail = 'flex min-w-0 flex-col gap-9 px-4 sm:px-6 pb-24 xl:w-[364px] xl:px-4 xl:pt-4 xl:pb-10';
const RAIL_KEY = 'rc-home-rail';
/** The space between the day's column and the right sidebar with the left sidebar open at 1536 (kept when it collapses). */
const GROUP_GAP = 74;

/**
 * Where the day's column sits (the owner, 11-21). With the right sidebar open it is centred on the
 * screen, not on the space between the two sidebars: nudged toward the screen's middle as far as the
 * space beside it allows. With the sidebar closed it is centred in the page (the space right of the
 * app's sidebar). While the sidebar slides the nudge eases with its width (a resize observer, one
 * write a frame).
 */
function DayPane({ children, tight }: { children: React.ReactNode; tight?: boolean }) {
  const paneRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const pane = paneRef.current;
    const col = colRef.current;
    if (!pane || !col) return;
    const place = () => {
      const box = pane.getBoundingClientRect();
      const cs = getComputedStyle(pane);
      const left = box.left + parseFloat(cs.paddingLeft);
      const right = box.right - parseFloat(cs.paddingRight);
      const room = (right - left - col.offsetWidth) / 2;
      // How open the right sidebar is, 0 to 1 (stacked under the day below 1280: it counts as open).
      const aside = pane.parentElement?.querySelector<HTMLElement>('aside.rc-rail');
      const open = aside && getComputedStyle(aside).position === 'sticky' ? Math.min(1, aside.offsetWidth / 364) : 1;
      // With the app's left sidebar collapsed to its icon strip (the pane starts near the window's edge) and the
      // right sidebar open (the owner, 11-22): the column and the right sidebar move in as one group, centred
      // in the window, keeping the gap between them they have with the left sidebar open (GROUP_GAP).
      const leftCollapsed = box.left < 120;
      const railOpenFull = !!aside && getComputedStyle(aside).position === 'sticky' && open >= 1;
      if (aside) {
        const margin = leftCollapsed && railOpenFull ? Math.max(0, Math.round((window.innerWidth - box.left - (col.offsetWidth + GROUP_GAP + 364)) / 2)) : 0;
        if (aside.style.marginRight !== `${margin}px`) aside.style.marginRight = `${margin}px`;
        if (leftCollapsed && railOpenFull) {
          const want = box.left + margin - (left + right - col.offsetWidth) / 2;
          col.style.left = room > 0 ? `${Math.round(Math.max(-room, Math.min(room, want)))}px` : '0px';
          return;
        }
      }
      const want = leftCollapsed ? 0 : (window.innerWidth / 2 - (left + right) / 2) * open;
      col.style.left = room > 0 ? `${Math.round(Math.max(-room, Math.min(room, want)))}px` : '0px';
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(pane);
    window.addEventListener('resize', place);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', place);
    };
  }, []);
  return (
    <div ref={paneRef} className={cn(dayPane, tight && 'lg:pt-2.5')}>
      <div ref={colRef} className={centre}>
        {children}
      </div>
      {isLearningMock && <p className="mt-12 text-center text-[12px] font-[600] text-[var(--rc-ink-3)]">Mock data (NEXT_PUBLIC_LEARNING_MOCK=1)</p>}
    </div>
  );
}

/**
 * Home / Today (PRODUCT.md): see today's few revisions and focus lines, do them, leave; glance at
 * goal pace and the pinned pocket. The centre is ordered by time (the owner, 11-21: "to see what's
 * due today I have to scroll past the whole weekly plan"): today first (the buddy's line, reminders,
 * focus, what to revise, the next topic, tasks due), then the week (targets, the record, proposals),
 * then what agents changed. Cards belong to the rail; the centre is the open page.
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
  // Home draws its own header at the top, so the top bar is hidden where the sidebar's buttons take its place (1280 up).
  useEffect(() => {
    useTopBar.getState().setTopBar({ hiddenOnDesktop: true });
    return () => useTopBar.getState().setTopBar({ hiddenOnDesktop: false });
  }, []);
  const mode = data.plan?.mode ?? 'normal';
  // The year for the header: loaded again when today's activity changes (a review done, the day turning active).
  // The graph's filter (the owner, 11-23): starts as what counts as progress; a pick is for this view only.
  const progressParts: RecordParts = { learning: true, building: settings?.progressIncludesBuilding !== false, work: settings?.progressIncludesWork === true };
  const [pickedParts, setPickedParts] = useState<RecordParts | null>(null);
  const parts = pickedParts ?? progressParts;
  const same = (['learning', 'building', 'work'] as const).every((k) => parts[k] === progressParts[k]);
  const year = useYearStand(`${(data.stats.rhythm?.last7 ?? []).map((d) => (d.active ? 1 : 0)).join('')}:${data.revisions.doneToday.length}`, same ? undefined : (lensOfParts(parts) ?? undefined));
  const retry = () => void useLearningStore.getState().refresh();
  const reviewCount = data.weeklyReview.isReviewDay ? data.weeklyReview.goals.length : 0;
  // The right sidebar, open unless closed in this browser (a per-viewer convenience).
  const [railOpen, setRailOpen] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) !== 'closed';
    } catch {
      return true;
    }
  });
  const toggleRail = (open: boolean) => {
    setRailOpen(open);
    try {
      localStorage.setItem(RAIL_KEY, open ? 'open' : 'closed');
    } catch {
      /* the choice just isn't kept */
    }
  };

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={shell}>
        <DayPane tight>
            {/*
              The header (the owner's final, 11-22): a very quiet line with the day, then the year as a card and
              the buddy's word in a quieter block under it, both a little wider than the content column so the
              content reads as under them; the date and active days centred over the card, whose top lines up
              with Goals on the right. Capture has no button (Ctrl K, the phone's +); settings sit beside the
              sidebar's toggle (here only below 1280, where that corner isn't drawn).
            */}
            <header className="flex flex-col gap-2 sm:-mx-4">
              <div className="flex min-h-[37px] flex-wrap items-end justify-center gap-x-3 px-4 pb-0.5 text-[12.5px] text-[var(--rc-ink-3)]">
                <span className="flex flex-wrap items-baseline justify-center gap-x-3 opacity-75">
                  <h1 className="font-[400]" title={longDay(data.today)}>
                    {weekdayDay(data.today, data.today)}
                  </h1>
                  {year && year !== 'failed' && <span className="rc-num">{yearWords(year)}</span>}
                  {year && year !== 'failed' && <GraphFilter parts={parts} progress={progressParts} onChange={(p) => setPickedParts(p)} />}
                  {mode === 'comeback' && <span>Welcome back: just a few to get going</span>}
                  {mode === 'busy' && <span>Busy week{settings?.busyUntil ? ` until ${weekdayDay(settings.busyUntil, data.today)}` : ''}: just the small things</span>}
                </span>
                {mode === 'busy' && (
                  <button type="button" className="rounded-[5px] px-1 text-[12.5px] text-[var(--rc-ink-2)] underline-offset-2 hover:underline" onClick={() => void useLearningStore.getState().updateSettings({ busyUntil: null })}>
                    End busy week
                  </button>
                )}
                <RcIconButton size="sm" label="Learning settings" className="-mb-1 xl:hidden" onClick={() => openSettings()}>
                  <Settings2 />
                </RcIconButton>
              </div>
              <YearCard stand={year} />
              {/* A marginally quieter tint than the card's 3.5%, as wide as the content (the owner, 11-22). */}
              <div className="rounded-[14px] bg-[color-mix(in_srgb,var(--rc-ink-1)_1.2%,var(--rc-ground))] px-4 py-3 sm:mx-2">
                <BuddyCard inline />
              </div>
            </header>

            {/* Today */}
            <div className="mt-9 flex flex-col gap-8">
              <FirstRun />
              <AiPausedNotice />
              {data.schedule && <RoutinePanel data={data} today={data.today} />}
              <RemindersToday />
              {/* Tasks due come before the reviews (the owner, 11-21: under seven reviews they get ignored); at most three rows. */}
              <TasksToday groups={groups} today={data.today} timezone={data.timezone} reviewCount={reviewCount} onPlanWeek={() => setReviewOpen(true)} focus={data.focus} next={data.next} onRetry={retry} />
              <TodaySlip
                plan={data.plan}
                today={data.today}
                firstRun={data.stats.totalTopics === 0 && data.revisions.doneToday.length === 0 && (data.plan?.doneToday.length ?? 0) === 0}
                onRetry={retry}
                onOpenSettings={() => openSettings(true)}
              />
            </div>

            {/* The week, then the record of what agents changed */}
            <div className="mt-10 flex flex-col gap-8 pt-2">
              <div>
                <ThisWeek />
                <TodaySoFar today={data.today} />
              </div>
              <LookAgain />
              <FromAgent />
            </div>
        </DayPane>

        <div className="fixed right-3 top-[5px] z-40 hidden items-center gap-1 xl:flex">
          {/* Home's settings sit outside the centre column, beside the sidebar's toggle (the owner, 11-22). */}
          <RcIconButton label="Learning settings" onClick={() => openSettings()}>
            <Settings2 />
          </RcIconButton>
          <RcIconButton
            label={railOpen ? 'Hide goals and pocket' : 'Show goals and pocket'}
            aria-pressed={railOpen}
            className="rc-panel-toggle"
            onClick={() => toggleRail(!railOpen)}
          >
            <PanelRight />
          </RcIconButton>
        </div>
        <aside className={cn(railBox, 'xl:h-[100dvh]', railOpen ? 'xl:w-[364px] xl:opacity-100' : 'xl:invisible xl:w-0 xl:opacity-0')} aria-label="Goals and pocket">
          {/* Its white text a step quieter than the centre's (the owner, 11-22). */}
          <div className={cn(rail, 'xl:pt-12 [--rc-ink-1:var(--rc-ink-rail)]')}>
          <div>
            <GoalsRail goals={data.goals} today={data.today} onRetry={retry} onCreate={() => setGoalSheet({ open: true, goalId: null })} onEdit={(goalId) => setGoalSheet({ open: true, goalId })} />
            <button type="button" onClick={() => setCoachOpen(true)} className="rc-row rc-hoverable mt-2 flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left">
              <MessageSquareText className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
              <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">Your week</span>
              <span className="rc-meta">a look back from the coach</span>
            </button>
            <Link href="/mirror" className="rc-row rc-hoverable flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left">
              <ChartNoAxesColumn className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
              <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">Where you stand</span>
              <span className="rc-meta">pace and hours, worked out</span>
            </Link>
            <Link href="/you" className="rc-row rc-hoverable flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left">
              <UserRound className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
              <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">About you</span>
              <span className="rc-meta">what Kaaga knows</span>
            </Link>
          </div>
          <PocketRail notes={data.quickNotes} onOpenAll={() => setNotesOpen(true)} />
          </div>
        </aside>
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
      <div className={shell}>
        <DayPane>
            <RcSkel className="h-[18px] w-[min(460px,90%)]" />
            <div className="mt-8 flex flex-col gap-7">
              <RcSkel className="h-6 w-4/5" />
              <div>
                <RcSkel className="h-[30px] w-32 rounded-[8px]" />
                <RcSkel className="mt-3 h-[4px] w-full rounded-full" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="mt-4 flex items-center gap-3">
                    <RcSkel className="h-[18px] w-[18px] shrink-0" />
                    <RcSkel className="h-4" style={{ width: `${62 - i * 7}%` }} />
                  </div>
                ))}
              </div>
              <div>
                <RcSkel className="h-5 w-20" />
                <RcSkel className="mt-4 h-4 w-3/5" />
                <RcSkel className="mt-4 h-4 w-2/5" />
              </div>
            </div>
        </DayPane>
        <div className={cn(railBox, 'xl:w-[364px]')}>
        <div className={rail}>
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
