// ReCollect - Create Dashboard Dialog with Custom Components
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui-base/Modal';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { dashboardApi } from '@/lib/api/dashboard';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { toast } from 'sonner';
import { LayoutDashboard, Sparkles, FolderKanban, Layers, Check, ArrowRight, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      id: 'custom',
      name: 'Empty Canvas',
      icon: Layers,
      description: 'Start with a clean slate',
      color: 'text-gray-500',
      bg: 'bg-gray-500/10',
      gradient: 'from-gray-500/20 to-gray-500/5'
    },
    {
      id: 'personal',
      name: 'Personal Notes',
      icon: LayoutDashboard,
      description: 'Journaling & ideas',
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      gradient: 'from-brand-primary/20 to-brand-primary/5'
    },
    {
      id: 'work',
      name: 'Work Projects',
      icon: FolderKanban,
      description: 'Task tracking & docs',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      gradient: 'from-blue-500/20 to-blue-500/5'
    },
    {
      id: 'learning',
      name: 'Learning Hub',
      icon: Sparkles,
      description: 'Study guides & resources',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      gradient: 'from-purple-500/20 to-purple-500/5'
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
    } else {
        setName('');
        setDescription('');
    }
  };

  return (
    <>
      {/* Backdrop with blur effect */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm transition-opacity duration-300" />
      )}
      
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        showCloseButton={false}
        size="xl"
        className="relative z-50 overflow-hidden max-w-3xl p-0 bg-transparent shadow-2xl"
      >
        <div className="flex flex-col md:flex-row h-[500px] bg-[hsl(var(--card))] rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
            {/* Left Sidebar - Templates */}
            <div className="w-full md:w-[260px] bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] p-4 flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-2 px-2 mb-4 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--brand-primary))]/10 flex items-center justify-center text-[hsl(var(--brand-primary))]">
                        <Palette className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm tracking-tight text-[hsl(var(--foreground))]">
                        Templates
                    </span>
                </div>
                
                <div className="flex-1 flex flex-col gap-1.5">
                    {templates.map((template) => {
                        const isSelected = selectedTemplate === template.id;
                        return (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template.id)}
                                className={cn(
                                    "relative flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-200 group w-full",
                                    isSelected 
                                        ? "bg-[hsl(var(--card))] shadow-sm ring-1 ring-[hsl(var(--border))]" 
                                        : "hover:bg-[hsl(var(--sidebar-hover))]"
                                )}
                            >
                                {isSelected && (
                                    <div className={cn("absolute inset-0 rounded-lg opacity-[0.08] bg-gradient-to-br", template.gradient)} />
                                )}
                                
                                <div className={cn(
                                    "p-1.5 rounded-md shrink-0 transition-colors",
                                    isSelected ? template.bg + ' ' + template.color : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                                )}>
                                    <template.icon className="w-4 h-4" />
                                </div>
                                
                                <div className="flex-1 min-w-0 z-10">
                                    <span className={cn(
                                        "text-sm font-medium block truncate",
                                        isSelected ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                                    )}>
                                        {template.name}
                                    </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[hsl(var(--brand-primary))]" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Content - Form */}
            <div className="flex-1 flex flex-col relative bg-[hsl(var(--card))]">
                 {/* Background Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Custom Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]/40 relative z-20">
                    <div>
                        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Create Dashboard</h2>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Configure your new workspace</p>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 p-8 flex flex-col justify-center relative z-10">
                    <div className="max-w-md mx-auto w-full space-y-6">
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5 block ml-1">
                                    Name
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g., Project Alpha"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    inputSize="md"
                                    required
                                    maxLength={50}
                                    className="bg-[hsl(var(--surface-light))] border-[hsl(var(--border))] focus:border-[hsl(var(--brand-primary))] focus:ring-[hsl(var(--brand-primary))]/20"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5 block ml-1">
                                    Description <span className="font-normal opacity-50 lowercase">(optional)</span>
                                </label>
                                <textarea
                                    placeholder="What's this dashboard for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    maxLength={200}
                                    className="w-full px-3 py-2 text-sm bg-[hsl(var(--surface-light))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 focus:border-[hsl(var(--brand-primary))] transition-all resize-none placeholder:text-[hsl(var(--muted-foreground))]/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[hsl(var(--border))]/40 bg-[hsl(var(--card))] flex justify-end gap-3 relative z-20">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isLoading}
                        size="sm"
                        className="hover:bg-[hsl(var(--muted))]"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        disabled={!name.trim()}
                        size="sm"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white shadow-md shadow-[hsl(var(--brand-primary))]/20 px-6"
                    >
                        Create Dashboard
                    </Button>
                </div>
            </div>
        </div>
      </Modal>
    </>
  );
}



