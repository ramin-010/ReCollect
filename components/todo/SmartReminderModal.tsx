'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Calendar, 
  Crown, 
  Check, 
  Clock, 
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';
import { format, subMinutes } from 'date-fns';

interface SmartReminderModalProps {
  dueDate: Date | null;
  onSetReminder: (date: Date | null) => void;
  onClose: () => void;
  currentReminder?: Date | null;
}

export function SmartReminderModal({ 
  dueDate, 
  onSetReminder, 
  onClose,
  currentReminder 
}: SmartReminderModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'custom'>('auto');

  // Calculate the auto-reminder time (10 mins before due date)
  const autoReminderTime = dueDate ? subMinutes(dueDate, 10) : null;
  
  // Check if the auto-reminder is currently set
  const isAutoReminderSet = !!(currentReminder && autoReminderTime && 
    currentReminder.getTime() === autoReminderTime.getTime());

  return (
    <div className="w-[320px] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          Reminders
        </h3>
      </div>

      {/* Tabs */}
      <div className="p-1 mx-4 mt-4 bg-white/5 rounded-lg grid grid-cols-2 gap-1">
        <button
          onClick={() => setActiveTab('auto')}
          className={cn(
            "text-xs font-medium py-1.5 px-3 rounded-md transition-all",
            activeTab === 'auto' 
              ? "bg-[#2a2a2a] text-white shadow-sm" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          Before task
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={cn(
            "text-xs font-medium py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
            activeTab === 'custom' 
              ? "bg-[#2a2a2a] text-white shadow-sm" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          Date & time
          <Crown className="w-3 h-3 text-amber-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'auto' ? (
            <motion.div
              key="auto"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {dueDate ? (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-full mt-0.5">
                      <Clock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">10 minutes before</p>
                      <p className="text-xs text-white/50 mt-1">
                        We'll remind you at <span className="text-indigo-300 font-mono">{format(autoReminderTime!, 'EEEE, h:mm a')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/50 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-white/70 leading-relaxed">
                      Add a date and time to the task first to enable smart reminders.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  if (isAutoReminderSet) {
                    onSetReminder(null); // Remove reminder
                    onClose();
                  } else if (autoReminderTime) {
                    onSetReminder(autoReminderTime);
                    onClose();
                  }
                }}
                disabled={!dueDate}
                className={cn(
                  "w-full h-9 text-sm font-medium rounded-lg transition-all",
                  isAutoReminderSet 
                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                )}
              >
                {isAutoReminderSet ? (
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Remove reminder
                  </span>
                ) : "Add reminder"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="text-center py-6 space-y-3"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-amber-500/30">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Pro Feature</h4>
                <p className="text-xs text-white/40 mt-1 px-4">
                  Custom reminder times are available on the Pro plan.
                </p>
              </div>
              <div className="pt-2">
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-[10px] font-medium text-white/40 border border-white/5 uppercase tracking-wide">
                    Coming Soon
                 </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
