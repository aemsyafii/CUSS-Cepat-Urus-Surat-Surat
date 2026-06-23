'use client';

import { createContext, useState, useContext, useMemo } from 'react';

type TrackingContextType = {
  selectedSurat: any | null;
  setSelectedSurat: (surat: any | null) => void;
  globalToast: { show: boolean; message: string; type: 'success' | 'error' | 'info'; label: string } | null;
  setGlobalToast: (toast: any | null) => void;
};

const TrackingContext = createContext<TrackingContextType>({
  selectedSurat: null,
  setSelectedSurat: () => {},
  globalToast: null,
  setGlobalToast: () => {},
});

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [selectedSurat, setSelectedSurat] = useState<any | null>(null);
  const [globalToast, setGlobalToast] = useState<any | null>(null);

  const value = useMemo(() => ({ 
    selectedSurat, 
    setSelectedSurat,
    globalToast,
    setGlobalToast
  }), [selectedSurat, globalToast]);

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  return useContext(TrackingContext);
}
