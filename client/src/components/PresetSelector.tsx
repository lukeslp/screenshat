import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";
import { SOCIAL_PRESETS, HIGHRES_PRESETS, type ScreenshotPreset } from "@shared/presets";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Pin,
  Monitor,
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
};

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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          className={`group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:border-primary/40 ${
            selected
              ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/5"
              : "border-border/60 bg-card/50 hover:bg-card"
          }`}
        >
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-shadow ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-transparent"
            }`}
            aria-hidden="true"
          >
            {selected && <Check className="h-3.5 w-3.5" />}
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon
              className={`h-4 w-4 shrink-0 ${
                selected ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{preset.label}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {preset.width} x {preset.height}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="ml-auto shrink-0 text-[10px] px-1.5 py-0 font-mono opacity-60"
          >
            {preset.aspectRatio}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {preset.description}
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

  const socialAllSelected = SOCIAL_PRESETS.every(p =>
    selectedKeys.includes(p.key)
  );
  const highresAllSelected = HIGHRES_PRESETS.every(p =>
    selectedKeys.includes(p.key)
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Social Media</h3>
            <Badge variant="secondary" className="text-[10px]">
              {SOCIAL_PRESETS.filter(p => selectedKeys.includes(p.key)).length}/
              {SOCIAL_PRESETS.length}
            </Badge>
          </div>
          <button
            onClick={() => selectAll(SOCIAL_PRESETS)}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            {socialAllSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">High Resolution</h3>
            <Badge variant="secondary" className="text-[10px]">
              {HIGHRES_PRESETS.filter(p => selectedKeys.includes(p.key)).length}/
              {HIGHRES_PRESETS.length}
            </Badge>
          </div>
          <button
            onClick={() => selectAll(HIGHRES_PRESETS)}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            {highresAllSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
