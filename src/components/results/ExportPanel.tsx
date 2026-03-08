import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { validateDdwThemeShape } from "@/services/export/ddwCompatibility";
import { downloadDdw } from "@/services/export/ddwExporter";
import { exportHeicWithFallback } from "@/services/export/heicExporter";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

type Bucket = "day" | "sunrise" | "sunset" | "night";

export const ExportPanel = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);
  const alignmentResults = useWorkflowStore((s) => s.alignmentResults);
  const mapping = useWorkflowStore((s) => s.exportMapping);
  const setExportMapping = useWorkflowStore((s) => s.setExportMapping);
  const heicExperimentalEnabled = useSettingsStore((s) => s.heicExperimentalEnabled);

  const [expanded, setExpanded] = useState(false);
  const [fileStem, setFileStem] = useState("wallpaper");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  useEffect(() => {
    if (succeeded.length === 0) {
      setExpanded(false);
    }
  }, [succeeded.length]);

  if (succeeded.length === 0) return null;

  const toggleMapping = (bucket: Bucket, variantId: string) => {
    const next = new Set(mapping[bucket]);
    if (next.has(variantId)) next.delete(variantId);
    else next.add(variantId);
    setExportMapping({ ...mapping, [bucket]: Array.from(next) });
  };

  const runExportDdw = async () => {
    try {
      setBusy(true);
      setError("");
      const themeValidation = validateDdwThemeShape({
        imageFilename: `${fileStem}_*.png`,
        dayImageList: mapping.day,
        nightImageList: mapping.night,
      });
      if (!themeValidation.ok) throw new Error(themeValidation.message);
      await downloadDdw({ tasks, mapping, alignmentResults, fileStem });
      setMessage(t("export.compat"));
    } catch (exception) {
      setError(String(exception));
    } finally {
      setBusy(false);
    }
  };

  const runExportHeic = async () => {
    try {
      setBusy(true);
      setError("");
      const result = await exportHeicWithFallback(tasks, fileStem, heicExperimentalEnabled);
      setMessage(`HEIC export result: ${result.format}`);
    } catch (exception) {
      setError(String(exception));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={isZh ? "导出面板" : "Export Panel"}
      subtitle={
        isZh
          ? "仅在有可用结果时显示，默认折叠。"
          : "Shown only when results are available and collapsed by default."
      }
    >
      <Accordion
        disableGutters
        elevation={0}
        expanded={expanded}
        onChange={(_, next) => setExpanded(next)}
        slotProps={{ transition: { unmountOnExit: true } }}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          backgroundColor: "background.paper",
          "&::before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRoundedIcon />}
          sx={{ minHeight: 52, "& .MuiAccordionSummary-content": { my: 0.5 } }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", pr: 1 }}>
            <Typography variant="subtitle2">{isZh ? "导出配置" : "Export Setup"}</Typography>
            <Chip
              size="small"
              label={isZh ? `${succeeded.length} 个结果` : `${succeeded.length} results`}
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5 }}>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label={isZh ? "文件名前缀" : "File name stem"}
              value={fileStem}
              onChange={(e) => setFileStem(e.target.value.replace(/\s+/g, "_"))}
              sx={{ maxWidth: 260 }}
            />

            <Typography variant="caption" color="text.secondary">
              {t("export.mapping")}
            </Typography>
            <Grid container spacing={1}>
              {succeeded.map((task) => (
                <Grid key={task.id} size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      {task.label}
                    </Typography>
                    <Stack direction="row" spacing={0} flexWrap="wrap">
                      {(["day", "sunrise", "sunset", "night"] as Bucket[]).map((bucket) => (
                        <FormControlLabel
                          key={bucket}
                          control={
                            <Checkbox
                              size="small"
                              checked={mapping[bucket].includes(task.id)}
                              onChange={() => toggleMapping(bucket, task.id)}
                            />
                          }
                          label={<Typography variant="caption">{bucket}</Typography>}
                          sx={{ mr: 1 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => void runExportDdw()}
                disabled={busy}
              >
                {busy ? t("common.loading") : t("export.ddw")}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageRoundedIcon />}
                onClick={() => void runExportHeic()}
                disabled={busy}
              >
                {busy ? t("common.loading") : t("export.heic")}
              </Button>
              <Chip size="small" label={`HEIC: ${heicExperimentalEnabled ? "ON" : "OFF"}`} />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {message ? <Alert severity="success" sx={{ py: 0 }}>{message}</Alert> : null}
      {error ? <Alert severity="error" sx={{ py: 0 }}>{error}</Alert> : null}
    </SectionCard>
  );
};
