'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { useAuthStore } from '@/lib/store/authStore';
import axios from '@/lib/utils/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui-base/Button';
import { Download, LogIn, UserPlus, X, ChevronLeft, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Note: We don't import SlashCommands as this is read-only

interface SharedDocViewerProps {
  slug?: string; // Optional for viewer mode (uses doc._id)
  doc: {
    _id?: string;
    title: string;
    yjsState?: string; // Base64 Yjs state
    coverImage?: string | null;
    updatedAt: string;
  };
  mode?: 'public' | 'viewer'; // 'public' = from shared link, 'viewer' = logged-in viewer collaborator
  onBack?: () => void; // For viewer mode navigation
}

export function SharedDocViewer({ doc, slug, mode = 'public', onBack }: SharedDocViewerProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToProfile = async () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    try {
      setIsSaving(true);
      const response = await axios.post(`/api/save/${slug}`);
      if (response.data.success) {
        toast.success('Document saved to your profile!');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save document';
      if (msg.includes('owner')) {
        toast.info(msg);
      } else if (msg.includes('Already')) {
        toast.info('You are already a collaborator on this document');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const editor = useEditor({
    editable: false, // READ ONLY MODE
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      } as any) as any,
      Link.configure({
        openOnClick: true, // Allow clicking links in read-only mode
        HTMLAttributes: {
          class: 'text-blue-400 underline cursor-pointer hover:text-blue-300',
        },
      }),
      ResizableImage,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextStyle,
      Color,
      AutoJoiner.configure({
        elementsToJoin: ['bulletList', 'orderedList'],
      }),
    ],
    content: '', 
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] pro-prose', // Add prose classes if needed
      },
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editor && doc.yjsState) {
       // Convert yjsState to JSON content
       try {
         const { yjsStateToJson } = require('@/lib/utils/yjsConverter');
         const content = yjsStateToJson(doc.yjsState);
         editor.commands.setContent(content);
       } catch (e) {
         console.error('Failed to load yjsState:', e);
       }
    }
  }, [editor, doc.yjsState]);


  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center">
         {mode === 'viewer' && (
              <div className="absolute top-0 left-0 right-0 p-2  z-20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--background))]/80 backdrop-blur-sm p-2 pr-4"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
              </div>
            )}
        {/* Cover Image */}
        {doc.coverImage ? (
          <div className="w-full h-64 md:h-80 relative mb-8">
            <img 
              src={doc.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover object-[0_50%]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[hsl(var(--background))]" />
          </div>
        ) : (
           <div className="h-24" /> // Spacer
        )}
          

        <div className={`w-full max-w-7xl px-8 ${doc.coverImage ? '-mt-20 relative z-10' : ''}`}>
             
            {/* Title */}
            <div className="mb-10 pl-4">
              <div className="flex items-center gap-4 flex-wrap justify-between">
                <h1 
                  className="text-[48px] md:text-[62px] font-bold text-[hsl(var(--foreground))] leading-tight"
                  style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
                >
                  {doc.title || 'Untitled'}
                </h1>
                {mode === 'viewer' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 text-sm font-medium rounded-full border border-blue-500/20">
                    <Eye className="w-4 h-4" />
                    View Only
                  </div>
                )}
              </div>
              <div className="w-16 h-1 bg-amber-500 rounded-full mt-4" />
              <div className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                Last updated {new Date(doc.updatedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Save Button - Only for public share links */}
            {mode === 'public' && slug && (
              <div className="absolute top-0 right-0 p-4 z-20">
                <Button 
                  onClick={handleSaveToProfile}
                  isLoading={isSaving}
                  className="bg-amber-600/90 hover:bg-amber-600 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105"
                >
                   <Download className="w-4 h-4 mr-2" />
                   Save to my Profile
                </Button>
              </div>
            )}

            {/* View Only Badge + Back Button - For logged-in viewer collaborators */}
         

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none pb-20">
               <EditorContent editor={editor} />
            </div>
        </div>
      {/* Login Required Dialog */}
      <AnimatePresence>
        {showLoginDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLoginDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[hsl(var(--card))] rounded-2xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]"
            >
              <div className="p-6 text-center">
                 <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-6 h-6 text-amber-500" />
                 </div>
                 <h3 className="text-xl font-bold mb-2 text-[hsl(var(--foreground))]">Login Required</h3>
                 <p className="text-[hsl(var(--muted-foreground))] mb-6 text-sm">
                   Join ReCollect to save this document to your personal workspace and collaborate.
                 </p>
                 <div className="space-y-3">
                   <Button 
                     onClick={() => router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)} 
                     className="w-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                   >
                     <LogIn className="w-4 h-4 mr-2" /> Log In
                   </Button>
                   <Button 
                     onClick={() => router.push(`/signup?redirect=${encodeURIComponent(window.location.pathname)}`)} 
                     variant="outline"
                     className="w-full"
                   >
                     Create Account
                   </Button>
                 </div>
              </div>
              <button 
                onClick={() => setShowLoginDialog(false)}
                className="absolute top-4 right-4 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
