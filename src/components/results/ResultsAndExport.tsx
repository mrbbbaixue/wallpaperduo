import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { saveAs } from "file-saver";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { validateDdwThemeShape } from "@/services/export/ddwCompatibility";
import { downloadDdw } from "@/services/export/ddwExporter";
import { exportHeicWithFallback } from "@/services/export/heicExporter";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

type Bucket = "day" | "sunrise" | "sunset" | "night";

export const ResultsAndExport = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);
  const alignmentResults = useWorkflowStore((s) => s.alignmentResults);
  const mapping = useWorkflowStore((s) => s.exportMapping);
  const setExportMapping = useWorkflowStore((s) => s.setExportMapping);
  const heicExperimentalEnabled = useSettingsStore((s) => s.heicExperimentalEnabled);

  const [fileStem, setFileStem] = useState("wallpaper");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  if (succeeded.length === 0) return null;

  const toggleMapping = (bucket: Bucket, variantId: string) => {
    const set = new Set(mapping[bucket]);
    if (set.has(variantId)) set.delete(variantId);
    else set.add(variantId);
    setExportMapping({ ...mapping, [bucket]: Array.from(set) });
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
    <SectionCard title={isZh ? "生成结果与导出" : "Results & Export"}>
      <Stack spacing={2}>
        {/* Results Gallery - horizontal scroll */}
        <Typography variant="subtitle2">
          {isZh ? "结果画廊" : "Results Gallery"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            pb: 1,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": { borderRadius: 3, bgcolor: "action.hover" },
          }}
        >
          {succeeded.map((task) => (
            <Box
              key={task.id}
              sx={{
                flexShrink: 0,
                width: 220,
              }}
            >
              <Stack spacing={0.5}>
                <Box
                  component="img"
                  src={task.result?.objectUrl}
                  alt={task.label}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={600}>
                    {task.label}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      task.result?.blob && saveAs(task.result.blob, `${task.id}.png`)
                    }
                    sx={{ minWidth: 0, px: 0.5 }}
                  >
                    <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>

        <Divider />

        {/* Export Section */}
        <Typography variant="subtitle2">{t("export.title")}</Typography>

        <TextField
          size="small"
          label={isZh ? "文件名前缀" : "File name stem"}
          value={fileStem}
          onChange={(e) => setFileStem(e.target.value.replace(/\s+/g, "_"))}
          sx={{ maxWidth: 240 }}
        />

        {/* Time slot mapping */}
        <Typography variant="caption" color="text.secondary">
          {t("export.mapping")}
        </Typography>
        <Grid container spacing={1}>
          {succeeded.map((task) => (
            <Grid key={task.id} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <Typography variant="caption" fontWeight={600}>{task.label}</Typography>
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

        {/* Export buttons */}
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
          <Chip
            size="small"
            label={`HEIC: ${heicExperimentalEnabled ? "ON" : "OFF"}`}
          />
        </Stack>
        {message && <Alert severity="success" sx={{ py: 0 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
      </Stack>
    </SectionCard>
  );
};
