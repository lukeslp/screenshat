import { trpc } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/basePath";
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
  ScanSearch,
  Zap,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  description: string;
  qualityScore: number;
  suggestions: string[];
}

function getAnalysis(raw: Record<string, unknown> | null): AnalysisResult | null {
  if (!raw) return null;
  const score = typeof raw.qualityScore === "number" ? raw.qualityScore : null;
  const description = typeof raw.description === "string" ? raw.description : null;
  if (score === null || !description) return null;
  return {
    description,
    qualityScore: score,
    suggestions: Array.isArray(raw.suggestions)
      ? (raw.suggestions as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
  };
}

function qualityBadgeClass(score: number): string {
  if (score <= 3) return "border-red-500/40 bg-red-500/10 text-red-400";
  if (score <= 6) return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  return "border-green-500/40 bg-green-500/10 text-green-400";
}

function ScreenshotCard({
  screenshot,
  onGenerateAltText,
  onUpdateAltText,
  isGeneratingAltText,
  onAnalyze,
  isAnalyzing,
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
  onAnalyze: (id: number) => void;
  isAnalyzing: boolean;
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
    a.href = `${getBaseUrl()}api/download/${screenshot.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const aspectRatio = screenshot.width / screenshot.height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;
  const analysis = getAnalysis(screenshot.analysisResult);

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
              className="h-8 gap-1 text-xs bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1 text-xs bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
        <CardContent className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{preset?.label || screenshot.presetKey}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {screenshot.width} × {screenshot.height}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono h-5">
                {preset?.aspectRatio || "—"}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                {formatBytes(screenshot.fileSizeBytes)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-xs gap-1"
              onClick={handleDownload}
            >
              <Download className="h-2.5 w-2.5" />
              Download
            </Button>
          </div>

          {/* Alt Text Section */}
          <div className="border-t border-border/30 pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="font-medium">Alt Text</span>
                {currentAltText && (
                  <span className="text-[10px] text-primary/60">• embedded in download</span>
                )}
              </div>
              <button
                onClick={() => onGenerateAltText(screenshot.id)}
                disabled={isGeneratingAltText}
                aria-label={currentAltText ? "Regenerate alt text" : "Generate alt text"}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {isGeneratingAltText ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : currentAltText ? (
                  <RotateCcw className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {isGeneratingAltText ? "Generating…" : currentAltText ? "Regenerate" : "Generate"}
              </button>
            </div>
            <Textarea
              value={currentAltText}
              onChange={e => handleAltTextChange(e.target.value)}
              placeholder="Enter alt text, or click Generate…"
              className="text-xs min-h-[48px] max-h-24 resize-y leading-relaxed py-1.5 px-2"
              maxLength={500}
            />
            {currentAltText && (
              <p className="text-[10px] text-muted-foreground text-right">
                {currentAltText.length}/500 · auto-saved
              </p>
            )}
          </div>

          {/* Analysis Section */}
          <div className="border-t border-border/30 pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ScanSearch className="h-3 w-3" />
                <span className="font-medium">Analysis</span>
                {analysis && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1 py-0 h-5 ml-0.5",
                      qualityBadgeClass(analysis.qualityScore)
                    )}
                  >
                    {analysis.qualityScore}/10
                  </Badge>
                )}
              </div>
              <button
                onClick={() => onAnalyze(screenshot.id)}
                disabled={isAnalyzing}
                aria-label={analysis ? "Re-analyze screenshot" : "Analyze screenshot"}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : analysis ? (
                  <RotateCcw className="h-3 w-3" />
                ) : (
                  <ScanSearch className="h-3 w-3" />
                )}
                {isAnalyzing ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze"}
              </button>
            </div>
            {analysis && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysis.description}
                </p>
                {analysis.suggestions.length > 0 && (
                  <ul className="space-y-0.5">
                    {analysis.suggestions.slice(0, 3).map((s, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-muted-foreground/80 flex gap-1 items-start"
                      >
                        <span className="text-primary/40 shrink-0 mt-px">›</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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

  const analyzeMutation = trpc.capture.analyze.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const utils = trpc.useUtils();
  const [generatingAltTextIds, setGeneratingAltTextIds] = useState<number[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<number[]>([]);
  const [batchAltTextProgress, setBatchAltTextProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

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

  const handleGenerateAllAltText = async () => {
    if (!job?.screenshots) return;
    const missing = job.screenshots.filter(ss => !ss.altText);
    if (missing.length === 0) {
      toast.info("All screenshots already have alt text");
      return;
    }
    setBatchAltTextProgress({ done: 0, total: missing.length });
    let done = 0;
    for (const ss of missing) {
      try {
        await generateAltTextMutation.mutateAsync({ screenshotId: ss.id });
        done++;
        setBatchAltTextProgress({ done, total: missing.length });
      } catch {
        // individual errors shown by mutation's onError
      }
    }
    await utils.capture.getJob.invalidate({ jobId });
    setBatchAltTextProgress(null);
    toast.success(`Alt text generated for ${done} screenshot${done !== 1 ? "s" : ""}`);
  };

  const handleDownloadAll = async () => {
    if (!job?.screenshots) return;
    try {
      const a = document.createElement("a");
      a.href = `${getBaseUrl()}api/download-zip/${jobId}`;
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
                <h1 className="text-xl font-bold tracking-tight">Results</h1>
                <Badge
                  variant={job.status === "completed" ? "default" : "destructive"}
                  className="text-[10px] h-5"
                >
                  {job.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                <ExternalLink className="h-3.5 w-3.5" />
                <a
                  href={job.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors font-mono text-xs truncate max-w-md"
                >
                  {job.url as string}
                </a>
                <span className="text-border">·</span>
                <span>{job.screenshots.length} screenshots</span>
              </div>
            </div>

            <div className="flex gap-1.5 ml-9 sm:ml-0">
              <Link href="/">
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  <Camera className="h-3.5 w-3.5" />
                  New
                </Button>
              </Link>
              {job.screenshots.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={handleGenerateAllAltText}
                    disabled={batchAltTextProgress !== null}
                    title="Generate alt text for all screenshots missing it"
                  >
                    {batchAltTextProgress !== null ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {batchAltTextProgress.done}/{batchAltTextProgress.total}
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" />
                        Alt Text All
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={handleDownloadAll}
                  >
                    <PackageOpen className="h-3.5 w-3.5" />
                    Download All
                  </Button>
                </>
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
                  <p className="text-xs mt-0.5 opacity-80 break-words">
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
                  onGenerateAltText={handleGenerateAltText}
                  onUpdateAltText={handleUpdateAltText}
                  isGeneratingAltText={generatingAltTextIds.includes(ss.id)}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={analyzingIds.includes(ss.id)}
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
