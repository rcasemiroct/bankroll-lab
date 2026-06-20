import type { SimulationSettings } from "../types";
import { runMonteCarlo, type MonteCarloResult } from "./monteCarlo";

// Executa o Monte Carlo num Web Worker (não bloqueia a UI).
// Faz fallback síncrono se Worker não estiver disponível ou falhar.
export function runMonteCarloAsync(
  s: SimulationSettings
): Promise<MonteCarloResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(runMonteCarlo(s));
  }
  return new Promise((resolve) => {
    let settled = false;
    const worker = new Worker(
      new URL("./monteCarlo.worker.ts", import.meta.url),
      { type: "module" }
    );
    const finish = (r: MonteCarloResult) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(r);
    };
    worker.onmessage = (e: MessageEvent<MonteCarloResult>) => finish(e.data);
    worker.onerror = () => finish(runMonteCarlo(s));
    worker.postMessage(s);
  });
}
