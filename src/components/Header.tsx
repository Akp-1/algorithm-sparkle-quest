import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

export function Header() {
  const linkCls =
    "text-sm text-muted-foreground transition hover:text-foreground data-[active=true]:text-foreground";
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm tracking-tight">
            <span className="text-foreground">pathfinder</span>
            <span className="text-muted-foreground">.daa</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            to="/"
            className={linkCls}
            activeProps={{ "data-active": "true" } as never}
            activeOptions={{ exact: true }}
          >
            Visualizer
          </Link>
          <Link
            to="/compare"
            className={linkCls}
            activeProps={{ "data-active": "true" } as never}
          >
            Compare
          </Link>
          <Link
            to="/analysis"
            className={linkCls}
            activeProps={{ "data-active": "true" } as never}
          >
            Analysis
          </Link>
          <Link
            to="/algorithms"
            className={linkCls}
            activeProps={{ "data-active": "true" } as never}
          >
            Algorithms
          </Link>
          <Link
            to="/about"
            className={linkCls}
            activeProps={{ "data-active": "true" } as never}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
