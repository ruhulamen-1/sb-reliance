const BASE = import.meta.env.VITE_API_URL || '/api';

/** The shared public data (settings, services, posts, reviews, photos). The server puts it in the
 *  first HTML response as window.__HOME__, so pages normally get it without a network request. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initialHome = (): any => (typeof window !== 'undefined' ? (window as any).__HOME__ ?? null : null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function homeData<T = any>(): Promise<T> {
  const d = initialHome();
  return d ? Promise.resolve(d as T) : api<T>('/public/home');
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (opts.auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Cannot reach the API server (got a non-JSON response). Check that the server is running and the /api proxy points to it.');
  }
  if (res.status === 401 && opts.auth) {
    localStorage.removeItem('token');
    window.location.href = '/admin';
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}
