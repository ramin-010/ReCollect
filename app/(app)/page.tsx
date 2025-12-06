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
import { UpdateContentDialog } from '@/components/content/UpdateContentDialog';
import { AlertDialog } from '@/components/ui-base/Dialog';
import { Content, Tag } from '@/lib/utils/types';
import { UserSettings } from '@/components/settings/UserSettings';
import { ExcalidrawDashboard } from '@/components/drawing/ExcalidrawDashboard';
import { TodoView } from '@/components/todo/TodoView';
import { ExpenseView } from '@/components/expenses/ExpenseView';
import { useViewStore } from '@/lib/store/viewStore';
import { dashboardApi } from '@/lib/api/dashboard';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentCardSkeleton } from '@/components/content/ContentCardSkeleton';

export default function HomePage() {
  const dashboards = useDashboardStore((state) => state.dashboards);
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const getDashboardContents = useDashboardStore((state) => state.getDashboardContents);
  const setDashboardContents = useDashboardStore((state) => state.setDashboardContents);
  const setLoadingContents = useDashboardStore((state) => state.setLoadingContents);
  const isLoadingContents = useDashboardStore((state) => state.isLoadingContents);
  
  const { triggerCreateNote, requestSignal, requestedDashboardId } = useCreateNote();
  const [isCreateDashboardOpen, setIsCreateDashboardOpen] = useState(false);
  
  const [inlineDialogStateByDash, setInlineDialogStateByDash] = useState<{
    [dashId: string]: boolean;
  }>({});
  
  // Edit state
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const currentView = useViewStore((state) => state.currentView);
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  // Get current inline dialog state based on dashboard
  const showInlineCreate = currentDashboard 
    ? inlineDialogStateByDash[currentDashboard._id] || false 
    : false;

  const inlineStateRef = useRef(showInlineCreate);
  const editingContentRef = useRef(editingContent);
  const lastHandledSignalRef = useRef(0);
  
  useEffect(() => {
    inlineStateRef.current = showInlineCreate;
  }, [showInlineCreate]);

  useEffect(() => {
    editingContentRef.current = editingContent;
  }, [editingContent]);

  
  // When dashboard changes, reset unsaved warning
  useEffect(() => {
    setShowUnsavedWarning(false);
    setEditingContent(null); // Close edit dialog when switching dashboards
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
    const contents = currentDashboard ? getDashboardContents(currentDashboard._id) : [];
    if (currentDashboard && contents && contents.length > 0) {
      setShowInlineCreate(false);
    }
  }, [currentDashboard?._id]);

  useEffect(() => {
    if (requestSignal === 0 || requestSignal <= lastHandledSignalRef.current) return;
    if (!currentDashboard || requestedDashboardId !== currentDashboard._id) return;
    
    // Check if user is currently creating or editing a note
    if (inlineStateRef.current || editingContentRef.current) {
      setShowUnsavedWarning(true);
    } else {
      setShowInlineCreate(true);
    }
    lastHandledSignalRef.current = requestSignal;
  }, [requestSignal, requestedDashboardId, currentDashboard?._id]);

  // Lazy load dashboard contents
  useEffect(() => {
    if (!currentDashboard) return;

    // Check if already cached (undefined means not loaded yet, empty array means loaded but empty)
    const cached = getDashboardContents(currentDashboard._id);
    if (cached !== undefined) {
      return; // Already loaded (even if empty)
    }

    // Fetch contents for this dashboard
    const fetchContents = async () => {
      setLoadingContents(currentDashboard._id, true);
      try {
       // await new Promise((resolve) => setTimeout(resolve, 30000));
        const response = await dashboardApi.getContents(currentDashboard._id);
        if (response.success && response.data) {
          setDashboardContents(currentDashboard._id, response.data.contents);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard contents:', error);
        toast.error('Failed to load notes');
      } finally {
        setLoadingContents(currentDashboard._id, false);
      }
    };

    fetchContents();
  }, [currentDashboard?._id]);

  const handleConfirmNew = () => {
    setShowUnsavedWarning(false);
    setShowInlineCreate(false);
    setEditingContent(null); // Close edit dialog
    // Open new inline dialog after brief delay
    setTimeout(() => {
      setShowInlineCreate(true);
    }, 100);
  };

  const handleCancelNew = () => {
    setShowUnsavedWarning(false);
  };

  // Handle edit request from ContentCard
  const handleEditContent = (content: Content) => {
    // Close create dialog if open
    setShowInlineCreate(false);
    // Open edit dialog
    setEditingContent(content);
  };

  // Render Settings View
  if (currentView === 'settings') {
    return <UserSettings />;
  }

  // Render Drawing View
  if (currentView === 'drawing') {
    return <ExcalidrawDashboard />;
  }

  // Render Todo View
  if (currentView === 'todo') {
    return <TodoView />;
  }

  // Render Expense View
  if (currentView === 'expenses') {
    return <ExpenseView />;
  }

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
  const contents = currentDashboard ? (getDashboardContents(currentDashboard._id) || []) : [];
  const isLoading = currentDashboard ? isLoadingContents(currentDashboard._id) : false;
  const pinnedContents = contents.filter(c => c.isPinned);
  const regularContents = contents.filter(c => !c.isPinned && !c.isArchived);
  let hasContent = contents.length > 0;

  // Show skeleton while loading
  if (isLoading) {
    const skeletonCount = currentDashboard?.contents?.length || 4;

    return (
       <div className="p-4 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* <Skeleton className="h-12 w-64" /> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <ContentCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>                
    );
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {showInlineCreate ? (
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
          ) : editingContent ? (
            // Edit Note Form (animated)
            <motion.div
              key="edit-form"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ 
                duration: 0.3, 
                ease: [0.4, 0, 0.2, 1] 
              }}
            >
              <UpdateContentDialog
                isOpen={true}
                onClose={() => setEditingContent(null)}
                dashboardId={currentDashboard._id}
                content={editingContent}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          onEdit={handleEditContent}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          onEdit={handleEditContent}
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
        title={editingContentRef.current ? "Unsaved Edits" : "Unsaved Note"}
        description={
          editingContentRef.current 
            ? "You have unsaved edits in progress. Are you sure you want to discard them and create a new note?"
            : "You have an unsaved note in progress. Are you sure you want to discard it and create a new one?"
        }
        confirmText="Discard & Create New"
        cancelText="Keep Editing"
        onConfirm={handleConfirmNew}
        variant="default"
      />
    </div>
  );
}
