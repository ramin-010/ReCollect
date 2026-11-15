'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui-base/Button';
import { ArrowLeft, Shield } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

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
      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
                <Shield size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-slate-500">Last updated: 15 November 2026</p>
        </div>

        <div className="prose prose-slate prose-lg max-w-none space-y-8 text-slate-700">
            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
                <p>
                    Recollect (&quot;we&quot;, &quot;us&quot;) is a learning app built and run by one engineer. This page says plainly what it keeps about you,
                    where that lives, and who else sees it.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. What it keeps</h2>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>Your account: your name, your email address, and your password (stored only as a hash) or your Google sign-in.</li>
                    <li>What you put in: docs, notes, tasks, goals, study sessions and revisions, and the files you upload.</li>
                    <li>A sign-in cookie, so you stay signed in. No advertising or tracking cookies.</li>
                </ul>
                <p className="mt-4">There are no payments, so no payment data.</p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Where it lives, and who sees it</h2>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>
                        Your content is stored in the app&apos;s database on its server. It is <strong>not end-to-end encrypted</strong>: the server reads it so
                        search, revisions, sharing and the AI features work.
                    </li>
                    <li>Files you upload are stored with Cloudinary.</li>
                    <li>When you use an AI feature (Ask AI, Recall, the weekly coach), the text it needs is sent to Anthropic&apos;s API to write the answer.</li>
                    <li>Agents you connect with a token, or by signing in from an app, can read and change your data as Settings → Agents describes. You can end any of them there at any time.</li>
                    <li>A doc you publish can be read by anyone with its link; a doc you share can be read or edited by the people you add.</li>
                    <li>Nothing is sold, and nothing is used for advertising.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Contact</h2>
                <p>
                    If you have questions or comments about this policy, you may email us at recollect.support@gmail.com.
                </p>
            </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Recollect</p>
      </footer>
    </div>
  );
}
