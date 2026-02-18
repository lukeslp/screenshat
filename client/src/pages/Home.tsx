import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Navbar from "@/components/Navbar";
import PresetSelector from "@/components/PresetSelector";
import { WAIT_STRATEGIES, SOCIAL_PRESETS, type WaitStrategy } from "@shared/presets";
import {
  Camera,
  ChevronDown,
  Globe,
  Loader2,
  Settings2,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [url, setUrl] = useState(params.get("url") || "");
  const [selectedPresets, setSelectedPresets] = useState<string[]>(
    SOCIAL_PRESETS.map(p => p.key)
  );
  const [waitStrategy, setWaitStrategy] = useState<WaitStrategy>("networkidle");
  const [customSelector, setCustomSelector] = useState("");
  const [extraWaitMs, setExtraWaitMs] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Prefill URL from query param
  useEffect(() => {
    const prefill = params.get("url");
    if (prefill) setUrl(prefill);
  }, []);

  const captureMutation = trpc.capture.start.useMutation({
    onSuccess: (data) => {
      toast.success(`Captured ${data.capturedCount} screenshots`);
      setLocation(`/results/${data.jobId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Capture failed");
    },
  });

  const handleCapture = useCallback(() => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    if (selectedPresets.length === 0) {
      toast.error("Select at least one preset");
      return;
    }

    captureMutation.mutate({
      url: finalUrl,
      presetKeys: selectedPresets,
      waitStrategy,
      customSelector: customSelector.trim() || undefined,
      extraWaitMs: extraWaitMs > 0 ? extraWaitMs : undefined,
    });
  }, [url, selectedPresets, waitStrategy, customSelector, extraWaitMs, captureMutation]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Website URL
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCapture();
              }}
              className="h-11 text-base bg-card/60 border-border/50 font-mono placeholder:font-sans placeholder:text-muted-foreground/40"
              disabled={captureMutation.isPending}
              autoFocus
            />
          </div>

          {/* Preset Selector */}
          <PresetSelector
            selectedKeys={selectedPresets}
            onSelectionChange={setSelectedPresets}
          />

          {/* Advanced Options */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="font-medium">Advanced</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 ml-auto transition-transform ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Wait Strategy</Label>
                  <Select
                    value={waitStrategy}
                    onValueChange={v => setWaitStrategy(v as WaitStrategy)}
                  >
                    <SelectTrigger className="bg-card/60 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAIT_STRATEGIES.map(ws => (
                        <SelectItem key={ws.value} value={ws.value}>
                          <div>
                            <div className="text-sm">{ws.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {ws.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Extra Wait (ms)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30000}
                    step={500}
                    value={extraWaitMs}
                    onChange={e =>
                      setExtraWaitMs(
                        Math.max(0, Math.min(30000, parseInt(e.target.value) || 0))
                      )
                    }
                    placeholder="0"
                    className="bg-card/60 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Custom Wait Selector</Label>
                <Input
                  value={customSelector}
                  onChange={e => setCustomSelector(e.target.value)}
                  placeholder='e.g. .chart-loaded, #main-content, [data-ready="true"]'
                  className="bg-card/60 font-mono text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  CSS selector to wait for before capturing. Useful for pages with
                  specific loading indicators.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Capture Button */}
          <Button
            onClick={handleCapture}
            disabled={
              captureMutation.isPending ||
              !url.trim() ||
              selectedPresets.length === 0
            }
            size="lg"
            className="w-full h-11 text-sm font-semibold gap-2"
          >
            {captureMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Capturing {selectedPresets.length} screenshots...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Capture {selectedPresets.length} Screenshot
                {selectedPresets.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>

          {captureMutation.isPending && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Loading page, waiting for content to render, then capturing each dimension. This may take a minute for complex pages.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
