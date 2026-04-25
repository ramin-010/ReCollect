import React, { useEffect, useRef } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { CornerDownRight, CheckCircle, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subtaskWidget: {
      insertSubtaskWidget: () => ReturnType;
    };
  }
}

interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
}

const SubtaskWidgetComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode, editor }) => {
  const subtasks: Subtask[] = node.attrs.subtasks || [];
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const updateSubtasks = (newSubtasks: Subtask[]) => {
    updateAttributes({ subtasks: newSubtasks });
  };

  const addSubtask = () => {
    updateSubtasks([...subtasks, { id: Math.random().toString(36).substring(7), text: '', isCompleted: false }]);
  };

  const toggleSubtask = (id: string) => {
    updateSubtasks(subtasks.map(st => st.id === id ? { ...st, isCompleted: !st.isCompleted } : st));
  };

  const removeSubtask = (id: string) => {
    const newGroup = subtasks.filter(st => st.id !== id);
    if (newGroup.length === 0) {
      deleteNode();
    } else {
      updateSubtasks(newGroup);
    }
  };

  const handleTextChange = (id: string, text: string) => {
    updateSubtasks(subtasks.map(st => st.id === id ? { ...st, text } : st));
  };

  // Automatically focus new subtasks when added, or self-destruct if somehow completely empty
  useEffect(() => {
    if (subtasks.length === 0) {
      addSubtask();
    } else {
      // On initial mount, ensure the first input (which is empty by default) gets focus
      // Timeout ensures Tiptap's core command chain finishes before we steal focus back to the React node
      setTimeout(() => {
        const inputs = Object.values(inputRefs.current).filter((el): el is HTMLInputElement => el !== null);
        if (inputs.length > 0 && inputs[0].value === '') {
          inputs[0].focus();
        }
      }, 50);
    }
  }, []);

  if (subtasks.length === 0) return null;

  return (
    <NodeViewWrapper className="my-4 mr-6" contentEditable={false} as="div">
      <div 
        className="border border-[hsl(var(--border))]/50 rounded-lg bg-[hsl(var(--muted))]/10 overflow-hidden"
        onMouseDown={(e) => {
          // Prevent Tiptap from stealing focus when clicking anywhere inside the widget
          // unless clicking a button that should propagate
          e.stopPropagation();
        }}
      >
        <div className="px-4 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))]/80 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/20 flex justify-between items-center group/header">
          <span>Sub-issues ({subtasks.filter(s => s.isCompleted).length}/{subtasks.length})</span>
          <button onClick={deleteNode} className="opacity-0 group-hover/header:opacity-100 text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--muted-foreground))] transition-all"><X className="w-3 h-3" /></button>
        </div>
        <div className="p-0.5 space-y-0.5">
          {subtasks.map((st, idx) => (
            <div key={st.id} className="flex items-center gap-3 px-3 py-2 group/item">
              <CornerDownRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/40" />
              <button 
                onClick={() => toggleSubtask(st.id)} 
                className={cn(
                  "w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border transition-colors cursor-pointer",
                  st.isCompleted ? "bg-emerald-500 border-emerald-500" : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]/40"
                )}
              >
                {st.isCompleted && <CheckCircle className="w-3 h-3 text-[hsl(var(--background))]" />}
              </button>
              <input
                ref={el => { inputRefs.current[st.id] = el; }}
                type="text" 
                value={st.text}
                onChange={(e) => handleTextChange(st.id, e.target.value)}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') { 
                    e.preventDefault(); 
                    addSubtask(); 
                    // Auto-focus the next newly added one will be handled by seeing the new ID,
                    // but for simplicity, setTimeout works well here to focus the newest input.
                    setTimeout(() => {
                      const inputs = Object.values(inputRefs.current).filter((el): el is HTMLInputElement => el !== null);
                      inputs[inputs.length - 1]?.focus();
                    }, 50);
                  } 
                  if (e.key === 'Backspace' && st.text === '') { 
                    e.preventDefault(); 
                    removeSubtask(st.id); 
                    setTimeout(() => {
                      const inputs = Object.values(inputRefs.current).filter((el): el is HTMLInputElement => el !== null);
                      inputs[inputs.length - 1]?.focus();
                    }, 50);
                  } 
                  // allow Esc to unfocus and let Tiptap regain core focus
                  if (e.key === 'Escape') { e.currentTarget.blur(); setTimeout(() => editor.commands.focus(), 50); }
                }}
                placeholder="Issue title"
                className={cn(
                  "flex-1 bg-transparent text-sm placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none min-w-[50px]", 
                  st.isCompleted ? "text-[hsl(var(--muted-foreground))]/60 line-through" : "text-[hsl(var(--foreground))]/80"
                )}
                autoFocus={st.text === ''}
              />
              <button 
                onClick={() => removeSubtask(st.id)} 
                className="opacity-0 group-hover/item:opacity-100 p-1 text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--muted-foreground))] transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button 
            onClick={addSubtask} 
            className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-indigo-400 hover:bg-[hsl(var(--muted))]/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add sub-issue
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const TaskSubtaskExtension = Node.create({
  name: 'subtaskWidget',
  group: 'block',
  atom: true, // Acts as a single uneditable node from Tiptap's core perspective
  
  addAttributes() {
    return {
      subtasks: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-subtasks');
          return raw ? JSON.parse(raw) : [];
        },
        renderHTML: attributes => {
          if (!attributes.subtasks) return {};
          return { 'data-subtasks': JSON.stringify(attributes.subtasks) };
        }
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="subtask-widget"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'subtask-widget' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SubtaskWidgetComponent);
  },

  addCommands() {
    return {
      insertSubtaskWidget: () => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { subtasks: [{ id: Math.random().toString(36).substring(7), text: '', isCompleted: false }] }
        });
      },
    };
  },
});
