/// <reference types="google.maps" />
// A canvas-based Google Maps OverlayView that efficiently renders
// thousands of visited nodes plus the final path.

import type { GraphNode, NodeId } from "@/lib/graph/types";

export interface CanvasOverlayState {
  nodes: Map<NodeId, GraphNode>;
  visited: NodeId[]; // ordered as they were visited
  frontier: Set<NodeId>;
  path: NodeId[]; // final path (empty until done)
  source: NodeId | null;
  target: NodeId | null;
}

interface OverlayHandle {
  setMap: (map: google.maps.Map | null) => void;
  update: (state: CanvasOverlayState) => void;
  destroy: () => void;
}

// Build the overlay class lazily because google.maps.OverlayView only
// exists after the Maps JS API has loaded.
export function createCanvasOverlay(maps: typeof google.maps): {
  new (): OverlayHandle;
} {
  class Overlay extends maps.OverlayView implements OverlayHandle {
    private canvas: HTMLCanvasElement | null = null;
    private state: CanvasOverlayState | null = null;

    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.pointerEvents = "none";
      canvas.style.left = "0";
      canvas.style.top = "0";
      this.canvas = canvas;
      const panes = this.getPanes();
      panes?.overlayLayer.appendChild(canvas);
    }

    draw() {
      if (!this.canvas) return;
      const proj = this.getProjection();
      if (!proj) return;
      const map = this.getMap() as google.maps.Map;
      const div = map.getDiv() as HTMLDivElement;
      const w = div.clientWidth;
      const h = div.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const canvas = this.canvas;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      // Position the canvas in the overlayLayer's coordinate system.
      const bounds = map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const nw = new maps.LatLng(ne.lat(), sw.lng());
      const nwPoint = proj.fromLatLngToDivPixel(nw)!;
      canvas.style.left = `${nwPoint.x}px`;
      canvas.style.top = `${nwPoint.y}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const state = this.state;
      if (!state) return;

      const toXY = (id: NodeId) => {
        const n = state.nodes.get(id);
        if (!n) return null;
        const p = proj.fromLatLngToDivPixel(new maps.LatLng(n.lat, n.lon));
        if (!p) return null;
        return { x: p.x - nwPoint.x, y: p.y - nwPoint.y };
      };

      // Read CSS color variables
      const root = getComputedStyle(document.documentElement);
      const colVisited = root.getPropertyValue("--viz-visited").trim() || "#88aaff";
      const colFrontier = root.getPropertyValue("--viz-frontier").trim() || "#cfff66";
      const colPath = root.getPropertyValue("--viz-path").trim() || "#5fd9ff";
      const colSource = root.getPropertyValue("--viz-source").trim() || "#5fe89a";
      const colTarget = root.getPropertyValue("--viz-target").trim() || "#ff7a4a";

      // 1) Visited nodes — fade in by index for the "wave" effect
      const total = state.visited.length;
      for (let i = 0; i < total; i++) {
        const p = toXY(state.visited[i]);
        if (!p) continue;
        const t = total === 0 ? 1 : i / total;
        ctx.globalAlpha = 0.35 + 0.55 * t;
        ctx.fillStyle = `oklch(${colVisited})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 2) Frontier nodes
      ctx.fillStyle = `oklch(${colFrontier})`;
      state.frontier.forEach((id) => {
        const p = toXY(id);
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3) Final path
      if (state.path.length > 1) {
        ctx.strokeStyle = `oklch(${colPath})`;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = `oklch(${colPath} / 0.6)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        let started = false;
        for (const id of state.path) {
          const p = toXY(id);
          if (!p) continue;
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 4) Source / target markers
      const drawPin = (id: NodeId | null, color: string) => {
        if (id === null) return;
        const p = toXY(id);
        if (!p) return;
        ctx.fillStyle = `oklch(${color})`;
        ctx.strokeStyle = "#0a0e1a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      drawPin(state.source, colSource);
      drawPin(state.target, colTarget);
    }

    onRemove() {
      this.canvas?.parentNode?.removeChild(this.canvas);
      this.canvas = null;
    }

    update(state: CanvasOverlayState) {
      this.state = state;
      this.draw();
    }

    destroy() {
      this.setMap(null);
    }
  }
  return Overlay as unknown as { new (): OverlayHandle };
}
