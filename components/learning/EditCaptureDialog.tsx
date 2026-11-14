'use client';

import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui-base/Modal';
import { useLearningStore, type EditCaptureTarget } from '@/lib/store/learningStore';
import { lx } from './styles';

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

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const save = async () => {
    setIsSaving(true);
    const ok = await useLearningStore.getState().updateCapture(target.captureId, { title, content });
    setIsSaving(false);
    if (ok) close();
  };

  return (
    <Modal isOpen onClose={() => !isSaving && close()} showCloseButton={false} size="xl" className={cn('max-w-3xl border rounded-2xl', lx.border)}>
      <div className="p-5 flex flex-col gap-3">
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
      </div>
      <div className="px-3 pb-3 flex items-center justify-between">
        <div className={cn('px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit', lx.primarySoft)}>
          <span className="text-[10px] font-bold uppercase tracking-wider">Editing Capture</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={close} className={cn('text-[13px] font-medium transition-colors px-3 py-1.5 hover:text-[hsl(var(--foreground))]', lx.muted)}>
            Cancel
          </button>
          <button onClick={() => void save()} disabled={isSaving} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-50 hover:bg-[hsl(var(--primary))]/20', lx.primarySoft)}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
