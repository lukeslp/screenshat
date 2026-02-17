import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import PresetSelector from "@/components/PresetSelector";
import { WAIT_STRATEGIES, SOCIAL_PRESETS, type WaitStrategy } from "@shared/presets";
import {
  Camera,
  ChevronDown,
  Globe,
  Loader2,
  Settings2,
  Sparkles,
  Zap,
  Shield,
  Download,
  ArrowRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [url, setUrl] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<string[]>(
    SOCIAL_PRESETS.map(p => p.key)
  );
  const [waitStrategy, setWaitStrategy] = useState<WaitStrategy>("networkidle");
  const [customSelector, setCustomSelector] = useState("");
  const [extraWaitMs, setExtraWaitMs] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

          <div className="container relative pt-16 pb-8 md:pt-24 md:pb-12">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-primary/30 text-primary">
                Pixel-perfect screenshots
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Capture any website,{" "}
                <span className="text-primary">every format</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Generate optimized screenshots for social media cards, high-resolution displays, 
                and everything in between. One URL, all dimensions.
              </p>
            </div>
          </div>
        </section>

        {/* Capture Form */}
        <section className="container pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto">
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Website URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && isAuthenticated) handleCapture();
                      }}
                      className="h-12 text-base bg-background/50 border-border/60 font-mono placeholder:font-sans placeholder:text-muted-foreground/50"
                      disabled={captureMutation.isPending}
                    />
                  </div>
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
                      <Settings2 className="h-4 w-4" />
                      <span className="font-medium">Advanced Options</span>
                      <ChevronDown
                        className={`h-4 w-4 ml-auto transition-transform ${
                          advancedOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Wait Strategy</Label>
                        <Select
                          value={waitStrategy}
                          onValueChange={v => setWaitStrategy(v as WaitStrategy)}
                        >
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WAIT_STRATEGIES.map(ws => (
                              <SelectItem key={ws.value} value={ws.value}>
                                <div>
                                  <div className="font-medium">{ws.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {ws.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Extra Wait (ms)</Label>
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
                          className="bg-background/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Custom Wait Selector</Label>
                      <Input
                        value={customSelector}
                        onChange={e => setCustomSelector(e.target.value)}
                        placeholder='e.g. .chart-loaded, #main-content, [data-ready="true"]'
                        className="bg-background/50 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        CSS selector to wait for before capturing. Useful for pages with
                        specific loading indicators.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Capture Button */}
                <div className="pt-2">
                  {isAuthenticated ? (
                    <Button
                      onClick={handleCapture}
                      disabled={
                        captureMutation.isPending ||
                        !url.trim() ||
                        selectedPresets.length === 0
                      }
                      size="lg"
                      className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    >
                      {captureMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Capturing {selectedPresets.length} screenshots...
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5" />
                          Capture {selectedPresets.length} Screenshot
                          {selectedPresets.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        window.location.href = getLoginUrl();
                      }}
                      size="lg"
                      className="w-full h-12 text-base font-semibold gap-2"
                    >
                      Sign in to start capturing
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {captureMutation.isPending && (
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Capturing in progress</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Navigating to the page, waiting for content to load, and capturing
                          screenshots at each dimension. This may take a minute for complex pages
                          or high-resolution captures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="container pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: "Smart Detection",
                  description:
                    "Intelligent page load detection waits for network idle, fonts, canvas rendering, and custom selectors.",
                },
                {
                  icon: Shield,
                  title: "Pixel Perfect",
                  description:
                    "Exact viewport dimensions for every platform. No upscaling, no guessing — precise captures every time.",
                },
                {
                  icon: Download,
                  title: "Batch & Download",
                  description:
                    "Capture all formats in one request. Download individually or grab everything as a ZIP archive.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group rounded-xl border border-border/40 bg-card/30 p-6 hover:border-border/60 hover:bg-card/50 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section className="container pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                AI-Powered Analysis
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              After capturing, use LLM vision to analyze your screenshots and get intelligent 
              crop suggestions optimized for each social media platform's content focus areas.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          ScreenShotter — Capture any website, every format
        </div>
      </footer>
    </div>
  );
}
