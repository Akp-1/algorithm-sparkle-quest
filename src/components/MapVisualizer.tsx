import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGoogleMaps,
  useMapInstance,
} from "@/hooks/use-google-maps";
import { useVisualizer } from "@/hooks/use-visualizer";
import {
  bboxAround,
  fetchRoadGraph,
  nearestNode,
} from "@/lib/graph/overpass";
import type { RoadGraph } from "@/lib/graph/types";
import {
  createCanvasOverlay,
  type CanvasOverlayState,
} from "@/lib/maps/canvas-overlay";
import { ALGORITHMS, type AlgoName } from "@/lib/graph/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  MapPin,
  Flag,
  Loader2,
} from "lucide-react";

interface Pin {
  lat: number;
  lng: number;
}

export function MapVisualizer() {
  const { maps, error: mapsError } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useMapInstance(containerRef, maps);
  const overlayRef = useRef<InstanceType<
    ReturnType<typeof createCanvasOverlay>
  > | null>(null);

  const [source, setSource] = useState<Pin | null>(null);
  const [target, setTarget] = useState<Pin | null>(null);
  const [pickMode, setPickMode] = useState<"source" | "target">("source");
  const [graph, setGraph] = useState<RoadGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [algo, setAlgo] = useState<AlgoName>("astar");
  const [speed, setSpeedLocal] = useState(40);

  const { state, start, pause, resume, stepOnce, reset, setSpeed } =
    useVisualizer();

  // Wire speed
  useEffect(() => {
    setSpeed(speed);
  }, [speed, setSpeed]);

  // Init overlay once
  useEffect(() => {
    if (!maps || !map || overlayRef.current) return;
    const Overlay = createCanvasOverlay(maps);
    const ov = new Overlay();
    ov.setMap(map);
    overlayRef.current = ov;
    return () => {
      ov.destroy();
      overlayRef.current = null;
    };
  }, [maps, map]);

  // Map click → place pin
  useEffect(() => {
    if (!map || !maps) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (pickMode === "source") {
        setSource(p);
        setPickMode("target");
      } else {
        setTarget(p);
        setPickMode("source");
      }
      reset();
      setGraph(null);
    });
    return () => {
      maps.event.removeListener(listener);
    };
  }, [map, maps, pickMode, reset]);

  // Recompute overlay state whenever anything visual changes
  const sourceNodeId = useMemo(() => {
    if (!graph || !source) return null;
    return nearestNode(graph, source.lat, source.lng);
  }, [graph, source]);

  const targetNodeId = useMemo(() => {
    if (!graph || !target) return null;
    return nearestNode(graph, target.lat, target.lng);
  }, [graph, target]);

  useEffect(() => {
    if (!overlayRef.current || !graph) return;
    const ovState: CanvasOverlayState = {
      nodes: graph.nodes,
      visited: state.visited,
      frontier: state.frontier,
      path: state.result?.path ?? [],
      source: sourceNodeId,
      target: targetNodeId,
    };
    overlayRef.current.update(ovState);
  }, [graph, state, sourceNodeId, targetNodeId]);

  // Fit bounds when both pins are set
  useEffect(() => {
    if (!map || !maps || !source || !target) return;
    const bounds = new maps.LatLngBounds();
    bounds.extend(source);
    bounds.extend(target);
    map.fitBounds(bounds, 80);
  }, [map, maps, source, target]);

  const handleLoadGraph = async () => {
    if (!source || !target) return;
    setGraphLoading(true);
    setGraphError(null);
    reset();
    try {
      const bbox = bboxAround(
        { lat: source.lat, lon: source.lng },
        { lat: target.lat, lon: target.lng },
        0.004,
      );
      const g = await fetchRoadGraph(bbox);
      if (g.nodes.size === 0) {
        throw new Error("No road data in this area. Try a more urban location.");
      }
      setGraph(g);
    } catch (err) {
      setGraphError(err instanceof Error ? err.message : String(err));
    } finally {
      setGraphLoading(false);
    }
  };

  const handleRun = () => {
    if (!graph || sourceNodeId === null || targetNodeId === null) return;
    start(algo, graph, sourceNodeId, targetNodeId);
  };

  const handleReset = () => {
    reset();
  };

  const canLoad = source && target && !graphLoading;
  const canRun = graph && sourceNodeId !== null && targetNodeId !== null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 p-3 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 space-y-3 lg:w-80">
        <Card className="space-y-3 border-border bg-card p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            01 · Endpoints
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => setPickMode("source")}
              className={`flex w-full items-start gap-3 rounded-md border p-2 text-left transition ${
                pickMode === "source"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50"
              }`}
            >
              <MapPin className="mt-0.5 h-4 w-4 text-[color:var(--viz-source)]" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Source</div>
                <div className="truncate font-mono text-xs">
                  {source
                    ? `${source.lat.toFixed(4)}, ${source.lng.toFixed(4)}`
                    : "click on map…"}
                </div>
              </div>
            </button>
            <button
              onClick={() => setPickMode("target")}
              className={`flex w-full items-start gap-3 rounded-md border p-2 text-left transition ${
                pickMode === "target"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50"
              }`}
            >
              <Flag className="mt-0.5 h-4 w-4 text-[color:var(--viz-target)]" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Destination</div>
                <div className="truncate font-mono text-xs">
                  {target
                    ? `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}`
                    : "click on map…"}
                </div>
              </div>
            </button>
          </div>
          <Button
            className="w-full"
            variant="secondary"
            disabled={!canLoad}
            onClick={handleLoadGraph}
          >
            {graphLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading road graph…
              </>
            ) : graph ? (
              "Reload road graph"
            ) : (
              "Load road graph"
            )}
          </Button>
          {graphError && (
            <p className="text-xs text-destructive">{graphError}</p>
          )}
          {graph && (
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono">
                |V| {graph.nodes.size}
              </Badge>
              <Badge variant="outline" className="font-mono">
                |E| {countEdges(graph)}
              </Badge>
            </div>
          )}
        </Card>

        <Card className="space-y-3 border-border bg-card p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            02 · Algorithm
          </h2>
          <Select value={algo} onValueChange={(v) => setAlgo(v as AlgoName)}>
            <SelectTrigger>
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
          <div className="space-y-1 rounded-md bg-secondary/50 p-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Time</span>
              <span className="font-mono text-foreground">
                {ALGORITHMS.find((a) => a.id === algo)!.timeComplexity}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Space</span>
              <span className="font-mono text-foreground">
                {ALGORITHMS.find((a) => a.id === algo)!.spaceComplexity}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Optimal</span>
              <span
                className={
                  ALGORITHMS.find((a) => a.id === algo)!.optimal
                    ? "text-[color:var(--viz-source)]"
                    : "text-destructive"
                }
              >
                {ALGORITHMS.find((a) => a.id === algo)!.optimal ? "yes" : "no"}
              </span>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 border-border bg-card p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            03 · Run
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Speed</span>
              <span className="font-mono">{speed} steps/frame</span>
            </div>
            <Slider
              min={1}
              max={200}
              step={1}
              value={[speed]}
              onValueChange={(v) => setSpeedLocal(v[0])}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {state.status === "running" ? (
              <Button onClick={pause} variant="secondary">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : state.status === "paused" ? (
              <Button onClick={resume}>
                <Play className="h-4 w-4" /> Resume
              </Button>
            ) : (
              <Button onClick={handleRun} disabled={!canRun}>
                <Play className="h-4 w-4" /> Run
              </Button>
            )}
            <Button
              onClick={stepOnce}
              variant="secondary"
              disabled={!canRun || state.status === "done"}
            >
              <StepForward className="h-4 w-4" /> Step
            </Button>
          </div>
          <Button onClick={handleReset} variant="ghost" className="w-full">
            <RotateCcw className="h-4 w-4" /> Reset run
          </Button>
        </Card>

        <Card className="space-y-2 border-border bg-card p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            04 · Live metrics
          </h2>
          <Metric label="Visited" value={state.visited.length.toLocaleString()} />
          <Metric label="Operations" value={state.ops.toLocaleString()} />
          {state.result && (
            <>
              <Metric
                label="Path nodes"
                value={state.result.path.length.toLocaleString()}
              />
              <Metric
                label="Distance"
                value={
                  state.result.found
                    ? `${(state.result.distance / 1000).toFixed(2)} km`
                    : "no path"
                }
              />
              <Metric
                label="Edges relaxed"
                value={state.result.edgesRelaxed.toLocaleString()}
              />
              <Metric
                label="Runtime"
                value={`${state.result.runtimeMs.toFixed(1)} ms`}
              />
            </>
          )}
        </Card>
      </aside>

      {/* Map */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-secondary">
        {mapsError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 p-6 text-center">
            <p className="text-sm text-destructive">{mapsError}</p>
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <Legend color="var(--viz-source)" label="Source" />
          <Legend color="var(--viz-target)" label="Destination" />
          <Legend color="var(--viz-visited)" label="Visited" />
          <Legend color="var(--viz-frontier)" label="Frontier" />
          <Legend color="var(--viz-path)" label="Shortest path" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: `oklch(${color})` }}
      />
      {label}
    </div>
  );
}

function countEdges(g: RoadGraph): number {
  let n = 0;
  g.adj.forEach((edges) => (n += edges.length));
  return n;
}
