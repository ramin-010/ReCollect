// ReCollect Landing Page - Clean, Professional, Engaging
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import { 
  Brain, 
  Shield, 
  Sparkles, 
  Users, 
  Zap, 
  FileText, 
  ArrowRight,
  Check,
  Globe,
  Lock,
  Cloud,
  Search
} from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Brain,
      title: 'Smart Organization',
      description: 'Intelligently organize your thoughts and ideas in customizable dashboards'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your notes are yours. Control visibility with public and private settings'
    },
    {
      icon: Zap,
      title: 'Email Reminders',
      description: 'Set reminders that automatically email you on your chosen date to revisit important notes'
    },
    {
      icon: Users,
      title: 'Easy Sharing',
      description: 'Share specific notes or entire dashboards with secure links'
    },
    {
      icon: FileText,
      title: 'Rich Content',
      description: 'Add text, links, images, and drawings to capture complete thoughts'
    },
    {
      icon: Cloud,
      title: 'Cloud Sync',
      description: 'Access your knowledge base from anywhere, on any device'
    }
  ];

  const benefits = [
    'Unlimited dashboards and notes',
    'Real-time synchronization',
    'Email reminders for important notes',
    'Collaborative sharing',
    'Full-text search',
    'Export your data anytime',
    'API access (coming soon)',
    'Priority support'
  ];

  return (
    <div className="min-h-screen bg-pattern">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background))]/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="lg" />
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/signup')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>

      </nav>

      

      {/* Hero Section - xyflow inspired */}
      <section className="pt-22 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            {/* App Name & Logo */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Logo size="xll"  className="h-12 w-auto text-[hsl(var(--foreground))]" />
                {/* <span className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ReCollect
                </span> */}
              </div>
            </div>
            
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--primary))]/10 text-sm font-medium mb-8 text-[hsl(var(--primary))]">
              <Sparkles className="w-4 h-4" />
              Professional Knowledge Management
            </div>
            
            {/* Main Heading - xyflow style with gradient boxes */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="inline-block">Organize Your </span>
              <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                Thoughts
              </span>
              <span className="inline-block"></span>
              <br className="hidden sm:block" />
              <span className="inline-block">Amplify Your </span>
              <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl mx-2 shadow-lg">
                Knowledge
              </span>
              <span className="inline-block"></span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto mb-12 leading-relaxed">
              ReCollect is your professional companion for capturing ideas, organizing knowledge, 
              and building connections between your thoughts. Never lose a brilliant idea again.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/signup');
                }}
                className="gap-2 relative z-10 pointer-events-auto"
              >
                Start Free Now
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    const yOffset = -80; // Adjust this value as needed
                    const y = featuresSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    
                    window.scrollTo({
                      top: y,
                      behavior: 'smooth'
                    });
                  }
                }}
              >
                Explore Features
              </Button>
            </div>
          </div>
        </div>
      </section>

  <div className="absolute inset-0  from-blue-500/10 via-purple-600/10 to-pink-500/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      {/* Features Grid - Enhanced Design */}
      <section id="features" className="py-4 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0  from-blue-500/10 via-purple-600/10 to-pink-500/10" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-600/10 text-sm font-medium mb-6 border border-[hsl(var(--primary))]/20">
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                Powerful Features
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Everything You Need to Build Your{' '}
            <span className="inline-block bg-gradient-to-t from-blue-500 to-purple-600 bg-clip-text text-transparent font-bold">
              Second Brain
            </span>

            </h2>
            <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
              Powerful features designed for professionals who value their ideas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative bg-[hsl(var(--background))]/50 backdrop-blur-sm border border-[hsl(var(--border))]/50 rounded-2xl p-8 shadow-lg"
              >
                {/* Gradient accent bar */}
                {/* <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl" /> */}
                
                {/* Icon with gradient background */}
                <div className="relative mb-6">
                  {/* <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl" /> */}
                  <div className="relative inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-[hsl(var(--primary))]/20">
                    <feature.icon className="w-8 h-8 text-[hsl(var(--primary))]" />
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold mb-3 text-[hsl(var(--foreground))]">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section - Modern Design */}
      <section className="pt-24 pb-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0  from-blue-500/10 via-purple-600/10 to-pink-500/10" />
        <div className="absolute top-14 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto relative">
          {/* Main CTA Card */}
          <div className="relative bg-[hsl(var(--background))]/80 backdrop-blur-xl  rounded-3xl p-12 sm:p-16 shadow-2xl">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-3xl opacity-10 blur" />
            
            <div className="relative text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-600/10 text-sm font-medium mb-8 border border-[hsl(var(--primary))]/20">
                <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                  Start Building Today
                </span>
              </div>
              
              {/* Heading */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                Ready to{' '}
                <span >
                  Transform
                </span>
                <br className="hidden sm:block" />
                Your Knowledge?
              </h2>
              
              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of professionals who have made ReCollect their second brain. 
                Start organizing your thoughts today—no credit card required.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/signup')}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="text-lg px-8 py-6"
                >
                  Start Free Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/login')}
                  className="text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
