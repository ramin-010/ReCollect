'use client';

/**
 * The Share popover on the doc page (MANAGER_AND_DOCS_PLAN §2, Notion's pattern, theme v2): who asks
 * to edit on top, then the people with access and their roles, then "Publish to the web" with its
 * link. The owner changes everything here; people on the doc see the list and can leave it.
 * The rules live on the server (backend/src/services/docs/docSharing.service.ts).
 */
import { useEffect, useId, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Copy, ExternalLink, Globe, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcSkel, RcSwitch, rcScope } from '@/components/rc-ui';
import { sharingApi, shareError, type DocPeople, type DocPerson, type ShareRole, type ShareUser } from '@/lib/api/sharingApi';
import './share-popover.css';

const ROLE: Record<ShareRole, { label: string; hint: string }> = {
  editor: { label: 'Can edit', hint: 'Change the content' },
  viewer: { label: 'Can view', hint: 'Read it, not change it' },
};

const SINCE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return SINCE.format(-Math.round(s / 60), 'minute');
  if (s < 86_400) return SINCE.format(-Math.round(s / 3600), 'hour');
  return SINCE.format(-Math.round(s / 86_400), 'day');
}

const initialsOf = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

function Avatar({ user }: { user: Pick<ShareUser, 'name' | 'avatar'> }) {
  return (
    <span className="sh-avatar" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from any host */}
      {user.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : initialsOf(user.name)}
    </span>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The Share button (it shows the owner how many ask to edit) and its popover. `meId` marks the reader's own row. */
export function SharePopover({ docId, isOwner, meId, openAtStart = false }: { docId: string; isOwner: boolean; meId: string | null; openAtStart?: boolean }) {
  const [open, setOpen] = useState(openAtStart);
  const [state, setState] = useState<DocPeople | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);

  // The owner's button says when someone asks (loaded once; again whenever the popover opens).
  useEffect(() => {
    if (!isOwner && !open) return;
    let cancelled = false;
    sharingApi
      .people(docId)
      .then((s) => {
        if (cancelled) return;
        setState(s);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [isOwner, open, docId, tries]);

  const pending = state?.you === 'owner' ? state.requests.length : 0;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="rc-btn rc-btn--quiet rc-btn--sm sh-trigger" aria-label={pending ? `Share: ${pending} asking to edit` : 'Share'}>
          <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Share
          {pending > 0 && <span className="sh-count">{pending}</span>}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={cn(rcScope, 'rc-float sh-pop')}
          aria-label="Share"
          // On a touch screen the first field isn't focused, so the keyboard doesn't cover the popover.
          onOpenAutoFocus={(e) => {
            if (window.matchMedia('(pointer: coarse)').matches) e.preventDefault();
          }}
        >
          {state ? (
            <ShareBody state={state} meId={meId} onChange={setState} onLeft={() => setOpen(false)} />
          ) : failed ? (
            <div className="sh-section">
              <p className="sh-note">Who has this doc didn&apos;t load.</p>
              <RcButton size="sm" variant="outline" className="mt-2" onClick={() => setTries((n) => n + 1)}>
                Try again
              </RcButton>
            </div>
          ) : (
            <div className="sh-section" aria-busy>
              <RcSkel className="h-8 w-full" />
              <RcSkel className="mt-4 h-4 w-24" />
              <RcSkel className="mt-3 h-8 w-full" />
              <RcSkel className="mt-2 h-8 w-full" />
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ShareBody({ state, meId, onChange, onLeft }: { state: DocPeople; meId: string | null; onChange: (s: DocPeople) => void; onLeft: () => void }) {
  const owner = state.you === 'owner';
  return (
    <>
      {owner && <InviteRow docId={state.docId} onChange={onChange} />}
      {owner && state.requests.length > 0 && <Requests state={state} onChange={onChange} />}
      <People state={state} meId={meId} onChange={onChange} onLeft={onLeft} />
      <PublishRow state={state} onChange={onChange} />
    </>
  );
}

// ── Invite by email ─────────────────────────────────────────────────────────────────────

function InviteRow({ docId, onChange }: { docId: string; onChange: (s: DocPeople) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = EMAIL.test(email.trim());

  const invite = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { people, already, name } = await sharingApi.add(docId, email.trim(), role);
      onChange(people);
      setEmail('');
      toast.success(already ? `${name} ${ROLE[role].label.toLowerCase()} now` : `Shared with ${name}`);
      inputRef.current?.focus();
    } catch (err) {
      setError(shareError(err, 'They were not added. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sh-section sh-invite">
      <div className="sh-invite-row">
        <div className="sh-field" data-invalid={error ? true : undefined}>
          <input
            ref={inputRef}
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="Add people by email"
            aria-label="Their email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void invite();
              }
            }}
          />
          <RoleMenu role={role} onPick={setRole} label="Their access" />
        </div>
        <RcButton variant="main" size="sm" className="sh-invite-btn" disabled={!valid} busy={busy} onClick={() => void invite()}>
          Invite
        </RcButton>
      </div>
      {error ? (
        <p id={errorId} className="sh-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="sh-note">They need a Recollect account. They get a notification and an email.</p>
      )}
    </div>
  );
}

// ── Requests to edit ────────────────────────────────────────────────────────────────────

function Requests({ state, onChange }: { state: DocPeople; onChange: (s: DocPeople) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const answer = async (id: string, name: string, what: 'approve' | 'decline') => {
    setBusy(id);
    try {
      onChange(await sharingApi.answer(state.docId, id, what));
      toast.success(what === 'approve' ? `${name} can edit now` : `Declined ${name}'s request`);
    } catch (err) {
      toast.error(shareError(err, 'That did not go through. Try again.'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="sh-section">
      <p className="sh-label">Asking to edit</p>
      <ul className="sh-list">
        {state.requests.map((r) => (
          <li key={r._id} className="sh-row">
            <Avatar user={r.user} />
            <span className="sh-who">
              <span className="sh-name">{r.user.name}</span>
              <span className="sh-meta">
                {r.user.email} · {ago(r.requestedAt)}
              </span>
            </span>
            <span className="sh-actions">
              <RcButton size="sm" variant="quiet" disabled={busy === r._id} onClick={() => void answer(r._id, r.user.name, 'decline')}>
                Decline
              </RcButton>
              <RcButton size="sm" variant="outline" busy={busy === r._id} onClick={() => void answer(r._id, r.user.name, 'approve')}>
                Allow
              </RcButton>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── People with access ──────────────────────────────────────────────────────────────────

function People({ state, meId, onChange, onLeft }: { state: DocPeople; meId: string | null; onChange: (s: DocPeople) => void; onLeft: () => void }) {
  const owner = state.you === 'owner';
  const change = async (p: DocPerson, role: ShareRole) => {
    if (role === p.role) return;
    try {
      onChange(await sharingApi.setRole(state.docId, p._id, role));
      toast.success(`${p.name} ${ROLE[role].label.toLowerCase()} now`);
    } catch (err) {
      toast.error(shareError(err, 'The role did not change. Try again.'));
    }
  };
  const remove = async (p: DocPerson, self: boolean) => {
    try {
      const next = await sharingApi.remove(state.docId, p._id);
      if (next) onChange(next);
      if (self) {
        toast.success('You left the doc');
        onLeft();
        window.location.assign('/docs');
      } else toast.success(`Removed ${p.name}`);
    } catch (err) {
      toast.error(shareError(err, 'That did not go through. Try again.'));
    }
  };

  return (
    <div className="sh-section">
      <p className="sh-label">People with access</p>
      <ul className="sh-list">
        <li className="sh-row">
          <Avatar user={state.owner} />
          <span className="sh-who">
            <span className="sh-name">
              {state.owner.name}
              {owner && <span className="sh-you"> (you)</span>}
            </span>
            <span className="sh-meta">{state.owner.email}</span>
          </span>
          <span className="sh-fixed">Owner</span>
        </li>
        {state.people.map((p) => {
          const self = !owner && !!meId && p._id === meId;
          return (
            <li key={p._id} className="sh-row">
              <Avatar user={p} />
              <span className="sh-who">
                <span className="sh-name">
                  {p.name}
                  {self && <span className="sh-you"> (you)</span>}
                </span>
                <span className="sh-meta">{p.email}</span>
              </span>
              {owner ? (
                <RoleMenu role={p.role} onPick={(r) => void change(p, r)} label={`${p.name}'s access`} onRemove={() => void remove(p, false)} />
              ) : self ? (
                <LeaveMenu role={p.role} onLeave={() => void remove(p, true)} />
              ) : (
                <span className="sh-fixed">{ROLE[p.role].label}</span>
              )}
            </li>
          );
        })}
      </ul>
      {owner && state.people.length === 0 && <p className="sh-note">Only you can open it in Recollect.</p>}
    </div>
  );
}

// ── Publish to the web ──────────────────────────────────────────────────────────────────

function PublishRow({ state, onChange }: { state: DocPeople; onChange: (s: DocPeople) => void }) {
  const owner = state.you === 'owner';
  const [busy, setBusy] = useState(false);
  const link = state.published;

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const published = await sharingApi.publish(state.docId, on);
      onChange({ ...state, published });
      if (!on) toast.success('Not published any more: the link stopped working');
    } catch (err) {
      toast.error(shareError(err, on ? 'It was not published. Try again.' : 'It is still published. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  if (!owner && !link) return null;
  return (
    <div className="sh-section sh-publish">
      <div className="sh-row sh-row--top">
        <span className="sh-globe" aria-hidden>
          <Globe strokeWidth={1.75} />
        </span>
        <span className="sh-who">
          <span className="sh-name" id="sh-publish-label">
            Publish to the web
          </span>
          <span className="sh-meta">
            {link
              ? `Anyone with the link can read it, without signing in. Never edit. Since ${new Date(link.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`
              : 'Off: only the people above can open it.'}
          </span>
        </span>
        {owner && <RcSwitch checked={!!link} disabled={busy} onChange={(on) => void toggle(on)} label="Publish to the web" />}
      </div>
      {link && (
        <div className="sh-link">
          <input className="rc-input sh-url" readOnly value={link.url} aria-label="The public link" onFocus={(e) => e.currentTarget.select()} />
          <RcButton size="sm" variant="outline" icon={<Copy className="h-4 w-4" strokeWidth={1.75} />} onClick={() => void copy()}>
            Copy link
          </RcButton>
          <a className="rc-icon-btn rc-icon-btn--sm" href={link.url} target="_blank" rel="noreferrer" aria-label="Open the public page" title="Open the public page">
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        </div>
      )}
    </div>
  );
}

// ── Role menus ──────────────────────────────────────────────────────────────────────────

function RoleMenu({ role, onPick, label, onRemove }: { role: ShareRole; onPick: (r: ShareRole) => void; label: string; onRemove?: () => void }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="sh-role" aria-label={`${label}: ${ROLE[role].label}`}>
          {ROLE[role].label}
          <ChevronDown aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} collisionPadding={12} className={cn(rcScope, 'rc-float rc-menu sh-role-menu')}>
          {(['editor', 'viewer'] as const).map((r) => (
            <DropdownMenu.Item key={r} className="rc-menu-item sh-role-item" onSelect={() => onPick(r)}>
              <span className="sh-role-text">
                <span>{ROLE[r].label}</span>
                <span className="sh-meta">{ROLE[r].hint}</span>
              </span>
              {r === role && <Check className="sh-check" aria-label="Chosen" />}
            </DropdownMenu.Item>
          ))}
          {onRemove && (
            <>
              <DropdownMenu.Separator className="rc-menu-sep" />
              <DropdownMenu.Item className="rc-menu-item" data-danger onSelect={onRemove}>
                Remove
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function LeaveMenu({ role, onLeave }: { role: ShareRole; onLeave: () => void }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="sh-role" aria-label={`Your access: ${ROLE[role].label}`}>
          {ROLE[role].label}
          <ChevronDown aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} collisionPadding={12} className={cn(rcScope, 'rc-float rc-menu')}>
          <DropdownMenu.Item className="rc-menu-item" data-danger onSelect={onLeave}>
            Leave this doc
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
