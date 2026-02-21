'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Card } from '@/components/ui-base/Card';
import { Mail, Lock, ArrowRight, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  otp: z.string().length(4, 'OTP must be exactly 4 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type EmailFormData = z.infer<typeof emailSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const setUser = useAuthStore((state) => state.setUser);
  
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'select' | 'email'>('select');
  const [step, setStep] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotOption, setShowForgotOption] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setShowForgotOption(false);
    try {
      const response = await authApi.login(data);
      if (response.success && response.data) {
        setUser(response.data);
        toast.success('Welcome back!', {
          description: 'You have successfully logged in.',
        });
        router.push(redirectUrl);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.toLowerCase().includes('wrong password')) {
        setShowForgotOption(true);
      }
      toast.error('Login failed', {
        description: errorMessage || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(data.email);
      if (response.success) {
        setResetEmail(data.email);
        setStep('reset');
        toast.success('OTP Sent!', {
          description: 'Please check your email for the reset code.',
        });
      }
    } catch (error: any) {
      toast.error('Failed', {
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: resetEmail,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      if (response.success) {
        toast.success('Password Reset!', {
          description: 'You can now login with your new password.',
        });
        setStep('login');
        resetForm.reset();
      }
    } catch (error: any) {
      toast.error('Reset failed', {
        description: error.response?.data?.message || 'Invalid OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(resetEmail);
      if (response.success) {
        toast.success('OTP Resent!', {
          description: 'Please check your email for the new code.',
        });
      }
    } catch (error: any) {
      toast.error('Failed to resend OTP', {
        description: error.response?.data?.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const response = await authApi.googleAuth(credentialResponse.credential);
      if (response.success && response.data) {
        setUser(response.data);
        toast.success('Welcome!', {
          description: 'Signed in with Google successfully.',
        });
        router.push(redirectUrl);
      }
    } catch (error: any) {
      toast.error('Google Sign-In failed', {
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Compute Layout Headings
  const heading = authMethod === 'select'
    ? "Let's get started"
    : step === 'login'
    ? "Welcome back"
    : step === 'forgot'
    ? "Forgot Password"
    : "Reset Password";

  const subheading = authMethod === 'select'
    ? "Sign in to get things done - your tasks, notes, and meetings all in one place."
    : step === 'login'
    ? "Sign in with your email to continue."
    : step === 'forgot'
    ? "Enter your email to receive a reset code."
    : `Enter the code sent to ${resetEmail}`;

  return (
    <AuthSplitLayout heading={heading} subheading={subheading}>
      <div className="w-full relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {authMethod === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 w-full"
            >
              <div className="w-full flex justify-center [&>div]:w-full [&>div>div]:!w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google Sign-In failed')}
                  shape="pill"
                  size="large"
                  text="signin_with"
                />
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setAuthMethod('email')}
                className="rounded-full bg-background border-border hover:bg-muted"
              >
                <Mail className="w-5 h-5 mr-3 text-muted-foreground" />
                Continue with email
              </Button>

              <div className="text-center mt-6 text-sm">
                <span className="text-muted-foreground">Don't have an account?</span>{' '}
                <Link href="/signup" className="font-semibold hover:underline">
                  Sign up
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {step === 'login' && (
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <Input
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    leftIcon={<Mail className="w-5 h-5" />}
                    {...loginForm.register('email')}
                    disabled={isLoading}
                    error={loginForm.formState.errors.email?.message}
                    inputSize="md"
                  />
                  
                  <Input
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    leftIcon={<Lock className="w-5 h-5" />}
                    {...loginForm.register('password')}
                    disabled={isLoading}
                    error={loginForm.formState.errors.password?.message}
                    inputSize="md"
                  />

                  {showForgotOption && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="text-sm">
                        <span className="text-[hsl(var(--muted-foreground))]">Wrong password? </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep('forgot');
                            emailForm.setValue('email', loginForm.getValues('email'));
                          }}
                          className="text-brand-primary hover:underline font-medium"
                        >
                          Reset it here
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
                  >
                    Sign In
                  </Button>

                  <div className="flex items-center justify-between text-sm mt-4">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('select')}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Other options
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('forgot')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              )}

              {step === 'forgot' && (
                <form onSubmit={emailForm.handleSubmit(onForgotSubmit)} className="space-y-5">
                  <Input
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    leftIcon={<Mail className="w-5 h-5" />}
                    {...emailForm.register('email')}
                    disabled={isLoading}
                    error={emailForm.formState.errors.email?.message}
                    inputSize="md"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Send Reset Code
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep('login')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto mt-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5">
                  <Input
                    type="text"
                    label="Enter OTP"
                    placeholder="Enter 4-digit code"
                    leftIcon={<KeyRound className="w-5 h-5" />}
                    {...resetForm.register('otp')}
                    disabled={isLoading}
                    error={resetForm.formState.errors.otp?.message}
                    inputSize="md"
                    maxLength={4}
                    autoComplete="off"
                  />

                  <Input
                    type="password"
                    label="New Password"
                    placeholder="At least 8 characters"
                    leftIcon={<Lock className="w-5 h-5" />}
                    {...resetForm.register('newPassword')}
                    disabled={isLoading}
                    error={resetForm.formState.errors.newPassword?.message}
                    inputSize="md"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Reset Password
                  </Button>

                  <div className="flex items-center justify-between text-sm mt-4">
                    <button
                      type="button"
                      onClick={() => setStep('login')}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to login
                    </button>
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={isLoading}
                      className="font-medium hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}