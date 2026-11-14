'use client';

import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Attachment } from '@/lib/learning/types';
import { lx } from './styles';

export const isImageAttachment = (a: { url: string; fileType?: string | null }) =>
  !!a.fileType?.startsWith('image/') || /\.(jpe?g|gif|png|webp|svg)(\?|$)/i.test(a.url);

/** Revise's 32 px attachment squares under a row; clicking one opens the preview dialog. */
export function AttachmentThumbnails({ attachments, fallbackTitle, dimmed }: { attachments: Attachment[]; fallbackTitle: string; dimmed?: boolean }) {
  const openPreview = useLearningStore((s) => s.openPreview);
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att, idx) => {
        const isImg = isImageAttachment(att);
        return (
          <button
            key={`${att.url}-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              openPreview({ url: att.url, title: att.fileName || fallbackTitle || 'Attachment', fileType: att.fileType });
            }}
            className="block"
            title={att.fileName}
          >
            {isImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={att.url} alt={att.fileName || 'Attachment'} className={cn('w-8 h-8 object-cover rounded-sm border hover:opacity-80 transition-opacity', lx.border, dimmed && 'opacity-40')} />
            ) : (
              <div className={cn('flex items-center justify-center w-8 h-8 rounded-sm transition-colors', lx.card, lx.hover, dimmed && 'opacity-40')}>
                <Paperclip className={cn('w-3 h-3', lx.muted)} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
