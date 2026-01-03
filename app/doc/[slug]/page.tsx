'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { SharedDocViewer } from '@/components/docs/SharedDocViewer';
import { Loader2 } from 'lucide-react';
import { DocType } from '@/lib/store/docStore';

interface SharedDocData {
  _id: string;
  title: string;
  content: any;
  docType: DocType;
  coverImage: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function SharedDocPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [doc, setDoc] = useState<SharedDocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchDoc = async () => {
      try {
        setLoading(true);
        // Direct axios call to avoid auth interceptors, as this is a public page
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await axios.get(`${baseUrl}/api/doc/${slug}`);
        
        if (response.data.success) {
          // Structure is data.data.doc
          setDoc(response.data.data.doc);
        } else {
          setError('Failed to load document');
        }
      } catch (err) {
        console.error("Error fetching shared doc:", err);
        setError('Document not found or link expired');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Oops!</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{error || 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  return <SharedDocViewer doc={doc} slug={slug} />;
}
