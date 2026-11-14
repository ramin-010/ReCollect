'use client';

import { useMemo } from 'react';
import { FolderPlus, RotateCw, Sparkles } from 'lucide-react';
import { useLearningStore } from '@/lib/store/learningStore';
import { addDays, type DayString } from '@/lib/learning/engine';
import { BUDGET_MAX, BUDGET_MIN } from '@/lib/learning/types';
import { MINUTES_LATER_CYCLE } from '@/lib/learning/plan';
import { RcButton, RcSelectList, RcSheet, RcSkel, RcStepper, RcSwitch, type SelectOption } from '@/components/rc-ui';
import { weekdayDay } from './format';

const NUDGE_TIMES: SelectOption[] = Array.from({ length: 29 }, (_, i) => {
  const minutes = 5 * 60 + i * 30; // 05:00 … 19:00
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  const h12 = ((Math.floor(minutes / 60) + 11) % 12) + 1;
  return { value: `${hh}:${mm}`, label: `${h12}:${mm} ${minutes < 720 ? 'am' : 'pm'}` };
});

function timeZones(current: string): SelectOption[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  if (!zones.includes(current)) zones = [current, ...zones];
  return zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));
}

function Row({ title, help, control, id }: { title: string; help: React.ReactNode; control: React.ReactNode; id: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-t border-[var(--rc-line)] first:border-t-0">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] font-[600] text-[var(--rc-ink-1)]">
          {title}
        </label>
        <p className="mt-1 text-[13.5px] leading-[1.4] rc-ink-3">{help}</p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

/**
 * Learning settings (LOOP_V2_SPEC §1), compact: every change saves on its own (PATCH a subset)
 * and Today refetches when it changes what Today shows.
 */
export function SettingsSheet({
  open,
  onOpenChange,
  today,
  focusBudget,
  onNewSubject,
  onExport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  today: DayString;
  /** Opened from the slip's budget button: focus lands on the budget stepper. */
  focusBudget?: boolean;
  onNewSubject: () => void;
  onExport: () => void;
}) {
  const settings = useLearningStore((s) => s.settings);
  const status = useLearningStore((s) => s.settingsStatus);
  const { updateSettings, loadSettings } = useLearningStore.getState();
  const zones = useMemo(() => (settings ? timeZones(settings.timezone) : []), [settings]);
  const busy = !!settings?.busyUntil && settings.busyUntil >= today;

  return (
    <RcSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Learning settings"
      description="Changes save as you make them."
      initialFocusId={focusBudget && settings ? (settings.dailyBudgetMin >= BUDGET_MAX ? 'set-budget-less' : 'set-budget-more') : undefined}
    >
      {!settings ? (
        status === 'error' ? (
          <div className="py-4">
            <p className="text-[15px] rc-ink-2">Couldn’t load your settings.</p>
            <RcButton variant="outline" size="sm" className="mt-3" icon={<RotateCw />} onClick={() => void loadSettings()}>
              Try again
            </RcButton>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-4" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <RcSkel className="h-4 w-32" />
                  <RcSkel className="h-3 w-48" />
                </div>
                <RcSkel className="h-8 w-20" />
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          <Row
            id="set-budget"
            title="Daily budget"
            help={`How long Today can be. About ${Math.max(1, Math.round(settings.dailyBudgetMin / MINUTES_LATER_CYCLE))} revisions a day.`}
            control={
              <RcStepper
                idPrefix="set-budget"
                label="Daily budget"
                value={settings.dailyBudgetMin}
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={5}
                unit="min"
                onChange={(v) => void updateSettings({ dailyBudgetMin: v })}
              />
            }
          />
          <Row
            id="set-busy"
            title="Busy week"
            help={busy ? `On until ${weekdayDay(settings.busyUntil!, today)}: just 3 small things a day.` : 'For heavy weeks at work: just 3 small things a day for 7 days.'}
            control={<RcSwitch id="set-busy" label="Busy week" checked={busy} onChange={(on) => void updateSettings({ busyUntil: on ? addDays(today, 6) : null })} />}
          />
          <Row
            id="set-email"
            title="Morning email"
            help="Today’s plan and your goals, at your local time."
            control={<RcSwitch id="set-email" label="Morning email" checked={settings.nudgeEmailEnabled} onChange={(on) => void updateSettings({ nudgeEmailEnabled: on })} />}
          />
          {settings.nudgeEmailEnabled && (
            <div className="-mt-2 pb-4 flex items-center justify-between gap-4">
              <span className="text-[14px] rc-ink-2" id="set-time-label">
                Send at
              </span>
              <RcSelectList
                id="set-time"
                label="Send the morning email at"
                value={settings.nudgeTime}
                options={NUDGE_TIMES}
                width={150}
                searchPlaceholder="Type a time"
                onChange={(v) => void updateSettings({ nudgeTime: v })}
              />
            </div>
          )}
          <Row
            id="set-routine"
            title="Time blocks and day review"
            help="Shows the timeline, Day Manager and Wrap up day on Home. Off by default."
            control={<RcSwitch id="set-routine" label="Time blocks and day review" checked={settings.routineEnabled} onChange={(on) => void updateSettings({ routineEnabled: on })} />}
          />
          <div className="py-4 border-t border-[var(--rc-line)]">
            <label htmlFor="set-tz" className="block text-[15px] font-[600] text-[var(--rc-ink-1)]">
              Time zone
            </label>
            <p className="mt-1 mb-2.5 text-[13.5px] leading-[1.4] rc-ink-3">Decides when your day starts and when the email goes out.</p>
            <RcSelectList id="set-tz" label="Time zone" value={settings.timezone} options={zones} width={320} searchPlaceholder="Search time zones" onChange={(v) => void updateSettings({ timezone: v })} />
          </div>
          <div className="py-4 border-t border-[var(--rc-line)]">
            <p className="text-[15px] font-[600] text-[var(--rc-ink-1)]">More</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <RcButton size="sm" variant="outline" icon={<FolderPlus />} onClick={onNewSubject}>
                New subject
              </RcButton>
              <RcButton size="sm" variant="outline" icon={<Sparkles />} onClick={onExport}>
                Export for an AI mentor
              </RcButton>
            </div>
          </div>
        </div>
      )}
    </RcSheet>
  );
}
