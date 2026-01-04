'use client';

export function EditorStyles() {
  return (
    <style jsx global>{`
      /* Drag Handle - Notion Style */
      .drag-handle {
        width: 24px;
        height: 24px;
        z-index: 50;
        cursor: grab;
        color: white;
        
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
        background-size: 20px 20px;
        background-repeat: no-repeat;
        background-position: center;
        
        transition: background-color 0.2s;
        border-radius: 4px;
      }
      .drag-handle:hover {
        background-color: rgba(255, 255, 255, 0.08);
        stroke: #ffffff !important;
      }
      .drag-handle:active {
        cursor: grabbing;
        background-color: rgba(255, 255, 255, 0.15);
      }
      .drag-handle.hide {
        opacity: 0;
        pointer-events: none;
      }

      /* Slash Command Menu */
      .slash-command-menu {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 0.5rem;
        box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
        padding: 0.5rem;
        width: 280px;
        max-height: 320px;
        overflow-y: auto;
      }
      .slash-command-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.5rem;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background-color 0.15s;
        background: transparent;
        border: none;
        text-align: left;
      }
      .slash-command-item:hover, .slash-command-item.is-selected {
        background: hsl(var(--accent));
      }
      .slash-command-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.375rem;
        background: hsl(var(--muted));
        border: 1px solid hsl(var(--border));
        flex-shrink: 0;
      }
      .slash-command-text {
        display: flex;
        flex-direction: column;
      }
      .slash-command-title {
        font-weight: 500;
        font-size: 0.875rem;
        color: hsl(var(--foreground));
      }
      .slash-command-description {
        font-size: 0.75rem;
        color: hsl(var(--muted-foreground));
      }

      /* Editor Styles */
      .notion-editor .ProseMirror {
        font-size: 16px;
        line-height: 1.75;
        color: hsl(var(--foreground));
      }
      .notion-editor .ProseMirror > * + * {
        margin-top: 0.75em;
      }
      .notion-editor .ProseMirror p.is-empty::before,
      .notion-editor .ProseMirror h1.is-empty::before,
      .notion-editor .ProseMirror h2.is-empty::before,
      .notion-editor .ProseMirror h3.is-empty::before {
        content: attr(data-placeholder);
        float: left;
        color: hsl(var(--muted-foreground));
        opacity: 0.5;
        pointer-events: none;
        height: 0;
      }
      .notion-editor .ProseMirror h1,
      .notion-editor .ProseMirror h2,
      .notion-editor .ProseMirror h3 {
        color: #FFFFFF;
      }
      .notion-editor .ProseMirror p,
      .notion-editor .ProseMirror li {
        color: #dad7d7ff;
        margin-left: 0;
        padding-left: 0;
      }
      .notion-editor .ProseMirror p {
        margin: 0.5rem 0;
      }
      .notion-editor .ProseMirror h1,
      .notion-editor .ProseMirror h2,
      .notion-editor .ProseMirror h3 {
        margin-left: 0;
        padding-left: 0;
      }
      .notion-editor .ProseMirror h1 {
        font-size: 2.25rem;
        font-weight: 700;
        margin-top: 2rem;
        margin-bottom: 0.5rem;
        line-height: 1.2;
      }
      .notion-editor .ProseMirror h2 {
        font-size: 1.75rem;
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        line-height: 1.3;
      }
      .notion-editor .ProseMirror mark {
        background-color: transparent;
        color: inherit;
        padding: 0;
        margin: 0;
        display: inline;
      }
      .notion-editor .ProseMirror h3 {
        font-size: 1.375rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
      }
      .notion-editor .ProseMirror ul:not([data-type="taskList"]), 
      .notion-editor .ProseMirror ol {
        padding-left: 1.5rem;
        margin: 0.5rem 0;
      }
      .notion-editor .ProseMirror ul:not([data-type="taskList"]) {
        list-style-type: disc;
      }
      .notion-editor .ProseMirror ol {
        list-style-type: decimal;
      }
      .notion-editor .ProseMirror ul:not([data-type="taskList"]) li::marker,
      .notion-editor .ProseMirror ol li::marker {
        color: hsl(var(--muted-foreground));
      }
      .notion-editor .ProseMirror li {
        margin: 0.25rem 0;
      }
      .notion-editor .ProseMirror li p {
        margin: 0;
      }
      .notion-editor .ProseMirror ul[data-type="taskList"] {
        list-style: none;
        padding-left: 0;
      }
      .notion-editor .ProseMirror ul[data-type="taskList"] li {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .notion-editor .ProseMirror ul[data-type="taskList"] li > label {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
      }
      .notion-editor .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
        width: 16px;
        height: 16px;
        min-width: 16px;
        min-height: 16px;
        accent-color: hsl(var(--primary));
        cursor: pointer;
        margin: 0;
      }
      .notion-editor .ProseMirror blockquote {
        border-left: 4px solid hsl(var(--primary));
        padding-left: 1rem;
        margin: 1.5rem 0;
        color: hsl(var(--muted-foreground));
        font-style: italic;
      }
      .notion-editor .ProseMirror code {
        background: hsl(var(--muted));
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        font-size: 0.9em;
        font-family: ui-monospace, monospace;
      }
      .notion-editor .ProseMirror pre {
        background: hsl(var(--muted));
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
        overflow-x: auto;
        font-family: ui-monospace, monospace;
      }
      .notion-editor .ProseMirror pre code {
        background: none;
        padding: 0;
      }
      .notion-editor .ProseMirror hr {
        border: none;
        border-top: 2px solid hsl(var(--border));
        margin: 2rem 0;
      }
      .notion-editor .ProseMirror img {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
      }
      .notion-editor .ProseMirror mark {
        background-color: transparent;
        color: #efecece5 !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
      }

      /* Collaboration Cursors */
      .collaboration-cursor__caret {
        border-left: 1px solid #0d0d0d;
        border-right: 1px solid #0d0d0d;
        margin-left: -1px;
        margin-right: -1px;
        pointer-events: none;
        position: relative;
        word-break: normal;
      }
      .collaboration-cursor__label {
        border-radius: 3px 3px 3px 0;
        color: #fff;
        font-size: 12px;
        font-style: normal;
        font-weight: 600;
        left: -1px;
        line-height: normal;
        padding: 0.1rem 0.3rem;
        position: absolute;
        top: -1.4em;
        user-select: none;
        white-space: nowrap;
        z-index: 10;
      }
    `}</style>
  );
}
