'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Logo } from '@/components/brand/Logo';

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

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
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
        router.push('/');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pattern p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-6" />
          <h1 className="text-2xl font-bold mb-2">
            {step === 'login' && 'Welcome back'}
            {step === 'forgot' && 'Forgot Password'}
            {step === 'reset' && 'Reset Password'}
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {step === 'login' && 'Sign in to continue to your knowledge base'}
            {step === 'forgot' && 'Enter your email to receive a reset code'}
            {step === 'reset' && `Enter the code sent to ${resetEmail}`}
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          {step === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <div>
                <Input
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  {...loginForm.register('email')}
                  disabled={isLoading}
                  error={loginForm.formState.errors.email?.message}
                  inputSize="lg"
                />
              </div>

              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  leftIcon={<Lock className="w-5 h-5" />}
                  {...loginForm.register('password')}
                  disabled={isLoading}
                  error={loginForm.formState.errors.password?.message}
                  inputSize="lg"
                />
              </div>

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
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={emailForm.handleSubmit(onForgotSubmit)} className="space-y-6">
              <div>
                <Input
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  {...emailForm.register('email')}
                  disabled={isLoading}
                  error={emailForm.formState.errors.email?.message}
                  inputSize="lg"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
              <div>
                <Input
                  type="text"
                  label="Enter OTP"
                  placeholder="Enter 4-digit code"
                  leftIcon={<KeyRound className="w-5 h-5" />}
                  {...resetForm.register('otp')}
                  disabled={isLoading}
                  error={resetForm.formState.errors.otp?.message}
                  inputSize="lg"
                  maxLength={4}
                />
              </div>

              <div>
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Enter new password (min. 8 characters)"
                  leftIcon={<Lock className="w-5 h-5" />}
                  {...resetForm.register('newPassword')}
                  disabled={isLoading}
                  error={resetForm.formState.errors.newPassword?.message}
                  inputSize="lg"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={isLoading}
                  className="text-brand-primary hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </Card>

        <div className="text-center mt-4 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Don't have an account?</span>{' '}
          <Link href="/signup" className="underline hover:text-[hsl(var(--foreground))]">
            Create an account
          </Link>
        </div>

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-8">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-[hsl(var(--foreground))]">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-[hsl(var(--foreground))]">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}