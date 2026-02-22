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
import { GoogleLogin } from '@react-oauth/google';
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const response = await authApi.googleAuth(credentialResponse.credential);
      if (response.success && response.data) {
        setUser(response.data);

        // Create default dashboard for new Google users
        try {
          await dashboardApi.create({
            name: `${response.data.name}'s Dashboard`,
            description: 'My personal space for notes and ideas',
          });
        } catch (dashError) {
          console.error('Dashboard creation (may already exist):', dashError);
        }

        toast.success('Welcome!', {
          description: 'Signed in with Google successfully.',
        });
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
  };

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
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google Sign-Up failed')}
                  shape="pill"
                  size="large"
                  text="signup_with"
                  width="340"
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