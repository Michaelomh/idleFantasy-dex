import { runSimulation, type SimulationJob } from './run-simulation';

self.onmessage = (e: MessageEvent<SimulationJob>) => {
  self.postMessage(runSimulation(e.data));
};
