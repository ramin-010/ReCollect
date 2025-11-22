// ReCollect - Excalidraw Dashboard Integration
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Modal, ModalBody, ModalFooter } from '@/components/ui-base/Modal';
import { 
  PenTool, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Plus,
  FileImage,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

interface Drawing {
  id: string;
  name: string;
  data: any;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExcalidrawDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcalidrawDashboard({ isOpen, onClose }: ExcalidrawDashboardProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved drawings on mount
  useEffect(() => {
    loadDrawings();
  }, []);

  const loadDrawings = async () => {
    try {
      // Load from localStorage for now (can be replaced with API)
      const saved = localStorage.getItem('recollect-drawings');
      if (saved) {
        setDrawings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }
  };

  const saveDrawings = (updatedDrawings: Drawing[]) => {
    try {
      localStorage.setItem('recollect-drawings', JSON.stringify(updatedDrawings));
      setDrawings(updatedDrawings);
    } catch (error) {
      console.error('Failed to save drawings:', error);
      toast.error('Failed to save drawings');
    }
  };

  const createNewDrawing = () => {
    const newDrawing: Drawing = {
      id: Date.now().toString(),
      name: `Drawing ${drawings.length + 1}`,
      data: {
        elements: [],
        appState: {
          viewBackgroundColor: '#ffffff'
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentDrawing(newDrawing);
    setShowEditor(true);
  };

  const openDrawing = (drawing: Drawing) => {
    setCurrentDrawing(drawing);
    setShowEditor(true);
  };

  const saveCurrentDrawing = async () => {
    if (!currentDrawing || !excalidrawAPI) return;

    setIsLoading(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      
      // Generate thumbnail
      const canvas = await excalidrawAPI.exportToCanvas({
        elements,
        appState,
        files: excalidrawAPI.getFiles(),
        getDimensions: () => ({ width: 300, height: 200 })
      });
      
      const thumbnail = canvas.toDataURL('image/png');
      
      const updatedDrawing = {
        ...currentDrawing,
        data: { elements, appState },
        thumbnail,
        updatedAt: new Date().toISOString()
      };

      const existingIndex = drawings.findIndex(d => d.id === currentDrawing.id);
      let updatedDrawings;
      
      if (existingIndex >= 0) {
        updatedDrawings = [...drawings];
        updatedDrawings[existingIndex] = updatedDrawing;
      } else {
        updatedDrawings = [...drawings, updatedDrawing];
      }

      saveDrawings(updatedDrawings);
      setCurrentDrawing(updatedDrawing);
      toast.success('Drawing saved successfully!');
    } catch (error) {
      console.error('Failed to save drawing:', error);
      toast.error('Failed to save drawing');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDrawing = (drawingId: string) => {
    const updatedDrawings = drawings.filter(d => d.id !== drawingId);
    saveDrawings(updatedDrawings);
    toast.success('Drawing deleted');
  };

  const exportDrawing = async () => {
    if (!excalidrawAPI) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      
      const canvas = await excalidrawAPI.exportToCanvas({
        elements,
        appState,
        files: excalidrawAPI.getFiles()
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${currentDrawing?.name || 'drawing'}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success('Drawing exported successfully!');
    } catch (error) {
      console.error('Failed to export drawing:', error);
      toast.error('Failed to export drawing');
    }
  };

  const closeEditor = () => {
    setShowEditor(false);
    setCurrentDrawing(null);
    setExcalidrawAPI(null);
  };

  if (showEditor) {
    return (
      <Modal
        isOpen={showEditor}
        onClose={closeEditor}
        title={currentDrawing?.name || 'New Drawing'}
        size="full"
      >
        <ModalBody className="p-0 h-[80vh]">
          <div className="h-full relative">
            <Excalidraw
              initialData={currentDrawing?.data}
              onChange={(elements, appState, files) => {
                // Store the API reference from onChange
                if (!excalidrawAPI) {
                  const api = {
                    getSceneElements: () => elements,
                    getAppState: () => appState,
                    getFiles: () => files,
                    exportToCanvas: async (opts: any) => {
                      // Simplified export - you may need to adjust this
                      const canvas = document.createElement('canvas');
                      return canvas;
                    }
                  };
                  setExcalidrawAPI(api);
                }
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  export: false,
                  saveAsImage: false
                }
              }}
            />
          </div>
        </ModalBody>
        
        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportDrawing}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export PNG
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={closeEditor}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={saveCurrentDrawing}
                isLoading={isLoading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Drawing
              </Button>
            </div>
          </div>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Drawing Dashboard"
      description="Create and manage your drawings with Excalidraw"
      size="lg"
    >
      <ModalBody>
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-brand-primary" />
            <span className="font-medium">Your Drawings</span>
          </div>
          
          <Button
            variant="primary"
            onClick={createNewDrawing}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Drawing
          </Button>
        </div>

        {/* Drawings Grid */}
        {drawings.length === 0 ? (
          <Card variant="outlined" padding="lg" className="text-center border-dashed">
            <div className="py-8">
              <Palette className="w-16 h-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No drawings yet</h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                Create your first drawing to get started with visual note-taking
              </p>
              <Button
                variant="primary"
                onClick={createNewDrawing}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create First Drawing
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drawings.map((drawing) => (
              <Card
                key={drawing.id}
                variant="interactive"
                padding="sm"
                className="cursor-pointer group"
                onClick={() => openDrawing(drawing)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-[hsl(var(--surface-light))] rounded-lg mb-3 overflow-hidden">
                  {drawing.thumbnail ? (
                    <img
                      src={drawing.thumbnail}
                      alt={drawing.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                </div>

                {/* Drawing Info */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm truncate">{drawing.name}</h4>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(drawing.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDrawing(drawing.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
