import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulationJob, SimulationSummary } from '@/lib/simulator/run-simulation';
import { useSessionStorage } from './use-session-storage';

export function useSimulation(storageKey: string) {
  const workerRef = useRef<Worker | null>(null);
  const [summary, setSummary] = useSessionStorage<SimulationSummary | null>(storageKey, null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const run = useCallback(
    (job: SimulationJob) => {
      stop();
      const worker = new Worker(new URL('../simulator/simulation.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      setIsRunning(true);
      setError(null);
      worker.onmessage = (e: MessageEvent<SimulationSummary>) => {
        setSummary(e.data);
        setIsRunning(false);
        stop();
      };
      worker.onerror = (e) => {
        console.error('[simulator] simulation worker failed', e);
        setError(e.message || 'Something went wrong while simulating.');
        setIsRunning(false);
        stop();
      };
      worker.postMessage(job);
    },
    [stop, setSummary],
  );

  return { summary, isRunning, error, run, clear: () => setSummary(null) };
}
