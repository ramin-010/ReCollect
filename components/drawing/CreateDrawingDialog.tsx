'use client';

import { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui-base/Modal';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { PenTool, AlertCircle } from 'lucide-react';

interface CreateDrawingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  existingNames: string[];
  initialName?: string;
  mode?: 'create' | 'rename';
}

export function CreateDrawingDialog({
  isOpen,
  onClose,
  onConfirm,
  existingNames,
  initialName = '',
  mode = 'create'
}: CreateDrawingDialogProps) {
  const [drawingName, setDrawingName] = useState(initialName);
  const [error, setError] = useState('');

  const validateName = (name: string): boolean => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Drawing name is required');
      return false;
    }
    
    if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less');
      return false;
    }
    
    if (existingNames.some(existing => existing.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A drawing with this name already exists');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDrawingName(value);
    if (error) {
      validateName(value);
    }
  };

  const handleConfirm = () => {
    if (validateName(drawingName)) {
      onConfirm(drawingName.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setDrawingName(initialName);
    setError('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Reset state when dialog opens/closes or initialName changes
  if (isOpen && drawingName !== initialName && !error && mode === 'rename' && drawingName === '') {
     setDrawingName(initialName);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? "Create New Drawing" : "Rename Drawing"}
      description={mode === 'create' ? "Give your drawing board a unique name" : "Enter a new name for your drawing"}
      size="lg"
    >
      <ModalBody>
        <div className="space-y-5">
          {/* Enhanced Info Card with Gradient */}
          <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--brand-primary))]/20 bg-gradient-to-br from-[hsl(var(--brand-primary))]/5 via-[hsl(var(--brand-primary))]/3 to-transparent">
            {/* Subtle pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
            
            <div className="relative flex items-start gap-4 p-4">
              {/* Icon with gradient background */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-primary))]/20 to-[hsl(var(--brand-primary))]/5 rounded-xl blur-md" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--brand-primary))]/10 to-[hsl(var(--brand-primary))]/5 flex items-center justify-center border border-[hsl(var(--brand-primary))]/20">
                  <PenTool className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
                  Visual Note-Taking
                </h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Create diagrams, sketches, flowcharts, and visual notes with our powerful drawing tools
                </p>
              </div>
            </div>
          </div>

          {/* Input Field */}
          <div className="space-y-2">
            <Input
              label="Drawing Name"
              value={drawingName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Project Wireframe, Mind Map, Flowchart"
              error={error}
              autoFocus
              leftIcon={<PenTool className="h-4 w-4" />}
              className="bg-[hsl(var(--surface-light))]"
            />
            
            {/* Character count */}
            <div className="flex justify-end">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {drawingName.length}/50 characters
              </span>
            </div>
          </div>

          {/* Success Preview Message */}
          {drawingName.trim() && !error && (
            <div className="relative overflow-hidden rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent">
              <div className="flex items-start gap-3 p-3.5">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100 mb-0.5">
                    Ready to create
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/90">
                    Your drawing will be saved as <span className="font-semibold">"{drawingName.trim()}"</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="ghost"
          onClick={handleClose}
          className="hover:bg-[hsl(var(--muted))]"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!drawingName.trim() || !!error || (mode === 'rename' && drawingName.trim() === initialName)}
          leftIcon={<PenTool className="w-4 w-4" />}
          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 shadow-md shadow-[hsl(var(--brand-primary))]/20"
        >
          {mode === 'create' ? "Create Drawing" : "Rename Drawing"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
