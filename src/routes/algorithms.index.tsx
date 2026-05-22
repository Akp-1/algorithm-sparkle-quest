import { createFileRoute, Link } from "@tanstack/react-router";
import { ALGORITHMS } from "@/lib/graph/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/algorithms/")({
  head: () => ({
    meta: [
      { title: "Algorithms · Pathfinder" },
      {
        name: "description",
        content:
          "Reference pages with pseudocode, complexity and trade-offs for every shortest-path algorithm in the visualizer.",
      },
      { property: "og:title", content: "Algorithm reference" },
      {
        property: "og:description",
        content: "Pseudocode and analysis for Dijkstra, A*, Bellman-Ford and more.",
      },
    ],
  }),
  component: AlgorithmsIndex,
});

function AlgorithmsIndex() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Algorithm reference</h1>
        <p className="text-sm text-muted-foreground">
          Click any algorithm for pseudocode, complexity and design notes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ALGORITHMS.map((a) => (
          <Link
            key={a.id}
            to="/algorithms/$name"
            params={{ name: a.id }}
            className="group"
          >
            <Card className="space-y-2 border-border bg-card p-4 transition group-hover:border-primary">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{a.name}</h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {a.timeComplexity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{a.blurb}</p>
              <div className="flex gap-2 pt-1">
                <Badge
                  variant={a.optimal ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {a.optimal ? "Optimal" : "Not optimal"}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {a.weighted ? "Weighted" : "Unweighted"}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
