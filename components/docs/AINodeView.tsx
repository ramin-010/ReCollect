import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { Sparkles, Loader2, ArrowUp, Check, X, Wand2, RotateCcw } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { docApi } from '@/lib/api/docApi';
import { toast } from 'sonner';

export const AINodeView = (props: NodeViewProps) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const previewEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }) as any,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Image,
      ResizableImage,
    ],
    editable: false,
    content: '',
  });

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  // Sync generated content into the preview editor
  // The EditorContent is always mounted (hidden when not success) so the editor is always DOM-attached
  useEffect(() => {
    if (generatedContent && previewEditor) {
      console.log('[AI Preview] useEffect fired — setting content on previewEditor', {
        contentType: typeof generatedContent,
        isArray: Array.isArray(generatedContent),
        length: Array.isArray(generatedContent) ? generatedContent.length : 'N/A',
        firstNode: Array.isArray(generatedContent) ? generatedContent[0] : generatedContent,
        editorIsDestroyed: previewEditor.isDestroyed,
      });
      queueMicrotask(() => {
        if (!previewEditor.isDestroyed) {
          previewEditor.commands.setContent(generatedContent);
          console.log('[AI Preview] After setContent — editor HTML:', previewEditor.getHTML()?.slice(0, 200));
        }
      });
    }
  }, [generatedContent, previewEditor]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || status === 'generating') return;

    setStatus('generating');
    
    // Attempt to get text context from the document surrounding this node
    // NOTE: We skip image nodes to avoid sending image data/URLs as AI context (saves tokens)
    let context = '';
    try {
      const { editor, getPos } = props;
      const pos = getPos();
      if (typeof pos === 'number') {
        const docSize = editor.state.doc.content.size;
        const start = Math.max(0, pos - 1000);
        const end = Math.min(docSize, pos + 1000);
        context = editor.state.doc.textBetween(start, end, ' ', (leafNode: any) => {
          // Skip image nodes entirely — they just add URLs/alt text to the context
          if (leafNode.type.name === 'resizableImage' || leafNode.type.name === 'image') {
            return '';
          }
          return '\n';
        });
      }
    } catch (err) {
      console.warn('Failed to extract context for AI', err);
    }

    try {
      const result = await docApi.generateAIContent(prompt, context);
      console.log('[AI Generate] Full API result:', {
        success: result.success,
        hasData: !!result.data,
        hasContent: !!result.data?.content,
        contentType: typeof result.data?.content,
        isArray: Array.isArray(result.data?.content),
        contentLength: Array.isArray(result.data?.content) ? result.data.content.length : 'N/A',
        provider: result.provider,
        nodeCount: result.nodeCount,
      });
      if (result.data?.content) {
        console.log('[AI Generate] First 2 nodes:', JSON.stringify(result.data.content.slice(0, 2), null, 2));
      }
      if (result.success && result.data?.content) {
        const contentToSet = result.data.content;
        setGeneratedContent(contentToSet);
        setStatus('success');
      } else {
        console.error('[AI Generate] Invalid response structure:', result);
        throw new Error('Invalid AI response structure');
      }
    } catch (err: any) {
      console.error('Failed to generate AI content:', err);
      toast.error(err.response?.data?.message || 'Failed to generate content');
      setStatus('error');
    }
  };

  const handleAccept = () => {
    if (!generatedContent) return;
    
    const { editor, getPos, node } = props;
    const pos = getPos();
    if (typeof pos !== 'number') return;

    // Replace this node with the generated content
    editor.chain()
      .focus()
      // Create a selection over this node to delete it during insert
      .insertContentAt(
        { from: pos, to: pos + node.nodeSize }, 
        generatedContent
      )
      .run();
  };

  const handleDiscard = () => {
    const { editor, getPos, node } = props;
    const pos = getPos();
    if (typeof pos !== 'number') return;
    
    // Create a selection over this node to delete it
    editor.chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape key discards the UI
    if (e.key === 'Escape') {
      handleDiscard();
      return;
    }
  };

  return (
    <NodeViewWrapper className="my-6">
      <div 
        className={`w-full max-w-3xl border rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
          status === 'error' ? 'border-red-500/50 bg-red-500/5 shadow-red-500/10' :
          status === 'success' ? 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/10' :
          'border-violet-500/40 bg-violet-500/5 shadow-violet-500/10'
        }`}
        contentEditable={false} // Important: keep TipTap from thinking it can type in here
        onKeyDown={handleKeyDown}
      >
        <div className="p-3 border-b flex items-center justify-between bg-white/5 backdrop-blur-sm border-inherit z-10 relative">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center ${
               status === 'success' ? 'bg-emerald-500/20 text-emerald-600' :
               status === 'error' ? 'bg-red-500/20 text-red-600' :
               'bg-violet-500/20 text-violet-600'
            }`}>
              {status === 'success' ? <Check className="w-3.5 h-3.5" /> :
               status === 'error' ? <X className="w-3.5 h-3.5" /> :
               <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <span className={`text-xs font-semibold ${
               status === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
               status === 'error' ? 'text-red-700 dark:text-red-400' :
               'text-violet-700 dark:text-violet-400'
            }`}>
              {status === 'generating' ? 'AI is writing...' :
               status === 'success' ? 'AI generated content' :
               status === 'error' ? 'Generation failed' :
               'AI Assistant'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'success' ? (
              <>
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     setStatus('idle');
                   }}
                   className="px-3 py-1 rounded text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors"
                 >
                   <RotateCcw className="w-3 h-3" />
                   Regenerate
                 </button>
                 <button
                   onClick={handleDiscard}
                   className="px-3 py-1 rounded text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                 >
                   Discard
                 </button>
                 <button
                   onClick={handleAccept}
                   className="px-3 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                 >
                   <Check className="w-3.5 h-3.5" />
                   Accept
                 </button>
              </>
            ) : (
              <button 
                onClick={handleDiscard}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-[hsl(var(--muted-foreground))] transition-colors"
                title="Discard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {status === 'idle' && (
          <div className="p-3 bg-[hsl(var(--background))] flex gap-3 items-end relative">
            <TextareaAutosize
              cacheMeasurements
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
                if (e.key === 'Escape') {
                  handleDiscard();
                }
              }}
              placeholder="What do you want the AI to write?"
              minRows={1}
              maxRows={10}
              className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] border-none outline-none focus:ring-0 resize-none py-1.5"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors mb-0.5 ${
                prompt.trim() 
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' 
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="p-6 bg-[hsl(var(--background))] flex flex-col items-center justify-center gap-3">
             <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
             <p className="text-sm font-medium animate-pulse text-[hsl(var(--muted-foreground))]">Drafting your content...</p>
          </div>
        )}

        {/* Preview editor — always mounted so it stays DOM-attached, hidden when not success */}
        <div 
          className={`bg-[hsl(var(--background))] max-h-96 overflow-y-auto w-full ${
            status === 'success' ? '' : 'hidden'
          }`}
        >
          <div className="p-5 text-sm text-[hsl(var(--foreground))] prose prose-sm dark:prose-invert max-w-none">
            <EditorContent editor={previewEditor} />
          </div>
        </div>

        {status === 'error' && (
          <div className="p-4 bg-[hsl(var(--background))] flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center max-w-sm">Something went wrong while generating content. Please try again or rephrase your prompt.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted-foreground))]/20 transition-colors"
               >
                 Try Again
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-500/10 transition-colors"
               >
                 Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
