'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Bot, CalendarClock, CheckCircle2, Clock3, Folder, Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton, RcConfirm, RcSkel, RcStamp } from '@/components/rc-ui';
import { RcPicker } from '@/components/rc-ui/RcPicker';
import { learningApi } from '@/lib/api/learningApi';
import { agentApi, type AgentEdit } from '@/lib/api/agentApi';
import type { Goal, SubjectWithTopics, TopicByDoc } from '@/lib/learning/types';
import { formatRelative, formatStampDay } from './format';
import { RecallSheet, type RecallTarget } from '@/components/learning/recall/RecallSheet';
import { RevisionTimeline } from './RevisionTimeline';
import { RevisionCardDialog } from './RevisionCard';
import { DocTasks } from './DocTasks';

const CYCLES = 4;
/** The picker's last row when the doc is filed: take it out of its subject. */
const NO_SUBJECT = '__none__';

/** Notion-style property rows under the title: subject, revision, goal, agent, tasks, last edit. */
export function DocProperties({ docId, docTitle = '', updatedAt, editable }: { docId: string; docTitle?: string; updatedAt?: string; editable: boolean }) {
  const [info, setInfo] = useState<TopicByDoc | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithTopics[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recall, setRecall] = useState<RecallTarget | null>(null);
  const [agentEdit, setAgentEdit] = useState<AgentEdit | null>(null);
  const [unfiling, setUnfiling] = useState(false);
  // STUDY_FLOW_PLAN §4.4: the doc's revision card, opened from the Revision row.
  const [cardOpen, setCardOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, s, g] = await Promise.all([
        learningApi.getTopicByDoc(docId),
        learningApi.getSubjects().catch(() => [] as SubjectWithTopics[]),
        learningApi.getGoals().catch(() => [] as Goal[]),
      ]);
      setInfo(t);
      setSubjects(s);
      setGoals(g);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [docId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The latest agent change to this doc (provenance: agent work is never silent).
  useEffect(() => {
    let cancelled = false;
    agentApi
      .listEdits()
      .then((edits) => !cancelled && setAgentEdit(edits.find((e) => e.docId === docId && !e.undoneAt && e.agentName !== 'You') ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const undoAgent = async () => {
    if (!agentEdit) return;
    setBusy(true);
    try {
      await agentApi.undoEdit(agentEdit.id);
      toast.success('Undone');
      setAgentEdit(null);
    } catch {
      toast.error('That could not be undone.');
    } finally {
      setBusy(false);
    }
  };

  const topic = info?.topic ?? null;
  const subject = useMemo(() => subjects?.find((s) => s._id === topic?.subjectId) ?? null, [subjects, topic]);
  const goal = useMemo(
    () => (subject ? goals?.find((g) => g.status === 'active' && g.subjects.some((s) => s._id === subject._id)) ?? null : null),
    [goals, subject],
  );

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      if (ok) toast.success(ok);
    } catch (err) {
      // The server's own words when it refuses (DOC_PAGES_PLAN D5: one lesson per branch).
      const said = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      toast.error(said?.status === 409 && said.data?.message ? said.data.message : 'That did not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const unfile = () =>
    topic &&
    run(async () => {
      await learningApi.deleteTopic(topic._id);
      setUnfiling(false);
    }, 'Removed from the subject');

  const chooseSubject = (subjectId: string) => {
    if (subjectId === NO_SUBJECT) {
      // Its revisions go with it, so ask first when it has any; the doc itself always stays.
      if (topic && info?.chain.length) setUnfiling(true);
      else void unfile();
      return;
    }
    if (topic) {
      if (topic.subjectId === subjectId) return;
      void run(() => learningApi.updateTopic(topic._id, { subjectId }), 'Subject changed');
    } else {
      void run(() => learningApi.createTopic({ docId, subjectId, startRevisions: false }), 'Filed under the subject');
    }
  };

  const createSubject = (name: string) =>
    void run(async () => {
      const s = await learningApi.createSubject({ name });
      if (topic) await learningApi.updateTopic(topic._id, { subjectId: s._id });
      else await learningApi.createTopic({ docId, subjectId: s._id, startRevisions: false });
    }, `Created “${name}”`);

  if (failed) return null; // the learning API is down: the doc still works
  if (!info || !subjects) {
    // As many rows as a plain doc shows once loaded (Subject, Revision, Tasks for an editor, Edited),
    // so the body doesn't jump down when they arrive.
    return (
      <div className="doc-props" aria-busy>
        {(editable ? [0, 1, 2, 3] : [0, 1, 2]).map((i) => (
          <div key={i} className="doc-prop">
            <RcSkel className="h-4 w-24" />
            <RcSkel className="h-4 w-40" />
          </div>
        ))}
      </div>
    );
  }

  const next = info.nextAction;
  const done = info.chain.filter((r) => r.status === 'done').length;
  // DOC_PAGES_PLAN §4.8: a page inside a lesson is revised with it: one "Lesson" row instead of Subject, Revision, Goal.
  const lessonAbove = !topic && info.lesson ? info.lesson : null;
  const lessonSubject = lessonAbove ? subjects.find((s) => s._id === lessonAbove.subjectId) ?? null : null;

  return (
    <div className="doc-props">
      {lessonAbove && (
        <div className="doc-prop">
          <span className="doc-prop-label">
            <BookOpen aria-hidden strokeWidth={1.75} />
            Lesson
          </span>
          <span className="doc-prop-value doc-prop-wrap">
            <Link href={`/docs/${lessonAbove.docId}`} className="doc-prop-btn">
              <span className="rc-swatch" style={{ background: lessonSubject?.color ?? 'var(--rc-icon)' }} aria-hidden />
              {lessonAbove.title.trim() || 'Untitled'}
            </Link>
            <span className="doc-prop-hint">revised with it · {lessonAbove.subjectName}</span>
          </span>
        </div>
      )}
      {!lessonAbove && (
      <>
      <div className="doc-prop">
        <span className="doc-prop-label">
          <Folder aria-hidden strokeWidth={1.75} />
          Subject
        </span>
        <span className="doc-prop-value">
          {editable ? (
            <RcPicker
              label="Subject"
              options={[
                ...subjects.map((s) => ({
                  value: s._id,
                  label: s.name,
                  hint: s.topics.length ? String(s.topics.length) : undefined,
                  icon: <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-icon)' }} aria-hidden />,
                })),
                ...(topic ? [{ value: NO_SUBJECT, label: 'Remove from subject', icon: <X aria-hidden strokeWidth={1.75} /> }] : []),
              ]}
              value={subject?._id ?? null}
              onChange={chooseSubject}
              onCreate={createSubject}
              searchPlaceholder="Find or create a subject"
              width={260}
            >
              <button type="button" className="doc-prop-btn" disabled={busy}>
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
          ) : (
            <span className="doc-prop-text">{subject?.name ?? 'None'}</span>
          )}
        </span>
      </div>

      <div className="doc-prop">
        <span className="doc-prop-label">
          <CalendarClock aria-hidden strokeWidth={1.75} />
          Revision
        </span>
        <span className="doc-prop-value doc-prop-wrap">
          {next.kind === 'start' && (
            <>
              <span className="doc-prop-empty">Not scheduled</span>
              {editable && topic && (
                <RcButton size="sm" variant="quiet" busy={busy} onClick={() => run(() => learningApi.startRevisions({ topicId: topic._id }), 'Revisions start tomorrow')}>
                  Start revising
                </RcButton>
              )}
              {editable && !topic && <span className="doc-prop-hint">Add it to a subject first</span>}
            </>
          )}
          {next.kind === 'wait' && (
            <>
              <RcStamp label={`Next revision ${formatStampDay(next.next.scheduledFor)}`}>Next {formatStampDay(next.next.scheduledFor)}</RcStamp>
              <span className="doc-prop-hint">
                Review {next.next.cycleNumber} of {CYCLES} · in {next.inDays} {next.inDays === 1 ? 'day' : 'days'}
              </span>
            </>
          )}
          {(next.kind === 'due' || next.kind === 'early') && (
            <>
              <span className="doc-prop-text">
                {next.kind === 'due' ? 'Due today' : 'Ready early'} · review {next.next.cycleNumber} of {CYCLES}
              </span>
              {editable && (
                <>
                  <RcButton
                    size="sm"
                    variant="outline"
                    onClick={() => setRecall({ revisionId: next.next._id, title: topic?.title ?? 'This doc', docId: null, cycleNumber: next.next.cycleNumber, subjectName: subject?.name })}
                  >
                    Quiz me
                  </RcButton>
                  <RcButton size="sm" variant="quiet" busy={busy} onClick={() => run(() => learningApi.completeRevision(next.next._id), 'Marked as revised')}>
                    Mark as revised
                  </RcButton>
                </>
              )}
            </>
          )}
          {next.kind === 'completed' && (
            <span className="doc-prop-text doc-prop-good">
              <CheckCircle2 aria-hidden strokeWidth={1.75} />
              Mastered · {done} of {CYCLES} reviews done
            </span>
          )}
          {info.chain.length > 0 && <RevisionTimeline chain={info.chain} title={topic?.title ?? 'This doc'} editable={editable} onMoved={() => void load()} />}
          {info.hasCard && (
            <RcButton size="sm" variant="quiet" onClick={() => setCardOpen(true)}>
              Card
            </RcButton>
          )}
        </span>
      </div>

      {goal && (
        <div className="doc-prop">
          <span className="doc-prop-label">
            <Target aria-hidden strokeWidth={1.75} />
            Goal
          </span>
          <span className="doc-prop-value doc-prop-wrap">
            <span className="doc-prop-text">{goal.title}</span>
            <span className="doc-prop-hint">
              {goal.daysLeft} {goal.daysLeft === 1 ? 'day' : 'days'} left
            </span>
          </span>
        </div>
      )}
      </>
      )}

      {agentEdit && (
        <div className="doc-prop">
          <span className="doc-prop-label">
            <Bot aria-hidden strokeWidth={1.75} />
            Agent
          </span>
          <span className="doc-prop-value doc-prop-wrap">
            <span className="doc-prop-text">{agentEdit.summary}</span>
            <span className="doc-prop-hint">
              {agentEdit.agentName} · {formatRelative(agentEdit.createdAt)}
            </span>
            {editable && agentEdit.canUndo && (
              <RcButton size="sm" variant="quiet" busy={busy} onClick={() => void undoAgent()}>
                Undo
              </RcButton>
            )}
          </span>
        </div>
      )}

      <DocTasks docId={docId} docTitle={docTitle} editable={editable} />

      {updatedAt && (
        <div className="doc-prop">
          <span className="doc-prop-label">
            <Clock3 aria-hidden strokeWidth={1.75} />
            Edited
          </span>
          <span className="doc-prop-value">
            <span className="doc-prop-hint">{formatRelative(updatedAt)}</span>
          </span>
        </div>
      )}
      <RecallSheet target={recall} onOpenChange={(o) => !o && setRecall(null)} onFinished={() => void load()} />
      <RevisionCardDialog
        docId={cardOpen ? docId : null}
        title={docTitle}
        onClose={() => setCardOpen(false)}
        onDone={() => setCardOpen(false)}
        onQuiz={(review) => {
          setCardOpen(false);
          setRecall({ revisionId: review.revisionId, title: topic?.title ?? docTitle, docId: null, cycleNumber: review.cycle, subjectName: subject?.name });
        }}
        onRevised={(review) => {
          setCardOpen(false);
          void run(() => learningApi.completeRevision(review.revisionId), 'Marked as revised');
        }}
      />
      <RcConfirm
        open={unfiling}
        onOpenChange={setUnfiling}
        title={`Remove from ${subject?.name ?? 'its subject'}?`}
        body={done > 0 ? `Its revisions end with it (${done} of ${CYCLES} done so far). The doc itself stays.` : 'Its planned revisions end with it. The doc itself stays.'}
        confirmLabel="Remove from subject"
        danger
        busy={busy}
        onConfirm={() => void unfile()}
      />
    </div>
  );
}
