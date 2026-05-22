import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALGORITHMS, type AlgoName, type RoadGraph } from "@/lib/graph/types";
import { runToEnd } from "@/lib/graph/algorithms";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Loader2, Play, Download } from "lucide-react";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Complexity Analysis · Pathfinder" },
      {
        name: "description",
        content:
          "Empirical Big-O analysis. Run algorithms on grid graphs of increasing size and chart runtime vs theoretical complexity.",
      },
      { property: "og:title", content: "Empirical complexity analysis" },
      {
        property: "og:description",
        content: "Measure runtime growth and compare to theoretical Big-O.",
      },
    ],
  }),
  component: AnalysisPage,
});

// Build a synthetic grid road graph for reproducible empirical timing.
function buildGrid(size: number): RoadGraph {
  const nodes = new Map<number, { id: number; lat: number; lon: number }>();
  const adj = new Map<number, { to: number; weight: number }[]>();
  const id = (r: number, c: number) => r * size + c;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = id(r, c);
      nodes.set(i, { id: i, lat: r * 0.0009, lon: c * 0.0009 });
      adj.set(i, []);
    }
  }
  const link = (a: number, b: number, w: number) => {
    adj.get(a)!.push({ to: b, weight: w });
    adj.get(b)!.push({ to: a, weight: w });
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = id(r, c);
      if (c + 1 < size) link(i, id(r, c + 1), 1 + Math.random() * 0.3);
      if (r + 1 < size) link(i, id(r + 1, c), 1 + Math.random() * 0.3);
    }
  }
  return { nodes, adj };
}

interface Row {
  V: number;
  E: number;
  [algo: string]: number;
}

function AnalysisPage() {
  const [selected, setSelected] = useState<AlgoName[]>([
    "dijkstra",
    "astar",
    "bfs",
  ]);
  const [maxSize, setMaxSize] = useState<AlgoName | "small" | "medium" | "large">(
    "medium",
  );
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const sizes =
    maxSize === "small"
      ? [10, 15, 20, 25, 30, 40]
      : maxSize === "large"
        ? [10, 20, 30, 40, 60, 80, 100, 120]
        : [10, 20, 30, 40, 60, 80];

  const toggle = (a: AlgoName) => {
    setSelected((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const run = async () => {
    setRunning(true);
    setRows([]);
    const newRows: Row[] = [];
    for (const s of sizes) {
      const g = buildGrid(s);
      const V = g.nodes.size;
      let E = 0;
      g.adj.forEach((e) => (E += e.length));
      const src = 0;
      const tgt = V - 1;
      const row: Row = { V, E };
      for (const algo of selected) {
        // Bellman-Ford on V=100x100 = 10k is too slow; cap
        if (algo === "bellman-ford" && V > 1600) {
          row[algo] = NaN;
          continue;
        }
        const r = runToEnd(algo, g, src, tgt);
        row[algo] = +r.runtimeMs.toFixed(2);
      }
      newRows.push(row);
      setRows([...newRows]);
      await new Promise((r) => setTimeout(r, 0));
    }
    setRunning(false);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ["V", "E", ...selected];
    const lines = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => r[h] ?? "").join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pathfinder-complexity.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const colors = ["#5fd9ff", "#cfff66", "#ff7a4a", "#b794f6", "#5fe89a", "#fbb6ce"];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Empirical complexity analysis</h1>
        <p className="text-sm text-muted-foreground">
          Run each algorithm on synthetic grid graphs of growing size, measure
          wall-clock runtime, and chart it against theoretical Big-O.
        </p>
      </div>

      <Card className="space-y-4 border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {ALGORITHMS.map((a, i) => (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition ${
                selected.includes(a.id)
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              {a.shortName}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={maxSize as string}
            onValueChange={(v) => setMaxSize(v as never)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small grids (V up to 1.6k)</SelectItem>
              <SelectItem value="medium">Medium grids (V up to 6.4k)</SelectItem>
              <SelectItem value="large">Large grids (V up to 14.4k)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={running || selected.length === 0}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run benchmark
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card p-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke="oklch(0.32 0.03 252)" strokeDasharray="3 3" />
              <XAxis
                dataKey="V"
                stroke="oklch(0.7 0.02 245)"
                label={{ value: "|V|", position: "insideBottom", offset: -2 }}
              />
              <YAxis
                stroke="oklch(0.7 0.02 245)"
                label={{ value: "ms", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.22 0.035 252)",
                  border: "1px solid oklch(0.32 0.03 252)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {selected.map((a, i) => (
                <Line
                  key={a}
                  type="monotone"
                  dataKey={a}
                  stroke={colors[ALGORITHMS.findIndex((x) => x.id === a) % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card className="overflow-x-auto border-border bg-card p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 font-mono">|V|</th>
                <th className="font-mono">|E|</th>
                {selected.map((a) => (
                  <th key={a} className="font-mono">
                    {ALGORITHMS.find((x) => x.id === a)!.shortName} (ms)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.V} className="border-t border-border">
                  <td className="py-1.5 font-mono">{r.V}</td>
                  <td className="font-mono">{r.E}</td>
                  {selected.map((a) => (
                    <td key={a} className="font-mono">
                      {Number.isNaN(r[a]) ? "—" : r[a]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
