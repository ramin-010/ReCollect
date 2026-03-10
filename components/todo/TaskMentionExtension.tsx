'use client';

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import tippy, { Instance } from 'tippy.js';
import { UserCircle2, Loader2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { todoApi } from '@/lib/api/todoApi';

interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, any>((props, ref) => {
  const { query, command, workspaceMembers = [] } = props;
  const [fetchedAssignees, setFetchedAssignees] = useState<Assignee[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
        if (!query.trim() || query.trim().length < 2) {
             setFetchedAssignees(workspaceMembers || []);
             return;
        }
        
        setIsLoading(true);
        try {
            const users = await todoApi.searchUsers(query.trim());
            setFetchedAssignees(users);
        } catch (err) {
            console.error("Failed to search users", err);
        } finally {
            setIsLoading(false);
        }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, workspaceMembers]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [fetchedAssignees.length]);

  const selectItem = useCallback((index: number) => {
    const item = fetchedAssignees[index];
    if (item) {
      command({ text: `@${item.name} `, id: item._id, item });
    }
  }, [fetchedAssignees, command]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setHighlightedIndex((prev) => (prev - 1 + fetchedAssignees.length) % Math.max(fetchedAssignees.length, 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(fetchedAssignees.length, 1));
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(highlightedIndex);
        return true;
      }
      return false;
    },
  }), [fetchedAssignees.length, selectItem, highlightedIndex]);

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
    <div className="w-64 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="p-2 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2">
        <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
          Assign To
        </span>
      </div>
      
      <div ref={dropdownRef} className="max-h-48 overflow-y-auto custom-scrollbar p-1">
        {isLoading && (
          <div className="flex items-center justify-center p-3 text-white/30 text-xs gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Searching...
          </div>
        )}
        
        {!isLoading && fetchedAssignees.length === 0 && (
          <div className="p-3 text-center text-white/30 text-xs">
            {query.length < 2 && (!workspaceMembers || workspaceMembers.length === 0) 
              ? "Type mapping to search..." : "No users found"}
          </div>
        )}

        {!isLoading && fetchedAssignees.map((user, index) => (
          <button
            key={user._id}
            onClick={() => selectItem(index)}
            className={cn(
              "flex items-center w-full px-2 py-1.5 min-h-[36px] text-left rounded-lg transition-all",
              highlightedIndex === index ? "bg-indigo-500/20 text-indigo-300" : "text-white/70 hover:bg-white/5"
            )}
            onMouseEnter={() => setHighlightedIndex(index)}
          >
            <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-none overflow-hidden text-[10px] font-bold mr-2">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm truncate leading-snug">{user.name}</p>
               <p className="text-[10px] truncate text-white/40 leading-tight">{user.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

MentionList.displayName = 'MentionList';

export interface TaskMentionOptions {
  workspaceMembers?: any[];
  onSelectAssignee?: (user: any) => void;
}

export const createTaskMentionExtension = (options: TaskMentionOptions) => Extension.create({
  name: 'mentionCommands',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          editor.chain().focus().deleteRange(range).insertContent(props.text).run();
          if (options.onSelectAssignee && props.item) {
            options.onSelectAssignee(props.item);
          }
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('mentionCommands'),
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          // ReactRenderer will just get the query and workspaceMembers via props
          return [{ query }];
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance[] | null = null;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(MentionList, {
                props: { ...props, query: props.query, workspaceMembers: options.workspaceMembers },
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
              component?.updateProps({ ...props, query: props.query, workspaceMembers: options.workspaceMembers });

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
              return (component?.ref as MentionListRef)?.onKeyDown(props) ?? false;
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
