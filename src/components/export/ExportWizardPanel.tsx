import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import {
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
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { validateDdwThemeShape } from "@/services/export/ddwCompatibility";
import { downloadDdw } from "@/services/export/ddwExporter";
import { exportHeicWithFallback } from "@/services/export/heicExporter";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

type Bucket = "day" | "sunrise" | "sunset" | "night";

export const ExportWizardPanel = () => {
  const { t } = useTranslation();
  const tasks = useWorkflowStore((state) => state.tasks);
  const alignmentResults = useWorkflowStore((state) => state.alignmentResults);
  const mapping = useWorkflowStore((state) => state.exportMapping);
  const setExportMapping = useWorkflowStore((state) => state.setExportMapping);
  const heicExperimentalEnabled = useSettingsStore((state) => state.heicExperimentalEnabled);
  const [fileStem, setFileStem] = useState("wallpaper");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const toggleMapping = (bucket: Bucket, variantId: string) => {
    const set = new Set(mapping[bucket]);
    if (set.has(variantId)) {
      set.delete(variantId);
    } else {
      set.add(variantId);
    }
    setExportMapping({
      ...mapping,
      [bucket]: Array.from(set),
    });
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
      if (!themeValidation.ok) {
        throw new Error(themeValidation.message);
      }
      await downloadDdw({
        tasks,
        mapping,
        alignmentResults,
        fileStem,
      });
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
    <Stack spacing={2}>
      <SectionCard
        title={t("export.mapping")}
        subtitle="Map generated variants to DDW day/sunrise/sunset/night buckets."
      >
        <Stack spacing={2}>
          <TextField
            label="File name stem"
            value={fileStem}
            onChange={(event) => setFileStem(event.target.value.replace(/\s+/g, "_"))}
            sx={{ maxWidth: 320 }}
          />
          <Grid container spacing={2}>
            {succeeded.map((task) => (
              <Grid key={task.id} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 1.5, border: "1px solid rgba(120,140,150,0.28)", borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">{task.label}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(["day", "sunrise", "sunset", "night"] as Bucket[]).map((bucket) => (
                        <FormControlLabel
                          key={bucket}
                          control={
                            <Checkbox
                              checked={mapping[bucket].includes(task.id)}
                              onChange={() => toggleMapping(bucket, task.id)}
                            />
                          }
                          label={bucket}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
          {!succeeded.length ? (
            <Typography variant="body2" color="text.secondary">
              No generated variants to export.
            </Typography>
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard title={t("export.title")} subtitle={t("export.heicFallback")}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={() => void runExportDdw()}
            disabled={busy || !succeeded.length}
          >
            {busy ? t("common.loading") : t("export.ddw")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImageRoundedIcon />}
            onClick={() => void runExportHeic()}
            disabled={busy || !succeeded.length}
          >
            {busy ? t("common.loading") : t("export.heic")}
          </Button>
          <Chip label={`HEIC experimental: ${heicExperimentalEnabled ? "ON" : "OFF"}`} />
        </Stack>
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </SectionCard>
    </Stack>
  );
};
