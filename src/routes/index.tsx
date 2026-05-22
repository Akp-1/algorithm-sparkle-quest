import { createFileRoute } from "@tanstack/react-router";
import { MapVisualizer } from "@/components/MapVisualizer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pathfinder · Shortest Path Visualizer on a Real Map" },
      {
        name: "description",
        content:
          "Visualize Dijkstra, A*, Bellman-Ford, BFS, DFS and Bidirectional Dijkstra on real-world road networks. A DAA project.",
      },
      { property: "og:title", content: "Pathfinder · DAA Project" },
      {
        property: "og:description",
        content: "Step-by-step shortest-path algorithm visualizer on real maps.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <MapVisualizer />;
}
