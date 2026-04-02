import { Aperture, History, Waves, User, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export default function Navbar() {
  const [location] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/25 group-hover:bg-primary/18 transition-all">
            <Aperture className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-bold tracking-tight font-mono text-foreground/90">
            screen<span className="text-primary">shat</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-base transition-colors ${
              location === "/"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <Aperture className="h-4 w-4" />
            Capture
          </Link>
          <Link
            href="/history"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-base transition-colors ${
              location === "/history"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <History className="h-4 w-4" />
            History
          </Link>
          <div className="w-px h-4 bg-border/40 mx-1" />
          {switchable && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <a
            href="https://dr.eamer.dev/bluesky"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <Waves className="h-4 w-4" />
            Bluesky
          </a>
          <a
            href="https://lukesteuber.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <User className="h-4 w-4" />
            Luke
          </a>
        </nav>
      </div>
    </header>
  );
}
