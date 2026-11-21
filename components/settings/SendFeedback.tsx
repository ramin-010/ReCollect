'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton } from '@/components/rc-ui';
import { ownerApi } from '@/lib/api/ownerApi';
import './settings.css';

/**
 * Settings › Send feedback (ECOSYSTEM_V2_PLAN stage 11, §9.6 item 5): a few words to the person who runs this server.
 * They land on the owner's People page with the sender's name; nothing else is sent with them.
 */
export function SendFeedback() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await ownerApi.sendFeedback(text.trim(), typeof window !== 'undefined' ? window.location.pathname : undefined);
      setText('');
      setSent(true);
      toast.success('Sent. Thank you.');
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'It wasn’t sent. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(rcScope, 'set-section')}>
      <label htmlFor="feedback-text" className="rc-field-label">
        What works, what doesn’t, what you wish it did
      </label>
      <textarea
        id="feedback-text"
        className="rc-textarea"
        rows={6}
        maxLength={4000}
        value={text}
        placeholder="A bug, an idea, a moment it got something right or wrong…"
        onChange={(e) => {
          setText(e.target.value);
          setSent(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send();
        }}
      />
      <p className="rc-field-help">It goes to the person who runs this server, with your name. Only your words are sent: no notes, chats or screenshots.</p>
      <div className="mt-3 flex items-center gap-3">
        <RcButton variant="main" busy={busy} disabled={!text.trim()} onClick={() => void send()}>
          Send feedback
        </RcButton>
        {sent && <span className="rc-meta">Sent.</span>}
      </div>
    </div>
  );
}
