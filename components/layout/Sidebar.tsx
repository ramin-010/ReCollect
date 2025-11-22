// ReCollect - Refactored Sidebar Component
'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Dashboard } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useAuthStore } from '@/lib/store/authStore';
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
} from 'lucide-react';
import { CreateDashboardDialog } from '@/components/dashboard/CreateDashboardDialog';
import { ExcalidrawDashboard } from '@/components/drawing/ExcalidrawDashboard';
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
  const [isExcalidrawOpen, setIsExcalidrawOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DashboardAction | null>(null);
  const [contextDashboard, setContextDashboard] = useState<Dashboard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dashboards = useDashboardStore((state) => state.dashboards);
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const setCurrentDashboard = useDashboardStore((state) => state.setCurrentDashboard);
  const removeDashboard = useDashboardStore((state) => state.removeDashboard);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

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
                onDashboardClick={handleDashboardClick}
                onDashboardAction={handleDashboardActionOpen}
                onAllDashboardsClick={() => {
                  setCurrentDashboard(null);
                  setIsMobileOpen(false);
                }}
                onDrawingBoardClick={() => setIsExcalidrawOpen(true)}
                onNewDashboardClick={() => setIsCreateOpen(true)}
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
        animate={{ width: isCollapsed ? 80 : 256 }}
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
          onDashboardClick={handleDashboardClick}
          onDashboardAction={handleDashboardActionOpen}
          onAllDashboardsClick={() => setCurrentDashboard(null)}
          onDrawingBoardClick={() => setIsExcalidrawOpen(true)}
          onNewDashboardClick={() => setIsCreateOpen(true)}
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
      
      <ExcalidrawDashboard 
        isOpen={isExcalidrawOpen} 
        onClose={() => setIsExcalidrawOpen(false)} 
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
  onDashboardClick: (dashboard: Dashboard) => void;
  onDashboardAction: (dashboard: Dashboard, action: DashboardAction) => void;
  onAllDashboardsClick: () => void;
  onDrawingBoardClick: () => void;
  onNewDashboardClick: () => void;
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
  onDashboardClick,
  onDashboardAction,
  onAllDashboardsClick,
  onDrawingBoardClick,
  onNewDashboardClick,
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
            className="flex items-center gap-3 p-2 hover:bg-[hsl(var(--sidebar-hover))] rounded-lg transition-colors flex-1 min-w-0"
            onClick={() => toast.info('Profile settings coming soon!')}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {getInitials(user?.name)}
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
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <nav className="space-y-1">
          {/* All Dashboards */}
          <Button
            variant={!currentDashboard ? "outline" : "ghost"}
            className="w-full justify-start hover:bg-[hsl(var(--sidebar-hover))]"
            onClick={onAllDashboardsClick}
            leftIcon={<Home className="h-5 w-5" />}
          >
            {!isCollapsed && <span>All Dashboards</span>}
          </Button>

          {/* Drawing Board */}
          <Button
            variant="ghost"
            className="w-full justify-start text-blue-600 dark:text-blue-400 hover:bg-purple-50 dark:hover:bg-blue-950/30"
            onClick={onDrawingBoardClick}
            leftIcon={<PenTool className="h-5 w-5" />}
          >
            {!isCollapsed && <span>Drawing Board</span>}
          </Button>

          {/* Dashboards Section */}
          {!isCollapsed && (
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Dashboards
              </p>
            </div>
          )}

          {/* Dashboard List */}
          <div className="space-y-1 pt-2">
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
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onNewDashboardClick}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {!isCollapsed && <span>New Dashboard</span>}
            </Button>
          </div>
        </nav>
      </div>

      {/* Collapsed User Avatar */}
      {isCollapsed && (
        <div className="p-4 shrink-0">
          <button
            className="flex items-center justify-center w-full p-2 hover:bg-[hsl(var(--sidebar-hover))] rounded-lg transition-colors"
            onClick={() => toast.info('Profile settings coming soon!')}
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
            <span className="truncate text-sm">{dashboard.name}</span>
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