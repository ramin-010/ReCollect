'use client';

import React, { useState, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { Plus, Image, Link, Youtube, X } from 'lucide-react';
import { getEmbedType } from '@/lib/utils/embedUtils';
import { toast } from 'sonner';

export function MediaRowView({ node, editor, getPos, deleteNode, selected }: NodeViewProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gap = node.attrs.gap || 8;
  const itemCount = node.content.childCount;

  // Add image from file
  const handleAddImage = () => {
    fileInputRef.current?.click();
    setShowAddMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }

    // Create blob URL for immediate display
    const blobUrl = URL.createObjectURL(file);
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store in IndexedDB for persistence
    const { imageStorage } = await import('@/lib/storage/imageStorage');
    await imageStorage.storeImage(imageId, file);

    // Insert as new mediaItem at end of row
    const pos = getPos();
    if (typeof pos !== 'number') return;

    const newItem = {
      type: 'mediaItem',
      attrs: { itemType: 'image', src: blobUrl, imageId },
    };

    // Insert at end of mediaRow content
    const insertPos = pos + node.nodeSize - 1;
    editor.chain()
      .focus()
      .insertContentAt(insertPos, newItem)
      .run();

    toast.success('Image added');
    e.target.value = '';
  };

  // Add link/embed from URL
  const handleAddUrl = () => {
    if (!urlValue.trim()) return;

    try {
      const url = new URL(urlValue.trim());
      const embedType = getEmbedType(url.href);

      const pos = getPos();
      if (typeof pos !== 'number') return;

      const newItem = {
        type: 'mediaItem',
        attrs: { 
          itemType: 'embed', 
          url: url.href, 
          embedType 
        },
      };

      const insertPos = pos + node.nodeSize - 1;
      editor.chain()
        .focus()
        .insertContentAt(insertPos, newItem)
        .run();

      setUrlValue('');
      setShowUrlInput(false);
      setShowAddMenu(false);
      toast.success('Link added');
    } catch {
      toast.error('Invalid URL');
    }
  };

  return (
    <NodeViewWrapper 
      className={`my-4 relative group ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Scoped styles for THIS media row */}
      <style>{`
        .media-row-grid {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          align-items: flex-start !important;
        }
        .media-row-grid > div {
          flex: 0 0 calc(30% - 8px) !important;
          max-width: calc(33.333% - 8px) !important;
          min-width: 150px !important;
        }
        .media-row-grid img {
          width: 100% !important;
          height: auto !important;
          border-radius: 8px;
        }
      `}</style>

      {/* Flex container for items - horizontal layout */}
      <div 
        data-media-row-content=""
        className="media-row-grid"
      >
        <NodeViewContent as="div" />

        {/* Add button */}
        <div className="relative flex-shrink-0" style={{ flex: '0 0 auto' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="h-full min-h-[60px] px-3 flex items-center justify-center bg-zinc-800/30 hover:bg-zinc-700/50 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-colors"
            contentEditable={false}
          >
            <Plus className="w-5 h-5 text-zinc-400" />
          </button>

          {/* Add menu dropdown */}
          {showAddMenu && (
            <div 
              className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
              contentEditable={false}
            >
              <button
                onClick={handleAddImage}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 text-left"
              >
                <Image className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Add Image</span>
              </button>
              <button
                onClick={() => { setShowUrlInput(true); setShowAddMenu(false); }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 text-left"
              >
                <Link className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Add Link / Embed</span>
              </button>
            </div>
          )}

          {/* URL input popover */}
          {showUrlInput && (
            <div 
              className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 p-3"
              contentEditable={false}
            >
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">Paste URL</span>
                <button 
                  onClick={() => setShowUrlInput(false)}
                  className="ml-auto p-0.5 hover:bg-zinc-800 rounded"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
              <input
                type="text"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder="https://..."
                className="w-full px-2 py-1.5 bg-zinc-800 border border-white/10 rounded text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddUrl}
                className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium text-white transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete entire row button */}
      {itemCount === 0 && (
        <button
          onClick={deleteNode}
          className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full shadow-md"
          contentEditable={false}
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </NodeViewWrapper>
  );
}
