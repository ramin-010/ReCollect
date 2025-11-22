// ReCollect - Public Shared Note Page (No Login Required)
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import { 
  Globe, 
  Clock, 
  Hash, 
  Link as LinkIcon, 
  ArrowRight,
  Eye,
  Share2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface SharedNote {
  _id: string;
  title: string;
  body: string;
  tags?: Array<{ name: string; _id: string }>;
  links?: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    name: string;
    avatar?: string;
  };
}

export default function SharedNotePage() {
  const params = useParams();
  const shareId = params.id as string;
  const [note, setNote] = useState<SharedNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareId) {
      loadSharedNote();
    }
  }, [shareId]);

  const loadSharedNote = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch(`/api/share/${shareId}`);
      
      if (!response.ok) {
        throw new Error('Note not found or no longer available');
      }
      
      const data = await response.json();
      setNote(data.data);
    } catch (error: any) {
      console.error('Failed to load shared note:', error);
      setError(error.message || 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const renderContent = (content: string) => {
    // Simple content rendering - can be enhanced with markdown support
    return content.split('\n').map((line, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {line}
      </p>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pattern">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-medium rounded mb-4"></div>
            <div className="h-4 bg-surface-medium rounded mb-2"></div>
            <div className="h-4 bg-surface-medium rounded mb-2"></div>
            <div className="h-4 bg-surface-medium rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="w-16 h-16 bg-[hsl(var(--destructive))]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {error || 'This note may have been deleted or is no longer publicly available.'}
          </p>
          <Link href="/">
            <Button variant="primary">
              Go to ReCollect
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Logo size="lg" />
            </Link>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
              <Link href="/signup">
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Your Own
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Note Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-3">
            <Globe className="w-4 h-4" />
            <span>Public Note</span>
            <span>•</span>
            <span>Shared by {note.author.name}</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Note Content */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <div className="prose prose-gray max-w-none">
            {renderContent(note.body)}
          </div>
        </Card>

        {/* Note Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span className="font-medium text-sm">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag._id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Links */}
          {note.links && note.links.length > 0 && (
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span className="font-medium text-sm">Related Links</span>
              </div>
              <div className="space-y-2">
                {note.links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Call to Action */}
        <Card variant="elevated" padding="lg" className="mt-8 text-center bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border-brand-primary/20">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2">Like what you see?</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              Create your own knowledge base with ReCollect. Organize your thoughts, 
              share your ideas, and build your second brain.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/welcome">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo size="lg" />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Professional knowledge management
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <Link href="/welcome" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                Features
              </Link>
              <Link href="/signup" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                Sign Up
              </Link>
              <Link href="/login" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
