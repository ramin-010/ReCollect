'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import { Modal } from '@/components/ui-base/Modal';
import { isImageAttachment } from './AttachmentThumbnails';
import { downloadAttachment } from './NoteAttachment';
import { NoteContent } from './NoteContent';
import { lx } from './styles';

/**
 * Revise ResourcePreviewModal + the Quick Notes expanded views: images full size, PDFs in an
 * <object>, Markdown / text rendered with the notes parser (Revise used react-markdown, which
 * Kaaga does not ship), anything else as a download / open link.
 */
function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setText('Could not load this file.'));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return (
    <div className="overflow-y-auto custom-scrollbar p-6">
      {text === null ? (
        <div className={cn('flex items-center justify-center h-40', lx.muted)}>
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <NoteContent content={text} />
      )}
    </div>
  );
}

export function AttachmentPreviewDialog() {
  const preview = useLearningStore((s) => s.preview);
  const close = () => useLearningStore.getState().openPreview(null);
  if (!preview) return null;

  const isImage = isImageAttachment(preview);
  const isPdf = preview.fileType === 'application/pdf' || /\.pdf(\?|$)/i.test(preview.url);
  const isText = !isImage && !isPdf && (/\.(md|txt)$/i.test(preview.title) || !!preview.fileType?.startsWith('text/'));

  if (isImage) {
    return (
      <Modal isOpen onClose={close} showCloseButton={false} className="max-w-[95vw] w-auto bg-transparent shadow-none">
        <div className="relative flex items-center justify-center group/modal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={preview.title} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          <button onClick={close} className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={close} showCloseButton={false} className={cn('max-w-4xl border rounded-xl', lx.border)}>
      <div className="flex flex-col h-[85vh]">
        <div className={cn('flex items-center justify-between p-4 border-b shrink-0', lx.border)}>
          <h3 className={cn('font-medium truncate pr-4', lx.fg)}>{preview.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <a href={preview.url} target="_blank" rel="noopener noreferrer" className={cn('p-2 rounded-lg transition-colors hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} title="Open in a new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => void downloadAttachment({ url: preview.url, fileName: preview.title })} className={cn('p-2 rounded-lg transition-colors hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} title="Download">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={close} className={cn('p-2 rounded-lg transition-colors hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)} title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-[var(--surface-elevated)] flex flex-col">
          {isPdf ? (
            <object data={`${preview.url}#toolbar=0`} type="application/pdf" className="w-full h-full bg-white border-0">
              <div className={cn('flex flex-col items-center justify-center h-full gap-4 p-6 text-center', lx.muted)}>
                <p>Your browser can&apos;t show this PDF here.</p>
                <a href={preview.url} target="_blank" rel="noopener noreferrer" className={cn('px-4 py-2 rounded-md text-sm', lx.primaryBg)}>
                  Open it in a new tab
                </a>
              </div>
            </object>
          ) : isText ? (
            <TextPreview key={preview.url} url={preview.url} />
          ) : (
            <div className={cn('flex flex-col items-center justify-center h-full gap-3', lx.muted)}>
              <p className="text-sm">No preview for this file type.</p>
              <button onClick={() => void downloadAttachment({ url: preview.url, fileName: preview.title })} className={cn('px-4 py-2 rounded-md text-sm', lx.primaryBg)}>
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
