// Drives an algorithm's step generator on a timer for animation.

import { useCallback, useEffect, useRef, useState } from "react";
import { runAlgorithm, type StepEvent } from "@/lib/graph/algorithms";
import type { AlgoName, AlgoResult, NodeId, RoadGraph } from "@/lib/graph/types";

export type RunState = "idle" | "running" | "paused" | "done";

export interface VisualizerState {
  visited: NodeId[];
  frontier: Set<NodeId>;
  current: NodeId | null;
  ops: number;
  result: AlgoResult | null;
  status: RunState;
}

const initial: VisualizerState = {
  visited: [],
  frontier: new Set(),
  current: null,
  ops: 0,
  result: null,
  status: "idle",
};

export function useVisualizer() {
  const [state, setState] = useState<VisualizerState>(initial);
  const genRef = useRef<Generator<StepEvent, void, void> | null>(null);
  const timerRef = useRef<number | null>(null);
  const speedRef = useRef(50); // steps per tick
  const intervalRef = useRef(16); // ms per tick

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    genRef.current = null;
    setState(initial);
  }, []);

  const setSpeed = useCallback((stepsPerTick: number) => {
    speedRef.current = Math.max(1, stepsPerTick);
  }, []);

  const tick = useCallback(() => {
    const gen = genRef.current;
    if (!gen) return;
    setState((prev) => {
      let visited = prev.visited;
      let frontier = prev.frontier;
      let current = prev.current;
      let ops = prev.ops;
      let result = prev.result;
      let status: RunState = prev.status;
      let touched = false;
      for (let i = 0; i < speedRef.current; i++) {
        const next = gen.next();
        if (next.done) {
          status = "done";
          break;
        }
        const ev = next.value;
        touched = true;
        if (ev.visitedDelta.length) {
          visited = visited.concat(ev.visitedDelta);
          // Visited nodes leave the frontier
          if (frontier.size > 0) {
            const f = new Set(frontier);
            for (const id of ev.visitedDelta) f.delete(id);
            frontier = f;
          }
        }
        // crude frontier proxy: derived from frontierSize is unknown nodes;
        // we track 'current' as the active expansion node and rely on
        // visited gradient to convey wavefront.
        current = ev.current;
        ops = ev.ops;
        if (ev.done) {
          result = ev.result ?? null;
          status = "done";
          break;
        }
      }
      if (!touched && status !== "done") return prev;
      return { visited, frontier, current, ops, result, status };
    });
  }, []);

  const start = useCallback(
    (algo: AlgoName, graph: RoadGraph, source: NodeId, target: NodeId) => {
      reset();
      const gen = runAlgorithm(algo, graph, source, target);
      genRef.current = gen;
      setState({ ...initial, status: "running" });
      timerRef.current = window.setInterval(tick, intervalRef.current);
    },
    [reset, tick],
  );

  const pause = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState((s) => (s.status === "running" ? { ...s, status: "paused" } : s));
  }, []);

  const resume = useCallback(() => {
    if (timerRef.current !== null) return;
    setState((s) => (s.status === "paused" ? { ...s, status: "running" } : s));
    timerRef.current = window.setInterval(tick, intervalRef.current);
  }, [tick]);

  const stepOnce = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const prev = speedRef.current;
    speedRef.current = 1;
    tick();
    speedRef.current = prev;
    setState((s) => (s.status === "running" ? { ...s, status: "paused" } : s));
  }, [tick]);

  // Stop when done
  useEffect(() => {
    if (state.status === "done" && timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [state.status]);

  useEffect(() => () => reset(), [reset]);

  return { state, start, pause, resume, stepOnce, reset, setSpeed };
}
