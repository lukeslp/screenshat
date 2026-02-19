import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import ThumbnailTester from "@/components/ThumbnailTester";
import { PRESET_MAP } from "@shared/presets";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  PackageOpen,
  Sparkles,
  AlertCircle,
  Camera,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

function ScreenshotCard({
  screenshot,
  onGenerateAltText,
  onUpdateAltText,
  isGeneratingAltText,
}: {
  screenshot: {
    id: number;
    presetKey: string;
    width: number;
    height: number;
    fileUrl: string;
    fileSizeBytes: number | null;
    analysisResult: Record<string, unknown> | null;
    altText?: string | null;
  };
  onGenerateAltText: (id: number) => void;
  onUpdateAltText: (id: number, text: string) => void;
  isGeneratingAltText: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editedAltText, setEditedAltText] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preset = PRESET_MAP[screenshot.presetKey];

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Current alt text: prefer local edit state, then DB value
  const currentAltText = editedAltText !== null ? editedAltText : (screenshot.altText ?? "");

  const handleAltTextChange = (val: string) => {
    setEditedAltText(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onUpdateAltText(screenshot.id, val);
    }, 800);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = `${import.meta.env.BASE_URL}api/download/${screenshot.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const aspectRatio = screenshot.width / screenshot.height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;

  return (
    <>
      <Card className="group border-border/40 bg-card/50 hover:border-border/60 transition-all overflow-hidden">
        <div
          className={`relative bg-black/20 overflow-hidden ${
            isPortrait
              ? "aspect-[3/4]"
              : isSquare
                ? "aspect-square"
                : "aspect-video"
          }`}
        >
          <img
            src={screenshot.fileUrl}
            alt={`${preset?.label || screenshot.presetKey} screenshot`}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-[11px] bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-[11px] bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </div>
        <CardContent className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold">{preset?.label || screenshot.presetKey}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {screenshot.width} × {screenshot.height}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono h-4">
                {preset?.aspectRatio || "—"}
              </Badge>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                {formatBytes(screenshot.fileSizeBytes)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-[10px] gap-1"
              onClick={handleDownload}
            >
              <Download className="h-2.5 w-2.5" />
              Download
            </Button>
          </div>

          {/* Alt Text Section */}
          <div className="border-t border-border/30 pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileText className="h-2.5 w-2.5" />
                <span className="font-medium">Alt Text</span>
                {currentAltText && (
                  <span className="text-[9px] text-primary/60">• embedded in download</span>
                )}
              </div>
              <button
                onClick={() => onGenerateAltText(screenshot.id)}
                disabled={isGeneratingAltText}
                aria-label={currentAltText ? "Regenerate alt text" : "Generate alt text"}
                className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {isGeneratingAltText ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : currentAltText ? (
                  <RotateCcw className="h-2.5 w-2.5" />
                ) : (
                  <Sparkles className="h-2.5 w-2.5" />
                )}
                {isGeneratingAltText ? "Generating…" : currentAltText ? "Regenerate" : "Generate"}
              </button>
            </div>
            <Textarea
              value={currentAltText}
              onChange={e => handleAltTextChange(e.target.value)}
              placeholder="Enter alt text, or click Generate…"
              className="text-[10px] min-h-[48px] max-h-24 resize-y leading-relaxed py-1.5 px-2"
              maxLength={500}
            />
            {currentAltText && (
              <p className="text-[9px] text-muted-foreground text-right">
                {currentAltText.length}/500 · auto-saved
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 to-transparent">
            <DialogTitle className="text-white text-xs font-medium">
              {preset?.label || screenshot.presetKey} — {screenshot.width} × {screenshot.height}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 pt-12 max-h-[90vh] overflow-auto">
            <img
              src={screenshot.fileUrl}
              alt="Full preview"
              className="max-w-full max-h-[80vh] object-contain rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

export default function CaptureResults() {
  const params = useParams<{ jobId: string }>();
  const jobId = parseInt(params.jobId || "0");

  const { data: job, isLoading, error } = trpc.capture.getJob.useQuery(
    { jobId },
    { enabled: jobId > 0, refetchOnWindowFocus: false }
  );

  const generateAltTextMutation = trpc.capture.generateAltText.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const updateAltTextMutation = trpc.capture.updateAltText.useMutation({
    onError: (err) => toast.error("Failed to save alt text: " + err.message),
  });

  const utils = trpc.useUtils();
  const [analyzingIds, setAnalyzingIds] = useState<number[]>([]);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzeAllProgress, setAnalyzeAllProgress] = useState(0);
  const analyzeAllTotal = useRef(0);
  const [generatingAltTextIds, setGeneratingAltTextIds] = useState<number[]>([]);

  const handleAnalyze = async (screenshotId: number) => {
    setAnalyzingIds(prev => [...prev, screenshotId]);
    try {
      await analyzeMutation.mutateAsync({ screenshotId });
      await utils.capture.getJob.invalidate({ jobId });
      toast.success("Analysis complete");
    } finally {
      setAnalyzingIds(prev => prev.filter(id => id !== screenshotId));
    }
  };

  const handleAnalyzeAll = async () => {
    if (!job?.screenshots) return;
    const unanalyzed = job.screenshots.filter(s => !s.analysisResult);
    if (unanalyzed.length === 0) return;

    setIsAnalyzingAll(true);
    setAnalyzeAllProgress(0);
    analyzeAllTotal.current = unanalyzed.length;

    for (let i = 0; i < unanalyzed.length; i++) {
      const ss = unanalyzed[i];
      setAnalyzeAllProgress(i + 1);
      setAnalyzingIds(prev => [...prev, ss.id]);
      try {
        await analyzeMutation.mutateAsync({ screenshotId: ss.id });
        await utils.capture.getJob.invalidate({ jobId });
      } catch {
        // continue with remaining screenshots
      } finally {
        setAnalyzingIds(prev => prev.filter(id => id !== ss.id));
      }
    }

    setIsAnalyzingAll(false);
    setAnalyzeAllProgress(0);
    toast.success("Analysis complete for all screenshots");
  };

  const handleGenerateAltText = async (screenshotId: number) => {
    setGeneratingAltTextIds(prev => [...prev, screenshotId]);
    try {
      await generateAltTextMutation.mutateAsync({ screenshotId });
      await utils.capture.getJob.invalidate({ jobId });
      toast.success("Alt text generated");
    } finally {
      setGeneratingAltTextIds(prev => prev.filter(id => id !== screenshotId));
    }
  };

  const handleUpdateAltText = async (screenshotId: number, altText: string) => {
    await updateAltTextMutation.mutateAsync({ screenshotId, altText });
  };

  const handleDownloadAll = async () => {
    if (!job?.screenshots) return;
    try {
      const a = document.createElement("a");
      a.href = `${import.meta.env.BASE_URL}api/download-zip/${jobId}`;
      a.download = `screenshots-${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("ZIP download started");
    } catch {
      toast.error("Download failed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-16">
          <div className="max-w-sm mx-auto text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Job not found</h2>
            <p className="text-xs text-muted-foreground">
              {error?.message || "This capture job doesn't exist."}
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const analyzedCount = job.screenshots.filter(s => s.analysisResult !== null).length;
  const unanalyzedCount = job.screenshots.length - analyzedCount;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link href="/">
                  <button aria-label="Back to home" className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-secondary/60 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight">Results</h1>
                <Badge
                  variant={job.status === "completed" ? "default" : "destructive"}
                  className="text-[10px] h-5"
                >
                  {job.status}
                </Badge>
                {job.screenshots.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {analyzedCount}/{job.screenshots.length} analyzed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                <ExternalLink className="h-3 w-3" />
                <a
                  href={job.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors font-mono text-[11px] truncate max-w-md"
                >
                  {job.url as string}
                </a>
                <span className="text-border">·</span>
                <span>{job.screenshots.length} screenshots</span>
              </div>
            </div>

            <div className="flex gap-1.5 ml-9 sm:ml-0">
              <Link href="/">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
                  <Camera className="h-3 w-3" />
                  New
                </Button>
              </Link>
              {unanalyzedCount > 0 && !isAnalyzingAll && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={handleAnalyzeAll}
                >
                  <Sparkles className="h-3 w-3" />
                  Analyze All
                </Button>
              )}
              {isAnalyzingAll && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  disabled
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing {analyzeAllProgress} / {analyzeAllTotal.current}…
                </Button>
              )}
              {job.screenshots.length > 0 && (
                <Button
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={handleDownloadAll}
                >
                  <PackageOpen className="h-3 w-3" />
                  Download All
                </Button>
              )}
            </div>
          </div>

          {/* Error banner for failed jobs */}
          {job.status === "failed" && (
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium">Capture failed</p>
                {(job as { errorMessage?: string | null } & typeof job).errorMessage && (
                  <p className="text-[11px] mt-0.5 opacity-80 break-words">
                    {(job as { errorMessage?: string | null } & typeof job).errorMessage}
                  </p>
                )}
              </div>
              <Link href={`/?url=${encodeURIComponent(job.url as string)}`} className="ml-auto shrink-0">
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                  Retry
                </Button>
              </Link>
            </div>
          )}

          {/* Screenshot Grid */}
          {job.screenshots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {job.screenshots.map(ss => (
                <ScreenshotCard
                  key={ss.id}
                  screenshot={ss}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={analyzingIds.includes(ss.id)}
                  analyzeDisabled={isAnalyzingAll}
                  onGenerateAltText={handleGenerateAltText}
                  onUpdateAltText={handleUpdateAltText}
                  isGeneratingAltText={generatingAltTextIds.includes(ss.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No screenshots captured</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The capture may have failed. Try again with different settings.
              </p>
            </div>
          )}

          {/* Platform Preview */}
          <ThumbnailTester
            screenshots={job.screenshots}
            url={job.url as string}
          />
        </div>
      </main>
    </div>
  );
}
