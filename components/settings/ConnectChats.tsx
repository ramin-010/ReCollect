'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';

/**
 * The one line that made claude.ai and ChatGPT use the connector in every chat (MCP_MEMORY_PLAN §11: 2 of 8 and 0 of 8
 * passed on before it, 4 of 4 after). Set once in their settings: the friends setup's line (ECOSYSTEM_V2_PLAN stage 11).
 */
export const ONE_TIME_LINE =
  // ECOSYSTEM_V2_PLAN stage 12, the live hour (11-20): the old line ("Leave work details in the chat") logged no work at all.
  'I use the Kaaga connector as my memory and work log. At the start of every chat, call its get_brief, and during the chat quietly pass on anything I say about my own life (habits, plans, progress, changes) and log what I finish or decide in my work, with its tools. Leave the details of the work in the chat.';

export function CopyRow({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Copy failed: select it and copy it by hand.');
    }
  };
  return (
    <div className="set-token mt-2">
      <code aria-label={label}>{text}</code>
      <RcButton size="sm" variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy'}
      </RcButton>
    </div>
  );
}

/**
 * Settings › Agents (EASY_SETUP_PLAN §3): the AI tools on a computer (Claude Code, Antigravity, Cursor) in one command,
 * approved in the browser; nothing to copy but the command. A server other than the public one is named with --url.
 */
export function SetUpComputer({ apiUrl }: { apiUrl: string }) {
  const url = apiUrl.replace(/\/+$/, '');
  // kaaga-setup's own default is https://api.kaaga.in; any other server is named (KAAGA_REBRAND_PLAN D7).
  const command = /^https:\/\/api\.kaaga\.in$/i.test(url) ? 'npx kaaga-setup' : `npx kaaga-setup --url ${url}`;
  return (
    <div className="set-field mt-5">
      <p className="rc-field-label">Use it in your coding tools</p>
      <p className="rc-field-help">
        Run this in a terminal on your computer (Node.js 22 or newer). It opens Kaaga here to approve, then adds Kaaga to Claude Code, Antigravity and Cursor. Each new folder asks you once what it is; Settings › Tracking changes it.
      </p>
      <CopyRow text={command} label="The setup command" />
    </div>
  );
}

/** Settings › Agents: claude.ai and ChatGPT in two steps (the connector's address, then the line set once). */
export function ConnectChats({ apiUrl }: { apiUrl: string }) {
  return (
    <div className="set-field mt-5">
      <p className="rc-field-label">Use it in claude.ai and ChatGPT</p>
      <p className="rc-field-help">1. Add a custom connector with this address (claude.ai: Settings › Connectors; ChatGPT: apps and connectors), sign in, and set its tools to Always allow.</p>
      <CopyRow text={`${apiUrl.replace(/\/+$/, '')}/mcp`} label="The connector's address" />
      <p className="rc-field-help mt-4">2. Paste this line once in claude.ai’s Instructions for Claude or ChatGPT’s Custom instructions, so every chat uses it:</p>
      <CopyRow text={ONE_TIME_LINE} label="The line for their settings" />
    </div>
  );
}
