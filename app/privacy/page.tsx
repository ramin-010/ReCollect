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
            <p className="text-xl text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate prose-lg max-w-none space-y-8 text-slate-700">
            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
                <p>
                    Welcome to ReCollect ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our application.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
                <p>
                    We collect personal information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services, when you participate in activities on the application, or otherwise when you contact us.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>Personal Information Provided by You: Names, email addresses, passwords, and other similar information.</li>
                    <li>Payment Data: We may collect data necessary to process your payment if you make purchases.</li>
                </ul>
            </section>
            
            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Local-First Architecture</h2>
                <p>
                    ReCollect is designed with a "Local-First" architecture. This means your notes, thoughts, and personal data are primarily stored on your local device. 
                    When you choose to sync your data, it is end-to-end encrypted before it leaves your device. We technically cannot see your private content.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Contact Us</h2>
                <p>
                    If you have questions or comments about this policy, you may email us at recollect.support@gmail.com.
                </p>
            </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} ReCollect Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
