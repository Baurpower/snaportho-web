"use client";

import { useState } from "react";
import {
  toCalendarDaySnapshot,
  type GenerateRequestPayload,
  type GenerateWorkerRequest,
  type GenerateWorkerResponse,
} from "@/components/workspace/call/call-generator-protocol";
import type {
  CalendarDay,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";

/**
 * Dev-only harness to verify the CALL_GEN_V2 Web Worker actually bundles and runs
 * off the main thread, without needing an authenticated admin + seeded program.
 * Not linked anywhere; visit /dev/call-gen-worker in `next dev`.
 */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function makeDay(dateKey: string): CalendarDay {
  const date = new Date(`${dateKey}T00:00:00`);
  const dow = date.getDay();
  return {
    date,
    key: dateKey,
    dayNumber: date.getDate(),
    dayName: DAY_NAMES[dow],
    isWeekend: dow === 0 || dow === 6,
  };
}

function makeResident(id: string, pgy: number): ResidentOption {
  return {
    residentId: id,
    rosterId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: `PGY-${pgy}`,
    pgyYear: pgy,
    gradYear: null,
    rotationAssignments: [],
  };
}

export default function CallGenWorkerHarness() {
  const [output, setOutput] = useState<string>("Idle. Click Run.");
  const [running, setRunning] = useState(false);

  // Dev-only tool: do not expose the worker harness in production builds.
  if (process.env.NODE_ENV === "production") {
    return (
      <div style={{ padding: 24, fontFamily: "monospace" }}>
        Not available.
      </div>
    );
  }

  function run() {
    setRunning(true);
    setOutput("Starting worker…");

    const started = performance.now();
    let worker: Worker;
    try {
      worker = new Worker(
        new URL(
          "@/components/workspace/call/call-generator.worker.ts",
          import.meta.url
        )
      );
    } catch (error) {
      setOutput(`FAILED to construct worker: ${String(error)}`);
      setRunning(false);
      return;
    }

    const monthKeys = Array.from({ length: 14 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `2026-07-${day}`;
    });

    const residents = Array.from({ length: 8 }, (_, i) =>
      makeResident(`R${i + 1}`, 2 + (i % 4))
    );

    const payload: GenerateRequestPayload = {
      requestId: `harness-${Date.now()}`,
      monthDays: monthKeys.map((key) => toCalendarDaySnapshot(makeDay(key))),
      residents,
      existingAssignments: {},
      rules: [],
      availabilityByResident: {},
      historicalStats: [],
      slotMode: "Primary",
      generationVersion: 42,
      forceRegenerate: true,
      enableLocalSearch: true,
      localSearchMaxIterations: 4000,
    };

    worker.onmessage = (event: MessageEvent<GenerateWorkerResponse>) => {
      const message = event.data;
      const elapsed = (performance.now() - started).toFixed(1);
      worker.terminate();
      setRunning(false);

      if (message.kind !== "result") {
        setOutput(`WORKER ERROR after ${elapsed}ms: ${message.message}`);
        return;
      }

      const report = message.generationReport as {
        optimization?: unknown;
        repair?: unknown;
        completeCombinationCount?: number;
      };
      const filledDays = monthKeys.filter(
        (key) => message.assignments[key]?.primaryRosterId
      ).length;

      setOutput(
        [
          `OK — worker returned in ${elapsed}ms`,
          `days filled (Primary): ${filledDays}/${monthKeys.length}`,
          `completeCombinationCount: ${report.completeCombinationCount}`,
          `optimization: ${JSON.stringify(report.optimization)}`,
          `repair: ${JSON.stringify(report.repair)}`,
          `response is JSON-serializable: ${
            JSON.stringify(message).length > 0 ? "yes" : "no"
          }`,
        ].join("\n")
      );
    };

    worker.onerror = (event) => {
      worker.terminate();
      setRunning(false);
      setOutput(`WORKER onerror: ${event.message}`);
    };

    const request: GenerateWorkerRequest = { kind: "generate", ...payload };
    worker.postMessage(request);
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace", maxWidth: 720 }}>
      <h1>CALL_GEN_V2 Worker Harness (dev)</h1>
      <p>
        Verifies the schedule-generation Web Worker bundles and runs off the main
        thread. No auth / program data required.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={running}
        style={{
          padding: "8px 16px",
          fontSize: 16,
          cursor: running ? "default" : "pointer",
        }}
      >
        {running ? "Running…" : "Run generation in worker"}
      </button>
      <pre
        data-testid="worker-output"
        style={{
          marginTop: 16,
          padding: 12,
          background: "#111",
          color: "#0f0",
          whiteSpace: "pre-wrap",
          borderRadius: 8,
        }}
      >
        {output}
      </pre>
    </div>
  );
}
