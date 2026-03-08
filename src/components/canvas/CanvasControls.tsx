import {
  Alert,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { aspectRatios } from "@/data/aspectRatios";
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

  const ratio =
    ratioId === "custom"
      ? customRatio
      : (() => {
          const preset = aspectRatios.find((item) => item.id === ratioId);
          return preset ? { width: preset.width, height: preset.height } : { width: 3, height: 1 };
        })();

  const onPrepare = async () => {
    if (!sourceImage) return;
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
        ratioId,
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
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t("workspace.ratio")}</InputLabel>
            <Select
              value={ratioId}
              label={t("workspace.ratio")}
              onChange={(e) => setRatioId(e.target.value)}
            >
              {aspectRatios.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {ratioId === "custom" && (
          <>
            <Grid size={{ xs: 3, sm: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="W"
                value={customRatio.width}
                onChange={(e) =>
                  setCustomRatio({ ...customRatio, width: Math.max(1, Number(e.target.value || 1)) })
                }
              />
            </Grid>
            <Grid size={{ xs: 3, sm: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="H"
                value={customRatio.height}
                onChange={(e) =>
                  setCustomRatio({ ...customRatio, height: Math.max(1, Number(e.target.value || 1)) })
                }
              />
            </Grid>
          </>
        )}
        <Grid size={{ xs: 12, sm: ratioId === "custom" ? 12 : 5 }}>
          <ToggleButtonGroup
            exclusive
            value={prepareMode}
            onChange={(_, value) => value && setPrepareMode(value)}
            color="primary"
            size="small"
          >
            <ToggleButton value="crop">{t("workspace.modeCrop")}</ToggleButton>
            <ToggleButton value="pad">{t("workspace.modePad")}</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>
      <Button
        variant="contained"
        size="small"
        onClick={() => void onPrepare()}
        disabled={loading || !sourceImage}
        sx={{ width: "fit-content" }}
      >
        {loading ? t("common.loading") : t("workspace.prepare")}
      </Button>
      {preparedImage && (
        <Typography variant="caption" color="text.secondary">
          {t("workspace.prepared")} · {preparedImage.width}x{preparedImage.height}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
    </Stack>
  );
};
