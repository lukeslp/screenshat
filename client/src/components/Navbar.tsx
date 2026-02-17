import { Camera, History } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            ScreenShotter
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              location === "/"
                ? "text-foreground bg-secondary/60"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Capture
          </Link>
          <Link
            href="/history"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              location === "/history"
                ? "text-foreground bg-secondary/60"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}
