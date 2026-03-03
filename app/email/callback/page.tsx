'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { emailApi } from '@/lib/api/email';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting your Gmail...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Gmail connection was cancelled or denied.');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received.');
      return;
    }

    // Exchange code for tokens
    emailApi
      .handleCallback(code)
      .then((res) => {
        setStatus('success');
        setMessage(`Gmail connected: ${res.email || 'Success'}`);
        // Redirect back to email view after a short delay
        setTimeout(() => {
          router.push('/?view=email');
        }, 2000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Failed to connect Gmail. Please try again.');
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[hsl(var(--background))] ">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Connecting Gmail</h2>
            <p className="text-[hsl(var(--muted-foreground))]">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Gmail Connected!</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">{message}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Redirecting you back...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">{message}</p>
            <Button variant="primary" onClick={() => router.push('/')}>
              Go Back
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmailCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
