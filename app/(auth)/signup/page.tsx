// app/(auth)/signup/page.tsx
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
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.signup(data);
      if (response.success && response.data) {
        setUser(response.data);
        
        try {
          await dashboardApi.create({
            name: `${data.name}'s Dashboard`,
            description: 'My personal space for notes and ideas',
          });
        } catch (dashError) {
          console.error('Error creating default dashboard:', dashError);
        }

        toast.success('Account created!', {
          description: 'Welcome to your second brain.',
        });
        
        // Redirect to main app after successful signup
        router.push('/');
      }
    } catch (error: any) {
      toast.error('Signup failed', {
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pattern p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-6" />
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Start organizing your knowledge today</p>
        </div>

        {/* Signup Form */}
        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                type="text"
                label="Full Name"
                placeholder="John Doe"
                leftIcon={<User className="w-5 h-5" />}
                {...register('name')}
                disabled={isLoading}
                error={errors.name?.message}
                inputSize="lg"
              />
            </div>

            <div>
              <Input
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                leftIcon={<Mail className="w-5 h-5" />}
                {...register('email')}
                disabled={isLoading}
                error={errors.email?.message}
                inputSize="lg"
              />
            </div>

            <div>
              <Input
                type="password"
                label="Password"
                placeholder="Create a password (min. 8 characters)"
                leftIcon={<Lock className="w-5 h-5" />}
                {...register('password')}
                disabled={isLoading}
                error={errors.password?.message}
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
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign in link */}
          <div className="text-center text-sm pt-6 border-t border-[hsl(var(--border))]">
            <span className="text-[hsl(var(--muted-foreground))]">Already have an account? </span>
            <Link href="/login" className="font-medium text-brand-primary hover:underline">
              Sign in
            </Link>
          </div>
        </Card>

        {/* Footer */}
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