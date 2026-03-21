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
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]/80 truncate mt-0.5">{email.snippet}</p>
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
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-8 shrink-0">To</span>
          <span className="text-[11px] text-[hsl(var(--foreground))]">sarah@company.com</span>
        </div>
        <div className="flex items-center px-4 py-1.5 border-b border-[hsl(var(--border))]/40">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]/80 w-8 shrink-0">Cc</span>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]/80">alex.r@startup.io</span>
        </div>
        <div className="flex items-center px-4 py-1.5">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]/90 w-8 shrink-0">Subj</span>
          <span className="text-[11px] font-medium text-[hsl(var(--foreground))]/90">Re: Q4 Marketing Strategy Review</span>
        </div>
      </div>

      {/* Body + AI suggestion */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-[hsl(var(--foreground))]/80">Hi Sarah,</p>
          <p className="text-[11px] leading-relaxed mt-2 text-[hsl(var(--foreground))]/80">
            Thanks for sharing the updated deck. I&apos;ve reviewed the campaign metrics and the numbers look promising — especially the 23% lift in engagement.
          </p>
          <p className="text-[11px] leading-relaxed mt-2 text-[hsl(var(--foreground))]/80">
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
              <p className="text-[9px] text-[hsl(var(--muted-foreground))]/80 truncate">On Dec 2 at 10:33, You wrote: Perfect. I&apos;ll loop in our counsel...</p>
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
