'use client';

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import tippy, { Instance } from 'tippy.js';
import { Tag, Loader2, Plus,CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const DEFAULT_LABEL_COLOR = 'blue';

const LabelList = forwardRef<LabelListRef, any>((props, ref) => {
  const { query, command } = props;
  const [fetchedLabels, setFetchedLabels] = useState<Label[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tags from API
  useEffect(() => {
    const fetchTags = async () => {
        if (!query.trim()) {
            setFetchedLabels([]);
            return;
        }
        
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/api/tagQuery/search?q=${encodeURIComponent(query.trim())}`);
            if (res.data.success) {
                const tags = res.data.data || [];
                const labels: Label[] = tags.map((t: any) => ({
                    id: t._id || `tag-${t.name}`,
                    name: t.name,
                    color: DEFAULT_LABEL_COLOR
                }));
                setFetchedLabels(labels);
            }
        } catch (err) {
            console.error("Failed to search tags", err);
        } finally {
            setIsLoading(false);
        }
    };

    const timer = setTimeout(fetchTags, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const exactMatch = fetchedLabels.some(
    label => label.name.toLowerCase() === query.trim().toLowerCase()
  );
  
  const hasCreateOption = query.trim().length > 0 && !exactMatch;
  const totalOptions = fetchedLabels.length + (hasCreateOption ? 1 : 0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [totalOptions]);

  const selectItem = useCallback((index: number) => {
    if (index < fetchedLabels.length) {
      const item = fetchedLabels[index];
      command({ text: `#${item.name} `, item });
    } else if (hasCreateOption) {
      // Create new option
      command({ text: `#${query.trim()} `, item: { id: `tag-${query.trim()}`, name: query.trim(), color: DEFAULT_LABEL_COLOR } });
    }
  }, [fetchedLabels, command, hasCreateOption, query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setHighlightedIndex((prev) => (prev - 1 + totalOptions) % Math.max(totalOptions, 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(totalOptions, 1));
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(highlightedIndex);
        return true;
      }
      return false;
    },
  }), [totalOptions, selectItem, highlightedIndex]);

  // Auto-scroll logic
  useEffect(() => {
    if (dropdownRef.current) {
      const highlightedEl = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="w-48 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="p-2 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          Labels
        </span>
      </div>
      
      <div ref={dropdownRef} className="max-h-48 overflow-y-auto custom-scrollbar p-1">
        {isLoading && (
          <div className="flex items-center justify-center p-3 text-white/30 text-xs gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Searching...
          </div>
        )}
        
        {!isLoading && totalOptions === 0 && (
          <div className="p-3 text-center text-white/30 text-xs">
            {query.length === 0 ? "Type to search labels..." : "No matches"}
          </div>
        )}

        {!isLoading && fetchedLabels.map((label, index) => (
          <button
            key={label.id}
            onClick={() => selectItem(index)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
              highlightedIndex === index ? "bg-indigo-500/20 text-indigo-100" : "text-white/70 hover:bg-white/5"
            )}
            onMouseEnter={() => setHighlightedIndex(index)}
          >
           <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 opacity-40" />
                        <span>{label.name}</span>
                      </div>
                      {highlightedIndex && <CornerDownLeft className="w-3 h-3 opacity-40" />}
          </button>
        ))}

        {!isLoading && hasCreateOption && (
          <button
            onClick={() => selectItem(fetchedLabels.length)}
            onMouseEnter={() => setHighlightedIndex(fetchedLabels.length)}
            className={cn(
              "flex items-center w-full px-2 py-1.5 mt-1 border-t border-white/5 text-left rounded-lg transition-all",
              highlightedIndex === fetchedLabels.length ? "bg-indigo-500/20 text-indigo-300" : "text-white/70 hover:bg-white/5"
            )}
          >
            <Plus className="w-3 h-3 mr-2" />
            <span className="text-[11px] truncate mt-0.5">
              Create "{query.trim()}"
            </span>
          </button>
        )}
      </div>
    </div>
  );
});

LabelList.displayName = 'LabelList';

export interface TaskLabelOptions {
  onSelectLabel?: (label: any) => void;
}

export const createTaskLabelExtension = (options: TaskLabelOptions = {}) => Extension.create({
  name: 'labelCommands',

  addOptions() {
    return {
      suggestion: {
        char: '#',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          editor.chain().focus().deleteRange(range).insertContent(props.text).run();
          if (options.onSelectLabel && props.item) {
            options.onSelectLabel(props.item);
          }
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('labelCommands'),
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return [{ query }];
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance[] | null = null;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(LabelList, {
                props: { ...props, query: props.query },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate: (props: SuggestionProps) => {
              component?.updateProps({ ...props, query: props.query });

              if (!props.clientRect) return;

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as LabelListRef)?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
