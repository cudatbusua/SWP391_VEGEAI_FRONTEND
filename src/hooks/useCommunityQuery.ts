import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/apiClient';

export function useCommunityQuery<T>(key: string, request: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [state, setState] = useState<{ key: string; data: T | null; busy: boolean; error: string }>({ key, data: null, busy: enabled, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, data: null, busy: enabled, error: '' });
    if (enabled) requestRef.current(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, busy: false, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setState({ key, data: null, busy: false, error: errorMessage(error) }); });
    return () => controller.abort();
  }, [key, revision, enabled]);
  return { ...(state.key === key ? state : { data: null, busy: enabled, error: '' }), refresh: () => setRevision(value => value + 1) };
}
export function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}
