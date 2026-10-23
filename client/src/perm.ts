import { createContext, useContext } from 'react';

// What the signed-in Admin account may do. Same rules as can() in server/src/index.ts; the server checks
// every request, this only hides buttons the account cannot use.
export type Me = { id: number; email: string; name: string; role: 'owner' | 'staff'; modules: string[] };

export function has(me: Me | null, m: string) {
  if (!me) return false;
  if (me.role === 'owner') return true;
  if (m.startsWith('pay.')) {
    if (me.modules.includes('payroll')) return true;
    if (m === 'pay.any') return me.modules.some((x) => x.startsWith('pay.'));
    if (m.endsWith('.view') && me.modules.includes(m.replace(/\.view$/, '.edit'))) return true;
  }
  return me.modules.includes(m);
}

export const MeContext = createContext<Me | null>(null);
/** can('pay.month.edit') → true when this account may do it */
export function useCan() {
  const me = useContext(MeContext);
  return (m: string) => has(me, m);
}
