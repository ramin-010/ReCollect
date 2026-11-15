'use client';

/**
 * Our file panel for an empty image block ("Add image", or /image): Upload or Link, on the float
 * layer, Notion's two choices. Uploads go through the editor's `uploadFile` (Cloudinary, as a paste
 * does); a link is used as it is. Replaces BlockNote's panel, which needs a UI kit we don't load.
 */
import { useRef, useState } from 'react';
import { useBlockNoteEditor, useExtension } from '@blocknote/react';
import { FilePanelExtension } from '@blocknote/core/extensions';
import { ImageUp, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';

type Ed = {
  getBlock: (id: string) => { id: string; type: string } | undefined;
  updateBlock: (id: string, update: { props: Record<string, unknown> }) => void;
  uploadFile?: (file: File, blockId?: string) => Promise<string | Record<string, unknown>>;
  focus: () => void;
};

export function RcFilePanel({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor() as unknown as Ed;
  const panel = useExtension(FilePanelExtension);
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const block = editor.getBlock(blockId);
  if (!block) return null;

  const close = () => {
    panel.closeMenu();
    editor.focus();
  };
  const upload = async (file: File | undefined) => {
    if (!file || !editor.uploadFile) return;
    setBusy(true);
    setProblem(null);
    try {
      const res = await editor.uploadFile(file, blockId);
      if (!editor.getBlock(blockId)) return;
      editor.updateBlock(blockId, { props: typeof res === 'string' ? { name: file.name, url: res } : res });
      close();
    } catch (e) {
      // The server says what was wrong with the file (400); anything else is the connection.
      const said = (e as { response?: { status?: number; data?: { error?: string } } }).response;
      setProblem(said?.status === 400 && said.data?.error ? said.data.error : 'The image did not upload. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };
  const embed = () => {
    const link = url.trim();
    if (!/^https?:\/\/\S+$/i.test(link)) {
      setProblem('Paste a link that starts with http:// or https://');
      return;
    }
    editor.updateBlock(blockId, { props: { url: link, name: link.split('/').pop() ?? '' } });
    close();
  };

  return (
    <div className={cn(rcScope, 'lab-menu lab-file-panel')} role="dialog" aria-label="Add an image">
      <div className="lab-file-tabs" role="tablist">
        {(['upload', 'link'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="lab-file-tab"
            onClick={() => {
              setTab(t);
              setProblem(null);
            }}
          >
            {t === 'upload' ? 'Upload' : 'Link'}
          </button>
        ))}
      </div>
      {tab === 'upload' ? (
        <div className="lab-file-body">
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
          <button type="button" className="rc-btn rc-btn--outline lab-file-main" disabled={busy} onClick={() => input.current?.click()}>
            <ImageUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {busy ? 'Uploading…' : 'Choose an image'}
          </button>
          <p className="lab-file-note">Or paste or drop an image straight into the doc.</p>
        </div>
      ) : (
        <form
          className="lab-file-body"
          onSubmit={(e) => {
            e.preventDefault();
            embed();
          }}
        >
          <input
            autoFocus
            className="lab-menu-search lab-file-url"
            placeholder="Paste the image link…"
            aria-label="Image link"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                close();
              }
            }}
          />
          <button type="submit" className="rc-btn lab-file-main">
            <Link2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Use this image
          </button>
        </form>
      )}
      {problem && (
        <p className="lab-file-note lab-file-problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
