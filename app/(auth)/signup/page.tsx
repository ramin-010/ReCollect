'use client';

import { useState, Suspense } from 'react';
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
import { User, Mail, Lock, ArrowRight, ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

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

function SignupForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'select' | 'email'>('select');
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
        setIsLoading(false);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || '';
      
      if (msg.toLowerCase().includes('already registered')) {
        toast.error('Email already registered', {
          description: 'Redirecting you to login...',
        });
        setTimeout(() => {
          router.push('/login');
        }, 1000);
      } else {
        toast.error('Signup failed', {
          description: msg || 'Something went wrong. Please try again.',
        });
        setIsLoading(false);
      }
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
        localStorage.setItem('auth_hint', '1');

        // Create default dashboard
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
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.response?.data?.message || 'Invalid OTP. Please try again.',
      });
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

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const response = await authApi.googleAuth({ accessToken: tokenResponse.access_token });
        if (response.success && response.data) {
          setUser(response.data);
          localStorage.setItem('auth_hint', '1');

          const isNewUser = new Date().getTime() - new Date(response.data.createdAt).getTime() < 60000;

          if (isNewUser) {
            try {
              await dashboardApi.create({
                name: `${response.data.name}'s Dashboard`,
                description: 'My personal space for notes and ideas',
              });
            } catch (dashError) {
              console.error('Dashboard creation (may already exist):', dashError);
            }

            toast.success('Account created!', {
              description: 'Welcome to your second brain.',
            });
          } else {
            toast.success('Welcome back!', {
              description: 'Signed in with Google successfully.',
            });
          }

          router.push('/');
        } else {
          setIsLoading(false);
        }
      } catch (error: any) {
        toast.error('Google Sign-In failed', {
          description: error.response?.data?.message || 'Something went wrong. Please try again.',
        });
        setIsLoading(false);
      }
    },
    onError: () => toast.error('Google Sign-In failed'),
  });

  const heading = authMethod === 'select'
    ? "Let's get started"
    : step === 'signup'
    ? "Create your account"
    : "Verify your email";

  const subheading = authMethod === 'select'
    ? "Sign up to get things done - your tasks, notes, and meetings all in one place."
    : step === 'signup'
    ? "Start organizing your knowledge today."
    : `We sent a code to ${signupData?.email}`;

  return (
    <AuthSplitLayout heading={heading} subheading={subheading}>
      <div className="w-full relative min-h-[350px] h-[350px]">
        {/* Loader Overlay for Google Sign-Up */}
        {isLoading && authMethod === 'select' && (
          <div className="absolute inset-[-10] z-10 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[3px] rounded-xl border border-border pb-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-5" />
            <p className="text-md font-medium animate-pulse text-muted-foreground">Creating account...</p>
          </div>
        )}
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
              <div className="w-full flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => googleLogin()}
                  className="rounded-full bg-background border-border hover:bg-muted"
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
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
                <span className="text-muted-foreground">Already have an account?</span>{' '}
                <Link href="/login" className="font-semibold hover:underline">
                  Sign in
                </Link>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-8">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
              </p>
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
              {step === 'signup' && (
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-5">
                  <Input
                    type="text"
                    label="Full Name"
                    placeholder="John Doe"
                    leftIcon={<User className="w-5 h-5" />}
                    {...signupForm.register('name')}
                    disabled={isLoading}
                    error={signupForm.formState.errors.name?.message}
                    inputSize="md"
                  />

                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="you@example.com"
                    leftIcon={<Mail className="w-5 h-5" />}
                    {...signupForm.register('email')}
                    disabled={isLoading}
                    error={signupForm.formState.errors.email?.message}
                    inputSize="md"
                  />

                  <Input
                    type="password"
                    label="Password"
                    placeholder="Create a password (min. 8 characters)"
                    leftIcon={<Lock className="w-5 h-5" />}
                    {...signupForm.register('password')}
                    disabled={isLoading}
                    error={signupForm.formState.errors.password?.message}
                    inputSize="md"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
                  >
                    Continue
                  </Button>

                  <div className="flex justify-center mt-4">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('select')}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Other options
                    </button>
                  </div>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
                  <Input
                    type="text"
                    label="Enter OTP"
                    placeholder="Enter 4-digit code"
                    leftIcon={<KeyRound className="w-5 h-5" />}
                    {...otpForm.register('otp')}
                    disabled={isLoading}
                    error={otpForm.formState.errors.otp?.message}
                    inputSize="md"
                    maxLength={4}
                    autoComplete="off"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
                  >
                    Verify & Create Account
                  </Button>

                  <div className="flex items-center justify-between text-sm mt-4">
                    <button
                      type="button"
                      onClick={() => setStep('signup')}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}