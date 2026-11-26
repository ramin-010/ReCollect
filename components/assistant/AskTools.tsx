'use client';

import { Check, CircleAlert, Eye, Hand, Search, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';
import type { AssistantTool } from '@/lib/api/assistantApi';

/**
 * What the manager did, one small row per tool call (MANAGER_AND_DOCS_PLAN §3.4): a read is a
 * quiet line; a change says what changed, with Undo; a failed step says so (icon and words); an
 * action that needs his tap is a card with "Do it" and "Dismiss" (the same card as on Home).
 */

const READ: Record<string, string> = {
  get_brief: 'Read where you stand',
  list_sessions: 'Looked at your sessions',
  get_week: 'Looked at your week',
  get_standing: 'Looked at your pace',
  list_tasks: 'Looked at your tasks',
  list_decisions: 'Looked at your decisions',
  get_today: 'Looked at today',
  get_learning_overview: 'Looked at your subjects and reviews',
  search_docs: 'Searched your docs',
  read_doc: 'Read a doc',
  preview_diagram: 'Checked a diagram',
  list_subjects: 'Looked at your subjects',
  get_path: 'Looked at a path',
  list_due: 'Looked at what is due',
  list_goals: 'Looked at your goals',
  recent_agent_edits: 'Looked at recent changes',
  get_settings: 'Looked at your settings',
  list_suggestions: 'Looked at what waits for you',
  list_reminders: 'Looked at your reminders',
  get_quiz_results: 'Looked at your quiz results',
  get_sharing: 'Looked at who can see a doc',
};

const spoken = (name: string) => name.replace(/_/g, ' ');

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** A tool's own sentence, without the ids it writes for agents ("· id …", "doc cm3…", block ids). */
export function cleanResult(text: string): string {
  return text
    .replace(/^MCP error -?\d+:\s*/i, '')
    .replace(/^Input validation error:\s*(Invalid arguments for tool \w+:\s*)?/i, '')
    .replace(new RegExp(`:\\s*${UUID}(\\s*,\\s*${UUID})*\\.?`, 'gi'), '.')
    .replace(new RegExp(`\\b(after|before|under)\\s+block\\s+${UUID}`, 'gi'), '$1 a block')
    .replace(new RegExp(`\\bblock\\s+${UUID}`, 'gi'), 'a block')
    .replace(/\s*[·(]\s*id\s+[A-Za-z0-9_-]{6,}\)?/g, '')
    .replace(/\b(doc|canvas|goal|topic|subject|task|revision|milestone)\s+[a-z0-9]{20,}\b/gi, 'the $1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function words(tool: AssistantTool): string {
  if (!tool.ok) return `A step didn't work (${spoken(tool.name)}): ${cleanResult(tool.result) || 'no reason given'}`;
  if (tool.level === 1) {
    const what = READ[tool.name] ?? `Used ${spoken(tool.name)}`;
    return tool.detail ? `${what} · “${tool.detail}”` : what;
  }
  return cleanResult(tool.result) || `Changed something (${spoken(tool.name)})`;
}

export function ToolRow({ tool, arriving, busy, onUndo }: { tool: AssistantTool; arriving?: boolean; busy?: boolean; onUndo?: () => void }) {
  const failed = !tool.ok;
  const read = tool.level === 1 && !failed;
  const Icon = failed ? CircleAlert : read ? (tool.name === 'search_docs' ? Search : Eye) : tool.undone ? Undo2 : Check;
  return (
    <div className={cn('ask-tool', read && 'ask-tool--read', failed && 'ask-tool--failed', tool.undone && 'ask-tool--undone')} data-arrive={arriving || undefined}>
      <Icon className="ask-tool-icon" strokeWidth={1.75} aria-hidden />
      <span className="ask-tool-text">{words(tool)}</span>
      {tool.level === 2 && tool.ok && tool.editId && (
        tool.undone ? (
          <span className="ask-tool-state">Undone</span>
        ) : (
          <RcButton variant="quiet" size="sm" className="ask-tool-undo" busy={busy} onClick={onUndo}>
            Undo
          </RcButton>
        )
      )}
    </div>
  );
}

export function ActionCard({
  tool,
  arriving,
  busy,
  onDecide,
}: {
  tool: AssistantTool;
  arriving?: boolean;
  busy?: boolean;
  onDecide: (accept: boolean) => void;
}) {
  const status = tool.action?.status ?? 'gone';
  const text = tool.action?.text ?? cleanResult(tool.result).replace(/^Asked:\s*/, '').replace(/\.?\s*Waiting for his tap.*$/, '');
  return (
    <div className="ask-card" data-arrive={arriving || undefined} data-status={status}>
      <p className="ask-card-head">
        <Hand className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {status === 'pending' ? 'Waiting for your tap' : status === 'accepted' ? 'You tapped Do it' : status === 'dismissed' ? 'You dismissed this' : 'Not waiting any more'}
      </p>
      <p className="ask-card-text">{text}</p>
      {status === 'pending' && (
        <div className="ask-card-actions">
          <RcButton variant="outline" size="sm" busy={busy} onClick={() => onDecide(true)}>
            Do it
          </RcButton>
          <RcButton variant="quiet" size="sm" disabled={busy} onClick={() => onDecide(false)}>
            Dismiss
          </RcButton>
        </div>
      )}
      {status === 'accepted' && (
        <p className="ask-card-done">
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden /> Done
        </p>
      )}
    </div>
  );
}
