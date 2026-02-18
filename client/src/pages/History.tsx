import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import {
  AlertCircle,
  Camera,
  Clock,
  ExternalLink,
  Image,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function History() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    count: number;
  } | null>(null);

  const { data: jobs, isLoading } = trpc.capture.history.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false }
  );

  const deleteMutation = trpc.capture.deleteJob.useMutation({
    onSuccess: () => {
      utils.capture.history.invalidate();
      setDeleteTarget(null);
      toast.success("Capture deleted");
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "failed": return "destructive";
      case "processing": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">History</h1>
              <p className="text-xs text-muted-foreground">
                {jobs?.length ?? 0} capture{(jobs?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/">
              <Button size="sm" className="h-7 gap-1 text-[11px]">
                <Camera className="h-3 w-3" />
                New Capture
              </Button>
            </Link>
          </div>

          {/* Job List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job: typeof jobs[number]) => {
                const isFailed = job.status === "failed";
                const isCompleted = job.status === "completed";
                const errorSnippet = job.errorMessage
                  ? job.errorMessage.length > 80
                    ? job.errorMessage.slice(0, 80) + "…"
                    : job.errorMessage
                  : null;

                return (
                  <Card
                    key={job.id}
                    role={isCompleted ? "button" : undefined}
                    tabIndex={isCompleted ? 0 : undefined}
                    className={`group border-border/40 bg-card/50 hover:border-border/60 transition-all ${
                      isCompleted ? "cursor-pointer" : "cursor-default"
                    } ${isFailed ? "border-destructive/20 bg-destructive/5" : ""}`}
                    onClick={() => {
                      if (isCompleted) setLocation(`/results/${job.id}`);
                    }}
                    onKeyDown={e => {
                      if (isCompleted && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setLocation(`/results/${job.id}`);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="h-14 w-20 rounded-md bg-secondary/30 overflow-hidden shrink-0 border border-border/30">
                          {job.thumbnailUrl ? (
                            <img
                              src={job.thumbnailUrl}
                              alt="Thumbnail"
                              className="w-full h-full object-cover object-top"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isFailed ? (
                                <AlertCircle className="h-4 w-4 text-destructive/40" />
                              ) : (
                                <Image className="h-4 w-4 text-muted-foreground/30" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={job.url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium hover:text-primary transition-colors truncate max-w-sm flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate font-mono text-[11px]">
                                {(job.url as string).replace(/^https?:\/\//, "")}
                              </span>
                            </a>
                            <Badge
                              variant={getStatusColor(job.status) as "default" | "destructive" | "secondary" | "outline"}
                              className="text-[9px] shrink-0 h-4"
                            >
                              {job.status}
                            </Badge>
                          </div>

                          {/* Error message for failed jobs */}
                          {isFailed && errorSnippet && (
                            <p className="text-[10px] text-destructive/80 flex items-start gap-1">
                              <AlertCircle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                              <span className="truncate">{errorSnippet}</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </span>
                            {!isFailed && (
                              <span className="flex items-center gap-0.5">
                                <Image className="h-2.5 w-2.5" />
                                {job.screenshotCount} screenshot{job.screenshotCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          className={`flex items-center gap-1 shrink-0 transition-opacity ${
                            isFailed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Link href={`/?url=${encodeURIComponent(job.url as string)}`}>
                            <button
                              className={`h-7 px-2 rounded-md flex items-center gap-1 hover:bg-secondary/60 transition-colors text-[10px] ${
                                isFailed ? "text-primary font-medium" : ""
                              }`}
                              onClick={e => e.stopPropagation()}
                              title="Re-capture"
                            >
                              <RefreshCw className="h-3 w-3" />
                              {isFailed && <span>Retry</span>}
                            </button>
                          </Link>
                          <button
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTarget({ id: job.id, count: job.screenshotCount });
                            }}
                            title="Delete"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Camera className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No captures yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Start by capturing your first website screenshot.
              </p>
              <Link href="/">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Camera className="h-3.5 w-3.5" />
                  Capture a website
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this capture?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.count ?? 0) > 0
                ? `This will remove all ${deleteTarget!.count} screenshot${deleteTarget!.count !== 1 ? "s" : ""} and cannot be undone.`
                : "This will delete this capture record and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ jobId: deleteTarget.id });
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
