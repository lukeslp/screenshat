import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Camera,
  Clock,
  ExternalLink,
  Image,
  RefreshCw,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();

  const { data: jobs, isLoading } = trpc.capture.history.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "processing":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Capture History</h1>
                <p className="text-sm text-muted-foreground">
                  {jobs?.length ?? 0} capture{(jobs?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Link href="/">
              <Button size="sm" className="gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                New Capture
              </Button>
            </Link>
          </div>

          {/* Job List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map(job => (
                <Card
                  key={job.id}
                  className="group border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/80 transition-all cursor-pointer"
                  onClick={() => {
                    if (job.status === "completed") {
                      setLocation(`/results/${job.id}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="h-16 w-24 rounded-md bg-secondary/50 overflow-hidden shrink-0 border border-border/30">
                        {job.thumbnailUrl ? (
                          <img
                            src={job.thumbnailUrl}
                            alt="Thumbnail"
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={job.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors truncate max-w-sm flex items-center gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate font-mono text-xs">
                              {(job.url as string).replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                          <Badge
                            variant={getStatusColor(job.status) as "default" | "destructive" | "secondary" | "outline"}
                            className="text-[10px] shrink-0"
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(job.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Image className="h-3 w-3" />
                            {job.screenshotCount} screenshot
                            {job.screenshotCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={e => {
                              e.stopPropagation();
                              setLocation(`/results/${job.id}`);
                            }}
                          >
                            View
                          </Button>
                        )}
                        <Link href={`/?url=${encodeURIComponent(job.url as string)}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No captures yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Start by capturing your first website screenshot.
              </p>
              <Link href="/">
                <Button className="gap-2">
                  <Camera className="h-4 w-4" />
                  Capture a website
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
