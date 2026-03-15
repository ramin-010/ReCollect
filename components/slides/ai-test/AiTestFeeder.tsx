'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Layers, Box, Play,
  Image as ImageIcon, Code, Type, Link2,
  FlaskConical, Wand2, Loader2, AlertCircle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { SlideCanvas, SlideCanvasHandle } from '../core/SlideCanvas';
import { SAMPLE_DECKS, SampleDeckMeta } from './sampleDecks';
import { slideApi } from '@/lib/api/slideApi';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function countBlockTypes(sample: SampleDeckMeta) {
  const counts = { text: 0, image: 0, code: 0, embed: 0 };
  for (const b of sample.data.blocks) {
    if (b.type in counts) counts[b.type as keyof typeof counts]++;
  }
  return counts;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  image: <ImageIcon className="w-3 h-3" />,
  code: <Code className="w-3 h-3" />,
  embed: <Link2 className="w-3 h-3" />,
};

const CARD_COLORS = [
  'from-amber-500/20 to-orange-600/10 border-amber-500/30',
  'from-blue-500/20 to-indigo-600/10 border-blue-500/30',
  'from-violet-500/20 to-purple-600/10 border-violet-500/30',
  'from-rose-500/20 to-pink-600/10 border-rose-500/30',
];

const LOADING_MESSAGES = [
  'Understanding your topic...',
  'Designing slide layouts...',
  'Writing detailed content...',
  'Positioning blocks on canvas...',
  'Adding connections & styling...',
  'Almost done...',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AiTestFeeder({ onClose }: { onClose: () => void }) {
  const [activeSample, setActiveSample] = useState<SampleDeckMeta | null>(null);
  const [aiGeneratedData, setAiGeneratedData] = useState<any | null>(null);
  const [aiDeckName, setAiDeckName] = useState('');

  // AI Generate state
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const canvasRef = useRef<SlideCanvasHandle>(null);
  const loadingInterval = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = useCallback((sample: SampleDeckMeta) => {
    setActiveSample(sample);
    setAiGeneratedData(null);
  }, []);

  const startLoadingAnimation = () => {
    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    loadingInterval.current = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2500);
  };

  const stopLoadingAnimation = () => {
    if (loadingInterval.current) {
      clearInterval(loadingInterval.current);
      loadingInterval.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');
    startLoadingAnimation();

    try {
      const result = await slideApi.generateWithAi(prompt, selectedModel);

      if (result.success && result.data) {
        toast.success(`Generated ${result.slideCount} slides with ${result.blockCount} blocks!`);
        setAiGeneratedData(result.data);
        setAiDeckName(prompt.slice(0, 50));
      } else {
        setError(result.message || 'Failed to generate slides.');
        toast.error(result.message || 'Generation failed.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Network error.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      stopLoadingAnimation();
    }
  };

  // ── Viewing a sample deck or AI generated deck ──
  const viewingData = aiGeneratedData || (activeSample ? activeSample.data : null);
  const viewingName = aiGeneratedData ? `AI: ${aiDeckName}` : activeSample?.name || '';

  if (viewingData && !isGenerating) {
    const contentJson = JSON.stringify(viewingData);
    return (
      <div className="flex flex-col h-full w-full">
        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-[hsl(var(--divider))]/40 bg-[hsl(var(--sidebar-bg))] backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveSample(null); setAiGeneratedData(null); }}
            className="group flex items-center gap-1.5 h-8 px-3 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/3 transition-all"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs font-semibold tracking-wide">Back to Lab</span>
          </Button>

          <div className="w-[1px] h-4 bg-[hsl(var(--divider))]" />

          <div className="flex items-center gap-2">
            {aiGeneratedData ? (
              <Wand2 className="w-4 h-4 text-violet-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              {viewingName}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              (Preview — not saved)
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <SlideCanvas
            ref={canvasRef}
            initialContent={contentJson}
            onChange={() => {}}
            deckId={aiGeneratedData ? `ai-gen-${Date.now()}` : `ai-test-${activeSample?.id}`}
          />
        </div>
      </div>
    );
  }

  // ── Picker + AI Generate view ──
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  AI Slide Lab
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Generate slides with AI or preview sample decks
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Decks
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="max-w-[900px] mx-auto space-y-8">

          {/* ── AI Generation Section ── */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Generate with AI
              </h2>
            </div>

            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Describe any topic and AI will create a full slide deck with text, images, code blocks, and connections.
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                placeholder="e.g. 'How neural networks learn' or 'Introduction to Rust programming'"
                disabled={isGenerating}
                className="flex-1 px-4 py-3 rounded-xl bg-[hsl(var(--foreground))]/5 border border-[hsl(var(--divider))]/50 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 text-sm disabled:opacity-50"
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-violet-600 text-white hover:bg-violet-700 border-0 gap-2 px-6 rounded-xl disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>

            {/* Loading state */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                    <Sparkles className="w-3 h-3 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <motion.span
                    key={loadingMsg}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-violet-300"
                  >
                    {loadingMsg}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            {error && !isGenerating && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-[hsl(var(--divider))]/30" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]/60 uppercase tracking-widest">or try a sample</span>
            <div className="flex-1 h-[1px] bg-[hsl(var(--divider))]/30" />
          </div>

          {/* ── Sample Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {SAMPLE_DECKS.map((sample, i) => {
                const types = countBlockTypes(sample);
                const connectionCount = sample.data.slides.reduce(
                  (sum, s) => sum + (s.connections?.length || 0), 0
                );

                return (
                  <motion.div
                    key={sample.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <button
                      onClick={() => handleSelect(sample)}
                      className={`
                        w-full text-left p-5 rounded-xl border
                        bg-gradient-to-br ${CARD_COLORS[i % CARD_COLORS.length]}
                        hover:scale-[1.02] hover:shadow-lg
                        transition-all duration-200 cursor-pointer
                        group
                      `}
                    >
                      <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-1 group-hover:text-amber-400 transition-colors">
                        {sample.name}
                      </h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 leading-relaxed line-clamp-2">
                        {sample.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mb-2">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          {sample.slideCount} slides
                        </span>
                        <span className="flex items-center gap-1">
                          <Box className="w-3.5 h-3.5 text-green-400" />
                          {sample.blockCount} blocks
                        </span>
                        {connectionCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Link2 className="w-3.5 h-3.5 text-amber-400" />
                            {connectionCount}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(types).filter(([, c]) => c > 0).map(([type, count]) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]/50 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"
                          >
                            {TYPE_ICONS[type]} {count} {type}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-3 h-3" />
                        Open Preview
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
