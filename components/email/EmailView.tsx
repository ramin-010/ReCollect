'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emailApi, EmailThreadData } from '@/lib/api/email';
import { Button } from '@/components/ui-base/Button';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  Sparkles,
  Link2,
  Unlink,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Archive,
  ChevronRight,
  ChevronDown,
  Inbox,
  PenLine,
  User,
  Clock,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Shield,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(email: string): string {
  const name = email.split('@')[0] || '';
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(str: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5" />;
  if (file.type.includes('pdf')) return <FileText className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EMAIL VIEW
// ═════════════════════════════════════════════════════════════════════════════
export function EmailView() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [activePanel, setActivePanel] = useState<'threads' | 'compose'>('threads');
  const [threads, setThreads] = useState<EmailThreadData[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThreadData | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await emailApi.getStatus();
      setIsConnected(res.connected);
      setConnectedEmail(res.email);
      if (res.connected) fetchThreads();
    } catch { /* not connected */ } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await emailApi.connect();
      if (res.authUrl) window.location.href = res.authUrl;
    } catch { toast.error('Failed to start Gmail connection'); }
  };

  const handleDisconnect = async () => {
    try {
      await emailApi.disconnect();
      setIsConnected(false);
      setConnectedEmail(null);
      setThreads([]);
      toast.success('Gmail disconnected');
    } catch { toast.error('Failed to disconnect'); }
  };

  const fetchThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const res = await emailApi.getThreads();
      setThreads(res.threads || []);
    } catch { /* silent */ } finally {
      setIsLoadingThreads(false);
    }
  };

  const handleArchive = async (threadId: string) => {
    try {
      await emailApi.archiveThread(threadId);
      setThreads(prev => prev.filter(t => t.gmailThreadId !== threadId));
      if (selectedThread?.gmailThreadId === threadId) setSelectedThread(null);
      toast.success('Thread archived');
    } catch { toast.error('Failed to archive'); }
  };

  // ── Loading ────────────────────────────────────────────
  if (isCheckingStatus) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Checking connection...</span>
        </motion.div>
      </div>
    );
  }

  // ── Not Connected ──────────────────────────────────────
  if (!isConnected) {
    return <NotConnectedScreen onConnect={handleConnect} />;
  }

  // ── Connected Main Layout ──────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="shrink-0 border-b border-[hsl(var(--border))] px-5 py-2.5 flex items-center justify-between bg-[hsl(var(--background))]">
        <div className="flex items-center gap-3">
          {/* Avatar with status */}
          <div className="relative">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(connectedEmail || '')} flex items-center justify-center text-white text-xs font-bold`}>
              {getInitials(connectedEmail || '')}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(var(--background))]" />
          </div>
          <div>
            <span className="text-sm font-medium">{connectedEmail}</span>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center">
          <div className="flex bg-[hsl(var(--muted))]/60 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => { setActivePanel('threads'); setSelectedThread(null); }}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activePanel === 'threads'
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Threads
              {threads.length > 0 && (
                <span className="ml-0.5 text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full">{threads.length}</span>
              )}
            </button>
            <button
              onClick={() => setActivePanel('compose')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activePanel === 'compose'
                  ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              Compose
            </button>
          </div>

          <div className="w-px h-5 bg-[hsl(var(--border))] mx-3" />
          <button onClick={handleDisconnect} className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all" title="Disconnect Gmail">
            <Unlink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activePanel === 'compose' ? (
            <motion.div key="compose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="h-full">
              <ComposePanel onSent={() => { setActivePanel('threads'); fetchThreads(); }} />
            </motion.div>
          ) : selectedThread ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="h-full">
              <ThreadDetailPanel thread={selectedThread} onBack={() => setSelectedThread(null)} onArchive={() => handleArchive(selectedThread.gmailThreadId)} onRefresh={fetchThreads} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ThreadsListPanel threads={threads} isLoading={isLoadingThreads} onSelectThread={setSelectedThread} onRefresh={fetchThreads} onCompose={() => setActivePanel('compose')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSE PANEL
// ═════════════════════════════════════════════════════════════════════════════
function ComposePanel({ onSent }: { onSent: () => void }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'friendly' | 'formal' | 'persuasive'>('professional');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateDraft = async () => {
    if (!context.trim()) return toast.error('Describe what the email should be about');
    setIsDrafting(true);
    try {
      const res = await emailApi.generateDraft({ recipient: to || 'recipient', subject: subject || undefined, context, tone });
      if (res.draft) {
        if (res.draft.subject && !subject) setSubject(res.draft.subject);
        setBody(res.draft.body);
        toast.success(`Draft generated by ${res.draft.provider}`);
        setShowAI(false);
      }
    } catch { toast.error('Failed to generate draft'); } finally { setIsDrafting(false); }
  };

  const handleSend = async () => {
    if (!to.trim()) return toast.error('Recipient is required');
    if (!subject.trim()) return toast.error('Subject is required');
    if (!body.trim()) return toast.error('Email body is required');
    setIsSending(true);
    try {
      await emailApi.send({
        to, subject, htmlBody: body,
        cc: cc || undefined, bcc: bcc || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      toast.success('Email sent!');
      onSent();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally { setIsSending(false); }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const totalSize = [...attachments, ...newFiles].reduce((s, f) => s + f.size, 0);
    if (totalSize > 25 * 1024 * 1024) return toast.error('Total attachments cannot exceed 25MB');
    if (attachments.length + newFiles.length > 5) return toast.error('Maximum 5 attachments');
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  // ── Input field style ──
  const inputClass = "w-full px-0 py-2 bg-transparent border-0 border-b border-[hsl(var(--border))]/60 text-sm focus:outline-none focus:border-[hsl(var(--brand-primary))] transition-colors placeholder:text-[hsl(var(--muted-foreground))]/50";

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[780px] mx-auto px-6 pt-6 pb-4">
          {/* To field */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] w-10 shrink-0">To</span>
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" className={inputClass} />
            {!showCcBcc && (
              <button onClick={() => setShowCcBcc(true)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0 font-medium">
                Cc Bcc
              </button>
            )}
          </div>

          {/* CC / BCC */}
          <AnimatePresence>
            {showCcBcc && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] w-10 shrink-0">Cc</span>
                  <input type="text" value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" className={inputClass} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] w-10 shrink-0">Bcc</span>
                  <input type="text" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="bcc@example.com" className={inputClass} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subject */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] w-10 shrink-0">Subj</span>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" className={`${inputClass} font-medium`} />
          </div>

          {/* Body */}
          <div className="mt-5">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your email here, or use ✨ AI to draft it below..."
              className="w-full min-h-[280px] bg-transparent text-sm leading-relaxed resize-none focus:outline-none placeholder:text-[hsl(var(--muted-foreground))]/40"
              style={{ caretColor: 'hsl(var(--brand-primary))' }}
            />
          </div>

          {/* AI Assistant Panel */}
          <AnimatePresence>
            {showAI && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="mb-4">
                <div className="rounded-xl border border-[hsl(var(--brand-primary))]/15 bg-[hsl(var(--brand-primary))]/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                    <span className="text-sm font-semibold">AI Draft Assistant</span>
                  </div>
                  <textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="Describe what this email should be about..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))]/40 resize-none mb-3"
                  />
                  <div className="flex items-center gap-2">
                    <select value={tone} onChange={e => setTone(e.target.value as any)} className="px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs focus:outline-none">
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="persuasive">Persuasive</option>
                    </select>
                    <Button variant="primary" size="sm" onClick={handleGenerateDraft} isLoading={isDrafting} leftIcon={!isDrafting ? <Sparkles className="w-3.5 h-3.5" /> : undefined}>
                      Generate
                    </Button>
                    <button onClick={() => setShowAI(false)} className="ml-auto p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {attachments.map((file, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))]/60 border border-[hsl(var(--border))]/50 text-xs group">
                  {getFileIcon(file)}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">{formatFileSize(file.size)}</span>
                  <button onClick={() => removeAttachment(i)} className="p-0.5 rounded hover:bg-[hsl(var(--muted))] transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 border-t border-[hsl(var(--border))] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAI(!showAI)} className={`p-2 rounded-lg transition-all ${showAI ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'}`} title="AI Draft">
            <Sparkles className="w-4.5 h-4.5" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all" title="Attach files">
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} accept="*/*" />
        </div>
        <Button variant="primary" size="sm" onClick={handleSend} isLoading={isSending} leftIcon={!isSending ? <Send className="w-4 h-4" /> : undefined}>
          Send
        </Button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THREADS LIST PANEL
// ═════════════════════════════════════════════════════════════════════════════
function ThreadsListPanel({ threads, isLoading, onSelectThread, onRefresh, onCompose }: {
  threads: EmailThreadData[]; isLoading: boolean; onSelectThread: (t: EmailThreadData) => void; onRefresh: () => void; onCompose: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Conversations</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={onRefresh} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="primary" size="sm" onClick={onCompose} leftIcon={<PenLine className="w-3.5 h-3.5" />}>
            Compose
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--brand-primary))]" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))]/60 flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-[hsl(var(--muted-foreground))]/40" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">No conversations yet</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-xs">
              Send your first email and conversations will appear here.
            </p>
            <Button variant="primary" size="sm" onClick={onCompose} leftIcon={<PenLine className="w-3.5 h-3.5" />}>
              Compose Email
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {threads.map((thread, i) => {
              const lastMsg = thread.messages?.[thread.messages.length - 1];
              return (
                <motion.button
                  key={thread.gmailThreadId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelectThread(thread)}
                  className="w-full px-3 py-3 flex items-start gap-3 rounded-xl hover:bg-[hsl(var(--muted))]/50 transition-all text-left group"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(thread.recipient)} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                    {getInitials(thread.recipient)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{thread.recipient.split('@')[0]}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">
                        {lastMsg?.date ? formatRelativeTime(lastMsg.date) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-[hsl(var(--foreground))]/80 truncate">{thread.subject}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                      {lastMsg?.snippet || `${thread.messageCount} message${thread.messageCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THREAD DETAIL PANEL
// ═════════════════════════════════════════════════════════════════════════════
function ThreadDetailPanel({ thread, onBack, onArchive, onRefresh }: {
  thread: EmailThreadData; onBack: () => void; onArchive: () => void; onRefresh: () => void;
}) {
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [replyContext, setReplyContext] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastMessage = thread.messages?.[thread.messages.length - 1];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages]);

  const handleSendReply = async () => {
    if (!replyBody.trim()) return toast.error('Reply body is required');
    setIsSending(true);
    try {
      await emailApi.send({
        to: thread.recipient, subject: `Re: ${thread.subject}`, htmlBody: replyBody,
        threadId: thread.gmailThreadId, inReplyTo: lastMessage?.messageId, references: lastMessage?.messageId,
      });
      toast.success('Reply sent!');
      setReplyBody('');
      setShowReply(false);
      onRefresh();
    } catch { toast.error('Failed to send reply'); } finally { setIsSending(false); }
  };

  const handleDraftReply = async () => {
    if (!replyContext.trim()) return toast.error('Describe what to reply');
    setIsDrafting(true);
    try {
      const res = await emailApi.generateDraft({ recipient: thread.recipient, subject: thread.subject, context: replyContext, tone: 'professional', threadId: thread.gmailThreadId });
      if (res.draft) { setReplyBody(res.draft.body); toast.success('Reply drafted'); }
    } catch { toast.error('Failed to draft'); } finally { setIsDrafting(false); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-[hsl(var(--border))] flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{thread.subject}</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {thread.messages?.length || 0} message{(thread.messages?.length || 0) !== 1 ? 's' : ''} · {thread.recipient}
          </p>
        </div>
        <button onClick={onArchive} className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all" title="Archive">
          <Archive className="w-4 h-4" />
        </button>
      </div>

      {/* Messages — chat bubble style */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {(thread.messages || []).map((msg, i) => {
          const isSent = msg.labelIds?.includes('SENT');
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex gap-3 ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar (incoming only) */}
              {!isSent && (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(msg.from)} flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1`}>
                  {getInitials(msg.from)}
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isSent
                  ? 'bg-[hsl(var(--brand-primary))]/10 border border-[hsl(var(--brand-primary))]/15 rounded-br-md'
                  : 'bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]/50 rounded-bl-md'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium truncate">{msg.from?.split('<')[0]?.trim() || msg.from}</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {msg.date ? formatRelativeTime(msg.date) : ''}
                  </span>
                </div>
                <div className="text-sm leading-relaxed [&_p]:my-1 [&_br]:leading-5" dangerouslySetInnerHTML={{ __html: msg.body || msg.snippet }} />
              </div>

              {/* Avatar (sent only) */}
              {isSent && (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1`}>
                  You
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Section */}
      <div className="shrink-0 border-t border-[hsl(var(--border))] px-5 py-3">
        {!showReply ? (
          <button
            onClick={() => setShowReply(true)}
            className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--brand-primary))]/40 hover:text-[hsl(var(--foreground))] transition-all text-left"
          >
            Click to reply...
          </button>
        ) : (
          <div className="space-y-2.5">
            {/* AI context row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyContext}
                onChange={e => setReplyContext(e.target.value)}
                placeholder="Describe reply for AI (optional)..."
                className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))]/50 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))]/40"
              />
              <Button variant="ghost" size="sm" onClick={handleDraftReply} isLoading={isDrafting} leftIcon={!isDrafting ? <Sparkles className="w-3.5 h-3.5" /> : undefined}>
                AI
              </Button>
            </div>
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))]/50 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))]/40 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSendReply} isLoading={isSending} leftIcon={!isSending ? <Send className="w-3.5 h-3.5" /> : undefined}>
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NOT CONNECTED SCREEN — Landing + Feature Modal + Approval Modal
// ═════════════════════════════════════════════════════════════════════════════
function NotConnectedScreen({ onConnect }: { onConnect: () => void }) {
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-switch slides every 4 seconds
  useEffect(() => {
    if (!showFeatureModal) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, [showFeatureModal]);

  return (
    <>
      {/* ── Step 1: Landing Screen ─────────────────────────── */}
      <div className="flex items-center justify-center h-full p-8 w-full ">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[500px] flex flex-col items-center relative"
        >
          {/* Subtle background glow effect */}
          {/* <div className="absolute top-[-5rem] left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" /> */}

          {/* <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm flex items-center justify-center mb-6 relative z-10">
            <Sparkles className="w-6 h-6 text-[hsl(var(--foreground))]" />
          </div> */}

          <h2 className="text-[26px] font-bold mb-2 tracking-tight text-center bg-gradient-to-br from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))] bg-clip-text ">
            An AI-powered inbox
          </h2>
          <p className="text-[hsl(var(--muted-foreground))]/80 text-[13px] text-center mb-6 max-w-[360px] leading-relaxed">
            Connect Gmail to prioritize conversations, draft replies faster, and understand threads instantly — with AI.
          </p>

          <div className="w-full space-y-2 mb-6">
            <div className="flex items-start gap-3.5 p-3 rounded-xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--card))]/40">
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0 mt-0.5">
                <Inbox className="w-3.5 h-3.5 text-[hsl(var(--foreground))]" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))] mb-0.5">Automated Sorting</h4>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]/70 leading-relaxed">AI automatically highlights important senders and filters out transactional noise.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--card))]/40">
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--foreground))]" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))] mb-0.5">Contextual Drafting</h4>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]/70 leading-relaxed">Generates context-aware responses instantly based on thread history.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--card))]/40">
              <div className="w-7 h-7 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0 mt-0.5">
                <Archive className="w-3.5 h-3.5 text-[hsl(var(--foreground))]" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))] mb-0.5">Thread Summaries</h4>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]/70 leading-relaxed">Extracts the bottom line from long email chains without reading every message.</p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => setShowFeatureModal(true)}
              className="w-full h-[40px] rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[13px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 relative z-10 shadow-sm"
            >
              Enable AI Inbox
            </button>
            <p className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]/50">
              We only access emails sent through this app.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Step 2: Feature Showcase Modal ─────────────────── */}
      <AnimatePresence>
        {showFeatureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowFeatureModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-full max-w-[1120px] max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row" style={{ minHeight: '580px' }}>
                {/* Left: Slides area */}
                <div className="md:flex-[7] flex-1 p-6 border-b md:border-b-0 md:border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--muted))]/50">
                  {/* Top bar — Slide Name + Close */}
                  {/* <div className="flex items-center justify-between mb-3 shrink-0">
                    <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                      {activeSlide === 0 ? 'Smart Inbox' : activeSlide === 1 ? 'AI Composer' : 'Thread View'}
                    </span>
                    <button
                      onClick={() => setShowFeatureModal(false)}
                      className="p-1 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </button>
                  </div> */}

                  {/* Slide content with sliding animation */}
                  <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden shadow-sm relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                        className="absolute inset-0"
                      >
                        {activeSlide === 0 && <SlideInbox />}
                        {activeSlide === 1 && <SlideComposer />}
                        {activeSlide === 2 && <SlideThread />}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Simple dot indicators */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {[0, 1, 2].map(i => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === activeSlide
                            ? 'w-5 h-1.5 bg-[hsl(var(--brand-primary))]'
                            : 'w-1.5 h-1.5 bg-[hsl(var(--muted-foreground))]/40 hover:bg-[hsl(var(--muted-foreground))]/60'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Right: CTA panel — supportive, narrower */}
                <div className="w-full md:w-[280px] md:flex-[3] p-7 flex flex-col justify-center shrink-0 bg-[hsl(var(--background))]">
                  <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
                      <Mail className="w-5 h-5 text-[hsl(var(--foreground))]" />
                    </div>
                    <h4 className="text-[20px] font-bold text-[hsl(var(--foreground))] mb-3 leading-tight">
                      AI-powered email,{'\n'}without switching apps.
                    </h4>
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {activeSlide === 0
                        ? 'AI automatically sorts and prioritises your inbox so you focus on what matters.'
                        : activeSlide === 1
                        ? 'Draft context-aware replies in seconds \u2014 AI reads the thread so you don\u2019t have to.'
                        : 'Get instant summaries of long email chains and never lose track of a conversation.'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowApprovalModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2.5 h-[42px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors text-[13px] font-medium text-[hsl(var(--foreground))] group"
                  >
                    <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect with Google
                    <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <p className="mt-4 text-[10px] text-[hsl(var(--muted-foreground))]/50 text-center leading-relaxed">
                    Your data stays private. We only access emails sent from this app.
                  </p>
                  { (
                    <p className="mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]/40 text-center">
                      You can disconnect anytime.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 3: Approval Warning Modal ─────────────────── */}
      <AnimatePresence>
        {showApprovalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowApprovalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-full max-w-[400px] p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
                <Clock className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </div>

              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                Coming Soon
              </h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-6 max-w-[300px] mx-auto">
                We&apos;re currently in the process of getting verified by Google. This feature will be available as soon as the review is complete.
              </p>

              <div className="flex items-center justify-center gap-3 text-[12px] text-[hsl(var(--muted-foreground))]/70 mb-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Verification in progress</span>
                </div>
              </div>

              <button
                onClick={() => setShowApprovalModal(false)}
                className="w-full h-[40px] rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SLIDE MOCKUPS — clean UI snapshots
// ═════════════════════════════════════════════════════════════════════════════

export  function SlideInbox() {
  const emails = [
    { from: 'Sarah Chen', email: 'sarah@company.com', subject: 'Q4 Marketing Strategy Review', snippet: 'Hey, I\'ve attached the updated deck with the new campaign metrics. Can you review before our sync tomorrow?', time: '2m ago', unread: true, hasAttachment: true, avatar: 'SC', priority: 'high' as const },
    { from: 'Alex Rivera', email: 'alex.r@startup.io', subject: 'Re: Series A Term Sheet', snippet: 'Thanks for the quick turnaround. The investors are aligned on the valuation, just need final sign-off from legal.', time: '14m ago', unread: true, hasAttachment: false, avatar: 'AR', priority: 'high' as const },
    { from: 'GitHub', email: 'noreply@github.com', subject: '[recollect] Pull request #142 merged', snippet: 'feat: implement email thread tracking — merged by ramin-010 into main', time: '1h ago', unread: false, hasAttachment: false, avatar: 'GH', priority: null },
    { from: 'David Park', email: 'david.park@design.co', subject: 'Updated wireframes for dashboard', snippet: 'Attached the v3 wireframes. Main changes: simplified nav, new card layout for the analytics section.', time: '3h ago', unread: false, hasAttachment: true, avatar: 'DP', priority: null },
    { from: 'Priya Sharma', email: 'priya@analytics.io', subject: 'Weekly metrics report — Dec W1', snippet: 'Here are the highlights: DAU up 12%, retention improved to 68%, conversion rate at 4.2%.', time: '5h ago', unread: false, hasAttachment: false, avatar: 'PS', priority: null },
    { from: 'LinkedIn', email: 'notifications@linkedin.com', subject: 'You have 3 new connection requests', snippet: 'John Doe (SWE at Google), Jane Smith (PM at Meta), and 1 other want to connect with you.', time: 'Yesterday', unread: false, hasAttachment: false, avatar: 'LI', priority: null },
  ];

  return (
    <div className="h-full flex flex-col text-[hsl(var(--foreground))] bg-[hsl(var(--background))] p-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[12px] font-semibold">Inbox</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-medium">2 new</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] font-medium flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            AI sorted
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-medium">All</div>
          <div className="text-[10px] px-2 py-0.5 rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Unread</div>
          <div className="text-[10px] px-2 py-0.5 rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Starred</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]/50">
          <svg className="w-3 h-3 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Search emails...</span>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-hidden">
        {emails.map((email, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 border-b border-[hsl(var(--border))]/40 hover:bg-[hsl(var(--muted))]/30 cursor-pointer transition-colors ${
              email.unread
                ? 'bg-[hsl(var(--muted))]/20 border-l-2 border-l-[hsl(var(--brand-primary))]'
                : ''
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${email.unread ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
              {email.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[11px] truncate ${email.unread ? 'font-bold' : 'font-medium'}`}>{email.from}</span>
                  {email.priority === 'high' && (
                    <span className="text-[8px] px-1 py-px rounded bg-amber-500/15 text-amber-500 font-semibold shrink-0">Priority</span>
                  )}
                  {email.hasAttachment && <Paperclip className="w-2.5 h-2.5 text-[hsl(var(--muted-foreground))] shrink-0" />}
                </div>
                <span className="text-[9px] text-[hsl(var(--muted-foreground))] shrink-0 ml-2">{email.time}</span>
              </div>
              <p className={`text-[11px] truncate ${email.unread ? 'font-semibold' : 'text-[hsl(var(--muted-foreground))]'}`}>{email.subject}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70 truncate mt-0.5">{email.snippet}</p>
            </div>
            {email.unread && <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-primary))] shrink-0 mt-2.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export  function SlideComposer() {
  return (
    <div className="h-full flex flex-col text-[hsl(var(--foreground))] bg-[hsl(var(--background))] p-1">
      {/* Compose header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <span className="text-[12px] font-semibold">AI Composer</span>
        <div className="flex items-center gap-1.5">
          {/* <div className="text-[10px] px-2 py-0.5 rounded bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] flex items-center gap-1 font-medium">
            <Sparkles className="w-2.5 h-2.5" />
            AI Assist On
          </div> */}
        </div>
      </div>

      {/* Form fields — lower contrast so AI suggestion pops */}
      <div className="border-b border-[hsl(var(--border))]">
        <div className="flex items-center px-4 py-1.5 border-b border-[hsl(var(--border))]/40">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60 w-8 shrink-0">To</span>
          <span className="text-[11px] text-[hsl(var(--foreground))]/70">sarah@company.com</span>
        </div>
        <div className="flex items-center px-4 py-1.5 border-b border-[hsl(var(--border))]/40">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60 w-8 shrink-0">Cc</span>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]/50">alex.r@startup.io</span>
        </div>
        <div className="flex items-center px-4 py-1.5">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]/60 w-8 shrink-0">Subj</span>
          <span className="text-[11px] font-medium text-[hsl(var(--foreground))]/70">Re: Q4 Marketing Strategy Review</span>
        </div>
      </div>

      {/* Body + AI suggestion */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-[hsl(var(--foreground))]/60">Hi Sarah,</p>
          <p className="text-[11px] leading-relaxed mt-2 text-[hsl(var(--foreground))]/60">
            Thanks for sharing the updated deck. I&apos;ve reviewed the campaign metrics and the numbers look promising — especially the 23% lift in engagement.
          </p>
          <p className="text-[11px] leading-relaxed mt-2 text-[hsl(var(--foreground))]/60">
            A couple of thoughts:
          </p>

          {/* AI suggestion — system response with left accent */}
          <div className="mt-3 px-3 py-2.5 rounded-lg border border-blue-400/35 bg-blue-500/[0.06]  border-l-blue-400">
            <div className="flex items-center gap-1.5 mb-2">
            
              <span className="text-[10px] font-bold text-blue-300">AI recommends</span>
            </div>
            <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">
              1. Consider reallocating 15% of the social budget to content marketing based on the ROI data.{'\n'}
              2. The retention funnel shows a drop-off at step 3 — might be worth A/B testing the CTA copy.{'\n'}
              3. Let&apos;s schedule a sync this Thursday to align on the final budget before the board meeting.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button className="text-[10px] px-2.5 py-1 rounded-md bg-blue-500 text-white font-semibold">Accept</button>
              <button className="text-[9px] px-2 py-0.5 rounded border border-blue-400/25 text-blue-300 font-medium">Regenerate</button>
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="text-[9px] px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center gap-1 font-medium">
              <Paperclip className="w-2.5 h-2.5" />
              2 files
            </div>
          </div>
          <button className="text-[10px] px-3 py-1 rounded-md bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold flex items-center gap-1">
            <Send className="w-2.5 h-2.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function SlideThread() {
  return (
    <div className="h-full flex flex-col text-[hsl(var(--foreground))] bg-[hsl(var(--background))] p-1">
      {/* Thread header */}
      <div className="px-4 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <p className="text-[12px] font-bold">Re: Series A Term Sheet</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Between</span>
          <span className="text-[9px] font-medium">You</span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))]">and</span>
          <span className="text-[9px] font-medium">Alex Rivera &lt;alex.r@startup.io&gt;</span>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] ml-auto">4 messages · Dec 2</span>
        </div>
      </div>

      {/* AI Thread Summary */}
      <div className="mx-4 mt-2.5 mb-1 px-3 py-2 rounded-lg border border-[hsl(var(--brand-primary))]/15 bg-[hsl(var(--brand-primary))]/[0.04]">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-[hsl(var(--brand-primary))]" />
          <span className="text-[9px] font-bold text-[hsl(var(--brand-primary))]">Thread Summary</span>
        </div>
        <p className="text-[9px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          Discussing Series A valuation ($12M pre-money). Pro-rata rights pending legal sign-off, docs expected by EOD tomorrow. Sync confirmed Thursday 2pm PST.
        </p>
      </div>

      {/* Messages — email thread style */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Message 1 — sent */}
        <div className="px-4 py-2 border-b border-[hsl(var(--border))]/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--foreground))] flex items-center justify-center text-[7px] font-bold text-[hsl(var(--background))]">Y</div>
              <span className="text-[10px] font-semibold">You</span>
              <span className="text-[8px] text-[hsl(var(--muted-foreground))]">→ alex.r@startup.io</span>
            </div>
            <span className="text-[8px] text-[hsl(var(--muted-foreground))]">10:24 AM</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))] pl-[26px]">Hey Alex, following up on the term sheet. Have the investors confirmed the valuation cap?</p>
        </div>

        {/* Message 2 — received, indented */}
        <div className="pl-3 px-4 py-2 border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[7px] font-bold text-[hsl(var(--muted-foreground))]">AR</div>
              <span className="text-[10px] font-semibold">Alex Rivera</span>
              <span className="text-[8px] text-[hsl(var(--muted-foreground))]">→ You</span>
            </div>
            <span className="text-[8px] text-[hsl(var(--muted-foreground))]">10:31 AM</span>
          </div>
          <div className="pl-[26px]">
            <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">Yes! They&apos;re aligned at $12M pre-money. Just waiting on legal to finalize the pro-rata rights clause. Should have docs ready by EOD tomorrow.</p>
          </div>
        </div>

        {/* Message 3 — sent */}
        <div className="px-4 py-2 border-b border-[hsl(var(--border))]/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--foreground))] flex items-center justify-center text-[7px] font-bold text-[hsl(var(--background))]">Y</div>
              <span className="text-[10px] font-semibold">You</span>
              <span className="text-[8px] text-[hsl(var(--muted-foreground))]">→ alex.r@startup.io</span>
            </div>
            <span className="text-[8px] text-[hsl(var(--muted-foreground))]">10:33 AM</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))] pl-[26px]">Perfect. I&apos;ll loop in our counsel to review once you send them over. Also — are we still on for Thursday&apos;s sync?</p>
        </div>

        {/* Message 4 — received, indented */}
        <div className="pl-3 px-4 py-2 border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[7px] font-bold text-[hsl(var(--muted-foreground))]">AR</div>
              <span className="text-[10px] font-semibold">Alex Rivera</span>
              <span className="text-[8px] text-[hsl(var(--muted-foreground))]">→ You</span>
            </div>
            <span className="text-[8px] text-[hsl(var(--muted-foreground))]">10:40 AM</span>
          </div>
          <div className="pl-[26px]">
            <p className="text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">Thursday works. Let&apos;s do 2pm PST. I&apos;ll send a calendar invite.</p>
            <p className="text-[9px] text-[hsl(var(--muted-foreground))]/60 mt-1.5 italic">— Alex Rivera · Partner @ Startup.io</p>
            {/* Quoted previous */}
            <div className="mt-1.5 pl-2 border-l-2 border-[hsl(var(--border))]">
              <p className="text-[9px] text-[hsl(var(--muted-foreground))]/50 truncate">On Dec 2 at 10:33, You wrote: Perfect. I&apos;ll loop in our counsel...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reply bar */}
      <div className="px-4 py-2 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
          <span className="flex-1 text-[10px] text-[hsl(var(--muted-foreground))]">Reply to Alex Rivera...</span>
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            <Sparkles className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            <Send className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>
      </div>
    </div>
  );
}

