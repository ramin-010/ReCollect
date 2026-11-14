'use client';

import * as Y from 'yjs';
import { prosemirrorJSONToYDoc, yXmlFragmentToProsemirrorJSON } from 'y-prosemirror';
import { getSchema } from '@tiptap/core';
import { docSchemaExtensions } from '@/lib/editor/docSchema';
import { withCanvasData } from '@/lib/editor/canvasBoard';

// Build the same schema used by the editor
const extensions = docSchemaExtensions();

// Get ProseMirror schema from TipTap extensions
const schema = getSchema(extensions);

/**
 * Convert TipTap JSON content to Yjs binary state (Base64)
 */
export function jsonToYjsState(json: any): string {
  // Validate and ensure proper document structure
  if (!json || typeof json !== 'object') {
    json = { type: 'doc', content: [] };
  }
  
  // Ensure it has the proper doc type
  if (json.type !== 'doc') {
    json = { type: 'doc', content: json.content || [] };
  }
  
  // Ensure content is an array
  if (!Array.isArray(json.content)) {
    json = { type: 'doc', content: [] };
  }
  
  // Filter out nodes with undefined types
  json.content = json.content.filter((node: any) => node && node.type);
  
  try {
    const ydoc = prosemirrorJSONToYDoc(schema, json, 'default');
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64 = Buffer.from(state).toString('base64');
    ydoc.destroy();
    return base64;
  } catch (err) {
    console.error('[yjsConverter] Failed to convert JSON to Yjs:', err);
    // Return empty doc state
    const emptyDoc = { type: 'doc', content: [] };
    const ydoc = prosemirrorJSONToYDoc(schema, emptyDoc, 'default');
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64 = Buffer.from(state).toString('base64');
    ydoc.destroy();
    return base64;
  }
}

/**
 * Convert Yjs binary state (Base64) to TipTap JSON content. Canvas blocks carry their board in
 * `attrs.data` (the board lives outside the fragment), so editors without the Y.Doc can show it.
 */
export function yjsStateToJson(base64State: string): any {
  const state = Buffer.from(base64State, 'base64');
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  const fragment = ydoc.getXmlFragment('default');
  const json = withCanvasData(yXmlFragmentToProsemirrorJSON(fragment), ydoc);
  ydoc.destroy();
  return json;
}

/**
 * Check if a Yjs state is empty (no content)
 */
export function isYjsStateEmpty(base64State: string | undefined | null): boolean {
  if (!base64State) return true;
  try {
    const json = yjsStateToJson(base64State);
    if (!json?.content || json.content.length === 0) return true;
    if (json.content.length === 1 && json.content[0].type === 'paragraph' && !json.content[0].content) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}
