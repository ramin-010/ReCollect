// ReCollect - Refactored Sidebar Component
'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Dashboard } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useViewStore } from '@/lib/store/viewStore';
import { authApi } from '@/lib/api/auth';
import { dashboardApi } from '@/lib/api/dashboard';
import { Button } from '@/components/ui-base/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { cn } from '@/lib/utils';
import {
  PanelLeft,
  Plus,
  LogOut,
  Home,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  PenTool,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  CheckSquare,
  Wallet,
  FileText,
} from 'lucide-react';
import { CreateDashboardDialog } from '@/components/dashboard/CreateDashboardDialog';
import { EditDashboardDialog } from '@/components/dashboard/EditDashboardDialog';
import { ShareDashboardDialog } from '@/components/dashboard/ShareDashboardDialog';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { toast } from 'sonner';

const MotionButton = motion.create(Button);

type DashboardAction = 'edit' | 'delete' | 'share';

export function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [dialogAction, setDialogAction] = useState<DashboardAction | null>(null);
  const [contextDashboard, setContextDashboard] = useState<Dashboard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dashboards = useDashboardStore((state) => state.dashboards);
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const setCurrentDashboard = useDashboardStore((state) => state.setCurrentDashboard);
  const removeDashboard = useDashboardStore((state) => state.removeDashboard);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const currentView = useViewStore((state) => state.currentView);
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  const dashboardsInitialAnimationCompleted = useRef(false);

  useEffect(() => {
    dashboardsInitialAnimationCompleted.current = true;
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
    }
  };

  const handleDashboardClick = (dashboard: Dashboard) => {
    setCurrentDashboard(dashboard);
    setCurrentView('dashboard');
    setIsMobileOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'U';
    const initials = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
    return initials || 'U';
  };

  const handleDashboardActionOpen = (dashboard: Dashboard, action: DashboardAction) => {
    setContextDashboard(dashboard);
    setDialogAction(action);
  };

  const handleDialogClose = () => {
    setDialogAction(null);
    setContextDashboard(null);
  };

  const handleDelete = async () => {
    if (!contextDashboard) return;
    setIsDeleting(true);
    try {
      const response = await dashboardApi.delete(contextDashboard._id);
      if (response.success) {
        removeDashboard(contextDashboard._id);
        if (currentDashboard?._id === contextDashboard._id) {
          setCurrentDashboard(null);
        }
      }
      toast.success('Dashboard deleted', {
        description: 'The dashboard and its contents have been deleted.',
      });
      handleDialogClose();
    } catch (error: any) {
      toast.error('Failed to delete', {
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isCollapsed={false}
                onCollapse={() => {}}
                onMobileClose={() => setIsMobileOpen(false)}
                isMobile={true}
                user={user}
                dashboards={dashboards}
                currentDashboard={currentDashboard}
                currentView={currentView}
                onDashboardClick={handleDashboardClick}
                onDashboardAction={handleDashboardActionOpen}
                onAllDashboardsClick={() => {
                  setCurrentDashboard(null);
                  setCurrentView('dashboard');
                  setIsMobileOpen(false);
                }}
                onDrawingBoardClick={() => {
                  setCurrentView('drawing');
                  setIsMobileOpen(false);
                }}
                onTodoClick={() => {
                  setCurrentView('todo');
                  setIsMobileOpen(false);
                }}
                onExpensesClick={() => {
                  setCurrentView('expenses');
                  setIsMobileOpen(false);
                }}
                onDocsClick={() => {
                  setCurrentView('docs');
                  setIsMobileOpen(false);
                }}
                onNewDashboardClick={() => setIsCreateOpen(true)}
                onSettingsClick={() => setCurrentView('settings')}
                onLogout={handleLogout}
                getInitials={getInitials}
                dashboardsInitialAnimationCompleted={dashboardsInitialAnimationCompleted.current}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 246 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:block relative z-30"
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
          onMobileClose={() => {}}
          isMobile={false}
          user={user}
          dashboards={dashboards}
          currentDashboard={currentDashboard}
          currentView={currentView}
          onDashboardClick={handleDashboardClick}
          onDashboardAction={handleDashboardActionOpen}
          onAllDashboardsClick={() => {
            setCurrentDashboard(null);
            setCurrentView('dashboard');
          }}
          onDrawingBoardClick={() => {
            setCurrentDashboard(null);
            setCurrentView('drawing');
          }}
          onTodoClick={() => {
             setCurrentDashboard(null);
            setCurrentView('todo')}}
          onExpensesClick={() => {
             setCurrentDashboard(null);
             setCurrentView('expenses')}}
          onDocsClick={() => {
             setCurrentDashboard(null);
             setCurrentView('docs')}}
          onNewDashboardClick={() => setIsCreateOpen(true)}
          onSettingsClick={() => setCurrentView('settings')}
          onLogout={handleLogout}
          getInitials={getInitials}
          dashboardsInitialAnimationCompleted={dashboardsInitialAnimationCompleted.current}
        />
      </motion.aside>

      {/* Dialogs */}
      <CreateDashboardDialog 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />
      


      {contextDashboard && (
        <>
          <EditDashboardDialog
            dashboard={contextDashboard}
            open={dialogAction === 'edit'}
            onOpenChange={(open) => {
              if (!open) handleDialogClose();
            }}
          />

          <ShareDashboardDialog
            dashboard={contextDashboard}
            open={dialogAction === 'share'}
            onOpenChange={(open) => {
              if (!open) handleDialogClose();
            }}
          />

          <DeleteConfirmDialog
            open={dialogAction === 'delete'}
            onOpenChange={(open) => {
              if (!open) handleDialogClose();
            }}
            onConfirm={handleDelete}
            isLoading={isDeleting}
            title="Delete Dashboard"
            description={`Are you sure you want to delete "${contextDashboard.name}"? This will also delete all notes in this dashboard. This action cannot be undone.`}
          />
        </>
      )}
    </>
  );
}

interface SidebarContentProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
  isMobile: boolean;
  user: any;
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  currentView: 'dashboard' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs';
  onDashboardClick: (dashboard: Dashboard) => void;
  onDashboardAction: (dashboard: Dashboard, action: DashboardAction) => void;
  onAllDashboardsClick: () => void;
  onDrawingBoardClick: () => void;
  onTodoClick: () => void;
  onExpensesClick: () => void;
  onDocsClick: () => void;
  onNewDashboardClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  getInitials: (name?: string) => string;
  dashboardsInitialAnimationCompleted: boolean;
}

function SidebarContent({
  isCollapsed,
  onCollapse,
  onMobileClose,
  isMobile,
  user,
  dashboards,
  currentDashboard,
  currentView,
  onDashboardClick,
  onDashboardAction,
  onAllDashboardsClick,
  onDrawingBoardClick,
  onTodoClick,
  onExpensesClick,
  onDocsClick,
  onNewDashboardClick,
  onSettingsClick,
  onLogout,
  getInitials,
  dashboardsInitialAnimationCompleted,
}: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--divider))]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--divider))] shrink-0">
        {!isCollapsed && (
          <button
            className="flex items-center gap-2 p-[6px] hover:bg-[hsl(var(--sidebar-hover))] rounded-lg transition-colors flex-1 min-w-0"
            onClick={onSettingsClick}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : getInitials(user?.name)}
            </div>
            {user && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user.email}</p>
              </div>
            )}
            <Settings className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={isMobile ? onMobileClose : onCollapse}
          className="shrink-0"
        >
          {isMobile ? <X className="h-5 w-5" /> : <PanelLeft className="h-6 w-6" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 py-4 overflow-y-auto">
        <nav className="space-y-1">
          {/* PRIMARY: All Dashboards - Always at top */}
          <motion.div className="relative">
            {currentView === 'dashboard' && !currentDashboard && (
              <motion.div
                layoutId="viewActiveIndicator"
                className="absolute inset-0 bg-secondary/20 rounded-lg pointer-events-none -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <MotionButton
              variant={currentView === 'dashboard' && !currentDashboard ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
                currentView === 'dashboard' && !currentDashboard && "border-l-4 border-blue-600/100 pl-2 bg-black/1"
              )}
              onClick={onAllDashboardsClick}
              whileTap={{ scale: 0.98 }}
              leftIcon={<Home className="h-5 w-5" />}
            >
              {!isCollapsed && <span className="text-[15px] font-medium tracking-wide text-white">All Dashboards</span>}
            </MotionButton>
          </motion.div>

          {/* WORKSPACE: Features */}
          <div className="space-y-1 pt-1">
            {/* Docs */}
            <MotionButton
              variant={currentView === 'docs' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
                currentView === 'docs' && "bg-amber-500/15 border-l-4 border-amber-500 pl-2"
              )}
              onClick={onDocsClick}
              whileTap={{ scale: 0.98 }}
              leftIcon={<FileText className="h-4 w-4 text-amber-500" />}
            >
              {!isCollapsed && <span className="text-[14px] text-[hsl(var(--muted-foreground))]">Docs</span>}
            </MotionButton>

            {/* To-Do List */}
            <MotionButton
              variant={currentView === 'todo' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
                currentView === 'todo' && "bg-emerald-500/15 border-l-4 border-emerald-500 pl-2"
              )}
              onClick={onTodoClick}
              whileTap={{ scale: 0.98 }}
              leftIcon={<CheckSquare className="h-4 w-4 text-emerald-500" />}
            >
              {!isCollapsed && <span className="text-[14px] text-[hsl(var(--muted-foreground))]">To-Do List</span>}
            </MotionButton>

            {/* Drawing Board */}
            <MotionButton
              variant={currentView === 'drawing' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
                currentView === 'drawing' && "bg-blue-500/15 border-l-4 border-blue-500 pl-2"
              )}
              onClick={onDrawingBoardClick}
              whileTap={{ scale: 0.98 }}
              leftIcon={<PenTool className="h-4 w-4 text-blue-500" />}
            >
              {!isCollapsed && <span className="text-[14px] text-[hsl(var(--muted-foreground))]">Whiteboard</span>}
            </MotionButton>

            {/* Expenses */}
            <MotionButton
              variant={currentView === 'expenses' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
                currentView === 'expenses' && "bg-violet-500/15 border-l-4 border-violet-500 pl-2"
              )}
              onClick={onExpensesClick}
              whileTap={{ scale: 0.98 }}
              leftIcon={<Wallet className="h-4 w-4 text-violet-500" />}
            >
              {!isCollapsed && <span className="text-[14px] text-[hsl(var(--muted-foreground))]">Expenses</span>}
            </MotionButton>
          </div>

          {/* YOUR DASHBOARDS: List - can scroll */}
          {!isCollapsed && (
            <div className="pt-4 pb-2 border-t border-[hsl(var(--divider))]">
              <p className="px-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                Your Dashboards
              </p>
            </div>
          )}
          {isCollapsed && <div className="pt-4 border-t border-[hsl(var(--divider))]" />}

          {/* Dashboard List */}
          <div className="space-y-0.5">
            {dashboards.map((dashboard, index) => (
              <DashboardItem
                key={dashboard._id}
                dashboard={dashboard}
                isActive={currentDashboard?._id === dashboard._id}
                isCollapsed={isCollapsed}
                onDashboardClick={onDashboardClick}
                onDashboardAction={onDashboardAction}
                index={index}
                animationCompleted={dashboardsInitialAnimationCompleted}
              />
            ))}
          </div>

          {/* New Dashboard Button */}
          <div className="pt-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-[hsl(var(--muted-foreground))] hover:text-white text-sm"
              onClick={onNewDashboardClick}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              {!isCollapsed && <span className="text-[13px]">New Dashboard</span>}
            </Button>
          </div>
        </nav>
      </div>

      {/* Collapsed User Avatar */}
      {isCollapsed && (
        <div className="p-4 shrink-0">
          <button
            className="flex items-center justify-center w-full p-2 hover:bg-[hsl(var(--sidebar-hover))] rounded-lg transition-colors"
            onClick={onSettingsClick}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-sm font-semibold">
              {getInitials(user?.name)}
            </div>
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="border-t border-[hsl(var(--divider))] p-4 shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
          onClick={onLogout}
          leftIcon={<LogOut className="h-4 w-4" />}
        >
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}

interface DashboardItemProps {
  dashboard: Dashboard;
  isActive: boolean;
  isCollapsed: boolean;
  onDashboardClick: (dashboard: Dashboard) => void;
  onDashboardAction: (dashboard: Dashboard, action: DashboardAction) => void;
  index: number;
  animationCompleted: boolean;
}

function DashboardItem({
  dashboard,
  isActive,
  isCollapsed,
  onDashboardClick,
  onDashboardAction,
  index,
  animationCompleted,
}: DashboardItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.div
      className="relative"
      style={{ zIndex: isMenuOpen ? 100 : 'auto' }}
      initial={animationCompleted ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      {/* Active Indicator Background */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 bg-secondary/20 rounded-lg pointer-events-none -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      <div className="relative flex items-center">
        {/* Dashboard Button */}
        <MotionButton
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200",
            isActive && "border-l-4 border-blue-600 pl-2 bg-black/1",
            !isCollapsed && "pr-10"
          )}
          onClick={() => onDashboardClick(dashboard)}
          whileTap={{ scale: 0.98 }}
          leftIcon={<LayoutDashboard className="h-4 w-4" />}
        >
          {!isCollapsed && (
            <span className="truncate text-[14px]  text-[hsl(var(--muted-foreground))] tracking-wide">{dashboard.name}</span>
          )}
        </MotionButton>

        {/* Dropdown Menu */}
        {!isCollapsed && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full opacity-70 hover:opacity-100 transition-opacity relative z-[101]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[102]">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDashboardAction(dashboard, 'edit');
                    setIsMenuOpen(false);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDashboardAction(dashboard, 'share');
                    setIsMenuOpen(false);
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onClick={(e) => {
                    e.stopPropagation();
                    onDashboardAction(dashboard, 'delete');
                    setIsMenuOpen(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
}