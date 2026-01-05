import React from 'react';
import { Doc, DocType } from '@/lib/store/docStore';

// View and filter types
export type ViewMode = 'gallery' | 'list' | 'shared-by-me';
export type SortOption = 'updated' | 'created' | 'title';
export type OwnershipFilter = 'all' | 'mine' | 'shared';

// Props for doc item components
export interface DocItemProps {
  doc: Doc;
  index: number;
  currentUserId?: string;
  onOpen: (doc: Doc) => void;
  onTogglePin: (doc: Doc, e: React.MouseEvent) => void;
  onShare: (doc: Doc, e: React.MouseEvent) => Promise<void>;
  onDelete: (doc: Doc, e: React.MouseEvent) => void;
  onChangeType: (doc: Doc, type: DocType, e: React.MouseEvent) => void;
  onRename: (doc: Doc, newTitle: string) => Promise<void>;
}

export interface SharedByMeSectionProps {
  sharedByMeDocs: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

// Utility functions
// getDocPreview now accepts yjsState (Base64) or JSON content
export const getDocPreview = (yjsStateOrContent: string | object | null | undefined): { text: string; hasContent: boolean } => {
  try {
    if (!yjsStateOrContent) {
      return { text: '', hasContent: false };
    }

    let content: any;
    
    if (typeof yjsStateOrContent === 'string') {
      if (yjsStateOrContent.trim() === '') {
        return { text: '', hasContent: false };
      }
      // Try to parse as JSON first (for backward compat)
      try {
        content = JSON.parse(yjsStateOrContent);
      } catch {
        // If not JSON, try to convert from yjsState
        try {
          const { yjsStateToJson } = require('@/lib/utils/yjsConverter');
          content = yjsStateToJson(yjsStateOrContent);
        } catch {
          return { text: '', hasContent: false };
        }
      }
    } else {
      content = yjsStateOrContent;
    }

    if (!content || typeof content !== 'object') {
      return { text: '', hasContent: false };
    }

    const nodes = content.content || (Array.isArray(content) ? content : []);
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { text: '', hasContent: false };
    }

    const extractText = (node: any): string => {
      if (!node) return '';
      if (typeof node === 'string') return node;
      if (node.text) return node.text;
      
      const nodeType = node.type;
      let result = '';
      
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          result += extractText(child);
        }
      }
      
      if (nodeType === 'image' && node.attrs?.alt) {
        result += `[Image: ${node.attrs.alt}]`;
      }
      
      if (nodeType === 'codeBlock') {
        result += '[Code]';
      }
      
      return result;
    };

    const lines: string[] = [];
    for (const node of nodes) {
      const text = extractText(node).trim();
      if (text) {
        lines.push(text);
      }
      if (lines.join('\n').length > 400) break;
    }

    let fullText = lines.join('\n').substring(0, 350);

    return { 
      text: fullText, 
      hasContent: fullText.length > 0 
    };
  } catch (e) {
    console.error('Error extracting doc preview:', e);
    return { text: '', hasContent: false };
  }
};

export const getAccentColor = (id: string): string => {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getDocTag = (doc: Doc): { label: string; color: string } => {
  const docTypeColors: Record<DocType, { label: string; color: string }> = {
    notes: { label: 'Notes', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400' },
    meeting: { label: 'Meeting', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    project: { label: 'Project', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    personal: { label: 'Personal', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  return docTypeColors[doc.docType] || docTypeColors.notes;
};

export const getStatusBadge = (doc: Doc): { label: string; color: string } | null => {
  if (doc._id.startsWith('local_')) {
    return { label: 'Draft', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
  }
  if (doc.isPinned) {
    return { label: 'Pinned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  }
  return null;
};

export const getTags = (doc: Doc) => {
  switch (doc.docType) {
    case 'meeting': return { label: 'Meeting', color: 'bg-violet-600/90 text-white' };
    case 'project': return { label: 'Project', color: 'bg-emerald-600/90 text-white' };
    case 'personal': return { label: 'Personal', color: 'bg-amber-600/90 text-white' };
    case 'notes': default: return { label: 'Notes', color: 'bg-blue-600/90 text-white' };
  }
};
