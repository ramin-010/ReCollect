'use client';

import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import {
  Type,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Sparkles
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: ({ editor, range }: { editor: any; range: any }) => void;
}

export const getSuggestionItems = (): CommandItem[] => [
  {
    title: 'AI Assist',
    description: 'Write description better with AI (coming soon)',
    icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
    command: ({ editor, range }) => {
      // Just delete the command trigger for now
      editor.chain().focus().deleteRange(range).run();
      console.log('AI Assist option selected - implementation coming later');
    },
  },
  {
    title: 'Text',
    description: 'Plain text',
    icon: <Type className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Sub task',
    description: 'Track external sub-issues directly inline',
    icon: <CheckSquare className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertSubtaskWidget().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create an ordered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Bulleted List',
    description: 'Create a simple bullet list',
    icon: <List className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
];

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback((index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  }, [items, command]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }), [items.length, selectItem, selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="w-[280px] bg-[#1E1E1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-1">
        <div className="px-3 py-2 text-sm text-gray-400">No results</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-[280px] bg-[#1E1E1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
      {items.map((item, index) => (
        <button
          key={item.title}
          onClick={() => selectItem(index)}
          className={`flex items-center w-full px-2 py-1.5 text-left rounded-lg transition-colors ${
            index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded shrink-0 bg-white/5 mr-3">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white/90">{item.title}</span>
            <span className="text-[11px] text-white/40">{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export const TaskSlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return getSuggestionItems().filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance[] | null = null;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, {
                props,
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
              component?.updateProps(props);

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
              return (component?.ref as CommandListRef)?.onKeyDown(props) ?? false;
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
