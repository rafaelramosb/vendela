'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext<(msg: string, kind?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: string } | null>(null);
  const timer = useRef<any>();
  const show = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    setT({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), kind === 'error' ? 5000 : 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'} onClick={() => setT(null)}>
          {t.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
