// Fetch a drivable road network from OpenStreetMap Overpass API and
// turn it into a weighted graph.

import { haversine } from "./haversine";
import type { GraphNode, RoadGraph } from "./types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}
interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}
type OverpassEl = OverpassNode | OverpassWay;

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function bboxAround(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  paddingDeg = 0.005,
): BBox {
  return {
    south: Math.min(a.lat, b.lat) - paddingDeg,
    west: Math.min(a.lon, b.lon) - paddingDeg,
    north: Math.max(a.lat, b.lat) + paddingDeg,
    east: Math.max(a.lon, b.lon) + paddingDeg,
  };
}

export async function fetchRoadGraph(bbox: BBox): Promise<RoadGraph> {
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|living_street|service)$"]
        (${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    (._;>;);
    out body;
  `.trim();

  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`Overpass ${endpoint} ${res.status}`);
      const data = (await res.json()) as { elements: OverpassEl[] };
      return buildGraph(data.elements);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    "Could not load road data. The map service is busy — please retry in a few seconds. " +
      String(lastErr),
  );
}

function buildGraph(elements: OverpassEl[]): RoadGraph {
  const nodes = new Map<number, GraphNode>();
  const adj = new Map<number, { to: number; weight: number }[]>();

  for (const el of elements) {
    if (el.type === "node") {
      nodes.set(el.id, { id: el.id, lat: el.lat, lon: el.lon });
    }
  }

  const addEdge = (a: number, b: number, w: number) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, weight: w });
  };

  for (const el of elements) {
    if (el.type !== "way") continue;
    const oneway = el.tags?.oneway === "yes" || el.tags?.junction === "roundabout";
    for (let i = 0; i < el.nodes.length - 1; i++) {
      const a = nodes.get(el.nodes[i]);
      const b = nodes.get(el.nodes[i + 1]);
      if (!a || !b) continue;
      const w = haversine(a.lat, a.lon, b.lat, b.lon);
      addEdge(a.id, b.id, w);
      if (!oneway) addEdge(b.id, a.id, w);
    }
  }

  // Keep only nodes that actually have edges (or are referenced as targets).
  const referenced = new Set<number>();
  adj.forEach((edges, from) => {
    referenced.add(from);
    for (const e of edges) referenced.add(e.to);
  });
  for (const id of Array.from(nodes.keys())) {
    if (!referenced.has(id)) nodes.delete(id);
  }

  return { nodes, adj };
}

// Snap a lat/lon to the closest node in the graph.
export function nearestNode(
  graph: RoadGraph,
  lat: number,
  lon: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  graph.nodes.forEach((n) => {
    const d = haversine(lat, lon, n.lat, n.lon);
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  });
  return best;
}
