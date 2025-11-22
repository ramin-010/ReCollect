// ReCollect - Create Dashboard Dialog with Custom Components
'use client';

import { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui-base/Modal';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Card } from '@/components/ui-base/Card';
import { dashboardApi } from '@/lib/api/dashboard';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { toast } from 'sonner';
import { LayoutDashboard, Sparkles, FolderKanban, Layers } from 'lucide-react';

interface CreateDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDashboardDialog({ isOpen, onClose }: CreateDashboardDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addDashboard = useDashboardStore((state) => state.addDashboard);

  const templates = [
    {
      id: 'personal',
      name: 'Personal Notes',
      icon: LayoutDashboard,
      description: 'For personal thoughts and ideas',
      color: 'text-brand-primary'
    },
    {
      id: 'work',
      name: 'Work Projects',
      icon: FolderKanban,
      description: 'Organize work-related content',
      color: 'text-blue-500'
    },
    {
      id: 'learning',
      name: 'Learning',
      icon: Sparkles,
      description: 'Study notes and resources',
      color: 'text-purple-500'
    },
    {
      id: 'custom',
      name: 'Custom',
      icon: Layers,
      description: 'Start from scratch',
      color: 'text-green-500'
    }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a dashboard name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await dashboardApi.create({
        name: name.trim(),
        description: description.trim() || undefined
      });

      if (response.success && response.data) {
        addDashboard(response.data);
        toast.success('Dashboard created successfully!');
        handleClose();
      }
    } catch (error: any) {
      console.error('Failed to create dashboard:', error);
      toast.error(error.response?.data?.message || 'Failed to create dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedTemplate('custom');
    onClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      setName(template.name);
      setDescription(template.description);
    }
  };

  return (
    <>
      {/* Backdrop with blur effect */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 dialog-backdrop" />
      )}
      
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create New Dashboard"
        description="Organize your notes and ideas in a dedicated space"
        size="md"
        className="relative z-50"
      >
        <ModalBody className="space-y-6 p-6">
        {/* Template Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Choose a Template</label>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                variant={selectedTemplate === template.id ? "elevated" : "outlined"}
                padding="sm"
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'ring-2 ring-brand-primary border-brand-primary'
                    : 'hover:border-brand-primary/50'
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="text-center">
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${
                    selectedTemplate === template.id
                      ? 'bg-brand-primary text-white'
                      : 'bg-surface-light ' + template.color
                  }`}>
                    <template.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{template.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Dashboard Name */}
        <div>
          <Input
            type="text"
            label="Dashboard Name"
            placeholder="e.g., Project Ideas, Study Notes..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<LayoutDashboard className="w-5 h-5" />}
            inputSize="lg"
            required
            maxLength={50}
          />
          {name.length > 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {name.length}/50 characters
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Description <span className="text-[hsl(var(--muted-foreground))] font-normal">(Optional)</span>
          </label>
          <textarea
            placeholder="What will you use this dashboard for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--surface-light))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))] focus:border-transparent resize-none"
          />
          {description.length > 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {description.length}/200 characters
            </p>
          )}
        </div>

        {/* Preview */}
        {name && (
          <Card variant="outlined" padding="md" className="bg-[hsl(var(--surface-light))]/50 border-[hsl(var(--border))]/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-[hsl(var(--brand-primary))] rounded-full animate-pulse" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-[hsl(var(--foreground))]">{name}</h4>
              {description && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{description}</p>
              )}
            </div>
          </Card>
        )}
      </ModalBody>

      <ModalFooter className="relative bg-[hsl(var(--card))] backdrop-blur-sm border-t border-[hsl(var(--border))]">
        <Button
          variant="ghost"
          onClick={handleClose}
          disabled={isLoading}
          className="hover:bg-[hsl(var(--sidebar-hover))]"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!name.trim()}
          leftIcon={<LayoutDashboard className="w-4 h-4" />}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg"
        >
          Create Dashboard
        </Button>
      </ModalFooter>
    </Modal>
    </>
  );
}
