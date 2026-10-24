import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulationJob, SimulationSummary } from '@/lib/simulator/run-simulation';

/** Runs a simulation job off the main thread. A new run cancels the one in flight. */
export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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
      worker.onmessage = (e: MessageEvent<SimulationSummary>) => {
        setSummary(e.data);
        setIsRunning(false);
        stop();
      };
      worker.onerror = () => {
        setIsRunning(false);
        stop();
      };
      worker.postMessage(job);
    },
    [stop],
  );

  return { summary, isRunning, run, clear: () => setSummary(null) };
}
