'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui-base/Button';
import { ArrowLeft, Shield } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

/**
 * The privacy page (ECOSYSTEM_V2_PLAN stage 11, §9.6 item 6): what the app really keeps, what its AI reads, who can see
 * what, and how to take it all out or delete it. Plain words; nothing it does not do.
 */
export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer text-slate-900" onClick={() => router.push('/')}>
            <Logo size="lg" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-600 mb-6">
            <Shield size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy</h1>
          <p className="text-lg text-slate-500">Last updated: 20 November 2026</p>
        </div>

        <div className="max-w-none space-y-10 text-[17px] leading-[1.65] text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Who runs it</h2>
            <p>
              Kaaga is a personal app run by one person (&quot;the owner&quot;) for themselves and the people they invite. New accounts are by
              invitation only. This page says plainly what it keeps about you, what its AI reads, who can see what, and how to take everything out or
              delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. What it keeps</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account: your name, your email address, your time zone, and your password (only as a hash) or your Google sign-in.</li>
              <li>What you put in: docs, notes, tasks, reminders, goals, study sessions, revisions, and the files you upload.</li>
              <li>Your conversations with Ask Kaaga.</li>
              <li>What Kaaga keeps (when it is on): short notes and memories about you, the things it keeps an eye on, its questions and your answers, and a work log if you turn it on. You see all of it on About you.</li>
              <li>Numbers about use: the AI calls made for you and what they cost, and the last day you opened the app.</li>
              <li>What you send the owner: feedback, and the phone app&apos;s diagnostics (model, Android version, screen size, its permissions) only when you tap Send.</li>
              <li>A sign-in cookie so you stay signed in. No advertising or tracking cookies, and nothing is sold.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. What the AI reads</h2>
            <p>Only while the app&apos;s AI is on for your account (the owner&apos;s free AI, or your own Claude key):</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>What you type in Ask Kaaga, and the parts of your plan and notes it looks up to answer.</li>
              <li>If you connect Claude Code with Kaaga&apos;s hooks: the words you type to your coding agent. They are cleaned of anything that looks like a password or key, read by Kaaga, and then deleted; only the notes it keeps stay, and you can see, change or delete each one. A folder you mark as work is never read this way.</li>
              <li>What a connected chat (claude.ai, ChatGPT, Claude Code) chooses to save to Kaaga while you talk to it.</li>
              <li>An export of your other chats, only if you bring one in.</li>
            </ul>
            <p className="mt-3">
              The text each feature needs is sent to Anthropic&apos;s Claude API to write the answer; Anthropic&apos;s own terms cover what happens there.
              Without AI, nothing is sent anywhere and the rest of the app works.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Where it lives, and who can see it</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Your content is stored in the app&apos;s database on its server. It is <strong>not end-to-end encrypted</strong>: the server reads it so
                search, revisions, reminders, sharing and the AI work. Your own Claude key is the exception: it is kept encrypted and never shown again.
              </li>
              <li>Files you upload are stored with Cloudinary. Emails (sign-in codes, reminders, the morning note) are sent through an email service.</li>
              <li>
                The owner runs the server, so like the operator of any server they could reach the database. In the app they see only, for each
                person: name, email, when they joined and were last active, the AI they used by feature and its cost, the apps they connected, and what
                they sent the owner. Never your docs, notes, chats or memories.
              </li>
              <li>Agents you connect can read and change your data as Settings › Agents describes; you can end any of them there at any time.</li>
              <li>A doc you publish can be read by anyone with its link; a doc you share can be read or edited by the people you add.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Your say over it</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>On About you: pause Kaaga, turn off what it does, edit any memory, keep one private, or forget it.</li>
              <li>Settings › Your data › Download everything: one file with all of the above that is yours.</li>
              <li>
                Settings › Your data › Delete your account: removes your account and everything in it at once. Backups of the database may hold a copy
                until they roll over.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Contact</h2>
            <p>Questions about this page: Settings › Send feedback reaches the owner, or email recollect.support@gmail.com.</p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Kaaga</p>
      </footer>
    </div>
  );
}
