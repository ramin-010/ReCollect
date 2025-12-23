'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'javascript', className }: CodeBlockProps) {
  
  const highlightedCode = useMemo(() => {
    // Simple regex-based syntax highlighting for demo purposes
    // (In production, use prismjs or shiki)
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Keywords
    const keywords = /\b(const|let|var|function|return|import|export|from|if|else|for|while|class|interface|type|extends|implements|new|this|async|await|try|catch|finally)\b/g;
    html = html.replace(keywords, '<span class="text-purple-400 font-semibold">$1</span>');

    // Strings
    const strings = /(['"`])(.*?)\1/g;
    html = html.replace(strings, '<span class="text-green-400">$1$2$1</span>');

    // Numbers
    const numbers = /\b(\d+)\b/g;
    html = html.replace(numbers, '<span class="text-orange-400">$1</span>');

    // Comments (Simple //)
    const comments = /(\/\/.*)/g;
    html = html.replace(comments, '<span class="text-slate-500 italic">$1</span>');

    // Functions calls
    const functions = /\b([a-zA-Z]\w*)(?=\()/g;
    html = html.replace(functions, '<span class="text-blue-400">$1</span>');

    return html;
  }, [code]);

  return (
    <div className={cn("w-full h-full flex flex-col bg-[#1e1e1e] text-slate-300 rounded-lg overflow-hidden border border-slate-700/50 shadow-sm text-xs font-mono", className)}>
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-b border-white/5">
        <Terminal className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] uppercase tracking-wider opacity-70">{language}</span>
        <div className="ml-auto flex gap-1.5">
           <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
           <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
           <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 custom-scrollbar">
        <pre className="m-0 bg-transparent p-0">
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
}
