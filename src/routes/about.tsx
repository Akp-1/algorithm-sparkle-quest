import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Pathfinder DAA Project" },
      {
        name: "description",
        content:
          "About this Design & Analysis of Algorithms project — a shortest-path visualizer on real maps.",
      },
      { property: "og:title", content: "About this project" },
      {
        property: "og:description",
        content: "DAA project: real-map shortest path visualizer.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">About this project</h1>

      <Card className="space-y-3 border-border bg-card p-5 text-sm leading-relaxed">
        <p>
          <strong>Pathfinder</strong> is a Design &amp; Analysis of Algorithms
          (DAA) project that visualizes classical shortest-path algorithms on
          real road networks. Click any two points on a real map, choose an
          algorithm, and watch it explore the graph step-by-step.
        </p>
        <p className="text-muted-foreground">
          All algorithms (Dijkstra, A*, Bellman-Ford, BFS, DFS, Bidirectional
          Dijkstra) are implemented from scratch as generator functions that
          yield per-step snapshots — making the search wavefront, frontier, and
          final path inspectable as the algorithm runs.
        </p>
      </Card>

      <Card className="space-y-2 border-border bg-card p-5 text-sm">
        <h2 className="font-medium">What's in the project</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            <Link to="/" className="text-primary">
              Visualizer
            </Link>{" "}
            — interactive map, step / play / pause, live operation counter.
          </li>
          <li>
            <Link to="/compare" className="text-primary">
              Compare
            </Link>{" "}
            — race two algorithms on the same source/destination side-by-side.
          </li>
          <li>
            <Link to="/analysis" className="text-primary">
              Analysis
            </Link>{" "}
            — empirical Big-O: runtime vs. |V| on synthetic grid graphs, CSV
            export.
          </li>
          <li>
            <Link to="/algorithms" className="text-primary">
              Algorithms
            </Link>{" "}
            — pseudocode, complexity and trade-offs for each method.
          </li>
        </ul>
      </Card>

      <Card className="space-y-2 border-border bg-card p-5 text-sm">
        <h2 className="font-medium">Stack &amp; data</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>TypeScript algorithms — zero external graph libraries.</li>
          <li>
            Road graph data fetched live from the OpenStreetMap{" "}
            <code className="font-mono text-xs">Overpass API</code> around the
            selected bounding box.
          </li>
          <li>Map tiles &amp; rendering via Google Maps Platform.</li>
          <li>
            Visited / frontier / path layers drawn on a custom canvas overlay
            (handles 10k+ nodes smoothly).
          </li>
        </ul>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Built by Ayush — DBS Global University
      </p>
    </div>
  );
}
