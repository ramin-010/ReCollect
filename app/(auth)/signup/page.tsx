'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '@/lib/api/auth';
import { dashboardApi } from '@/lib/api/dashboard';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Card } from '@/components/ui-base/Card';
import { Logo } from '@/components/brand/Logo';
import { toast } from 'sonner';
import { User, Mail, Lock, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const otpSchema = z.object({
  otp: z.string().length(4, 'OTP must be exactly 4 digits'),
});

type SignupFormData = z.infer<typeof signupSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [signupData, setSignupData] = useState<SignupFormData | null>(null);

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSignupSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.preSignup(data);
      if (response.success) {
        setSignupData(data);
        setStep('otp');
        toast.success('OTP Sent!', {
          description: 'Please check your email for the verification code.',
        });
      }
    } catch (error: any) {
      toast.error('Signup failed', {
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormData) => {
    if (!signupData) return;
    
    setIsLoading(true);
    try {
      const response = await authApi.verifySignup({
        email: signupData.email,
        otp: data.otp,
      });
      
      if (response.success && response.data) {
        setUser(response.data);

        try {
          await dashboardApi.create({
            name: `${signupData.name}'s Dashboard`,
            description: 'My personal space for notes and ideas',
          });
        } catch (dashError) {
          console.error('Error creating default dashboard:', dashError);
        }

        toast.success('Account created!', {
          description: 'Welcome to your second brain.',
        });

        router.push('/');
      }
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.response?.data?.message || 'Invalid OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!signupData) return;
    
    setIsLoading(true);
    try {
      const response = await authApi.preSignup(signupData);
      if (response.success) {
        toast.success('OTP Resent!', {
          description: 'Please check your email for the new verification code.',
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
            {step === 'signup' ? 'Create your account' : 'Verify your email'}
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {step === 'signup'
              ? 'Start organizing your knowledge today'
              : `We sent a code to ${signupData?.email}`}
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          {step === 'signup' ? (
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-6">
              <div>
                <Input
                  type="text"
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon={<User className="w-5 h-5" />}
                  {...signupForm.register('name')}
                  disabled={isLoading}
                  error={signupForm.formState.errors.name?.message}
                  inputSize="lg"
                />
              </div>

              <div>
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  {...signupForm.register('email')}
                  disabled={isLoading}
                  error={signupForm.formState.errors.email?.message}
                  inputSize="lg"
                />
              </div>

              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="Create a password (min. 8 characters)"
                  leftIcon={<Lock className="w-5 h-5" />}
                  {...signupForm.register('password')}
                  disabled={isLoading}
                  error={signupForm.formState.errors.password?.message}
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
                {isLoading ? 'Sending OTP...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
              <div>
                <Input
                  type="text"
                  label="Enter OTP"
                  placeholder="Enter 4-digit code"
                  leftIcon={<KeyRound className="w-5 h-5" />}
                  {...otpForm.register('otp')}
                  disabled={isLoading}
                  error={otpForm.formState.errors.otp?.message}
                  inputSize="lg"
                  maxLength={4}
                  autoComplete="off"
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
                {isLoading ? 'Verifying...' : 'Verify & Create Account'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep('signup')}
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

          <div className="text-center text-sm pt-6 border-t border-[hsl(var(--border))] mt-6">
            <span className="text-[hsl(var(--muted-foreground))]">Already have an account? </span>
            <Link href="/login" className="font-medium text-brand-primary hover:underline">
              Sign in
            </Link>
          </div>
        </Card>

        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-8">
          By creating an account, you agree to our{' '}
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