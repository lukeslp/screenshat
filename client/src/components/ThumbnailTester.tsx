import { useState } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Monitor } from "lucide-react";

interface ScreenshotData {
  id: number;
  presetKey: string;
  width: number;
  height: number;
  fileUrl: string;
}

interface Props {
  screenshots: ScreenshotData[];
  url?: string | null;
}

function getDomain(url?: string | null) {
  if (!url) return "example.com";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getPageTitle(url?: string | null) {
  if (!url) return "Untitled Page";
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    const last = path.split("/").pop();
    return last
      ? last.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : u.hostname;
  } catch {
    return "Untitled Page";
  }
}

const SOCIAL_PRESET_KEYS = [
  "og-facebook",
  "twitter",
  "linkedin",
  "instagram-square",
  "instagram-portrait",
  "instagram-story",
  "pinterest",
];

function TwitterMockup({
  screenshot,
  domain,
}: {
  screenshot: ScreenshotData;
  domain: string;
}) {
  return (
    <div className="w-72 shrink-0 rounded-2xl overflow-hidden border border-[#2f3336] bg-[#16181c] shadow-xl">
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-[#2f3336]">
        <div className="h-4 w-4 rounded-full bg-[#1d9bf0] flex items-center justify-center shrink-0">
          <span className="text-white text-[8px] font-black">𝕏</span>
        </div>
        <span className="text-[10px] text-[#71767b] truncate">twitter.com · Promoted</span>
      </div>
      <div className="aspect-video overflow-hidden bg-black">
        <img
          src={screenshot.fileUrl}
          alt="Twitter card preview"
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2 bg-[#0f1419] border-t border-[#2f3336]">
        <p className="text-[11px] text-[#71767b] truncate">{domain}</p>
      </div>
    </div>
  );
}

function LinkedInMockup({
  screenshot,
  domain,
  title,
}: {
  screenshot: ScreenshotData;
  domain: string;
  title: string;
}) {
  return (
    <div className="w-72 shrink-0 rounded overflow-hidden border border-[#e0dfdc] bg-white shadow-md">
      <div className="overflow-hidden bg-gray-100" style={{ aspectRatio: "1.91 / 1" }}>
        <img
          src={screenshot.fileUrl}
          alt="LinkedIn share preview"
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2.5 bg-[#f3f2ef] border-t border-[#e0dfdc]">
        <p className="text-[12px] font-semibold text-[#191919] truncate leading-tight">{title}</p>
        <p className="text-[10px] text-[#00000099] mt-0.5 truncate">{domain}</p>
      </div>
    </div>
  );
}

function FacebookMockup({
  screenshot,
  domain,
  title,
}: {
  screenshot: ScreenshotData;
  domain: string;
  title: string;
}) {
  return (
    <div className="w-72 shrink-0 overflow-hidden border border-[#ccd0d5] bg-white shadow-sm">
      <div className="overflow-hidden bg-gray-200" style={{ aspectRatio: "1.91 / 1" }}>
        <img
          src={screenshot.fileUrl}
          alt="Facebook OG preview"
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2 bg-[#f0f2f5] border-t border-[#ccd0d5]">
        <p className="text-[9px] uppercase text-[#606770] tracking-wide truncate">{domain}</p>
        <p className="text-[12px] font-semibold text-[#1c1e21] truncate leading-tight">{title}</p>
      </div>
    </div>
  );
}

export default function ThumbnailTester({ screenshots, url }: Props) {
  const [open, setOpen] = useState(true);

  const domain = getDomain(url);
  const title = getPageTitle(url);

  const hasSocial = screenshots.some(s => SOCIAL_PRESET_KEYS.includes(s.presetKey));
  if (!hasSocial) return null;

  const has = (key: string) => screenshots.some(s => s.presetKey === key);
  const get = (key: string) => screenshots.find(s => s.presetKey === key)!;

  const showTwitter = has("twitter");
  const showLinkedIn = has("linkedin");
  const showFacebook = has("og-facebook");

  if (!showTwitter && !showLinkedIn && !showFacebook) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border/40 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-card/50 hover:bg-card/80 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold">Platform Preview</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                how your screenshots appear on social platforms
              </span>
            </div>
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 py-4 border-t border-border/40 bg-secondary/10">
            <div className="flex gap-6 overflow-x-auto pb-2">
              {showTwitter && (
                <div className="shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 text-center">
                    Twitter / X
                  </p>
                  <TwitterMockup screenshot={get("twitter")} domain={domain} />
                </div>
              )}
              {showLinkedIn && (
                <div className="shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 text-center">
                    LinkedIn
                  </p>
                  <LinkedInMockup screenshot={get("linkedin")} domain={domain} title={title} />
                </div>
              )}
              {showFacebook && (
                <div className="shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 text-center">
                    Facebook / OG
                  </p>
                  <FacebookMockup
                    screenshot={get("og-facebook")}
                    domain={domain}
                    title={title}
                  />
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
