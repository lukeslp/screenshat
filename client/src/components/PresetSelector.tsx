import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";
import { SOCIAL_PRESETS, HIGHRES_PRESETS, MOBILE_PRESETS, type ScreenshotPreset } from "@shared/presets";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Pin,
  Monitor,
  Smartphone,
  Tablet,
  Share2,
  Maximize,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  pinterest: Pin,
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
};

function AspectFrame({
  width,
  height,
  selected,
}: {
  width: number;
  height: number;
  selected: boolean;
}) {
  const ar = width / height;
  const maxW = 28;
  const maxH = 20;
  let fw: number, fh: number;

  if (ar >= 1) {
    fw = maxW;
    fh = Math.max(4, Math.round(maxW / ar));
  } else {
    fh = maxH;
    fw = Math.max(4, Math.round(maxH * ar));
  }

  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: maxW + 4, height: maxH + 4 }}
    >
      <div
        style={{ width: fw, height: fh }}
        className={`rounded-[1px] transition-colors ${
          selected
            ? "bg-primary/20 border border-primary/60"
            : "bg-border/40 border border-border/60"
        }`}
      />
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onToggle,
}: {
  preset: ScreenshotPreset;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[preset.icon] || Share2;
  const isHighRes = preset.category === "highres";
  const isMobile = preset.category === "mobile";
  const dpr = preset.deviceScaleFactor;
  const cssW = Math.round(preset.width / dpr);
  const cssH = Math.round(preset.height / dpr);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          className={`group relative flex items-center gap-2.5 rounded-md border p-2.5 text-left transition-all duration-150 ${
            selected
              ? "border-primary/50 bg-primary/8 shadow-[0_0_0_1px_oklch(0.76_0.16_72/0.15)]"
              : "border-border/50 bg-card/40 hover:border-border hover:bg-card/70"
          }`}
        >
          {/* Checkbox */}
          <div
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-all ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-transparent"
            }`}
            aria-hidden="true"
          >
            {selected && <Check className="h-2.5 w-2.5" />}
          </div>

          {/* Aspect ratio frame */}
          <AspectFrame width={preset.width} height={preset.height} selected={selected} />

          {/* Label + dimensions */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Icon
                className={`h-3 w-3 shrink-0 ${
                  selected ? "text-primary" : "text-muted-foreground/70"
                }`}
              />
              <span className="text-xs font-semibold truncate">{preset.label}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground/80 tabular-nums">
                {preset.width}×{preset.height}
              </span>
              {(isHighRes || isMobile) && dpr > 1 && (
                <span
                  className={`text-[9px] font-mono px-1 py-px rounded-[3px] font-medium tabular-nums ${
                    selected
                      ? "bg-primary/15 text-primary"
                      : "bg-border/40 text-muted-foreground/60"
                  }`}
                >
                  {dpr}× DPR
                </span>
              )}
              {!isHighRes && !isMobile && (
                <span className="text-[9px] font-mono text-muted-foreground/40">
                  {preset.aspectRatio}
                </span>
              )}
            </div>
            {(isHighRes || isMobile) && dpr > 1 && (
              <div className="text-[9px] font-mono text-muted-foreground/40 mt-0.5 tabular-nums">
                viewport {cssW}×{cssH}
              </div>
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-48">
        <div>{preset.description}</div>
        {(isHighRes || isMobile) && dpr > 1 && (
          <div className="text-muted-foreground mt-0.5">
            Renders at {cssW}×{cssH} CSS viewport · {dpr}× pixel density
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface PresetSelectorProps {
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
}

export default function PresetSelector({
  selectedKeys,
  onSelectionChange,
}: PresetSelectorProps) {
  const togglePreset = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter(k => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  const selectAll = (presets: ScreenshotPreset[]) => {
    const keys = presets.map(p => p.key);
    const allSelected = keys.every(k => selectedKeys.includes(k));
    if (allSelected) {
      onSelectionChange(selectedKeys.filter(k => !keys.includes(k)));
    } else {
      const newKeys = Array.from(new Set([...selectedKeys, ...keys]));
      onSelectionChange(newKeys);
    }
  };

  const highresLandscape = HIGHRES_PRESETS.filter(p => p.width >= p.height);
  const highresPortrait = HIGHRES_PRESETS.filter(p => p.width < p.height);

  const socialAllSelected = SOCIAL_PRESETS.every(p => selectedKeys.includes(p.key));
  const highresAllSelected = HIGHRES_PRESETS.every(p => selectedKeys.includes(p.key));
  const highresLandscapeAllSelected = highresLandscape.every(p => selectedKeys.includes(p.key));
  const highresPortraitAllSelected = highresPortrait.every(p => selectedKeys.includes(p.key));
  const mobileAllSelected = MOBILE_PRESETS.every(p => selectedKeys.includes(p.key));
  const socialCount = SOCIAL_PRESETS.filter(p => selectedKeys.includes(p.key)).length;
  const highresCount = HIGHRES_PRESETS.filter(p => selectedKeys.includes(p.key)).length;
  const mobileCount = MOBILE_PRESETS.filter(p => selectedKeys.includes(p.key)).length;

  return (
    <div className="space-y-5">
      {/* Social Media */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
              Social Media
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {socialCount}/{SOCIAL_PRESETS.length}
            </span>
          </div>
          <button
            onClick={() => selectAll(SOCIAL_PRESETS)}
            className="text-[10px] font-mono text-primary/70 hover:text-primary transition-colors uppercase tracking-wide"
          >
            {socialAllSelected ? "none" : "all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SOCIAL_PRESETS.map(preset => (
            <PresetCard
              key={preset.key}
              preset={preset}
              selected={selectedKeys.includes(preset.key)}
              onToggle={() => togglePreset(preset.key)}
            />
          ))}
        </div>
      </div>

      {/* Mobile Portrait */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
              Mobile Portrait
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {mobileCount}/{MOBILE_PRESETS.length}
            </span>
          </div>
          <button
            onClick={() => selectAll(MOBILE_PRESETS)}
            className="text-[10px] font-mono text-primary/70 hover:text-primary transition-colors uppercase tracking-wide"
          >
            {mobileAllSelected ? "none" : "all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {MOBILE_PRESETS.map(preset => (
            <PresetCard
              key={preset.key}
              preset={preset}
              selected={selectedKeys.includes(preset.key)}
              onToggle={() => togglePreset(preset.key)}
            />
          ))}
        </div>
      </div>

      {/* High Resolution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Maximize className="h-3.5 w-3.5 text-primary/80" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
              High Resolution
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {highresCount}/{HIGHRES_PRESETS.length}
            </span>
          </div>
          <button
            onClick={() => selectAll(HIGHRES_PRESETS)}
            className="text-[10px] font-mono text-primary/70 hover:text-primary transition-colors uppercase tracking-wide"
          >
            {highresAllSelected ? "none" : "all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {HIGHRES_PRESETS.map(preset => (
            <PresetCard
              key={preset.key}
              preset={preset}
              selected={selectedKeys.includes(preset.key)}
              onToggle={() => togglePreset(preset.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
