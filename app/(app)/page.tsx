// app/(app)/page.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useCreateNote } from '@/lib/context/CreateNoteContext';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { ContentCard } from '@/components/content/ContentCard';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import { Plus, FileText, Sparkles, PenTool } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { CreateDashboardDialog } from '@/components/dashboard/CreateDashboardDialog';
import { CreateContentDialog } from '@/components/content/CreateContentDialog';
import { AlertDialog } from '@/components/ui-base/Dialog';

export default function HomePage() {
  const dashboards = useDashboardStore((state) => state.dashboards);
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const { triggerCreateNote, requestSignal, requestedDashboardId } = useCreateNote();
  const [isCreateDashboardOpen, setIsCreateDashboardOpen] = useState(false);
  
  const [inlineDialogStateByDash, setInlineDialogStateByDash] = useState<{
    [dashId: string]: boolean;
  }>({});
  
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Get current inline dialog state based on dashboard
  const showInlineCreate = currentDashboard 
    ? inlineDialogStateByDash[currentDashboard._id] || false 
    : false;

  const inlineStateRef = useRef(showInlineCreate);
  const lastHandledSignalRef = useRef(0);
  useEffect(() => {
    inlineStateRef.current = showInlineCreate;
  }, [showInlineCreate]);

  
  // When dashboard changes, reset unsaved warning
  useEffect(() => {
    setShowUnsavedWarning(false);
  }, [currentDashboard?._id]);

  const setShowInlineCreate = (value: boolean) => {
    if (!currentDashboard) return;
    setInlineDialogStateByDash((prev) => ({
      ...prev,
      [currentDashboard._id]: value,
    }));
  };
  
   useEffect(() => {
    setShowUnsavedWarning(false);
    
    // Close create form if switching to a dashboard that already has content
    if (currentDashboard && currentDashboard.contents.length > 0) {
      setShowInlineCreate(false);
    }
  }, [currentDashboard?._id]);

  useEffect(() => {
    if (requestSignal === 0 || requestSignal <= lastHandledSignalRef.current) return;
    if (!currentDashboard || requestedDashboardId !== currentDashboard._id) return;
    if (inlineStateRef.current) {
      setShowUnsavedWarning(true);
    } else {
      setShowInlineCreate(true);
    }
    lastHandledSignalRef.current = requestSignal;
  }, [requestSignal, requestedDashboardId, currentDashboard?._id]);

  const handleConfirmNew = () => {
    setShowUnsavedWarning(false);
    setShowInlineCreate(false);
    // Open new inline dialog after brief delay
    setTimeout(() => {
      setShowInlineCreate(true);
    }, 100);
  };

  const handleCancelNew = () => {
    setShowUnsavedWarning(false);
  };

  // All Dashboards View
  if (!currentDashboard) {
    return (
      <div className="p-4 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h2 className="text-3xl font-bold">Your Dashboards</h2>
              <p className="text-[hsl(var(--muted-foreground))] mt-2">
                Organize your notes and ideas in dedicated spaces
              </p>
            </div>
            <Button 
              variant="primary"
              onClick={() => setIsCreateDashboardOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              New Dashboard
            </Button>
          </motion.div>

          {dashboards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card variant="elevated" padding="lg" className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
                <h3 className="text-lg font-semibold mb-2">No dashboards yet</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
                  Create your first dashboard to start organizing your notes and ideas
                </p>
                <Button 
                  variant="primary"
                  onClick={() => setIsCreateDashboardOpen(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Dashboard
                </Button>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboards.map((dashboard, index) => (
                <motion.div
                  key={dashboard._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <DashboardCard dashboard={dashboard} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        <CreateDashboardDialog 
          isOpen={isCreateDashboardOpen} 
          onClose={() => setIsCreateDashboardOpen(false)} 
        />
      </div>
    );
  }

  // Single Dashboard View
  const pinnedContents = currentDashboard.contents.filter(c => c.isPinned);
  const regularContents = currentDashboard.contents.filter(c => !c.isPinned && !c.isArchived);
  const hasContent = currentDashboard.contents.length > 0;

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {showInlineCreate  ? (
            // Create Note Form (animated)
            <motion.div
              key="create-form"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1] 
              }}
            >
              <CreateContentDialog
                isOpen={true}
                onClose={() => setShowInlineCreate(false)}
                dashboardId={currentDashboard._id}
                inline={true}
              />
            </motion.div>
          ) : !hasContent ? (
            // Empty State (no content)
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="elevated" padding="lg" className="text-center">
                <PenTool className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
                <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
                  Start capturing your ideas and thoughts in this dashboard
                </p>
                <Button 
                  variant="primary"
                  onClick={() => triggerCreateNote(currentDashboard._id)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Note
                </Button>
              </Card>
            </motion.div>
          ) : (
            // Content Grid (has content)
            <motion.div
              key="content-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              {/* Pinned Section */}
              {pinnedContents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <h2 className="text-xl font-semibold">Pinned</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pinnedContents.map((content, index) => (
                      <motion.div
                        key={content._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <ContentCard
                          content={content}
                          dashboardId={currentDashboard._id}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Regular Content Section */}
              {regularContents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: pinnedContents.length > 0 ? 0.2 : 0 
                  }}
                >
                  {pinnedContents.length > 0 && (
                    <h2 className="text-xl font-semibold mb-4">All Notes</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularContents.map((content, index) => (
                      <motion.div
                        key={content._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <ContentCard
                          content={content}
                          dashboardId={currentDashboard._id}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unsaved Warning Dialog */}
      <AlertDialog
        open={showUnsavedWarning}
        onOpenChange={setShowUnsavedWarning}
        title="Unsaved Note"
        description="You have an unsaved note in progress. Are you sure you want to discard it and create a new one?"
        confirmText="Discard & Create New"
        cancelText="Keep Editing"
        onConfirm={handleConfirmNew}
        variant="default"
      />
    </div>
  );
}