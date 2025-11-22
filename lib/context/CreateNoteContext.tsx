'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';

interface CreateNoteContextType {
  triggerCreateNote: (dashboardId: string) => void;
  requestSignal: number;
  requestedDashboardId: string | null;
}

const CreateNoteContext = createContext<CreateNoteContextType | undefined>(undefined);

export function CreateNoteProvider({ children }: { children: React.ReactNode }) {
  const [requestSignal, setRequestSignal] = useState(0);
  const [requestedDashboardId, setRequestedDashboardId] = useState<string | null>(null);

  const triggerCreateNote = useCallback((dashboardId: string) => {
    setRequestedDashboardId(dashboardId);
    setRequestSignal((prev) => prev + 1);
  }, []);

  return (
    <CreateNoteContext.Provider value={{ triggerCreateNote, requestSignal, requestedDashboardId }}>
      {children}
    </CreateNoteContext.Provider>
  );
}

export function useCreateNote() {
  const context = useContext(CreateNoteContext);
  if (context === undefined) {
    throw new Error('useCreateNote must be used within CreateNoteProvider');
  }
  return context;
}
