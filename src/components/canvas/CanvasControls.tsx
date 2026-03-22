import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
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
import { useWorkflowStore } from "@/store/useWorkflowStore";

export const CanvasControls = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const ratioId = useWorkflowStore((s) => s.ratioId);
  const customRatio = useWorkflowStore((s) => s.customRatio);
  const prepareMode = useWorkflowStore((s) => s.prepareMode);
  const setRatioId = useWorkflowStore((s) => s.setRatioId);
  const setCustomRatio = useWorkflowStore((s) => s.setCustomRatio);
  const setPrepareMode = useWorkflowStore((s) => s.setPrepareMode);
  const resetCanvasFraming = useWorkflowStore((s) => s.resetCanvasFraming);

  const fieldLabelClassName = isZh
    ? "text-xs font-medium text-muted-foreground"
    : "text-[11px] uppercase tracking-[0.18em] text-muted-foreground";

  const normalizedRatioId = aspectRatios.some((item) => item.id === ratioId) ? ratioId : "16:9";

  useEffect(() => {
    if (ratioId !== normalizedRatioId) {
      setRatioId(normalizedRatioId);
    }
  }, [normalizedRatioId, ratioId, setRatioId]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label className={fieldLabelClassName}>{t("workspace.ratio")}</Label>
          <Select value={normalizedRatioId} onValueChange={setRatioId}>
            <SelectTrigger className="h-11 rounded-md bg-background/65">
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
          <Label className={fieldLabelClassName}>{t("workspace.mode")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={prepareMode === "crop" ? "default" : "outline"}
              onClick={() => setPrepareMode("crop")}
              size="sm"
              className={cn("h-11 rounded-md")}
            >
              {t("workspace.modeCrop")}
            </Button>
            <Button
              type="button"
              variant={prepareMode === "pad" ? "default" : "outline"}
              onClick={() => setPrepareMode("pad")}
              size="sm"
              className={cn("h-11 rounded-md")}
            >
              {t("workspace.modePad")}
            </Button>
          </div>
        </div>
      </div>

      {normalizedRatioId === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="custom-ratio-width" className={fieldLabelClassName}>
              W
            </Label>
            <Input
              id="custom-ratio-width"
              type="number"
              className="h-11 rounded-md bg-background/65"
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
            <Label htmlFor="custom-ratio-height" className={fieldLabelClassName}>
              H
            </Label>
            <Input
              id="custom-ratio-height"
              type="number"
              className="h-11 rounded-md bg-background/65"
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {isZh ? "左侧裁剪框就是最终分析画布" : "The left crop frame is the analysis canvas"}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {sourceImage
              ? isZh
                ? "调整图片位置和缩放后，直接在右侧点击分析。"
                : "Adjust the image on the left, then click Analyze on the right."
              : isZh
                ? "先在左侧导入参考图，再设置目标比例。"
                : "Import a reference image on the left, then choose a target ratio."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetCanvasFraming}
          disabled={!sourceImage}
          className="h-10 rounded-md"
        >
          <RotateCcw className="h-4 w-4" />
          {t("workspace.resetFraming")}
        </Button>
      </div>
    </div>
  );
};
