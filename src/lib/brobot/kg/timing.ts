export type BroBotStageTiming = {
  durationMs: number;
  outcome: "success" | "error" | "timeout";
  parallelGroup?: string;
};

export class BroBotStageTimer {
  private readonly startedAt = performance.now();
  private readonly stages = new Map<string, BroBotStageTiming>();

  async measure<T>(
    name: string,
    operation: () => Promise<T> | T,
    parallelGroup?: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      this.stages.set(name, {
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        outcome: "success",
        parallelGroup,
      });
      return result;
    } catch (error) {
      this.stages.set(name, {
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        outcome: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "error",
        parallelGroup,
      });
      throw error;
    }
  }

  mark(name: string, durationMs: number, outcome: BroBotStageTiming["outcome"] = "success") {
    this.stages.set(name, { durationMs, outcome });
  }

  snapshot() {
    return Object.fromEntries(this.stages);
  }

  durations() {
    return Object.fromEntries(
      Array.from(this.stages.entries()).map(([name, timing]) => [name, timing.durationMs])
    );
  }

  totalMs() {
    return Math.round((performance.now() - this.startedAt) * 100) / 100;
  }
}
