// Graph types shared across all algorithms.

export type NodeId = number;

export interface GraphNode {
  id: NodeId;
  lat: number;
  lon: number;
}

export interface Edge {
  to: NodeId;
  weight: number; // meters
}

export interface RoadGraph {
  nodes: Map<NodeId, GraphNode>;
  adj: Map<NodeId, Edge[]>;
}

// A single animation step emitted by an algorithm generator.
export interface AlgoStep {
  visited: NodeId[]; // newly visited this step
  frontier: NodeId[]; // current frontier (open set)
  current: NodeId | null;
  relaxedEdge?: { from: NodeId; to: NodeId } | null;
  ops: number; // cumulative basic operations counted
}

// Final result yielded as the last value.
export interface AlgoResult {
  found: boolean;
  path: NodeId[]; // empty if not found
  distance: number; // total path weight (meters)
  visitedCount: number;
  edgesRelaxed: number;
  ops: number;
  runtimeMs: number;
}

export type AlgoName =
  | "dijkstra"
  | "astar"
  | "bellman-ford"
  | "bfs"
  | "dfs"
  | "bidirectional-dijkstra";

export interface AlgoMeta {
  id: AlgoName;
  name: string;
  shortName: string;
  timeComplexity: string;
  spaceComplexity: string;
  optimal: boolean;
  weighted: boolean;
  blurb: string;
}

export const ALGORITHMS: AlgoMeta[] = [
  {
    id: "dijkstra",
    name: "Dijkstra's Algorithm",
    shortName: "Dijkstra",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
    optimal: true,
    weighted: true,
    blurb:
      "Classic single-source shortest path for graphs with non-negative weights. Uses a priority queue to greedily expand the closest unvisited node.",
  },
  {
    id: "astar",
    name: "A* Search",
    shortName: "A*",
    timeComplexity: "O(E)",
    spaceComplexity: "O(V)",
    optimal: true,
    weighted: true,
    blurb:
      "Heuristic-guided Dijkstra. Uses straight-line (Haversine) distance to the goal as an admissible heuristic, dramatically reducing nodes explored on geographic graphs.",
  },
  {
    id: "bellman-ford",
    name: "Bellman-Ford",
    shortName: "Bellman-Ford",
    timeComplexity: "O(V · E)",
    spaceComplexity: "O(V)",
    optimal: true,
    weighted: true,
    blurb:
      "Handles negative edge weights (and detects negative cycles) by relaxing every edge V−1 times. Slower than Dijkstra but more general.",
  },
  {
    id: "bfs",
    name: "Breadth-First Search",
    shortName: "BFS",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    optimal: false,
    weighted: false,
    blurb:
      "Finds the path with the fewest edges (hops). Not optimal for weighted road networks — minimum hops ≠ minimum distance.",
  },
  {
    id: "dfs",
    name: "Depth-First Search",
    shortName: "DFS",
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    optimal: false,
    weighted: false,
    blurb:
      "Explores as deep as possible before backtracking. Shown here as a baseline — DFS does NOT find shortest paths and is for comparison only.",
  },
  {
    id: "bidirectional-dijkstra",
    name: "Bidirectional Dijkstra",
    shortName: "Bi-Dijkstra",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
    optimal: true,
    weighted: true,
    blurb:
      "Runs two Dijkstra searches simultaneously — one from source, one from destination — and stops when they meet. Roughly halves the search space in practice.",
  },
];

export function getAlgoMeta(id: AlgoName): AlgoMeta {
  const m = ALGORITHMS.find((a) => a.id === id);
  if (!m) throw new Error(`Unknown algorithm: ${id}`);
  return m;
}
