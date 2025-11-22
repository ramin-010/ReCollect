// ReCollect - Reminder Dialog Component - Simplified
'use client';

import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui-base/Modal';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { 
  Clock, 
  Calendar,
  Check,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  existingReminder?: {
    _id?: string;
    reminderDate: string;
    message?: string;
  };
  onSave: (reminderData: {
    reminderDate: string;
    message?: string;
  }) => Promise<void>;
}


const toLocalInputValue = (utcString: string) => {
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
// Format for UI display
const formatDate = (dateString: string) => {
//  console.log("coming string", dateString)
  if (!dateString) return '';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' at ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
};

export const ReminderDialog: React.FC<ReminderDialogProps> = ({
  isOpen,
  onClose,
  noteTitle,
  existingReminder,
  onSave
}) => {

  // 🟢 FIX: Convert existing UTC -> local for the input
  const [reminderDate, setReminderDate] = useState(
    existingReminder?.reminderDate
      ? toLocalInputValue(existingReminder.reminderDate)
      : ''
  );

  const [isLoading, setIsLoading] = useState(false);

  const quickOptions = [
    { label: '1 hour', hours: 1 },
    { label: 'Tomorrow', hours: 24 },
    { label: '3 days', hours: 72 },
    { label: '1 week', hours: 168 }
  ];

  const handleQuickSelect = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);

    // convert to local for input
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);

    setReminderDate(local);
  };

  const handleSave = async () => {
    if (!reminderDate) {
      toast.error('Please select a reminder date');
      return;
    }

    // reminderDate is local -> convert to real Date
    const localDate = new Date(reminderDate);

    // Convert to UTC ISO for backend
    
const utcISO = localDate.toISOString();

    if (new Date(utcISO) <= new Date()) {
      toast.error('Reminder date must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        reminderDate: utcISO // 🟢 ALWAYS send UTC ISO
      });

      toast.success(existingReminder ? 'Reminder updated' : 'Reminder set');
      onClose();
    } catch (error) {
      console.error('Failed to save reminder:', error);
      toast.error('Failed to save reminder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingReminder ? 'Update Reminder' : 'Set Reminder'}
      size="sm"
    >
      <ModalBody className="space-y-4">
        {/* Info Card */}
        <div className="p-3 rounded-lg bg-[hsl(var(--brand-primary))]/5 border border-[hsl(var(--brand-primary))]/20">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-[hsl(var(--brand-primary))] mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-[hsl(var(--foreground))]">{noteTitle}</p>
              <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                You'll receive an email reminder at the scheduled time
              </p>
            </div>
          </div>
        </div>

        {/* Quick Options */}
       <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3 block">Quick Select</label>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => handleQuickSelect(option.hours)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  reminderDate && formatDate(reminderDate).includes(option.label)
                    ? 'bg-[hsl(var(--brand-primary))] text-white border-[hsl(var(--brand-primary))]'
                    : 'bg-[hsl(var(--surface-light))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {/* Custom Date */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 block">
            Custom Date & Time
          </label>
          <Input
            type="datetime-local"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />

          {reminderDate && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
              📅 {formatDate(reminderDate)}
            </p>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isLoading}
          rightIcon={!isLoading && <Check className="w-4 h-4" />}
        >
          {existingReminder ? 'Update' : 'Set Reminder'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
