'use client';

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Heading2, Heading3, List, ListOrdered,
  Quote, Code, Minus, CheckSquare, Type
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: ({ editor, range }: { editor: any; range: any }) => void;
}

export const getSuggestionItems = (): CommandItem[] => [
  {
    title: 'Text',
    description: 'Plain text',
    icon: <Type className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading2 className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading3 className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with a todo list',
    icon: <CheckSquare className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Simple bullet list',
    icon: <List className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
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
  {
    title: 'Code Block',
    description: 'Code snippet',
    icon: <Code className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide content',
    icon: <Minus className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
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

  useEffect(() => {
    const container = containerRef.current;
    const item = container?.children[selectedIndex + 1] as HTMLElement; // +1 for title
    if (item && container) {
      const needsScroll = item.offsetTop < container.scrollTop || item.offsetTop + item.offsetHeight > container.scrollTop + container.offsetHeight;
      if (needsScroll) {
          item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

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
    return null;
  }

  return (
    <div 
        ref={containerRef} 
        className="z-50 bg-[hsl(var(--popover))] rounded-lg border border-[hsl(var(--border))] shadow-lg overflow-y-auto overflow-x-hidden p-1 min-w-[240px] max-h-[300px] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))] px-2 py-1.5 mb-1">
        Basic Blocks
      </div>
      {items.map((item, index) => (
        <button
          key={item.title}
          onClick={() => selectItem(index)}
          onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors text-left
            ${index === selectedIndex 
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' 
                : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
            }
          `}
        >
          <div className="flex items-center justify-center h-8 w-8 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] shrink-0 text-[hsl(var(--foreground))]">
            {item.icon}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="font-medium truncate">{item.title}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';

export const SlashCommands = Extension.create({
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
