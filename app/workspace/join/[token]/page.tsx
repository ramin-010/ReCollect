'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Loader2, CheckCircle2, XCircle, LogIn, Users, ArrowRight } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { workspaceApi } from '@/lib/api/workspaceApi';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

export default function WorkspaceJoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = !!currentUser;

  const [linkInfo, setLinkInfo] = useState<{
    workspaceName: string;
    spaceName: string | null;
    invitedBy: { name: string; avatar: string | null };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Fetch link info on mount
  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8002'}/api/workspaces/invite-link/${token}/info`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid or expired link');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setLinkInfo(data.data);
        } else {
          setError('Invalid invite link');
        }
      })
      .catch(err => {
        setError(err.message || 'This link is invalid or has expired');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleRequestJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/workspace/join/${token}`);
      return;
    }

    try {
      setIsRequesting(true);
      const res = await workspaceApi.requestToJoinViaLink(token);
      if (res.success) {
        setRequestSent(true);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to send request';
      setError(message);
    } finally {
      setIsRequesting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-muted/50 rounded-[100%] blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60 relative z-10" />
      </div>
    );
  }

  // Error state
  if (error && !linkInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-muted/50 rounded-[100%] blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-b from-foreground/10 to-transparent rounded-[26px] blur-[2px] opacity-30 pointer-events-none" />
          <div className="bg-card border border-border rounded-[24px] shadow-2xl relative overflow-hidden p-10 text-center">
            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-b from-red-500/[0.15] to-transparent border border-red-500/20 shadow-inner flex items-center justify-center mx-auto mb-6 relative">
              <XCircle className="w-6 h-6 text-red-500/90" />
              <div className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            </div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground mb-2">Invalid Link</h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">{error}</p>
            <button
              onClick={() => router.push('/welcome')}
              className="w-full relative group h-12 rounded-[14px] font-semibold text-[15px] transition-all"
            >
              <div className="absolute inset-0 bg-muted hover:bg-muted/80 text-foreground rounded-[14px] border border-border flex items-center justify-center transition-colors">
                Return Home
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Request sent success state
  if (requestSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-muted/50 rounded-[100%] blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative z-10"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-b from-foreground/10 to-transparent rounded-[26px] blur-[2px] opacity-30 pointer-events-none" />
          <div className="bg-card border border-border rounded-[24px] shadow-2xl relative overflow-hidden p-10 text-center">
            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-b from-emerald-500/[0.15] to-transparent border border-emerald-500/20 shadow-inner flex items-center justify-center mx-auto mb-6 relative">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </div>
            
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground mb-2">Request Sent</h1>
            
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
              Your request to join <span className="text-foreground/80 font-medium">{linkInfo?.workspaceName}</span> has been sent.
              You'll be notified when an admin approves your request.
            </p>

            <button
              onClick={() => router.push('/welcome')}
              className="w-full relative group h-12 rounded-[14px] font-semibold text-[15px] transition-all"
            >
              <div className="absolute inset-0 bg-primary text-primary-foreground rounded-[14px] flex items-center justify-center group-hover:scale-[0.98] transition-transform duration-200">
                Go to Dashboard
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main join prompt
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Subtle spotlight effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-muted/50 rounded-[100%] blur-[80px] pointer-events-none" />
      
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-0.5 bg-gradient-to-b from-foreground/30 to-transparent rounded-[26px] blur-[2px] opacity-30 pointer-events-none" />

        <div className="bg-card border border-border rounded-[24px] shadow-2xl relative overflow-hidden">
          {/* Subtle top inner highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white-[0.15] to-transparent opacity-50" />
          
          <div className="p-10">
            {/* Header section with icon */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-[14px] bg-gradient-to-b from-foreground/[0.12] to-transparent border border-border/50 shadow-[0_4px_20px_-1px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center mb-6 relative">
                <Briefcase className="w-6 h-6 text-foreground/90" />
                <div className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
              </div>

              <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground mb-2">
                Join {linkInfo?.workspaceName}
              </h1>
              
              <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[85%]">
                <span className="font-medium text-foreground/80">{linkInfo?.invitedBy.name}</span> has invited you to collaborate
                {linkInfo?.spaceName ? ` in the ${linkInfo.spaceName} space.` : '.'}
              </p>
            </div>

            {/* Inviter context box */}
            <div className="flex items-center gap-4 p-4 rounded-[16px] bg-muted border border-border mb-8 relative group hover:bg-muted/50 transition-colors">
              <div className="relative">
                {linkInfo?.invitedBy.avatar ? (
                  <img src={linkInfo.invitedBy.avatar} alt={linkInfo.invitedBy.name} className="w-10 h-10 rounded-full border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-border flex items-center justify-center text-foreground/90 text-sm font-semibold shadow-inner">
                    {linkInfo?.invitedBy.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-foreground/90 leading-tight mb-0.5">
                  Invitation pending
                </p>
                <p className="text-[13px] text-muted-foreground/80 leading-tight">
                  Awaiting your response
                </p>
              </div>
            </div>

            {/* Error from request */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-3 rounded-xl bg-red-500/[0.05] border border-red-500/10 text-[13px] font-medium text-red-400 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* CTA */}
            {isAuthenticated ? (
              <button
                onClick={handleRequestJoin}
                disabled={isRequesting}
                className="w-full relative group h-12 rounded-[14px] font-semibold text-[15px] transition-all disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-primary text-primary-foreground rounded-[14px] flex items-center justify-center gap-2 group-hover:scale-[0.98] transition-transform duration-200">
                  {isRequesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-[18px] h-[18px]" />
                  )}
                  {isRequesting ? 'Sending Request...' : 'Accept Invitation'}
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => router.push(`/login?redirect=/workspace/join/${token}`)}
                  className="w-full relative group h-12 rounded-[14px] font-semibold text-[15px] transition-all"
                >
                  <div className="absolute inset-0 bg-primary text-primary-foreground rounded-[14px] flex items-center justify-center gap-2 group-hover:scale-[0.98] transition-transform duration-200">
                    <LogIn className="w-[18px] h-[18px]" />
                    Sign in to Accept
                  </div>
                </button>
                <div className="text-center">
                  <span className="text-[13px] text-muted-foreground/80">Don't have an account? </span>
                  <button 
                    onClick={() => router.push(`/signup?redirect=/workspace/join/${token}`)} 
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Create one
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Trusted By / Security footer underneath card */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[12px] font-medium text-muted-foreground/60 text-center">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Secure Workspace Invitation
        </div>
      </motion.div>
    </div>
  );
}
