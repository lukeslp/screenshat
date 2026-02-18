import { Aperture, History } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-13 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/25 group-hover:bg-primary/18 transition-all">
            <Aperture className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight font-mono text-foreground/90">
            screen<span className="text-primary">shat</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
              location === "/"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <Aperture className="h-3 w-3" />
            capture
          </Link>
          <Link
            href="/history"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
              location === "/history"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <History className="h-3 w-3" />
            history
          </Link>
        </nav>
      </div>
    </header>
  );
}
