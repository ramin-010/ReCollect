import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui-base/Popover';
import { Button } from '@/components/ui-base/Button';
import { Share2, Users, Download, Code, Loader2, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { cn } from '@/lib/utils';
import { SlideDeck } from './useSlidePersistence';

interface SlideSharePopoverProps {
  deck: SlideDeck;
}

type TabType = 'collaborate' | 'share' | 'export' | 'embed';

export function SlideSharePopover({ deck }: SlideSharePopoverProps) {
  const [activeTab, setActiveTab] = useState<TabType>('share');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    try {
      const serverId = deck.serverId || deck.id;
      if (!serverId || serverId.startsWith('local-')) {
        toast.error('Please save the deck to the cloud first before sharing.');
        return;
      }
      setIsGenerating(true);
      
      const response = await axiosInstance.post('/api/create-slide-link', {
        type: 'slide',
        slideId: serverId,
        role: 'viewer'
      });
      
      if (response.data.success && response.data.data.url) {
        setGeneratedUrl(response.data.data.url);
        await navigator.clipboard.writeText(response.data.data.url);
        toast.success('Share link generated and copied to clipboard!');
      } else {
        toast.error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const tabs = [
     { id: 'share', label: 'Share', icon: Share2 },
    { id: 'collaborate', label: 'Collaborate', icon: Users },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'embed', label: 'Embed', icon: Code },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Share2 className="h-3.5 w-3.5" />}
          className="h-8 px-3 text-xs font-medium hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
        >
          Share
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        className="w-[450px] p-0 overflow-hidden rounded-xl border-[hsl(var(--border))]/50 shadow-xl"
      >
        {/* Header & Tabs */}
        <div className="bg-[hsl(var(--card-bg))] border-b border-[hsl(var(--border))]/40">
          <div className="flex items-center justify-between px-4 py-3 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              Share "{deck.name || 'Untitled Deck'}"
            </h3>
            <PopoverClose className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors rounded-full p-1 hover:bg-[hsl(var(--muted))]">
              <X className="w-4 h-4" />
            </PopoverClose>
          </div>
          
          {/* Custom Tabs */}
          <div className="flex px-2 pt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-all duration-200",
                    isActive 
                      ? "border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/5" 
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 bg-[hsl(var(--background))] min-h-[160px]">
          
          {activeTab === 'share' && (
            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                Generate a public, read-only link to share your presentation with anyone. Unauthenticated users can view this link.
              </p>
              
              {!generatedUrl ? (
                <Button 
                  onClick={handleGenerateLink} 
                  disabled={isGenerating}
                  className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Generate Public Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 max-w-full">
                    <div className="flex-1 px-3 py-2 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-md text-sm truncate font-mono text-[hsl(var(--foreground))]">
                      {generatedUrl}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleCopyLink}
                      className="shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setGeneratedUrl(null)}
                    className="text-xs text-[hsl(var(--muted-foreground))]"
                  >
                    Reset & Generate New
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'collaborate' && (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[120px] animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-[hsl(var(--muted))]/50 rounded-full flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h4 className="font-medium text-sm text-[hsl(var(--foreground))]">Real-time Collaboration</h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-[250px]">
                Invite team members to co-edit or present this slide deck with you.
              </p>
              <div className="mt-4 px-3 py-1 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] text-xs font-semibold rounded-full border border-[hsl(var(--brand-primary))]/20">
                Coming Soon
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[120px] animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-[hsl(var(--muted))]/50 rounded-full flex items-center justify-center mb-3">
                <Download className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h4 className="font-medium text-sm text-[hsl(var(--foreground))]">Advanced Export</h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-[250px]">
                Export your presentation as PDF, PowerPoint (PPTX), or high-res images.
              </p>
              <div className="mt-4 px-3 py-1 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] text-xs font-semibold rounded-full border border-[hsl(var(--brand-primary))]/20">
                Coming Soon
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[120px] animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-[hsl(var(--muted))]/50 rounded-full flex items-center justify-center mb-3">
                <Code className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h4 className="font-medium text-sm text-[hsl(var(--foreground))]">Embed on Web</h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-[250px]">
                Generate an iframe code to embed this interactive presentation on your blog or website.
              </p>
              <div className="mt-4 px-3 py-1 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] text-xs font-semibold rounded-full border border-[hsl(var(--brand-primary))]/20">
                Coming Soon
              </div>
            </div>
          )}

        </div>
      </PopoverContent>
    </Popover>
  );
}
