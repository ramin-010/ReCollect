'use client';

import { useState } from 'react';
import { Check, Copy, Download, FileText, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { Attachment } from '@/lib/learning/types';
import { isImageAttachment } from './AttachmentThumbnails';
import { lx } from './styles';

export async function downloadAttachment(att: { url: string; fileName?: string | null }) {
  try {
    const res = await fetch(att.url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = att.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(att.url, '_blank', 'noopener,noreferrer');
  }
}

async function copyImage(url: string): Promise<boolean> {
  try {
    let blob = await (await fetch(url)).blob();
    if (blob.type !== 'image/png') {
      // Browsers only accept image/png on the clipboard: re-encode through a canvas.
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Revise QuickNotesWidget `SingleAttachment`: an image with expand / copy / download, or a file chip. */
export function NoteAttachment({ attachment }: { attachment: Attachment }) {
  const openPreview = useLearningStore((s) => s.openPreview);
  const [copied, setCopied] = useState(false);
  const isImage = isImageAttachment(attachment);
  const isViewable = attachment.fileType === 'application/pdf' || /\.md$/i.test(attachment.fileName) || attachment.fileType?.startsWith('text/');
  const preview = () => openPreview({ url: attachment.url, title: attachment.fileName || 'Attachment', fileType: attachment.fileType });
  const iconBtn = 'p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors';

  if (isImage) {
    return (
      <div className={cn('group/img relative rounded-lg overflow-hidden max-w-[320px] border', lx.border)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.fileName || 'Attachment'} className="w-full max-h-[250px] object-cover object-top rounded-lg" draggable />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
          <button onClick={preview} className={iconBtn} title="Expand image">
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={async () => {
              if (await copyImage(attachment.url)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className={iconBtn}
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
          </button>
          <button onClick={() => downloadAttachment(attachment)} className={iconBtn} title="Download">
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.lx-download-btn')) return;
        if (isViewable) preview();
        else void downloadAttachment(attachment);
      }}
      className={cn('flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all group/file max-w-[320px] cursor-pointer', lx.card, lx.hover)}
      title={isViewable ? 'Click to view' : 'Click to download'}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[13px] text-[hsl(var(--foreground))]/80 truncate">{attachment.fileName || 'File'}</p>
          <p className={cn('text-[10px] uppercase', lx.muted)}>{attachment.fileType?.split('/')[1] || 'file'}</p>
        </div>
      </div>
      <button
        onClick={() => downloadAttachment(attachment)}
        className={cn('lx-download-btn p-2 -mr-2 rounded-md transition-colors shrink-0 opacity-0 group-hover/file:opacity-100 focus:opacity-100 hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}
        title="Download file"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
