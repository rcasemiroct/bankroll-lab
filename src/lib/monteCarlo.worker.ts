/// <reference lib="webworker" />
import { runMonteCarlo } from "./monteCarlo";
import type { SimulationSettings } from "../types";

// Roda a simulação fora da main thread para não travar a UI.
self.onmessage = (e: MessageEvent<SimulationSettings>) => {
  const result = runMonteCarlo(e.data);
  (self as unknown as Worker).postMessage(result);
};
