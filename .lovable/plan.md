
# Shortest Path Finder — Real Map Visualizer (DAA Project)

A web app where you pick two points on a real-world map, choose an algorithm, and watch it explore the road network step-by-step — with live stats (nodes visited, distance, time, complexity) so you can compare algorithms side-by-side. Built around real DAA concepts: graph modeling, algorithm correctness, and empirical complexity analysis.

## Core features

1. **Real map interface** (Google Maps)
   - Click to set Source and Destination (or search an address)
   - Pan/zoom anywhere; works on any city
   - Roads are modeled as a weighted graph (nodes = intersections, edges = road segments with distance + estimated travel time)

2. **Algorithms implemented from scratch** (this is the DAA core — not just calling Google Directions)
   - **Dijkstra's Algorithm** — classic, non-negative weights
   - **A\* Search** — heuristic (Haversine distance)
   - **Bellman-Ford** — handles negative weights, slower
   - **BFS** — unweighted shortest path (fewest hops)
   - **DFS** — for comparison (shows it's NOT optimal)
   - **Bidirectional Dijkstra** — meet-in-the-middle optimization
   - **Floyd-Warshall** — all-pairs (demo on small subgraph only)

3. **Step-by-step visualization**
   - Animated exploration: visited nodes light up, frontier highlighted, final path drawn in bold
   - Play / Pause / Step / Speed slider
   - Side-by-side mode: run 2 algorithms in parallel on the same query

4. **Live metrics panel**
   - Nodes explored, edges relaxed
   - Path length (km) and estimated time
   - Wall-clock runtime
   - Operation counter

5. **Complexity analysis dashboard**
   - Run the chosen algorithm on increasing graph sizes
   - Plot empirical runtime vs. theoretical Big-O (Recharts)
   - Export the comparison table as CSV (great for the report)

6. **Algorithm info pages**
   - Pseudocode, time/space complexity, when to use, pros/cons
   - Useful for your project documentation/viva

## Tech approach

```text
┌─────────────────────────────────────────────────┐
│  Map view (Google Maps JS)                      │
│   - markers, polylines for visited edges + path │
├─────────────────────────────────────────────────┤
│  Algorithm engine (pure TS, your own code)      │
│   - Graph<Node, Edge>                           │
│   - dijkstra(), aStar(), bellmanFord(), ...     │
│   - yields step events for animation            │
├─────────────────────────────────────────────────┤
│  Controls + stats panel (shadcn/ui + Recharts)  │
└─────────────────────────────────────────────────┘
```

- **Graph data**: fetch road network around the bounding box of source+dest from a real source (OpenStreetMap Overpass API for the actual road graph; Google Maps for the visual layer). The Google Maps connector handles map display and geocoding.
- **Algorithms**: implemented as generator functions that `yield` each step → drives the animation cleanly.
- **No backend needed for the algorithms** — they run in the browser, which is perfect for a DAA project (transparent, inspectable, easy to demo).

## Pages

- `/` — Map + controls + visualizer (main screen)
- `/compare` — Side-by-side: pick 2 algorithms, same source/dest, race them
- `/analysis` — Complexity analyzer (run on varying graph sizes, plot curves)
- `/algorithms/:name` — Info page per algorithm (pseudocode, complexity, notes)
- `/about` — Project info, your name, college, etc.

## What I'll need from you before building

1. **Google Maps connector** — I'll prompt you to connect it (one click, managed key, no setup).
2. **OpenStreetMap Overpass** is free and needs no key — I'll use it for the road graph.
3. Confirm the **algorithm list above** is what your syllabus expects, or tell me to add/remove any (e.g., Johnson's, Yen's K-shortest paths, Johnson-Trotter is unrelated — but say the word).
4. Any **branding** for the project (college name, your name, color preference)? If you don't care, I'll go with a clean technical/dark-mode aesthetic suited for a CS demo.

Reply "go" (with answers to the questions above if you have them) and I'll build it.
