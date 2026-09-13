import { useState } from 'react';

export function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  const setAndPersist = (next: string) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // private-mode / storage disabled: keep in-memory value only
    }
  };

  return [value, setAndPersist];
}
