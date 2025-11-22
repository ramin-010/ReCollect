import { useState, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { 
  Square, 
  Circle, 
  ArrowRight, 
  ImagePlus,
  Type,
  Sun,
  Moon
} from 'lucide-react';

// Simplified block structure for database storage
interface CanvasBlock {
  blockId: string;
  type: 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  text?: string;
  fontSize?: number;
  imageId?: string;
  fileId?: string;
  url?: string;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
}

interface MinimalExcalidrawCanvasProps {
  initialBlocks?: CanvasBlock[];
  onSave?: (blocks: CanvasBlock[], files: Record<string, any>) => void;
}

export default function MinimalExcalidrawCanvas({ 
  initialBlocks = [], 
  onSave 
}: MinimalExcalidrawCanvasProps) {
  const excalidrawRef = useRef<any>(null);
  const [selectedTool, setSelectedTool] = useState<string>('selection');
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSceneSnapshot = useRef<string>('');
  const [isReady, setIsReady] = useState(false);

  // Convert Excalidraw elements to simplified blocks
  const convertToBlocks = (elements: any[], files: any): CanvasBlock[] => {
    if (!elements || !Array.isArray(elements)) return [];
    
    return elements
      .filter(el => el && !el.isDeleted)
      .map(el => {
        const block: CanvasBlock = {
          blockId: el.id,
          type: el.type === 'ellipse' ? 'ellipse' : 
                el.type === 'arrow' ? 'arrow' :
                el.type === 'text' ? 'text' :
                el.type === 'image' ? 'image' : 'rectangle',
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          strokeColor: el.strokeColor,
          backgroundColor: el.backgroundColor,
          strokeWidth: el.strokeWidth,
        };

        if (el.type === 'text') {
          block.text = el.text;
          block.content = el.text;
          block.fontSize = el.fontSize;
        }

        if (el.type === 'image' && el.fileId) {
          block.fileId = el.fileId;
          if (files && files[el.fileId]) {
            block.imageId = el.fileId;
            block.url = files[el.fileId].dataURL;
          }
        }

        return block;
      });
  };

  // Handle canvas changes with auto-save
  const handleChange = (elements: any, appState: any, files: any) => {
    if (!isReady) return;
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      const blocks = convertToBlocks(elements, files);
      const snapshot = JSON.stringify({ elements, appState });
      if (snapshot === lastSceneSnapshot.current) {
        return;
      }
      lastSceneSnapshot.current = snapshot;
      setCanvasBlocks(blocks);
      
      if (onSave) {
        const filesData = files ? Object.entries(files).reduce((acc, [id, file]: [string, any]) => {
          acc[id] = {
            mimeType: file.mimeType,
            dataURL: file.dataURL,
            created: file.created
          };
          return acc;
        }, {} as Record<string, any>) : {};
        
        onSave(blocks, filesData);
      }
      
      console.log('📦 Canvas saved:', blocks.length, 'elements');
    }, 1000);
  };

  // Handle tool selection
  const selectTool = (tool: string) => {
    setSelectedTool(tool);
    const api = excalidrawRef.current;
    if (!api) return;

    try {
      switch (tool) {
        case 'rectangle':
          api.setActiveTool({ type: 'rectangle' });
          break;
        case 'ellipse':
          api.setActiveTool({ type: 'ellipse' });
          break;
        case 'arrow':
          api.setActiveTool({ type: 'arrow' });
          break;
        case 'text':
          api.setActiveTool({ type: 'text' });
          break;
        case 'selection':
          api.setActiveTool({ type: 'selection' });
          break;
      }
    } catch (error) {
      console.log('Tool selection error:', error);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const api = excalidrawRef.current;
    if (!api || !isReady) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target?.result as string;
      const fileId = `image-${Date.now()}`;
      
      try {
        // First, add the file to Excalidraw's file storage
        api.addFiles([{
          id: fileId,
          dataURL,
          mimeType: file.type,
          created: Date.now(),
        }]);

        // Then, create the image element on canvas
        const img = new Image();
        img.onload = () => {
          const currentElements = api.getSceneElements() || [];
          const appState = api.getAppState() || {};
          
          const newImageElement = {
            type: 'image',
            id: `el-${Date.now()}`,
            fileId: fileId,
            x: (appState.scrollX || 0) + 100,
            y: (appState.scrollY || 0) + 100,
            width: Math.min(img.width, 400),
            height: Math.min(img.height, 400),
            angle: 0,
            strokeColor: 'transparent',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
          };

          api.updateScene({
            elements: [...currentElements, newImageElement],
          });
        };
        img.src = dataURL;
      } catch (error) {
        console.error('Image upload error:', error);
      }
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !isReady) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file && excalidrawRef.current) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataURL = event.target?.result as string;
              try {
                excalidrawRef.current?.addFiles([{
                  id: `image-${Date.now()}`,
                  dataURL,
                  mimeType: file.type,
                  created: Date.now(),
                }]);
              } catch (error) {
                console.error('Paste image error:', error);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    if (isReady) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isReady]);

  // Toggle background color
  const toggleBackground = () => {
    if (!isReady || !excalidrawRef.current) return;

    const newIsDark = !isDarkMode;
    const newBg = newIsDark ? '#1a1a1a' : '#ffffff';
    const newStroke = newIsDark ? '#ffffff' : '#000000';
    
    setIsDarkMode(newIsDark);
    
    try {
      excalidrawRef.current.updateScene({
        appState: {
          viewBackgroundColor: newBg,
          currentItemStrokeColor: newStroke,
        }
      });
    } catch (error) {
      console.log('Background toggle error:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      {/* Sticky Custom Toolbar */}
      <div className="sticky top-0 z-50 flex items-center gap-1 px-4 py-2 bg-[#2a2a2a] border-b border-white/10">
        <ToolButton
          icon={<Square className="w-4 h-4" />}
          label="Rectangle"
          isActive={selectedTool === 'rectangle'}
          onClick={() => selectTool('rectangle')}
        />
        <ToolButton
          icon={<Circle className="w-4 h-4" />}
          label="Circle"
          isActive={selectedTool === 'ellipse'}
          onClick={() => selectTool('ellipse')}
        />
        <ToolButton
          icon={<ArrowRight className="w-4 h-4" />}
          label="Arrow"
          isActive={selectedTool === 'arrow'}
          onClick={() => selectTool('arrow')}
        />
        <ToolButton
          icon={<Type className="w-4 h-4" />}
          label="Text"
          isActive={selectedTool === 'text'}
          onClick={() => selectTool('text')}
        />
        
        <div className="w-px h-6 bg-white/10 mx-2" />
        
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
            <ImagePlus className="w-4 h-4" />
            <span className="text-sm">Image</span>
          </div>
        </label>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button
          onClick={toggleBackground}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>

        <div className="ml-auto text-sm text-gray-400">
          {canvasBlocks.length} elements
        </div>
      </div>

      {/* Canvas Area with Fixed Dimensions */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0" style={{ maxWidth: '100%', maxHeight: '600px', margin: '0 auto' }}>
          <Excalidraw
            excalidrawAPI={(api) => {
              excalidrawRef.current = api;
              // Delay initialization to ensure component is fully mounted
              setTimeout(() => {
                if (excalidrawRef.current) {
                  setIsReady(true);
                }
              }, 500);
            }}
            onChange={handleChange}
            initialData={{
              appState: {
                viewBackgroundColor: '#1a1a1a',
                currentItemStrokeColor: '#ffffff',
                currentItemBackgroundColor: 'transparent',
                currentItemFillStyle: 'solid',
                currentItemStrokeWidth: 2,
                currentItemRoughness: 0,
                currentItemOpacity: 100,
                currentItemFontFamily: 1,
              },
            }}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: false,
                saveAsImage: false,
                clearCanvas: false,
                changeViewBackgroundColor: false,
              },
              tools: {
                image: false,
              },
            }}
          />
        </div>
        
        {/* CSS Fixes */}
        <style>{`
          /* Hide default Excalidraw UI */
          .excalidraw .App-menu,
          .excalidraw .layer-ui__wrapper__top-right,
          .excalidraw .layer-ui__wrapper__footer-center,
          .excalidraw .layer-ui__wrapper__footer-right,
          .excalidraw .layer-ui__wrapper__left {
            display: none !important;
          }

          /* Fix text editor z-index */
          .excalidraw .excalidraw-textEditorContainer {
            z-index: 1000 !important;
          }

          /* Canvas constraining */
          .excalidraw-wrapper {
            max-width: 100%;
            max-height: 600px;
          }

          /* Custom font */
          .excalidraw {
            --font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          }
        `}</style>
      </div>
    </div>
  );
}

// Tool Button Component
function ToolButton({ 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-transparent'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}