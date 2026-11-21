'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui-base/Button';
import { ArrowLeft, BookOpenCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

/**
 * The terms (ECOSYSTEM_V2_PLAN stage 11, §9.6 item 6): true to what Recollect is, a personal app one person runs for the
 * people they invite, with free AI that has limits and can end, and your words always yours to take out or delete.
 */
export default function TermsPage() {
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
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-500/10 text-indigo-600 mb-6">
            <BookOpenCheck size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms</h1>
          <p className="text-lg text-slate-500">Last updated: 20 November 2026</p>
        </div>

        <div className="max-w-none space-y-10 text-[17px] leading-[1.65] text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. What Recollect is</h2>
            <p>
              A personal app for keeping what you learn alive and what you plan in one place, run by one person (&quot;the owner&quot;) for themselves
              and the people they invite. It is not a company&apos;s product and it has no paid plans. By making an account you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Your content is yours</h2>
            <p>
              Everything you put in stays yours. You let the app store it and work with it to run its features: search, revisions, reminders, sharing,
              and, while the AI is on for you, sending the parts a feature needs to Anthropic&apos;s Claude API. The{' '}
              <Link href="/privacy" className="underline hover:text-slate-900">
                privacy page
              </Link>{' '}
              says exactly what is kept and who can see it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Free AI, and your own key</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The owner may give you free AI on their key. It has limits: what you were given, a limit a day, and a total for all friends each month.
                When it runs out, the AI waits calmly and everything else keeps working; the owner may top it up, change the limits or end it.
              </li>
              <li>If you add your own Claude key, its use is billed to you by Anthropic under their terms, and it costs the owner nothing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Using it fairly</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep your sign-in to yourself; the account is for one person.</li>
              <li>Don&apos;t use it to break the law, to store other people&apos;s private information without their permission, or to harm anyone.</li>
              <li>Don&apos;t try to get around its limits, reach other people&apos;s data, or overload the server.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. No promises it never changes</h2>
            <p>
              Recollect is built and run by one person. It is offered as it is, without a guarantee that it is always available, free of mistakes, or
              kept forever: it may change, pause or stop. Keep your own copy of what matters with Settings › Your data › Download everything. The
              owner is not responsible for losses from using it, as far as the law allows.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Ending</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You can delete your account at any time in Settings › Your data; everything in it is removed at once.</li>
              <li>
                The owner can end an account&apos;s access, for example when these terms are broken. The account and its content are kept, and you can
                ask the owner for a copy or for it to be deleted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Changes and contact</h2>
            <p>
              When these terms change, the date above changes. Questions: Settings › Send feedback reaches the owner, or email
              recollect.support@gmail.com.
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
