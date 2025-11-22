// ReCollect - Professional Login Page
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
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
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
      toast.error('Login failed', {
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
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Sign in to continue to your knowledge base</p>
        </div>

        {/* Login Form */}
        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                type="email"
                label="Email address"
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
                placeholder="Enter your password"
                leftIcon={<Lock className="w-5 h-5" />}
                {...register('password')}
                disabled={isLoading}
                error={errors.password?.message}
                inputSize="lg"
              />
            </div>

            {/* Error Message */}
            {errors.root && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{errors.root.message}</p>
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
          </form>
        </Card>

        {/* Signup Link */}
        <div className="text-center mt-4 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Don't have an account?</span>{' '}
          <Link href="/signup" className="underline hover:text-[hsl(var(--foreground))]">
            Create an account
          </Link>
        </div>

        {/* Footer */}
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