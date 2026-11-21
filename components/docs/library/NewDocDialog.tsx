'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Braces, File, Lightbulb, Network, PenLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcIconButton, RcSwitch } from '@/components/rc-ui';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { docApi } from '@/lib/api/docApi';
import { learningApi } from '@/lib/api/learningApi';
import { useDocStore, type Doc } from '@/lib/store/docStore';
import { DOC_TEMPLATES, type DocTemplate } from '@/lib/docs/templates';
import type { Subject } from '@/lib/learning/types';
import { aiApi } from '@/lib/api/aiApi';
import { AI_PAUSED_WORDS, recallErrorKind } from '@/lib/api/recallApi';
import { CODE_LANGUAGES } from '@/lib/editor/codeLanguages';

const ICONS: Record<DocTemplate['id'], typeof File> = {
  blank: File,
  dsa: Braces,
  concept: Lightbulb,
  system: Network,
  notes: BookOpen,
};

/**
 * "New doc": pick a template (its outline previews on the right), optionally file it under a
 * subject and start revisions, then the doc opens with the template filled in.
 */
export function NewDocDialog({
  open,
  onOpenChange,
  subjects,
  defaultSubjectId,
  onSubjectCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: Subject[];
  defaultSubjectId?: string | null;
  onSubjectCreated?: (s: Subject) => void;
}) {
  const router = useRouter();
  const addDoc = useDocStore((s) => s.addDoc);
  const [templateId, setTemplateId] = useState<DocTemplate['id'] | 'solved'>('blank');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [language, setLanguage] = useState('python');
  const [struggles, setStruggles] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(defaultSubjectId ?? null);
  const [revise, setRevise] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSubjectId(defaultSubjectId ?? null);
      setRevise(false);
      setBusy(false);
    }
  }, [open, defaultSubjectId]);

  const solved = templateId === 'solved';
  const template = useMemo(() => DOC_TEMPLATES.find((t) => t.id === templateId) ?? DOC_TEMPLATES[0]!, [templateId]);
  const subject = subjects.find((s) => s._id === subjectId) ?? null;

  /** "Solved problem": the model writes the DSA note from the problem and his code (D2). */
  const writeNote = async () => {
    if (!problem.trim() || !solution.trim()) return;
    setBusy(true);
    try {
      const r = await aiApi.practiceNote({
        problem: problem.trim(),
        solution,
        language,
        struggles: struggles.trim() || undefined,
        subjectId: subjectId ?? undefined,
        revise: subjectId ? revise : undefined,
      });
      onOpenChange(false);
      setProblem('');
      setSolution('');
      setStruggles('');
      toast.success(r.nextRevision ? `“${r.title}” written · first review ${r.nextRevision}` : `“${r.title}” written`);
      router.push(`/docs/${r.docId}`);
    } catch (e) {
      const kind = recallErrorKind(e);
      toast.error(
        kind === 'cap-reached'
          ? 'This month’s AI budget is used up (Settings → AI).'
          : kind === 'paused'
            ? AI_PAUSED_WORDS
            : kind === 'not-configured'
            ? 'This needs AI: add your own Claude key in Settings › AI.'
            : 'The note wasn’t written. Try again in a moment.',
      );
      setBusy(false);
    }
  };

  const create = async () => {
    if (solved) return void writeNote();
    setBusy(true);
    try {
      // The template's sections arrive as the new doc's blocks (made by the server).
      const res = await docApi.createDoc({ title: template.title, ...(template.id === 'blank' ? {} : { content: { type: 'doc', content: template.content } }) });
      const created = res.data;
      if (!res.success || !created?._id) throw new Error('create failed');
      addDoc({ ...(created as unknown as Doc), role: 'owner' });
      if (subjectId) {
        await learningApi.createTopic({ docId: created._id, subjectId, startRevisions: revise }).catch(() => {
          toast.error('The doc was created, but filing it under the subject failed. Pick the subject on the doc.');
        });
      }
      onOpenChange(false);
      // ?new=1: the page opens on an empty title (the "Untitled" placeholder) with the caret in it.
      router.push(`/docs/${created._id}?new=1`);
    } catch {
      toast.error('The doc was not created. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(rcScope, 'rc-overlay')} />
        <Dialog.Content
          className={cn(rcScope, 'rc-float doc-new')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void create();
            }
          }}
        >
          <div className="doc-new-head">
            <Dialog.Title className="rc-sheet-title">New doc</Dialog.Title>
            <Dialog.Description className="sr-only">Pick a template, then create the doc.</Dialog.Description>
            <Dialog.Close asChild>
              <RcIconButton label="Close" size="sm">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </RcIconButton>
            </Dialog.Close>
          </div>

          <div className="doc-new-body">
            <div role="radiogroup" aria-label="Template" className="doc-new-list">
              {DOC_TEMPLATES.map((t) => {
                const Icon = ICONS[t.id];
                const on = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="doc-new-item"
                    onClick={() => setTemplateId(t.id)}
                    onDoubleClick={() => void create()}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    <span className="min-w-0">
                      <span className="doc-new-name">{t.name}</span>
                      <span className="doc-new-desc">{t.description}</span>
                    </span>
                  </button>
                );
              })}
              <div className="rc-menu-sep" />
              <button
                type="button"
                role="radio"
                aria-checked={solved}
                className="doc-new-item"
                onClick={() => setTemplateId('solved')}
              >
                <PenLine className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0">
                  <span className="doc-new-name">From a solved problem</span>
                  <span className="doc-new-desc">Paste the problem and your code; the AI writes the DSA note.</span>
                </span>
              </button>
            </div>

            {solved ? (
              <div className="doc-new-form">
                <label className="rc-field-label" htmlFor="sp-problem">
                  Problem
                </label>
                <textarea
                  id="sp-problem"
                  className="rc-textarea doc-new-area"
                  rows={3}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="The link, the statement, or both"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <label className="rc-field-label" htmlFor="sp-code">
                    Your solution
                  </label>
                  <RcPicker label="Language" options={CODE_LANGUAGES.filter((l) => l.value !== 'mermaid')} value={language} onChange={setLanguage} width={200} align="end">
                    <button type="button" className="doc-code-lang">
                      {CODE_LANGUAGES.find((l) => l.value === language)?.label ?? language}
                    </button>
                  </RcPicker>
                </div>
                <textarea
                  id="sp-code"
                  className="rc-textarea doc-new-area doc-new-code"
                  rows={7}
                  spellCheck={false}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Paste the code that passed"
                />
                <label className="rc-field-label mt-3 block" htmlFor="sp-struggles">
                  What tripped you up <span className="rc-ink-3 font-normal">(optional)</span>
                </label>
                <textarea
                  id="sp-struggles"
                  className="rc-textarea doc-new-area"
                  rows={2}
                  value={struggles}
                  onChange={(e) => setStruggles(e.target.value)}
                  placeholder="An edge case you missed, a wrong first idea…"
                />
              </div>
            ) : (
            <div className="doc-new-preview" aria-label={`${template.name} preview`}>
              <div className="doc-new-paper">
                <div className="doc-new-title">Untitled</div>
                {template.outline.length ? (
                  template.outline.map((h) => (
                    <div key={h} className="doc-new-section">
                      <div className="doc-new-h">{h}</div>
                      <div className="doc-new-line" />
                    </div>
                  ))
                ) : (
                  <p className="doc-new-blank">Start writing, or press / for blocks.</p>
                )}
              </div>
            </div>
            )}
          </div>

          <div className="doc-new-foot">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <RcPicker
                label="Subject"
                options={[{ value: '', label: 'No subject' }, ...subjects.map((s) => ({ value: s._id, label: s.name, icon: <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-icon)' }} /> }))]}
                value={subjectId ?? ''}
                onChange={(v) => {
                  setSubjectId(v || null);
                  if (!v) setRevise(false);
                }}
                onCreate={async (name) => {
                  try {
                    const s = await learningApi.createSubject({ name });
                    onSubjectCreated?.(s);
                    setSubjectId(s._id);
                  } catch {
                    toast.error('The subject was not created. Try again.');
                  }
                }}
                searchPlaceholder="Find or create a subject"
                width={260}
              >
                <button type="button" className="doc-prop-btn">
                  {subject ? (
                    <>
                      <span className="rc-swatch" style={{ background: subject.color ?? 'var(--rc-icon)' }} aria-hidden />
                      {subject.name}
                    </>
                  ) : (
                    <span className="doc-prop-empty">Add to a subject</span>
                  )}
                </button>
              </RcPicker>
              <label className={cn('flex items-center gap-2 text-[14px]', !subjectId && 'opacity-50')}>
                <RcSwitch checked={revise} onChange={setRevise} disabled={!subjectId} label="Revise this" />
                Revise this
              </label>
            </div>
            <div className="flex items-center gap-2">
              <RcButton variant="quiet" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </RcButton>
              <RcButton variant="main" busy={busy} disabled={solved && (!problem.trim() || !solution.trim())} onClick={() => void create()}>
                {solved ? (busy ? 'Writing your note…' : 'Write my note') : 'Create doc'}
              </RcButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
