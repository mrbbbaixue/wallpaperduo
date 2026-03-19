import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
import { aspectRatios } from "@/data/aspectRatios";
import { cn } from "@/lib/utils";
import { prepareCanvasImage } from "@/services/canvas/prepareCanvas";
import { buildPreparedImage, useWorkflowStore } from "@/store/useWorkflowStore";

export const CanvasControls = () => {
  const { t } = useTranslation();
  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const ratioId = useWorkflowStore((s) => s.ratioId);
  const customRatio = useWorkflowStore((s) => s.customRatio);
  const prepareMode = useWorkflowStore((s) => s.prepareMode);
  const setRatioId = useWorkflowStore((s) => s.setRatioId);
  const setCustomRatio = useWorkflowStore((s) => s.setCustomRatio);
  const setPrepareMode = useWorkflowStore((s) => s.setPrepareMode);
  const setPreparedImage = useWorkflowStore((s) => s.setPreparedImage);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedRatioId = aspectRatios.some((item) => item.id === ratioId) ? ratioId : "16:9";

  useEffect(() => {
    if (ratioId !== normalizedRatioId) {
      setRatioId(normalizedRatioId);
    }
  }, [normalizedRatioId, ratioId, setRatioId]);

  const ratio =
    normalizedRatioId === "custom"
      ? customRatio
      : (() => {
          const preset = aspectRatios.find((item) => item.id === normalizedRatioId);
          return preset ? { width: preset.width, height: preset.height } : { width: 16, height: 9 };
        })();

  const onPrepare = async () => {
    if (!sourceImage) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const output = await prepareCanvasImage({
        source: sourceImage.blob,
        ratio,
        mode: prepareMode,
      });
      const prepared = buildPreparedImage({
        sourceImageId: sourceImage.id,
        blob: output.blob,
        width: output.width,
        height: output.height,
        objectUrl: URL.createObjectURL(output.blob),
        ratioId: normalizedRatioId,
        mode: prepareMode,
      });
      setPreparedImage(prepared);
    } catch (exception) {
      setError(String(exception));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("workspace.ratio")}
          </Label>
          <Select value={normalizedRatioId} onValueChange={setRatioId}>
            <SelectTrigger className="h-11 rounded-none bg-background/65">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("workspace.mode")}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={prepareMode === "crop" ? "default" : "outline"}
              onClick={() => setPrepareMode("crop")}
              size="sm"
              className={cn(
                "h-11 rounded-none",
              )}
            >
              {t("workspace.modeCrop")}
            </Button>
            <Button
              type="button"
              variant={prepareMode === "pad" ? "default" : "outline"}
              onClick={() => setPrepareMode("pad")}
              size="sm"
              className={cn(
                "h-11 rounded-none",
              )}
            >
              {t("workspace.modePad")}
            </Button>
          </div>
        </div>
      </div>

      {normalizedRatioId === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="custom-ratio-width"
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              W
            </Label>
            <Input
              id="custom-ratio-width"
              type="number"
              className="h-11 rounded-none bg-background/65"
              value={customRatio.width}
              onChange={(e) =>
                setCustomRatio({
                  ...customRatio,
                  width: Math.max(1, Number(e.target.value || 1)),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="custom-ratio-height"
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              H
            </Label>
            <Input
              id="custom-ratio-height"
              type="number"
              className="h-11 rounded-none bg-background/65"
              value={customRatio.height}
              onChange={(e) =>
                setCustomRatio({
                  ...customRatio,
                  height: Math.max(1, Number(e.target.value || 1)),
                })
              }
            />
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void onPrepare()}
        disabled={loading || !sourceImage}
        className="h-11 w-full rounded-none"
      >
        {loading ? t("common.loading") : t("workspace.prepare")}
      </Button>

      <div className="flex flex-wrap gap-2 text-xs">
        {sourceImage ? (
          <span className="rounded-none border border-border/70 bg-background/65 px-2.5 py-1 text-muted-foreground">
            {sourceImage.name} · {sourceImage.width}×{sourceImage.height}
          </span>
        ) : null}
        {preparedImage ? (
          <span className="rounded-none border border-border/70 bg-background/65 px-2.5 py-1 text-muted-foreground">
            {t("workspace.prepared")} · {preparedImage.width}×{preparedImage.height}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
};
