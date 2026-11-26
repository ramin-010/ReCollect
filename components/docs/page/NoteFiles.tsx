'use client';

/**
 * Files on a note (TOOL_ACCESS_PLAN §11.5, 11-27): quiet rows, a glyph by kind, the name, the size. An image opens in
 * the app's preview, any other file in a new tab. The edit dialog adds a remove cross to each row and shows a file
 * being sent (a quiet spinner) or refused (the server's words on its row). Any file up to 10 MB, except videos.
 */
import { useCallback, useState } from 'react';
import { File as FileIcon, FileSpreadsheet, FileText, ImageIcon, Loader2, X } from 'lucide-react';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Attachment } from '@/lib/learning/types';
import { RcIconButton } from '@/components/rc-ui';

export const NOTE_FILES_MAX = 20;
export const FILES_HELP = 'Any file up to 10 MB, except videos.';

/** 812 B, 48 KB, 3.1 MB. */
export function sizeWords(bytes: number | undefined): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (f: Pick<Attachment, 'fileType' | 'fileName'>) => /^image\//i.test(f.fileType) || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.fileName);
const isSheet = (f: Pick<Attachment, 'fileType' | 'fileName'>) => /sheet|excel|csv/i.test(f.fileType) || /\.(xlsx?|csv|tsv|ods)$/i.test(f.fileName);
const isText = (f: Pick<Attachment, 'fileType' | 'fileName'>) => /^text\//i.test(f.fileType) || /\.(md|txt|json|ya?ml|pdf|docx?)$/i.test(f.fileName);

function Glyph({ file }: { file: Pick<Attachment, 'fileType' | 'fileName'> }) {
  const Icon = isImage(file) ? ImageIcon : isSheet(file) ? FileSpreadsheet : isText(file) ? FileText : FileIcon;
  return <Icon aria-hidden strokeWidth={1.75} className="nf-glyph" />;
}

export function openFile(f: Attachment) {
  if (isImage(f)) useLearningStore.getState().openPreview({ url: f.url, title: f.fileName });
  else window.open(f.url, '_blank', 'noopener,noreferrer');
}

/** A file being sent, or refused, before it joins the note's list. */
export interface PendingFile {
  key: string;
  name: string;
  error: string | null;
}

export function NoteFileRows({ files, pending = [], onRemove, onDismiss }: { files: Attachment[]; pending?: PendingFile[]; onRemove?: (f: Attachment) => void; onDismiss?: (key: string) => void }) {
  if (!files.length && !pending.length) return null;
  return (
    <ul className="nf-list" aria-label="Files">
      {files.map((f) => (
        <li key={f.publicId || f.url} className="nf-row">
          <button type="button" className="nf-main" onClick={() => openFile(f)} title={`Open ${f.fileName}`}>
            <Glyph file={f} />
            <span className="nf-name">{f.fileName}</span>
            {f.size !== undefined && <span className="nf-size">{sizeWords(f.size)}</span>}
          </button>
          {onRemove && (
            <RcIconButton size="sm" label={`Remove ${f.fileName}`} onClick={() => onRemove(f)}>
              <X />
            </RcIconButton>
          )}
        </li>
      ))}
      {pending.map((p) => (
        <li key={p.key} className="nf-row" aria-live="polite">
          <span className="nf-main nf-main--static">
            {p.error ? <FileIcon aria-hidden strokeWidth={1.75} className="nf-glyph" /> : <Loader2 aria-hidden className="nf-glyph animate-spin" />}
            <span className="nf-name">{p.name}</span>
            <span className={p.error ? 'nf-error' : 'nf-size'}>{p.error ?? 'Sending…'}</span>
          </span>
          {p.error && onDismiss && (
            <RcIconButton size="sm" label={`Dismiss ${p.name}`} onClick={() => onDismiss(p.key)}>
              <X />
            </RcIconButton>
          )}
        </li>
      ))}
    </ul>
  );
}

const messageOf = (err: unknown): string => {
  const m = (err as { response?: { data?: { message?: unknown } }; message?: unknown })?.response?.data?.message ?? (err as { message?: unknown })?.message;
  return typeof m === 'string' && m ? m : 'That file did not go up. Try again.';
};

/** Sends files one by one (each through the upload rule); each lands in the list, or stays as a row with the refusal. */
export function useFileUploads(files: Attachment[], setFiles: (next: (was: Attachment[]) => Attachment[]) => void) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const add = useCallback(
    async (list: FileList | File[]) => {
      const picked = [...list];
      let room = NOTE_FILES_MAX - files.length;
      for (const file of picked) {
        const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
        if (room <= 0) {
          setPending((p) => [...p, { key, name: file.name, error: `A note holds at most ${NOTE_FILES_MAX} files` }]);
          continue;
        }
        room -= 1;
        setPending((p) => [...p, { key, name: file.name, error: null }]);
        try {
          const stored = await learningApi.uploadLearningFile(file);
          setFiles((was) => [...was, stored]);
          setPending((p) => p.filter((x) => x.key !== key));
        } catch (err) {
          setPending((p) => p.map((x) => (x.key === key ? { ...x, error: messageOf(err) } : x)));
        }
      }
    },
    [files.length, setFiles]
  );
  const dismiss = useCallback((key: string) => setPending((p) => p.filter((x) => x.key !== key)), []);
  const busy = pending.some((p) => !p.error);
  return { pending, add, dismiss, busy };
}
