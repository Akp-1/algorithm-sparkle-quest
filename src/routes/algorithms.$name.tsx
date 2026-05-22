import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ALGORITHMS, type AlgoName } from "@/lib/graph/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/algorithms/$name")({
  head: ({ params }) => {
    const a = ALGORITHMS.find((x) => x.id === params.name);
    const title = a ? `${a.name} · Pathfinder` : "Algorithm · Pathfinder";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: a?.blurb ?? "Algorithm reference page.",
        },
        { property: "og:title", content: title },
        { property: "og:description", content: a?.blurb ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const meta = ALGORITHMS.find((x) => x.id === params.name);
    if (!meta) throw notFound();
    return { meta };
  },
  component: AlgorithmPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-xl font-semibold">Algorithm not found</h1>
      <Link to="/algorithms" className="text-primary">
        Back to list
      </Link>
    </div>
  ),
});

const PSEUDOCODE: Record<AlgoName, string> = {
  dijkstra: `function dijkstra(G, s, t):
    dist[v] ← ∞ for all v; dist[s] ← 0
    prev[v] ← undefined
    Q ← min-priority-queue keyed by dist
    Q.push(s, 0)
    while Q not empty:
        u ← Q.pop()                 // node with smallest dist
        if u = t: return reconstruct(prev, t)
        if u visited: continue
        mark u visited
        for each edge (u, v, w) in G:
            alt ← dist[u] + w
            if alt < dist[v]:
                dist[v] ← alt
                prev[v] ← u
                Q.push(v, alt)
    return ∅`,
  astar: `function aStar(G, s, t, h):
    g[v] ← ∞; g[s] ← 0
    Q ← min-priority-queue keyed by f = g + h
    Q.push(s, h(s))
    while Q not empty:
        u ← Q.pop()
        if u = t: return reconstruct(prev, t)
        mark u visited
        for each edge (u, v, w):
            ng ← g[u] + w
            if ng < g[v]:
                g[v] ← ng; prev[v] ← u
                Q.push(v, ng + h(v))
    return ∅
// h(v) must be admissible (≤ true cost to t).
// Here h = great-circle (Haversine) distance.`,
  "bellman-ford": `function bellmanFord(G, s, t):
    dist[v] ← ∞; dist[s] ← 0
    for i in 1 .. |V|-1:
        for each edge (u, v, w) in G:
            if dist[u] + w < dist[v]:
                dist[v] ← dist[u] + w
                prev[v] ← u
    // optional: extra pass to detect negative cycles
    return reconstruct(prev, t)`,
  bfs: `function bfs(G, s, t):
    visited ← {s}
    Q ← queue([s])
    while Q not empty:
        u ← Q.dequeue()
        if u = t: return reconstruct(prev, t)
        for each neighbor v of u:
            if v not in visited:
                visited.add(v)
                prev[v] ← u
                Q.enqueue(v)
    return ∅
// Optimal in terms of #edges, NOT in distance.`,
  dfs: `function dfs(G, s, t):
    stack ← [s]
    while stack not empty:
        u ← stack.pop()
        if u visited: continue
        mark u visited
        if u = t: return reconstruct(prev, t)
        for each neighbor v of u:
            if v not visited:
                if v not in prev: prev[v] ← u
                stack.push(v)
    return ∅
// Finds *a* path. Not guaranteed shortest.`,
  "bidirectional-dijkstra": `function biDijkstra(G, s, t):
    run Dijkstra from s (forward) and from t (backward) in lock-step.
    keep two visited sets and two dist maps.
    whenever a node u is settled in one direction
        and is also reachable in the other,
        update best = min(best, distF[u] + distB[u]).
    stop when the sum of the two frontier minima ≥ best.
    return path through the meeting node u*.`,
};

function AlgorithmPage() {
  const { meta } = Route.useLoaderData();
  const code = PSEUDOCODE[meta.id as AlgoName];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link
        to="/algorithms"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All algorithms
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{meta.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Time" value={meta.timeComplexity} />
        <Stat label="Space" value={meta.spaceComplexity} />
        <Stat label="Optimal" value={meta.optimal ? "Yes" : "No"} />
        <Stat label="Weighted" value={meta.weighted ? "Yes" : "No"} />
      </div>

      <Card className="border-border bg-card p-0">
        <div className="border-b border-border px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Pseudocode
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      </Card>

      <Card className="space-y-3 border-border bg-card p-4 text-sm">
        <h2 className="font-medium">When to use</h2>
        <p className="text-muted-foreground">{whenToUse(meta.id as AlgoName)}</p>
        <h2 className="pt-2 font-medium">Trade-offs</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          {tradeoffs(meta.id as AlgoName).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function whenToUse(id: AlgoName): string {
  switch (id) {
    case "dijkstra":
      return "Single-source shortest path on graphs with non-negative weights. The textbook default for road networks.";
    case "astar":
      return "Same as Dijkstra, but when you have a goal node AND an admissible heuristic. Best choice for point-to-point routing on geographic graphs.";
    case "bellman-ford":
      return "Use when edge weights may be negative, or when you need to detect negative-weight cycles (e.g. arbitrage detection in currency graphs).";
    case "bfs":
      return "Shortest path in unweighted graphs, or whenever you want the path with the fewest hops regardless of distance.";
    case "dfs":
      return "Reachability, topological sorting, cycle detection, maze generation. Do NOT use it for shortest paths.";
    case "bidirectional-dijkstra":
      return "Point-to-point shortest path where both endpoints are known. In practice explores ~half the nodes Dijkstra would.";
  }
}

function tradeoffs(id: AlgoName): string[] {
  switch (id) {
    case "dijkstra":
      return [
        "Optimal and complete for non-negative weights.",
        "Fails on negative edges (greedy choice becomes unsafe).",
        "Heap-based version runs in O((V+E) log V).",
      ];
    case "astar":
      return [
        "Dramatically fewer node expansions than Dijkstra in practice.",
        "Optimality depends on the heuristic being admissible.",
        "Heuristic quality directly controls speed: bad h ⇒ degrades to Dijkstra.",
      ];
    case "bellman-ford":
      return [
        "Handles negative weights, detects negative cycles.",
        "O(V·E) — too slow for very large graphs.",
        "Simple to implement, no priority queue needed.",
      ];
    case "bfs":
      return [
        "O(V+E), very fast.",
        "Optimal only for unweighted graphs.",
        "On weighted road networks it returns the wrong answer.",
      ];
    case "dfs":
      return [
        "Tiny memory footprint when implemented recursively.",
        "No optimality guarantee for shortest paths.",
        "Pathological worst-case can explore most of the graph.",
      ];
    case "bidirectional-dijkstra":
      return [
        "Roughly halves visited nodes in practice.",
        "Requires the destination upfront (not a single-source algorithm).",
        "Termination condition is subtle — easy to implement incorrectly.",
      ];
  }
}
