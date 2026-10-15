import { useState } from 'react';

// useState that survives a page reload in this browser tab (sub-tabs, chosen month, etc.)
export function useRemembered<T extends string | number>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = sessionStorage.getItem(key);
      if (s !== null) return (typeof initial === 'number' ? Number(s) : s) as T;
    } catch { /* storage blocked */ }
    return initial;
  });
  const set = (next: T) => {
    setV(next);
    try { sessionStorage.setItem(key, String(next)); } catch { /* storage blocked */ }
  };
  return [v, set] as const;
}
