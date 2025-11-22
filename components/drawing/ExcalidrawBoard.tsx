// ReCollect - Excalidraw Drawing Board Integration
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Modal, ModalBody, ModalFooter } from '@/components/ui-base/Modal';
import { 
  Save, 
  Download, 
  Upload, 
  Share2, 
  Palette,
  RotateCcw,
  Grid,
  MousePointer
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const module = await import('@excalidraw/excalidraw');
    return module.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    ),
  }
);

interface ExcalidrawBoardProps {
  dashboardId?: string;
  drawingId?: string;
  initialData?: any;
  onSave?: (data: any) => void;
  onShare?: (data: any) => void;
}

export const ExcalidrawBoard: React.FC<ExcalidrawBoardProps> = ({
  dashboardId,
  drawingId,
  initialData,
  onSave,
  onShare
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [gridMode, setGridMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!excalidrawAPI || !isAutoSaveEnabled) return;

    const saveInterval = setInterval(() => {
      handleSave();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [excalidrawAPI, isAutoSaveEnabled]);

  // Load initial data
  useEffect(() => {
    if (excalidrawAPI && initialData) {
      excalidrawAPI.updateScene(initialData);
    }
  }, [excalidrawAPI, initialData]);

  // Save drawing
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      
      const drawingData = {
        elements,
        appState,
        files,
        version: 2,
        source: 'recollect',
        timestamp: new Date().toISOString()
      };

      if (onSave) {
        await onSave(drawingData);
        setLastSaved(new Date());
        toast.success('Drawing saved successfully');
      }
    } catch (error) {
      console.error('Failed to save drawing:', error);
      toast.error('Failed to save drawing');
    }
  }, [excalidrawAPI, onSave]);

  // Export drawing
  const handleExport = async (format: 'png' | 'svg' | 'json') => {
    if (!excalidrawAPI) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      
      if (format === 'json') {
        const data = {
          elements,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        downloadFile(blob, `drawing-${Date.now()}.excalidraw`);
      } else {
        const blob = await excalidrawAPI.exportToBlob({
          elements,
          mimeType: format === 'png' ? 'image/png' : 'image/svg+xml'
        });
        downloadFile(blob, `drawing-${Date.now()}.${format}`);
      }
      
      setShowExportModal(false);
      toast.success(`Drawing exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export drawing:', error);
      toast.error('Failed to export drawing');
    }
  };

  // Download file helper
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import drawing
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.excalidraw,.json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (excalidrawAPI) {
          excalidrawAPI.updateScene(data);
          toast.success('Drawing imported successfully');
        }
      } catch (error) {
        console.error('Failed to import drawing:', error);
        toast.error('Failed to import drawing');
      }
    };
    
    input.click();
  };

  // Clear canvas
  const handleClear = () => {
    if (!excalidrawAPI) return;
    
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      excalidrawAPI.resetScene();
      toast.info('Canvas cleared');
    }
  };

  // Share drawing
  const handleShare = async () => {
    if (!excalidrawAPI || !onShare) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      const blob = await excalidrawAPI.exportToBlob({
        elements,
        mimeType: 'image/png'
      });

      await onShare({ blob, elements });
      toast.success('Drawing shared successfully');
    } catch (error) {
      console.error('Failed to share drawing:', error);
      toast.error('Failed to share drawing');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Card variant="elevated" padding="sm" className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import
            </Button>

            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              leftIcon={<Palette className="w-4 h-4" />}
            >
              {theme === 'light' ? 'Dark' : 'Light'} Mode
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGridMode(!gridMode)}
              leftIcon={<Grid className="w-4 h-4" />}
            >
              {gridMode ? 'Hide' : 'Show'} Grid
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Clear
            </Button>

            {lastSaved && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Excalidraw Canvas */}
      <Card variant="elevated" padding="none" className="flex-1 overflow-hidden">
        <div className="w-full h-full min-h-[600px]">
          <Excalidraw
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            theme={theme}
            gridModeEnabled={gridMode}
            viewModeEnabled={false}
            zenModeEnabled={false}
            isCollaborating={false}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false,
                toggleTheme: false,
              },
            }}
          />
        </div>
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Drawing"
        description="Choose your preferred export format"
        size="sm"
      >
        <ModalBody>
          <div className="space-y-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleExport('png')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export as PNG
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleExport('svg')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export as SVG
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleExport('json')}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export as Excalidraw File
            </Button>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
