import { ChevronDown, Download, Layers3, PackageOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { alignToReference } from "@/services/alignment/alignmentService";
import { validateDdwThemeShape } from "@/services/export/ddwCompatibility";
import { downloadDdw } from "@/services/export/ddwExporter";
import { downloadPngZip } from "@/services/export/pngZipExporter";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { toUserError } from "@/utils/error";

type Bucket = "day" | "sunrise" | "sunset" | "night";

const bucketLabels: Record<Bucket, { zh: string; en: string }> = {
  day: { zh: "白天", en: "Day" },
  sunrise: { zh: "日出", en: "Sunrise" },
  sunset: { zh: "日落", en: "Sunset" },
  night: { zh: "夜晚", en: "Night" },
};

export const ExportPanel = () => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);
  const alignmentResults = useWorkflowStore((s) => s.alignmentResults);
  const setAlignmentResult = useWorkflowStore((s) => s.setAlignmentResult);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const mapping = useWorkflowStore((s) => s.exportMapping);
  const setExportMapping = useWorkflowStore((s) => s.setExportMapping);

  const [expanded, setExpanded] = useState(false);
  const [fileStem, setFileStem] = useState("wallpaper");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"align" | "zip" | "ddw" | "">("");

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const alignedCount = useMemo(
    () =>
      succeeded.filter(
        (task) => alignmentResults[task.id]?.status === "succeeded" && alignmentResults[task.id]?.alignedBlob,
      ).length,
    [alignmentResults, succeeded],
  );

  useEffect(() => {
    if (succeeded.length === 0) {
      setExpanded(false);
    }
  }, [succeeded.length]);

  if (succeeded.length === 0) {
    return null;
  }

  const toggleMapping = (bucket: Bucket, variantId: string) => {
    const next = new Set(mapping[bucket]);
    if (next.has(variantId)) {
      next.delete(variantId);
    } else {
      next.add(variantId);
    }
    setExportMapping({ ...mapping, [bucket]: Array.from(next) });
  };

  const runAlignment = async () => {
    if (!preparedImage) {
      setError(t("workspace.needPrepared"));
      return;
    }

    try {
      setBusy("align");
      setError("");
      setMessage("");
      let successCount = 0;

      for (const task of succeeded) {
        if (!task.result?.blob) {
          continue;
        }

        try {
          const output = await alignToReference(preparedImage.blob, task.result.blob);
          setAlignmentResult({
            variantId: task.id,
            score: output.score,
            alignedBlob: output.blob,
            alignedObjectUrl: URL.createObjectURL(output.blob),
            status: "succeeded",
          });
          successCount += 1;
        } catch (exception) {
          setAlignmentResult({
            variantId: task.id,
            score: 0,
            status: "failed",
            error: toUserError(exception),
          });
        }
      }

      setMessage(
        isZh
          ? `对齐完成：${successCount} / ${succeeded.length}`
          : `Alignment finished: ${successCount} / ${succeeded.length}`,
      );
      toast({
        title: isZh ? "图像对齐完成" : "Alignment finished",
        description: isZh
          ? `成功 ${successCount} 张，共 ${succeeded.length} 张。`
          : `${successCount} of ${succeeded.length} image(s) aligned.`,
        variant: successCount === succeeded.length ? "default" : "destructive",
      });
    } catch (exception) {
      const message = toUserError(exception);
      setError(message);
      toast({
        title: isZh ? "图像对齐失败" : "Alignment failed",
        description: t(`errors.${message}`, message),
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  const runExportDdw = async () => {
    try {
      setBusy("ddw");
      setError("");
      setMessage("");
      const themeValidation = validateDdwThemeShape({
        imageFilename: `${fileStem}_*.png`,
        dayImageList: mapping.day,
        nightImageList: mapping.night,
      });
      if (!themeValidation.ok) {
        throw new Error(themeValidation.message);
      }
      await downloadDdw({
        tasks,
        mapping,
        alignmentResults,
        baselineImageBlob: preparedImage?.blob,
        fileStem,
      });
      setMessage(t("export.compat"));
      toast({
        title: isZh ? "DDW 导出完成" : "DDW export completed",
        description: t("export.compat"),
      });
    } catch (exception) {
      const message = toUserError(exception);
      setError(message);
      toast({
        title: isZh ? "DDW 导出失败" : "DDW export failed",
        description: t(`errors.${message}`, message),
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  const runExportZip = async () => {
    try {
      setBusy("zip");
      setError("");
      setMessage("");
      await downloadPngZip({
        tasks,
        alignmentResults,
        fileStem,
      });
      setMessage(isZh ? "ZIP 导出完成" : "ZIP export completed");
      toast({
        title: isZh ? "ZIP 导出完成" : "ZIP export completed",
        description: isZh
          ? "生成结果已打包为 ZIP。"
          : "Generated results were bundled into a ZIP archive.",
      });
    } catch (exception) {
      const message = toUserError(exception);
      setError(message);
      toast({
        title: isZh ? "ZIP 导出失败" : "ZIP export failed",
        description: t(`errors.${message}`, message),
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard
      title={isZh ? "导出面板" : "Export Panel"}
      subtitle={
        isZh
          ? "结果生成后可执行 ORB 对齐，再导出 PNG ZIP 或 WinDynamicDesktop 主题。"
          : "Run ORB alignment before exporting PNG ZIP bundles or WinDynamicDesktop themes."
      }
      surface="flat"
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-accent/60"
        >
          <div>
            <p className="text-sm font-semibold">{isZh ? "导出配置" : "Export setup"}</p>
            <p className="text-xs text-muted-foreground">
              {isZh ? `${succeeded.length} 个结果，${alignedCount} 个已对齐` : `${succeeded.length} results, ${alignedCount} aligned`}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded ? (
          <div className="space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="export-file-stem">
                {isZh ? "文件名前缀" : "File name stem"}
              </label>
              <Input
                id="export-file-stem"
                value={fileStem}
                onChange={(e) => setFileStem(e.target.value.replace(/\s+/g, "_"))}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("export.mapping")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {succeeded.map((task) => (
                  <div key={task.id} className="rounded-xl border border-border/70 bg-background p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{task.label}</p>
                      {alignmentResults[task.id]?.status === "succeeded" ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {t("results.aligned")}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(bucketLabels) as Bucket[]).map((bucket) => (
                        <label
                          key={bucket}
                          className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={mapping[bucket].includes(task.id)}
                            onChange={() => toggleMapping(bucket, task.id)}
                          />
                          <span>{isZh ? bucketLabels[bucket].zh : bucketLabels[bucket].en}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void runAlignment()} disabled={busy !== ""}>
                <Layers3 className="h-4 w-4" />
                {busy === "align" ? t("common.loading") : t("results.align")}
              </Button>
              <Button type="button" variant="outline" onClick={() => void runExportZip()} disabled={busy !== ""}>
                <PackageOpen className="h-4 w-4" />
                {busy === "zip" ? t("common.loading") : (isZh ? "导出 ZIP" : "Export ZIP")}
              </Button>
              <Button type="button" onClick={() => void runExportDdw()} disabled={busy !== ""}>
                <Download className="h-4 w-4" />
                {busy === "ddw" ? t("common.loading") : t("export.ddw")}
              </Button>
            </div>
          </div>
        ) : null}

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{t(`errors.${error}`, error)}</p> : null}
      </div>
    </SectionCard>
  );
};
