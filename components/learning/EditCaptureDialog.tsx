'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Loader2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui-base/Modal';
import { useLearningStore, type EditCaptureTarget } from '@/lib/store/learningStore';
import { lx } from './styles';
import type { Attachment } from '@/lib/learning/types';
import { FILES_HELP, NoteFileRows, useFileUploads } from '@/components/docs/page/NoteFiles';
import '@/components/docs/page/doc-notes.css';

/** Revise GlobalEditCaptureModal, opened from the store (`openEditCapture`) instead of a window event. */
export function EditCaptureDialog() {
  const target = useLearningStore((s) => s.editCapture);
  if (!target) return null;
  return <EditCaptureBody key={target.captureId} target={target} />;
}

function EditCaptureBody({ target }: { target: EditCaptureTarget }) {
  const close = () => useLearningStore.getState().openEditCapture(null);
  const [title, setTitle] = useState(target.title);
  const [content, setContent] = useState(target.content);
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  // TOOL_ACCESS_PLAN §11.5: its files: attach several at once (or drop them on the dialog), remove one, save the list.
  const [files, setFiles] = useState<Attachment[]>(target.attachments ?? []);
  const uploads = useFileUploads(files, setFiles);
  const picker = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDropping(false);
    void uploads.add(e.dataTransfer.files);
  };

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const save = async () => {
    setIsSaving(true);
    const changedFiles = JSON.stringify(files) !== JSON.stringify(target.attachments ?? []);
    const ok = await useLearningStore.getState().updateCapture(target.captureId, { title, content, ...(changedFiles ? { attachments: files } : {}) });
    setIsSaving(false);
    if (ok) close();
  };

  return (
    <Modal isOpen onClose={() => !isSaving && close()} showCloseButton={false} size="xl" className={cn('max-w-3xl border rounded-2xl', lx.border)}>
      <div
        className={cn('p-5 flex flex-col gap-3', dropping && 'nf-drop')}
        onDragOver={(e) => {
          if (![...e.dataTransfer.types].includes('Files')) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={onDrop}
      >
        <TextareaAutosize
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)..."
          maxRows={3}
          className={cn('w-full bg-transparent text-[15px] font-medium outline-none resize-none custom-scrollbar placeholder:text-[hsl(var(--muted-foreground))]', lx.fg)}
        />
        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content..."
          className="w-full bg-transparent text-[14px] text-[hsl(var(--foreground))]/80 outline-none resize-none min-h-[60px] custom-scrollbar placeholder:text-[hsl(var(--muted-foreground))]"
        />
        <div className="rc flex flex-col gap-1">
          <NoteFileRows files={files} pending={uploads.pending} onRemove={(f) => setFiles((was) => was.filter((x) => x !== f))} onDismiss={uploads.dismiss} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => picker.current?.click()} className={cn('flex items-center gap-1.5 text-[13px] font-medium px-2 py-1 rounded-md transition-colors hover:bg-[hsl(var(--foreground))]/5', lx.muted)}>
              <Paperclip className="w-3.5 h-3.5" aria-hidden />
              Attach files
            </button>
            <span className={cn('text-[12px]', lx.muted)}>{FILES_HELP}</span>
          </div>
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void uploads.add(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center justify-between">
        <div className={cn('px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit', lx.primarySoft)}>
          <span className="text-[10px] font-bold uppercase tracking-wider">Editing Capture</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={close} className={cn('text-[13px] font-medium transition-colors px-3 py-1.5 hover:text-[hsl(var(--foreground))]', lx.muted)}>
            Cancel
          </button>
          <button onClick={() => void save()} disabled={isSaving || uploads.busy} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-50 hover:bg-[hsl(var(--primary))]/20', lx.primarySoft)}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
