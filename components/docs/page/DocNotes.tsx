'use client';

/**
 * A lesson's notes and links (STUDY_FLOW_PLAN §4.3): the app's own notes (Ctrl K's Note and Link) attached to the
 * lesson, then the subject's own. Shown beside the doc in its right panel (the owner's ChatGPT panel as the model:
 * two quiet label lines, Notes and Links), and on a subject's page. A note's title unfolds its text in place; its menu
 * edits or deletes it; one a chat wrote says which.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcIconButton, RcMenu, RcSheet, RcSkel } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { NOTES_CHANGED } from '@/lib/learning/notesEvents';
import type { Capture } from '@/lib/learning/types';
import { NoteBody } from '@/components/learning/home/NoteBody';
import { openCapturePalette } from '@/components/learning/home/parts';
import './doc-notes.css';

const dayWords = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const siteOf = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return url ?? '';
  }
};
const titleOf = (c: Capture) => c.title?.trim() || c.content?.trim().split('\n')[0]?.slice(0, 80) || c.url || 'Untitled note';
const isLink = (c: Capture) => c.type === 'LINK' || (!!c.url && !c.content?.trim());

/** Where a lesson's notes come from: its topic and subject (null: the doc is on no path). */
export interface NotesPlace {
  topicId: string | null;
  subjectId: string;
  subjectName: string;
}

/** The notes of a lesson and of its subject, read again when the app changes one and while open (a chat's). */
export function useNotes(place: NotesPlace | null, live: boolean) {
  const [lesson, setLesson] = useState<Capture[] | null>(null);
  const [subject, setSubject] = useState<Capture[] | null>(null);
  const [failed, setFailed] = useState(false);
  const topicId = place?.topicId ?? null;
  const subjectId = place?.subjectId ?? null;

  const load = useCallback(() => {
    if (!subjectId) return;
    Promise.all([
      topicId ? learningApi.listCaptures({ topicId, limit: 200 }) : Promise.resolve([] as Capture[]),
      learningApi.listCaptures({ subjectId, limit: 200 }),
    ])
      .then(([l, s]) => {
        setLesson(l);
        setSubject(s);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [topicId, subjectId]);

  useEffect(() => {
    load();
    window.addEventListener(NOTES_CHANGED, load);
    return () => window.removeEventListener(NOTES_CHANGED, load);
  }, [load]);

  // While it is open, a note a chat saves beside the doc shows within seconds (and at once when the tab comes back).
  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [live, load]);

  return { lesson, subject, failed, reload: load };
}

function NoteRow({ note }: { note: Capture }) {
  const [open, setOpen] = useState(false);
  const link = isLink(note);
  const byApp = note.createdBy === 'agent' ? note.agentName || 'a chat' : null;
  const meta = [link ? siteOf(note.url) : dayWords(note.createdAt), byApp ? `from ${byApp}` : null].filter(Boolean).join(' · ');
  const edit = () =>
    useLearningStore.getState().openEditCapture({ captureId: note._id, title: note.title ?? '', content: note.content ?? '' });
  const remove = () => void useLearningStore.getState().deleteCapture(note._id);

  return (
    <li className="dn-row group">
      <div className="dn-row-line">
        {link ? (
          <a className="dn-row-main" href={note.url ?? '#'} target="_blank" rel="noreferrer">
            <span className="dn-title">{titleOf(note)}</span>
            <span className="dn-meta">
              {meta}
              <ExternalLink aria-hidden strokeWidth={1.75} />
            </span>
          </a>
        ) : (
          <button type="button" className="dn-row-main" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="dn-title">
              <ChevronRight aria-hidden strokeWidth={1.75} className={cn('dn-chev', open && 'dn-chev--open')} />
              {titleOf(note)}
            </span>
            <span className="dn-meta">{meta}</span>
          </button>
        )}
        <span className="dn-row-menu">
          <RcMenu
            label={`${titleOf(note)}: more`}
            actions={[
              { label: 'Edit', onSelect: edit },
              { label: 'Delete', onSelect: remove, danger: true, separatorBefore: true },
            ]}
          >
            <RcIconButton size="sm" label={`More for “${titleOf(note)}”`}>
              <span className="dn-dots" aria-hidden>
                ···
              </span>
            </RcIconButton>
          </RcMenu>
        </span>
      </div>
      {open && !link && note.content && (
        <div className="dn-body">
          <NoteBody content={note.content} />
        </div>
      )}
    </li>
  );
}

function Group({ label, notes, empty, onAdd }: { label: string; notes: Capture[]; empty: string; onAdd?: () => void }) {
  return (
    <section className="dn-group" aria-label={label}>
      <div className="dn-label">
        <span>{label}</span>
        {onAdd && (
          <RcIconButton size="sm" label={`Add to ${label.toLowerCase()}`} onClick={onAdd}>
            <Plus />
          </RcIconButton>
        )}
      </div>
      {notes.length ? (
        <ul className="dn-list">
          {notes.map((n) => (
            <NoteRow key={n._id} note={n} />
          ))}
        </ul>
      ) : (
        <p className="dn-empty">{empty}</p>
      )}
    </section>
  );
}

/** The panel's content: Notes, Links, then the subject's own (folded). */
export function DocNotes({ place, lesson, subject, failed }: { place: NotesPlace; lesson: Capture[] | null; subject: Capture[] | null; failed: boolean }) {
  const [subjectOpen, setSubjectOpen] = useState(false);
  if (failed && !lesson) return <p className="dn-empty">The notes didn&apos;t load. They come back when the connection does.</p>;
  if (!lesson || !subject) {
    return (
      <div className="flex flex-col gap-3 pt-1" aria-busy>
        <RcSkel className="h-4 w-16" />
        <RcSkel className="h-4 w-48" />
        <RcSkel className="h-4 w-40" />
      </div>
    );
  }
  // Ctrl K on this page saves to this lesson (the palette takes the open doc's subject and topic).
  const addNote = place.topicId ? () => openCapturePalette('note') : undefined;
  const addLink = place.topicId ? () => openCapturePalette('link') : undefined;
  const notes = lesson.filter((n) => !isLink(n));
  const links = lesson.filter(isLink);
  return (
    <div className="dn">
      {place.topicId && (
        <>
          <Group label="Notes" notes={notes} empty="Notes on this lesson show here: ask your chat to add one, or press Ctrl K." onAdd={addNote} />
          <Group label="Links" notes={links} empty="Links you keep for this lesson show here." onAdd={addLink} />
        </>
      )}
      <section className="dn-group" aria-label={`From ${place.subjectName}`}>
        <button type="button" className="dn-label dn-label--fold" aria-expanded={subjectOpen} onClick={() => setSubjectOpen((o) => !o)}>
          <span>
            From the subject · {subject.length}
          </span>
          <ChevronRight aria-hidden strokeWidth={1.75} className={cn('dn-chev', subjectOpen && 'dn-chev--open')} />
        </button>
        {subjectOpen &&
          (subject.length ? (
            <ul className="dn-list">
              {subject.map((n) => (
                <NoteRow key={n._id} note={n} />
              ))}
            </ul>
          ) : (
            <p className="dn-empty">Notes on {place.subjectName} as a whole show here.</p>
          ))}
      </section>
    </div>
  );
}

/**
 * A subject's notes (its page in Docs, STUDY_FLOW_PLAN §4.3): one quiet line, "Notes · 12", opening a sheet with the
 * subject's own notes and links first, then each lesson's under its title.
 */
export function SubjectNotes({ subjectId, subjectName }: { subjectId: string; subjectName: string }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Capture[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      learningApi
        .listCaptures({ subjectId, lessons: true, limit: 200 })
        .then((c) => !cancelled && setAll(c))
        .catch(() => !cancelled && setAll((was) => was ?? []));
    read();
    window.addEventListener(NOTES_CHANGED, read);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTES_CHANGED, read);
    };
  }, [subjectId]);

  const own = (all ?? []).filter((c) => !c.topicId);
  const lessons = new Map<string, { title: string; notes: Capture[] }>();
  for (const c of all ?? []) {
    if (!c.topicId) continue;
    const entry = lessons.get(c.topicId) ?? { title: c.lesson?.title ?? 'A lesson', notes: [] };
    entry.notes.push(c);
    lessons.set(c.topicId, entry);
  }
  return (
    <>
      <button type="button" className="path-notes" onClick={() => setOpen(true)} disabled={!all}>
        Notes · {all ? all.length : '…'}
      </button>
      <RcSheet open={open} onOpenChange={setOpen} title={`Notes on ${subjectName}`}>
        <div className="dn">
          <Group label={`On ${subjectName}`} notes={own} empty={`Notes on ${subjectName} as a whole show here: ask your chat, or press Ctrl K.`} />
          {[...lessons.entries()].map(([id, l]) => (
            <Group key={id} label={l.title} notes={l.notes} empty="" />
          ))}
        </div>
      </RcSheet>
    </>
  );
}
