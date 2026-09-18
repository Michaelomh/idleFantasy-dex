import { useState } from 'react';

function readValue<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedKey, setStoredKey] = useState(key);
  const [value, setValue] = useState<T>(() => readValue(key, initialValue));

  if (key !== storedKey) {
    setStoredKey(key);
    setValue(readValue(key, initialValue));
  }

  const setAndPersist = (next: T) => {
    setValue(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // private-mode / storage disabled: keep in-memory value only
    }
  };

  return [value, setAndPersist];
}
