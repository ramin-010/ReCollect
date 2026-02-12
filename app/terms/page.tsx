'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui-base/Button';
import { ArrowLeft, BookOpenCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#0A0A0A]/20 backdrop-blur-lg">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                <Logo size="lg" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-gray-400 hover:text-white">
                <ArrowLeft size={16} />
                Back
            </Button>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 text-blue-500 mb-6">
                <BookOpenCheck size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-[hsl(var(--muted-foreground))]">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 text-gray-300">
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
                <p>
                    These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and ReCollect Inc. ("Company," "we," "us," or "our"), 
                    concerning your access to and use of the ReCollect website and application.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. Intellectual Property Rights</h2>
                <p>
                    Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site 
                    (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                </p>
            </section>
            
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. User Representations</h2>
                <p>
                    By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; 
                    (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>You have the legal capacity and you agree to comply with these Terms of Use.</li>
                    <li>You are not a minor in the jurisdiction in which you reside.</li>
                    <li>You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Contact Us</h2>
                <p>
                    To resolve a complaint regarding the Site or to receive further information regarding use of the Site, 
                    please contact us at terms@recollect.app.
                </p>
            </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ReCollect Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
