"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { DownloadIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-elevated outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 dark:bg-input/25";

const LEVELS = [
  { value: "L", label: "L — Low (7% repair)" },
  { value: "M", label: "M — Medium (15% repair)" },
  { value: "Q", label: "Q — Quartile (25% repair)" },
  { value: "H", label: "H — High (30% repair)" },
] as const;

const FG_PRESETS = ["#0f172a", "#000000", "#1d4ed8", "#0f766e", "#9d174d"];

const EXPORT_SIZES = [256, 512, 1024];

const HEX = /^#[0-9a-f]{6}$/i;

type Level = (typeof LEVELS)[number]["value"];

function imageSettingsFor(size: number, logo: string | null, ratio: number) {
  if (!logo) return undefined;
  const side = Math.max(8, Math.round((size * ratio) / 100));
  return { src: logo, width: side, height: side, excavate: true };
}

function fileStem(value: string) {
  try {
    const host = new URL(value).hostname.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    if (host) return `qr-${host}`;
  } catch {
    // Not a URL — plain text is fine to encode too.
  }
  return "qr-code";
}

export function QrStudio({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [level, setLevel] = useState<Level>("M");
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(4);
  const [fg, setFg] = useState("#0f172a");
  const [fgText, setFgText] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [bgText, setBgText] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(22);
  const pngRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const hasValue = value.trim().length > 0;
  const bgColor = transparent ? "#00000000" : bg;

  function pickFg(next: string) {
    setFg(next);
    setFgText(next);
  }

  function onFgText(next: string) {
    setFgText(next);
    if (HEX.test(next)) setFg(next);
  }

  function pickBg(next: string) {
    setBg(next);
    setBgText(next);
  }

  function onBgText(next: string) {
    setBgText(next);
    if (HEX.test(next)) setBg(next);
  }

  function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1024 * 1024) {
      toast.error("Use a PNG, JPEG or WebP image under 1 MB.");
      event.currentTarget.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogo(reader.result);
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  }

  function downloadPng() {
    const canvas = pngRef.current;
    if (!canvas || !hasValue) return;
    try {
      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = `${fileStem(value)}.png`;
      anchor.click();
    } catch {
      toast.error("Could not export the PNG — try removing the logo.");
    }
  }

  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg || !hasValue) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileStem(value)}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl border border-border/70 p-4"
            style={
              transparent
                ? {
                    backgroundImage:
                      "repeating-conic-gradient(rgba(148,163,184,0.25) 0% 25%, transparent 0% 50%)",
                    backgroundSize: "16px 16px",
                  }
                : { background: bg }
            }
          >
            {hasValue ? (
              <QRCodeCanvas
                bgColor={bgColor}
                fgColor={fg}
                imageSettings={imageSettingsFor(248, logo, logoScale)}
                level={level}
                marginSize={margin}
                size={248}
                title="QR preview"
                value={value}
              />
            ) : (
              <p className="px-6 text-center text-xs leading-relaxed text-muted-foreground">
                Type a URL or any text below to see the code.
              </p>
            )}
          </div>

          <div className="flex w-full max-w-[280px] flex-col gap-2">
            <Button disabled={!hasValue} onClick={downloadPng} type="button">
              <DownloadIcon data-icon="inline-start" />
              Download PNG · {size}px
            </Button>
            <Button disabled={!hasValue} onClick={downloadSvg} type="button" variant="outline">
              <DownloadIcon data-icon="inline-start" />
              Download SVG (vector)
            </Button>
          </div>
        </div>

        <div className="grid content-start gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="qr-value">Content</Label>
            <Textarea
              id="qr-value"
              maxLength={800}
              onChange={(event) => onValueChange(event.currentTarget.value)}
              placeholder="https://example.com or any text up to 800 characters"
              rows={2}
              value={value}
            />
            <p className="text-xs text-muted-foreground">{value.length}/800 characters</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qr-level">Error correction</Label>
            <select
              className={selectClass}
              id="qr-level"
              onChange={(event) => setLevel(event.currentTarget.value as Level)}
              value={level}
            >
              {LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Higher survives scratches and logos; lower keeps the pattern lighter.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qr-size">Export size</Label>
            <select
              className={selectClass}
              id="qr-size"
              onChange={(event) => setSize(Number(event.currentTarget.value))}
              value={size}
            >
              {EXPORT_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option} × {option} px
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">SVG ignores this — vectors scale forever.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qr-fg">Foreground</Label>
            <div className="flex items-center gap-2">
              <input
                aria-label="Pick foreground colour"
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1"
                id="qr-fg"
                onChange={(event) => pickFg(event.currentTarget.value)}
                type="color"
                value={fg}
              />
              <Input
                aria-label="Foreground hex value"
                maxLength={7}
                onChange={(event) => onFgText(event.currentTarget.value)}
                spellCheck={false}
                value={fgText}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FG_PRESETS.map((preset) => (
                <button
                  aria-label={`Use ${preset}`}
                  className="size-6 rounded-full border border-border/80 ring-1 ring-inset ring-white/20 transition-transform hover:scale-110"
                  key={preset}
                  onClick={() => pickFg(preset)}
                  style={{ background: preset }}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qr-bg">Background</Label>
            <div className="flex items-center gap-2">
              <input
                aria-label="Pick background colour"
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1 disabled:opacity-40"
                disabled={transparent}
                id="qr-bg"
                onChange={(event) => pickBg(event.currentTarget.value)}
                type="color"
                value={bg}
              />
              <Input
                aria-label="Background hex value"
                disabled={transparent}
                maxLength={7}
                onChange={(event) => onBgText(event.currentTarget.value)}
                spellCheck={false}
                value={bgText}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground">
              <input
                checked={transparent}
                className="size-4 accent-primary"
                onChange={(event) => setTransparent(event.currentTarget.checked)}
                type="checkbox"
              />
              Transparent background (PNG/SVG)
            </label>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="qr-margin">Quiet zone — {margin} module{margin === 1 ? "" : "s"}</Label>
            <input
              className="w-full cursor-pointer accent-primary"
              id="qr-margin"
              max={8}
              min={0}
              onChange={(event) => setMargin(Number(event.currentTarget.value))}
              type="range"
              value={margin}
            />
            <p className="text-xs text-muted-foreground">
              The empty border scanners need. The spec asks for 4.
            </p>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="qr-logo">Centre logo (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-input bg-card px-3 text-sm shadow-elevated transition-colors hover:bg-muted/50"
                htmlFor="qr-logo"
              >
                <ImagePlusIcon className="size-4" />
                Choose image
              </label>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                id="qr-logo"
                onChange={onLogoChange}
                type="file"
              />
              {logo ? (
                <Button onClick={() => setLogo(null)} size="sm" type="button" variant="ghost">
                  <Trash2Icon data-icon="inline-start" />
                  Remove logo
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">PNG, JPEG or WebP · under 1 MB</span>
              )}
            </div>
            {logo ? (
              <div className="mt-1 grid gap-2">
                <Label htmlFor="qr-logo-scale">Logo size — {logoScale}% of the code</Label>
                <input
                  className="w-full cursor-pointer accent-primary"
                  id="qr-logo-scale"
                  max={30}
                  min={15}
                  onChange={(event) => setLogoScale(Number(event.currentTarget.value))}
                  type="range"
                  value={logoScale}
                />
                {level === "L" || level === "M" ? (
                  <p className="text-xs text-muted-foreground">
                    Tip: logos scan more reliably with Q or H error correction.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Off-screen export pair: the visible preview stays small while the downloads keep full resolution. */}
        <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0">
          <QRCodeCanvas
            bgColor={bgColor}
            fgColor={fg}
            imageSettings={imageSettingsFor(size, logo, logoScale)}
            level={level}
            marginSize={margin}
            ref={pngRef}
            size={size}
            value={value || " "}
          />
          <QRCodeSVG
            bgColor={bgColor}
            fgColor={fg}
            imageSettings={imageSettingsFor(size, logo, logoScale)}
            level={level}
            marginSize={margin}
            ref={svgRef}
            size={size}
            value={value || " "}
          />
        </div>
      </CardContent>
    </Card>
  );
}
