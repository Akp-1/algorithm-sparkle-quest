// Pathfinding algorithms — all implemented as generators that yield
// step snapshots for animation. The final yielded step has `done = true`
// and a `result` field with the full statistics.

import { MinHeap } from "./priority-queue";
import { haversine } from "./haversine";
import type { AlgoName, AlgoResult, NodeId, RoadGraph } from "./types";

export interface StepEvent {
  done: boolean;
  current: NodeId | null;
  visitedDelta: NodeId[]; // nodes added to visited set this step
  frontierSize: number;
  ops: number;
  result?: AlgoResult;
  // For incremental animation we also expose the relaxed edge.
  relaxed?: { from: NodeId; to: NodeId };
}

function reconstruct(prev: Map<NodeId, NodeId>, target: NodeId): NodeId[] {
  const path: NodeId[] = [];
  let cur: NodeId | undefined = target;
  while (cur !== undefined) {
    path.push(cur);
    cur = prev.get(cur);
  }
  return path.reverse();
}

function pathDistance(graph: RoadGraph, path: NodeId[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.adj.get(path[i]) ?? [];
    const e = edges.find((x) => x.to === path[i + 1]);
    if (e) total += e.weight;
  }
  return total;
}

// ============ DIJKSTRA ============
export function* dijkstra(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();
  const dist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const visited = new Set<NodeId>();
  const pq = new MinHeap<NodeId>();
  let ops = 0;
  let edgesRelaxed = 0;

  dist.set(source, 0);
  pq.push(0, source);

  while (pq.size > 0) {
    const { key: d, value: u } = pq.pop()!;
    ops++;
    if (visited.has(u)) continue;
    visited.add(u);

    yield {
      done: false,
      current: u,
      visitedDelta: [u],
      frontierSize: pq.size,
      ops,
    };

    if (u === target) {
      const path = reconstruct(prev, target);
      yield {
        done: true,
        current: u,
        visitedDelta: [],
        frontierSize: pq.size,
        ops,
        result: {
          found: true,
          path,
          distance: d,
          visitedCount: visited.size,
          edgesRelaxed,
          ops,
          runtimeMs: performance.now() - start,
        },
      };
      return;
    }

    for (const e of graph.adj.get(u) ?? []) {
      ops++;
      edgesRelaxed++;
      const nd = d + e.weight;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, u);
        pq.push(nd, e.to);
      }
    }
  }

  yield {
    done: true,
    current: null,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found: false,
      path: [],
      distance: 0,
      visitedCount: visited.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ A* ============
export function* astar(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();
  const g = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const visited = new Set<NodeId>();
  const pq = new MinHeap<NodeId>();
  let ops = 0;
  let edgesRelaxed = 0;

  const targetNode = graph.nodes.get(target)!;
  const h = (id: NodeId) => {
    const n = graph.nodes.get(id)!;
    return haversine(n.lat, n.lon, targetNode.lat, targetNode.lon);
  };

  g.set(source, 0);
  pq.push(h(source), source);

  while (pq.size > 0) {
    const { value: u } = pq.pop()!;
    ops++;
    if (visited.has(u)) continue;
    visited.add(u);

    yield {
      done: false,
      current: u,
      visitedDelta: [u],
      frontierSize: pq.size,
      ops,
    };

    if (u === target) {
      const path = reconstruct(prev, target);
      yield {
        done: true,
        current: u,
        visitedDelta: [],
        frontierSize: pq.size,
        ops,
        result: {
          found: true,
          path,
          distance: g.get(u) ?? 0,
          visitedCount: visited.size,
          edgesRelaxed,
          ops,
          runtimeMs: performance.now() - start,
        },
      };
      return;
    }

    const gu = g.get(u)!;
    for (const e of graph.adj.get(u) ?? []) {
      ops++;
      edgesRelaxed++;
      const ng = gu + e.weight;
      if (ng < (g.get(e.to) ?? Infinity)) {
        g.set(e.to, ng);
        prev.set(e.to, u);
        pq.push(ng + h(e.to), e.to);
      }
    }
  }

  yield {
    done: true,
    current: null,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found: false,
      path: [],
      distance: 0,
      visitedCount: visited.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ BFS (unweighted shortest by hops) ============
export function* bfs(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();
  const visited = new Set<NodeId>([source]);
  const prev = new Map<NodeId, NodeId>();
  const queue: NodeId[] = [source];
  let ops = 0;
  let edgesRelaxed = 0;

  while (queue.length) {
    const u = queue.shift()!;
    ops++;

    yield {
      done: false,
      current: u,
      visitedDelta: [u],
      frontierSize: queue.length,
      ops,
    };

    if (u === target) {
      const path = reconstruct(prev, target);
      yield {
        done: true,
        current: u,
        visitedDelta: [],
        frontierSize: queue.length,
        ops,
        result: {
          found: true,
          path,
          distance: pathDistance(graph, path),
          visitedCount: visited.size,
          edgesRelaxed,
          ops,
          runtimeMs: performance.now() - start,
        },
      };
      return;
    }

    for (const e of graph.adj.get(u) ?? []) {
      ops++;
      edgesRelaxed++;
      if (!visited.has(e.to)) {
        visited.add(e.to);
        prev.set(e.to, u);
        queue.push(e.to);
      }
    }
  }

  yield {
    done: true,
    current: null,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found: false,
      path: [],
      distance: 0,
      visitedCount: visited.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ DFS (not optimal, kept for comparison) ============
export function* dfs(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();
  const visited = new Set<NodeId>();
  const prev = new Map<NodeId, NodeId>();
  const stack: NodeId[] = [source];
  let ops = 0;
  let edgesRelaxed = 0;

  while (stack.length) {
    const u = stack.pop()!;
    ops++;
    if (visited.has(u)) continue;
    visited.add(u);

    yield {
      done: false,
      current: u,
      visitedDelta: [u],
      frontierSize: stack.length,
      ops,
    };

    if (u === target) {
      const path = reconstruct(prev, target);
      yield {
        done: true,
        current: u,
        visitedDelta: [],
        frontierSize: stack.length,
        ops,
        result: {
          found: true,
          path,
          distance: pathDistance(graph, path),
          visitedCount: visited.size,
          edgesRelaxed,
          ops,
          runtimeMs: performance.now() - start,
        },
      };
      return;
    }

    for (const e of graph.adj.get(u) ?? []) {
      ops++;
      edgesRelaxed++;
      if (!visited.has(e.to)) {
        if (!prev.has(e.to)) prev.set(e.to, u);
        stack.push(e.to);
      }
    }
  }

  yield {
    done: true,
    current: null,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found: false,
      path: [],
      distance: 0,
      visitedCount: visited.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ BELLMAN-FORD ============
// We adapt classic Bellman-Ford to emit steps per-relaxation pass.
export function* bellmanFord(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();
  const dist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const allNodes = Array.from(graph.nodes.keys());
  dist.set(source, 0);
  let ops = 0;
  let edgesRelaxed = 0;
  const visitedEmitted = new Set<NodeId>();

  for (let i = 0; i < allNodes.length - 1; i++) {
    let changed = false;
    const newlyTouched: NodeId[] = [];
    for (const u of allNodes) {
      const du = dist.get(u);
      if (du === undefined) continue;
      for (const e of graph.adj.get(u) ?? []) {
        ops++;
        edgesRelaxed++;
        const nd = du + e.weight;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, u);
          changed = true;
          if (!visitedEmitted.has(e.to)) {
            visitedEmitted.add(e.to);
            newlyTouched.push(e.to);
          }
        }
      }
    }
    if (newlyTouched.length) {
      yield {
        done: false,
        current: newlyTouched[newlyTouched.length - 1],
        visitedDelta: newlyTouched,
        frontierSize: 0,
        ops,
      };
    }
    if (!changed) break;
  }

  const found = dist.has(target);
  const path = found ? reconstruct(prev, target) : [];
  yield {
    done: true,
    current: target,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found,
      path,
      distance: dist.get(target) ?? 0,
      visitedCount: visitedEmitted.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ BIDIRECTIONAL DIJKSTRA ============
export function* bidirectionalDijkstra(
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  const start = performance.now();

  const distF = new Map<NodeId, number>([[source, 0]]);
  const distB = new Map<NodeId, number>([[target, 0]]);
  const prevF = new Map<NodeId, NodeId>();
  const prevB = new Map<NodeId, NodeId>();
  const visitedF = new Set<NodeId>();
  const visitedB = new Set<NodeId>();
  const pqF = new MinHeap<NodeId>();
  const pqB = new MinHeap<NodeId>();
  pqF.push(0, source);
  pqB.push(0, target);

  let best = Infinity;
  let meetNode: NodeId | null = null;
  let ops = 0;
  let edgesRelaxed = 0;

  const stepDir = (
    pq: MinHeap<NodeId>,
    dist: Map<NodeId, number>,
    prev: Map<NodeId, NodeId>,
    visited: Set<NodeId>,
    otherDist: Map<NodeId, number>,
    otherVisited: Set<NodeId>,
  ): NodeId | null => {
    while (pq.size > 0) {
      const { value: u, key: du } = pq.pop()!;
      ops++;
      if (visited.has(u)) continue;
      visited.add(u);

      // Meeting check
      const od = otherDist.get(u);
      if (od !== undefined) {
        const total = du + od;
        if (total < best) {
          best = total;
          meetNode = u;
        }
      }

      for (const e of graph.adj.get(u) ?? []) {
        ops++;
        edgesRelaxed++;
        const nd = du + e.weight;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, u);
          pq.push(nd, e.to);
        }
      }
      return u;
    }
    return null;
  };

  while (pqF.size > 0 && pqB.size > 0) {
    const topF = (pqF as unknown as { heap: { key: number }[] }).heap[0]?.key ?? Infinity;
    const topB = (pqB as unknown as { heap: { key: number }[] }).heap[0]?.key ?? Infinity;
    if (best <= topF + topB) break;

    if (pqF.size <= pqB.size) {
      const u = stepDir(pqF, distF, prevF, visitedF, distB, visitedB);
      if (u !== null) {
        yield {
          done: false,
          current: u,
          visitedDelta: [u],
          frontierSize: pqF.size + pqB.size,
          ops,
        };
      }
    } else {
      const u = stepDir(pqB, distB, prevB, visitedB, distF, visitedF);
      if (u !== null) {
        yield {
          done: false,
          current: u,
          visitedDelta: [u],
          frontierSize: pqF.size + pqB.size,
          ops,
        };
      }
    }
  }

  let path: NodeId[] = [];
  if (meetNode !== null) {
    const left = reconstruct(prevF, meetNode);
    const right: NodeId[] = [];
    let cur: NodeId | undefined = prevB.get(meetNode);
    while (cur !== undefined) {
      right.push(cur);
      cur = prevB.get(cur);
    }
    path = [...left, ...right];
  }

  yield {
    done: true,
    current: meetNode,
    visitedDelta: [],
    frontierSize: 0,
    ops,
    result: {
      found: meetNode !== null,
      path,
      distance: meetNode !== null ? best : 0,
      visitedCount: visitedF.size + visitedB.size,
      edgesRelaxed,
      ops,
      runtimeMs: performance.now() - start,
    },
  };
}

// ============ Dispatcher ============
export function runAlgorithm(
  name: AlgoName,
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): Generator<StepEvent, void, void> {
  switch (name) {
    case "dijkstra":
      return dijkstra(graph, source, target);
    case "astar":
      return astar(graph, source, target);
    case "bellman-ford":
      return bellmanFord(graph, source, target);
    case "bfs":
      return bfs(graph, source, target);
    case "dfs":
      return dfs(graph, source, target);
    case "bidirectional-dijkstra":
      return bidirectionalDijkstra(graph, source, target);
  }
}

// Run to completion without animation. Returns final result + per-step path.
export function runToEnd(
  name: AlgoName,
  graph: RoadGraph,
  source: NodeId,
  target: NodeId,
): AlgoResult {
  const gen = runAlgorithm(name, graph, source, target);
  let last: StepEvent | undefined;
  for (const step of gen) {
    last = step;
    if (step.done) break;
  }
  return last!.result!;
}
