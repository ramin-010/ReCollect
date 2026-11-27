'use client';

import { useCallback, useEffect, useState } from 'react';
import { CirclePause, Copy, Minus, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSheet, RcSkel, rcScope, type MenuAction } from '@/components/rc-ui';
import { SectionFailed } from '@/components/learning/home/parts';
import { ownerApi, type Allowance, type Invite, type People, type Person } from '@/lib/api/ownerApi';
import './people.css';

/**
 * The People page (/owner; ECOSYSTEM_V2_PLAN stage 11, the owner's decision 1). Job: see who uses this server and
 * how much of the free AI each friend has used, and give more, set a limit a day, or end access, in one place.
 * Adding a person makes a one-time invite link (signup stays closed); the owner sends it himself.
 */

const frame = 'mx-auto w-full max-w-[880px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';

const usd = (n: number) => `$${n.toFixed(2)}`;
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayOf = (iso: string) => DAY.format(new Date(iso));

function activeWords(iso: string | null): string {
  if (!iso) return 'Not active yet';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  if (days < 30) return `Active ${days} days ago`;
  return `Last active ${dayOf(iso)}`;
}

function agoWords(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

const WAIT_WORDS: Record<NonNullable<Allowance['reason']>, string> = {
  empty: 'Waiting: the free AI is used up',
  day: 'Waiting until tomorrow: today’s limit is reached',
  ceiling: 'Waiting: the friends’ total for this month is reached',
};

const AI_WORDS: Record<Person['ai'], string> = {
  own_key: 'Their own Claude key (costs you nothing)',
  allowance: 'Free AI from you',
  list: 'Your server’s key, with no free-AI limit',
  none: 'No AI: their own Claude connects through the tools',
};

/** A money amount with − and + (whole steps; the server keeps cents). */
function MoneyStepper({ value, onChange, step, min, max, label }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; label: string }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <div className="pp-money" role="group" aria-label={label}>
      <RcIconButton label={`Less: ${usd(Math.max(min, value - step))}`} className="rc-btn--outline border border-[var(--rc-line-strong)]" disabled={value <= min} onClick={() => set(value - step)}>
        <Minus />
      </RcIconButton>
      <output aria-live="polite">{usd(value)}</output>
      <RcIconButton label={`More: ${usd(Math.min(max, value + step))}`} className="rc-btn--outline border border-[var(--rc-line-strong)]" disabled={value >= max} onClick={() => set(value + step)}>
        <Plus />
      </RcIconButton>
    </div>
  );
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the link and copy it.');
  }
}

export function PeoplePage() {
  const [data, setData] = useState<People | 'failed' | 'not_owner' | null>(null);
  const [adding, setAdding] = useState(false);
  const [limitFor, setLimitFor] = useState<Person | null>(null);
  const [ending, setEnding] = useState<Person | null>(null);
  const [ceilingOpen, setCeilingOpen] = useState(false);

  const reload = useCallback(() => {
    ownerApi.people().then(setData, (err: { response?: { status?: number } }) => setData(err?.response?.status === 403 ? 'not_owner' : 'failed'));
  }, []);
  useEffect(reload, [reload]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast.success(done);
      reload();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'That didn’t work. Try again.');
    }
  };

  const ready = data && typeof data === 'object';

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={frame}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="rc-h1">People</h1>
            <p className="rc-meta mt-1.5 max-w-[560px]">
              Who uses this server, and the free AI you give your friends. Only you see this page; each person sees in Settings › Your data when it showed them and what you changed.
            </p>
          </div>
          {ready && (
            <RcButton variant="main" icon={<Plus />} onClick={() => setAdding(true)}>
              Add a person
            </RcButton>
          )}
        </div>

        {data === null && <PeopleSkeleton />}
        {data === 'failed' && <SectionFailed className="mt-8" what="the people on this server" onRetry={reload} />}
        {data === 'not_owner' && (
          <div role="status" className="rc-card mt-8 px-4 py-3.5">
            <p className="text-[15px] rc-ink-2">Only the owner of this server sees this page.</p>
          </div>
        )}
        {ready && (
          <>
            <section aria-labelledby="pp-friends" className="rc-card mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <h2 id="pp-friends" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
                  Free AI for friends this month
                </h2>
                <p className="rc-meta mt-0.5 pp-num">
                  {usd(data.friends.spentUsd)} of {usd(data.friends.ceilingUsd)} for all friends together. Past it, every friend’s AI waits until next month; yours never does.
                </p>
              </div>
              <RcButton size="sm" variant="outline" onClick={() => setCeilingOpen(true)}>
                Change
              </RcButton>
            </section>

            <section aria-labelledby="pp-people" className="mt-8">
              <h2 id="pp-people" className="rc-h2 mb-2">
                People <span className="pp-num rc-ink-3 font-[500]">{data.people.length}</span>
              </h2>
              <ul className="pp-list">
                {data.people.map((p) => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    onTopUp={(amount) => act(() => ownerApi.topUp(p.id, amount), `${usd(amount)} added for ${p.name}`)}
                    onLimit={() => setLimitFor(p)}
                    onEnd={() => setEnding(p)}
                    onRestore={() => act(() => ownerApi.restoreAccess(p.id), `${p.name} can sign in again`)}
                  />
                ))}
              </ul>
            </section>

            <Invites invites={data.invites} onRevoke={(i) => act(() => ownerApi.revokeInvite(i.id), 'Invite link revoked')} onAdd={() => setAdding(true)} />

            <section aria-labelledby="pp-feedback" className="mt-8">
              <h2 id="pp-feedback" className="rc-h2 mb-2">
                What people sent
              </h2>
              {data.feedback.length === 0 ? (
                <p className="rc-body rc-ink-2">Nothing yet. Feedback from Settings › Send feedback lands here.</p>
              ) : (
                <ul className="rc-card">
                  {data.feedback.map((f) => (
                    <li key={f.id} className="pp-row block">
                      <p className="rc-meta">
                        <span className="font-[600] text-[var(--rc-ink-1)]">{f.name}</span> · {agoWords(f.at)}
                        {f.source === 'phone' ? ' · from the phone app' : f.page ? ` · from ${f.page}` : ''}
                      </p>
                      <p className="pp-feedback-text">{f.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AddPerson open={adding} onOpenChange={setAdding} allowance={data.inviteAllowanceUsd} onDone={reload} />
            <DailyLimit key={limitFor?.id ?? 'none'} person={limitFor} onClose={() => setLimitFor(null)} onSave={(p, v) => act(() => ownerApi.setDailyCap(p.id, v), v === null ? `${p.name}’s limit is back to $1 a day` : `${p.name} can use ${usd(v)} a day`)} />
            <Ceiling key={ceilingOpen ? 'open' : 'shut'} open={ceilingOpen} onOpenChange={setCeilingOpen} value={data.friends.ceilingUsd} onSave={(v) => act(() => ownerApi.setCeiling(v), `Friends can use ${usd(v)} together this month`)} />
            <RcConfirm
              open={!!ending}
              onOpenChange={(o) => !o && setEnding(null)}
              title={`End ${ending?.name ?? 'their'} access?`}
              body="They can’t sign in, and their apps and connected chats stop working. Their account and everything in it stay, and you can restore access later."
              confirmLabel="End access"
              danger
              onConfirm={() => {
                const p = ending;
                setEnding(null);
                if (p) void act(() => ownerApi.endAccess(p.id), `${p.name}’s access has ended`);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PersonCard({ person: p, onTopUp, onLimit, onEnd, onRestore }: { person: Person; onTopUp: (usd: number) => void; onLimit: () => void; onEnd: () => void; onRestore: () => void }) {
  const a = p.allowance;
  const menu: MenuAction[] = [];
  if (a) menu.push({ label: 'Set a limit a day…', onSelect: onLimit });
  if (!p.isOwner) menu.push(p.endedAt ? { label: 'Restore access', onSelect: onRestore } : { label: 'End access', onSelect: onEnd, danger: true, separatorBefore: menu.length > 0 });
  const topUps: MenuAction[] = [5, 10, 20].map((n) => ({ label: `Add ${usd(n)}`, onSelect: () => onTopUp(n) }));
  const phone = p.phone ? phoneWords(p.phone.details) : null;

  return (
    <li className="rc-card pp-person">
      <div className="pp-head">
        <div className="min-w-0">
          <p className="pp-name">
            {p.name}
            {p.isOwner && <span className="pp-tag">You</span>}
            {p.endedAt && <span className="pp-tag">Access ended</span>}
          </p>
          <p className="rc-meta mt-0.5 [overflow-wrap:anywhere]">
            {p.email} · Joined {dayOf(p.joined)} · {activeWords(p.lastActive)}
          </p>
        </div>
        {!p.isOwner && (
          <div className="pp-actions">
            {!p.endedAt && p.ai !== 'own_key' && (
              <RcMenu label={`Give ${p.name} free AI`} actions={topUps}>
                <RcButton size="sm" variant="outline" icon={<Plus />}>
                  {a ? 'Top up' : 'Give free AI'}
                </RcButton>
              </RcMenu>
            )}
            {menu.length > 0 && (
              <RcMenu label={`More for ${p.name}`} actions={menu}>
                <RcIconButton label={`More for ${p.name}`} size="sm">
                  <MoreHorizontal />
                </RcIconButton>
              </RcMenu>
            )}
          </div>
        )}
      </div>
      <dl className="pp-facts">
        <dt>AI</dt>
        <dd>
          {a ? (
            <>
              <span className="pp-num">
                {usd(a.leftUsd)} left of {usd(a.grantedUsd)}
              </span>
              <span className="pp-quiet pp-num">
                {' '}
                · today {usd(a.todayUsd)} of {usd(a.dailyCapUsd)}
              </span>
              {a.reason && (
                <span className="pp-wait mt-1 flex">
                  <CirclePause aria-hidden strokeWidth={1.75} />
                  {WAIT_WORDS[a.reason]}
                </span>
              )}
            </>
          ) : (
            <span className="pp-quiet">{p.isOwner ? 'Your server’s key' : AI_WORDS[p.ai]}</span>
          )}
        </dd>
        <dt>{a ? 'Used' : 'Last 30 days'}</dt>
        <dd className="pp-num">
          {p.byFeature.length ? p.byFeature.map((f) => `${f.label} ${usd(f.usd)}`).join(' · ') : <span className="pp-quiet">Nothing yet</span>}
          {p.last7Usd > 0 && <span className="pp-quiet"> · last 7 days {usd(p.last7Usd)}</span>}
        </dd>
        {(p.appsConnected > 0 || phone) && (
          <>
            <dt>Connected</dt>
            <dd>
              {p.appsConnected > 0 && (
                <span className="pp-quiet">
                  {p.appsConnected} {p.appsConnected === 1 ? 'app' : 'apps'} in the last 30 days
                </span>
              )}
              {phone && (
                <span className="block">
                  {phone} <span className="pp-quiet">· sent {agoWords(p.phone!.at)}</span>
                </span>
              )}
            </dd>
          </>
        )}
      </dl>
    </li>
  );
}

/** The phone's diagnostics in one line: model, Android, screen, and any permission that is off. */
function phoneWords(d: Record<string, unknown>): string {
  const parts: string[] = [];
  const model = [d.maker, d.model].filter((x) => typeof x === 'string' && x).join(' ');
  if (model) parts.push(model);
  if (typeof d.android === 'string') parts.push(`Android ${d.android}`);
  const s = d.screen as { width?: number; height?: number } | undefined;
  if (s?.width && s.height) parts.push(`${s.width} × ${s.height}`);
  const off = Object.entries((d.permissions as Record<string, unknown>) ?? {})
    .filter(([, v]) => v === false || v === 'off' || v === 'denied')
    .map(([k]) => PERMISSION_WORDS[k] ?? k);
  parts.push(off.length ? `off: ${off.join(', ')}` : 'all permissions on');
  return parts.join(' · ');
}

const PERMISSION_WORDS: Record<string, string> = {
  exactAlarms: 'exact alarms',
  notifications: 'notifications',
  battery: 'battery exemption',
  autoStart: 'auto-start',
  notificationAccess: 'notification access',
};

function Invites({ invites, onRevoke, onAdd }: { invites: Invite[]; onRevoke: (i: Invite) => void; onAdd: () => void }) {
  return (
    <section aria-labelledby="pp-invites" className="mt-8">
      <h2 id="pp-invites" className="rc-h2 mb-2">
        Invite links
      </h2>
      {invites.length === 0 ? (
        <p className="rc-body rc-ink-2">
          No links waiting.{' '}
          <button type="button" className="font-[500] text-[var(--rc-accent)] hover:underline" onClick={onAdd}>
            Add a person
          </button>{' '}
          to make one.
        </p>
      ) : (
        <ul className="rc-card">
          {invites.map((i) => (
            <li key={i.id} className="pp-row">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-[500] text-[var(--rc-ink-1)] [overflow-wrap:anywhere]">
                  {i.name || i.email}
                  {i.name && <span className="rc-meta font-[400]"> · {i.email}</span>}
                </p>
                <p className="rc-meta mt-0.5 pp-num">
                  {usd(i.allowanceUsd)} of free AI · {i.state === 'open' ? `works until ${dayOf(i.expiresAt)}` : 'expired: make a new one'}
                </p>
              </div>
              {i.state === 'open' && (
                <RcButton size="sm" variant="outline" icon={<Copy />} onClick={() => void copy(i.link, 'Invite link')}>
                  Copy link
                </RcButton>
              )}
              <RcButton size="sm" variant="quiet" onClick={() => onRevoke(i)}>
                {i.state === 'open' ? 'Revoke' : 'Remove'}
              </RcButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddPerson({ open, onOpenChange, allowance, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; allowance: number; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(allowance);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [made, setMade] = useState<Invite | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setName('');
    setAmount(allowance);
    setError('');
    setMade(null);
  }, [open, allowance]);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter their email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await ownerApi.addPerson({ email: email.trim(), name: name.trim(), allowanceUsd: amount });
      onDone();
      if (r.kind === 'invite') setMade(r.invite);
      else {
        toast.success(`${r.name} already has an account: ${usd(amount)} of free AI added`);
        onOpenChange(false);
      }
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RcSheet
      open={open}
      onOpenChange={onOpenChange}
      title={made ? 'Their invite link' : 'Add a person'}
      description={made ? undefined : 'They get a one-time link to make an account. Signup stays closed to everyone else.'}
      initialFocusId={made ? undefined : 'pp-email'}
      footer={
        made ? (
          <>
            <RcButton variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </RcButton>
            <RcButton variant="main" icon={<Copy />} onClick={() => void copy(made.link, 'Invite link')}>
              Copy link
            </RcButton>
          </>
        ) : (
          <>
            <RcButton variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </RcButton>
            <RcButton variant="main" busy={busy} onClick={() => void submit()}>
              Make invite link
            </RcButton>
          </>
        )
      }
    >
      {made ? (
        <div className="flex flex-col gap-3">
          <p className="rc-body rc-ink-2">
            Send this to {made.name || made.email} however you like. It works once, for {made.email} only, until {dayOf(made.expiresAt)}, and gives them {usd(made.allowanceUsd)} of free AI.
          </p>
          <input className="rc-input pp-link" readOnly value={made.link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
        </div>
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label className="rc-field-label" htmlFor="pp-email">
              Email
            </label>
            <input id="pp-email" className="rc-input" type="email" autoComplete="off" value={email} aria-invalid={error ? true : undefined} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
          </div>
          <div>
            <label className="rc-field-label" htmlFor="pp-name">
              Name
            </label>
            <input id="pp-name" className="rc-input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="What you call them" />
            <p className="rc-field-help">Their signup form starts with it; they can change it.</p>
          </div>
          <div>
            <p className="rc-field-label">Free AI to start</p>
            <MoneyStepper value={amount} onChange={setAmount} step={1} min={0} max={50} label="Free AI to start" />
            <p className="rc-field-help">On your server’s key, for every AI feature, at most $1 a day. You can top it up any time.</p>
          </div>
          {error && <p className="rc-field-error">{error}</p>}
          <button type="submit" hidden />
        </form>
      )}
    </RcSheet>
  );
}

function DailyLimit({ person, onClose, onSave }: { person: Person | null; onClose: () => void; onSave: (p: Person, v: number | null) => void }) {
  // Mounted fresh for each person (its key): the limit starts at theirs.
  const [value, setValue] = useState(person?.allowance?.dailyCapUsd ?? 1);
  return (
    <RcSheet
      open={!!person}
      onOpenChange={(o) => !o && onClose()}
      title={person ? `${person.name}’s limit a day` : 'Limit a day'}
      description="How much of their free AI they can use in one day. Past it, their AI waits until tomorrow."
      footer={
        <>
          <RcButton
            variant="outline"
            onClick={() => {
              if (person) onSave(person, null);
              onClose();
            }}
          >
            Back to $1
          </RcButton>
          <RcButton
            variant="main"
            onClick={() => {
              if (person) onSave(person, value);
              onClose();
            }}
          >
            Save
          </RcButton>
        </>
      }
    >
      <MoneyStepper value={value} onChange={setValue} step={0.5} min={0} max={20} label="Limit a day" />
    </RcSheet>
  );
}

function Ceiling({ open, onOpenChange, value, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; value: number; onSave: (v: number) => void }) {
  // Mounted fresh each time it opens (its key): the ceiling starts at the current one.
  const [v, setV] = useState(value);
  return (
    <RcSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Friends’ total a month"
      description="All your friends together, on your server’s key. Past it, their AI waits until next month. Your own account is never held to it."
      footer={
        <>
          <RcButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </RcButton>
          <RcButton
            variant="main"
            onClick={() => {
              onSave(v);
              onOpenChange(false);
            }}
          >
            Save
          </RcButton>
        </>
      }
    >
      <MoneyStepper value={v} onChange={setV} step={5} min={0} max={500} label="Friends’ total a month" />
    </RcSheet>
  );
}

function PeopleSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3" aria-busy="true">
      <RcSkel className="h-[64px] w-full rounded-[var(--rc-r-lg)]" />
      {[0, 1, 2].map((i) => (
        <RcSkel key={i} className="h-[132px] w-full rounded-[var(--rc-r-lg)]" />
      ))}
    </div>
  );
}
