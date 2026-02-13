'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Terminal, Copy, Check, ChevronDown } from 'lucide-react';
import Prism from 'prismjs';

// Import Prism languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'html', label: 'HTML', prismId: 'markup' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'bash', label: 'Bash' },
  { id: 'sql', label: 'SQL' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'jsx', label: 'JSX' },
  { id: 'tsx', label: 'TSX' },
];

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  editable?: boolean;
  onUpdate?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
}

export function CodeBlock({ 
  code, 
  language = 'javascript', 
  className,
  editable = false,
  onUpdate,
  onLanguageChange
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Auto-detect language from code content
  const detectedLanguage = useMemo(() => {
    if (language && language !== 'javascript') return language;
    return autoDetectLanguage(code);
  }, [code, language]);

  const currentLang = LANGUAGES.find(l => l.id === detectedLanguage) || LANGUAGES[0];
  const prismLang = currentLang.prismId || currentLang.id;

  const highlightedCode = useMemo(() => {
    try {
      const grammar = Prism.languages[prismLang];
      if (grammar) {
        return Prism.highlight(code, grammar, prismLang);
      }
    } catch {
      // Fallback: escape HTML
    }
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }, [code, prismLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Close language picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false);
      }
    };
    if (showLangPicker) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showLangPicker]);

  // Focus textarea on edit start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(code.length, code.length);
    }
  }, [isEditing]);

  const lineCount = code.split('\n').length;

  return (
    <div className={cn(
      "w-full h-full flex flex-col rounded-lg overflow-hidden border border-slate-700/50 shadow-sm text-xs font-mono",
      "bg-[#1e1e2e] text-slate-300",
      className
    )}>
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#181825] border-b border-white/5">
        {/* Mac-style dots */}
        <div className="flex gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f38ba8]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#f9e2af]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#a6e3a1]/70" /> 
        </div>

        {/* Language Selector */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowLangPicker(!showLangPicker); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider 
              text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <Terminal className="w-3 h-3" />
            {currentLang.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showLangPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-[#1e1e2e] border border-slate-700 rounded-lg shadow-xl 
              max-h-48 overflow-y-auto w-36 py-1 animate-in fade-in zoom-in-95 duration-100">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLanguageChange?.(lang.id);
                    onUpdate?.(code); // Trigger save
                    setShowLangPicker(false);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors",
                    lang.id === detectedLanguage 
                      ? "bg-[#cba6f7]/10 text-[#cba6f7]" 
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Line count */}
          <span className="text-[10px] text-slate-500 mr-2">{lineCount} lines</span>
          
          {/* Copy Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div 
        className="flex-1 overflow-auto p-0 custom-scrollbar relative"
        onDoubleClick={(e) => { 
          if (editable) { e.stopPropagation(); setIsEditing(true); }
        }}
      >
        <div className="flex">
          {/* Line Numbers */}
          <div className="flex flex-col px-3 py-3 text-right select-none border-r border-white/5 bg-[#11111b]/50 sticky left-0">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i} className="text-slate-600 leading-5 text-[11px]">{i + 1}</span>
            ))}
          </div>

          {/* Code Area */}
          <div className="flex-1 relative">
            {isEditing && editable ? (
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => onUpdate?.(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-full bg-transparent text-slate-300 resize-none outline-none p-3 leading-5 text-xs font-mono"
                spellCheck={false}
                style={{ minHeight: `${lineCount * 20 + 24}px` }}
              />
            ) : (
              <pre className="m-0 bg-transparent p-3 overflow-visible">
                <code 
                  className={`language-${prismLang}`}
                  dangerouslySetInnerHTML={{ __html: highlightedCode }} 
                  style={{ lineHeight: '20px', fontSize: '12px' }}
                />
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Prism Theme Styles */}
      <style>{`
        /* Catppuccin Mocha inspired Prism theme */
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6c7086; font-style: italic; }
        .token.punctuation { color: #bac2de; }
        .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol { color: #fab387; }
        .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin { color: #a6e3a1; }
        .token.operator, .token.entity, .token.url { color: #89dceb; }
        .token.atrule, .token.attr-value, .token.keyword { color: #cba6f7; }
        .token.function, .token.class-name { color: #89b4fa; }
        .token.regex, .token.important, .token.variable { color: #f9e2af; }
        .token.deleted { color: #f38ba8; }
        .token.inserted { color: #a6e3a1; }
      `}</style>
    </div>
  );
}

/** Auto-detect programming language from code content */
function autoDetectLanguage(code: string): string {
  if (!code || code.length < 10) return 'javascript';
  
  // TypeScript / TSX
  if (/\b(interface|type\s+\w+\s*=|:\s*(string|number|boolean|any)\b|<\w+>)/i.test(code)) {
    return code.includes('className=') || code.includes('jsx') ? 'tsx' : 'typescript';
  }
  // Python
  if (/\b(def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\s*\(|class\s+\w+.*:$|self\.|__init__|elif\b)/m.test(code)) {
    return 'python';
  }
  // HTML
  if (/^\s*<(!DOCTYPE|html|head|body|div|span|p|h[1-6]|a\s|img\s|script|style|link\s)/im.test(code)) {
    return 'html';
  }
  // CSS
  if (/^\s*[\.\#@][\w-]+\s*\{|:\s*(flex|grid|block|none|inherit|relative|absolute)/m.test(code)) {
    return 'css';
  }
  // JSON
  if (/^\s*[\{\[]\s*"/.test(code)) {
    try { JSON.parse(code); return 'json'; } catch {}
  }
  // SQL
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP|FROM\s+\w+|WHERE)\b/i.test(code)) {
    return 'sql';
  }
  // Bash
  if (/^(#!\/bin\/(bash|sh)|^\$\s|\bsudo\b|\bapt\b|\bnpm\b|\byarn\b|\bgit\b|\becho\b|\bexport\b)/m.test(code)) {
    return 'bash';
  }
  // Java
  if (/\b(public\s+class|System\.out|void\s+main|import\s+java\.|@Override)\b/.test(code)) {
    return 'java';
  }
  // Go
  if (/\b(package\s+main|func\s+\w+|fmt\.|import\s+\()/m.test(code)) {
    return 'go';
  }
  // Rust
  if (/\b(fn\s+\w+|let\s+mut|impl\s+|pub\s+fn|use\s+std::|\->\s*\w+)/m.test(code)) {
    return 'rust';
  }
  // C/C++
  if (/\b(#include\s*<|int\s+main|printf|cout|cin|std::)/m.test(code)) {
    return 'cpp';
  }
  // JSX
  if (/\breturn\s*\(?\s*<|className=|onClick=/.test(code)) {
    return 'jsx';
  }
  
  return 'javascript';
}
