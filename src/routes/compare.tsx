import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGoogleMaps,
  useMapInstance,
} from "@/hooks/use-google-maps";
import {
  bboxAround,
  fetchRoadGraph,
  nearestNode,
} from "@/lib/graph/overpass";
import {
  ALGORITHMS,
  type AlgoName,
  type RoadGraph,
} from "@/lib/graph/types";
import { runAlgorithm } from "@/lib/graph/algorithms";
import {
  createCanvasOverlay,
  type CanvasOverlayState,
} from "@/lib/maps/canvas-overlay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Algorithms · Pathfinder" },
      {
        name: "description",
        content:
          "Race two shortest-path algorithms side-by-side on the same road network and compare nodes explored, runtime and path length.",
      },
      { property: "og:title", content: "Side-by-side algorithm race" },
      {
        property: "og:description",
        content: "Compare Dijkstra, A*, BFS, DFS, Bellman-Ford head-to-head.",
      },
    ],
  }),
  component: ComparePage,
});

interface Pin {
  lat: number;
  lng: number;
}

function ComparePage() {
  const { maps } = useGoogleMaps();
  const [source, setSource] = useState<Pin | null>(null);
  const [target, setTarget] = useState<Pin | null>(null);
  const [graph, setGraph] = useState<RoadGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [algoA, setAlgoA] = useState<AlgoName>("dijkstra");
  const [algoB, setAlgoB] = useState<AlgoName>("astar");

  const loadGraph = async (s: Pin, t: Pin) => {
    setLoading(true);
    setError(null);
    try {
      const bbox = bboxAround(
        { lat: s.lat, lon: s.lng },
        { lat: t.lat, lon: t.lng },
        0.004,
      );
      const g = await fetchRoadGraph(bbox);
      if (g.nodes.size === 0) throw new Error("No road data here.");
      setGraph(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const sourceNodeId = useMemo(
    () => (graph && source ? nearestNode(graph, source.lat, source.lng) : null),
    [graph, source],
  );
  const targetNodeId = useMemo(
    () => (graph && target ? nearestNode(graph, target.lat, target.lng) : null),
    [graph, target],
  );

  const canRun = !!graph && sourceNodeId !== null && targetNodeId !== null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Algorithm race</h1>
        <p className="text-sm text-muted-foreground">
          Run two algorithms on the same graph and compare side-by-side.
        </p>
      </div>

      <Card className="space-y-3 border-border bg-card p-4">
        <PinPicker
          source={source}
          target={target}
          onChange={(s, t) => {
            setSource(s);
            setTarget(t);
            setGraph(null);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={!source || !target || loading}
            onClick={() => source && target && loadGraph(source, target)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </>
            ) : graph ? (
              "Reload road graph"
            ) : (
              "Load road graph"
            )}
          </Button>
          {graph && (
            <span className="font-mono text-xs text-muted-foreground">
              |V|={graph.nodes.size}
            </span>
          )}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <RaceLane
          label="Lane A"
          algo={algoA}
          onAlgoChange={setAlgoA}
          maps={maps}
          graph={graph}
          source={sourceNodeId}
          target={targetNodeId}
          canRun={canRun}
        />
        <RaceLane
          label="Lane B"
          algo={algoB}
          onAlgoChange={setAlgoB}
          maps={maps}
          graph={graph}
          source={sourceNodeId}
          target={targetNodeId}
          canRun={canRun}
        />
      </div>
    </div>
  );
}

function PinPicker({
  source,
  target,
  onChange,
}: {
  source: Pin | null;
  target: Pin | null;
  onChange: (s: Pin | null, t: Pin | null) => void;
}) {
  const { maps } = useGoogleMaps();
  const ref = useRef<HTMLDivElement>(null);
  const map = useMapInstance(ref, maps, { zoom: 13 });
  const [mode, setMode] = useState<"source" | "target">("source");

  useEffect(() => {
    if (!map || !maps) return;
    const l = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (mode === "source") {
        onChange(p, target);
        setMode("target");
      } else {
        onChange(source, p);
        setMode("source");
      }
    });
    return () => maps.event.removeListener(l);
  }, [map, maps, mode, source, target, onChange]);

  // Render simple markers via Data layer would be heavier — use circles via overlay.
  const overlayRef = useRef<InstanceType<
    ReturnType<typeof createCanvasOverlay>
  > | null>(null);
  useEffect(() => {
    if (!map || !maps || overlayRef.current) return;
    const Overlay = createCanvasOverlay(maps);
    const ov = new Overlay();
    ov.setMap(map);
    overlayRef.current = ov;
    return () => ov.destroy();
  }, [map, maps]);

  useEffect(() => {
    if (!overlayRef.current) return;
    const nodes = new Map<number, { id: number; lat: number; lon: number }>();
    if (source)
      nodes.set(-1, { id: -1, lat: source.lat, lon: source.lng });
    if (target) nodes.set(-2, { id: -2, lat: target.lat, lon: target.lng });
    overlayRef.current.update({
      nodes,
      visited: [],
      frontier: new Set(),
      path: [],
      source: source ? -1 : null,
      target: target ? -2 : null,
    } as CanvasOverlayState);
  }, [source, target]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setMode("source")}
          className={`rounded-md border px-3 py-1 ${mode === "source" ? "border-primary bg-primary/10" : "border-border"}`}
        >
          Set source
        </button>
        <button
          onClick={() => setMode("target")}
          className={`rounded-md border px-3 py-1 ${mode === "target" ? "border-primary bg-primary/10" : "border-border"}`}
        >
          Set destination
        </button>
      </div>
      <div
        ref={ref}
        className="h-64 w-full overflow-hidden rounded-md border border-border"
      />
    </div>
  );
}

function RaceLane({
  label,
  algo,
  onAlgoChange,
  maps,
  graph,
  source,
  target,
  canRun,
}: {
  label: string;
  algo: AlgoName;
  onAlgoChange: (a: AlgoName) => void;
  maps: typeof google.maps | null;
  graph: RoadGraph | null;
  source: number | null;
  target: number | null;
  canRun: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useMapInstance(ref, maps, { zoom: 14 });
  const overlayRef = useRef<InstanceType<
    ReturnType<typeof createCanvasOverlay>
  > | null>(null);
  const [stats, setStats] = useState<{
    visited: number;
    ops: number;
    distanceKm: number;
    runtimeMs: number;
    pathLen: number;
    found: boolean;
  } | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!map || !maps || overlayRef.current) return;
    const Overlay = createCanvasOverlay(maps);
    const ov = new Overlay();
    ov.setMap(map);
    overlayRef.current = ov;
    return () => ov.destroy();
  }, [map, maps]);

  useEffect(() => {
    if (!map || !graph || source === null || target === null || !maps) return;
    const s = graph.nodes.get(source);
    const t = graph.nodes.get(target);
    if (!s || !t) return;
    const b = new maps.LatLngBounds();
    b.extend({ lat: s.lat, lng: s.lon });
    b.extend({ lat: t.lat, lng: t.lon });
    map.fitBounds(b, 30);
  }, [map, maps, graph, source, target]);

  const run = async () => {
    if (!graph || source === null || target === null || !overlayRef.current)
      return;
    setRunning(true);
    setStats(null);
    const gen = runAlgorithm(algo, graph, source, target);
    const visited: number[] = [];
    let lastFlush = performance.now();
    let final: import("@/lib/graph/algorithms").StepEvent | null = null;
    for (const step of gen) {
      if (step.visitedDelta.length) visited.push(...step.visitedDelta);
      const now = performance.now();
      if (now - lastFlush > 30) {
        overlayRef.current.update({
          nodes: graph.nodes,
          visited,
          frontier: new Set(),
          path: [],
          source,
          target,
        } as CanvasOverlayState);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        lastFlush = performance.now();
      }
      if (step.done) {
        final = step;
        break;
      }
    }
    if (final?.result) {
      overlayRef.current.update({
        nodes: graph.nodes,
        visited,
        frontier: new Set(),
        path: final.result.path,
        source,
        target,
      } as CanvasOverlayState);
      setStats({
        visited: final.result.visitedCount,
        ops: final.result.ops,
        distanceKm: final.result.distance / 1000,
        runtimeMs: final.result.runtimeMs,
        pathLen: final.result.path.length,
        found: final.result.found,
      });
    }
    setRunning(false);
  };

  return (
    <Card className="space-y-3 border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Select value={algo} onValueChange={(v) => onAlgoChange(v as AlgoName)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALGORITHMS.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={ref}
        className="h-72 w-full overflow-hidden rounded-md border border-border bg-secondary"
      />
      <Button onClick={run} disabled={!canRun || running} className="w-full">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Running…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> Run
          </>
        )}
      </Button>
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Visited" value={stats.visited.toLocaleString()} />
          <Stat label="Ops" value={stats.ops.toLocaleString()} />
          <Stat label="Runtime" value={`${stats.runtimeMs.toFixed(1)} ms`} />
          <Stat
            label="Distance"
            value={stats.found ? `${stats.distanceKm.toFixed(2)} km` : "—"}
          />
          <Stat label="Path nodes" value={stats.pathLen.toLocaleString()} />
          <Stat
            label="Optimal"
            value={ALGORITHMS.find((a) => a.id === algo)!.optimal ? "yes" : "no"}
          />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
