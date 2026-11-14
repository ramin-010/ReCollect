'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, CircleSlash, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcIconButton, RcSkel, RcStamp } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { recallApi, recallErrorKind, type RecallAttempt, type RecallGrade, type RecallKind, type RecallOutcome, type RecallSet, type RecallUnavailable } from '@/lib/api/recallApi';
import { formatStampDay } from '@/components/docs/page/format';
import './recall.css';

const KIND_LABEL: Record<RecallKind, string> = {
  recall: 'Recall',
  apply: 'Apply it',
  explain: 'Explain why',
  pattern: 'Pattern',
  complexity: 'Complexity',
  edge: 'Edge case',
};

const GRADE: Record<RecallGrade, { label: string; Icon: typeof CheckCircle2; cls: string }> = {
  strong: { label: 'You’ve got it', Icon: CheckCircle2, cls: 'recall-grade--strong' },
  partial: { label: 'Almost', Icon: CircleDashed, cls: 'recall-grade--partial' },
  weak: { label: 'Not yet', Icon: CircleSlash, cls: 'recall-grade--weak' },
};

const UNAVAILABLE: Record<RecallUnavailable, string> = {
  'not-configured': 'Questions need the AI, and it isn’t set up on the server yet.',
  'cap-reached': 'This month’s AI budget is used up. Raise the cap in Settings, or mark this review done.',
  'no-content': 'This doc has too little in it to ask about yet. Add your notes first.',
  'already-done': 'This review is already done. Its next date is on the doc.',
  failed: 'The questions didn’t load. The AI may be busy: try again in a moment.',
};

export interface RecallTarget {
  revisionId: string;
  title: string;
  docId: string | null;
  cycleNumber: number;
  subjectName?: string | null;
}

/**
 * Recall mode: the due doc's questions one at a time, answered from memory and graded against the
 * doc; the result moves the schedule. Falls back to "Mark as revised" when the AI can't run.
 */
export function RecallSheet({
  target,
  onOpenChange,
  onFinished,
}: {
  target: RecallTarget | null;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}) {
  const router = useRouter();
  const [set, setSet] = useState<RecallSet | null>(null);
  const [unavailable, setUnavailable] = useState<RecallUnavailable | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState<Record<string, RecallAttempt>>({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RecallOutcome | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (t: RecallTarget) => {
    setSet(null);
    setUnavailable(null);
    setOutcome(null);
    setIndex(0);
    setAnswer('');
    setAttempts({});
    try {
      const s = await recallApi.start(t.revisionId);
      setSet(s);
      const done = Object.fromEntries(s.attempts.map((a) => [a.questionId, a]));
      setAttempts(done);
      const firstOpen = s.questions.findIndex((q) => !done[q.id]);
      setIndex(firstOpen === -1 ? Math.max(0, s.questions.length - 1) : firstOpen);
    } catch (e) {
      setUnavailable(recallErrorKind(e));
    }
  }, []);

  useEffect(() => {
    if (target) void load(target);
  }, [target, load]);

  const question = set?.questions[index] ?? null;
  const attempt = question ? attempts[question.id] : undefined;
  const isLast = !!set && index === set.questions.length - 1;

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(200, Math.max(72, el.scrollHeight))}px`;
  }, [answer, index]);

  useEffect(() => {
    if (question && !attempt) requestAnimationFrame(() => inputRef.current?.focus());
  }, [question, attempt]);

  const submit = async (body: { answer?: string; selfMark?: 'knew' | 'didnt' }) => {
    if (!set || !question) return;
    setBusy(true);
    try {
      const a = await recallApi.answer(set.id, { questionId: question.id, ...body });
      setAttempts((cur) => ({ ...cur, [question.id]: a }));
    } catch (e) {
      const kind = recallErrorKind(e);
      if (kind === 'cap-reached') setUnavailable(kind);
      else toast.error('That answer wasn’t checked. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!set) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      setAnswer('');
      return;
    }
    setBusy(true);
    try {
      setOutcome(await recallApi.finish(set.id));
      onFinished();
    } catch {
      toast.error('The result didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const markRevised = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await learningApi.completeRevision(target.revisionId);
      toast.success('Marked as revised');
      onFinished();
      onOpenChange(false);
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const openDoc = () => {
    if (!target?.docId) return;
    onOpenChange(false);
    router.push(`/docs/${encodeURIComponent(target.docId)}`);
  };

  const answered = set ? set.questions.filter((q) => attempts[q.id]).length : 0;

  return (
    <Dialog.Root open={!!target} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(rcScope, 'rc-overlay')} />
        <Dialog.Content className={cn(rcScope, 'rc-float recall')} aria-describedby={undefined}>
          <header className="recall-head">
            <div className="min-w-0">
              <p className="rc-meta">
                Review {target?.cycleNumber ?? 1} of 4{target?.subjectName ? ` · ${target.subjectName}` : ''}
              </p>
              <Dialog.Title className="recall-title">{target?.title ?? 'Recall'}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <RcIconButton label="Close" size="sm">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </RcIconButton>
            </Dialog.Close>
          </header>

          {set && !outcome && (
            <div className="rc-budget recall-progress" aria-label={`${answered} of ${set.questions.length} answered`}>
              {set.questions.map((q, i) => (
                <span key={q.id} data-done={!!attempts[q.id] || undefined} data-current={i === index || undefined} />
              ))}
            </div>
          )}

          <div className="recall-body">
            {unavailable ? (
              <div className="recall-fallback">
                <p className="rc-body">{UNAVAILABLE[unavailable]}</p>
                <div className="recall-actions">
                  {target?.docId && (
                    <RcButton variant="quiet" onClick={openDoc}>
                      Open doc
                    </RcButton>
                  )}
                  {unavailable === 'failed' && target && (
                    <RcButton variant="outline" onClick={() => void load(target)}>
                      Try again
                    </RcButton>
                  )}
                  {unavailable === 'already-done' ? (
                    <RcButton variant="main" onClick={() => onOpenChange(false)}>
                      Close
                    </RcButton>
                  ) : (
                    <RcButton variant="main" busy={busy} onClick={() => void markRevised()}>
                      Mark as revised
                    </RcButton>
                  )}
                </div>
              </div>
            ) : outcome ? (
              <Summary outcome={outcome} onOpenDoc={target?.docId ? openDoc : undefined} onDone={() => onOpenChange(false)} />
            ) : !set || !question ? (
              <div aria-busy>
                <p className="rc-meta mb-3">Writing questions from your doc…</p>
                <RcSkel className="h-5 w-4/5" />
                <RcSkel className="mt-2 h-5 w-3/5" />
                <RcSkel className="mt-5 h-[72px] w-full" />
              </div>
            ) : (
              <>
                <span className="rc-tag">{KIND_LABEL[question.kind] ?? 'Recall'}</span>
                <p className="recall-question">{question.prompt}</p>

                {!attempt ? (
                  <>
                    <textarea
                      ref={inputRef}
                      className="rc-textarea recall-input"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Answer from memory, in a line or two"
                      aria-label="Your answer"
                      disabled={busy}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && answer.trim()) {
                          e.preventDefault();
                          void submit({ answer: answer.trim() });
                        }
                      }}
                    />
                    <div className="recall-actions">
                      <span className="flex gap-1">
                        <RcButton variant="quiet" disabled={busy} onClick={() => void submit({ selfMark: 'didnt' })}>
                          Didn’t know
                        </RcButton>
                        <RcButton variant="quiet" disabled={busy} onClick={() => void submit({ selfMark: 'knew' })}>
                          Knew it
                        </RcButton>
                      </span>
                      <RcButton variant="main" busy={busy} disabled={!answer.trim()} onClick={() => void submit({ answer: answer.trim() })}>
                        Check answer
                      </RcButton>
                    </div>
                  </>
                ) : (
                  <>
                    <Feedback attempt={attempt} />
                    <div className="recall-actions">
                      <span />
                      <RcButton variant="main" busy={busy} onClick={() => void next()} autoFocus>
                        {isLast ? 'See the result' : 'Next question'}
                      </RcButton>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Feedback({ attempt }: { attempt: RecallAttempt }) {
  const g = GRADE[attempt.grade];
  return (
    <div className="recall-feedback" aria-live="polite">
      <p className={cn('recall-grade', g.cls)}>
        <g.Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        {g.label}
      </p>
      {attempt.feedback && <p className="rc-body mt-1.5">{attempt.feedback}</p>}
      {attempt.quote && (
        <figure className="recall-quote">
          <figcaption>From your doc</figcaption>
          <blockquote>{attempt.quote}</blockquote>
        </figure>
      )}
    </div>
  );
}

function Summary({ outcome, onOpenDoc, onDone }: { outcome: RecallOutcome; onOpenDoc?: () => void; onDone: () => void }) {
  const { counts, effect } = outcome;
  const total = counts.strong + counts.partial + counts.weak;
  const line =
    effect.kind === 'mastered'
      ? 'That was the last review. This one is mastered.'
      : effect.kind === 'advanced'
        ? 'On to the next review.'
        : effect.kind === 'repeat'
          ? 'Close. The same review comes back soon.'
          : 'This review comes back tomorrow.';
  return (
    <div className="recall-summary">
      <p className="recall-question">
        {counts.strong} of {total} {counts.strong === 1 ? 'answer' : 'answers'} strong
      </p>
      <p className="rc-body rc-ink-2 mt-1">{line}</p>
      {effect.nextDay && (
        <p className="mt-3">
          <RcStamp press label={`Next review ${formatStampDay(effect.nextDay)}`}>
            Next {formatStampDay(effect.nextDay)}
          </RcStamp>
        </p>
      )}
      <p className="rc-meta mt-4">
        {counts.strong} strong · {counts.partial} almost · {counts.weak} not yet
      </p>
      <div className="recall-actions">
        {onOpenDoc ? (
          <RcButton variant="quiet" onClick={onOpenDoc}>
            Open doc
          </RcButton>
        ) : (
          <span />
        )}
        <RcButton variant="main" onClick={onDone} autoFocus>
          Done
        </RcButton>
      </div>
    </div>
  );
}
