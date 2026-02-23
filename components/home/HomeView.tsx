'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useViewStore } from '@/lib/store/viewStore';
import { useDocStore } from '@/lib/store/docStore';
import { docApi } from '@/lib/api/docApi';
import { drawingApi } from '@/lib/api/drawingApi';
import { todoApi } from '@/lib/api/todoApi';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus, FileText, PenTool, CheckSquare, Presentation, CalendarDays, ChevronRight, LayoutTemplate } from 'lucide-react';

interface RecentItem {
  id: string;
  title: string;
  type: 'doc' | 'drawing' | 'slide';
  updatedAt: number;
}

export function HomeView() {
  const user = useAuthStore((state) => state.user);
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  const setCurrentDoc = useDocStore((state) => state.setCurrentDoc);
  
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Setup clock and greeting
  useEffect(() => {
    const updateTime = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');

      setCurrentDate(new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }).format(new Date()));
    };

    updateTime();
    // No need for interval since it just sets the initial greeting, but okay to refresh hourly
    const interval = setInterval(updateTime, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [docsRes, drawingsRes, tasksRes] = await Promise.allSettled([
          docApi.fetchAllDocs(),
          drawingApi.fetchAllDrawings(),
          todoApi.fetchTodos()
        ]);

        if (!mounted) return;

        // Process Docs
        const docs = docsRes.status === 'fulfilled' ? docsRes.value : [];
        const normDocs: RecentItem[] = docs.map(d => ({
          id: d._id,
          title: d.title || 'Untitled Doc',
          type: 'doc',
          updatedAt: new Date(d.updatedAt).getTime()
        }));

        // Process Drawings
        const drawings = drawingsRes.status === 'fulfilled' ? drawingsRes.value : [];
        const normDrawings: RecentItem[] = drawings.map(d => ({
          id: d._id,
          title: d.name || 'Untitled Whiteboard',
          type: 'drawing',
          updatedAt: new Date(d.updatedAt).getTime()
        }));

        // Process Slides (from localStorage)
        let slides: any[] = [];
        try {
          const storedSlides = localStorage.getItem('recollect_slide_decks');
          if (storedSlides) slides = JSON.parse(storedSlides);
        } catch (e) {}

        const normSlides: RecentItem[] = slides.map(s => ({
          id: s.id,
          title: s.name || 'Untitled Presentation',
          type: 'slide',
          updatedAt: new Date(s.updatedAt).getTime()
        }));

        // Merge and sort recents
        const allRecents = [...normDocs, ...normDrawings, ...normSlides]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 6); // Top 6 recents

        setRecents(allRecents);

        // Process Tasks
        const allTasks = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
        const pendingTasks = allTasks
          .filter((t: any) => t.status !== 'complete')
          .sort((a: any, b: any) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 4); // Top 4 upcoming

        setTasks(pendingTasks);
      } catch (error) {
        console.error('Failed to load home data', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'doc': return <FileText className="h-4 w-4 text-emerald-400" />;
      case 'drawing': return <PenTool className="h-4 w-4 text-purple-400" />;
      case 'slide': return <Presentation className="h-4 w-4 text-orange-400" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleRecentClick = (item: RecentItem) => {
    if (item.type === 'doc') {
      // In a real flow, you'd set the current doc so `DocsView` knows what to open
      // since `docStore` manages docs view state, we'd need to fetch it first.
      // But for simplicity, we switch to docs view. The user will see their docs list.
      setCurrentView('docs');
    } else if (item.type === 'drawing') {
      setCurrentView('drawing');
    } else if (item.type === 'slide') {
      setCurrentView('slides');
    }
  };

  return (
    <div className="p-4 lg:p-8 min-h-screen bg-[hsl(var(--background))] overflow-y-auto custom-scrollbar pb-24">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* -- Greeting Header -- */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
              {greeting}, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-white/50 text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {currentDate}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCurrentView('docs')} leftIcon={<Plus className="h-3.5 w-3.5" />}>New Doc</Button>
            <Button variant="primary" size="sm" onClick={() => setCurrentView('todo')} leftIcon={<CheckSquare className="h-3.5 w-3.5" />}>Add Task</Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* -- Left Column: Recents & Templates -- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recents */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-primary" />
                  Jump back in
                </h2>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}
                </div>
              ) : recents.length === 0 ? (
                <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-sm text-white/40">No recent activity yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recents.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleRecentClick(item)}
                      className="flex items-center gap-4 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getIconForType(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-white/90 truncate">{item.title}</p>
                        <p className="text-[11px] text-white/40 lowercase tracking-wide mt-0.5">
                          {item.type} • {getTimeAgo(item.updatedAt)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </section>

            {/* Templates */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-brand-primary" />
                  Start from a template
                </h2>
                <Button variant="ghost" size="sm" className="text-white/40 hover:text-white group text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'Meeting Notes', icon: <FileText className="h-5 w-5 text-blue-400" />, color: 'from-blue-500/10 to-transparent' },
                  { name: 'Project Plan', icon: <Presentation className="h-5 w-5 text-emerald-400" />, color: 'from-emerald-500/10 to-transparent' },
                  { name: 'Daily Standup', icon: <CheckSquare className="h-5 w-5 text-orange-400" />, color: 'from-orange-500/10 to-transparent' },
                  { name: 'Brainstorm', icon: <PenTool className="h-5 w-5 text-purple-400" />, color: 'from-purple-500/10 to-transparent' },
                ].map((tpl, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-white/10 hover:bg-white/[0.05] transition-colors relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b ${tpl.color} opacity-50`} />
                    <div className="relative z-10 p-3 rounded-full bg-white/5">
                      {tpl.icon}
                    </div>
                    <span className="text-xs font-medium text-white/70 text-center relative z-10">{tpl.name}</span>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* -- Right Column: Upcoming Tasks -- */}
          <div className="space-y-6">
            <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-brand-primary" />
                  Upcoming Tasks
                </h2>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCurrentView('todo')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/5" />)}
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <CheckSquare className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-white">All caught up!</p>
                  <p className="text-xs text-white/40 mt-1">No pending tasks found.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {tasks.map((task, i) => (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                      onClick={() => setCurrentView('todo')}
                    >
                      <div className="mt-0.5 shrink-0 rounded border border-white/20 w-4 h-4 flex items-center justify-center text-white/20 group-hover:border-brand-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white/90 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.dueDate && (
                            <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium tracking-wide">
                              <CalendarDays className="h-2.5 w-2.5" />
                              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(task.dueDate))}
                            </span>
                          )}
                          {task.priority === 'high' && (
                            <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded font-medium">High</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white mt-2" onClick={() => setCurrentView('todo')}>
                    View all tasks
                  </Button>
                </div>
              )}
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
