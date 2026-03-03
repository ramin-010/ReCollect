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
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [activePanel, setActivePanel] = useState<'threads' | 'compose'>('threads');
  const [threads, setThreads] = useState<EmailThreadData[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThreadData | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  useEffect(() => { checkStatus(); }, []);

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
    return (
      <div className="flex items-center justify-center h-full p-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg w-full text-center">
          {/* Animated icon */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[hsl(var(--brand-primary))]/15 to-[hsl(var(--brand-secondary))]/15 border border-[hsl(var(--brand-primary))]/20 flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-primary))]/5 to-transparent" />
            <Mail className="w-11 h-11 text-[hsl(var(--brand-primary))] relative z-10" />
          </motion.div>

          <h2 className="text-3xl font-bold mb-3 tracking-tight">AI Email</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed max-w-sm mx-auto">
            Draft emails with AI and send directly from your Gmail. 
            Your account, your identity — we just make it faster.
          </p>

          <Button variant="primary" size="lg" onClick={handleConnect} leftIcon={<Link2 className="w-5 h-5" />}>
            Connect Gmail
          </Button>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Shield className="w-3.5 h-3.5" />
            <span>Only emails sent from this app are tracked. Your inbox stays private.</span>
          </div>
        </motion.div>
      </div>
    );
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
