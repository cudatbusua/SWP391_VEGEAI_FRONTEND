import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

const storageKey = (key: string) => `vegeai-demo:${key}`;

function readStoredValue<T>(key: string, initialValue: T): T {
  try {
    const savedValue = window.localStorage.getItem(storageKey(key));
    if (savedValue === null) return initialValue;

    const parsedValue: unknown = JSON.parse(savedValue);
    // Merge object defaults so fields added to the UI later still have safe demo values.
    if (
      typeof initialValue === 'object' &&
      initialValue !== null &&
      !Array.isArray(initialValue) &&
      typeof parsedValue === 'object' &&
      parsedValue !== null &&
      !Array.isArray(parsedValue)
    ) {
      return { ...initialValue, ...parsedValue } as T;
    }
    return parsedValue as T;
  } catch (error) {
    // A bad/stale browser record should be visible during development, not silently treated as API data.
    console.warn(`Could not read the VEGEAI demo record "${key}".`, error);
    return initialValue;
  }
}

/**
 * Stores demo-only records in one predictable place until the matching API exists.
 * Components continue to talk to state setters, so those setters can later be replaced
 * by service calls without changing the screen's event handlers or form controls.
 */
export function useDemoState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue));
  const currentValue = useRef(value);
  const defaultValue = useRef(initialValue);

  const updateValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    // Keep a synchronous ref so several actions in one click use the latest value without side effects in React's state updater.
    const resolvedValue = typeof nextValue === 'function'
      ? (nextValue as (previousValue: T) => T)(currentValue.current)
      : nextValue;
    currentValue.current = resolvedValue;
    setValue(resolvedValue);
    try {
      window.localStorage.setItem(storageKey(key), JSON.stringify(resolvedValue));
      // Same-tab pages (for example, notification bell and notification list) share state immediately.
      window.dispatchEvent(new CustomEvent('vegeai-demo-state-change', { detail: { key } }));
    } catch (error) {
      // Keep the current interaction usable but surface persistence failure to developers.
      console.error(`Could not save the VEGEAI demo record "${key}".`, error);
    }
  }, [key]);

  useEffect(() => {
    const syncFromStorage = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.key !== key) return;
      if (event instanceof StorageEvent && event.key !== storageKey(key)) return;
      const latestValue = readStoredValue(key, defaultValue.current);
      currentValue.current = latestValue;
      setValue(latestValue);
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('vegeai-demo-state-change', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('vegeai-demo-state-change', syncFromStorage);
    };
  }, [key]);

  return [value, updateValue];
}
