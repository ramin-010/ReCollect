'use client';

import { useState } from 'react';
import { Calendar, Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { addDays } from '@/lib/learning/dates';
import type { DayString } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { lx } from './styles';

/**
 * Revise AiContextExportModal: pick a range (default the last 7 days, as user days),
 * GET /api/learning/export/mentor, copy the prompt.
 */
interface AiExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  today: DayString;
}

export function AiExportDialog(props: AiExportDialogProps) {
  if (!props.isOpen) return null;
  return <AiExportBody {...props} />;
}

function AiExportBody({ isOpen, onClose, today }: AiExportDialogProps) {
  const [from, setFrom] = useState(() => addDays(today, -7));
  const [to, setTo] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generate = async () => {
    if (from > to) {
      toast.error('"From" must be on or before "To"');
      return;
    }
    setIsLoading(true);
    setPrompt(null);
    try {
      setPrompt((await learningApi.getMentorExport(from, to)).prompt);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate export');
    } finally {
      setIsLoading(false);
    }
  };

  const copy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Clipboard is blocked');
    }
  };

  const dateField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="flex-1 w-full">
      <label className={cn('text-xs font-semibold uppercase tracking-wider mb-2 block', lx.muted)}>{label}</label>
      <div className="relative">
        <Calendar className={cn('w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2', lx.muted)} />
        <input type="date" value={value} max={today} onChange={(e) => onChange(e.target.value)} className={cn(lx.input, 'pl-9')} />
      </div>
    </div>
  );

  return (
    <LearningDialog
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-2xl"
      headerTint="purple"
      icon={<Sparkles className="w-5 h-5 text-purple-400" />}
      title="Export AI Context"
      subtitle="Generate a prompt with your logs and debriefs to paste into Claude or ChatGPT."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {dateField('From Date', from, setFrom)}
          {dateField('To Date', to, setTo)}
          <button
            onClick={() => void generate()}
            disabled={isLoading || !from || !to}
            className={cn('w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2', lx.primaryBg)}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Prompt
          </button>
        </div>
        {prompt && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <h3 className={cn('text-sm font-semibold', lx.fg)}>Generated Prompt</h3>
              <button onClick={() => void copy()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20 transition-colors rounded-lg text-xs font-semibold">
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <div className={cn('rounded-xl p-4 overflow-y-auto max-h-[40vh] custom-scrollbar', lx.inset)}>
              <pre className={cn('text-xs whitespace-pre-wrap font-mono leading-relaxed', lx.muted)}>{prompt}</pre>
            </div>
          </div>
        )}
      </div>
    </LearningDialog>
  );
}
