'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { ConnectChats, SetUpComputer } from './ConnectChats';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcConfirm, RcSkel } from '@/components/rc-ui';
import { agentApi, type ApiToken } from '@/lib/api/agentApi';
import { formatRelative } from '@/components/docs/page/format';
import { AgentProfile } from './AgentProfile';
import './settings.css';

/** A token's scopes in plain words for the list ("can read, write docs, log sessions"). */
function scopeWords(scopes: string[]): string {
  if (scopes.length === SCOPES.length) return 'every permission';
  return scopes.map((v) => SHORT[v] ?? v).join(', ');
}

const SHORT: Record<string, string> = {
  read: 'reads',
  'docs:write': 'writes docs',
  'learning:write': 'sets goals and notes',
  'sessions:write': 'logs sessions',
  'tasks:write': 'changes tasks',
  ambient: "reads the day's picture (phone app)",
};

const SCOPES = [
  { value: 'read', label: 'Read docs, goals and today' },
  { value: 'docs:write', label: 'Write docs' },
  { value: 'learning:write', label: 'Set goals, focus lines and notes' },
  { value: 'sessions:write', label: 'Log study and work sessions' },
  { value: 'tasks:write', label: 'Add and change your tasks' },
] as const;

/**
 * Settings → Agents: personal access tokens for the Kaaga MCP server (Claude Code and other
 * agents). A token is shown once; revoking it cuts the agent off at once.
 */
export function AgentTokens() {
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('Claude Code');
  const [scopes, setScopes] = useState<string[]>(['read', 'docs:write', 'learning:write', 'sessions:write', 'tasks:write']);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoke, setRevoke] = useState<ApiToken | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      setTokens(await agentApi.listTokens());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim() || !scopes.length) return;
    setCreating(true);
    try {
      const res = await agentApi.createToken({ name: name.trim(), scopes });
      setFresh({ name: name.trim(), token: res.token });
      setCopied(false);
      await load();
    } catch {
      toast.error('The token was not created. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.token);
      setCopied(true);
    } catch {
      toast.error('Copy failed: select the token and copy it by hand.');
    }
  };

  const doRevoke = async () => {
    if (!revoke) return;
    setRevoking(true);
    try {
      await agentApi.revokeToken(revoke.id);
      toast.success('Token revoked');
      setRevoke(null);
      await load();
    } catch {
      toast.error('The token was not revoked. Try again.');
    } finally {
      setRevoking(false);
    }
  };

  const active = (tokens ?? []).filter((t) => !t.revokedAt);
  // The MCP server lives in mcp/ (built to dist/); NEXT_PUBLIC_MCP_SERVER_PATH says where on this computer. `-s user` makes it available in every project.
  const serverPath = process.env.NEXT_PUBLIC_MCP_SERVER_PATH ?? '/path/to/kaaga/mcp/dist/index.js';
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8002';
  const setup = fresh ? `claude mcp add kaaga -s user -e KAAGA_URL=${apiUrl} -e KAAGA_TOKEN=${fresh.token} -- node ${serverPath}` : '';

  return (
    <div className={cn(rcScope, 'set-section')}>
      <p className="rc-body rc-ink-2">
        Let a coding agent write learning docs, set goals and plan your week through the Kaaga MCP server. Its changes are labelled “From your agent” on Home, and each one can be undone.
      </p>
      <SetUpComputer apiUrl={apiUrl} />
      <ConnectChats apiUrl={apiUrl} />

      {fresh ? (
        <div className="set-fresh mt-5">
          <p className="rc-title">Copy the token for “{fresh.name}” now</p>
          <p className="rc-meta mt-0.5">It is shown only once. If you lose it, revoke it and make a new one.</p>
          <div className="set-token mt-3">
            <code>{fresh.token}</code>
            <RcButton size="sm" variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </RcButton>
          </div>
          <p className="rc-field-label mt-4">Add it to Claude Code</p>
          <pre className="set-cmd">{setup}</pre>
          <RcButton className="mt-3" variant="quiet" onClick={() => setFresh(null)}>
            Done
          </RcButton>
        </div>
      ) : (
        <div className="set-field mt-5">
          <label htmlFor="tok-name" className="rc-field-label">
            New token
          </label>
          <p className="rc-field-help">For another agent, or a setup by hand.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input id="tok-name" className="rc-input set-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="What will use it, e.g. Claude Code" />
            <RcButton variant="main" icon={<KeyRound className="h-4 w-4" />} busy={creating} disabled={!name.trim() || !scopes.length} onClick={() => void create()}>
              Create token
            </RcButton>
          </div>
          <fieldset className="mt-3">
            <legend className="sr-only">What the token may do</legend>
            {SCOPES.map((s) => (
              <label key={s.value} className="set-scope">
                <input
                  type="checkbox"
                  checked={scopes.includes(s.value)}
                  onChange={(e) => setScopes((cur) => (e.target.checked ? [...cur, s.value] : cur.filter((x) => x !== s.value)))}
                />
                {s.label}
              </label>
            ))}
          </fieldset>
        </div>
      )}

      <p className="rc-field-label mt-7">Tokens</p>
      {failed ? (
        <p className="rc-meta mt-2">Tokens didn’t load. Reopen Settings to try again.</p>
      ) : tokens === null ? (
        <RcSkel className="mt-2 h-10 w-full" />
      ) : active.length === 0 ? (
        <p className="rc-meta mt-2">No tokens yet.</p>
      ) : (
        <ul className="set-list mt-1">
          {active.map((t) => (
            <li key={t.id} className="set-row">
              <span className="min-w-0">
                <span className="block font-medium">{t.name}</span>
                <span className="rc-meta">
                  {t.signIn ? 'Signed in from the app' : `${t.prefix}…`} · {t.lastUsedAt ? `used ${formatRelative(t.lastUsedAt)}` : 'never used'} · {scopeWords(t.scopes)}
                </span>
              </span>
              <RcButton size="sm" variant="danger" onClick={() => setRevoke(t)}>
                Revoke
              </RcButton>
            </li>
          ))}
        </ul>
      )}

      <AgentProfile />

      <RcConfirm
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={`Revoke “${revoke?.name ?? ''}”?`}
        body="Any agent using it stops working at once. Its past changes stay."
        confirmLabel="Revoke token"
        danger
        busy={revoking}
        onConfirm={() => void doRevoke()}
      />
    </div>
  );
}
